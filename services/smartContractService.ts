import { ethers } from "ethers";
import { db } from "../lib/firebase";
import { collection, getDocs, query, where, doc, getDoc } from "firebase/firestore";
import { web3Service } from "./web3Service";

class SmartContractService {
  private provider: ethers.providers.Web3Provider | null = null;
  private signer: ethers.Signer | null = null;
  private contract: ethers.Contract | null = null;
  private contractAddress: string | null = null;
  private networkContractAddresses: Record<string, string> = {};
  private lastNetworkCheck: number = 0;
  private networkCheckInterval: number = 60000; // 1 minute cache

  // Mapeamento de endereços USDT por rede
  private USDT_ADDRESSES: Record<string, string> = {
    ethereum: '0xdAC17F958D2ee523a2206206994597C13D831ec7',    // Ethereum Mainnet USDT
    polygon: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F',     // Polygon USDT
    binance: '0x55d398326f99059fF775485246999027B3197955',     // BSC Mainnet USDT
    binanceTestnet: '0x337610d27c682E347C9cD60BD4b3b107C9d34dDd', // BSC Testnet USDT (para testes)
    avalanche: '0x9702230A8Ea53601f5cD2dc00fDBc13d4dF4A8c7',   // Avalanche USDT
    arbitrum: '0xFd086bC7CD5C481DCC9c85ebE478A1C0b69FCbb9',    // Arbitrum USDT
    optimism: '0x94b008aA00579c1307B0EF2c499aD98a8ce58e58'     // Optimism USDT
  };

  // Initialize the Web3 provider
  async init() {
    // Always use the provider and signer from web3Service
    this.provider = web3Service.provider;
    this.signer = web3Service.signer;
    if (this.provider && this.signer) {
      return true;
    }
    // Fallback: try to initialize from window.ethereum if not set (legacy)
    if (typeof window !== 'undefined' && window.ethereum) {
      this.provider = new ethers.providers.Web3Provider(window.ethereum);
      this.signer = this.provider.getSigner();
      return true;
    }
    return false;
  }

  // Initialize contract with optional specific address and forced network
  async initializeContract(network?: string, contractAddress?: string, forcedNetwork?: string) {
    const initialized = await this.init();
    
    if (initialized && contractAddress) {
      // Se um endereço de contrato é fornecido, use-o diretamente
      this.contractAddress = contractAddress;
      console.log(`Using provided contract address: ${contractAddress}`);
    } else if (initialized) {
      // Caso contrário, carregue do Firebase normalmente, usando forcedNetwork se fornecido
      await this.loadContractAddress(forcedNetwork);
    }
    
    return initialized;
  }
  
  // Switch to a different contract network without reinitializing everything
  async switchContractNetwork(chainId: number, contractAddress?: string, forcedNetwork?: string) {
    // Reset contract instance to force rebuilding
    this.contract = null;
    
    // If a specific contract address is provided, use it
    if (contractAddress) {
      this.contractAddress = contractAddress;
      console.log(`Switched to contract address: ${contractAddress} for chainId: ${chainId}`);
      return true;
    }
    
    // Otherwise load from Firebase for the new chainId
    try {
      const networkName = forcedNetwork || this.getNetworkName(chainId);
      console.log(`Switching to network: ${networkName} (ChainId: ${chainId})`);
      
      // Force refresh from Firebase by resetting timestamp
      this.lastNetworkCheck = 0;
      await this.loadContractAddress(forcedNetwork);
      
      if (this.contractAddress) {
        console.log(`Loaded contract address: ${this.contractAddress} for network: ${networkName}`);
        return true;
      } else {
        console.error(`No contract address found for network: ${networkName}`);
        return false;
      }
    } catch (error) {
      console.error("Error switching contract network:", error);
      return false;
    }
  }

  // Check if contract is initialized
  isContractInitialized() {
    return this.provider !== null && this.signer !== null;
  }

  // Get current network information
  async getCurrentNetwork() {
    if (!this.provider) {
      const initialized = await this.init();
      if (!initialized) throw new Error("Web3 not available");
    }

    try {
      const network = await this.provider!.getNetwork();
      const networkName = this.getNetworkName(network.chainId);
      
      return {
        chainId: network.chainId,
        networkName,
        networkDisplayName: this.getNetworkDisplayName(network.chainId),
        currency: this.getNetworkCurrency(networkName),
      };
    } catch (error) {
      console.error("Error getting current network:", error);
      throw new Error("Failed to get current network information");
    }
  }
  
  // Get network display name (user-friendly name)
  private getNetworkDisplayName(chainId: number): string {
    const displayNameMap: Record<number, string> = {
      1: 'Ethereum Mainnet',
      3: 'Ropsten Testnet',
      4: 'Rinkeby Testnet',
      5: 'Goerli Testnet',
      42: 'Kovan Testnet',
      56: 'Binance Smart Chain',
      97: 'BSC Testnet',
      137: 'Polygon (Matic)',
      80001: 'Mumbai Testnet (Polygon)',
      42161: 'Arbitrum One',
      10: 'Optimism',
      43114: 'Avalanche C-Chain',
      250: 'Fantom Opera',
    };
    
    return displayNameMap[chainId] || `Chain ID ${chainId}`;
  }

