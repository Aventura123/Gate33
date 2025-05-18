"use client";

import React, { useState, useEffect, JSX, useCallback } from "react";
import Layout from "../../components/Layout";
import { useRouter } from "next/navigation";
import { collection, addDoc, getDocs, deleteDoc, doc, query, where, getDoc, updateDoc, onSnapshot, orderBy, serverTimestamp } from "firebase/firestore";
import { db } from "../../lib/firebase";
// Import payment related services
import web3Service from "../../services/web3Service";
import smartContractService from "../../services/smartContractService";
// Importing necessary services and components for Instant Jobs
import instantJobsService, { InstantJob, JobMessage } from '../../services/instantJobsService';
import InstantJobCard from '../../components/instant-jobs/InstantJobCard';
import InstantJobForm from '../../components/instant-jobs/InstantJobForm';
import MessageSystem from '../../components/instant-jobs/MessageSystem';
import WalletButton from '../../components/WalletButton';
import JobPostPayment from "./JobPostPayment";
import CompanyWelcome from "./CompanyWelcome";
import NotificationsPanel, { NotificationBell } from '../../components/ui/NotificationsPanel';
import { createCompanyNotification } from '../../lib/notifications';
import { formatDate } from "../../utils/formatDate"; // Importando a função formatDate
import dynamic from "next/dynamic";
// Dynamically import EvolutionChart with SSR disabled
const EvolutionChart = dynamic(() => import("./EvolutionChart"), { ssr: false });
// Import the Learn2EarnManager
import Learn2EarnManager from "./Learn2EarnManager";
// Import the AI Job Assistant
import AIJobAssistant from "./AIJobAssistant";

// Interface for Support Ticket
interface SupportTicket {
  id: string;
  userId: string;
  userEmail?: string;
  subject: string;
  description: string;
  status: 'pending' | 'open' | 'resolved';
  category: string;
  createdAt: string;
  updatedAt: string;
  acceptedBy?: string;
  acceptedByName?: string;
  acceptedAt?: string;
}

// Interface for Support Messages
interface SupportMessage {
  id: string;
  ticketId: string;
  senderId: string;
  senderName?: string;
  senderType: string;
  message: string;
  createdAt: string;
  isSystemMessage?: boolean;
  read?: boolean;
}

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
  requiredSkills: string | string[]; // Permitindo ambos os tipos para compatibilidade
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
  planCurrency?: string;
  paymentAmount?: string;
  screeningQuestions?: string[];
  companyWebsite?: string;
  managerName?: string;
  notes?: string;
}

// Add an interface for Company Profile
interface CompanyProfile {
  name: string;
  description: string;
  website: string;
  location: string;
  responsiblePerson?: string; // Optional field
  responsibleEmail?: string;
  address?: string;         // Optional field
  contactPhone?: string;    // Optional field
  email?: string;
  taxId?: string;
  registrationNumber?: string;
  industry?: string;
  country?: string;
  employees?: string;
  yearsActive?: string;
  linkedin?: string;
  telegram?: string;
  twitter?: string;
  facebook?: string;
  instagram?: string;
  responsiblePosition?: string;
  responsiblePhone?: string;
  comments?: string;
  officialDocumentUrl?: string;
  // Add other relevant fields as needed
}

