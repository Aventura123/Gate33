import { ethers } from "ethers";
import { db } from "../lib/firebase";
import { collection, getDocs, query, where } from "firebase/firestore";

class SmartContractService {
  private provider: ethers.providers.Web3Provider | null = null;
  private signer: ethers.Signer | null = null;
  private contract: ethers.Contract | null = null;
  private contractAddress: string | null = null;

  // Initialize the Web3 provider
  async init() {
    if (typeof window !== 'undefined' && window.ethereum) {
      this.provider = new ethers.providers.Web3Provider(window.ethereum);
      this.signer = this.provider.getSigner();
      return true;
    }
    return false;
  }

  // Alias for init() to maintain compatibility
  async initializeContract() {
    return this.init();
  }

  // Check if contract is initialized
  isContractInitialized() {
    return this.provider !== null && this.signer !== null;
  }

  // Get contract owner address
  async getContractOwner() {
    // Ensure contract is initialized
    if (!this.provider || !this.signer) {
      const initialized = await this.init();
      if (!initialized) throw new Error("Web3 not available");
    }

    if (!this.contract) {
      await this.loadContractAddress();
      // Simple ABI just for the owner function
      const abiFragment = [
        "function owner() public view returns (address)"
      ];
      
      if (!this.contractAddress) {
        throw new Error("Contract address not configured");
      }
      
      if (!this.signer) {
        throw new Error("Wallet not connected");
      }
      
      this.contract = new ethers.Contract(this.contractAddress, abiFragment, this.signer);
    }

    try {
      return await this.contract.owner();
    } catch (error) {
      console.error("Error getting contract owner:", error);
      throw new Error("Failed to get contract owner");
    }
  }

  // Check if current wallet is the contract owner
  async checkOwnership() {
    if (!this.provider || !this.signer) {
      const initialized = await this.init();
      if (!initialized) throw new Error("Web3 not available");
    }

    if (!this.signer) {
      throw new Error("Wallet not connected");
    }

    const ownerAddress = await this.getContractOwner();
    const currentAddress = await this.signer.getAddress();
    
    return ownerAddress.toLowerCase() === currentAddress.toLowerCase();
  }

  // Load contract address from Firestore
  private async loadContractAddress() {
    if (this.contractAddress) return;

    try {
      const contractsCollection = collection(db, "contractConfigs");
      const q = query(contractsCollection, where("type", "==", "payment"));
      const contractSnapshot = await getDocs(q);
      
      if (contractSnapshot.empty) {
        throw new Error("Payment contract configuration not found");
      }
      
      const contractData = contractSnapshot.docs[0].data();
      this.contractAddress = contractData.contractAddress;
      
      if (!this.contractAddress) {
        throw new Error("Payment contract address not configured");
      }
    } catch (error) {
      console.error("Error loading contract address:", error);
      throw error;
    }
  }

  // Get fee collector address
  async getFeeCollector() {
    // Implementation would depend on your contract ABI
    // This is a stub - implement according to your contract
    return "0x0000000000000000000000000000000000000000";
  }

  // Get development wallet address
  async getDevelopmentWallet() {
    // Implementation would depend on your contract ABI
    // This is a stub - implement according to your contract
    return "0x0000000000000000000000000000000000000000";
  }

  // Get charity wallet address
  async getCharityWallet() {
    // Implementation would depend on your contract ABI
    // This is a stub - implement according to your contract
    return "0x0000000000000000000000000000000000000000";
  }

  // Get evolution wallet address
  async getEvolutionWallet() {
    // Implementation would depend on your contract ABI
    // This is a stub - implement according to your contract
    return "0x0000000000000000000000000000000000000000";
  }

  // Get distribution percentages
  async getDistributionPercentages() {
    // Implementation would depend on your contract ABI
    // This is a stub - implement according to your contract
    return {
      feePercentage: 50, // 5.0%
      developmentPercentage: 25, // 2.5%
      charityPercentage: 25, // 2.5%
      evolutionPercentage: 25, // 2.5%
      totalPercentage: 125 // 12.5%
    };
  }

