import { ethers } from 'ethers';
import { collection, addDoc, getDocs, query, where, doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

// Check if the private key is available
if (!process.env.DISTRIBUTOR_PRIVATE_KEY) {
  console.error("DISTRIBUTOR_PRIVATE_KEY not found. Check the .env file or environment settings.");
} else {
  console.log("DISTRIBUTOR_PRIVATE_KEY loaded successfully.");
}

// Removing dotenv loading
// Environment variables should be set in the runtime environment or .env.local file

// Log to check if environment variables are accessible
console.log("Available environment variables:", Object.keys(process.env));

// Simplified ABI of the G33TokenDistributor contract
const DISTRIBUTOR_ABI = [
  "function distributeTokens(address donor, uint256 donationAmountUsd) external",
  "function getAvailableTokens() external view returns (uint256)",
  "function tokensDistributed(address donor) external view returns (uint256)",
  "function totalDonated(address donor) external view returns (uint256)",
  "function totalDistributedTokens() external view returns (uint256)",
  "function totalDonationsUsd() external view returns (uint256)"
];

// List of reliable RPC URLs for the Polygon network
const POLYGON_RPC_URLS = [
  "https://polygon-rpc.com",
  "https://polygon.llamarpc.com",
  "https://rpc-mainnet.maticvigil.com",
  "https://polygon-mainnet.public.blastapi.io",
  "https://polygon-bor.publicnode.com",
  "https://polygon.meowrpc.com",
  "wss://polygon-mainnet.g.alchemy.com/v2/demo", // Alchemy public WS
  "wss://ws-matic-mainnet.chainstacklabs.com"   // ChainStack WS
];

// List of reliable CORS proxies that can help bypass network restrictions
const CORS_PROXIES = [
  "https://corsproxy.io/?",
  "https://cors-anywhere.herokuapp.com/",
  "https://api.allorigins.win/raw?url="
];

// Reliable RPC endpoint to use with proxy
const RELIABLE_RPC_ENDPOINTS = [
  "https://polygon-rpc.com",
  "https://polygon.llamarpc.com"
];

// Local endpoints for development
const LOCAL_RPC_URLS = [
  "http://127.0.0.1:8545", // Default Ganache / Hardhat
  "http://localhost:8545"  // Alternative
];

// Distributor and token contract addresses defined via environment variable
const DISTRIBUTOR_ADDRESS = process.env.G33_TOKEN_DISTRIBUTOR_ADDRESS || "0x137c762cb3eea5c8e5a6ed2fdf41dd47b5e13455";
const G33_TOKEN_ADDRESS = process.env.G33_TOKEN_ADDRESS || "0xc6099a207e9d2d37d1203f060d2e77c1e05008fa";

// Interface for donation records
interface TokenDonation {
  donorAddress: string;
  donationAmount: number; // value in crypto
  usdValue: number; // value converted to USD
  tokenAmount: number; // amount of tokens to be distributed
  transactionHash: string;
  network: string;
  cryptoSymbol: string;
  createdAt: Date;
  status: 'pending' | 'distributed' | 'failed';
  distributionTxHash?: string;
  error?: string; // Additional field to store error messages
}

// Interface for RPC Endpoints
interface RpcEndpoint {
  url: string;
  network: {
    name: string;
    chainId: number;
  };
}

/**
 * Checks if the application is on a network with limited internet access
 * and needs to use special fallbacks
 */
async function isRestrictedNetwork(): Promise<boolean> {
  try {
    // Try to access a known external URL
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);
    
    const response = await fetch('https://cloudflare.com', { 
      signal: controller.signal,
      method: 'HEAD'
    });
    clearTimeout(timeoutId);
    
    return !response.ok;
  } catch (error) {
    console.log('Possible network restriction detected');
    return true;
  }
}

/**
 * Tries to connect to an RPC through a CORS proxy
 * @param baseRpcUrl Base URL of the RPC
 * @returns Connected provider or null if it fails
 */
async function createProxiedProvider(baseRpcUrl: string): Promise<ethers.providers.Provider | null> {
  for (const proxyUrl of CORS_PROXIES) {
    try {
      const fullUrl = `${proxyUrl}${baseRpcUrl}`;
      console.log(`🔄 Trying to connect via CORS proxy: ${fullUrl}`);
      
      // Create a provider with the proxy URL
      const provider = new ethers.providers.JsonRpcProvider({
        url: fullUrl,
        headers: {
          "Origin": "https://gate33.com",
          "Referer": "https://gate33.com/"
        }
      });
      
      // Test the connection with timeout
      const testPromise = provider.getBlockNumber();
      const resultPromise = Promise.race([
        testPromise,
        new Promise<null>((_, reject) => 
          setTimeout(() => reject(new Error('Timeout')), 5000)
        )
      ]);
      
      const blockNumber = await resultPromise;
      console.log(`✅ Successfully connected via CORS proxy. Block: ${blockNumber}`);
      return provider;
    } catch (error) {
      console.warn(`❌ Failed to connect via CORS proxy: ${proxyUrl}`, 
        error instanceof Error ? error.message : String(error));
    }
  }
  
  return null;
}

/**
 * Service to interact with the G33TokenDistributor contract
 * This service manages the automatic distribution of G33 tokens to donors
 */
class G33TokenDistributorService {
  private provider: ethers.providers.Provider | null = null;
  private wallet: ethers.Wallet | null = null;
  private contract: ethers.Contract | null = null;
  private distributorAddress: string | null = null;
  private isInitialized: boolean = false;
  private initializationError: string | null = null;
  private lastInitAttempt: number = 0;
  private privateKey: string | null = null;
  private isDevMode: boolean = process.env.NODE_ENV === 'development';

  constructor() {
    this.init().catch(console.error);
  }

