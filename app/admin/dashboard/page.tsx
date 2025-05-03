"use client";

import MobileDetection from './mobile-detection';
import React, { useState, useEffect, useCallback } from "react";
import Layout from "../../../components/Layout";
import { useRouter } from 'next/navigation';
import { collection, addDoc, deleteDoc, doc, getDocs, updateDoc, getDoc, setDoc, query, where } from "firebase/firestore";
import { db } from "../../../lib/firebase";
import { getStorage, ref, uploadBytes, deleteObject, getDownloadURL } from "firebase/storage";
import { getAuth } from "firebase/auth";
import bcrypt from "bcryptjs";
import { AdminRole, useAdminPermissions } from "../../../hooks/useAdminPermissions";
import { ethers } from "ethers";

import AdminPermissionsManager from "../../../app/components/AdminPermissionsManager";
import Learn2EarnTestButton from "../../../components/ui/Learn2EarnTestButton";
import InstantJobsManager from "../../../components/admin/InstantJobsManager";
import PaymentSettings from "../../../components/admin/PaymentSettings";
import Learn2EarnFeePanel from "../../../components/ui/Learn2EarnFeePanel";
import FinancialDashboard from "../../../components/admin/FinancialDashboard";
import AdManager from "../../../components/admin/AdManager";

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

interface Employer {
  id: string;
  name: string;
  username: string;
  email: string;
  companyName: string;
  companySize?: string;
  industry?: string;
  dashboardAccess?: boolean; // Added property
  password?: string; // Added password property
}

interface Seeker {
  id: string;
  name: string;
  username: string;
  email: string;
  experience?: any[];
  education?: any[];
}

// Define the available roles explicitly for the dropdown
const availableAdminRoles: AdminRole[] = ['super_admin', 'admin', 'support'];

