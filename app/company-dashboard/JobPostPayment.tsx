import React, { useState, useEffect, useCallback, FormEvent, ChangeEvent } from "react";
import web3Service from "../../services/web3Service";
import smartContractService from "../../services/smartContractService";
import { db } from "../../lib/firebase";
import { collection, addDoc, getDoc, doc, getDocs, QueryDocumentSnapshot, DocumentData, query, where, updateDoc, deleteDoc } from "firebase/firestore";
import jobService from "../../services/jobService";
import { useWallet } from '../../components/WalletProvider';
import AIJobAssistant from "./AIJobAssistant";
import { SkillTagsInput } from "../../components/ui/SkillTagsInput";
import { JOB_CATEGORIES_DROPDOWN } from "../../constants/jobCategories";

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
} // Extend the interface to include dynamic questions and new fields for the AI Job Assistant
interface JobDataType {
  title: string;
  description: string;
  category: string;
  company: string;
  requiredSkills: string[]; // Changed from string to string[]
  salaryRange: string;
  location: string;
  employmentType: string;
  experienceLevel: string;
  blockchainExperience: string;
  remoteOption: string;
  contactEmail: string;
  applicationLink: string;
  pricingPlanId: string;
  paymentStatus: 'pending' | 'completed' | 'failed';
  paymentId: string;
  // Keep these fields for backward compatibility and AI Assistant
  responsibilities?: string;
  idealCandidate?: string;
  benefits?: string;
  screeningQuestions?: string[];
  acceptsCryptoPay?: boolean;
  [key: `question${number}`]: string | undefined;
}

