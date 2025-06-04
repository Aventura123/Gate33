import React, { useState, useEffect, useCallback } from "react";
import { db } from "../../lib/firebase";
import { collection, query, getDocs, addDoc, updateDoc, doc, deleteDoc, where, setDoc } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { web3Service } from "../../services/web3Service";
import smartContractService from "../../services/smartContractService";
import InstantJobsManager from "./InstantJobsManager";
import { NETWORK_CONFIG, CONTRACT_ADDRESSES } from "../../config/paymentConfig";
import { useWallet } from "../WalletProvider";

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
    optimism?: string;
    avalanche?: string;
  };
  mainWallet?: string; // Main wallet receiving 70% of payments
  updatedAt?: Date;
}

const PaymentSettings: React.FC<PaymentConfigProps> = ({ hasPermission }) => {
  // Get wallet state from context
  const { 
    walletAddress: contextWalletAddress, 
    currentNetwork, 
    connectWallet: contextConnectWallet,
    disconnectWallet: contextDisconnectWallet
  } = useWallet();
  
  // States to store configuration values
  const [walletAddress, setWalletAddress] = useState("");
  const [serviceFee, setServiceFee] = useState(0);
  const [transactionTimeout, setTransactionTimeout] = useState(0);
  
  // Add a state for the main wallet (70% recipient)
  const [mainWallet, setMainWallet] = useState("");
    // States for contracts on different networks
  const [ethContract, setEthContract] = useState("");
  const [polygonContract, setPolygonContract] = useState("");
  const [binanceContract, setBinanceContract] = useState("");
  const [optimismContract, setOptimismContract] = useState("");
  const [avalancheContract, setAvalancheContract] = useState("");

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
  const [mainWalletPercentage, setMainWalletPercentage] = useState(100);
  
  // States for wallet updates
  const [updatingWallets, setUpdatingWallets] = useState(false);
  const [updatingPercentages, setUpdatingPercentages] = useState(false);
  const [walletUpdateSuccess, setWalletUpdateSuccess] = useState(false);
  const [percentageUpdateSuccess, setPercentageUpdateSuccess] = useState(false);
  const [walletUpdateError, setWalletUpdateError] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateSuccess, setUpdateSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Using wallet connected state from context
  const [walletConnected, setWalletConnected] = useState(!!contextWalletAddress);

  // Add state to store the contract owner's address
  const [contractOwner, setContractOwner] = useState<string | null>(null);
  const [isCheckingOwner, setIsCheckingOwner] = useState(false);

  // Additional states specific to owner verification
  const [ownerVerificationSuccess, setOwnerVerificationSuccess] = useState(false);
  const [ownerVerificationError, setOwnerVerificationError] = useState<string | null>(null);

  // States for the main wallet update
  const [mainWalletUpdateSuccess, setMainWalletUpdateSuccess] = useState(false);
  const [mainWalletUpdateError, setMainWalletUpdateError] = useState<string | null>(null);  // Function to convert percentages from contract base 1000 to actual percentage for display
  const contractToDisplayPercentage = (value: number): number => {
    return value / 10; // Converts base 1000 to real percentage (e.g., 50 -> 5%)
  };

  // Converts display percentage (actual percentage) to contract value base 1000
  const displayToContractPercentage = (value: number): number => {
    return Math.round(value * 10); // Converts to base 1000 (e.g., 5% -> 50)
  };

  // Load settings from Firestore
  const fetchCurrentSettings = useCallback(async () => {
    try {
      console.log("Fetching current payment settings from Firestore...");
      
      // Specifically fetch the "paymentConfig" document from the "settings" collection
      const configRef = doc(db, "settings", "paymentConfig");
      const configSnapshot = await getDocs(query(collection(db, "settings"), 
                                            where("__name__", "==", "paymentConfig")));
      
      if (!configSnapshot.empty) {
        const data = configSnapshot.docs[0].data() as FirestorePaymentConfig;
        console.log("Payment settings found in Firestore:", data);
        
        // Update states with values from Firestore
        if (data.receiverAddress) setWalletAddress(data.receiverAddress);
        if (data.serviceFee !== undefined) setServiceFee(data.serviceFee);
        if (data.transactionTimeout !== undefined) setTransactionTimeout(data.transactionTimeout / 1000); // Convert from ms to seconds
        
        // Load main wallet if exists
        if (data.mainWallet) setMainWallet(data.mainWallet);
          // Load contract addresses - checking the contracts structure
        if (data.contracts) {
          if (data.contracts.ethereum) setEthContract(data.contracts.ethereum);
          if (data.contracts.polygon) setPolygonContract(data.contracts.polygon);
          if (data.contracts.binance) setBinanceContract(data.contracts.binance);
          if (data.contracts.optimism) setOptimismContract(data.contracts.optimism);
          if (data.contracts.avalanche) setAvalancheContract(data.contracts.avalanche);
        }
          // Update the system configuration view
        setCurrentSystemConfig({
          receiverAddress: data.receiverAddress || "",
          mainWallet: data.mainWallet || "",
          contracts: {
            ethereum: data.contracts?.ethereum || "",
            polygon: data.contracts?.polygon || "",
            binance: data.contracts?.binance || "",
            optimism: data.contracts?.optimism || "",
            avalanche: data.contracts?.avalanche || ""
          },
          serviceFee: (data.serviceFee !== undefined ? data.serviceFee : 0) + "%",
          transactionTimeout: (data.transactionTimeout ? data.transactionTimeout / 1000 : 0) + " seconds",
          updatedAt: data.updatedAt ? (
            // Ensure Firestore timestamp compatibility
            typeof data.updatedAt === 'object' && 'seconds' in data.updatedAt
              ? new Date((data.updatedAt as { seconds: number }).seconds * 1000).toLocaleString()
              : data.updatedAt instanceof Date 
                ? data.updatedAt.toLocaleString() 
                : new Date(data.updatedAt).toLocaleString()
          ) : "Not available"
        });
        
        console.log("Settings loaded successfully from Firestore");
      } else {
        console.log("No payment settings found in Firestore, will create default configuration");
        // If it doesn't exist, create a new document with default values
        await updatePaymentConfig();
        console.log("Default settings saved to Firestore");
      }
    } catch (err) {
      console.error("Error loading payment settings:", err);
      setError("Could not load payment settings. " + (err instanceof Error ? err.message : String(err)));
    }
  }, []);
  useEffect(() => {
    if (hasPermission) {
      fetchCurrentSettings();
      checkWalletConnection();      // Setup event listener for network changes
      const handleNetworkChange = (event: CustomEvent) => {
        console.log("🔄 Network changed detected:", event.detail);
        
        // Show loading state
        setWalletUpdateError("Switching networks... Fetching fee distribution data for the new network.");
        
        // Reset contract initialization to ensure we're using the correct contract for the new network
        smartContractService.resetContract();
        
        // Wait a short delay before fetching new data to ensure network is fully switched
        setTimeout(() => {
          // Re-fetch contract data when network changes
          fetchContractData();
        }, 1000);
      };
      
      // Register event listener
      window.addEventListener('web3NetworkChanged', handleNetworkChange as EventListener);
      
      // Cleanup event listener on component unmount
      return () => {
        window.removeEventListener('web3NetworkChanged', handleNetworkChange as EventListener);
      };
    }
  }, [hasPermission, fetchCurrentSettings]);

  // Check wallet connection using context
  const checkWalletConnection = () => {
    try {
      const connected = !!contextWalletAddress;
      setWalletConnected(connected);
      if (connected) {
        fetchContractData();
      }
    } catch (err) {
      console.error("Error checking wallet connection:", err);
    }
  };
  
  // Update wallet connection status when context changes
  useEffect(() => {
    setWalletConnected(!!contextWalletAddress);
    if (contextWalletAddress) {
      fetchContractData();
    }
  }, [contextWalletAddress]);
  // Fetch contract data (addresses and percentages) with more robust error handling
  const fetchContractData = async () => {
    try {
      setWalletUpdateError(null);
      
      // Reset all wallet addresses and percentages when network changes or refreshing data
      // This prevents showing stale data from a previous network
      setFeeCollectorAddress("");
      setDevelopmentWalletAddress("");
      setCharityWalletAddress("");
      setEvolutionWalletAddress("");
      setFeePercentage(0);
      setDevelopmentPercentage(0);
      setCharityPercentage(0);
      setEvolutionPercentage(0);
      setTotalPercentage(0);
      setContractOwner("");

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
      }      // Always reinitialize the contract with the current network and address to prevent stale data
      try {
        // First ensure we're using the correct network
        await smartContractService.switchContractNetwork(currentChainId, contractAddress);
        
        // Then initialize the contract with the correct address
        await smartContractService.initializeContract(undefined, contractAddress);
      } catch (initError: any) {
        console.error(`Error initializing contract on ${currentNetworkName}:`, initError);
        setWalletUpdateError(`Could not initialize contract on ${currentNetworkName}: ${initError.message || "check your network connection"}`);
        return;
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
        // Always switch contract network before calling getContractOwner to avoid provider desync
        await smartContractService.switchContractNetwork(currentChainId, contractAddress);
        // --- PATCH: Re-initialize provider and signer after network switch ---
        if (smartContractService.init) {
          await smartContractService.init();
        }
        // --- END PATCH ---
        const walletInfo = web3Service.getWalletInfo();
        if (!walletInfo || !walletInfo.chainId || !walletInfo.networkName) {
          setWalletUpdateError(
            'Cannot get contract owner: Wallet/network not connected or not detected. Please connect your wallet and ensure you are on a supported network.'
          );
          return;
        }
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
  // Connect wallet using context
  const connectWallet = async () => {
    try {
      setWalletUpdateError(null);
      
      await contextConnectWallet();
      
      // The wallet connected state will be updated via the useEffect that watches contextWalletAddress
      
      // Verify the contract owner on the current network
      await checkContractOwner();
      
    } catch (err: any) {
      console.error("Error connecting wallet:", err);
      setWalletUpdateError(err.message || "Error connecting wallet. Check if MetaMask is installed.");
    }
  };

  const updatePaymentConfig = async () => {    try {
        const configData = {
            receiverAddress: walletAddress,
            serviceFee: serviceFee,
            transactionTimeout: transactionTimeout * 1000, // Converted to milliseconds
            mainWallet: mainWallet, // Add main wallet to config
            contracts: {
                ethereum: ethContract,
                polygon: polygonContract,
                binance: binanceContract,
                optimism: optimismContract,
                avalanche: avalancheContract
            },
            updatedAt: new Date(),
        };

        // Save to Firestore
        await setDoc(doc(db, "settings", "paymentConfig"), configData, { merge: true });        // Update CONTRACT_ADDRESSES dynamically
        CONTRACT_ADDRESSES.ethereum = ethContract;
        CONTRACT_ADDRESSES.polygon = polygonContract;
        CONTRACT_ADDRESSES.binance = binanceContract;
        CONTRACT_ADDRESSES.optimism = optimismContract;
        CONTRACT_ADDRESSES.avalanche = avalancheContract;

        // Update the current system configuration
        setCurrentSystemConfig({
            receiverAddress: walletAddress,
            mainWallet: mainWallet,
            contracts: {
                ethereum: ethContract,
                polygon: polygonContract,
                binance: binanceContract,
                optimism: optimismContract,
                avalanche: avalancheContract
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
    
    try {      // Check if we're only updating contract addresses
      const onlyUpdatingContracts = 
        (ethContract || polygonContract || binanceContract || optimismContract || avalancheContract) && 
        !walletAddress && 
        serviceFee === 0 && 
        transactionTimeout === 0;

      // Only validate wallet address if it's provided or if we're not just updating contract addresses
      if (walletAddress && !validateEthereumAddress(walletAddress) && !onlyUpdatingContracts) {
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
      
      if (optimismContract && !validateEthereumAddress(optimismContract)) {
        throw new Error("Optimism contract address is invalid.");
      }
      
      if (avalancheContract && !validateEthereumAddress(avalancheContract)) {
        throw new Error("Avalanche contract address is invalid.");
      }
      
      // Validate service fee
      if (serviceFee < 0 || serviceFee > 100) {
        throw new Error("Service fee must be between 0 and 100%.");
      }
      
      // Validate transaction timeout
      if (transactionTimeout < 10 && transactionTimeout !== 0) {
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

      console.log("Validating wallet addresses...");
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

      console.log("Initializing contract...");
      if (!smartContractService.isContractInitialized()) {
        const walletInfo = web3Service.getWalletInfo();
        const networkName = walletInfo?.networkName?.toLowerCase();
        if (!networkName || !(networkName in CONTRACT_ADDRESSES)) {
          throw new Error(`Contract address not found for the current network: ${walletInfo?.networkName}`);
        }
      
        const contractAddress = CONTRACT_ADDRESSES[networkName as keyof typeof CONTRACT_ADDRESSES];
        console.log(`Contract address for network ${networkName}: ${contractAddress}`);
        await smartContractService.initializeContract(undefined, contractAddress);
      }

      console.log("Verifying ownership...");
      const isOwner = await smartContractService.checkOwnership();
      if (!isOwner) {
        throw new Error("You are not the contract owner. Only the owner can update wallets.");
      }

      // Updating each wallet individually with error handling for each
      // REMOVED ALL PERCENTAGE UPDATES - ONLY UPDATING ADDRESSES
      try {
        console.log("1. Updating Fee Collector wallet:", feeCollectorAddress);
        await smartContractService.updateFeeCollector(feeCollectorAddress, {
          gasLimit: 300000
        });
        console.log("✓ Fee collector updated successfully:", feeCollectorAddress);
      } catch (err: any) {
        console.error("Error updating Fee Collector wallet:", err);
        throw new Error(`Failed to update Fee Collector wallet: ${err.message}`);
      }

      try {
        console.log("2. Updating Development wallet:", developmentWalletAddress);
        await smartContractService.updateDevelopmentWallet(developmentWalletAddress, {
          gasLimit: 300000
        });
        console.log("✓ Development wallet updated successfully:", developmentWalletAddress);
      } catch (err: any) {
        console.error("Error updating Development wallet:", err);
        throw new Error(`Failed to update Development wallet: ${err.message}`);
      }

      try {
        console.log("3. Updating Charity wallet:", charityWalletAddress);
        await smartContractService.updateCharityWallet(charityWalletAddress, {
          gasLimit: 300000
        });
        console.log("✓ Charity wallet updated successfully:", charityWalletAddress);
      } catch (err: any) {
        console.error("Error updating Charity wallet:", err);
        throw new Error(`Failed to update Charity wallet: ${err.message}`);
      }

      try {
        console.log("4. Updating Evolution wallet:", evolutionWalletAddress);
        await smartContractService.updateEvolutionWallet(evolutionWalletAddress, {
          gasLimit: 300000
        });
        console.log("✓ Evolution wallet updated successfully:", evolutionWalletAddress);
      } catch (err: any) {
        console.error("Error updating Evolution wallet:", err);
        throw new Error(`Failed to update Evolution wallet: ${err.message}`);
      }

      setWalletUpdateSuccess(true);
      console.log("All wallet addresses updated successfully");
      await fetchContractData(); // Refresh data after update
    } catch (err: any) {
      console.error("Error updating wallets:", err);
      setWalletUpdateError(err.message || "Error updating wallets.");
    } finally {
      setUpdatingWallets(false);
    }
  };

  // Function to update only the percentages
  const handleUpdatePercentages = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpdatingPercentages(true);
    setWalletUpdateError(null);
    setPercentageUpdateSuccess(false);

    try {
      if (!walletConnected) {
        throw new Error("Connect your wallet first");
      }

      console.log("Validating percentages...");      // Use the actual percentage values for validation in the interface
      const total = feePercentage + developmentPercentage + charityPercentage + evolutionPercentage;
      
      // Total in the interface should not exceed 30%
      if (total > 30) {
        throw new Error("The total sum of all percentages cannot exceed 30%");
      }

      console.log("Initializing contract...");
      if (!smartContractService.isContractInitialized()) {
        const walletInfo = web3Service.getWalletInfo();
        const networkName = walletInfo?.networkName?.toLowerCase();
        if (!networkName || !(networkName in CONTRACT_ADDRESSES)) {
          throw new Error(`Contract address not found for the current network: ${walletInfo?.networkName}`);
        }
      
        const contractAddress = CONTRACT_ADDRESSES[networkName as keyof typeof CONTRACT_ADDRESSES];
        console.log(`Contract address for network ${networkName}: ${contractAddress}`);
        await smartContractService.initializeContract(undefined, contractAddress);
      }

      console.log("Verifying ownership...");
      const isOwner = await smartContractService.checkOwnership();
      if (!isOwner) {
        throw new Error("You are not the contract owner. Only the owner can update percentages.");
      }
      
      console.log("Updating percentages one by one...");
      
      // Updating each percentage individually with error handling for each
      
      try {
        // 1. Update Fee Percentage
        const feeBase1000 = displayToContractPercentage(feePercentage);
        console.log(`1. Updating Fee Percentage: ${feePercentage}% -> ${feeBase1000} (base 1000)`);
        
        // Increasing the gas limit for all transactions
        await smartContractService.updateFeePercentage(feeBase1000, {
          gasLimit: 300000
        });
        console.log("✓ Fee percentage updated successfully");
      } catch (err: any) {
        console.error("Error updating Fee percentage:", err);
        throw new Error(`Failed to update Fee percentage: ${err.message}`);
      }

      try {
        // 2. Update Development Percentage
        const devBase1000 = displayToContractPercentage(developmentPercentage);
        console.log(`2. Updating Development Percentage: ${developmentPercentage}% -> ${devBase1000} (base 1000)`);
        
        await smartContractService.updateDevelopmentPercentage(devBase1000, {
          gasLimit: 300000
        });
        console.log("✓ Development percentage updated successfully");
      } catch (err: any) {
        console.error("Error updating Development percentage:", err);
        throw new Error(`Failed to update Development percentage: ${err.message}`);
      }

      try {
        // 3. Update Charity Percentage
        const charityBase1000 = displayToContractPercentage(charityPercentage);
        console.log(`3. Updating Charity Percentage: ${charityPercentage}% -> ${charityBase1000} (base 1000)`);
        
        await smartContractService.updateCharityPercentage(charityBase1000, {
          gasLimit: 300000
        });
        console.log("✓ Charity percentage updated successfully");
      } catch (err: any) {
        console.error("Error updating Charity percentage:", err);
        throw new Error(`Failed to update Charity percentage: ${err.message}`);
      }

      try {
        // 4. Update Evolution Percentage
        const evolutionBase1000 = displayToContractPercentage(evolutionPercentage);
        console.log(`4. Updating Evolution Percentage: ${evolutionPercentage}% -> ${evolutionBase1000} (base 1000)`);
        
        // Using the same pattern as other percentages, just with a higher gas limit
        await smartContractService.updateEvolutionPercentage(evolutionBase1000, {
          gasLimit: 400000 // A bit more gas than other operations
        });
        console.log("✓ Evolution percentage updated successfully");
      } catch (err: any) {
        console.error("Error updating Evolution percentage:", err);
        throw new Error(`Failed to update Evolution percentage: ${err.message}`);
      }

      setPercentageUpdateSuccess(true);
      console.log("All percentages updated successfully");
      
      // Wait a moment before updating the data to ensure the blockchain has been updated
      setTimeout(async () => {
        await fetchContractData();
        console.log("Contract data refreshed after percentage update");
      }, 2000);

    } catch (err: any) {
      console.error("Error updating percentages:", err);
      setWalletUpdateError(err.message || "Error updating percentages.");
    } finally {
      setUpdatingPercentages(false);
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
      
      if (!contextWalletAddress) {
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
        // Always switch contract network before calling getContractOwner to avoid provider desync
        await smartContractService.switchContractNetwork(currentChainId, contractAddress);
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
  };  // Verify the total sum of percentages and update main wallet percentage whenever they change
  useEffect(() => {
    const total = feePercentage + developmentPercentage + charityPercentage + evolutionPercentage;
    setTotalPercentage(total);
    
    // Calculate the main wallet percentage (100% - fee distribution percentages)
    // Ensuring it's never lower than 70%
    const calculatedMainWalletPercentage = Math.max(70, 100 - total);
    setMainWalletPercentage(calculatedMainWalletPercentage);
    
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

  // Efeito para processar as larguras dinâmicas
  useEffect(() => {
    // Encontra todos os elementos com a classe 'dynamic-width'
    const dynamicElements = document.querySelectorAll('.dynamic-width');
    
    // Para cada elemento, aplica o valor de width do atributo data-width
    dynamicElements.forEach(element => {
      const width = element.getAttribute('data-width');
      if (width) {
        (element as HTMLElement).style.width = width;
      }
    });
  }, [feePercentage, developmentPercentage, charityPercentage, evolutionPercentage, totalPercentage]);

  // Function to update main wallet (70% recipient)
  const handleUpdateMainWallet = async (e: React.FormEvent) => {
    e.preventDefault();
    setMainWalletUpdateError(null);
    setMainWalletUpdateSuccess(false);

    try {
      if (!validateEthereumAddress(mainWallet)) {
        throw new Error("Main wallet address is invalid. Must start with '0x' followed by 40 hexadecimal characters.");
      }
      
      // Update only the main wallet in Firestore
      const configRef = doc(db, "settings", "paymentConfig");
      await setDoc(configRef, { mainWallet: mainWallet }, { merge: true });
      
      // Update local state
      setMainWalletUpdateSuccess(true);
      console.log("Main wallet updated successfully:", mainWallet);
    } catch (err: any) {
      console.error("Error updating main wallet:", err);
      setMainWalletUpdateError(err.message || "Error updating main wallet.");
    }
  };

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
  };  if (!hasPermission) {
    return (
      <div className="bg-red-900/50 border border-red-500 text-white p-4 md:p-6 rounded-xl">
        <p className="text-sm">You do not have permission to access this section.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 md:space-y-8">
      {/* Error Message */}
      {error && (
        <div className="bg-red-900/50 border border-red-500 text-white p-3 md:p-4 rounded-lg mb-4 md:mb-6 text-sm">
          <p>{error}</p>
        </div>
      )}

      {/* Success Message */}
      {updateSuccess && (
        <div className="bg-green-900/50 border border-green-500 text-white p-3 md:p-4 rounded-lg mb-4 md:mb-6 text-sm">
          <p>Payment settings updated successfully!</p>
        </div>
      )}

      {/* Owner Success Message */}
      {localStorage.getItem('ownerSuccessMessage') && (
        <div className="bg-green-900/50 border border-green-500 text-white p-3 md:p-4 rounded-lg mb-4 md:mb-6 text-sm">
          <p>{localStorage.getItem('ownerSuccessMessage')}</p>
        </div>
      )}

      {/* Main wallet configuration section (70% of payments) */}
      <div className="bg-black/30 p-4 md:p-6 rounded-xl border border-gray-700 hover:border-orange-500 transition-colors">        <h3 className="text-lg md:text-xl font-bold text-orange-400 mb-4">Primary Payment Wallet (70%)</h3>
        
        {/* Main Wallet Error Message */}
        {mainWalletUpdateError && (
          <div className="bg-red-900/50 border border-red-500 text-white p-3 md:p-4 rounded-lg mb-4 text-sm">
            <p>{mainWalletUpdateError}</p>
          </div>
        )}
        
        {/* Main Wallet Success Message */}
        {mainWalletUpdateSuccess && (
          <div className="bg-green-900/50 border border-green-500 text-white p-3 md:p-4 rounded-lg mb-4 text-sm">
            <p>Main wallet updated successfully!</p>
          </div>
        )}

        {/* Info Message */}
        <div className="bg-green-900/20 border border-green-800/50 rounded-lg p-3 mb-4">
          <p className="text-sm text-gray-300">
            This wallet will receive <span className="font-bold text-green-400">{mainWalletPercentage.toFixed(1)}%</span> of all job posting payments. 
            This is separate from the fee distribution wallets below.
          </p>
        </div>

        <form onSubmit={handleUpdateMainWallet} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-300 mb-1" htmlFor="mainWallet">
              Main Recipient Wallet Address
            </label>
            <input
              id="mainWallet"
              type="text"
              value={mainWallet}
              onChange={(e) => setMainWallet(e.target.value)}
              className="w-full px-3 py-2 bg-black/40 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-orange-400 focus:outline-none text-sm"
              placeholder="0x..."
            />
            <p className="text-xs text-gray-400 mt-1">
              This address will receive 70% of all job posting payments.
            </p>
          </div>
          
          <button
            type="submit"
            className="bg-orange-500 text-white px-4 py-2 rounded-lg hover:bg-orange-600 disabled:opacity-60 font-semibold shadow text-sm w-full md:w-auto"
          >
            Update Main Wallet
          </button>
        </form>
      </div>

      {/* Fee distribution section (30% split across wallets) */}
      <div className="bg-black/30 p-4 md:p-6 rounded-xl border border-gray-700 hover:border-orange-500 transition-colors">        <h3 className="text-lg md:text-xl font-bold text-orange-400 mb-4">Fee Distribution Wallets ({totalPercentage.toFixed(1)}%)</h3>
        
        {/* Info Message */}
        <div className="bg-orange-900/20 border border-orange-800/50 rounded-lg p-3 mb-4">
          <p className="text-sm text-gray-300">
            The remaining <span className="font-bold text-orange-400">{totalPercentage.toFixed(1)}%</span> of each payment is distributed
            among the following wallets according to the percentages you set. 
            <span className="block mt-1 font-bold">These settings are stored in the smart contract and require wallet connection to update.</span>
          </p>
        </div>

        {/* Error Messages */}
        {walletUpdateError && (
          <div className="bg-red-900/50 border border-red-500 text-white p-3 md:p-4 rounded-lg mb-4 text-sm">
            <p>{walletUpdateError}</p>
          </div>
        )}
        
        {/* Success Messages */}
        {walletUpdateSuccess && (
          <div className="bg-green-900/50 border border-green-500 text-white p-3 md:p-4 rounded-lg mb-4 text-sm">
            <p>Fee distribution wallets successfully updated in the contract!</p>
          </div>
        )}
        
        {percentageUpdateSuccess && (
          <div className="bg-green-900/50 border border-green-500 text-white p-3 md:p-4 rounded-lg mb-4 text-sm">
            <p>Percentages successfully updated on the blockchain!</p>
          </div>
        )}
        
        {/* Contract Owner Info */}
        {contractOwner && (
          <div className="bg-black/40 border border-gray-700 text-white p-3 md:p-4 rounded-lg mb-4 text-sm">
            <p>
              <strong>Contract owner:</strong> {contractOwner}
              {web3Service.getWalletInfo()?.address === contractOwner && (
                <span className="ml-2 bg-orange-500 text-white text-xs px-2 py-1 rounded-full">
                  You are the owner!
                </span>
              )}
            </p>
          </div>
        )}

        <div className="space-y-4 md:space-y-6">
          {/* Wallet Connection Status */}
          <div className="flex justify-between items-center">
            <p className="text-gray-300 text-sm">
              {walletConnected ? (
                <>
                  <span className="px-1.5 md:px-2 py-0.5 rounded-full text-xs bg-orange-900/50 text-orange-300 border border-orange-700 mr-2">Connected</span>
                  Wallet connected - you can configure fee distribution
                </>
              ) : (
                <>
                  <span className="px-1.5 md:px-2 py-0.5 rounded-full text-xs bg-gray-800 text-gray-400 border border-gray-700 mr-2">Not Connected</span>
                  Wallet not connected - connect to configure settings
                </>
              )}
            </p>
            
            <button
              type="button"
              onClick={checkContractOwner}
              disabled={isCheckingOwner}
              className="bg-gray-800 hover:bg-gray-700 text-gray-100 px-3 py-1.5 rounded-md text-xs font-semibold"
            >
              {isCheckingOwner ? 'Checking...' : 'Verify Contract Owner'}
            </button>
          </div>

          {/* Form Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">            {/* Fee Collector Wallet */}
            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-1" htmlFor="feeCollectorAddress">
                Fee Collector Wallet
              </label>
              <input
                id="feeCollectorAddress"
                type="text"
                value={feeCollectorAddress}
                onChange={(e) => setFeeCollectorAddress(e.target.value)}
                className="w-full px-3 py-2 bg-black/40 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-orange-400 focus:outline-none text-sm"
                placeholder="0x..."
              />
              {currentFeeCollector && (
                <p className="text-xs text-gray-400 mt-1">
                  Current address: <span className="font-mono">{currentFeeCollector}</span>
                </p>
              )}
            </div>
            
            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-1" htmlFor="feePercentage">
                Fee Collector (%)
              </label>
              <input
                id="feePercentage"
                type="number"
                min="0"
                max="30"
                step="0.1"
                value={feePercentage || ''}
                onChange={(e) => setFeePercentage(e.target.value === '' ? 0 : parseFloat(e.target.value))}
                className="w-full px-3 py-2 bg-black/40 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-orange-400 focus:outline-none text-sm"
              />
              <p className="text-xs text-gray-400 mt-1">
                Contract value (base 1000): {displayToContractPercentage(feePercentage)}
              </p>
            </div>
            
            {/* Development Wallet */}
            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-1" htmlFor="developmentWalletAddress">
                Development Wallet
              </label>
              <input
                id="developmentWalletAddress"
                type="text"
                value={developmentWalletAddress}
                onChange={(e) => setDevelopmentWalletAddress(e.target.value)}
                className="w-full px-3 py-2 bg-black/40 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-orange-400 focus:outline-none text-sm"
                placeholder="0x..."
              />
            </div>
            
            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-1" htmlFor="developmentPercentage">
                Development Percentage (%)
              </label>
              <input
                id="developmentPercentage"
                type="number"
                min="0"
                max="30"
                step="0.1"
                value={developmentPercentage || ''}
                onChange={(e) => setDevelopmentPercentage(e.target.value === '' ? 0 : parseFloat(e.target.value))}
                className="w-full px-3 py-2 bg-black/40 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-orange-400 focus:outline-none text-sm"
              />
              <p className="text-xs text-gray-400 mt-1">
                Contract value (base 1000): {displayToContractPercentage(developmentPercentage)}
              </p>
            </div>
            
            {/* Charity Wallet */}
            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-1" htmlFor="charityWalletAddress">
                Charity Wallet
              </label>
              <input
                id="charityWalletAddress"
                type="text"
                value={charityWalletAddress}
                onChange={(e) => setCharityWalletAddress(e.target.value)}
                className="w-full px-3 py-2 bg-black/40 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-orange-400 focus:outline-none text-sm"
                placeholder="0x..."
              />
            </div>
            
            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-1" htmlFor="charityPercentage">
                Charity Percentage (%)
              </label>
              <input
                id="charityPercentage"
                type="number"
                min="0"
                max="30"
                step="0.1"
                value={charityPercentage || ''}
                onChange={(e) => setCharityPercentage(e.target.value === '' ? 0 : parseFloat(e.target.value))}
                className="w-full px-3 py-2 bg-black/40 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-orange-400 focus:outline-none text-sm"
              />
              <p className="text-xs text-gray-400 mt-1">
                Contract value (base 1000): {displayToContractPercentage(charityPercentage)}
              </p>
            </div>

            {/* Evolution Wallet */}
            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-1" htmlFor="evolutionWalletAddress">
                Evolution Wallet
              </label>
              <input
                id="evolutionWalletAddress"
                type="text"
                value={evolutionWalletAddress}
                onChange={(e) => setEvolutionWalletAddress(e.target.value)}
                className="w-full px-3 py-2 bg-black/40 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-orange-400 focus:outline-none text-sm"
                placeholder="0x..."
              />
            </div>
            
            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-1" htmlFor="evolutionPercentage">
                Evolution Percentage (%)
              </label>
              <input
                id="evolutionPercentage"
                type="number"
                min="0"
                max="30"
                step="0.1"
                value={evolutionPercentage || ''}
                onChange={(e) => setEvolutionPercentage(e.target.value === '' ? 0 : parseFloat(e.target.value))}
                className="w-full px-3 py-2 bg-black/40 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-orange-400 focus:outline-none text-sm"
              />
              <p className="text-xs text-gray-400 mt-1">
                Contract value (base 1000): {displayToContractPercentage(evolutionPercentage)}
              </p>
            </div>
          </div>

          {/* Total Fees Summary */}
          <div className="bg-black/40 border border-gray-700 rounded-lg p-3">
            <p className="text-white font-semibold text-sm">Total fees: {totalPercentage.toFixed(1)}%</p>
            <div className="w-full bg-black/50 h-2 mt-2 rounded-full overflow-hidden">
              <div 
                className={`h-full ${totalPercentage > 30 ? 'bg-red-500' : 'bg-orange-500'} progress-bar dynamic-width`} 
                data-width={`${Math.min((totalPercentage / 30) * 100, 100)}%`}
              ></div>
            </div>
            <p className="text-xs text-gray-400 mt-1">
              The total sum must not exceed 30%
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4">
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                handleUpdateAdditionalWallets(e as any);
              }}
              disabled={updatingWallets}
              className={`bg-orange-500 text-white px-4 py-2 rounded-lg hover:bg-orange-600 disabled:opacity-60 font-semibold shadow text-sm ${
                updatingWallets ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              {updatingWallets ? 'Updating Wallets...' : 'Update Wallets'}
            </button>

            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                handleUpdatePercentages(e as any);
              }}
              disabled={updatingPercentages}
              className={`bg-gray-800 hover:bg-gray-700 text-gray-100 px-3 py-2 rounded-lg text-sm font-semibold ${
                updatingPercentages ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              {updatingPercentages ? 'Updating Percentages...' : 'Update Percentages'}
            </button>
          </div>
        </div>
      </div>

      {/* Payment Distribution Overview */}
      <div className="bg-black/30 p-4 md:p-6 rounded-xl border border-gray-700 hover:border-orange-500 transition-colors">        <h3 className="text-lg md:text-xl font-bold text-orange-400 mb-4">Payment Distribution Overview</h3>
        
        <div className="bg-black/40 p-3 rounded-lg">
          <div className="space-y-4">
            {/* Main Recipient Bar */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-gray-300 text-sm">Main Recipient:</span>
                <span className="text-orange-400 font-bold">{mainWalletPercentage.toFixed(1)}%</span>
              </div>
              <div className="w-full bg-black/50 h-4 rounded-lg overflow-hidden">
                <div
                  className="h-full bg-orange-500 main-wallet-bar"
                  data-width={`${mainWalletPercentage}%`}
                ></div>
              </div>
            </div>

            {/* Fee Distribution Bar */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-gray-300 text-sm">Fee Distribution (total):</span>
                <span className="text-orange-400 font-bold">{totalPercentage.toFixed(1)}%</span>
              </div>
              <div className="w-full bg-black/50 h-4 rounded-lg overflow-hidden">
                <div className="h-full bg-orange-500 fee-distribution-bar" data-width={`${totalPercentage}%`}></div>
              </div>
            </div>

            {/* Individual Distribution Grid */}
            <div className="grid grid-cols-4 gap-2">
              <div className="text-center">
                <div className="text-xs text-gray-400 mb-1">Fee Collector</div>
                <div className="text-sm text-gray-300 font-medium">{feePercentage.toFixed(1)}%</div>
              </div>
              <div className="text-center">
                <div className="text-xs text-gray-400 mb-1">Development</div>
                <div className="text-sm text-gray-300 font-medium">{developmentPercentage.toFixed(1)}%</div>
              </div>
              <div className="text-center">
                <div className="text-xs text-gray-400 mb-1">Charity</div>
                <div className="text-sm text-gray-300 font-medium">{charityPercentage.toFixed(1)}%</div>
              </div>
              <div className="text-center">
                <div className="text-xs text-gray-400 mb-1">Evolution</div>
                <div className="text-sm text-gray-300 font-medium">{evolutionPercentage.toFixed(1)}%</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* System Settings Form */}
      <form onSubmit={handleSubmit} className="space-y-6 md:space-y-8">
        {/* Contract Addresses Section */}
        <div className="bg-black/30 p-4 md:p-6 rounded-xl border border-gray-700 hover:border-orange-500 transition-colors">          <h3 className="text-lg md:text-xl font-bold text-orange-400 mb-4">Contract Addresses</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
            {/* Ethereum Contract */}
            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-1" htmlFor="ethContract">
                Ethereum Contract
              </label>
              <input
                id="ethContract"
                type="text"
                value={ethContract}
                onChange={(e) => setEthContract(e.target.value)}
                className="w-full px-3 py-2 bg-black/40 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-orange-400 focus:outline-none text-sm"
                placeholder="0x..."
              />
            </div>
            
            {/* Polygon Contract */}
            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-1" htmlFor="polygonContract">
                Polygon Contract
              </label>
              <input
                id="polygonContract"
                type="text"
                value={polygonContract}
                onChange={(e) => setPolygonContract(e.target.value)}
                className="w-full px-3 py-2 bg-black/40 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-orange-400 focus:outline-none text-sm"
                placeholder="0x..."
              />
            </div>

            {/* Binance Smart Chain Contract */}
            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-1" htmlFor="binanceContract">
                Binance Smart Chain Contract
              </label>
              <input
                id="binanceContract"
                type="text"
                value={binanceContract}
                onChange={(e) => setBinanceContract(e.target.value)}
                className="w-full px-3 py-2 bg-black/40 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-orange-400 focus:outline-none text-sm"
                placeholder="0x..."
              />
            </div>
            
            {/* Optimism Contract */}
            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-1" htmlFor="optimismContract">
                Optimism Contract
              </label>
              <input
                id="optimismContract"
                type="text"
                value={optimismContract}
                onChange={(e) => setOptimismContract(e.target.value)}
                className="w-full px-3 py-2 bg-black/40 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-orange-400 focus:outline-none text-sm"
                placeholder="0x..."
              />
            </div>
            
            {/* Avalanche Contract */}
            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-1" htmlFor="avalancheContract">
                Avalanche Contract
              </label>
              <input
                id="avalancheContract"
                type="text"
                value={avalancheContract}
                onChange={(e) => setAvalancheContract(e.target.value)}
                className="w-full px-3 py-2 bg-black/40 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-orange-400 focus:outline-none text-sm"
                placeholder="0x..."
              />
            </div>
          </div>
        </div>
        
        {/* Save System Settings Button */}
        <div className="flex items-center justify-between">
          <button
            type="submit"
            disabled={isUpdating}
            className={`bg-orange-500 text-white px-4 py-2 rounded-lg hover:bg-orange-600 disabled:opacity-60 font-semibold shadow text-sm ${
              isUpdating ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            {isUpdating ? 'Updating...' : 'Save System Settings'}
          </button>
        </div>
        
        {/* Current Configuration Information */}
        <div className="bg-black/30 p-4 md:p-6 rounded-xl border border-gray-700 hover:border-orange-500 transition-colors">
          <h3 className="text-lg md:text-xl font-bold text-orange-400 mb-4">Current System Configuration</h3>
          
          <div className="bg-black/40 p-3 rounded-lg overflow-auto">
            <pre className="text-sm text-gray-400 whitespace-pre-wrap">
              {JSON.stringify(currentSystemConfig, null, 2)}
            </pre>
          </div>
          
          <p className="text-xs text-gray-400 mt-2">
            These are the current system settings. Values saved in Firestore take precedence over values defined in the paymentConfig.ts file.
            {currentSystemConfig && currentSystemConfig.updatedAt && (
              <span> Last update: {currentSystemConfig.updatedAt}</span>
            )}
          </p>
        </div>
      </form>
    </div>
  );
};

export default PaymentSettings;