  /**
   * Tries to create a reliable provider for the Polygon network
   */
  private async createProvider(): Promise<ethers.providers.Provider | null> {
    const providerUrls = [
      { url: "https://polygon-rpc.com" },
      { url: "https://rpc.ankr.com/polygon" },
      { url: "https://1rpc.io/matic" }
    ];

    // Try direct connection first
    for (const {url} of providerUrls) {
      try {
        console.log(`🔄 Trying to connect to RPC: ${url}`);
        
        // Create provider with timeout
        const provider = new ethers.providers.JsonRpcProvider({ 
          url,
          timeout: 10000 // 10 seconds timeout
        });
        
        // Test the connection with additional timeout
        const blockNumber = await Promise.race([
          provider.getBlockNumber(),
          new Promise<never>((_, reject) => 
            setTimeout(() => reject(new Error('Timeout')), 5000)
          )
        ]);
        
        console.log(`✅ Successfully connected to RPC ${url}. Current block: ${blockNumber}`);
        return provider;
      } catch (error) {
        console.warn(`❌ Failed to connect to RPC ${url}:`, error instanceof Error ? error.message : String(error));
      }
    }
    
    // If all direct connections fail, try via CORS proxy
    console.log("⚠️ All direct connections failed. Trying via CORS proxy...");
    
    for (const baseRpcUrl of RELIABLE_RPC_ENDPOINTS) {
      const proxiedProvider = await createProxiedProvider(baseRpcUrl);
      if (proxiedProvider) {
        return proxiedProvider;
      }
    }
    
    // If still fails, try connection with custom HTTP fallback
    try {
      console.log("⚠️ Trying connection with custom HTTP fallback...");
      
      // Create a custom provider that uses fetch directly
      const url = "https://polygon-rpc.com";
      
      // Define a custom fetch function
      const myCustomFetch = async (url: string, payload: string): Promise<string> => {
        try {
          const headers = {
            'Content-Type': 'application/json',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Origin': 'https://gate33.com',
            'Referer': 'https://gate33.com/'
          };
          
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 15000);
          
          const response = await fetch(url, {
            method: 'POST',
            headers,
            body: payload,
            signal: controller.signal
          });
          
          clearTimeout(timeoutId);
          
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          
          return await response.text();
        } catch (error) {
          console.error("Error in custom fetch:", error);
          throw error;
        }
      };
      
      // Use JsonRpcProvider with basic connection
      const customProvider = new ethers.providers.JsonRpcProvider(url);
      
      // Override the provider's request sending function
      const originalSend = customProvider.send;
      customProvider.send = async (method: string, params: Array<any>): Promise<any> => {
        try {
          console.log(`Calling method ${method} with custom fetch`);
          
          const payload = JSON.stringify({
            method,
            params,
            id: Math.floor(Math.random() * 1000000),
            jsonrpc: "2.0"
          });
          
          const result = await myCustomFetch(url, payload);
          const json = JSON.parse(result);
          
          if (json.error) {
            console.error(`RPC error: ${json.error.message || JSON.stringify(json.error)}`);
            throw new Error(json.error.message || "Unknown error");
          }
          
          return json.result;
        } catch (error) {
          console.error("Error sending RPC request:", error);
          // Try the original method in case of failure
          return originalSend(method, params);
        }
      };
      
      // Test the connection
      const blockNumber = await customProvider.getBlockNumber();
      console.log(`✅ Successfully connected using custom fetch. Block: ${blockNumber}`);
      return customProvider;
    } catch (error) {
      console.error("❌ Also failed to connect with custom fetch:", 
        error instanceof Error ? error.message : String(error));
    }
    
    // If in development, create a fake provider for testing
    if (this.isDevMode) {
      console.warn("🔶 DEVELOPMENT MODE: Creating simulated provider for testing");
      
      // Create a simulated provider that returns fixed values for testing
      const fakeProvider = {
        getNetwork: async () => ({ chainId: 137, name: "polygon" }),
        getBlockNumber: async () => 42000000,
        getGasPrice: async () => ethers.utils.parseUnits("30", "gwei"),
        getBalance: async () => ethers.utils.parseEther("10"),
        getTransactionCount: async () => 0,
        call: async () => "0x",
        estimateGas: async () => ethers.BigNumber.from(200000),
        sendTransaction: async (tx: string) => ({ 
          hash: "0x" + "1".repeat(64),
          wait: async () => ({ status: 1, gasUsed: ethers.BigNumber.from(150000) })
        }),
        // Other methods needed for testing
        getFeeData: async () => ({
          maxFeePerGas: ethers.utils.parseUnits("50", "gwei"),
          maxPriorityFeePerGas: ethers.utils.parseUnits("30", "gwei"),
          gasPrice: ethers.utils.parseUnits("35", "gwei")
        }),
      } as unknown as ethers.providers.Provider;
      
      return fakeProvider;
    }

