import { ethers } from "ethers";
import { getDoc, doc, collection, query, where, getDocs, setDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { getWeb3Provider } from "./crypto";

// Minimum ABI for ERC20 token operations
const ERC20_ABI = [
  "function balanceOf(address owner) view returns (uint256)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function transfer(address to, uint256 amount) returns (bool)"
];

// Learn2Earn contract ABI (simplified - replace with your complete ABI)
const LEARN2EARN_ABI = [
  "function createLearn2Earn(string memory id, address tokenAddress, uint256 amount, uint256 startTime, uint256 endTime, uint256 maxParticipants) returns (uint256)",
  "function depositTokens(uint256 learn2earnId, uint256 amount) returns (bool)",
  "function getAllowance(address tokenAddress) view returns (uint256)",
  "function claimTokens(string memory learn2earnId) returns (bool)"
];

// Define network contract address interface
interface NetworkContractAddress {
  contractAddress: string;
  tokenAddress: string;
}

class Learn2EarnContractService {
  private contractAddresses: Record<string, NetworkContractAddress> = {};
  private initialized = false;
  private lastFirebaseCheck: number = 0;
  private readonly FIREBASE_CHECK_INTERVAL = 5 * 60 * 1000; // 5 minutes in milliseconds

  constructor() {
    this.loadContractAddresses();
  }

  /**
   * Loads contract addresses from Firebase
   */
  private async loadContractAddresses() {
    try {
      if (!db) {
        console.warn("Firebase database not initialized");
        return;
      }
      
      // Record the time of the query
      this.lastFirebaseCheck = Date.now();
      
      // Fetch contract configurations directly from collection
      const contractConfigsCollection = collection(db, "contractConfigs");
      const querySnapshot = await getDocs(contractConfigsCollection);
      
      if (!querySnapshot.empty) {
        const addresses: Record<string, NetworkContractAddress> = {};
        
        // Process all contract configs
        querySnapshot.forEach(doc => {
          const data = doc.data();
          if (data.network && data.contractAddress) {
            const normalizedNetwork = data.network.trim().toLowerCase();
            addresses[normalizedNetwork] = {
              contractAddress: data.contractAddress,
              tokenAddress: data.tokenAddress || ""
            };
          }
        });
        
        if (Object.keys(addresses).length > 0) {
          this.contractAddresses = addresses;
          this.initialized = true;
          console.log("Learn2Earn contract addresses loaded from Firebase:", this.contractAddresses);
          return;
        }
      }
      
      console.warn("No contract configurations found in Firestore.");
      this.initialized = true;
    } catch (error) {
      console.error("Error loading learn2earn contract addresses:", error);
    }
  }

  /**
   * Returns list of supported networks for UI
   */
  async getSupportedNetworks(): Promise<string[]> {
    // Reload addresses from Firebase if needed
    await this.refreshContractAddressesIfNeeded();
    return Object.keys(this.contractAddresses);
  }

  /**
   * Periodically reload contracts from Firebase
   */
  private async refreshContractAddressesIfNeeded(): Promise<void> {
    const now = Date.now();
    if (!this.initialized || (now - this.lastFirebaseCheck) > this.FIREBASE_CHECK_INTERVAL) {
      await this.loadContractAddresses();
    }
  }

  /**
   * Obtains the contract address for the specified network
   */
  private async getContractAddress(network: string): Promise<string> {
    // Reload addresses from Firebase if needed
    await this.refreshContractAddressesIfNeeded();
    
    const normalizedNetwork = network.trim().toLowerCase();
    const address = this.contractAddresses[normalizedNetwork];
    
    if (!address || !address.contractAddress) {
      // Just return null instead of throwing an error - this will be handled by the UI
      return "";
    }
    
    return address.contractAddress;
  }

  /**
   * Checks if the token has been approved for the learn2earn contract
   */
  async checkTokenApproval(network: string, tokenAddress: string): Promise<boolean> {
    try {
      const provider = await getWeb3Provider();
      if (!provider) throw new Error("Web3 provider not available");
      
      const signer = provider.getSigner();
      const userAddress = await signer.getAddress();
      
      const learn2earnContractAddress = await this.getContractAddress(network);
      
      // Create token contract instance
      const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, signer);
      
      // Check current allowance
      const allowance = await tokenContract.allowance(userAddress, learn2earnContractAddress);
      
      // If allowance is greater than 0, the token has been approved
      return !allowance.isZero();
    } catch (error) {
      console.error("Error checking token approval:", error);
      return false;
    }
  }

  /**
   * Approves the learn2earn contract to use the tokens
   */
  async approveToken(network: string, tokenAddress: string): Promise<any> {
    try {
      const provider = await getWeb3Provider();
      if (!provider) throw new Error("Web3 provider not available");
      
      const signer = provider.getSigner();
      const learn2earnContractAddress = await this.getContractAddress(network);
      
      // Create token contract instance
      const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, signer);
      
      // Approve a maximum value (adjust as needed)
      const maxAmount = ethers.constants.MaxUint256;
      const tx = await tokenContract.approve(learn2earnContractAddress, maxAmount);
      
      // Wait for transaction confirmation
      const receipt = await tx.wait(1);
      return {
        transactionHash: receipt.transactionHash,
        blockNumber: receipt.blockNumber
      };
    } catch (error: unknown) {
      console.error("Error approving token:", error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      throw new Error(`Failed to approve token: ${errorMessage}`);
    }
  }

  /**
   * Creates a new learn2earn opportunity
   */
  async createLearn2Earn(
    network: string,
    id: string,
    tokenAddress: string, 
    amount: number,
    startDate: Date,
    endDate: Date,
    maxParticipants: number = 0
  ): Promise<any> {
    try {
      console.log(`Creating learn2earn on network: ${network}`);
      console.log("Parameters:", { 
        id, 
        tokenAddress, 
        amount, 
        startDate: startDate.toISOString(), 
        endDate: endDate.toISOString(), 
        maxParticipants 
      });
      
      // Get the contract address
      const contractAddresses = await this.getContractAddresses(network);
      console.log("Contract addresses loaded:", contractAddresses);
      
      if (!contractAddresses || !contractAddresses.contractAddress) {
        // Instead of error, return a descriptive object that UI can handle gracefully
        return {
          success: false,
          message: `The selected network (${network}) is not currently supported for learn2earn.`,
          notSupported: true
        };
      }
      
      const contractAddress = contractAddresses.contractAddress;
      console.log(`Using contract address: ${contractAddress}`);
      
      const provider = await getWeb3Provider();
      if (!provider) throw new Error("Web3 provider not available");
      
      const signer = provider.getSigner();
      
      // Create learn2earn contract instance
      const learn2earnContract = new ethers.Contract(contractAddress, LEARN2EARN_ABI, signer);
      
      // Convert amount to the correct unit (assuming 18 decimals - adjust as needed)
      const amountInWei = ethers.utils.parseUnits(amount.toString(), 18);
      
      // Convert dates to UNIX timestamps (seconds)
      const startTimestamp = Math.floor(startDate.getTime() / 1000);
      const endTimestamp = Math.floor(endDate.getTime() / 1000);
      
      console.log("Creating learn2earn with params:", {
        id,
        tokenAddress,
        amountInWei: amountInWei.toString(),
        startTimestamp,
        endTimestamp,
        maxParticipants
      });
      
      // Call the contract to create the learn2earn
      const tx = await learn2earnContract.createLearn2Earn(
        id,
        tokenAddress,
        amountInWei,
        startTimestamp,
        endTimestamp,
        maxParticipants
      );
      
      // Wait for transaction confirmation
      const receipt = await tx.wait(1);
      
      // Extract learn2earn ID from event (adjust based on your contract's event)
      let learn2earnId = 0;
      try {
        // Try to extract ID from event (this logic may vary depending on your contract)
        for (const log of receipt.logs) {
          if (log.address.toLowerCase() === learn2earnContract.toLowerCase()) {
            const parsedLog = learn2earnContract.interface.parseLog(log);
            if (parsedLog.name === "Learn2EarnCreated") {
              learn2earnId = parsedLog.args.learn2earnId.toNumber();
              break;
            }
          }
        }
      } catch (e) {
        console.warn("Could not extract learn2earn ID from event:", e);
      }
      
      return {
        transactionHash: receipt.transactionHash,
        blockNumber: receipt.blockNumber,
        learn2earnId,
        tokenAddress
      };
    } catch (error: unknown) {
      console.error("Error creating learn2earn:", error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      throw new Error(`Failed to create learn2earn: ${errorMessage}`);
    }
  }

  /**
   * Allows additional token deposits into an existing learn2earn
   */
  async depositTokens(network: string, learn2earnId: number, amount: number): Promise<any> {
    try {
      const provider = await getWeb3Provider();
      if (!provider) throw new Error("Web3 provider not available");
      
      const signer = provider.getSigner();
      const learn2earnContractAddress = await this.getContractAddress(network);
      
      // Return informative response if no contract is available
      if (!learn2earnContractAddress) {
        return {
          success: false,
          message: `The selected network (${network}) is not currently supported for learn2earn opportunities.`,
          notSupported: true
        };
      }
      
      // Create learn2earn contract instance
      const learn2earnContract = new ethers.Contract(learn2earnContractAddress, LEARN2EARN_ABI, signer);
      
      // Convert amount to the correct unit (assuming 18 decimals - adjust as needed)
      const amountInWei = ethers.utils.parseUnits(amount.toString(), 18);
      
      // Call the contract to deposit additional tokens
      const tx = await learn2earnContract.depositTokens(learn2earnId, amountInWei);
      
      // Wait for transaction confirmation
      const receipt = await tx.wait(1);
      
      return {
        success: true,
        transactionHash: receipt.transactionHash,
        blockNumber: receipt.blockNumber
      };
    } catch (error: unknown) {
      console.error("Error depositing tokens:", error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      return {
        success: false,
        message: `Failed to deposit tokens: ${errorMessage}`
      };
    }
  }

  /**
   * Forces a service reset, reloading contract addresses
   * Useful for resetting the service after connection issues or network changes
   */
  async resetService(): Promise<void> {
    this.initialized = false;
    this.contractAddresses = {};
    await this.loadContractAddresses();
    console.log("Learn2Earn contract service reset completed");
  }

  // Add or modify the getContractAddresses method to use consistent normalization
  async getContractAddresses(network: string): Promise<NetworkContractAddress> {
    // Check if we need to update contracts from Firebase
    await this.refreshContractAddressesIfNeeded();
    
    const normalizedNetwork = network.trim().toLowerCase();
    
    // If we already have addresses in cache, return them
    if (this.contractAddresses[normalizedNetwork]) {
      console.log(`Using cached contract addresses for ${normalizedNetwork}`);
      const cachedAddress = this.contractAddresses[normalizedNetwork];
      
      // If it's a string (old format), convert to new format
      if (typeof cachedAddress === 'string') {
        return {
          contractAddress: cachedAddress,
          tokenAddress: ""
        };
      }
      return cachedAddress;
    }
    
    // If not in cache, load directly from Firebase
    const addresses = await loadContractAddresses(normalizedNetwork);
    
    if (!addresses) {
      // If nothing was found in Firebase, simply return null
      // This will allow the UI to not show this network as an option
      console.warn(`No contract address found for network: ${network}`);
      return { contractAddress: "", tokenAddress: "" };
    }
    
    // Store in cache for future use
    this.contractAddresses[normalizedNetwork] = addresses;
    console.log(`Cached contract addresses for ${normalizedNetwork}`);
    
    return addresses;
  }

  /**
   * Claims tokens from a learn2earn opportunity
   */
  async claimLearn2Earn(network: string, learn2earnId: string): Promise<any> {
    try {
      console.log(`Claiming tokens from learn2earn ${learn2earnId} on network ${network}`);
      
      const provider = await getWeb3Provider();
      if (!provider) throw new Error("Web3 provider not available");
      
      const contractAddress = await this.getContractAddress(network);
      if (!contractAddress) {
        return {
          success: false,
          message: `The selected network (${network}) is not currently supported for learn2earn opportunities.`,
          notSupported: true
        };
      }
      
      const signer = provider.getSigner();
      
      // Create learn2earn contract instance
      const learn2earnContract = new ethers.Contract(contractAddress, LEARN2EARN_ABI, signer);
      
      console.log(`Calling claimTokens with learn2earnId: ${learn2earnId}`);
      
      // Call the contract to claim the tokens
      const tx = await learn2earnContract.claimTokens(learn2earnId);
      
      // Wait for transaction confirmation
      const receipt = await tx.wait(1);
      
      console.log("Claim transaction confirmed:", receipt.transactionHash);
      
      return {
        success: true,
        transactionHash: receipt.transactionHash,
        blockNumber: receipt.blockNumber
      };
    } catch (error: unknown) {
      console.error("Error claiming tokens:", error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      return {
        success: false,
        message: `Failed to claim tokens: ${errorMessage}`
      };
    }
  }
}

async function loadContractAddresses(network: string) {
  try {
    if (!db) {
      console.warn("Firebase database not initialized");
      return null;
    }
    
    const normalizedNetwork = network.trim().toLowerCase();
    
    // Look for a contract config for this network
    const configsCollection = collection(db, "contractConfigs");
    const q = query(configsCollection, where("network", "==", normalizedNetwork));
    const querySnapshot = await getDocs(q);
    
    if (!querySnapshot.empty) {
      const data = querySnapshot.docs[0].data();
      console.log(`Found contract config for ${normalizedNetwork}:`, data);
      
      return {
        contractAddress: data.contractAddress,
        tokenAddress: data.tokenAddress || ""
      };
    }
    
    console.warn(`No contract config found for network: ${normalizedNetwork}`);
    return null;
  } catch (error) {
    console.error(`Error loading contract addresses for ${network}:`, error);
    throw error;
  }
}

const learn2earnContractService = new Learn2EarnContractService();
export default learn2earnContractService;