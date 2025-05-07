"use client";

import React, { useState, useEffect, JSX, useCallback } from "react";
import Layout from "../../components/Layout"; // Assuming Layout component exists and is suitable
import { useRouter } from "next/navigation";
import { collection, getDocs, doc, getDoc, updateDoc, query, where, addDoc, serverTimestamp, onSnapshot, orderBy } from "firebase/firestore"; // Add necessary imports
import { db } from "../../lib/firebase"; // Assuming db instance is correctly configured
import instantJobsService, { InstantJob, JobMessage } from '../../services/instantJobsService';
import InstantJobCard from '../../components/instant-jobs/InstantJobCard';
import MessageSystem from '../../components/instant-jobs/MessageSystem';
import { connectWallet, getCurrentAddress, getWeb3Provider } from "../../services/crypto";
import { BellIcon } from '@heroicons/react/24/outline';

// Function to create a notification for seeker
async function createSeekerNotification({
  userId,
  title,
  body,
  type = "general",
  extra = {},
}: {
  userId: string;
  title: string;
  body: string;
  type?: string;
  extra?: Record<string, any>;
}) {
  if (!db) throw new Error("Firestore não inicializado");
  // Fetch seeker's notification preferences
  const seekerRef = doc(db, "seekers", userId);
  const seekerSnap = await getDoc(seekerRef);
  let prefs = { supportReplies: true, instantJobs: true, marketing: false };
  if (seekerSnap.exists() && seekerSnap.data().notificationPreferences) {
    prefs = { ...prefs, ...seekerSnap.data().notificationPreferences };
  }
  // Map notification type to preference key
  const typeToPref: Record<string, keyof typeof prefs> = {
    support: "supportReplies",
    instantJob: "instantJobs",
    marketing: "marketing",
    general: "supportReplies" // fallback: show general as supportReplies
  };
  const prefKey = typeToPref[type] || "supportReplies";
  if (!prefs[prefKey]) return; // Do not send if user opted out
  const notif = {
    userId,
    userType: "seeker",
    title,
    body,
    type,
    read: false,
    createdAt: new Date().toISOString(),
    ...extra,
  };
  await addDoc(collection(db, "notifications"), notif);
}

// Interface for Button component
interface ButtonProps {
  onClick?: () => void;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
}

// Button component
const Button = ({ onClick, children, className = "", disabled = false }: ButtonProps) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={`py-2 px-4 rounded-md ${className}`}
  >
    {children}
  </button>
);

// Interface for Seeker Profile
interface SeekerProfile {
  id: string; // Add id field
  name: string;
  email: string; // Assuming email is stored
  location: string;
  skills: string; // Comma-separated or array? Assuming string for now
  resumeUrl?: string; // Optional field for resume link
  portfolioUrl?: string; // Optional field for portfolio link
  fullName?: string; // Adicionar o campo fullName que está faltando
  // Add other relevant fields as needed
}

// Interface for Job Application (Example)
interface JobApplication {
    id: string;
    jobId: string;
    jobTitle: string;
    companyName: string;
    applicationDate: string; // Consider using Firestore Timestamp
    status: string; // e.g., 'Applied', 'Interviewing', 'Rejected', 'Offered'
}

// Interface for Support Ticket
interface SupportTicket {
  id: string;
  seekerId: string;
  seekerEmail: string;
  area: string;
  subject: string;
  description: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  attachmentUrl?: string;
  acceptedBy?: string;
}

// Interface for Support Message
interface SupportMessage {
  id: string;
  ticketId: string;
  senderId: string;
  senderType: string;
  message: string;
  createdAt: string;
  read?: boolean;
}

// Definição do tipo Notification para tipagem correta
interface Notification {
  id: string;
  userId: string;
  userType: string;
  title: string;
  body: string;
  type?: string;
  read: boolean;
  createdAt: string;
  [key: string]: any;
}

