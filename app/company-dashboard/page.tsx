"use client";

import React, { useState, useEffect, JSX, useCallback } from "react";
import Layout from "../../components/Layout";
import { useRouter } from "next/navigation";
import { collection, addDoc, getDocs, deleteDoc, doc, query, where, getDoc, updateDoc } from "firebase/firestore";
import { db } from "../../lib/firebase";
// Import payment related services
import { connectWallet, getCurrentAddress, getWeb3Provider } from "../../services/crypto";
import smartContractService from "../../services/smartContractService";
// Import learn2earnContractService
// Import learn2earnContractService
import learn2earnContractService from "../../services/learn2earnContractService";
// Import the Learn2Earn interfaces
import { Learn2Earn, Learn2EarnTask, NewLearn2Earn } from "../../types/learn2earn";
// Importando os serviços e componentes necessários para Instant Jobs
import instantJobsService, { InstantJob, JobMessage } from '../../services/instantJobsService';
import InstantJobCard from '../../components/instant-jobs/InstantJobCard';
import MessageSystem from '../../components/instant-jobs/MessageSystem';

// Define job pricing plans
interface PricingPlan {
  id: string;
  name: string;
  price: number;
  duration: number; // in days
  features: string[];
  recommended?: boolean;
}

interface Job {
  id: string;
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
  createdAt?: import("firebase/firestore").Timestamp;
  // Add payment related fields
  pricingPlanId?: string;
  paymentStatus?: 'pending' | 'completed' | 'failed';
  paymentId?: string;
  expiresAt?: import("firebase/firestore").Timestamp;
}

// Add an interface for Company Profile
interface CompanyProfile {
  name: string;
  description: string;
  website: string;
  location: string;
  responsiblePerson?: string; // Optional field
  address?: string;         // Optional field
  contactPhone?: string;    // Optional field
  // Add other relevant fields as needed
}

