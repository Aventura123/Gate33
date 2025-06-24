"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import Layout from "../../../components/FullScreenLayout";
import { useRouter } from 'next/navigation';
import { collection, addDoc, deleteDoc, doc, getDocs, updateDoc, getDoc, setDoc, query, where } from "firebase/firestore";
import { db } from "../../../lib/firebase";
import { getStorage, ref, uploadBytes, deleteObject, getDownloadURL } from "firebase/storage";
import { getAuth, createUserWithEmailAndPassword } from "firebase/auth";
import bcrypt from "bcryptjs";
import { AdminRole, useAdminPermissions } from "../../../hooks/useAdminPermissions";
import { ethers } from "ethers";
import NotificationsPanel, { NotificationBell } from '../../../components/ui/NotificationsPanel';
import { createAdminNotification } from '../../../lib/notifications';
import AdminPermissionsManager from "../../../components/admin/AdminPermissionsManager";
import InstantJobsManager from "../../../components/admin/InstantJobsManager";
import JobsManager from "../../../components/admin/JobsManager";
import PaymentSettings from "../../../components/admin/PaymentSettings";
import FinancialDashboard from "../../../components/admin/FinancialDashboard";
import AdManager from "../../../components/admin/AdManager";
import WalletButton from '../../../components/WalletButton';
import AdminNewsletterManager from "../../../components/admin/AdminNewsletterManager";
import AdminSocialMediaManager from "../../../components/admin/AdminSocialMediaManager";
import AdminPartnersManager from "../../../components/admin/AdminPartnersManager";
import Learn2EarnContractsPanel from "../../../components/ui/Learn2EarnContractsPanel";
import SystemActivityMonitor from "../../../components/admin/SystemActivityMonitor";
import TokenDistribution from "../../../components/admin/TokenDistribution";
import StatsDashboard from "@/components/admin/StatsDashboard";

interface NFT {
  id: string;
  title: string;
  description: string;
  value: string;
  link?: string;
  imagePath: string;
}

interface Admin {
  id: string;
  name: string;
  username: string;
  email: string;
  role: string;
}

interface JobPlan {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  features: string[];
  duration: number; // in days
  isPremium: boolean;
  isTopListed: boolean;
}

// --- Seekers State and Handlers ---
interface SeekerExperience {
  title: string;
  company: string;
  period: string;
  description?: string;
}

interface SeekerEducation {
  degree: string;
  institution: string;
  period: string;
  description?: string;
}

interface Seeker {
  id: string;
  name: string;
  surname?: string;
  username: string;
  email: string;
  createdAt?: string | any;  // Can be a string or a Firestore timestamp
  updatedAt?: string | any;  // Can be a string or a Firestore timestamp
  location?: string;
  address?: string;
  zipCode?: string;
  phone?: string;
  phoneCountryCode?: string;
  altContact?: string;
  altContactCountryCode?: string;
  nationality?: string;
  gender?: string;
  resumeUrl?: string;
  
  // Professional information
  title?: string;
  skills?: string;
  bio?: string;
  workPreference?: string;
  contractType?: string;
  availability?: string
  salaryExpectation?: string;
    // Social networks
  linkedinUrl?: string;
  twitterUrl?: string;
  facebookUrl?: string;
  
  // Account status
  blocked?: boolean;
  instagramUrl?: string;
  telegramUrl?: string;
  websiteUrl?: string;
  
  // Keep these properties in the interface but they won't be displayed in the UI
  experience?: SeekerExperience[];
  education?: SeekerEducation[];
}

// Define the available roles explicitly for the dropdown
const availableAdminRoles: AdminRole[] = ['super_admin', 'admin', 'support'];

// 1. Employer type definition (if not already present)
type Employer = {
  id: string;
  name?: string;
  email: string;
  companyName?: string;
  responsiblePerson?: string;
  responsibleName?: string;
  companySize?: string;
  employees?: string;
  industry?: string;
  blocked?: boolean;
  createdAt?: string | any;
  updatedAt?: string | any;
  taxId?: string;
  registrationNumber?: string;
  description?: string;
  yearsActive?: string;
  website?: string;
  responsibleEmail?: string;
  responsiblePhone?: string;
  responsiblePosition?: string;
  linkedin?: string;
  twitter?: string;
  facebook?: string;
  instagram?: string;
  telegram?: string;
  notes?: string;
  comments?: string;
  username?: string;
  country?: string;
  address?: string;
};

const AdminDashboard: React.FC = () => {  const router = useRouter();
  // Update the type declaration to include new tabs
  const [activeTab, setActiveTab] = useState<"dashboard" | "nfts" | "users" | "jobs" | "settings" | "payments" | "learn2earn" | "instantJobs" | "accounting" | "ads" | "newsletter" | "marketing" | "systemActivity" | "tokenDistribution">("dashboard");
  const [activeSubTab, setActiveSubTab] = useState<string | null>("add");
  
  // Use the permissions hook
  const { role, permissions, loading: permissionsLoading, hasPermission } = useAdminPermissions();

  // Define a consistent initial state to avoid SSR vs CSR hydration problems
  const [isClient, setIsClient] = useState(false);
  
  // Notification related states
  const [showNotifications, setShowNotifications] = useState(false);
  const [adminId, setAdminId] = useState<string | null>(null);
  
  // Ensure client-side rendering is consistent with the server
  useEffect(() => {
    setIsClient(true);
  }, []);
  // Effect to set up admin ID for notifications
  useEffect(() => {
    const fetchAdminId = async () => {
      try {
        // Get the admin ID from local storage
        const storedId = localStorage.getItem("userId");
        
        if (storedId) {
          // For super_admins, we'll use a special identifier for shared notifications
          if (role === 'super_admin') {
            console.log('Super admin detected, setting up for shared notifications');
            // We still store the actual admin ID for personal notifications
            setAdminId(storedId);
          } else {
            // For regular admins, we use their specific ID
            setAdminId(storedId);
          }
        } else {
          console.warn("No admin ID found in localStorage");
          const auth = getAuth();
          const user = auth.currentUser;
          
          if (user) {
            console.log("Using Firebase auth user ID as fallback");
            setAdminId(user.uid);
          }
        }
      } catch (err) {
        console.error("Error fetching admin ID:", err);
      }
    };
    
    if (!permissionsLoading) {
      fetchAdminId();
    }
  }, [permissionsLoading, role]);

  // Define the NFT type to include the 'image' property (and others as needed)
  type NFT = {
    id: string;
    title: string;
    description: string;
    value: string;
    link?: string;
    image: string; // Add this line
    imagePath?: string; // Add this if you use imagePath elsewhere
    // Add other properties as needed
  };

  const [nfts, setNFTs] = useState<NFT[]>([]);
  const [newNFT, setNewNFT] = useState({ title: "", description: "", value: "", link: "", image: null as File | null });
  const [userPhoto, setUserPhoto] = useState<string>("/images/logo2.png");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userName, setUserName] = useState("User");
  
  // --- Admins State and Handlers ---
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [adminsLoading, setAdminsLoading] = useState(false);
  const [adminsError, setAdminsError] = useState<string|null>(null);
  const [newAdmin, setNewAdmin] = useState({ name: '', username: '', password: '', email: '', role: '' });
  const [creating, setCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<string|null>(null);
  // --- Employers State and Handlers ---
  const [employers, setEmployers] = useState<Employer[]>([]);
  const [employersLoading, setEmployersLoading] = useState(false);
  const [employersError, setEmployersError] = useState<string|null>(null);
  const [deletingEmployerId, setDeletingEmployerId] = useState<string|null>(null);
  const [blockingEmployerId, setBlockingEmployerId] = useState<string|null>(null);
  // --- Seekers State and Handlers ---
  const [seekers, setSeekers] = useState<Seeker[]>([]);
  const [seekersLoading, setSeekersLoading] = useState(false);  const [seekersError, setSeekersError] = useState<string|null>(null);
  const [deletingSeekerId, setDeletingSeekerId] = useState<string|null>(null);
  const [blockingSeekerId, setBlockingSeekerId] = useState<string|null>(null);
  const [pendingCompanies, setPendingCompanies] = useState<any[]>([]);
  const [rejectedCompanies, setRejectedCompanies] = useState<any[]>([]);
  const [rejectedCompaniesLoading, setRejectedCompaniesLoading] = useState(false);
  const [expandedRejectedCompanyId, setExpandedRejectedCompanyId] = useState<string | null>(null);
  
  // Add missing state variables for approval/rejection loading states
  const [approving, setApproving] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState<string | null>(null);
  
  // --- Profile State and Handlers ---
  const [profileData, setProfileData] = useState({
    name: '',
    username: '',
    email: '',
    role: '',
    // Add editable fields
    password: '',
    confirmPassword: '',
    lastName: '', // Apelido
    address: '',
    country: '',
    phone: '',
    // Additional profile fields
    position: '',
    birthDate: '',
    nationality: '',
    preferredLanguage: 'en',
    mobilePhone: '',
    city: '',
    postalCode: '',
    emergencyContactName: '',
    emergencyContactPhone: '',
    website: '',
    linkedin: '',
    twitter: '',
    github: '',
    biography: '',
  });
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileUpdating, setProfileUpdating] = useState(false);
  useEffect(() => {
    const fetchPendingCompanies = async () => {
      try {
        if (!db) throw new Error("Firestore is not initialized");

        const pendingCompaniesCollection = collection(db, "pendingCompanies");
        const snapshot = await getDocs(pendingCompaniesCollection);

        const companies = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        setPendingCompanies(companies);
      } catch (error) {
        console.error("Error fetching pending companies:", error);
      }
    };

    const fetchRejectedCompanies = async () => {
      try {
        setRejectedCompaniesLoading(true);
        if (!db) throw new Error("Firestore is not initialized");

        const rejectedCompaniesCollection = collection(db, "rejectedCompanies");
        const snapshot = await getDocs(rejectedCompaniesCollection);

        const companies = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        setRejectedCompanies(companies);
      } catch (error) {
        console.error("Error fetching rejected companies:", error);
      } finally {
        setRejectedCompaniesLoading(false);
      }
    };

    fetchPendingCompanies();
    fetchRejectedCompanies();
  }, []);

  const auth = getAuth();  const handleApproveCompany = async (companyId: string) => {
    setApproving(companyId);
    try {
      if (!db) {
        throw new Error("Firestore is not initialized.");
      }

      const companyRef = doc(db, "pendingCompanies", companyId);
      const companySnapshot = await getDoc(companyRef);

      if (!companySnapshot.exists()) {
        throw new Error("Company data not found.");
      }

      const companyData = companySnapshot.data();

      if (!companyData || !companyData.email || !companyData.password || !companyData.companyName) {
        throw new Error("Invalid company data.");
      }

      // Extract all necessary fields
      const { 
        email, 
        password, 
        companyName, 
        industry, 
        companySize,
        username = email, // Use email as username if not defined
        name = companyName // Use companyName as name if not defined
      } = companyData;      // Create user in Firebase Auth
      const auth = getAuth();
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const authUid = userCredential.user.uid;
      
      console.log("Company user created in Auth with UID:", authUid);

      // Prepare the data object for Firestore
      const approvedCompanyData = {
        ...companyData,         // Keep all original fields
        username: username,     // Ensure username exists (using email as fallback)
        email: email,           // Ensure email is present
        name: name,             // Ensure name is present
        companyName: companyName, // Ensure companyName is present
        authUid: authUid,       // Store the Auth UID
        approvedAt: new Date().toISOString(),
        status: "approved",
        approved: true,
        authProvider: "email"
      };

      console.log("Approved company data:", {
        id: authUid,
        email: email,
        username: username,
        companyName: companyName
      });

      // Save to the companies collection using Auth UID as document ID
      const approvedCompanyRef = doc(db, "companies", authUid);
      await setDoc(approvedCompanyRef, approvedCompanyData);

      // Remove from the pendingCompanies collection
      await deleteDoc(companyRef);      // Update the list of pending companies
      setPendingCompanies(prev => prev.filter(company => company.id !== companyId));
      
      alert(`Company approved successfully! Username for login: ${username}`);
    } catch (error) {
      console.error("Error approving company:", error);
      alert("Failed to approve company.");
    } finally {
      setApproving(null);
    }
  };

  // --- Rejection modal state ---
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectingCompanyId, setRejectingCompanyId] = useState<string|null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [rejectingCompanyName, setRejectingCompanyName] = useState('');
  // Função para rejeitar empresa
  const handleRejectCompany = async () => {
    if (!rejectingCompanyId || !rejectionReason.trim()) return;
    setRejecting(rejectingCompanyId);
    try {
      if (!db) throw new Error("Firestore is not initialized");
      const company = pendingCompanies.find(c => c.id === rejectingCompanyId);
      if (!company) throw new Error("Company not found");
      // Salva na coleção rejectedCompanies
      await addDoc(collection(db, "rejectedCompanies"), {
        ...company,
        rejectionReason,
        rejectedAt: new Date().toISOString(),
      });
      // Remove da coleção pendingCompanies
      await deleteDoc(doc(db, "pendingCompanies", rejectingCompanyId));
      setPendingCompanies(prev => prev.filter(c => c.id !== rejectingCompanyId));
      setShowRejectModal(false);
      setRejectionReason('');
      setRejectingCompanyId(null);
      setRejectingCompanyName('');
      alert("Company rejected successfully.");
    } catch (err) {
      alert("Failed to reject company.");
    } finally {
      setRejecting(null);
    }
  };

  // Add missing handleRejectClick function
  const handleRejectClick = (companyId: string) => {
    const company = pendingCompanies.find(c => c.id === companyId);
    if (company) {
      setRejectingCompanyId(companyId);
      setRejectingCompanyName(company.companyName || company.name || '');
      setShowRejectModal(true);
    }
  };

  // --- Existing code ---

  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedUserName = localStorage.getItem("userName");
      if (storedUserName) {
        setUserName(storedUserName);
      }
    }
  }, []);

  // Function to fetch administrators from Firestore
  const fetchAdmins = async () => {
    setAdminsLoading(true);
    setAdminsError(null);
    try {
      const res = await fetch("/api/admin");
      if (!res.ok) throw new Error("Error fetching admins");
      const data = await res.json();
      setAdmins(data);
    } catch (err: any) {
      setAdminsError(err.message || "Unknown error");
      setAdmins([]);
    } finally {
      setAdminsLoading(false);
    }
  };

  // Function to fetch employers from Firestore
  const fetchEmployers = async () => {
    setEmployersLoading(true);
    setEmployersError(null);
    try {
      const res = await fetch("/api/admin/employers");
      if (!res.ok) throw new Error("Error fetching employers");
      const data = await res.json();
      setEmployers(data);
    } catch (err: any) {
      setEmployersError(err.message || "Unknown error");
      setEmployers([]);
    } finally {
      setEmployersLoading(false);
    }
  };

  // Function to fetch job seekers from Firestore
  const fetchSeekers = async () => {
    setSeekersLoading(true);
    setSeekersError(null);
    try {
      const res = await fetch("/api/admin/seekers");
      if (!res.ok) throw new Error("Error fetching seekers");
      const data = await res.json();
      setSeekers(data);
    } catch (err: any) {
      setSeekersError(err.message || "Unknown error");
      setSeekers([]);
    } finally {
      setSeekersLoading(false);
    }
  };

  const handleInputAdmin = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => { // Updated type to include HTMLSelectElement
    const { name, value } = e.target;
    setNewAdmin((prev) => ({ ...prev, [name]: value }));
  };

  // Use the global reload function instead of just updating the local state
  const reloadData = useCallback(() => {
    console.log("Reloading all dashboard data...");
    // Reload admin users
    fetchAdmins();
    // Reload employers
    fetchEmployers();
    fetchEmployersList();
    // Reload seekers
    fetchSeekers();
    // Reload NFTs
    fetchNFTs();
    // Reload pending companies
    const fetchPendingCompanies = async () => {
      try {
        if (!db) throw new Error("Firestore is not initialized");
        const pendingCompaniesCollection = collection(db, "pendingCompanies");
        const snapshot = await getDocs(pendingCompaniesCollection);
        const companies = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setPendingCompanies(companies);
      } catch (error) {
        console.error("Error fetching pending companies:", error);
      }
    };
    fetchPendingCompanies();
      // Reload learn2earn if on learn2earn tab (changed from airdrops)
    if (activeTab === "learn2earn") { // Changed from airdrops
      if (activeSubTab === "list") {
        fetchLearn2Earns();
      }
      // Contract management has been moved to Learn2EarnContractsPanel component
    }
  }, [activeTab, activeSubTab]);

  // Refresh data when tab changes
  useEffect(() => {
    reloadData();
  }, [activeTab, reloadData]);

  // Refresh data when subtab changes
  useEffect(() => {
    if (activeSubTab) {
      reloadData();
    }
  }, [activeSubTab, reloadData]);

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    // Ensure a role is selected
    if (!newAdmin.role) {
        alert('Please select a role for the admin!');
        return;
    }
    if (!newAdmin.name || !newAdmin.username || !newAdmin.password || !newAdmin.email) {
      alert('Please fill in all fields!');
      return;
    }
    setCreating(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        alert('Error: Authentication token not found. Please log in again.');
        setCreating(false);
        router.replace('/admin/login'); // Fix redirect path here
        return;
      }
      const res = await fetch('/api/admin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(newAdmin),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || `Error ${res.status}: Failed to create admin`);
      }
      setNewAdmin({ name: '', username: '', password: '', email: '', role: '' });
      reloadData();
      alert('Admin created successfully!');
    } catch (err: any) {
      console.error("Error creating admin:", err);
      alert(err.message || 'Unknown error creating admin');
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteAdmin = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this admin?')) return;
    setDeletingId(id);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        alert('Error: Authentication token not found. Please log in again.');
        setDeletingId(null);
        router.replace('/admin/login'); // Fix redirect path here
        return;
      }
      const res = await fetch('/api/admin', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ id }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || `Error ${res.status}: Failed to delete admin`);
      }
      fetchAdmins();
      alert('Admin deleted successfully!');
    } catch (err: any) {
      console.error("Error deleting admin:", err);
      alert(err.message || 'Unknown error deleting admin');
    } finally {
      setDeletingId(null);
    }
  };

  const handleDeleteEmployer = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this employer?')) return;
    setDeletingEmployerId(id);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        alert('Error: Authentication token not found. Please log in again.');
        setDeletingEmployerId(null);
        router.replace('/admin/login'); // Fix redirect path here
        return;
      }
      const res = await fetch('/api/admin/employers', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ id }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || `Error ${res.status}: Failed to delete employer`);
      }
      // Reload all dashboard data after deletion
      reloadData();
      alert('Employer deleted successfully!');
    } catch (err: any) {
      console.error("Error deleting employer:", err);
      alert(err.message || 'Unknown error deleting employer');
    } finally {
      setDeletingEmployerId(null);
    }
  };

  const handleDeleteSeeker = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this seeker?')) return;
    setDeletingSeekerId(id);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        alert('Error: Authentication token not found. Please log in again.');
        setDeletingSeekerId(null);
        router.replace('/admin/login'); // Fix redirect path here
        return;
      }
      const res = await fetch('/api/admin/seekers', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ id }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || `Error ${res.status}: Failed to delete seeker`);
      }
      // Use the global reload function to make sure all data is updated
      reloadData();
      alert('Seeker deleted successfully!');
    } catch (err: any) {
      console.error("Error deleting seeker:", err);
      alert(err.message || 'Unknown error deleting seeker');
    } finally {
      setDeletingSeekerId(null);
    }
  };

  // Function to fetch NFTs from the API
  const fetchNFTs = async () => {
    setIsLoading(true);
    setError(null);
    try {
      if (!db) throw new Error("Firestore is not initialized");

      const nftCollection = collection(db, "nfts");
      const nftSnapshot = await getDocs(nftCollection);
      const storage = getStorage();

      const fetchedNFTs = await Promise.all(
        nftSnapshot.docs.map(async (doc) => {
          const data = doc.data();
          const imagePath = data.imagePath || "";
          let imageUrl = "/images/logo.png"; // Default image

          if (imagePath) {
            try {
              const imageRef = ref(storage, imagePath);
              imageUrl = await getDownloadURL(imageRef);
            } catch (error) {
              console.error("Error fetching image URL from Firebase Storage:", error);
            }
          }

          return {
            id: doc.id,
            title: data.title || "",
            description: data.description || "",
            value: data.value || "",
            link: data.link || "",
            imagePath,
            image: imageUrl,
          };
        })
      );

      setNFTs(fetchedNFTs);
    } catch (err: any) {
      console.error("Error fetching NFTs from Firestore:", err);
      setError(err.message || "An error occurred while fetching NFTs.");
      setNFTs([]); // Clear NFTs on error
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchNFTs();
    
    // Load data from Firestore when the component mounts
    fetchAdmins();
    
    // When the subtab is selected, load the corresponding data
    if (activeSubTab === "employers") {
      fetchEmployers();
    } else if (activeSubTab === "seekers") {
      fetchSeekers();
    }

    // Fetch user photo from persistent endpoint
    const fetchUserPhoto = async () => {
      const userId = localStorage.getItem("userId");
      if (!userId) return;

      try {
        const response = await fetch(`/api/userProfile?userId=${userId}`);
        if (response.ok) {
          const data = await response.json();
          if (data.photoUrl) {
            setUserPhoto(data.photoUrl);
          }
        } else {
          console.error("Error fetching user photo:", response.statusText);
        }
      } catch (error) {
        console.error("Error fetching user photo:", error);
      }
    };

    fetchUserPhoto();
  }, [activeSubTab]);

  // useEffect to fetch user photo
  useEffect(() => {
    // Load user name from localStorage
    if (typeof window !== "undefined") {
      const storedUserName = localStorage.getItem("userName");
      if (storedUserName) {
        setUserName(storedUserName);
      }
      
      // Check if we already have the photo in localStorage first
      const storedPhoto = localStorage.getItem("userPhoto");
      if (storedPhoto) {
        console.log("Photo loaded from localStorage:", storedPhoto);
        setUserPhoto(storedPhoto);
      }
        // Fetch the user photo from the userProfile endpoint anyway
      const fetchUserPhoto = async () => {
        const userId = localStorage.getItem("userId");
        if (!userId) {
          console.error("User ID not found in localStorage");
          return;
        }
  
        try {
          const response = await fetch(`/api/userProfile?userId=${userId}`);
          
          if (response.ok) {
            const data = await response.json();
            
            if (data.photoUrl) {
              setUserPhoto(data.photoUrl);
              localStorage.setItem("userPhoto", data.photoUrl);
            } else if (data.userData?.photoURL) {
              setUserPhoto(data.userData.photoURL);
              localStorage.setItem("userPhoto", data.userData.photoURL);
            } else if (data.userData?.photo) {
              setUserPhoto(data.userData.photo);
              localStorage.setItem("userPhoto", data.userData.photo);
            }
            
            // If we received additional user information, we can use it
            if (data.userData?.name || data.userData?.user) {
              const name = data.userData.name || data.userData.user;
              setUserName(name);
              localStorage.setItem("userName", name);
            }
          } else {
            console.error("Error fetching user photo:", response.statusText);
          }
        } catch (error) {
          console.error("Error fetching user photo:", error);
        }
      };
  
      fetchUserPhoto();
    }
  }, []);

  // Function to initialize a default administrator if necessary
  const initializeAdmin = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/admin/setup');
      const data = await response.json();
      
      if (response.ok) {
        console.log("Response from setup endpoint:", data);
        
        if (data.adminId) {
          setError(`Default admin created successfully! Use the username '${data.credentials.username}' and password '${data.credentials.password}' to log in.`);
        } else {
          setError(`${data.message}. There are ${data.count} admins in the system.`);
        }
      } else {
        setError(`Error initializing admin: ${data.error}`);
      }
    } catch (err) {
      console.error("Error initializing admin:", err);
      setError("Failed to initialize a default admin.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, files } = e.target as HTMLInputElement;
    if (name === "image" && files && files.length > 0) {
      setNewNFT((prevForm) => ({ ...prevForm, image: files[0] }));
    } else {
      setNewNFT((prevForm) => ({ ...prevForm, [name]: value })); 
    }
  };

  // Revert to the previous logic using FormData and /api/nfts
  const handleAddNFT = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newNFT.image) {
      alert("Please select an image file.");
      return;
    }

    try {
      const storage = getStorage();
      const imageRef = ref(storage, `nfts/${newNFT.image.name}`);

      // Upload the image to Firebase Storage
      const uploadResult = await uploadBytes(imageRef, newNFT.image);
      const imagePath = uploadResult.metadata.fullPath;

      const nftData = {
        title: newNFT.title,
        description: newNFT.description,
        value: newNFT.value,
        link: newNFT.link || "",
        imagePath: imagePath, // Save the path of the uploaded image
      };

      if (!db) throw new Error("Firestore is not initialized");

      const nftCollection = collection(db, "nfts");
      await addDoc(nftCollection, nftData);

      alert("NFT added successfully!");
      
      // Use the global reload function instead of just updating the local state
      reloadData();
      
      setNewNFT({ title: "", description: "", value: "", link: "", image: null });
    } catch (error) {
      console.error("Error adding NFT to Firestore and uploading image:", error);
      alert("Failed to add NFT. Check console for details.");
    }
  };

  const handleDeleteNFT = async (id: string, imagePath: string) => {
    const confirmation = window.prompt('To confirm deletion, please type "delete":');
    if (confirmation?.toLowerCase() === 'delete') {
      try {
        if (!db) throw new Error("Firestore is not initialized");

        // Delete the NFT document from Firestore
        const nftDocRef = doc(db, "nfts", id);
        await deleteDoc(nftDocRef);

        // Delete the image from Firebase Storage
        if (imagePath) {
          const storage = getStorage();
          const imageRef = ref(storage, imagePath);
          await deleteObject(imageRef);
        }

        // Fetch updated list of NFTs
        await fetchNFTs();

        alert("NFT deleted successfully.");
      } catch (err: any) {
        console.error("Error deleting NFT:", err);
        alert(`Error deleting NFT: ${err.message}`);
      }
    } else if (confirmation !== null) {
      alert("Deletion cancelled or incorrect confirmation text.");
    }
  };

  const handleDeleteAllNFTs = async () => {
    const confirmation = window.prompt('To confirm deleting ALL NFTs, please type "delete all":');
    if (confirmation?.toLowerCase() === 'delete all') {
      try {
        if (!db) throw new Error("Firestore is not initialized");

        const storage = getStorage();
        const nftCollection = collection(db, "nfts");
        const nftSnapshot = await getDocs(nftCollection);

        // Delete all NFTs and their images
        const deletePromises = nftSnapshot.docs.map(async (doc) => {
          const data = doc.data();
          const imagePath = data.imagePath || "";

          // Delete the document
          await deleteDoc(doc.ref);

          // Delete the image from Firebase Storage
          if (imagePath) {
            const imageRef = ref(storage, imagePath);
            await deleteObject(imageRef);
          }
        });

        await Promise.all(deletePromises);
        
        // Clear local state
        setNFTs([]);
        alert("All NFTs deleted successfully.");
      } catch (err: any) {
        console.error("Error deleting all NFTs:", err);
        alert(`Error deleting all NFTs: ${err.message}`);
      }
    } else if (confirmation !== null) {
      alert("Deletion cancelled or incorrect confirmation text.");
    }
  };

  // Function to handle logout
  const handleLogout = () => {
    console.log('Logout button clicked');
    // Clear localStorage
    localStorage.removeItem("userPhoto");
    localStorage.removeItem("token");
    localStorage.removeItem("userId");
    localStorage.removeItem("userName");
    // Clear authentication cookie (Next.js doesn't have a direct API, but we can overwrite it)
    document.cookie = "isAuthenticated=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    console.log('Cookie isAuthenticated removed');
    router.replace('/admin/login');
    console.log('router.replace called for admin login');
  };

  // Function to handle user photo change
  const handleUserPhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      console.log("Selected file:", file.name, "Type:", file.type, "Size:", file.size, "bytes");
      
      // Validate file type
      if (!file.type.startsWith("image/")) {
        alert("Please select only image files.");
        return;
      }
      
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert("The file is too large. Please select an image smaller than 5MB.");
        return;
      }
      
      // Show loading indicator
      const loadingToast = alert("Uploading photo... Please wait.");
      
      const formData = new FormData();
      formData.append("file", file);

      const userId = localStorage.getItem("userId");
      if (!userId) {
        alert("User ID not found. Please log in again.");
        return;
      }
      formData.append("userId", userId);

      try {
        console.log("Starting upload for userId:", userId);
        const response = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        console.log("Server response:", response.status, response.statusText);

        if (!response.ok) {
          const errorData = await response.json();
          console.error("Detailed error:", errorData);
          throw new Error(errorData.message || "Failed to upload profile photo");
        }

        const data = await response.json();
        console.log("Data received after upload:", data);
        
        if (!data.url) {
          throw new Error("Image URL not received from server");
        }
        
        const photoUrl = data.url;
        console.log("Photo URL:", photoUrl);

        // Update UI with new photo
        setUserPhoto(photoUrl);
        localStorage.setItem("userPhoto", photoUrl);

        // Update user data with new photo on server
        try {
          const userProfileResponse = await fetch("/api/userProfile", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              userId: userId,
              photoUrl: photoUrl,
              collection: "admins" // Explicitly setting as admin, since we are in admin dashboard
            }),
          });

          if (!userProfileResponse.ok) {
            console.warn("Failed to update user profile with new photo, but upload was successful");
          } else {
            console.log("User profile updated successfully with new photo");
          }
        } catch (profileError) {
          console.error("Error updating user profile:", profileError);
          // Don't show error to user at this point, since upload has already completed
        }

        alert(`Photo updated successfully! ${data.storageMethod === 'local' ? '(Stored locally)' : ''}`);
      } catch (error) {
        console.error("Error uploading user photo:", error);
        if (error instanceof Error) {
          alert(error.message || "Failed to upload profile photo. Check console for details.");
        } else {
          alert("An unknown error occurred. Check console for details.");
        }
      }
    }
  };
  // Use null initially to prevent hydration mismatch
  const [isMobile, setIsMobile] = useState<boolean | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const checkIfMobile = () => {
      if (typeof window !== 'undefined') {
        setIsMobile(window.innerWidth < 768);
      }
    };
    checkIfMobile();
    window.addEventListener('resize', checkIfMobile);
    return () => window.removeEventListener('resize', checkIfMobile);
  }, []);

  // Corrigindo o erro de "window is not defined" para a mensagem de boas-vindas
  const isDesktop = typeof window !== "undefined" && window.innerWidth >= 768;
  // Get user ID from localStorage instead of making an API call without userId
  const getUserIdFromLocalStorage = () => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem("userId");
    }
    return null;
  };

  // Atualizar o useEffect para usar o localStorage em vez de uma chamada sem ID
  useEffect(() => {
    const fetchUserPhoto = async () => {
      try {
        const userId = getUserIdFromLocalStorage();
        console.log("Fetching user photo for ID:", userId);
        
        if (!userId) {
          console.error("No userId found in localStorage");
          return;
        }

        const response = await fetch(`/api/userProfile?userId=${userId}`);
        console.log("API response from userProfile:", response.status, response.statusText);
        
        if (response.ok) {
          const data = await response.json();
          if (data.photoUrl) {
            setUserPhoto(data.photoUrl);
          } else {
            console.warn("No photo found for user");
          }
        } else {
          console.error("Error fetching user photo:", response.statusText);
        }
      } catch (error) {
        console.error("Error fetching user photo:", error);
      }
    };

    fetchUserPhoto();
  }, []);
  // This useEffect was removed because it was causing data mixing by using the first admin instead of the logged-in user

