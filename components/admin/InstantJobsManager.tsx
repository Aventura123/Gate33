import React, { useState, useEffect } from 'react';
import { web3Service } from '../../services/web3Service';
import instantJobsEscrowService from '../../services/instantJobsEscrowService';
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

const InstantJobsManager = () => {
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
  const [instantJobs, setInstantJobs] = useState<InstantJob[]>([]);
  const [isLoadingJobs, setIsLoadingJobs] = useState(false);

  // Non-functional connect wallet (just for display)
  const handleConnectWallet = () => {
    // This button does nothing - connection is handled in the dashboard
    console.log('Connect wallet button clicked - connection should be handled in dashboard');
  };
  
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
      
      // Save contract address to Firebase
      await instantJobsEscrowService.saveContractAddress(
        networkInfo.name.toLowerCase(),
        newContractAddress
      );
      
      // Reinitialize service with new address
      await instantJobsEscrowService.init();
      
      // Load contract data
      await loadContractData();
      
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
  
  // Load contract data
  const loadContractData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Check if contract is initialized
      if (!instantJobsEscrowService.isContractInitialized()) {
        await instantJobsEscrowService.init();
      }
      
      // Get contract data
      const owner = await instantJobsEscrowService.getContractOwner();
      setContractOwner(owner);
      
      const collector = await instantJobsEscrowService.getFeeCollector();
      setFeeCollector(collector);
      setNewFeeCollector(collector);
      
      const feePercentage = await instantJobsEscrowService.getPlatformFeePercentage();
      setPlatformFeePercentage(feePercentage);
      setNewFeePercentage(feePercentage);
      
      // Update displayed contract address
      if (networkInfo) {
        // Try to load contract addresses from Firebase
        await instantJobsEscrowService.loadContractAddresses();
        
        // Get address for current network from settings/contractInstantJobs_addresses
        const networkKey = networkInfo.name.toLowerCase();
        try {
          const contractsDocRef = doc(db, 'settings', 'contractInstantJobs_addresses');
          const contractsDoc = await getDoc(contractsDocRef);
          if (contractsDoc.exists() && contractsDoc.data()[networkKey]) {
            setContractAddress(contractsDoc.data()[networkKey]);
          }
        } catch (e) {
          console.error("Error fetching contract address:", e);
        }
      }
      
    } catch (err: any) {
      console.error("Error loading contract data:", err);
      setError(err.message || "Error loading contract data");
    } finally {
      setIsLoading(false);
    }
  };
  
  // Load jobs from Firebase and contract
  const loadJobs = async () => {
    if (!networkInfo) {
      setError("No network detected. Connect your wallet first.");
      return;
    }
    
    setIsLoadingJobs(true);
    setError(null);
    
    try {
      // Use instantJobs collection as shown in the Firebase screenshot
      const jobsCollection = collection(db, "instantJobs");
      
      // Get ALL jobs, not just for current network
      let q = query(jobsCollection);
      
      const querySnapshot = await getDocs(q);
      const jobsData: InstantJob[] = [];
      
      // Process jobs from Firebase
      for (const docSnapshot of querySnapshot.docs) {
        const jobData = docSnapshot.data() as any;
        
        // Normalize network for comparison (if defined)
        const jobNetwork = jobData.network ? jobData.network.toLowerCase() : '';
        const currentNetwork = networkInfo.name.toLowerCase();
        
        // Create job object with Firebase data
        const job: InstantJob = {
          id: docSnapshot.id,
          title: jobData.title || "No title",
          description: jobData.description || "",
          payment: jobData.budget || jobData.payment || 0,
          // Set default currency as ETH if not specified
          currency: jobData.currency || "ETH",
          deadline: jobData.deadline ? new Date(jobData.deadline) : new Date(),
          employer: jobData.employer || jobData.companyId || "",
          worker: jobData.worker || null,
          status: jobData.status || "open",
          network: jobNetwork || "unknown",
          createdAt: jobData.createdAt ? new Date(jobData.createdAt) : new Date()
        };
        
        // Add more properties from the structure
        if (jobData.category) job.category = jobData.category;
        if (jobData.companyName) job.companyName = jobData.companyName;
        if (jobData.requiredSkills) job.requiredSkills = jobData.requiredSkills;
        
        // Try to get contract data if available
        if (instantJobsEscrowService.isContractInitialized() && 
            (!jobNetwork || jobNetwork === currentNetwork || jobNetwork.includes(currentNetwork))) {
          try {
            const contractJobInfo = await instantJobsEscrowService.getJobInfo(currentNetwork, docSnapshot.id);
            job.contractData = contractJobInfo;
            
            // Update status based on contract data
            if (contractJobInfo.isPaid) {
              job.status = "completed";
            } else if (contractJobInfo.isApproved) {
              job.status = "approved";
            } else if (contractJobInfo.isCompleted) {
              job.status = "delivered";
            } else if (contractJobInfo.isAccepted) {
              job.status = "in-progress";
            }
            
            // Update worker if available in contract
            if (contractJobInfo.worker && contractJobInfo.worker !== "0x0000000000000000000000000000000000000000") {
              job.worker = contractJobInfo.worker;
            }
          } catch (err) {
            console.warn(`Couldn't get contract data for job ${docSnapshot.id}:`, err);
          }
        }
        
        jobsData.push(job);
      }
      
      // Sort by creation date (newest first)
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
        await loadContractData();
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
        await loadContractData();
      }
    } catch (err: any) {
      console.error("Error updating fee collector:", err);
      setError(err.message || "Error updating fee collector");
    } finally {
      setIsUpdatingCollector(false);
    }
  };
  // Check wallet connection and load data when wallet state or network changes
  useEffect(() => {
    console.log("[InstantJobsManager] useEffect disparado. walletAddress:", walletAddress, "currentNetwork:", currentNetwork);
    const loadWalletData = async () => {
      if (walletAddress) {
        // Get network information
        const network = await web3Service.getNetworkInfo();
        if (network) {
          console.log("Network changed in InstantJobsManager:", network.name, network.chainId);
          setNetworkInfo(network);
        }
        try {
          await loadContractData();
        } catch (err) {
          console.warn("Error loading contract data:", err);
          setIsLoading(false);
        }
      } else {
        setIsLoading(false);
      }
    };
    loadWalletData();
  }, [walletAddress, currentNetwork]); // Added currentNetwork dependency
  
  // Load jobs when wallet connects and network is available
  useEffect(() => {
    if (walletAddress && networkInfo) {
      loadJobs();
    }
  }, [walletAddress, networkInfo]);  // Render component
  return (
    <div className="bg-amber-950 p-6 rounded-lg shadow-lg">
      <h2 className="text-2xl font-semibold text-orange-500 mb-6">Instant Jobs Management</h2>
      
      {error && (
        <div className="bg-red-900/50 border border-red-500 text-red-100 px-4 py-3 rounded mb-4">
          <strong className="font-bold">Error: </strong>
          <span>{error}</span>
        </div>
      )}
      
      {success && (
        <div className="bg-green-900/50 border border-green-500 text-green-100 px-4 py-3 rounded mb-4">
          <strong className="font-bold">Success: </strong>
          <span>{success}</span>
        </div>
      )}
        {!walletAddress ? (
        <div className="mb-6">              <button
                onClick={handleConnectWallet}
                className="bg-orange-500 hover:bg-orange-600 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline transition cursor-not-allowed opacity-70"
                title="Wallet connection is handled in the dashboard"
              >
                Connect Wallet to Manage Instant Jobs
              </button>
          <p className="text-gray-400 text-sm mt-2">
            Please connect your wallet in the dashboard to manage Instant Jobs settings and view contract details.
          </p>
        </div>
      ) : (
        <>          {/* Network Information */}
          <div className="bg-neutral-900/40 p-4 rounded-lg mb-6 backdrop-blur-sm border border-gray-700">
            <h3 className="text-lg font-semibold text-orange-400 mb-2">Current Blockchain Network</h3>
            <div className="flex items-center">
              <div className="w-3 h-3 rounded-full bg-green-500 mr-2"></div>
              <p className="text-white">
                {networkInfo ? `${networkInfo.name} (Chain ID: ${networkInfo.chainId})` : "Unknown network"}
              </p>
            </div>
            <p className="text-gray-400 text-sm mt-1">
              Your wallet: <span className="text-gray-300 font-mono text-xs">{walletAddress}</span>
            </p>
          </div>
            {/* Contract Configuration (if not configured yet) */}
          {(!contractAddress || contractAddress === '0x0000000000000000000000000000000000000000') && (
            <div className="bg-neutral-900/40 border border-yellow-600/50 p-4 rounded-lg mb-6 backdrop-blur-sm">
              <h3 className="text-lg font-semibold text-yellow-500 mb-2">Configure Contract</h3>
              <p className="text-gray-300 mb-4">
                There's no contract configured for the {networkInfo?.name} network yet. Configure the contract address below:
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4">
                <input
                  type="text"
                  placeholder="Contract address (0x...)"
                  value={newContractAddress}
                  onChange={(e) => setNewContractAddress(e.target.value)}
                  className="flex-grow p-2 rounded bg-gray-700 text-white border border-gray-600 focus:outline-none focus:border-orange-500"
                />
                <button
                  onClick={setupContractAddress}
                  disabled={settingContractAddress || !newContractAddress}
                  className={`px-4 py-2 rounded font-medium ${settingContractAddress || !newContractAddress ? 'bg-gray-600 text-gray-400 cursor-not-allowed' : 'bg-orange-500 hover:bg-orange-600 text-white'}`}
                >
                  {settingContractAddress ? "Configuring..." : "Configure Contract"}
                </button>
              </div>
            </div>
          )}
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">            {/* Contract Information */}
            <div className="bg-neutral-950/80 p-4 rounded-lg border border-amber-800/30 backdrop-blur-sm">
              <h3 className="text-lg font-semibold text-orange-400 mb-4">Contract Information</h3>
              
              {isLoading ? (
                <p className="text-gray-400">Loading contract data...</p>
              ) : (
                <div className="space-y-2">
                  {contractAddress && contractAddress !== '0x0000000000000000000000000000000000000000' && (
                    <div>
                      <p className="text-sm text-gray-400">Contract Address:</p>
                      <p className="text-white font-mono truncate text-xs">{contractAddress}</p>
                    </div>
                  )}
                  
                  <div>
                    <p className="text-sm text-gray-400">Contract Owner:</p>
                    <p className="text-white font-mono truncate text-xs">{contractOwner || "Not available"}</p>
                    {contractOwner && walletAddress.toLowerCase() === contractOwner.toLowerCase() && (
                      <span className="inline-block bg-green-800 text-green-200 text-xs px-2 py-1 rounded mt-1">
                        You are the owner
                      </span>
                    )}
                  </div>
                  
                  <div>
                    <p className="text-sm text-gray-400">Fee Collector Address:</p>
                    <p className="text-white font-mono truncate text-xs">{feeCollector || "Not available"}</p>
                  </div>
                  
                  <div>
                    <p className="text-sm text-gray-400">Platform Fee:</p>
                    <p className="text-white">{platformFeePercentage ? `${(platformFeePercentage / 10).toFixed(1)}%` : "Not available"}</p>
                  </div>
                </div>
              )}
            </div>
              {/* Settings */}
            <div className="bg-neutral-900/40 p-4 rounded-lg border border-gray-700 backdrop-blur-sm">
              <h3 className="text-lg font-semibold text-orange-400 mb-4">Settings</h3>
              
              {isLoading ? (
                <p className="text-gray-400">Loading settings...</p>
              ) : contractOwner && walletAddress.toLowerCase() !== contractOwner.toLowerCase() ? (
                <p className="text-yellow-500">Only the contract owner can change these settings.</p>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="block text-gray-300 text-sm font-bold mb-2">
                      Platform Fee Percentage
                    </label>
                    <div className="flex items-center">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={newFeePercentage}
                        onChange={(e) => setNewFeePercentage(parseInt(e.target.value))}
                        className="shadow appearance-none border rounded py-2 px-3 mr-2 text-gray-700 leading-tight focus:outline-none focus:shadow-outline w-24"
                      />
                      <span className="text-gray-400">(Base 1000: {newFeePercentage} = {(newFeePercentage / 10).toFixed(1)}%)</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Maximum allowed value is 100 (10%)
                    </p>
                    <button
                      onClick={updateFeePercentage}
                      disabled={isUpdatingFee || newFeePercentage === platformFeePercentage || !instantJobsEscrowService.isContractInitialized()}
                      className={`mt-2 py-1 px-3 rounded text-sm ${
                        isUpdatingFee || newFeePercentage === platformFeePercentage || !instantJobsEscrowService.isContractInitialized()
                          ? "bg-gray-600 text-gray-400 cursor-not-allowed"
                          : "bg-orange-500 hover:bg-orange-600 text-white"
                      }`}
                    >
                      {isUpdatingFee ? "Updating..." : "Update Fee"}
                    </button>
                  </div>
                  
                  <div>
                    <label className="block text-gray-300 text-sm font-bold mb-2">
                      Fee Collector Address
                    </label>
                    <input
                      type="text"
                      value={newFeeCollector}
                      onChange={(e) => setNewFeeCollector(e.target.value)}
                      className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                      placeholder="0x..."
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      This address will receive the platform fees
                    </p>
                    <button
                      onClick={updateFeeCollector}
                      disabled={isUpdatingCollector || newFeeCollector === feeCollector || !instantJobsEscrowService.isContractInitialized()}
                      className={`mt-2 py-1 px-3 rounded text-sm ${
                        isUpdatingCollector || newFeeCollector === feeCollector || !instantJobsEscrowService.isContractInitialized()
                          ? "bg-gray-600 text-gray-400 cursor-not-allowed"
                          : "bg-orange-500 hover:bg-orange-600 text-white"
                      }`}
                    >
                      {isUpdatingCollector ? "Updating..." : "Update Collector"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
            {/* Jobs List */}
          <div className="bg-neutral-900/40 p-4 rounded-lg border border-gray-700 backdrop-blur-sm">
            <h3 className="text-lg font-semibold text-orange-400 mb-4">Instant Jobs</h3>
            
            {isLoadingJobs ? (
              <p className="text-gray-400">Loading jobs...</p>
            ) : instantJobs.length === 0 ? (
              <div>
                <p className="text-gray-400 mb-4">No Instant Jobs found for this network ({networkInfo?.name}).</p>
                <button
                  onClick={loadJobs}
                  className="bg-orange-500 hover:bg-orange-600 text-white py-1 px-4 rounded text-sm"
                >
                  Refresh List
                </button>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-gray-300">
                    <thead className="border-b border-gray-700">
                      <tr>
                        <th className="text-left py-2">ID</th>
                        <th className="text-left py-2">Title</th>
                        <th className="text-left py-2">Employer</th>
                        <th className="text-left py-2">Status</th>
                        <th className="text-left py-2">Payment</th>
                        <th className="text-left py-2">Fee</th>
                      </tr>
                    </thead>
                    <tbody>
                      {instantJobs.map((job) => (
                        <tr key={job.id} className="border-b border-gray-800 hover:bg-gray-800/50 transition-colors">
                          <td className="py-2 text-xs font-mono">{job.id.substring(0, 8)}...</td>
                          <td className="py-2">{job.title}</td>
                          <td className="py-2 text-xs font-mono">
                            {job.employer.substring(0, 6)}...{job.employer.substring(job.employer.length - 4)}
                          </td>
                          <td className="py-2">
                            <span className={`inline-block px-2 py-1 text-xs rounded ${
                              job.status === 'completed' ? 'bg-green-800/70 text-green-200 border border-green-700' :
                              job.status === 'approved' ? 'bg-amber-800/70 text-amber-200 border border-amber-700' : 
                              job.status === 'delivered' ? 'bg-yellow-800/70 text-yellow-200 border border-yellow-700' :
                              job.status === 'in-progress' ? 'bg-orange-700/50 text-orange-100 border border-orange-600' :
                              'bg-gray-800/70 text-gray-200 border border-gray-700'
                            }`}>
                              {job.status}
                            </span>
                          </td>
                          <td className="py-2">{job.payment.toFixed(2)} {job.currency}</td>
                          <td className="py-2">{(job.payment * platformFeePercentage / 1000).toFixed(4)} {job.currency}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                
                <div className="mt-4 flex justify-between">
                  <button
                    onClick={loadJobs}
                    className="bg-orange-500 hover:bg-orange-600 text-white py-1 px-4 rounded text-sm"
                  >
                    Refresh List
                  </button>
                  
                  <p className="text-gray-400 text-sm">
                    Total: {instantJobs.length} job{instantJobs.length !== 1 ? 's' : ''}
                  </p>
                </div>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default InstantJobsManager;