  // Get contract owner address with improved network handling
  async getContractOwner(forcedNetwork?: string) {
    // Ensure contract is initialized
    if (!this.provider || !this.signer) {
      const initialized = await this.init();
      if (!initialized) throw new Error("Web3 not available");
    }

    try {
      // 1. First, verify the current network
      let networkInfo;
      if (forcedNetwork) {
        networkInfo = {
          chainId: null,
          networkName: forcedNetwork,
          networkDisplayName: forcedNetwork,
          currency: this.getNetworkCurrency(forcedNetwork)
        };
      } else {
        networkInfo = await this.getCurrentNetwork();
      }
      console.log(`Current network: ${networkInfo.networkDisplayName} (${networkInfo.chainId})`);
      
      // 2. Check if there's a contract for this network in Firebase
      const contractAddress = await this.getContractAddressForNetwork(networkInfo.networkName);
      
      if (!contractAddress) {
        throw new Error(`No contract configured for network: ${networkInfo.networkDisplayName} (${networkInfo.chainId}). Please configure a contract for this network or switch to a supported network.`);
      }
      
      console.log(`Found contract for ${networkInfo.networkDisplayName}: ${contractAddress}`);
      
      // 3. Check if the contract address has code (is a valid contract)
      const bytecode = await this.provider!.getCode(contractAddress);
      if (bytecode === '0x' || bytecode === '0x0') {
        throw new Error(`No contract found at address ${contractAddress} on network ${networkInfo.networkDisplayName}. Please verify the contract is deployed.`);
      }
      
      // 4. Update this.contractAddress and reset contract instance to force rebuild
      this.contractAddress = contractAddress;
      this.contract = null;
      
      // 5. Create contract instance with owner methods
      if (!this.contract) {
        // ABI expandido com múltiplas possíveis implementações da função owner
        const abiFragment = [
          "function owner() public view returns (address)",
          "function getOwner() public view returns (address)",  // Alternativa em alguns contratos
          "function OWNER() public view returns (address)",     // Outra alternativa possível
          "function admin() public view returns (address)",     // Usado em alguns contratos OpenZeppelin
          "function getAdmin() public view returns (address)"   // Outra variação comum
        ];
        
        if (!this.signer) {
          throw new Error("Wallet not connected");
        }
        
        this.contract = new ethers.Contract(this.contractAddress, abiFragment, this.signer);
      }

      // 6. Try different owner implementation methods
      const methods = ['owner', 'getOwner', 'OWNER', 'admin', 'getAdmin'];
      
      for (const method of methods) {
        try {
          console.log(`Tentando chamar método ${method}() no contrato ${this.contractAddress}...`);
          if (typeof this.contract[method] === 'function') {
            const result = await this.contract[method]();
            console.log(`Método ${method}() bem-sucedido, proprietário: ${result}`);
            return result;
          }
        } catch (methodError: any) {
          console.log(`Método ${method}() falhou:`, methodError.message);
          // Continuar tentando outros métodos
        }
      }
      
      // If we got here, none of the methods worked
      console.error(`Nenhum método de obtenção de proprietário funcionou no contrato ${this.contractAddress} na rede ${networkInfo.networkDisplayName}`);
      throw new Error(`Não foi possível determinar o proprietário do contrato - contrato incompatível na rede ${networkInfo.networkDisplayName}`);
    } catch (error) {
      console.error("Error getting contract owner:", error);
      throw error;
    }
  }

  // Get contract address for a specific network from Firebase
  async getContractAddressForNetwork(networkName: string | null): Promise<string | null> {
    if (!networkName) return null;
    
    try {
      // First try to load from settings/paymentConfig
      const settingsCollection = collection(db, "settings");
      const settingsDoc = await getDoc(doc(settingsCollection, "paymentConfig"));
      
      if (settingsDoc.exists() && settingsDoc.data().contracts) {
        const contracts = settingsDoc.data().contracts;
        
        // 1. Try exact network name match
        if (contracts[networkName] && typeof contracts[networkName] === 'string') {
          return contracts[networkName];
        }
        
        // 2. Try lowercase network name
        if (contracts[networkName.toLowerCase()] && typeof contracts[networkName.toLowerCase()] === 'string') {
          return contracts[networkName.toLowerCase()];
        }
        
        // 3. For binanceTestnet, try special case
        if (networkName === 'binanceTestnet' && contracts.binanceTestnet) {
          return contracts.binanceTestnet;
        }
        
        // 4. Fallback to default if available
        if (contracts.default && typeof contracts.default === 'string') {
          console.log(`No specific contract for ${networkName}, using default contract address: ${contracts.default}`);
          return contracts.default;
        }
      }
      
      // If we reach here, we didn't find a contract address for this network
      console.warn(`No contract address found for network: ${networkName}`);
      return null;
      
    } catch (error) {
      console.error(`Error getting contract address for network ${networkName}:`, error);
      return null;
    }
  }

  // Check if current wallet is the contract owner
  async checkOwnership() {
    try {
      if (!this.provider || !this.signer) {
        const initialized = await this.init();
        if (!initialized) throw new Error("Web3 not available");
      }

      if (!this.signer) {
        throw new Error("Wallet not connected");
      }

      try {
        const ownerAddress = await this.getContractOwner();
        const currentAddress = await this.signer.getAddress();
        
        return ownerAddress.toLowerCase() === currentAddress.toLowerCase();
      } catch (error) {
        console.error("Error checking owner:", error);
        return false;
      }
    } catch (error) {
      console.error("Error checking ownership:", error);
      return false; // Em caso de erro, assumir que não é o dono por segurança
    }
  }

  // Load contract addresses from Firestore, allow forcedNetwork override
  private async loadContractAddress(forcedNetwork?: string) {
    try {
      // Check if we need to refresh network addresses from Firebase
      const now = Date.now();
      if (now - this.lastNetworkCheck > this.networkCheckInterval || Object.keys(this.networkContractAddresses).length === 0) {
        // First try to load from settings/paymentConfig
        const settingsCollection = collection(db, "settings");
        const settingsDoc = await getDoc(doc(settingsCollection, "paymentConfig"));
        
        if (settingsDoc.exists() && settingsDoc.data().contracts) {
          const contracts = settingsDoc.data().contracts;
          // Store all available network contracts
          for (const [network, address] of Object.entries(contracts)) {
            if (address && typeof address === 'string') {
              this.networkContractAddresses[network.toLowerCase()] = address;
            }
          }
          console.log("Loaded contract addresses from settings/paymentConfig:", this.networkContractAddresses);
        } else {
          // Fallback to old method - contractConfigs collection
          const contractsCollection = collection(db, "contractConfigs");
          const q = query(contractsCollection, where("type", "==", "payment"));
          const contractSnapshot = await getDocs(q);
          
          if (!contractSnapshot.empty) {
            const contractData = contractSnapshot.docs[0].data();
            // Store this as the default contract
            if (contractData.contractAddress) {
              this.contractAddress = contractData.contractAddress;
              this.networkContractAddresses['default'] = contractData.contractAddress;
            }
          }
          console.log("Loaded contract address from contractConfigs:", this.contractAddress);
        }
        
        this.lastNetworkCheck = now;
      }      // If we have a network-specific address for the current network, use that
      let networkName: string | null = null;
      if (forcedNetwork) {
        // Normalize the forced network name to match our network keys
        networkName = this.normalizeNetworkName(forcedNetwork);
        console.log(`Using forced network: ${forcedNetwork} (normalized to: ${networkName})`);
      } else if (this.provider) {
        const network = await this.provider.getNetwork();
        networkName = this.getNetworkName(network.chainId);
      }
      
      // Debug: print all available network addresses
      console.log(`Available contract addresses: ${JSON.stringify(Object.keys(this.networkContractAddresses))}`);
      
      if (networkName) {
        // Try multiple variations of the network name to find a match
        const possibleKeys = [
          networkName,
          networkName.toLowerCase(),
          networkName.replace(' ', ''),
          networkName.replace(' Mainnet', ''),
          networkName.replace(' Mainnet', '').toLowerCase()
        ];
        
        // Check if any of these keys exist in the networkContractAddresses
        for (const key of possibleKeys) {
          if (this.networkContractAddresses[key]) {
            this.contractAddress = this.networkContractAddresses[key];
            console.log(`Found contract address for ${networkName} using key ${key}:`, this.contractAddress);
            return;
          }
        }
      }
      
      // If no network-specific address was found, use the default if available
      if (this.networkContractAddresses['default'] && !this.contractAddress) {
        this.contractAddress = this.networkContractAddresses['default'];
        console.log("Using default contract address:", this.contractAddress);
      }
      
      if (!this.contractAddress) {
        throw new Error("Payment contract address not configured for the current network");
      }
    } catch (error) {
      console.error("Error loading contract address:", error);
      throw error;
    }
  }
    // Helper method to get network name from chain ID
  private getNetworkName(chainId: number): string | null {
    const networkMap: Record<number, string> = {
      1: 'ethereum',    // Ethereum Mainnet
      3: 'ropsten',     // Ropsten Testnet
      4: 'rinkeby',     // Rinkeby Testnet
      5: 'goerli',      // Goerli Testnet
      42: 'kovan',      // Kovan Testnet
      56: 'binance',    // Binance Smart Chain
      97: 'binanceTestnet', // Binance Smart Chain Testnet
      137: 'polygon',   // Polygon (Matic) Mainnet
      80001: 'mumbai',  // Mumbai Testnet (Polygon)
      42161: 'arbitrum', // Arbitrum
      10: 'optimism',   // Optimism
      43114: 'avalanche', // Avalanche
      250: 'fantom',    // Fantom
    };
    
    return networkMap[chainId] || null;
  }
  