    return null;
  }

  /**
   * Tests connectivity with an RPC endpoint
   */
  private async testRpcEndpoint(url: string): Promise<{success: boolean, latency?: number, error?: string}> {
    const start = Date.now();
    
    try {
      // First test if it can make a basic HTTP request
      console.log(`🔍 Testing basic HTTP connectivity to ${url}...`);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      try {
        const response = await fetch(url, {
          method: 'POST',
          body: JSON.stringify({
            jsonrpc: '2.0',
            method: 'eth_blockNumber',
            params: [],
            id: 1
          }),
          headers: {
            'Content-Type': 'application/json'
          },
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          return {
            success: false,
            latency: Date.now() - start,
            error: `HTTP ${response.status}: ${response.statusText}`
          };
        }
        
        const data = await response.json();
        console.log(`✅ RPC ${url} responded in ${Date.now() - start}ms`);
        return {
          success: true,
          latency: Date.now() - start
        };
        
      } catch (fetchError) {
        if (fetchError instanceof Error) {
          if (fetchError.name === 'AbortError') {
            return {
              success: false,
              error: 'Timeout'
            };
          }
          return {
            success: false,
            error: fetchError.message
          };
        }
        return {
          success: false,
          error: 'Unknown error occurred'
        };
      }
      
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Tests all available RPCs and returns a report
   */
  private async testAllRpcs(): Promise<RpcEndpoint[]> {
    const endpoints: RpcEndpoint[] = [
      {
        url: "https://polygon-rpc.com",
        network: { name: "polygon", chainId: 137 }
      },
      {
        url: "https://rpc.ankr.com/polygon",
        network: { name: "polygon", chainId: 137 }
      },
      {
        url: "https://polygon.llamarpc.com",
        network: { name: "polygon", chainId: 137 }
      }
    ];
    
    console.log("\n🔍 Starting RPC connectivity test...");
    
    const workingEndpoints: RpcEndpoint[] = [];
    
    for (const endpoint of endpoints) {
      console.log(`\nTesting ${endpoint.url}...`);
      const result = await this.testRpcEndpoint(endpoint.url);
      
      if (result.success) {
        console.log(`✅ ${endpoint.url}: OK (${result.latency}ms)`);
        workingEndpoints.push(endpoint);
      } else {
        console.log(`❌ ${endpoint.url}: Failed - ${result.error}`);
      }
    }
    
    console.log("\nRPC connectivity test completed.");
    return workingEndpoints;
  }

  /**
   * Gets the private key from various possible sources
   * @returns The private key or null if not found
   */
  private getPrivateKey(): string | null {
    // Log for debug
    console.log("Fetching distributor private key...");
    
    // Check if the DISTRIBUTOR_PRIVATE_KEY variable is accessible
    if (process.env.DISTRIBUTOR_PRIVATE_KEY) {
      console.log("DISTRIBUTOR_PRIVATE_KEY found in runtime environment.");
    } else {
      console.error("DISTRIBUTOR_PRIVATE_KEY not found in runtime environment.");
    }
    
    // List of possible environment variable names for the private key
    const possibleEnvKeys = [
      "DISTRIBUTOR_PRIVATE_KEY",
      "PRIVATE_KEY_DISTRIBUTOR",
      "TOKEN_DISTRIBUTOR_KEY",
      "POLYGON_DISTRIBUTOR_KEY",
      "WALLET_PRIVATE_KEY",
      "PRIVATE_KEY",
      "OWNER_PRIVATE_KEY"
    ];
    
    // Check each of the possible environment variables
    for (const keyName of possibleEnvKeys) {
      if (process.env[keyName]) {
        let privateKey = process.env[keyName];
        console.log(`Found private key in variable: ${keyName}`);
        
        // Add 0x prefix if necessary
        if (!privateKey.startsWith('0x')) {
          privateKey = '0x' + privateKey;
          console.log("Added '0x' prefix to private key");
        }
        
        return privateKey;
      }
    }
    
    // ONLY IN DEVELOPMENT: If no key is found and we are in development, use simulated key
    if (this.isDevMode) {
      throw new Error("Private key not found. Check environment variables.");
    }
    
    return null;
  }

  /**
   * Initializes the service by loading configurations and connecting to the contract
   * @param forceInit If true, forces initialization even if a recent attempt was made
   */
  async init(forceInit: boolean = false): Promise<void> {
    try {
      console.log("🔄 Initializing G33TokenDistributorService...");
      
      // Avoid frequent initialization attempts only when not forced
      const now = Date.now();
      if (!forceInit && this.lastInitAttempt > 0 && (now - this.lastInitAttempt) < 60000) {
        console.log("Recent initialization attempt, waiting before trying again");
        return;
      }
      
      this.lastInitAttempt = now;
      this.initializationError = null;
      
      // Detailed log of execution mode
      console.log("Initializing G33TokenDistributorService in mode:", this.isDevMode ? "development" : "production");
      console.log("Environment NODE_ENV:", process.env.NODE_ENV);
      console.log("NEXT_PUBLIC_DEVELOPMENT_MODE:", process.env.NEXT_PUBLIC_DEVELOPMENT_MODE);
      
      // Debug to check environment variables
      console.log("Related environment variables:", Object.keys(process.env).filter(key => 
        key.includes('DISTRIBUTOR') || 
        key.includes('TOKEN') || 
        key.includes('PROVIDER') ||
        key.includes('RPC') ||
        key.includes('PRIVATE')
      ));
      
      // Log to list all available environment variables
      console.log("Available environment variables:", Object.keys(process.env));
      
      // Get the private key
      this.privateKey = this.getPrivateKey();
      
      // Check if the private key was found
      if (!this.privateKey) {
        throw new Error("Distributor private key not found. Check environment variables.");
      }
      
      // Check the format of the private key
      if (!/^0x[a-fA-F0-9]{64}$/.test(this.privateKey)) {
        console.warn(`⚠️ Warning: Private key appears to be in incorrect format. Length: ${this.privateKey.length}, expected: 66 characters.`);
        
        // If in development, correct the key
        if (this.isDevMode) {
          this.privateKey = "0x1234567890123456789012345678901234567890123456789012345678901234";
          console.log("⚠️ [DEVELOPMENT] Replacing with simulated key due to incorrect format.");
        } else {
          throw new Error("Invalid format of distributor private key. Check environment variables.");
        }
      }
      
      // Retry logic for Firestore operations
      const maxRetries = 3;
      let retryCount = 0;
      let configDoc = null;

      while (retryCount < maxRetries) {
        try {
          configDoc = await getDoc(doc(db, "settings", "contractConfig"));
          if (configDoc.exists()) break;
          throw new Error("Contract configuration document not found in Firebase");
        } catch (error) {
          retryCount++;
          const errorMessage = error instanceof Error ? error.message : String(error);
          console.warn(`Attempt ${retryCount} to get contract configuration failed:`, errorMessage);
          if (retryCount >= maxRetries) throw new Error("Failed to get contract configuration after multiple attempts");
          await new Promise((resolve) => setTimeout(resolve, 2000)); // Wait 2 seconds before trying again
        }
      }
      
      // Use environment variable or fallback for distributor address
      this.distributorAddress = DISTRIBUTOR_ADDRESS;
      console.log(`Distributor address set: ${this.distributorAddress}`);

      if (!this.distributorAddress) {
        throw new Error("Distributor address is not configured.");
      }
      
      console.log("Setting up provider for the Polygon network...");
      try {
        this.provider = await this.createProvider();
        
        if (!this.provider) {
          throw new Error("Could not establish connection to any RPC. Check endpoints and network connectivity.");
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error("Error setting up provider:", errorMessage);
        throw new Error("Critical error setting up provider for the Polygon network.");
      }
      
      if (!this.provider) {
        throw new Error("Could not establish connection to any RPC");
      }

      // Set up wallet with established provider
      if (this.privateKey) {
        this.wallet = new ethers.Wallet(this.privateKey, this.provider);
        console.log("✅ Wallet set up successfully");
      }
      
      try {
        this.provider = this.provider;
        this.wallet = new ethers.Wallet(this.privateKey, this.provider);
        console.log("Private key set up successfully.");
        
        // Log the private key used to initialize the wallet
        console.log(`Private key used: ${this.privateKey}`);
        // Log the address generated from the private key
        const generatedWalletAddress = await this.wallet.getAddress();
        console.log(`Address generated from private key: ${generatedWalletAddress}`);

        // Removing redefinition of 'walletAddress' variable
        console.log(`Distributor wallet set up: ${generatedWalletAddress.substring(0, 6)}...${generatedWalletAddress.substring(generatedWalletAddress.length - 4)}`);
        
        // Connect to the contract
        this.contract = new ethers.Contract(this.distributorAddress, DISTRIBUTOR_ABI, this.wallet);
        
        // Check if the contract is accessible
        try {
          const availableTokens = await this.contract.getAvailableTokens();
          console.log(`Distributor contract connected successfully. Available tokens: ${ethers.utils.formatEther(availableTokens)}`);
          this.isInitialized = true;
        } catch (contractError: unknown) {
          const errorMessage = contractError instanceof Error 
            ? contractError.message
            : "Unknown error accessing contract functions";
            
          throw new Error(`Error accessing contract functions: ${errorMessage}`);
        }
      } catch (walletError: unknown) {
        const errorMessage = walletError instanceof Error 
          ? walletError.message
          : "Unknown error";
          
        console.error("Error creating wallet with provided private key:", errorMessage);
        throw new Error(`Error creating wallet: ${errorMessage}. Check if the private key is in the correct format.`);
      }
      
      // Check the chainId of the connected network
      const network = await this.provider!.getNetwork();
      console.log(`Connected to network: ${network.name} (chainId: ${network.chainId})`);
      if (network.chainId !== 137) {
        throw new Error(`RPC provider connected to the wrong network. Expected: Polygon Mainnet (chainId 137), Current: ${network.chainId}`);
      }

      return;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.initializationError = errorMessage;

      // Handle offline mode gracefully
      if (errorMessage.includes("offline")) {
        console.error("Firestore is offline. The service will be initialized in limited mode.");
        this.isInitialized = false; // Mark as not initialized, but without throwing a critical error
      } else {
        console.error("Error initializing G33TokenDistributorService:", errorMessage);
        this.isInitialized = false;
      }
    }
  }

  /**
   * Checks if the service is initialized and ready for use
   * @returns True if the service is initialized
   */
  private async ensureInitialized(): Promise<boolean> {
    if (this.isInitialized) return true;
    
    // Try to initialize again
    await this.init();
    return this.isInitialized;
  }
  
  /**
   * Checks if the service is initialized (public method)
   * @returns Initialization status of the service
   */
  public checkIsInitialized(): boolean {
    return this.isInitialized;
  }
  
  /**
   * Gets the initialization error, if any
   * @returns Error message or null
   */
  public getInitializationError(): string | null {
    return this.initializationError;
  }

  /**
   * Checks if an address is authorized as a distributor in the contract
   * @param address Address to be checked
   * @returns true if the address is authorized, false otherwise
   */
  async isAuthorizedDistributor(address: string): Promise<boolean> {
    try {
      if (!(await this.ensureInitialized())) {
        return false;
      }
      
      // Create a contract with extended interface that includes the distributors method
      const extendedContract = new ethers.Contract(
        this.distributorAddress!,
        [
          ...DISTRIBUTOR_ABI,
          "function distributors(address) external view returns (bool)",
          "function owner() external view returns (address)"
        ],
        // Fixing the type issue, ensuring provider is not null
        this.provider || undefined
      );
      
      // Check if the address is an authorized distributor
      const isDistributor = await extendedContract.distributors(address);
      if (isDistributor) {
        console.log(`✅ The address ${address} is an authorized distributor`);
        return true;
      }
      
      // Check if the address is the owner of the contract
      const owner = await extendedContract.owner();
      if (owner.toLowerCase() === address.toLowerCase()) {
        console.log(`✅ The address ${address} is the owner of the contract`);
        return true;
      }
      
      console.warn(`⚠️ The address ${address} is NOT an authorized distributor nor the owner`);
      return false;
    } catch (error) {
      console.error(`Error checking if ${address} is an authorized distributor:`, error);
      return false;
    }
  }

  /**
   * Distributes G33 tokens to a donor based on the donation amount in USD
   * @param donorAddress Donor's address
   * @param usdValue Donation amount in USD (decimal number)
   * @param waitForConfirmation If true, waits for transaction confirmation
   * @returns Distribution transaction hash or null if it fails
   */
  async distributeTokens(donorAddress: string, usdValue: number, waitForConfirmation: boolean = false): Promise<string | null> {
    try {
      if (!(await this.ensureInitialized())) {
        throw new Error(`Service not initialized. Error: ${this.initializationError || "Unknown"}`);
      }
      
      // CRITICAL VALIDATION: The G33TokenDistributorV2 contract does not process values less than 1 USD
      // This is because the contract does: tokenAmount = donationAmountUsd / 100 (integer division)
      // If the value is less than 100 (1 USD), the result will be 0 tokens
      if (usdValue < 1) {
        throw new Error(`Minimum value for token distribution is 1 USD. Provided value: ${usdValue} USD`);
      }

      // CRITICAL VALIDATION: Ensure the value sent is an integer
      // The contract does not support fractional tokens
      if (usdValue % 1 !== 0) {
        console.warn(`⚠️ Warning: The USD value ${usdValue} contains decimals and will be rounded to ${Math.floor(usdValue)} USD`);
        usdValue = Math.floor(usdValue);
      }
      
      // Check if there are available tokens
      const availableTokensWei = await this.contract!.getAvailableTokens();      const availableTokens = parseFloat(ethers.utils.formatEther(availableTokensWei));
      const tokensNeeded = usdValue * 20; // 20 tokens per 1 USD
      
      console.log(`Token distribution: ${tokensNeeded} tokens needed, ${availableTokens} tokens available`);
      
      if (availableTokens < tokensNeeded) {
        throw new Error(`Insufficient tokens in the distributor contract. Available: ${availableTokens}, Needed: ${tokensNeeded}`);
      }
        // Scale USD value to the format expected by the G33TokenDistributorV2 contract
      // The contract expects the value in cents (x100) for 2 decimal places precision
      // MULTIPLY by 20 to get 20 tokens per $1 USD (since contract gives 1 token per $1)
      const usdValueScaled = Math.round(usdValue * 100 * 20); // Multiply by 20 for new rate

      console.log(`Original USD value: ${usdValue}`);
      console.log(`Scaled value for the contract (x100 x20): ${usdValueScaled}`);
      console.log(`The donor will receive ${usdValue * 20} G33 tokens`);
      
      // NEW: Validate donor address
      if (!ethers.utils.isAddress(donorAddress)) {
        throw new Error(`Invalid donor address: ${donorAddress}`);
      }
      
      // Check the distributor wallet address for diagnostics
      const walletAddress = await this.wallet!.getAddress();
      console.log(`Distributor wallet signing the transaction: ${walletAddress}`);
      
      // Check if the distributor contract address is set
      if (!this.distributorAddress) {
        throw new Error("Distributor contract address is not set");
      }
      
      // CHECK: Verify if the contract address and wallet address are the same
      // This can happen in misconfiguration and cause "insufficient funds" errors
      if (this.distributorAddress.toLowerCase() === walletAddress.toLowerCase()) {
        console.warn("⚠️ ALERT: The wallet address and contract address are the same!");
        console.warn("This is a configuration issue that can cause 'insufficient funds' errors");
        console.warn("The contract itself should not be used as the transaction signer");
      }
      
      // NEW: Check if there was a recent identical transaction
      console.log("Checking recent donation history...");
      try {
        const donationRegistry = collection(db, 'tokenDonations');
        const q = query(
          donationRegistry,
          where('donorAddress', '==', donorAddress),
          where('usdValue', '==', usdValue),
          where('status', 'in', ['distributed', 'pending']),
        );
        
        const existingDonations = await getDocs(q);
        if (!existingDonations.empty) {
          const recentDonations = existingDonations.docs.filter(doc => {
            const donation = doc.data();
            const timestamp = donation.createdAt?.toDate?.() || new Date(donation.createdAt);
            const minutesSince = (Date.now() - timestamp.getTime()) / (1000 * 60);
            return minutesSince < 5; // Donations in the last 5 minutes
          });
          
          if (recentDonations.length > 0) {
            const recentDonation = recentDonations[0].data();
            console.warn(`🚨 Found very recent donation (last 5 minutes) for the same address and value`);
            if (recentDonation.distributionTxHash) {
              console.warn(`Recent transaction hash: ${recentDonation.distributionTxHash}`);
              console.warn("Waiting 10 seconds to avoid nonce issues...");
              await new Promise(resolve => setTimeout(resolve, 10000));
            }
          }
        }
      } catch (dbError) {
        console.warn("Error checking previous donations:", dbError);
        // Do not interrupt the flow due to duplicate check failure
      }
      
      // NEW: Check wallet permissions as distributor
      try {
        const isAuthorized = await this.isAuthorizedDistributor(walletAddress);
        if (!isAuthorized) {
          throw new Error(`The wallet ${walletAddress} is not authorized as a distributor. The transaction would be reverted.`);
        }
        console.log(`✅ Wallet authorized as distributor!`);
      } catch (authError) {
        console.error("Error checking distributor permissions:", authError);
        throw new Error(`Failed to check distributor permissions: ${authError instanceof Error ? authError.message : String(authError)}`);
      }
      
      // NEW: Perform a preliminary simulation to detect errors
      try {
        console.log(`Performing preliminary transaction simulation...`);
        await this.contract!.callStatic.distributeTokens(donorAddress, usdValueScaled, {
          from: walletAddress
        });
        console.log("✅ Preliminary simulation successful! The transaction should work.");
      } catch (simError: any) {
        // Extract useful information from the simulation error
        console.error("❌ Transaction simulation failed! Error:", 
          simError instanceof Error ? simError.message : String(simError));
        
        // Analyze the error to provide more useful information
        let errorMessage = "Simulation failed";
        
        if (simError.error?.message) {
          errorMessage = simError.error.message;
        } else if (simError.message) {
          errorMessage = simError.message;
        }
        
        if (errorMessage.includes("Insufficient tokens")) {
          throw new Error(`Insufficient tokens in the distributor contract.`);
        } else if (errorMessage.includes("Not authorized")) {
          throw new Error(`Account ${walletAddress} does not have permission to distribute tokens.`);
        } else if (errorMessage.includes("execution reverted")) {
          throw new Error(`Simulation failed: ${errorMessage}. Check the contract's balance and permissions.`);
        }
        
        throw new Error(`Preliminary simulation failed: ${errorMessage}`);
      }
      
      // Default method: Use the wallet configured in the service
      // ----------------------------------------------------- 
      console.log("Using wallet configured in the service to distribute tokens...");
      
      // Check wallet balance for gas
      console.log(`Checking balance of the wallet signing the transaction: ${walletAddress}`);
      const walletBalance = await this.provider!.getBalance(walletAddress);
      console.log(`Wallet balance (direct from RPC provider): ${ethers.utils.formatEther(walletBalance)} MATIC`);
      
      // Log the RPC node used
      if (this.provider instanceof ethers.providers.JsonRpcProvider) {
        console.log(`Using RPC node: ${this.provider.connection.url}`);
      }
      
      const ignoreBalanceCheck = true;
      
      // Get current fee data to ensure appropriate gas values
      const feeData = await this.provider!.getFeeData();
      console.log("Current network fees:", {
        maxFeePerGas: feeData.maxFeePerGas ? ethers.utils.formatUnits(feeData.maxFeePerGas, "gwei") + " gwei" : "N/A",
        maxPriorityFeePerGas: feeData.maxPriorityFeePerGas ? ethers.utils.formatUnits(feeData.maxPriorityFeePerGas, "gwei") + " gwei" : "N/A",
        gasPrice: feeData.gasPrice ? ethers.utils.formatUnits(feeData.gasPrice, "gwei") + " gwei" : "N/A"
      });
      
      // IMPORTANT: Polygon requires at least 25 gwei for maxPriorityFeePerGas (gas tip cap)
      // Error shows: minimum needed 25000000000 (25 gwei)
      // We will use higher values to ensure the transaction is accepted
      const MIN_GAS_PRICE = ethers.utils.parseUnits("30", "gwei"); 
      const MIN_PRIORITY_FEE = ethers.utils.parseUnits("50", "gwei"); // Increased from 30 to 50
      const MIN_FEE_PER_GAS = ethers.utils.parseUnits("100", "gwei"); // Increased from 50 to 100
      
      // Use the higher of the minimum value and the provider's suggested value
      const gasPrice = feeData.gasPrice && feeData.gasPrice.gt(MIN_GAS_PRICE) 
        ? feeData.gasPrice 
        : MIN_GAS_PRICE;
        
      // For EIP-1559 transactions (type 2), use maxFeePerGas and maxPriorityFeePerGas
      // Ensure the minimum of 50 gwei for priority fee is respected
      const maxPriorityFeePerGas = feeData.maxPriorityFeePerGas && feeData.maxPriorityFeePerGas.gt(MIN_PRIORITY_FEE)
        ? feeData.maxPriorityFeePerGas
        : MIN_PRIORITY_FEE;
      
      const maxFeePerGas = feeData.maxFeePerGas && feeData.maxFeePerGas.gt(MIN_FEE_PER_GAS)
        ? feeData.maxFeePerGas
        : MIN_FEE_PER_GAS;
      
      // Increase the gas limit to ensure there is enough gas
      const gasLimit = 300000; // Increased from 200000 to 300000
      
      // Calculate estimated cost (using the highest possible value)
      const estimatedCost = maxFeePerGas.mul(gasLimit);
      console.log(`Estimated cost: ${ethers.utils.formatEther(estimatedCost)} MATIC`);
      
      if (!ignoreBalanceCheck && walletBalance.lt(estimatedCost)) {
        throw new Error(`Insufficient balance for this transaction. Required: ${ethers.utils.formatEther(estimatedCost)} MATIC, Available: ${ethers.utils.formatEther(walletBalance)} MATIC`);
      }
      
      // Get nonce
      const nonce = await this.provider!.getTransactionCount(walletAddress, "latest");
      
      // NEW: use the contract directly instead of building the transaction manually
      try {
        console.log(`Preparing direct contract call with gasLimit ${gasLimit}...`);
        
        // Set gasLimit explicitly
        const overrides = {
          maxFeePerGas,
          maxPriorityFeePerGas,
          gasLimit,
          nonce,
        };
        
        // Call the contract directly instead of building the transaction manually
        console.log(`Sending transaction via contract.distributeTokens...`);
        const tx = await this.contract!.distributeTokens(donorAddress, usdValueScaled, overrides);
        console.log(`Transaction sent: ${tx.hash}`);
        
        // Wait for confirmation if necessary
        if (waitForConfirmation) {
          console.log(`Waiting for transaction ${tx.hash} confirmation...`);
          
          // Set timeout and maximum attempts to avoid infinite wait
          const maxAttempts = 30; // Increased number of attempts
          const delayBetweenAttempts = 5000; // 5 seconds between attempts
          let attempts = 0;
          
          // Function to wait for a receipt with timeout
          const waitForReceipt = async (): Promise<ethers.providers.TransactionReceipt | null> => {
            while (attempts < maxAttempts) {
              attempts++;
              try {
                const receipt = await this.provider!.getTransactionReceipt(tx.hash);
                if (receipt) {
                  return receipt;
                }
                
                console.log(`Attempt ${attempts}/${maxAttempts}: Transaction still pending...`);
                await new Promise(resolve => setTimeout(resolve, delayBetweenAttempts));
              } catch (error) {
                console.warn(`Error checking receipt (attempt ${attempts}):`, error);
                await new Promise(resolve => setTimeout(resolve, delayBetweenAttempts));
              }
            }
            
            // If it reaches here, it could not get the receipt
            console.warn(`Timeout exceeded (${maxAttempts * delayBetweenAttempts / 1000}s). The transaction may still be confirmed later.`);
            return null;
          };
          
          const receipt = await waitForReceipt();
          if (receipt) {
            console.log(`Transaction confirmed! Gas used: ${receipt.gasUsed.toString()}`);
            
            // Check if the transaction was successful
            if (receipt.status === 0) {
              console.error("❌ The transaction was confirmed, but the contract execution failed (execution reverted)!");
              console.log("Check the transaction at: https://polygonscan.com/tx/" + tx.hash);
              
              // NEW: Try again with different parameters
              console.log("Trying again with different parameters...");
              
              // Wait 10 seconds before trying again
              await new Promise(resolve => setTimeout(resolve, 10000));
              
              // Increment the nonce to avoid replacing the previous transaction
              const newNonce = await this.provider!.getTransactionCount(walletAddress, "latest");
              
              // Increase the gas limit and fees to ensure it works
              const newOverrides = {
                maxFeePerGas: ethers.utils.parseUnits("150", "gwei"),
                maxPriorityFeePerGas: ethers.utils.parseUnits("100", "gwei"),
                gasLimit: 500000,
                nonce: newNonce,
              };
              
              console.log("Sending new attempt with settings:", {
                maxFeePerGas: ethers.utils.formatUnits(newOverrides.maxFeePerGas, "gwei") + " gwei",
                maxPriorityFeePerGas: ethers.utils.formatUnits(newOverrides.maxPriorityFeePerGas, "gwei") + " gwei",
                gasLimit: newOverrides.gasLimit.toString(),
                nonce: newOverrides.nonce,
              });
              
              try {
                const retryTx = await this.contract!.distributeTokens(donorAddress, usdValueScaled, newOverrides);
                console.log(`New transaction sent: ${retryTx.hash}`);
                return retryTx.hash;
              } catch (retryError) {
                console.error("❌ Also failed on the second attempt:", retryError);
                throw new Error("Contract execution failed - execution reverted. The token transfer was not completed even after retry.");
              }
            }
            
            // Check logs to confirm that the TokensDistributed event was emitted
            let eventEmitted = false;
            if (receipt.logs && receipt.logs.length > 0) {
              for (const log of receipt.logs) {
                if (log.address.toLowerCase() === this.distributorAddress?.toLowerCase()) {
                  eventEmitted = true;
                  console.log("✅ Event emitted by the distributor contract detected");
                  break;
                }
              }
            }
            
            if (!eventEmitted) {
              console.warn("⚠️ Transaction confirmed, but no event from the distributor contract was detected");
              console.log("The transaction may have silently failed. Check at: https://polygonscan.com/tx/" + tx.hash);
            }
          } else {
            console.warn("Timeout exceeded waiting for confirmation. The transaction may still be confirmed later.");
            console.log("You can check the transaction status at https://polygonscan.com/tx/" + tx.hash);
          }
        }
        
        return tx.hash;
      } catch (contractError: any) {
        console.error("❌ Error calling contract.distributeTokens:", contractError);
        
        // Try to extract more useful information from the error
        let errorMessage = "Error calling contract";
        
        if (contractError.error?.message) {
          errorMessage = contractError.error.message;
        } else if (contractError.message) {
          errorMessage = contractError.message;
        }
        
        if (errorMessage.includes("gas required exceeds")) {
          throw new Error(`Gas error: ${errorMessage}. Increase the gas limit for this transaction.`);
        } else if (errorMessage.includes("nonce")) { 
          throw new Error(`Nonce error: ${errorMessage}. There may be a pending transaction.`);
        } else {
          throw new Error(`Error distributing tokens: ${errorMessage}`);
        }
      }
      
      // The code below is only executed if the attempt to use the contract directly fails
      // -----------------------------------------------------------------------------
      
      // Prepare data for the transaction as a fallback
      const ABI = ["function distributeTokens(address donor, uint256 donationAmountUsd)"];
      const iface = new ethers.utils.Interface(ABI);
      const calldata = iface.encodeFunctionData("distributeTokens", [donorAddress, usdValueScaled]);
      
      // Build transaction with appropriate EIP-1559 parameters for Polygon
      const tx = {
        to: this.distributorAddress || undefined, // Converting null to undefined to satisfy TransactionRequest
        maxFeePerGas: maxFeePerGas,
        maxPriorityFeePerGas: maxPriorityFeePerGas,
        gasLimit: ethers.utils.hexlify(gasLimit),
        data: calldata,
        nonce: nonce,
        chainId: 137, // Polygon mainnet
        type: 2 // EIP-1559 type
      };
      
      console.log("Sending transaction with settings:", {
        maxFeePerGas: ethers.utils.formatUnits(maxFeePerGas, "gwei") + " gwei",
        maxPriorityFeePerGas: ethers.utils.formatUnits(maxPriorityFeePerGas, "gwei") + " gwei",
        gasLimit: gasLimit.toString(),
        nonce: nonce,
        type: "EIP-1559 (type 2)"
      });
      
      // Sign and send
      console.log("Sending manual transaction (fallback method)...");
      const signedTx = await this.wallet!.signTransaction(tx);
      const submittedTx = await this.provider!.sendTransaction(signedTx);
      
      console.log(`Transaction sent: ${submittedTx.hash}`);
      
      // Wait for confirmation if necessary
      if (waitForConfirmation) {
        console.log(`Waiting for transaction ${submittedTx.hash} confirmation...`);
        
        // Confirmation waiting code...
        // ...existing code...
      }
      
      return submittedTx.hash;
    } catch (error: any) {
      console.error("❌ Error distributing G33 tokens:", error);
      
      // Extract error details
      if (error.error?.body) {
        try {
          const errorBody = JSON.parse(error.error.body);
          console.error("Blockchain error details:", {
            code: errorBody.error?.code,
            message: errorBody.error?.message,
            data: errorBody.error?.data
          });
          
          // Check if the error is related to low gas price
          if (errorBody.error?.message && errorBody.error.message.includes("gas tip cap")) {
            const errorMsg = errorBody.error.message;
            // Extract the minimum required value
            const minGasMatch = errorMsg.match(/minimum needed (\d+)/);
            if (minGasMatch && minGasMatch[1]) {
              const minGasNeeded = parseInt(minGasMatch[1], 10);
              console.log(`⚠️ Gas tip cap too low. Minimum needed: ${minGasNeeded / 1_000_000_000} gwei`);
              
              // Here you could implement an automatic retry with a higher value
              throw new Error(`Insufficient gas tip cap. The minimum required is ${minGasNeeded / 1_000_000_000} gwei. Try again with a higher value.`);
            }
          }
        } catch (parseError) {
          console.error("Error processing error details:", parseError);
        }
      }
      
      // More precise error analysis for gas price
      if (error.message) {
        if (error.message.includes("gas tip cap") || error.message.includes("underpriced")) {
          // Check if the message includes the minimum required value
          const minGasMatch = error.message.match(/minimum needed (\d+)/);
          if (minGasMatch && minGasMatch[1]) {
            const minGasNeeded = parseInt(minGasMatch[1], 10);
            const minGasInGwei = minGasNeeded / 1_000_000_000;
            console.log(`⚠️ Gas price too low. Minimum needed: ${minGasInGwei} gwei`);
            throw new Error(`Transaction with gas price too low. The Polygon network requires at least ${minGasInGwei} gwei. Check https://polygonscan.com/gastracker for current values.`);
          } else {
            throw new Error(`Transaction with gas price too low for the Polygon network. Check https://polygonscan.com/gastracker for current values.`);
          }
        } else if (error.code === "INSUFFICIENT_FUNDS") {
          throw new Error("Insufficient funds to send the transaction. Please add MATIC to the distributor wallet.");
        } else if (error.code === "NONCE_EXPIRED") {
          throw new Error(`Nonce error: ${error.message}. Try again.`);
        } else if (error.code === "REPLACEMENT_UNDERPRICED") {
          throw new Error(`Transaction with gas price too low. Increase the gas price and try again.`);
        }
      }
      
      // Generic error
      throw new Error(`Failed to distribute G33 tokens: ${error.message || JSON.stringify(error)}`);
    }
  }

  /**
   * Records a donation and automatically distributes G33 tokens
   * @param donorAddress Donor's address
   * @param donationAmount Donated amount in cryptocurrency
   * @param usdValue Equivalent value in USD
   * @param tokenAmount Amount of tokens to distribute
   * @param transactionHash Donation transaction hash
   * @param network Donation network
   * @param cryptoSymbol Cryptocurrency symbol used
   * @returns An object containing the document ID in Firebase and the distribution status
   * @throws Error if token distribution fails
   */
  async processDonation(
    donorAddress: string,
    donationAmount: number,
    usdValue: number,
    tokenAmount: number,
    transactionHash: string,
    network: string,
    cryptoSymbol: string
  ): Promise<{id: string, success: boolean, distributionTxHash?: string, error?: string}> {
    // Create object to record the donation
    const tokenDonation: TokenDonation = {
      donorAddress,
      donationAmount,
      usdValue,
      tokenAmount,
      transactionHash,
      network,
      cryptoSymbol,
      createdAt: new Date(),
      status: 'pending'
    };
    
    // Add to Firebase with initial status 'pending'
    const docRef = await addDoc(collection(db, 'tokenDonations'), tokenDonation);
    const donationId = docRef.id;
    
    try {
      console.log(`Processing donation for token distribution: ${tokenAmount} G33 to ${donorAddress}`);
      
      // VERY IMPORTANT: Check initialization before attempting to distribute
      if (!(await this.ensureInitialized())) {
        const errorMsg = `Distributor service not initialized. Error: ${this.initializationError || "Unknown"}`;
        console.error(errorMsg);
        
        // Update donation status to 'failed'
        await updateDoc(docRef, {
          status: 'failed',
          error: errorMsg
        });
        
        // Throw error to interrupt donation processing
        throw new Error(errorMsg);
      }
      
      // Try to distribute the tokens
      const distributionTxHash = await this.distributeTokens(donorAddress, usdValue);
      
      if (!distributionTxHash) {
        const errorMsg = 'Token distribution failed - blockchain transaction not completed';
        console.error(errorMsg);
        
        // Update donation status to 'failed'
        await updateDoc(docRef, {
          status: 'failed',
          error: errorMsg
        });
        
        // Throw error to interrupt donation processing
        throw new Error(errorMsg);
      }
      
      // Successful distribution - update the record
      await updateDoc(docRef, {
        status: 'distributed',
        distributionTxHash
      });
      
      console.log(`Donation processed and tokens distributed successfully: ${tokenAmount} G33 to ${donorAddress}`);
      
      // Return success with the distribution transaction hash
      return {
        id: donationId,
        success: true,
        distributionTxHash
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      console.error("Critical error processing token distribution:", errorMessage);
      
      // Update status to failed
      await updateDoc(docRef, {
        status: 'failed',
        error: errorMessage
      });
      
      // Return failure and propagate the error
      return {
        id: donationId,
        success: false,
        error: errorMessage
      };
    }
  }

  /**
   * Gets the total tokens available for distribution
   * @returns Amount of tokens available or 0 if unable to get
   */
  async getAvailableTokens(): Promise<string> {
    try {
      if (!(await this.ensureInitialized())) {
        return "0";
      }
      
      const availableTokens = await this.contract!.getAvailableTokens();
      return ethers.utils.formatEther(availableTokens);
    } catch (error) {
      console.error("Error getting available tokens:", error);
      return "0";
    }
  }

  /**
   * Gets distribution statistics
   */
  async getDistributionStats() {
    try {
      if (!(await this.ensureInitialized())) {
        return {
          totalDistributed: "0",
          totalDonationsUsd: "0",
          availableTokens: "0"
        };
      }
      
      const [totalDistributed, totalDonationsUsd, availableTokens] = await Promise.all([
        this.contract!.totalDistributedTokens(),
        this.contract!.totalDonationsUsd(),
        this.contract!.getAvailableTokens()
      ]);
      
      return {
        totalDistributed: ethers.utils.formatEther(totalDistributed),
        // totalDonationsUsd is stored with 2 extra decimal places (x100)
        totalDonationsUsd: (Number(totalDonationsUsd) / 100).toString(),
        availableTokens: ethers.utils.formatEther(availableTokens)
      };
    } catch (error) {
      console.error("Error getting distribution statistics:", error);
      return {
        totalDistributed: "0",
        totalDonationsUsd: "0",
        availableTokens: "0"
      };
    }
  }

  /**
   * Gets the total tokens already distributed to a specific donor
   * @param donorAddress Donor's address
   */
  async getTokensDistributedToDonor(donorAddress: string): Promise<string> {
    try {
      if (!(await this.ensureInitialized())) {
        return "0";
      }
      
      const tokenAmount = await this.contract!.tokensDistributed(donorAddress);
      return ethers.utils.formatEther(tokenAmount);
    } catch (error) {
      console.error(`Error getting tokens distributed to ${donorAddress}:`, error);
      return "0";
    }
  }

  /**
   * Gets the receipt of a transaction by its hash
   * @param txHash Transaction hash
   * @returns Transaction receipt or null if not found
   */
  async getTransactionReceipt(txHash: string): Promise<ethers.providers.TransactionReceipt | null> {
    try {
      if (!(await this.ensureInitialized())) {
        return null;
      }
      
      if (!this.provider) {
        console.error("Provider not available to check transaction receipt");
        return null;
      }
      
      return await this.provider.getTransactionReceipt(txHash);
    } catch (error) {
      console.error(`Error getting transaction receipt ${txHash}:`, error);
      return null;
    }
  }
}

// Ensure the service is initialized only on the server side
if (typeof window !== "undefined") {
  console.error("G33TokenDistributorService cannot be initialized on the client. Ignoring initialization.");
  throw new Error("Client-side execution detected. Service will not be initialized.");
}

// Export the service instance
export const g33TokenDistributorService = new G33TokenDistributorService();

// Update the distributor contract address in Firebase
(async () => {
  try {
    const distributorAddress = "0x137c762cb3eea5c8e5a6ed2fdf41dd47b5e13455"; // Address of the new G33TokenDistributorV2 contract
    await updateDoc(doc(db, "settings", "contractConfig"), {
      tokenDistributorAddress: distributorAddress
    });
    console.log("Distributor contract address updated in Firebase");
  } catch (err) {
    console.error("Error updating contract address in Firebase:", err);
  }
})();

console.log("--- Checking execution context ---");
console.log("process.env.NODE_ENV:", process.env.NODE_ENV);
console.log("process.env.DISTRIBUTOR_PRIVATE_KEY:", process.env.DISTRIBUTOR_PRIVATE_KEY ? "[REDACTED]" : "Not found");

// Ensure DISTRIBUTOR_PRIVATE_KEY-dependent logic is skipped on the client side
if (typeof window !== "undefined") {
  console.error("This code is running on the client side. Private environment variables are not available on the client.");
  throw new Error("Client-side execution detected. DISTRIBUTOR_PRIVATE_KEY-dependent logic will be skipped.");
}

if (typeof window !== "undefined") {
  console.error("This code is running on the client side. Private environment variables are not available on the client.");
} else {
  console.log("This code is running on the server side.");
}

export default g33TokenDistributorService;