  // Update fee collector address
  async updateFeeCollector(address: string, options?: any) {
    // Implementation would depend on your contract ABI
    // This is a stub - implement according to your contract
    console.log(`Would update fee collector to ${address} with options:`, options);
    return { transactionHash: "0x0000000000000000000000000000000000000000" };
  }

  // Update fee percentage
  async updateFeePercentage(percentage: number, options?: any) {
    // Implementation would depend on your contract ABI
    // This is a stub - implement according to your contract
    console.log(`Would update fee percentage to ${percentage} with options:`, options);
    return { transactionHash: "0x0000000000000000000000000000000000000000" };
  }

  // Update development wallet address
  async updateDevelopmentWallet(address: string, options?: any) {
    // Implementation would depend on your contract ABI
    // This is a stub - implement according to your contract
    console.log(`Would update development wallet to ${address} with options:`, options);
    return { transactionHash: "0x0000000000000000000000000000000000000000" };
  }

  // Update development percentage
  async updateDevelopmentPercentage(percentage: number, options?: any) {
    // Implementation would depend on your contract ABI
    // This is a stub - implement according to your contract
    console.log(`Would update development percentage to ${percentage} with options:`, options);
    return { transactionHash: "0x0000000000000000000000000000000000000000" };
  }

  // Update charity wallet address
  async updateCharityWallet(address: string, options?: any) {
    // Implementation would depend on your contract ABI
    // This is a stub - implement according to your contract
    console.log(`Would update charity wallet to ${address} with options:`, options);
    return { transactionHash: "0x0000000000000000000000000000000000000000" };
  }

  // Update charity percentage
  async updateCharityPercentage(percentage: number, options?: any) {
    // Implementation would depend on your contract ABI
    // This is a stub - implement according to your contract
    console.log(`Would update charity percentage to ${percentage} with options:`, options);
    return { transactionHash: "0x0000000000000000000000000000000000000000" };
  }

  // Update evolution wallet address
  async updateEvolutionWallet(address: string, options?: any) {
    // Implementation would depend on your contract ABI
    // This is a stub - implement according to your contract
    console.log(`Would update evolution wallet to ${address} with options:`, options);
    return { transactionHash: "0x0000000000000000000000000000000000000000" };
  }

  // Update evolution percentage
  async updateEvolutionPercentage(percentage: number, options?: any) {
    // Implementation would depend on your contract ABI
    // This is a stub - implement according to your contract
    console.log(`Would update evolution percentage to ${percentage} with options:`, options);
    return { transactionHash: "0x0000000000000000000000000000000000000000" };
  }

  // Process payment for jobs using smart contract
  async processJobPayment(planId: string, amount: number, companyId: string) {
    try {
      // Extra validation: ensure the value is valid
      if (amount === undefined || amount === null || isNaN(amount)) {
        throw new Error("The plan value is invalid. Please ensure the plan is correctly synchronized with the database.");
      }
      // Initialize Web3 if not already initialized
      if (!this.provider || !this.signer) {
        const initialized = await this.init();
        if (!initialized) throw new Error("Web3 not available");
      }

      // Ensure signer exists before proceeding
      if (!this.signer) {
        throw new Error("Wallet not connected or signer not available");
      }

      // Fetch payment contract address from Firestore
      const contractsCollection = collection(db, "contractConfigs");
      const q = query(contractsCollection, where("type", "==", "payment"));
      const contractSnapshot = await getDocs(q);
      
      if (contractSnapshot.empty) {
        throw new Error("Payment contract configuration not found");
      }
      
      const contractData = contractSnapshot.docs[0].data();
      const contractAddress = contractData.contractAddress;
      
      if (!contractAddress) {
        throw new Error("Payment contract address not configured");
      }

      // Simplified contract ABI (adjust as needed)
      const abi = [
        "function processPayment(string planId, string companyId) public payable returns (bool)"
      ];

      // Create contract with non-null signer
      const contract = new ethers.Contract(contractAddress, abi, this.signer);
      
      // Convert value to wei
      const valueInWei = ethers.utils.parseEther(amount.toString());
      
      // Call the contract function
      const tx = await contract.processPayment(planId, companyId, {
        value: valueInWei
      });
      
      // Wait for confirmation
      const receipt = await tx.wait();
      
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