  // Helper function to normalize network names to match USDT_ADDRESSES keys
  private normalizeNetworkName(networkName: string): string {
    // Convert to lowercase first
    let normalized = networkName.toLowerCase();
    
    // Remove "mainnet" suffix if present
    normalized = normalized.replace(" mainnet", "");
    
    // Handle specific network name mappings
    if (normalized.includes("binance") || normalized.includes("bsc")) {
      return normalized.includes("testnet") ? "binanceTestnet" : "binance";
    } else if (normalized.includes("ethereum") || normalized === "eth") {
      return "ethereum";
    } else if (normalized.includes("polygon") || normalized.includes("matic")) {
      return "polygon";
    } else if (normalized.includes("avalanche") || normalized.includes("avax")) {
      return "avalanche";
    } else if (normalized.includes("arbitrum")) {
      return "arbitrum";
    } else if (normalized.includes("optimism")) {
      return "optimism";
    } else if (normalized.includes("mumbai")) {
      return "mumbai";
    } else if (normalized.includes("testnet") && normalized.includes("binance")) {
      return "binanceTestnet";
    }
    
    // Default: return the cleaned network name
    return normalized;
  }

  // Get fee collector address
  async getFeeCollector() {
    try {
      // Verify contract initialization
      if (!this.provider || !this.signer || !this.contractAddress) {
        const initialized = await this.init();
        if (!initialized) throw new Error("Web3 not available");
      }

      // Validate contract address explicitly
      if (!this.contractAddress) {
        throw new Error("Contract address not configured");
      }

      // Define contract ABI for this specific operation
      const contractABI = [
        "function feeCollector() external view returns (address)"
      ];

      // Create contract instance with non-null contract address
      // Uso do operador de coalescing para evitar passar null
      const provider = this.provider || ethers.providers.getDefaultProvider();
      const contract = new ethers.Contract(this.contractAddress, contractABI, provider);

      // Call the view function to get the fee collector address
      const feeCollectorAddress = await contract.feeCollector();
      console.log(`Fee collector address read from contract: ${feeCollectorAddress}`);
      
      return feeCollectorAddress;
    } catch (error: any) {
      console.error("Error reading fee collector address:", error);
      // Return a default address if there's an error
      return "0x0000000000000000000000000000000000000000";
    }
  }

  // Get development wallet address
  async getDevelopmentWallet() {
    try {
      // Verify contract initialization
      if (!this.provider || !this.signer || !this.contractAddress) {
        const initialized = await this.init();
        if (!initialized) throw new Error("Web3 not available");
      }

      // Validate contract address explicitly
      if (!this.contractAddress) {
        throw new Error("Contract address not configured");
      }

      // Define contract ABI for this specific operation
      const contractABI = [
        "function developmentWallet() external view returns (address)"
      ];

      // Create contract instance with non-null contract address
      // Uso do operador de coalescing para evitar passar null
      const provider = this.provider || ethers.providers.getDefaultProvider();
      const contract = new ethers.Contract(this.contractAddress, contractABI, provider);

      // Call the view function to get the development wallet address
      const developmentWalletAddress = await contract.developmentWallet();
      console.log(`Development wallet address read from contract: ${developmentWalletAddress}`);
      
      return developmentWalletAddress;
    } catch (error: any) {
      console.error("Error reading development wallet address:", error);
      // Return a default address if there's an error
      return "0x0000000000000000000000000000000000000000";
    }
  }

  // Get charity wallet address
  async getCharityWallet() {
    try {
      // Verify contract initialization
      if (!this.provider || !this.signer || !this.contractAddress) {
        const initialized = await this.init();
        if (!initialized) throw new Error("Web3 not available");
      }

      // Validate contract address explicitly
      if (!this.contractAddress) {
        throw new Error("Contract address not configured");
      }

      // Define contract ABI for this specific operation
      const contractABI = [
        "function charityWallet() external view returns (address)"
      ];

      // Create contract instance with non-null contract address
      // Uso do operador de coalescing para evitar passar null
      const provider = this.provider || ethers.providers.getDefaultProvider();
      const contract = new ethers.Contract(this.contractAddress, contractABI, provider);

      // Call the view function to get the charity wallet address
      const charityWalletAddress = await contract.charityWallet();
      console.log(`Charity wallet address read from contract: ${charityWalletAddress}`);
      
      return charityWalletAddress;
    } catch (error: any) {
      console.error("Error reading charity wallet address:", error);
      // Return a default address if there's an error
      return "0x0000000000000000000000000000000000000000";
    }
  }

  // Get evolution wallet address
  async getEvolutionWallet() {
    try {
      // Verify contract initialization
      if (!this.provider || !this.signer || !this.contractAddress) {
        const initialized = await this.init();
        if (!initialized) throw new Error("Web3 not available");
      }

      // Validate contract address explicitly
      if (!this.contractAddress) {
        throw new Error("Contract address not configured");
      }

      // Define contract ABI for this specific operation
      const contractABI = [
        "function evolutionWallet() external view returns (address)"
      ];

      // Create contract instance with non-null contract address
      // Uso do operador de coalescing para evitar passar null
      const provider = this.provider || ethers.providers.getDefaultProvider();
      const contract = new ethers.Contract(this.contractAddress, contractABI, provider);

      // Call the view function to get the evolution wallet address
      const evolutionWalletAddress = await contract.evolutionWallet();
      console.log(`Evolution wallet address read from contract: ${evolutionWalletAddress}`);
      
      return evolutionWalletAddress;
    } catch (error: any) {
      console.error("Error reading evolution wallet address:", error);
      // Return a default address if there's an error
      return "0x0000000000000000000000000000000000000000";
    }
  }

