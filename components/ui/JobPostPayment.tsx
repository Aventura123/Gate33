import React, { useState, useEffect, useCallback, FormEvent, ChangeEvent } from "react";
import web3Service from "../../services/web3Service";
import smartContractService from "../../services/smartContractService";
import { db } from "../../lib/firebase";
import { collection, addDoc, getDoc, doc, getDocs, QueryDocumentSnapshot, DocumentData } from "firebase/firestore";
import jobService from "../../services/jobService";

interface PricingPlan {
  id: string;
  name: string;
  price: number;
  duration: number;
  features: string[];
  recommended?: boolean;
  currency?: string; // Add currency field to support USDT payment plans
}

interface CompanyProfile {
  name: string;
  description: string;
  website: string;
  location: string;
  responsiblePerson?: string;
  address?: string;
  contactPhone?: string;
}

interface JobPostPaymentProps {
  companyId: string;
  companyProfile: CompanyProfile;
  reloadData: () => void;
}

const JobPostPayment: React.FC<JobPostPaymentProps> = ({ companyId, companyProfile, reloadData }) => {
  // States and logic identical to the original dashboard flow
  const [jobData, setJobData] = useState({
    title: "",
    description: "",
    category: "",
    company: companyProfile.name || "",
    requiredSkills: "",
    salaryRange: "",
    location: "",
    employmentType: "",
    experienceLevel: "",
    blockchainExperience: "",
    remoteOption: "",
    contactEmail: "",
    applicationLink: "",
    pricingPlanId: "",
    paymentStatus: "pending" as 'pending' | 'completed' | 'failed',
    paymentId: ""
  });
  const [selectedPlan, setSelectedPlan] = useState<PricingPlan | null>(null);
  const [paymentStep, setPaymentStep] = useState<'form' | 'select-plan' | 'review' | 'processing' | 'completed'>('form');
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  
  // Add new state variables for network tracking
  const [currentNetwork, setCurrentNetwork] = useState<string | null>(null);
  const [isUsingWalletConnect, setIsUsingWalletConnect] = useState<boolean>(false);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [walletError, setWalletError] = useState<string | null>(null);
  const [pricingPlans, setPricingPlans] = useState<PricingPlan[]>([]);
  const [isConnectingWallet, setIsConnectingWallet] = useState(false);

  // Fetch pricing plans
  const fetchPricingPlans = useCallback(async () => {
    try {
      if (!db) throw new Error("Firestore is not initialized");
      const pricingPlansCollection = collection(db, "jobPlans");
      const pricingPlansSnapshot = await getDocs(pricingPlansCollection);
      const fetchedPlans = pricingPlansSnapshot.docs.map((doc: QueryDocumentSnapshot<DocumentData>) => ({
        id: doc.id,
        ...doc.data(),
      })) as PricingPlan[];
      setPricingPlans(fetchedPlans);
    } catch (error) {
      setPaymentError("Error fetching pricing plans");
    }
  }, []);
  
  useEffect(() => { 
    fetchPricingPlans(); 
  }, [fetchPricingPlans]);
  
  // --- NEW: Sync with global wallet ---
  useEffect(() => {
    // Function to update local state with global wallet
    let lastWalletAddress: string | null = null;
    let lastNetwork: string | null = null;
    const updateWalletInfo = () => {
      try {
        if (web3Service && typeof web3Service.isWalletConnected === 'function') {
          const isConnected = web3Service.isWalletConnected();
          if (isConnected) {
            const walletInfo = web3Service.getWalletInfo();
            if (walletInfo && walletInfo.address) {
              if (walletInfo.address !== lastWalletAddress) {
                setWalletAddress(walletInfo.address);
                lastWalletAddress = walletInfo.address;
              }
              if (walletInfo.networkName && walletInfo.networkName !== lastNetwork) {
                setCurrentNetwork(walletInfo.networkName);
                lastNetwork = walletInfo.networkName;
              }
              const usingWC = !!web3Service.wcV2Provider;
              setIsUsingWalletConnect(usingWC);
              return;
            }
          }
        }
        if (lastWalletAddress !== null) {
          setWalletAddress(null);
          lastWalletAddress = null;
        }
        if (lastNetwork !== null) {
          setCurrentNetwork(null);
          lastNetwork = null;
        }
      } catch (error) {
        setWalletAddress(null);
        setCurrentNetwork(null);
      }
    };
    // Only run once on mount
    updateWalletInfo();
    // Listeners for global events (compatible with both patterns)
    const handleWeb3Connected = (e: any) => {
      console.log('[JobPostPayment] web3Connected', e.detail);
      const addr = e.detail?.address || e.detail || null;
      setWalletAddress(addr);
      
      // Update network information if available
      if (e.detail?.networkName) {
        setCurrentNetwork(e.detail.networkName);
      }
      
      // Check if using WalletConnect
      setIsUsingWalletConnect(!!web3Service.wcV2Provider);
    };
    
    const handleWeb3Disconnected = () => {
      setWalletAddress(null);
      setCurrentNetwork(null);
      setIsUsingWalletConnect(false);
    };
    
    const handleWalletConnected = (e: any) => {
      console.log('[JobPostPayment] walletConnected', e.detail);
      const addr = e.detail?.address || e.detail || null;
      setWalletAddress(addr);
      
      // Update network information if available
      if (e.detail?.network) {
        setCurrentNetwork(e.detail.network);
      }
      
      // Check if using WalletConnect
      setIsUsingWalletConnect(!!web3Service.wcV2Provider);
    };
    
    const handleWalletDisconnected = () => {
      setWalletAddress(null);
      setCurrentNetwork(null);
      setIsUsingWalletConnect(false);
    };
    
    const handleChainChanged = () => {
      updateWalletInfo();
    };
    
    const handleAccountsChanged = () => {
      updateWalletInfo();
    };
    
    // New handlers for network changes
    const handleNetworkChanged = (e: any) => {
      console.log('[JobPostPayment] networkChanged event', e.detail);
      if (e.detail?.network) {
        setCurrentNetwork(e.detail.network);
      }
      setIsUsingWalletConnect(e.detail?.forced || !!web3Service.wcV2Provider);
    };
    
    // Handler for forced networks with WalletConnect
    const handleForcedNetwork = (e: any) => {
      console.log('[JobPostPayment] web3ForcedNetwork event', e.detail);
      if (e.detail?.networkType) {
        setCurrentNetwork(e.detail.networkType);
      }
      setIsUsingWalletConnect(true);
    };
    
    window.addEventListener('web3Connected', handleWeb3Connected);
    window.addEventListener('web3Disconnected', handleWeb3Disconnected);
    window.addEventListener('walletConnected', handleWalletConnected);
    window.addEventListener('walletDisconnected', handleWalletDisconnected);
    window.addEventListener('chainChanged', handleChainChanged);
    window.addEventListener('accountsChanged', handleAccountsChanged);
    window.addEventListener('networkChanged', handleNetworkChanged);
    window.addEventListener('web3ForcedNetwork', handleForcedNetwork);
    
    return () => {
      window.removeEventListener('web3Connected', handleWeb3Connected);
      window.removeEventListener('web3Disconnected', handleWeb3Disconnected);
      window.removeEventListener('walletConnected', handleWalletConnected);
      window.removeEventListener('walletDisconnected', handleWalletDisconnected);
      window.removeEventListener('chainChanged', handleChainChanged);
      window.removeEventListener('accountsChanged', handleAccountsChanged);
      window.removeEventListener('networkChanged', handleNetworkChanged);
      window.removeEventListener('web3ForcedNetwork', handleForcedNetwork);
    };
  }, []);
  
  // Removed previous USDT balance check - error will only be shown during payment processing

  // Handlers
  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setJobData((prev) => ({ ...prev, [name]: value ?? "" }));
  };

  const handlePlanSelect = (plan: PricingPlan) => {
    setSelectedPlan(plan);
    setJobData((prev) => ({ ...prev, pricingPlanId: plan.id, paymentId: prev.paymentId || "" }));
    setPaymentStep('review');
  };
    const processPayment = async () => {
    // Prevent duplicate wallet connection attempts immediately
    if (isConnectingWallet) {
      setPaymentError("Wallet is currently connecting. Please wait...");
      return;
    }
    if (!selectedPlan) {
      setPaymentError("Please select a pricing plan");
      return;
    }
    setPaymentError(null);
    // Log network information for debugging
    console.log(`[JobPostPayment] Processing payment with network: ${currentNetwork || 'unknown'}`);
    console.log(`[JobPostPayment] Using WalletConnect: ${isUsingWalletConnect}`);
    console.log(`[JobPostPayment] Payment currency: ${selectedPlan.currency || 'ETH'}`);
    console.log(`[JobPostPayment] Payment amount: ${selectedPlan.price}`);
    // Check if the wallet is connected
    if (!walletAddress) {
      console.log("[JobPostPayment] Trying to connect wallet...");
      setIsConnectingWallet(true);
      try {
        const walletInfo = await web3Service.connectWallet();
        if (walletInfo?.address) {
          console.log("[JobPostPayment] Wallet connected successfully:", walletInfo.address);
          setWalletAddress(walletInfo.address);
        } else {
          throw new Error("Could not get wallet address");
        }
      } catch (error: any) {
        setPaymentError(error.message || "Failed to connect wallet");
        console.error("[JobPostPayment] Error connecting wallet:", error);
        return;
      } finally {
        setIsConnectingWallet(false);
      }
    }
    // Double-check wallet connection after connect attempt
    if (!walletAddress) {
      setPaymentError("Wallet is not connected. Please connect your wallet first.");
      return;
    }
    setIsProcessingPayment(true);
    setPaymentStep('processing');
    // Set a timeout to reset UI if transaction takes too long
    const timeoutId = setTimeout(() => {
      if (paymentStep === 'processing') {
        setPaymentError("Transaction is taking longer than expected. Please check your wallet for any pending transactions.");
        setPaymentStep('review');
        setIsProcessingPayment(false);
      }
    }, 90000); // 90 seconds timeout
    try {
      // Check again if the wallet is connected after attempting to connect
      let currentAddress = walletAddress;
      
      // Additional security check
      if (!currentAddress) {
        clearTimeout(timeoutId);
        throw new Error("Wallet is not connected. Please connect your wallet first.");
      }
      
      // Check if payment should be in USDT or native currency
      const planCurrency = selectedPlan.currency?.toUpperCase();
      
      // Variable to store transaction result
      let transaction;
      try {
        if (planCurrency === 'USDT') {
          console.log("[JobPostPayment] Detected USDT payment, using USDT payment method via jobService");
          // For WalletConnect, pass the forced network
          if (isUsingWalletConnect && currentNetwork) {
            transaction = await jobService.processJobPaymentWithUSDT(
              selectedPlan.id,
              selectedPlan.price,
              companyId,
              currentNetwork
            );
          } else {
            transaction = await jobService.processJobPaymentWithUSDT(
              selectedPlan.id,
              selectedPlan.price,
              companyId
            );
          }
        } else {
          console.log("[JobPostPayment] Using native token payment method via jobService");
          if (isUsingWalletConnect && currentNetwork) {
            transaction = await jobService.processJobPayment(
              selectedPlan.id,
              selectedPlan.price,
              companyId,
              currentNetwork
            );
          } else {
            transaction = await jobService.processJobPayment(
              selectedPlan.id,
              selectedPlan.price,
              companyId
            );
          }
        }
      } catch (error: any) {
        console.error("[JobPostPayment] Error during payment processing via jobService:", error);
        clearTimeout(timeoutId);
        // Handle specific contract/network errors with user-friendly messages
        if (error.message?.includes("contract address not configured")) {
          throw new Error(`Payment contract not available on the ${currentNetwork || 'current'} network. Please try another network.`);
        } else if (error.message?.includes("user rejected")) {
          throw new Error("You rejected the transaction in your wallet. Please try again.");
        } else if (error.message?.includes("insufficient funds")) {
          throw new Error("You don't have enough funds in your wallet to complete this transaction.");
        } else {
          throw error;
        }
      }
      
      // Verify the transaction was successful
      if (!transaction || !transaction.transactionHash) {
        clearTimeout(timeoutId);
        throw new Error("Transaction failed or was incomplete. Please try again.");
      }
      
      // Transaction successful - save payment
      const paymentsCollection = collection(db, "payments");
      const paymentRef = await addDoc(paymentsCollection, {
        planId: selectedPlan.id,
        planName: selectedPlan.name,
        amount: selectedPlan.price,
        companyId,
        currency: planCurrency || 'NATIVE',
        status: "completed",
        createdAt: new Date(),
        transactionHash: transaction.transactionHash,
        blockNumber: transaction.blockNumber
      });
      
      // Save job
      const now = new Date();
      const expiryDate = new Date(now.getTime() + selectedPlan.duration * 24 * 60 * 60 * 1000);
      const jobCollection = collection(db, "jobs");
      const jobToSave = {
        ...jobData,
        companyId,
        createdAt: now,
        expiresAt: expiryDate,
        paymentStatus: "completed",
        paymentId: paymentRef.id,
        pricingPlanId: selectedPlan.id,
        planName: selectedPlan.name,
        planDuration: selectedPlan.duration,
        planCurrency: planCurrency || 'NATIVE',
        featured: selectedPlan.name.toLowerCase().includes('premium') || selectedPlan.name.toLowerCase().includes('featured'),
        priorityListing: selectedPlan.name.toLowerCase().includes('premium'),
      };
      await addDoc(jobCollection, jobToSave);
      setJobData((prev) => ({ ...prev, paymentStatus: "completed", paymentId: paymentRef.id }));
      
      // Clear the timeout since we're done processing
      clearTimeout(timeoutId);
      
      // Update UI to show completion
      setPaymentStep('completed');
      reloadData();
    } catch (error: any) {
      console.error("[JobPostPayment] Payment error:", error);
      setPaymentError(error.message || "Payment failed. Please try again.");
      setJobData((prev) => ({ ...prev, paymentStatus: "failed" }));
      setPaymentStep('review');
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const resetPaymentFlow = () => {
    setSelectedPlan(null);
    setPaymentStep('form');
    setPaymentError(null);
    setJobData((prev) => ({ ...prev, pricingPlanId: "", paymentStatus: "pending", paymentId: prev.paymentId || "" }));
  };

  // Render
  return (
    <div className="bg-black/70 p-8 rounded-lg shadow-lg">
      {paymentStep === 'form' && (
        <form onSubmit={e => {
          e.preventDefault();
          if (!jobData.title || !jobData.description || !jobData.category || !jobData.contactEmail || !jobData.applicationLink) {
            alert("Please fill in all required fields.");
            return;
          }
          setPaymentStep('select-plan');
        }}>
          <div className="space-y-6">
            <input type="text" name="title" value={jobData.title} onChange={handleChange} placeholder="Job Title" className="w-full p-3 bg-black/50 border border-orange-500/30 rounded-lg text-white text-sm" required />
            <textarea name="description" value={jobData.description} onChange={handleChange} placeholder="Job Description" rows={4} className="w-full p-3 bg-black/50 border border-orange-500/30 rounded-lg text-white text-sm" required></textarea>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input type="text" name="category" value={jobData.category} onChange={handleChange} placeholder="Category" className="w-full p-3 bg-black/50 border border-orange-500/30 rounded-lg text-white text-sm" required />
              <input type="text" name="company" value={jobData.company} onChange={handleChange} placeholder="Company Name" className="w-full p-3 bg-black/50 border border-orange-500/30 rounded-lg text-white text-sm" required />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input type="text" name="requiredSkills" value={jobData.requiredSkills} onChange={handleChange} placeholder="Required Skills" className="w-full p-3 bg-black/50 border border-orange-500/30 rounded-lg text-white text-sm" />
              <input type="text" name="salaryRange" value={jobData.salaryRange} onChange={handleChange} placeholder="Salary Range" className="w-full p-3 bg-black/50 border border-orange-500/30 rounded-lg text-white text-sm" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input type="text" name="location" value={jobData.location} onChange={handleChange} placeholder="Location" className="w-full p-3 bg-black/50 border border-orange-500/30 rounded-lg text-white text-sm" />
              <input type="text" name="employmentType" value={jobData.employmentType} onChange={handleChange} placeholder="Employment Type" className="w-full p-3 bg-black/50 border border-orange-500/30 rounded-lg text-white text-sm" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input type="text" name="experienceLevel" value={jobData.experienceLevel} onChange={handleChange} placeholder="Experience Level" className="w-full p-3 bg-black/50 border border-orange-500/30 rounded-lg text-white text-sm" />
              <input type="text" name="blockchainExperience" value={jobData.blockchainExperience} onChange={handleChange} placeholder="Blockchain Experience" className="w-full p-3 bg-black/50 border border-orange-500/30 rounded-lg text-white text-sm" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input type="text" name="remoteOption" value={jobData.remoteOption} onChange={handleChange} placeholder="Remote Option" className="w-full p-3 bg-black/50 border border-orange-500/30 rounded-lg text-white text-sm" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input type="email" name="contactEmail" value={jobData.contactEmail} onChange={handleChange} placeholder="Contact Email" className="w-full p-3 bg-black/50 border border-orange-500/30 rounded-lg text-white text-sm" required />
              <input type="url" name="applicationLink" value={jobData.applicationLink} onChange={handleChange} placeholder="Application URL" className="w-full p-3 bg-black/50 border border-orange-500/30 rounded-lg text-white text-sm" required />
            </div>
            <button type="submit" className="w-full bg-orange-500 text-white py-3 rounded-full font-semibold text-lg hover:bg-orange-600 mt-6">Continue</button>
          </div>
        </form>
      )}
      {paymentStep === 'select-plan' && (
        <div>
          <h3 className="text-2xl font-semibold text-orange-500 mb-4">Select a Plan</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
            {pricingPlans.map(plan => (
              <div key={plan.id} className={`border rounded-lg p-6 flex flex-col h-full transition-all cursor-pointer ${jobData.pricingPlanId === plan.id ? "border-orange-500 bg-black/70" : "border-gray-700 bg-black/50 hover:border-orange-300"}`}
                onClick={() => { setJobData(prev => ({ ...prev, pricingPlanId: plan.id })); setSelectedPlan(plan); }}>
                <h4 className="text-xl font-bold text-orange-400">{plan.name}</h4>
                <div className="text-3xl font-bold text-white my-2">${plan.price} {plan.currency === 'USDT' ? 'USDT' : ''}</div>
                <p className="text-gray-400 mb-4">{plan.duration} days listing</p>
                {plan.currency === 'USDT' && (
                  <div className="flex items-center text-yellow-400 text-sm mb-3">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2h-1v-3a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    USDT payment required
                  </div>
                )}
                <button type="button" onClick={() => { setJobData(prev => ({ ...prev, pricingPlanId: plan.id })); setSelectedPlan(plan); }} className="mt-4 py-2 px-4 rounded-lg bg-orange-500 text-white hover:bg-orange-600">Select Plan</button>
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-8">
            <button onClick={() => setPaymentStep('form')} className="bg-gray-700 text-white py-2 px-6 rounded-lg font-semibold hover:bg-gray-800">Back</button>
            <button onClick={() => {
              if (!selectedPlan && jobData.pricingPlanId) {
                const plan = pricingPlans.find(p => p.id === jobData.pricingPlanId) || null;
                setSelectedPlan(plan);
              }
              if (!jobData.pricingPlanId) {
                alert('Please select a plan.');
                return;
              }
              setPaymentStep('review');
            }} className="bg-orange-500 text-white py-2 px-6 rounded-lg font-semibold hover:bg-orange-600">Continue to Payment</button>
          </div>
        </div>
      )}
      {paymentStep === 'review' && selectedPlan && (
        <div className="bg-black/50 p-6 rounded-lg mt-4">
          <div className="flex justify-between mb-6">
            <button onClick={() => setPaymentStep('select-plan')} className="bg-gray-700 hover:bg-gray-600 text-white py-2 px-6 rounded-lg">Back to Plans</button>
          </div>
          <h3 className="text-2xl font-semibold text-orange-500 mb-4">Review Your Order</h3>
          <div className="bg-black/50 border border-gray-700 rounded-lg p-6">
            <div className="flex justify-between items-center border-b border-gray-700 pb-4 mb-4">
              <div>
                <h4 className="text-xl font-semibold text-white">{selectedPlan.name} Plan</h4>
                <p className="text-gray-400">{selectedPlan.duration} days of job listing</p>
              </div>
              <div className="text-2xl font-bold text-white">${selectedPlan.price} {selectedPlan.currency === 'USDT' ? 'USDT' : ''}</div>
            </div>
            <div className="space-y-2 mb-6">
              <div className="flex justify-between font-bold">
                <span className="text-gray-300">Total:</span>
                <span className="text-orange-500">${selectedPlan.price} {selectedPlan.currency === 'USDT' ? 'USDT' : ''}</span>
              </div>
              {selectedPlan.currency === 'USDT' && (
                <div className="mt-2 p-2 bg-yellow-900/20 border border-yellow-800 rounded-md">
                  <div className="flex items-start text-yellow-400 text-sm">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2h-1v-3a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    <span>This plan requires payment in USDT. Make sure you have sufficient USDT tokens in your wallet.</span>
                  </div>
                </div>
              )}
            </div>
            <div className="mb-4 p-3 rounded-lg border border-gray-700">
              <div className="flex justify-between items-center">
                <span className="text-gray-300">Wallet Connection:</span>
                <span className={walletAddress ? "text-green-500" : "text-yellow-500"}>{walletAddress ? "Connected" : "Not Connected"}</span>
              </div>
              <div className="mt-2 text-sm text-gray-400 break-all">{walletAddress ? `Address: ${walletAddress}` : "No wallet connected"}</div>
              
              {/* Display current network information */}
              {currentNetwork && (
                <div className="flex justify-between items-center mt-2">
                  <span className="text-gray-300">Network:</span>
                  <span className="text-blue-400">{currentNetwork}</span>
                </div>
              )}
              
              {/* Show indicator if using WalletConnect with forced network */}
              {isUsingWalletConnect && currentNetwork && selectedPlan?.currency === 'USDT' && (
                <div className="mt-2 text-xs text-yellow-400 italic">
                  Using WalletConnect with forced network: {currentNetwork}
                </div>
              )}
              
              {walletError && <div className="mt-2 text-sm text-red-500">Error: {walletError}</div>}
            </div>
            <div className="flex flex-col space-y-3">
              <button
                type="button"
                className={`w-full py-3 rounded-lg font-semibold text-lg mt-4 ${isProcessingPayment || isConnectingWallet || !walletAddress ? 'bg-orange-300 cursor-not-allowed' : 'bg-orange-500 hover:bg-orange-600 text-white'}`}
                onClick={processPayment}
                disabled={isProcessingPayment || isConnectingWallet || !walletAddress}
              >
                {isProcessingPayment ? 'Processing Payment...' : isConnectingWallet ? 'Connecting Wallet...' : !walletAddress ? 'Connect Wallet First' : 'Pay and Publish'}
              </button>
              {/* Only show the error message once below the button */}
              {paymentError && (
                <div className="mt-3 text-red-500 text-sm">{paymentError}</div>
              )}
            </div>
          </div>
        </div>
      )}
      {paymentStep === 'processing' && (
        <div className="text-center py-8"><span className="flex items-center justify-center"><svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>Processing Payment...</span></div>
      )}
      {paymentStep === 'completed' && (
        <div className="text-center space-y-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-500 mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
          </div>
          <h3 className="text-2xl font-semibold text-green-500">Payment Successful!</h3>
          <p className="text-gray-300">Your payment has been processed successfully. You can check your offers on the dashboard.</p>
          <button onClick={resetPaymentFlow} className="mt-4 bg-orange-500 text-white py-3 px-8 rounded-lg font-semibold hover:bg-orange-600 transition">Post Another Job</button>
        </div>
      )}
    </div>
  );
};

export default JobPostPayment;