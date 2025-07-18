"use client";

import React, { useState, useEffect, JSX, useCallback } from "react";
import FullScreenLayout from "../../components/FullScreenLayout";
import { useRouter } from "next/navigation";
import { collection, addDoc, getDocs, deleteDoc, doc, query, where, getDoc, updateDoc, setDoc, onSnapshot, orderBy, serverTimestamp, writeBatch } from "firebase/firestore";
import { db, auth } from "../../lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
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
// Import the SupportPanel component
import SupportPanel from "../../components/support/SupportPanel";

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
  companyId?: string; // Add companyId field
  requiredSkills: string | string[]; // Permitindo ambos os tipos para compatibilidade
  salaryRange: string;
  location: string;
  employmentType: string;  experienceLevel: string;
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
  status?: 'active' | 'inactive' | 'expired';
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
  
  const [isMobile, setIsMobile] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);

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
    console.log('[Learn2Earn] Fetching for companyId:', companyId);
    if (!db || !companyId) {
      console.log('[Learn2Earn] Skipping fetch - missing db or companyId');
      return;
    }
    try {
      const l2eCollection = collection(db, "learn2earn");
      const q = query(l2eCollection, where("companyId", "==", companyId));
      const snapshot = await getDocs(q);
      const fetched = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt || null,
      }));
      console.log('[Learn2Earn] Fetched:', fetched.length, 'items');
      setLearn2earn(fetched);
    } catch (error) {
      console.error('[Learn2Earn] Error fetching:', error);
      setLearn2earn([]);
    }
  }, [db, companyId]);

  // Buscar Learn2Earn ao carregar ou mudar companyId
  useEffect(() => {
    fetchLearn2Earn();
  }, [fetchLearn2Earn]);

  const checkAuthentication = () => {
    try {
      // Priorizar Firebase UID para companies migradas
      const firebaseUid = localStorage.getItem("companyFirebaseUid");
      const legacyToken = localStorage.getItem("token");
      
      console.log('[Auth] Firebase UID from localStorage:', firebaseUid);
      console.log('[Auth] Legacy token from localStorage:', legacyToken);
      
      if (firebaseUid) {
        // Company migrada para Firebase Auth - usar UID
        console.log("Using Firebase UID for company:", firebaseUid);
        setCompanyId(firebaseUid);
        fetchCompanyPhoto(firebaseUid);
      } else if (legacyToken) {
        // Company ainda no sistema legado
        const decodedToken = atob(legacyToken);
        console.log("Using legacy token for company:", decodedToken);
        setCompanyId(decodedToken);
        fetchCompanyPhoto(decodedToken);
      } else {
        throw new Error("No authentication token found");
      }
    } catch (error) {
      console.error("Error in authentication check:", error);
      router.replace("/login");
    }
  };  const fetchCompanyPhoto = async (id: string) => {
    try {
      console.log("Fetching photo for companyId:", id);
      
      if (!db) {
        console.error("Firestore not initialized");
        setUserPhoto("");
        return;
      }
      
      // Buscar diretamente no Firestore (mesma lógica do UserProfileButton)
      const companyRef = doc(db, "companies", id);
      const companyDoc = await getDoc(companyRef);
      
      if (companyDoc.exists()) {
        const data = companyDoc.data();
        console.log("Company document found:", { hasPhotoURL: !!data.photoURL });
        
        if (data.photoURL) {
          console.log("Photo URL found:", data.photoURL);
          setUserPhoto(data.photoURL);
        } else {
          console.log("No photo URL found in document");
          setUserPhoto("");
        }
      } else {
        console.log("Company document not found");
        setUserPhoto("");
      }
    } catch (error) {
      console.error("Error fetching company photo:", error);
      setUserPhoto("");
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
        const now = new Date();
        const batch = writeBatch(db);
          const fetchedJobs: Job[] = jobSnapshot.docs.map((doc) => {
          const data = doc.data();
          const expiresAt = data.expiresAt?.toDate?.() || null;
          
          // Update status to 'expired' if expired and still 'active'
          if (expiresAt && expiresAt < now && data.status === 'active') {
            batch.update(doc.ref, { status: 'expired' });
            data.status = 'expired'; // Update locally as well
          }
          
          return {
            id: doc.id,
            ...data,
            createdAt: data.createdAt || null, // Ensure createdAt is included
          } as Job;
        });
        
        // Commit batch updates if necessary
        await batch.commit();
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
    // Priorizar Firebase UID para companies migradas
    const firebaseUid = localStorage.getItem("companyFirebaseUid");
    const legacyToken = localStorage.getItem("token");
    
    if (firebaseUid || legacyToken) {
      try {
        const effectiveCompanyId = firebaseUid || (legacyToken ? atob(legacyToken) : null);
        if (!effectiveCompanyId) {
          throw new Error("Token is missing or invalid.");
        }
        
        setCompanyId(effectiveCompanyId);
        
        // Fetch data once companyId is set
        fetchCompanyPhoto(effectiveCompanyId);
        fetchCompanyProfile(effectiveCompanyId); // Fetch profile initially
        
        // Fetch jobs related to this company
        const fetchInitialJobs = async () => {
          if (!db) return;
          console.log('[Jobs] Fetching initial jobs for companyId:', effectiveCompanyId);
          
          // Primeiro, tentar buscar jobs com o ID atual
          const jobCollection = collection(db, "jobs");
          let q = query(jobCollection, where("companyId", "==", effectiveCompanyId));
          let jobSnapshot = await getDocs(q);
          
          console.log('[Jobs] Found', jobSnapshot.size, 'jobs with current ID');
          
          // Se não encontrar jobs e for uma company migrada, tentar com oldFirestoreId
          if (jobSnapshot.empty && firebaseUid) {
            console.log('[Jobs] No jobs found with Firebase UID, checking for old Firestore ID...');
            
            // Buscar dados da company para pegar oldFirestoreId
            const companyRef = doc(db, "companies", effectiveCompanyId);
            const companySnap = await getDoc(companyRef);
            
            if (companySnap.exists()) {
              const companyData = companySnap.data();
              const oldId = companyData.oldFirestoreId;
              
              if (oldId && oldId !== effectiveCompanyId) {
                console.log('[Jobs] Trying with old Firestore ID:', oldId);
                const qByOldId = query(jobCollection, where("companyId", "==", oldId));
                const jobsByOldId = await getDocs(qByOldId);
                console.log('[Jobs] Found', jobsByOldId.size, 'jobs with old ID');
                
                if (!jobsByOldId.empty) {
                  jobSnapshot = jobsByOldId;
                }
              }
              
              // Se ainda não encontrou e temos company name, tentar por nome
              if (jobSnapshot.empty && companyData.name) {
                console.log('[Jobs] Trying with company name:', companyData.name);
                const qByName = query(jobCollection, where("company", "==", companyData.name));
                const jobsByName = await getDocs(qByName);
                console.log('[Jobs] Found', jobsByName.size, 'jobs by company name');
                
                if (!jobsByName.empty) {
                  jobSnapshot = jobsByName;
                }
              }
            }
          }
          
          const now = new Date();
          const batch = writeBatch(db);
          const fetchedJobs: Job[] = jobSnapshot.docs.map((doc) => {
            const data = doc.data();
            const expiresAt = data.expiresAt?.toDate?.() || null;
            
            // Update status to 'expired' if expired and still 'active'
            if (expiresAt && expiresAt < now && data.status === 'active') {
              batch.update(doc.ref, { status: 'expired' });
              data.status = 'expired'; // Update locally as well
            }
            
            return { 
              id: doc.id, 
              ...data,
              companyId: data.companyId // Ensure companyId is included
            } as Job;
          });
          
          // Commit batch updates if necessary
          await batch.commit();
          console.log('[Jobs] Fetched jobs:', fetchedJobs.map(j => ({
            id: j.id, 
            companyId: j.companyId, 
            company: j.company
          })));
          setJobs(fetchedJobs);
          
          // Also fetch instant jobs when the component mounts
          try {
            console.log('[InstantJobs] Loading initial jobs for companyId:', effectiveCompanyId);
            let instantJobs = await instantJobsService.getInstantJobsByCompany(effectiveCompanyId);
            console.log('[InstantJobs] Found', instantJobs.length, 'jobs with current ID');
            
            // Se não encontrou instant jobs e for uma company migrada, tentar com oldFirestoreId
            if (instantJobs.length === 0 && firebaseUid) {
              console.log('[InstantJobs] Trying with old Firestore ID...');
              
              const companyRef = doc(db, "companies", effectiveCompanyId);
              const companySnap = await getDoc(companyRef);
              
              if (companySnap.exists()) {
                const companyData = companySnap.data();
                const oldId = companyData.oldFirestoreId;
                
                if (oldId && oldId !== effectiveCompanyId) {
                  console.log('[InstantJobs] Trying with old ID:', oldId);
                  instantJobs = await instantJobsService.getInstantJobsByCompany(oldId);
                  console.log('[InstantJobs] Found', instantJobs.length, 'jobs with old ID');
                }
              }
            }
            
            console.log('[InstantJobs] Final instant jobs loaded:', instantJobs.length);
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
  }, []); // Empty dependency array - only run on mount

  // Secondary useEffect to fetch data when companyId changes
  useEffect(() => {
    if (companyId) {
      fetchCompanyProfile(companyId);
    }
  }, [companyId, fetchCompanyProfile]);

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

      // Upload directly to Firebase Storage
      setIsUploading(true);
      
      try {
        console.log("Starting direct Firebase upload...", {
          fileName: file.name,
          fileType: file.type,
          fileSize: file.size,
          companyId
        });
        
        // Verificar tamanho do arquivo (limitar a 5MB)
        if (file.size > 5 * 1024 * 1024) {
          throw new Error("File size must be less than 5MB");
        }

        // Verificar tipo de arquivo (apenas imagens)
        if (!file.type.startsWith("image/")) {
          throw new Error("Only image files are allowed");
        }

        // Import Firebase Storage functions
        const { ref, uploadBytes, getDownloadURL, deleteObject } = await import("firebase/storage");
        const { storage } = await import("../../lib/firebase");
        
        if (!storage) {
          throw new Error("Firebase Storage not initialized");
        }
        
        // First, get the current photo URL to delete the old one
        let oldPhotoURL = null;
        if (!db) {
          throw new Error("Firestore not initialized");
        }
        
        const companyRef = doc(db, "companies", companyId);
        const companyDoc = await getDoc(companyRef);
        
        if (companyDoc.exists() && companyDoc.data().photoURL) {
          oldPhotoURL = companyDoc.data().photoURL;
          console.log("Found old photo to delete:", oldPhotoURL);
        }
        
        const fileExtension = file.name.split('.').pop();
        const fileName = `company_${companyId}_${Date.now()}.${fileExtension}`;
        const filePath = `company-photos/${companyId}/${fileName}`;
        
        console.log("Uploading to Firebase Storage:", filePath);
        
        const storageRef = ref(storage, filePath);
        const snapshot = await uploadBytes(storageRef, file);
        const downloadURL = await getDownloadURL(snapshot.ref);
        
        console.log("Upload successful, URL:", downloadURL);
        
        // Update Firestore document with new photo URL
        if (companyDoc.exists()) {
          console.log("Updating company document...");
          await updateDoc(companyRef, {
            photoURL: downloadURL,
            updatedAt: new Date().toISOString()
          });
        } else {
          console.log("Creating new company document...");
          await setDoc(companyRef, {
            companyId: companyId,
            photoURL: downloadURL,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          });
        }
        
        // Delete old photo from storage after successful upload and document update
        if (oldPhotoURL) {
          try {
            // Extract the storage path from the URL
            const url = new URL(oldPhotoURL);
            const pathMatch = url.pathname.match(/\/o\/(.+)\?/);
            if (pathMatch) {
              const storagePath = decodeURIComponent(pathMatch[1]);
              const oldPhotoRef = ref(storage, storagePath);
              await deleteObject(oldPhotoRef);
              console.log("Old photo deleted successfully:", storagePath);
            }
          } catch (deleteError) {
            console.warn("Could not delete old photo:", deleteError);
            // Don't throw error - the upload was successful, deletion is just cleanup
          }
        }
        
        // Update the photo with the URL returned
        setUserPhoto(downloadURL);
        console.log("Upload completed successfully!");
        
        // Reload the data to ensure everything is updated
        reloadData();
      } catch (error: any) {
        console.error("Detailed error uploading company photo:", error);
        alert(`Failed to upload photo: ${error.message || "Unknown error"}`);
        
        // Revert to previous photo or clear
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
        <div className="bg-black/70 rounded-lg shadow-lg p-6 pt-16 md:pt-20">
          {/* Main section title */}
          <h2 className="text-2xl font-bold text-orange-500 mb-2 text-center">All Offers</h2>
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
                        </div>                        {!isExpanded ? (
                          <>
                            <div>
                              <span className="block text-xs text-orange-300">Start Date</span>
                              <span className="text-gray-200">{createdAt ? createdAt.toLocaleDateString() : '-'}</span>
                            </div>                            <div>
                              <span className="block text-xs text-orange-300">Status</span>
                              <span className={`text-xs px-2 py-1 rounded ${
                                job.status === 'expired' 
                                  ? 'bg-red-900/30 text-red-400' 
                                  : job.status === 'inactive'
                                  ? 'bg-yellow-900/30 text-yellow-400'
                                  : 'bg-green-900/30 text-green-400'
                              }`}>
                                {job.status === 'expired' 
                                  ? 'Expired' 
                                  : job.status === 'inactive'
                                  ? 'Inactive'
                                  : 'Active'}
                              </span>
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
                        </div>                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          <div>
                            <span className="text-orange-300">Created At:</span> {createdAt ? createdAt.toLocaleDateString() : '-'}
                          </div>
                          <div>
                            <span className="text-orange-300">Expires:</span> {expirationDate ? expirationDate.toLocaleDateString() : '-'}
                          </div>                          <div>
                            <span className="text-orange-300">Status:</span> 
                            <span className={`ml-2 text-xs px-2 py-1 rounded ${
                              job.status === 'expired' 
                                ? 'bg-red-900/30 text-red-400' 
                                : job.status === 'inactive'
                                ? 'bg-yellow-900/30 text-yellow-400'
                                : 'bg-green-900/30 text-green-400'
                            }`}>
                              {job.status === 'expired' 
                                ? 'Expired' 
                                : job.status === 'inactive'
                                ? 'Inactive'
                                : 'Active'}
                            </span>
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
      <div className="bg-black/70 rounded-lg shadow-lg p-6 pt-16 md:pt-20">
        <h2 className="text-2xl font-bold text-orange-500 mb-2 text-center">Company Settings</h2>
        <div className="mb-6 border-b border-orange-900/60">
          <div className="h-[2px] bg-orange-500 rounded w-full"></div>
        </div>
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
};  // Render the Instant Jobs tab
  const renderInstantJobsTab = () => {
    // Use our new InstantJobForm component
    return (
      <div className="w-full">
        <div className="bg-black/70 rounded-lg shadow-lg p-6 pt-16 md:pt-20">
          <h2 className="text-2xl font-bold text-orange-500 mb-2 text-center">Create Instant Job</h2>
          <div className="mb-6 border-b border-orange-900/60">
            <div className="h-[2px] bg-orange-500 rounded w-full"></div>
          </div>
          <InstantJobForm 
            companyId={companyId}
            companyName={companyProfile.name}
            onJobCreated={() => {
              setActiveSection('list');
              loadInstantJobs();
            }}
            onCancel={() => setActiveSection('list')}
          />
        </div>
      </div>
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
          <div className="bg-black/70 rounded-lg shadow-lg p-6 pt-16 md:pt-20">
            <CompanyWelcome
              name={companyProfile.name}
              industry={companyProfile.industry}
              country={companyProfile.country}
              responsiblePerson={companyProfile.responsiblePerson}
              isMobile={isMobile}
            />            {/* Quick summary of job offers and counts - optimized for mobile (2x2) */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-4 my-2 sm:my-6 w-full">
              <div className="bg-black/60 rounded-lg p-2 sm:p-5 flex flex-col items-center justify-center border border-orange-900/30 w-full min-w-0 h-[70px] sm:h-auto">
                <span className="text-[10px] sm:text-sm text-gray-400 mb-0 sm:mb-1">Total Jobs</span>
                <span className="text-lg sm:text-2xl font-bold text-orange-400">{Array.isArray(jobs) ? jobs.length : 0}</span>
              </div>              <div className="bg-black/60 rounded-lg p-2 sm:p-5 flex flex-col items-center justify-center border border-orange-900/30 w-full min-w-0 h-[70px] sm:h-auto">
                <span className="text-[10px] sm:text-sm text-gray-400 mb-0 sm:mb-1">Active Jobs</span>
                <span className="text-lg sm:text-2xl font-bold text-orange-400">{Array.isArray(jobs) ? jobs.filter(j => j.status === 'active' && j.paymentStatus === 'completed').length : 0}</span>
              </div>
              <div className="bg-black/60 rounded-lg p-2 sm:p-5 flex flex-col items-center justify-center border border-orange-900/30 w-full min-w-0 h-[70px] sm:h-auto">
                <span className="text-[10px] sm:text-sm text-gray-400 mb-0 sm:mb-1">Applications</span>
                <span className="text-lg sm:text-2xl font-bold text-orange-400">{typeof totalApplications === 'number' ? totalApplications : 0}</span>
              </div>
              <div className="bg-black/60 rounded-lg p-2 sm:p-5 flex flex-col items-center justify-center border border-orange-900/30 w-full min-w-0 h-[70px] sm:h-auto">
                <span className="text-[10px] sm:text-sm text-gray-400 mb-0 sm:mb-1">Instant Jobs</span>
                <span className="text-lg sm:text-2xl font-bold text-orange-400">{Array.isArray(instantJobs) ? instantJobs.length : 0}</span>
              </div>
              <div className="bg-black/60 rounded-lg p-2 sm:p-5 flex flex-col items-center justify-center border border-orange-900/30 w-full min-w-0 h-[70px] sm:h-auto">
                <span className="text-[10px] sm:text-sm text-gray-400 mb-0 sm:mb-1">Learn2Earn</span>
                <span className="text-lg sm:text-2xl font-bold text-orange-400">{Array.isArray(learn2earn) ? learn2earn.length : 0}</span>
              </div>
            </div>            {/* DEBUG: Console logs for troubleshooting */}
            {(() => {
              console.log('Dashboard Debug Info:', {
                currentCompanyId: companyId,
                jobsLength: Array.isArray(jobs) ? jobs.length : 'not array',
                instantJobsLength: Array.isArray(instantJobs) ? instantJobs.length : 'not array', 
                learn2earnLength: Array.isArray(learn2earn) ? learn2earn.length : 'not array',
                totalApplications,
                jobs: jobs?.map(j => ({ id: j.id, company: j.company, paymentStatus: j.paymentStatus })),
                instantJobs: instantJobs?.map(j => ({ id: j.id, status: j.status })),
                learn2earn: learn2earn?.map(l => ({ id: l.id, status: l.status }))
              });
              
              return null;
            })()}
            {/* Evolution chart section - translated title */}
            <div className="mt-2 sm:mt-4 w-full overflow-x-auto">
              <div className="min-w-[320px] sm:min-w-0">
                <EvolutionChart data={evolutionData} />
              </div>
            </div>
          </div>
        );
      case "myJobs":
        return (
          <div className="bg-black/70 p-10 rounded-lg shadow-lg">
            <h2 className="text-3xl font-semibold text-orange-500 mb-6">My Posted Jobs</h2>
            {renderMyJobs()}
          </div>
        );      case "newJob":        return (
          <div className="bg-black/70 rounded-lg shadow-lg p-6 pt-16 md:pt-20">
            <h2 className="text-2xl font-bold text-orange-500 mb-2 text-center">Post a New Job</h2>
            <div className="mb-6 border-b border-orange-900/60"></div>
            <JobPostPayment companyId={companyId} companyProfile={companyProfile} reloadData={reloadData} />
          </div>
        );
      case "instantJobs":
        return renderInstantJobsTab();
      case "settings":
        return renderSettings();      case "learn2earn":
        return (
          <Learn2EarnManager
            companyId={companyId}
            companyProfile={companyProfile}
            db={db}
          />
        );      case "support":
        return (
          <SupportPanel
            userId={companyId}
            userType="company"
            userName={companyProfile.name || ""}
            userEmail={companyProfile.email || ""}
            notifications={notifications}
          />
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

 

  // Add after the existing useEffect hooks
  // Handle hydration
  useEffect(() => {
    setIsHydrated(true);
  }, []);
  
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
  }, [jobs, db]);  return (
    <FullScreenLayout>
      {/* Company Dashboard - Updated gradient matching learn2earn */}
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
          className={`${isMobile ? 'fixed left-0 top-0 h-full z-40 transform transition-transform duration-300 ease-in-out ' + (mobileMenuOpen ? 'translate-x-0' : '-translate-x-full') : 'relative'} w-full md:w-1/4 bg-black/70 p-6 flex flex-col pt-16 md:pt-20`}
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
            <WalletButton />            {/* Navigation */}
            <ul className="space-y-2 flex-grow w-full mt-6">              <li>
                <button
                  className={`w-full text-left py-2.5 px-4 rounded-md transition-all duration-200 focus:outline-none ${activeTab === "profile" ? "bg-orange-500/20 text-orange-400 border-l-4 border-orange-500" : "text-gray-400 hover:text-gray-300 hover:bg-gray-800/50"}`}
                  onClick={() => handleTabChange("profile")}
                >
                  Overview
                </button>
              </li>              <li>
                <button
                  className={`w-full text-left py-2.5 px-4 rounded-md transition-all duration-200 focus:outline-none flex items-center justify-between ${activeTab === "myJobOffers" ? "bg-orange-500/20 text-orange-400 border-l-4 border-orange-500" : "text-gray-400 hover:text-gray-300 hover:bg-gray-800/50"}`}
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
                        className={`w-full text-left py-1.5 px-3 rounded-md text-sm transition-all duration-200 ${jobOffersSubTab === 'list' ? 'bg-orange-500/20 text-orange-400 border-l-2 border-orange-500' : 'text-gray-400 hover:text-gray-300 hover:bg-gray-800/50'}`}
                        onClick={() => setJobOffersSubTab('list')}
                      >
                        All Offers
                      </button>
                    </li>
                    <li>
                      <button
                        className={`w-full text-left py-1.5 px-3 rounded-md text-sm transition-all duration-200 ${jobOffersSubTab === 'new' ? 'bg-orange-500/20 text-orange-400 border-l-2 border-orange-500' : 'text-gray-400 hover:text-gray-300 hover:bg-gray-800/50'}`}
                        onClick={() => setJobOffersSubTab('new')}
                      >
                        New Job Offer
                      </button>
                    </li>
                    <li>
                      <button
                        className={`w-full text-left py-1.5 px-3 rounded-md text-sm transition-all duration-200 ${jobOffersSubTab === 'instant' ? 'bg-orange-500/20 text-orange-400 border-l-2 border-orange-500' : 'text-gray-400 hover:text-gray-300 hover:bg-gray-800/50'}`}
                        onClick={() => setJobOffersSubTab('instant')}
                      >
                        Instant Jobs
                      </button>
                    </li>
                  </ul>
                )}
              </li>              <li>
                <button
                  className={`w-full text-left py-2.5 px-4 rounded-md transition-all duration-200 focus:outline-none ${activeTab === "learn2earn" ? "bg-orange-500/20 text-orange-400 border-l-4 border-orange-500" : "text-gray-400 hover:text-gray-300 hover:bg-gray-800/50"}`}
                  onClick={() => handleTabChange("learn2earn")}
                >
                  Learn2Earn
                </button>
              </li>              <li>
                <button
                  className={`w-full text-left py-2.5 px-4 rounded-md transition-all duration-200 focus:outline-none ${activeTab === "support" ? "bg-orange-500/20 text-orange-400 border-l-4 border-orange-500" : "text-gray-400 hover:text-gray-300 hover:bg-gray-800/50"}`}
                  onClick={() => handleTabChange("support")}
                >
                  Support
                </button>
              </li>              <li>
                <button
                  className={`w-full text-left py-2.5 px-4 rounded-md transition-all duration-200 focus:outline-none ${activeTab === "settings" ? "bg-orange-500/20 text-orange-400 border-l-4 border-orange-500" : "text-gray-400 hover:text-gray-300 hover:bg-gray-800/50"}`}
                  onClick={() => handleTabChange("settings")}
                >
                  Settings
                </button>
              </li>
            </ul>
          </div>
        </aside>
        
        {/* Main Content Area - Updated for mobile responsiveness */}
        <section className={`w-full ${isMobile ? 'p-2' : 'md:w-3/4 p-6'} overflow-y-auto transition-opacity duration-300 ${isMobile && mobileMenuOpen ? 'opacity-30' : 'opacity-100'}`}>
          {/* Render content based on subtab selection */}
          {activeTab === 'myJobOffers' ? (
            jobOffersSubTab === 'list' ? renderMyJobs() :            jobOffersSubTab === 'new' ? (
              <div className="w-full">
                <div className="bg-black/70 rounded-lg shadow-lg p-6 pt-16 md:pt-20">
                  {/* Main section title */}
                  <h2 className="text-2xl font-bold text-orange-500 mb-2 text-center">New Job Offer</h2>
                  {/* Orange line under title (no tabs for this section) */}
                  <div className="mb-6 border-b border-orange-900/60">
                    <div className="h-[2px] bg-orange-500 rounded w-full"></div>
                  </div>
                  <JobPostPayment companyId={companyId} companyProfile={companyProfile} reloadData={reloadData} />
                </div>
              </div>
            ): jobOffersSubTab === 'instant' ? renderInstantJobsTab() : null
          ) : renderContent()}
        </section>
        {/* Notification panel (right side overlay) */}        <NotificationsPanel
          companyId={companyId}
          open={showNotifications}
          onClose={() => setShowNotifications(false)}
          overlay={true}
        />
      </main>
    </FullScreenLayout>
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