  // Get distribution percentages
  async getDistributionPercentages() {
    try {
      // Verify contract initialization
      if (!this.provider || !this.signer || !this.contractAddress) {
        const initialized = await this.init();
        if (!initialized) throw new Error("Web3 not available");
      }

      // Validate contract address explicitly
      if (!this.contractAddress) {
        throw new Error("Contract address not configured");
      }

      // Define contract ABI for this specific operation
      const contractABI = [
        "function feePercentage() external view returns (uint256)",
        "function developmentPercentage() external view returns (uint256)",
        "function charityPercentage() external view returns (uint256)",
        "function evolutionPercentage() external view returns (uint256)"
      ];

      // Create contract instance with non-null contract address
      // Uso do operador de coalescing para evitar passar null
      const provider = this.provider || ethers.providers.getDefaultProvider();
      const contract = new ethers.Contract(this.contractAddress, contractABI, provider);

      // Call the view functions to get the percentages
      const feePercentage = parseInt(await contract.feePercentage());
      const developmentPercentage = parseInt(await contract.developmentPercentage());
      const charityPercentage = parseInt(await contract.charityPercentage());
      const evolutionPercentage = parseInt(await contract.evolutionPercentage());
      
      // Calculate total
      const totalPercentage = feePercentage + developmentPercentage + charityPercentage + evolutionPercentage;
      
      console.log(`Percentages read from contract: fee=${feePercentage}, dev=${developmentPercentage}, charity=${charityPercentage}, evolution=${evolutionPercentage}, total=${totalPercentage}`);
      
      return {
        feePercentage,
        developmentPercentage,
        charityPercentage,
        evolutionPercentage,
        totalPercentage
      };
    } catch (error: any) {
      console.error("Error reading distribution percentages:", error);
      // Return some default values if there's an error
      return {
        feePercentage: 0,
        developmentPercentage: 0,
        charityPercentage: 0,
        evolutionPercentage: 0,
        totalPercentage: 0
      };
    }
  }

  // Update fee collector address
  async updateFeeCollector(address: string, options?: any) {
    try {
      // Verify contract initialization
      if (!this.provider || !this.signer || !this.contractAddress) {
        const initialized = await this.init();
        if (!initialized) throw new Error("Web3 not available");
      }

      if (!this.signer) {
        throw new Error("Wallet not connected or signer not available");
      }

      // Validate contract address explicitly
      if (!this.contractAddress) {
        throw new Error("Contract address not configured");
      }

      // Validate address
      if (!address || !address.startsWith('0x') || address.length !== 42) {
        throw new Error("Invalid wallet address format");
      }

      // Check if the user is the owner
      const isOwner = await this.checkOwnership();
      if (!isOwner) {
        throw new Error("Only the contract owner can update the fee collector");
      }

      // Define contract ABI for this specific operation
      const contractABI = [
        "function updateFeeCollector(address newFeeCollector) external"
      ];

      // Create contract instance with non-null contract address
      const contract = new ethers.Contract(this.contractAddress, contractABI, this.signer);

      // Prepare transaction options
      const txOptions = {
        gasLimit: options?.gasLimit || ethers.utils.hexlify(200000),
        ...(options || {})
      };

      console.log(`Sending transaction to update fee collector to ${address}`);
      
      // Call the contract function - this will trigger a wallet popup
      const tx = await contract.updateFeeCollector(address, txOptions);
      
      // Wait for transaction confirmation
      const receipt = await tx.wait(1); // Wait for 1 confirmation

      console.log(`Fee collector updated successfully in tx: ${receipt.transactionHash}`);
      
      return {
        success: true,
        transactionHash: receipt.transactionHash,
        blockNumber: receipt.blockNumber
      };
    } catch (error: any) {
      console.error("Error updating fee collector:", error);
      throw new Error(`Failed to update fee collector: ${error.message || error}`);
    }
  }

  // Update fee percentage
  async updateFeePercentage(percentage: number, options?: any) {
    try {
      // Verify contract initialization
      if (!this.provider || !this.signer || !this.contractAddress) {
        const initialized = await this.init();
        if (!initialized) throw new Error("Web3 not available");
      }

      if (!this.signer) {
        throw new Error("Wallet not connected or signer not available");
      }

      // Validate contract address
      if (!this.contractAddress) {
        throw new Error("Contract address not configured");
      }

      // Check if the user is the owner
      const isOwner = await this.checkOwnership();
      if (!isOwner) {
        throw new Error("Only the contract owner can update the fee percentage");
      }

      // Validate percentage (0-300 in base 1000, representing 0-30%)
      if (percentage < 0 || percentage > 300) {
        throw new Error("Fee percentage must be between 0 and 300 (0-30%)");
      }

      // Define contract ABI for this specific operation
      const contractABI = [
        "function updateFeePercentage(uint256 newPercentage) external"
      ];

      // Create contract instance
      const contract = new ethers.Contract(this.contractAddress, contractABI, this.signer);

      // Prepare transaction options
      const txOptions = {
        gasLimit: options?.gasLimit || ethers.utils.hexlify(200000),
        ...(options || {})
      };

      console.log(`Sending transaction to update fee percentage to ${percentage}`);
      
      // Call the contract function - this will trigger a wallet popup
      const tx = await contract.updateFeePercentage(percentage, txOptions);
      
      // Wait for transaction confirmation
      const receipt = await tx.wait(1); // Wait for 1 confirmation

      console.log(`Fee percentage updated successfully in tx: ${receipt.transactionHash}`);
      
      return {
        success: true,
        transactionHash: receipt.transactionHash,
        blockNumber: receipt.blockNumber
      };
    } catch (error: any) {
      console.error("Error updating fee percentage:", error);
      throw new Error(`Failed to update fee percentage: ${error.message || error}`);
    }
  }

