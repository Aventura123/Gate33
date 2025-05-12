"use client";

import React, { useState, useEffect, JSX, useCallback } from "react";
import Layout from "../../components/Layout";
import { useRouter } from "next/navigation";
import { collection, addDoc, getDocs, deleteDoc, doc, query, where, getDoc, updateDoc, onSnapshot, orderBy, serverTimestamp } from "firebase/firestore";
import { db } from "../../lib/firebase";
// Import payment related services
import web3Service from "../../services/web3Service";
import smartContractService from "../../services/smartContractService";
// Import learn2earnContractService
// Import learn2earnContractService
import learn2earnContractService from "../../services/learn2earnContractService";
// Import the Learn2Earn interfaces
import { Learn2Earn, Learn2EarnTask, NewLearn2Earn } from "../../types/learn2earn";
// Importing necessary services and components for Instant Jobs
import instantJobsService, { InstantJob, JobMessage } from '../../services/instantJobsService';
import InstantJobCard from '../../components/instant-jobs/InstantJobCard';
import MessageSystem from '../../components/instant-jobs/MessageSystem';
import WalletButton from '../../components/WalletButton';
import JobPostPayment from "./JobPostPayment";
import CompanyWelcome from "./CompanyWelcome";

// Interface for Support Ticket
interface SupportTicket {
  id: string;
  userId: string;
  userName?: string;
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
    endDate: null,   // Initialize as null instead of undefined,
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

