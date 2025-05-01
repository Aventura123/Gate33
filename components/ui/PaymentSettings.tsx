import React, { useState, useEffect, useCallback } from "react";
import { db } from "../../lib/firebase";
import { collection, query, getDocs, addDoc, updateDoc, doc, deleteDoc, where, setDoc } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { connectWallet, getCurrentAddress } from "../../services/crypto";
import { Button } from "./button";
import { web3Service } from "../../services/web3Service";
import smartContractService from "../../services/smartContractService";
import InstantJobsManager from "../admin/InstantJobsManager";
import { NETWORK_CONFIG, CONTRACT_ADDRESSES } from "../../config/paymentConfig";

interface PaymentConfigProps {
  hasPermission: boolean;
}

// State to store the configurations loaded from Firestore
interface FirestorePaymentConfig {
  receiverAddress: string;
  serviceFee: number;
  transactionTimeout: number;
  contracts: {
    ethereum: string;
    polygon: string;
    binance: string;
  };
  updatedAt?: Date;
}

const PaymentSettings: React.FC<PaymentConfigProps> = ({ hasPermission }) => {
  // States to store configuration values
  const [walletAddress, setWalletAddress] = useState("");
  const [serviceFee, setServiceFee] = useState(0);
  const [transactionTimeout, setTransactionTimeout] = useState(0);
  
  // States for contracts on different networks
  const [ethContract, setEthContract] = useState("");
  const [polygonContract, setPolygonContract] = useState("");
  const [binanceContract, setBinanceContract] = useState("");

  // New state for Binance Testnet contract
  const [binanceTestnetContract, setBinanceTestnetContract] = useState("");
  const [binanceTestnetSaveStatus, setBinanceTestnetSaveStatus] = useState<string | null>(null);

  // Function to save only the Binance Testnet contract in Firestore
  const handleSaveBinanceTestnetContract = async () => {
    setBinanceTestnetSaveStatus(null);
    try {
      if (!validateEthereumAddress(binanceTestnetContract)) {
        setBinanceTestnetSaveStatus("Invalid address. Must start with '0x' and have 40 hexadecimal characters.");
        return;
      }
      // Update only the binanceTestnet field in contracts
      const configRef = doc(db, "settings", "paymentConfig");
      await setDoc(configRef, { contracts: { binanceTestnet: binanceTestnetContract } }, { merge: true });
      setBinanceTestnetSaveStatus("Address saved successfully!");
    } catch (err: any) {
      setBinanceTestnetSaveStatus("Error saving: " + (err.message || "Unknown error"));
    }
  };

  // State to store the current system configuration (Firestore or config)
  const [currentSystemConfig, setCurrentSystemConfig] = useState<any>(null);

  // States for additional wallets
  const [feeCollectorAddress, setFeeCollectorAddress] = useState("");
  const [currentFeeCollector, setCurrentFeeCollector] = useState("");
  const [developmentWalletAddress, setDevelopmentWalletAddress] = useState("");
  const [charityWalletAddress, setCharityWalletAddress] = useState("");
  const [evolutionWalletAddress, setEvolutionWalletAddress] = useState("");
  
  // States for distribution percentages
  const [feePercentage, setFeePercentage] = useState(0);
  const [developmentPercentage, setDevelopmentPercentage] = useState(0);
  const [charityPercentage, setCharityPercentage] = useState(0);
  const [evolutionPercentage, setEvolutionPercentage] = useState(0);
  const [totalPercentage, setTotalPercentage] = useState(0);
  
  // States for wallet updates
  const [updatingWallets, setUpdatingWallets] = useState(false);
  const [walletUpdateSuccess, setWalletUpdateSuccess] = useState(false);
  const [walletUpdateError, setWalletUpdateError] = useState<string | null>(null);
  
  const [walletConnected, setWalletConnected] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateSuccess, setUpdateSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Add state to store the contract owner's address
  const [contractOwner, setContractOwner] = useState<string | null>(null);
  const [isCheckingOwner, setIsCheckingOwner] = useState(false);

  // Additional states specific to owner verification
  const [ownerVerificationSuccess, setOwnerVerificationSuccess] = useState(false);
  const [ownerVerificationError, setOwnerVerificationError] = useState<string | null>(null);

  // Function to convert percentages (user interface)
  // Converts contract percentage (base 1000) to display value (0-100)
  const contractToDisplayPercentage = (value: number): number => {
    return value / 10; // Converts base 1000 to real percentage (e.g., 950 -> 95)
  };

  // Converts display percentage (0-100) to contract value (base 1000)
  const displayToContractPercentage = (value: number): number => {
    return Math.round(value * 10); // Converts percentage to base 1000 (e.g., 95 -> 950)
  };

  // Load settings from Firestore
  const fetchCurrentSettings = useCallback(async () => {
    try {
      // Check if there is a settings document
      const configDoc = await getDocs(collection(db, "settings"));
      if (!configDoc.empty) {
        configDoc.forEach((doc) => {
          const data = doc.data() as FirestorePaymentConfig;
          // Update component states
          if (data.receiverAddress) setWalletAddress(data.receiverAddress);
          if (data.serviceFee) setServiceFee(data.serviceFee);
          if (data.transactionTimeout) setTransactionTimeout(data.transactionTimeout);
          
          // Contract configuration
          if (data.contracts) {
            if (data.contracts.ethereum) setEthContract(data.contracts.ethereum);
            if (data.contracts.polygon) setPolygonContract(data.contracts.polygon);
            if (data.contracts.binance) setBinanceContract(data.contracts.binance);
          }
          
          // Update the current system configuration to show Firestore values
          setCurrentSystemConfig({
            receiverAddress: data.receiverAddress || "",
            contracts: {
              ethereum: data.contracts?.ethereum || "",
              polygon: data.contracts?.polygon || "",
              binance: data.contracts?.binance || ""
            },
            serviceFee: (data.serviceFee || 0) + "%",
            transactionTimeout: (data.transactionTimeout || 0) + " seconds",
            updatedAt: data.updatedAt ? (
              // Ensure Firestore timestamp compatibility
              typeof data.updatedAt === 'object' && 'seconds' in data.updatedAt
                ? new Date((data.updatedAt as { seconds: number }).seconds * 1000).toLocaleString()
                : new Date(data.updatedAt).toLocaleString()
            ) : "Not available"
          });
          
          console.log("Settings loaded from Firestore:", data);
        });
      } else {
        // If not, create a new document with default values
        await updatePaymentConfig();
        console.log("Default settings saved to Firestore");
      }
    } catch (err) {
      console.error("Error loading payment settings:", err);
      setError("Could not load payment settings.");
    }
  }, []);

  useEffect(() => {
    if (hasPermission) {
      fetchCurrentSettings();
      checkWalletConnection();
    }
  }, [hasPermission, fetchCurrentSettings]);

  // Check wallet connection
  const checkWalletConnection = () => {
    try {
      const connected = web3Service.isWalletConnected();
      setWalletConnected(connected);
      if (connected) {
        fetchContractData();
      }
    } catch (err) {
      console.error("Error checking wallet connection:", err);
    }
  };

  // Fetch contract data (addresses and percentages) with more robust error handling
  const fetchContractData = async () => {
    try {
      setWalletUpdateError(null);

      // Check the current network
      const walletInfo = web3Service.getWalletInfo();
      if (!walletInfo) {
        setWalletUpdateError("Wallet information not available. Connect the wallet first.");
        return;
      }
      
      // Identify the network and load the correct contract from Firestore
      const currentChainId = walletInfo.chainId;
      const currentNetworkName = walletInfo.networkName;
      
      console.log(`Checking contract on network: ${currentNetworkName} (ChainID: ${currentChainId})`);
      
      // Fetch Firebase settings to find the correct contract for the current network
      let contractAddress: string | null = null;
      
      try {
        const configDoc = await getDocs(query(collection(db, "settings"), where("__name__", "==", "paymentConfig")));
        
        if (!configDoc.empty) {
          const configData = configDoc.docs[0].data();
          const contracts = configData.contracts || {};
          
          // Determine which contract field corresponds to the current network
          let contractField: string | null = null;
          
          switch (currentChainId) {
            case 1: contractField = "ethereum"; break;
            case 137: contractField = "polygon"; break;
            case 56: contractField = "binance"; break;
            case 97: contractField = "binanceTestnet"; break;
            case 80001: contractField = "mumbai"; break; 
            case 42161: contractField = "arbitrum"; break;
            case 10: contractField = "optimism"; break;
            case 43114: contractField = "avalanche"; break;
          }
          
          // Get the contract address for the current network
          if (contractField && contracts[contractField]) {
            contractAddress = contracts[contractField];
            console.log(`Contract found for ${currentNetworkName}: ${contractAddress}`);
          } else {
            console.log(`No specific contract found for ${currentNetworkName}`);
            
            // Check if we have a default contract that can be used
            if (contracts.default) {
              contractAddress = contracts.default;
              console.log(`Using default contract: ${contractAddress}`);
            }
          }
        }
      } catch (error) {
        console.error("Error fetching settings:", error);
      }
      
      if (!contractAddress) {
        setWalletUpdateError(
          `No contract configured for network ${currentNetworkName} (ChainID: ${currentChainId}). ` +
          `Please add a contract for this network in the settings or connect to a supported network.`
        );
        return;
      }

      // Verify if the contract is initialized before making calls
      if (!smartContractService.isContractInitialized()) {
        try {
          await smartContractService.initializeContract(undefined, contractAddress);
        } catch (initError: any) {
          console.error(`Error initializing contract on ${currentNetworkName}:`, initError);
          setWalletUpdateError(`Could not initialize contract on ${currentNetworkName}: ${initError.message || "check your network connection"}`);
          return;
        }
      }
      
      if (smartContractService.isContractInitialized()) {
        // Create an array to store all errors encountered during calls
        const errors: string[] = [];
        
        // 1. Fee Collector Address
        try {
          const feeCollector = await smartContractService.getFeeCollector();
          setCurrentFeeCollector(feeCollector);
          setFeeCollectorAddress(feeCollector);
        } catch (e: any) {
          console.warn("Error getting feeCollector:", e);
          errors.push(`Error getting fee collector address: ${e.message || e}`);
        }
        
        // 2. Development Wallet
        try {
          const developmentWallet = await smartContractService.getDevelopmentWallet();
          setDevelopmentWalletAddress(developmentWallet);
        } catch (e: any) {
          console.warn("Error getting developmentWallet:", e);
          errors.push(`Error getting development wallet: ${e.message || e}`);
        }
        
        // 3. Charity Wallet
        try {
          const charityWallet = await smartContractService.getCharityWallet();
          setCharityWalletAddress(charityWallet);
        } catch (e: any) {
          console.warn("Error getting charityWallet:", e);
          errors.push(`Error getting charity wallet: ${e.message || e}`);
        }
        
        // 4. Evolution Wallet
        try {
          const evolutionWallet = await smartContractService.getEvolutionWallet();
          setEvolutionWalletAddress(evolutionWallet);
        } catch (e: any) {
          console.warn("Error getting evolutionWallet:", e);
          errors.push(`Error getting evolution wallet: ${e.message || e}`);
        }
        
        // 5. Distribution Percentages
        try {
          const percentages = await smartContractService.getDistributionPercentages();
          setFeePercentage(contractToDisplayPercentage(percentages.feePercentage));
          setDevelopmentPercentage(contractToDisplayPercentage(percentages.developmentPercentage));
          setCharityPercentage(contractToDisplayPercentage(percentages.charityPercentage));
          setEvolutionPercentage(contractToDisplayPercentage(percentages.evolutionPercentage));
          setTotalPercentage(contractToDisplayPercentage(percentages.totalPercentage));
        } catch (e: any) {
          console.warn("Error getting percentages:", e);
          errors.push(`Error getting distribution percentages: ${e.message || e}`);
          // If unable to get percentages, at least try to calculate the total based on current values
          const tempTotal = feePercentage + developmentPercentage + charityPercentage + evolutionPercentage;
          setTotalPercentage(tempTotal);
        }
        
        // If there are errors, display only the first one to avoid overloading the interface
        if (errors.length > 0) {
          setWalletUpdateError(`Some data could not be loaded: ${errors[0]} ${errors.length > 1 ? `(+${errors.length - 1} errors)` : ''}`);
        }
      }

      // Try to get the contract owner
      try {
        const ownerAddress = await smartContractService.getContractOwner();
        setContractOwner(ownerAddress);
      } catch (e: any) {
        console.warn("Error getting contract owner:", e);
        setWalletUpdateError(`Error verifying contract owner: ${e.message || e}`);
      }
    } catch (err: any) {
      console.error("Error getting contract data:", err);
      setWalletUpdateError(`Error getting contract data on ${web3Service.getWalletInfo()?.networkName || "current network"}: ${err.message || "check your connection"}`);
    }
  };

  // Connect wallet
  const connectWallet = async () => {
    try {
      setWalletUpdateError(null);
      
      await web3Service.connectWallet();
      setWalletConnected(true);
      
      // Check the current connected network after connecting
      const walletInfo = web3Service.getWalletInfo();
      if (!walletInfo) {
         setWalletUpdateError("Could not get wallet information after connecting.");
         return;
      }

      // Just display the current connected network without forcing change to BSC Testnet
      const currentChainId = walletInfo.chainId;
      console.log(`Wallet connected to network: ${walletInfo.networkName} (ChainID: ${currentChainId})`);
      
      // Try to fetch contract data on the current network
      await fetchContractData();
      
      // Verify the contract owner on the current network
      await checkContractOwner();
      
    } catch (err: any) {
      console.error("Error connecting wallet:", err);
      setWalletUpdateError(err.message || "Error connecting wallet. Check if MetaMask is installed.");
      setWalletConnected(false);
    }
  };

  const updatePaymentConfig = async () => {
    try {
        const configData = {
            receiverAddress: walletAddress,
            serviceFee: serviceFee,
            transactionTimeout: transactionTimeout * 1000, // Converted to milliseconds
            contracts: {
                ethereum: ethContract,
                polygon: polygonContract,
                binance: binanceContract
            },
            updatedAt: new Date(),
        };

        // Save to Firestore
        await setDoc(doc(db, "settings", "paymentConfig"), configData, { merge: true });

        // Update CONTRACT_ADDRESSES dynamically
        CONTRACT_ADDRESSES.ethereum = ethContract;
        CONTRACT_ADDRESSES.polygon = polygonContract;
        CONTRACT_ADDRESSES.binance = binanceContract;

        // Update the current system configuration
        setCurrentSystemConfig({
            receiverAddress: walletAddress,
            contracts: {
                ethereum: ethContract,
                polygon: polygonContract,
                binance: binanceContract
            },
            serviceFee: serviceFee + "%",
            transactionTimeout: transactionTimeout + " seconds",
            networks: Object.keys(NETWORK_CONFIG).map(net => ({
                name: NETWORK_CONFIG[net as keyof typeof NETWORK_CONFIG].name,
                chainId: NETWORK_CONFIG[net as keyof typeof NETWORK_CONFIG].chainId,
            })),
            updatedAt: new Date().toLocaleString()
        });

        console.log("Payment settings updated in Firestore and local configuration:", configData);
        return true;
    } catch (err) {
        console.error("Error updating payment settings:", err);
        throw err;
    }
};

  const validateEthereumAddress = (address: string): boolean => {
    return /^0x[a-fA-F0-9]{40}$/g.test(address);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdating(true);
    setError(null);
    setUpdateSuccess(false);
    
    try {
      if (!validateEthereumAddress(walletAddress)) {
        throw new Error("Wallet address is invalid. Must start with '0x' followed by 40 hexadecimal characters.");
      }
      
      // Validate contracts (if provided)
      if (ethContract && !validateEthereumAddress(ethContract)) {
        throw new Error("Ethereum contract address is invalid.");
      }
      
      if (polygonContract && !validateEthereumAddress(polygonContract)) {
        throw new Error("Polygon contract address is invalid.");
      }
      
      if (binanceContract && !validateEthereumAddress(binanceContract)) {
        throw new Error("Binance contract address is invalid.");
      }
      
      // Validate service fee
      if (serviceFee < 0 || serviceFee > 100) {
        throw new Error("Service fee must be between 0 and 100%.");
      }
      
      // Validate transaction timeout
      if (transactionTimeout < 10) {
        throw new Error("Transaction timeout cannot be less than 10 seconds.");
      }
      
      await updatePaymentConfig();
      setUpdateSuccess(true);
    } catch (err: any) {
      setError(err.message || "Error updating payment settings.");
    } finally {
      setIsUpdating(false);
    }
  };

  // Function to update additional wallets and percentages
  const handleUpdateAdditionalWallets = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpdatingWallets(true);
    setWalletUpdateError(null);
    setWalletUpdateSuccess(false);
    
    try {
      if (!walletConnected) {
        throw new Error("Connect your wallet first");
      }
      
      // Validate addresses
      if (feeCollectorAddress && !validateEthereumAddress(feeCollectorAddress)) {
        throw new Error("Main fee collector (FeeCollector) address is invalid");
      }
      
      if (developmentWalletAddress && !validateEthereumAddress(developmentWalletAddress)) {
        throw new Error("Development wallet address is invalid");
      }
      
      if (charityWalletAddress && !validateEthereumAddress(charityWalletAddress)) {
        throw new Error("Charity wallet address is invalid");
      }
      
      if (evolutionWalletAddress && !validateEthereumAddress(evolutionWalletAddress)) {
        throw new Error("Evolution wallet address is invalid");
      }
      
      // Validate percentages (contract base is 1000, i.e., 25 = 2.5%)
      if (feePercentage < 0 || feePercentage > 100) {
        throw new Error("Main fee percentage must be between 0 and 100 (0% and 10%)");
      }
      
      if (developmentPercentage < 0 || developmentPercentage > 100) {
        throw new Error("Development wallet percentage must be between 0 and 100 (0% and 10%)");
      }
      
      if (charityPercentage < 0 || charityPercentage > 100) {
        throw new Error("Charity wallet percentage must be between 0 and 100 (0% and 10%)");
      }
      
      if (evolutionPercentage < 0 || evolutionPercentage > 100) {
        throw new Error("Evolution wallet percentage must be between 0 and 100 (0% and 10%)");
      }
      
      // Verify if the total does not exceed 30% (300 in base 1000)
      const total = feePercentage + developmentPercentage + charityPercentage + evolutionPercentage;
      if (total > 30) {
        throw new Error("The total sum of all percentages cannot exceed 30%");
      }
      
      // Verify if the contract is initialized
      if (!smartContractService.isContractInitialized()) {
        await smartContractService.initializeContract();
      }

      // Verify if the current user is the contract owner with enhanced error handling
      try {
        const isOwner = await smartContractService.checkOwnership();
        
        if (!isOwner) {
          // Improve error message to include helpful instructions
          const walletInfo = web3Service.getWalletInfo();
          const currentWallet = walletInfo?.address || "unknown";
          const currentNetwork = walletInfo?.networkName || "unknown";
          const currentChainId = walletInfo?.chainId || "unknown";
          
          throw new Error(
            `You do not have permission to update the wallets (address ${currentWallet} on network ${currentNetwork}, ChainID: ${currentChainId}). ` +
            `Only the contract owner can do this. ` +
            `Check if you are connected with the correct wallet and on the BSC Testnet network (ChainID: 97).`
          );
        }
      } catch (ownerError: any) {
        console.error("Error verifying contract ownership:", ownerError);
        
        // If the error is from the checkOwnership method, show additional information
        if (ownerError.message.includes("do not have permission")) {
          throw ownerError; // Use the improved message we already created
        } else {
          // Get wallet information for diagnosis
          const walletInfo = web3Service.getWalletInfo();
          throw new Error(
            `Could not verify if you are the contract owner: ${ownerError.message}. ` +
            `This can happen for several reasons: the contract may not be accessible, ` +
            `you may be on the wrong network (current: ${walletInfo?.networkName || 'unknown'}, ChainID: ${walletInfo?.chainId || 'unknown'}), ` +
            `or the ownership verification method is not available in the contract. ` +
            `Check if you are connected to the BSC Testnet network and try again.`
          );
        }
      }
      
      // Add gas limit verification in transactions
      const gasOptions = { 
        gasLimit: 300000  // Adding a manual gas limit to prevent estimation error
      };
      
      // Update addresses in the contract with a retry mechanism
      const updateWithRetry = async (updateFunction: Function, ...params: any[]) => {
        try {
          return await updateFunction(...params, gasOptions);
        } catch (error: any) {
          console.error(`Transaction error: ${error.message}`);
          
          // If it's a gas limit error, try increasing the gas
          if (error.message.includes("UNPREDICTABLE_GAS_LIMIT")) {
            console.log("Retrying with a higher gas limit...");
            const higherGasOptions = { gasLimit: 500000 };
            return await updateFunction(...params, higherGasOptions);
          } else {
            throw error;
          }
        }
      };

      // Update addresses in the contract
      const updatePromises = [];
      
      // Update feeCollector address if necessary
      if (feeCollectorAddress !== currentFeeCollector) {
        updatePromises.push(updateWithRetry(smartContractService.updateFeeCollector, feeCollectorAddress));
      }
      
      // Get current percentages for comparison
      const currentPercentages = await smartContractService.getDistributionPercentages();
      
      // Update main fee percentage if necessary
      const contractFeePercentage = displayToContractPercentage(feePercentage);
      if (contractFeePercentage !== currentPercentages.feePercentage) {
        updatePromises.push(updateWithRetry(smartContractService.updateFeePercentage, contractFeePercentage));
      }
      
      // Wallet updates with specific error handling for each
      // Update development wallet
      try {
        await updateWithRetry(smartContractService.updateDevelopmentWallet, developmentWalletAddress);
      } catch (err: any) {
        console.error("Error updating development wallet:", err);
        setWalletUpdateError(`Error updating development wallet: ${err.message || "Check permissions and contract"}`);
        // Continue with other operations even if one fails
      }
      
      // Update charity wallet
      try {
        await updateWithRetry(smartContractService.updateCharityWallet, charityWalletAddress);
      } catch (err: any) {
        console.error("Error updating charity wallet:", err);
        setWalletUpdateError((prev) => 
          prev ? `${prev}, Error in charity wallet` : `Error updating charity wallet: ${err.message}`);
      }
      
      // Update evolution wallet
      try {
        await updateWithRetry(smartContractService.updateEvolutionWallet, evolutionWalletAddress);
      } catch (err: any) {
        console.error("Error updating evolution wallet:", err);
        setWalletUpdateError((prev) => 
          prev ? `${prev}, Error in evolution wallet` : `Error updating evolution wallet: ${err.message}`);
      }
      
      // Update percentages with individual error handling
      try {
        await updateWithRetry(smartContractService.updateDevelopmentPercentage, displayToContractPercentage(developmentPercentage));
        await updateWithRetry(smartContractService.updateCharityPercentage, displayToContractPercentage(charityPercentage));
        await updateWithRetry(smartContractService.updateEvolutionPercentage, displayToContractPercentage(evolutionPercentage));
      } catch (err: any) {
        console.error("Error updating percentages:", err);
        setWalletUpdateError((prev) => 
          prev ? `${prev}, Error in percentages` : `Error updating percentages: ${err.message}`);
      }
      
      // If we didn't have fatal errors, consider it a success even with warnings
      if (!walletUpdateError) {
        setWalletUpdateSuccess(true);
      }
      
      // Update local data
      await fetchContractData();
      
      // Also update the main wallet address in Firestore to maintain consistency
      if (walletAddress !== feeCollectorAddress) {
        setWalletAddress(feeCollectorAddress);
        await updatePaymentConfig();
      }
    } catch (err: any) {
      console.error("Error updating additional wallets:", err);
      
      // Specific messages for common errors
      if (err.message.includes("UNPREDICTABLE_GAS_LIMIT")) {
        setWalletUpdateError(
          "Error estimating gas for the transaction. This can happen for several reasons: " +
          "1. You do not have permissions to execute this function in the contract; " +
          "2. The provided parameters are invalid or out of allowed limits; " +
          "3. The contract has additional restrictions (such as pauses or time limits). " +
          "Check if you are the contract owner."
        );
      } else {
        setWalletUpdateError(err.message || "Error updating wallets and percentages in the contract.");
      }
    } finally {
      setUpdatingWallets(false);
    }
  };

  // Function to verify who the current contract owner is
  const checkContractOwner = async () => {
    try {
      setIsCheckingOwner(true);
      // Clear owner verification specific states
      setOwnerVerificationSuccess(false);
      setOwnerVerificationError(null);
      
      // DO NOT interfere with wallet update states
      // setWalletUpdateError(null);
      // setWalletUpdateSuccess(false);
      
      if (!walletConnected) {
        // Use owner verification specific states
        setOwnerVerificationError("Connect your wallet first to verify the contract owner");
        return;
      }
      
      // 1. Get information about the current connected network
      const walletInfo = web3Service.getWalletInfo();
      if (!walletInfo || !walletInfo.chainId) {
        setOwnerVerificationError("Could not determine the current network. Please check if your wallet is properly connected.");
        return;
      }

      // 2. Identify the current network
      const currentChainId = walletInfo.chainId;
      const currentAddress = walletInfo.address;
      let networkName: string = "unknown";
      let contractAddress: string | undefined;
      
      // 3. Map the network ID to a more user-friendly name
      switch (currentChainId) {
        case 1: networkName = "Ethereum Mainnet"; break;
        case 137: networkName = "Polygon"; break;
        case 56: networkName = "Binance Smart Chain"; break;
        case 97: networkName = "BSC Testnet"; break;
        case 80001: networkName = "Mumbai Testnet (Polygon)"; break;
        case 42161: networkName = "Arbitrum"; break;
        case 10: networkName = "Optimism"; break;
        case 43114: networkName = "Avalanche"; break;
        default: networkName = `Network ${currentChainId}`;
      }
      
      console.log(`Wallet connected to network: ${networkName} (ChainID: ${currentChainId})`);
      
      // 4. Fetch settings from Firebase to find the correct contract for the current network
      try {
        const configDoc = await getDocs(query(collection(db, "settings"), where("__name__", "==", "paymentConfig")));
        
        if (!configDoc.empty) {
          const configData = configDoc.docs[0].data();
          const contracts = configData.contracts || {};
          
          // 5. Determine which contract field corresponds to the current network
          let contractField: string | null = null;
          
          switch (currentChainId) {
            case 1: contractField = "ethereum"; break;
            case 137: contractField = "polygon"; break;
            case 56: contractField = "binance"; break;
            case 97: contractField = "binanceTestnet"; break;
            case 80001: contractField = "mumbai"; break; 
            case 42161: contractField = "arbitrum"; break;
            case 10: contractField = "optimism"; break;
            case 43114: contractField = "avalanche"; break;
            // Add more mappings as needed
          }
          
          // 6. Get the contract address for the current network
          if (contractField && contracts[contractField]) {
            contractAddress = contracts[contractField];
            console.log(`Contract found for ${networkName}: ${contractAddress}`);
          } else {
            console.log(`No specific contract found for ${networkName} (field: ${contractField})`);
            
            // Check if we have a default contract that can be used
            if (contracts.default) {
              contractAddress = contracts.default;
              console.log(`Using default contract: ${contractAddress}`);
            }
          }
        } else {
          console.warn("Settings not found in Firestore");
        }
      } catch (error) {
        console.error("Error fetching settings:", error);
      }

      // 7. If we don't find a contract in Firebase for the current network
      if (!contractAddress) {
        setOwnerVerificationError(
          `Could not locate a configured contract for ${networkName} (ChainID: ${currentChainId}). ` +
          `Please add a contract for this network in the settings or connect to a supported network.`
        );
        return;
      }

      // 8. Verify if the contract address is valid before attempting to interact with it
      if (!validateEthereumAddress(contractAddress)) {
        setOwnerVerificationError(
          `The contract address configured for ${networkName} is invalid: ${contractAddress}. ` +
          `Please configure a valid address in the settings.`
        );
        return;
      }

      console.log(`Verifying contract on network ${networkName} at address ${contractAddress}`);
      
      try {
        // 9. Check if there is code at the address (contract)
        // Get the provider directly from web3Service, not from walletInfo
        const provider = web3Service.getProvider();
        const bytecode = await provider.getCode(contractAddress);
        
        if (bytecode === '0x' || bytecode === '0x0') {
          setOwnerVerificationError(
            `There is no smart contract at address ${contractAddress} on network ${networkName}. ` +
            `Please verify that the contract is properly deployed on this network.`
          );
          return;
        }
        
        // 10. Initialize contract for the correct network
        if (!smartContractService.isContractInitialized()) {
          await smartContractService.initializeContract(undefined, contractAddress);
        } else {
          await smartContractService.switchContractNetwork(currentChainId, contractAddress);
        }
        
        try {
          // 11. Try to get the contract owner
          const ownerAddress = await smartContractService.getContractOwner();
          setContractOwner(ownerAddress);
          
          // 12. Verify if the current user is the owner
          const isCurrentAddressOwner = ownerAddress.toLowerCase() === currentAddress.toLowerCase();
          
          if (isCurrentAddressOwner) {
            // Now we use only the specific states for owner verification
            setOwnerVerificationSuccess(true);
            setOwnerVerificationError(null);
          } else {
            console.log(`You are not the owner of the contract on network ${networkName}. The current owner is: ${ownerAddress}`);
            setOwnerVerificationSuccess(false);
            setOwnerVerificationError(
              `You are not the owner of the contract on network ${networkName}. ` +
              `The current owner is: ${ownerAddress}`
            );
          }
        } catch (err: any) {
          // Specifically check for call exception error (contract doesn't implement owner())
          if (err.message.includes('missing revert data') || err.message.includes('call exception') || 
              err.message.includes('execution reverted')) {
            setOwnerVerificationError(
              `The contract at address ${contractAddress} on network ${networkName} does not implement a ` +
              `compatible owner function (owner, getOwner, OWNER, admin or getAdmin). ` +
              `This may not be a contract compatible with the expected interface.`
            );
          } else if (err.message.includes('Could not determine the owner')) {
            setOwnerVerificationError(
              `The contract at address ${contractAddress} on network ${networkName} does not implement ` +
              `any recognized standard owner function. It may not be a contract with ownership features.`
            );
          } else {
            setOwnerVerificationError(`Error verifying owner: ${err.message}`);
          }
        }
      } catch (err: any) {
        console.error("Error interacting with the contract:", err);
        setOwnerVerificationError(`Error interacting with the contract: ${err.message}`);
      }
    } catch (err: any) {
      console.error("Error verifying contract owner:", err);
      setOwnerVerificationError(`Error verifying contract owner: ${err.message}`);
    } finally {
      setIsCheckingOwner(false);
    }
  };

  // Verify the total sum of percentages whenever they change
  useEffect(() => {
    const total = feePercentage + developmentPercentage + charityPercentage + evolutionPercentage;
    setTotalPercentage(total);
    
    // Check and alert if it exceeds 30%
    if (total > 30) {
      setWalletUpdateError("Warning: The total sum of percentages should not exceed 30%");
    } else if (walletUpdateError === "Warning: The total sum of percentages should not exceed 30%") {
      setWalletUpdateError(null);
    }
  }, [feePercentage, developmentPercentage, charityPercentage, evolutionPercentage]);

  // Effect to show the success message about contract ownership
  useEffect(() => {
    const ownerMessage = localStorage.getItem('ownerSuccessMessage');
    if (walletUpdateSuccess && ownerMessage) {
      setWalletUpdateError(null); // Clear any previous error
      
      // Instead of creating a DOM element, let's simply set a state
      // that will be displayed in the JSX correctly
      setWalletUpdateSuccess(true);
      
      // Remove the message from localStorage after using it
      localStorage.removeItem('ownerSuccessMessage');
    }
  }, [walletUpdateSuccess]);

  // Render the success message for contract owner
  const renderOwnerSuccessMessage = () => {
    const ownerMessage = localStorage.getItem('ownerSuccessMessage');
    if (ownerMessage) {
      return (
        <div className="bg-green-800 border border-green-900 text-white px-4 py-3 rounded mb-4">
          <p>{ownerMessage}</p>
        </div>
      );
    }
    return null;
  };

  if (!hasPermission) {
    return (
      <div className="bg-red-800 border border-red-900 text-white px-4 py-3 rounded">
        <p>You do not have permission to access this section.</p>
      </div>
    );
  }

  return (
    <div className="bg-black/30 shadow rounded-lg p-6">
      <h2 className="text-2xl font-bold mb-6 text-orange-400">Web3 Payment Settings</h2>
      
      {error && (
        <div className="bg-red-800 border border-red-900 text-white px-4 py-3 rounded mb-4">
          <p>{error}</p>
        </div>
      )}
      
      {updateSuccess && (
        <div className="bg-green-800 border border-green-900 text-white px-4 py-3 rounded mb-4">
          <p>Payment settings updated successfully!</p>
        </div>
      )}
      
      {/* Display the owner success message if it exists in localStorage */}
      {localStorage.getItem('ownerSuccessMessage') && (
        <div className="bg-green-800 border border-green-900 text-white px-4 py-3 rounded mb-4">
          <p>{localStorage.getItem('ownerSuccessMessage')}</p>
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Receiving Wallet */}
        <div className="mb-4">
          <label className="block text-gray-300 text-sm font-bold mb-2" htmlFor="walletAddress">
            Receiving Wallet Address
          </label>
          <input
            id="walletAddress"
            type="text"
            value={walletAddress}
            onChange={(e) => setWalletAddress(e.target.value)}
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 dark:text-gray-300 dark:bg-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            placeholder="0x..."
          />
          <p className="text-gray-400 text-xs mt-1">
            This address will receive all payments on the platform.
          </p>
        </div>
        
        {/* Service Fee */}
        <div className="mb-4">
          <label className="block text-gray-300 text-sm font-bold mb-2" htmlFor="serviceFee">
            Service Fee (%)
          </label>
          <input
            id="serviceFee"
            type="number"
            min="0"
            max="100"
            step="0.1"
            value={serviceFee}
            onChange={(e) => setServiceFee(parseFloat(e.target.value))}
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 dark:text-gray-300 dark:bg-gray-700 leading-tight focus:outline-none focus:shadow-outline"
          />
          <p className="text-gray-400 text-xs mt-1">
            Percentage charged as service fee on each transaction.
          </p>
        </div>
        
        {/* Transaction Timeout */}
        <div className="mb-4">
          <label className="block text-gray-300 text-sm font-bold mb-2" htmlFor="transactionTimeout">
            Transaction Timeout (seconds)
          </label>
          <input
            id="transactionTimeout"
            type="number"
            min="10"
            value={transactionTimeout}
            onChange={(e) => setTransactionTimeout(parseInt(e.target.value))}
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 dark:text-gray-300 dark:bg-gray-700 leading-tight focus:outline-none focus:shadow-outline"
          />
          <p className="text-gray-400 text-xs mt-1">
            Maximum time to wait for transaction confirmation.
          </p>
        </div>
        
        {/* Multiple Wallets Payment Distribution Section */}
        <div className="border-t border-gray-700 pt-6 mt-6">
          <h3 className="text-xl font-semibold mb-4 text-orange-400">Multi-Wallet Payment Distribution</h3>
          
          {walletUpdateError && (
            <div className="bg-red-800 border border-red-900 text-white px-4 py-3 rounded mb-4">
              <p>{walletUpdateError}</p>
            </div>
          )}
          
          {walletUpdateSuccess && (
            <div className="bg-green-800 border border-green-900 text-white px-4 py-3 rounded mb-4">
              <p>Wallet and percentage settings successfully updated in the contract!</p>
            </div>
          )}
          
          {contractOwner && (
            <div className="bg-blue-800 border border-blue-900 text-white px-4 py-3 rounded mb-4">
              <p>
                <strong>Contract owner:</strong> {contractOwner}
                {web3Service.getWalletInfo()?.address === contractOwner && (
                  <span className="ml-2 bg-green-600 text-white text-xs px-2 py-1 rounded">
                    You are the owner!
                  </span>
                )}
              </p>
            </div>
          )}
          
          <p className="text-gray-400 mb-4">
            Configure up to four wallets to automatically distribute payments: 
            main fee collector (FeeCollector), development, charity, and evolution.
            The total sum of percentages cannot exceed 30%.
          </p>

          {/* Explanation about the remaining 70% */}
          <div className="bg-gray-800 border border-gray-700 text-white px-4 py-3 rounded mb-4">
            <h4 className="font-semibold mb-1">How fees work:</h4>
            <p className="text-sm text-gray-300">
              Of the total value of each transaction, a maximum of 30% is distributed among the wallets configured above.
              The remaining 70% always goes directly to the main recipient of the payment (for example,
              the seller of a product, the service provider, or the content creator).
            </p>
            <p className="text-sm text-gray-300 mt-2">
              This 30% limitation is implemented in the smart contract to protect users and ensure
              that most of the value always reaches the intended recipient.
            </p>
          </div>
          
          <div className="mb-4">
            {!walletConnected ? (
              <div className="mb-4">
                <button
                  type="button"
                  onClick={connectWallet}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
                >
                  Connect Wallet to Manage Contracts
                </button>
                <p className="text-gray-400 text-xs mt-2">
                  You need to connect your wallet to interact with the smart contract.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="mb-4 flex justify-between items-center">
                  <p className="text-green-400 text-sm">
                    <span className="inline-block bg-green-900 rounded-full px-2 py-1 text-xs mr-2">Connected</span>
                    Wallet connected - you can configure payment distribution
                  </p>
                  
                  <button
                    type="button"
                    onClick={checkContractOwner}
                    disabled={isCheckingOwner}
                    className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-3 py-1 rounded"
                  >
                    {isCheckingOwner ? 'Checking...' : 'Verify Contract Owner'}
                  </button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Main Fee Collector */}
                  <div>
                    <label className="block text-gray-300 text-sm font-bold mb-2" htmlFor="feeCollectorAddress">
                      Main Fee Collector
                    </label>
                    <input
                      id="feeCollectorAddress"
                      type="text"
                      value={feeCollectorAddress}
                      onChange={(e) => setFeeCollectorAddress(e.target.value)}
                      className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 dark:text-gray-300 dark:bg-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                      placeholder="0x..."
                    />
                    {currentFeeCollector && (
                      <p className="text-gray-400 text-xs mt-1">
                        Current address: <span className="font-mono">{currentFeeCollector}</span>
                      </p>
                    )}
                  </div>
                  
                  <div>
                    <label className="block text-gray-300 text-sm font-bold mb-2" htmlFor="feePercentage">
                      Main Fee (%)
                    </label>
                    <input
                      id="feePercentage"
                      type="number"
                      min="0"
                      max="100"
                      step="1"
                      value={feePercentage}
                      onChange={(e) => setFeePercentage(parseInt(e.target.value))}
                      className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 dark:text-gray-300 dark:bg-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                    />
                    <p className="text-gray-400 text-xs mt-1">
                      Base 1000: {feePercentage} = {(feePercentage / 10).toFixed(1)}%
                    </p>
                  </div>
                  
                  {/* Development Wallet */}
                  <div>
                    <label className="block text-gray-300 text-sm font-bold mb-2" htmlFor="developmentWalletAddress">
                      Development Wallet
                    </label>
                    <input
                      id="developmentWalletAddress"
                      type="text"
                      value={developmentWalletAddress}
                      onChange={(e) => setDevelopmentWalletAddress(e.target.value)}
                      className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 dark:text-gray-300 dark:bg-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                      placeholder="0x..."
                    />
                  </div>
                  
                  <div>
                    <label className="block text-gray-300 text-sm font-bold mb-2" htmlFor="developmentPercentage">
                      Development Percentage (%)
                    </label>
                    <input
                      id="developmentPercentage"
                      type="number"
                      min="0"
                      max="100"
                      step="1"
                      value={developmentPercentage}
                      onChange={(e) => setDevelopmentPercentage(parseInt(e.target.value))}
                      className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 dark:text-gray-300 dark:bg-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                    />
                    <p className="text-gray-400 text-xs mt-1">
                      Base 1000: {developmentPercentage} = {(developmentPercentage / 10).toFixed(1)}%
                    </p>
                  </div>
                  
                  {/* Charity Wallet */}
                  <div>
                    <label className="block text-gray-300 text-sm font-bold mb-2" htmlFor="charityWalletAddress">
                      Charity Wallet
                    </label>
                    <input
                      id="charityWalletAddress"
                      type="text"
                      value={charityWalletAddress}
                      onChange={(e) => setCharityWalletAddress(e.target.value)}
                      className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 dark:text-gray-300 dark:bg-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                      placeholder="0x..."
                    />
                  </div>
                  
                  <div>
                    <label className="block text-gray-300 text-sm font-bold mb-2" htmlFor="charityPercentage">
                      Charity Percentage (%)
                    </label>
                    <input
                      id="charityPercentage"
                      type="number"
                      min="0"
                      max="100"
                      step="1"
                      value={charityPercentage}
                      onChange={(e) => setCharityPercentage(parseInt(e.target.value))}
                      className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 dark:text-gray-300 dark:bg-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                    />
                    <p className="text-gray-400 text-xs mt-1">
                      Base 1000: {charityPercentage} = {(charityPercentage / 10).toFixed(1)}%
                    </p>
                  </div>
                  
                  {/* Evolution Wallet */}
                  <div>
                    <label className="block text-gray-300 text-sm font-bold mb-2" htmlFor="evolutionWalletAddress">
                      Evolution Wallet
                    </label>
                    <input
                      id="evolutionWalletAddress"
                      type="text"
                      value={evolutionWalletAddress}
                      onChange={(e) => setEvolutionWalletAddress(e.target.value)}
                      className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 dark:text-gray-300 dark:bg-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                      placeholder="0x..."
                    />
                  </div>
                  
                  <div>
                    <label className="block text-gray-300 text-sm font-bold mb-2" htmlFor="evolutionPercentage">
                      Evolution Percentage (%)
                    </label>
                    <input
                      id="evolutionPercentage"
                      type="number"
                      min="0"
                      max="100"
                      step="1"
                      value={evolutionPercentage}
                      onChange={(e) => setEvolutionPercentage(parseInt(e.target.value))}
                      className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 dark:text-gray-300 dark:bg-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                    />
                    <p className="text-gray-400 text-xs mt-1">
                      Base 1000: {evolutionPercentage} = {(evolutionPercentage / 10).toFixed(1)}%
                    </p>
                  </div>
                </div>
                
                <div className="mt-4 p-3 bg-gray-800 rounded">
                  <p className="text-white font-semibold">Total fees: {(totalPercentage / 10).toFixed(1)}%</p>
                  <div className="w-full bg-gray-700 h-2 mt-2 rounded-full overflow-hidden">
                    <div 
                      className={`h-full ${totalPercentage > 300 ? 'bg-red-500' : 'bg-green-500'} progress-bar dynamic-width`} 
                    ></div>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    The total sum must not exceed 300 (30%)
                  </p>
                </div>
                
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    handleUpdateAdditionalWallets(e as any);
                  }}
                  disabled={updatingWallets}
                  className={`mt-4 bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline ${
                    updatingWallets ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  {updatingWallets ? 'Updating...' : 'Update Wallets and Percentages'}
                </button>
              </div>
            )}
          </div>
        </div>
        
        {/* Contract Section */}
        <div className="border-t border-gray-700 pt-4">
          <h3 className="text-xl font-semibold mb-4 text-orange-400">Contract Addresses</h3>
          
          {/* Ethereum Contract */}
          <div className="mb-4">
            <label className="block text-gray-300 text-sm font-bold mb-2" htmlFor="ethContract">
              Ethereum Contract
            </label>
            <input
              id="ethContract"
              type="text"
              value={ethContract}
              onChange={(e) => setEthContract(e.target.value)}
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 dark:text-gray-300 dark:bg-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              placeholder="0x..."
            />
          </div>
          
          {/* Polygon Contract */}
          <div className="mb-4">
            <label className="block text-gray-300 text-sm font-bold mb-2" htmlFor="polygonContract">
              Polygon Contract
            </label>
            <input
              id="polygonContract"
              type="text"
              value={polygonContract}
              onChange={(e) => setPolygonContract(e.target.value)}
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 dark:text-gray-300 dark:bg-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              placeholder="0x..."
            />
          </div>
          
          {/* Binance Smart Chain Contract */}
          <div className="mb-4">
            <label className="block text-gray-300 text-sm font-bold mb-2" htmlFor="binanceContract">
              Binance Smart Chain Contract
            </label>
            <div className="flex gap-2">
              <input
                id="binanceContract"
                type="text"
                value={binanceContract}
                onChange={(e) => setBinanceContract(e.target.value)}
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 dark:text-gray-300 dark:bg-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                placeholder="0x..."
              />
              <button
                type="button"
                className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-xs"
                onClick={() => setBinanceContract("0xD7ACd2a9FD159E69Bb102A1ca21C9a3e3A5F771B")}
                title="Fill with BSC Testnet address (Chain 97)"
              >
                Use Testnet
              </button>
            </div>
            <p className="text-gray-400 text-xs mt-1">
              Use the button to automatically fill with a BSC Testnet address (Chain 97).
            </p>
          </div>

          {/* Binance Testnet Contract */}
          <div className="mb-4">
            <label className="block text-gray-300 text-sm font-bold mb-2" htmlFor="binanceTestnetContract">
              Binance Testnet Contract (Chain 97)
            </label>
            <div className="flex gap-2">
              <input
                id="binanceTestnetContract"
                type="text"
                value={binanceTestnetContract}
                onChange={(e) => setBinanceTestnetContract(e.target.value)}
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 dark:text-gray-300 dark:bg-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                placeholder="0x..."
              />
              <button
                type="button"
                className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-xs"
                onClick={handleSaveBinanceTestnetContract}
              >
                Save
              </button>
            </div>
            <p className="text-gray-400 text-xs mt-1">
              Address saved in <code>contracts.binanceTestnet</code> in Firestore. Use for testing on BSC Testnet (Chain 97).
            </p>
            {binanceTestnetSaveStatus && (
              <div className={`mt-1 text-xs ${binanceTestnetSaveStatus.includes('success') ? 'text-green-400' : 'text-red-400'}`}>{binanceTestnetSaveStatus}</div>
            )}
          </div>
        </div>
        
        {/* Current Configuration Information */}
        <div className="border-t border-gray-700 pt-4">
          <h3 className="text-lg font-semibold mb-2 text-gray-300">Current System Configuration</h3>
          <div className="bg-black p-3 rounded overflow-auto">
            <pre className="text-sm text-gray-400 whitespace-pre-wrap">
              {JSON.stringify(currentSystemConfig, null, 2)}
            </pre>
          </div>
          <p className="text-gray-400 text-xs mt-2">
            These are the current system settings. Values saved in Firestore take precedence over values defined in the paymentConfig.ts file.
            {currentSystemConfig && currentSystemConfig.updatedAt && (
              <span> Last update: {currentSystemConfig.updatedAt}</span>
            )}
          </p>
        </div>
        
        <div className="flex items-center justify-between pt-4">
          <button
            type="submit"
            disabled={isUpdating}
            className={`bg-orange-500 hover:bg-orange-600 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline ${
              isUpdating ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            {isUpdating ? 'Updating...' : 'Save Settings'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default PaymentSettings;