  // Update development wallet address
  async updateDevelopmentWallet(address: string, options?: any) {
    try {
      // Verify contract initialization
      if (!this.provider || !this.signer || !this.contractAddress) {
        const initialized = await this.init();
        if (!initialized) throw new Error("Web3 not available");
      }

      if (!this.signer) {
        throw new Error("Wallet not connected or signer not available");
      }
      
      // Validate contract address explicitly
      if (!this.contractAddress) {
        throw new Error("Contract address not configured");
      }

      // Validate address
      if (!address || !address.startsWith('0x') || address.length !== 42) {
        throw new Error("Invalid wallet address format");
      }

      // Check if the user is the owner
      const isOwner = await this.checkOwnership();
      if (!isOwner) {
        throw new Error("Only the contract owner can update the development wallet");
      }

      // Define contract ABI for this specific operation
      const contractABI = [
        "function updateDevelopmentWallet(address newAddress) external"
      ];

      // Create contract instance
      const contract = new ethers.Contract(this.contractAddress, contractABI, this.signer);

      // Prepare transaction options
      const txOptions = {
        gasLimit: options?.gasLimit || ethers.utils.hexlify(200000),
        ...(options || {})
      };

      console.log(`Sending transaction to update development wallet to ${address}`);
      
      // Call the contract function - this will trigger a wallet popup
      const tx = await contract.updateDevelopmentWallet(address, txOptions);
      
      // Wait for transaction confirmation
      const receipt = await tx.wait(1); // Wait for 1 confirmation

      console.log(`Development wallet updated successfully in tx: ${receipt.transactionHash}`);
      
      return {
        success: true,
        transactionHash: receipt.transactionHash,
        blockNumber: receipt.blockNumber
      };
    } catch (error: any) {
      console.error("Error updating development wallet:", error);
      throw new Error(`Failed to update development wallet: ${error.message || error}`);
    }
  }

  // Update development percentage
  async updateDevelopmentPercentage(percentage: number, options?: any) {
    try {
      // Verify contract initialization
      if (!this.provider || !this.signer || !this.contractAddress) {
        const initialized = await this.init();
        if (!initialized) throw new Error("Web3 not available");
      }

      if (!this.signer) {
        throw new Error("Wallet not connected or signer not available");
      }

      // Validate contract address
      if (!this.contractAddress) {
        throw new Error("Contract address not configured");
      }

      // Check if the user is the owner
      const isOwner = await this.checkOwnership();
      if (!isOwner) {
        throw new Error("Only the contract owner can update the development percentage");
      }

      // Validate percentage (0-300 in base 1000, representing 0-30%)
      if (percentage < 0 || percentage > 300) {
        throw new Error("Development percentage must be between 0 and 300 (0-30%)");
      }

      // Define contract ABI for this specific operation
      const contractABI = [
        "function updateDevelopmentPercentage(uint256 newPercentage) external"
      ];

      // Create contract instance
      const contract = new ethers.Contract(this.contractAddress, contractABI, this.signer);

      // Prepare transaction options
      const txOptions = {
        gasLimit: options?.gasLimit || ethers.utils.hexlify(200000),
        ...(options || {})
      };

      console.log(`Sending transaction to update development percentage to ${percentage}`);
      
      // Call the contract function - this will trigger a wallet popup
      const tx = await contract.updateDevelopmentPercentage(percentage, txOptions);
      
      // Wait for transaction confirmation
      const receipt = await tx.wait(1); // Wait for 1 confirmation

      console.log(`Development percentage updated successfully in tx: ${receipt.transactionHash}`);
      
      return {
        success: true,
        transactionHash: receipt.transactionHash,
        blockNumber: receipt.blockNumber
      };
    } catch (error: any) {
      console.error("Error updating development percentage:", error);
      throw new Error(`Failed to update development percentage: ${error.message || error}`);
    }
  }

  // Update charity wallet address
  async updateCharityWallet(address: string, options?: any) {
    try {
      // Verify contract initialization
      if (!this.provider || !this.signer || !this.contractAddress) {
        const initialized = await this.init();
        if (!initialized) throw new Error("Web3 not available");
      }

      if (!this.signer) {
        throw new Error("Wallet not connected or signer not available");
      }
      
      // Validate contract address explicitly
      if (!this.contractAddress) {
        throw new Error("Contract address not configured");
      }

      // Validate address
      if (!address || !address.startsWith('0x') || address.length !== 42) {
        throw new Error("Invalid wallet address format");
      }

      // Check if the user is the owner
      const isOwner = await this.checkOwnership();
      if (!isOwner) {
        throw new Error("Only the contract owner can update the charity wallet");
      }

      // Define contract ABI for this specific operation
      const contractABI = [
        "function updateCharityWallet(address newAddress) external"
      ];

      // Create contract instance
      const contract = new ethers.Contract(this.contractAddress, contractABI, this.signer);

      // Prepare transaction options
      const txOptions = {
        gasLimit: options?.gasLimit || ethers.utils.hexlify(200000),
        ...(options || {})
      };

      console.log(`Sending transaction to update charity wallet to ${address}`);
      
      // Call the contract function - this will trigger a wallet popup
      const tx = await contract.updateCharityWallet(address, txOptions);
      
      // Wait for transaction confirmation
      const receipt = await tx.wait(1); // Wait for 1 confirmation

      console.log(`Charity wallet updated successfully in tx: ${receipt.transactionHash}`);
      
      return {
        success: true,
        transactionHash: receipt.transactionHash,
        blockNumber: receipt.blockNumber
      };
    } catch (error: any) {
      console.error("Error updating charity wallet:", error);
      throw new Error(`Failed to update charity wallet: ${error.message || error}`);
    }
  }

  // Update charity percentage
  async updateCharityPercentage(percentage: number, options?: any) {
    try {
      // Verify contract initialization
      if (!this.provider || !this.signer || !this.contractAddress) {
        const initialized = await this.init();
        if (!initialized) throw new Error("Web3 not available");
      }

      if (!this.signer) {
        throw new Error("Wallet not connected or signer not available");
      }
      
      // Validate contract address explicitly
      if (!this.contractAddress) {
        throw new Error("Contract address not configured");
      }

      // Check if the user is the owner
      const isOwner = await this.checkOwnership();
      if (!isOwner) {
        throw new Error("Only the contract owner can update the charity percentage");
      }

      // Validate percentage (0-300 in base 1000, representing 0-30%)
      if (percentage < 0 || percentage > 300) {
        throw new Error("Charity percentage must be between 0 and 300 (0-30%)");
      }

      // Define contract ABI for this specific operation
      const contractABI = [
        "function updateCharityPercentage(uint256 newPercentage) external"
      ];

      // Create contract instance
      const contract = new ethers.Contract(this.contractAddress, contractABI, this.signer);

      // Prepare transaction options
      const txOptions = {
        gasLimit: options?.gasLimit || ethers.utils.hexlify(200000),
        ...(options || {})
      };

      console.log(`Sending transaction to update charity percentage to ${percentage}`);
      
      // Call the contract function - this will trigger a wallet popup
      const tx = await contract.updateCharityPercentage(percentage, txOptions);
      
      // Wait for transaction confirmation
      const receipt = await tx.wait(1); // Wait for 1 confirmation

      console.log(`Charity percentage updated successfully in tx: ${receipt.transactionHash}`);
      
      return {
        success: true,
        transactionHash: receipt.transactionHash,
        blockNumber: receipt.blockNumber
      };
    } catch (error: any) {
      console.error("Error updating charity percentage:", error);
      throw new Error(`Failed to update charity percentage: ${error.message || error}`);
    }
  }