  // Add at the top of the component, in the state declarations section
  const [isMobile, setIsMobile] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Function to fetch pricing plans from Firebase
  const fetchPricingPlans = useCallback(async () => {
    try {
      if (!db) throw new Error("Firestore is not initialized");

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

  // Fetch pricing plans when component mounts
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
      router.replace("/login");
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

  // Function to handle wallet connection
  const handleConnectWallet = async () => {
    try {
      setIsConnectingWallet(true);
      setWalletError(null);
      
      // Import web3Service directly to ensure we're using the same instance
      const { web3Service } = await import('../../services/web3Service');
      
      // Use web3Service to connect the wallet
      const walletInfo = await web3Service.connectWallet();
      
      if (walletInfo && walletInfo.address) {
        setWalletAddress(walletInfo.address);
        console.log("Wallet connected successfully:", walletInfo);
        
        // Dispatch event to let other components know the wallet was connected
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

  // Functions for Instant Jobs
  // Function to load Instant Jobs
  const loadInstantJobs = async () => {
    try {
      const jobs = await instantJobsService.getInstantJobsByCompany(companyId);
      setInstantJobs(jobs);
    } catch (error) {
      console.error("Error loading micro-tasks:", error);
    }
  };
  
  // Function to load messages of an Instant Job
  const loadJobMessages = async (jobId: string) => {
    try {
      const messages = await instantJobsService.getMessages(jobId);
      setJobMessages(messages);
    } catch (error) {
      console.error("Error loading messages:", error);
    }
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
  
  // Function to create a new Instant Job
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
      
      // Reset form and go back to list
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
    if (activeTab === "instantJobs" && companyId) {
      loadInstantJobs();
    }
  }, [activeTab, companyId]);
  
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

  // Render the Instant Jobs tab
  const renderInstantJobsTab = () => {
    // Show list of Instant Jobs
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
    
    // Show creation form
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
              <label className="block text-gray-300 mb-2">Task Title</label>
              <input
                type="text"
                value={newInstantJobData.title}
                onChange={(e) => setNewInstantJobData({...newInstantJobData, title: e.target.value})}
                placeholder="e.g., Develop a smart contract for ICO"
                className="w-full p-3 bg-black/50 border border-orange-500/30 rounded-lg text-white"
                required
              />
            </div>
            
            <div>
              <label className="block text-gray-300 mb-2">Detailed Description</label>
              <textarea
                value={newInstantJobData.description}
                onChange={(e) => setNewInstantJobData({...newInstantJobData, description: e.target.value})}
                placeholder="Describe in detail what you need..."
                className="w-full p-3 bg-black/50 border border-orange-500/30 rounded-lg text-white h-32"
                required
              />
            </div>
            
            <div>
              <label className="block text-gray-300 mb-2">Category</label>
              <select
                value={newInstantJobData.category}
                onChange={(e) => setNewInstantJobData({...newInstantJobData, category: e.target.value})}
                className="w-full p-3 bg-black/50 border border-orange-500/30 rounded-lg text-white"
                required
              >
                <option value="">Select a category</option>
                <option value="development">Development</option>
                <option value="design">Design</option>
                <option value="marketing">Marketing</option>
                <option value="content">Content</option>
                <option value="research">Research</option>
                <option value="smart-contracts">Smart Contracts</option>
                <option value="testing">Testing</option>
                <option value="other">Other</option>
              </select>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-gray-300 mb-2">Budget</label>
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
                <label className="block text-gray-300 mb-2">Currency</label>
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
              <label className="block text-gray-300 mb-2">Deadline</label>
              <input
                type="date"
                value={newInstantJobData.deadline.toISOString().split('T')[0]}
                onChange={(e) => setNewInstantJobData({...newInstantJobData, deadline: new Date(e.target.value)})}
                className="w-full p-3 bg-black/50 border border-orange-500/30 rounded-lg text-white"
                required
              />
            </div>
            
            <div>
              <label className="block text-gray-300 mb-2">Required Skills (comma separated)</label>
              <input
                type="text"
                value={newInstantJobData.requiredSkills}
                onChange={(e) => setNewInstantJobData({...newInstantJobData, requiredSkills: e.target.value})}
                placeholder="e.g., Solidity, React, Web3.js"
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
                Cancel
              </button>
              <button
                type="submit"
                className="bg-orange-500 hover:bg-orange-600 text-white"
              >
                Create Micro-task
              </button>
            </div>
          </form>
        </div>
      );
    }
    
    // Show micro-task details with messages
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
              &larr; Back
            </button>
            <h2 className="text-3xl font-semibold text-orange-500">{selectedJob.title}</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Left panel: Task information */}
            <div className="md:col-span-1 bg-black/50 p-6 rounded-lg border border-gray-800">
              <h3 className="text-xl font-semibold text-orange-400 mb-4">Information</h3>
              
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
                    {selectedJob.status === 'open' ? 'Open' : ''}
                    {selectedJob.status === 'accepted' ? 'Accepted' : ''}
                    {selectedJob.status === 'in_progress' ? 'In Progress' : ''}
                    {selectedJob.status === 'completed' ? 'Complete - Awaiting Approval' : ''}
                    {selectedJob.status === 'approved' ? 'Approved' : ''}
                    {selectedJob.status === 'disputed' ? 'In Dispute' : ''}
                    {selectedJob.status === 'closed' ? 'Closed' : ''}
                  </span>
                </div>
                
                <div>
                  <span className="text-orange-300 block">Budget:</span>
                  <span className="text-white">{selectedJob.budget} {selectedJob.currency}</span>
                </div>
                
                <div>
                  <span className="text-orange-300 block">Deadline:</span>
                  <span className="text-white">
                    {selectedJob.deadline instanceof Date 
                      ? selectedJob.deadline.toLocaleDateString() 
                      : new Date(selectedJob.deadline.seconds * 1000).toLocaleDateString()}
                  </span>
                </div>
                
                <div>
                  <span className="text-orange-300 block">Category:</span>
                  <span className="text-white">{selectedJob.category}</span>
                </div>
                
                {selectedJob.acceptedByName && selectedJob.status !== 'open' && (
                  <div>
                    <span className="text-orange-300 block">Accepted by:</span>
                    <span className="text-white">{selectedJob.acceptedByName}</span>
                  </div>
                )}
                
                <div>
                  <span className="text-orange-300 block">Required Skills:</span>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {selectedJob.requiredSkills?.map((skill, index) => (
                      <span key={index} className="bg-gray-800 text-xs text-orange-300 px-2 py-1 rounded-full">
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
                
                <div>
                  <span className="text-orange-300 block">Description:</span>
                  <p className="text-white mt-2 whitespace-pre-line">{selectedJob.description}</p>
                </div>
                
                {selectedJob.status === 'completed' && (
                  <div className="mt-4">
                    <button 
                      onClick={() => selectedJob.id && handleApproveJob(selectedJob.id)}
                      className="w-full bg-green-500 hover:bg-green-600 text-white"
                    >
                      Approve Completed Task
                    </button>
                  </div>
                )}
              </div>
            </div>
            
            {/* Right panel: Message system */}
            <div className="md:col-span-2 bg-black/50 p-6 rounded-lg border border-gray-800">
              <h3 className="text-xl font-semibold text-orange-400 mb-4">Messages</h3>
              
              {selectedJob.status === 'open' ? (
                <div className="text-center py-8 text-gray-400">
                  Messages will be available when someone accepts this micro-task.
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
    
    return <div>Loading...</div>;
  };

  // Render content based on active tab
  const renderContent = () => {
    switch (activeTab) {
      case "profile":
        return (
          <CompanyWelcome
            name={companyProfile.name}
            industry={companyProfile.industry}
            country={companyProfile.country}
            responsiblePerson={companyProfile.responsiblePerson}
          />
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

  // Fix the spinner class name (typo)
  <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 rounded-full">
    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-orange-500"></div>
  </div>

  // Add effect to check wallet connection on initial load
  useEffect(() => {
    const checkWalletConnection = async () => {
      try {
        const walletInfo = web3Service.getWalletInfo();
        if (walletInfo && walletInfo.address) {
          setWalletAddress(walletInfo.address);
          console.log("Wallet already connected:", walletInfo.address);
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
      
      // Create a new object with updated values
      const updatedData = {...learn2earnData, [name]: numValue};
      
      // Automatically calculate maxParticipants when tokenAmount or tokenPerParticipant are changed
      if ((name === 'tokenAmount' || name === 'tokenPerParticipant') && 
          updatedData.tokenAmount > 0 && updatedData.tokenPerParticipant > 0) {
        // Calculate maximum participants
        const calculatedMaxParticipants = Math.floor(updatedData.tokenAmount / updatedData.tokenPerParticipant);
        updatedData.maxParticipants = calculatedMaxParticipants;
      }
      
      setLearn2EarnData(updatedData);
    } else if (name === 'maxParticipants') {
      // Special treatment for maxParticipants to allow it to be undefined
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
// Adding a new state to control the subfunctions of Learn2Earn
const [learn2EarnSubTab, setLearn2EarnSubTab] = useState<'new' | 'my'>('my');

// Function to render Learn2Earn with subfunctions
const renderLearn2Earn = () => {
  return (
    <div>
      {/* Tabs to switch between "My L2L" and "New L2L" */}
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

      {/* Render the appropriate subcomponent based on the selected subtab */}
      {learn2EarnSubTab === 'new' ? renderNewLearn2Earn() : renderMyLearn2Earn(syncWarnings, syncing)}
    </div>
  );
}

// Function to render the creation of new Learn2Earn
const renderNewLearn2Earn = () => {
  if (isLoadingLearn2Earn) {
    return <p className="text-gray-300 py-4">Loading...</p>;
  }

  if (learn2EarnStep === 'info') {
    return (
      <div className="bg-black/50 p-6 rounded-lg">
        <h3 className="text-2xl font-semibold text-orange-500 mb-4">Create New Learn2Earn</h3>
        
        {/* ... existing content for step 'info' ... */}
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

          {/* ... rest of the existing form ... */}
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
        
        {/* ... existing content for step 'tasks' ... */}
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

// Function to render the company's Learn2Earn list
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
            <b>Status synchronization:</b>
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
          {syncing ? 'Synchronizing...' : 'Status synchronization'}
        </button>
      </div>
      {/* ...rest of renderMyLearn2Earn... */}
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
                
                {/* Progress bar for distributed tokens */}
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

  // Add new tab for Instant Jobs
  const tabs = [
    { id: "profile", label: "Company Profile" },
    { id: "jobs", label: "Jobs" },
    { id: "instantJobs", label: "Instant Jobs" },
    { id: "settings", label: "Settings" },
    // Other existing tabs...
  ];

  // Add state to store available networks
  const [availableNetworks, setAvailableNetworks] = useState<string[]>([]);
  const [isLoadingNetworks, setIsLoadingNetworks] = useState(false);

  // Function to fetch available networks from Firestore
  const fetchAvailableNetworks = useCallback(async () => {
    setIsLoadingNetworks(true);
    try {
      // Fetch available networks using the contract service
      const networks = await learn2earnContractService.getSupportedNetworks();
      console.log("Available networks found:", networks);
      setAvailableNetworks(networks);
    } catch (error) {
      console.error("Error fetching available networks:", error);
      setAvailableNetworks([]);
    } finally {
      setIsLoadingNetworks(false);
    }
  }, []);

  // Fetch available networks when the component mounts or when the Learn2Earn tab is selected
  useEffect(() => {
    if (activeTab === "learn2earn") {
      fetchAvailableNetworks();
      fetchFeePercentage(); // Now this reference is valid
    }
  }, [activeTab, fetchAvailableNetworks, fetchFeePercentage]);

  // Dummy function to avoid reference error
const fetchL2LStats = (l2lId: string) => {
  // Future implementation: fetch real stats from the contract
  // For now, do nothing
};

  // Add sync states in the main component
  const [syncWarnings, setSyncWarnings] = useState<{id:string; msg:string}[]>([]);
  const [syncing, setSyncing] = useState(false);

  // Automatic synchronization of Learn2Earn statuses
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
          const provider = await web3Service.getWeb3Provider();
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
            warnings.push({id: l2l.id, msg: `Status synchronized: Blockchain=${onChainActive ? 'Active' : 'Inactive'}, Firebase=${l2l.status}`});
            l2l.status = newStatus;
          }
        } catch (err) {
          warnings.push({id: l2l.id, msg: `Error synchronizing Learn2Earn status: ${l2l.title}`});
        }
      }
      setSyncWarnings(warnings);
      setSyncing(false);
    };
    syncStatuses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(learn2earn)]);

  // Manual function to synchronize statuses
const manualSyncStatuses = async () => {
  if (!learn2earn || learn2earn.length === 0) return;
  setSyncing(true);
  const warnings: {id:string; msg:string}[] = [];
  for (const l2l of learn2earn) {
    if (!l2l.learn2earnId || !l2l.network) continue;
    try {
      const contractAddresses = await learn2earnContractService.getContractAddresses(l2l.network);
      if (!contractAddresses.contractAddress) continue;
      const provider = await web3Service.getWeb3Provider();
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
        warnings.push({id: l2l.id, msg: `Status synchronized: Blockchain=${onChainActive ? 'Active' : 'Inactive'}, Firebase=${l2l.status}`});
        l2l.status = newStatus;
      }
    } catch (err) {
      warnings.push({id: l2l.id, msg: `Error synchronizing Learn2Earn status: ${l2l.title}`});
    }
  }
  setSyncWarnings(warnings);
  setSyncing(false);
};

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
      console.error("Error fetching ticket messages:", error);
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
              </div>
            ) : (
              supportTickets.map((ticket) => (
                <div
                  key={ticket.id}
                  className={`bg-black/50 border border-gray-700 hover:border-orange-400 rounded-lg p-3 cursor-pointer transition-colors ${selectedTicketId === ticket.id ? 'border-orange-500' : ''}`}
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
                <div className="max-h-64 overflow-y-auto space-y-3 mb-4">
                  {ticketMessages.length === 0 ? (
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

  // Adicionar listener para eventos de conexão/desconexão da carteira
  useEffect(() => {
    // Função para lidar com evento de conexão de carteira
    const handleWalletConnected = (event: any) => {
      console.log("[Event] Wallet connected:", event.detail?.address);
      if (event.detail?.address) {
        setWalletAddress(event.detail.address);
        setWalletError(null);
      }
    };

    // Função para lidar com evento de desconexão de carteira
    const handleWalletDisconnected = () => {
      console.log("[Event] Wallet disconnected");
      setWalletAddress(null);
    };

    // Adicionar os listeners
    window.addEventListener('walletConnected', handleWalletConnected);
    window.addEventListener('walletDisconnected', handleWalletDisconnected);

    // Verificar o estado atual no carregamento
    const checkWalletStatus = () => {
      const walletInfo = web3Service.getWalletInfo();
      if (walletInfo && walletInfo.address) {
        setWalletAddress(walletInfo.address);
      } else {
        setWalletAddress(null);
      }
    };
    
    checkWalletStatus();

    // Limpar os listeners quando o componente for desmontado
    return () => {
      window.removeEventListener('walletConnected', handleWalletConnected);
      window.removeEventListener('walletDisconnected', handleWalletDisconnected);
    };
  }, []);

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
            <WalletButton />
            {/* Navigation */}
            <ul className="space-y-4 flex-grow w-full mt-6">
              <li>
                <button
                  className={`w-full text-left py-2 px-4 rounded-lg ${
                    activeTab === "profile" ? "bg-orange-900 text-white" : "text-gray-400 hover:text-orange-500"
                  }`}
                  onClick={() => handleTabChange("profile")}
                >
                  Profile
                </button>
              </li>
              <li>
                <button
                  className={`w-full text-left py-2 px-4 rounded-lg ${
                    activeTab === "myJobs" ? "bg-orange-900 text-white" : "text-gray-400 hover:text-orange-500"
                  }`}
                  onClick={() => handleTabChange("myJobs")}
                >
                  My Jobs
                </button>
              </li>
              <li>
                <button
                  className={`w-full text-left py-2 px-4 rounded-lg ${
                    activeTab === "newJob" ? "bg-orange-900 text-white" : "text-gray-400 hover:text-orange-500"
                  }`}
                  onClick={() => handleTabChange("newJob")}
                >
                  New Job
                </button>
              </li>
              <li>
                <button
                  className={`w-full text-left py-2 px-4 rounded-lg ${
                    activeTab === "instantJobs" ? "bg-orange-900 text-white" : "text-gray-400 hover:text-orange-500"
                  }`}
                  onClick={() => handleTabChange("instantJobs")}
                >
                  Instant Jobs
                </button>
              </li>
              <li>
                <button
                  className={`w-full text-left py-2 px-4 rounded-lg ${
                    activeTab === "learn2earn" ? "bg-orange-900 text-white" : "text-gray-400 hover:text-orange-500"
                  }`}
                  onClick={() => handleTabChange("learn2earn")}
                >
                  Learn2Earn
                </button>
              </li>
              <li>
                <button
                  className={`w-full text-left py-2 px-4 rounded-lg ${
                    activeTab === "support" ? "bg-orange-900 text-white" : "text-gray-400 hover:text-orange-500"
                  }`}
                  onClick={() => {
                    handleTabChange("support");
                    fetchSupportTickets();
                    setSupportSectionActive('list');
                  }}
                >
                  Support
                </button>
              </li>
              <li>
                <button
                  className={`w-full text-left py-2 px-4 rounded-lg ${
                    activeTab === "settings" ? "bg-orange-900 text-white" : "text-gray-400 hover:text-orange-500"
                  }`}
                  onClick={() => handleTabChange("settings")}
                >
                  Settings
                </button>
              </li>
              <li>
                <button
                  className={`w-full text-left py-2 px-4 rounded-lg ${
                    activeTab === "notifications" ? "bg-orange-900 text-white" : "text-gray-400 hover:text-orange-500"
                  }`}
                  onClick={() => {
                    handleTabChange("notifications");
                    fetchNotifications();
                  }}
                >
                  Notifications
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
          </button>        </aside>
        
        {/* Main Content Area - Updated for mobile responsiveness */}
        <section className={`w-full ${isMobile ? 'p-6' : 'md:w-3/4 p-6'} overflow-y-auto ${isMobile && mobileMenuOpen ? 'opacity-30' : 'opacity-100'} transition-opacity duration-300`}>
          {renderContent()}
        </section>
      </main>
    </Layout>
  );
};

export default PostJobPage;