const JobPostPayment: React.FC<JobPostPaymentProps> = ({ companyId, companyProfile, reloadData }) => {
  // States and logic identical to the original dashboard flow
  const [jobData, setJobData] = useState<JobDataType>({
    title: "",
    description: "",
    category: "",
    company: companyProfile.name || "",
    requiredSkills: [], // Changed from string to empty array
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
    paymentId: "",
    // Keep these fields for backward compatibility and AI Assistant
    responsibilities: "",
    idealCandidate: "",
    benefits: "",
    screeningQuestions: [],
    acceptsCryptoPay: false
  });
  const [selectedPlan, setSelectedPlan] = useState<PricingPlan | null>(null);
  const [paymentStep, setPaymentStep] = useState<'form' | 'select-plan' | 'review' | 'processing' | 'completed'>('form');
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  
  // Use global wallet context
  const {
    walletAddress,
    currentNetwork,
    isUsingWalletConnect,
    walletError,
    isConnectingWallet,
    connectWallet,
    clearWalletError
  } = useWallet();

  const [pricingPlans, setPricingPlans] = useState<PricingPlan[]>([]);

  // Job Draft States
  const [jobDrafts, setJobDrafts] = useState<any[]>([]);
  const [showJobDraftModal, setShowJobDraftModal] = useState(false);
  const [isLoadingJobDrafts, setIsLoadingJobDrafts] = useState(false);
  const [isSavingJobDraft, setIsSavingJobDraft] = useState(false);
  const [currentJobDraftId, setCurrentJobDraftId] = useState<string | null>(null);

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
  }, []);  useEffect(() => { 
    fetchPricingPlans(); 
  }, [fetchPricingPlans]);  // Job Draft Functions
  const fetchJobDrafts = useCallback(async () => {
    console.log('[JobDrafts] Fetching for companyId:', companyId);
    if (!db || !companyId) {
      console.log('[JobDrafts] Skipping fetch - missing db or companyId');
      return;
    }
    try {
      setIsLoadingJobDrafts(true);
      const draftsCollection = collection(db, "job_drafts");
      
      // First try to get all drafts for this company without the deleted filter
      console.log('[JobDrafts] Querying collection: job_drafts');
      const q = query(
        draftsCollection, 
        where("companyId", "==", companyId)
      );
      
      const snapshot = await getDocs(q);
      console.log('[JobDrafts] Query executed, found', snapshot.docs.length, 'documents');
      
      // Filter out deleted drafts in code instead of query
      const fetched = snapshot.docs
        .map(doc => ({
          id: doc.id,
          ...doc.data(),
          updatedAt: doc.data().updatedAt || doc.data().createdAt || null,
        }))
        .filter((draft: any) => !draft.deleted); // Filter deleted drafts
      
      console.log('[JobDrafts] After filtering deleted:', fetched.length, 'drafts');
      console.log('[JobDrafts] Drafts data:', fetched);
      setJobDrafts(fetched);
    } catch (error: any) {
      console.error('[JobDrafts] Error fetching:', error);
      console.error('[JobDrafts] Error details:', error?.message || 'Unknown error');
      setJobDrafts([]);
    } finally {
      setIsLoadingJobDrafts(false);
    }
  }, [db, companyId]);
  const saveJobDraft = useCallback(async (draftId: string | null = null) => {
    console.log('[JobDrafts] Saving draft:', { draftId, hasData: !!jobData, companyId });
    if (!db || !companyId) {
      console.error('[JobDrafts] Cannot save - missing db or companyId');
      alert('Cannot save draft: missing database connection or company ID');
      return false;
    }
    try {
      setIsSavingJobDraft(true);
      console.log('[JobDrafts] Creating collection reference for job_drafts');
      const draftsCollection = collection(db, "job_drafts");
      
      const draftData: any = {
        ...jobData,
        companyId,
        updatedAt: new Date(),
        deleted: false,
      };

      console.log('[JobDrafts] Draft data to save:', draftData);

      if (draftId) {
        // Update existing draft
        console.log('[JobDrafts] Updating existing draft:', draftId);
        const draftRef = doc(db, "job_drafts", draftId);
        await updateDoc(draftRef, draftData);
        console.log('[JobDrafts] Updated draft:', draftId);
      } else {
        // Create new draft
        console.log('[JobDrafts] Creating new draft');
        draftData.createdAt = new Date();
        const docRef = await addDoc(draftsCollection, draftData);
        console.log('[JobDrafts] Created new draft:', docRef.id);
        setCurrentJobDraftId(docRef.id);
      }
      
      console.log('[JobDrafts] Refreshing drafts list');
      await fetchJobDrafts();
      return true;
    } catch (error: any) {
      console.error('[JobDrafts] Error saving draft:', error);
      console.error('[JobDrafts] Error details:', error?.message || 'Unknown error');
      alert(`Failed to save draft: ${error?.message || 'Unknown error'}`);
      return false;
    } finally {
      setIsSavingJobDraft(false);
    }
  }, [db, companyId, jobData, fetchJobDrafts]);
  const loadJobDraft = useCallback(async (draftId: string) => {
    console.log('[JobDrafts] Loading draft:', draftId);
    if (!db) {
      console.error('[JobDrafts] Cannot load - missing db');
      return false;
    }
    try {
      const draftRef = doc(db, "job_drafts", draftId);
      const draftSnap = await getDoc(draftRef);
      
      if (draftSnap.exists()) {
        const data = draftSnap.data();
        console.log('[JobDrafts] Loaded draft data:', data);
          // Set the job data, ensuring arrays and proper defaults
        const loadedData = {
          title: data.title || "",
          description: data.description || "",
          category: data.category || "",
          company: data.company || companyProfile.name || "",
          requiredSkills: Array.isArray(data.requiredSkills) ? data.requiredSkills : [],
          salaryRange: data.salaryRange || "",
          location: data.location || "",
          employmentType: data.employmentType || "",
          experienceLevel: data.experienceLevel || "",
          blockchainExperience: data.blockchainExperience || "",
          remoteOption: data.remoteOption || "",
          contactEmail: data.contactEmail || "",
          applicationLink: data.applicationLink || "",
          pricingPlanId: "",
          paymentStatus: "pending" as 'pending' | 'completed' | 'failed',
          paymentId: "",
          responsibilities: data.responsibilities || "",
          idealCandidate: data.idealCandidate || "",
          benefits: data.benefits || "",
          screeningQuestions: Array.isArray(data.screeningQuestions) ? data.screeningQuestions : [],
          acceptsCryptoPay: data.acceptsCryptoPay || false,
        };
        
        console.log('[JobDrafts] Setting job data to:', loadedData);
        setJobData(loadedData);
        
        // Also update screening questions state if needed
        if (Array.isArray(data.screeningQuestions) && data.screeningQuestions.length > 0) {
          setScreeningQuestions(data.screeningQuestions);
          setEnableScreeningQuestions(true);
        }
        
        setCurrentJobDraftId(draftId);
        setShowJobDraftModal(false);
        alert('Draft loaded successfully!');
        return true;
      } else {
        console.error('[JobDrafts] Draft not found:', draftId);
        alert('Draft not found!');
        return false;
      }
    } catch (error) {
      console.error('[JobDrafts] Error loading draft:', error);
      alert('Error loading draft. Please try again.');
      return false;
    }
  }, [db, companyProfile.name]);

  const deleteJobDraft = useCallback(async (draftId: string) => {
    console.log('[JobDrafts] Deleting draft:', draftId);
    if (!db) {
      console.error('[JobDrafts] Cannot delete - missing db');
      return false;
    }
    try {
      const draftRef = doc(db, "job_drafts", draftId);
      await updateDoc(draftRef, { deleted: true, deletedAt: new Date() });
      console.log('[JobDrafts] Marked draft as deleted:', draftId);
      
      await fetchJobDrafts();
      return true;
    } catch (error) {
      console.error('[JobDrafts] Error deleting draft:', error);
      return false;
    }  }, [db, fetchJobDrafts]);
    // Load job drafts when component mounts
  useEffect(() => {
    console.log('[JobDrafts] useEffect triggered. companyId:', companyId);
    if (companyId) {
      console.log('[JobDrafts] Calling fetchJobDrafts');
      fetchJobDrafts();
    } else {
      console.log('[JobDrafts] companyId is empty, not fetching');
    }
  }, [companyId, fetchJobDrafts]);
  
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
      try {
        await connectWallet();
      } catch (error: any) {
        setPaymentError(error.message || "Failed to connect wallet");
        return;
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
        featured: selectedPlan.features?.includes('Featured in Job Listing') || selectedPlan.name.toLowerCase().includes('premium') || selectedPlan.name.toLowerCase().includes('featured'),
        priorityListing: selectedPlan.features?.includes('Top Listed') || selectedPlan.name.toLowerCase().includes('premium'),
        // Company info
        companyName: companyProfile.name || jobData.company,
        companyWebsite: companyProfile.website || '',
        companyDescription: companyProfile.description || '',
        companyLocation: companyProfile.location || '',
        // Manager info
        managerName: companyProfile.responsiblePerson || '',
      };      await addDoc(jobCollection, jobToSave);
      
      // Delete draft if job was created from one
      if (currentJobDraftId) {
        try {
          await deleteJobDraft(currentJobDraftId);
          setCurrentJobDraftId(null);
          console.log('[JobDrafts] Draft deleted after job creation');
        } catch (error) {
          console.error('[JobDrafts] Error deleting draft after job creation:', error);
        }
      }
      
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

  // State for screening questions
  const [enableScreeningQuestions, setEnableScreeningQuestions] = useState(false);
  const [screeningQuestions, setScreeningQuestions] = useState<string[]>([]);
  // Render
  return (
    <div>
      {paymentStep === 'form' && (
        <form onSubmit={e => {
          e.preventDefault();
          setPaymentStep('select-plan');
        }}>
          {/* --- NEW JOB OFFER FORM --- */}
          <div className="space-y-6 mb-8">
            <div>
              <label className="block text-orange-400 font-semibold mb-1">Job Title *</label>
              <input name="title" value={jobData.title} onChange={handleChange} required className="w-full p-2 rounded bg-black/50 border border-gray-700 text-white" />
            </div>            <div>
              <label className="block text-orange-400 font-semibold mb-1">Company Name *</label>
              <input name="company" value={jobData.company} onChange={handleChange} required className="w-full p-2 rounded bg-black/50 border border-gray-700 text-white" />
            </div>
            
            <AIJobAssistant 
              jobData={jobData} 
              updateJobData={setJobData} 
              companyProfile={companyProfile}
              setScreeningQuestions={questions => {
                setScreeningQuestions(questions);
                if (questions && questions.length > 0) setEnableScreeningQuestions(true);
              }}
            />            <div>
              <label htmlFor="jobDescription" className="block text-orange-400 font-semibold mb-1">Job Description *</label>
              <textarea 
                id="jobDescription"
                name="description" 
                value={jobData.description} 
                onChange={handleChange} 
                placeholder="Enter a complete job description including responsibilities, requirements, ideal candidate profile, benefits, and all relevant details" 
                className="w-full p-2 rounded bg-black/50 border border-gray-700 text-white focus:ring-2 focus:ring-orange-400 focus:outline-none" 
                required 
                rows={15} 
              />
              <p className="text-xs text-gray-400 mt-1">Include all job details: position description, responsibilities, requirements, ideal candidate profile, benefits, and technical requirements.</p>
            </div>
              <div>
              <label htmlFor="jobCategory" className="block text-orange-400 font-semibold mb-1">Job Category *</label>
              <select 
                id="jobCategory"
                name="category" 
                value={jobData.category} 
                onChange={handleChange}
                required 
                className="w-full p-2 rounded bg-black/50 border border-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-orange-400"
              >
                <option value="">Select Category</option>
                {JOB_CATEGORIES_DROPDOWN.map((category) => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
              <p className="text-xs text-gray-400 mt-1">Select the category that best describes this job position.</p>
            </div>
            
              {/* Unified Skills Input Section */}
            <div>
              <SkillTagsInput                value={jobData.requiredSkills}
                onChange={(skills) => setJobData(prev => ({ ...prev, requiredSkills: skills }))}
                suggestions={['Full Time','Web3','Non Technical','NFT','Marketing','DeFi','Internships','Entry Level','Trading','Zero Knowledge','Anti Money Laundering','Human Resources','C++','Memes','Site Reliability Engineering','ReFi','Stablecoin','Full-stack Developer','Developer Relations','iOS','Android Developer','GameFi','Talent Acquisition','Node.js','Search Engine Optimization','AI','DePIN','CEX','Berachain','Real World Assets']}
                placeholder="Enter skills separated by commas or press Enter"
                label="Required Skills & Tags"
                className="mb-4"
              />
            </div>
              <div>
              <label htmlFor="jobLocation" className="block text-orange-400 font-semibold mb-1">Job Location</label>
              <input 
                id="jobLocation"
                name="location" 
                value={jobData.location} 
                onChange={handleChange} 
                placeholder="Leave blank if 100% Remote" 
                className="w-full p-2 rounded bg-black/50 border border-gray-700 text-white focus:ring-2 focus:ring-orange-400 focus:outline-none" 
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="employmentType" className="block text-orange-400 font-semibold mb-1">Employment Type</label>
                <select
                  id="employmentType"
                  name="employmentType"
                  value={jobData.employmentType}
                  onChange={handleChange}
                  className="w-full p-2 rounded bg-black/50 border border-gray-700 text-white focus:ring-2 focus:ring-orange-400 focus:outline-none"
                >
                  <option value="">Select Employment Type</option>
                  <option value="Full-Time">Full-Time</option>
                  <option value="Part-Time">Part-Time</option>
                  <option value="Contract">Contract</option>
                  <option value="Freelance">Freelance</option>
                  <option value="Internship">Internship</option>
                </select>
              </div>
              
              <div>
                <label htmlFor="experienceLevel" className="block text-orange-400 font-semibold mb-1">Experience Level</label>
                <select
                  id="experienceLevel"
                  name="experienceLevel"
                  value={jobData.experienceLevel}
                  onChange={handleChange}
                  className="w-full p-2 rounded bg-black/50 border border-gray-700 text-white focus:ring-2 focus:ring-orange-400 focus:outline-none"
                >
                  <option value="">Select Experience Level</option>
                  <option value="Junior">Junior</option>
                  <option value="Mid-Level">Mid-Level</option>
                  <option value="Senior">Senior</option>
                  <option value="Lead">Lead</option>
                </select>
              </div>
            </div>

            <div>
              <label htmlFor="salaryRange" className="block text-orange-400 font-semibold mb-1">Salary Range</label>
              <input 
                id="salaryRange"
                type="text" 
                name="salaryRange" 
                value={jobData.salaryRange} 
                onChange={handleChange} 
                placeholder="e.g. $60,000-$90,000/year" 
                className="w-full p-2 rounded bg-black/50 border border-gray-700 text-white focus:ring-2 focus:ring-orange-400 focus:outline-none" 
              />
            </div>
          </div>
          <div>
            <label className="block text-orange-400 font-semibold mb-1">Country Filter</label>
            <div className="flex gap-4 mb-2">
              <label><input type="radio" name="countryMode" value="include" checked className="mr-1" readOnly /> Include countries</label>
              <label><input type="radio" name="countryMode" value="exclude" className="mr-1" readOnly /> Exclude countries</label>
            </div>
            {/* Replace with a country/region selection component if needed */}
            <input name="countries" placeholder="Select countries..." className="w-full p-2 rounded bg-black/50 border border-gray-700 text-white" />
          </div>          
          {/* APPLICATION METHOD */}
          <div>
            <label className="block text-orange-400 font-semibold mb-1">Application Method</label>
            <div className="flex gap-4 mb-2">
              <label><input type="radio" name="applicationMethod" value="email" checked={!jobData.applicationLink} onChange={() => setJobData(prev => ({ ...prev, applicationLink: '' }))} /> Email (Recommended)</label>
              <label><input type="radio" name="applicationMethod" value="form" checked={!!jobData.applicationLink} onChange={() => setJobData(prev => ({ ...prev, applicationLink: 'https://' }))} /> Redirect to a form</label>
            </div>
            {!!jobData.applicationLink && (
              <input name="applicationLink" value={jobData.applicationLink} onChange={handleChange} placeholder="https://your-form-link.com" className="w-full p-2 rounded bg-black/50 border border-gray-700 text-white" />
            )}
          </div>
          {/* CV/VIDEO OPTIONS */}
          <div className="flex gap-4 items-center">
            <label><input type="checkbox" name="requireCV" checked={jobData.employmentType === 'requireCV'} onChange={e => setJobData(prev => ({ ...prev, employmentType: e.target.checked ? 'requireCV' : '' }))} /> Require CV attachment</label>
            <label><input type="checkbox" name="allowVideo" checked={jobData.experienceLevel === 'allowVideo'} onChange={e => setJobData(prev => ({ ...prev, experienceLevel: e.target.checked ? 'allowVideo' : '' }))} /> Allow Video Applications</label>
            <label><input type="checkbox" name="requireVideo" checked={jobData.blockchainExperience === 'requireVideo'} onChange={e => setJobData(prev => ({ ...prev, blockchainExperience: e.target.checked ? 'requireVideo' : '' }))} /> Require Video Applications</label>
          </div>
          {/* SCREENING QUESTIONS */}
          <div>
            <label className="block text-orange-400 font-semibold mb-1">Screening Questions</label>
            <div className="flex items-center mb-2">
              <input
                type="checkbox"
                id="enableScreeningQuestions"
                checked={enableScreeningQuestions}
                onChange={e => {
                  setEnableScreeningQuestions(e.target.checked);
                  if (!e.target.checked) setScreeningQuestions([]);
                }}
                className="mr-2"
              />
              <label htmlFor="enableScreeningQuestions" className="text-white">Add custom questions?</label>
            </div>            {enableScreeningQuestions && (
              <div>
                {screeningQuestions.map((q, idx) => (
                  <div key={idx} className="flex items-center mb-2 gap-2">
                    <input
                      type="text"
                      value={q}
                      onChange={e => {
                        const updated = [...screeningQuestions];
                        updated[idx] = e.target.value;
                        setScreeningQuestions(updated);
                          // Update both the legacy question fields and the new screeningQuestions array
                        setJobData(prev => { 
                          const newData = { ...prev };
                          newData[`question${idx+1}`] = e.target.value;
                          
                          // Update the array of screening questions
                          newData.screeningQuestions = updated;
                          return newData;
                        });
                      }}
                      placeholder={`Question ${idx+1}`}
                      className="w-full p-2 rounded bg-black/50 border border-gray-700 text-white"
                    />
                    <button
                      type="button"
                      className="text-red-400 px-2 py-1 rounded hover:bg-red-900/30"
                      onClick={() => {
                        const updated = screeningQuestions.filter((_, i) => i !== idx);
                        setScreeningQuestions(updated);
                        setJobData(prev => {
                          const newData = { ...prev };
                            // Clear all questions
                          for (let i = 1; i <= 5; i++) {
                            delete newData[`question${i}`];
                          }
                          
                          // Reorganize keys to maintain question1, question2, ...
                          updated.forEach((q, i) => {
                            newData[`question${i+1}`] = q;
                          });
                          
                          // Update the array of screening questions
                          newData.screeningQuestions = updated;
                          return newData;
                        });
                      }}
                      aria-label="Remove question"
                    >
                      Remove
                    </button>
                  </div>
                ))}
                {screeningQuestions.length < 5 && (
                  <button
                    type="button"
                    className="text-orange-400 px-2 py-1 rounded hover:bg-orange-900/30 mt-1 text-sm font-medium"
                    onClick={() => {
                      const updated = [...screeningQuestions, ''];
                      setScreeningQuestions(updated);
                      
                      setJobData(prev => {
                        const newData = { ...prev };
                        newData[`question${updated.length}`] = '';
                          // Also update the array of screening questions
                        newData.screeningQuestions = updated;
                        return newData;
                      });
                    }}
                  >
                    + Add question
                  </button>
                )}
              </div>
            )}            <div className="text-gray-400 text-xs mt-2">By default, we ask for CV, LinkedIn, location and others. AI Job Assistant can help generate relevant screening questions.</div>
          </div>
          
          {/* Crypto Payment */}
          <div>
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={jobData.acceptsCryptoPay || false}
                onChange={(e) => setJobData(prev => ({ ...prev, acceptsCryptoPay: e.target.checked }))}
                className="h-4 w-4 accent-orange-500"
              />
              <span className="text-gray-300">Crypto Payment</span>
            </label>
            <p className="text-xs text-gray-400 mt-1">This company can pay salaries and compensation in cryptocurrency.</p>
          </div>          
          {/* --- END OF NEW FORM --- */}          <div className="space-y-6">
            {/* Draft buttons */}            <div className="flex justify-between items-center">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={async () => {
                    const success = await saveJobDraft(currentJobDraftId);
                    if (success) {
                      alert('Draft saved successfully!');
                    } else {
                      alert('Failed to save draft. Please try again.');
                    }
                  }}
                  disabled={isSavingJobDraft}
                  className="bg-gray-600 hover:bg-gray-700 text-white py-2 px-4 rounded text-sm transition-colors disabled:opacity-50"
                >
                  {isSavingJobDraft ? 'Saving...' : 'Save Draft'}
                </button>                <button
                  type="button"
                  onClick={() => {
                    fetchJobDrafts();
                    setShowJobDraftModal(true);
                  }}
                  className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded text-sm transition-colors"
                >
                  Load Draft
                </button>
              </div>
              <button type="submit" className="bg-orange-500 text-white py-2 px-4 rounded text-sm font-semibold hover:bg-orange-600">Continue</button>
            </div>
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
              let plan = selectedPlan;
              if (!plan && jobData.pricingPlanId) {
                plan = pricingPlans.find(p => p.id === jobData.pricingPlanId) || null;
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
      )}      {paymentStep === 'review' && selectedPlan && (
        <div>
          <div className="flex justify-between mb-6">
            <button onClick={() => setPaymentStep('select-plan')} className="bg-gray-700 hover:bg-gray-600 text-white py-2 px-6 rounded-lg">Back to Plans</button>
          </div>
          <h3 className="text-2xl font-semibold text-orange-500 mb-4">Review Your Order</h3>
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
              </button>              {/* Only show the error message once below the button */}
              {paymentError && (
                <div className="mt-3 text-red-500 text-sm">{paymentError}</div>
              )}
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
        </div>      )}

      {/* Job Drafts Modal */}
      {showJobDraftModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-black/90 border border-orange-500/30 rounded-lg p-6 w-full max-w-2xl max-h-[80vh] overflow-hidden">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-orange-400">Load Job Draft</h3>
              <button
                onClick={() => setShowJobDraftModal(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="overflow-y-auto max-h-[60vh]">
              {isLoadingJobDrafts ? (
                <div className="text-center py-8 text-gray-300">Loading drafts...</div>
              ) : jobDrafts.length === 0 ? (
                <div className="text-center py-8 text-gray-300">No drafts found.</div>
              ) : (
                <div className="space-y-3">
                  {jobDrafts.map((draft) => (
                    <div
                      key={draft.id}
                      className="bg-black/60 border border-orange-900/30 rounded-lg p-4 hover:border-orange-500/50 transition-colors"
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h4 className="font-medium text-orange-400 mb-1">
                            {draft.title || 'Untitled Draft'}
                          </h4>
                          <p className="text-sm text-gray-400 mb-2">
                            Last updated: {draft.updatedAt ? new Date(draft.updatedAt.seconds ? draft.updatedAt.seconds * 1000 : draft.updatedAt).toLocaleDateString() : 'Unknown'}
                          </p>
                          {draft.category && (
                            <p className="text-xs text-gray-500">Category: {draft.category}</p>
                          )}
                        </div>
                        <div className="flex gap-2 ml-4">
                          <button
                            onClick={async () => {
                              const success = await loadJobDraft(draft.id);
                              if (success) {
                                // Modal will be closed by loadJobDraft
                              } else {
                                alert('Failed to load draft. Please try again.');
                              }
                            }}
                            className="bg-orange-500 hover:bg-orange-600 text-white px-3 py-1 rounded text-sm transition-colors"
                          >
                            Load
                          </button>
                          <button
                            onClick={async () => {
                              if (confirm('Are you sure you want to delete this draft?')) {
                                const success = await deleteJobDraft(draft.id);
                                if (!success) {
                                  alert('Failed to delete draft. Please try again.');
                                }
                              }
                            }}
                            className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-sm transition-colors"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <div className="flex justify-end mt-6">
              <button
                onClick={() => setShowJobDraftModal(false)}
                className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default JobPostPayment;