  // Update evolution wallet address
  async updateEvolutionWallet(address: string, options?: any) {
    try {
      // Verify contract initialization
      if (!this.provider || !this.signer || !this.contractAddress) {
        const initialized = await this.init();
        if (!initialized) throw new Error("Web3 not available");
      }

      if (!this.signer) {
        throw new Error("Wallet not connected or signer not available");
      }
      
      // Validate contract address explicitly
      if (!this.contractAddress) {
        throw new Error("Contract address not configured");
      }

      // Validate address
      if (!address || !address.startsWith('0x') || address.length !== 42) {
        throw new Error("Invalid wallet address format");
      }

      // Check if the user is the owner
      const isOwner = await this.checkOwnership();
      if (!isOwner) {
        throw new Error("Only the contract owner can update the evolution wallet");
      }

      // Define contract ABI for this specific operation
      const contractABI = [
        "function updateEvolutionWallet(address newAddress) external"
      ];

      // Create contract instance
      const contract = new ethers.Contract(this.contractAddress, contractABI, this.signer);

      // Prepare transaction options
      const txOptions = {
        gasLimit: options?.gasLimit || ethers.utils.hexlify(200000),
        ...(options || {})
      };

      console.log(`Sending transaction to update evolution wallet to ${address}`);
      
      // Call the contract function - this will trigger a wallet popup
      const tx = await contract.updateEvolutionWallet(address, txOptions);
      
      // Wait for transaction confirmation
      const receipt = await tx.wait(1); // Wait for 1 confirmation

      console.log(`Evolution wallet updated successfully in tx: ${receipt.transactionHash}`);
      
      return {
        success: true,
        transactionHash: receipt.transactionHash,
        blockNumber: receipt.blockNumber
      };
    } catch (error: any) {
      console.error("Error updating evolution wallet:", error);
      throw new Error(`Failed to update evolution wallet: ${error.message || error}`);
    }
  }

  // Update evolution percentage
  async updateEvolutionPercentage(percentage: number, options?: any) {
    try {
      // Verify contract initialization
      if (!this.provider || !this.signer || !this.contractAddress) {
        const initialized = await this.init();
        if (!initialized) throw new Error("Web3 not available");
      }

      if (!this.signer) {
        throw new Error("Wallet not connected or signer not available");
      }
      
      // Validate contract address explicitly
      if (!this.contractAddress) {
        throw new Error("Contract address not configured");
      }

      // Check if the user is the owner
      const isOwner = await this.checkOwnership();
      if (!isOwner) {
        throw new Error("Only the contract owner can update the evolution percentage");
      }

      // Validate percentage (0-300 in base 1000, representing 0-30%)
      if (percentage < 0 || percentage > 300) {
        throw new Error("Evolution percentage must be between 0 and 300 (0-30%)");
      }

      // Define contract ABI for this specific operation
      const contractABI = [
        "function updateEvolutionPercentage(uint256 newPercentage) external"
      ];

      // Create contract instance
      const contract = new ethers.Contract(this.contractAddress, contractABI, this.signer);

      // Prepare transaction options
      const txOptions = {
        gasLimit: options?.gasLimit || ethers.utils.hexlify(200000),
        ...(options || {})
      };

      console.log(`Sending transaction to update evolution percentage to ${percentage}`);
      
      // Call the contract function - this will trigger a wallet popup
      const tx = await contract.updateEvolutionPercentage(percentage, txOptions);
      
      // Wait for transaction confirmation
      const receipt = await tx.wait(1); // Wait for 1 confirmation

      console.log(`Evolution percentage updated successfully in tx: ${receipt.transactionHash}`);
      
      return {
        success: true,
        transactionHash: receipt.transactionHash,
        blockNumber: receipt.blockNumber
      };
    } catch (error: any) {
      console.error("Error updating evolution percentage:", error);
      throw new Error(`Failed to update evolution percentage: ${error.message || error}`);
    }
  }

  // Process payment for jobs using smart contract
  async processJobPayment(planId: string, amount: number, companyId: string, forcedNetwork?: string) {
    try {
      // 1. Validate inputs
      if (!planId || !companyId) {
        throw new Error("Plan ID and Company ID are required");
      }
      
      if (amount === undefined || amount === null || isNaN(amount)) {
        throw new Error("The plan value is invalid. Please ensure the plan is correctly synchronized with the database.");
      }
      
      // 2. Initialize Web3 if not already initialized
      if (!this.provider || !this.signer) {
        const initialized = await this.init();
        if (!initialized) throw new Error("Web3 not available");
      }

      // Ensure signer exists before proceeding
      if (!this.signer) {
        throw new Error("Wallet not connected or signer not available");
      }
      
      // 3. Get current network and wallet information
      let network, networkName, walletAddress;
      if (forcedNetwork) {
        networkName = forcedNetwork;
        network = { chainId: null };
        walletAddress = await this.signer.getAddress();
      } else {
        network = await this.provider!.getNetwork();
        networkName = this.getNetworkName(network.chainId);
        walletAddress = await this.signer.getAddress();
      }
      
      console.log(`Processing payment on network: ${networkName} (${network.chainId}) from wallet: ${walletAddress}`);
      
      // 4. Get job plan details to validate currency and amount
      const planDoc = await getDoc(doc(db, "jobPlans", planId));
      if (!planDoc.exists()) {
        throw new Error(`Job plan with ID ${planId} not found`);
      }
      
      const planData = planDoc.data();
      const planPrice = planData.price;
      const planCurrency = planData.currency;
      
      // 5. Check if the network currency matches the plan currency
      // This would need to be adjusted based on your specific implementation
      const networkCurrency = this.getNetworkCurrency(networkName);
      if (networkCurrency && planCurrency && 
          networkCurrency.toLowerCase() !== planCurrency.toLowerCase()) {
        throw new Error(`Currency mismatch: Plan requires ${planCurrency}, but you're connected to ${networkName} (${networkCurrency}). Please switch networks.`);
      }
      
      // 6. Verify amount matches the plan price
      if (planPrice !== amount) {
        console.warn(`Price mismatch: Plan price is ${planPrice} but received ${amount}`);
        // Some flexibility may be needed due to floating point precision
      }

      // 7. Load the appropriate contract address based on network
      await this.loadContractAddress(forcedNetwork);
      if (!this.contractAddress) {
        throw new Error(`No contract address configured for network: ${networkName || 'unknown'}`);
      }
      
      // 8. Get contract ABI (simplified for job payment)
      const abi = [
        "function processPayment(string planId, string companyId) public payable returns (bool)"
      ];

      // 9. Create contract instance with the appropriate address and signer
      const contract = new ethers.Contract(this.contractAddress, abi, this.signer);
      
      // 10. Convert amount to wei for the transaction
      const valueInWei = ethers.utils.parseEther(amount.toString());
      
      console.log(`Sending transaction to contract: ${this.contractAddress}`);
      console.log(`Parameters: planId=${planId}, companyId=${companyId}, value=${valueInWei.toString()}`);
      
      // 11. Call the contract function
      const tx = await contract.processPayment(planId, companyId, {
        value: valueInWei,
        gasLimit: ethers.utils.hexlify(300000) // Set a reasonable gas limit
      });
      
      // 12. Wait for confirmation
      const receipt = await tx.wait();
      
      console.log(`Transaction confirmed: ${receipt.transactionHash}`);
      
      return {
        transactionHash: receipt.transactionHash,
        blockNumber: receipt.blockNumber,
        success: true
      };
    } catch (error) {
      console.error("Error processing payment:", error);
      throw error;
    }
  }
  
