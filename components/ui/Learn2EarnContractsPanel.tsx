import React, { useState, useEffect } from 'react';
import { doc, getDoc, setDoc, collection, getDocs } from 'firebase/firestore';
import { ethers } from 'ethers';
import { updateFeeConfig } from '../../services/learn2earnContractService';
import { getHttpRpcUrls } from '../../config/rpcConfig';
import { useWallet } from '../WalletProvider';
import web3Service from '../../services/web3Service';

// --- Centralized network config ---
const NETWORK_CONFIG: Record<string, { chainId: string; chainName: string }> = {
  ethereum: {
    chainId: '0x1',
    chainName: 'Ethereum Mainnet',
  },
  bsc: {
    chainId: '0x38',
    chainName: 'Binance Smart Chain',
  },
  binance: {
    chainId: '0x38',
    chainName: 'Binance Smart Chain',
  },
  bsctestnet: {
    chainId: '0x61',
    chainName: 'BSC Testnet',
  },
  polygon: {
    chainId: '0x89',
    chainName: 'Polygon Mainnet',
  },
  avalanche: {
    chainId: '0xa86a',
    chainName: 'Avalanche C-Chain',
  },
  optimism: {
    chainId: '0xa',
    chainName: 'Optimism',
  },
  base: {
    chainId: '0x2105',
    chainName: 'Base',
  },
};

// Shared function to get network parameters
const getNetworkParams = (network: string) => {
  const networkName = network.toLowerCase();
  // Get rpcUrls from rpcConfig
  const rpcUrls = getHttpRpcUrls(networkName);
  // Fallback if not found
  if (!rpcUrls || rpcUrls.length === 0) {
    console.warn(`No RPC URLs found for network ${networkName}, using fallback`);
    rpcUrls.push('https://rpc.sepolia.org');
  }
  // Get chainId and chainName from centralized config
  const config = NETWORK_CONFIG[networkName] || NETWORK_CONFIG['ethereum'];
  return {
    chainId: config.chainId,
    chainName: config.chainName,
    rpcUrls,
  };
};

// Interface for Learn2EarnTestButton props
interface Learn2EarnTestButtonProps {
  network: string;
  contractAddress: string;
}

// Learn2EarnTestButton como componente funcional
const Learn2EarnTestButton: React.FC<Learn2EarnTestButtonProps> = ({ network, contractAddress }) => {
  const { walletAddress, currentNetwork, isUsingWalletConnect } = useWallet();
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const testConnection = async () => {
    if (!contractAddress) {
      alert('Contract address is required');
      return;
    }
    setTesting(true);
    setResult(null);
    try {
      let provider: ethers.providers.Web3Provider | null = null;
      // Prefer the global wallet provider if connected
      if (web3Service && web3Service.getProvider) {
        provider = web3Service.getProvider() as ethers.providers.Web3Provider;
      }
      // Fallback to window.ethereum if no global provider
      if (!provider && window.ethereum) {
        provider = new ethers.providers.Web3Provider(window.ethereum);
      }
      if (!provider) {
        setResult('No Web3 provider detected. Please connect your wallet.');
        return;
      }
      await provider.send('eth_requestAccounts', []);
      const signer = provider.getSigner();
      // --- Check network match ---
      const expectedChainId = NETWORK_CONFIG[network.toLowerCase()]?.chainId;
      const currentNetworkObj = await provider.getNetwork();
      const currentChainId = '0x' + currentNetworkObj.chainId.toString(16);
      if (expectedChainId && currentChainId.toLowerCase() !== expectedChainId.toLowerCase()) {
        setResult(
          `Your wallet is connected to the wrong network. Please switch to ${NETWORK_CONFIG[network.toLowerCase()]?.chainName || network} and try again.`
        );
        return;
      }
      // Check if the address has contract code
      const code = await provider.getCode(contractAddress);
      if (code === '0x') {
        setResult(`No contract found at the specified address on ${network} network.`);
        return;
      }
      // Minimal ABI to try to read the name
      const minimalABI = ['function name() view returns (string)'];
      try {
        const contract = new ethers.Contract(contractAddress, minimalABI, signer);
        const name = await contract.name();
        setResult(`Connection successful! Contract exists at this address. Name: ${name}`);
      } catch (functionError) {
        setResult(`Connection successful! Contract exists at this address.`);
      }
    } catch (error: any) {
      setResult(`Error: ${error.message || 'Unknown error'}`);
    } finally {
      setTesting(false);
    }
  };  return (
    <div>      <button
        onClick={testConnection}
        disabled={testing}
        className="bg-orange-500 hover:bg-orange-600 text-white px-3 py-1.5 rounded-md disabled:opacity-60 text-sm font-semibold"
      >
        {testing ? 'Testing...' : 'Test Connection'}
      </button>
      {result && (
        <div className={`mt-2 text-sm p-2 rounded ${result.includes('successful') ? 'bg-green-800/50 text-green-200' : 'bg-red-800/50 text-red-200'}`}>
          {result}
        </div>
      )}
    </div>
  );
};

