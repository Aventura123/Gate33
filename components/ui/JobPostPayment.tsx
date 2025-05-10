import React, { useState, useEffect, useCallback, FormEvent, ChangeEvent } from "react";
import web3Service from "../../services/web3Service";
import smartContractService from "../../services/smartContractService";
import { db } from "../../lib/firebase";
import { collection, addDoc, getDoc, doc, getDocs, QueryDocumentSnapshot, DocumentData } from "firebase/firestore";

interface PricingPlan {
  id: string;
  name: string;
  price: number;
  duration: number;
  features: string[];
  recommended?: boolean;
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
  // Estados e lógica idênticos ao fluxo original da dashboard
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
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [walletError, setWalletError] = useState<string | null>(null);
  const [pricingPlans, setPricingPlans] = useState<PricingPlan[]>([]);

  // Buscar planos de preço
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
      setPaymentError("Erro ao buscar planos de preço");
    }
  }, []);

  useEffect(() => { fetchPricingPlans(); }, [fetchPricingPlans]);

  // --- NOVO: Sincronizar com wallet global ---
  useEffect(() => {
    // Função para atualizar o estado local com a wallet global
    const updateWalletInfo = () => {
      try {
        const walletInfo = web3Service.getWalletInfo ? web3Service.getWalletInfo() : null;
        if (walletInfo && walletInfo.address) {
          setWalletAddress(walletInfo.address);
        } else {
          setWalletAddress(null);
        }
      } catch {
        setWalletAddress(null);
      }
    };
    updateWalletInfo();
    // Listeners para eventos globais
    const handleWeb3Connected = (e: any) => {
      setWalletAddress(e.detail?.address || null);
    };
    const handleWeb3Disconnected = () => {
      setWalletAddress(null);
    };
    const handleChainChanged = () => {
      updateWalletInfo();
    };
    const handleAccountsChanged = () => {
      updateWalletInfo();
    };
    window.addEventListener('web3Connected', handleWeb3Connected);
    window.addEventListener('web3Disconnected', handleWeb3Disconnected);
    window.addEventListener('chainChanged', handleChainChanged);
    window.addEventListener('accountsChanged', handleAccountsChanged);
    return () => {
      window.removeEventListener('web3Connected', handleWeb3Connected);
      window.removeEventListener('web3Disconnected', handleWeb3Disconnected);
      window.removeEventListener('chainChanged', handleChainChanged);
      window.removeEventListener('accountsChanged', handleAccountsChanged);
    };
  }, []);

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
    if (!selectedPlan) {
      setPaymentError("Please select a pricing plan");
      return;
    }
    setPaymentError(null);
    setIsProcessingPayment(true);
    setPaymentStep('processing');
    try {
      let currentAddress = walletAddress;
      if (!currentAddress) {
        const walletInfo = await web3Service.connectWallet();
        currentAddress = walletInfo?.address;
        if (currentAddress) setWalletAddress(walletInfo.address);
        else throw new Error("Could not get wallet address");
      }
      // Simulação: pagamento via smart contract
      const transaction = await smartContractService.processJobPayment(selectedPlan.id, selectedPlan.price, companyId);
      if (!transaction || !transaction.transactionHash) throw new Error("Transaction failed");
      // Salvar pagamento
      const paymentsCollection = collection(db, "payments");
      const paymentRef = await addDoc(paymentsCollection, {
        planId: selectedPlan.id,
        planName: selectedPlan.name,
        amount: selectedPlan.price,
        companyId,
        status: "completed",
        createdAt: new Date(),
        transactionHash: transaction.transactionHash,
        blockNumber: transaction.blockNumber
      });
      // Salvar job
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
        featured: selectedPlan.name.toLowerCase().includes('premium') || selectedPlan.name.toLowerCase().includes('featured'),
        priorityListing: selectedPlan.name.toLowerCase().includes('premium'),
      };
      await addDoc(jobCollection, jobToSave);
      setJobData((prev) => ({ ...prev, paymentStatus: "completed", paymentId: paymentRef.id }));
      setPaymentStep('completed');
      reloadData();
    } catch (error: any) {
      setPaymentError(error.message || "Payment failed. Please try again.");
      setJobData((prev) => ({ ...prev, paymentStatus: "failed" }));
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

  // Renderização
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
                <div className="text-3xl font-bold text-white my-2">${plan.price}</div>
                <p className="text-gray-400 mb-4">{plan.duration} days listing</p>
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
              <div className="text-2xl font-bold text-white">${selectedPlan.price}</div>
            </div>
            <div className="space-y-2 mb-6">
              <div className="flex justify-between font-bold">
                <span className="text-gray-300">Total:</span>
                <span className="text-orange-500">${selectedPlan.price}</span>
              </div>
            </div>
            <div className="mb-4 p-3 rounded-lg border border-gray-700">
              <div className="flex justify-between items-center">
                <span className="text-gray-300">Wallet Connection:</span>
                <span className={walletAddress ? "text-green-500" : "text-yellow-500"}>{walletAddress ? "Connected" : "Not Connected"}</span>
              </div>
              <div className="mt-2 text-sm text-gray-400 break-all">{walletAddress ? `Address: ${walletAddress}` : "No wallet connected"}</div>
              {walletError && <div className="mt-2 text-sm text-red-500">Error: {walletError}</div>}
            </div>
            <div className="flex flex-col space-y-3">
              <button onClick={processPayment} disabled={isProcessingPayment || !walletAddress} className={`w-full bg-orange-500 text-white py-3 rounded-lg font-semibold hover:bg-orange-600 transition ${isProcessingPayment ? "opacity-70 cursor-not-allowed" : ""} ${!walletAddress ? "opacity-50 cursor-not-allowed" : ""}`}>{isProcessingPayment ? (<span className="flex items-center justify-center"><svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>Processing Payment...</span>) : walletAddress ? "Complete Payment & Post Job" : "Connect Wallet First"}</button>
              <button onClick={() => setPaymentStep('select-plan')} disabled={isProcessingPayment} className="w-full bg-transparent border border-gray-600 text-gray-300 py-3 rounded-lg font-semibold hover:bg-gray-800 transition">Change Plan</button>
            </div>
            {paymentError && <div className="mt-4 bg-red-500/20 border border-red-500 text-red-500 p-3 rounded-lg">{paymentError}</div>}
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
          <p className="text-gray-300">Your payment has been processed successfully. You can now complete your job posting.</p>
          <button onClick={resetPaymentFlow} className="mt-4 bg-orange-500 text-white py-3 px-8 rounded-lg font-semibold hover:bg-orange-600 transition">Post Another Job</button>
        </div>
      )}
    </div>
  );
};

export default JobPostPayment;