  /**
   * Processa pagamento de JobPost usando USDT (token)
   * @param planId ID do plano selecionado
   * @param amount Valor a ser pago
   * @param companyId ID da empresa (usado como identificador adicional no contrato)
   */  // Helper function to normalize network names to match USDT_ADDRESSES keys
  private normalizeNetworkName(networkName: string): string {
    // Convert to lowercase first
    let normalized = networkName.toLowerCase();
    
    // Remove "mainnet" suffix if present
    normalized = normalized.replace(" mainnet", "");
    
    // Handle specific network name mappings
    if (normalized.includes("binance") || normalized.includes("bsc")) {
      return "binance";
    } else if (normalized.includes("ethereum") || normalized === "eth") {
      return "ethereum";
    } else if (normalized.includes("polygon") || normalized.includes("matic")) {
      return "polygon";
    } else if (normalized.includes("avalanche") || normalized.includes("avax")) {
      return "avalanche";
    } else if (normalized.includes("arbitrum")) {
      return "arbitrum";
    } else if (normalized.includes("optimism")) {
      return "optimism";
    } else if (normalized.includes("mumbai")) {
      return "mumbai";
    } else if (normalized.includes("testnet") && normalized.includes("binance")) {
      return "binanceTestnet";
    }
    
    return normalized;
  }