// Interface for Learn2EarnFeePanel props
interface Learn2EarnFeePanelProps {
  db: any;
}

// Learn2EarnFeePanel Component
const Learn2EarnFeePanel: React.FC<Learn2EarnFeePanelProps> = ({ db }) => {
  const { currentNetwork } = useWallet();
  const [feeCollector, setFeeCollector] = useState("");
  const [feePercent, setFeePercent] = useState(5); // default 5%
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [contractAddress, setContractAddress] = useState<string>("");

  useEffect(() => {
    const fetchConfigFromContract = async () => {
      if (!db || !currentNetwork) return;
      setLoading(true);
      setError(null);
      try {
        // Primeiro buscar o endereço do contrato para a rede atual
        const settingsDoc = doc(db, "settings", "learn2earn");
        const settingsSnapshot = await getDoc(settingsDoc);
        
        if (settingsSnapshot.exists()) {
          const contracts = settingsSnapshot.data().contracts || [];
          const currentContract = contracts.find(
            (contract: any) => contract.network?.toLowerCase() === currentNetwork.toLowerCase()
          );
          
          if (currentContract && currentContract.contractAddress) {
            setContractAddress(currentContract.contractAddress);
            
            // Agora buscar as configurações diretamente do contrato
            try {
              const networkParams = getNetworkParams(currentNetwork);
              const provider = new ethers.providers.JsonRpcProvider(networkParams.rpcUrls[0]);
              
              // ABI mínimo para ler fee collector e fee percent
              const minimalABI = [
                "function feeCollector() view returns (address)",
                "function feePercent() view returns (uint256)"
              ];
              
              const contract = new ethers.Contract(currentContract.contractAddress, minimalABI, provider);
              
              const [contractFeeCollector, contractFeePercent] = await Promise.all([
                contract.feeCollector(),
                contract.feePercent()
              ]);
              
              setFeeCollector(contractFeeCollector);
              setFeePercent(contractFeePercent.toNumber());
              console.log(`Loaded from contract: Fee Collector: ${contractFeeCollector}, Fee Percent: ${contractFeePercent.toNumber()}%`);
            } catch (contractError) {
              console.error("Error reading from contract:", contractError);
              // Fallback para Firebase se não conseguir ler do contrato
              const configDoc = await getDoc(doc(db, "settings", "paymentConfig_l2l"));
              if (configDoc.exists()) {
                const data = configDoc.data();
                setFeeCollector(data.feeCollectorAddress || "");
                setFeePercent(data.feePercent || 5);
              }
            }
          } else {
            setError(`No Learn2Earn contract configured for ${currentNetwork} network.`);
          }
        }
      } catch (err: any) {
        setError("Failed to load config: " + err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchConfigFromContract();
  }, [db, currentNetwork]);
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(false);
    if (!db) {
      setError("Database connection not available");
      setSaving(false);
      return;
    }
    try {
      if (!/^0x[a-fA-F0-9]{40}$/.test(feeCollector)) {
        throw new Error("Invalid Ethereum address.");
      }
      if (feePercent < 0 || feePercent > 100) {
        throw new Error("Fee percent must be between 0 and 100.");
      }      // Primeiro tenta atualizar o contrato
      try {
        // Use a rede atual do wallet ao invés de string vazia
        const result = await updateFeeConfig(currentNetwork || 'ethereum', feeCollector, feePercent);
        if (!result.success) {
          throw new Error(result.error || 'Failed to update fee configuration');
        }
      } catch (contractError: any) {
        setError(`Contract update failed: ${contractError.message || "Unknown error"}. Settings were not saved.`);
        setSaving(false);
        return;
      }      // Só salva no Firebase se o contrato foi atualizado com sucesso
      await setDoc(doc(db, "settings", "paymentConfig_l2l"), {
        feeCollectorAddress: feeCollector,
        feePercent,
        updatedAt: new Date(),
        network: currentNetwork, // Salvar também a rede para referência
        contractAddress: contractAddress // Salvar também o endereço do contrato
      }, { merge: true });
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || "Failed to save config.");
    } finally {
      setSaving(false);
    }
  };
    return (
    <div className="bg-black/40 border border-gray-700 rounded-xl shadow-lg flex flex-col gap-6 p-6">
      <h3 className="text-lg md:text-xl font-bold text-orange-400 mb-4">Learn2Earn Fee Configuration</h3>
      <form onSubmit={handleSave} className="space-y-5">
        <div>
          <label className="block text-sm font-semibold text-gray-300 mb-1">Fee Collector Wallet Address</label>
          <input
            type="text"
            value={feeCollector}
            onChange={e => setFeeCollector(e.target.value)}
            className="w-full border border-gray-600 rounded-lg px-3 py-2 bg-black/70 text-white focus:ring-2 focus:ring-orange-400 focus:outline-none text-sm"
            placeholder="0x..."
          />
          <p className="text-xs text-gray-400 mt-1">This wallet will receive the Learn2Earn fee on all deposits.</p>
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-300 mb-1">Fee Percentage (%)</label>
          <input
            type="number"
            min={0}
            max={100}
            value={feePercent}
            onChange={e => setFeePercent(Number(e.target.value))}
            className="w-full border border-gray-600 rounded-lg px-3 py-2 bg-black/70 text-white focus:ring-2 focus:ring-orange-400 focus:outline-none text-sm"
          />
          <p className="text-xs text-gray-400 mt-1">A {feePercent}% fee will be deducted from all Learn2Earn deposits (all currencies).</p>
        </div>
        {error && <div className="bg-red-800/50 text-red-200 p-2 rounded-md">{error}</div>}
        {success && <div className="bg-green-800/50 text-green-200 p-2 rounded-md">Settings saved successfully!</div>}
        <button
          type="submit"
          className="bg-orange-500 text-white px-4 py-2 rounded-lg hover:bg-orange-600 disabled:opacity-60 w-full font-semibold shadow text-sm"
          disabled={saving}
        >
          {saving ? "Saving..." : "Save Settings"}
        </button>
      </form>
      {loading && <div className="text-gray-400 mt-2">Loading current settings...</div>}
    </div>
  );
};

// Interface for Learn2EarnContractsPanel props
interface Learn2EarnContractsPanelProps {
  db: any;
  isMobile: boolean; // Mantemos o prop para compatibilidade com chamadas existentes
}

const Learn2EarnContractsPanel: React.FC<Learn2EarnContractsPanelProps> = ({ db }) => {
  // State for learn2earn contract management
  const [networkContract, setNetworkContract] = useState({
    network: "sepolia",
    contractAddress: "",
    type: "", // Added type field
  });
  const [networkContracts, setNetworkContracts] = useState<any[]>([]);
  const [isAddingContract, setIsAddingContract] = useState(false);
  const [contractActionError, setContractActionError] = useState<string | null>(null);
  // Expanded contracts state (array of contract ids)
  const [expandedContracts, setExpandedContracts] = useState<string[]>([]);
  // Estado para informações do contrato atual
  const [contractInfo, setContractInfo] = useState({
    contractAddress: '',
    contractOwner: '',
    feeCollector: '',
    platformFee: 0,
  });
  const [loadingContractInfo, setLoadingContractInfo] = useState(false);
  // Fetch smart contract configurations from Firestore
  const fetchNetworkContracts = async () => {
    try {
      if (!db) {
        throw new Error("Firestore is not initialized.");
      }
      console.log("Fetching network contracts from Firestore...");
      const settingsDoc = doc(db, "settings", "learn2earn");
      const settingsSnapshot = await getDoc(settingsDoc);
      if (!settingsSnapshot.exists()) {
        console.log("No network contracts found in Firestore");
        setNetworkContracts([]);
        return;
      }
      const contracts = settingsSnapshot.data().contracts || [];
      // Ensure each contract has an ID
      const contractsWithIds = contracts.map((contract: any, index: number) => {
        if (!contract.id) {
          // Add an ID if it doesn't exist
          return {
            ...contract,
            id: `${contract.network}-${index}-${Date.now()}`
          };
        }
        return contract;
      });
      console.log("Fetched network contracts:", contractsWithIds.length);
      setNetworkContracts(contractsWithIds);
    } catch (error) {
      console.error("Error fetching network contracts:", error);
      // Show the error but don't clear existing contracts
      alert("Failed to fetch network contracts. Check console for details.");
    }
  };
  const validateContract = async (network: string, contractAddress: string): Promise<boolean> => {
    try {
      if (!ethers.utils.isAddress(contractAddress)) {
        alert("Invalid contract address format. Please enter a valid Ethereum address.");
        return false;
      }
      // Reuse the same logic as getNetworkParams to get the RPCs
      const networkParams = getNetworkParams(network);
      const providerUrl = networkParams.rpcUrls[0]; // Use the first available RPC
      const provider = new ethers.providers.JsonRpcProvider(providerUrl);
      try {
        // Check if the address contains contract code
        const code = await provider.getCode(contractAddress);
        if (code === "0x") {
          alert("The address does not contain a valid contract. Make sure the contract is deployed on the selected network.");
          return false;
        }
      } catch (error) {
        console.error("Error checking contract code:", error);
        alert(`Cannot verify contract on the ${network} network. Please check if the network is accessible.`);
        return false;
      }
      return true; // Validation passed
    } catch (error) {
      console.error("Error validating contract:", error);
      alert("Failed to validate the contract. Check the console for details.");
      return false;
    }
  };
  const handleAddNetworkContract = async (e: React.FormEvent) => {
    e.preventDefault();
    // Usa sempre a currentNetwork como network
    if (!currentNetwork || !networkContract.contractAddress || !networkContract.type) {
      alert("Please fill in all fields and connect your wallet.");
      return;
    }
    const isValid = await validateContract(currentNetwork, networkContract.contractAddress);
    if (!isValid) {
      return;
    }
    setIsAddingContract(true);
    setContractActionError(null);
    try {
      const settingsDoc = doc(db, "settings", "learn2earn");
      const settingsSnapshot = await getDoc(settingsDoc);
      let existingContracts = [];
      if (settingsSnapshot.exists()) {
        existingContracts = settingsSnapshot.data().contracts || [];
      }
      const isDuplicate = existingContracts.some(
        (contract: any) => contract.network?.toLowerCase() === currentNetwork.toLowerCase()
      );
      if (isDuplicate) {
        const confirmReplace = window.confirm("A contract for this network already exists. Do you want to replace it?");
        if (!confirmReplace) {
          return;
        }
        // Remove the existing contract for this network
        existingContracts = existingContracts.filter(
          (contract: any) => contract.network?.toLowerCase() !== currentNetwork.toLowerCase()
        );
      }
      const newContract = {
        id: `${currentNetwork}-${Date.now()}`,
        network: currentNetwork,
        contractAddress: networkContract.contractAddress,
        type: networkContract.type,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      existingContracts.push(newContract);
      await setDoc(settingsDoc, { contracts: existingContracts }, { merge: true });
      setNetworkContract({ network: '', contractAddress: '', type: '' });
      alert("Network contract added successfully.");
      fetchNetworkContracts();
    } catch (error) {
      console.error("Error adding network contract:", error);
      setContractActionError("Failed to add network contract. Please try again.");
    } finally {
      setIsAddingContract(false);
    }
  };
  // Handle changing network contract input
  const handleNetworkContractChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setNetworkContract(prev => ({
      ...prev,
      [name]: value
    }));
  };
  // Helper function for formatting timestamps
  const formatFirestoreTimestamp = (timestamp: any) => {
    if (!timestamp) return 'N/A';
    try {
      // Handle both Firestore timestamp and ISO string formats
      if (timestamp.seconds) {
        return new Date(timestamp.seconds * 1000).toLocaleDateString();
      } else if (timestamp.toDate) {
        return timestamp.toDate().toLocaleDateString();
      } else if (typeof timestamp === 'string') {
        return new Date(timestamp).toLocaleDateString();
      }
    } catch (error) {
      console.error("Error formatting timestamp:", error);
    }
    return 'N/A';
  };
  // Load contracts when component mounts
  useEffect(() => {
    fetchNetworkContracts();
  }, [db]);  const { walletAddress, currentNetwork } = useWallet();
  
  // Função para buscar informações do contrato atual
  const fetchContractInfo = async () => {
    if (!currentNetwork || networkContracts.length === 0) return;
    
    setLoadingContractInfo(true);
    try {
      const mainContract = networkContracts.find(
        c => c.network?.toLowerCase() === currentNetwork.toLowerCase()
      );
      
      if (mainContract && mainContract.contractAddress) {
        try {
          const networkParams = getNetworkParams(currentNetwork);
          const provider = new ethers.providers.JsonRpcProvider(networkParams.rpcUrls[0]);
          
          // ABI mínimo para ler informações do contrato
          const minimalABI = [
            "function owner() view returns (address)",
            "function feeCollector() view returns (address)",
            "function feePercent() view returns (uint256)"
          ];
          
          const contract = new ethers.Contract(mainContract.contractAddress, minimalABI, provider);
          
          const [owner, feeCollector, feePercent] = await Promise.all([
            contract.owner().catch(() => walletAddress || ''),
            contract.feeCollector().catch(() => ''),
            contract.feePercent().catch(() => 0)
          ]);
          
          setContractInfo({
            contractAddress: mainContract.contractAddress,
            contractOwner: owner,
            feeCollector: feeCollector,
            platformFee: feePercent.toNumber ? feePercent.toNumber() : feePercent,
          });
        } catch (error) {
          console.error("Error fetching contract info:", error);
          // Fallback para dados básicos
          setContractInfo({
            contractAddress: mainContract.contractAddress,
            contractOwner: walletAddress || '',
            feeCollector: '',
            platformFee: 0,
          });
        }
      } else {
        setContractInfo({
          contractAddress: '',
          contractOwner: '',
          feeCollector: '',
          platformFee: 0,
        });
      }
    } catch (error) {
      console.error("Error in fetchContractInfo:", error);
    } finally {
      setLoadingContractInfo(false);
    }
  };

  // Buscar informações do contrato quando a rede ou contratos mudarem
  useEffect(() => {
    fetchContractInfo();
  }, [currentNetwork, networkContracts, walletAddress]);

  // Dummy contract info for now (replace with real data fetch if needed)
  // Find the contract for the current network
  const mainContract = networkContracts.find(
    c => c.network?.toLowerCase() === (currentNetwork?.toLowerCase() || '')
  ) || {};
  const isOwner = contractInfo.contractOwner && walletAddress && contractInfo.contractOwner.toLowerCase() === walletAddress.toLowerCase();
  return (
    <>
      <h2 className="font-bold text-3xl mb-8 text-left text-orange-500">Learn2Earn</h2>
      <div className="bg-black/30 border border-gray-700 rounded-2xl shadow-2xl p-4 md:p-6 mt-6 md:mt-8">
        <h3 className="text-lg md:text-xl font-bold text-orange-400 mb-6">L2L Smart Contracts</h3>
        {/* Status Panel - moved below the title */}
        <div className="bg-black/40 border border-orange-700 rounded-xl shadow-lg p-6 mb-8">
          <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-6">
            {/* Network Status */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <span className="h-3 w-3 rounded-full bg-green-500 inline-block"></span>
                <span className="text-lg font-semibold text-orange-300">Current Blockchain Network</span>
              </div>
              <div className="text-white font-medium mb-1 text-base">{currentNetwork}</div>
              <div className="text-xs text-gray-400 break-all">Your wallet: {walletAddress}</div>
            </div>            {/* Contract Info */}
            <div className="flex-1 bg-black/30 rounded-lg border border-gray-700 p-4">
              <div className="font-bold text-orange-400 mb-2 text-lg">Contract Information</div>
              {loadingContractInfo ? (
                <div className="text-sm text-gray-400">Loading contract information...</div>
              ) : mainContract && mainContract.contractAddress ? (
                <>
                  <div className="text-sm text-gray-300 break-all mb-1">
                    <span className="font-semibold">Contract Address:</span> {contractInfo.contractAddress}
                  </div>
                  <div className="text-sm text-gray-300 break-all mb-1 flex items-center gap-2">
                    <span className="font-semibold">Contract Owner:</span> {contractInfo.contractOwner || 'Loading...'}
                    {isOwner && <span className="bg-green-700 text-green-100 px-2 py-0.5 rounded text-xs font-bold">You are the owner</span>}
                  </div>
                  <div className="text-sm text-gray-300 break-all mb-1">
                    <span className="font-semibold">Fee Collector Address:</span> {contractInfo.feeCollector || 'Loading...'}
                  </div>
                  <div className="text-sm text-gray-300 mb-1">
                    <span className="font-semibold">Platform Fee:</span> {contractInfo.platformFee}%
                  </div>
                </>
              ) : (
                <div className="text-sm text-red-400 font-semibold">No contract configured for this network.</div>
              )}
            </div>
          </div>
        </div>
        {/* Main content grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Fee Management Panel - directly using the panel component */}
          <Learn2EarnFeePanel db={db} />
          {/* Add/Update Network Contract - visually improved */}
          <div className="bg-black/40 border border-gray-700 rounded-xl shadow-lg flex flex-col gap-6 p-6">
            <h3 className="font-bold text-orange-400 mb-4 text-xl">Add/Update Network Contract</h3>
            <form onSubmit={handleAddNetworkContract} className="space-y-5">
              {/* Network (now using currentNetwork) */}
              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-1">Network</label>
                <div className="w-full px-3 py-2 rounded-lg bg-black/80 text-white border border-gray-600 text-sm">{currentNetwork || 'No network detected'}</div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-1">Contract Address</label>
                <input
                  type="text"
                  name="contractAddress"
                  value={networkContract.contractAddress}
                  onChange={handleNetworkContractChange}
                  placeholder="0x..."
                  className="w-full border border-gray-600 rounded-lg px-3 py-2 bg-black/80 text-white focus:ring-2 focus:ring-orange-400 focus:outline-none text-sm"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-1">Type</label>
                <select
                  name="type"
                  value={networkContract.type}
                  onChange={handleNetworkContractChange}
                  className="w-full border border-gray-600 rounded-lg px-3 py-2 bg-black/80 text-white focus:ring-2 focus:ring-orange-400 focus:outline-none text-sm"
                  required
                >
                  <option value="">Select type</option>
                  <option value="Mainnet">Mainnet</option>
                  <option value="Testnet">Testnet</option>
                </select>
              </div>
              {contractActionError && (
                <p className="bg-red-800/50 text-red-200 p-2 rounded-md text-sm">{contractActionError}</p>
              )}
              <button
                type="submit"
                className="bg-orange-500 text-white px-4 py-2 rounded-lg hover:bg-orange-600 disabled:opacity-60 w-full font-semibold shadow text-sm"
                disabled={isAddingContract}
              >
                {isAddingContract ? 'Processing...' : 'Add/Update Contract'}
              </button>
            </form>
          </div>
        </div>
        {/* List of existing contracts - keeps previous look */}
        <div className="mt-10">
          <h3 className="text-orange-400 mb-4 text-xl">Current Smart Contracts</h3>
          {networkContracts.length === 0 ? (
            <p className="text-gray-400">No contract configurations found. Add one above.</p>
          ) : (
            <div className="space-y-2">
              {networkContracts.map((contract, index) => {
                const expanded = expandedContracts.includes(contract.id || `${contract.network}-${index}`);
                const toggleExpand = () => {
                  const id = contract.id || `${contract.network}-${index}`;
                  setExpandedContracts(prev =>
                    prev.includes(id)
                      ? prev.filter(eid => eid !== id)
                      : [...prev, id]
                  );
                };
                // Ensure networkKey is the technical key (e.g., 'bsc', 'ethereum')
                let networkKey = contract.network;
                if (networkKey && NETWORK_CONFIG[networkKey.toLowerCase()]) {
                  networkKey = networkKey.toLowerCase();
                } else {
                  const mapping: Record<string, string> = {
                    'binance': 'bsc',
                    'binance smart chain': 'bsc',
                    'ethereum mainnet': 'ethereum',
                    'optimism': 'optimism',
                    'avalanche': 'avalanche',
                    'bsc testnet': 'bsctestnet',
                    'polygon': 'polygon',
                  };
                  const lower = (contract.network || '').toLowerCase();
                  networkKey = mapping[lower] || lower;
                }
                const displayName = NETWORK_CONFIG[networkKey]?.chainName || contract.network;
                return (
                  <div
                    key={contract.id || `${contract.network}-${index}`}
                    className="bg-black/40 rounded-lg border border-gray-700 hover:border-orange-500 shadow transition-all mb-1 cursor-pointer"
                  >
                    <div
                      className="flex items-center justify-between px-3 py-2 select-none"
                      onClick={toggleExpand}
                    >
                      <span className="font-semibold text-orange-300 truncate max-w-[60vw]">{displayName}</span>
                      <span className="text-xs text-orange-200">{expanded ? '▲' : '▼'}</span>
                    </div>
                    {expanded && (
                      <div className="mt-2 px-3 pb-3 pt-1 text-xs text-gray-300">
                        <div className="mb-1 break-all">
                          <span className="font-semibold">Address:</span> {contract.contractAddress}
                        </div>
                        <div className="mb-1">
                          <span className="font-semibold">Type:</span> {contract.type}
                        </div>
                        <div className="mb-2 text-xs text-gray-400">
                          Added: {formatFirestoreTimestamp(contract.createdAt)}
                          {contract.updatedAt && ` (Updated: ${formatFirestoreTimestamp(contract.updatedAt)})`}
                        </div>
                        <div className="flex min-w-[120px]">
                          <Learn2EarnTestButton 
                            network={networkKey}
                            contractAddress={contract.contractAddress}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default Learn2EarnContractsPanel;