import React, { useState, useEffect, useCallback, FormEvent, ChangeEvent } from "react";
import web3Service from "../../services/web3Service";
import smartContractService from "../../services/smartContractService";
import { db } from "../../lib/firebase";
import { collection, addDoc, getDoc, doc, getDocs, QueryDocumentSnapshot, DocumentData } from "firebase/firestore";
import jobService from "../../services/jobService";
import { useWallet } from '../../components/WalletProvider';
import AIJobAssistant from "./AIJobAssistant";

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

 // Extend the interface to include dynamic questions and new fields for the AI Job Assistant
interface JobDataType {
  title: string;
  description: string;
  category: string;
  company: string;
  requiredSkills: string;
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
  // AI Job Assistant fields - reintegrated
  responsibilities: string;
  idealCandidate: string;
  screeningQuestions?: string[];
  [key: `question${number}`]: string | undefined;
}

const JobPostPayment: React.FC<JobPostPaymentProps> = ({ companyId, companyProfile, reloadData }) => {
  // States and logic identical to the original dashboard flow
  const [jobData, setJobData] = useState<JobDataType>({
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
    paymentId: "",
    // Reintegrating the specific fields
    responsibilities: "",
    idealCandidate: "",
    screeningQuestions: []
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
        planCurrency: planCurrency || 'NATIVE',        featured: selectedPlan.features?.includes('Featured in Job Listing') || selectedPlan.name.toLowerCase().includes('premium') || selectedPlan.name.toLowerCase().includes('featured'),
        priorityListing: selectedPlan.name.toLowerCase().includes('premium'),
        // Company info
        companyName: companyProfile.name || jobData.company,
        companyWebsite: companyProfile.website || '',
        companyDescription: companyProfile.description || '',
        companyLocation: companyProfile.location || '',
        // Manager info
        managerName: companyProfile.responsiblePerson || '',
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

  // State for screening questions
  const [enableScreeningQuestions, setEnableScreeningQuestions] = useState(false);
  const [screeningQuestions, setScreeningQuestions] = useState<string[]>([]);

  // Render
  return (
    <div className="bg-black/70 p-8 rounded-lg shadow-lg">
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
              <label className="block text-orange-400 font-semibold mb-1">Job Description *</label>
              {/* Rich text can be replaced by an editor later */}
              <textarea 
                name="description" 
                value={jobData.description} 
                onChange={handleChange} 
                required 
                rows={10} 
                className="w-full p-2 rounded bg-black/50 border border-gray-700 text-white"
                placeholder="Enter a complete job description"
              />
              <p className="text-xs text-gray-400 mt-1">Include details about the position and technical requirements.</p>
            </div>
            
            <div>
              <label className="block text-orange-400 font-semibold mb-1">Responsibilities</label>
              <textarea 
                name="responsibilities" 
                value={jobData.responsibilities} 
                onChange={handleChange} 
                rows={6} 
                className="w-full p-2 rounded bg-black/50 border border-gray-700 text-white"
                placeholder="List key responsibilities for this role. Use bullet points (•) for better readability."
              />
              <p className="text-xs text-gray-400 mt-1">Describe the main tasks and responsibilities of the position. Use bullet points • or - for better readability.</p>
            </div>
            
            <div>
              <label className="block text-orange-400 font-semibold mb-1">Ideal Candidate</label>
              <textarea 
                name="idealCandidate" 
                value={jobData.idealCandidate} 
                onChange={handleChange} 
                rows={6} 
                className="w-full p-2 rounded bg-black/50 border border-gray-700 text-white"
                placeholder="Describe your ideal candidate's profile, including soft skills and cultural fit"
              />
              <p className="text-xs text-gray-400 mt-1">Describe the ideal candidate profile, including soft skills and cultural fit. Use bullet points • or - for better readability.</p>
            </div>
            
            {/* Unified Skills Input Section */}
            <div>
              <label className="block text-orange-400 font-semibold mb-1">Required Skills</label>
              <div className="mb-2">
                <input 
                  name="requiredSkills"
                  type="text"
                  value={jobData.requiredSkills} 
                  onChange={handleChange} 
                  className="w-full p-2 rounded bg-black/50 border border-gray-700 text-white"
                  placeholder="Enter skills separated by commas or select from below"
                />
                <p className="text-xs text-gray-400 mt-1">Click on tags below to add or remove skills, or type custom skills above.</p>
              </div>
              
              {/* Display selected skills as tags */}
              {jobData.requiredSkills && (
                <div className="mt-3 mb-4">
                  <label className="block text-sm text-gray-300 mb-1">Selected Skills:</label>
                  <div className="flex flex-wrap gap-2">
                    {jobData.requiredSkills.split(',').map((skill, index) => {
                      const trimmedSkill = skill.trim();
                      if (!trimmedSkill) return null;
                      
                      return (
                        <div key={index} className="bg-orange-500 text-white px-3 py-1 rounded-full text-sm flex items-center">
                          {trimmedSkill}
                          <button 
                            type="button"
                            onClick={() => {
                              const skills = jobData.requiredSkills.split(',')
                                .map(s => s.trim())
                                .filter(s => s !== trimmedSkill)
                                .join(', ');
                              setJobData(prev => ({ ...prev, requiredSkills: skills }));
                            }}
                            className="ml-2 text-white hover:text-orange-200"
                          >
                            ✕
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Common Skill Tags */}
              <div className="flex flex-wrap gap-2">
                {['Full Time','Web3','Non Technical','NFT','Marketing','DeFi','Internships','Entry Level','Trading','Zero Knowledge','Anti Money Laundering','Human Resources','C++','Memes','Site Reliability Engineering','ReFi','Stablecoin','Full-stack Developer','Developer Relations','iOS','Android Developer','GameFi','Talent Acquisition','Node.js','Search Engine Optimization','AI','DePIN','CEX','Berachain','Real World Assets'].map(tag => (
                  <button 
                    type="button" 
                    key={tag} 
                    onClick={() => {
                      const skills = jobData.requiredSkills;
                      const skillsArray = skills ? skills.split(',').map(s => s.trim()) : [];
                      const exists = skillsArray.includes(tag);
                      
                      let newSkills;
                      if (exists) {
                        newSkills = skillsArray.filter(s => s !== tag).join(', ');
                      } else {
                        newSkills = skills ? `${skills}, ${tag}` : tag;
                      }
                      
                      setJobData(prev => ({ ...prev, requiredSkills: newSkills }));
                    }} 
                    className={`px-3 py-1 rounded-full border text-sm ${jobData.requiredSkills.includes(tag) ? 'bg-orange-500 text-white border-orange-500' : 'bg-black/50 text-gray-300 border-gray-700'}`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>
            
            <div>
              <label className="block text-orange-400 font-semibold mb-1">Job Location</label>
              <input name="location" value={jobData.location} onChange={handleChange} placeholder="Leave blank if 100% Remote" className="w-full p-2 rounded bg-black/50 border border-gray-700 text-white" />
            </div>
            <div className="flex gap-2 items-end">
              <div>
                <label className="block text-orange-400 font-semibold mb-1">Salary Range</label>
                <div className="flex gap-2">
                  <input name="salaryMin" type="number" min="0" placeholder="Min" className="w-24 p-2 rounded bg-black/50 border border-gray-700 text-white" onChange={e => setJobData(prev => ({ ...prev, salaryRange: `${e.target.value}-${(prev.salaryRange.split('-')[1] || '')}` }))} />
                  <span className="text-gray-400">-</span>
                  <input name="salaryMax" type="number" min="0" placeholder="Max" className="w-24 p-2 rounded bg-black/50 border border-gray-700 text-white" onChange={e => setJobData(prev => ({ ...prev, salaryRange: `${(prev.salaryRange.split('-')[0] || '')}-${e.target.value}` }))} />
                  <select name="salaryCurrency" className="p-2 rounded bg-black/50 border border-gray-700 text-white">
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                    <option value="BRL">BRL</option>
                  </select>
                  <select name="salaryPeriod" className="p-2 rounded bg-black/50 border border-gray-700 text-white">
                    <option value="Year">Year</option>
                    <option value="Month">Month</option>
                    <option value="Hour">Hour</option>
                  </select>
                </div>
              </div>
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
            )}
            <div className="text-gray-400 text-xs mt-2">By default, we ask for CV, LinkedIn, location and others. AI Job Assistant can help generate relevant screening questions.</div>
          </div>
          {/* --- END OF NEW FORM --- */}
          <div className="space-y-6">
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