// Helper to get a Date from Timestamp or Date
function getDate(ts: Date | import('firebase/firestore').Timestamp | undefined): Date | undefined {
  if (!ts) return undefined;
  if (ts instanceof Date) return ts;
  if (typeof (ts as any)?.toDate === 'function') return (ts as any).toDate();
  return new Date(ts as any);
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
  });  const [activeTab, setActiveTab] = useState("profile");
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
    responsibleEmail: "",
    address: "",
    contactPhone: "",
    email: "",
    taxId: "",
    registrationNumber: "",
    industry: "",
    country: "",
    employees: "",
    yearsActive: "",
    linkedin: "",
    telegram: "",
    twitter: "",
    facebook: "",
    instagram: "",
    responsiblePosition: "",
    responsiblePhone: "",
    comments: "",
    officialDocumentUrl: "",
  });
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoadingProfile, setIsLoadingProfile] = useState(false); // Loading state for profile
  const router = useRouter();

  const [pricingPlans, setPricingPlans] = useState<PricingPlan[]>([]); // State to store pricing plans

  // Instant Jobs states
  const [instantJobs, setInstantJobs] = useState<InstantJob[]>([]);
  const [selectedJob, setSelectedJob] = useState<InstantJob | null>(null);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [jobMessages, setJobMessages] = useState<JobMessage[]>([]);
  const [isSendingMessage, setIsSendingMessage] = useState(false);  const [activeSection, setActiveSection] = useState<'list' | 'create' | 'detail'>('list');
  
  // Support Tickets states
  const [supportTickets, setSupportTickets] = useState<SupportTicket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [ticketMessages, setTicketMessages] = useState<SupportMessage[]>([]);
  const [isSendingTicketMessage, setIsSendingTicketMessage] = useState(false);
  const [supportSectionActive, setSupportSectionActive] = useState<'list' | 'create' | 'detail'>('list');
  const [newTicketData, setNewTicketData] = useState({
    subject: '',
    description: '',
    category: 'general'
  });
  
  const [isMobile, setIsMobile] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [sidebarJobOffersOpen, setSidebarJobOffersOpen] = useState(false);
  const [jobOffersSubTab, setJobOffersSubTab] = useState<'list' | 'new' | 'instant'>('list');

  const [jobsTab, setJobsTab] = useState<'offers' | 'instant'>('offers');

  const isProduction = process.env.NEXT_PUBLIC_DEPLOY_STAGE === 'production';

  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [totalApplications, setTotalApplications] = useState<number>(0);
  const [learn2earn, setLearn2earn] = useState<any[]>([]); // Novo estado para Learn2Earn

  // Function to fetch pricing plans from Firebase
  const fetchPricingPlans = useCallback(async () => {
    try {
      const pricingPlansCollection = collection(db, "jobPlans"); // Changed to "jobPlans"
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

  // Fetch pricing plans when component mounts
  useEffect(() => {
    fetchPricingPlans();
  }, [fetchPricingPlans]);

  // Função para buscar os Learn2Earn da empresa
  const fetchLearn2Earn = useCallback(async () => {
    if (!db || !companyId) return;
    try {
      const l2eCollection = collection(db, "learn2earn");
      const q = query(l2eCollection, where("companyId", "==", companyId));
      const snapshot = await getDocs(q);
      const fetched = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt || null,
      }));
      setLearn2earn(fetched);
    } catch (error) {
      setLearn2earn([]);
    }
  }, [db, companyId]);

  // Buscar Learn2Earn ao carregar ou mudar companyId
  useEffect(() => {
    fetchLearn2Earn();
  }, [fetchLearn2Earn]);

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
      router.replace("/login");
    }
  };  const fetchCompanyPhoto = async (id: string) => {
    try {
      console.log("Fetchando foto para companyId:", id);
      const response = await fetch(`/api/company/photo?companyId=${id}`);
      console.log("Resposta do servidor:", response.status, response.statusText);
      
      if (!response.ok) {
        console.error("Erro ao buscar foto:", response.status, response.statusText);
        setUserPhoto(""); // Clear photo on error
        return;
      }
      
      let data;
      try {
        const textResponse = await response.text();
        console.log("Resposta bruta:", textResponse.substring(0, 200)); // Log primeiros 200 caracteres
        
        try {
          data = JSON.parse(textResponse);
          console.log("Dados JSON parseados com sucesso:", data);
        } catch (jsonError) {
          console.error("Erro ao fazer parse do JSON:", jsonError);
          console.error("Resposta não é um JSON válido:", textResponse.substring(0, 200));
          setUserPhoto(""); // Clear photo on error
          return;
        }
      } catch (textError) {
        console.error("Erro ao ler resposta como texto:", textError);
        setUserPhoto(""); // Clear photo on error
        return;
      }
      
      if (data.photoUrl || data.photoURL) {
        console.log("URL da foto encontrada:", data.photoUrl || data.photoURL);
        setUserPhoto(data.photoUrl || data.photoURL); // Verificando ambos os campos
      } else {
        console.log("Nenhuma URL de foto encontrada nos dados");
        setUserPhoto(""); // Clear photo if not found
      }
    } catch (error) {
      console.error("Erro ao buscar foto da empresa:", error);
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
          responsibleEmail: data.responsibleEmail || "",
          address: data.address || "",
          contactPhone: data.contactPhone || "",
          email: data.email || "",
          taxId: data.taxId || "",
          registrationNumber: data.registrationNumber || "",
          industry: data.industry || "",
          country: data.country || "",
          employees: data.employees || "",
          yearsActive: data.yearsActive || "",
          linkedin: data.linkedin || "",
          telegram: data.telegram || "",
          twitter: data.twitter || "",
          facebook: data.facebook || "",
          instagram: data.instagram || "",
          responsiblePosition: data.responsiblePosition || "",
          responsiblePhone: data.responsiblePhone || "",
          comments: data.comments || "",
          officialDocumentUrl: data.officialDocumentUrl || "",
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
          responsiblePerson: "", responsibleEmail: "", address: "", contactPhone: "", email: "", taxId: "", registrationNumber: "",
          industry: "", country: "", employees: "", yearsActive: "", linkedin: "", telegram: "", twitter: "", facebook: "", instagram: "",
          responsiblePosition: "", responsiblePhone: "", comments: "", officialDocumentUrl: ""
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
        setCompanyId(decodedToken);        // Fetch data once companyId is set
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
          
          // Also fetch instant jobs when the component mounts
          try {
            console.log('[InstantJobs] Loading initial jobs for companyId:', decodedToken);
            const instantJobs = await instantJobsService.getInstantJobsByCompany(decodedToken);
            console.log('[InstantJobs] Initial jobs fetched:', instantJobs);
            setInstantJobs(instantJobs);
          } catch (error) {
            console.error('Error loading initial instant jobs:', error);
          }
        };
        fetchInitialJobs();
      } catch (error) {
        console.error("Error decoding token or fetching initial data:", error);
        router.replace("/login");
      }
    } else {
      router.replace("/login");
    }
  }, [router, fetchCompanyProfile]); // Add fetchCompanyProfile dependency

  // Fix the conditional in the useEffect for reloading data
  useEffect(() => {
    if (activeTab === "myJobs" || activeTab === "settings") {
      reloadData();
    }
  }, [activeTab, reloadData]);
  // Old notifications fetch function removed
    // Old notifications fetch effect removed

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
        console.log("Enviando arquivo para o servidor...", {
          fileName: file.name,
          fileType: file.type,
          fileSize: file.size,
          companyId
        });
        
        const response = await fetch("/api/company/photo", {
          method: "POST",
          body: formData,
        });
        
        console.log("Resposta recebida do servidor:", {
          status: response.status,
          statusText: response.statusText
        });

        // Tentar ler a resposta primeiro como texto para garantir que seja um JSON válido
        let responseData;
        const responseText = await response.text();
        console.log("Resposta do texto:", responseText.substring(0, 200));
        
        try {
          responseData = JSON.parse(responseText);
          console.log("Dados da resposta:", responseData);
        } catch (jsonError) {
          console.error("Erro ao analisar JSON:", jsonError);
          throw new Error("Resposta do servidor não é um JSON válido");
        }
        
        if (!response.ok) {
          throw new Error(responseData.message || "Falha ao fazer upload da foto");
        }
        
        // Update the photo with the URL returned by the server
        const photoUrl = responseData.url || responseData.photoURL || responseData.photoUrl;
        if (photoUrl) {
          console.log("URL da foto recebida:", photoUrl);
          setUserPhoto(photoUrl);
        } else {
          console.warn("Nenhuma URL de foto encontrada na resposta");
        }
        
        console.log("Upload concluído com sucesso!");
        
        // Reload the data to ensure everything is updated
        reloadData();
      } catch (error: any) {
        console.error("Erro detalhado ao enviar foto da empresa:", error);
        alert(`Falha ao fazer upload da foto: ${error.message || "Erro desconhecido"}`);
        
        // Reverter para foto anterior ou limpar
        fetchCompanyPhoto(companyId);
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
  const [expandedJobId, setExpandedJobId] = useState<string | null>(null); // Track expanded card
  const renderMyJobs = () => {
    const companyJobs = jobs; // Jobs state should already be filtered by companyId
  
    if (companyJobs.length === 0) {
      return (
        <div className="text-center py-8">
          <p className="text-gray-300">You haven't posted any jobs yet.</p>
          <button
            onClick={() => {
              setActiveTab("newJob");
            }}
            className="mt-4 bg-orange-900 text-white py-2 px-4 rounded hover:bg-orange-600"
          >
            Create New Job
          </button>
        </div>
      );
    }
  
    return (
      <div className="w-full">
        <div className="bg-black/70 rounded-lg shadow-lg p-6">
          {/* Main section title */}
          <h2 className="text-3xl font-bold text-orange-500 mb-2">All Offers</h2>
          <div className="flex gap-6 mb-6 items-end border-b border-orange-900/60">
            <button
              className={`relative text-base font-semibold mr-2 transition-colors pb-1 ${jobsTab === 'offers' ? 'text-orange-500' : 'text-orange-300 hover:text-orange-400'}`}
              onClick={() => setJobsTab('offers')}
            >
              All Job Offers
              {jobsTab === 'offers' && (
                <span className="absolute left-0 right-0 -bottom-[2px] h-[2px] bg-orange-500 rounded" />
              )}
            </button>
            <button
              className={`relative text-base font-semibold transition-colors pb-1 ${jobsTab === 'instant' ? 'text-orange-500' : 'text-orange-300 hover:text-orange-400'}`}
              onClick={() => setJobsTab('instant')}
            >
              All Instant Jobs
              {jobsTab === 'instant' && (
                <span className="absolute left-0 right-0 -bottom-[2px] h-[2px] bg-orange-500 rounded" />
              )}
            </button>
          </div>
          {jobsTab === 'offers' ? (
            <div className="space-y-3">
              {companyJobs.map((job) => {
                const createdAt = job.createdAt?.toDate?.() || null;
                const expirationDate = job.expiresAt?.toDate?.() || (createdAt && job.pricingPlanId ? new Date(createdAt.getTime() + (pricingPlans.find(p => p.id === job.pricingPlanId)?.duration || 30) * 24 * 60 * 60 * 1000) : null);
                const planName = job.pricingPlanId ? (pricingPlans.find(p => p.id === job.pricingPlanId)?.name || "Basic") : "Basic";
                const isExpanded = expandedJobId === job.id;
                return (
                  <div
                    key={job.id}
                    className={`bg-black/60 rounded-lg border border-orange-900/30 transition-all duration-200 cursor-pointer hover:shadow-lg`}
                    onClick={() => setExpandedJobId(isExpanded ? null : job.id)}
                  >
                    <div className="flex items-center justify-between p-4">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-1 w-full">
                        <div>
                          <span className="block text-xs text-orange-300">Title</span>
                          <span className="font-semibold text-orange-400">{job.title}</span>
                        </div>
                        <div>
                          <span className="block text-xs text-orange-300">Category</span>
                          <span className="text-gray-200">{job.category}</span>
                        </div>
                        {!isExpanded ? (
                          <>
                            <div>
                              <span className="block text-xs text-orange-300">Start Date</span>
                              <span className="text-gray-200">{createdAt ? createdAt.toLocaleDateString() : '-'}</span>
                            </div>
                            <div>
                              <span className="block text-xs text-orange-300">Expires</span>
                              <span className="text-gray-200">{expirationDate ? expirationDate.toLocaleDateString() : '-'}</span>
                            </div>
                          </>
                        ) : (
                          <div>
                            <span className="block text-xs text-orange-300">Salary</span>
                            <span className="text-gray-200">{job.salaryRange || '-'}</span>
                          </div>
                        )}
                      </div>
                      <button
                        onClick={e => { e.stopPropagation(); handleDeleteJob(job.id); }}
                        className="ml-4 bg-red-500 hover:bg-red-600 text-white px-3 py-2 rounded text-sm flex-shrink-0"
                      >
                        Delete
                      </button>
                    </div>
                    {isExpanded && (
                      <div className="px-6 pb-4 pt-2 text-sm text-gray-200">
                        <div className="mb-2">
                          <span className="font-semibold text-orange-300">Description:</span> {job.description || '-'}
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-2">
                          <div>
                            <span className="text-orange-300">Company:</span> {job.company || '-'}
                          </div>
                          <div>
                            <span className="text-orange-300">Employment Type:</span> {job.employmentType || '-'}
                          </div>
                          <div>
                            <span className="text-orange-300">Experience Level:</span> {job.experienceLevel || '-'}</div>
                          <div>
                            <span className="text-orange-300">Plan:</span> {planName}
                          </div>
                          {job.planCurrency && (
                            <div>
                              <span className="text-orange-300">Plan Currency:</span> {job.planCurrency}
                            </div>
                          )}
                          {job.paymentAmount && (
                            <div>
                              <span className="text-orange-300">Payment Amount:</span> {job.paymentAmount}
                            </div>
                          )}
                          {job.paymentStatus && (
                            <div>
                              <span className="text-orange-300">Payment Status:</span> {job.paymentStatus}
                            </div>
                          )}
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          <div>
                            <span className="text-orange-300">Created At:</span> {createdAt ? createdAt.toLocaleDateString() : '-'}
                          </div>
                          <div>
                            <span className="text-orange-300">Expires:</span> {expirationDate ? expirationDate.toLocaleDateString() : '-'}
                          </div>
                        </div>
                        {job.requiredSkills && (
                          <div className="mt-2">
                            <span className="text-orange-300">Skills:</span> {Array.isArray(job.requiredSkills) ? job.requiredSkills.join(', ') : job.requiredSkills}
                          </div>
                        )}
                        {job.screeningQuestions && Array.isArray(job.screeningQuestions) && job.screeningQuestions.length > 0 &&
                          (!job.applicationLink || (job.applicationLink && job.applicationLink.length > 0)) && (
                            <div className="mt-2">
                              <span className="text-orange-300">Screening Questions:</span>
                              <ul className="list-disc list-inside ml-4">
                                {job.screeningQuestions.map((q: string, idx: number) => (
                                  <li key={idx}>{q}</li>
                                ))}
                              </ul>
                            </div>
                          )
                        }
                        {job.applicationLink && (
                          <div className="mt-2">
                            <span className="text-orange-300">Application Link:</span> <a href={job.applicationLink} className="underline text-orange-400" target="_blank" rel="noopener noreferrer">{job.applicationLink}</a>
                          </div>
                        )}
                        {job.contactEmail && (
                          <div className="mt-2">
                            <span className="text-orange-300">Contact Email:</span> {job.contactEmail}
                          </div>
                        )}
                        {job.companyWebsite && (
                          <div className="mt-2">
                            <span className="text-orange-300">Company Website:</span> <a href={job.companyWebsite} className="underline text-orange-400" target="_blank" rel="noopener noreferrer">{job.companyWebsite}</a>
                          </div>
                        )}
                        {job.managerName && (
                          <div className="mt-2">
                            <span className="text-orange-300">Manager Name:</span> {job.managerName}
                          </div>
                        )}
                        {job.salaryRange && (
                          <div className="mt-2">
                            <span className="text-orange-300">Salary Range:</span> {job.salaryRange}
                          </div>
                        )}
                        {job.location && (
                          <div className="mt-2">
                            <span className="text-orange-300">Location:</span> {job.location}
                          </div>
                        )}
                        {job.notes && (
                          <div className="mt-2">
                            <span className="text-orange-300">Notes:</span> {job.notes}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : isProduction ? (
            <div className="flex flex-col items-center justify-center py-16">
              <h2 className="text-4xl font-bold mb-4 text-orange-500">Coming Soon</h2>
              <p className="text-lg text-gray-300">This feature will be available soon.</p>
            </div>
          ) : (
            <div className="bg-black/70 rounded-lg shadow-lg p-6">
              {/* Unified Instant Jobs UI for both dedicated tab and Job Offers > Instant Jobs */}
              {activeSection === 'list' ? (
                instantJobs.length === 0 ? (
                  <div className="text-center py-8 text-gray-300">No instant jobs found.</div>
                ) : (
                  <div className="space-y-3">
                    {instantJobs.map((job) => (
                      <div
                        key={job.id}
                        className={`bg-black/60 rounded-lg border border-orange-900/30 p-4 cursor-pointer hover:shadow-lg`}
                        onClick={() => {
                          setSelectedJobId(job.id ?? null);
                          setSelectedJob(job);
                          setActiveSection('detail');
                        }}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-semibold text-orange-400">{job.title}</div>
                            <div className="text-xs text-orange-300">{job.category}</div>
                          </div>
                          <div className="text-right">
                            <div className="text-gray-200 font-bold">{job.budget} {job.currency}</div>
                            <div className="text-xs text-gray-400">Deadline: {formatDateOrTimestamp(job.deadline, {dateOnly: true})}</div>
                          </div>
                        </div>
                        <div className="mt-2 text-xs text-gray-400 line-clamp-2">{job.description}</div>
                      </div>
                    ))}
                  </div>
                )
              ) : activeSection === 'detail' && selectedJob ? (
                <InstantJobDetailCard
                  job={selectedJob}
                  messages={jobMessages}
                  onBack={() => setActiveSection('list')}
                  onSendMessage={handleSendMessage}
                  isSending={isSendingMessage}
                  companyProfile={companyProfile}
                  handleApproveJob={handleApproveJob}
                />
              ) : null}
            </div>
          )}
        </div>
      </div>
    );
  };

  // Function to render the Settings form
  const renderSettings = () => {
    return (
      <div className="bg-black/70 p-10 rounded-lg shadow-lg">
        <h2 className="text-3xl font-semibold text-orange-500 mb-8">Company Settings</h2>
        <form className="space-y-8" onSubmit={handleProfileSubmit}>
          {/* Main two-column grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            {/* Left: Company Data */}
            <div>
              <h3 className="text-lg font-bold text-orange-400 mb-4">Company Data</h3>
              <div className="space-y-3">
                <input type="text" name="name" value={companyProfile.name ?? ""} disabled className="w-full p-3 bg-black/30 border border-orange-500/30 rounded-lg text-gray-400 text-sm cursor-not-allowed" placeholder="Company Name" />
                <input type="text" name="industry" value={companyProfile.industry ?? ""} disabled className="w-full p-3 bg-black/30 border border-orange-500/30 rounded-lg text-gray-400 text-sm cursor-not-allowed" placeholder="Industry" />
                <input type="text" name="taxId" value={companyProfile.taxId ?? ""} disabled className="w-full p-3 bg-black/30 border border-orange-500/30 rounded-lg text-gray-400 text-sm cursor-not-allowed" placeholder="Tax ID / VAT" />
                <input type="text" name="registrationNumber" value={companyProfile.registrationNumber ?? ""} disabled className="w-full p-3 bg-black/30 border border-orange-500/30 rounded-lg text-gray-400 text-sm cursor-not-allowed" placeholder="Registration Number" />
                <input type="text" name="country" value={companyProfile.country ?? ""} disabled className="w-full p-3 bg-black/30 border border-orange-500/30 rounded-lg text-gray-400 text-sm cursor-not-allowed" placeholder="Country" />
                <input type="text" name="address" value={companyProfile.address ?? ""} disabled className="w-full p-3 bg-black/30 border border-orange-500/30 rounded-lg text-gray-400 text-sm cursor-not-allowed" placeholder="Address" />
                <input type="text" name="employees" value={companyProfile.employees ?? ""} disabled className="w-full p-3 bg-black/30 border border-orange-500/30 rounded-lg text-gray-400 text-sm cursor-not-allowed" placeholder="Employees" />
                <input type="text" name="yearsActive" value={companyProfile.yearsActive ?? ""} disabled className="w-full p-3 bg-black/30 border border-orange-500/30 rounded-lg text-gray-400 text-sm cursor-not-allowed" placeholder="Years Active" />
                <input type="email" name="email" value={companyProfile.email ?? ""} disabled className="w-full p-3 bg-black/30 border border-orange-500/30 rounded-lg text-gray-400 text-sm cursor-not-allowed" placeholder="Company Email" />
                <input type="url" name="website" value={companyProfile.website ?? ""} disabled className="w-full p-3 bg-black/30 border border-orange-500/30 rounded-lg text-gray-400 text-sm cursor-not-allowed" placeholder="Company Website" />
              </div>
            </div>
            {/* Right: Responsible Person Data */}
            <div>
              <h3 className="text-lg font-bold text-orange-400 mb-4">Responsible Person</h3>
              <div className="space-y-3">
                <input type="text" name="responsiblePerson" value={companyProfile.responsiblePerson ?? ""} onChange={handleProfileChange} className="w-full p-3 bg-black/50 border border-orange-500/30 rounded-lg text-white text-sm" placeholder="Responsible Person" />
                <input type="text" name="responsiblePosition" value={companyProfile.responsiblePosition ?? ""} disabled className="w-full p-3 bg-black/30 border border-orange-500/30 rounded-lg text-gray-400 text-sm cursor-not-allowed" placeholder="Responsible Position" />
                <input type="email" name="responsibleEmail" value={companyProfile.responsibleEmail ?? ""} onChange={handleProfileChange} className="w-full p-3 bg-black/50 border border-orange-500/30 rounded-lg text-white text-sm" placeholder="Responsible Email" />
                <input type="tel" name="responsiblePhone" value={companyProfile.responsiblePhone ?? ""} disabled className="w-full p-3 bg-black/30 border border-orange-500/30 rounded-lg text-gray-400 text-sm cursor-not-allowed" placeholder="Responsible Phone" />
                <input type="tel" name="contactPhone" value={companyProfile.contactPhone ?? ""} onChange={handleProfileChange} className="w-full p-3 bg-black/50 border border-orange-500/30 rounded-lg text-white text-sm" placeholder="Contact Phone" />
                <textarea name="comments" value={companyProfile.comments ?? ""} disabled className="w-full p-3 bg-black/30 border border-orange-500/30 rounded-lg text-gray-400 text-sm cursor-not-allowed" placeholder="Observations / Comments (optional)" rows={2} />
                {companyProfile.officialDocumentUrl && (
                  <a href={companyProfile.officialDocumentUrl} target="_blank" rel="noopener noreferrer" className="block text-orange-400 underline">View Official Document</a>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                  <input type="password" name="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full p-3 bg-black/50 border border-orange-500/30 rounded-lg text-white text-sm" placeholder="New Password" autoComplete="new-password" />
                  <input type="password" name="confirmPassword" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className="w-full p-3 bg-black/50 border border-orange-500/30 rounded-lg text-white text-sm" placeholder="Confirm New Password" autoComplete="new-password" />
                </div>
              </div>
            </div>
          </div>
          {/* Horizontal section below: Description & Social Links */}
          <div className="mt-10 pt-8 border-t border-orange-900/30 grid grid-cols-1 md:grid-cols-2 gap-10">
            <div>
              <h3 className="text-lg font-bold text-orange-400 mb-3">Company Description</h3>
              <textarea name="description" value={companyProfile.description ?? ""} onChange={handleProfileChange} className="w-full p-3 bg-black/50 border border-orange-500/30 rounded-lg text-white text-sm min-h-[90px]" placeholder="Company Description" rows={4} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-orange-400 mb-3">Social Links</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <input type="url" name="linkedin" value={companyProfile.linkedin ?? ""} disabled className="w-full p-3 bg-black/30 border border-orange-500/30 rounded-lg text-gray-400 text-sm cursor-not-allowed" placeholder="LinkedIn (optional)" />
                <input type="text" name="telegram" value={companyProfile.telegram ?? ""} disabled className="w-full p-3 bg-black/30 border border-orange-500/30 rounded-lg text-gray-400 text-sm cursor-not-allowed" placeholder="Telegram (optional)" />
                <input type="text" name="twitter" value={companyProfile.twitter ?? ""} disabled className="w-full p-3 bg-black/30 border border-orange-500/30 rounded-lg text-gray-400 text-sm cursor-not-allowed" placeholder="Twitter (optional)" />
                <input type="text" name="facebook" value={companyProfile.facebook ?? ""} disabled className="w-full p-3 bg-black/30 border border-orange-500/30 rounded-lg text-gray-400 text-sm cursor-not-allowed" placeholder="Facebook (optional)" />
                <input type="text" name="instagram" value={companyProfile.instagram ?? ""} disabled className="w-full p-3 bg-black/30 border border-orange-500/30 rounded-lg text-gray-400 text-sm cursor-not-allowed" placeholder="Instagram (optional)" />
              </div>
            </div>
          </div>
          {/* Save button and info */}
          <div className="flex flex-col md:flex-row items-center justify-between mt-8 gap-4">
            <p className="text-sm text-gray-400 md:mb-0 mb-2">
              Only the description, representative data and password can be changed. Other fields are for reference only.
            </p>
            <button
              type="submit"
              disabled={isLoadingProfile}
              className={`border border-orange-400 text-orange-400 bg-transparent hover:bg-orange-900/30 hover:text-white py-2 px-8 rounded-full font-semibold text-base transition-colors w-full md:w-auto ${isLoadingProfile ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {isLoadingProfile ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    );
  };

  // Functions for Instant Jobs
  // Function to load Instant Jobs
  const loadInstantJobs = async () => {
    try {
      console.log('[InstantJobs] Loading for companyId:', companyId);
      const jobs = await instantJobsService.getInstantJobsByCompany(companyId);
      console.log('[InstantJobs] Jobs fetched from Firestore:', jobs);
      setInstantJobs(jobs);
      // Log after state update (async, so use setTimeout)
      setTimeout(() => {
        console.log('[InstantJobs] instantJobs state after set:', jobs);
      }, 100);
    } catch (error) {
      console.error('Error loading micro-tasks:', error);
    }
  };
  
  // Function to load messages of an Instant Job
  const loadJobMessages = async (jobId: string) => {
  };
  
  // Function to send message
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

      // Reload messages after sending
      await loadJobMessages(selectedJobId);
    } catch (error) {
      console.error("Error sending message:", error);
    } finally {
      setIsSendingMessage(false);
    }
  };
  // We no longer need handleCreateInstantJob since we moved this functionality
  // to the InstantJobForm component
  
  // Function to approve a completed job
  const handleApproveJob = async (jobId: string) => {
    try {
      await instantJobsService.approveJob(jobId, companyId);
      alert("Micro-task approved successfully!");
      
      // Update the list of jobs
      loadInstantJobs();
      
      // If viewing the details of the approved job, update it
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
  
  // Load instantJobs when necessary
  useEffect(() => {
    if (jobsTab === "instant" && companyId) {
      loadInstantJobs();
    }
  }, [jobsTab, companyId]);
  
  // Load job details when selecting one
  useEffect(() => {
    if (selectedJobId) {
      const job = instantJobs.find(job => job.id === selectedJobId);
      if (job) {
        setSelectedJob(job);
        loadJobMessages(selectedJobId);
      }
    }
  }, [selectedJobId]);

  // Reusable component to render the Instant Job detail/message card
const InstantJobDetailCard: React.FC<{
  job: InstantJob,
  messages: JobMessage[],
  onBack: () => void,
  onSendMessage: (msg: string) => void,
  isSending: boolean,
  companyProfile: CompanyProfile,
  handleApproveJob: (jobId: string) => void
}> = ({
  job,
  messages,
  onBack,
  onSendMessage,
  isSending,
  companyProfile,
  handleApproveJob
}) => {
  const [messageInput, setMessageInput] = useState("");

  return (
    <div className="bg-black/80 rounded-lg shadow-lg p-6">
      <button
        onClick={onBack}
        className="text-orange-400 hover:text-orange-300 mb-4"
      >
        &larr; Back
      </button>
      <div className="mb-4">
        <h3 className="text-2xl font-bold text-orange-400 mb-2">{job.title}</h3>
        <div className="text-sm text-orange-300 mb-1">{job.category}</div>
        <div className="text-gray-200 mb-2">{job.description}</div>
        <div className="flex flex-wrap gap-4 text-xs text-gray-400 mb-2">
          <div>Budget: <span className="text-orange-300 font-semibold">{job.budget} {job.currency}</span></div>
          <div>Deadline: <span className="text-orange-300">{formatDateOrTimestamp(job.deadline, {dateOnly: true})}</span></div>
          <div>Skills: <span className="text-orange-300">{Array.isArray(job.requiredSkills) ? job.requiredSkills.join(', ') : job.requiredSkills || '-'}</span></div>
        </div>
        <div className="text-xs text-gray-400 mb-2">Status: <span className="text-orange-300">{job.status || '-'}</span></div>
        {job.id && (
          <button
            onClick={() => handleApproveJob(job.id!)}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded text-xs mt-2"
          >
            Approve Completion
          </button>
        )}
      </div>
      <div className="border-t border-orange-900/30 pt-4">
        <h4 className="text-lg font-semibold text-orange-400 mb-2">Messages</h4>
        <div className="max-h-48 overflow-y-auto space-y-2 mb-4">          {messages.length === 0 ? (
            <div className="text-gray-400 text-sm">No messages yet.</div>
          ) : (
            messages.map((msg, idx) => (
              <div key={msg.id || idx} className={`p-2 rounded ${msg.senderType === 'company' ? 'bg-orange-900/40 text-orange-200' : 'bg-gray-800/60 text-gray-200'}`}>
                <div className="text-xs font-semibold mb-1">{msg.senderName || msg.senderType}</div>
                <div className="text-sm">{msg.message}</div>
                <div className="text-xs text-gray-400 mt-1">{formatDateOrTimestamp(msg.timestamp)}</div>
              </div>
            ))
          )}
        </div>
        <form
          onSubmit={e => {
            e.preventDefault();
            if (messageInput.trim()) {
              onSendMessage(messageInput);
              setMessageInput("");
            }
          }}
          className="flex gap-2"
        >
          <input
            type="text"
            value={messageInput}
            onChange={e => setMessageInput(e.target.value)}
            className="flex-1 rounded px-3 py-2 bg-gray-900 text-white border border-orange-900/30 focus:outline-none"
            placeholder="Type your message..."
            disabled={isSending}
          />
          <button
            type="submit"
            className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded"
            disabled={isSending || !messageInput.trim()}
          >
            {isSending ? 'Sending...' : 'Send'}
          </button>
        </form>
      </div>
    </div>
  );
};
  // Render the Instant Jobs tab
  const renderInstantJobsTab = () => {
    // Use our new InstantJobForm component
    return (
      <InstantJobForm 
        companyId={companyId}
        companyName={companyProfile.name}
        onJobCreated={() => {
          setActiveSection('list');
          loadInstantJobs();
        }}
        onCancel={() => setActiveSection('list')}
      />
    );
  };
  // Render content based on active tab
  const renderContent = () => {
    console.log('Rendering content for activeTab:', activeTab);
    console.log('Current instantJobs count:', instantJobs.length);
    
    switch (activeTab) {
      case "profile":
        // Dados para o gráfico de evolução (últimos 8 períodos)
        const now = new Date();
        const periods = Array.from({ length: 8 }, (_, i) => {
          const d = new Date(now);
          d.setDate(now.getDate() - (7 - i));
          return d;
        });
        // Função para formatar data (ex: 14/05)
        const fmt = (d: Date) => `${d.getDate().toString().padStart(2, "0")}/${(d.getMonth()+1).toString().padStart(2, "0")}`;
        // Contagem por período para jobs, instantJobs e learn2earn
        const evolutionData = periods.map(date => {
          const jobsCount = jobs.filter(j => j.createdAt && getDate(j.createdAt)! <= date).length;
          const instantJobsCount = instantJobs.filter(j => j.createdAt && getDate(j.createdAt)! <= date).length;
          const learn2earnCount = learn2earn.filter(l2e => l2e.createdAt && getDate(l2e.createdAt)! <= date).length;
          return {
            date: fmt(date),
            jobs: jobsCount,
            instantJobs: instantJobsCount,
            learn2earn: learn2earnCount,
          };
        });
        return (
          <>
            <CompanyWelcome
              name={companyProfile.name}
              industry={companyProfile.industry}
              country={companyProfile.country}
              responsiblePerson={companyProfile.responsiblePerson}
            />
            {/* Quick summary of job offers and counts */}
            <div className="grid grid-cols-1 sm:grid-cols-5 gap-4 my-8">
              <div className="bg-black/60 rounded-lg p-5 flex flex-col items-center border border-orange-900/30">
                <span className="text-sm text-gray-400 mb-1">Active Jobs</span>
                <span className="text-2xl font-bold text-orange-400">{jobs.filter(j => !j.expiresAt || (j.expiresAt && j.expiresAt.toDate() > new Date())).length}</span>
              </div>
              <div className="bg-black/60 rounded-lg p-5 flex flex-col items-center border border-orange-900/30">
                <span className="text-sm text-gray-400 mb-1">Expired Jobs</span>
                <span className="text-2xl font-bold text-orange-400">{jobs.filter(j => j.expiresAt && j.expiresAt.toDate() <= new Date()).length}</span>
              </div>
              <div className="bg-black/60 rounded-lg p-5 flex flex-col items-center border border-orange-900/30">
                <span className="text-sm text-gray-400 mb-1">Total Applications</span>
                <span className="text-2xl font-bold text-orange-400">{totalApplications}</span>
              </div>
              <div className="bg-black/60 rounded-lg p-5 flex flex-col items-center border border-orange-900/30">
                <span className="text-sm text-gray-400 mb-1">Instant Jobs</span>
                <span className="text-2xl font-bold text-orange-400">{instantJobs.length}</span>
              </div>
              <div className="bg-black/60 rounded-lg p-5 flex flex-col items-center border border-orange-900/30">
                <span className="text-sm text-gray-400 mb-1">Learn2Earn</span>
                <span className="text-2xl font-bold text-orange-400">{learn2earn.length}</span>
              </div>
            </div>
            {/* Evolution chart section - translated title */}
            <div className="mt-2">
              <EvolutionChart data={evolutionData} />
            </div>
          </>
        );
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
            <JobPostPayment companyId={companyId} companyProfile={companyProfile} reloadData={reloadData} />
          </div>
        );
      case "instantJobs":
        return renderInstantJobsTab();
      case "settings":
        return renderSettings();
      case "learn2earn":
        return (
          <div className="bg-black/70 p-10 rounded-lg shadow-lg">
            <h2 className="text-3xl font-semibold text-orange-500 mb-6">Learn2Earn Opportunities</h2>
            <Learn2EarnManager
              companyId={companyId}
              companyProfile={companyProfile}
              db={db}
            />
          </div>
        );
      case "support":
        return (
          <div className="bg-black/70 p-10 rounded-lg shadow-lg">
            <h2 className="text-3xl font-semibold text-orange-500 mb-6">Support Tickets</h2>
            {renderSupportTickets()}
          </div>
        );
      default:
        return <div>Page not found.</div>;
    }
  };

  useEffect(() => {
    const loadPricingPlans = async () => {
      fetchPricingPlans();
    };

    loadPricingPlans();
  }, [fetchPricingPlans]);

  // Add new tab for Instant Jobs
  const tabs = [
    { id: "profile", label: "Company Profile" },
    { id: "jobs", label: "Jobs" },
    { id: "instantJobs", label: "Instant Jobs" },
    { id: "settings", label: "Settings" },
    // Other existing tabs...
  ];

  // Support Tickets Functions
  // Function to fetch support tickets
  const fetchSupportTickets = useCallback(async () => {
    if (!db || !companyId) return;

    try {
      const ticketsCollection = collection(db, "supportTickets");
      const q = query(
        ticketsCollection, 
        where("userId", "==", companyId),
        where("userType", "==", "company"),
        orderBy("createdAt", "desc")
      );
      
      const ticketsSnapshot = await getDocs(q);
      const fetchedTickets: SupportTicket[] = ticketsSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate?.().toISOString() || new Date().toISOString(),
        updatedAt: doc.data().updatedAt?.toDate?.().toISOString() || new Date().toISOString(),
      } as SupportTicket));
      
      setSupportTickets(fetchedTickets);
    } catch (error) {
      console.error("Error fetching support tickets:", error);
    }
  }, [db, companyId]);

  // Function to fetch ticket messages
  const fetchTicketMessages = useCallback(async (ticketId: string) => {
    if (!db || !ticketId) return;

    try {
      const messagesCollection = collection(db, "supportMessages");
      const q = query(
        messagesCollection,
        where("ticketId", "==", ticketId),
        orderBy("createdAt", "asc")
      );
      
      const messagesSnapshot = await getDocs(q);
      const fetchedMessages: SupportMessage[] = messagesSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate?.().toISOString() || new Date().toISOString(),
      } as SupportMessage));
      
      setTicketMessages(fetchedMessages);
    } catch (error) {
    }
  }, [db]);

  // Function to create new ticket
  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!db || !companyId || !companyProfile.name) {
      alert("You need to be logged in to create a support ticket.");
      return;
    }
    
    if (!newTicketData.subject || !newTicketData.description) {
      alert("Please fill in all required fields.");
      return;
    }
    
    try {
      const ticketData = {
        userId: companyId,
        userName: companyProfile.name,
        userEmail: companyProfile.responsiblePerson || "",
        userType: "company",
        subject: newTicketData.subject,
        description: newTicketData.description,
        category: newTicketData.category,
        status: "pending" as const,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      
      // Add ticket to Firestore
      const ticketsCollection = collection(db, "supportTickets");
      const docRef = await addDoc(ticketsCollection, ticketData);
      
      // Add initial system message
      const messagesCollection = collection(db, "supportMessages");
      await addDoc(messagesCollection, {
        ticketId: docRef.id,
        senderId: "system",
        senderName: "System",
        senderType: "system",
        message: "Ticket created. Our support team will respond shortly.",
        createdAt: serverTimestamp(),
        isSystemMessage: true
      });
        // Create notification for support team
      const notificationsCollection = collection(db, "supportNotifications");
      await addDoc(notificationsCollection, {
        ticketId: docRef.id,
        userId: companyId,
        userName: companyProfile.name,
        userType: "company",
        subject: newTicketData.subject,
        status: "new",
        createdAt: serverTimestamp(),
        read: false
      });
      
      // Create standardized notification for the company
      await createCompanyNotification({
        companyId: companyId,
        title: "Support Ticket Created",
        body: `Your support ticket "${newTicketData.subject}" has been created. Our team will respond shortly.`,
        type: "support_ticket_created",
        read: false,
        data: { ticketId: docRef.id }
      });
      
      // Reset form and fetch updated list
      setNewTicketData({
        subject: "",
        description: "",
        category: "general"
      });
      
      setSupportSectionActive("list");
      fetchSupportTickets();
      
      alert("Support ticket created successfully!");
    } catch (error) {
      console.error("Error creating support ticket:", error);
      alert("Error creating support ticket. Please try again.");
    }
  };

  // Function to send a message in a ticket
  const handleSendTicketMessage = async (message: string) => {
    if (!db || !companyId || !selectedTicketId || !message) return;
    
    setIsSendingTicketMessage(true);
    
    try {
      // Add message to Firestore
      const messagesCollection = collection(db, "supportMessages");
      await addDoc(messagesCollection, {
        ticketId: selectedTicketId,
        senderId: companyId,
        senderName: companyProfile.name || "Company",
        senderType: "company",
        message: message,
        createdAt: serverTimestamp(),
        read: false
      });
      
      // Update ticket's updatedAt timestamp
      const ticketRef = doc(db, "supportTickets", selectedTicketId);
      await updateDoc(ticketRef, {
        updatedAt: serverTimestamp()
      });
        // Create notification for support team
      const notificationsCollection = collection(db, "supportNotifications");
      await addDoc(notificationsCollection, {
        ticketId: selectedTicketId,
        userId: companyId,
        userName: companyProfile.name || "Company",
        userType: "company",
        message: message,
        status: "reply",
        createdAt: serverTimestamp(),
        read: false
      });
      
      // No need to create a notification for the company here since they're the ones sending the message
      
      // Reload messages
      fetchTicketMessages(selectedTicketId);
    } catch (error) {
      console.error("Error sending message:", error);
      alert("Error sending message. Please try again.");
    } finally {
      setIsSendingTicketMessage(false);
    }
  };

  // Function to select a ticket to view
  const handleSelectTicket = (ticket: SupportTicket) => {
    setSelectedTicket(ticket);
    setSelectedTicketId(ticket.id);
    setSupportSectionActive("detail");
    fetchTicketMessages(ticket.id);
  };

  // Set up real-time listeners for ticket messages
  useEffect(() => {
    if (!db || !selectedTicketId) return;
    
    const messagesCollection = collection(db, "supportMessages");
    const q = query(
      messagesCollection,
      where("ticketId", "==", selectedTicketId),
      orderBy("createdAt", "asc")
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const updatedMessages: SupportMessage[] = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate?.().toISOString() || new Date().toISOString(),
      } as SupportMessage));
      
      setTicketMessages(updatedMessages);
    });
    
    // Clean up listener when component unmounts
    return () => unsubscribe();
  }, [db, selectedTicketId]);

  // Function to render Support Tickets section
  const renderSupportTickets = () => {
    return (
      <div className="flex flex-col md:flex-row gap-6">
        {/* Left column: notifications + ticket list + new ticket button */}
        <div className="w-full md:w-1/3">
          <div className="flex justify-between items-center mb-4">
            <button
              onClick={() => setSupportSectionActive('create')}
              className="bg-orange-500 hover:bg-orange-600 text-white py-2 px-4 rounded"
            >
              New Ticket
            </button>
          </div>
          {/* Notifications at the top */}
          {notifications.length > 0 && (
            <div className="mb-4">
              <ul className="space-y-2">
                {notifications.map((notification, index) => (
                  <li key={index} className="bg-black/50 p-2 rounded text-gray-300 text-sm">
                    {notification}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {/* Ticket list */}
          <div className="space-y-2">
            {supportTickets.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-300">You have no support tickets.</p>
              </div>            ) : (
              supportTickets.map((ticket) => (
                <div
                  key={ticket.id}
                  className={`bg-black/50 border border-gray-700 hover:border-orange-400 rounded-lg p-3 cursor-pointer transition-colors`}
                  onClick={() => handleSelectTicket(ticket)}
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="font-semibold text-white mb-1">{ticket.subject}</div>
                      <div className="text-gray-400 text-xs mb-1">{ticket.category}</div>
                      <div className="text-gray-500 text-xs">{new Date(ticket.createdAt).toLocaleString()}</div>
                    </div>
                    <span className={`px-2 py-1 rounded text-xs font-semibold ${
                      ticket.status === 'resolved' 
                        ? 'bg-green-900/30 text-green-400' 
                        : ticket.status === 'open' 
                        ? 'bg-blue-900/30 text-blue-400'
                        : 'bg-yellow-900/30 text-yellow-400'
                    }`}>
                      {ticket.status === 'resolved' 
                        ? 'Resolved' 
                        : ticket.status === 'open' 
                        ? 'In Progress' 
                        : 'Pending'}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
        {/* Right column: ticket details or default message */}
        <div className="w-full md:w-2/3">
          {supportSectionActive === 'detail' && selectedTicket ? (
            <div className="bg-black/50 p-6 rounded-lg">
              <h3 className="text-xl font-semibold text-orange-500 mb-2">Ticket Details</h3>
              <div className="mb-4">
                <div className="font-bold text-white">{selectedTicket.subject}</div>
                <div className="text-gray-400 text-sm mb-1">Category: {selectedTicket.category}</div>
                <div className="text-gray-500 text-xs mb-1">Opened on: {new Date(selectedTicket.createdAt).toLocaleString()}</div>
                <div className="text-gray-300 mt-2">{selectedTicket.description}</div>
                <div className="mt-2">
                  <span className={`px-2 py-1 rounded text-xs font-semibold ${
                    selectedTicket.status === 'resolved' 
                      ? 'bg-green-900/30 text-green-400' 
                      : selectedTicket.status === 'open' 
                      ? 'bg-blue-900/30 text-blue-400'
                      : 'bg-yellow-900/30 text-yellow-400'
                  }`}>
                    {selectedTicket.status === 'resolved' 
                      ? 'Resolved' 
                      : selectedTicket.status === 'open' 
                      ? 'In Progress' 
                      : 'Pending'}
                  </span>
                </div>
              </div>
              <div className="border-t border-gray-700 pt-4">
                <h4 className="text-orange-400 font-semibold mb-2">Messages</h4>
                <div className="max-h-64 overflow-y-auto space-y-3 mb-4">                  {ticketMessages.length === 0 ? (
                    <div className="text-gray-400">No messages yet.</div>
                  ) : (
                    ticketMessages.map(msg => (
                      <div key={msg.id} className={`p-2 rounded ${msg.senderType === 'company' ? 'bg-orange-900/30 text-orange-200' : msg.isSystemMessage ? 'bg-gray-800 text-gray-400' : 'bg-gray-700 text-white'}`}>
                        <div className="text-xs font-bold mb-1">{msg.senderName || msg.senderType}</div>
                        <div className="text-sm">{msg.message}</div>
                        <div className="text-xs text-gray-400 mt-1">{new Date(msg.createdAt).toLocaleString()}</div>
                      </div>
                    ))
                  )}
                </div>
                {/* MESSAGE SENDING RESTRICTION */}
                {selectedTicket.status !== 'open' || !selectedTicket.acceptedBy ? (
                  <div className="text-yellow-400 text-sm mt-4">
                    The chat will be available once the ticket is accepted by support.
                  </div>
                ) : (
                  <form
                    onSubmit={e => {
                      e.preventDefault();
                      const form = e.target as HTMLFormElement;
                      const input = form.elements.namedItem('message') as HTMLInputElement;
                      if (input.value.trim()) {
                        handleSendTicketMessage(input.value.trim());
                        input.value = '';
                      }
                    }}
                    className="flex gap-2"
                  >
                    <input
                      name="message"
                      type="text"
                      placeholder="Type your message..."
                      className="flex-1 p-2 rounded bg-black/30 border border-gray-700 text-white"
                      disabled={isSendingTicketMessage}
                      autoComplete="off"
                    />
                    <button
                      type="submit"
                      className="bg-orange-500 text-white px-4 py-2 rounded hover:bg-orange-600"
                      disabled={isSendingTicketMessage}
                    >
                      Send
                    </button>
                  </form>
                )}
              </div>
            </div>
          ) : supportSectionActive === 'create' ? (
            <div className="bg-black/50 p-6 rounded-lg">
              <h3 className="text-xl font-semibold text-orange-500 mb-4">New Support Ticket</h3>
              <form onSubmit={handleCreateTicket} className="space-y-4">
                <input
                  type="text"
                  value={newTicketData.subject}
                  onChange={e => setNewTicketData({ ...newTicketData, subject: e.target.value })}
                  placeholder="Ticket subject"
                  className="w-full p-3 bg-black/30 border border-orange-500/30 rounded-lg text-white"
                  required
                />
                <textarea
                  value={newTicketData.description}
                  onChange={e => setNewTicketData({ ...newTicketData, description: e.target.value })}
                  placeholder="Describe your issue or question"
                  className="w-full p-3 bg-black/30 border border-orange-500/30 rounded-lg text-white h-32"
                  required
                />
                <select
                  value={newTicketData.category}
                  onChange={e => setNewTicketData({ ...newTicketData, category: e.target.value })}
                  className="w-full p-3 bg-black/30 border border-orange-500/30 rounded-lg text-white"
                >
                  <option value="general">General</option>
                  <option value="payment">Payment</option>
                  <option value="technical">Technical</option>
                  <option value="other">Other</option>
                </select>
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setSupportSectionActive('list')}
                    className="bg-gray-700 text-white px-4 py-2 rounded hover:bg-gray-600"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="bg-orange-500 text-white px-6 py-2 rounded hover:bg-orange-600"
                  >
                    Submit Ticket
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-gray-300 text-lg min-h-200px">
              Select a ticket to view details and chat.
            </div>
          )}
        </div>
      </div>
    );
  };

  // Add after the existing useEffect hooks
  // Detect mobile device on client side
  useEffect(() => {
    const checkIfMobile = () => {
      const userAgent = 
        typeof window.navigator === "undefined" ? "" : navigator.userAgent;
      const mobile = Boolean(
        userAgent.match(
          /Android|BlackBerry|iPhone|iPad|iPod|Opera Mini|IEMobile|WPDesktop/i
        )
      );
      setIsMobile(mobile);
    };
    
    checkIfMobile();
    window.addEventListener("resize", checkIfMobile);
    return () => window.removeEventListener("resize", checkIfMobile);
  }, []);

  // Handle mobile menu toggle
  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  // Handle tab change with automatic menu close on mobile
  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    if (isMobile) {
      setMobileMenuOpen(false); // Close menu after tab selection on mobile
    }
  };

  // Fetch unread count for bell badge
  useEffect(() => {
    if (!companyId || !db) return;
    let interval: NodeJS.Timeout;
    const fetchUnread = async () => {
      try {
        const q = query(
          collection(db, "notifications"),
          where("companyId", "==", companyId),
          where("read", "==", false)
        );
        const snapshot = await getDocs(q);
        setUnreadCount(snapshot.size);
      } catch {
        setUnreadCount(0);
      }
    };
    fetchUnread();
    interval = setInterval(fetchUnread, 10000);
    return () => clearInterval(interval);
  }, [companyId]);

  // Fetch total applications when jobs change
  useEffect(() => {
    const fetchTotalApplications = async () => {
      if (!db || jobs.length === 0) {
        setTotalApplications(0);
        return;
      }
      try {
        const jobIds = jobs.map(j => j.id);
        // Firestore 'in' queries are limited to 10 items, so batch if needed
        let total = 0;
        const batchSize = 10;
        for (let i = 0; i < jobIds.length; i += batchSize) {
          const batchIds = jobIds.slice(i, i + batchSize);
          const q = query(collection(db, "jobApplications"), where("jobId", "in", batchIds));
          const snapshot = await getDocs(q);
          total += snapshot.size;
        }
        setTotalApplications(total);
      } catch (error) {
        console.error("Error fetching total applications:", error);
        setTotalApplications(0);
      }
    };
    fetchTotalApplications();
  }, [jobs, db]);

  return (
    <Layout>
      <main className="min-h-screen bg-gradient-to-b from-black to-orange-900 text-white flex relative">
        {/* Mobile menu toggle button */}
        {isMobile && (
          <button 
            className="fixed top-20 left-4 z-50 bg-orange-500 text-white p-2 rounded-full shadow-lg"
            onClick={toggleMobileMenu}
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        )}

        {/* Sidebar - With mobile responsiveness */}
        <aside 
          className={`${isMobile ? 'fixed left-0 top-0 h-full z-40 transform transition-transform duration-300 ease-in-out ' + (mobileMenuOpen ? 'translate-x-0' : '-translate-x-full') : 'relative'} w-full md:w-1/4 bg-black/70 p-6 flex flex-col`}
        >
          {/* Profile Photo Section */}
          <div className="relative flex flex-col items-center mb-6">
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
            {/* Notification bell absolutely positioned top right */}
            <div className="absolute top-2 right-2 z-20">
              <NotificationBell unreadCount={unreadCount} onClick={() => setShowNotifications(true)} />
            </div>
            {/* Display Company Name from Profile */}
            <h2 className="text-xl font-bold text-orange-500 text-center break-words">
              {companyProfile.name || "Company Overview"}
            </h2>
            <WalletButton />
            {/* Navigation */}
            <ul className="space-y-4 flex-grow w-full mt-6">
              <li>
                <button
                  className={`w-full text-left py-2 px-4 rounded-lg ${activeTab === "profile" ? "bg-orange-500 text-white" : "text-gray-400 hover:text-orange-500"}`}
                  onClick={() => handleTabChange("profile")}
                >
                  Overview
                </button>
              </li>
              <li>
                <button
                  className={`w-full text-left py-2 px-4 rounded-lg flex items-center justify-between ${activeTab === "myJobOffers" ? "bg-orange-500 text-white" : "text-gray-400 hover:text-orange-500"}`}
                  onClick={() => {
                    setActiveTab("myJobOffers");
                    setSidebarJobOffersOpen((open) => !open);
                    setJobOffersSubTab('list');
                  }}
                >
                  <span>My Job Offers</span>
                  <svg className={`w-4 h-4 ml-2 transition-transform ${sidebarJobOffersOpen ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                </button>
                {activeTab === "myJobOffers" && sidebarJobOffersOpen && (
                  <ul className="ml-6 mt-2 space-y-1">
                    <li>
                      <button
                        className={`w-full text-left py-1.5 px-3 rounded-md text-sm ${jobOffersSubTab === 'list' ? 'bg-orange-500 text-white' : 'text-orange-400 hover:bg-orange-600/20'}`}
                        onClick={() => setJobOffersSubTab('list')}
                      >
                        All Offers
                      </button>
                    </li>
                    <li>
                      <button
                        className={`w-full text-left py-1.5 px-3 rounded-md text-sm ${jobOffersSubTab === 'new' ? 'bg-orange-500 text-white' : 'text-orange-400 hover:bg-orange-600/20'}`}
                        onClick={() => setJobOffersSubTab('new')}
                      >
                        New Job Offer
                      </button>
                    </li>
                    <li>
                      <button
                        className={`w-full text-left py-1.5 px-3 rounded-md text-sm ${jobOffersSubTab === 'instant' ? 'bg-orange-500 text-white' : 'text-orange-400 hover:bg-orange-600/20'}`}
                        onClick={() => setJobOffersSubTab('instant')}
                      >
                        Instant Jobs
                      </button>
                    </li>
                  </ul>
                )}
              </li>
              <li>
                <button
                  className={`w-full text-left py-2 px-4 rounded-lg ${activeTab === "learn2earn" ? "bg-orange-500 text-white" : "text-gray-400 hover:text-orange-500"}`}
                  onClick={() => handleTabChange("learn2earn")}
                >
                  Learn2Earn
                </button>
              </li>
              <li>
                <button
                  className={`w-full text-left py-2 px-4 rounded-lg ${activeTab === "support" ? "bg-orange-500 text-white" : "text-gray-400 hover:text-orange-500"}`}
                  onClick={() => {
                    handleTabChange("support");
                    fetchSupportTickets();
                    setSupportSectionActive('list');
                  }}
                >
                  Support
                </button>
              </li>              <li>
                <button
                  className={`w-full text-left py-2 px-4 rounded-lg ${activeTab === "settings" ? "bg-orange-500 text-white" : "text-gray-400 hover:text-orange-500"}`}
                  onClick={() => handleTabChange("settings")}
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
        
        {/* Main Content Area - Updated for mobile responsiveness */}
        <section className={`w-full ${isMobile ? 'p-6' : 'md:w-3/4 p-6'} overflow-y-auto ${isMobile && mobileMenuOpen ? 'opacity-30' : 'opacity-100'} transition-opacity duration-300`}>
          {/* Render content based on subtab selection */}
          {activeTab === 'myJobOffers' ? (
            jobOffersSubTab === 'list' ? renderMyJobs() :
            jobOffersSubTab === 'new' ? (
              <div className="bg-black/70 p-10 rounded-lg shadow-lg">
                <h2 className="text-3xl font-semibold text-orange-500 mb-6">Post a New Job</h2>
                <JobPostPayment companyId={companyId} companyProfile={companyProfile} reloadData={reloadData} />
              </div>
            ) : jobOffersSubTab === 'instant' ? renderInstantJobsTab() : null
          ) : renderContent()}
        </section>
        {/* Notification panel (right side overlay) */}
        <NotificationsPanel
          companyId={companyId}
          open={showNotifications}
          onClose={() => setShowNotifications(false)}
          overlay
        />
      </main>
    </Layout>
  );
};

// Helper to format Firestore Timestamp or Date
function formatDateOrTimestamp(val: Date | import('firebase/firestore').Timestamp | undefined, opts: {dateOnly?: boolean} = {}) {
  if (!val) return '-';
  if (typeof (val as any).toDate === 'function') {
    const d = (val as any).toDate();
    return opts.dateOnly ? d.toLocaleDateString() : d.toLocaleString();
  }
  const d = new Date(val as any);
  return opts.dateOnly ? d.toLocaleDateString() : d.toLocaleString();
}

export default PostJobPage;