const AdminDashboard: React.FC = () => {
  const router = useRouter();
  // Update the type declaration to include "learn2earn" and "instantJobs"
  const [activeTab, setActiveTab] = useState<"nfts" | "users" | "jobs" | "settings" | "payments" | "learn2earn" | "instantJobs" | "accounting" | "ads">("nfts");
  const [activeSubTab, setActiveSubTab] = useState<string | null>("add");
  
  // Use the permissions hook
  const { role, permissions, loading: permissionsLoading, hasPermission } = useAdminPermissions();

  // Definir um estado inicial consistente para evitar problemas de hidratação SSR vs CSR
  const [isClient, setIsClient] = useState(false);
  
  // Certificar-se de que a renderização no cliente seja consistente com o servidor
  useEffect(() => {
    setIsClient(true);
  }, []);

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
  const [newEmployer, setNewEmployer] = useState({ 
    name: '', 
    username: '', 
    password: '', 
    email: '', 
    companyName: '',
    companySize: '',
    industry: ''
  });
  const [creatingEmployer, setCreatingEmployer] = useState(false);
  const [deletingEmployerId, setDeletingEmployerId] = useState<string|null>(null);

  // --- Seekers State and Handlers ---
  const [seekers, setSeekers] = useState<Seeker[]>([]);
  const [seekersLoading, setSeekersLoading] = useState(false);
  const [seekersError, setSeekersError] = useState<string|null>(null);
  const [newSeeker, setNewSeeker] = useState({ 
    name: '', 
    username: '', 
    password: '', 
    email: ''
  });
  const [creatingSeeker, setCreatingSeeker] = useState(false);
  const [deletingSeekerId, setDeletingSeekerId] = useState<string|null>(null);

  const [pendingCompanies, setPendingCompanies] = useState<any[]>([]);

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

    fetchPendingCompanies();
  }, []);

  const auth = getAuth();

  const handleApproval = async (id: string, approve: boolean) => {
    if (approve) {
      try {
        if (!db) {
          console.error("Firestore is not initialized");
          return;
        }

        // Check if the company exists in the pendingCompanies collection
        const pendingCompanyDoc = await getDoc(doc(db, "pendingCompanies", id));
        if (!pendingCompanyDoc.exists()) {
          console.error("Company not found in pendingCompanies");
          return;
        }

        const pendingCompanyData = pendingCompanyDoc.data();

        // Move the company to the companies collection
        await setDoc(doc(db, "companies", id), {
          ...pendingCompanyData,
          approved: true,
        });

        // Delete the company from the pendingCompanies collection
        await deleteDoc(doc(db, "pendingCompanies", id));

        console.log("Company moved to companies collection and approved.");
      } catch (error) {
        console.error("Error approving company:", error);
      }
    } else {
      console.log("Company approval denied.");
    }
  };

  const handleApproveCompany = async (companyId: string) => {
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
      } = companyData;

      // Check if the password is already encrypted
      let hashedPassword = password;
      
      // If the password does not appear to be in bcrypt format (starts with $2a$ or $2b$)
      if (!(password.startsWith('$2a$') || password.startsWith('$2b$'))) {
        // Encrypt the password using bcrypt
        const salt = await bcrypt.genSalt(10);
        hashedPassword = await bcrypt.hash(password, salt);
        console.log("Password successfully encrypted for company approval");
      } else {
        console.log("Password is already in encrypted format");
      }

      // Prepare the data object ensuring all necessary fields are present
      const approvedCompanyData = {
        ...companyData,         // Keep all original fields
        username: username,     // Ensure username exists (using email as fallback)
        email: email,           // Ensure email is present
        name: name,             // Ensure name is present
        companyName: companyName, // Ensure companyName is present
        password: hashedPassword, // Ensure password is encrypted
        approvedAt: new Date().toISOString(),
        status: "approved",
        approved: true
      };

      console.log("Approved company data:", {
        id: companyId,
        email: email,
        username: username, // Log the username that will be used for login
        companyName: companyName
      });

      // Save to the companies collection
      const approvedCompanyRef = doc(db, "companies", companyId);
      await setDoc(approvedCompanyRef, approvedCompanyData);

      // Remove from the pendingCompanies collection
      await deleteDoc(companyRef);

      // Update the list of pending companies
      setPendingCompanies(prev => prev.filter(company => company.id !== companyId));
      
      alert(`Company approved successfully! Username for login: ${username}`);
    } catch (error) {
      console.error("Error approving company:", error);
      alert("Failed to approve company.");
    }
  };

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
 
  const handleInputEmployer = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setNewEmployer((prev) => ({ ...prev, [name]: value }));
  };

  const handleInputSeeker = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setNewSeeker((prev) => ({ ...prev, [name]: value }));
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
      } else if (activeSubTab === "contracts") {
        fetchNetworkContracts();
      }
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

  const handleCreateEmployer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmployer.name || !newEmployer.username || !newEmployer.password || !newEmployer.email || !newEmployer.companyName) {
      alert('Please fill in all required fields!');
      return;
    }
    setCreatingEmployer(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        alert('Error: Authentication token not found. Please log in again.');
        setCreatingEmployer(false);
        router.replace('/admin/login'); // Fix redirect path here
        return;
      }
      const res = await fetch('/api/admin/employers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(newEmployer),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || `Error ${res.status}: Failed to create employer`);
      }
      setNewEmployer({ 
        name: '', 
        username: '', 
        password: '', 
        email: '', 
        companyName: '',
        companySize: '',
        industry: ''
      });
      // Reload all data after successful creation
      reloadData();
      alert('Employer created successfully!');
    } catch (err: any) {
      console.error("Error creating employer:", err);
      alert(err.message || 'Unknown error creating employer');
    } finally {
      setCreatingEmployer(false);
    }
  };

  const handleCreateSeeker = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSeeker.name || !newSeeker.username || !newSeeker.password || !newSeeker.email) {
      alert('Please fill in all required fields!');
      return;
    }
    setCreatingSeeker(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        alert('Error: Authentication token not found. Please log in again.');
        setCreatingSeeker(false);
        router.replace('/admin/login'); // Fix redirect path here
        return;
      }
      const res = await fetch('/api/admin/seekers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(newSeeker),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || `Error ${res.status}: Failed to create seeker`);
      }
      setNewSeeker({ 
        name: '', 
        username: '', 
        password: '', 
        email: ''
      });
      // Use the global reload function to make sure all data is updated
      reloadData();
      alert('Seeker created successfully!');
    } catch (err: any) {
      console.error("Error creating seeker:", err);
      alert(err.message || 'Unknown error creating seeker');
    } finally {
      setCreatingSeeker(false);
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
          console.log("Fetching user photo for ID:", userId);
          
          // First, let's do a debug test to directly check the data
          const debugResponse = await fetch(`/api/admin/debug`);
          if (debugResponse.ok) {
            const debugData = await debugResponse.json();
            console.log("Debug data from Firestore:", debugData);
          }
          
          // Now fetch from the userProfile endpoint
          const response = await fetch(`/api/userProfile?userId=${userId}`);
          console.log("API response from userProfile:", response.status, response.statusText);
          
          if (response.ok) {
            const data = await response.json();
            console.log("Data received from userProfile:", data);
            
            if (data.photoUrl) {
              console.log("Photo found in userProfile:", data.photoUrl);
              setUserPhoto(data.photoUrl);
              localStorage.setItem("userPhoto", data.photoUrl);
            } else if (data.userData?.photoURL) {
              // Try to get from photoURL field
              console.log("Photo found in userData.photoURL:", data.userData.photoURL);
              setUserPhoto(data.userData.photoURL);
              localStorage.setItem("userPhoto", data.userData.photoURL);
            } else if (data.userData?.photo) {
              // Try to get from photo field in user data (alternative name)
              console.log("Photo found in userData.photo:", data.userData.photo);
              setUserPhoto(data.userData.photo);
              localStorage.setItem("userPhoto", data.userData.photo);
            } else {
              console.log("No photo found in API response");
            }
            
            // If we received additional user information, we can use it
            if (data.userData?.name || data.userData?.user) {
              const name = data.userData.name || data.userData.user;
              console.log("Name found in user data:", name);
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

  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    if (typeof window !== "undefined") {
      handleResize(); // Set initial value
      window.addEventListener("resize", handleResize);
    }

    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener("resize", handleResize);
      }
    };
  }, []);

  // Corrigindo o erro de "window is not defined" para a mensagem de boas-vindas
  const isDesktop = typeof window !== "undefined" && window.innerWidth >= 768;

  // Substituir a lógica de buscar o ID do usuário no localStorage por uma chamada ao Firebase
  const fetchUserIdFromFirebase = async () => {
    try {
      const response = await fetch("/api/userProfile"); // Endpoint to fetch the user profile
      if (!response.ok) {
        throw new Error("Error fetching user ID from Firebase");
      }
      const data = await response.json();
      if (data.userId) {
        return data.userId;
      } else {
        throw new Error("User ID not found in Firebase");
      }
    } catch (error) {
      console.error("Error fetching user ID from Firebase:", error);
      throw error;
    }
  };

  // Atualizar o useEffect para usar o Firebase em vez do localStorage
  useEffect(() => {
    const fetchUserPhoto = async () => {
      try {
        const userId = await fetchUserIdFromFirebase();
        console.log("Fetching user photo for ID:", userId);

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

  // useEffect para buscar a foto do usuário, buscando o ID diretamente do Firebase
  useEffect(() => {
    // Esta função usa diretamente a lista de administradores
    const fetchAdminPhotoFromFirebase = async () => {
      try {
        console.log("Fetching admins directly from Firebase");
        
        // Buscar administradores diretamente do Firestore através da API
        const adminResponse = await fetch("/api/admin");
        if (!adminResponse.ok) {
          throw new Error("Error fetching admins from Firebase");
        }
        
        const admins = await adminResponse.json();
        console.log("Admins found:", admins.length);
        
        if (!admins || admins.length === 0) {
          console.error("No admins found in Firebase");
          return;
        }
        
        // Usar o ID do primeiro administrador encontrado
        const adminId = admins[0].id;
        console.log("Admin ID found in Firebase:", adminId);
        
        // Salvar no localStorage para uso futuro
        localStorage.setItem("userId", adminId);
        
        // Agora buscar os dados de perfil incluindo a foto usando o ID do administrador
        try {
          const profileResponse = await fetch(`/api/userProfile?userId=${adminId}`);
          
          if (profileResponse.ok) {
            const profileData = await profileResponse.json();
            console.log("Profile data received from Firebase:", profileData);
            
            // Atualizar a foto do usuário se disponível
            if (profileData.photoUrl) {
              setUserPhoto(profileData.photoUrl);
              localStorage.setItem("userPhoto", profileData.photoUrl);
            } else if (profileData.userData?.photoURL) {
              setUserPhoto(profileData.userData.photoURL);
              localStorage.setItem("userPhoto", profileData.userData.photoURL);
            }
            
            // Atualizar o nome se disponível
            if (profileData.userData?.name) {
              setUserName(profileData.userData.name);
              localStorage.setItem("userName", profileData.userData.name);
            }
          } else {
            console.error("Error fetching admin profile:", profileResponse.statusText);
          }
        } catch (profileError) {
          console.error("Error fetching profile:", profileError);
        }
      } catch (error) {
        console.error("Error fetching admin data from Firebase:", error);
      }
    };

    fetchAdminPhotoFromFirebase();
  }, []);

const fetchEmployersList = async () => {
  try {
    if (!db) {
      throw new Error("Firestore is not initialized.");
    }

    const querySnapshot = await getDocs(collection(db, "companies")); // Fetch from the companies collection
    const employersList = querySnapshot.docs.map((doc) => ({
      id: doc.id,
      name: doc.data().name || "Unknown",
      username: doc.data().username || "Unknown",
      email: doc.data().email || "Unknown",
      companyName: doc.data().companyName || "Unknown",
      companySize: doc.data().companySize || "",
      industry: doc.data().industry || "",
    }));

    setEmployers(employersList);
  } catch (error) {
    console.error("Error fetching employers list:", error);
    setEmployersError("Failed to fetch employers list.");
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

  const [searchQuery, setSearchQuery] = useState("");

  const filteredEmployers = employers.filter((employer) => {
    const query = searchQuery.toLowerCase();
    return (
      employer.name.toLowerCase().includes(query) ||
      employer.email.toLowerCase().includes(query) ||
      employer.companyName.toLowerCase().includes(query)
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
      case 'deleteAll':
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
          // Populate form state, leaving password fields blank initially
          setProfileData({
            name: data.userData?.name || '',
            username: data.userData?.username || '',
            email: data.userData?.email || '',
            role: data.userData?.role || '',
            lastName: data.userData?.lastName || '',
            address: data.userData?.address || '',
            country: data.userData?.country || '',
            phone: data.userData?.phone || '',
            password: '', // Don't pre-fill password
            confirmPassword: '',
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

  const handleProfileInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
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
      };

      // If password is being changed, add it to the update data
      if (profileData.password) {
        if (profileData.password) {
          (updateData as any).password = profileData.password;
        }
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
        console.log("Profile updated successfully via direct Firestore update");
        
        // APPROACH 2: Also try API update as a backup
        try {
          const token = localStorage.getItem('token');
          if (token) {
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
            
            if (apiResponse.ok) {
              console.log("Profile also updated via API");
            } else {
              console.warn("API update failed, but direct Firestore update was successful");
            }
          }
        } catch (apiError) {
          console.warn("API update failed, but direct Firestore update was successful:", apiError);
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

  // --- Jobs State and Handlers ---
  const [jobs, setJobs] = useState<any[]>([]);
  const [jobsLoading, setJobsLoading] = useState(false);
  const [jobsError, setJobsError] = useState<string | null>(null);
  const [newJob, setNewJob] = useState({
    title: "",
    companyName: "",
    description: "",
    location: "",
    salary: "",
    sourceLink: "",
  });
  const [creatingJob, setCreatingJob] = useState(false);
  const [deletingJobId, setDeletingJobId] = useState<string | null>(null);

  // --- Job Plans State and Handlers ---
  const [jobPlans, setJobPlans] = useState<JobPlan[]>([]);
  const [jobPlansLoading, setJobPlansLoading] = useState(false);
  const [jobPlansError, setJobPlansError] = useState<string | null>(null);
  const [selectedPlanForEdit, setSelectedPlanForEdit] = useState<JobPlan | null>(null);
  const [isEditingPlan, setIsEditingPlan] = useState(false);
  const [newJobPlan, setNewJobPlan] = useState<Omit<JobPlan, 'id'>>({
    name: "",
    description: "",
    price: 70,
    currency: "USDT",
    features: [],
    duration: 30,
    isPremium: false,
    isTopListed: false
  });
  const [newFeature, setNewFeature] = useState("");

  const fetchJobPlans = async () => {
    setJobPlansLoading(true);
    setJobPlansError(null);
    try {
      if (!db) {
        throw new Error("Firestore is not initialized.");
      }

      const plansCollection = collection(db, "jobPlans");
      const querySnapshot = await getDocs(plansCollection);

      const plansList = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as JobPlan[];

      setJobPlans(plansList);
    } catch (error) {
      console.error("Error fetching job plans:", error);
      setJobPlansError("Failed to fetch job plans. Please check the console for more details.");
      setJobPlans([]); // Clear plans on error
    } finally {
      setJobPlansLoading(false);
    }
  };

  // Refetch job plans after any change
  const refreshJobPlans = async () => {
    await fetchJobPlans();
  };

  const handleAddFeature = () => {
    if (!newFeature.trim()) return;
    
    if (isEditingPlan && selectedPlanForEdit) {
      setSelectedPlanForEdit({
        ...selectedPlanForEdit,
        features: [...selectedPlanForEdit.features, newFeature]
      });
    } else {
      setNewJobPlan({
        ...newJobPlan,
        features: [...newJobPlan.features, newFeature]
      });
    }
    
    setNewFeature("");
  };

  const handleRemoveFeature = (index: number) => {
    if (isEditingPlan && selectedPlanForEdit) {
      const updatedFeatures = [...selectedPlanForEdit.features];
      updatedFeatures.splice(index, 1);
      setSelectedPlanForEdit({
        ...selectedPlanForEdit,
        features: updatedFeatures
      });
    } else {
      const updatedFeatures = [...newJobPlan.features];
      updatedFeatures.splice(index, 1);
      setNewJobPlan({
        ...newJobPlan,
        features: updatedFeatures
      });
    }
  };

  const handleCreateJobPlan = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (!db) throw new Error("Firestore is not initialized.");
      const planData = {
        ...newJobPlan,
        price: Number(newJobPlan.price),
        duration: Number(newJobPlan.duration),
        currency: "USDT", // Force currency to USDT
        createdAt: new Date().toISOString(),
      };
      await addDoc(collection(db, "jobPlans"), planData);
      setNewJobPlan({
        name: "",
        description: "",
        price: 70,
        currency: "USDT",
        features: [],
        duration: 30,
        isPremium: false,
        isTopListed: false
      });
      await refreshJobPlans();
      alert("Job plan created successfully!");
    } catch (error) {
      console.error("Error creating job plan:", error);
      alert("Failed to create job plan. Please check the console for details.");
    }
  };

  const handleUpdateJobPlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlanForEdit) return;
    try {
      if (!db) throw new Error("Firestore is not initialized.");
      const planData = {
        ...selectedPlanForEdit,
        price: Number(selectedPlanForEdit.price),
        duration: Number(selectedPlanForEdit.duration),
        currency: "USDT", // Force currency to USDT
        updatedAt: new Date().toISOString(),
      };
      const { id, ...updateData } = planData;
      await updateDoc(doc(db, "jobPlans", id), updateData);
      setSelectedPlanForEdit(null);
      setIsEditingPlan(false);
      await refreshJobPlans();
      alert("Job plan updated successfully!");
    } catch (error) {
      console.error("Error updating job plan:", error);
      alert("Failed to update job plan. Please check the console for details.");
    }
  };

  const handleDeleteJobPlan = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this job plan?")) return;
    try {
      if (!db) throw new Error("Firestore is not initialized.");
      await deleteDoc(doc(db, "jobPlans", id));
      await refreshJobPlans();
      alert("Job plan deleted successfully!");
    } catch (error) {
      console.error("Error deleting job plan:", error);
      alert("Failed to delete job plan.");
    }
  };

  const handleEditPlan = (plan: JobPlan) => {
    setSelectedPlanForEdit(plan);
    setIsEditingPlan(true);
  };

  const handleCancelEdit = () => {
    setSelectedPlanForEdit(null);
    setIsEditingPlan(false);
  };

  const handleJobPlanInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    // Handle checkboxes
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      
      if (isEditingPlan && selectedPlanForEdit) {
        setSelectedPlanForEdit({
          ...selectedPlanForEdit,
          [name]: checked
        });
      } else {
        setNewJobPlan({
          ...newJobPlan,
          [name]: checked
        });
      }
      return;
    }
    
    // Handle other inputs
    if (isEditingPlan && selectedPlanForEdit) {
      setSelectedPlanForEdit({
        ...selectedPlanForEdit,
        [name]: value
      });
    } else {
      setNewJobPlan({
        ...newJobPlan,
        [name]: value
      });
    }
  };

  const fetchJobs = async () => {
    setJobsLoading(true);
    setJobsError(null);
    try {
      if (!db) {
        console.error("Firestore is not initialized.");
        throw new Error("Firestore is not initialized.");
      }

      const jobsCollection = collection(db, "jobs"); // Ensure the collection name matches Firestore
      const querySnapshot = await getDocs(jobsCollection);

      const jobsList = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      setJobs(jobsList);
    } catch (error) {
      console.error("Error fetching jobs:", error);
      setJobsError("Failed to fetch jobs. Please check the console for more details.");
      setJobs([]); // Clear jobs on error
    } finally {
      setJobsLoading(false);
    }
  };

  // Call fetchJobs when the "Jobs List" tab is active
  useEffect(() => {
    if (activeTab === "jobs" && activeSubTab === "list") {
      fetchJobs();
    }
  }, [activeTab, activeSubTab]);

  // Load plans when the 'prices' tab is selected
  useEffect(() => {
    if (activeTab === "jobs" && activeSubTab === "prices") {
      fetchJobPlans();
    }
  }, [activeTab, activeSubTab]);

  const handleCreateJob = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newJob.title || !newJob.companyName || !newJob.description || !newJob.sourceLink) {
      alert("Please fill in all required fields!");
      return;
    }
    setCreatingJob(true);
    try {
      if (!db) {
        throw new Error("Firestore is not initialized.");
      }

      const jobData = {
        ...newJob,
        fromExternalSource: true, // Mark as created from the admin panel
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // Set expiration date to 30 days from now
      };

      await addDoc(collection(db, "jobs"), jobData);

      setNewJob({
        title: "",
        companyName: "",
        description: "",
        location: "",
        salary: "",
        sourceLink: "",
      });

      fetchJobs(); // Refresh the jobs list
      alert("Job created successfully!");
    } catch (error) {
      console.error("Error creating job:", error);
      alert("Failed to create job. Please check the console for details.");
    } finally {
      setCreatingJob(false);
    }
  };

  const handleDeleteJob = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this job?")) return;
    setDeletingJobId(id);
    try {
      if (!db) {
        console.error("Firestore is not initialized.");
        return;
      }
      await deleteDoc(doc(db, "jobs", id));
      fetchJobs();
      alert("Job deleted successfully!");
    } catch (error) {
      console.error("Error deleting job:", error);
      alert("Failed to delete job.");
    } finally {
      setDeletingJobId(null);
    }
  };

  // --- Airdrops State and Handlers ---
  const [learn2earns, setLearn2Earns] = useState<any[]>([]);
  const [learn2earnLoading, setLearn2EarnLoading] = useState(false);
  const [learn2earnError, setLearn2EarnError] = useState<string | null>(null);
  const [deletingLearn2EarnId, setDeletingLearn2EarnId] = useState<string | null>(null);
  const [pausingLearn2EarnId, setPausingLearn2EarnId] = useState<string | null>(null);
  
  // State for learn2earn contract management (changed from airdrop)
  const [networkContract, setNetworkContract] = useState({
    network: "sepolia",
    contractAddress: "",
    type: "", // Added type field
  });
  const [networkContracts, setNetworkContracts] = useState<any[]>([]);
  const [isAddingContract, setIsAddingContract] = useState(false);
  const [contractActionError, setContractActionError] = useState<string | null>(null);

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

  // Fetch smart contract configurations from Firestore
  const fetchNetworkContracts = async () => {
    try {
      if (!db) {
        throw new Error("Firestore is not initialized.");
      }

      console.log("Fetching network contracts from Firestore...");
      
      const settingsDoc = doc(db, "settings", "learn2earn");
      const settingsSnapshot = await getDoc(settingsDoc);

      if (!settingsSnapshot.exists()) {
        console.log("No network contracts found in Firestore");
        setNetworkContracts([]);
        return;
      }

      const contracts = settingsSnapshot.data().contracts || [];

      console.log("Fetched network contracts:", contracts.length);
      setNetworkContracts(contracts);
    } catch (error) {
      console.error("Error fetching network contracts:", error);
      // Show the error but don't clear existing contracts
      alert("Failed to fetch network contracts. Check console for details.");
    }
  };

  const validateContract = async (network: string, contractAddress: string): Promise<boolean> => {
    try {
      if (!ethers.utils.isAddress(contractAddress)) {
        alert("Invalid contract address format. Please enter a valid Ethereum address.");
        return false;
      }
  
      // Configure a provider for the selected network
      let providerUrl;
      switch(network) {
        case "ethereum": providerUrl = "https://mainnet.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161"; break; // Public Infura endpoint
        case "polygon": providerUrl = "https://polygon-rpc.com"; break;
        case "bsc": providerUrl = "https://bsc-dataseed.binance.org/"; break;
        case "arbitrum": providerUrl = "https://arb1.arbitrum.io/rpc"; break;
        case "optimism": providerUrl = "https://mainnet.optimism.io"; break;
        case "avalanche": providerUrl = "https://api.avax.network/ext/bc/C/rpc"; break;
        case "sepolia": providerUrl = "https://rpc.sepolia.org"; break;
        case "mumbai": providerUrl = "https://rpc-mumbai.maticvigil.com"; break;
        case "bscTestnet": providerUrl = "https://data-seed-prebsc-1-s1.binance.org:8545/"; break;
        default: providerUrl = "https://rpc.sepolia.org"; break;
      }
  
      const provider = new ethers.providers.JsonRpcProvider(providerUrl);
      
      try {
        // Check if the address contains contract code
        const code = await provider.getCode(contractAddress);
        if (code === "0x") {
          alert("The address does not contain a valid contract. Make sure the contract is deployed on the selected network.");
          return false;
        }
      } catch (error) {
        console.error("Error checking contract code:", error);
        alert(`Cannot verify contract on the ${network} network. Please check if the network is accessible.`);
        return false;
      }
  
      return true; // Validation passed
    } catch (error) {
      console.error("Error validating contract:", error);
      alert("Failed to validate the contract. Check the console for details.");
      return false;
    }
  };
  
  const handleAddNetworkContract = async (e: React.FormEvent) => {
    e.preventDefault();
  
    if (!networkContract.network || !networkContract.contractAddress || !networkContract.type) {
      alert("Please fill in all fields.");
      return;
    }
  
    const isValid = await validateContract(networkContract.network, networkContract.contractAddress);
    if (!isValid) {
      return;
    }
  
    setIsAddingContract(true);
    setContractActionError(null);
  
    try {
      const settingsDoc = doc(db, "settings", "learn2earn");
      const settingsSnapshot = await getDoc(settingsDoc);
  
      let existingContracts = [];
      if (settingsSnapshot.exists()) {
        existingContracts = settingsSnapshot.data().contracts || [];
      }
  
      const isDuplicate = existingContracts.some(
        (contract: any) => contract.network === networkContract.network
      );
  
      if (isDuplicate) {
        const confirmReplace = window.confirm("A contract for this network already exists. Do you want to replace it?");
        if (!confirmReplace) {
          return;
        }

        // Remove the existing contract for this network
        existingContracts = existingContracts.filter(
          (contract: any) => contract.network !== networkContract.network
        );
      }
  
      const newContract = {
        network: networkContract.network,
        contractAddress: networkContract.contractAddress,
        type: networkContract.type,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
  
      existingContracts.push(newContract);
  
      await setDoc(settingsDoc, { contracts: existingContracts }, { merge: true });
  
      setNetworkContract({ network: "", contractAddress: "", type: "" });
      alert("Network contract added successfully.");
      fetchNetworkContracts();
    } catch (error) {
      console.error("Error adding network contract:", error);
      setContractActionError("Failed to add network contract. Please try again.");
    } finally {
      setIsAddingContract(false);
    }
  };

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

  // Handle changing network contract input
  const handleNetworkContractChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setNetworkContract(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  // Load airdrops when the Airdrops tab is active
  useEffect(() => {
    if (activeTab === "learn2earn") { // Changed from airdrops
      if (activeSubTab === "list") {
        fetchLearn2Earns();
      } else if (activeSubTab === "contracts") {
        fetchNetworkContracts();
      }
    }
  }, [activeTab, activeSubTab]);

  // Helper function for formatting timestamps
  const formatFirestoreTimestamp = (timestamp: any) => {
    if (!timestamp) return 'N/A';
    
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

  return (
    <Layout>
      <main className="min-h-screen flex bg-gradient-to-br from-orange-900 to-black text-white min-h-screen">
        {/* Sidebar */}
        <aside className="w-1/4 bg-black/70 p-6 flex flex-col items-start min-h-screen">
          <div className="flex flex-col items-center mb-6">
          </div>
            {/* Foto do Usuário */}
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
            {/* Admin Dashboard Title */}
            <h2 className="text-orange-400 text-xl font-bold mb-2">Admin Dashboard</h2>
                        {/* User Name and Role */}
            <div className="text-left mb-6">
              <p className="text-lg font-semibold text-white">Welcome {userName}!</p>
              <p className="text-sm text-orange-400">Role: {role}</p>
            </div>

            {/* Add spacing between role and buttons */}
            <div className="mt-4"></div>
          {/* Desktop menu */}
          <ul className="space-y-4 w-full block">
            {hasPermission('canEditContent') && (
              <li>
                <div
                  className={`cursor-pointer p-3 rounded-lg text-center ${
                    isClient && activeTab === "nfts" ? "bg-orange-500 text-white" : "bg-black/50 text-gray-300"
                  }`}
                  onClick={() => {
                    setActiveTab("nfts");
                    setActiveSubTab("add");
                  }}
                >
                  Manage NFTs
                </div>
                {isClient && activeTab === "nfts" && (
                  <ul className="ml-4 mt-2 space-y-2">
                    <li
                      className={`cursor-pointer p-2 rounded-lg text-center ${
                        activeSubTab === "add" ? "bg-orange-500 text-white" : "bg-black/50 text-gray-300"
                      }`}
                      onClick={() => setActiveSubTab("add")}
                    >
                      Add NFT
                    </li>
                    <li
                      className={`cursor-pointer p-2 rounded-lg text-center ${
                        activeSubTab === "delete" ? "bg-orange-500 text-white" : "bg-black/50 text-gray-300"
                      }`}
                      onClick={() => setActiveSubTab("delete")}
                    >
                      Delete NFT
                    </li>
                    <li
                      className={`cursor-pointer p-2 rounded-lg text-center ${
                        activeSubTab === "deleteAll" ? "bg-orange-500 text-white" : "bg-black/50 text-gray-300"
                      }`}
                      onClick={() => setActiveSubTab("deleteAll")}
                    >
                      Delete All NFTs
                    </li>
                  </ul>
                )}
              </li>
            )}

            {(hasPermission('canManageUsers') || hasPermission('canApproveCompanies') || hasPermission('canEditContent')) && (
              <li>
                <div
                  className="cursor-pointer p-3 rounded-lg text-center bg-black/50 text-gray-300 hover:bg-orange-500 hover:text-white"
                  onClick={() => {
                    setActiveTab("users");
                    setActiveSubTab("employers-list");
                  }}
                >
                  Manage Users
                </div>
                {activeTab === "users" && (
                  <ul className="ml-4 mt-2 space-y-2">
                    <li
                      className="cursor-pointer p-2 rounded-lg text-center bg-black/50 text-gray-300 hover:bg-orange-500 hover:text-white"
                      onClick={() => setActiveSubTab("employers-list")}
                    >
                      Employers - List
                    </li>
                    {hasPermission('canApproveCompanies') && (
                      <li
                        className="cursor-pointer p-2 rounded-lg text-center bg-black/50 text-gray-300 hover:bg-orange-500 hover:text-white"
                        onClick={() => setActiveSubTab("employers-approve")}
                      >
                        Approve Companies
                      </li>
                    )}
                    {hasPermission('canEditContent') && (
                      <li
                        className="cursor-pointer p-2 rounded-lg text-center bg-black/50 text-gray-300 hover:bg-orange-500 hover:text-white"
                        onClick={() => setActiveSubTab("seekers")}
                      >
                        Seekers
                      </li>
                    )}
                  </ul>
                )}
              </li>
            )}

            <li>
              <div
                className={`cursor-pointer p-3 rounded-lg text-center ${
                  activeTab === "jobs" ? "bg-orange-500 text-white" : "bg-black/50 text-gray-300"
                }`}
                onClick={() => {
                  setActiveTab("jobs");
                  setActiveSubTab("list");
                }}
              >
                Manage Jobs
              </div>
              {activeTab === "jobs" && (
                <ul className="ml-4 mt-2 space-y-2">
                  <li
                    className={`cursor-pointer p-2 rounded-lg text-center ${
                      activeSubTab === "list" ? "bg-orange-500 text-white" : "bg-black/50 text-gray-300"
                    }`}
                    onClick={() => setActiveSubTab("list")}
                  >
                    Jobs List
                  </li>
                  <li
                    className={`cursor-pointer p-2 rounded-lg text-center ${
                      activeSubTab === "create" ? "bg-orange-500 text-white" : "bg-black/50 text-gray-300"
                    }`}
                    onClick={() => setActiveSubTab("create")}
                  >
                    Create Job
                  </li>
                  <li
                    className={`cursor-pointer p-2 rounded-lg text-center ${
                      activeSubTab === "prices" ? "bg-orange-500 text-white" : "bg-black/50 text-gray-300"
                    }`}
                    onClick={() => setActiveSubTab("prices")}
                  >
                    Job Pricing
                  </li>
                </ul>
              )}
            </li>

            {/* Instant Jobs tab */}
            <li>
              <div
                className={`cursor-pointer p-3 rounded-lg text-center ${
                  activeTab === "instantJobs" ? "bg-orange-500 text-white" : "bg-black/50 text-gray-300"
                }`}
                onClick={() => {
                  setActiveTab("instantJobs");
                  // Não definir um subtab específico, deixar null para mostrar tudo
                }}
              >
                Manage Instant Jobs
              </div>
            </li>

            {/* Learn2Earn tab */}
            <li>
              <div
                className={`cursor-pointer p-3 rounded-lg text-center ${
                  activeTab === "learn2earn" ? "bg-orange-500 text-white" : "bg-black/50 text-gray-300"
                }`}
                onClick={() => {
                  setActiveTab("learn2earn");
                  setActiveSubTab("list");
                }}
              >
                Learn2Earn
              </div>
              {activeTab === "learn2earn" && (
                <ul className="ml-4 mt-2 space-y-2">
                  <li
                    className={`cursor-pointer p-2 rounded-lg text-center ${
                      activeSubTab === "list" ? "bg-orange-500 text-white" : "bg-black/50 text-gray-300"
                    }`}
                    onClick={() => setActiveSubTab("list")}
                  >
                    Learn2Earn List
                  </li>
                  <li
                    className={`cursor-pointer p-2 rounded-lg text-center ${
                      activeSubTab === "contracts" ? "bg-orange-500 text-white" : "bg-black/50 text-gray-300"
                    }`}
                    onClick={() => setActiveSubTab("contracts")}
                  >
                    Smart Contracts
                  </li>
                </ul>
              )}
            </li>

            <li>
              <div
                className={`cursor-pointer p-3 rounded-lg text-center ${
                  activeTab === "accounting" ? "bg-orange-500 text-white" : "bg-black/50 text-gray-300"
                }`}
                onClick={() => {
                  setActiveTab("accounting");
                  setActiveSubTab(null);
                }}
              >
                Accounting Dashboard
              </div>
            </li>

            <li>
              <div
                className={`cursor-pointer p-3 rounded-lg text-center ${
                  activeTab === "ads" ? "bg-orange-500 text-white" : "bg-black/50 text-gray-300"
                }`}
                onClick={() => {
                  setActiveTab("ads");
                  setActiveSubTab(null);
                }}
              >
                Ads Manager
              </div>
            </li>

            <li>
              <div
                className={`cursor-pointer p-3 rounded-lg text-center ${
                  activeTab === "payments" ? "bg-orange-500 text-white" : "bg-black/50 text-gray-300"
                }`}
                onClick={() => {
                  setActiveTab("payments");
                  setActiveSubTab("config");
                }}
              >
                Payments Management
              </div>
            </li>

            {hasPermission('canAccessSettings') && (
              <li>
                <div
                  className={`cursor-pointer p-3 rounded-lg text-center ${
                    activeTab === "settings" ? "bg-orange-500 text-white" : "bg-black/50 text-gray-300"
                  }`}
                  onClick={() => {
                    setActiveTab("settings");
                    setActiveSubTab("profile");
                  }}
                >
                  Settings
                </div>
                {activeTab === "settings" && (
                  <ul className="ml-4 mt-2 space-y-2">
                    <li
                      className={`cursor-pointer p-2 rounded-lg text-center ${
                        activeSubTab === "profile" ? "bg-orange-500 text-white" : "bg-black/50 text-gray-300"
                      }`}
                      onClick={() => setActiveSubTab("profile")}
                    >
                      My Profile
                    </li>
                    {hasPermission('canManageUsers') && (
                      <li
                        className={`cursor-pointer p-2 rounded-lg text-center ${
                          activeSubTab === "permissions" ? "bg-orange-500 text-white" : "bg-black/50 text-gray-300"
                        }`}
                        onClick={() => setActiveSubTab("permissions")}
                      >
                        Manage Admins & Permissions
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
              onClick={handleLogout}
              className="w-full bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded-lg flex items-center justify-center"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 001 1h12a1 1 0 001-1V4a1 1 0 00-1-1H3zm11 4a1 1 0 10-2 0v4.586l-1.293-1.293a1 1 0 00-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L14 11.586V7z" clipRule="evenodd" />
              </svg>
              Logout
            </button>
          </div>
        </aside>

        <div className="flex-1 p-6">
          {permissionsLoading && (
            <div className="w-full flex justify-center items-center py-10">
              <p className="text-center">Loading permissions...</p>
            </div>
          )}
          
          {/* Mostrar conteúdo apenas se não estiver carregando permissões */}
          {!permissionsLoading && (
            <>
              {/* Add Loading and Error states display */}
              {isLoading && <p className="text-center">Loading...</p>}
              {error && <p className="text-center text-red-500">Error: {error}</p>}

              {activeTab === "users" && (
                <div>
                  <h2 className="text-3xl font-semibold text-orange-500 mb-6 text-left">Manage Users</h2>
                  <p className="text-gray-300 text-left"></p>
                  <div className="mt-6 bg-black/50 p-6 rounded-lg">
                    {/* Lista de empregadores é visível para todos os níveis */}
                    {activeSubTab === "employers-list" && (
                      <div>
                        <div className="flex justify-between items-center mb-4">
                          <h3 className="text-xl text-orange-400">Employers List</h3>
                          <input
                            type="text"
                            placeholder="Search employers..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="border border-gray-300 rounded-lg px-3 py-1 text-black w-1/3"
                          />
                        </div>
                        {/* Formulário para criar novo employer */}
                        <form onSubmit={handleCreateEmployer} className="mb-6 flex gap-2 items-end flex-wrap">
                          <input
                            type="text"
                            name="name"
                            value={newEmployer.name}
                            onChange={handleInputEmployer}
                            placeholder="Name"
                            className="border border-gray-300 rounded-lg px-3 py-1 text-black w-auto"
                            required
                          />
                          <input
                            type="text"
                            name="username"
                            value={newEmployer.username}
                            onChange={handleInputEmployer}
                            placeholder="Username"
                            className="border border-gray-300 rounded-lg px-3 py-1 text-black w-auto"
                            required
                          />
                          <input
                            type="password"
                            name="password"
                            value={newEmployer.password}
                            onChange={handleInputEmployer}
                            placeholder="Password"
                            className="border border-gray-300 rounded-lg px-3 py-1 text-black w-auto"
                            required
                          />
                          <input
                            type="email"
                            name="email"
                            value={newEmployer.email}
                            onChange={handleInputEmployer}
                            placeholder="Email"
                            className="border border-gray-300 rounded-lg px-3 py-1 text-black w-auto"
                            required
                          />
                          <input
                            type="text"
                            name="companyName"
                            value={newEmployer.companyName}
                            onChange={handleInputEmployer}
                            placeholder="Company Name"
                            className="border border-gray-300 rounded-lg px-3 py-1 text-black w-auto"
                            required
                          />
                          <input
                            type="text"
                            name="companySize"
                            value={newEmployer.companySize}
                            onChange={handleInputEmployer}
                            placeholder="Company Size"
                            className="border border-gray-300 rounded-lg px-3 py-1 text-black w-auto"
                          />
                          <input
                            type="text"
                            name="industry"
                            value={newEmployer.industry}
                            onChange={handleInputEmployer}
                            placeholder="Industry"
                            className="border border-gray-300 rounded-lg px-3 py-1 text-black w-auto"
                          />
                          <button
                            type="submit"
                            className="bg-orange-500 text-white px-4 py-1 rounded-lg hover:bg-orange-600 disabled:opacity-60 w-auto"
                            disabled={creatingEmployer}
                          >
                            {creatingEmployer ? 'Creating...' : 'Create Employer'}
                          </button>
                        </form>
                        {filteredEmployers.length === 0 ? (
                          <p>No employers found.</p>
                        ) : (
                          <ul>
                            {filteredEmployers.map((employer) => (
                              <li key={employer.id}>
                                {/* Render employer details here */}
                                {employer.name} - {employer.email}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    )}
                    {/* Aprovação de empresas pendentes */}
                    {activeSubTab === "employers-approve" && hasPermission('canApproveCompanies') && (
                      <div>
                        <h3 className="text-xl text-orange-400 mb-4">Pending Companies for Approval</h3>
                        {pendingCompanies.length === 0 ? (
                          <p>No pending companies found.</p>
                        ) : (
                          <ul className="space-y-4">
                            {pendingCompanies.map((company) => (
                              <li key={company.id} className="bg-black/30 p-4 rounded-lg border border-gray-700 flex flex-col md:flex-row md:items-center md:justify-between">
                                <div>
                                  <p className="text-lg font-semibold text-orange-300">{company.companyName}</p>
                                  <p className="text-gray-300 text-sm">Email: {company.email}</p>
                                  <p className="text-gray-300 text-sm">Industry: {company.industry}</p>
                                  <p className="text-gray-300 text-sm">Employees: {company.employees}</p>
                                  <p className="text-gray-300 text-sm">Submitted: {company.createdAt ? new Date(company.createdAt).toLocaleString() : ''}</p>
                                </div>
                                <div className="flex gap-2 mt-2 md:mt-0">
                                  <button
                                    className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
                                    onClick={() => handleApproveCompany(company.id)}
                                  >
                                    Approve
                                  </button>
                                  <button
                                    className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
                                    onClick={() => handleApproval(company.id, false)}
                                  >
                                    Reject
                                  </button>
                                </div>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    )}
                    {/* Mostrar subtab "seekers" apenas se tiver permissão */}
                    {activeSubTab === "seekers" && hasPermission('canEditContent') && (
                      <div>
                        <form onSubmit={handleCreateSeeker} className="mb-6 flex gap-2 items-end flex-wrap">
                          <input
                            type="text"
                            name="name"
                            value={newSeeker.name}
                            onChange={handleInputSeeker}
                            placeholder="Name"
                            className="border border-gray-300 rounded-lg px-3 py-1 text-black w-auto"
                            required
                          />
                          <input
                            type="text"
                            name="username"
                            value={newSeeker.username}
                            onChange={handleInputSeeker}
                            placeholder="Username"
                            className="border border-gray-300 rounded-lg px-3 py-1 text-black w-auto"
                            required
                          />
                          <input
                            type="password"
                            name="password"
                            value={newSeeker.password}
                            onChange={handleInputSeeker}
                            placeholder="Password"
                            className="border border-gray-300 rounded-lg px-3 py-1 text-black w-auto"
                            required
                          />
                          <input
                            type="email"
                            name="email"
                            value={newSeeker.email}
                            onChange={handleInputSeeker}
                            placeholder="Email"
                            className="border border-gray-300 rounded-lg px-3 py-1 text-black w-auto"
                            required
                          />
                          <button
                            type="submit"
                            className="bg-orange-500 text-white px-4 py-1 rounded-lg hover:bg-orange-600 disabled:opacity-60 w-auto"
                            disabled={creatingSeeker}
                          >
                            {creatingSeeker ? 'Creating...' : 'Add'}
                          </button>
                        </form>
                        <h3 className="text-xl text-orange-400 mb-2 text-left">Existing Seekers</h3>
                        {seekersLoading && <p className="text-gray-400 text-left">Loading seekers...</p>}
                        {seekersError && <p className="text-red-400 text-left">{seekersError}</p>}
                        <ul className="mb-4">
                          {seekers.map((seeker) => (
                            <li key={seeker.id} className="flex items-center justify-between text-white mb-1">
                              <span className="text-left">
                                {seeker.name} <span className="text-gray-400">({seeker.email})</span>
                              </span>
                              <button
                                onClick={() => handleDeleteSeeker(seeker.id)}
                                className="ml-2 px-2 py-1 bg-red-600 rounded hover:bg-red-700 text-xs disabled:opacity-60"
                                disabled={deletingSeekerId === seeker.id}
                              >
                                {deletingSeekerId === seeker.id ? 'Deleting...' : 'Delete'}
                              </button>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    
                    {!activeSubTab && <p className="text-gray-400 text-left">Select a category to manage users.</p>}
                  </div>
                </div>
              )}

              {/* Mostrar tab "settings" apenas se tiver permissão */}
              {activeTab === "settings" && hasPermission('canAccessSettings') && (
                <div>
                  <h2 className="text-3xl font-semibold text-orange-500 mb-6 text-left">Settings</h2>
                  <div className="mt-6 bg-black/50 p-6 rounded-lg">

                    {/* Render My Profile Form */}
                    {activeSubTab === "profile" && (
                      <div>
                        <h3 className="text-xl text-orange-400 mb-4 text-left">My Profile</h3>
                        {profileLoading && <p>Loading profile...</p>}
                        {profileError && <p className="text-red-400 mb-4">{profileError}</p>}
                        {!profileLoading && (
                          <form onSubmit={handleUpdateProfile} className="space-y-4">
                            {/* Read-only fields */}
                            <div>
                              <label className="block text-sm font-medium text-gray-300">Name</label>
                              <input type="text" value={profileData.name} readOnly className="mt-1 block w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md shadow-sm text-gray-400 cursor-not-allowed" />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-300">Username</label>
                              <input type="text" value={profileData.username} readOnly className="mt-1 block w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md shadow-sm text-gray-400 cursor-not-allowed" />
                            </div>
                             <div>
                              <label className="block text-sm font-medium text-gray-300">Email</label>
                              <input type="email" value={profileData.email} readOnly className="mt-1 block w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md shadow-sm text-gray-400 cursor-not-allowed" />
                            </div>
                             <div>
                              <label className="block text-sm font-medium text-gray-300">Role</label>
                              <input type="text" value={profileData.role} readOnly className="mt-1 block w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md shadow-sm text-gray-400 cursor-not-allowed" />
                            </div>

                            {/* Editable fields */}
                             <div>
                              <label className="block text-sm font-medium text-gray-300 mb-1">Last Name (Apelido)</label>
                              <input
                                type="text"
                                name="lastName"
                                value={profileData.lastName}
                                onChange={handleProfileInputChange}
                                placeholder="Your last name"
                                className="mt-1 block w-full px-3 py-2 bg-black border border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500 text-white"
                              />
                            </div>
                             <div>
                              <label className="block text-sm font-medium text-gray-300 mb-1">Address</label>
                              <input
                                type="text"
                                name="address"
                                value={profileData.address}
                                onChange={handleProfileInputChange}
                                placeholder="Your address"
                                className="mt-1 block w-full px-3 py-2 bg-black border border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500 text-white"
                              />
                            </div>
                             <div>
                              <label className="block text-sm font-medium text-gray-300 mb-1">Country</label>
                              <input
                                type="text"
                                name="country"
                                value={profileData.country}
                                onChange={handleProfileInputChange}
                                placeholder="Your country"
                                className="mt-1 block w-full px-3 py-2 bg-black border border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500 text-white"
                              />
                            </div>
                             <div>
                              <label className="block text-sm font-medium text-gray-300 mb-1">Phone</label>
                              <input
                                type="tel"
                                name="phone"
                                value={profileData.phone}
                                onChange={handleProfileInputChange}
                                placeholder="Your phone number"
                                className="mt-1 block w-full px-3 py-2 bg-black border border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500 text-white"
                              />
                            </div>
                            <hr className="border-gray-600"/>
                             <div>
                              <label className="block text-sm font-medium text-gray-300 mb-1">New Password (leave blank to keep current)</label>
                              <input
                                type="password"
                                name="password"
                                value={profileData.password}
                                onChange={handleProfileInputChange}
                                placeholder="New Password"
                                className="mt-1 block w-full px-3 py-2 bg-black border border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500 text-white"
                              />
                            </div>
                             <div>
                              <label className="block text-sm font-medium text-gray-300 mb-1">Confirm New Password</label>
                              <input
                                type="password"
                                name="confirmPassword"
                                value={profileData.confirmPassword}
                                onChange={handleProfileInputChange}
                                placeholder="Confirm New Password"
                                className="mt-1 block w-full px-3 py-2 bg-black border border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500 text-white"
                                disabled={!profileData.password} // Disable if new password is blank
                              />
                            </div>

                            <button
                              type="submit"
                              className="bg-orange-500 text-white px-4 py-2 rounded-lg hover:bg-orange-600 disabled:opacity-60 w-auto"
                              disabled={profileUpdating}
                            >
                              {profileUpdating ? 'Updating...' : 'Update Profile'}
                            </button>
                          </form>
                        )}
                      </div>
                    )}

                    {/* Render Combined Admin Management */}
                    {activeSubTab === "permissions" && hasPermission('canManageUsers') && (
                      <div className="space-y-8">
                        {/* Admin Creation Form */}
                        <div>
                          <h3 className="text-xl text-orange-400 mb-4 text-left">Create New Admin</h3>
                          <form onSubmit={handleCreateAdmin} className="mb-6 flex gap-2 items-end flex-wrap">
                            <input
                              type="text"
                              name="name"
                              value={newAdmin.name}
                              onChange={handleInputAdmin}
                              placeholder="Name"
                              className="border border-gray-300 rounded-lg px-3 py-1 text-black w-auto"
                              required
                            />
                            <input
                              type="text"
                              name="username"
                              value={newAdmin.username}
                              onChange={handleInputAdmin}
                              placeholder="Username"
                              className="border border-gray-300 rounded-lg px-3 py-1 text-black w-auto"
                              required
                            />
                            <input
                              type="password"
                              name="password"
                              value={newAdmin.password}
                              onChange={handleInputAdmin}
                              placeholder="Password"
                              className="border border-gray-300 rounded-lg px-3 py-1 text-black w-auto"
                              required
                            />
                            <input
                              type="email"
                              name="email"
                              value={newAdmin.email}
                              onChange={handleInputAdmin}
                              placeholder="Email"
                              className="border border-gray-300 rounded-lg px-3 py-1 text-black w-auto"
                              required
                            />
                            {/* UPDATED Role Input to Select Dropdown using defined array */}
                            <select
                              name="role"
                              value={newAdmin.role} // Controlled component
                              onChange={handleInputAdmin}
                              className="border border-gray-300 rounded-lg px-3 py-1 text-black w-auto"
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
                              className="bg-orange-500 text-white px-4 py-1 rounded-lg hover:bg-orange-600 disabled:opacity-60 w-auto"
                              disabled={creating}
                            >
                              {creating ? 'Creating...' : 'Add Admin'}
                            </button>
                          </form>
                        </div>

                        {/* Existing Admins List */}
                        <div>
                          <h3 className="text-xl text-orange-400 mb-2 text-left">Existing Admins</h3>
                          {adminsLoading && <p className="text-gray-400 text-left">Loading admins...</p>}
                          {adminsError && <p className="text-red-400 text-left">{adminsError}</p>}
                          <ul className="mb-4">
                            {admins.map((adm) => (
                              <li key={adm.id} className="flex items-center justify-between text-white mb-1">
                              <span className="text-left">{adm.name} <span className="text-gray-400">({adm.username} - {adm.email} - {adm.role})</span></span>
                              <button
                                onClick={() => handleDeleteAdmin(adm.id)}
                                className="ml-2 px-2 py-1 bg-red-600 rounded hover:bg-red-700 text-xs disabled:opacity-60"
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
                    {!hasPermission('canManageUsers') && !activeSubTab && (
                      <p className="text-gray-400 text-left">No settings available for your role.</p>
                    )}
                  </div>
                </div>
              )}

              {/* Mostrar tab "nfts" apenas se tiver permissão */}
              {activeTab === "nfts" && hasPermission('canEditContent') && (
                <div>
                  <h2 className="text-3xl font-semibold text-orange-500 mb-6 text-left">Manage NFTs</h2>
                  {activeSubTab === "add" && (
                    <div className="mb-6">
                      <div className="bg-black/30 p-4 rounded-lg">
                        <form onSubmit={handleAddNFT} className="space-y-4">
                          <input
                            type="text"
                            name="title"
                            value={newNFT.title}
                            onChange={handleInputChange}
                            placeholder="NFT Title"
                            className="w-full border border-gray-300 rounded-lg px-4 py-2 text-black"
                            required
                          />
                          <input
                            type="file"
                            name="image"
                            onChange={handleInputChange}
                            className="w-full border border-gray-300 rounded-lg px-4 py-2 text-black"
                            required
                          />
                          <textarea
                            name="description"
                            value={newNFT.description}
                            onChange={handleInputChange}
                            placeholder="Description"
                            className="w-full border border-gray-300 rounded-lg px-4 py-2 text-black"
                            required
                          />
                          <input
                            type="text"
                            name="value"
                            value={newNFT.value}
                            onChange={handleInputChange}
                            placeholder="Value"
                            className="w-full border border-gray-300 rounded-lg px-4 py-2 text-black"
                            required
                          />
                          <input
                            type="text"
                            name="link"
                            value={newNFT.link || ""}
                            onChange={handleInputChange}
                            placeholder="External Link"
                            className="w-full border border-gray-300 rounded-lg px-4 py-2 text-black"
                          />
                          <button
                            type="submit"
                            className="bg-orange-500 text-white px-4 py-2 rounded-lg hover:bg-orange-600 w-auto"
                          >
                            Add NFT
                          </button>
                        </form>
                      </div>
                    </div>
                  )}
                  {activeSubTab === "delete" && (
                    <div className="mt-6 bg-black/50 p-6 rounded-lg">
                      <h3 className="text-xl text-orange-400 mb-4">Delete NFTs</h3>
                      {!isLoading && !error && nfts.length > 0 ? (
                        <ul className="space-y-4">
                          {nfts.map((nft) => {
                            // Log the ID being used as key
                            console.log(`Rendering NFT item with key: ${nft.id}, Title: ${nft.title}`);
                            return (
                              <li key={nft.id} className="flex items-center justify-between p-3 bg-black/30 rounded-lg">
                                <div className="text-left">
                                  <p className="text-orange-500 font-bold">{nft.title}</p>
                                  <p className="text-gray-300 text-sm">{nft.description}</p>
                                  <p className="text-gray-300 text-sm">Value: {nft.value}</p>
                                </div>
                                <button
                                  onClick={() => handleDeleteNFT(nft.id, nft.imagePath)}
                                  className="ml-4 p-2 bg-red-500 rounded text-white hover:bg-red-600"
                                  disabled={!nft.id}
                                >
                                  Delete
                                </button>
                              </li>
                            );
                          })}
                        </ul>
                      ) : (
                        !isLoading && !error && <p className="text-gray-400 text-center">No NFTs available yet.</p>
                      )}
                    </div>
                  )}
                  {activeSubTab === "deleteAll" && (
                    <div className="mt-6">
                      <button
                        onClick={handleDeleteAllNFTs}
                        className="p-2 bg-red-500 rounded text-white hover:bg-red-600 w-auto"
                      >
                        Delete All NFTs
                      </button>
                    </div>
                  )}
                </div>
              )}
              
              {activeTab === "jobs" && (
                <div>
                  <h2 className="text-3xl font-semibold text-orange-500 mb-6 text-left">Manage Jobs</h2>
                  {activeSubTab === "list" && (
                    <div className="mt-6 bg-black/50 p-6 rounded-lg">
                      <h3 className="text-xl text-orange-400 mb-4">Jobs List</h3>
                      {jobsLoading && <p className="text-gray-400">Loading jobs...</p>}
                      {jobsError && <p className="text-red-400">{jobsError}</p>}
                      {!jobsLoading && !jobsError && jobs.length === 0 && <p className="text-gray-400">No jobs available.</p>}
                      <ul className="space-y-4">
                        {jobs.map((job) => (
                          <li key={job.id} className="flex justify-between items-center p-4 bg-black/30 rounded-lg">
                            <div>
                              <p className="text-orange-500 font-bold">{job.title}</p>
                              <p className="text-gray-300 text-sm">{job.companyName}</p>
                            </div>
                            <button
                              onClick={() => handleDeleteJob(job.id)}
                              className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
                              disabled={deletingJobId === job.id}
                            >
                              {deletingJobId === job.id ? "Deleting..." : "Delete"}
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {activeSubTab === "create" && (
                    <div className="mt-6 bg-black/50 p-6 rounded-lg">
                      <h3 className="text-xl text-orange-400 mb-4">Create Job</h3>
                      <form onSubmit={handleCreateJob} className="space-y-4">
                        <input
                          type="text"
                          name="title"
                          value={newJob.title}
                          onChange={(e) => setNewJob({ ...newJob, title: e.target.value })}
                          placeholder="Job Title"
                          className="w-full border border-gray-300 rounded-lg px-4 py-2 text-black"
                          required
                        />
                        <input
                          type="text"
                          name="companyName"
                          placeholder="Company Name"
                          value={newJob.companyName}
                          onChange={(e) => setNewJob({ ...newJob, companyName: e.target.value })}
                          className="w-full border border-gray-300 rounded-lg px-4 py-2 text-black"
                          required
                        />
                        <textarea
                          name="description"
                          value={newJob.description}
                          onChange={(e) => setNewJob({ ...newJob, description: e.target.value })}
                          placeholder="Job Description"
                          className="w-full border border-gray-300 rounded-lg px-4 py-2 text-black"
                          required
                        />
                        <input
                          type="text"
                          name="location"
                          value={newJob.location}
                          onChange={(e) => setNewJob({ ...newJob, location: e.target.value })}
                          placeholder="Location"
                          className="w-full border border-gray-300 rounded-lg px-4 py-2 text-black"
                        />
                        <input
                          type="text"
                          name="salary"
                          value={newJob.salary}
                          onChange={(e) => setNewJob({ ...newJob, salary: e.target.value })}
                          placeholder="Salary"
                          className="w-full border border-gray-300 rounded-lg px-4 py-2 text-black"
                        />
                        <input
                          type="text"
                          name="sourceLink"
                          value={newJob.sourceLink}
                          onChange={(e) => setNewJob({ ...newJob, sourceLink: e.target.value })}
                          placeholder="Source Link"
                          className="w-full border border-gray-300 rounded-lg px-4 py-2 text-black"
                          required
                        />
                        <button
                          type="submit"
                          className="bg-orange-500 text-white px-4 py-2 rounded-lg hover:bg-orange-600"
                        >
                          Create Job
                        </button>
                      </form>
                    </div>
                  )}
                  {activeSubTab === "prices" && (
                    <div className="mt-6 bg-black/50 p-6 rounded-lg">
                      <h3 className="text-xl text-orange-400 mb-4">Job Post Pricing Plans</h3>
                      {jobPlansLoading && <p className="text-gray-400">Loading plans...</p>}
                      {jobPlansError && <p className="text-red-400">{jobPlansError}</p>}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                        {jobPlans.map((plan) => (
                          <div key={plan.id} className="bg-black/30 p-4 rounded-lg border border-gray-700 hover:border-orange-500 transition-all">
                            <div className="flex justify-between items-start mb-2">
                              <h4 className="text-lg font-semibold text-orange-400">{plan.name}</h4>
                              <span className="text-xl font-bold text-white">{plan.price} USDT</span>
                            </div>
                            <p className="text-gray-300 mb-3 text-sm break-words overflow-hidden">{plan.description}</p>
                            {plan.features.length > 0 && (
                              <div className="mb-4">
                                <p className="text-sm font-medium text-gray-300 mb-1">Features:</p>
                                <ul className="list-disc pl-5 text-sm text-gray-400">
                                  {plan.features.map((feature, idx) => (
                                    <li key={idx} className="break-words">{feature}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            <div className="flex gap-2 mt-4">
                              {plan.isPremium && (
                                <span className="bg-yellow-600/50 text-yellow-300 text-xs px-2 py-1 rounded mr-2">
                                  Premium Plan
                                </span>
                              )}
                              {plan.isTopListed && (
                                <span className="bg-blue-600/50 text-blue-300 text-xs px-2 py-1 rounded">
                                  Top Listed
                                </span>
                              )}
                            </div>
                            <div className="flex gap-2 mt-4">
                              <button 
                                onClick={() => handleEditPlan(plan)}
                                className="bg-orange-500 text-white px-3 py-1 rounded-lg hover:bg-orange-600 text-sm flex-1"
                              >
                                Edit
                              </button>
                              <button 
                                onClick={() => handleDeleteJobPlan(plan.id)}
                                className="bg-red-500 text-white px-3 py-1 rounded-lg hover:bg-red-600 text-sm flex-1"
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                        ))}
                        {jobPlans.length < 5 && (
                          <div 
                            className="bg-black/20 p-4 rounded-lg border border-dashed border-gray-600 hover:border-orange-500 transition-all flex flex-col items-center justify-center cursor-pointer"
                            onClick={() => setIsEditingPlan(true)}
                          >
                            <div className="w-12 h-12 rounded-full bg-black/50 flex items-center justify-center mb-2">
                              <span className="text-gray-300">Add New Plan</span>
                              <span className="text-2xl font-bold text-orange-400">+</span>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Form for creating or editing plans */}
                      {isEditingPlan && (
                        <div className="bg-black/40 p-6 rounded-lg border border-gray-700 mb-8">
                          <h4 className="text-lg font-semibold text-orange-400 mb-4">
                            {selectedPlanForEdit ? `Edit Plan: ${selectedPlanForEdit.name}` : "Create New Plan"}
                          </h4>
                          <form onSubmit={selectedPlanForEdit ? handleUpdateJobPlan : handleCreateJobPlan} className="space-y-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-300 mb-1">Plan Name</label>
                              <input
                                type="text"
                                name="name"
                                value={selectedPlanForEdit ? selectedPlanForEdit.name : newJobPlan.name}
                                onChange={handleJobPlanInputChange}
                                placeholder="Basic Plan, Premium Plan, etc."
                                className="w-full border border-gray-600 rounded-lg px-3 py-2 bg-black/50 text-white"
                                required
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-300 mb-1">Price</label>
                              <div className="flex">
                                <input
                                  type="number"
                                  name="price"
                                  value={selectedPlanForEdit ? selectedPlanForEdit.price : newJobPlan.price}
                                  onChange={handleJobPlanInputChange}
                                  placeholder="70"
                                  className="w-full border border-gray-600 rounded-lg px-3 py-2 bg-black/50 text-white"
                                  required
                                  min="0"
                                  step="any"
                                />
                                <select
                                  name="currency"
                                  value={selectedPlanForEdit ? selectedPlanForEdit.currency : newJobPlan.currency}
                                  onChange={handleJobPlanInputChange}
                                  className="border border-gray-600 border-l-0 rounded-r-lg px-3 py-2 bg-black/50 text-white"
                                  disabled
                                >
                                  <option value="USDT">USDT</option>
                                </select>
                              </div>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-300 mb-1">Description</label>
                              <textarea
                                name="description"
                                value={selectedPlanForEdit ? selectedPlanForEdit.description : newJobPlan.description}
                                onChange={handleJobPlanInputChange}
                                placeholder="Short description of what this plan includes"
                                className="w-full border border-gray-600 rounded-lg px-3 py-2 bg-black/50 text-white"
                                rows={3}
                                required
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-300 mb-1">Duration (days)</label>
                              <input
                                type="number"
                                name="duration"
                                value={selectedPlanForEdit ? selectedPlanForEdit.duration : newJobPlan.duration}
                                onChange={handleJobPlanInputChange}
                                placeholder="30"
                                className="w-full border border-gray-600 rounded-lg px-3 py-2 bg-black/50 text-white"
                                required
                                min="1"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-300 mb-1">Features</label>
                              <div className="flex items-center mb-2">
                                <input
                                  type="text"
                                  value={newFeature}
                                  onChange={(e) => setNewFeature(e.target.value)}
                                  placeholder="Add feature..."
                                  className="flex-grow border border-gray-600 rounded-l-lg px-3 py-2 bg-black/50 text-white"
                                />
                                <button
                                  type="button"
                                  onClick={handleAddFeature}
                                  className="bg-orange-500 text-white px-3 py-2 rounded-r-lg hover:bg-orange-600"
                                >
                                  Add
                                </button>
                              </div>
                              <ul className="space-y-1 max-h-40 overflow-y-auto bg-black/30 p-2 rounded-lg">
                                {(selectedPlanForEdit ? selectedPlanForEdit.features : newJobPlan.features).map((feature, idx) => (
                                  <li key={idx} className="flex items-center justify-between bg-black/40 px-3 py-1 rounded">
                                    <span className="text-gray-300">{feature}</span>
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveFeature(idx)}
                                      className="text-red-400 hover:text-red-600 ml-2 focus:outline-none"
                                    >
                                      &times;
                                    </button>
                                  </li>
                                ))}
                              </ul>
                            </div>
                            <div className="flex space-x-4 mb-2">
                              <div className="flex items-center">
                                <input
                                  type="checkbox"
                                  id="isPremium"
                                  name="isPremium"
                                  checked={selectedPlanForEdit ? selectedPlanForEdit.isPremium : newJobPlan.isPremium}
                                  onChange={handleJobPlanInputChange}
                                  className="mr-2 h-4 w-4"
                                />
                                <label htmlFor="isPremium" className="text-gray-300">Premium Plan</label>
                              </div>
                              <div className="flex items-center">
                                <input
                                  type="checkbox"
                                  id="isTopListed"
                                  name="isTopListed"
                                  checked={selectedPlanForEdit ? selectedPlanForEdit.isTopListed : newJobPlan.isTopListed}
                                  onChange={handleJobPlanInputChange}
                                  className="mr-2 h-4 w-4"
                                />
                                <label htmlFor="isTopListed" className="text-gray-300">Top Listed</label>
                              </div>
                            </div>

                            <div className="flex justify-end gap-2 pt-2">
                              <button
                                type="button"
                                onClick={handleCancelEdit}
                                className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700"
                              >
                                Cancel
                              </button>
                              <button
                                type="submit"
                                className="bg-orange-500 text-white px-4 py-2 rounded-lg hover:bg-orange-600"
                              >
                                {selectedPlanForEdit ? "Update Plan" : "Create Plan"}
                              </button>
                            </div>
                          </form>
                        </div>
                      )}

                      {/* Help information */}
                      {!isEditingPlan && (
                        <div className="bg-black/20 p-4 rounded-lg border border-gray-700 mb-8">
                          <h4 className="text-md font-semibold text-orange-400 mb-2">Job Posting Plans Information</h4>
                          <p className="text-gray-300 text-sm mb-2">
                            These plans will be offered to employers when they want to post a new job.
                          </p>
                          <ul className="list-disc pl-5 text-sm text-gray-400">
                            <li>Set different pricing tiers based on features and duration</li>
                            <li>Mark premium plans to highlight them to users</li>
                            <li>Use "Top Listed" for plans that place jobs at the top of search results</li>
                            <li>All prices are charged in cryptocurrency via your web3 integration</li>
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Renderização do InstantJobsManager quando a aba Instant Jobs estiver ativa */}
              {activeTab === "instantJobs" && (
                <div>
                  <h2 className="text-3xl font-semibold text-orange-500 mb-6 text-left">Manage Instant Jobs</h2>
                  <div className="mt-6 bg-black/50 p-6 rounded-lg">
                    <p className="text-gray-300 mb-4">
                      Gerencie trabalhos instantâneos e suas configurações associadas.
                    </p>
                    
                    {/* Componente principal é carregado diretamente sem verificar subtab */}
                    <InstantJobsManager />
                  </div>
                </div>
              )}

              {/* Ads Manager Tab Content */}
              {activeTab === "ads" && (
                <div>
                  <h2 className="text-3xl font-semibold text-orange-500 mb-6 text-left">Ads Manager</h2>
                  <div className="mt-6 bg-black/50 p-6 rounded-lg">
                    <p className="text-gray-300 mb-4">
                      Gerencie campanhas publicitárias e anúncios para exibição no site e aplicativo.
                    </p>
                    
                    {/* Componente principal para gerenciamento de anúncios */}
                    <AdManager />
                  </div>
                </div>
              )}

              {/* Renderização da seção "Smart Contracts" dentro do Learn2Earn na área principal do dashboard */}
              {activeTab === "learn2earn" && activeSubTab === "contracts" && (
                <div>
                  <h2 className="text-3xl font-semibold text-orange-500 mb-6 text-left">Smart Contracts Management</h2>
                  <div className="mt-6 bg-black/50 p-6 rounded-lg">
                    {/* Learn2Earn Fee Management Panel */}
                    <Learn2EarnFeePanel />
                    {/* Formulário para adicionar ou atualizar contratos */}
                    <div className="bg-black/30 p-5 rounded-lg border border-gray-700 mb-6">
                      <h3 className="text-xl text-orange-400 mb-4">Add/Update Network Contract</h3>
                      <form onSubmit={handleAddNetworkContract} className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-1">Network</label>
                          <select
                            name="network"
                            value={networkContract.network}
                            onChange={handleNetworkContractChange}
                            className="w-full border border-gray-600 rounded-lg px-3 py-2 bg-black/50 text-white"
                            required
                          >
                            <option value="sepolia">Sepolia (Ethereum Testnet)</option>
                            <option value="mumbai">Mumbai (Polygon Testnet)</option>
                            <option value="bscTestnet">BSC Testnet</option>
                            <option value="ethereum">Ethereum Mainnet</option>
                            <option value="polygon">Polygon Mainnet</option>
                            <option value="bsc">Binance Smart Chain</option>
                            <option value="arbitrum">Arbitrum</option>
                            <option value="optimism">Optimism</option>
                            <option value="avalanche">Avalanche</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-1">Contract Address</label>
                          <input
                            type="text"
                            name="contractAddress"
                            value={networkContract.contractAddress}
                            onChange={handleNetworkContractChange}
                            placeholder="0x..."
                            className="w-full border border-gray-600 rounded-lg px-3 py-2 bg-black/50 text-white"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-1">Type</label>
                          <input
                            type="text"
                            name="type"
                            value={networkContract.type}
                            onChange={handleNetworkContractChange}
                            placeholder="Contract Type"
                            className="w-full border border-gray-600 rounded-lg px-3 py-2 bg-black/50 text-white"
                            required
                          />
                        </div>
                        {contractActionError && (
                          <p className="text-red-500 text-sm">{contractActionError}</p>
                        )}
                        <button
                          type="submit"
                          className="bg-orange-500 text-white px-4 py-2 rounded-lg hover:bg-orange-600 disabled:opacity-60"
                          disabled={isAddingContract}
                        >
                          {isAddingContract ? 'Processing...' : 'Add/Update Contract'}
                        </button>
                      </form>
                    </div>

                    {/* Lista de contratos existentes */}
                    <div>
                      <h3 className="text-xl text-orange-400 mb-4">Current Smart Contracts</h3>
                      {networkContracts.length === 0 ? (
                        <p className="text-gray-400">No contract configurations found. Add one above.</p>
                      ) : (
                        <div className="space-y-4">
                          {networkContracts.map((contract) => (
                            <div key={contract.id} className="bg-black/30 p-4 rounded-lg border border-gray-700">
                              <div className="flex flex-col md:flex-row justify-between">
                                <div>
                                  <h4 className="text-lg font-medium text-orange-300">
                                    {contract.network.charAt(0).toUpperCase() + contract.network.slice(1)}
                                  </h4>
                                  <p className="text-sm text-gray-300 break-all">
                                    Address: {contract.contractAddress}
                                  </p>
                                  <p className="text-sm text-gray-300 break-all">
                                    Type: {contract.type}
                                  </p>
                                  <p className="text-xs text-gray-400">
                                    Added: {formatFirestoreTimestamp(contract.createdAt)}
                                    {contract.updatedAt && ` (Updated: ${formatFirestoreTimestamp(contract.updatedAt)})`}
                                  </p>
                                </div>
                                <div className="flex mt-3 md:mt-0">
                                  {/* Removido o botão "Edit" pois temos o formulário Add/Update acima */}
                                  <Learn2EarnTestButton 
                                    network={contract.network}
                                    contractAddress={contract.contractAddress}
                                  />
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Seção do Accounting Dashboard */}
              {activeTab === "accounting" && (
                <div>
                  <h2 className="text-3xl font-semibold text-orange-500 mb-6 text-left">Accounting Dashboard</h2>
                  <div className="mt-6">
                    <FinancialDashboard />
                  </div>
                </div>
              )}

              {/* Seção de Configurações de Pagamento */}
              {activeTab === "payments" && activeSubTab === "config" && (
                <div>
                  <h2 className="text-3xl font-semibold text-orange-500 mb-6 text-left">Payment Configuration</h2>
                  <div className="mt-6 bg-black/50 p-6 rounded-lg">
                    <PaymentSettings hasPermission={true} />
                  </div>
                </div>
              )}

              {activeTab === "learn2earn" && activeSubTab === "list" && (
                <div className="mt-6 bg-black/50 p-6 rounded-lg">
                  <h3 className="text-xl text-orange-400 mb-4">Learn2Earn Opportunities</h3>
                  {learn2earnLoading && <p className="text-gray-400">Loading opportunities...</p>}
                  {learn2earnError && <p className="text-red-400">{learn2earnError}</p>}
                  {!learn2earnLoading && !learn2earnError && learn2earns.length === 0 && <p className="text-gray-400">No Learn2Earn opportunities available.</p>}
                  <ul className="space-y-4">
                    {learn2earns.map((l2e) => (
                      <li key={l2e.id} className="flex flex-col md:flex-row md:items-center md:justify-between p-4 bg-black/30 rounded-lg border border-gray-700">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-orange-500 font-bold text-lg">{l2e.title}</span>
                            <span className={`ml-2 px-2 py-1 rounded-full text-xs font-semibold ${l2e.status === 'active' ? 'bg-green-700 text-green-300' : l2e.status === 'paused' ? 'bg-yellow-700 text-yellow-300' : 'bg-gray-700 text-gray-300'}`}>{l2e.status?.toUpperCase()}</span>
                          </div>
                          <div className="text-gray-300 text-sm mb-1">{l2e.description}</div>
                          <div className="flex flex-wrap gap-4 text-xs text-gray-400 mb-1">
                            <span>Network: <b>{l2e.network}</b></span>
                            <span>Token: <b>{l2e.tokenSymbol}</b></span>
                            <span>Amount: <b>{l2e.tokenAmount}</b></span>
                            <span>Per User: <b>{l2e.tokenPerParticipant}</b></span>
                            <span>Participants: <b>{l2e.totalParticipants || 0} / {l2e.maxParticipants || '∞'}</b></span>
                            <span>Start: {formatFirestoreTimestamp(l2e.startDate)}</span>
                            <span>End: {formatFirestoreTimestamp(l2e.endDate)}</span>
                          </div>
                          <div className="text-xs text-gray-500">ID: {l2e.id}</div>
                        </div>
                        <div className="flex flex-col gap-2 mt-4 md:mt-0 md:ml-6 min-w-[160px]">
                          <button
                            className={`px-3 py-1 rounded ${l2e.status === 'active' ? 'bg-yellow-600 hover:bg-yellow-700' : 'bg-green-600 hover:bg-green-700'} text-white`}
                            disabled={pausingLearn2EarnId === l2e.id}
                            onClick={() => handleToggleLearn2EarnStatus(l2e.id, l2e.status)}
                          >
                            {pausingLearn2EarnId === l2e.id
                              ? (l2e.status === 'active' ? 'Pausing...' : 'Activating...')
                              : (l2e.status === 'active' ? 'Pause' : 'Activate')}
                          </button>
                          <button
                            className="px-3 py-1 rounded bg-red-600 hover:bg-red-700 text-white"
                            disabled={deletingLearn2EarnId === l2e.id}
                            onClick={() => handleDeleteLearn2Earn(l2e.id)}
                          >
                            {deletingLearn2EarnId === l2e.id ? 'Deleting...' : 'Delete'}
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </Layout>
  );
};

export default AdminDashboard;