const fetchEmployersList = async () => {
  try {
    if (!db) throw new Error("Firestore is not initialized");
    
    const companiesCollection = collection(db, "companies");
    const querySnapshot = await getDocs(companiesCollection);
    
    const employersList = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      // Ensure these fields exist, with name taking priority for display
      name: doc.data().name || doc.data().companyName || '',
      email: doc.data().email || '',
      companyName: doc.data().companyName || doc.data().name || '',
      responsiblePerson: doc.data().responsiblePerson || '',
      responsibleName: doc.data().responsibleName || doc.data().responsiblePerson || '',
      companySize: doc.data().companySize || doc.data().employees || '',
      industry: doc.data().industry || '',
      blocked: doc.data().blocked || false
    }));

    console.log("Employers list:", employersList);
    setEmployers(employersList);
  } catch (error) {
    console.error("Error fetching employers:", error);
    setEmployersError("Failed to fetch employers list");
  } finally {
    setEmployersLoading(false);
  }
};

  useEffect(() => {
    if (activeSubTab === "employers-list") {
      fetchEmployersList();
    }
  }, [activeSubTab]);

  const [expandedEmployerId, setExpandedEmployerId] = useState<string | null>(null);

  const toggleEmployerDetails = (id: string) => {
    setExpandedEmployerId((prevId) => (prevId === id ? null : id));
  };

  // Handle blocking/unblocking an employer
  const handleToggleBlockEmployer = async (employerId: string, currentlyBlocked: boolean) => {
    setBlockingEmployerId(employerId);
    try {
      if (!db) throw new Error("Firestore is not initialized");
      const employerRef = doc(db, "companies", employerId);
      await updateDoc(employerRef, { blocked: !currentlyBlocked });
      // Update local state
      setEmployers((prev) =>
        prev.map((emp) =>
          emp.id === employerId ? { ...emp, blocked: !currentlyBlocked } : emp
        )
      );
      alert(`Employer has been ${!currentlyBlocked ? "blocked" : "unblocked"} successfully!`);
    } catch (error: any) {
      console.error("Error blocking/unblocking employer:", error);
      alert(error.message || "Failed to update employer block status.");
    } finally {
      setBlockingEmployerId(null);
    }
  };
  // Handle blocking/unblocking a seeker
  const handleToggleBlockSeeker = async (seekerId: string, currentlyBlocked: boolean) => {
    setBlockingSeekerId(seekerId);
    try {
      const response = await fetch('/api/admin/seekers', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: seekerId,
          blocked: !currentlyBlocked
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update seeker block status');
      }
      
      // Update local state
      setSeekers((prev) =>
        prev.map((skr) =>
          skr.id === seekerId ? { ...skr, blocked: !currentlyBlocked } : skr
        )
      );
      alert(`Seeker has been ${!currentlyBlocked ? "blocked" : "unblocked"} successfully!`);
    } catch (error: any) {
      console.error("Error blocking/unblocking seeker:", error);
      alert(error.message || "Failed to update seeker block status.");
    } finally {
      setBlockingSeekerId(null);
    }
  };
  const [searchQuery, setSearchQuery] = useState("");
  const [searchSeekersQuery, setSearchSeekersQuery] = useState("");
  const [searchRejectedCompaniesQuery, setSearchRejectedCompaniesQuery] = useState("");

  // Filter seekers based on search query
  const filteredSeekers = seekers.filter((seeker) => {
    const query = searchSeekersQuery.toLowerCase();
    return (
      seeker.name?.toLowerCase().includes(query) ||
      seeker.email?.toLowerCase().includes(query) ||
      seeker.username?.toLowerCase().includes(query) ||
      (seeker.surname && seeker.surname.toLowerCase().includes(query))
    );
  });
  // Filter employers based on search query (already defined)
  const filteredEmployers = employers.filter((employer) => {
    const query = searchQuery.toLowerCase();
    return (
      employer.name?.toLowerCase().includes(query) ||
      employer.email.toLowerCase().includes(query) ||
      (employer.companyName || "").toLowerCase().includes(query)
    );
  });
  
  // Filter rejected companies based on search query
  const filteredRejectedCompanies = rejectedCompanies.filter((company) => {
    const query = searchRejectedCompaniesQuery.toLowerCase();
    return (
      (company.companyName || "").toLowerCase().includes(query) ||
      (company.name || "").toLowerCase().includes(query) ||
      (company.email || "").toLowerCase().includes(query) ||
      (company.responsibleName || "").toLowerCase().includes(query) ||
      (company.responsiblePerson || "").toLowerCase().includes(query)
    );
  });

  useEffect(() => {
    // Check if we have permissions and redirect to the access denied page if necessary
    if (!permissionsLoading && permissions) {
      if (!hasPermission('canViewAnalytics')) {
        console.warn("User lacks 'canViewAnalytics' permission. Redirecting to access-denied.");
        router.replace('/admin/access-denied');
      }
    }
  }, [permissionsLoading, permissions, hasPermission, router]);

  // Function to check if the user has permission to access a specific subtab
  const canAccessSubtab = (subtab: string): boolean => {
    switch (subtab) {
      case 'adms':
        return hasPermission('canManageUsers');
      case 'employers-create':
      case 'employers-approve':
        return hasPermission('canApproveCompanies');
      case 'employers-list':
        return hasPermission('canViewAnalytics'); // Most basic permission
      case 'seekers':
        return hasPermission('canEditContent');
      case 'add':
      case 'delete':
        return hasPermission('canEditContent');
      default:
        return true;
    }
  };
  // Fetch current admin's data when profile tab is active
  useEffect(() => {
    const fetchCurrentAdminProfile = async () => {
      if (activeTab === 'settings' && activeSubTab === 'profile') {
        const userId = localStorage.getItem("userId");
        if (!userId) {
          setProfileError("Could not find your user ID. Please log in again.");
          return;
        }
        setProfileLoading(true);
        setProfileError(null);
        try {
          // Assuming /api/userProfile can fetch by userId and knows it's an admin
          const response = await fetch(`/api/userProfile?userId=${userId}&collection=admins`);
          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `Error fetching profile: ${response.statusText}`);
          }
          const data = await response.json();
          console.log("Admin profile data loaded:", data);

          // NUNCA use localStorage para username, email ou role
          setProfileData({
            name: data.userData?.name || '',
            username: data.userData?.username || data.userData?.name || '',
            email: data.userData?.email || '',
            role: data.userData?.role || '',
            lastName: data.userData?.lastName || '',
            address: data.userData?.address || '',
            country: data.userData?.country || '',
            phone: data.userData?.phone || '',
            password: '', // Don't pre-fill password
            confirmPassword: '',
            // New fields
            position: data.userData?.position || '',
            birthDate: data.userData?.birthDate || '',
            nationality: data.userData?.nationality || '',
            preferredLanguage: data.userData?.preferredLanguage || 'en',
            mobilePhone: data.userData?.mobilePhone || '',
            city: data.userData?.city || '',
            postalCode: data.userData?.postalCode || '',
            emergencyContactName: data.userData?.emergencyContactName || '',
            emergencyContactPhone: data.userData?.emergencyContactPhone || '',
            website: data.userData?.website || '',
            linkedin: data.userData?.linkedin || '',
            twitter: data.userData?.twitter || '',
            github: data.userData?.github || '',
            biography: data.userData?.biography || '',
          });
        } catch (err: any) {
          console.error("Error fetching profile:", err);
          setProfileError(err.message || "Failed to load profile data.");
        } finally {
          setProfileLoading(false);
        }
      }
    };

    fetchCurrentAdminProfile();
  }, [activeTab, activeSubTab]);

  const handleProfileInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setProfileData((prev) => ({ ...prev, [name]: value }));
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileUpdating(true);
    setProfileError(null);

    const userId = localStorage.getItem("userId");
    if (!userId) {
      setProfileError("Could not find your user ID. Please log in again.");
      setProfileUpdating(false);
      return;
    }

    // Basic validation
    if (profileData.password && profileData.password !== profileData.confirmPassword) {
      setProfileError("Passwords do not match.");
      setProfileUpdating(false);
      return;
    }

    try {
      // Get the current user photo URL from localStorage or state
      const photoUrl = localStorage.getItem("userPhoto") || userPhoto;
      
      if (!photoUrl) {
        setProfileError("User photo URL is required. Please upload a profile photo first.");
        setProfileUpdating(false);
        return;
      }

      console.log("Attempting to update profile for user ID:", userId);
      console.log("Using collection: admins");

      // Create update data object for both API and direct Firestore update
      const updateData = {
        photoUrl: photoUrl,
        lastName: profileData.lastName || "",
        address: profileData.address || "",
        country: profileData.country || "",
        phone: profileData.phone || "",
        updatedAt: new Date().toISOString()
      };      // If password is being changed, we need to handle it through API only (not direct Firestore update)
      let passwordUpdate = null;
      if (profileData.password) {
        passwordUpdate = profileData.password;
        // Don't add password to updateData - it will be handled by API
      }

      // Log the payload (redacting sensitive data)
      console.log("Update payload:", {
        ...updateData,
        photoUrl: "[REDACTED]",
        password: (updateData as { password?: string }).password ? "[REDACTED]" : undefined
      });

      // APPROACH 1: Direct Firestore update (more reliable)
      try {
        if (!db) {
          throw new Error("Firestore is not initialized");
        }

        // Get a reference to the user document in the "admins" collection
        const adminRef = doc(db, "admins", userId);
        
        // Check if the document exists
        const docSnap = await getDoc(adminRef);
        if (!docSnap.exists()) {
          throw new Error("Admin document not found in Firestore. Please check your user ID.");
        }
        
        // Update the document
        await updateDoc(adminRef, updateData);
        console.log("Profile updated successfully via direct Firestore update");        // APPROACH 2: Use API for password updates and other changes
        const token = localStorage.getItem('token');
        if (token) {
          const apiPayload: any = {
            userId: userId,
            collection: "admins",
            ...updateData
          };
          
          // Add password to API payload if being changed
          if (passwordUpdate) {
            apiPayload.newPassword = passwordUpdate;
          }
          
          const apiResponse = await fetch("/api/userProfile", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(apiPayload),
          });
          
          if (apiResponse.ok) {
            console.log("Profile updated via API");
          } else {
            const errorData = await apiResponse.json();
            console.error("API update failed:", errorData);
            
            // If password update failed, this is critical
            if (passwordUpdate) {
              throw new Error("Failed to update password: " + (errorData.message || "Unknown error"));
            } else {
              console.warn("Non-password API update failed, but direct Firestore update was successful");
            }
          }
        } else if (passwordUpdate) {
          throw new Error("Cannot update password: Authentication token not found");
        }
        
        alert("Profile updated successfully!");
        
        // Clear password fields after successful update
        setProfileData(prev => ({ ...prev, password: '', confirmPassword: '' }));
      } catch (firestoreError) {
        console.error("Direct Firestore update failed:", firestoreError);
        
        // Try API method as fallback
        const token = localStorage.getItem('token');
        if (!token) {
          throw new Error("Authentication token not found. Please log in again.");
        }
        
        const apiResponse = await fetch("/api/userProfile", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            userId: userId,
            collection: "admins",
            ...updateData
          }),
        });
        
        if (!apiResponse.ok) {
          const errorData = await apiResponse.json();
          throw new Error(errorData.error || `API Error: ${apiResponse.status} ${apiResponse.statusText}`);
        }
        
        console.log("Profile updated successfully via API fallback");
        alert("Profile updated successfully!");
        
        // Clear password fields after successful update
        setProfileData(prev => ({ ...prev, password: '', confirmPassword: '' }));
      }
    } catch (err) {
      console.error("Error updating profile:", err);
      if (err instanceof Error) {
        setProfileError(err.message || "Failed to update profile.");
      } else {
        setProfileError("An unknown error occurred while updating your profile.");
      }
    } finally {
      setProfileUpdating(false);
    }
  };
  // Jobs state and handlers are now managed in the JobsManager component
  // Job-related functions have been moved to the JobsManager component
  // All job-related functions and useEffect handlers have been moved to the JobsManager component
  // --- Learn2Earn State and Handlers ---
  const [learn2earns, setLearn2Earns] = useState<any[]>([]);
  const [learn2earnLoading, setLearn2EarnLoading] = useState(false);
  const [learn2earnError, setLearn2EarnError] = useState<string | null>(null);
  const [deletingLearn2EarnId, setDeletingLearn2EarnId] = useState<string | null>(null);
  const [pausingLearn2EarnId, setPausingLearn2EarnId] = useState<string | null>(null);
  const [learn2earnSearchTerm, setLearn2earnSearchTerm] = useState<string>('');
  const [expandedLearn2EarnId, setExpandedLearn2EarnId] = useState<string | null>(null);
    // Contract management has been moved to Learn2EarnContractsPanel component

  // Filter Learn2Earn opportunities based on search term
  const filteredLearn2Earns = useMemo(() => {
    if (!learn2earnSearchTerm.trim()) return learn2earns;
    
    const searchLower = learn2earnSearchTerm.toLowerCase();
    return learn2earns.filter(l2e => 
      l2e.title?.toLowerCase().includes(searchLower) ||
      l2e.description?.toLowerCase().includes(searchLower) ||
      l2e.tokenSymbol?.toLowerCase().includes(searchLower) ||
      l2e.network?.toLowerCase().includes(searchLower) ||
      l2e.id?.toLowerCase().includes(searchLower)
    );
  }, [learn2earns, learn2earnSearchTerm]);

  // Fetch airdrops from Firestore
  const fetchLearn2Earns = async () => {
    setLearn2EarnLoading(true);
    setLearn2EarnError(null);
    try {
      if (!db) {
        throw new Error("Firestore is not initialized.");
      }

      const learn2earnCollection = collection(db, "learn2earn");
      const querySnapshot = await getDocs(learn2earnCollection);

      if (querySnapshot.empty) {
        console.log("No learn2earn found in Firestore");
        setLearn2Earns([]);
        setLearn2EarnLoading(false);
        return;
      }

      const learn2earnList = querySnapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          status: data.status || 'inactive',
        };
      });

      setLearn2Earns(learn2earnList);
    } catch (error) {
      console.error("Error fetching learn2earn:", error);
      setLearn2EarnError("Failed to fetch learn2earn. Please check the console for more details.");
      setLearn2Earns([]);
    } finally {
      setLearn2EarnLoading(false);
    }
  };

    // Contract management functions have been moved to Learn2EarnContractsPanel component

  // Handle pausing/resuming an learn2earn (changed from airdrop)
  const handleToggleLearn2EarnStatus = async (learn2earnId: string, currentStatus: string) => {
    if (!learn2earnId) {
      alert("Invalid learn2earn ID");
      return;
    }
    
    setPausingLearn2EarnId(learn2earnId);
    try {
      if (!db) {
        throw new Error("Firestore is not initialized.");
      }
      
      console.log(`Toggling learn2earn status for ID: ${learn2earnId}. Current status: ${currentStatus}`);

      const learn2earnRef = doc(db, "learn2earn", learn2earnId);
      const learn2earnDoc = await getDoc(learn2earnRef);
      
      if (!learn2earnDoc.exists()) {
        throw new Error("Learn2Earn document not found");
      }
      
      const newStatus = currentStatus === 'active' ? 'paused' : 'active';
      
      await updateDoc(learn2earnRef, { 
        status: newStatus,
        updatedAt: new Date().toISOString()
      });
      
      console.log(`Learn2Earn status updated to: ${newStatus}`);
      
      // Update local state to reflect the change
      // Update local state to reflect the change
      setLearn2Earns(learn2earns.map(item => 
        item.id === learn2earnId ? {...item, status: newStatus} : item
      ));
      
      alert(`Learn2Earn ${newStatus === 'active' ? 'activated' : 'paused'} successfully!`);
    } catch (error: any) {
      console.error("Error updating learn2earn status:", error);
      alert(`Failed to update learn2earn status: ${error.message}`);
    } finally {
      setPausingLearn2EarnId(null);
    }
  };
    const handleDeleteLearn2Earn = async (learn2earnId: string) => { // Changed from handleDeleteAirdrop
    if (!learn2earnId) {
      alert("Invalid learn2earn ID"); // Changed from airdrop
      return;
    }
    
    if (!window.confirm("Are you sure you want to delete this learn2earn opportunity? This action cannot be undone.")) { // Changed from airdrop
      return;
    }
    
    setDeletingLearn2EarnId(learn2earnId);
    try {
      if (!db) {
        throw new Error("Firestore is not initialized.");
      }
      
      console.log(`Deleting learn2earn with ID: ${learn2earnId}`); // Changed from airdrop
      
      // First check if the document exists
      const learn2earnRef = doc(db, "learn2earn", learn2earnId); // Changed from airdropRef
      const learn2earnDoc = await getDoc(learn2earnRef); // Changed from airdropDoc
      

      
      if (!learn2earnDoc.exists()) {
        throw new Error("Learn2Earn document not found"); // Changed from Airdrop
      }
      
      // Delete the document
      await deleteDoc(learn2earnRef);
      
      console.log(`Learn2Earn deleted successfully`); // Changed from Airdrop
      
      // Update local state to remove the deleted learn2earn
      setLearn2Earns(learn2earns.filter(item => item.id !== learn2earnId)); // Changed from airdrop
      
      alert("Learn2Earn deleted successfully!"); // Changed from Airdrop
    } catch (error: any) {
      console.error("Error deleting airdrop:", error);
      alert(`Failed to delete airdrop: ${error.message}`);
    } finally {
      setDeletingLearn2EarnId(null);
    }
  };

  // Handle changing network contract input  // handleNetworkContractChange function has been moved to Learn2EarnContractsPanel component
  
  // Load airdrops when the Airdrops tab is active
  useEffect(() => {
    if (activeTab === "learn2earn") { // Changed from airdrops
      if (activeSubTab === "list") {
        fetchLearn2Earns();
      } else if (activeSubTab === "contracts") {

        // fetchNetworkContracts(); // Removed because function is not defined
      }
    }
  }, [activeTab, activeSubTab]);

  // Add these lines near the other useState hooks at the top of AdminDashboard (after other useState calls)
  const [expandedPendingCompanyId, setExpandedPendingCompanyId] = useState<string | null>(null);
  const [expandedSeekerId, setExpandedSeekerId] = useState<string | null>(null);
  const togglePendingCompanyDetails = (id: string) => {
    setExpandedPendingCompanyId(prevId => prevId === id ? null : id);
  };

  const toggleRejectedCompanyDetails = (id: string) => {
    setExpandedRejectedCompanyId(prevId => prevId === id ? null : id);
  };

  const toggleSeekerDetails = (id: string) => {
    setExpandedSeekerId(prevId => prevId === id ? null : id);
  };

  // Helper function for formatting timestamps
  const formatFirestoreTimestamp = (timestamp: any) => {
    if (! timestamp) return 'N/A';
    
    try {
      // Handle both Firestore timestamp and ISO string formats
      if (timestamp.seconds) {
        return new Date(timestamp.seconds * 1000).toLocaleDateString();
      } else if (timestamp.toDate) {
        return timestamp.toDate().toLocaleDateString();
      } else if (typeof timestamp === 'string') {
        return new Date(timestamp).toLocaleDateString();
      }
      return 'Invalid date';
    } catch (error) {
      console.error("Error formatting timestamp:", error);
      return 'Invalid date';
    }
  };
  
  // Estados para controlar dropdowns da barra lateral
  const [nftsDropdownOpen, setNftsDropdownOpen] = useState(false);
  const [usersDropdownOpen, setUsersDropdownOpen] = useState(false);
  const [learn2earnDropdownOpen, setLearn2earnDropdownOpen] = useState(false);
  const [settingsDropdownOpen, setSettingsDropdownOpen] = useState(false);
  const [marketingDropdownOpen, setMarketingDropdownOpen] = useState(false); // NOVO
  return (
    <Layout>
      {/* Prevent hydration mismatch by not rendering mobile-dependent content until isMobile is determined */}
      {isMobile === null ? (
        <main className="min-h-screen flex bg-gradient-to-br from-orange-900 to-black text-white">
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto mb-4"></div>
              <p className="text-gray-300">Loading...</p>
            </div>
          </div>
        </main>
      ) : (
      <main className="min-h-screen flex bg-gradient-to-br from-orange-900 to-black text-white">
        {/* Mobile menu toggle button - move to bottom left */}
        {isMobile && !mobileMenuOpen && (
          <button
            className="fixed top-20 left-4 z-50 bg-orange-500 text-white p-2 rounded-full shadow-lg focus:outline-none"
            onClick={() => setMobileMenuOpen(true)}
            aria-label="Open menu"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        )}        {/* Sidebar */}
        <aside
          className={
            isMobile
              ? `fixed top-0 left-0 h-full w-64 bg-black/90 z-50 transform transition-transform duration-300 ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} overflow-y-auto pt-16`
              : 'w-1/4 bg-black/70 p-6 pt-16 md:pt-20 flex flex-col items-start min-h-screen'
          }
          id="admin-dashboard-sidebar"
        >
          {/* Mobile close button */}
          {isMobile && (
            <button
              className="absolute top-4 right-4 z-50 bg-orange-500 text-white p-2 rounded-full shadow-lg focus:outline-none"
              onClick={() => setMobileMenuOpen(false)}
              aria-label="Close menu"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}          <div className={`flex flex-col items-center w-full ${isMobile ? 'pt-16 pb-8' : 'mb-6'}`}>
            {/* User Photo with notification bell to the right */}
            <div className="relative w-full flex justify-center">
              <div className="relative w-24 h-24 rounded-full border-4 border-orange-500 mb-4">
                <img
                  src={userPhoto}
                  alt="User Photo"
                  className="w-full h-full object-cover rounded-full"
                />
                <input
                  type="file"
                  className="absolute inset-0 opacity-0 cursor-pointer"
                  accept="image/*"
                  onChange={handleUserPhotoChange}
                />
              </div>
              {/* Notification bell positioned to the right of the photo */}
              {role === "super_admin" && (
                <div className="absolute left-[90%] top-0 z-20">
                  <NotificationBell unreadCount={0} onClick={() => setShowNotifications(true)} />
                </div>
              )}
            </div>
            {/* Admin Dashboard Title */}
            <h2 className="text-orange-400 text-xl font-bold mb-2">Admin Dashboard</h2>
            {/* User Name and Role */}
            <div className="text-center mb-6">
              <p className="text-lg font-semibold text-white">{`Welcome ${userName}!`}</p>
              <p className="text-sm text-orange-400">Role: {role}</p>
              
              {/* Wallet Button */}
              <div className="mt-4">
                <WalletButton 
                  title="Connect to Web3" 
                  className="bg-gradient-to-r from-orange-500 to-orange-600 text-white text-sm py-1.5"
                  showNetworkSelector={true}
                />
              </div>
            </div>
          </div>          {/* Navigation - reduce button size and spacing on mobile */}
          <ul className={`w-full block ${isMobile ? 'space-y-2 px-2' : 'space-y-4'}`}>
            {hasPermission('canAccessDashboard') && (
              <li>
                <button
                  className={`w-full text-left py-2 px-4 rounded-lg ${activeTab === "dashboard" ? "bg-orange-500 text-white" : "bg-black/50 text-gray-300 hover:text-orange-500"}`}
                  onClick={() => {
                    setActiveTab("dashboard");
                    setActiveSubTab(null);
                    if (isMobile) setMobileMenuOpen(false);
                  }}
                >
                  Dashboard
                </button>
              </li>
            )}
            {hasPermission('canAccessNFTs') && (
              <li>
                <button
                  className={`w-full text-left py-2 px-4 rounded-lg flex items-center justify-between ${activeTab === "nfts" ? "bg-orange-500 text-white" : "bg-black/50 text-gray-300 hover:text-orange-500"}`}
                  onClick={() => {
                    if (activeTab === "nfts") setNftsDropdownOpen((open: boolean) => !open);
                    else {
                      setActiveTab("nfts");
                      setActiveSubTab("add");
                      setNftsDropdownOpen(true);
                    }
                    if (isMobile) setMobileMenuOpen(false);
                  }}
                >
                  <span>Manage NFTs</span>
                  <svg className={`w-4 h-4 ml-2 transition-transform ${activeTab === "nfts" ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                </button>
                {activeTab === "nfts" && nftsDropdownOpen && (
                  <ul className="ml-6 mt-2 space-y-1">
                    <li>
                      <button
                        className={`w-full text-left py-1.5 px-3 rounded-md text-sm ${
                          activeSubTab === "add" ? 'bg-orange-500 text-white' : 'text-orange-400 hover:bg-orange-600/20'
                        }`}
                        onClick={() => {
                          setActiveSubTab("add");
                          if (isMobile) setMobileMenuOpen(false);
                        }}
                      >
                        Add NFT
                      </button>
                    </li>
                    <li>
                      <button
                        className={`w-full text-left py-1.5 px-3 rounded-md text-sm ${
                          activeSubTab === "delete" ? 'bg-orange-500 text-white' : 'text-orange-400 hover:bg-orange-600/20'
                                               }`}
                        onClick={() => {
                          setActiveSubTab("delete");
                          if (isMobile) setMobileMenuOpen(false);
                        }}
                      >
                        Delete NFT
                      </button>
                    </li>                  </ul>
                )}
              </li>
            )}            {hasPermission('canAccessUsers') && (
              <li>
                <button
                  className={`w-full text-left py-2 px-4 rounded-lg flex items-center justify-between ${activeTab === "users" ? "bg-orange-500 text-white" : "bg-black/50 text-gray-300 hover:text-orange-500"}`}
                  onClick={() => {
                    if (activeTab === "users") setUsersDropdownOpen((open) => !open);
                    else {
                      setActiveTab("users");
                      setActiveSubTab("employers-list");
                      setUsersDropdownOpen(true);
                    }
                    if (isMobile) setMobileMenuOpen(false);
                  }}
                >
                  <span>Manage Users</span>
                  <svg className={`w-4 h-4 ml-2 transition-transform ${activeTab === "users" ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                </button>
                {activeTab === "users" && usersDropdownOpen && (
                  <ul className="ml-6 mt-2 space-y-1">
                    <li>
                      <button
                        className={`w-full text-left py-1.5 px-3 rounded-md text-sm ${
                          activeSubTab === "employers-list" ? 'bg-orange-500 text-white' : 'text-orange-400 hover:bg-orange-600/20'
                        }`}
                        onClick={() => {
                          setActiveSubTab("employers-list");
                          if (isMobile) setMobileMenuOpen(false);
                        }}
                      >
                        Approved Companies                     </button>
                    </li>
                    <li>
                      <button
                        className={`w-full text-left py-1.5 px-3 rounded-md text-sm ${
                          activeSubTab === "employers-rejected" ? 'bg-orange-500 text-white' : 'text-orange-400 hover:bg-orange-600/20'
                        }`}
                        onClick={() => {
                          setActiveSubTab("employers-rejected");
                          if (isMobile) setMobileMenuOpen(false);
                        }}
                      >
                        Rejected Companies
                      </button>
                    </li>
                    {hasPermission('canApproveCompanies') && (
                      <li>
                        <button
                          className={`w-full text-left py-1.5 px-3 rounded-md text-sm ${
                            activeSubTab === "employers-approve" ? 'bg-orange-500 text-white' : 'text-orange-400 hover:bg-orange-600/20'
                          }`}
                          onClick={() => {
                            setActiveSubTab("employers-approve");
                            if (isMobile) setMobileMenuOpen(false);
                          }}
                        >
                          Pending Companies
                        </button>
                      </li>
                    )}
                    {hasPermission('canEditContent') && (
                      <li>
                        <button
                          className={`w-full text-left py-1.5 px-3 rounded-md text-sm ${
                            activeSubTab === "seekers" ? 'bg-orange-500 text-white' : 'text-orange-400 hover:bg-orange-600/20'
                          }`}
                          onClick={() => {
                            setActiveSubTab("seekers");
                            if (isMobile) setMobileMenuOpen(false);
                          }}
                        >
                          Seekers
                        </button>
                      </li>
                    )}
                  </ul>
                )}
              </li>
            )}
            {hasPermission('canAccessJobs') && (
              <li>
                <button
                  className={`w-full text-left py-2 px-4 rounded-lg flex items-center justify-between ${activeTab === "jobs" ? "bg-orange-500 text-white" : "bg-black/50 text-gray-300 hover:text-orange-500"}`}
                  onClick={() => {
                    if (activeTab === "jobs") setNftsDropdownOpen((open: boolean) => !open);
                    else {
                      setActiveTab("jobs");
                      setActiveSubTab("list");
                      setNftsDropdownOpen(true);
                    }
                    if (isMobile) setMobileMenuOpen(false);
                  }}
                >
                  <span>Manage Jobs</span>
                  <svg className={`w-4 h-4 ml-2 transition-transform ${activeTab === "jobs" ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                </button>
              {activeTab === "jobs" && nftsDropdownOpen && (
                <ul className="ml-6 mt-2 space-y-1">
                  <li>
                    <button
                      className={`w-full text-left py-1.5 px-3 rounded-md text-sm ${
                        activeSubTab === "list" ? 'bg-orange-500 text-white' : 'text-orange-400 hover:bg-orange-600/20'
                      }`}
                      onClick={() => {
                        setActiveSubTab("list");
                        if (isMobile) setMobileMenuOpen(false);
                      }}
                    >
                      Jobs List
                    </button>
                  </li>
                  <li>
                    <button
                      className={`w-full text-left py-1.5 px-3 rounded-md text-sm ${
                        activeSubTab === "create" ? 'bg-orange-500 text-white' : 'text-orange-400 hover:bg-orange-600/20'
                      }`}
                      onClick={() => {
                        setActiveSubTab("create");
                        if (isMobile) setMobileMenuOpen(false);
                      }}
                                       >
                      Create Job
                    </button>
                  </li>
                  <li>
                    <button
                      className={`w-full text-left py-1.5 px-3 rounded-md text-sm ${
                        activeSubTab === "prices" ? 'bg-orange-500 text-white' : 'text-orange-400 hover:bg-orange-600/20'
                      }`}
                      onClick={() => {
                        setActiveSubTab("prices");
                        if (isMobile) setMobileMenuOpen(false);
                      }}
                    >
                      Job Pricing
                    </button>
                  </li>                  <li>
                    <button
                      className={`w-full text-left py-1.5 px-3 rounded-md text-sm ${
                        activeSubTab === "config" ? 'bg-orange-500 text-white' : 'text-orange-400 hover:bg-orange-600/20'
                      }`}
                      onClick={() => {
                        setActiveTab("payments");
                        setActiveSubTab("config");
                        if (isMobile) setMobileMenuOpen(false);
                      }}
                    >
                      JobPost P. Manag.
                    </button>
                  </li>                </ul>
              )}
            </li>
            )}
            {hasPermission('canAccessInstantJobs') && (
              <li>
                <button
                  className={`w-full text-left py-2 px-4 rounded-lg ${activeTab === "instantJobs" ? "bg-orange-500 text-white" : "bg-black/50 text-gray-300 hover:text-orange-500"}`}
                  onClick={() => {
                    setActiveTab("instantJobs");
                    setActiveSubTab(null);
                    if (isMobile) setMobileMenuOpen(false);
                  }}
                >
                  Manage Instant Jobs
                </button>
              </li>
            )}            {/* Learn2Earn tab */}
            {hasPermission('canAccessLearn2Earn') && (
              <li>
                <button
                  className={`w-full text-left py-2 px-4 rounded-lg flex items-center justify-between ${activeTab === "learn2earn" ? "bg-orange-500 text-white" : "bg-black/50 text-gray-300 hover:text-orange-500"}`}
                  onClick={() => {
                    if (activeTab === "learn2earn") setLearn2earnDropdownOpen((open) => !open);
                    else {
                      setActiveTab("learn2earn");
                      setActiveSubTab("list");
                      setLearn2earnDropdownOpen(true);
                    }
                    if (isMobile) setMobileMenuOpen(false);
                  }}
                >
                  <span>Learn2Earn</span>
                  <svg className={`w-4 h-4 ml-2 transition-transform ${activeTab === "learn2earn" ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                </button>
                {activeTab === "learn2earn" && learn2earnDropdownOpen && (
                  <ul className="ml-6 mt-2 space-y-1">
                    <li>
                      <button
                        className={`w-full text-left py-1.5 px-3 rounded-md text-sm ${
                          activeSubTab === "list" ? 'bg-orange-500 text-white' : 'text-orange-400 hover:bg-orange-600/20'
                        }`}
                        onClick={() => {
                          setActiveSubTab("list");
                          if (isMobile) setMobileMenuOpen(false);
                        }}
                      >
                        Learn2Earn List
                      </button>
                    </li>
                    <li>
                      <button
                        className={`w-full text-left py-1.5 px-3 rounded-md text-sm ${
                          activeSubTab === "contracts" ? 'bg-orange-500 text-white' : 'text-orange-400 hover:bg-orange-600/20'
                        }`}
                        onClick={() => {
                          setActiveSubTab("contracts");
                          if (isMobile) setMobileMenuOpen(false);
                        }}
                      >
                        Smart Contracts
                      </button>
                    </li>
                  </ul>
                )}              </li>            )}

            {hasPermission('canAccessAdsManager') && (
              <li>
                <button
                  className={`w-full text-left py-2 px-4 rounded-lg ${activeTab === "ads" ? "bg-orange-500 text-white" : "bg-black/50 text-gray-300 hover:text-orange-500"}`}
                  onClick={() => {
                    setActiveTab("ads");
                    setActiveSubTab(null);
                    if (isMobile) setMobileMenuOpen(false);
                  }}
                >
                  Ads Manager
                </button>
              </li>            )}{/* --- MARKETING MENU --- */}
            {hasPermission('canAccessMarketing') && (
              <li>
                <button
                  className={`w-full text-left py-2 px-4 rounded-lg flex items-center justify-between ${activeTab === "marketing" ? "bg-orange-500 text-white" : "bg-black/50 text-gray-300 hover:text-orange-500"}`}
                  onClick={() => {
                    if (activeTab === "marketing") setMarketingDropdownOpen((open) => !open);
                    else {
                      setActiveTab("marketing");
                      setActiveSubTab("newsletter");
                      setMarketingDropdownOpen(true);
                    }
                    if (isMobile) setMobileMenuOpen(false);
                  }}
                >
                  <span>Marketing</span>
                  <svg className={`w-4 h-4 ml-2 transition-transform ${activeTab === "marketing" ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                </button>
                {activeTab === "marketing" && marketingDropdownOpen && (
                  <ul className="ml-6 mt-2 space-y-1">
                    <li>
                      <button
                        className={`w-full text-left py-1.5 px-3 rounded-md text-sm ${activeSubTab === "newsletter" ? 'bg-orange-500 text-white' : 'text-orange-400 hover:bg-orange-600/20'}`}
                        onClick={() => {
                          setActiveSubTab("newsletter");
                          if (isMobile) setMobileMenuOpen(false);
                        }}
                      >
                        Newsletter
                      </button>
                    </li>                    <li>
                      <button
                        className={`w-full text-left py-1.5 px-3 rounded-md text-sm ${activeSubTab === "socialmedia" ? 'bg-orange-500 text-white' : 'text-orange-400 hover:bg-orange-600/20'}`}
                        onClick={() => {
                          setActiveSubTab("socialmedia");
                          if (isMobile) setMobileMenuOpen(false);
                        }}
                      >
                        Social Media
                      </button>
                    </li>
                    <li>
                      <button
                        className={`w-full text-left py-1.5 px-3 rounded-md text-sm ${activeSubTab === "partners" ? 'bg-orange-500 text-white' : 'text-orange-400 hover:bg-orange-600/20'}`}
                        onClick={() => {
                          setActiveSubTab("partners");
                          if (isMobile) setMobileMenuOpen(false);
                        }}
                      >
                        Partners
                      </button>
                    </li>                </ul>
                )}
              </li>            )}            {/* --- END MARKETING MENU --- */}
            {hasPermission('canAccessTokenDistribution') && (
              <li>
                <button
                  className={`w-full text-left py-2 px-4 rounded-lg ${activeTab === "tokenDistribution" ? "bg-orange-500 text-white" : "bg-black/50 text-gray-300 hover:text-orange-500"}`}
                  onClick={() => {
                    setActiveTab("tokenDistribution");
                    setActiveSubTab(null);
                    if (isMobile) setMobileMenuOpen(false);
                  }}
                >
                  Token Distribution
                </button>
              </li>
            )}
            {hasPermission('canAccessAccounting') && (
              <li>
                <button
                  className={`w-full text-left py-2 px-4 rounded-lg ${activeTab === "accounting" ? "bg-orange-500 text-white" : "bg-black/50 text-gray-300 hover:text-orange-500"}`}
                  onClick={() => {
                    setActiveTab("accounting");
                    setActiveSubTab(null);
                    if (isMobile) setMobileMenuOpen(false);
                  }}
                >
                  Accounting Dashboard
                </button>
              </li>            )}
            {hasPermission('canAccessSystemActivity') && (
              <li>
                <button
                  className={`w-full text-left py-2 px-4 rounded-lg ${activeTab === "systemActivity" ? "bg-orange-500 text-white" : "bg-black/50 text-gray-300 hover:text-orange-500"}`}
                  onClick={() => {
                    setActiveTab("systemActivity");
                    setActiveSubTab(null);
                    if (isMobile) setMobileMenuOpen(false);
                  }}
                >
                  System Activity
                </button>
              </li>
            )}
            {hasPermission('canAccessSettings') && (
              <li>
                <button
                  className={`w-full text-left py-2 px-4 rounded-lg flex items-center justify-between ${activeTab === "settings" ? "bg-orange-500 text-white" : "bg-black/50 text-gray-300 hover:text-orange-500"}`}
                  onClick={() => {
                    if (activeTab === "settings") setSettingsDropdownOpen((open) => !open);
                    else {
                      setActiveTab("settings");
                      setActiveSubTab("profile");
                      setSettingsDropdownOpen(true);
                    }
                    if (isMobile) setMobileMenuOpen(false);
                  }}
                >
                  <span>Settings</span>
                  <svg className={`w-4 h-4 ml-2 transition-transform ${activeTab === "settings" ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                </button>
                {activeTab === "settings" && settingsDropdownOpen && (
                  <ul className="ml-6 mt-2 space-y-1">
                    <li>
                      <button
                        className={`w-full text-left py-1.5 px-3 rounded-md text-sm ${activeSubTab === "profile" ? 'bg-orange-500 text-white' : 'text-orange-400 hover:bg-orange-600/20'}`}
                        onClick={() => {
                          setActiveSubTab("profile");
                          if (isMobile) setMobileMenuOpen(false);
                        }}
                      >
                        My Profile
                      </button>
                    </li>
                    {hasPermission('canManageUsers') && (
                      <li>
                        <button
                          className={`w-full text-left py-1.5 px-3 rounded-md text-sm ${activeSubTab === "permissions" ? 'bg-orange-500 text-white' : 'text-orange-400 hover:bg-orange-600/20'}`}
                          onClick={() => {
                            setActiveSubTab("permissions");
                            if (isMobile) setMobileMenuOpen(false);
                          }}
                        >
                          Manage Admins & Permissions
                        </button>
                      </li>
                    )}
                  </ul>
                )}
              </li>
            )}
          </ul>

          {/* Logout button */}
          <div className="mt-6 w-full">
            <button 
              onClick={() => {
                handleLogout();
                if (isMobile) setMobileMenuOpen(false);
              }}
              className="w-full bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded-lg flex items-center justify-center"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 001 1h12a1 1 0 001-1V4a1 1 0 00-1-1H3zm11 4a1 1 0 10-2 0v4.586l-1.293-1.293a1 1 0 00-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L14 11.586V7z" clipRule="evenodd" />
              </svg>
              Logout
            </button>
          </div>
        </aside>
        {/* Overlay for mobile menu */}
        {isMobile && mobileMenuOpen && (
          <div
            className="fixed inset-0 bg-black/60 z-40"
            onClick={() => setMobileMenuOpen(false)}
          />
        )}        {/* Main content area - compact and center titles on mobile */}
        <div className={isMobile ? 'flex-1 p-2 pt-16 w-full' : 'flex-1 p-6 pt-16 md:pt-20'}>
          <div className={isMobile ? 'max-w-md mx-auto' : ''}>
            {permissionsLoading && (
              <div className="w-full flex justify-center items-center py-10">
                <p className="text-center">Loading permissions...</p>
              </div>
            )}
            
            {/* Show content only if permissions are not loading */}
            {!permissionsLoading && (
              <>
                {/* Add Loading and Error states display */}
                {isLoading && <p className="text-center">Loading...</p>}
                {error && <p className="text-center text-red-500">Error: {error}</p>}

                {/* Render StatsDashboard on main dashboard tab */}
                {activeTab === "dashboard" && (
                  <div>
                    <h2 className={`font-bold ${isMobile ? 'text-2xl text-center mb-4' : 'text-3xl mb-6 text-left'} text-orange-500`}>Admin Statistics Dashboard</h2>
                    <div className="mt-6">
                      <StatsDashboard />
                    </div>
                  </div>
                )}

                {activeTab === "users" && (
                  <div>
                    <h2 className={`font-bold ${isMobile ? 'text-2xl text-center mb-4' : 'text-3xl mb-6 text-left'} text-orange-500`}>Manage Users</h2>
                    <div className="mt-6 bg-black/30 p-4 md:p-6 rounded-xl border border-gray-700 hover:border-orange-500 transition-colors">
                      {/* Employer list is visible for all levels */}
                      {activeSubTab === "employers-list" && (
                        <div>                          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 gap-3">
                            <div>
                              <h3 className="text-lg md:text-xl font-bold text-orange-400 mb-2 md:mb-0">Companies List</h3>
                            </div>
                            <div className="w-full md:w-auto">
                              <label htmlFor="companySearch" className="sr-only">Search companies</label>
                              <input
                                id="companySearch"
                                type="text"
                                placeholder="Search companies..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full px-3 py-2 bg-black/40 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-orange-400 focus:outline-none"
                              />                            </div>
                          </div>
                          {filteredEmployers.length === 0 ? (
                            <div className="bg-black/40 p-8 rounded-lg text-center">
                              <p className="text-gray-400">No companies found.</p>
                            </div>
                          ) : (                            <ul className="space-y-4">                              {filteredEmployers.map((employer) => (                                <li 
                                  key={employer.id} 
                                  className={`bg-black/40 border ${expandedEmployerId === employer.id ? 'border-orange-500' : 'border-gray-700'} hover:border-orange-500 rounded-xl overflow-hidden transition-colors`}
                                  onClick={() => toggleEmployerDetails(employer.id)}
                                >                                  {/* Responsive card - Optimized for mobile view */}
                                  <div className="p-4">
                                    {/* Mobile View - Only company name and buttons */}
                                    <div className="block md:hidden">
                                      <div className="mb-2">
                                        <p className="text-xs text-gray-400 mb-1">Company Name</p>
                                        <p className="text-white font-medium text-base">{employer.name || employer.companyName}</p>
                                      </div>
                                      <div className="flex space-x-2 mt-3">
                                        <button 
                                          onClick={(e) => {
                                            e.stopPropagation(); 
                                            handleDeleteEmployer(employer.id);
                                          }} 
                                          className="flex-1 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white py-2 rounded-md text-xs font-semibold transition-colors"
                                          aria-label="Delete company"
                                        >
                                          Delete
                                        </button>
                                        <button 
                                          onClick={(e) => {
                                            e.stopPropagation(); 
                                            handleToggleBlockEmployer(employer.id, employer.blocked || false);
                                          }} 
                                          className={`flex-1 ${employer.blocked ? 'bg-green-600 hover:bg-green-700 active:bg-green-800' : 'bg-gray-800 hover:bg-gray-700 active:bg-gray-900'} text-white py-2 rounded-md text-xs font-semibold`} 
                                          disabled={blockingEmployerId === employer.id}
                                          aria-label={employer.blocked ? "Unblock company" : "Block company"}
                                        >
                                          {blockingEmployerId === employer.id ? 'Processing...' : employer.blocked ? 'Unblock' : 'Block'}
                                        </button>
                                      </div>
                                    </div>
                                    
                                    {/* Desktop View - Full information */}
                                    <div className="hidden md:grid grid-cols-6 gap-6">
                                      {/* Column 1: Company Name */}
                                      <div className="col-span-1">
                                        <p className="text-xs text-gray-400 mb-1">Company Name</p>
                                        <p className="text-white font-medium text-base">{employer.name || employer.companyName}</p>
                                      </div>

                                      {/* Column 2: Responsible Person */}
                                      <div className="col-span-1">
                                        <p className="text-xs text-gray-400 mb-1">Responsible Person</p>
                                        <p className="text-white font-medium text-base">{employer.responsiblePerson || employer.responsibleName || "N/A"}</p>
                                      </div>

                                      {/* Column 3: Industry */}
                                      <div className="col-span-1">
                                        <p className="text-xs text-gray-400 mb-1">Industry</p>
                                        <p className="text-white font-medium text-base">{employer.industry || "N/A"}</p>
                                      </div>

                                      {/* Column 4: Company Size */}
                                      <div className="col-span-1">
                                        <p className="text-xs text-gray-400 mb-1">Company Size</p>
                                        <p className="text-white font-medium text-base">{employer.companySize || employer.employees || "N/A"}</p>
                                      </div>

                                      {/* Column 5: Email */}
                                      <div className="col-span-1">
                                        <p className="text-xs text-gray-400 mb-1">Email</p>
                                        <p className="text-white font-medium text-base">{employer.email || "N/A"}</p>
                                      </div>

                                      {/* Column 6: Action Buttons */}
                                      <div className="col-span-1 flex justify-end items-center">
                                        <div className="flex space-x-2">
                                          <button 
                                            onClick={(e) => {
                                              e.stopPropagation(); 
                                              handleDeleteEmployer(employer.id);
                                            }} 
                                            className="bg-red-600 hover:bg-red-700 text-white px-2 md:px-3 py-1.5 rounded-md text-xs font-semibold"
                                            aria-label="Delete company"
                                          >
                                            Delete
                                          </button>
                                          <button 
                                            onClick={(e) => {
                                              e.stopPropagation(); 
                                              handleToggleBlockEmployer(employer.id, employer.blocked || false);
                                            }} 
                                            className={`${employer.blocked ? 'bg-green-600 hover:bg-green-700 active:bg-green-800' : 'bg-gray-800 hover:bg-gray-700 active:bg-gray-900'} text-white px-2 md:px-3 py-1.5 rounded-md text-xs font-semibold`} 
                                            disabled={blockingEmployerId === employer.id}
                                            aria-label={employer.blocked ? "Unblock company" : "Block company"}
                                          >
                                            {blockingEmployerId === employer.id ? 'Processing...' : employer.blocked ? 'Unblock' : 'Block'}
                                          </button>
                                        </div>
                                      </div>
                                    </div>
                                  </div>{/* Expanded Details Section - Improved for mobile */}
                                  {expandedEmployerId === employer.id && (
                                    <div className="bg-black/40 p-4 md:p-6 rounded-b-lg text-sm text-gray-100 border-t border-gray-700">
                                      <h4 className="text-base md:text-lg font-bold text-orange-400 mb-3 flex items-center">
                                        <span>Complete Company Information</span>
                                        <span className="ml-2 text-xs text-gray-400">(Tap anywhere to collapse)</span>
                                      </h4>
                                      <div className="grid grid-cols-1 md:grid-cols-3 gap-y-6 md:gap-6">
                                        {/* Company Basic Information */}
                                        <div className="bg-black/20 p-3 rounded-lg">
                                          <h5 className="font-bold text-white mb-3 text-sm md:text-base border-b border-gray-700 pb-2">Company Details</h5>
                                          <p className="mb-2"><span className="font-semibold text-orange-300 text-xs md:text-sm block md:inline">Company Name:</span> <span className="ml-0 md:ml-1 text-sm">{employer.companyName || employer.name || 'N/A'}</span></p>
                                          <p className="mb-2"><span className="font-semibold text-orange-300 text-xs md:text-sm block md:inline">Industry:</span> <span className="ml-0 md:ml-1 text-sm">{employer.industry || 'N/A'}</span></p>
                                          <p className="mb-2"><span className="font-semibold text-orange-300 text-xs md:text-sm block md:inline">Company Size:</span> <span className="ml-0 md:ml-1 text-sm">{employer.employees || employer.companySize || 'N/A'}</span></p>
                                          <p className="mb-2"><span className="font-semibold text-orange-300 text-xs md:text-sm block md:inline">Years Active:</span> <span className="ml-0 md:ml-1 text-sm">{employer.yearsActive || 'N/A'}</span></p>
                                          <p className="mb-2"><span className="font-semibold text-orange-300 text-xs md:text-sm block md:inline">Tax ID:</span> <span className="ml-0 md:ml-1 text-sm">{employer.taxId || 'N/A'}</span></p>
                                          <p className="mb-2"><span className="font-semibold text-orange-300 text-xs md:text-sm block md:inline">Registration Number:</span> <span className="ml-0 md:ml-1 text-sm">{employer.registrationNumber || 'N/A'}</span></p>
                                          {employer.description && (
                                            <div className="mt-3">
                                              <p className="mb-1"><span className="font-semibold text-orange-300 text-xs md:text-sm block md:inline">Description:</span></p>
                                              <div className="relative">
                                                <div className="break-words whitespace-pre-wrap text-xs mt-1 bg-black/30 p-3 rounded max-h-32 overflow-y-auto">
                                                  {employer.description ? 
                                                    employer.description.split('\n').map((line: string, i: number, arr: string[]) => (
                                                      <React.Fragment key={i}>
                                                        {line}
                                                        {i < arr.length - 1 && <br />}
                                                      </React.Fragment>
                                                    )) 
                                                    : 'N/A'}
                                                </div>
                                                {employer.description && employer.description.length > 100 && (
                                                  <div className="absolute bottom-0 right-0 bg-gradient-to-l from-black/60 to-transparent px-2 text-xs text-orange-300">
                                                    Scroll para ver mais
                                                  </div>
                                                )}
                                              </div>
                                            </div>
                                          )}
                                        </div>
                                        
                                        {/* Contact Information */}
                                        <div>
                                          <h5 className="font-bold text-white mb-2">Contact Information</h5>
                                          <p className="mb-1"><span className="font-semibold text-orange-300">Email:</span> {employer.email || 'N/A'}</p>
                                          <p className="mb-1"><span className="font-semibold text-orange-300">Username:</span> {employer.username || 'N/A'}</p>
                                          <p className="mb-1"><span className="font-semibold text-orange-300">Country:</span> {employer.country || 'N/A'}</p>
                                          <p className="mb-1"><span className="font-semibold text-orange-300">Address:</span> <span className="break-words">{employer.address || 'N/A'}</span></p>
                                          <p className="mb-1">                                            <span className="font-semibold text-orange-300">Website:</span>{' '}
                                            {employer.website ? (
                                              <a 
                                                href={employer.website.startsWith('http') ? employer.website : `https://${employer.website}`} 
                                                target="_blank" 
                                                rel="noopener noreferrer"
                                                className="text-orange-400 hover:underline"
                                                onClick={e => e.stopPropagation()}
                                              >
                                                {employer.website}
                                              </a>
                                            ) : 'N/A'}
                                          </p>
                                        </div>
                                        
                                        {/* Responsible Person & Social Media */}                                        <div>
                                          <h5 className="font-bold text-white mb-2">Responsible Person</h5>
                                          <p className="mb-1"><span className="font-semibold text-orange-300">Name:</span> {employer.responsibleName || employer.responsiblePerson || 'N/A'}</p>
                                          <p className="mb-1">                                            <span className="font-semibold text-orange-300">Email:</span>{' '}
                                            {employer.responsibleEmail ? (
                                              <a 
                                                href={`mailto:${employer.responsibleEmail}`} 
                                                className="text-orange-400 hover:underline"
                                                onClick={e => e.stopPropagation()}
                                              >
                                                {employer.responsibleEmail}
                                              </a>
                                            ) : 'N/A'}
                                          </p>
                                          <p className="mb-1">                                            <span className="font-semibold text-orange-300">Phone:</span>{' '}
                                            {employer.responsiblePhone ? (
                                              <a 
                                                href={`tel:${employer.responsiblePhone}`} 
                                                className="text-orange-400 hover:underline"
                                                onClick={e => e.stopPropagation()}
                                              >
                                                {employer.responsiblePhone}
                                              </a>
                                            ) : 'N/A'}
                                          </p>
                                          <p className="mb-1"><span className="font-semibold text-orange-300">Position:</span> {employer.responsiblePosition || 'N/A'}</p>
                                          
                                          <h5 className="font-bold text-white mt-4 mb-2">Social Media</h5>                                          {[
                                            { name: 'LinkedIn', url: employer.linkedin, prefix: 'https://linkedin.com/' },
                                            { name: 'Twitter', url: employer.twitter, prefix: 'https://twitter.com/' },
                                            { name: 'Facebook', url: employer.facebook, prefix: 'https://facebook.com/' },
                                            { name: 'Instagram', url: employer.instagram, prefix: 'https://instagram.com/' },
                                            { name: 'Telegram', url: employer.telegram, prefix: 'https://t.me/' }
                                          ].map(social => {
                                            // Normalize the social media URL
                                            const getSocialUrl = (url: string | undefined): string => {
                                              if (!url) return '';
                                              if (url.startsWith('http')) return url;
                                              if (url.includes('.com/') || url.includes('.org/') || url.includes('.net/')) {
                                                return `https://${url}`;
                                              }
                                              return `${social.prefix}${url.replace('@', '')}`;
                                            };
                                          
                                            return (
                                              <p className="mb-1" key={social.name}>
                                                <span className="font-semibold text-orange-300">{social.name}:</span>{' '}
                                                {social.url ? (
                                                  <a 
                                                    href={getSocialUrl(social.url)}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-blue-400 hover:underline"
                                                    onClick={e => e.stopPropagation()}
                                                  >
                                                    {social.url}
                                                  </a>
                                                ) : 'N/A'}
                                              </p>
                                            );
                                          })}
                                        </div>
                                      </div>
                                        {/* System Information */}
                                      <div className="mt-4 pt-3 border-t border-gray-700">
                                        <h5 className="font-bold text-white mb-2">System Information</h5>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">                                          <div>
                                            <p className="mb-1"><span className="font-semibold text-orange-300">Status:</span> {employer.blocked ? 'Blocked' : 'Active'}</p>
                                            <p className="mb-1"><span className="font-semibold text-orange-300">Created:</span> {formatFirestoreTimestamp(employer.createdAt)}</p>
                                          </div>
                                          <div>
                                            <p className="mb-1"><span className="font-semibold text-orange-300">Updated:</span> {formatFirestoreTimestamp(employer.updatedAt)}</p>
                                            <p className="mb-1"><span className="font-semibold text-orange-300">ID:</span> {employer.id || 'N/A'}</p>
                                          </div>
                                          <div>
                                            {employer.comments && (
                                              <p className="mb-1"><span className="font-semibold text-orange-300">Comments:</span> {employer.comments}</p>
                                            )}                                            {/* JSON details removed as requested */}
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      )}                      {/* Rejected companies list */}
                      {activeSubTab === "employers-rejected" && (
                        <div>                          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 gap-3">
                            <div>
                              <h3 className="text-lg md:text-xl font-bold text-orange-400 mb-2 md:mb-0">Rejected Companies</h3>
                            </div>
                            <div className="w-full md:w-auto">
                              <label htmlFor="rejectedCompanySearch" className="sr-only">Search rejected companies</label>
                              <input
                                id="rejectedCompanySearch"
                                type="text"
                                placeholder="Search rejected companies..."
                                value={searchRejectedCompaniesQuery}
                                onChange={(e) => setSearchRejectedCompaniesQuery(e.target.value)}
                                className="w-full px-3 py-2 bg-black/40 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-orange-400 focus:outline-none"
                              />
                            </div>
                          </div>
                            {rejectedCompaniesLoading ? (
                            <div className="bg-black/40 p-8 rounded-lg text-center">
                              <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-orange-500 mx-auto"></div>
                              <p className="text-gray-400 mt-2">Loading rejected companies...</p>
                            </div>
                          ) : filteredRejectedCompanies.length === 0 ? (
                            <div className="bg-black/40 p-8 rounded-lg text-center">
                              <p className="text-gray-400">
                                {searchRejectedCompaniesQuery ? "No matching rejected companies found." : "No rejected companies found."}
                              </p>
                            </div>
                          ) : (
                            <ul className="space-y-4">
                              {filteredRejectedCompanies.map((company) => (
                                <li
                                  key={company.id}
                                  className={`bg-black/40 border ${expandedRejectedCompanyId === company.id ? 'border-orange-500' : 'border-gray-700'} hover:border-orange-500 rounded-xl overflow-hidden transition-colors`}
                                  onClick={() => toggleRejectedCompanyDetails(company.id)}
                                  tabIndex={0}
                                >                                  <div className="p-4">
                                    {/* Mobile View - Only company name and Show Details button */}
                                    <div className="block md:hidden">
                                      <div className="mb-2">
                                        <p className="text-xs text-gray-400 mb-1">Company Name</p>
                                        <p className="text-white font-medium text-base">{company.companyName || company.name || 'N/A'}</p>
                                      </div>                                      <div className="flex justify-end mt-3">
                                        <button 
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            toggleRejectedCompanyDetails(company.id);
                                          }}
                                          className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-md text-xs w-full"
                                        >
                                          {expandedRejectedCompanyId === company.id ? 'Hide Details' : 'Show Details'}
                                        </button>
                                      </div>
                                    </div>
                                    
                                    {/* Desktop View - Full information */}
                                    <div className="hidden md:grid grid-cols-6 gap-4">
                                      <div className="col-span-1">
                                        <p className="text-sm text-gray-400">Company Name</p>
                                        <p className="text-white">{company.companyName || company.name || 'N/A'}</p>
                                      </div>
                                      <div className="col-span-1">
                                        <p className="text-sm text-gray-400">Responsible Person</p>
                                        <p className="text-white">{company.responsibleName || 'N/A'}</p>
                                      </div>
                                      <div className="col-span-1">
                                        <p className="text-sm text-gray-400">Industry</p>
                                        <p className="text-white">{company.industry || 'N/A'}</p>
                                      </div>
                                      <div className="col-span-1">
                                        <p className="text-sm text-gray-400">Email</p>
                                        <p className="text-white">{company.email || 'N/A'}</p>
                                      </div>
                                      <div className="col-span-1">
                                        <p className="text-sm text-gray-400">Rejected At</p>
                                        <p className="text-white">{company.rejectedAt ? new Date(company.rejectedAt).toLocaleDateString() : 'N/A'}</p>
                                      </div>
                                      <div className="col-span-1">
                                        <div className="flex justify-end">
                                          <button className="bg-gray-700 hover:bg-gray-600 text-white px-3 py-1.5 rounded-md text-xs">
                                            {expandedRejectedCompanyId === company.id ? 'Hide Details' : 'Show Details'}
                                          </button>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                  
                                  {expandedRejectedCompanyId === company.id && (
                                    <div className="border-t border-gray-700 mt-0 p-4 md:p-6 bg-black/40 text-sm text-gray-100">
                                      <div className="mb-4">
                                        <h4 className="text-base font-bold text-orange-400 mb-2">Rejection Reason</h4>
                                        <div className="bg-black/30 p-3 rounded border border-gray-700 text-white">
                                          {company.rejectionReason || 'No reason provided'}
                                        </div>
                                      </div>
                                      


                                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                        {/* Company Basic Information */}
                                        <div>
                                          <h5 className="font-bold text-white mb-3">Company Details</h5>
                                          <p className="mb-1"><span className="font-semibold text-orange-300">Company Name:</span> {company.companyName || company.name || 'N/A'}</p>
                                          <p className="mb-1"><span className="font-semibold text-orange-300">Industry:</span> {company.industry || 'N/A'}</p>
                                          <p className="mb-1"><span className="font-semibold text-orange-300">Company Size:</span> {company.employees || company.companySize || 'N/A'}</p>
                                          <p className="mb-1"><span className="font-semibold text-orange-300">Tax ID:</span> {company.taxId || 'N/A'}</p>
                                          <p className="mb-1"><span className="font-semibold text-orange-300">Registration Number:</span> {company.registrationNumber || 'N/A'}</p>
                                          <p className="mb-1"><span className="font-semibold text-orange-300">Website:</span> {company.website || 'N/A'}</p>
                                        </div>
                                        
                                        {/* Contact Information */}
                                        <div>
                                          <h5 className="font-bold text-white mb-2">Contact Information</h5>
                                          <p className="mb-1"><span className="font-semibold text-orange-300">Responsible Person:</span> {company.responsibleName || 'N/A'}</p>
                                          <p className="mb-1"><span className="font-semibold text-orange-300">Email:</span> {company.email || 'N/A'}</p>
                                          <p className="mb-1"><span className="font-semibold text-orange-300">Responsible Email:</span> {company.responsibleEmail || 'N/A'}</p>
                                          <p className="mb-1"><span className="font-semibold text-orange-300">Phone:</span> {company.contactPhone || 'N/A'}</p>
                                          <p className="mb-1"><span className="font-semibold text-orange-300">Responsible Phone:</span> {company.responsiblePhone || 'N/A'}</p>
                                          <p className="mb-1"><span className="font-semibold text-orange-300">Country:</span> {company.country || 'N/A'}</p>
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      )}
                      
                      {/* Pending company approvals */}
                      {activeSubTab === "employers-approve" && hasPermission('canApproveCompanies') && (
                        <div>                          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 gap-3">
                            <div>
                              <h3 className="text-lg md:text-xl font-bold text-orange-400 mb-2 md:mb-0">Pending Companies for Approval</h3>
                            </div>
                          </div>
                          
                          {pendingCompanies.length === 0 ? (
                            <div className="bg-black/40 p-8 rounded-lg text-center">
                              <p className="text-gray-400">No pending companies found.</p>
                            </div>
                          ) : (
                            <ul className="space-y-4">
                              {pendingCompanies.map((company) => (                                <li
                                  key={company.id}
                                  className={`bg-black/40 border ${expandedPendingCompanyId === company.id ? 'border-orange-500' : 'border-gray-700'} hover:border-orange-500 rounded-xl overflow-hidden transition-colors`}
                                  onClick={() => togglePendingCompanyDetails(company.id)}
                                  tabIndex={0}
                                >                                  <div className="p-4">
                                    {/* Mobile View - Only company name and approval buttons */}
                                    <div className="block md:hidden">
                                      <div className="mb-2">
                                        <p className="text-xs text-gray-400 mb-1">Company Name</p>
                                        <p className="text-white font-medium text-base">{company.companyName}</p>
                                      </div>
                                      <div className="flex space-x-2 mt-3">
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleApproveCompany(company.id);
                                          }}
                                          disabled={approving === company.id || !!rejecting}
                                          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-xs font-semibold flex-1"
                                        >
                                          {approving === company.id ? 'Approving...' : 'Approve'}
                                        </button>
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleRejectClick(company.id);
                                          }}
                                          disabled={!!approving || rejecting === company.id}
                                          className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-xs font-semibold flex-1"
                                        >
                                          {rejecting === company.id ? 'Rejecting...' : 'Reject'}
                                        </button>
                                      </div>
                                    </div>
                                    
                                    {/* Desktop View - Full information */}
                                    <div className="hidden md:grid grid-cols-6 gap-4">
                                      <div className="col-span-1">
                                        <p className="text-sm text-gray-400">Company Name</p>
                                        <p className="text-white">{company.companyName}</p>
                                      </div>
                                      <div className="col-span-1">
                                        <p className="text-sm text-gray-400">Responsible Person</p>
                                        <p className="text-white">{company.responsibleName || 'N/A'}</p>
                                      </div>
                                      <div className="col-span-1">
                                        <p className="text-sm text-gray-400">Industry</p>
                                        <p className="text-white">{company.industry}</p>
                                      </div>
                                      <div className="col-span-1">
                                        <p className="text-sm text-gray-400">Company Size</p>
                                        <p className="text-white">{company.employees}</p>
                                      </div>
                                      <div className="col-span-1">
                                        <p className="text-sm text-gray-400">Email</p>
                                        <a 
                                          href={`mailto:${company.email}`} 
                                          className="text-orange-400 hover:underline"
                                          onClick={e => e.stopPropagation()}
                                        >
                                          {company.email}
                                        </a>
                                      </div>                                      <div className="col-span-1 flex items-center justify-end">
                                        <div className="flex space-x-2">
                                          <button
                                            onClick={e => { e.stopPropagation(); handleApproveCompany(company.id); }}
                                            className="bg-green-600 hover:bg-green-700 text-white px-2 md:px-3 py-1.5 rounded-md text-xs font-semibold"
                                          >
                                            Approve
                                          </button>
                                          <button
                                            onClick={e => {
                                              e.stopPropagation();
                                              setRejectingCompanyId(company.id);
                                              setRejectingCompanyName(company.companyName || company.name || '');
                                              setShowRejectModal(true);
                                            }}
                                            className="bg-red-600 hover:bg-red-700 text-white px-2 md:px-3 py-1.5 rounded-md text-xs font-semibold ml-2"
                                          >
                                            Reject
                                          </button>
                                        </div>
                                      </div>
                                    </div>
                                  </div>                                  {expandedPendingCompanyId === company.id && (
                                    <div className="border-t border-gray-700 mt-0 p-4 md:p-6 bg-black/40 text-sm text-gray-100 grid grid-cols-1 md:grid-cols-3 gap-4">
                                      {/* Column 1 */}                                      <div>
                                        <h4 className="text-base font-bold text-orange-400 mb-3">Company Information</h4>
                                        <p className="mb-1"><span className="font-semibold text-orange-300">Company Name:</span> {company.companyName}</p>
                                        <p className="mb-1"><span className="font-semibold text-orange-300">Responsible:</span> {company.responsibleName || 'N/A'}</p>
                                        <p className="mb-1"><span className="font-semibold text-orange-300">Industry:</span> {company.industry || 'N/A'}</p>
                                        <p className="mb-1"><span className="font-semibold text-orange-300">Company Size:</span> {company.employees || company.companySize || 'N/A'}</p>
                                        {company.description && (
                                          <>
                                            <p className="mb-1"><span className="font-semibold text-orange-300">Description:</span></p>
                                            <div className="relative">
                                              <div className="break-words whitespace-pre-wrap text-xs mt-1 bg-black/30 p-2 rounded max-h-32 overflow-y-auto">
                                                {company.description ? 
                                                  company.description.split('\n').map((line: string, i: number, arr: string[]) => (
                                                    <React.Fragment key={i}>
                                                      {line}
                                                      {i < arr.length - 1 && <br />}
                                                    </React.Fragment>
                                                  )) 
                                                  : 'N/A'}
                                              </div>
                                              {company.description && company.description.length > 100 && (
                                                <div className="absolute bottom-0 right-0 bg-gradient-to-l from-black/60 to-transparent px-2 text-xs text-orange-300">
                                                  Scroll para ver mais
                                                </div>
                                              )}
                                            </div>
                                          </>
                                        )}
                                      </div>                                      {/* Column 2 */}                                      <div>
                                        <h4 className="text-base font-bold text-orange-400 mb-3">Contact Information</h4>
                                        <p className="mb-1"><span className="font-semibold text-orange-300">Email:</span> {company.email}</p>
                                        <p className="mb-1"><span className="font-semibold text-orange-300">Username:</span> {company.username || company.email}</p>
                                        <p className="mb-1"><span className="font-semibold text-orange-300">Status:</span> {company.status || 'pending'}</p>
                                        <p className="mb-1"><span className="font-semibold text-orange-300">Submitted:</span> {company.createdAt ? formatFirestoreTimestamp(company.createdAt) : 'N/A'}</p>
                                      </div>                                      {/* Column 3 */}                                      <div>
                                        <h4 className="text-base font-bold text-orange-400 mb-3">Additional Details</h4>
                                        <p className="mb-1"><span className="font-semibold text-orange-300">ID:</span> <span className="break-all">{company.id}</span></p>
                                        
                                        {company.website && (
                                          <p className="mb-1">
                                            <span className="font-semibold text-orange-300">Website:</span>{' '}
                                            <a 
                                              href={company.website.startsWith('http') ? company.website : `https://${company.website}`} 
                                              target="_blank" 
                                              rel="noopener noreferrer"
                                              className="text-orange-400 hover:underline"
                                              onClick={e => e.stopPropagation()}
                                            >
                                              {company.website}
                                            </a>
                                          </p>
                                        )}
                                        
                                        {/* Social Media Links */}
                                        {(company.linkedin || company.twitter || company.facebook || company.instagram || company.telegram) && (
                                          <div className="mt-2">
                                            <p className="font-semibold text-orange-300 mb-1">Social Media:</p>
                                            
                                            {[
                                              { name: 'LinkedIn', url: company.linkedin, prefix: 'https://linkedin.com/' },
                                              { name: 'Twitter', url: company.twitter, prefix: 'https://twitter.com/' },
                                              { name: 'Facebook', url: company.facebook, prefix: 'https://facebook.com/' },
                                              { name: 'Instagram', url: company.instagram, prefix: 'https://instagram.com/' },
                                              { name: 'Telegram', url: company.telegram, prefix: 'https://t.me/' }
                                            ].map(social => {
                                              if (!social.url) return null;
                                              
                                              // Normalize the social media URL
                                              const getSocialUrl = (url: string | undefined): string => {
                                                if (!url) return '';
                                                if (url.startsWith('http')) return url;
                                                if (url.includes('.com/') || url.includes('.org/') || url.includes('.net/')) {
                                                  return `https://${url}`;
                                                }
                                                return `${social.prefix}${url.replace('@', '')}`;
                                              };
                                            
                                              return (
                                                <p className="mb-1" key={social.name}>
                                                  <span className="font-semibold text-orange-300">{social.name}:</span>{' '}
                                                  {social.url ? (
                                                    <a 
                                                      href={getSocialUrl(social.url)}
                                                      target="_blank"
                                                      rel="noopener noreferrer"
                                                      className="text-blue-400 hover:underline"
                                                      onClick={e => e.stopPropagation()}
                                                    >
                                                      {social.url}
                                                    </a>
                                                  ) : 'N/A'}
                                                </p>
                                              );
                                            }).filter(Boolean)}
                                          </div>
                                        )}
                                        
                                        {company.notes && (
                                          <p className="mb-1"><span className="font-semibold text-orange-300">Notes:</span> {company.notes}</p>
                                        )}
                                          {company.responsablePhone && (
                                          <p className="mb-1">
                                            <span className="font-semibold text-orange-300">Phone:</span>{' '}                                            <a 
                                              href={`tel:${company.responsablePhone}`} 
                                              className="text-orange-400 hover:underline"
                                              onClick={e => e.stopPropagation()}
                                            >
                                              {company.responsablePhone}
                                            </a>
                                          </p>
                                        )}
                                        
                                        {company.responsableEmail && (
                                          <p className="mb-1">
                                            <span className="font-semibold text-orange-300">Responsible Email:</span>{' '}                                            <a 
                                              href={`mailto:${company.responsableEmail}`} 
                                              className="text-orange-400 hover:underline"
                                              onClick={e => e.stopPropagation()}
                                            >
                                              {company.responsableEmail}
                                            </a>
                                          </p>
                                        )}
                                        
                                        {/* JSON details removed as requested */}
                                      </div>
                                    </div>
                                  )}
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      )}                      {/* Show "seekers" subtab only if you have permission */}                      {activeSubTab === "seekers" && hasPermission('canEditContent') && (
                        <div>
                          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 gap-3">
                            <div>
                              <h3 className="text-lg md:text-xl font-bold text-orange-400 mb-2 md:mb-0">Seekers List</h3>
                            </div>
                            <div className="w-full md:w-auto">
                              <label htmlFor="seekerSearch" className="sr-only">Search seekers</label>
                              <input
                                id="seekerSearch"
                                type="text"
                                placeholder="Search seekers..."
                                value={searchSeekersQuery}
                                onChange={(e) => setSearchSeekersQuery(e.target.value)}
                                className="w-full px-3 py-2 bg-black/40 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-orange-400 focus:outline-none"
                              />
                            </div>
                          </div>
                          {seekersLoading && <div className="bg-black/40 p-8 rounded-lg text-center"><p className="text-gray-400">Loading seekers...</p></div>}
                          {seekersError && <div className="bg-red-900/50 border border-red-500 text-white p-3 md:p-4 rounded-lg mb-4 md:mb-6 text-sm">{seekersError}</div>}
                          
                          {!seekersLoading && !seekersError && seekers.length === 0 ? (
                            <div className="bg-black/40 p-8 rounded-lg text-center">
                              <p className="text-gray-400">No seekers found.</p>
                            </div>
                          ) : (
                            <ul className="space-y-4">
                            {seekers.map((seeker) => (
                              <li 
                                key={seeker.id} 
                                className={`bg-black/40 border ${expandedSeekerId === seeker.id ? 'border-orange-500' : 'border-gray-700'} hover:border-orange-500 rounded-xl overflow-hidden transition-colors`}
                                onClick={() => toggleSeekerDetails(seeker.id)
                                }
                              >                                <div className="p-4">                                  {/* Mobile view */}
                                  <div className="flex flex-col md:hidden">
                                    <div className="mb-2">
                                      <p className="text-xs text-gray-400 mb-1">Name</p>
                                      <div className="flex items-center justify-between">
                                        <p className="text-white font-medium text-base">
                                          {(seeker.name || '') + ' ' + (seeker.surname || '')}
                                        </p>
                                        {seeker.blocked !== undefined && (
                                          <span className={`inline-block px-1.5 py-0.5 rounded-full text-xs ml-2 ${
                                            seeker.blocked 
                                              ? 'bg-gray-800 text-gray-400 border border-gray-700' 
                                              : 'bg-orange-900/50 text-orange-300 border border-orange-700'
                                          }`}>
                                            {seeker.blocked ? 'Blocked' : 'Active'}
                                          </span>
                                        )}                                      </div>
                                    </div>
                                    
                                    <div className="flex space-x-2 mt-2">
                                      <button 
                                        onClick={(e) => { e.stopPropagation(); handleDeleteSeeker(seeker.id); }}
                                        className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 rounded-md text-xs font-semibold"
                                        disabled={deletingSeekerId === seeker.id}
                                      >
                                        {deletingSeekerId === seeker.id ? 'Deleting...' : 'Delete'}
                                      </button>
                                      <button 
                                        onClick={(e) => {
                                          e.stopPropagation(); 
                                          handleToggleBlockSeeker(seeker.id, seeker.blocked || false);
                                        }} 
                                        className={`flex-1 ${seeker.blocked ? 'bg-green-600 hover:bg-green-700' : 'bg-gray-800 hover:bg-gray-700'} text-white py-2 rounded-md text-xs font-semibold`} 
                                        disabled={blockingSeekerId === seeker.id}
                                      >
                                        {blockingSeekerId === seeker.id ? 'Processing...' : seeker.blocked ? 'Unblock' : 'Block'}
                                      </button>
                                    </div>
                                  </div>
                                  
                                  {/* Desktop view */}
                                  <div className="hidden md:flex items-center justify-between">
                                    <div className="text-left flex items-center gap-2">
                                      <div>
                                        <strong>{(seeker.name || '') + ' ' + (seeker.surname || '')}</strong> <span className="text-gray-400">
                                          (<a
                                            href={`mailto:${seeker.email}`} 
                                            className="text-orange-400 hover:underline" 
                                            onClick={e => e.stopPropagation()}
                                          >
                                            {seeker.email}
                                          </a>)
                                        </span>
                                        {seeker.blocked !== undefined && (
                                          <div className="mt-1">
                                            <span className={`inline-block px-2 py-0.5 rounded-full text-xs ${
                                              seeker.blocked 
                                                ? 'bg-gray-800 text-gray-400 border border-gray-700' 
                                                : 'bg-orange-900/50 text-orange-300 border border-orange-700'
                                            }`}>
                                              {seeker.blocked ? 'Blocked' : 'Active'}
                                            </span>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                    <div className="flex space-x-2">
                                      <button 
                                        onClick={(e) => { e.stopPropagation(); handleDeleteSeeker(seeker.id); }}
                                        className="bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded-md text-xs font-semibold"
                                        disabled={deletingSeekerId === seeker.id}
                                      >
                                        {deletingSeekerId === seeker.id ? 'Deleting...' : 'Delete'}
                                      </button>
                                      <button 
                                        onClick={(e) => {
                                          e.stopPropagation(); 
                                          handleToggleBlockSeeker(seeker.id, seeker.blocked || false);
                                        }} 
                                        className={`${seeker.blocked ? 'bg-green-600 hover:bg-green-700' : 'bg-gray-800 hover:bg-gray-700'} text-white px-3 py-1.5 rounded-md text-xs font-semibold`} 
                                        disabled={blockingSeekerId === seeker.id}
                                      >
                                        {blockingSeekerId === seeker.id ? 'Processing...' : seeker.blocked ? 'Unblock' : 'Block'}
                                      </button>
                                    </div>
                                  </div>
                                </div>{/* Expanded Seeker Details */}
                                {expandedSeekerId === seeker.id && (
                                  <div className="border-t border-gray-700 mt-0 p-4 md:p-6 bg-black/40 text-sm text-gray-100 grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {/* Professional Information */}
                                    <div className="col-span-1 md:col-span-2 border-b border-gray-700 mb-4 pb-4">
                                      <h4 className="text-base md:text-lg font-bold text-orange-400 mb-3">Professional Information</h4>
                                      {seeker.title && (
                                        <p className="mb-1"><span className="font-semibold text-orange-300">Title:</span> {seeker.title}</p>
                                      )}
                                      {seeker.skills && (
                                        <p className="mb-1">
                                          <span className="font-semibold text-orange-300">Skills:</span>{' '}
                                          {seeker.skills}
                                        </p>
                                      )}
                                      {seeker.bio && (
                                        <p className="mb-1">
                                          <span className="font-semibold text-orange-300">Bio:</span>{' '}
                                          {seeker.bio}
                                        </p>
                                      )}
                                      {seeker.workPreference && (
                                        <p className="mb-1">
                                          <span className="font-semibold text-orange-300">Work Preference:</span>{' '}
                                          {seeker.workPreference}
                                        </p>
                                      )}
                                      {seeker.contractType && (
                                        <p className="mb-1">
                                          <span className="font-semibold text-orange-300">Contract Type:</span>{' '}
                                          {seeker.contractType}
                                        </p>
                                      )}
                                      {seeker.availability && (
                                        <p className="mb-1">
                                          <span className="font-semibold text-orange-300">Availability:</span>{' '}
                                          {seeker.availability}
                                        </p>
                                      )}
                                      {seeker.salaryExpectation && (
                                        <p className="mb-1">
                                          <span className="font-semibold text-orange-300">Salary Expectation:</span>{' '}
                                          {seeker.salaryExpectation}
                                        </p>
                                      )}
                                    </div>
                                      {/* Personal Information */}                                    <div>
                                      <h4 className="text-base font-bold text-orange-400 mb-3">Personal Information</h4>
                                      <p className="mb-1"><span className="font-semibold text-orange-300">Full Name:</span> {(seeker.name || '') + ' ' + (seeker.surname || '')}</p>
                                      <p className="mb-1"><span className="font-semibold text-orange-300">Username:</span> {seeker.username}</p>
                                      <p className="mb-1">                                        <span className="font-semibold text-orange-300">Email:</span>{' '}
                                        <a 
                                          href={`mailto:${seeker.email}`} 
                                          className="text-orange-400 hover:underline" 
                                          onClick={e => e.stopPropagation()}
                                        >
                                          {seeker.email}
                                        </a>
                                      </p>
                                      {seeker.location && (
                                        <p className="mb-1">
                                          <span className="font-semibold text-orange-300">Location:</span>{' '}
                                          {seeker.location}
                                        </p>
                                      )}
                                      {seeker.address && (
                                        <p className="mb-1">
                                          <span className="font-semibold text-orange-300">Address:</span>{' '}
                                          {seeker.address}
                                        </p>
                                      )}
                                      {seeker.zipCode && (
                                        <p className="mb-1">
                                          <span className="font-semibold text-orange-300">ZIP Code:</span>{' '}
                                          {seeker.zipCode}
                                        </p>
                                      )}
                                      {(seeker.phoneCountryCode || seeker.phone) && (
                                        <p className="mb-1">
                                          <span className="font-semibold text-orange-300">Phone:</span>{' '}                                          <a 
                                            href={`tel:${seeker.phoneCountryCode || ''}${seeker.phone || ''}`}
                                            className="text-orange-400 hover:underline"
                                            onClick={e => e.stopPropagation()}
                                          >
                                            {seeker.phoneCountryCode || ''} {seeker.phone || ''}
                                          </a>
                                        </p>
                                      )}
                                      {(seeker.altContactCountryCode || seeker.altContact) && (
                                        <p className="mb-1">
                                          <span className="font-semibold text-orange-300">Alternative Contact:</span>{' '}                                          <a 
                                            href={`tel:${seeker.altContactCountryCode || ''}${seeker.altContact || ''}`}
                                            className="text-orange-400 hover:underline"
                                            onClick={e => e.stopPropagation()}
                                          >
                                            {seeker.altContactCountryCode || ''} {seeker.altContact || ''}
                                          </a>
                                        </p>
                                      )}
                                      {seeker.nationality && (
                                        <p className="mb-1">
                                          <span className="font-semibold text-orange-300">Nationality:</span>{' '}
                                          {seeker.nationality}
                                        </p>
                                      )}
                                      {seeker.gender && (
                                        <p className="mb-1">
                                          <span className="font-semibold text-orange-300">Gender:</span>{' '}
                                          {seeker.gender}
                                        </p>
                                      )}
                                    </div>                                    {/* Social Networks */}
                                    <div>
                                      <h4 className="text-base font-bold text-orange-400 mb-3">Social Networks</h4>                                      {seeker.linkedinUrl && (
                                        <p className="mb-1">
                                          <span className="font-semibold text-orange-300">LinkedIn:</span>{' '}
                                          <a 
                                            href={seeker.linkedinUrl} 
                                            className="text-orange-400 hover:underline"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            onClick={e => e.stopPropagation()}
                                          >
                                            {seeker.linkedinUrl}
                                          </a>
                                        </p>
                                      )}                                      {seeker.twitterUrl && (
                                        <p className="mb-1">
                                          <span className="font-semibold text-orange-300">Twitter:</span>{' '}
                                          <a 
                                            href={seeker.twitterUrl} 
                                            className="text-orange-400 hover:underline"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            onClick={e => e.stopPropagation()}
                                          >
                                            {seeker.twitterUrl}
                                          </a>
                                        </p>
                                      )}                                      {seeker.facebookUrl && (
                                        <p className="mb-1">
                                          <span className="font-semibold text-orange-300">Facebook:</span>{' '}
                                          <a 
                                            href={seeker.facebookUrl} 
                                            className="text-orange-400 hover:underline"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            onClick={e => e.stopPropagation()}
                                          >
                                            {seeker.facebookUrl}
                                          </a>
                                        </p>
                                      )}                                      {seeker.instagramUrl && (
                                        <p className="mb-1">
                                          <span className="font-semibold text-orange-300">Instagram:</span>{' '}
                                          <a 
                                            href={seeker.instagramUrl} 
                                            className="text-orange-400 hover:underline"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            onClick={e => e.stopPropagation()}
                                          >
                                            {seeker.instagramUrl}
                                          </a>
                                        </p>
                                      )}                                      {seeker.telegramUrl && (
                                        <p className="mb-1">
                                          <span className="font-semibold text-orange-300">Telegram:</span>{' '}
                                          <a 
                                            href={seeker.telegramUrl} 
                                            className="text-orange-400 hover:underline"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            onClick={e => e.stopPropagation()}
                                          >
                                            {seeker.telegramUrl}
                                          </a>
                                        </p>
                                      )}                                      {seeker.websiteUrl && (
                                        <p className="mb-1">
                                          <span className="font-semibold text-orange-300">Website:</span>{' '}
                                          <a 
                                            href={seeker.websiteUrl} 
                                            className="text-orange-400 hover:underline"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            onClick={e => e.stopPropagation()}
                                          >
                                            {seeker.websiteUrl}
                                          </a>
                                        </p>
                                      )}
                                    </div>
                                    
                                      {/* System Information */}
                                    <div>
                                      <h4 className="font-semibold text-orange-400 mb-2">System Information</h4>                                      <p className="mb-1"><span className="font-semibold text-orange-300">ID:</span> <span className="break-all text-xs">{seeker.id}</span></p>
                                      
                                      {seeker.createdAt ? (
                                        <p className="mb-1">
                                          <span className="font-semibold text-orange-300">Created:</span>{' '}
                                          {typeof seeker.createdAt === 'string' 
                                            ? new Date(seeker.createdAt).toLocaleString() 
                                            : seeker.createdAt.toDate?.() 
                                              ? seeker.createdAt.toDate().toLocaleString() 
                                              : 'Unknown'}
                                        </p>
                                      ) : null}
                                      {seeker.updatedAt ? (
                                        <p className="mb-1">
                                          <span className="font-semibold text-orange-300">Updated:</span>{' '}
                                          {typeof seeker.updatedAt === 'string' 
                                            ? new Date(seeker.updatedAt).toLocaleString() 
                                            : seeker.updatedAt.toDate?.() 
                                              ? seeker.updatedAt.toDate().toLocaleString() 
                                              : 'Unknown'}
                                        </p>
                                      ) : null}                                      {seeker.resumeUrl && (
                                        <p className="mb-1">
                                          <span className="font-semibold text-orange-300">Resume:</span>{' '}
                                          <a 
                                            href={seeker.resumeUrl} 
                                            className="text-orange-400 hover:underline"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            onClick={e => e.stopPropagation()}
                                          >
                                            View CV
                                          </a>
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </li>                            ))}
                          </ul>
                          )}
                        </div>
                      )}
                      
                      {!activeSubTab && <p className="text-gray-400 text-left">Select a category to manage users.</p>}
                    </div>
                  </div>
                )}                {/* Show "settings" tab only if you have permission */}
                {activeTab === "settings" && settingsDropdownOpen && hasPermission('canAccessSettings') && (
                  <div>                    <h2 className={`font-bold ${isMobile ? 'text-2xl text-center mb-4' : 'text-3xl mb-6 text-left'} text-orange-500`}>Settings</h2>
                    <div className={`mt-6 bg-black/30 ${isMobile ? 'p-3' : 'p-6'} rounded-lg border border-gray-700 hover:border-orange-500 transition-colors`}>

                      {/* Render My Profile Form */}
                      {activeSubTab === "profile" && (
                        <div>
                          <h3 className={`${isMobile ? 'text-lg' : 'text-xl'} text-orange-400 mb-4 ${isMobile ? 'text-center' : 'text-left'}`}>My Profile</h3>
                          {profileLoading && <p className={`${isMobile ? 'text-center text-sm' : ''}`}>Loading profile...</p>}
                          {profileError && <p className={`text-red-400 mb-4 ${isMobile ? 'text-center text-sm' : ''}`}>{profileError}</p>}
                          {!profileLoading && (                            <form onSubmit={handleUpdateProfile} className={`${isMobile ? 'space-y-3' : 'space-y-4'}`}>
                              <div className={`grid grid-cols-1 ${isMobile ? '' : 'md:grid-cols-2'} gap-${isMobile ? '3' : '4'}`}>                                <div>
                                  <label htmlFor="username" className={`block ${isMobile ? 'text-xs' : 'text-sm'} font-medium text-white`}>Username</label>
                                  <input 
                                    type="text" 
                                    id="username"
                                    value={profileData.username} 
                                    readOnly 
                                    className={`mt-1 block w-full ${isMobile ? 'px-2 py-1.5 text-sm' : 'px-3 py-2'} bg-gray-700 border border-gray-600 rounded-md shadow-sm text-white cursor-not-allowed`} 
                                  />
                                </div>
                                <div>
                                  <label htmlFor="email" className={`block ${isMobile ? 'text-xs' : 'text-sm'} font-medium text-white`}>Email</label>
                                  <input 
                                    type="email" 
                                    id="email"
                                    value={profileData.email} 
                                    readOnly 
                                    className={`mt-1 block w-full ${isMobile ? 'px-2 py-1.5 text-sm' : 'px-3 py-2'} bg-gray-700 border border-gray-600 rounded-md shadow-sm text-white cursor-not-allowed`} 
                                  />
                                </div>
                                <div>
                                  <label htmlFor="role" className={`block ${isMobile ? 'text-xs' : 'text-sm'} font-medium text-white`}>Role</label>
                                  <input 
                                    type="text" 
                                    id="role"
                                    value={profileData.role} 
                                    readOnly 
                                    className={`mt-1 block w-full ${isMobile ? 'px-2 py-1.5 text-sm' : 'px-3 py-2'} bg-gray-700 border border-gray-600 rounded-md shadow-sm text-white cursor-not-allowed`} 
                                  />
                                </div>
                                <div>
                                  <label htmlFor="position" className={`block ${isMobile ? 'text-xs' : 'text-sm'} font-medium text-white`}>Position/Title</label>
                                  <input
                                    type="text"
                                    id="position"
                                    name="position"
                                    value={profileData.position || ''}
                                    onChange={handleProfileInputChange}
                                    placeholder="Your position or title"
                                    className={`mt-1 block w-full ${isMobile ? 'px-2 py-1.5 text-sm' : 'px-3 py-2'} bg-black border border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500 text-white`}
                                  />
                                </div>
                                <div>
                                  <label htmlFor="birthDate" className={`block ${isMobile ? 'text-xs' : 'text-sm'} font-medium text-white`}>Birth Date</label>
                                  <input
                                    type="date"
                                    id="birthDate"
                                    name="birthDate"
                                    value={profileData.birthDate || ''}
                                    onChange={handleProfileInputChange}
                                    className={`mt-1 block w-full ${isMobile ? 'px-2 py-1.5 text-sm' : 'px-3 py-2'} bg-black border border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500 text-white`}
                                  />
                                </div>
                                <div>
                                  <label htmlFor="nationality" className={`block ${isMobile ? 'text-xs' : 'text-sm'} font-medium text-white`}>Nationality</label>
                                  <input
                                    type="text"
                                    id="nationality"
                                    name="nationality"
                                    value={profileData.nationality || ''}
                                    onChange={handleProfileInputChange}
                                    placeholder="Your nationality"
                                    className={`mt-1 block w-full ${isMobile ? 'px-2 py-1.5 text-sm' : 'px-3 py-2'} bg-black border border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500 text-white`}
                                  />
                                </div>
                              </div>                              <h4 className={`${isMobile ? 'text-base' : 'text-lg'} text-orange-400 ${isMobile ? 'pt-2' : 'pt-4'}`}>Contact Information</h4>
                              <div className={`grid grid-cols-1 ${isMobile ? '' : 'md:grid-cols-2'} gap-${isMobile ? '3' : '4'}`}>
                                <div>
                                  <label htmlFor="phone" className={`block ${isMobile ? 'text-xs' : 'text-sm'} font-medium text-white mb-1`}>Phone</label>
                                  <input
                                    type="tel"
                                    id="phone"
                                    name="phone"
                                    value={profileData.phone || ''}
                                    onChange={handleProfileInputChange}
                                    placeholder="Your phone number"
                                    className={`mt-1 block w-full ${isMobile ? 'px-2 py-1.5 text-sm' : 'px-3 py-2'} bg-black border border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500 text-white`}
                                  />
                                </div>
                                <div>
                                  <label htmlFor="address" className={`block ${isMobile ? 'text-xs' : 'text-sm'} font-medium text-white mb-1`}>Address</label>
                                  <input
                                    type="text"
                                    id="address"
                                    name="address"
                                    value={profileData.address || ''}
                                    onChange={handleProfileInputChange}
                                    placeholder="Your address"
                                    className={`mt-1 block w-full ${isMobile ? 'px-2 py-1.5 text-sm' : 'px-3 py-2'} bg-black border border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500 text-white`}
                                  />
                                </div>
                                <div>
                                  <label htmlFor="city" className={`block ${isMobile ? 'text-xs' : 'text-sm'} font-medium text-white mb-1`}>City</label>
                                  <input
                                    type="text"
                                    id="city"
                                    name="city"
                                    value={profileData.city || ''}
                                    onChange={handleProfileInputChange}
                                    placeholder="Your city"
                                    className={`mt-1 block w-full ${isMobile ? 'px-2 py-1.5 text-sm' : 'px-3 py-2'} bg-black border border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500 text-white`}
                                  />
                                </div>
                                <div>
                                  <label htmlFor="country" className={`block ${isMobile ? 'text-xs' : 'text-sm'} font-medium text-white mb-1`}>Country</label>
                                  <input
                                    type="text"
                                    id="country"
                                    name="country"
                                    value={profileData.country || ''}
                                    onChange={handleProfileInputChange}
                                    placeholder="Your country"
                                    className={`mt-1 block w-full ${isMobile ? 'px-2 py-1.5 text-sm' : 'px-3 py-2'} bg-black border border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500 text-white`}
                                  />
                                </div>
                                <div>
                                  <label htmlFor="postalCode" className={`block ${isMobile ? 'text-xs' : 'text-sm'} font-medium text-white mb-1`}>Postal/Zip Code</label>
                                  <input
                                    type="text"
                                    id="postalCode"
                                    name="postalCode"
                                    value={profileData.postalCode || ''}
                                    onChange={handleProfileInputChange}
                                    placeholder="Your postal/zip code"
                                    className={`mt-1 block w-full ${isMobile ? 'px-2 py-1.5 text-sm' : 'px-3 py-2'} bg-black border border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500 text-white`}
                                  />
                                </div>
                              </div>
                                <h4 className={`${isMobile ? 'text-base' : 'text-lg'} text-orange-400 ${isMobile ? 'pt-2' : 'pt-4'}`}>Social Media & Online Presence</h4>
                              <div className={`grid grid-cols-1 ${isMobile ? '' : 'md:grid-cols-2'} gap-${isMobile ? '3' : '4'}`}>
                                <div>
                                  <label htmlFor="website" className={`block ${isMobile ? 'text-xs' : 'text-sm'} font-medium text-white mb-1`}>Personal Website</label>
                                  <input
                                    type="url"
                                    id="website"
                                    name="website"
                                    value={profileData.website || ''}
                                    onChange={handleProfileInputChange}
                                    placeholder="https://your-website.com"
                                    className={`mt-1 block w-full ${isMobile ? 'px-2 py-1.5 text-sm' : 'px-3 py-2'} bg-black border border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500 text-white`}
                                  />
                                </div>
                                <div>
                                  <label htmlFor="linkedin" className={`block ${isMobile ? 'text-xs' : 'text-sm'} font-medium text-white mb-1`}>LinkedIn</label>
                                  <input
                                    type="url"
                                    id="linkedin"
                                    name="linkedin"
                                    value={profileData.linkedin || ''}
                                    onChange={handleProfileInputChange}
                                    placeholder="https://linkedin.com/in/yourprofile"
                                    className={`mt-1 block w-full ${isMobile ? 'px-2 py-1.5 text-sm' : 'px-3 py-2'} bg-black border border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500 text-white`}
                                  />
                                </div>
                                <div>
                                  <label htmlFor="twitter" className={`block ${isMobile ? 'text-xs' : 'text-sm'} font-medium text-white mb-1`}>Twitter</label>
                                  <input
                                    type="url"
                                    id="twitter"
                                    name="twitter"
                                    value={profileData.twitter || ''}
                                    onChange={handleProfileInputChange}
                                    placeholder="https://twitter.com/youraccount"
                                    className={`mt-1 block w-full ${isMobile ? 'px-2 py-1.5 text-sm' : 'px-3 py-2'} bg-black border border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500 text-white`}
                                  />
                                </div>
                                <div>
                                  <label htmlFor="github" className={`block ${isMobile ? 'text-xs' : 'text-sm'} font-medium text-white mb-1`}>GitHub</label>
                                  <input
                                    type="url"
                                    id="github"
                                    name="github"
                                    value={profileData.github || ''}
                                    onChange={handleProfileInputChange}
                                    placeholder="https://github.com/youraccount"
                                    className={`mt-1 block w-full ${isMobile ? 'px-2 py-1.5 text-sm' : 'px-3 py-2'} bg-black border border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500 text-white`}
                                  />
                                </div>
                              </div>
                                <div>
                                <label htmlFor="biography" className={`block ${isMobile ? 'text-xs' : 'text-sm'} font-medium text-white mb-1`}>Biography/About</label>
                                <textarea
                                  id="biography"
                                  name="biography"
                                  value={profileData.biography || ''}
                                  onChange={handleProfileInputChange}
                                  placeholder="Tell us about yourself..."
                                  rows={isMobile ? 3 : 4}
                                  className={`mt-1 block w-full ${isMobile ? 'px-2 py-1.5 text-sm' : 'px-3 py-2'} bg-black border border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500 text-white`}
                                ></textarea>
                              </div>
                              
                              <hr className={`border-gray-600 ${isMobile ? 'my-4' : 'my-6'}`}/>
                              <h4 className={`${isMobile ? 'text-base' : 'text-lg'} text-orange-400`}>Change Password</h4>
                              <div className={`grid grid-cols-1 ${isMobile ? '' : 'md:grid-cols-2'} gap-${isMobile ? '3' : '4'}`}>
                                <div>
                                  <label htmlFor="password" className={`block ${isMobile ? 'text-xs' : 'text-sm'} font-medium text-white mb-1`}>New Password (leave blank to keep current)</label>
                                  <input
                                    type="password"
                                    id="password"
                                    name="password"
                                    value={profileData.password}
                                    onChange={handleProfileInputChange}
                                    placeholder="New Password"
                                    className={`mt-1 block w-full ${isMobile ? 'px-2 py-1.5 text-sm' : 'px-3 py-2'} bg-black border border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500 text-white`}
                                  />
                                </div>
                                <div>
                                  <label htmlFor="confirmPassword" className={`block ${isMobile ? 'text-xs' : 'text-sm'} font-medium text-white mb-1`}>Confirm New Password</label>
                                  <input
                                    type="password"
                                    id="confirmPassword"
                                    name="confirmPassword"
                                    value={profileData.confirmPassword}
                                   
                                    onChange={handleProfileInputChange}
                                    placeholder="Confirm New Password"
                                    className={`mt-1 block w-full ${isMobile ? 'px-2 py-1.5 text-sm' : 'px-3 py-2'} bg-black border border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500 text-white`}
                                    disabled={!profileData.password} // Disable if new password is blank
                                  />
                                </div>
                              </div>

                              <div className={`flex ${isMobile ? 'justify-center' : 'justify-end'} ${isMobile ? 'mt-4' : 'mt-6'}`}>
                                <button
                                  type="submit"
                                  className={`bg-orange-500 text-white ${isMobile ? 'px-6 py-2 text-sm w-full' : 'px-4 py-2'} rounded-lg hover:bg-orange-600 disabled:opacity-60 font-medium`}
                                  disabled={profileUpdating}
                                >
                                  {profileUpdating ? 'Updating...' : 'Update Profile'}
                                </button>
                              </div>
                            </form>
                        )}
                        </div>
                      )}                      {activeSubTab === "permissions" && hasPermission('canManageUsers') && (
                        <div className={`${isMobile ? 'space-y-4' : 'space-y-8'}`}>
                          {/* Admin Creation Form */}
                          <div>
                            <h3 className={`${isMobile ? 'text-lg' : 'text-xl'} text-orange-400 mb-4 ${isMobile ? 'text-center' : 'text-left'}`}>Create New Admin</h3>
                            <form onSubmit={handleCreateAdmin} className={`mb-6 ${isMobile ? 'flex flex-col gap-3' : 'flex gap-2 items-end flex-wrap'}`}>
                              <input
                                type="text"
                                name="name"
                                value={newAdmin.name}
                                onChange={handleInputAdmin}
                                placeholder="Name"
                                className={`border border-gray-300 rounded-lg ${isMobile ? 'px-2 py-2 text-sm' : 'px-3 py-1'} text-black ${isMobile ? 'w-full' : 'w-auto'}`}
                                required
                              />
                              <input
                                type="text"
                                name="username"
                                value={newAdmin.username}
                                onChange={handleInputAdmin}
                                placeholder="Username"
                                className={`border border-gray-300 rounded-lg ${isMobile ? 'px-2 py-2 text-sm' : 'px-3 py-1'} text-black ${isMobile ? 'w-full' : 'w-auto'}`}
                                required
                              />
                              <input
                                type="password"
                                name="password"
                                value={newAdmin.password}
                                onChange={handleInputAdmin}
                                placeholder="Password"
                                className={`border border-gray-300 rounded-lg ${isMobile ? 'px-2 py-2 text-sm' : 'px-3 py-1'} text-black ${isMobile ? 'w-full' : 'w-auto'}`}
                                required
                              />
                              <input
                                type="email"
                                name="email"
                                value={newAdmin.email}
                                onChange={handleInputAdmin}
                                placeholder="Email"
                                className={`border border-gray-300 rounded-lg ${isMobile ? 'px-2 py-2 text-sm' : 'px-3 py-1'} text-black ${isMobile ? 'w-full' : 'w-auto'}`}
                                required
                              />
                              {/* UPDATED Role Input to Select Dropdown using defined array */}
                              <select
                                name="role"
                                value={newAdmin.role} // Controlled component
                                onChange={handleInputAdmin}
                                className={`border border-gray-300 rounded-lg ${isMobile ? 'px-2 py-2 text-sm' : 'px-3 py-1'} text-black ${isMobile ? 'w-full' : 'w-auto'}`}
                                required
                              >
                                <option value="" disabled>Select Role</option>
                                {/* Iterate over the defined roles array */}
                                {availableAdminRoles.map((roleValue) => (
                                  <option key={roleValue} value={roleValue}>
                                    {/* Capitalize first letter for display */}
                                    {roleValue.charAt(0).toUpperCase() + roleValue.slice(1)}
                                  </option>
                                ))}
                              </select>
                              <button
                                type="submit"
                                className={`bg-orange-500 text-white ${isMobile ? 'px-4 py-2 text-sm w-full' : 'px-4 py-1 w-auto'} rounded-lg hover:bg-orange-600 disabled:opacity-60`}
                                disabled={creating}
                              >
                                {creating ? 'Creating...' : 'Add Admin'}
                              </button>
                            </form>
                          </div>

                          {/* Existing Admins List */}
                          <div>
                            <h3 className={`${isMobile ? 'text-lg' : 'text-xl'} text-orange-400 mb-2 ${isMobile ? 'text-center' : 'text-left'}`}>Existing Admins</h3>                            {adminsLoading && <p className={`text-gray-400 ${isMobile ? 'text-center text-sm' : 'text-left'}`}>Loading admins...</p>}
                            {adminsError && <p className={`text-red-400 ${isMobile ? 'text-center text-sm' : 'text-left'}`}>{adminsError}</p>}
                            <ul className={`${isMobile ? 'mb-2' : 'mb-4'}`}>
                              {admins.map((adm) => (
                                <li key={adm.id} className={`flex ${isMobile ? 'flex-col' : 'items-center justify-between'} text-white ${isMobile ? 'mb-3 p-2 bg-black/20 rounded-lg' : 'mb-1'}`}>
                                <span className={`${isMobile ? 'text-center mb-2 text-sm' : 'text-left'}`}>
                                  {adm.name} 
                                  <span className={`text-gray-400 ${isMobile ? 'block text-xs' : ''}`}>
                                    ({adm.username} - {adm.email} - {adm.role})
                                  </span>
                                </span>
                                <button
                                  onClick={() => handleDeleteAdmin(adm.id)}
                                  className={`${isMobile ? 'mx-auto' : 'ml-2'} px-2 py-1 bg-red-600 rounded hover:bg-red-700 text-xs disabled:opacity-60 ${isMobile ? 'w-20' : ''}`}
                                  disabled={deletingId === adm.id}
                                >
                                  {deletingId === adm.id ? 'Deleting...' : 'Delete'}
                                </button>
                              </li>
                              ))}
                            </ul>
                          </div>

                          {/* Admin Permissions Manager Component */}
                          <div>
                            {/* Title is already inside AdminPermissionsManager */}
                            <AdminPermissionsManager />
                          </div>
                        </div>
                      )}
                      {/* Optional: Add a message if settings tab is active but no sub-tab is available/selected */}
                      {!activeSubTab && (
                        <div className="text-gray-400 text-center py-4">
                          <p>Select a category to manage settings.</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
                {/* Show "nfts" tab only if you have permission */}
                {activeTab === "nfts" && hasPermission('canEditContent') && (
                  <div>
                    <h2 className={`font-bold ${isMobile ? 'text-2xl text-center mb-4' : 'text-3xl mb-6 text-left'} text-orange-500`}>Manage NFTs</h2>{activeSubTab === "add" && (
                      <div className="mb-6 md:mb-10">
                        <div className="bg-black/30 p-4 md:p-6 rounded-xl border border-gray-700 hover:border-orange-500 transition-all shadow-sm">
                          <h3 className="text-lg md:text-xl font-bold text-orange-400 mb-4">Add New NFT</h3>
                          <form onSubmit={handleAddNFT} className="space-y-4 md:space-y-6">
                            <div>
                              <label htmlFor="nftTitle" className="block text-sm font-semibold text-gray-300 mb-1">
                                NFT Title
                              </label>
                              <input
                                id="nftTitle"
                                type="text"
                                name="title"
                                value={newNFT.title}
                                onChange={handleInputChange}
                                placeholder="Enter NFT title"
                                className="w-full px-3 py-2 bg-black/40 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-orange-400 focus:outline-none"
                                required
                              />
                            </div>
                            
                            <div>
                              <label htmlFor="nftImage" className="block text-sm font-semibold text-gray-300 mb-1">
                                NFT Image
                              </label>
                              <input
                                id="nftImage"
                                type="file"
                                name="image"
                                onChange={handleInputChange}
                                className="w-full px-3 py-2 bg-black/40 border border-gray-600 rounded-lg text-white file:mr-4 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:bg-orange-500 file:text-white file:text-sm hover:file:bg-orange-600"
                                required
                              />
                              <p className="text-xs text-gray-400 mt-1">Upload an image file for your NFT</p>
                            </div>
                            
                            <div>
                              <label htmlFor="nftDescription" className="block text-sm font-semibold text-gray-300 mb-1">
                                Description
                              </label>
                              <textarea
                                id="nftDescription"
                                name="description"
                                value={newNFT.description}
                                onChange={handleInputChange}
                                placeholder="Enter a description for the NFT"
                                rows={4}
                                className="w-full px-3 py-2 bg-black border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-orange-400 focus:outline-none"
                                required
                              ></textarea>
                            </div>
                            
                            <div>
                              <label htmlFor="nftValue" className="block text-sm font-semibold text-gray-300 mb-1">
                                Value
                              </label>
                              <input
                                id="nftValue"
                                type="text"
                                name="value"
                                value={newNFT.value}
                                onChange={handleInputChange}
                                placeholder="Enter NFT value"
                                className="w-full px-3 py-2 bg-black border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-orange-400 focus:outline-none"
                                required
                              />
                            </div>
                            
                            <div>
                              <label htmlFor="nftLink" className="block text-sm font-semibold text-gray-300 mb-1">
                                External Link (Optional)
                              </label>
                              <input
                                id="nftLink"
                                type="text"
                                name="link"
                                value={newNFT.link || ""}
                                onChange={handleInputChange}
                                placeholder="https://"
                                className="w-full px-3 py-2 bg-black border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-orange-400 focus:outline-none"
                              />
                              <p className="text-xs text-gray-400 mt-1">Link to an external resource for this NFT</p>
                            </div>
                            
                            <div className="flex justify-end mt-6">
                              <button
                                type="submit"
                                className="bg-orange-500 text-white px-4 py-2 rounded-lg hover:bg-orange-600 disabled:opacity-60 font-semibold shadow text-sm"
                              >
                                Add NFT
                              </button>
                            </div>
                          </form>
                        </div>
                      </div>
                    )}                    {activeSubTab === "delete" && (
                      <div className="mt-6 bg-black/30 p-4 md:p-6 rounded-xl border border-gray-700">
                        <h3 className="text-lg md:text-xl font-bold text-orange-400 mb-4">Delete NFTs</h3>
                        
                        {isLoading && (
                          <div className="flex justify-center py-8">
                            <div className="w-10 h-10 border-4 border-orange-500 rounded-full animate-spin border-t-transparent"></div>
                          </div>
                        )}
                        
                        {error && (
                          <div className="bg-red-900/50 border border-red-500 text-white p-3 md:p-4 rounded-lg mb-4 md:mb-6 text-sm">
                            {error}
                          </div>
                        )}
                        
                        {!isLoading && !error && nfts.length > 0 ? (
                          <ul className="space-y-4">
                            {nfts.map((nft) => (
                              <li key={nft.id} className="bg-black/40 border border-gray-700 hover:border-orange-500 rounded-xl overflow-hidden transition-colors">
                                <div className="flex items-center justify-between p-4">
                                  <div className="flex items-center space-x-4">
                                    <div className="h-12 w-12 rounded-lg overflow-hidden bg-black/60">
                                      <img 
                                        src={nft.image} 
                                        alt={nft.title} 
                                        className="h-full w-full object-cover"
                                      />
                                    </div>
                                    <div className="flex-1">
                                      <h4 className="text-orange-400 font-semibold">{nft.title}</h4>
                                      <p className="text-gray-300 text-sm truncate max-w-md">{nft.description}</p>
                                      <p className="text-gray-400 text-xs">Value: {nft.value}</p>
                                    </div>
                                  </div>                                  <button
                                    onClick={() => handleDeleteNFT(nft.id, nft.imagePath || "")}
                                    className="bg-red-600 hover:bg-red-700 text-white px-2 md:px-3 py-1.5 rounded-md text-xs font-semibold"
                                    disabled={!nft.id}
                                  >
                                    Delete
                                  </button>
                                </div>
                              </li>
                            ))}

                            {/* Delete All NFTs button */}
                            <li>
                              <button
                                onClick={handleDeleteAllNFTs}
                                className="w-full bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg flex items-center justify-center"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                                  <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1h4a1 1 0 011 1v1H4V5a1 1 0 011-1h4V3a1 1 0 011-1zm6 6H4a1 1 0 00-1 1v1h14v-1a1 1 0 00-1-1zm0 4H4a1 1 0 00-1 1v1h14v-1a1 1 0 00-1-1z" clipRule="evenodd" />
                                </svg>
                                Delete All NFTs
                              </button>
                            </li>
                          </ul>
                        ) : (
                          !isLoading && !error && (
                            <div className="bg-black/40 p-8 rounded-lg text-center">
                              <p className="text-gray-400">No NFTs available yet.</p>
                            </div>
                          )
                        )}
                      </div>
                    )}
                  </div>
                )}
                
                {activeTab === "jobs" && <JobsManager activeSubTab={activeSubTab || "list"} setActiveSubTab={setActiveSubTab} />}

                {/* Rendering of InstantJobsManager when the Instant Jobs tab is active */}
                {activeTab === "instantJobs" && (
                  <div>
                    <h2 className={`font-bold ${isMobile ? 'text-2xl text-center mb-4' : 'text-3xl mb-6 text-left'} text-orange-500`}>Manage Instant Jobs</h2>                    <div className="mt-6 bg-black/30 p-6 rounded-lg border border-gray-700 hover:border-orange-500 transition-colors">
                      <p className="text-gray-300 mb-4">
                      </p>
                                            
                      {/* Main component loaded directly without checking subtab */}
                      <InstantJobsManager />
                    </div>
                  </div>
                )}

                {/* Ads Manager Tab Content */}
                {activeTab === "ads" && (
                  <div>
                    <h2 className={`font-bold ${isMobile ? 'text-2xl text-center mb-4' : 'text-3xl mb-6 text-left'} text-orange-500`}>Ads Manager</h2>                    <div className="mt-6 bg-black/30 p-6 rounded-lg border border-gray-700 hover:border-orange-500 transition-colors">
                      {/* Main component for ad management */}
                      <AdManager />
                    </div>
                  </div>
                )}

                {/* Rendering of the "Smart Contracts" section within Learn2Earn in the main dashboard area */}
                {activeTab === "learn2earn" && activeSubTab === "contracts" && (
                  <div>
                    <Learn2EarnContractsPanel db={db} isMobile={isMobile} />
                  </div>
                )}                {/* System Activity Monitor Section */}
                {activeTab === "systemActivity" && (
                  <div>
                    <SystemActivityMonitor />
                  </div>
                )}                {/* Token Distribution Section */}
                {activeTab === "tokenDistribution" && (
                  <div>
                    <h2 className={`font-bold ${isMobile ? 'text-2xl text-center mb-4' : 'text-3xl mb-6 text-left'} text-orange-500`}>Token Distribution</h2>                <div className="space-y-8">
                      <TokenDistribution />
                    </div>
                  </div>
                )}

                {/* Accounting Dashboard Section */}
                {activeTab === "accounting" && (
                  <div>
                    <h2 className={`font-bold ${isMobile ? 'text-2xl text-center mb-4' : 'text-3xl mb-6 text-left'} text-orange-500`}>Accounting Dashboard</h2>
                    <div className="mt-6">
                      <FinancialDashboard />
                    </div>
                  </div>
                )}

                {/* Newsletter Section */}
                {activeTab === "marketing" && activeSubTab === "newsletter" && (
                  <div>
                    <h2 className={`font-bold ${isMobile ? 'text-2xl text-center mb-4' : 'text-3xl mb-6 text-left'} text-orange-500`}>Newsletter Manager</h2>                    <div className="mt-6 bg-black/30 p-6 rounded-lg border border-gray-700 hover:border-orange-500 transition-colors">
                      <AdminNewsletterManager />
                    </div>
                  </div>
                )}                {/* Social Media Section */}
                {activeTab === "marketing" && activeSubTab === "socialmedia" && (
                  <div>
                    <h2 className={`font-bold ${isMobile ? 'text-2xl text-center mb-4' : 'text-3xl mb-6 text-left'} text-orange-500`}>Social Media Promotion</h2>                    <div className="mt-6 bg-black/30 p-6 rounded-lg border border-gray-700 hover:border-orange-500 transition-colors">
                      <AdminSocialMediaManager />
                    </div>
                  </div>
                )}
                
                {/* Partners Section */}
                {activeTab === "marketing" && activeSubTab === "partners" && (
                  <div>
                    <h2 className={`font-bold ${isMobile ? 'text-2xl text-center mb-4' : 'text-3xl mb-6 text-left'} text-orange-500`}>Partners Manager</h2>                    <div className="mt-6 bg-black/30 p-6 rounded-lg border border-gray-700 hover:border-orange-500 transition-colors">
                      <AdminPartnersManager />
                    </div>
                  </div>
                )}{/* Payment Settings Section */}
                {activeTab === "payments" && activeSubTab === "config" && (

                  <div>
                    <h2 className={`font-bold ${isMobile ? 'text-2xl text-center mb-4' : 'text-3xl mb-6 text-left'} text-orange-500`}>Manage Jobs</h2>
                    <PaymentSettings hasPermission={true} />
                  </div>                )}{activeTab === "learn2earn" && activeSubTab === "list" && (
                  <div>
                    <h2 className={`font-bold ${isMobile ? 'text-2xl text-center mb-4' : 'text-3xl mb-6 text-left'} text-orange-500`}>Learn2Earn</h2>
                    <div className="bg-black/30 p-4 md:p-6 rounded-xl mb-6 md:mb-10 border border-gray-700">
                    <h3 className="text-base md:text-lg font-bold text-orange-400 mb-4 md:mb-6">Learn2Earn Opportunities</h3>
                    
                    {/* Search Bar */}
                    <div className="mb-4 md:mb-6">
                      <div className="relative">
                        <input
                          type="text"
                          placeholder="Search Learn2Earn opportunities..."
                          value={learn2earnSearchTerm}
                          onChange={(e) => setLearn2earnSearchTerm(e.target.value)}
                          className="w-full bg-black/50 border border-gray-600 rounded-lg px-4 py-2 text-sm text-white placeholder-gray-400 focus:outline-none focus:border-orange-500 transition-colors"
                        />
                        <svg className="absolute right-3 top-2.5 h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                      </div>
                    </div>

                    {learn2earnLoading && <p className="text-gray-400 text-sm">Loading opportunities...</p>}
                    {learn2earnError && (
                      <div className="bg-red-900/50 border border-red-500 text-white p-3 md:p-4 rounded-lg mb-4 md:mb-6 text-sm">
                        {learn2earnError}
                      </div>
                    )}
                    {!learn2earnLoading && !learn2earnError && filteredLearn2Earns.length === 0 && (
                      <p className="text-gray-400 text-sm">
                        {learn2earnSearchTerm ? 'No Learn2Earn opportunities match your search.' : 'No Learn2Earn opportunities available.'}
                      </p>
                    )}
                    
                    <div className="space-y-2">
                      {filteredLearn2Earns.map((l2e) => (
                        <div key={l2e.id} className="bg-black/30 border border-gray-700 hover:border-orange-500 rounded-lg overflow-hidden transition-all duration-200">
                          {/* Compact Header - Always Visible */}
                          <div 
                            className="flex items-center justify-between p-3 cursor-pointer hover:bg-black/20 transition-colors"
                            onClick={() => setExpandedLearn2EarnId(expandedLearn2EarnId === l2e.id ? null : l2e.id)}
                          >
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <h4 className="text-sm font-semibold text-orange-400 truncate">{l2e.title}</h4>
                                <span className={`px-2 py-0.5 rounded-full text-xs whitespace-nowrap ${
                                  l2e.status === 'active' ? 'bg-orange-900/50 text-orange-300 border border-orange-700' : 
                                  l2e.status === 'paused' ? 'bg-yellow-900/50 text-yellow-300 border border-yellow-700' : 
                                  'bg-gray-800 text-gray-400 border border-gray-700'
                                }`}>
                                  {l2e.status?.toUpperCase()}
                                </span>
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-4 gap-1 md:gap-4 text-xs text-gray-400">
                                <span>Token: <span className="text-white font-medium">{l2e.tokenSymbol}</span></span>
                                <span>Per User: <span className="text-white font-medium">{l2e.tokenPerParticipant}</span></span>
                                <span>Start: <span className="text-white font-medium">{formatFirestoreTimestamp(l2e.startDate)}</span></span>
                                <span>End: <span className="text-white font-medium">{formatFirestoreTimestamp(l2e.endDate)}</span></span>
                              </div>
                              <div className="text-xs text-gray-500 mt-1">ID: {l2e.id}</div>
                            </div>
                            <div className="flex items-center gap-2 ml-4">
                              <svg 
                                className={`h-4 w-4 text-gray-400 transition-transform duration-200 ${
                                  expandedLearn2EarnId === l2e.id ? 'rotate-180' : ''
                                }`} 
                                fill="none" 
                                stroke="currentColor" 
                                viewBox="0 0 24 24"
                              >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                              </svg>
                            </div>
                          </div>

                          {/* Expanded Details */}
                          {expandedLearn2EarnId === l2e.id && (
                            <div className="border-t border-gray-700 p-3 md:p-4 bg-black/20">
                              <div className="mb-4">
                                <h5 className="text-sm font-semibold text-orange-300 mb-2">Description</h5>
                                <p className="text-gray-300 text-sm">{l2e.description}</p>
                              </div>
                              
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                <div>
                                  <h5 className="text-sm font-semibold text-orange-300 mb-2">Token Details</h5>
                                  <div className="space-y-1 text-xs text-gray-400">
                                    <div>Network: <span className="text-white font-medium">{l2e.network}</span></div>
                                    <div>Token: <span className="text-white font-medium">{l2e.tokenSymbol}</span></div>
                                    <div>Total Amount: <span className="text-white font-medium">{l2e.tokenAmount}</span></div>
                                    <div>Per Participant: <span className="text-white font-medium">{l2e.tokenPerParticipant}</span></div>
                                  </div>
                                </div>
                                
                                <div>
                                  <h5 className="text-sm font-semibold text-orange-300 mb-2">Participation</h5>
                                  <div className="space-y-1 text-xs text-gray-400">
                                    <div>Current: <span className="text-white font-medium">{l2e.totalParticipants || 0}</span></div>
                                    <div>Maximum: <span className="text-white font-medium">{l2e.maxParticipants || '∞'}</span></div>
                                    <div>Start Date: <span className="text-white font-medium">{formatFirestoreTimestamp(l2e.startDate)}</span></div>
                                    <div>End Date: <span className="text-white font-medium">{formatFirestoreTimestamp(l2e.endDate)}</span></div>
                                  </div>
                                </div>
                              </div>

                              <div className="flex flex-col md:flex-row gap-2 pt-3 border-t border-gray-700">
                                <button 
                                  className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                                    l2e.status === 'active' 
                                      ? 'bg-yellow-600 hover:bg-yellow-700 text-white' 
                                      : 'bg-orange-500 hover:bg-orange-600 text-white'
                                  }`}
                                  disabled={pausingLearn2EarnId === l2e.id}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleToggleLearn2EarnStatus(l2e.id, l2e.status);
                                  }}
                                >
                                  {pausingLearn2EarnId === l2e.id
                                    ? (l2e.status === 'active' ? 'Pausing...' : 'Activating...')
                                    : (l2e.status === 'active' ? 'Pause' : 'Activate')}
                                </button>
                                <button
                                  className="bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded-md text-xs font-semibold transition-colors"
                                  disabled={deletingLearn2EarnId === l2e.id}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteLearn2Earn(l2e.id);
                                  }}
                                >
                                  {deletingLearn2EarnId === l2e.id ? 'Deleting...' : 'Delete'}
                                </button>
                              </div>
                            </div>
                          )}                        </div>
                      ))}
                    </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
          {/* Notification panel (right side overlay) - Only for super_admins */}
        {role === "super_admin" && (
          <NotificationsPanel
            adminId={adminId ?? undefined}
            open={showNotifications}
            onClose={() => setShowNotifications(false)}
           
            overlay
          />               )}

          {/* Modal de rejeição */}
          {showRejectModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
              <div className="bg-black rounded-xl p-6 border border-orange-500 w-full max-w-md">
                <h2 className="text-orange-400 text-lg font-bold mb-2">Reject Company</h2>
                <p className="mb-2 text-white">Please provide a reason for rejecting <span className="font-semibold">{rejectingCompanyName}</span>:</p>
                <textarea
                  className="w-full p-2 rounded bg-black/40 border border-gray-700 text-white mb-4"
                  rows={3}
                  value={rejectionReason}
                  onChange={e => setRejectionReason(e.target.value)}
                  placeholder="Enter rejection reason..."
                />
                <div className="flex justify-end gap-2">
                  <button
                    className="px-4 py-2 rounded bg-gray-700 text-white hover:bg-gray-600"
                    onClick={() => { setShowRejectModal(false); setRejectionReason(''); setRejectingCompanyId(null); setRejectingCompanyName(''); }}
                  >Cancel</button>
                  <button
                    className="px-4 py-2 rounded bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
                    onClick={handleRejectCompany}
                    disabled={!rejectionReason.trim()}
                  >Confirm Reject</button>
                </div>
              </div>
            </div>
          )}
      </main>
      )}
    </Layout>
  );
};
export default AdminDashboard;