  async processJobPaymentWithUSDT(planId: string, amount: number, companyId: string, forcedNetwork?: string) {
    try {
      // 1. Validações básicas
      if (!planId || !companyId) {
        throw new Error("Plan ID e Company ID são obrigatórios");
      }
      
      if (amount === undefined || amount === null || isNaN(amount)) {
        throw new Error("O valor do plano é inválido. Verifique se o plano está sincronizado corretamente com o banco de dados.");
      }
      
      // 2. Inicializar Web3 se necessário
      if (!this.provider || !this.signer) {
        const initialized = await this.init();
        if (!initialized) throw new Error("Web3 não está disponível");
      }

      if (!this.signer) {
        throw new Error("Carteira não conectada ou signer não disponível");
      }
      
      // 3. Obter informações da rede e carteira
      let networkName, network;
      if (forcedNetwork) {
        // Normalize the forced network name to match our USDT_ADDRESSES keys
        networkName = this.normalizeNetworkName(forcedNetwork);
        console.log(`Using forced network: ${forcedNetwork} (normalized to: ${networkName})`);
        network = { chainId: null };
      } else {
        network = await this.provider!.getNetwork();
        networkName = this.getNetworkName(network.chainId);
      }
      const walletAddress = await this.signer.getAddress();
      
      console.log(`Processando pagamento em USDT na rede: ${networkName} (${network.chainId}) a partir da carteira: ${walletAddress}`);
      
      // 4. Obter detalhes do plano para validar
      const planDoc = await getDoc(doc(db, "jobPlans", planId));
      if (!planDoc.exists()) {
        throw new Error(`Plano com ID ${planId} não encontrado`);
      }
      
      const planData = planDoc.data();
      const planPrice = planData.price;
      
      // 5. Verificar se este plano aceita USDT (currency deve ser USDT)
      if (planData.currency.toUpperCase() !== 'USDT') {
        throw new Error(`Este plano não aceita pagamento em USDT. Moeda requerida: ${planData.currency}`);
      }
        // 6. Verificar se a rede atual suporta USDT
      let normalizedNetworkName = networkName ? this.normalizeNetworkName(networkName) : null;
      if (!normalizedNetworkName || !this.USDT_ADDRESSES[normalizedNetworkName]) {
        throw new Error(`A rede atual (${networkName || 'desconhecida'}) não tem suporte para USDT. Conecte-se a uma dessas redes: ${Object.keys(this.USDT_ADDRESSES).join(', ')}`);
      }
      
      // Não vamos verificar se networkCurrency === planCurrency pois o USDT é um token que existe em várias redes
      // A verificação relevante aqui é se o USDT existe na rede atual, o que já foi feito acima
      
      // 7. Carregar o endereço do contrato com base na rede
      await this.loadContractAddress(forcedNetwork);
      if (!this.contractAddress) {
        throw new Error(`Nenhum contrato configurado para a rede: ${networkName || 'desconhecida'}`);
      }
        // 8. Obter o endereço do token USDT na rede atual
      const usdtAddress = this.USDT_ADDRESSES[normalizedNetworkName];
      if (!usdtAddress) {
        throw new Error(`Endereço USDT não encontrado para a rede ${networkName} (normalizado para: ${normalizedNetworkName})`);
      }
      
      // 9. ABI para interagir com token ERC20 (USDT)
      const tokenABI = [
        "function approve(address spender, uint256 amount) public returns (bool)",
        "function allowance(address owner, address spender) public view returns (uint256)",
        "function balanceOf(address account) public view returns (uint256)",
        "function decimals() public view returns (uint8)"
      ];
      
      // 10. Criar instância do contrato de token
      const tokenContract = new ethers.Contract(usdtAddress, tokenABI, this.signer);
      
      // 11. Verificar o saldo da carteira (USDT)
      const decimals = await tokenContract.decimals();
      const balance = await tokenContract.balanceOf(walletAddress);
      const formattedBalance = ethers.utils.formatUnits(balance, decimals);
      
      if (parseFloat(formattedBalance) < amount) {
        throw new Error(`Saldo insuficiente de USDT. Você tem ${formattedBalance} USDT, mas precisa de ${amount} USDT.`);
      }
      
      console.log(`Saldo de USDT disponível: ${formattedBalance}`);
      
      // 12. Converter o valor para a unidade correta (USDT geralmente usa 6 casas decimais, não 18)
      const amountInTokenUnits = ethers.utils.parseUnits(amount.toString(), decimals);
      
      // 13. Verificar allowance (permissão para o contrato gastar tokens)
      const allowance = await tokenContract.allowance(walletAddress, this.contractAddress);
      
      // 14. Se o allowance for menor que o valor, solicitar aprovação
      if (allowance.lt(amountInTokenUnits)) {
        console.log(`Realizando approve de ${amount} USDT para o contrato ${this.contractAddress}`);
        const approveTx = await tokenContract.approve(this.contractAddress, amountInTokenUnits);
        const approveReceipt = await approveTx.wait();
        
        console.log(`Aprovação realizada: ${approveReceipt.transactionHash}`);
      } else {
        console.log(`Allowance já é suficiente (${ethers.utils.formatUnits(allowance, decimals)} USDT)`);
      }
      
      // 15. ABI para o método de pagamento com token
      const contractABI = [
        "function processTokenPaymentWithFee(address tokenAddress, address recipient, uint256 amount) external returns (bool)"
      ];
      
      // 16. Criar instância do contrato de pagamento
      const paymentContract = new ethers.Contract(this.contractAddress, contractABI, this.signer);
      
      // 17. Endereço do destinatário principal (mainWallet)
      // Vamos obter do Firestore, agora dependendo exclusivamente do mainWallet
      const settingsCollection = collection(db, "settings");
      const settingsDoc = await getDoc(doc(settingsCollection, "paymentConfig"));
      let recipientAddress = "";
      
      // Obter apenas o mainWallet, pois o receiverAddress foi removido
      if (settingsDoc.exists() && settingsDoc.data().mainWallet) {
        recipientAddress = settingsDoc.data().mainWallet;
        console.log(`Usando mainWallet como destinatário principal: ${recipientAddress}`);
      } else {
        // Se não encontrar, usar endereço padrão do arquivo de configuração
        const configModule = await import('../config/paymentConfig');
        recipientAddress = configModule.PAYMENT_RECEIVER_ADDRESS;
        console.log(`Nenhuma carteira configurada no Firestore, usando endereço padrão: ${recipientAddress}`);
      }
      
      if (!recipientAddress) {
        throw new Error("Endereço do destinatário não está configurado");
      }
      
      // 18. Processar o pagamento com token
      console.log(`Enviando transação para contrato ${this.contractAddress}`);
      console.log(`Parâmetros: tokenAddress=${usdtAddress}, recipient=${recipientAddress}, amount=${amountInTokenUnits.toString()}`);
      
      const tx = await paymentContract.processTokenPaymentWithFee(
        usdtAddress,
        recipientAddress,
        amountInTokenUnits,
        { gasLimit: ethers.utils.hexlify(500000) } // Limite de gas maior para operações com tokens
      );
      
      // 19. Aguardar confirmação
      const receipt = await tx.wait();
      
      console.log(`Transação confirmada: ${receipt.transactionHash}`);
      
      // 20. Retornar detalhes da transação
      return {
        transactionHash: receipt.transactionHash,
        blockNumber: receipt.blockNumber,
        success: true,
        tokenAddress: usdtAddress,
        recipientAddress: recipientAddress,
        amount: amount,
        currency: 'USDT'
      };
      
    } catch (error) {
      console.error("Erro ao processar pagamento com USDT:", error);
      throw error;
    }
  }
  // Get USDT balance for a wallet address
  async getUsdtBalance(walletAddress: string, forcedNetwork?: string): Promise<string> {
    try {
      // 1. Initialize Web3 if necessary
      if (!this.provider || !this.signer) {
        const initialized = await this.init();
        if (!initialized) throw new Error("Web3 is not available");
      }
      
      if (!this.provider) {
        throw new Error("Provider is not initialized");
      }
      
      // 2. Get current network information
      let networkName: string;
      if (forcedNetwork) {
        networkName = forcedNetwork;
      } else {
        const network = await this.provider.getNetwork();
        const networkNameTemp = this.getNetworkName(network.chainId);
        if (!networkNameTemp) {
          throw new Error(`Unknown network with chainId: ${network.chainId}`);
        }
        networkName = networkNameTemp;
      }
      
      // 3. Get USDT address for current network
      const usdtAddress = this.USDT_ADDRESSES[networkName.toLowerCase()];
      if (!usdtAddress) {
        throw new Error(`USDT is not supported on the current network (${networkName || 'unknown'})`);
      }
      
      // 4. ABI for token balance check
      const tokenABI = [
        "function balanceOf(address account) public view returns (uint256)",
        "function decimals() public view returns (uint8)"
      ];
      
      // 5. Create token contract instance
      const tokenContract = new ethers.Contract(usdtAddress, tokenABI, this.provider);
      
      // 6. Get token decimals
      const decimals = await tokenContract.decimals();
      
      // 7. Get balance
      const balance = await tokenContract.balanceOf(walletAddress);
      
      // 8. Format balance with correct decimals
      const formattedBalance = ethers.utils.formatUnits(balance, decimals);
      
      console.log(`USDT balance for ${walletAddress}: ${formattedBalance} USDT`);
      return formattedBalance;
      
    } catch (error) {
      console.error("Error getting USDT balance:", error);
      throw error;
    }
  }

  // Helper method to get currency symbol based on network
  private getNetworkCurrency(networkName: string | null): string | null {
    if (!networkName) return null;
    
    const currencyMap: Record<string, string> = {
      'ethereum': 'ETH',
      'ropsten': 'ETH',
      'rinkeby': 'ETH',
      'goerli': 'ETH',
      'kovan': 'ETH',
      'binance': 'BNB',
      'binanceTestnet': 'BNB',
      'polygon': 'MATIC',
      'mumbai': 'MATIC',
      'arbitrum': 'ETH',
      'optimism': 'ETH',
      'avalanche': 'AVAX',
      'fantom': 'FTM'
    };
    
    return currencyMap[networkName] || null;
  }

  constructor() {
    if (typeof window !== 'undefined' && window.ethereum) {
    // Remove listeners antigos para evitar múltiplos handlers
      if (window.ethereum.removeAllListeners) {
        window.ethereum.removeAllListeners('chainChanged');
      }
      window.ethereum.on('chainChanged', async () => {
        this.provider = null;
        this.signer = null;
        this.contract = null;
        this.contractAddress = null;
        await this.init();
        try { await this.loadContractAddress(); } catch (e) { /* ignore */ }
      });
    }
  }
}

const smartContractService = new SmartContractService();
export default smartContractService;