const PostJobPage = (): JSX.Element => {
  const [jobData, setJobData] = useState({
    title: "",
    description: "",
    category: "",
    company: "", // Ensure initial value is defined
    requiredSkills: "",
    salaryRange: "",
    location: "",
    employmentType: "",
    experienceLevel: "",
    blockchainExperience: "",
    remoteOption: "",
    contactEmail: "",
    applicationLink: "",
    // Initialize payment fields
    pricingPlanId: "",
    paymentStatus: "pending" as 'pending' | 'completed' | 'failed',
    paymentId: "" // Add paymentId field
  });
  const [activeTab, setActiveTab] = useState("newJob");
  const [userPhoto, setUserPhoto] = useState(""); 
  const [isUploading, setIsUploading] = useState(false);
  const [companyId, setCompanyId] = useState("");
  const [jobs, setJobs] = useState<Job[]>([]);
  const [notifications, setNotifications] = useState<string[]>([]); // State for notifications
  // Add state for company profile data with new fields initialized
  const [companyProfile, setCompanyProfile] = useState<CompanyProfile>({
    name: "",
    description: "",
    website: "",
    location: "",
    responsiblePerson: "", // Initialize new fields
    address: "",
    contactPhone: "",
  });
  const [isLoadingProfile, setIsLoadingProfile] = useState(false); // Loading state for profile
  const router = useRouter();

  // Add new state variables for payment processing
  const [selectedPlan, setSelectedPlan] = useState<PricingPlan | null>(null);
  const [paymentStep, setPaymentStep] = useState<'select-plan' | 'review' | 'processing' | 'completed'>('select-plan');
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  // Add a state to track job submission step
  const [jobSubmissionStep, setJobSubmissionStep] = useState<'form' | 'payment' | 'confirmation'>('form');
  const [tempJobData, setTempJobData] = useState<any>(null); // To store job data before payment

  const [pricingPlans, setPricingPlans] = useState<PricingPlan[]>([]); // Estado para armazenar os planos de preços

  // Add Web3 state
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [isConnectingWallet, setIsConnectingWallet] = useState(false);
  const [walletError, setWalletError] = useState<string | null>(null);

  // Add state for learn2earn
  const [learn2earn, setLearn2Earn] = useState<Learn2Earn[]>([]);
  const [isLoadingLearn2Earn, setIsLoadingLearn2Earn] = useState(false);
  // Add state for fee percentage
  const [feePercent, setFeePercent] = useState<number>(5); // Default to 5% if not loaded from Firebase

  // Instant Jobs states
  const [instantJobs, setInstantJobs] = useState<InstantJob[]>([]);
  const [selectedJob, setSelectedJob] = useState<InstantJob | null>(null);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [jobMessages, setJobMessages] = useState<JobMessage[]>([]);
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [activeSection, setActiveSection] = useState<'list' | 'create' | 'detail'>('list');
  const [newInstantJobData, setNewInstantJobData] = useState({
    title: '',
    description: '',
    category: '',
    budget: 0,
    currency: 'ETH',
    deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    requiredSkills: ''
  });
  
  // Update the learn2earnData state to properly type the dates
  const [learn2earnData, setLearn2EarnData] = useState<Omit<Learn2Earn, 'id' | 'companyId'>>({
    title: "",
    description: "",
    tokenSymbol: "",
    tokenAmount: 0,
    tokenAddress: "",
    tokenPerParticipant: 0,
    totalParticipants: 0,
    maxParticipants: undefined,
    startDate: null, // Initialize as null instead of undefined
    endDate: null,   // Initialize as null instead of undefined
    tasks: [],
    status: 'draft',
    contractAddress: "",
    transactionHash: "",
    socialLinks: {
      discord: "",
      telegram: "",
      twitter: "",
      website: ""
    },
    network: '',
  });
  const [currentTask, setCurrentTask] = useState<Omit<Learn2EarnTask, 'id'>>({
    type: 'content',
    title: "",
    description: "",
    contentText: "",
  });
  const [currentQuestionOptions, setCurrentQuestionOptions] = useState<string[]>(['', '', '', '']);
  const [correctOptionIndex, setCorrectOptionIndex] = useState<number>(0);
  // Update the learn2earnStep type to ensure TypeScript recognizes it properly
  const [learn2EarnStep, setLearn2EarnStep] = useState<'info' | 'tasks' | 'deposit' | 'confirmation'>('info');

  const [isProcessingDeposit, setIsProcessingDeposit] = useState(false);
  const [depositError, setDepositError] = useState<string | null>(null);
  const [isDepositConfirmed, setIsDepositConfirmed] = useState(false);

  // Função para buscar os planos de preços do Firebase
  const fetchPricingPlans = useCallback(async () => {
    try {
      if (!db) throw new Error("Firestore is not initialized");

      const pricingPlansCollection = collection(db, "jobPlans"); // Corrigido para "jobPlans"
      const pricingPlansSnapshot = await getDocs(pricingPlansCollection);

      const fetchedPlans = pricingPlansSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as PricingPlan[];

      setPricingPlans(fetchedPlans);
    } catch (error) {
      console.error("Error fetching pricing plans:", error);
    }
  }, []);

  // Fetch fee percentage from Firebase
  const fetchFeePercentage = useCallback(async () => {
    try {
      if (!db) return;
      const settingsCollection = collection(db, "settings");
      const settingsSnapshot = await getDocs(settingsCollection);
      
      if (!settingsSnapshot.empty) {
        // Find the document containing feePercent
        const settingsDoc = settingsSnapshot.docs.find(doc => doc.data().feePercent !== undefined);
        if (settingsDoc) {
          const data = settingsDoc.data();
          setFeePercent(data.feePercent || 5);
          console.log("Fee percentage loaded from Firebase:", data.feePercent);
        }
      }
    } catch (error) {
      console.error("Error fetching fee percentage:", error);
      // Default to 5% if there's an error
      setFeePercent(5);
    }
  }, [db]);

  // Buscar os planos de preços ao montar o componente
  useEffect(() => {
    fetchPricingPlans();
  }, [fetchPricingPlans]);

  const checkAuthentication = () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        throw new Error("Token not found");
      }
      const decodedToken = atob(token);
      setCompanyId(decodedToken);
      fetchCompanyPhoto(decodedToken);
    } catch (error) {
      console.error("Error decoding token:", error);
      router.replace("/admin-login");
    }
  };

  const fetchCompanyPhoto = async (id: string) => {
    try {
      const response = await fetch(`/api/company/photo?companyId=${id}`);
      if (response.ok) {
        const data = await response.json();
        if (data.photoUrl) {
          setUserPhoto(data.photoUrl); // Ensure photo is fetched from Firebase
        } else {
          setUserPhoto(""); // Clear photo if not found
        }
      }
    } catch (error) {
      console.error("Error fetching company photo:", error);
      setUserPhoto(""); // Clear photo on error
    }
  };

  // Function to fetch company profile data
  const fetchCompanyProfile = useCallback(async (id: string) => {
    if (!id || !db) return;
    setIsLoadingProfile(true);
    try {
      const companyRef = doc(db, "companies", id); // Assuming 'companies' collection
      const companySnap = await getDoc(companyRef);
      if (companySnap.exists()) {
        const data = companySnap.data();
        // Ensure all fields have default string values if undefined/null
        setCompanyProfile({
          name: data.name || "",
          description: data.description || "",
          website: data.website || "",
          location: data.location || "",
          responsiblePerson: data.responsiblePerson || "",
          address: data.address || "",
          contactPhone: data.contactPhone || "",
        });
        // Also update the company name in the job form if it's empty
        if (!jobData.company) {
          setJobData(prev => ({ ...prev, company: data.name || '', paymentId: jobData.paymentId || "" }));
        }
      } else {
        console.log("No such company document!");
        // Initialize profile state with empty strings if document doesn't exist
        setCompanyProfile({
          name: "", description: "", website: "", location: "",
          responsiblePerson: "", address: "", contactPhone: ""
        });
      }
    } catch (error) {
      console.error("Error fetching company profile:", error);
    } finally {
      setIsLoadingProfile(false);
    }
  }, [jobData.company]); // Add jobData.company dependency

  // Updated reloadData to include profile fetching
  const reloadData = useCallback(async () => {
    console.log("Reloading company dashboard data...");
    try {
      if (!db) throw new Error("Firestore is not initialized");

      // Reload jobs (only if companyId is known)
      if (companyId) {
        const jobCollection = collection(db, "jobs");
        // Query jobs specifically for this company
        const q = query(jobCollection, where("companyId", "==", companyId));
        const jobSnapshot = await getDocs(q);
        const fetchedJobs: Job[] = jobSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt || null, // Ensure createdAt is included
        } as Job));
        setJobs(fetchedJobs);

        // Reload company photo
        fetchCompanyPhoto(companyId);
        // Reload company profile
        fetchCompanyProfile(companyId);
      }

      console.log("Data reloaded successfully!");
    } catch (error) {
      console.error("Error reloading data:", error);
    }
  }, [companyId, fetchCompanyProfile]); // Add fetchCompanyProfile dependency

  // Fetch initial data on mount and when companyId changes
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      try {
        if (!token) {
          throw new Error("Token is missing or invalid.");
        }
        const decodedToken = atob(token);
        setCompanyId(decodedToken);
        // Fetch data once companyId is set
        fetchCompanyPhoto(decodedToken);
        fetchCompanyProfile(decodedToken); // Fetch profile initially
        // Fetch jobs related to this company
        const fetchInitialJobs = async () => {
          if (!db) return;
          const jobCollection = collection(db, "jobs");
          const q = query(jobCollection, where("companyId", "==", decodedToken));
          const jobSnapshot = await getDocs(q);
          const fetchedJobs: Job[] = jobSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Job));
          setJobs(fetchedJobs);
        };
        fetchInitialJobs();
      } catch (error) {
        console.error("Error decoding token or fetching initial data:", error);
        router.replace("/admin-login");
      }
    } else {
      router.replace("/admin-login");
    }
  }, [router, fetchCompanyProfile]); // Add fetchCompanyProfile dependency

  // Fix the conditional in the useEffect for reloading data
  useEffect(() => {
    if (activeTab === "myJobs" || activeTab === "settings") {
      reloadData();
    }
  }, [activeTab, reloadData]);

  // Function to fetch notifications
  const fetchNotifications = useCallback(async () => {
    if (!db || !companyId) return;
    try {
      const jobCollection = collection(db, "jobs");
      const q = query(jobCollection, where("companyId", "==", companyId));
      const jobSnapshot = await getDocs(q);
  
      const fetchedNotifications: string[] = [];
      const currentDate = new Date();
  
      jobSnapshot.docs.forEach((doc) => {
        const jobData = doc.data();
        const createdAt = jobData.createdAt?.toDate(); // Assuming Firestore timestamp
        if (createdAt) {
          const diffDays = Math.floor((currentDate.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24));
          if (diffDays === 5) {
            fetchedNotifications.push(`Your job "${jobData.title}" will expire in 25 days.`);
          }
        }
      });
  
      setNotifications(fetchedNotifications);
    } catch (error) {
      console.error("Error fetching notifications:", error);
    }
  }, [db, companyId]);
  
  // Fetch notifications when the "notifications" tab is active
  useEffect(() => {
    if (activeTab === "notifications") {
      fetchNotifications();
    }
  }, [activeTab, fetchNotifications]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    // Ensure value is always a string
    setJobData({ ...jobData, [name]: value ?? "" });
  };

  // Handle changes in the profile form
  const handleProfileChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    // Ensure value is always a string
    setCompanyProfile({ ...companyProfile, [name]: value ?? "" });
  };

  const handleUserPhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && companyId) {
      // Show a preview of the image
      const reader = new FileReader();
      reader.onloadend = () => {
        setUserPhoto(reader.result as string);
      };
      reader.readAsDataURL(file);

      // Send the image to the server
      setIsUploading(true);
      
      const formData = new FormData();
      formData.append("file", file);
      formData.append("companyId", companyId);

      try {
        console.log("Sending file to server...", {
          fileName: file.name,
          fileType: file.type,
          fileSize: file.size,
          companyId
        });
        
        const response = await fetch("/api/company/photo", {
          method: "POST",
          body: formData,
        });
        
        console.log("Response received from server:", {
          status: response.status,
          statusText: response.statusText
        });

        const responseData = await response.json();
        console.log("Response data:", responseData);
        
        if (!response.ok) {
          throw new Error(responseData.message || "Failed to upload photo");
        }

        // Update the photo with the URL returned by the server
        setUserPhoto(responseData.url);
        console.log("Upload completed successfully!");
        
        // Reload the data to ensure everything is updated
        reloadData();
      } catch (error: any) {
        console.error("Detailed error while uploading company photo:", error);
        alert(`Failed to upload photo: ${error.message || "Unknown error"}`);
      } finally {
        setIsUploading(false);
      }
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    router.replace("/login");
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoadingProfile(true);
    try {
      if (!db || !companyId) throw new Error("Firestore is not initialized or companyId is missing");

      const companyRef = doc(db, "companies", companyId);
      await updateDoc(companyRef, {
        ...companyProfile,
      });

      alert("Profile updated successfully!");
    } catch (error) {
      console.error("Error updating profile:", error);
      alert("Failed to update profile. Please try again.");
    } finally {
      setIsLoadingProfile(false);
    }
  };

  // Handle pricing plan selection
  const handlePlanSelect = (plan: PricingPlan) => {
    setSelectedPlan(plan);
    setJobData({
      ...jobData,
      pricingPlanId: plan.id,
      paymentId: jobData.paymentId || ""
    });
    setPaymentStep('review');
  };

  // Function to handle wallet connection
  const handleConnectWallet = async () => {
    try {
      setIsConnectingWallet(true);
      setWalletError(null);
      
      // Importar o web3Service diretamente para garantir que estamos usando a mesma instância
      const { web3Service } = await import('../../services/web3Service');
      
      // Usar o web3Service para conectar a carteira
      const walletInfo = await web3Service.connectWallet();
      
      if (walletInfo && walletInfo.address) {
        setWalletAddress(walletInfo.address);
        console.log("Wallet connected successfully:", walletInfo);
        
        // Disparar evento para outros componentes saberem que a carteira foi conectada
        window.dispatchEvent(new CustomEvent('web3Connected', { 
          detail: { address: walletInfo.address, chainId: walletInfo.chainId } 
        }));
      } else {
        throw new Error("Could not get wallet address");
      }
    } catch (error: any) {
      console.error("Failed to connect wallet:", error);
      setWalletError(error.message || "Failed to connect wallet");
    } finally {
      setIsConnectingWallet(false);
    }
  };

  // Modified processPayment function to use your smart contract correctly
  const processPayment = async () => {
    console.log("[processPayment] Iniciando fluxo de pagamento...");
    if (!selectedPlan) {
      console.error("[processPayment] Nenhum plano selecionado");
      setPaymentError("Please select a pricing plan");
      return;
    }

    setPaymentError(null);
    setIsProcessingPayment(true);
    setPaymentStep('processing');
    try {
      // 1. Garantir que a carteira está conectada
      let currentAddress = walletAddress;
      if (!currentAddress) {
        console.log("[processPayment] Nenhuma carteira conectada, conectando...");
        try {
          await connectWallet();
          currentAddress = await getCurrentAddress();
          if (currentAddress) {
            setWalletAddress(currentAddress);
            console.log("[processPayment] Carteira conectada:", currentAddress);
          } else {
            throw new Error("Could not get wallet address");
          }
        } catch (error: any) {
          console.error("[processPayment] Falha ao conectar carteira:", error);
          throw new Error(`Failed to connect wallet: ${error.message}`);
        }
      }
      if (!currentAddress) {
        throw new Error("Wallet connection is required to complete payment");
      }
      console.log("[processPayment] Endereço da carteira para pagamento:", currentAddress);

      // 2. Executar pagamento via smart contract
      let transaction;
      try {
        // Check if the plan requires USDT payment
        const planDoc = await getDoc(doc(db, "jobPlans", selectedPlan.id));
        if (!planDoc.exists()) {
          throw new Error(`Job plan with ID ${selectedPlan.id} not found`);
        }
        
        const planData = planDoc.data();
        const planCurrency = planData.currency?.toUpperCase();
        
        // Use the appropriate payment method based on currency
        if (planCurrency === 'USDT') {
          console.log("[processPayment] Detected USDT payment, using USDT payment method");
          transaction = await smartContractService.processJobPaymentWithUSDT(
            selectedPlan.id,
            selectedPlan.price,
            companyId
          );
        } else {
          console.log("[processPayment] Using native token payment method");
          transaction = await smartContractService.processJobPayment(
            selectedPlan.id,
            selectedPlan.price,
            companyId
          );
        }
        
        console.log("[processPayment] Transação recebida:", transaction);
      } catch (error: any) {
        console.error("[processPayment] Erro ao processar pagamento no contrato:", error);
        throw new Error(error.message || "Erro ao processar pagamento no contrato");
      }
      if (!transaction || !transaction.transactionHash) {
        throw new Error("Transaction failed - no transaction hash received");
      }

      // 3. Salvar registro de pagamento no Firestore
      if (!db) throw new Error("Firestore is not initialized");
      let paymentRef;
      try {
        const paymentsCollection = collection(db, "payments");
        paymentRef = await addDoc(paymentsCollection, {
          planId: selectedPlan.id,
          planName: selectedPlan.name,
          amount: selectedPlan.price,
          companyId,
          status: "completed",
          createdAt: new Date(),
          transactionHash: transaction.transactionHash,
          blockNumber: transaction.blockNumber
        });
        console.log("[processPayment] Pagamento salvo no Firestore, paymentId:", paymentRef.id);
      } catch (error: any) {
        console.error("[processPayment] Erro ao salvar pagamento no Firestore:", error);
        throw new Error("Erro ao salvar pagamento no banco de dados. O pagamento foi realizado, mas o job não foi salvo.");
      }

      // 4. Salvar o job no Firestore
      let jobRef;
      try {
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
        jobRef = await addDoc(jobCollection, jobToSave);
        console.log("[processPayment] Job salvo no Firestore, jobId:", jobRef.id);
      } catch (error: any) {
        console.error("[processPayment] Erro ao salvar job no Firestore:", error);
        throw new Error("Erro ao salvar o job no banco de dados. O pagamento foi realizado, mas o job não foi salvo.");
      }

      setJobData(prev => ({
        ...prev,
        paymentStatus: "completed",
        paymentId: paymentRef.id,
      }));
      setPaymentStep('completed');

      // 5. Notificação para admin
      try {
        const notificationsCollection = collection(db, "adminNotifications");
        await addDoc(notificationsCollection, {
          type: "payment",
          message: `New payment received from ${companyProfile.name} for ${selectedPlan.name} Plan`,
          amount: selectedPlan.price,
          companyId,
          transactionHash: transaction.transactionHash,
          read: false,
          createdAt: new Date()
        });
        console.log("[processPayment] Notificação de admin criada");
      } catch (error: any) {
        console.error("[processPayment] Erro ao criar notificação de admin:", error);
        // Não interrompe o fluxo principal
      }

      setJobSubmissionStep('confirmation');
      reloadData();
    } catch (error: any) {
      console.error("[processPayment] Erro geral:", error);
      setPaymentError(error.message || "Payment failed. Please try again.");
      setJobData(prev => ({
        ...prev,
        paymentStatus: "failed",
      }));
    } finally {
      setIsProcessingPayment(false);
      console.log("[processPayment] Fluxo de pagamento finalizado");
    }
  };

  // Reset payment flow
  const resetPaymentFlow = () => {
    setSelectedPlan(null);
    setPaymentStep('select-plan');
    setPaymentError(null);
    setJobData({
      ...jobData,
      pricingPlanId: "",
      paymentStatus: "pending" as const,
      paymentId: jobData.paymentId || ""
    });
  };

  // Modified handleSubmit to include payment data
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Ensure a pricing plan is selected
    if (!jobData.pricingPlanId) {
      alert("Please select a pricing plan before submitting.");
      setActiveTab("newJob");
      setPaymentStep('select-plan');
      return;
    }
    
    // Ensure payment is completed
    if (jobData.paymentStatus !== "completed") {
      alert("Please complete the payment before submitting.");
      return;
    }
    
    // The job has already been saved in the processPayment function
    // Just reset the form and show confirmation
    
    // Reset form for next job
    setJobData({
      title: "",
      description: "",
      category: "",
      company: "",
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
      paymentStatus: "pending" as const,
      paymentId: ""
    });
    
    resetPaymentFlow();
  };

  const handleDeleteJob = async (jobId: string) => {
    if (!confirm("Are you sure you want to delete this job?")) {
      return;
    }
    
    try {
      if (!db) throw new Error("Firestore is not initialized");
      
      // Verify if the job belongs to the current company before deleting
      const jobRef = doc(db, "jobs", jobId);
      
      // Delete the document from Firestore
      await deleteDoc(jobRef);
      
      // Show success message
      alert("Job deleted successfully!");
      
      // Reload the job list
      reloadData();
    } catch (error) {
      console.error("Error deleting job:", error);
      alert("Error deleting job. Please try again.");
    }
  };

  // Ensure createdAt and expirationDate are displayed correctly in the 'My Jobs' tab
  // Add logging to debug the issue with createdAt and expirationDate
  const renderMyJobs = () => {
    const companyJobs = jobs; // Jobs state should already be filtered by companyId
  
    if (companyJobs.length === 0) {
      return (
        <div className="text-center py-8">
          <p className="text-gray-300">You haven't posted any jobs yet.</p>
          <button
            onClick={() => {
              setActiveTab("newJob");
              setPaymentStep('select-plan');  // Reset to plan selection when starting new job
            }}
            className="mt-4 bg-orange-900 text-white py-2 px-4 rounded hover:bg-orange-600"
          >
            Create New Job
          </button>
        </div>
      );
    }
  
    return (
      <div className="space-y-4">
        {companyJobs.map((job) => {
          const createdAt = job.createdAt?.toDate(); // Convert Firestore timestamp to Date
          // Use expiresAt if available, otherwise calculate based on plan duration
          const expirationDate = job.expiresAt?.toDate() || 
            (createdAt && job.pricingPlanId ? 
              new Date(createdAt.getTime() + (pricingPlans.find(p => p.id === job.pricingPlanId)?.duration || 30) * 24 * 60 * 60 * 1000) : 
              null);
  
          // Find plan name for display
          const planName = job.pricingPlanId ? 
            pricingPlans.find(p => p.id === job.pricingPlanId)?.name || "Basic" : 
            "Basic";
  
          // Debugging logs
          console.log("Job ID:", job.id);
          console.log("Created At:", createdAt);
          console.log("Expiration Date:", expirationDate);
  
          return (
            <div key={job.id} className="bg-black/50 p-4 rounded-lg">
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center mb-1">
                    <h3 className="text-orange-500 font-bold">{job.title}</h3>
                    <span className="ml-2 bg-orange-900/20 text-orange-400 text-xs px-2 py-1 rounded-full">
                      {planName} Plan
                    </span>
                  </div>
                  <p className="text-gray-400 text-sm mb-2">Company: {job.company}</p>
                  <p className="text-gray-300 my-2">{job.description}</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-3">
                    <p className="text-gray-300"><span className="text-orange-300">Category:</span> {job.category}</p>
                    {job.location && <p className="text-gray-300"><span className="text-orange-300">Location:</span> {job.location}</p>}
                    {job.salaryRange && <p className="text-gray-300"><span className="text-orange-300">Salary:</span> {job.salaryRange}</p>}
                    {job.employmentType && <p className="text-gray-300"><span className="text-orange-300">Type:</span> {job.employmentType}</p>}
                    {job.experienceLevel && <p className="text-gray-300"><span className="text-orange-300">Experience:</span> {job.experienceLevel}</p>}
                    {createdAt && (
                      <p className="text-gray-300">
                        <span className="text-orange-300">Created At:</span> {createdAt.toLocaleDateString()}
                      </p>
                    )}
                    {expirationDate && (
                      <p className="text-gray-300">
                        <span className="text-orange-300">Expiration Date:</span> {expirationDate.toLocaleDateString()}
                      </p>
                    )}
                    {job.paymentStatus && (
                      <p className="text-gray-300">
                        <span className="text-orange-300">Payment:</span> 
                        <span className={
                          job.paymentStatus === 'completed' ? 'text-green-500' : 
                          job.paymentStatus === 'failed' ? 'text-red-500' : 'text-yellow-500'
                        }> {job.paymentStatus}</span>
                      </p>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => handleDeleteJob(job.id)}
                  className="bg-red-500 hover:bg-red-600 text-white px-3 py-2 rounded text-sm ml-4 flex-shrink-0"
                >
                  Delete
                </button>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // Function to render the Settings form
  const renderSettings = () => {
    return (
      <div className="bg-black/70 p-10 rounded-lg shadow-lg">
        <h2 className="text-3xl font-semibold text-orange-500 mb-6">Company Settings</h2>
        <form className="space-y-6" onSubmit={handleProfileSubmit}>
          {/* Company Name */}
          <input
            type="text"
            name="name"
            value={companyProfile.name ?? ""} // Ensure value is always string
            onChange={handleProfileChange}
            placeholder="Company Name"
            className="w-full p-3 bg-black/50 border border-orange-500/30 rounded-lg text-white text-sm" // Changed text-white to text-black
            required
          />
          {/* Company Description */}
          <textarea
            name="description"
            value={companyProfile.description ?? ""} // Ensure value is always string
            onChange={handleProfileChange}
            placeholder="Company Description"
            rows={4}
            className="w-full p-3 bg-black/50 border border-orange-500/30 rounded-lg text-white text-sm"
          ></textarea>
          {/* Company Website */}
          <input
            type="url"
            name="website"
            value={companyProfile.website ?? ""} // Ensure value is always string
            onChange={handleProfileChange}
            placeholder="Company Website (e.g., https://example.com)"
            className="w-full p-3 bg-black/50 border border-orange-500/30 rounded-lg text-white text-sm"
          />
          {/* Company Location */}
          <input
            type="text"
            name="location"
            value={companyProfile.location ?? ""} // Ensure value is always string
            onChange={handleProfileChange}
            placeholder="Company Location (e.g., City, Country)"
            className="w-full p-3 bg-black/50 border border-orange-500/30 rounded-lg text-white text-sm"
          />
          {/* Responsible Person */}
          <input
            type="text"
            name="responsiblePerson"
            value={companyProfile.responsiblePerson ?? ""} // Ensure value is always string
            onChange={handleProfileChange}
            placeholder="Responsible Person"
            className="w-full p-3 bg-black/50 border border-orange-500/30 rounded-lg text-white text-sm"
          />
          {/* Address */}
          <textarea
            name="address"
            value={companyProfile.address ?? ""} // Ensure value is always string
            onChange={handleProfileChange}
            placeholder="Company Address"
            rows={3}
            className="w-full p-3 bg-black/50 border border-orange-500/30 rounded-lg text-white text-sm"
          ></textarea>
          {/* Contact Phone */}
          <input
            type="tel"
            name="contactPhone"
            value={companyProfile.contactPhone ?? ""} // Ensure value is always string
            onChange={handleProfileChange}
            placeholder="Contact Phone"
            className="w-full p-3 bg-black/50 border border-orange-500/30 rounded-lg text-white text-sm"
          />

          {/* Password Note */}
          <p className="text-sm text-gray-400">
            Password changes are handled through a separate secure process.
          </p>

          {/* Save Button */}
          <button
            type="submit"
            disabled={isLoadingProfile}
            className={`bg-orange-500 text-white py-3 px-8 rounded-full font-semibold text-lg cursor-pointer transition-colors hover:bg-orange-300 border-none w-full mt-5 ${isLoadingProfile ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {isLoadingProfile ? 'Saving...' : 'Save Profile'}
          </button>
        </form>
      </div>
    );
  };

  // Function to render the Notifications tab
  const renderNotifications = () => {
    if (notifications.length === 0) {
      return <p className="text-gray-300">No notifications at the moment.</p>;
    }
  
    return (
      <ul className="space-y-4">
        {notifications.map((notification, index) => (
          <li key={index} className="bg-black/50 p-4 rounded-lg text-gray-300">
            {notification}
          </li>
        ))}
      </ul>
    );
  };

  // Render the pricing plan selection step
  const renderPlanSelection = () => {
    return (
      <div className="space-y-6">
        <h3 className="text-2xl font-semibold text-orange-500">Select a Pricing Plan</h3>
        <p className="text-gray-300">Choose the best plan for your job posting:</p>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-4">
          {pricingPlans.map(plan => (
            <div 
              key={plan.id} 
              className={`border rounded-lg p-6 flex flex-col h-full transition-all cursor-pointer ${
                plan.recommended 
                  ? "border-orange-500 bg-black/70 transform scale-105" 
                  : "border-gray-700 bg-black/50 hover:border-orange-300"
              }`}

              onClick={() => handlePlanSelect(plan)}
            >
              {plan.recommended && (
                <div className="bg-orange-500 text-white text-xs font-bold uppercase py-1 px-2 rounded-full self-start mb-2">
                  Recommended
                </div>
              )}
              <h4 className="text-xl font-bold text-orange-400">{plan.name}</h4>
              <div className="text-3xl font-bold text-white my-2">${plan.price}</div>
              <p className="text-gray-400 mb-4">{plan.duration} days listing</p>
              
              <ul className="space-y-2 flex-grow">
                {plan.features.map((feature, index) => (
                  <li key={index} className="flex items-start">
                    <span className="text-orange-500 mr-2">✓</span>
                    <span className="text-gray-300">{feature}</span>
                  </li>
                ))}
              </ul>
              
              <button
                onClick={() => handlePlanSelect(plan)}
                className={`mt-4 py-2 px-4 rounded-lg ${
                  plan.recommended 
                    ? "bg-orange-500 text-white hover:bg-orange-600" 
                    : "bg-gray-700 text-white hover:bg-gray-600"
                }`}
              >
                Select Plan
              </button>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Render the payment review step
  const renderPaymentReview = () => {
    if (!selectedPlan) return null;
    
    return (
      <div className="space-y-6">
        <h3 className="text-2xl font-semibold text-orange-500">Review Your Order</h3>
        
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
          
          {/* Wallet connection status */}
          <div className="mb-4 p-3 rounded-lg border border-gray-700">
            <div className="flex justify-between items-center">
              <span className="text-gray-300">Wallet Connection:</span>
              <span className={walletAddress ? "text-green-500" : "text-yellow-500"}>
                {walletAddress ? "Connected" : "Not Connected"}
              </span>
            </div>
            {walletAddress && (
              <div className="mt-2 text-sm text-gray-400 break-all">
                Address: {walletAddress}
              </div>
            )}
            {walletError && (
              <div className="mt-2 text-sm text-red-500">
                Error: {walletError}
              </div>
            )}
          </div>
          
          {/* Payment buttons */}
          <div className="flex flex-col space-y-3">
            {!walletAddress ? (
              <button
                onClick={handleConnectWallet}
                disabled={isConnectingWallet}
                className={`w-full bg-blue-500 text-white py-3 rounded-lg font-semibold hover:bg-blue-600 transition ${
                  isConnectingWallet ? "opacity-70 cursor-not-allowed" : ""
                }`}
              >
                {isConnectingWallet ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Connecting Wallet...
                  </span>
                ) : (
                  "Connect Wallet"
                )}
              </button>
            ) : (
              <button
                onClick={() => {
                  console.log("Complete Payment button clicked");
                  processPayment();
                }}
                disabled={isProcessingPayment}
                className={`w-full bg-orange-500 text-white py-3 rounded-lg font-semibold hover:bg-orange-600 transition ${
                  isProcessingPayment ? "opacity-70 cursor-not-allowed" : ""
                }`}
              >
                {isProcessingPayment ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Processing Payment...
                  </span>
                ) : (
                  "Complete Payment & Post Job"
                )}
              </button>
            )}
            
            <button
              onClick={resetPaymentFlow}
              disabled={isProcessingPayment}
              className="w-full bg-transparent border border-gray-600 text-gray-300 py-3 rounded-lg font-semibold hover:bg-gray-800 transition"
            >
              Change Plan
            </button>
          </div>
          
          {paymentError && (
            <div className="mt-4 bg-red-500/20 border border-red-500 text-red-500 p-3 rounded-lg">
              {paymentError}
            </div>
          )}
        </div>
      </div>
    );
  };

  // Render the payment completion step
  const renderPaymentComplete = () => {
    return (
      <div className="text-center space-y-6">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-500 mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        
        <h3 className="text-2xl font-semibold text-green-500">Payment Successful!</h3>
        <p className="text-gray-300">
          Your payment has been processed successfully. You can now complete your job posting.
        </p>
        
        <button
          onClick={() => setPaymentStep('completed')}
          className="mt-4 bg-orange-500 text-white py-3 px-8 rounded-lg font-semibold hover:bg-orange-600 transition"
        >
          Continue to Final Submission
        </button>
      </div>
    );
  };

  // Update handleSubmit to first validate form and then go to payment step
  const handleInitialSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate the form data
    if (!jobData.title || !jobData.description || !jobData.category || !jobData.contactEmail || !jobData.applicationLink) {
      alert("Please fill in all required fields.");
      return;
    }
    
    // Store job data temporarily and move to payment step
    setTempJobData({...jobData, companyId, paymentId: jobData.paymentId || ""});
    setJobSubmissionStep('payment');
  };

  // Process payment function
  // Removed duplicate declaration of processPayment

  // Reset the whole process
  const resetJobCreation = () => {
    setJobSubmissionStep('form');
    setTempJobData(null);
    resetPaymentFlow();
  };

  // Go back to job form
  const goBackToJobForm = () => {
    setJobSubmissionStep('form');
  };

  // Start a new job after confirmation
  const startNewJob = () => {
    resetJobCreation();
    setActiveTab("newJob");
  };

  // View posted jobs after confirmation
  const viewPostedJobs = () => {
    resetJobCreation();
    setActiveTab("myJobs");
  };

  // Funções para Instant Jobs
  // Função para carregar Instant Jobs
  const loadInstantJobs = async () => {
    try {
      const jobs = await instantJobsService.getInstantJobsByCompany(companyId);
      setInstantJobs(jobs);
    } catch (error) {
      console.error("Error loading micro-tasks:", error);
    }
  };
  
  // Função para carregar mensagens de um Instant Job
  const loadJobMessages = async (jobId: string) => {
    try {
      const messages = await instantJobsService.getMessages(jobId);
      setJobMessages(messages);
    } catch (error) {
      console.error("Error loading messages:", error);
    }
  };
  
  // Função para enviar mensagem
  const handleSendMessage = async (message: string) => {
    if (!selectedJobId || !companyProfile) return;

    setIsSendingMessage(true);
    try {
      await instantJobsService.sendMessage({
        jobId: selectedJobId,
        senderId: companyId,
        senderName: companyProfile.name || 'Company',
        senderType: 'company',
        message
      });

      // Recarregar mensagens após enviar
      await loadJobMessages(selectedJobId);
    } catch (error) {
      console.error("Error sending message:", error);
    } finally {
      setIsSendingMessage(false);
    }
  };
  
  // Função para criar um novo Instant Job
  const handleCreateInstantJob = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (!walletAddress) {
        alert("Connect your wallet to create a micro-task.");
        return;
      }
      
      const jobData = {
        title: newInstantJobData.title,
        description: newInstantJobData.description,
        category: newInstantJobData.category,
        companyId,
        companyName: companyProfile.name,
        budget: newInstantJobData.budget,
        currency: newInstantJobData.currency,
        deadline: new Date(newInstantJobData.deadline),
        requiredSkills: newInstantJobData.requiredSkills.split(',').map(skill => skill.trim())
      };
      
      const jobId = await instantJobsService.createInstantJob(jobData);
      
      alert("Micro-task created successfully!");
      
      // Resetar formulário e voltar para lista
      setNewInstantJobData({
        title: '',
        description: '',
        category: '',
        budget: 0,
        currency: 'ETH',
        deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        requiredSkills: ''
      });
      
      setActiveSection('list');
      loadInstantJobs();
    } catch (error) {
      console.error("Error creating micro-task:", error);
      if (error instanceof Error) {
        alert(`Failed to create micro-task: ${error.message}`);
      } else {
        alert("Failed to create micro-task: Unknown error.");
      }
    }
  };
  
  // Função para aprovar um trabalho concluído
  const handleApproveJob = async (jobId: string) => {
    try {
      await instantJobsService.approveJob(jobId, companyId);
      alert("Micro-task approved successfully!");
      
      // Atualizar a lista de trabalhos
      loadInstantJobs();
      
      // Se está vendo os detalhes do trabalho aprovado, atualize-o
      if (selectedJobId === jobId) {
        const updatedJob = await instantJobsService.getInstantJobsByCompany(companyId)
          .then(jobs => jobs.find(job => job.id === jobId));
        
        if (updatedJob) {
          setSelectedJob(updatedJob);
        }
      }
    } catch (error) {
      console.error("Error approving micro-task:", error);
      if (error instanceof Error) {
        alert(`Failed to approve micro-task: ${error.message}`);
      } else {
        alert("Failed to approve micro-task: Unknown error.");
      }
    }
  };
  
  // Carregar instantJobs quando necessário
  useEffect(() => {
    if (activeTab === "instantJobs" && companyId) {
      loadInstantJobs();
    }
  }, [activeTab, companyId]);
  
  // Carregar detalhes do job quando selecionar um
  useEffect(() => {
    if (selectedJobId) {
      const job = instantJobs.find(job => job.id === selectedJobId);
      if (job) {
        setSelectedJob(job);
        loadJobMessages(selectedJobId);
      }
    }
  }, [selectedJobId]);

  // Renderizar a aba de Instant Jobs
  const renderInstantJobsTab = () => {
    // Mostrar lista de Instant Jobs
    if (activeSection === 'list') {
      return (
        <div>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-3xl font-semibold text-orange-500">Micro-tasks (Instant Jobs)</h2>
            <button
              onClick={() => setActiveSection('create')}
              className="bg-orange-500 hover:bg-orange-600 text-white py-2 px-4 rounded"
            >
              Create New Micro-task
            </button>
          </div>
          
          {instantJobs.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-300">You haven't created any micro-tasks yet.</p>
              <button
                onClick={() => setActiveSection('create')}
                className="mt-4 bg-orange-500 hover:bg-orange-600 text-white py-2 px-4 rounded"
              >
                Create First Micro-task
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {instantJobs.map(job => (
                <InstantJobCard
                  key={job.id}
                  job={job}
                  onClick={(jobId) => {
                    setSelectedJobId(jobId);
                    setActiveSection('detail');
                  }}
                  showActionButtons={true}
                  onApprove={handleApproveJob}
                  isCompanyView={true}
                />
              ))}
            </div>
          )}
        </div>
      );
    }
    
    // Mostrar formulário de criação
    if (activeSection === 'create') {
      return (
        <div>
          <div className="flex items-center mb-6">
            <button
              onClick={() => setActiveSection('list')}
              className="text-orange-400 hover:text-orange-300 mr-3"
            >
              &larr; Back
            </button>
            <h2 className="text-3xl font-semibold text-orange-500">Create New Micro-task</h2>
          </div>
          
          <form onSubmit={handleCreateInstantJob} className="space-y-4">
            <div>
              <label className="block text-gray-300 mb-2">Título da Tarefa</label>
              <input
                type="text"
                value={newInstantJobData.title}
                onChange={(e) => setNewInstantJobData({...newInstantJobData, title: e.target.value})}
                placeholder="ex: Desenvolver um smart contract para ICO"
                className="w-full p-3 bg-black/50 border border-orange-500/30 rounded-lg text-white"
                required
              />
            </div>
            
            <div>
              <label className="block text-gray-300 mb-2">Descrição Detalhada</label>
              <textarea
                value={newInstantJobData.description}
                onChange={(e) => setNewInstantJobData({...newInstantJobData, description: e.target.value})}
                placeholder="Descreva detalhadamente o que você precisa..."
                className="w-full p-3 bg-black/50 border border-orange-500/30 rounded-lg text-white h-32"
                required
              />
            </div>
            
            <div>
              <label className="block text-gray-300 mb-2">Categoria</label>
              <select
                value={newInstantJobData.category}
                onChange={(e) => setNewInstantJobData({...newInstantJobData, category: e.target.value})}
                className="w-full p-3 bg-black/50 border border-orange-500/30 rounded-lg text-white"
                required
              >
                <option value="">Selecione uma categoria</option>
                <option value="development">Desenvolvimento</option>
                <option value="design">Design</option>
                <option value="marketing">Marketing</option>
                <option value="content">Conteúdo</option>
                <option value="research">Pesquisa</option>
                <option value="smart-contracts">Smart Contracts</option>
                <option value="testing">Testes</option>
                <option value="other">Outro</option>
              </select>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-gray-300 mb-2">Orçamento</label>
                <input
                  type="number"
                  value={newInstantJobData.budget}
                  onChange={(e) => setNewInstantJobData({...newInstantJobData, budget: parseFloat(e.target.value)})}
                  min="0"
                  step="0.01"
                  className="w-full p-3 bg-black/50 border border-orange-500/30 rounded-lg text-white"
                  required
                />
              </div>
              
              <div>
                <label className="block text-gray-300 mb-2">Moeda</label>
                <select
                  value={newInstantJobData.currency}
                  onChange={(e) => setNewInstantJobData({...newInstantJobData, currency: e.target.value})}
                  className="w-full p-3 bg-black/50 border border-orange-500/30 rounded-lg text-white"
                  required
                >
                  <option value="ETH">ETH</option>
                  <option value="MATIC">MATIC</option>
                  <option value="USDT">USDT</option>
                  <option value="USDC">USDC</option>
                </select>
              </div>
            </div>
            
            <div>
              <label className="block text-gray-300 mb-2">Prazo Final</label>
              <input
                type="date"
                value={newInstantJobData.deadline.toISOString().split('T')[0]}
                onChange={(e) => setNewInstantJobData({...newInstantJobData, deadline: new Date(e.target.value)})}
                className="w-full p-3 bg-black/50 border border-orange-500/30 rounded-lg text-white"
                required
              />
            </div>
            
            <div>
              <label className="block text-gray-300 mb-2">Habilidades Necessárias (separadas por vírgula)</label>
              <input
                type="text"
                value={newInstantJobData.requiredSkills}
                onChange={(e) => setNewInstantJobData({...newInstantJobData, requiredSkills: e.target.value})}
                placeholder="ex: Solidity, React, Web3.js"
                className="w-full p-3 bg-black/50 border border-orange-500/30 rounded-lg text-white"
                required
              />
            </div>
            
            <div className="flex justify-end mt-6">
              <button
                type="button"
                onClick={() => setActiveSection('list')}
                className="bg-gray-700 hover:bg-gray-600 text-white mr-4"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="bg-orange-500 hover:bg-orange-600 text-white"
              >
                Criar Micro-tarefa
              </button>
            </div>
          </form>
        </div>
      );
    }
    
    // Mostrar detalhes da micro-tarefa com mensagens
    if (activeSection === 'detail' && selectedJob) {
      return (
        <div>
          <div className="flex items-center mb-6">
            <button
              onClick={() => {
                setActiveSection('list');
                setSelectedJobId(null);
                setSelectedJob(null);
              }}
              className="text-orange-400 hover:text-orange-300 mr-3"
            >
              &larr; Voltar
            </button>
            <h2 className="text-3xl font-semibold text-orange-500">{selectedJob.title}</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Painel esquerdo: Informações da tarefa */}
            <div className="md:col-span-1 bg-black/50 p-6 rounded-lg border border-gray-800">
              <h3 className="text-xl font-semibold text-orange-400 mb-4">Informações</h3>
              
              <div className="space-y-3">
                <div>
                  <span className="text-orange-300 block">Status:</span>
                  <span className={`
                    ${selectedJob.status === 'open' ? 'text-green-400' : ''}
                    ${selectedJob.status === 'accepted' ? 'text-blue-400' : ''}
                    ${selectedJob.status === 'completed' ? 'text-yellow-400' : ''}
                    ${selectedJob.status === 'approved' ? 'text-orange-400' : ''}
                    ${selectedJob.status === 'disputed' ? 'text-red-400' : ''}
                    font-semibold
                  `}>
                    {selectedJob.status === 'open' ? 'Aberta' : ''}
                    {selectedJob.status === 'accepted' ? 'Aceita' : ''}
                    {selectedJob.status === 'in_progress' ? 'Em Andamento' : ''}
                    {selectedJob.status === 'completed' ? 'Completa - Aguardando Aprovação' : ''}
                    {selectedJob.status === 'approved' ? 'Aprovada' : ''}
                    {selectedJob.status === 'disputed' ? 'Em Disputa' : ''}
                    {selectedJob.status === 'closed' ? 'Encerrada' : ''}
                  </span>
                </div>
                
                <div>
                  <span className="text-orange-300 block">Orçamento:</span>
                  <span className="text-white">{selectedJob.budget} {selectedJob.currency}</span>
                </div>
                
                <div>
                  <span className="text-orange-300 block">Prazo:</span>
                  <span className="text-white">
                    {selectedJob.deadline instanceof Date 
                      ? selectedJob.deadline.toLocaleDateString() 
                      : new Date(selectedJob.deadline.seconds * 1000).toLocaleDateString()}
                  </span>
                </div>
                
                <div>
                  <span className="text-orange-300 block">Categoria:</span>
                  <span className="text-white">{selectedJob.category}</span>
                </div>
                
                {selectedJob.acceptedByName && selectedJob.status !== 'open' && (
                  <div>
                    <span className="text-orange-300 block">Aceito por:</span>
                    <span className="text-white">{selectedJob.acceptedByName}</span>
                  </div>
                )}
                
                <div>
                  <span className="text-orange-300 block">Habilidades Necessárias:</span>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {selectedJob.requiredSkills?.map((skill, index) => (
                      <span key={index} className="bg-gray-800 text-xs text-orange-300 px-2 py-1 rounded-full">
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
                
                <div>
                  <span className="text-orange-300 block">Descrição:</span>
                  <p className="text-white mt-2 whitespace-pre-line">{selectedJob.description}</p>
                </div>
                
                {selectedJob.status === 'completed' && (
                  <div className="mt-4">
                    <button 
                      onClick={() => selectedJob.id && handleApproveJob(selectedJob.id)}
                      className="w-full bg-green-500 hover:bg-green-600 text-white"
                    >
                      Aprovar Tarefa Concluída
                    </button>
                  </div>
                )}
              </div>
            </div>
            
            {/* Painel direito: Sistema de mensagens */}
            <div className="md:col-span-2 bg-black/50 p-6 rounded-lg border border-gray-800">
              <h3 className="text-xl font-semibold text-orange-400 mb-4">Mensagens</h3>
              
              {selectedJob.status === 'open' ? (
                <div className="text-center py-8 text-gray-400">
                  Mensagens estarão disponíveis quando alguém aceitar esta micro-tarefa.
                </div>
              ) : (
                <MessageSystem 
                  messages={jobMessages}
                  onSendMessage={handleSendMessage}
                  isLoading={isSendingMessage}
                  currentUserId={companyId}
                  currentUserType="company"
                />
              )}
            </div>
          </div>
        </div>
      );
    }
    
    return <div>Carregando...</div>;
  };

  // Renderizar conteúdo com base na aba ativa
  const renderContent = () => {
    switch (activeTab) {
      case "profile":
        return renderSettings();
      case "myJobs":
        return (
          <div className="bg-black/70 p-10 rounded-lg shadow-lg">
            <h2 className="text-3xl font-semibold text-orange-500 mb-6">My Posted Jobs</h2>
            {renderMyJobs()}
          </div>
        );
      case "newJob":
        return (
          <div className="bg-black/70 p-10 rounded-lg shadow-lg">
            <h2 className="text-3xl font-semibold text-orange-500 mb-6">Post a New Job</h2>
            {jobSubmissionStep === 'form' ? (
              <form onSubmit={handleInitialSubmit}>
                {/* Job submission form fields */}
                <div className="space-y-6">
                  <input
                    type="text"
                    name="title"
                    value={jobData.title}
                    onChange={handleChange}
                    placeholder="Job Title"
                    className="w-full p-3 bg-black/50 border border-orange-500/30 rounded-lg text-white text-sm"
                    required
                  />
                  <textarea
                    name="description"
                    value={jobData.description}
                    onChange={handleChange}
                    placeholder="Job Description"
                    rows={4}
                    className="w-full p-3 bg-black/50 border border-orange-500/30 rounded-lg text-white text-sm"
                    required
                  ></textarea>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input
                      type="text"
                      name="category"
                      value={jobData.category}
                      onChange={handleChange}
                      placeholder="Category"
                      className="w-full p-3 bg-black/50 border border-orange-500/30 rounded-lg text-white text-sm"
                      required
                    />
                    <input
                      type="text"
                      name="company"
                      value={jobData.company || companyProfile.name}
                      onChange={handleChange}
                      placeholder="Company Name"
                      className="w-full p-3 bg-black/50 border border-orange-500/30 rounded-lg text-white text-sm"
                      required
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input
                      type="text"
                      name="requiredSkills"
                      value={jobData.requiredSkills}
                      onChange={handleChange}
                      placeholder="Required Skills"
                      className="w-full p-3 bg-black/50 border border-orange-500/30 rounded-lg text-white text-sm"
                    />
                    <input
                      type="text"
                      name="salaryRange"
                      value={jobData.salaryRange}
                      onChange={handleChange}
                      placeholder="Salary Range"
                      className="w-full p-3 bg-black/50 border border-orange-500/30 rounded-lg text-white text-sm"
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input
                      type="text"
                      name="location"
                      value={jobData.location}
                      onChange={handleChange}
                      placeholder="Location"
                      className="w-full p-3 bg-black/50 border border-orange-500/30 rounded-lg text-white text-sm"
                    />
                    <input
                      type="text"
                      name="employmentType"
                      value={jobData.employmentType}
                      onChange={handleChange}
                      placeholder="Employment Type"
                      className="w-full p-3 bg-black/50 border border-orange-500/30 rounded-lg text-white text-sm"
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input
                      type="text"
                      name="experienceLevel"
                      value={jobData.experienceLevel}
                      onChange={handleChange}
                      placeholder="Experience Level"
                      className="w-full p-3 bg-black/50 border border-orange-500/30 rounded-lg text-white text-sm"
                    />
                    <input
                      type="text"
                      name="blockchainExperience"
                      value={jobData.blockchainExperience}
                      onChange={handleChange}
                      placeholder="Blockchain Experience"
                      className="w-full p-3 bg-black/50 border border-orange-500/30 rounded-lg text-white text-sm"
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input
                      type="text"
                      name="remoteOption"
                      value={jobData.remoteOption}
                      onChange={handleChange}
                      placeholder="Remote Option"
                      className="w-full p-3 bg-black/50 border border-orange-500/30 rounded-lg text-white text-sm"
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input
                      type="email"
                      name="contactEmail"
                      value={jobData.contactEmail}
                      onChange={handleChange}
                      placeholder="Contact Email"
                      className="w-full p-3 bg-black/50 border border-orange-500/30 rounded-lg text-white text-sm"
                      required
                    />
                    <input
                      type="url"
                      name="applicationLink"
                      value={jobData.applicationLink}
                      onChange={handleChange}
                      placeholder="Application URL"
                      className="w-full p-3 bg-black/50 border border-orange-500/30 rounded-lg text-white text-sm"
                      required
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  className="bg-orange-500 text-white py-3 px-8 rounded-full font-semibold text-lg hover:bg-orange-600 mt-6 w-full"
                >
                  Continue to Payment
                </button>
              </form>
            ) : jobSubmissionStep === 'payment' ? (
              <div className="bg-black/50 p-6 rounded-lg mt-4">
                {paymentStep === 'select-plan' && renderPlanSelection()}
                {paymentStep === 'review' && renderPaymentReview()}
                {paymentStep === 'processing' && renderPaymentReview()}
                {paymentStep === 'completed' && (
                  <form onSubmit={handleSubmit}>
                    <div className="text-center py-8">
                      <div className="text-green-500 text-5xl mb-4">✓</div>
                      <h3 className="text-2xl font-semibold text-white">Payment Completed!</h3>
                      <p className="text-gray-300 mt-2 mb-6">
                        Your job post has been created and is now live.
                      </p>
                      
                      <div className="flex justify-center space-x-4">
                        <button
                          type="button"
                          onClick={startNewJob}
                          className="bg-orange-500 text-white py-2 px-6 rounded hover:bg-orange-600"
                        >
                          Post Another Job
                        </button>
                        <button
                          type="button"
                          onClick={viewPostedJobs}
                          className="bg-gray-700 text-white py-2 px-6 rounded hover:bg-gray-600"
                        >
                          View My Jobs
                        </button>
                      </div>
                    </div>
                  </form>
                )}
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="text-green-500 text-5xl mb-4">✓</div>
                <h3 className="text-2xl font-semibold text-white">Job Posted Successfully!</h3>
                <p className="text-gray-300 mt-2 mb-6">
                  Your job has been posted and is now visible to job seekers.
                </p>
                
                <div className="flex justify-center space-x-4">
                  <button
                    onClick={startNewJob}
                    className="bg-orange-500 text-white py-2 px-6 rounded hover:bg-orange-600"
                  >
                    Post Another Job
                  </button>
                  <button
                    onClick={viewPostedJobs}
                    className="bg-gray-700 text-white py-2 px-6 rounded hover:bg-gray-600"
                  >
                    View My Jobs
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      case "instantJobs":
        return renderInstantJobsTab();
      case "settings":
        return renderSettings();
      case "notifications":
        return (
          <div className="bg-black/70 p-10 rounded-lg shadow-lg">
            <h2 className="text-3xl font-semibold text-orange-500 mb-6">Notifications</h2>
            {renderNotifications()}
          </div>
        );
      case "learn2earn":
        return (
          <div className="bg-black/70 p-10 rounded-lg shadow-lg">
            <h2 className="text-3xl font-semibold text-orange-500 mb-6">Learn2Earn Opportunities</h2>
            {renderLearn2Earn()}
          </div>
        );
      default:
        return <div>Page not found.</div>;
    }
  };

  // Fix the spinner class name (typo)
  <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 rounded-full">
    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-orange-500"></div>
  </div>

  // Add effect to check wallet connection on initial load
  useEffect(() => {
    const checkWalletConnection = async () => {
      try {
        const address = await getCurrentAddress();
        if (address) {
          setWalletAddress(address);
          console.log("Wallet already connected:", address);
        }
      } catch (error) {
        console.error("Error checking wallet connection:", error);
      }
    };
    
    checkWalletConnection();
  }, []);

  useEffect(() => {
    const loadPricingPlans = async () => {
      fetchPricingPlans();
    };

    loadPricingPlans();
  }, [fetchPricingPlans]);

  // Function to fetch learn2earn
  const fetchLearn2Earn = useCallback(async () => {
    if (!db || !companyId) return;
    setIsLoadingLearn2Earn(true);
    try {
      const learn2earnCollection = collection(db, "learn2earn");
      const q = query(learn2earnCollection, where("companyId", "==", companyId));
      const learn2earnSnapshot = await getDocs(q);
      const fetchedLearn2Earn: Learn2Earn[] = learn2earnSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      } as Learn2Earn));
      setLearn2Earn(fetchedLearn2Earn);
    } catch (error) {
      console.error("Error fetching learn2earn:", error);
    } finally {
      setIsLoadingLearn2Earn(false);
    }
  }, [db, companyId]);

  // Fetch learn2earn when the "learn2earn" tab is active
  useEffect(() => {
    if (activeTab === "learn2earn") {
      fetchLearn2Earn();
      fetchFeePercentage(); // Now this reference is valid
    }
  }, [activeTab, fetchLearn2Earn, fetchFeePercentage]);

  // Handle changes in learn2earn form
  const handleLearn2EarnChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    // Handle number inputs
    if (name === 'tokenAmount' || name === 'totalParticipants' || name === 'tokenPerParticipant') {
      const numValue = value ? Number(value) : 0;
      
      // Criar um novo objeto com os valores atualizados
      const updatedData = {...learn2earnData, [name]: numValue};
      
      // Calcular automaticamente o maxParticipants quando tokenAmount ou tokenPerParticipant são alterados
      if ((name === 'tokenAmount' || name === 'tokenPerParticipant') && 
          updatedData.tokenAmount > 0 && updatedData.tokenPerParticipant > 0) {
        // Cálculo do máximo de participantes
        const calculatedMaxParticipants = Math.floor(updatedData.tokenAmount / updatedData.tokenPerParticipant);
        updatedData.maxParticipants = calculatedMaxParticipants;
      }
      
      setLearn2EarnData(updatedData);
    } else if (name === 'maxParticipants') {
      // Tratamento especial para maxParticipants para permitir que seja undefined
      setLearn2EarnData({...learn2earnData, [name]: value ? Number(value) : undefined});
    } else {
      setLearn2EarnData({...learn2earnData, [name]: value ?? ""});
    }
  };

  // Fix the date handling to ensure proper timestamps
  const handleDateChange = (name: 'startDate' | 'endDate', date: Date) => {
    // Simply store the Date object directly
    setLearn2EarnData({...learn2earnData, [name]: date});
   };
  // Add task to array
  const addTask = () => {
    if (!currentTask.title || !currentTask.description) {
      alert("Please fill in all task fields");
      return;
    }
    
    let newTask: Learn2EarnTask;
    
    if (currentTask.type === 'content') {
      newTask = {
        ...currentTask,
        id: Date.now().toString()
      };
    } else {
      // For question type, include options and correct answer
      newTask = {
        ...currentTask,
        id: Date.now().toString(),
        options: currentQuestionOptions,
        correctOption: correctOptionIndex
      };
    }
    
    setLearn2EarnData({
      ...learn2earnData,
      tasks: [...learn2earnData.tasks, newTask]
    });
    
    // Reset current task form
    setCurrentTask({
      type: 'content',
      description: "",
      contentText: "",
      title: ""
    });
    setCurrentQuestionOptions(['', '', '', '']);
    setCorrectOptionIndex(0);
  };

  // Remove task from array
  const removeTask = (taskId: string) => {
    setLearn2EarnData({
      ...learn2earnData,
      tasks: learn2earnData.tasks.filter(task => task.id !== taskId)
    });
  };

  // Handle task form changes
  const handleTaskChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setCurrentTask({ ...currentTask, [name]: value });
  };

  // Update function name from createAirdrop to createLearn2Earn
  const createLearn2Earn = async () => {
    if (!db || !companyId) {
      alert("Not authenticated. Please login again.");
      return;
    }
    
    // Validate learn2earn data
    if (!learn2earnData.title || !learn2earnData.description || 
        !learn2earnData.tokenSymbol || !learn2earnData.tokenAddress ||
        learn2earnData.tokenAmount <= 0 || learn2earnData.tokenPerParticipant <= 0 ||
        !learn2earnData.startDate || !learn2earnData.endDate || 
        learn2earnData.tasks.length === 0) {
      alert("Please fill in all required fields and add at least one task");
      return;
    }

    // Validate that network is selected
    if (!learn2earnData.network) {
      alert("Please select a blockchain network");
      return;
    }
    
    // Validate that tokenPerParticipant is not greater than total amount
    if (learn2earnData.tokenPerParticipant > learn2earnData.tokenAmount) {
      alert("Tokens per participant cannot exceed total token amount");
      return;
    }
    
    setIsProcessingDeposit(true);
    setDepositError(null);
    
    try {
      // Connect wallet if not already connected
      if (!walletAddress) {
        await handleConnectWallet();
        
        // Wait briefly for wallet connection to update
        await new Promise(resolve => setTimeout(resolve, 500));
        
        if (!walletAddress) {
          throw new Error("Wallet connection is required to create a learn2earn opportunity");
        }
      }
      
      // Normalize network value
      const normalizedNetwork = learn2earnData.network.trim().toLowerCase();
      console.log(`Creating learn2earn on normalized network: ${normalizedNetwork}`);
      
      // First check if token is approved for the learn2earn contract
      const isApproved = await learn2earnContractService.checkTokenApproval(
        normalizedNetwork,
        learn2earnData.tokenAddress
      );
      
      // If not approved, request approval first
      if (!isApproved) {
        alert("You need to approve the token first. Please confirm the approval transaction in your wallet.");
        
        const approvalResult = await learn2earnContractService.approveToken(
          normalizedNetwork,
          learn2earnData.tokenAddress
        );
        
        console.log("Token approval successful:", approvalResult);
      }
      
      // Generate a unique firebase ID for reference in the contract
      const learn2earnFirebaseId = `learn2earn_${Date.now()}`;

      // Convert Firestore timestamp to JavaScript Date for contract interaction safely
      let startDate: Date, endDate: Date;
      
      // Handle startDate first, before using it
      if (learn2earnData.startDate) {
        if (typeof learn2earnData.startDate === 'object') {
          if ('toDate' in learn2earnData.startDate && typeof learn2earnData.startDate.toDate === 'function') {
            // It's a Firestore Timestamp
            startDate = learn2earnData.startDate.toDate();
          } else if (learn2earnData.startDate instanceof Date) {
            // It's already a JavaScript Date
            startDate = learn2earnData.startDate;
          } else {
            // Default to current date + 5 minutes
            startDate = new Date(Date.now() + 5 * 60 * 1000);
          }
        } else if (typeof learn2earnData.startDate === 'string') {
          // It's a date string
          startDate = new Date(learn2earnData.startDate);
        } else {
          // Default to current date + 5 minutes
          startDate = new Date(Date.now() + 5 * 60 * 1000);
        }
      } else {
        // Default to current date + 5 minutes
        startDate = new Date(Date.now() + 5 * 60 * 1000);
      }
      
      // Handle endDate first, before using it
      if (learn2earnData.endDate) {
        if (typeof learn2earnData.endDate === 'object') {
          if ('toDate' in learn2earnData.endDate && typeof learn2earnData.endDate.toDate === 'function') {
            // It's a Firestore Timestamp
            endDate = learn2earnData.endDate.toDate();
          } else if (learn2earnData.endDate instanceof Date) {
            // It's already a JavaScript Date
            endDate = learn2earnData.endDate;
          } else {
            // Default to current date + 30 days
            endDate = new Date();
            endDate.setDate(endDate.getDate() + 30);
          }
        } else if (typeof learn2earnData.endDate === 'string') {
          // It's a date string
          endDate = new Date(learn2earnData.endDate);
        } else {
          // Default to current date + 30 days
          endDate = new Date();
          endDate.setDate(endDate.getDate() + 30);
        }
      } else {
        // Default to current date + 30 days
        endDate = new Date();
        endDate.setDate(endDate.getDate() + 30);
      }
      
      // Ensure the start date is at least 5 minutes in the future to avoid blockchain timestamp issues
      const now = new Date();
      const minStartTime = new Date(now.getTime() + 5 * 60 * 1000); // 5 minutes in the future
      
      if (startDate < now) {
        console.log("Start date adjusted to be 5 minutes in the future from", startDate, "to", minStartTime);
        startDate = minStartTime;
      }
      
      // Add buffer time to end date to prevent early expiration on blockchain
      // Some blockchains have block time variance that can cause end times to process earlier than expected
      const endBuffer = 1 * 60 * 60 * 1000; // 1 hour buffer
      const adjustedEndDate = new Date(endDate.getTime() + endBuffer);
      
      console.log("Creating learn2earn with dates:", {
        start: startDate.toISOString(),
        end: endDate.toISOString(),
        adjustedEnd: adjustedEndDate.toISOString(),
        startTimestamp: Math.floor(startDate.getTime() / 1000),
        endTimestamp: Math.floor(adjustedEndDate.getTime() / 1000)
      });
      
      // Use the learn2earnContractService to create the learn2earn
      // This method will fetch the appropriate contract address from Firebase
      const depositResult = await learn2earnContractService.createLearn2Earn(
        normalizedNetwork,
        learn2earnFirebaseId,
        learn2earnData.tokenAddress,
        learn2earnData.tokenAmount,
        startDate,
        endDate,
        learn2earnData.maxParticipants || 0
      );
      
      // Check if the result has an error flag
      if (!depositResult.success) {
        // Handle specific error types
        if (depositResult.notSupported) {
          throw new Error(`The selected network (${normalizedNetwork}) is not currently supported for learn2earn opportunities.`);
        }
        else if (depositResult.insufficientBalance) {
          throw new Error(`You don't have enough tokens. You have ${depositResult.currentBalance} but need ${depositResult.requiredAmount} ${learn2earnData.tokenSymbol}.`);
        }
        else if (depositResult.insufficientAllowance) {
          throw new Error(`The contract doesn't have permission to use your tokens. Please try approving the tokens again.`);
        }
        else if (depositResult.insufficientFee) {
          // If we have the fee amount from the error, display it
          const feeAmount = depositResult.feeAmount ? depositResult.feeAmount : (learn2earnData.tokenAmount * feePercent / 100);
          throw new Error(`You need additional ${feeAmount} ${learn2earnData.tokenSymbol} to cover the platform fee.`);
        }
        else if (depositResult.executionReverted) {
          throw new Error(`Transaction would fail: ${depositResult.message || "Unknown contract error"}. Please check your wallet and try again.`);
        }
        throw new Error(depositResult.message || "Failed to create learn2earn opportunity. Please check your wallet and try again.");
      }
      
      console.log("Learn2Earn created successfully:", depositResult);
      
      // Create a new learn2earn document in Firestore
      const learn2earnCollection = collection(db, "learn2earn");
      const newLearn2Earn = {
        ...learn2earnData,
        companyId,
        status: 'active',
        transactionHash: depositResult.transactionHash,
        learn2earnId: depositResult.learn2earnId,
        contractAddress: depositResult.contractAddress || learn2earnData.tokenAddress,
        blockNumber: depositResult.blockNumber,
        firebaseId: learn2earnFirebaseId,
        network: normalizedNetwork,
        createdAt: new Date()
      };
      
      // Add the document to Firestore
      await addDoc(learn2earnCollection, newLearn2Earn);
      
      // Add admin notification
      const notificationsCollection = collection(db, "adminNotifications");
      await addDoc(notificationsCollection, {
        type: "learn2earn",
        message: `New learn2earn opportunity created by ${companyProfile.name}: ${learn2earnData.title}`,
        companyId,
        learn2earnId: depositResult.learn2earnId,
        tokenAmount: learn2earnData.tokenAmount,
        tokenSymbol: learn2earnData.tokenSymbol,
        transactionHash: depositResult.transactionHash,
        read: false,
        createdAt: new Date()
      });
      
      // Reset form and fetch updated list
      resetLearn2EarnForm();
      fetchLearn2Earn();
      
      // Go to confirmation step
      setLearn2EarnStep('confirmation');
      
    } catch (error: any) {
      console.error("Error creating learn2earn:",error);
      setDepositError(error.message || "Failed to create learn2earn opportunity. Please check your wallet and try again.");
    } finally {
      setIsProcessingDeposit(false);
    }
  };

  // Reset learn2earn form
  const resetLearn2EarnForm = () => {
    setLearn2EarnData({
      title: "",
      description: "",
      tokenSymbol: "",
      tokenAmount: 0,
      tokenAddress: "",
      tokenPerParticipant: 0,
      totalParticipants: 0,
      maxParticipants: undefined,
      startDate: null,
      endDate: null,
      tasks: [],
      status: 'draft',
      contractAddress: "",
      transactionHash: "",
      socialLinks: {
        discord: "",
        telegram: "",
        twitter: "",
        website: ""
      },
      network: '',
    });
    setCurrentTask({
      type: 'content',
      title: "",
      description: "",
      contentText: "",
    });
    setCurrentQuestionOptions(['', '', '', '']);
    setCorrectOptionIndex(0);
    setLearn2EarnStep('info');
    setDepositError(null);
  };

  // Format date for display
  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'N/A';
    const date = timestamp instanceof Date ? timestamp : timestamp.toDate();
    return date.toLocaleDateString();
  };

  // Handle learn2earn activation/deactivation
  const toggle = async (learn2earn: Learn2Earn, newStatus: 'active' | 'completed' | 'draft') => {
    try {
      const learn2EarnRef = doc(db,"learn2earn", learn2earn.id);
      await updateDoc(learn2EarnRef, { status: newStatus });
      fetchLearn2Earn(); // Refresh list
    }catch (error) {
      console.error("Error updating learn2earn status:", error);
      alert("Failed to update learn2earn status");
    }
  };

  // Add rendering for the Learn2Earn tab (changed from "Add rendering for the Airdrops tab")
// Adicionando um novo estado para controlar as subfunções do Learn2Earn
const [learn2EarnSubTab, setLearn2EarnSubTab] = useState<'new' | 'my'>('my');

// Função para renderizar o Learn2Earn com subfunções
const renderLearn2Earn = () => {
  return (
    <div>
      {/* Guias para mudar entre "My L2L" e "New L2L" */}
      <div className="flex mb-6">
        <button
          onClick={() => setLearn2EarnSubTab('my')}
          className={`py-2 px-6 font-medium ${
            learn2EarnSubTab === 'my'
              ? 'text-orange-500 border-b-2 border-orange-500'
              : 'text-gray-400 hover:text-orange-300'
          }`}
        >
          My Learn2Earn
        </button>
        <button
          onClick={() => setLearn2EarnSubTab('new')}
          className={`py-2 px-6 font-medium ${
            learn2EarnSubTab === 'new'
              ? 'text-orange-500 border-b-2 border-orange-500'
              : 'text-gray-400 hover:text-orange-300'
          }`}
        >
          New Learn2Earn
        </button>
      </div>

      {/* Renderizar o subcomponente apropriado baseado no subtab selecionado */}
      {learn2EarnSubTab === 'new' ? renderNewLearn2Earn() : renderMyLearn2Earn(syncWarnings, syncing)}
    </div>
  );
}

// Função para renderizar a criação de novo Learn2Earn
const renderNewLearn2Earn = () => {
  if (isLoadingLearn2Earn) {
    return <p className="text-gray-300 py-4">Loading...</p>;
  }

  if (learn2EarnStep === 'info') {
    return (
      <div className="bg-black/50 p-6 rounded-lg">
        <h3 className="text-2xl font-semibold text-orange-500 mb-4">Create New Learn2Earn</h3>
        
        {/* ... conteúdo existente para o step 'info' ... */}
        <form onSubmit={(e) => {
          e.preventDefault();
          setLearn2EarnStep('tasks');
        }}>
          <div className="mb-4">
            <label className="block text-gray-300 mb-2">Blockchain Network</label>
            <select 
              name="network"
              value={learn2earnData.network}
              onChange={handleLearn2EarnChange}
              className="w-full bg-black/50 border border-gray-700 rounded p-2 text-white"
              required
              disabled={isLoadingNetworks}
            >
              <option value="">Select Network</option>
              {isLoadingNetworks ? (
                <option value="" disabled>Loading networks...</option>
              ) : availableNetworks.length > 0 ? (
                availableNetworks.map((network) => (
                  <option key={network} value={network}>
                    {network.charAt(0).toUpperCase() + network.slice(1)}
                  </option>
                ))
              ) : (
                <option value="" disabled>No networks available</option>
              )}
            </select>
            {availableNetworks.length === 0 && !isLoadingNetworks && (
              <div className="text-red-500 text-sm mt-1">
                <p>No blockchain networks with configured contracts available.</p>
                <button 
                  onClick={() => {
                    setIsLoadingNetworks(true);
                    learn2earnContractService.resetService().then(() => {
                      fetchAvailableNetworks();
                    }).catch(error => {
                      console.error("Error resetting service:", error);
                    }).finally(() => {
                      setIsLoadingNetworks(false);
                    });
                  }}
                  className="mt-2 text-white bg-blue-600 hover:bg-blue-700 py-1 px-3 rounded text-xs"
                  disabled={isLoadingNetworks}
                >
                  {isLoadingNetworks ? 'Loading...' : 'Reload Networks'}
                </button>
              </div>
            )}
          </div>

          {/* ... resto do formulário existente ... */}
          <div className="mb-4">
            <label className="block text-gray-300 mb-2">Learn2Earn Title</label>
            <input 
              type="text"
              name="title"
              value={learn2earnData.title}
              onChange={handleLearn2EarnChange}
              placeholder="e.g., Community Token Distribution"
              className="w-full bg-black/50 border border-gray-700 rounded p-2 text-white"
              required
            />
          </div>
          
          <div className="mb-4">
            <label className="block text-gray-300 mb-2">Description</label>
            <textarea 
              name="description"
              value={learn2earnData.description}
              onChange={handleLearn2EarnChange}
              placeholder="Describe your learn2earn opportunity and what users can get"
              className="w-full bg-black/50 border border-gray-700 rounded p-2 text-white h-32"
              required
            ></textarea>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-gray-300 mb-2">Token Symbol</label>
              <input 
                type="text"
                name="tokenSymbol"
                value={learn2earnData.tokenSymbol}
                onChange={handleLearn2EarnChange}
                placeholder="e.g., ETH, USDT"
                className="w-full bg-black/50 border border-gray-700 rounded p-2 text-white"
                required
              />
            </div>
            <div>
              <label className="block text-gray-300 mb-2">Token Contract Address</label>
              <input 
                type="text"
                name="tokenAddress"
                value={learn2earnData.tokenAddress}
                onChange={handleLearn2EarnChange}
                placeholder="e.g., 0x1234..."
                className="w-full bg-black/50 border border-gray-700 rounded p-2 text-white"
                required
              />
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-gray-300 mb-2">Total Token Amount</label>
              <input 
                type="number"
                name="tokenAmount"
                value={learn2earnData.tokenAmount || ''}
                onChange={handleLearn2EarnChange}
                placeholder="Total amount of tokens to distribute"
                className="w-full bg-black/50 border border-gray-700 rounded p-2 text-white"
                required
                min="0"
                step="0.000001"
              />
              <p className="text-xs text-gray-400 mt-1">Fee: {feePercent}% of total tokens</p>
            </div>
            <div>
              <label className="block text-gray-300 mb-2">Tokens Per Participant</label>
              <input 
                type="number"
                name="tokenPerParticipant"
                value={learn2earnData.tokenPerParticipant || ''}
                onChange={handleLearn2EarnChange}
                placeholder="Amount each participant will receive"
                className="w-full bg-black/50 border border-gray-700 rounded p-2 text-white"
                required
                min="0"
                step="0.000001"
              />
            </div>
          </div>
          
          <div className="mb-4">
            <label className="block text-gray-300 mb-2">Start Date</label>
            <input 
              type="date"
              name="startDate"
              value={learn2earnData.startDate ? 
                (learn2earnData.startDate instanceof Date ? 
                  learn2earnData.startDate.toISOString().split('T')[0] : 
                  new Date(learn2earnData.startDate as any).toISOString().split('T')[0]) 
                : ''}
              onChange={(e) => handleDateChange('startDate', new Date(e.target.value))}
              className="w-full bg-black/50 border border-gray-700 rounded p-2 text-white"
              required
            />
          </div>
          <div className="mb-4">
            <label className="block text-gray-300 mb-2">End Date</label>
            <input 
              type="date"
              name="endDate"
              value={learn2earnData.endDate ? 
                (learn2earnData.endDate instanceof Date ? 
                  learn2earnData.endDate.toISOString().split('T')[0] : 
                  new Date(learn2earnData.endDate as any).toISOString().split('T')[0]) 
                : ''}
              onChange={(e) => handleDateChange('endDate', new Date(e.target.value))}
              className="w-full bg-black/50 border border-gray-700 rounded p-2 text-white"
              required
            />
          </div>
          
          <div className="mb-4">
            <label className="block text-gray-300 mb-2">Max Participants (calculated automatically)</label>
            <input 
              type="number"
              name="maxParticipants"
              value={learn2earnData.maxParticipants || ''}
              onChange={handleLearn2EarnChange}
              placeholder="Leave empty for unlimited"
              className="w-full bg-black/50 border border-gray-700 rounded p-2 text-white"
              min="1"
              readOnly
            />
            {learn2earnData.tokenAmount > 0 && learn2earnData.tokenPerParticipant > 0 && (
              <p className="text-xs text-gray-400 mt-1">
                Maximum of {Math.floor(learn2earnData.tokenAmount / learn2earnData.tokenPerParticipant)} participants based on token distribution
              </p>
            )}
          </div>
          
          <div className="mt-4 flex justify-end">
            <button
              type="submit"
              className="bg-orange-500 text-white py-2 px-6 rounded hover:bg-orange-600 transition-colors"
            >
              Next: Add Tasks
            </button>
          </div>
        </form>
      </div>
    );
  }
  
  if (learn2EarnStep === 'tasks') {
    return (
      <div className="bg-black/50 p-6 rounded-lg">
        <h3 className="text-2xl font-semibold text-orange-500 mb-4">Add Learning Tasks</h3>
        
        {/* ... conteúdo existente para o step 'tasks' ... */}
        {learn2earnData.tasks.length > 0 && (
          <div className="mb-6">
            <h4 className="text-xl font-medium text-white mb-2">Current Tasks</h4>
            <ul className="space-y-2">
              {learn2earnData.tasks.map((task, index) => (
                <li key={index} className="bg-black/30 p-3 rounded-lg border border-gray-700 flex justify-between items-center">
                  <div>
                    <p className="text-white font-medium">{task.title}</p>
                    <p className="text-sm text-gray-400">{task.type === 'content' ? 'Educational Content' : 'Quiz Question'}</p>
                  </div>
                  <button
                    onClick={() => {
                      const newTasks = [...learn2earnData.tasks];
                      newTasks.splice(index, 1);
                      setLearn2EarnData({...learn2earnData, tasks: newTasks});
                    }}
                    className="text-red-500 hover:text-red-400"
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
        
        <div className="mb-4">
          <label className="block text-gray-300 mb-2">Task Type</label>
          <select
            value={currentTask.type}
            onChange={(e) => setCurrentTask({...currentTask, type: e.target.value as 'content' | 'question'})}
            className="w-full bg-black/50 border border-gray-700 rounded p-2 text-white"
          >
            <option value="content">Educational Content</option>
            <option value="question">Quiz Question</option>
          </select>
        </div>
        
        <div className="mb-4">
          <label className="block text-gray-300 mb-2">Task Title</label>
          <input
            type="text"
            name="title"
            value={currentTask.title}
            onChange={handleTaskChange}
            placeholder="e.g., Learn About Blockchain"
            className="w-full bg-black/50 border border-gray-700 rounded p-2 text-white"
          />
        </div>
        
        <div className="mb-4">
          <label className="block text-gray-300 mb-2">Task Description</label>
          <input
            type="text"
            name="description"
            value={currentTask.description}
            onChange={handleTaskChange}
            placeholder="Brief description of what the user will learn"
            className="w-full bg-black/50 border border-gray-700 rounded p-2 text-white"
          />
        </div>
        
        {currentTask.type === 'content' ? (
          <div className="mb-6">
            <label className="block text-gray-300 mb-2">Educational Content</label>
            <textarea
              name="contentText"
              value={currentTask.contentText}
              onChange={handleTaskChange}
              placeholder="Enter educational content or paste a video URL"
              className="w-full bg-black/50 border border-gray-700 rounded p-2 text-white h-32"
            ></textarea>
          </div>
        ) : (
          <>
            <div className="mb-4">
              <label className="block text-gray-300 mb-2">Question</label>
              <input
                type="text"
                name="question"
                value={currentTask.question || ''}
                onChange={handleTaskChange}
                placeholder="Enter your quiz question"
                className="w-full bg-black/50 border border-gray-700 rounded p-2 text-white"
              />
            </div>
            
            <div className="mb-6">
              <label className="block text-gray-300 mb-2">Options</label>
              {currentQuestionOptions.map((option, index) => (
                <div key={index} className="flex items-center mb-2">
                  <input
                    type="radio"
                    id={`option-${index}`}
                    name="correctOption"
                    checked={correctOptionIndex === index}
                    onChange={() => setCorrectOptionIndex(index)}
                    className="mr-2"
                  />
                  <input
                    type="text"
                    value={option}
                    onChange={(e) => {
                      const newOptions = [...currentQuestionOptions];
                      newOptions[index] = e.target.value;
                      setCurrentQuestionOptions(newOptions);
                    }}
                    placeholder={`Option ${index + 1}`}
                    className="flex-1 bg-black/50 border border-gray-700 rounded p-2 text-white"
                  />
                </div>
              ))}
            </div>
          </>
        )}
        
        {/* New deposit information card - more compact */}
        <div className="mb-4 bg-black/30 border border-orange-500/30 p-3 rounded-lg">
          <h4 className="text-lg font-medium text-white mb-2">Deposit Information</h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
            <div className="bg-black/50 p-2 rounded-md">
              <div className="text-xs text-gray-400">Token</div>
              <div className="text-sm font-medium text-white">
                {learn2earnData.tokenAmount} {learn2earnData.tokenSymbol}
              </div>
              <div className="text-xs text-gray-500 break-all">
                {learn2earnData.tokenAddress?.substring(0, 8)}...{learn2earnData.tokenAddress?.substring(learn2earnData.tokenAddress.length - 6)}
              </div>
            </div>
            <div className="bg-black/50 p-2 rounded-md">
              <div className="text-xs text-gray-400">Participants</div>
              <div className="text-sm font-medium text-white">
                {learn2earnData.maxParticipants || 'Unlimited'}
                <span className="text-xs text-gray-400 ml-1">({learn2earnData.tokenPerParticipant} {learn2earnData.tokenSymbol}/user)</span>
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div className="bg-black/50 p-2 rounded-md">
              <div className="text-xs text-gray-400">Start</div>
              <div className="text-sm font-medium text-white">
                {learn2earnData.startDate ? new Date(learn2earnData.startDate as any).toLocaleDateString() : 'Not set'}
              </div>
            </div>
            <div className="bg-black/50 p-2 rounded-md">
              <div className="text-xs text-gray-400">End</div>
              <div className="text-sm font-medium text-white">
                {learn2earnData.endDate ? new Date(learn2earnData.endDate as any).toLocaleDateString() : 'Not set'}
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div className="bg-black/50 p-2 rounded-md">
              <div className="text-xs text-gray-400">Fee ({feePercent}%)</div>
              <div className="text-sm font-medium text-white">
                {(learn2earnData.tokenAmount * feePercent / 100).toFixed(6)}
              </div>
            </div>
            <div className="bg-black/50 p-2 rounded-md">
              <div className="text-xs text-gray-400 font-bold">Total Deposit</div>
              <div className="text-sm font-medium text-orange-400">
                {(learn2earnData.tokenAmount + (learn2earnData.tokenAmount * feePercent / 100)).toFixed(6)}
              </div>
            </div>
          </div>
          
          <div className="flex items-center mt-2">
            <input
              type="checkbox"
              id="deposit-confirmation"
              className="mr-2 h-4 w-4"
              checked={isDepositConfirmed}
              onChange={(e) => setIsDepositConfirmed(e.target.checked)}
            />
            <label htmlFor="deposit-confirmation" className="text-white text-xs">
              I confirm the deposit information and understand that tokens will be transferred from my wallet
            </label>
          </div>
        </div>
        
        <div className="mt-4 flex justify-between">
          <button
            onClick={() => addTask()}
            className="bg-green-600 text-white py-2 px-4 rounded hover:bg-green-700 transition-colors"
          >
            Add Task
          </button>
          
          <div>
            <button
              onClick={() => setLearn2EarnStep('info')}
              className="bg-gray-700 text-white py-2 px-4 mr-2 rounded hover:bg-gray-600 transition-colors"
            >
              Back
            </button>
            
            <button
              onClick={() => createLearn2Earn()}
              disabled={learn2earnData.tasks.length === 0 || !isDepositConfirmed}
              className={`bg-orange-500 text-white py-2 px-6 rounded transition-colors ${
                learn2earnData.tasks.length === 0 || !isDepositConfirmed
                  ? 'opacity-50 cursor-not-allowed' 
                  : 'hover:bg-orange-600'
              }`}
            >
              Create Learn2Earn
            </button>
          </div>
        </div>
      </div>
    );
  }
  
  if (learn2EarnStep === 'confirmation') {
    return (
      <div className="bg-black/50 p-6 rounded-lg text-center">
        <div className="text-green-500 text-5xl mb-4">✓</div>
        <h3 className="text-2xl font-semibold text-white mb-2">Learn2Earn Created Successfully!</h3>
        <p className="text-gray-300 mb-6">Your Learn2Earn opportunity is now live and ready for participants.</p>
        <div className="flex justify-center space-x-4">
          <button
            onClick={() => {
              setLearn2EarnStep('info');
              setLearn2EarnSubTab('my');
              fetchLearn2Earn();
            }}
            className="bg-orange-500 text-white py-2 px-6 rounded hover:bg-orange-600 transition-colors"
          >
            View My Learn2Earn
          </button>
          <button
            onClick={() => {
              setLearn2EarnStep('info');
              fetchLearn2Earn();
            }}
            className="bg-gray-700 text-white py-2 px-6 rounded hover:bg-gray-600 transition-colors"
          >
            Create Another
          </button>
        </div>
      </div>
    );
  }

  // Fallback
  return <div>Loading...</div>;
};

// Função para renderizar a lista de Learn2Earn da empresa
const renderMyLearn2Earn = (syncWarnings: {id:string; msg:string}[], syncing: boolean) => {
  if (isLoadingLearn2Earn || syncing) {
    return <p className="text-gray-300 py-4">Loading & synchronizing Learn2Earn opportunities...</p>;
  }
  // ...existing code...
  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        {syncWarnings.length > 0 && (
          <div className="bg-yellow-900/40 border border-yellow-600 text-yellow-300 p-3 rounded flex-1 mr-4">
            <b>Sincronização de status:</b>
            <ul className="list-disc ml-5">
              {syncWarnings.map(w => <li key={w.id}>{w.msg}</li>)}
            </ul>
          </div>
        )}
        <button
          className={`bg-blue-700 hover:bg-blue-800 text-white px-4 py-2 rounded ${syncing ? 'opacity-60 cursor-not-allowed' : ''}`}
          disabled={syncing}
          onClick={manualSyncStatuses}
        >
          {syncing ? 'Sincronizando...' : 'Sincronizar status'}
        </button>
      </div>
      {/* ...restante do renderMyLearn2Earn... */}
      <div>
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-2xl font-semibold text-orange-500">Your Learn2Earn Opportunities</h3>
          <button
            onClick={() => {
              setLearn2EarnSubTab('new');
              setLearn2EarnStep('info');
            }}
            className="bg-orange-500 text-white py-2 px-4 rounded hover:bg-orange-600"
          >
            Create New Learn2Earn
          </button>
        </div>
        
        {learn2earn.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-300">You haven't created any Learn2Earn opportunities yet.</p>
            <button
              onClick={() => {
                setLearn2EarnSubTab('new');
                setLearn2EarnStep('info');
              }}
              className="mt-4 bg-orange-500 hover:bg-orange-600 text-white py-2 px-4 rounded"
            >
              Create Your First Learn2Earn
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {learn2earn.map((item) => (
              <div key={item.id} className="bg-black/30 p-6 rounded-lg border border-gray-700">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="text-xl font-medium text-orange-300">{item.title}</h4>
                    <div className="mt-2">
                      <p className="text-gray-300">{item.description}</p>
                    </div>
                  </div>
                  <div className="flex">
                    <span className={`px-3 py-1 text-xs font-medium rounded-full ${
                      item.status === 'active' ? 'bg-green-500/20 text-green-400' :
                      item.status === 'completed' ? 'bg-orange-500/20 text-orange-400' :
                      'bg-gray-500/20 text-gray-400'
                    }`}>
                      {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                    </span>
                  </div>
                </div>
                
                <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-black/20 p-3 rounded-md">
                    <div className="text-sm text-gray-400">Token</div>
                    <div className="text-lg font-medium text-white">
                      {item.tokenAmount} {item.tokenSymbol}
                    </div>
                  </div>
                  <div className="bg-black/20 p-3 rounded-md">
                    <div className="text-sm text-gray-400">Reward Per User</div>
                    <div className="text-lg font-medium text-white">
                      {item.tokenPerParticipant} {item.tokenSymbol}
                    </div>
                  </div>
                  <div className="bg-black/20 p-3 rounded-md">
                    <div className="text-sm text-gray-400">Participants</div>
                    <div className="text-lg font-medium text-white">
                      {item.totalParticipants || 0} / {item.maxParticipants || '∞'}
                    </div>
                  </div>
                </div>
                
                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-black/20 p-3 rounded-md">
                    <div className="text-sm text-gray-400">Start Date</div>
                    <div className="text-white">
                      {formatDate(item.startDate)}
                    </div>
                  </div>
                  <div className="bg-black/20 p-3 rounded-md">
                    <div className="text-sm text-gray-400">End Date</div>
                    <div className="text-white">
                      {formatDate(item.endDate)}
                    </div>
                  </div>
                  <div className="bg-black/20 p-3 rounded-md col-span-1 md:col-span-2">
                    <div className="text-sm text-gray-400">Network</div>
                    <div className="flex items-center">
                      <span className="bg-gray-700 text-xs px-2 py-1 rounded mr-2">
                        {(item.network ?? "N/A").toUpperCase()}
                      </span>
                      {item.contractAddress && (
                        <span className="text-xs text-gray-400 truncate">
                          Contract: {item.contractAddress.substring(0, 8)}...{item.contractAddress.substring(item.contractAddress.length - 6)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="mt-4 flex space-x-2 justify-end">
                  {item.status === 'draft' ? (
                    <button 
                      onClick={() => toggle(item, 'active')}
                      className="bg-green-600 text-white px-3 py-1 rounded-md hover:bg-green-700"
                    >
                      Activate
                    </button>
                  ) : item.status === 'active' ? (
                    <button 
                      onClick={() => toggle(item, 'completed')}
                      className="bg-orange-600 text-white px-3 py-1 rounded-md hover:bg-orange-700"
                    >
                      End Campaign
                    </button>
                  ) : null}
                  <button
                    onClick={() => fetchL2LStats(item.id)}
                    className="bg-blue-600 text-white px-3 py-1 rounded-md hover:bg-blue-700"
                  >
                    View Details
                  </button>
                </div>
                
                {/* Progress bar para tokens distribuídos */}
                <div className="mt-4">
                  <div className="flex justify-between text-xs text-gray-400 mb-1">
                    <span>Token Distribution Progress</span>
                    <span>{Math.min(100, Math.round((item.totalParticipants || 0) * item.tokenPerParticipant / item.tokenAmount * 100))}%</span>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-2.5">
                    <div 
                      className="bg-orange-500 h-2.5 rounded-full progress-bar" 
                      data-progress-width={`${Math.min(100, Math.round((item.totalParticipants || 0) * item.tokenPerParticipant / item.tokenAmount * 100))}%`}
                    ></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

  // Adicionar nova aba para Instant Jobs
  const tabs = [
    { id: "profile", label: "Company Profile" },
    { id: "jobs", label: "Jobs" },
    { id: "instantJobs", label: "Instant Jobs" },
    { id: "settings", label: "Settings" },
    // Outras tabs existentes...
  ];

  // Adicionar estado para armazenar as redes disponíveis
  const [availableNetworks, setAvailableNetworks] = useState<string[]>([]);
  const [isLoadingNetworks, setIsLoadingNetworks] = useState(false);

  // Função para buscar redes disponíveis do Firestore
  const fetchAvailableNetworks = useCallback(async () => {
    setIsLoadingNetworks(true);
    try {
      // Buscar as redes disponíveis usando o serviço do contrato
      const networks = await learn2earnContractService.getSupportedNetworks();
      console.log("Redes disponíveis encontradas:", networks);
      setAvailableNetworks(networks);
    } catch (error) {
      console.error("Erro ao buscar redes disponíveis:", error);
      setAvailableNetworks([]);
    } finally {
      setIsLoadingNetworks(false);
    }
  }, []);

  // Buscar redes disponíveis quando o componente for montado ou quando a aba Learn2Earn for selecionada
  useEffect(() => {
    if (activeTab === "learn2earn") {
      fetchAvailableNetworks();
      fetchFeePercentage(); // Now this reference is valid
    }
  }, [activeTab, fetchAvailableNetworks, fetchFeePercentage]);

  // Função dummy para evitar erro de referência
const fetchL2LStats = (l2lId: string) => {
  // Implementação futura: buscar estatísticas reais do contrato
  // Por enquanto, não faz nada
};

  // Adiciona estados de sincronização no componente principal
  const [syncWarnings, setSyncWarnings] = useState<{id:string; msg:string}[]>([]);
  const [syncing, setSyncing] = useState(false);

  // Sincronização automática de status Learn2Earn
  useEffect(() => {
    const syncStatuses = async () => {
      if (!learn2earn || learn2earn.length === 0) return;
      setSyncing(true);
      const warnings: {id:string; msg:string}[] = [];
      for (const l2l of learn2earn) {
        if (!l2l.learn2earnId || !l2l.network) continue;
        try {
          const contractAddresses = await learn2earnContractService.getContractAddresses(l2l.network);
          if (!contractAddresses.contractAddress) continue;
          const provider = await getWeb3Provider();
          if (!provider) continue;
          const contract = new (window as any).ethers.Contract(
            contractAddresses.contractAddress,
            [
              "function learn2earns(uint256) view returns (string id, address tokenAddress, uint256 tokenAmount, uint256 startTime, uint256 endTime, uint256 maxParticipants, uint256 participantCount, bool active)"
            ],
            provider
          );
          const onChain = await contract.learn2earns(Number(l2l.learn2earnId));
          const onChainActive = Boolean(onChain.active);
          const firebaseActive = l2l.status === 'active';
          if (onChainActive !== firebaseActive) {
            const newStatus = onChainActive ? 'active' : 'completed';
            await updateDoc(doc(db, "learn2earn", l2l.id), { status: newStatus });
            warnings.push({id: l2l.id, msg: `Status sincronizado: Blockchain=${onChainActive ? 'Ativo' : 'Inativo'}, Firebase=${l2l.status}`});
            l2l.status = newStatus;
          }
        } catch (err) {
          warnings.push({id: l2l.id, msg: `Erro ao sincronizar status do Learn2Earn: ${l2l.title}`});
        }
      }
      setSyncWarnings(warnings);
      setSyncing(false);
    };
    syncStatuses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(learn2earn)]);

  // Função manual para sincronizar status
const manualSyncStatuses = async () => {
  if (!learn2earn || learn2earn.length === 0) return;
  setSyncing(true);
  const warnings: {id:string; msg:string}[] = [];
  for (const l2l of learn2earn) {
    if (!l2l.learn2earnId || !l2l.network) continue;
    try {
      const contractAddresses = await learn2earnContractService.getContractAddresses(l2l.network);
      if (!contractAddresses.contractAddress) continue;
      const provider = await getWeb3Provider();
      if (!provider) continue;
      const contract = new (window as any).ethers.Contract(
        contractAddresses.contractAddress,
        [
          "function learn2earns(uint256) view returns (string id, address tokenAddress, uint256 tokenAmount, uint256 startTime, uint256 endTime, uint256 maxParticipants, uint256 participantCount, bool active)"
        ],
        provider
      );
      const onChain = await contract.learn2earns(Number(l2l.learn2earnId));
      const onChainActive = Boolean(onChain.active);
      const firebaseActive = l2l.status === 'active';
      if (onChainActive !== firebaseActive) {
        const newStatus = onChainActive ? 'active' : 'completed';
        await updateDoc(doc(db, "learn2earn", l2l.id), { status: newStatus });
        warnings.push({id: l2l.id, msg: `Status sincronizado: Blockchain=${onChainActive ? 'Ativo' : 'Inativo'}, Firebase=${l2l.status}`});
        l2l.status = newStatus;
      }
    } catch (err) {
      warnings.push({id: l2l.id, msg: `Erro ao sincronizar status do Learn2Earn: ${l2l.title}`});
    }
  }
  setSyncWarnings(warnings);
  setSyncing(false);
};

  return (
    <Layout>
      <main className="min-h-screen bg-gradient-to-b from-black to-orange-900 text-white flex">
        {/* Sidebar */}
        <aside className="w-full md:w-1/4 bg-black/70 p-6 flex flex-col">
          {/* Profile Photo Section */}
          <div className="flex flex-col items-center mb-6">
            <div className="relative w-24 h-24 rounded-full border-4 border-orange-500 mb-4">
              {/* Loading Spinner */}
              {(isUploading || isLoadingProfile) && (
                <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 rounded-full">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-orange-500"></div>
                </div>
              )}
              {/* Profile Image */}
              <img
                src={userPhoto || undefined} // Substituir string vazia por undefined
                alt="Company Logo"
                className="w-full h-full object-cover rounded-full"
              />
              {/* File Input Overlay */}
              <input
                type="file"
                className="absolute inset-0 opacity-0 cursor-pointer"
                accept="image/*"
                onChange={handleUserPhotoChange}
                disabled={isUploading || isLoadingProfile}
              />
            </div>
            {/* Display Company Name from Profile */}
            <h2 className="text-xl font-bold text-orange-500 text-center break-words">
              {companyProfile.name || "Company Dashboard"}
            </h2>
            
            {/* Navigation */}
            <ul className="space-y-4 flex-grow w-full mt-6">
              <li>
                <button
                  className={`w-full text-center p-3 rounded-lg transition-colors flex items-center justify-center ${activeTab === "notifications" ? "bg-orange-500 text-white" : "bg-black/50 hover:bg-orange-500/30"}`}
                  onClick={() => setActiveTab("notifications")}
                >
                  Notifications
                </button>
              </li>
              <li>
                <button
                  className={`w-full text-center p-3 rounded-lg transition-colors flex items-center justify-center ${activeTab === "myJobs" ? "bg-orange-500 text-white" : "bg-black/50 hover:bg-orange-500/30"}`}
                  onClick={() => setActiveTab("myJobs")}
                >
                  My Jobs
                </button>
              </li>
              <li>
                <button
                  className={`w-full text-center p-3 rounded-lg transition-colors flex items-center justify-center ${activeTab === "newJob" ? "bg-orange-500 text-white" : "bg-black/50 hover:bg-orange-500/30"}`}
                  onClick={() => setActiveTab("newJob")}
                >
                  New Jobs
                </button>
              </li>
              <li>
                <button
                  className={`w-full text-center p-3 rounded-lg transition-colors flex items-center justify-center ${activeTab === "instantJobs" ? "bg-orange-500 text-white" : "bg-black/50 hover:bg-orange-500/30"}`}
                  onClick={() => setActiveTab("instantJobs")}
                >
                  Instant Jobs
                </button>
              </li>
              {/* Add new Learn2Earn tab */}
              <li>
                <button
                  className={`w-full text-center p-3 rounded-lg transition-colors flex items-center justify-center ${activeTab === "learn2earn" ? "bg-orange-500 text-white" : "bg-black/50 hover:bg-orange-500/30"}`}
                  onClick={() => setActiveTab("learn2earn")}
                >
                  Learn2Earn
                </button>
              </li>
              <li>
                <button
                  className={`w-full text-center p-3 rounded-lg transition-colors flex items-center justify-center ${activeTab === "settings" ? "bg-orange-500 text-white" : "bg-black/50 hover:bg-orange-500/30"}`}
                  onClick={() => setActiveTab("settings")}
                >
                  Settings
                </button>
              </li>
            </ul>
          </div>
          
          {/* Logout Button */}
          <button
            onClick={handleLogout}
            className="w-full mt-6 bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded-lg flex items-center justify-center"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 001 1h12a1 1 0 001-1V4a1 1 0 00-1-1H3zm11 4a1 1 0 10-2 0v4.586l-1.293-1.293a1 1 0 00-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L14 11.586V7z" clipRule="evenodd" />
            </svg>
            Logout
          </button>
        </aside>
        
        {/* Main Content Area */}
        <section className="w-full md:w-3/4 p-6 overflow-y-auto">
          {renderContent()}
        </section>
      </main>
    </Layout>
  );
};

export default PostJobPage;