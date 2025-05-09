"use client";

import React, { useState, useEffect, JSX, useCallback, useRef } from "react";
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
  if (!db) throw new Error("Firestore not initialized");
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
  id: string;
  name: string;
  fullName: string;
  email: string;
  location: string;
  phone?: string;
  title?: string; // Professional title (e.g., "Senior React Developer")
  skills: string; // Comma-separated list of skills
  yearsOfExperience?: number;
  bio?: string; // Short professional bio/summary
  hourlyRate?: number; // Expected hourly rate
  availability?: string; // Availability status (e.g., "Full-time", "Part-time", "Weekends only")
  
  // Education
  education?: {
    degree: string;
    institution: string;
    year: string;
    description?: string;
  }[];
  
  // Work experience
  experience?: {
    position: string;
    company: string;
    location?: string;
    startDate: string;
    endDate?: string;
    current: boolean;
    description?: string;
  }[];
  
  // Projects
  projects?: {
    name: string;
    description: string;
    url?: string;
    technologies?: string;
    startDate?: string;
    endDate?: string;
  }[];
  
  // Social & Professional links
  resumeUrl?: string; // Link to uploaded CV
  portfolioUrl?: string; // Main portfolio link
  githubUrl?: string;
  linkedinUrl?: string;
  websiteUrl?: string; // Personal website
  dribbbleUrl?: string;
  behanceUrl?: string;
  mediumUrl?: string;
  twitterUrl?: string;
  telegramUrl?: string;

  // Certifications
  certifications?: {
    name: string;
    issuer: string;
    date: string;
    expiryDate?: string;
    credentialId?: string;
    url?: string;
  }[];

  // Preferences
  remoteOnly?: boolean;
  willingToRelocate?: boolean;
  preferredLocations?: string[];
  cryptoPaymentPreference?: boolean;

  // Languages
  languages?: {
    language: string;
    proficiency: string; // "Native", "Fluent", "Intermediate", "Basic"
  }[];

  // Additional fields
  completionRate?: number; // Percentage of profile completed
  verifiedSkills?: string[]; // Skills verified through tests or endorsements
  averageRating?: number; // Average rating from previous employers
  instantJobsCompleted?: number; // Count of completed instant jobs
  endorsements?: string[]; // Endorsements from other users or companies
  profileCreatedAt?: string;
  profileUpdatedAt?: string;

  // New fields
  birthDate?: string;
  nationality?: string;
  gender?: string;
  altContact?: string;
  presentationVideoUrl?: string;
  references?: {
    name: string;
    contact: string;
    relation: string;
  }[];
  salaryExpectation?: string;
  contractType?: string;
  workPreference?: string;
  address?: string;
  instagramUrl?: string;
  facebookUrl?: string;
  interestArea?: string;
  shareProfile?: boolean;
  surname?: string;
  phoneCountryCode?: string;
  zipCode?: string;
  altContactCountryCode?: string;
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
  isSystemMessage?: boolean; // Adding this property that was missing
}