const SeekerDashboard = () => {
  const [activeTab, setActiveTab] = useState("myProfile"); // Default tab
  const [activeSupportTab, setActiveSupportTab] = useState<'new' | 'my'>('new');
  const [userPhoto, setUserPhoto] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [seekerId, setSeekerId] = useState("");
  const [applications, setApplications] = useState<JobApplication[]>([]); // State for applications
  const [seekerProfile, setSeekerProfile] = useState<SeekerProfile>({
    id: "", // Initialize id
    name: "",
    email: "",
    location: "",
    skills: "",
    resumeUrl: "",
    portfolioUrl: "",
  });
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null); // Add state for fetch errors
  const [isMobile, setIsMobile] = useState(false);
  const router = useRouter();

  // Add Web3 state
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [isConnectingWallet, setIsConnectingWallet] = useState(false);
  const [walletError, setWalletError] = useState<string | null>(null);

  // Estados para a funcionalidade de Instant Jobs
  const [instantJobs, setInstantJobs] = useState<InstantJob[]>([]);
  const [availableInstantJobs, setAvailableInstantJobs] = useState<InstantJob[]>([]);
  const [activeSection, setActiveSection] = useState<'available' | 'myJobs' | 'detail'>('available');
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [selectedJob, setSelectedJob] = useState<InstantJob | null>(null);
  const [jobMessages, setJobMessages] = useState<JobMessage[]>([]);
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [isAcceptingJob, setIsAcceptingJob] = useState(false);
  const [isCompletingJob, setIsCompletingJob] = useState(false);

  // Add this new state for job applications
  const [myApplications, setMyApplications] = useState<any[]>([]);
  const [isApplyingForJob, setIsApplyingForJob] = useState(false);
  
  // Support ticket form state
  const [ticketArea, setTicketArea] = useState("");
  const [ticketSubject, setTicketSubject] = useState("");
  const [ticketDescription, setTicketDescription] = useState("");
  const [ticketFile, setTicketFile] = useState<File | null>(null);
  const [ticketLoading, setTicketLoading] = useState(false);
  const [ticketSuccess, setTicketSuccess] = useState("");
  const [ticketError, setTicketError] = useState("");

  // Support ticket areas (dropdown options)
  const supportAreas = [
    "Login/Account",
    "Job Applications",
    "Instant Jobs",
    "Payments",
    "Profile/Settings",
    "Other"
  ];

  // Handle ticket file upload
  const handleTicketFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setTicketFile(e.target.files[0]);
    } else {
      setTicketFile(null);
    }
  };

  // Handle ticket submit
  const handleSubmitTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    setTicketError("");
    setTicketSuccess("");
    setTicketLoading(true);
    try {
      // Upload file if present (optional, can be improved later)
      let attachmentUrl = "";
      if (ticketFile) {
        // Use Firebase Storage helper if available
        const storageModule = await import("../../lib/firebase");
        const { storage } = storageModule;
        const { ref, uploadBytes, getDownloadURL } = await import("firebase/storage");
        const fileRef = ref(storage, `support-tickets/${seekerId}/${Date.now()}-${ticketFile.name}`);
        await uploadBytes(fileRef, ticketFile);
        attachmentUrl = await getDownloadURL(fileRef);
      }
      // Create ticket in Firestore
      const ticketDoc = {
        seekerId,
        seekerEmail: seekerProfile.email,
        area: ticketArea,
        subject: ticketSubject,
        description: ticketDescription,
        attachmentUrl,
        status: "open",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      const docRef = await addDoc(collection(db, "supportTickets"), ticketDoc);
      // Call API to send confirmation email
      await fetch("/api/support/ticket", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...ticketDoc,
          ticketId: docRef.id,
        }),
      });
      setTicketSuccess("Your support ticket has been submitted! You will receive a confirmation email shortly.");
      setTicketArea("");
      setTicketSubject("");
      setTicketDescription("");
      setTicketFile(null);
    } catch (err: any) {
      setTicketError("Failed to submit ticket. Please try again later.");
      console.error("Support ticket error:", err);
    } finally {
      setTicketLoading(false);
    }
  };

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

  // Fetch seeker photo (adapt API endpoint) - Wrapped in useCallback
  const fetchSeekerPhoto = useCallback(async (id: string) => {
    if (!db) {
      console.error("Firestore instance is not initialized.");
      setUserPhoto("/images/default-avatar.png");
      return;
    }

    try {
      const seekerRef = doc(db, "seekers", id);
      const seekerSnap = await getDoc(seekerRef);
      if (seekerSnap.exists()) {
        const data = seekerSnap.data();
        // Check both photoUrl and photoURL for better compatibility
        if (data.photoUrl || data.photoURL) {
          setUserPhoto(data.photoUrl || data.photoURL);
        } else {
          // Fetch default avatar from Firestore
          const defaultAvatarRef = doc(db, "config", "defaultAvatar");
          const defaultAvatarSnap = await getDoc(defaultAvatarRef);
          if (defaultAvatarSnap.exists()) {
            const defaultAvatarData = defaultAvatarSnap.data();
            setUserPhoto(defaultAvatarData.url || "/images/default-avatar.png");
          } else {
            setUserPhoto("/images/default-avatar.png");
          }
        }
      } else {
        setUserPhoto("/images/default-avatar.png");
      }
    } catch (error) {
      console.error("Error fetching seeker photo:", error);
      setUserPhoto("/images/default-avatar.png");
    }
  }, []); // No external dependencies needed within this function

  // Fetch seeker profile data - Wrapped in useCallback
  const fetchSeekerProfile = useCallback(async (id: string) => {
    if (!id || !db) return;
    setIsLoadingProfile(true);
    setFetchError(null); // Reset error on new fetch
    try {
      const seekerRef = doc(db, "seekers", id); // Assuming 'seekers' collection
      const seekerSnap = await getDoc(seekerRef);
      if (seekerSnap.exists()) {
        const data = seekerSnap.data();
        setSeekerProfile({
          id: seekerSnap.id, // Set the id from the document
          name: data.name || "",
          email: data.email || "",
          location: data.location || "",
          skills: data.skills || "",
          resumeUrl: data.resumeUrl || "",
          portfolioUrl: data.portfolioUrl || "",
        });
      } else {
        console.log("No such seeker document!");
        // Initialize profile state with empty strings if document doesn't exist
        setSeekerProfile({ id: "", name: "", email: "", location: "", skills: "", resumeUrl: "", portfolioUrl: "" });
      }
    } catch (error) {
      console.error("Error fetching seeker profile:", error);
      setFetchError("Could not load profile data."); // Set error state
    } finally {
      setIsLoadingProfile(false);
    }
  }, []); // No external dependencies needed within this function

  // Fetch seeker's job applications (Placeholder Logic) - Wrapped in useCallback
  const fetchApplications = useCallback(async (id: string) => {
    if (!id || !db) return;
    setFetchError(null); // Reset error on new fetch
    // This is placeholder logic. You need an 'applications' collection
    // structured to query by seekerId.
    console.log("Fetching applications for seeker:", id);
    try {
        const appsCollection = collection(db, "applications");
        const q = query(appsCollection, where("seekerId", "==", id));
        const appSnapshot = await getDocs(q);
        const fetchedApps: JobApplication[] = appSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        } as JobApplication));
        setApplications(fetchedApps);
        console.log("Fetched applications:", fetchedApps);
    } catch (error) {
        console.error("Error fetching applications:", error);
        setFetchError("Could not load job applications."); // Set error state
        setApplications([]); // Reset on error
    }
  }, []); // No external dependencies needed within this function


  // Check seeker authentication - Updated dependencies
  const checkAuthentication = useCallback(() => {
    // IMPORTANT: This uses localStorage and simple base64 decoding for demonstration.
    // This is NOT secure authentication. Use Firebase Authentication or a similar
    // robust authentication service in a real application.
    try {
      const token = localStorage.getItem("seekerToken"); // Use seekerToken
      if (!token) {
        throw new Error("Seeker token not found");
      }
      const decodedToken = atob(token); // Assuming token is base64 encoded seeker ID
      setSeekerId(decodedToken);
      // Call memoized fetch functions
      fetchSeekerPhoto(decodedToken);
      fetchSeekerProfile(decodedToken);
      fetchApplications(decodedToken);
    } catch (error) {
      console.error("Error decoding seeker token or initial fetch:", error);
      // Redirect immediately if token is invalid or missing
      router.replace("/admin-login"); // Updated to redirect to the new login page
    }
  }, [router, fetchSeekerPhoto, fetchSeekerProfile, fetchApplications]); // Add memoized fetch functions to dependencies

  // Reload data function - Dependencies already correct
  const reloadData = useCallback(async () => {
    console.log("Reloading seeker dashboard data...");
    setFetchError(null); // Reset errors on reload
    if (seekerId) {
      // Call memoized fetch functions
      fetchSeekerPhoto(seekerId);
      fetchSeekerProfile(seekerId);
      fetchApplications(seekerId);
    }
    console.log("Seeker data reloaded!");
  }, [seekerId, fetchSeekerPhoto, fetchSeekerProfile, fetchApplications]); // Add memoized fetch functions

  // Initial data fetch on mount
  useEffect(() => {
    checkAuthentication();
  }, [checkAuthentication]); // Dependency array is correct

  // Reload data when certain tabs are active (optional)
  // Consider if automatic reload on tab change is desired UX
  // useEffect(() => {
  //   if (activeTab === "myApplications" || activeTab === "settings") {
  //      reloadData();
  //   }
  // }, [activeTab, reloadData]);

  // Handle changes in the profile/settings form
  const handleProfileChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setSeekerProfile({ ...seekerProfile, [name]: value ?? "" });
  };

  // Handle seeker photo upload (adapt API endpoint and form data)
  const handleUserPhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && seekerId) {
      const reader = new FileReader();
      reader.onloadend = () => setUserPhoto(reader.result as string);
      reader.readAsDataURL(file);

      setIsUploading(true);
      const formData = new FormData();
      formData.append("file", file);
      formData.append("seekerId", seekerId); // Use seekerId

      try {
        // Adjust API endpoint for seekers
        const response = await fetch("/api/seeker/photo", {
          method: "POST",
          body: formData,
        });
        const responseData = await response.json();
        if (!response.ok) throw new Error(responseData.message || "Failed to upload photo");
        setUserPhoto(responseData.url); // Update photo with URL from server
        console.log("Seeker photo upload successful!");
        // No need to call reloadData() here if only photo changed, unless other profile data depends on it
      } catch (error: any) {
        console.error("Error uploading seeker photo:", error);
        alert(`Failed to upload photo: ${error.message || "Unknown error"}`);
        // Revert photo preview if upload fails? Optional.
        fetchSeekerPhoto(seekerId); // Refetch original photo on error
      } finally {
        setIsUploading(false);
      }
    }
  };

  // Handle seeker logout
  const handleLogout = () => {
    localStorage.removeItem("seekerToken"); // Remove seekerToken
    router.replace("/login");
  };

  // Handle profile update submission
  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!seekerId || !db) {
      alert("Error: Seeker ID not found.");
      return;
    }
    setIsLoadingProfile(true);
    try {
      const seekerRef = doc(db, "seekers", seekerId); // Use 'seekers' collection
      // Prepare data, ensuring no undefined values are sent if not intended
      const profileDataToUpdate = {
        name: seekerProfile.name || "",
        // email: seekerProfile.email || "", // Usually email is not changed here
        location: seekerProfile.location || "",
        skills: seekerProfile.skills || "",
        resumeUrl: seekerProfile.resumeUrl || "",
        portfolioUrl: seekerProfile.portfolioUrl || "",
      };
      await updateDoc(seekerRef, profileDataToUpdate);
      alert("Profile updated successfully!");
    } catch (error) {
      console.error("Error updating seeker profile:", error);
      alert("Error updating profile. Please try again.");
    } finally {
      setIsLoadingProfile(false);
    }
  };

  // Function to connect wallet
  const handleConnectWallet = async () => {
    try {
      setIsConnectingWallet(true);
      setWalletError(null);
      
      // Use the wallet connection function from crypto.ts
      await connectWallet();
      const address = await getCurrentAddress();
      
      if (address) {
        setWalletAddress(address);
        console.log("Wallet connected:", address);
      } else {
        throw new Error("Could not get wallet address");
      }
      return address;
    } catch (error: any) {
      console.error("Failed to connect wallet:", error);
      setWalletError(error.message || "Failed to connect wallet");
      return null;
    } finally {
      setIsConnectingWallet(false);
    }
  };

  // Function to load available Instant Jobs
  const loadAvailableInstantJobs = async () => {
    try {
      const jobs = await instantJobsService.getAvailableInstantJobs();
      setAvailableInstantJobs(jobs);
    } catch (error) {
      console.error("Error loading available micro tasks:", error);
    }
  };
  
  // Function to load my Instant Jobs
  const loadMyInstantJobs = async () => {
    try {
      const jobs = await instantJobsService.getInstantJobsByWorker(seekerId);
      setInstantJobs(jobs);
    } catch (error) {
      console.error("Error loading my micro tasks:", error);
    }
  };
  
  // Function to load messages from an Instant Job
  const loadJobMessages = async (jobId: string) => {
    try {
      const messages = await instantJobsService.getMessages(jobId);
      setJobMessages(messages);
    } catch (error) {
      console.error("Error loading messages:", error);
    }
  };
  
  // Function to send a message
  const handleSendMessage = async (message: string) => {
    if (!selectedJobId || !seekerProfile) return;
    
    setIsSendingMessage(true);
    try {
      await instantJobsService.sendMessage({
        jobId: selectedJobId,
        senderId: seekerId,
        senderName: seekerProfile.fullName || seekerProfile.email,
        senderType: 'worker',
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
  
  // Add function to load worker's job applications
  const loadMyJobApplications = async () => {
    try {
      const applications = await instantJobsService.getWorkerApplications(seekerId);
      setMyApplications(applications);
    } catch (error) {
      console.error("Error loading job applications:", error);
    }
  };

  // Replace handleAcceptJob with handleApplyForJob
  const handleApplyForJob = async (jobId: string) => {
    try {
      setIsApplyingForJob(true);
      
      // Check if user has connected wallet
      let address = walletAddress;
      if (!address) {
        address = await handleConnectWallet();
        if (!address) {
          console.log("Wallet connection required to apply for micro tasks");
          return;
        }
      }
      
      // Apply for the job
      await instantJobsService.applyForInstantJob(
        jobId, 
        seekerId, 
        seekerProfile.fullName || seekerProfile.name || seekerProfile.email,
        address
      );
      
      console.log("Applied for micro task successfully!");
      
      // Reload applications
      await loadMyJobApplications();
      
      // Show notification to user
      alert("Your application has been submitted successfully!");
    } catch (error: any) {
      console.error("Error applying for micro task:", error);
      alert(`Error: ${error.message || "Failed to apply for job"}`);
    } finally {
      setIsApplyingForJob(false);
    }
  };
  
  // Update useEffect to load applications when needed
  useEffect(() => {
    if (activeTab === "instantJobs" && seekerId) {
      loadAvailableInstantJobs();
      loadMyInstantJobs();
      loadMyJobApplications();
    }
  }, [activeTab, seekerId]);
  
  // Carregar instantJobs quando necessário
  useEffect(() => {
    if (activeTab === "instantJobs" && seekerId) {
      loadAvailableInstantJobs();
      loadMyInstantJobs();
    }
  }, [activeTab, seekerId]);
  
  // Carregar detalhes do job quando selecionar um
  useEffect(() => {
    if (selectedJobId) {
      // Verificar primeiro em myInstantJobs
      let job = instantJobs.find(job => job.id === selectedJobId);
      
      // Se não encontrar, verificar em availableInstantJobs
      if (!job) {
        job = availableInstantJobs.find(job => job.id === selectedJobId);
      }
      
      if (job) {
        setSelectedJob(job);
        
        // Só carregar mensagens se a tarefa não estiver no status 'open'
        if (job.status !== 'open') {
          loadJobMessages(selectedJobId);
        }
      }
    }
  }, [selectedJobId, instantJobs, availableInstantJobs]);

  // Render My Applications Tab Content
  const renderMyApplications = () => {
    if (applications.length === 0) {
      return <p className="text-gray-300">You have not applied to any jobs yet.</p>;
    }
    return (
      <div className="space-y-4">
        {applications.map((app) => (
          <div key={app.id} className="bg-black/50 p-4 rounded-lg">
            <h3 className="text-orange-500 font-bold">{app.jobTitle}</h3>
            <p className="text-gray-400 text-sm">Company: {app.companyName}</p>
            <p className="text-gray-300 text-sm">Applied on: {app.applicationDate}</p>
            <p className="text-gray-300 text-sm">Status: <span className="font-semibold">{app.status}</span></p>
            {/* Add link to job details page if available */}
          </div>
        ))}
      </div>
    );
  };

  // Render My Profile Tab Content (Read-only view)
  const renderMyProfile = () => {
    return (
      <div className="bg-black/70 p-10 rounded-lg shadow-lg space-y-4">
        <h2 className="text-3xl font-semibold text-orange-500 mb-6">My Profile</h2>
        <p><span className="font-semibold text-orange-300">Name:</span> {seekerProfile.name}</p>
        <p><span className="font-semibold text-orange-300">Email:</span> {seekerProfile.email}</p>
        <p><span className="font-semibold text-orange-300">Location:</span> {seekerProfile.location}</p>
        <p><span className="font-semibold text-orange-300">Skills:</span> {seekerProfile.skills}</p>
        <p><span className="font-semibold text-orange-300">Resume:</span> {seekerProfile.resumeUrl ? <a href={seekerProfile.resumeUrl} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">{seekerProfile.resumeUrl}</a> : "Not provided"}</p>
        <p><span className="font-semibold text-orange-300">Portfolio:</span> {seekerProfile.portfolioUrl ? <a href={seekerProfile.portfolioUrl} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">{seekerProfile.portfolioUrl}</a> : "Not provided"}</p>
        <button
            onClick={() => setActiveTab("settings")}
            className="mt-4 bg-orange-500 text-white py-2 px-4 rounded hover:bg-orange-600"
          >
            Edit Profile (Settings)
        </button>
      </div>
    );
  };

  // Estado para sub-aba de settings
  const [settingsTab, setSettingsTab] = useState<'profile' | 'notifications'>('profile');
  // Estado para preferências de notificações
  const [notificationPrefs, setNotificationPrefs] = useState({
    supportReplies: true,
    instantJobs: true,
    marketing: false
  });
  const [savingPrefs, setSavingPrefs] = useState(false);
  // Carregar preferências do Firestore ao abrir settings
  useEffect(() => {
    if (activeTab === 'settings' && seekerId && db) {
      getDoc(doc(db, 'seekers', seekerId)).then(snap => {
        if (snap.exists() && snap.data().notificationPreferences) {
          setNotificationPrefs({
            ...notificationPrefs,
            ...snap.data().notificationPreferences
          });
        }
      });
    }
    // eslint-disable-next-line
  }, [activeTab, seekerId]);
  // Salvar preferências no Firestore
  const handleSaveNotificationPrefs = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!seekerId || !db) return;
    setSavingPrefs(true);
    try {
      await updateDoc(doc(db, 'seekers', seekerId), {
        notificationPreferences: notificationPrefs
      });
      alert('Preferences saved!');
    } catch (err) {
      alert('Error saving preferences');
    } finally {
      setSavingPrefs(false);
    }
  };

  // Render Settings Tab Content (Editable Form)
  const renderSettings = () => {
    return (
      <div className="bg-black/70 p-10 rounded-lg shadow-lg">
        <h2 className="text-3xl font-semibold text-orange-500 mb-6">Settings</h2>
        <div className="flex gap-4 mb-6">
          <button
            className={`py-2 px-6 rounded-lg font-semibold text-sm transition-colors ${settingsTab === 'profile' ? 'bg-orange-500 text-white' : 'bg-black/30 text-orange-400 hover:bg-orange-600/20'}`}
            onClick={() => setSettingsTab('profile')}
          >
            Profile
          </button>
          <button
            className={`py-2 px-6 rounded-lg font-semibold text-sm transition-colors ${settingsTab === 'notifications' ? 'bg-orange-500 text-white' : 'bg-black/30 text-orange-400 hover:bg-orange-600/20'}`}
            onClick={() => setSettingsTab('notifications')}
          >
            Notifications
          </button>
        </div>
        {settingsTab === 'profile' && (
          <form className="space-y-6" onSubmit={handleProfileSubmit}>
            {/* Name */}
            <input
              type="text"
              name="name"
              value={seekerProfile.name ?? ""}
              onChange={handleProfileChange}
              placeholder="Your Name"
              className="w-full p-3 bg-black/50 border border-orange-500/30 rounded-lg text-white text-sm"
              required
            />
            {/* Email (Read Only) */}
            <input
              type="email"
              name="email"
              value={seekerProfile.email ?? ""}
              placeholder="Your Email"
              className="w-full p-3 bg-black/50 border border-orange-500/30 rounded-lg text-white text-sm"
              readOnly
              title="Email cannot be changed here"
            />
            {/* Location */}
            <input
              type="text"
              name="location"
              value={seekerProfile.location ?? ""}
              onChange={handleProfileChange}
              placeholder="Your Location (e.g., City, Country)"
              className="w-full p-3 bg-black/50 border border-orange-500/30 rounded-lg text-white text-sm"
            />
            {/* Skills */}
            <textarea
              name="skills"
              value={seekerProfile.skills ?? ""}
              onChange={handleProfileChange}
              placeholder="Your Skills (comma-separated, e.g., React, Node.js, Solidity)"
              rows={3}
              className="w-full p-3 bg-black/50 border border-orange-500/30 rounded-lg text-white text-sm"
            ></textarea>
            {/* Resume URL */}
            <input
              type="url"
              name="resumeUrl"
              value={seekerProfile.resumeUrl ?? ""}
              onChange={handleProfileChange}
              placeholder="Link to your Resume (e.g., Google Drive, Dropbox, personal site)"
              className="w-full p-3 bg-black/50 border border-orange-500/30 rounded-lg text-white text-sm"
            />
            {/* Portfolio URL */}
            <input
              type="url"
              name="portfolioUrl"
              value={seekerProfile.portfolioUrl ?? ""}
              onChange={handleProfileChange}
              placeholder="Link to your Portfolio or GitHub profile"
              className="w-full p-3 bg-black/50 border border-orange-500/30 rounded-lg text-white text-sm"
            />

            {/* Password */}
            <input
              type="password"
              name="password"
              placeholder="New Password"
              className="w-full p-3 bg-black/50 border border-orange-500/30 rounded-lg text-white text-sm"
            />

            {/* Upload CV */}
            <div>
              <label className="block text-sm text-gray-400 mb-2">Upload CV (PDF only):</label>
              <input
                type="file"
                accept="application/pdf"
                className="w-full p-3 bg-black/50 border border-orange-500/30 rounded-lg text-white text-sm"
              />
            </div>

            {/* Password Note */}
            <p className="text-sm text-gray-400">
              Password changes are handled through a separate secure process (if applicable).
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
        )}
        {settingsTab === 'notifications' && (
          <form className="space-y-6 max-w-lg" onSubmit={handleSaveNotificationPrefs}>
            <div>
              <label className="flex items-center gap-2 text-white">
                <input type="checkbox" checked={notificationPrefs.supportReplies} onChange={e => setNotificationPrefs(p => ({...p, supportReplies: e.target.checked}))} />
                Receive support replies notifications
              </label>
            </div>
            <div>
              <label className="flex items-center gap-2 text-white">
                <input type="checkbox" checked={notificationPrefs.instantJobs} onChange={e => setNotificationPrefs(p => ({...p, instantJobs: e.target.checked}))} />
                Receive Instant Jobs notifications
              </label>
            </div>
            <div>
              <label className="flex items-center gap-2 text-white">
                <input type="checkbox" checked={notificationPrefs.marketing} onChange={e => setNotificationPrefs(p => ({...p, marketing: e.target.checked}))} />
                Receive marketing communications
              </label>
            </div>
            <button type="submit" className="bg-orange-500 text-white py-2 px-6 rounded hover:bg-orange-600 disabled:opacity-60" disabled={savingPrefs}>
              {savingPrefs ? 'Saving...' : 'Save Preferences'}
            </button>
          </form>
        )}
      </div>
    );
  };

  // Render Instant Jobs Tab Content
  const renderInstantJobsTab = () => {
    if (activeSection === 'available') {
      return (
        <div className="space-y-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-semibold text-orange-500">Available Instant Jobs</h2>
            <button
              onClick={() => setActiveSection('myJobs')}
              className="bg-gray-700 text-white py-2 px-4 rounded hover:bg-gray-600"
            >
              View My Jobs
            </button>
          </div>
          
          {availableInstantJobs.length === 0 ? (
            <p className="text-gray-300">No instant jobs available at the moment.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {availableInstantJobs.map(job => (
                <InstantJobCard 
                  key={job.id ?? ""}
                  job={job}
                  onClick={() => {
                    setSelectedJobId(job.id ?? "");
                    setActiveSection('detail');
                  }}
                  onApply={() => handleApplyForJob(job.id ?? "")}
                  isCompanyView={false}
                />
              ))}
            </div>
          )}
          
          <div className="mt-6">
            <button
              onClick={() => router.push('/instant-jobs')}
              className="bg-orange-500 text-white py-2 px-4 rounded hover:bg-orange-600"
            >
              Search All Instant Jobs
            </button>
          </div>
        </div>
      );
    } else if (activeSection === 'myJobs') {
      return (
        <div className="space-y-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-semibold text-orange-500">My Instant Jobs</h2>
            <button
              onClick={() => setActiveSection('available')}
              className="bg-gray-700 text-white py-2 px-4 rounded hover:bg-gray-600"
            >
              View Available Jobs
            </button>
          </div>
          
          {myApplications.length === 0 ? (
            <p className="text-gray-300">You haven't applied to any instant jobs yet.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {myApplications.map(application => (
                <div key={application.id} className="bg-black/50 p-4 rounded-lg">
                  <h3 className="text-orange-500 font-bold">{application.jobTitle}</h3>
                  <p className="text-gray-400 text-sm">Applied on: {new Date(application.appliedAt?.toDate()).toLocaleDateString()}</p>
                  <p className="text-gray-300 text-sm">Status: <span className="font-semibold">{application.status}</span></p>
                  <button
                    onClick={() => {
                      setSelectedJobId(application.jobId);
                      setActiveSection('detail');
                    }}
                    className="mt-2 bg-gray-700 text-white py-1 px-3 rounded hover:bg-gray-600 text-sm"
                  >
                    View Details
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      );
    } else if (activeSection === 'detail' && selectedJob) {
      return (
        <div className="space-y-4">
          <button
            onClick={() => {
              setActiveSection(instantJobs.some(job => job.id === selectedJobId) ? 'myJobs' : 'available');
              setSelectedJobId(null);
              setSelectedJob(null);
            }}
            className="mb-4 text-gray-300 hover:text-white flex items-center"
          >
            <span>← Back to {instantJobs.some(job => job.id === selectedJobId) ? 'My Jobs' : 'Available Jobs'}</span>
          </button>
          
          <div className="bg-black/50 p-6 rounded-lg">
            <h2 className="text-2xl font-semibold text-orange-500 mb-2">{selectedJob.title}</h2>
            <p className="text-gray-300 mb-4">{selectedJob.description}</p>
            
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <p className="text-gray-400 text-sm">Price:</p>
                <p className="text-white font-semibold">{selectedJob.budget} {selectedJob.currency}</p>
              </div>
              <div>
                <p className="text-gray-400 text-sm">Duration:</p>
                <p className="text-white font-semibold">{selectedJob.estimatedTime ?? '-'} hours</p>
              </div>
              <div>
                <p className="text-gray-400 text-sm">Status:</p>
                <p className="text-white font-semibold">{selectedJob.status}</p>
              </div>
              <div>
                <p className="text-gray-400 text-sm">Category:</p>
                <p className="text-white font-semibold">{selectedJob.category || 'Not specified'}</p>
              </div>
            </div>
            
            {selectedJob.status === 'open' ? (
              <button
                onClick={() => handleApplyForJob(selectedJob.id ?? "")}
                disabled={isApplyingForJob}
                className="w-full bg-orange-500 text-white py-2 px-4 rounded hover:bg-orange-600 disabled:bg-gray-500"
              >
                {isApplyingForJob ? 'Applying...' : 'Apply for this Job'}
              </button>
            ) : (
              <div className="mt-6">
                <h3 className="text-xl font-semibold text-orange-300 mb-3">Messages</h3>
                <MessageSystem 
                  messages={jobMessages}
                  currentUserId={seekerId}
                  onSendMessage={handleSendMessage}
                  isLoading={isSendingMessage}
                  currentUserType="worker"
                />
              </div>
            )}
          </div>
        </div>
      );
    }
    
    return null;
  };

  // Helper function to get status color
  const getStatusColor = (status: string) => {
    switch(status?.toLowerCase()) {
      case 'pending':
        return 'bg-yellow-900 text-yellow-300';
      case 'accepted':
        return 'bg-green-900 text-green-300';
      case 'rejected':
        return 'bg-red-900 text-red-300';
      case 'completed':
        return 'bg-blue-900 text-blue-300';
      default:
        return 'bg-gray-800 text-gray-300';
    }
  };

  // Support tickets state
  const [myTickets, setMyTickets] = useState<SupportTicket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [ticketMessages, setTicketMessages] = useState<SupportMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);
  const [loadingTickets, setLoadingTickets] = useState(false);

  // Fetch tickets for this seeker
  const fetchMyTickets = useCallback(async () => {
    if (!seekerId || !db) return;
    setLoadingTickets(true);
    try {
      const q = query(collection(db, "supportTickets"), where("seekerId", "==", seekerId));
      const snapshot = await getDocs(q);
      const tickets = snapshot.docs.map(doc => ({ 
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt || new Date().toISOString(),
        updatedAt: doc.data().updatedAt || new Date().toISOString(),
        status: doc.data().status || 'open',
        area: doc.data().area || '',
        subject: doc.data().subject || '',
      })) as SupportTicket[];
      setMyTickets(tickets);
    } catch (err) {
      console.error("Error fetching support tickets:", err);
    } finally {
      setLoadingTickets(false);
    }
  }, [seekerId, db]);

  // Fetch messages for a ticket
  const fetchTicketMessages = useCallback(async (ticketId: string) => {
    if (!db) return;
    try {
      const q = query(
        collection(db, "supportMessages"), 
        where("ticketId", "==", ticketId),
        // Order by createdAt for chronological display
        orderBy("createdAt", "asc")
      );
      const snapshot = await getDocs(q);
      const messages = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt || new Date().toISOString(),
      })) as SupportMessage[];
      setTicketMessages(messages);
    } catch (err) {
      console.error("Error fetching ticket messages:", err);
      setTicketMessages([]);
    }
  }, [db]);

  // Handle sending a message to support
  const handleSendTicketMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket || !newMessage.trim() || !seekerId || !db) return;
    
    setSendingMessage(true);
    try {
      const messageData = {
        ticketId: selectedTicket.id,
        senderId: seekerId,
        senderType: "seeker",
        message: newMessage,
        createdAt: new Date().toISOString(),
        read: false,
      };
      
      await addDoc(collection(db, "supportMessages"), messageData);
      setNewMessage("");
      await fetchTicketMessages(selectedTicket.id);
    } catch (err) {
      console.error("Error sending ticket message:", err);
    } finally {
      setSendingMessage(false);
    }
  };

  // Load tickets when switching to 'my' tab
  useEffect(() => {
    if (activeTab === "support" && activeSupportTab === "my") {
      fetchMyTickets();
    }
  }, [activeTab, activeSupportTab, fetchMyTickets]);

  // Load messages when selecting a ticket
  useEffect(() => {
    if (selectedTicket) {
      fetchTicketMessages(selectedTicket.id);
    } else {
      setTicketMessages([]);
    }
  }, [selectedTicket, fetchTicketMessages]);

  // Only allow sending messages if ticket is open AND acceptedBy is set
  const canSendMessage = selectedTicket && selectedTicket.status === 'open' && selectedTicket.acceptedBy;

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);

  // Buscar notificações do seeker na coleção notifications a cada 10s
  useEffect(() => {
    if (!seekerId || !db) return;
    let interval: NodeJS.Timeout;
    
    const fetchNotifications = async () => {
      try {
        const q = query(
          collection(db, "notifications"),
          where("userId", "==", seekerId)
        );
        const snapshot = await getDocs(q);
        const notifs: Notification[] = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as Notification));
        notifs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setNotifications(notifs);
        setUnreadCount(notifs.filter(n => !n.read).length);
      } catch (err) {
        setNotifications([]);
        setUnreadCount(0);
      }
    };

    fetchNotifications();
    interval = setInterval(fetchNotifications, 10000);

    return () => {
      clearInterval(interval);
    };
  }, [seekerId, db]);

  // Mark all as read when opening the notification panel
  const handleOpenNotifications = async () => {
    setShowNotifications(true);
    const unread = notifications.filter(n => !n.read);
    for (const notif of unread) {
      await updateDoc(doc(db, 'notifications', notif.id), { read: true });
    }
  };

  // Mark notification as read when it is viewed (e.g., on click or scroll into view)
  const markNotificationAsRead = async (notifId: string) => {
    if (!db) return;
    await updateDoc(doc(db, 'notifications', notifId), { read: true });
  };

  return (
    <Layout>
      <main className="min-h-screen bg-gradient-to-b from-black to-orange-900 text-white flex">
        {/* Sidebar */}
        <aside className="w-full md:w-1/4 bg-black/70 p-6 flex flex-col">
          {/* Profile Photo Section */}
          <div className="relative flex flex-col items-center mb-6">
            <div className="relative w-24 h-24 rounded-full border-4 border-orange-500 mb-4">
              {(isUploading || isLoadingProfile) && (
                <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 rounded-full">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-orange-500"></div>
                </div>
              )}
              <img
                src={userPhoto || "/images/default-avatar.png"}
                alt="Profile"
                className="w-full h-full object-cover rounded-full"
              />
            </div>
            {/* Notification bell absolutely positioned top right */}
            <button
              className="absolute top-0 right-0 mt-2 mr-2 z-10"
              onClick={showNotifications ? () => setShowNotifications(false) : handleOpenNotifications}
              title="Notifications"
              aria-label="Notifications"
            >
              <BellIcon className="h-7 w-7 text-orange-400 hover:text-orange-300 transition" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-600 text-white text-xs rounded-full px-1.5 py-0.5 font-bold">{unreadCount}</span>
              )}
            </button>
            <h2 className="text-xl font-semibold text-orange-400 w-full text-center mt-2">{seekerProfile.name || "User"}</h2>
            <p className="text-gray-400 text-sm truncate w-full text-center">{seekerProfile.email}</p>
            {/* Discreet Connect Wallet Button */}
            <button
              onClick={handleConnectWallet}
              disabled={isConnectingWallet}
              className="mt-2 mb-4 px-3 py-1 rounded bg-black/30 border border-orange-500/30 text-orange-400 text-xs flex items-center justify-center mx-auto hover:bg-orange-900/20 transition-all"
            >
              {walletAddress ? (
                <span className="flex items-center gap-2">
                  <span className="truncate max-w-[100px]">{walletAddress.substring(0, 6)}...{walletAddress.substring(walletAddress.length - 4)}</span>
                  <button
                    type="button"
                    onClick={e => { e.stopPropagation(); setWalletAddress(null); }}
                    className="ml-1 p-0.5 rounded hover:bg-orange-900/30 text-orange-400 hover:text-orange-200 transition"
                    title="Disconnect Wallet"
                    aria-label="Disconnect Wallet"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </span>
              ) : isConnectingWallet ? (
                <span>Connecting...</span>
              ) : (
                <span>Connect Wallet</span>
              )}
            </button>
            {walletError && <p className="text-red-400 text-xs mt-1">{walletError}</p>}
            {walletAddress && <p className="text-green-400 text-xs mt-1">Wallet connected</p>}
          </div>
          {/* Navigation Menu */}
          <nav className="flex-1">
            <ul className="space-y-2">
              <li>
                <button
                  className={`w-full text-left py-2 px-4 rounded-lg ${activeTab === "myProfile" ? "bg-orange-500 text-white" : "text-gray-400 hover:text-orange-500"}`}
                  onClick={() => setActiveTab("myProfile")}
                >
                  My Profile
                </button>
              </li>
              <li>
                <button
                  className={`w-full text-left py-2 px-4 rounded-lg ${activeTab === "myApplications" ? "bg-orange-500 text-white" : "text-gray-400 hover:text-orange-500"}`}
                  onClick={() => setActiveTab("myApplications")}
                >
                  My Applications
                </button>
              </li>
              <li>
                <button
                  className={`w-full text-left py-2 px-4 rounded-lg ${activeTab === "instantJobs" ? "bg-orange-500 text-white" : "text-gray-400 hover:text-orange-500"}`}
                  onClick={() => setActiveTab("instantJobs")}
                >
                  Instant Jobs
                </button>
              </li>
              <li>
                <button
                  className={`w-full text-left py-2 px-4 rounded-lg ${activeTab === "settings" ? "bg-orange-500 text-white" : "text-gray-400 hover:text-orange-500"}`}
                  onClick={() => setActiveTab("settings")}
                >
                  Settings
                </button>
              </li>
              <li>
                <button
                  className={`w-full text-left py-2 px-4 rounded-lg ${activeTab === "support" ? "bg-orange-500 text-white" : "text-gray-400 hover:text-orange-500"}`}
                  onClick={() => setActiveTab("support")}
                >
                  Support
                </button>
              </li>
            </ul>
            <button
              onClick={handleLogout}
              className="w-full mt-6 bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded-lg flex items-center justify-center"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 001 1h12a1 1 0 001-1V4a1 1 0 00-1-1H3zm11 4a1 1 0 10-2 0v4.586l-1.293-1.293a1 1 0 00-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L14 11.586V7z" clipRule="evenodd" />
              </svg>
              Logout
            </button>
          </nav>
        </aside>
        {/* Main Content Area */}
        <section className="w-full md:w-3/4 p-6 overflow-y-auto">
          {/* Mantém o render dos conteúdos principais */}
          {activeTab === "myProfile" && renderMyProfile()}
          {activeTab === "myApplications" && renderMyApplications()}
          {activeTab === "instantJobs" && renderInstantJobsTab()}
          {activeTab === "settings" && renderSettings()}
          {activeTab === "support" && (
            <div className="bg-black/70 p-10 rounded-lg shadow-lg">
              {/* ...existing support tab content... */}
              {/* Mantém o conteúdo já existente para suporte */}
              <div className="flex gap-4 mb-6">
                <button
                  className={`py-2 px-6 rounded-lg font-semibold text-sm transition-colors ${activeSupportTab === 'new' ? 'bg-orange-500 text-white' : 'bg-black/30 text-orange-400 hover:bg-orange-600/20'}`}
                  onClick={() => setActiveSupportTab('new')}
                >
                  New Ticket
                </button>
                <button
                  className={`py-2 px-6 rounded-lg font-semibold text-sm transition-colors ${activeSupportTab === 'my' ? 'bg-orange-500 text-white' : 'bg-black/30 text-orange-400 hover:bg-orange-600/20'}`}
                  onClick={() => setActiveSupportTab('my')}
                >
                  My Tickets
                </button>
              </div>
              {/* Render content for each support tab here (to be implemented next) */}
              {activeSupportTab === 'new' && (
                <form onSubmit={handleSubmitTicket} className="space-y-6 max-w-lg">
                  <div>
                    <label className="block text-sm text-gray-300 mb-1">Platform Area/Function <span className="text-red-400">*</span></label>
                    <select
                      className="w-full p-2 rounded bg-black/60 border border-orange-500/30 text-white"
                      value={ticketArea}
                      onChange={e => setTicketArea(e.target.value)}
                      required
                    >
                      <option value="">Select an area</option>
                      {supportAreas.map(area => (
                        <option key={area} value={area}>{area}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-300 mb-1">Subject <span className="text-red-400">*</span></label>
                    <input
                      type="text"
                      className="w-full p-2 rounded bg-black/60 border border-orange-500/30 text-white"
                      value={ticketSubject}
                      onChange={e => setTicketSubject(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-300 mb-1">Description <span className="text-red-400">*</span></label>
                    <textarea
                      className="w-full p-2 rounded bg-black/60 border border-orange-500/30 text-white"
                      value={ticketDescription}
                      onChange={e => setTicketDescription(e.target.value)}
                      rows={5}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-300 mb-1">Attachment (optional)</label>
                    <input
                      type="file"
                      accept="image/*,application/pdf"
                      onChange={handleTicketFileChange}
                      className="w-full text-white"
                    />
                  </div>
                  {ticketError && <div className="text-red-400">{ticketError}</div>}
                  {ticketSuccess && <div className="text-green-400">{ticketSuccess}</div>}
                  <button
                    type="submit"
                    className="bg-orange-500 text-white py-2 px-6 rounded hover:bg-orange-600 disabled:opacity-60"
                    disabled={ticketLoading}
                  >
                    {ticketLoading ? "Submitting..." : "Submit Ticket"}
                  </button>
                </form>
              )}
              {activeSupportTab === 'my' && (
                <div className="flex gap-6">
                  {/* Ticket list */}
                  <div className="w-1/3 min-w-[220px] max-w-xs border-r border-orange-900 pr-4 overflow-y-auto ticket-list">
                    {loadingTickets ? (
                      <div className="text-gray-400">Loading tickets...</div>
                    ) : myTickets.length === 0 ? (
                      <div className="text-gray-400">No support tickets found.</div>
                    ) : (
                      <ul className="space-y-2">
                        {myTickets.map(ticket => (
                          <li key={ticket.id}>
                            <button
                              className={`w-full text-left p-3 rounded-lg border border-orange-700/30 bg-black/40 hover:bg-orange-900/30 transition-colors ${selectedTicket?.id === ticket.id ? 'border-orange-500 bg-orange-900/40' : ''}`}
                              onClick={() => setSelectedTicket(ticket)}
                            >
                              <div className="font-semibold text-orange-400 truncate">{ticket.subject}</div>
                              <div className="text-xs text-gray-400 truncate">{ticket.area}</div>
                              <div className="text-xs text-gray-500">{new Date(ticket.createdAt || Date.now()).toLocaleString()}</div>
                              <div className="text-xs mt-1"><span className={`px-2 py-0.5 rounded ${ticket.status === 'open' ? 'bg-yellow-900 text-yellow-300' : 'bg-green-900 text-green-300'}`}>{ticket.status}</span></div>
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  {/* Ticket chat/details */}
                  <div className="flex-1 min-w-0">
                    {selectedTicket ? (
                      <div className="bg-black/60 rounded-lg p-6 h-full flex flex-col ticket-details">
                        <div className="mb-2">
                          <div className="text-lg font-bold text-orange-400">{selectedTicket.subject}</div>
                          <div className="text-sm text-gray-400">Area: {selectedTicket.area}</div>
                          <div className="text-xs text-gray-500">Opened: {new Date(selectedTicket.createdAt || Date.now()).toLocaleString()}</div>
                          <div className="text-xs mt-1"><span className={`px-2 py-0.5 rounded ${selectedTicket.status === 'open' ? 'bg-yellow-900 text-yellow-300' : 'bg-green-900 text-green-300'}`}>{selectedTicket.status}</span></div>
                          <div className="mt-2 text-gray-300">{selectedTicket.description}</div>
                          {selectedTicket.attachmentUrl && (
                            <div className="mt-2"><a href={selectedTicket.attachmentUrl} target="_blank" rel="noopener noreferrer" className="text-blue-400 underline">View Attachment</a></div>
                          )}
                        </div>
                        <div className="flex-1 overflow-y-auto border-t border-orange-900 pt-4 mb-2 ticket-messages">
                          {ticketMessages.length === 0 ? (
                            <div className="text-gray-400">No messages yet.</div>
                          ) : (
                            <ul className="space-y-3">
                              {ticketMessages.map(msg => (
                                <li key={msg.id} className={`flex ${msg.senderType === 'seeker' ? 'justify-end' : 'justify-start'}`}>
                                  <div className={`max-w-xs px-3 py-2 rounded-lg text-sm ${msg.senderType === 'seeker' ? 'bg-orange-500 text-white' : 'bg-gray-700 text-gray-100'}`}>
                                    {msg.message}
                                    <div className="text-xs text-gray-300 mt-1 text-right">{new Date(msg.createdAt).toLocaleString()}</div>
                                  </div>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                        {selectedTicket.status === 'open' && canSendMessage && (
                          <form onSubmit={handleSendTicketMessage} className="flex gap-2 mt-auto">
                            <input
                              type="text"
                              className="flex-1 p-2 rounded bg-black/40 border border-orange-500/30 text-white"
                              placeholder="Type your message..."
                              value={newMessage}
                              onChange={e => setNewMessage(e.target.value)}
                              disabled={sendingMessage}
                              required
                            />
                            <button
                              type="submit"
                              className="bg-orange-500 text-white px-4 py-2 rounded hover:bg-orange-600 disabled:opacity-60"
                              disabled={sendingMessage || !newMessage.trim()}
                            >
                              {sendingMessage ? 'Sending...' : 'Send'}
                            </button>
                          </form>
                        )}
                        {selectedTicket.status === 'open' && !canSendMessage && (
                          <div className="text-yellow-400 text-sm mt-4">You can send messages after a support agent accepts your ticket.</div>
                        )}
                      </div>
                    ) : (
                      <div className="text-gray-400 flex items-center justify-center h-full">Select a ticket to view details and chat.</div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </section>
        {/* Notification panel (right side) */}
        {showNotifications && (
          <div className="fixed top-0 right-0 w-full md:w-96 h-full bg-black/90 z-50 shadow-lg border-l border-orange-900 flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-orange-900">
              <span className="text-lg font-bold text-orange-400">Notifications</span>
              <button onClick={() => setShowNotifications(false)} className="text-orange-400 hover:text-orange-200" title="Close notifications panel" aria-label="Close notifications panel">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {notifications.length === 0 ? (
                <div className="text-gray-400 text-center mt-10">No notifications.</div>
              ) : (
                notifications.map(n => (
                  <div
                    key={n.id}
                    className={`p-3 rounded-lg border ${n.read ? 'border-gray-700 bg-black/40' : 'border-orange-500 bg-orange-900/20'} text-white shadow-sm`}
                    tabIndex={0}
                    onClick={() => !n.read && markNotificationAsRead(n.id)}
                    onFocus={() => !n.read && markNotificationAsRead(n.id)}
                  >
                    <div className="font-semibold text-orange-300 mb-1">{n.title || 'Notification'}</div>
                    <div className="text-sm text-gray-200">{n.body}</div>
                    <div className="text-xs text-gray-400 mt-1">{n.createdAt ? new Date(n.createdAt).toLocaleString() : ''}</div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </main>
    </Layout>
  );
};

export default SeekerDashboard;