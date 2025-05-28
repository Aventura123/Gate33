import { web3Service } from './web3Service';
import { doc, getDoc, setDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';

// Store contract addresses in Firestore instead of hardcoded
// This variable will be populated from Firebase and with default values for known networks
const INSTANT_JOBS_ESCROW_ADDRESS: Record<string, string> = {
  'ethereum': '0x0000000000000000000000000000000000000000',
  'polygon': '0x0000000000000000000000000000000000000000',
  'optimism': '0x0000000000000000000000000000000000000000',
  'arbitrum': '0x0000000000000000000000000000000000000000',
  'sepolia': '0x0000000000000000000000000000000000000000',
  'bnb smart chain testnet': '0x3ca9962d4c956783dff3cd27b2db943df0f0d7ac', // BSC Testnet with known address
  'bnb smart chain': '0x0000000000000000000000000000000000000000',
  'bnbt': '0x3ca9962d4c956783dff3cd27b2db943df0f0d7ac', // Alternative for BSC Testnet
  'bsc testnet': '0x3ca9962d4c956783dff3cd27b2db943df0f0d7ac' // Another alternative for BSC Testnet
};

// ABI for InstantJobsEscrow contract
const INSTANT_JOBS_ESCROW_ABI = [
  // Event for Job creation
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": false,
        "internalType": "string",
        "name": "jobId",
        "type": "string"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "employer",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "payment",
        "type": "uint256"
      }
    ],
    "name": "JobCreated",
    "type": "event"
  },
  // Function to create a job
  {
    "inputs": [
      {
        "internalType": "string",
        "name": "jobId",
        "type": "string"
      },
      {
        "internalType": "uint256",
        "name": "deadline",
        "type": "uint256"
      }
    ],
    "name": "createJob",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  },
  // Administrative functions for fee management and control
  {
    "inputs": [],
    "name": "owner",
    "outputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "feeCollector",
    "outputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "platformFeePercentage",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "newFeePercentage",
        "type": "uint256"
      }
    ],
    "name": "updatePlatformFeePercentage",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "newFeeCollector",
        "type": "address"
      }
    ],
    "name": "updateFeeCollector",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  // Function to accept a job
  {
    "inputs": [
      {
        "internalType": "string",
        "name": "jobId",
        "type": "string"
      }
    ],
    "name": "acceptJob",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  // Function to mark a job as completed
  {
    "inputs": [
      {
        "internalType": "string",
        "name": "jobId",
        "type": "string"
      }
    ],
    "name": "completeJob",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  // Function to approve and pay a job
  {
    "inputs": [
      {
        "internalType": "string",
        "name": "jobId",
        "type": "string"
      }
    ],
    "name": "approveAndPay",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  // Function to open a dispute
  {
    "inputs": [
      {
        "internalType": "string",
        "name": "jobId",
        "type": "string"
      }
    ],
    "name": "openDispute",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  // Function to resolve a dispute
  {
    "inputs": [
      {
        "internalType": "string",
        "name": "jobId",
        "type": "string"
      },
      {
        "internalType": "address",
        "name": "winner",
        "type": "address"
      },
      {
        "internalType": "bool",
        "name": "releasePayment",
        "type": "bool"
      }
    ],
    "name": "resolveDispute",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  // Function to query information about a job
  {
    "inputs": [
      {
        "internalType": "string",
        "name": "jobId",
        "type": "string"
      }
    ],
    "name": "jobs",
    "outputs": [
      {
        "internalType": "address",
        "name": "employer",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "worker",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "payment",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "deadline",
        "type": "uint256"
      },
      {
        "internalType": "string",
        "name": "jobId",
        "type": "string"
      },
      {
        "internalType": "bool",
        "name": "isAccepted",
        "type": "bool"
      },
      {
        "internalType": "bool",
        "name": "isCompleted",
        "type": "bool"
      },
      {
        "internalType": "bool",
        "name": "isApproved",
        "type": "bool"
      },
      {
        "internalType": "bool",
        "name": "isPaid",
        "type": "bool"
      },
      {
        "internalType": "uint8",
        "name": "disputeStatus",
        "type": "uint8"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  }
];

/**
 * Service to interact with the escrow contract for Instant Jobs
 */
class InstantJobsEscrowService {
  private contract: any = null;
  private contractAddress: string = '';
  private currentNetwork: string = '';
  private initialized: boolean = false;

  /**
   * Loads contract addresses from Firebase (um documento por rede)
   */
  async loadContractAddresses() {
    try {
      // Busca todos os documentos da subcoleção contracts
      const addresses: Record<string, string> = {};
      const contractsColRef = collection(db, 'settings', 'contractInstantJobs_addresses', 'contracts');
      const querySnapshot = await getDocs(contractsColRef);
      querySnapshot.forEach(docSnap => {
        const data = docSnap.data();
        if (data && data.address) {
          addresses[docSnap.id.toLowerCase()] = data.address;
        }
      });
      // Atualiza cache local
      Object.assign(INSTANT_JOBS_ESCROW_ADDRESS, addresses);
      console.log('Contract addresses loaded (by document):', INSTANT_JOBS_ESCROW_ADDRESS);
      return true;
    } catch (error) {
      console.error('Error loading contract addresses:', error);
      return false;
    }
  }

  /**
   * Saves a contract address to Firebase (um documento por rede)
   * @param network Blockchain network
   * @param address Contract address
   */
  async saveContractAddress(network: string, address: string) {
    try {
      if (!web3Service.isValidAddress(address)) {
        throw new Error('Invalid contract address');
      }
      const networkKey = network.toLowerCase();
      INSTANT_JOBS_ESCROW_ADDRESS[networkKey] = address;
      // Salva em um documento separado para cada rede na subcoleção contracts
      const contractDocRef = doc(db, 'settings', 'contractInstantJobs_addresses', 'contracts', networkKey);
      await setDoc(contractDocRef, {
        address,
        updatedAt: new Date().toISOString(),
      }, { merge: true });
      console.log(`Contract address for ${network} saved (by document):`, address);
      return true;
    } catch (error) {
      console.error('Error saving contract address:', error);
      throw error;
    }
  }

  /**
   * Detects the current wallet network
   * @returns Network name or null if not detected
   */
  async detectNetwork() {
    try {
      const networkInfo = await web3Service.getNetworkInfo();
      if (networkInfo && networkInfo.name) {
        // Normalize BNB Smart Chain Testnet/BSC Testnet network names
        let networkName = networkInfo.name.toLowerCase();
        
        // Map variations of BSC Testnet names to a single name
        if (networkName.includes('bnb') && (networkName.includes('test') || networkName.includes('bnbt'))) {
          networkName = 'bsc testnet';
          console.log('BSC Testnet network detected and normalized');
        } else if (networkInfo.chainId === 97) {
          networkName = 'bsc testnet';
          console.log('BSC Testnet detected by chain ID (97)');
        }
        
        this.currentNetwork = networkName;
        console.log('Network detected and normalized:', this.currentNetwork);
        return this.currentNetwork;
      }
      return null;
    } catch (error) {
      console.error('Error detecting network:', error);
      return null;
    }
  }

  /**
   * Initializes the service with automatically detected network
   * @param forcedNetwork Force a specific network (optional)
   */
  async init(forcedNetwork?: string) {
    try {
      // Load addresses from Firebase
      await this.loadContractAddresses();
      
      // Detect network or use forced network
      const network = forcedNetwork ? forcedNetwork.toLowerCase() : await this.detectNetwork();
      
      if (!network) {
        throw new Error('Could not detect network. Please connect your wallet.');
      }
      
      this.currentNetwork = network;
      this.contractAddress = INSTANT_JOBS_ESCROW_ADDRESS[this.currentNetwork];
      
      if (!this.contractAddress || this.contractAddress === '0x0000000000000000000000000000000000000000') {
        throw new Error(`Contract not configured for network ${network}. Configure the contract address first.`);
      }
      
      // Get contract instance
      this.contract = await web3Service.getContract(this.contractAddress, INSTANT_JOBS_ESCROW_ABI);
      
      if (!this.contract) {
        throw new Error("Failed to get contract instance");
      }
      
      this.initialized = true;
      console.log(`Escrow service initialized for network ${network} with contract ${this.contractAddress}`);
      return true;
    } catch (error) {
      console.error("Error initializing the escrow service:", error);
      this.initialized = false;
      throw error;
    }
  }

  /**
   * Checks if the contract has been initialized
   * @returns Contract initialization state
   */
  isContractInitialized(): boolean {
    return this.initialized && this.contract !== null;
  }

  /**
   * Gets the contract owner's address
   * @returns Ethereum address of the owner
   */
  async getContractOwner(): Promise<string> {
    try {
      if (!this.isContractInitialized()) {
        await this.init();
      }
      
      const ownerAddress = await this.contract.owner();
      return ownerAddress;
    } catch (error) {
      console.error("Error getting contract owner:", error);
      throw error;
    }
  }

  /**
   * Gets the fee collector's address
   * @returns Ethereum address of the fee collector
   */
  async getFeeCollector(): Promise<string> {
    try {
      if (!this.isContractInitialized()) {
        await this.init();
      }
      
      const feeCollectorAddress = await this.contract.feeCollector();
      return feeCollectorAddress;
    } catch (error) {
      console.error("Error getting fee collector:", error);
      throw error;
    }
  }

  /**
   * Gets the platform fee percentage
   * @returns Fee percentage in base 1000 (e.g., 50 = 5%)
   */
  async getPlatformFeePercentage(): Promise<number> {
    try {
      if (!this.isContractInitialized()) {
        await this.init();
      }
      
      const feePercentage = await this.contract.platformFeePercentage();
      return Number(feePercentage);
    } catch (error) {
      console.error("Error getting platform fee percentage:", error);
      throw error;
    }
  }

  /**
   * Checks if the current user is the contract owner
   * @returns true if the user is the owner, false otherwise
   */
  async checkOwnership(): Promise<boolean> {
    try {
      if (!this.isContractInitialized()) {
        await this.init();
      }
      
      const owner = await this.getContractOwner();
      const currentUser = await web3Service.getCurrentWalletAddress();
      
      return currentUser.toLowerCase() === owner.toLowerCase();
    } catch (error) {
      console.error("Error checking contract ownership:", error);
      return false;
    }
  }

  /**
   * Updates the platform fee percentage (owner only)
   * @param newFeePercentage New fee percentage in base 1000 (e.g., 50 = 5%)
   * @param options Transaction options (gas, etc.)
   * @returns Transaction result
   */
  async updatePlatformFeePercentage(newFeePercentage: number, options: any = {}): Promise<any> {
    try {
      if (!this.isContractInitialized()) {
        await this.init();
      }
      
      // Check if the user is the owner
      const isOwner = await this.checkOwnership();
      if (!isOwner) {
        throw new Error("Only the contract owner can update the platform fee");
      }
      
      // Validate fee percentage (0-100 in base 1000, i.e., 0-10%)
      if (newFeePercentage < 0 || newFeePercentage > 100) {
        throw new Error("Fee percentage must be between 0 and 10% (0-100 in base 1000)");
      }
      
      // Call contract function
      const tx = await this.contract.updatePlatformFeePercentage(newFeePercentage, options);
      const receipt = await tx.wait();
      
      return {
        success: true,
        transactionHash: receipt.transactionHash,
        blockNumber: receipt.blockNumber
      };
    } catch (error) {
      console.error("Error updating platform fee:", error);
      throw error;
    }
  }

  /**
   * Updates the fee collector address (owner only)
   * @param newFeeCollector New Ethereum address for the fee collector
   * @param options Transaction options (gas, etc.)
   * @returns Transaction result
   */
  async updateFeeCollector(newFeeCollector: string, options: any = {}): Promise<any> {
    try {
      if (!this.isContractInitialized()) {
        await this.init();
      }
      
      // Check if the user is the owner
      const isOwner = await this.checkOwnership();
      if (!isOwner) {
        throw new Error("Only the contract owner can update the fee collector");
      }
      
      // Validate address
      if (!web3Service.isValidAddress(newFeeCollector)) {
        throw new Error("Invalid wallet address");
      }
      
      // Call contract function
      const tx = await this.contract.updateFeeCollector(newFeeCollector, options);
      const receipt = await tx.wait();
      
      return {
        success: true,
        transactionHash: receipt.transactionHash,
        blockNumber: receipt.blockNumber
      };
    } catch (error) {
      console.error("Error updating fee collector:", error);
      throw error;
    }
  }

  /**
   * Creates a new instant job with escrow deposit
   * @param network Blockchain network (ethereum, polygon, etc.)
   * @param jobId Job ID (generated by Firebase)
   * @param amount Payment amount
   * @param deadlineTimestamp Deadline timestamp in seconds
   * @returns Transaction details
   */
  async createJob(network: string, jobId: string, amount: number, deadlineTimestamp: number) {
    try {
      // --- Unified provider/signer logic ---
      const normalizedNetwork = network.toLowerCase();
      const contractAddress = INSTANT_JOBS_ESCROW_ADDRESS[normalizedNetwork];
      if (!contractAddress) {
        throw new Error(`Network ${network} not supported for Instant Jobs`);
      }

      let provider: any;
      let signer: any;
      const isWalletConnect = !!web3Service.wcV2Provider;

      if (isWalletConnect) {
        provider = web3Service.createNetworkProvider(normalizedNetwork);
        if (!provider) throw new Error(`Could not create provider for network: ${network}`);
        signer = web3Service.getWalletConnectSignerForNetwork(normalizedNetwork, provider);
        if (!signer) throw new Error('No valid WalletConnect signer. Connect your wallet first.');
      } else {
        await web3Service.switchNetworkInMetamask(normalizedNetwork);
        provider = web3Service.provider;
        signer = web3Service.signer;
        if (!signer) throw new Error('No valid MetaMask signer. Connect your wallet first.');
      }

      // Value in Wei
      const valueInWei = web3Service.toWei(amount.toString());
      // Get contract instance with correct signer
      const contract = new (require('ethers')).Contract(contractAddress, INSTANT_JOBS_ESCROW_ABI, signer);
      if (!contract) {
        throw new Error('Failed to get contract instance');
      }

      // Call the createJob function in the contract
      const tx = await contract.createJob(jobId, deadlineTimestamp, { value: valueInWei });
      const receipt = await tx.wait();

      return {
        transactionHash: receipt.transactionHash,
        blockNumber: receipt.blockNumber,
        contractAddress: contractAddress
      };
    } catch (error) {
      console.error('Error creating instant job in contract:', error);
      throw error;
    }
  }
  
  /**
   * Accepts an instant job
   * @param network Blockchain network
   * @param jobId Job ID
   * @returns Transaction details
   */
  async acceptJob(network: string, jobId: string) {
    try {
      const normalizedNetwork = network.toLowerCase();
      const contractAddress = INSTANT_JOBS_ESCROW_ADDRESS[normalizedNetwork];
      if (!contractAddress) throw new Error(`Network ${network} not supported for Instant Jobs`);
      let provider: any;
      let signer: any;
      const isWalletConnect = !!web3Service.wcV2Provider;
      if (isWalletConnect) {
        provider = web3Service.createNetworkProvider(normalizedNetwork);
        if (!provider) throw new Error(`Could not create provider for network: ${network}`);
        signer = web3Service.getWalletConnectSignerForNetwork(normalizedNetwork, provider);
        if (!signer) throw new Error('No valid WalletConnect signer. Connect your wallet first.');
      } else {
        await web3Service.switchNetworkInMetamask(normalizedNetwork);
        provider = web3Service.provider;
        signer = web3Service.signer;
        if (!signer) throw new Error('No valid MetaMask signer. Connect your wallet first.');
      }
      const contract = new (require('ethers')).Contract(contractAddress, INSTANT_JOBS_ESCROW_ABI, signer);
      if (!contract) throw new Error('Failed to get contract instance');
      const tx = await contract.acceptJob(jobId);
      const receipt = await tx.wait();
      return { transactionHash: receipt.transactionHash, blockNumber: receipt.blockNumber };
    } catch (error) {
      console.error('Error accepting instant job in contract:', error);
      throw error;
    }
  }

  /**
   * Marks an instant job as completed
   * @param network Blockchain network
   * @param jobId Job ID
   * @returns Transaction details
   */
  async completeJob(network: string, jobId: string) {
    try {
      const normalizedNetwork = network.toLowerCase();
      const contractAddress = INSTANT_JOBS_ESCROW_ADDRESS[normalizedNetwork];
      if (!contractAddress) throw new Error(`Network ${network} not supported for Instant Jobs`);
      let provider: any;
      let signer: any;
      const isWalletConnect = !!web3Service.wcV2Provider;
      if (isWalletConnect) {
        provider = web3Service.createNetworkProvider(normalizedNetwork);
        if (!provider) throw new Error(`Could not create provider for network: ${network}`);
        signer = web3Service.getWalletConnectSignerForNetwork(normalizedNetwork, provider);
        if (!signer) throw new Error('No valid WalletConnect signer. Connect your wallet first.');
      } else {
        await web3Service.switchNetworkInMetamask(normalizedNetwork);
        provider = web3Service.provider;
        signer = web3Service.signer;
        if (!signer) throw new Error('No valid MetaMask signer. Connect your wallet first.');
      }
      const contract = new (require('ethers')).Contract(contractAddress, INSTANT_JOBS_ESCROW_ABI, signer);
      if (!contract) throw new Error('Failed to get contract instance');
      const tx = await contract.completeJob(jobId);
      const receipt = await tx.wait();
      return { transactionHash: receipt.transactionHash, blockNumber: receipt.blockNumber };
    } catch (error) {
      console.error('Error marking instant job as completed in contract:', error);
      throw error;
    }
  }

  /**
   * Approves and releases payment for an instant job
   * @param network Blockchain network
   * @param jobId Job ID
   * @returns Transaction details
   */
  async approveAndPay(network: string, jobId: string) {
    try {
      // --- Unified provider/signer logic ---
      const normalizedNetwork = network.toLowerCase();
      const contractAddress = INSTANT_JOBS_ESCROW_ADDRESS[normalizedNetwork];
      if (!contractAddress) {
        throw new Error(`Network ${network} not supported for Instant Jobs`);
      }

      let provider: any;
      let signer: any;
      const isWalletConnect = !!web3Service.wcV2Provider;

      if (isWalletConnect) {
        // WalletConnect: always use forced network and correct signer
        provider = web3Service.createNetworkProvider(normalizedNetwork);
        if (!provider) throw new Error(`Could not create provider for network: ${network}`);
        signer = web3Service.getWalletConnectSignerForNetwork(normalizedNetwork, provider);
        if (!signer) throw new Error('No valid WalletConnect signer. Connect your wallet first.');
      } else {
        // MetaMask: trigger network switch and use correct provider/signer
        await web3Service.switchNetworkInMetamask(normalizedNetwork);
        provider = web3Service.provider;
        signer = web3Service.signer;
        if (!signer) throw new Error('No valid MetaMask signer. Connect your wallet first.');
      }

      // Get contract instance with correct signer
      const contract = new (require('ethers')).Contract(contractAddress, INSTANT_JOBS_ESCROW_ABI, signer);
      if (!contract) {
        throw new Error('Failed to get contract instance');
      }

      // Call the approveAndPay function in the contract
      const tx = await contract.approveAndPay(jobId);
      const receipt = await tx.wait();

      return {
        transactionHash: receipt.transactionHash,
        blockNumber: receipt.blockNumber
      };
    } catch (error) {
      console.error('Error approving and paying instant job in contract:', error);
      throw error;
    }
  }
  
  /**
   * Opens a dispute for an instant job
   * @param network Blockchain network
   * @param jobId Job ID
   * @returns Transaction details
   */
  async openDispute(network: string, jobId: string) {
    try {
      const normalizedNetwork = network.toLowerCase();
      const contractAddress = INSTANT_JOBS_ESCROW_ADDRESS[normalizedNetwork];
      if (!contractAddress) throw new Error(`Network ${network} not supported for Instant Jobs`);
      let provider: any;
      let signer: any;
      const isWalletConnect = !!web3Service.wcV2Provider;
      if (isWalletConnect) {
        provider = web3Service.createNetworkProvider(normalizedNetwork);
        if (!provider) throw new Error(`Could not create provider for network: ${network}`);
        signer = web3Service.getWalletConnectSignerForNetwork(normalizedNetwork, provider);
        if (!signer) throw new Error('No valid WalletConnect signer. Connect your wallet first.');
      } else {
        await web3Service.switchNetworkInMetamask(normalizedNetwork);
        provider = web3Service.provider;
        signer = web3Service.signer;
        if (!signer) throw new Error('No valid MetaMask signer. Connect your wallet first.');
      }
      const contract = new (require('ethers')).Contract(contractAddress, INSTANT_JOBS_ESCROW_ABI, signer);
      if (!contract) throw new Error('Failed to get contract instance');
      const tx = await contract.openDispute(jobId);
      const receipt = await tx.wait();
      return { transactionHash: receipt.transactionHash, blockNumber: receipt.blockNumber };
    } catch (error) {
      console.error('Error opening dispute for instant job in contract:', error);
      throw error;
    }
  }

  /**
   * Resolves a dispute (admin only)
   * @param network Blockchain network
   * @param jobId Job ID
   * @param winnerAddress Address of the dispute winner
   * @param releasePayment Whether to release payment to the worker
   * @returns Transaction details
   */
  async resolveDispute(network: string, jobId: string, winnerAddress: string, releasePayment: boolean) {
    try {
      const normalizedNetwork = network.toLowerCase();
      const contractAddress = INSTANT_JOBS_ESCROW_ADDRESS[normalizedNetwork];
      if (!contractAddress) throw new Error(`Network ${network} not supported for Instant Jobs`);
      let provider: any;
      let signer: any;
      const isWalletConnect = !!web3Service.wcV2Provider;
      if (isWalletConnect) {
        provider = web3Service.createNetworkProvider(normalizedNetwork);
        if (!provider) throw new Error(`Could not create provider for network: ${network}`);
        signer = web3Service.getWalletConnectSignerForNetwork(normalizedNetwork, provider);
        if (!signer) throw new Error('No valid WalletConnect signer. Connect your wallet first.');
      } else {
        await web3Service.switchNetworkInMetamask(normalizedNetwork);
        provider = web3Service.provider;
        signer = web3Service.signer;
        if (!signer) throw new Error('No valid MetaMask signer. Connect your wallet first.');
      }
      const contract = new (require('ethers')).Contract(contractAddress, INSTANT_JOBS_ESCROW_ABI, signer);
      if (!contract) throw new Error('Failed to get contract instance');
      const tx = await contract.resolveDispute(jobId, winnerAddress, releasePayment);
      const receipt = await tx.wait();
      return { transactionHash: receipt.transactionHash, blockNumber: receipt.blockNumber };
    } catch (error) {
      console.error('Error resolving dispute for instant job in contract:', error);
      throw error;
    }
  }
  
  /**
   * Gets information about an instant job from the contract
   * @param network Blockchain network
   * @param jobId Job ID
   * @returns Job information
   */
  async getJobInfo(network: string, jobId: string) {
    try {
      const contractAddress = INSTANT_JOBS_ESCROW_ADDRESS[network.toLowerCase()];
      if (!contractAddress) {
        throw new Error(`Network ${network} not supported for Instant Jobs`);
      }
      
      // Get contract instance
      const contract = await web3Service.getContract(contractAddress, INSTANT_JOBS_ESCROW_ABI);
      if (!contract) {
        throw new Error("Failed to get contract instance");
      }
      
      // Call the jobs function in the contract
      const jobInfo = await contract.jobs(jobId);
      
      return {
        employer: jobInfo.employer,
        worker: jobInfo.worker,
        payment: parseFloat(web3Service.fromWei(jobInfo.payment.toString())),
        deadline: new Date(Number(jobInfo.deadline) * 1000), // Convert to milliseconds
        isAccepted: jobInfo.isAccepted,
        isCompleted: jobInfo.isCompleted,
        isApproved: jobInfo.isApproved,
        isPaid: jobInfo.isPaid,
        disputeStatus: Number(jobInfo.disputeStatus)
      };
    } catch (error) {
      console.error("Error getting instant job information from contract:", error);
      throw error;
    }
  }
}

export const instantJobsEscrowService = new InstantJobsEscrowService();
export default instantJobsEscrowService;