// Definition of the Notification type for correct typing
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false); // Add state for mobile menu
  const [seekerProfile, setSeekerProfile] = useState<SeekerProfile>({
    id: "", // Initialize id
    name: "",
    email: "",
    location: "",
    skills: "",
    resumeUrl: "",
    portfolioUrl: "",
    fullName: "",
  });
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null); // Add state for fetch errors
  const [isMobile, setIsMobile] = useState(false);
  const router = useRouter();
  // State for settings sub-tab - MOVED UP HERE
  const [settingsTab, setSettingsTab] = useState<'profile' | 'notifications'>('profile');
  // State for notification preferences - MOVED UP with the settingsTab
  const [notificationPrefs, setNotificationPrefs] = useState({
    supportReplies: true,
    instantJobs: true,
    marketing: false
  });
  const [savingPrefs, setSavingPrefs] = useState(false);

  // Add Web3 state
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [isConnectingWallet, setIsConnectingWallet] = useState(false);
  const [walletError, setWalletError] = useState<string | null>(null);

  // States for Instant Jobs functionality
  const [instantJobs, setInstantJobs] = useState<InstantJob[]>([]);
  const [availableInstantJobs, setAvailableInstantJobs] = useState<InstantJob[]>([]);
  const [activeSection, setActiveSection] = useState<'available' | 'myJobs' | 'detail'>('myJobs');
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

  // Add this function to log profile data when settings tab is active
  useEffect(() => {
    if (activeTab === 'settings' && settingsTab === 'profile') {
      console.log("Debug - Current profile state:", {
        bio: seekerProfile.bio,
        presentationVideoUrl: seekerProfile.presentationVideoUrl,
        resumeUrl: seekerProfile.resumeUrl,
        linkedinUrl: seekerProfile.linkedinUrl,
        twitterUrl: seekerProfile.twitterUrl,
        websiteUrl: seekerProfile.websiteUrl,
        telegramUrl: seekerProfile.telegramUrl
      });
    }
  }, [activeTab, settingsTab, seekerProfile]);

  // Fetch seeker profile data - Updated to ensure all data is correctly loaded
  const fetchSeekerProfile = useCallback(async (id: string) => {
    if (!id || !db) return;
    setIsLoadingProfile(true);
    setFetchError(null); // Reset error on new fetch
    try {
      const seekerRef = doc(db, "seekers", id); // Assuming 'seekers' collection
      const seekerSnap = await getDoc(seekerRef);
      if (seekerSnap.exists()) {
        const data = seekerSnap.data();
        
        // Ensure all fields are loaded with default values if missing
        const profileData: SeekerProfile = {
          id: seekerSnap.id,
          name: data.name || "",
          surname: data.surname || "",
          fullName: data.fullName || `${data.name || ""} ${data.surname || ""}`.trim(),
          email: data.email || "",
          location: data.location || "",
          address: data.address || "",
          phone: data.phone || "",
          phoneCountryCode: data.phoneCountryCode || "+1",
          altContact: data.altContact || "",
          altContactCountryCode: data.altContactCountryCode || "+1",
          birthDate: data.birthDate || "",
          nationality: data.nationality || "",
          gender: data.gender || "",
          resumeUrl: data.resumeUrl || "",
          presentationVideoUrl: data.presentationVideoUrl || "",
          instagramUrl: data.instagramUrl || "",
          facebookUrl: data.facebookUrl || "",
          linkedinUrl: data.linkedinUrl || "",
          twitterUrl: data.twitterUrl || "",
          websiteUrl: data.websiteUrl || "",
          telegramUrl: data.telegramUrl || "",
          bio: data.bio || "",
          skills: data.skills || "",
          title: data.title || "",
          availability: data.availability || "",
          salaryExpectation: data.salaryExpectation || "",
          contractType: data.contractType || "",
          workPreference: data.workPreference || "",
          interestArea: data.interestArea || "",
          remoteOnly: !!data.remoteOnly,
          willingToRelocate: !!data.willingToRelocate,
          cryptoPaymentPreference: !!data.cryptoPaymentPreference,
          shareProfile: !!data.shareProfile,
          zipCode: data.zipCode || "",
          education: data.education || [],
          experience: data.experience || [],
          projects: data.projects || [],
          certifications: data.certifications || [],
          references: data.references || [],
          languages: data.languages || [],
          preferredLocations: data.preferredLocations || [],
        };

        setSeekerProfile(profileData);
      } else {
        console.log("No such seeker document!");
        setSeekerProfile({ 
          id: "", name: "", email: "", location: "", skills: "", resumeUrl: "", portfolioUrl: "", fullName: "",
          bio: "", telegramUrl: "", twitterUrl: "", websiteUrl: "", linkedinUrl: "", githubUrl: ""
        });
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
      router.replace("/login"); // Corrected: redirecting to /login instead of /admin-login
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
  const handleProfileChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
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

  // Handle CV upload
  const handleCVUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && seekerId) {
      setIsUploading(true);
      const formData = new FormData();
      formData.append("file", file);
      formData.append("seekerId", seekerId); // Use seekerId

      try {
        // Adjust API endpoint for seekers
        const response = await fetch("/api/seeker/cv", {
          method: "POST",
          body: formData,
        });
        const responseData = await response.json();
        if (!response.ok) throw new Error(responseData.message || "Failed to upload CV");
        setSeekerProfile({ ...seekerProfile, resumeUrl: responseData.url }); // Update CV URL with URL from server
        console.log("Seeker CV upload successful!");
      } catch (error: any) {
        console.error("Error uploading seeker CV:", error);
        alert(`Failed to upload CV: ${error.message || "Unknown error"}`);
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

  // Handle profile update submission - Updated to ensure all data is properly saved
  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!seekerId || !db) {
      alert("Error: Seeker ID not found.");
      return;
    }
    setIsLoadingProfile(true);
    try {
      const seekerRef = doc(db, "seekers", seekerId); // Use 'seekers' collection
      // Prepare data, ensuring all fields are included
      const profileDataToUpdate: Partial<SeekerProfile> = {
        name: seekerProfile.name || "",
        surname: seekerProfile.surname || "",
        email: seekerProfile.email || "",
        location: seekerProfile.location || "",
        address: seekerProfile.address || "",
        phone: seekerProfile.phone || "",
        phoneCountryCode: seekerProfile.phoneCountryCode || "+1",
        altContact: seekerProfile.altContact || "",
        altContactCountryCode: seekerProfile.altContactCountryCode || "+1",
        birthDate: seekerProfile.birthDate || "",
        nationality: seekerProfile.nationality || "",
        gender: seekerProfile.gender || "",
        resumeUrl: seekerProfile.resumeUrl || "",
        presentationVideoUrl: seekerProfile.presentationVideoUrl || "",
        instagramUrl: seekerProfile.instagramUrl || "",
        facebookUrl: seekerProfile.facebookUrl || "",
        linkedinUrl: seekerProfile.linkedinUrl || "",
        twitterUrl: seekerProfile.twitterUrl || "",
        websiteUrl: seekerProfile.websiteUrl || "",
        telegramUrl: seekerProfile.telegramUrl || "",
        bio: seekerProfile.bio || "",
        skills: seekerProfile.skills || "",
        title: seekerProfile.title || "",
        availability: seekerProfile.availability || "",
        salaryExpectation: seekerProfile.salaryExpectation || "",
        contractType: seekerProfile.contractType || "",
        workPreference: seekerProfile.workPreference || "",
        interestArea: seekerProfile.interestArea || "",
        remoteOnly: !!seekerProfile.remoteOnly,
        willingToRelocate: !!seekerProfile.willingToRelocate,
        cryptoPaymentPreference: !!seekerProfile.cryptoPaymentPreference,
        shareProfile: !!seekerProfile.shareProfile,
        zipCode: seekerProfile.zipCode || "",
        education: seekerProfile.education || [],
        experience: seekerProfile.experience || [],
        projects: seekerProfile.projects || [],
        certifications: seekerProfile.certifications || [],
        references: seekerProfile.references || [],
        languages: seekerProfile.languages || [],
        preferredLocations: seekerProfile.preferredLocations || [],
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

  // Handle saving notification preferences
  const handleSaveNotificationPrefs = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!seekerId || !db) return;
    setSavingPrefs(true);
    try {
      await updateDoc(doc(db, 'seekers', seekerId), {
        notificationPreferences: notificationPrefs
      });
      alert('Notification preferences saved successfully!');
    } catch (err) {
      console.error("Error saving notification preferences:", err);
      alert('Error saving preferences. Please try again.');
    } finally {
      setSavingPrefs(false);
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
      
      // Apply for the job without requiring a wallet
      await instantJobsService.applyForInstantJob(
        jobId, 
        seekerId, 
        seekerProfile.fullName || seekerProfile.name || seekerProfile.email,
        null // No longer requiring wallet in the application
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
  
  // Load instantJobs when needed
  useEffect(() => {
    if (activeTab === "instantJobs" && seekerId) {
      loadAvailableInstantJobs();
      loadMyInstantJobs();
    }
  }, [activeTab, seekerId]);
  
  // Load job details when selecting one
  useEffect(() => {
    if (selectedJobId) {
      // Check first in myInstantJobs
      let job = instantJobs.find(job => job.id === selectedJobId);
      
      // If not found, check in availableInstantJobs
      if (!job) {
        job = availableInstantJobs.find(job => job.id === selectedJobId);
      }
      
      if (job) {
        setSelectedJob(job);
        
        // Only load messages if the task is not in 'open' status
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

  // Render My Profile Tab Content (Professional, Expandable)
  const [showFullProfile, setShowFullProfile] = useState(false);
  const renderMyProfile = () => {
    // Prepare social/professional links for display
    type MainLink = { href: string; label: string; icon: string };
    const mainLinks: MainLink[] = [];
    if (seekerProfile.linkedinUrl) mainLinks.push({ href: seekerProfile.linkedinUrl, label: 'LinkedIn', icon: '🔗' });
    if (seekerProfile.githubUrl) mainLinks.push({ href: seekerProfile.githubUrl, label: 'GitHub', icon: '💻' });
    if (seekerProfile.websiteUrl) mainLinks.push({ href: seekerProfile.websiteUrl, label: 'Website', icon: '🌐' });
    if (seekerProfile.portfolioUrl) mainLinks.push({ href: seekerProfile.portfolioUrl, label: 'Portfolio', icon: '🖼️' });
    if (seekerProfile.telegramUrl) mainLinks.push({ href: seekerProfile.telegramUrl, label: 'Telegram', icon: '✈️' });
    if (seekerProfile.twitterUrl) mainLinks.push({ href: seekerProfile.twitterUrl, label: 'Twitter', icon: '🐦' });
    if (seekerProfile.facebookUrl) mainLinks.push({ href: seekerProfile.facebookUrl, label: 'Facebook', icon: '📘' });
    if (seekerProfile.instagramUrl) mainLinks.push({ href: seekerProfile.instagramUrl, label: 'Instagram', icon: '📸' });
    if (seekerProfile.mediumUrl) mainLinks.push({ href: seekerProfile.mediumUrl, label: 'Medium', icon: '✍️' });
    if (seekerProfile.dribbbleUrl) mainLinks.push({ href: seekerProfile.dribbbleUrl, label: 'Dribbble', icon: '🏀' });
    if (seekerProfile.behanceUrl) mainLinks.push({ href: seekerProfile.behanceUrl, label: 'Behance', icon: '🎨' });

    // Data for experience and education
    const firstExperience = seekerProfile.experience && seekerProfile.experience.length > 0 ? seekerProfile.experience[0] : null;
    const firstEducation = seekerProfile.education && seekerProfile.education.length > 0 ? seekerProfile.education[0] : null;

    return (
      <div className="bg-black/80 p-8 rounded-xl shadow-2xl w-full max-w-5xl mx-auto">
        {/* Top Section: Photo, Name, Title */}
        <div className="flex flex-col md:flex-row items-center gap-8 mb-6">
          {/* Profile photo */}
          <div className="relative">
            <img
              src={userPhoto || "/images/default-avatar.png"}
              alt="Profile"
              className="w-40 h-40 rounded-full border-4 border-orange-500 object-cover shadow-lg cursor-pointer hover:opacity-80 transition-opacity"
              onClick={() => document.getElementById('profile-photo-upload')?.click()}
              title="Click to change profile photo"
            />
          </div>
          
          {/* Main information */}
          <div className="flex-1 text-center md:text-left">
            <h1 className="text-4xl font-bold text-orange-400 mb-1">
              {seekerProfile.fullName || (seekerProfile.name + (seekerProfile.surname ? ' ' + seekerProfile.surname : ''))}
            </h1>
            
            {/* Professional title */}
            {seekerProfile.title && 
              <div className="text-xl text-orange-200 font-semibold mb-1">{seekerProfile.title}</div>
            }
            
            {/* Location */}
            <div className="text-gray-400 mb-3">
              <span className="inline-flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                {seekerProfile.location || "Location not specified"}
              </span>
            </div>
            
            {/* Important contact information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-3">
              {seekerProfile.email && (
                <div className="text-sm text-gray-300 flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  {seekerProfile.email}
                </div>
              )}
              
              {seekerProfile.phone && (
                <div className="text-sm text-gray-300 flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  {seekerProfile.phoneCountryCode || ''} {seekerProfile.phone}
                </div>
              )}
              
              {seekerProfile.nationality && (
                <div className="text-sm text-gray-300 flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" />
                  </svg>
                  {seekerProfile.nationality}
                </div>
              )}
              
              {seekerProfile.availability && (
                <div className="text-sm text-gray-300 flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {seekerProfile.availability}
                </div>
              )}
            </div>

            {/* Short bio */}
            {seekerProfile.bio && (
              <div className="text-gray-300 mb-3 text-sm italic border-l-2 border-orange-500 pl-3">
                "{seekerProfile.bio.length > 150 ? `${seekerProfile.bio.substring(0, 150)}...` : seekerProfile.bio}"
              </div>
            )}
          </div>
        </div>
        
        {/* Social/professional links shown as buttons */}
        {mainLinks.length > 0 && (
          <div className="mb-6">
            <div className="flex flex-wrap gap-2 justify-center md:justify-start">
              {mainLinks.map(link => (
                <a 
                  key={link.label} 
                  href={link.href} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="inline-flex items-center gap-1 px-3 py-1 bg-orange-900/40 text-orange-300 rounded-full text-xs hover:bg-orange-600/40 transition"
                >
                  <span>{link.icon}</span> {link.label}
                </a>
              ))}
            </div>
          </div>
        )}
        
        {/* Skills - Important for professional profile */}
        {seekerProfile.skills && (
          <div className="mb-6">
            <div className="font-semibold text-orange-300 mb-1">Skills</div>
            <div className="flex flex-wrap gap-2">
              {seekerProfile.skills.split(',').map(skill => (
                <span key={skill.trim()} className="bg-orange-700/40 text-orange-200 px-2 py-1 rounded text-xs font-medium">{skill.trim()}</span>
              ))}
            </div>
          </div>
        )}
        
        {/* Two-column section with Experience and Education */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* Main Experience */}
          {firstExperience && (
            <div className="bg-black/40 rounded p-4">
              <div className="font-semibold text-orange-300 mb-2">Main Experience</div>
              <div className="font-semibold text-orange-200">{firstExperience.position} <span className="text-gray-400 font-normal">@ {firstExperience.company}</span></div>
              <div className="text-xs text-gray-400 mb-1">{firstExperience.startDate} - {firstExperience.endDate || 'Present'} {firstExperience.location && `| ${firstExperience.location}`}</div>
              {firstExperience.description && <div className="text-sm text-gray-300">{firstExperience.description}</div>}
            </div>
          )}
          
          {/* Main Education */}
          {firstEducation && (
            <div className="bg-black/40 rounded p-4">
              <div className="font-semibold text-orange-300 mb-2">Main Education</div>
              <div className="font-semibold text-orange-200">{firstEducation.degree} <span className="text-gray-400 font-normal">@ {firstEducation.institution}</span></div>
              <div className="text-xs text-gray-400 mb-1">{firstEducation.year}</div>
              {firstEducation.description && <div className="text-sm text-gray-300">{firstEducation.description}</div>}
            </div>
          )}
        </div>
        
        {/* Work Preferences - Important information for recruiters */}
        <div className="mb-6">
          <div className="font-semibold text-orange-300 mb-2">Work Preferences</div>
          <div className="bg-black/40 p-4 rounded grid grid-cols-1 md:grid-cols-3 gap-4">
            {seekerProfile.workPreference && (
              <div>
                <span className="text-xs text-gray-400">Work Mode:</span>
                <div className="text-sm text-white">{seekerProfile.workPreference}</div>
              </div>
            )}
            
            {seekerProfile.contractType && (
              <div>
                <span className="text-xs text-gray-400">Contract Type:</span>
                <div className="text-sm text-white">{seekerProfile.contractType}</div>
              </div>
            )}
            
            {seekerProfile.interestArea && (
              <div>
                <span className="text-xs text-gray-400">Interest Area:</span>
                <div className="text-sm text-white">{seekerProfile.interestArea}</div>
              </div>
            )}
            
            {seekerProfile.salaryExpectation && (
              <div>
                <span className="text-xs text-gray-400">Salary Expectation:</span>
                <div className="text-sm text-white">{seekerProfile.salaryExpectation}</div>
              </div>
            )}
            
            {seekerProfile.remoteOnly !== undefined && (
              <div>
                <span className="text-xs text-gray-400">Remote Only:</span>
                <div className="text-sm text-white">{seekerProfile.remoteOnly ? '✓ Yes' : '✗ No'}</div>
              </div>
            )}
            
            {seekerProfile.willingToRelocate !== undefined && (
              <div>
                <span className="text-xs text-gray-400">Willing to Relocate:</span>
                <div className="text-sm text-white">{seekerProfile.willingToRelocate ? '✓ Yes' : '✗ No'}</div>
              </div>
            )}
            
            {seekerProfile.cryptoPaymentPreference !== undefined && (
              <div>
                <span className="text-xs text-gray-400">Accept Crypto Payment:</span>
                <div className="text-sm text-white">{seekerProfile.cryptoPaymentPreference ? '✓ Yes' : '✗ No'}</div>
              </div>
            )}
          </div>
        </div>

        {/* Expand button */}
        <div className="flex justify-center my-4">
          <button
            onClick={() => setShowFullProfile(v => !v)}
            className="px-6 py-2 rounded-full bg-orange-500 text-white font-semibold shadow hover:bg-orange-600 transition"
          >
            {showFullProfile ? 'Show Less' : 'Expand Full Profile'}
          </button>
        </div>

        {/* Full Profile Details (when expanded) */}
        {showFullProfile && (
          <div className="mt-6 space-y-6 animate-fade-in">
            {/* Languages */}
            {seekerProfile.languages && seekerProfile.languages.length > 0 && (
              <div>
                <div className="font-semibold text-orange-300 mb-1">Languages</div>
                <div className="flex flex-wrap gap-2">
                  {seekerProfile.languages.map((lang, idx) => (
                    <span key={idx} className="bg-orange-700/40 text-orange-200 px-2 py-1 rounded text-xs font-medium">{lang.language} ({lang.proficiency})</span>
                  ))}
                </div>
              </div>
            )}
            
            {/* Experience */}
            {seekerProfile.experience && seekerProfile.experience.length > 0 && (
              <div>
                <div className="font-semibold text-orange-300 mb-1">Experience</div>
                <div className="space-y-2">
                  {seekerProfile.experience.map((exp, idx) => (
                    <div key={idx} className="bg-black/40 rounded p-3">
                      <div className="font-semibold text-orange-200">{exp.position} <span className="text-gray-400 font-normal">@ {exp.company}</span></div>
                      <div className="text-xs text-gray-400 mb-1">{exp.startDate} - {exp.endDate || 'Present'} {exp.location && `| ${exp.location}`}</div>
                      {exp.description && <div className="text-sm text-gray-200">{exp.description}</div>}
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Education */}
            {seekerProfile.education && seekerProfile.education.length > 0 && (
              <div>
                <div className="font-semibold text-orange-300 mb-1">Education</div>
                <div className="space-y-2">
                  {seekerProfile.education.map((edu, idx) => (
                    <div key={idx} className="bg-black/40 rounded p-3">
                      <div className="font-semibold text-orange-200">{edu.degree} <span className="text-gray-400 font-normal">@ {edu.institution}</span></div>
                      <div className="text-xs text-gray-400 mb-1">{edu.year}</div>
                      {edu.description && <div className="text-sm text-gray-200">{edu.description}</div>}
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Projects */}
            {seekerProfile.projects && seekerProfile.projects.length > 0 && (
              <div>
                <div className="font-semibold text-orange-300 mb-1">Projects</div>
                <div className="space-y-2">
                  {seekerProfile.projects.map((proj, idx) => (
                    <div key={idx} className="bg-black/40 rounded p-3">
                      <div className="font-semibold text-orange-200">{proj.name}</div>
                      {proj.url && <a href={proj.url} target="_blank" rel="noopener noreferrer" className="text-blue-400 underline text-xs">{proj.url}</a>}
                      <div className="text-xs text-gray-400 mb-1">{proj.technologies}</div>
                      {proj.description && <div className="text-sm text-gray-200">{proj.description}</div>}
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Certifications */}
            {seekerProfile.certifications && seekerProfile.certifications.length > 0 && (
              <div>
                <div className="font-semibold text-orange-300 mb-1">Certifications</div>
                <div className="space-y-2">
                  {seekerProfile.certifications.map((cert, idx) => (
                    <div key={idx} className="bg-black/40 rounded p-3">
                      <div className="font-semibold text-orange-200">{cert.name}</div>
                      <div className="text-xs text-gray-400 mb-1">{cert.issuer} | {cert.date}</div>
                      {cert.url && <a href={cert.url} target="_blank" rel="noopener noreferrer" className="text-blue-400 underline text-xs">{cert.url}</a>}
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* References */}
            {seekerProfile.references && seekerProfile.references.length > 0 && (
              <div>
                <div className="font-semibold text-orange-300 mb-1">References</div>
                <div className="space-y-2">
                  {seekerProfile.references.map((ref, idx) => (
                    <div key={idx} className="bg-black/40 rounded p-3">
                      <div className="font-semibold text-orange-200">{ref.name}</div>
                      <div className="text-xs text-gray-400 mb-1">{ref.relation} | {ref.contact}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Download CV Link */}
            {seekerProfile.resumeUrl && (
              <div>
                <a href={seekerProfile.resumeUrl} target="_blank" rel="noopener noreferrer" className="text-blue-400 underline font-semibold flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Download CV (PDF)
                </a>
              </div>
            )}
            
            {/* Presentation Video */}
            {seekerProfile.presentationVideoUrl && (
              <div>
                <a href={seekerProfile.presentationVideoUrl} target="_blank" rel="noopener noreferrer" className="text-blue-400 underline font-semibold flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  View Presentation Video
                </a>
              </div>
            )}
          </div>
        )}
        
        {/* Reviews/Comments Section */}
        <div className="mt-10">
          <div className="font-bold text-orange-400 text-lg mb-2">Reviews & Comments (Instant Jobs)</div>
          <div className="bg-black/60 rounded-lg p-6 min-h-[120px] flex items-center justify-center text-gray-400 italic">
            Reviews and comments from completed Instant Jobs will appear here soon!
          </div>
        </div>
      </div>
    );
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
          <form onSubmit={handleProfileSubmit}>
            {/* Personal Data */}
            <h3 className="text-lg font-bold text-orange-400 mb-4">Personal Data</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-10">
              {/* COLUMN 1 - Personal Info */}
              <div className="space-y-6 col-span-1 md:col-span-1">
                {/* Name */}
                <input type="text" name="name" value={seekerProfile.name ?? ""} onChange={handleProfileChange} placeholder="First Name" className="w-full p-3 bg-black/50 border border-orange-500/30 rounded-lg text-white text-sm" required />
                {/* Surname */}
                <input type="text" name="surname" value={seekerProfile.surname ?? ""} onChange={handleProfileChange} placeholder="Surname" className="w-full p-3 bg-black/50 border border-orange-500/30 rounded-lg text-white text-sm" required />
                {/* Email (Read Only) */}
                <input type="email" name="email" value={seekerProfile.email ?? ""} placeholder="Email" className="w-full p-3 bg-black/50 border border-orange-500/30 rounded-lg text-white text-sm" readOnly title="Email cannot be changed here" />
                {/* Birth Date */}
                <input type="date" name="birthDate" value={seekerProfile.birthDate ?? ""} onChange={handleProfileChange} placeholder="Birth Date" className="w-full p-3 bg-black/50 border border-orange-500/30 rounded-lg text-white text-sm" />
                <span className="text-xs text-gray-400">Birth Date (for age verification)</span>
                {/* Gender */}
                <select name="gender" value={seekerProfile.gender ?? ""} onChange={handleProfileChange} className="w-full p-3 bg-black/50 border border-orange-500/30 rounded-lg text-white text-sm">
                  <option value="">Gender (optional)</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                  <option value="prefer_not_to_say">Prefer not to say</option>
                </select>
                {/* Nationality */}
                <input type="text" name="nationality" value={seekerProfile.nationality ?? ""} onChange={handleProfileChange} placeholder="Nationality" className="w-full p-3 bg-black/50 border border-orange-500/30 rounded-lg text-white text-sm" />
              </div>
              
              {/* COLUMN 2 - Contact & Location */}
              <div className="space-y-6 col-span-1 md:col-span-1">
                {/* Location */}
                <input type="text" name="location" value={seekerProfile.location ?? ""} onChange={handleProfileChange} placeholder="Location (e.g., City, Country)" className="w-full p-3 bg-black/50 border border-orange-500/30 rounded-lg text-white text-sm" />
                {/* Address (optional) */}
                <input type="text" name="address" value={seekerProfile.address ?? ""} onChange={handleProfileChange} placeholder="Full Address (optional)" className="w-full p-3 bg-black/50 border border-orange-500/30 rounded-lg text-white text-sm" />
                {/* Zip Code */}
                <input type="text" name="zipCode" value={seekerProfile.zipCode ?? ""} onChange={handleProfileChange} placeholder="Zip Code (optional)" className="w-full p-3 bg-black/50 border border-orange-500/30 rounded-lg text-white text-sm" />
                {/* Phone with country code */}
                <div className="flex gap-2">
                  <select name="phoneCountryCode" value={seekerProfile.phoneCountryCode ?? "+1"} onChange={handleProfileChange} className="p-3 bg-black/50 border border-orange-500/30 rounded-lg text-white text-sm w-28">
                    <option value="+1">+1 (US)</option>
                    <option value="+44">+44 (UK)</option>
                    <option value="+351">+351 (PT)</option>
                    <option value="+55">+55 (BR)</option>
                    <option value="+33">+33 (FR)</option>
                    <option value="+49">+49 (DE)</option>
                    <option value="+34">+34 (ES)</option>
                    <option value="+39">+39 (IT)</option>
                    <option value="+91">+91 (IN)</option>
                    <option value="+81">+81 (JP)</option>
                    <option value="+86">+86 (CN)</option>
                    <option value="+7">+7 (RU)</option>
                    <option value="+61">+61 (AU)</option>
                    <option value="+258">+258 (MZ)</option>
                    <option value="+244">+244 (AO)</option>
                    <option value="+27">+27 (ZA)</option>
                    <option value="+358">+358 (FI)</option>
                    <option value="+47">+47 (NO)</option>
                    <option value="+46">+46 (SE)</option>
                    <option value="+41">+41 (CH)</option>
                    <option value="+31">+31 (NL)</option>
                    <option value="+32">+32 (BE)</option>
                    <option value="+420">+420 (CZ)</option>
                    <option value="+48">+48 (PL)</option>
                    <option value="+40">+40 (RO)</option>
                    <option value="+90">+90 (TR)</option>
                  </select>
                  <input type="text" name="phone" value={seekerProfile.phone ?? ""} onChange={handleProfileChange} placeholder="Phone (optional)" className="w-full p-3 bg-black/50 border border-orange-500/30 rounded-lg text-white text-sm" />
                </div>
                {/* Alternative Contact with country code */}
                <div className="flex gap-2">
                  <select
                    name="altContactCountryCode"
                    value={seekerProfile.altContactCountryCode ?? "+1"}
                    onChange={handleProfileChange}
                    className="p-3 bg-black/50 border border-orange-500/30 rounded-lg text-white text-sm w-28"
                  >
                    <option value="+1">+1 (US)</option>
                    <option value="+44">+44 (UK)</option>
                    <option value="+351">+351 (PT)</option>
                    <option value="+55">+55 (BR)</option>
                    <option value="+33">+33 (FR)</option>
                    <option value="+49">+49 (DE)</option>
                    <option value="+34">+34 (ES)</option>
                    <option value="+39">+39 (IT)</option>
                    <option value="+91">+91 (IN)</option>
                    <option value="+81">+81 (JP)</option>
                    <option value="+86 (CN)">+86 (CN)</option>
                    <option value="+7">+7 (RU)</option>
                    <option value="+61">+61 (AU)</option>
                    <option value="+258">+258 (MZ)</option>
                    <option value="+244">+244 (AO)</option>
                    <option value="+27">+27 (ZA)</option>
                    <option value="+358">+358 (FI)</option>
                    <option value="+47">+47 (NO)</option>
                    <option value="+46">+46 (SE)</option>
                    <option value="+41">+41 (CH)</option>
                    <option value="+31">+31 (NL)</option>
                    <option value="+32">+32 (BE)</option>
                    <option value="+420">+420 (CZ)</option>
                    <option value="+48">+48 (PL)</option>
                    <option value="+40">+40 (RO)</option>
                    <option value="+90">+90 (TR)</option>
                  </select>
                  <input
                    type="text"
                    name="altContact"
                    value={seekerProfile.altContact ?? ""}
                    onChange={handleProfileChange}
                    placeholder="Alternative Contact (optional)"
                    className="w-full p-3 bg-black/50 border border-orange-500/30 rounded-lg text-white text-sm"
                  />
                </div>
              </div>
              
              {/* COLUMN 3 - Profile Content */}
              <div className="space-y-6 col-span-1 md:col-span-1">
                {/* Interest Area */}
                <input type="text" name="interestArea" value={seekerProfile.interestArea ?? ""} onChange={handleProfileChange} placeholder="Interest Area (optional)" className="w-full p-3 bg-black/50 border border-orange-500/30 rounded-lg text-white text-sm" />
                {/* CV Upload */}
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Upload CV (PDF, DOC, etc.)</label>
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx,.odt,.rtf,.txt"
                    onChange={handleCVUpload}
                    className="w-full text-white bg-black/50 border border-orange-500/30 rounded-lg p-2"
                  />
                  {isUploading && <span className="text-xs text-orange-400 ml-2">Uploading...</span>}
                  {seekerProfile.resumeUrl && (
                    <div className="mt-1">
                      <a href={seekerProfile.resumeUrl} target="_blank" rel="noopener noreferrer" className="text-blue-400 underline text-xs">
                        View uploaded CV
                      </a>
                    </div>
                  )}
                </div>
                {/* Resume Link */}
                <input
                  type="url"
                  name="resumeUrl"
                  value={seekerProfile.resumeUrl ?? ""}
                  onChange={handleProfileChange}
                  placeholder="Resume Link (optional)"
                  className="w-full p-3 bg-black/50 border border-orange-500/30 rounded-lg text-white text-sm"
                />
                {/* Presentation Video Link */}
                <input
                  type="url"
                  name="presentationVideoUrl"
                  value={seekerProfile.presentationVideoUrl ?? ""}
                  onChange={handleProfileChange}
                  placeholder="Presentation Video Link (optional)"
                  className="w-full p-3 bg-black/50 border border-orange-500/30 rounded-lg text-white text-sm"
                />
              </div>
            </div>
            
            {/* Bio - After personal data */}
            <div className="mb-8">
              <label className="block text-sm text-gray-400 mb-2">Short Bio</label>
              <textarea
                name="bio"
                value={seekerProfile.bio ?? ""}
                onChange={handleProfileChange}
                placeholder="Write a short professional bio (optional)"
                rows={5}
                className="w-full p-3 bg-black/50 border border-orange-500/30 rounded-lg text-white text-sm"
              ></textarea>
            </div>
            
            {/* Social Networks */}
            <h3 className="text-lg font-bold text-orange-400 mb-4">Social Networks</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
              <div className="space-y-6">
                {/* LinkedIn */}
                <input
                  type="url"
                  name="linkedinUrl"
                  value={seekerProfile.linkedinUrl ?? ""}
                  onChange={handleProfileChange}
                  placeholder="LinkedIn URL (optional)"
                  className="w-full p-3 bg-black/50 border border-orange-500/30 rounded-lg text-white text-sm"
                />
                {/* Twitter */}
                <input
                  type="url"
                  name="twitterUrl"
                  value={seekerProfile.twitterUrl ?? ""}
                  onChange={handleProfileChange}
                  placeholder="Twitter URL (optional)"
                  className="w-full p-3 bg-black/50 border border-orange-500/30 rounded-lg text-white text-sm"
                />
              </div>
              <div className="space-y-6">
                {/* Website */}
                <input
                  type="url"
                  name="websiteUrl"
                  value={seekerProfile.websiteUrl ?? ""}
                  onChange={handleProfileChange}
                  placeholder="Website URL (optional)"
                  className="w-full p-3 bg-black/50 border border-orange-500/30 rounded-lg text-white text-sm"
                />
                {/* Telegram */}
                <input
                  type="url"
                  name="telegramUrl"
                  value={seekerProfile.telegramUrl ?? ""}
                  onChange={handleProfileChange}
                  placeholder="Telegram URL (optional)"
                  className="w-full p-3 bg-black/50 border border-orange-500/30 rounded-lg text-white text-sm"
                />
              </div>
              <div className="space-y-6">
                {/* Instagram URL */}
                <input type="url" name="instagramUrl" value={seekerProfile.instagramUrl ?? ""} onChange={handleProfileChange} placeholder="Instagram URL (optional)" className="w-full p-3 bg-black/50 border border-orange-500/30 rounded-lg text-white text-sm" />
                {/* Facebook URL */}
                <input type="url" name="facebookUrl" value={seekerProfile.facebookUrl ?? ""} onChange={handleProfileChange} placeholder="Facebook URL (optional)" className="w-full p-3 bg-black/50 border border-orange-500/30 rounded-lg text-white text-sm" />
              </div>
            </div>
            
            {/* Languages */}
            <div className="mb-10">
              <label className="block text-sm text-gray-400 mb-2">Languages</label>
              {(seekerProfile.languages ?? []).map((lang, idx) => (
                <div key={idx} className="flex gap-2 mb-2">
                  <input type="text" name={`language-${idx}`} value={lang.language} onChange={e => { const updated = [...(seekerProfile.languages ?? [])]; updated[idx] = { ...updated[idx], language: e.target.value }; setSeekerProfile({ ...seekerProfile, languages: updated }); }} placeholder="Language (e.g., English)" className="p-2 bg-black/50 border border-orange-500/30 rounded-lg text-white text-sm flex-1" />
                  <select name={`proficiency-${idx}`} value={lang.proficiency} onChange={e => { const updated = [...(seekerProfile.languages ?? [])]; updated[idx] = { ...updated[idx], proficiency: e.target.value }; setSeekerProfile({ ...seekerProfile, languages: updated }); }} className="p-2 bg-black/50 border border-orange-500/30 rounded-lg text-white text-sm">
                    <option value="">Proficiency</option>
                    <option value="Native">Native</option>
                    <option value="Fluent">Fluent</option>
                    <option value="Intermediate">Intermediate</option>
                    <option value="Basic">Basic</option>
                  </select>
                  <button type="button" onClick={() => { const updated = [...(seekerProfile.languages ?? [])]; updated.splice(idx, 1); setSeekerProfile({ ...seekerProfile, languages: updated }); }} className="text-red-400 ml-2">Remove</button>
                </div>
              ))}
              <button type="button" onClick={() => { setSeekerProfile({ ...seekerProfile, languages: [...(seekerProfile.languages ?? []), { language: '', proficiency: '' }] }); }} className="text-orange-400 mt-2">+ Add Language</button>
            </div>
            
            {/* Career */}
            <h3 className="text-lg font-bold text-orange-400 mb-4">Career</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
              <div className="space-y-6">
                {/* Professional Title */}
                <input type="text" name="title" value={seekerProfile.title ?? ""} onChange={handleProfileChange} placeholder="Professional Title (e.g., Frontend Developer)" className="w-full p-3 bg-black/50 border border-orange-500/30 rounded-lg text-white text-sm" />
                {/* Skills */}
                <textarea name="skills" value={seekerProfile.skills ?? ""} onChange={handleProfileChange} placeholder="Your Skills (comma-separated, e.g., React, Node.js, Solidity)" rows={3} className="w-full p-3 bg-black/50 border border-orange-500/30 rounded-lg text-white text-sm"></textarea>
                
                {/* Projects */}
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Projects</label>
                  {(seekerProfile.projects ?? []).map((proj, idx) => (
                    <div key={idx} className="flex flex-col md:flex-row gap-2 mb-2">
                      <input type="text" name={`proj-name-${idx}`} value={proj.name} onChange={e => { const updated = [...(seekerProfile.projects ?? [])]; updated[idx] = { ...updated[idx], name: e.target.value }; setSeekerProfile({ ...seekerProfile, projects: updated }); }} placeholder="Project Name" className="p-2 bg-black/50 border border-orange-500/30 rounded-lg text-white text-sm flex-1" />
                      <input type="url" name={`proj-url-${idx}`} value={proj.url} onChange={e => { const updated = [...(seekerProfile.projects ?? [])]; updated[idx] = { ...updated[idx], url: e.target.value }; setSeekerProfile({ ...seekerProfile, projects: updated }); }} placeholder="Project URL" className="p-2 bg-black/50 border border-orange-500/30 rounded-lg text-white text-sm flex-1" />
                      <input type="text" name={`proj-technologies-${idx}`} value={proj.technologies} onChange={e => { const updated = [...(seekerProfile.projects ?? [])]; updated[idx] = { ...updated[idx], technologies: e.target.value }; setSeekerProfile({ ...seekerProfile, projects: updated }); }} placeholder="Technologies" className="p-2 bg-black/50 border border-orange-500/30 rounded-lg text-white text-sm flex-1" />
                      <textarea name={`proj-description-${idx}`} value={proj.description} onChange={e => { const updated = [...(seekerProfile.projects ?? [])]; updated[idx] = { ...updated[idx], description: e.target.value }; setSeekerProfile({ ...seekerProfile, projects: updated }); }} placeholder="Description" className="p-2 bg-black/50 border border-orange-500/30 rounded-lg text-white text-sm flex-1" />
                      <button type="button" onClick={() => { const updated = [...(seekerProfile.projects ?? [])]; updated.splice(idx, 1); setSeekerProfile({ ...seekerProfile, projects: updated }); }} className="text-red-400 ml-2">Remove</button>
                    </div>
                  ))}
                  <button type="button" onClick={() => { setSeekerProfile({ ...seekerProfile, projects: [...(seekerProfile.projects ?? []), { name: '', url: '', technologies: '', description: '' }] }); }} className="text-orange-400 mt-2">+ Add Project</button>
                </div>
                
                {/* Certifications */}
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Certifications</label>
                  {(seekerProfile.certifications ?? []).map((cert, idx) => (
                    <div key={idx} className="flex flex-wrap gap-2 mb-2">
                      <input type="text" name={`cert-name-${idx}`} value={cert.name} onChange={e => { const updated = [...(seekerProfile.certifications ?? [])]; updated[idx] = { ...updated[idx], name: e.target.value }; setSeekerProfile({ ...seekerProfile, certifications: updated }); }} placeholder="Certification Name" className="p-2 bg-black/50 border border-orange-500/30 rounded-lg text-white text-sm flex-1" />
                      <input type="text" name={`cert-issuer-${idx}`} value={cert.issuer} onChange={e => { const updated = [...(seekerProfile.certifications ?? [])]; updated[idx] = { ...updated[idx], issuer: e.target.value }; setSeekerProfile({ ...seekerProfile, certifications: updated }); }} placeholder="Issuer" className="p-2 bg-black/50 border border-orange-500/30 rounded-lg text-white text-sm flex-1" />
                      <input type="text" name={`cert-date-${idx}`} value={cert.date} onChange={e => { const updated = [...(seekerProfile.certifications ?? [])]; updated[idx] = { ...updated[idx], date: e.target.value }; setSeekerProfile({ ...seekerProfile, certifications: updated }); }} placeholder="Date" className="p-2 bg-black/50 border border-orange-500/30 rounded-lg text-white text-sm flex-1" />
                      <input type="url" name={`cert-url-${idx}`} value={cert.url} onChange={e => { const updated = [...(seekerProfile.certifications ?? [])]; updated[idx] = { ...updated[idx], url: e.target.value }; setSeekerProfile({ ...seekerProfile, certifications: updated }); }} placeholder="Credential URL" className="p-2 bg-black/50 border border-orange-500/30 rounded-lg text-white text-sm flex-1" />
                      <button type="button" onClick={() => { const updated = [...(seekerProfile.certifications ?? [])]; updated.splice(idx, 1); setSeekerProfile({ ...seekerProfile, certifications: updated }); }} className="text-red-400 ml-2">Remove</button>
                    </div>
                  ))}
                  <button type="button" onClick={() => { setSeekerProfile({ ...seekerProfile, certifications: [...(seekerProfile.certifications ?? []), { name: '', issuer: '', date: '', url: '' }] }); }} className="text-orange-400 mt-2">+ Add Certification</button>
                </div>
                
                {/* Professional References */}
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Professional References</label>
                  {(seekerProfile.references ?? []).map((ref, idx) => (
                    <div key={idx} className="flex flex-col md:flex-row gap-2 mb-2">
                      <input type="text" name={`ref-name-${idx}`} value={ref.name} onChange={e => { const updated = [...(seekerProfile.references ?? [])]; updated[idx] = { ...updated[idx], name: e.target.value }; setSeekerProfile({ ...seekerProfile, references: updated }); }} placeholder="Name" className="p-2 bg-black/50 border border-orange-500/30 rounded-lg text-white text-sm flex-1" />
                      <input type="text" name={`ref-contact-${idx}`} value={ref.contact} onChange={e => { const updated = [...(seekerProfile.references ?? [])]; updated[idx] = { ...updated[idx], contact: e.target.value }; setSeekerProfile({ ...seekerProfile, references: updated }); }} placeholder="Contact" className="p-2 bg-black/50 border border-orange-500/30 rounded-lg text-white text-sm flex-1" />
                      <input type="text" name={`ref-relation-${idx}`} value={ref.relation} onChange={e => { const updated = [...(seekerProfile.references ?? [])]; updated[idx] = { ...updated[idx], relation: e.target.value }; setSeekerProfile({ ...seekerProfile, references: updated }); }} placeholder="Relation" className="p-2 bg-black/50 border border-orange-500/30 rounded-lg text-white text-sm flex-1" />
                      <button type="button" onClick={() => { const updated = [...(seekerProfile.references ?? [])]; updated.splice(idx, 1); setSeekerProfile({ ...seekerProfile, references: updated }); }} className="text-red-400 ml-2">Remove</button>
                    </div>
                  ))}
                  <button type="button" onClick={() => { setSeekerProfile({ ...seekerProfile, references: [...(seekerProfile.references ?? []), { name: '', contact: '', relation: '' }] }); }} className="text-orange-400 mt-2">+ Add Reference</button>
                </div>
              </div>
              
              <div className="space-y-6">
                {/* Professional Experience */}
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Professional Experience</label>
                  {(seekerProfile.experience ?? []).map((exp, idx) => (
                    <div key={idx} className="flex flex-col gap-2 mb-4 bg-black/30 p-3 rounded-lg">
                      <input type="text" name={`exp-position-${idx}`} value={exp.position} onChange={e => { const updated = [...(seekerProfile.experience ?? [])]; updated[idx] = { ...updated[idx], position: e.target.value }; setSeekerProfile({ ...seekerProfile, experience: updated }); }} placeholder="Position" className="p-2 bg-black/50 border border-orange-500/30 rounded-lg text-white text-sm w-full" />
                      <input type="text" name={`exp-company-${idx}`} value={exp.company} onChange={e => { const updated = [...(seekerProfile.experience ?? [])]; updated[idx] = { ...updated[idx], company: e.target.value }; setSeekerProfile({ ...seekerProfile, experience: updated }); }} placeholder="Company" className="p-2 bg-black/50 border border-orange-500/30 rounded-lg text-white text-sm w-full" />
                      <div className="flex gap-2">
                        <input type="text" name={`exp-location-${idx}`} value={exp.location} onChange={e => { const updated = [...(seekerProfile.experience ?? [])]; updated[idx] = { ...updated[idx], location: e.target.value }; setSeekerProfile({ ...seekerProfile, experience: updated }); }} placeholder="Location" className="p-2 bg-black/50 border border-orange-500/30 rounded-lg text-white text-sm flex-1" />
                        <input type="text" name={`exp-startDate-${idx}`} value={exp.startDate} onChange={e => { const updated = [...(seekerProfile.experience ?? [])]; updated[idx] = { ...updated[idx], startDate: e.target.value }; setSeekerProfile({ ...seekerProfile, experience: updated }); }} placeholder="Start Date (YYYY-MM)" className="p-2 bg-black/50 border border-orange-500/30 rounded-lg text-white text-sm flex-1" />
                        <input type="text" name={`exp-endDate-${idx}`} value={exp.endDate} onChange={e => { const updated = [...(seekerProfile.experience ?? [])]; updated[idx] = { ...updated[idx], endDate: e.target.value }; setSeekerProfile({ ...seekerProfile, experience: updated }); }} placeholder="End Date (YYYY-MM or Present)" className="p-2 bg-black/50 border border-orange-500/30 rounded-lg text-white text-sm flex-1" />
                      </div>
                      <textarea name={`exp-description-${idx}`} value={exp.description} onChange={e => { const updated = [...(seekerProfile.experience ?? [])]; updated[idx] = { ...updated[idx], description: e.target.value }; setSeekerProfile({ ...seekerProfile, experience: updated }); }} placeholder="Description" className="p-2 bg-black/50 border border-orange-500/30 rounded-lg text-white text-sm w-full" rows={3} />
                      <button type="button" onClick={() => { const updated = [...(seekerProfile.experience ?? [])]; updated.splice(idx, 1); setSeekerProfile({ ...seekerProfile, experience: updated }); }} className="text-red-400 self-end">Remove Experience</button>
                    </div>
                  ))}
                  <button type="button" onClick={() => { setSeekerProfile({ ...seekerProfile, experience: [...(seekerProfile.experience ?? []), { position: '', company: '', location: '', startDate: '', endDate: '', current: false, description: '' }] }); }} className="text-orange-400 mt-2">+ Add Experience</button>
                </div>
                
                {/* Education */}
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Education</label>
                  {(seekerProfile.education ?? []).map((edu, idx) => (
                    <div key={idx} className="flex flex-col gap-2 mb-4 bg-black/30 p-3 rounded-lg">
                      <input type="text" name={`edu-degree-${idx}`} value={edu.degree} onChange={e => { const updated = [...(seekerProfile.education ?? [])]; updated[idx] = { ...updated[idx], degree: e.target.value }; setSeekerProfile({ ...seekerProfile, education: updated }); }} placeholder="Degree" className="p-2 bg-black/50 border border-orange-500/30 rounded-lg text-white text-sm w-full" />
                      <input type="text" name={`edu-institution-${idx}`} value={edu.institution} onChange={e => { const updated = [...(seekerProfile.education ?? [])]; updated[idx] = { ...updated[idx], institution: e.target.value }; setSeekerProfile({ ...seekerProfile, education: updated }); }} placeholder="Institution" className="p-2 bg-black/50 border border-orange-500/30 rounded-lg text-white text-sm w-full" />
                      <input type="text" name={`edu-year-${idx}`} value={edu.year} onChange={e => { const updated = [...(seekerProfile.education ?? [])]; updated[idx] = { ...updated[idx], year: e.target.value }; setSeekerProfile({ ...seekerProfile, education: updated }); }} placeholder="Year" className="p-2 bg-black/50 border border-orange-500/30 rounded-lg text-white text-sm w-full" />
                      <textarea name={`edu-description-${idx}`} value={edu.description} onChange={e => { const updated = [...(seekerProfile.education ?? [])]; updated[idx] = { ...updated[idx], description: e.target.value }; setSeekerProfile({ ...seekerProfile, education: updated }); }} placeholder="Description" className="p-2 bg-black/50 border border-orange-500/30 rounded-lg text-white text-sm w-full" rows={2} />
                      <button type="button" onClick={() => { const updated = [...(seekerProfile.education ?? [])]; updated.splice(idx, 1); setSeekerProfile({ ...seekerProfile, education: updated }); }} className="text-red-400 self-end">Remove Education</button>
                    </div>
                  ))}
                  <button type="button" onClick={() => { setSeekerProfile({ ...seekerProfile, education: [...(seekerProfile.education ?? []), { degree: '', institution: '', year: '', description: '' }] }); }} className="text-orange-400 mt-2">+ Add Education</button>
                </div>
              </div>
            </div>
            
            {/* What I'm Looking For */}
            <h3 className="text-lg font-bold text-orange-400 mb-4">What I'm Looking For</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-10">
              <div className="space-y-6">
                {/* Availability */}
                <input type="text" name="availability" value={seekerProfile.availability ?? ""} onChange={handleProfileChange} placeholder="Availability (e.g., Immediate, 15 days notice)" className="w-full p-3 bg-black/50 border border-orange-500/30 rounded-lg text-white text-sm" />
                {/* Salary Expectation */}
                <input type="text" name="salaryExpectation" value={seekerProfile.salaryExpectation ?? ""} onChange={handleProfileChange} placeholder="Salary Expectation (e.g., $3000-4000/mo)" className="w-full p-3 bg-black/50 border border-orange-500/30 rounded-lg text-white text-sm" />
              </div>
              <div className="space-y-6">
                {/* Contract Type */}
                <select name="contractType" value={seekerProfile.contractType ?? ""} onChange={handleProfileChange} className="w-full p-3 bg-black/50 border border-orange-500/30 rounded-lg text-white text-sm">
                  <option value="">Contract Type</option>
                  <option value="Full Time">Full Time</option>
                  <option value="Part Time">Part Time</option>
                  <option value="Other">Other</option>
                </select>
                {/* Interest Area (repeated) */}
                <input type="text" name="interestArea" value={seekerProfile.interestArea ?? ""} onChange={handleProfileChange} placeholder="Interest Area (e.g., Frontend, Blockchain, Design)" className="w-full p-3 bg-black/50 border border-orange-500/30 rounded-lg text-white text-sm" />
              </div>
              <div className="space-y-6">
                {/* Work Preference */}
                <select name="workPreference" value={seekerProfile.workPreference ?? ""} onChange={handleProfileChange} className="w-full p-3 bg-black/50 border border-orange-500/30 rounded-lg text-white text-sm">
                  <option value="">Work Preference</option>
                  <option value="Remote">Remote</option>
                  <option value="Hybrid">Hybrid</option>
                  <option value="Onsite">Onsite</option>
                </select>
                {/* Extra Preferences */}
                <div className="flex flex-wrap gap-4 mt-4">
                  <label className="flex items-center gap-2 text-white">
                  </label>
                  <label className="flex items-center gap-2 text-white">
                    <input type="checkbox" name="willingToRelocate" checked={!!seekerProfile.willingToRelocate} onChange={e => setSeekerProfile({ ...seekerProfile, willingToRelocate: e.target.checked })} /> Willing to Relocate
                  </label>
                  <label className="flex items-center gap-2 text-white">
                    <input type="checkbox" name="cryptoPaymentPreference" checked={!!seekerProfile.cryptoPaymentPreference} onChange={e => setSeekerProfile({ ...seekerProfile, cryptoPaymentPreference: e.target.checked })} /> Accept Crypto Payment
                  </label>
                </div>
              </div>
            </div>
            
            {/* Profile Sharing */}
            <div className="mb-8">
              <label className="flex items-center gap-2 text-white">
                <input type="checkbox" name="shareProfile" checked={!!seekerProfile.shareProfile} onChange={e => setSeekerProfile({ ...seekerProfile, shareProfile: e.target.checked })} />
                Allow your full profile to be shared with hiring companies?
              </label>
            </div>
            
            {/* Save Button */}
            <div>
              <button type="submit" disabled={isLoadingProfile} className={`bg-orange-500 text-white py-3 px-8 rounded-full font-semibold text-lg cursor-pointer transition-colors hover:bg-orange-300 border-none w-full mt-5 ${isLoadingProfile ? 'opacity-50 cursor-not-allowed' : ''}`}>{isLoadingProfile ? 'Saving...' : 'Save Profile'}</button>
            </div>
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
  
  // Reference to the end of messages element (for auto-scroll)
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to the last message when new messages are loaded
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [ticketMessages]);

  // Fetch seeker's notifications from the notifications collection every 10s
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

  // Detect and process notifications that require wallet connection
  useEffect(() => {
    if (!seekerId || !db) return;
    
    // Check if there are notifications of type "wallet_needed"
    const checkForWalletNeededNotifications = async () => {
      try {
        const q = query(
          collection(db, "notifications"),
          where("userId", "==", seekerId),
          where("type", "==", "wallet_needed"),
          where("read", "==", false)
        );
        
        const notifSnapshot = await getDocs(q);
        
        if (!notifSnapshot.empty) {
          // There is at least one notification requesting wallet connection
          // Show a modal or an alert to the user
          const walletNeededNotif = notifSnapshot.docs[0];
          const jobId = walletNeededNotif.data().jobId;
          
          if (!walletAddress) {
            const confirmConnect = window.confirm(
              "Congratulations! One of your applications for Instant Jobs has been approved. " +
              "To receive payment when the job is completed, you need to connect your wallet. " +
              "Would you like to connect now?"
            );
            
            if (confirmConnect) {
              const address = await handleConnectWallet();
              if (address) {
                // Fetch the approved application for this job
                const applicationsCollection = collection(db, "jobApplications");
                const appQuery = query(
                  applicationsCollection, 
                  where("jobId", "==", jobId),
                  where("workerId", "==", seekerId),
                  where("status", "==", "approved")
                );
                
                const appSnapshot = await getDocs(appQuery);
                if (!appSnapshot.empty) {
                  const application = appSnapshot.docs[0];
                  // Update the wallet address in the application and job
                  await instantJobsService.updateApplicationWalletAddress(
                    application.id,
                    seekerId,
                    address
                  );
                  
                  // Mark notification as read
                  await updateDoc(doc(db, "notifications", walletNeededNotif.id), {
                    read: true
                  });
                  
                  alert("Your wallet has been successfully connected and is ready to receive payments!");
                }
              }
            }
          }
        }
      } catch (error) {
        console.error("Error checking for wallet notifications:", error);
      }
    };
    
    // Check on initialization and when wallet address changes
    checkForWalletNeededNotifications();
    
  }, [seekerId, walletAddress, db]);

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

  return (    <Layout>
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
        
        {/* Sidebar - Changes for mobile responsiveness */}
        <aside 
          className={`${isMobile ? 'fixed left-0 top-0 h-full z-40 transform transition-transform duration-300 ease-in-out ' + (mobileMenuOpen ? 'translate-x-0' : '-translate-x-full') : 'relative'} w-full md:w-1/4 bg-black/70 p-6 flex flex-col`}
        >
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
                className="w-full h-full object-cover rounded-full cursor-pointer hover:opacity-80 transition-opacity"
                onClick={() => document.getElementById('profile-photo-upload')?.click()}
                title="Click to change profile photo"
              />
              <input 
                type="file"
                id="profile-photo-upload"
                accept="image/*"
                onChange={handleUserPhotoChange}
                className="hidden"
                aria-label="Upload profile photo"
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
            {walletAddress ? (
              <div className="mt-2 mb-4 px-3 py-1 rounded bg-black/30 border border-orange-500/30 text-orange-400 text-xs flex items-center justify-center mx-auto hover:bg-orange-900/20 transition-all">
                <span className="flex items-center gap-2">
                  <span className="truncate max-w-[100px]">{walletAddress.substring(0, 6)}...{walletAddress.substring(walletAddress.length - 4)}</span>
                  <button
                    type="button"
                    onClick={() => setWalletAddress(null)}
                    className="ml-1 p-0.5 rounded hover:bg-orange-900/30 text-orange-400 hover:text-orange-200 transition"
                    title="Disconnect Wallet"
                    aria-label="Disconnect Wallet"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </span>
              </div>
            ) : (
              <button
                onClick={handleConnectWallet}
                disabled={isConnectingWallet}
                className="mt-2 mb-4 px-3 py-1 rounded bg-black/30 border border-orange-500/30 text-orange-400 text-xs flex items-center justify-center mx-auto hover:bg-orange-900/20 transition-all"
              >
                {isConnectingWallet ? <span>Connecting...</span> : <span>Connect Wallet</span>}
              </button>
            )}
          </div>
          {/* Navigation Menu */}
          <nav className="flex-1">
            <ul className="space-y-2">
              <li>
                <button
                  className={`w-full text-left py-2 px-4 rounded-lg ${activeTab === "myProfile" ? "bg-orange-500 text-white" : "text-gray-400 hover:text-orange-500"}`}
                  onClick={() => handleTabChange("myProfile")}
                >
                  My Profile
                </button>
              </li>
              <li>
                <button
                  className={`w-full text-left py-2 px-4 rounded-lg ${activeTab === "myApplications" ? "bg-orange-500 text-white" : "text-gray-400 hover:text-orange-500"}`}
                  onClick={() => handleTabChange("myApplications")}
                >
                  My Applications
                </button>
              </li>
              <li>
                <button
                  className={`w-full text-left py-2 px-4 rounded-lg ${activeTab === "instantJobs" ? "bg-orange-500 text-white" : "text-gray-400 hover:text-orange-500"}`}
                  onClick={() => handleTabChange("instantJobs")}
                >
                  Instant Jobs
                </button>
              </li>
              <li>
                <button
                  className={`w-full text-left py-2 px-4 rounded-lg ${activeTab === "settings" ? "bg-orange-500 text-white" : "text-gray-400 hover:text-orange-500"}`}
                  onClick={() => handleTabChange("settings")}
                >
                  Settings
                </button>
              </li>
              <li>
                <button
                  className={`w-full text-left py-2 px-4 rounded-lg ${activeTab === "support" ? "bg-orange-500 text-white" : "text-gray-400 hover:text-orange-500"}`}
                  onClick={() => handleTabChange("support")}
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
                <path fillRule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 001 1h12a1 1 0 001-1V4a1 1 0 00-1-1H3zm11 4a1 1 0 10-2 0v4.586l-1.293-1.293a1 1 0 00-1.414 1.414l-3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L14 11.586V7z" clipRule="evenodd" />
              </svg>
              Logout
            </button>
          </nav>
        </aside>
        {/* Main Content Area */}
        <section className="w-full md:w-3/4 p-6 overflow-y-auto">
          {/* Maintain the render of main contents */}
          {activeTab === "myProfile" && renderMyProfile()}
          {activeTab === "myApplications" && renderMyApplications()}
          {activeTab === "instantJobs" && renderInstantJobsTab()}
          {activeTab === "settings" && renderSettings()}
          {activeTab === "support" && (
            <div className="bg-black/70 p-10 rounded-lg shadow-lg">
              <h2 className="text-3xl font-semibold text-orange-500 mb-6">Support</h2>
              {/* Tabs for New Ticket and My Tickets */}
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
              
              {/* New Ticket Form */}
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
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-300 mb-1">Attachment (optional)</label>
                    <input
                      type="file"
                      className="w-full text-white"
                      onChange={handleTicketFileChange}
                    />
                  </div>
                  {ticketError && <div className="text-red-400">{ticketError}</div>}
                  {ticketSuccess && <div className="text-green-400">{ticketSuccess}</div>}
                  <button
                    type="submit"
                    className="bg-orange-500 text-white py-2 px-6 rounded hover:bg-orange-600 disabled:opacity-60"
                    disabled={ticketLoading}
                  >
                    {ticketLoading ? 'Submitting...' : 'Submit Ticket'}
                  </button>
                </form>
              )}
              
              {/* My Tickets View */}
              {activeSupportTab === 'my' && (
                <div className="flex flex-col md:flex-row gap-6">
                  {/* Tickets List - Left Side */}
                  <div className="md:w-1/3 max-h-[600px] overflow-y-auto">
                    {loadingTickets ? (
                      <div className="text-gray-400">Loading tickets...</div>
                    ) : (
                      <div className="space-y-2">
                        {myTickets.map(ticket => (
                          <div key={ticket.id}>
                            <button
                              className={`w-full text-left p-3 rounded-lg border ${selectedTicket?.id === ticket.id ? 'border-orange-500 bg-black/60' : 'border-gray-700 bg-black/40'} transition`}
                              onClick={() => setSelectedTicket(ticket)}
                            >
                              <div className="font-semibold text-orange-400 truncate">{ticket.subject}</div>
                              <div className="text-xs text-gray-400 truncate">{ticket.area}</div>
                              <div className="text-xs text-gray-500">{new Date(ticket.createdAt || Date.now()).toLocaleString()}</div>
                              <div className="text-xs mt-1"><span className={`px-2 py-0.5 rounded ${ticket.status === 'open' ? 'bg-yellow-900 text-yellow-300' : 'bg-green-900 text-green-300'}`}>{ticket.status}</span></div>
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  {/* Ticket Details and Chat - Right Side */}
                  <div className="flex-1 min-w-0">
                    {selectedTicket ? (
                      <div className="bg-black/60 rounded-lg p-6 flex flex-col h-[600px]">
                        {/* Ticket Header */}
                        <div className="mb-4">
                          <div className="text-lg font-bold text-orange-400">{selectedTicket.subject}</div>
                          <div className="text-sm text-gray-400">Area: {selectedTicket.area}</div>
                          <div className="text-xs text-gray-500">Opened: {new Date(selectedTicket.createdAt || Date.now()).toLocaleString()}</div>
                          <div className="text-xs mt-1"><span className={`px-2 py-0.5 rounded ${selectedTicket.status === 'open' ? 'bg-yellow-900 text-yellow-300' : 'bg-green-900 text-green-300'}`}>{selectedTicket.status}</span></div>
                          <div className="mt-2 text-gray-300">{selectedTicket.description}</div>
                          {selectedTicket.attachmentUrl && (
                            <div className="mt-2"><a href={selectedTicket.attachmentUrl} target="_blank" rel="noopener noreferrer" className="text-blue-400 underline">View Attachment</a></div>
                          )}
                        </div>
                        
                        {/* Messages Container with Fixed Height and Scrollbar */}
                        <div className="flex-1 overflow-y-auto border-t border-orange-900 pt-4 mb-4 custom-scrollbar">
                          {ticketMessages.length === 0 ? (
                            <div className="text-gray-400">No messages yet.</div>
                          ) : (
                            <div className="space-y-3">
                              {ticketMessages.map(msg => (
                                <div key={msg.id} className={`flex ${msg.senderType === 'seeker' ? 'justify-end' : 'justify-start'}`}>
                                  <div className={`max-w-xs px-3 py-2 rounded-lg text-sm ${msg.senderType === 'seeker' ? 'bg-orange-500 text-white' : msg.isSystemMessage ? 'bg-gray-700/50 text-gray-300 italic' : 'bg-gray-700 text-gray-100'}`}>
                                    {msg.message}
                                    <div className="text-xs text-gray-300 mt-1 text-right">{new Date(msg.createdAt).toLocaleString()}</div>
                                  </div>
                                </div>
                              ))}
                              <div ref={messagesEndRef} />
                            </div>
                          )}
                        </div>
                        
                        {/* Message Input Form */}
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
                          <div className="text-yellow-400 text-sm mt-auto">You can send messages after a support agent accepts your ticket.</div>
                        )}
                        
                        {selectedTicket.status === 'closed' && (
                          <div className="text-green-400 text-sm mt-auto">This ticket has been resolved and closed.</div>
                        )}
                      </div>
                    ) : (
                      <div className="text-gray-400 flex items-center justify-center h-[600px] bg-black/40 rounded-lg">
                        Select a ticket to view details and chat history
                      </div>
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