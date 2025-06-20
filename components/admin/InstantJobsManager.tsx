import React, { useState, useEffect } from 'react';
import { web3Service } from '../../services/web3Service';
import instantJobsEscrowService, { INSTANT_JOBS_ESCROW_ADDRESS } from '../../services/instantJobsEscrowService';
import { collection, getDocs, query, where, doc, getDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useWallet } from '../WalletProvider';

// Interface for Instant Jobs
interface InstantJob {
  id: string;
  title: string;
  description: string;
  payment: number;
  currency: string;
  deadline: Date;
  employer: string;
  worker: string | null;
  status: string;
  contractData?: any;
  network: string;
  createdAt: Date;
  category?: string;
  companyName?: string;
  requiredSkills?: string[];
}

const InstantJobsManager: React.FC = () => {
  // Use global wallet state
  const { walletAddress, currentNetwork, connectWallet: globalConnectWallet } = useWallet();
  
  // Log when currentNetwork changes
  useEffect(() => {
    if (currentNetwork) {
      console.log("Current network from provider changed:", currentNetwork);
    }
  }, [currentNetwork]);
  
  // Contract management states (remove local wallet states)
  const [contractOwner, setContractOwner] = useState('');
  const [feeCollector, setFeeCollector] = useState('');
  const [platformFeePercentage, setPlatformFeePercentage] = useState(0);
  const [newFeePercentage, setNewFeePercentage] = useState(0);
  const [newFeeCollector, setNewFeeCollector] = useState('');
  const [networkInfo, setNetworkInfo] = useState<{name: string, chainId: number} | null>(null);
  
  // Contract states
  const [contractAddress, setContractAddress] = useState('');
  const [newContractAddress, setNewContractAddress] = useState('');
  const [settingContractAddress, setSettingContractAddress] = useState(false);
    // UI states (removed local connection states)
  const [isUpdatingFee, setIsUpdatingFee] = useState(false);
  const [isUpdatingCollector, setIsUpdatingCollector] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
    // Jobs listing states
  const [instantJobs, setInstantJobs] = useState<InstantJob[]>([]);  const [isLoadingJobs, setIsLoadingJobs] = useState(false);

  // Configure contract address for current network
  const setupContractAddress = async () => {
    try {
      if (!networkInfo) {
        throw new Error("No network detected. Connect your wallet first.");
      }
      
      if (!newContractAddress || !web3Service.isValidAddress(newContractAddress)) {
        throw new Error("Invalid contract address");
      }
      
      setSettingContractAddress(true);
      setError(null);
      setSuccess(null);
      
      // Use the service's network normalization to ensure consistency
      const normalizedNetwork = instantJobsEscrowService.normalizeNetworkNamePublic(networkInfo.name);
      console.log(`Saving contract address for network: ${networkInfo.name}, normalized as: ${normalizedNetwork}`);
      
      // Save contract address to Firebase
      await instantJobsEscrowService.saveContractAddress(
        normalizedNetwork,
        newContractAddress
      );
      
      // Reinitialize service with new address
      await instantJobsEscrowService.init(normalizedNetwork, true);
      // Load contract data
      await loadContractDataWithNetwork(normalizedNetwork);
      setContractAddress(newContractAddress);
      setSuccess(`Contract address successfully configured for ${networkInfo.name} network`);
      // Clear field after success
      setNewContractAddress('');
    } catch (err: any) {
      console.error("Error configuring contract address:", err);
      setError(err.message || "Error configuring contract address");
    } finally {
      setSettingContractAddress(false);
    }
  };
  
  // Função auxiliar para carregar dados do contrato usando o nome da rede normalizado
  const loadContractDataWithNetwork = async (normalizedNetwork: string) => {
    try {
      setIsLoading(true);
      setError(null);

      // Atualiza networkInfo apenas para exibição
      const network = await web3Service.getNetworkInfo();
      if (network) setNetworkInfo(network);

      // Recarrega endereços do contrato do Firebase
      await instantJobsEscrowService.loadContractAddresses();
      console.log("Current contract addresses in cache:", INSTANT_JOBS_ESCROW_ADDRESS);

      // Inicializa serviço para a rede correta
      if (!instantJobsEscrowService.isContractInitialized()) {
        await instantJobsEscrowService.init(normalizedNetwork, true);
      }

      // Busca dados do contrato
      const owner = await instantJobsEscrowService.getContractOwner();
      setContractOwner(owner);

      const collector = await instantJobsEscrowService.getFeeCollector();
      setFeeCollector(collector);
      setNewFeeCollector(collector);

      const feePercentage = await instantJobsEscrowService.getPlatformFeePercentage();
      setPlatformFeePercentage(feePercentage);
      setNewFeePercentage(feePercentage);

      // Busca endereço do contrato no Firebase
      try {
        const contractDocRef = doc(db, 'settings', 'contractInstantJobs_addresses', 'contracts', normalizedNetwork);
        const contractDoc = await getDoc(contractDocRef);
        console.log(`Looking for contract at path: settings/contractInstantJobs_addresses/contracts/${normalizedNetwork}`);
        if (contractDoc.exists() && contractDoc.data().address) {
          const address = contractDoc.data().address;
          console.log(`Found contract address in Firebase: ${address}`);
          setContractAddress(address);
        } else {
          console.warn(`No contract address found in Firebase for network: ${normalizedNetwork}`);
          setContractAddress('');
        }
      } catch (e) {
        console.error(`Error fetching contract address for ${normalizedNetwork}:`, e);
        setContractAddress('');
      }
    } catch (err: any) {
      console.error("Error loading contract data:", err);
      setError(err.message || "Error loading contract data");
    } finally {
      setIsLoading(false);
    }
  };

  // Função auxiliar para carregar jobs usando o nome da rede normalizado
  const loadJobsWithNetwork = async (normalizedNetwork: string) => {
    if (!normalizedNetwork) {
      setError("No network detected. Connect your wallet first.");
      return;
    }
    setIsLoadingJobs(true);
    setError(null);
    try {
      const jobsCollection = collection(db, "instantJobs");
      let q = query(jobsCollection);
      const querySnapshot = await getDocs(q);
      const jobsData: InstantJob[] = [];
      console.log(`Loading jobs for normalized network: ${normalizedNetwork}`);
      for (const docSnapshot of querySnapshot.docs) {
        const jobData = docSnapshot.data() as any;
        const jobNetwork = jobData.network ? instantJobsEscrowService.normalizeNetworkNamePublic(jobData.network) : '';
        const job: InstantJob = {
          id: docSnapshot.id,
          title: jobData.title || "No title",
          description: jobData.description || "",
          payment: jobData.budget || jobData.payment || 0,
          currency: jobData.currency || "ETH",
          deadline: jobData.deadline ? new Date(jobData.deadline) : new Date(),
          employer: jobData.employer || jobData.companyId || "",
          worker: jobData.worker || null,
          status: jobData.status || "open",
          network: jobNetwork || "unknown",
          createdAt: jobData.createdAt ? new Date(jobData.createdAt) : new Date()
        };
        if (jobData.category) job.category = jobData.category;
        if (jobData.companyName) job.companyName = jobData.companyName;
        if (jobData.requiredSkills) job.requiredSkills = jobData.requiredSkills;
        if (instantJobsEscrowService.isContractInitialized() && (!jobNetwork || jobNetwork === normalizedNetwork || jobNetwork.includes(normalizedNetwork))) {
          try {
            const contractJobInfo = await instantJobsEscrowService.getJobInfo(normalizedNetwork, docSnapshot.id);
            job.contractData = contractJobInfo;
            if (contractJobInfo.isPaid) {
              job.status = "completed";
            } else if (contractJobInfo.isApproved) {
              job.status = "approved";
            } else if (contractJobInfo.isCompleted) {
              job.status = "delivered";
            } else if (contractJobInfo.isAccepted) {
              job.status = "in-progress";
            }
            if (contractJobInfo.worker && contractJobInfo.worker !== "0x0000000000000000000000000000000000000000") {
              job.worker = contractJobInfo.worker;
            }
          } catch (err) {
            console.warn(`Couldn't get contract data for job ${docSnapshot.id}:`, err);
          }
        }
        jobsData.push(job);
      }
      jobsData.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      setInstantJobs(jobsData);
      console.log(`Loaded ${jobsData.length} Instant Jobs`);
      if (jobsData.length === 0) {
        console.log("No Instant Jobs found");
      }
    } catch (err: any) {
      console.error("Error loading Instant Jobs:", err);
      setError(err.message || "Error loading Instant Jobs");
      setInstantJobs([]);
    } finally {
      setIsLoadingJobs(false);
    }
  };
  
  // Update platform fee percentage
  const updateFeePercentage = async () => {
    try {
      setIsUpdatingFee(true);
      setError(null);
      setSuccess(null);
      
      // Validate new value
      if (newFeePercentage < 0 || newFeePercentage > 100) {
        throw new Error("Fee percentage must be between 0 and 10% (0-100)");
      }
      
      // Check if user is contract owner
      const isOwner = await instantJobsEscrowService.checkOwnership();
      if (!isOwner) {
        throw new Error("Only the contract owner can update the platform fee");
      }
      
      // Send transaction
      const result = await instantJobsEscrowService.updatePlatformFeePercentage(
        newFeePercentage,
        { gasLimit: 200000 }
      );
      
      if (result.success) {
        setPlatformFeePercentage(newFeePercentage);
        setSuccess(`Platform fee successfully updated to ${newFeePercentage/10}%`);
        // Reload contract data after update
        if (currentNetwork) {
          const normalizedNetwork = instantJobsEscrowService.normalizeNetworkNamePublic(currentNetwork);
          await loadContractDataWithNetwork(normalizedNetwork);
        }
      }
    } catch (err: any) {
      console.error("Error updating platform fee:", err);
      setError(err.message || "Error updating platform fee");
    } finally {
      setIsUpdatingFee(false);
    }
  };
  
  // Update fee collector address
  const updateFeeCollector = async () => {
    try {
      setIsUpdatingCollector(true);
      setError(null);
      setSuccess(null);
      
      // Validate new address
      if (!web3Service.isValidAddress(newFeeCollector)) {
        throw new Error("Invalid fee collector address");
      }
      
      // Check if user is contract owner
      const isOwner = await instantJobsEscrowService.checkOwnership();
      if (!isOwner) {
        throw new Error("Only the contract owner can update the fee collector");
      }
      
      // Send transaction
      const result = await instantJobsEscrowService.updateFeeCollector(
        newFeeCollector,
        { gasLimit: 200000 }
      );
      
      if (result.success) {
        setFeeCollector(newFeeCollector);
        setSuccess("Fee collector address successfully updated");
        // Reload contract data after update
        if (currentNetwork) {
          const normalizedNetwork = instantJobsEscrowService.normalizeNetworkNamePublic(currentNetwork);
          await loadContractDataWithNetwork(normalizedNetwork);
        }
      }
    } catch (err: any) {
      console.error("Error updating fee collector:", err);
      setError(err.message || "Error updating fee collector");
    } finally {
      setIsUpdatingCollector(false);
    }
  };
  
  // Atualiza serviço e dados do contrato sempre que a rede mudar
  useEffect(() => {
    const updateForNetwork = async () => {
      if (currentNetwork) {
        setContractAddress('');
        setContractOwner('');
        setFeeCollector('');
        setPlatformFeePercentage(0);
        setError(null);
        setSuccess(null);
        const normalizedNetwork = instantJobsEscrowService.normalizeNetworkNamePublic(currentNetwork);
        console.log(`Network changed to: ${currentNetwork}, normalized as: ${normalizedNetwork}`);
        await instantJobsEscrowService.init(normalizedNetwork, true);
        await loadContractDataWithNetwork(normalizedNetwork);
        await loadJobsWithNetwork(normalizedNetwork);
      }    };
    updateForNetwork();
  }, [currentNetwork]);
  
  // Check wallet connection e carrega dados quando a wallet conecta
  useEffect(() => {
    const loadWalletData = async () => {
      if (walletAddress && currentNetwork) {
        const normalizedNetwork = instantJobsEscrowService.normalizeNetworkNamePublic(currentNetwork);
        await loadContractDataWithNetwork(normalizedNetwork);
        await loadJobsWithNetwork(normalizedNetwork);
      }
    };
    loadWalletData();
  }, [walletAddress, currentNetwork]);
  
  // Atualize networkInfo sempre que a rede mudar
  useEffect(() => {
    const updateNetworkInfo = async () => {
      if (currentNetwork) {
        const network = await web3Service.getNetworkInfo();
        if (network) setNetworkInfo(network);
      }
    };
    updateNetworkInfo();
  }, [currentNetwork]);
    // Refresh jobs list button
  const handleRefreshJobs = () => {
    if (currentNetwork) {
      const normalizedNetwork = instantJobsEscrowService.normalizeNetworkNamePublic(currentNetwork);
      loadJobsWithNetwork(normalizedNetwork);
    }
  };
  
  // Render component
  return (
    <div className="space-y-4 md:space-y-6">
      <h1 className="text-lg md:text-xl font-bold text-orange-400 mb-6 md:mb-10">Instant Jobs Management</h1>
        
      {/* Error and Success Messages */}
      {error && (
        <div className="bg-red-900/50 border border-red-500 text-white p-3 md:p-4 rounded-lg mb-4 md:mb-6 text-sm">
          <strong>Error:</strong> {error}
        </div>
      )}
      
      {success && (
        <div className="bg-green-900/50 border border-green-500 text-white p-3 md:p-4 rounded-lg mb-4 md:mb-6 text-sm">
          <strong>Success:</strong> {success}
        </div>
      )}
        {/* Status Panel - Network Information */}
      <div className="bg-black/30 border border-gray-700 hover:border-orange-500 rounded-xl p-4 md:p-6 mb-6 md:mb-10 transition-colors">
        <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
          {/* Network Status */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <span className="h-3 w-3 rounded-full bg-green-500 inline-block"></span>
              <h3 className="text-lg md:text-xl font-bold text-orange-400">Current Blockchain Network</h3>
            </div>
            <div className="text-white font-medium mb-1 text-sm">
              {walletAddress ? 
                (networkInfo ? `${networkInfo.name} (Chain ID: ${networkInfo.chainId})` : "Unknown network") : 
                "Wallet not connected"
              }
            </div>
            {walletAddress && (
              <div className="text-xs text-gray-400 break-all">Your wallet: {walletAddress}</div>
            )}
          </div>
        </div>
      </div>      {/* Contract Configuration (if not configured yet) */}
      {(!contractAddress || contractAddress === '0x0000000000000000000000000000000000000000') && (
        <div className="bg-black/30 p-4 md:p-6 rounded-xl mb-6 md:mb-10 border border-gray-700 hover:border-orange-500 transition-colors">
          <h3 className="text-lg md:text-xl font-bold text-orange-400 mb-4">Configure Contract</h3>
          <p className="text-gray-300 mb-4 text-sm">
            There's no contract configured for the {networkInfo?.name} network yet. Configure the contract address below:
          </p>
          
          <div className="space-y-4 md:space-y-6">
            <div>
              <label htmlFor="contractAddress" className="block text-sm font-semibold text-gray-300 mb-1">Contract Address</label>
              <input
                id="contractAddress"
                type="text"
                placeholder="Contract address (0x...)"
                value={newContractAddress}
                onChange={(e) => setNewContractAddress(e.target.value)}
                className="w-full px-3 py-2 bg-black/40 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-orange-400 focus:outline-none text-sm"
              />
            </div>
            
            <button
              onClick={setupContractAddress}
              disabled={settingContractAddress || !newContractAddress}
              className="bg-orange-500 text-white px-4 py-2 rounded-lg hover:bg-orange-600 disabled:opacity-60 font-semibold shadow text-sm w-full md:w-auto"
            >
              {settingContractAddress ? "Configuring..." : "Configure Contract"}
            </button>
          </div>
        </div>
      )}<div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8 mb-6 md:mb-10">
        {/* Contract Information */}
        <div className="bg-black/30 p-4 md:p-6 rounded-xl border border-gray-700 hover:border-orange-500 transition-colors">
          <h3 className="text-lg md:text-xl font-bold text-orange-400 mb-4">Contract Information</h3>
          {isLoading ? (
            <p className="text-gray-400 text-sm">
              {walletAddress ? "Loading contract data..." : "Connect your wallet to view contract information"}
            </p>
          ) : (
            <div className="space-y-4 md:space-y-6">
              {contractAddress && contractAddress !== '0x0000000000000000000000000000000000000000' && (
                <div>
                  <p className="text-sm font-semibold text-gray-300 mb-1">Contract Address:</p>
                  <p className="text-white font-mono text-xs bg-black/40 p-2 rounded-lg border border-gray-600 break-all">{contractAddress}</p>
                </div>
              )}
              
              <div>
                <p className="text-sm font-semibold text-gray-300 mb-1">Contract Owner:</p>
                <p className="text-white font-mono text-xs bg-black/40 p-2 rounded-lg border border-gray-600 break-all">{contractOwner || "Not available"}</p>
                {contractOwner && walletAddress && walletAddress.toLowerCase() === contractOwner.toLowerCase() && (
                  <span className="px-1.5 md:px-2 py-0.5 rounded-full text-xs bg-orange-900/50 text-orange-300 border border-orange-700 mt-1 inline-block">
                    You are the owner
                  </span>
                )}
              </div>
              
              <div>
                <p className="text-sm font-semibold text-gray-300 mb-1">Fee Collector Address:</p>
                <p className="text-white font-mono text-xs bg-black/40 p-2 rounded-lg border border-gray-600 break-all">{feeCollector || "Not available"}</p>
              </div>
              
              <div>
                <p className="text-sm font-semibold text-gray-300 mb-1">Platform Fee:</p>
                <p className="text-white text-sm bg-black/40 p-2 rounded-lg border border-gray-600">{platformFeePercentage ? `${(platformFeePercentage / 10).toFixed(1)}%` : "Not available"}</p>
              </div>
            </div>
          )}
        </div>{/* Settings */}
        <div className="bg-black/30 p-4 md:p-6 rounded-xl border border-gray-700 hover:border-orange-500 transition-colors">
          <h3 className="text-lg md:text-xl font-bold text-orange-400 mb-4">Settings</h3>
          {isLoading ? (
            <p className="text-gray-400 text-sm">
              {walletAddress ? "Loading settings..." : "Connect your wallet to view settings"}
            </p>
          ) : contractOwner && walletAddress && walletAddress.toLowerCase() !== contractOwner.toLowerCase() ? (
            <p className="text-yellow-400 text-sm">Only the contract owner can change these settings.</p>
          ) : (
            <div className="space-y-4 md:space-y-6">
              <div>
                <label htmlFor="feePercentage" className="block text-sm font-semibold text-gray-300 mb-1">
                  Platform Fee Percentage
                </label>
                <div className="flex items-center bg-black/40 border border-gray-600 rounded-lg px-3 py-2">
                  <input
                    id="feePercentage"
                    type="number"
                    min="0"
                    max="100"
                    value={newFeePercentage}
                    onChange={(e) => setNewFeePercentage(parseInt(e.target.value))}
                    className="bg-transparent appearance-none rounded mr-2 text-white leading-tight focus:outline-none focus:ring-2 focus:ring-orange-400 w-24 text-sm"
                  />
                  <span className="text-gray-400 text-xs">(Base 1000: {newFeePercentage} = {(newFeePercentage / 10).toFixed(1)}%)</span>
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  Maximum allowed value is 100 (10%)
                </p>
                <button
                  onClick={updateFeePercentage}
                  disabled={isUpdatingFee || newFeePercentage === platformFeePercentage || !instantJobsEscrowService.isContractInitialized()}
                  className={`mt-3 px-4 py-2 rounded-lg text-sm font-semibold ${
                    isUpdatingFee || newFeePercentage === platformFeePercentage || !instantJobsEscrowService.isContractInitialized()
                      ? "bg-gray-800 text-gray-400 cursor-not-allowed"
                      : "bg-orange-500 hover:bg-orange-600 text-white"
                  }`}
                >
                  {isUpdatingFee ? "Updating..." : "Update Fee"}
                </button>
              </div>
              
              <div>
                <label htmlFor="feeCollector" className="block text-sm font-semibold text-gray-300 mb-1">
                  Fee Collector Address
                </label>
                <div className="bg-black/40 border border-gray-600 rounded-lg px-3 py-2">
                  <input
                    id="feeCollector"
                    type="text"
                    value={newFeeCollector}
                    onChange={(e) => setNewFeeCollector(e.target.value)}
                    className="bg-transparent w-full appearance-none text-white leading-tight focus:outline-none focus:ring-2 focus:ring-orange-400 text-sm"
                    placeholder="0x..."
                  />
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  This address will receive the platform fees
                </p>
                <button
                  onClick={updateFeeCollector}
                  disabled={isUpdatingCollector || newFeeCollector === feeCollector || !instantJobsEscrowService.isContractInitialized()}
                  className={`mt-3 px-4 py-2 rounded-lg text-sm font-semibold ${
                    isUpdatingCollector || newFeeCollector === feeCollector || !instantJobsEscrowService.isContractInitialized()
                      ? "bg-gray-800 text-gray-400 cursor-not-allowed"
                      : "bg-orange-500 hover:bg-orange-600 text-white"
                  }`}
                >
                  {isUpdatingCollector ? "Updating..." : "Update Collector"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>      {/* Jobs List - Using Card Component */}      <div className="bg-black/30 p-4 md:p-6 rounded-xl border border-gray-700 hover:border-orange-500 transition-colors">
        <h3 className="text-lg md:text-xl font-bold text-orange-400 mb-4">Instant Jobs</h3>
          {isLoadingJobs ? (
          <p className="text-gray-400 text-sm">
            {walletAddress ? "Loading jobs..." : "Connect your wallet to view jobs"}
          </p>
        ) : instantJobs.length === 0 ? (
          <div>
            <p className="text-gray-300 mb-4 text-sm">No Instant Jobs found for this network ({networkInfo?.name}).</p>
            <button
              onClick={handleRefreshJobs}
              className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-semibold shadow"
            >
              Refresh List
            </button>
          </div>        ) : (
          <>            <div className="overflow-x-auto bg-black/30 rounded-lg border border-gray-600 p-2">
              <table className="min-w-full text-white">
                <thead className="border-b border-gray-600">
                  <tr>
                    <th className="text-left py-3 px-2 text-orange-400 text-sm font-semibold">ID</th>
                    <th className="text-left py-3 px-2 text-orange-400 text-sm font-semibold">Title</th>
                    <th className="text-left py-3 px-2 text-orange-400 text-sm font-semibold">Employer</th>
                    <th className="text-left py-3 px-2 text-orange-400 text-sm font-semibold">Status</th>
                    <th className="text-left py-3 px-2 text-orange-400 text-sm font-semibold">Payment</th>
                    <th className="text-left py-3 px-2 text-orange-400 text-sm font-semibold">Platform Fee</th>
                  </tr>                </thead>
                <tbody>
                  {instantJobs.map((job) => (
                    <tr key={job.id} className="border-b border-gray-700 hover:bg-black/30 transition-colors">
                      <td className="py-2 px-2 text-xs text-gray-300 font-mono">{job.id.substring(0, 8)}...</td>
                      <td className="py-2 px-2 text-sm text-white">{job.title}</td>
                      <td className="py-2 px-2 text-xs text-gray-300 font-mono">
                        {job.employer.substring(0, 6)}...{job.employer.substring(job.employer.length - 4)}
                      </td><td className="py-2 px-2">
                        <span className={`px-1.5 md:px-2 py-0.5 rounded-full text-xs border ${
                          job.status === 'completed' ? 'bg-green-900/50 text-green-300 border-green-700' :
                          job.status === 'approved' ? 'bg-yellow-900/50 text-yellow-300 border-yellow-700' : 
                          job.status === 'delivered' ? 'bg-blue-900/50 text-blue-300 border-blue-700' :
                          job.status === 'in-progress' ? 'bg-orange-900/50 text-orange-300 border-orange-700' :
                          'bg-gray-800 text-gray-400 border-gray-700'
                        }`}>
                          {job.status}
                        </span>
                      </td><td className="py-2 px-2 text-sm text-white">{job.payment.toFixed(2)} {job.currency}</td>
                      <td className="py-2 px-2 text-sm text-gray-300">{(job.payment * platformFeePercentage / 1000).toFixed(4)} {job.currency}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            <div className="mt-4 md:mt-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <button
                onClick={handleRefreshJobs}
                className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-semibold"
              >
                Refresh List
              </button>
              
              <p className="text-orange-400 text-sm font-semibold">
                Total: {instantJobs.length} job{instantJobs.length !== 1 ? 's' : ''}
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default InstantJobsManager;