"use client";

import React, { useState, useEffect, JSX, useCallback } from "react";
import Layout from "../../components/Layout"; // Assuming Layout component exists and is suitable
import { useRouter } from "next/navigation";
import { collection, getDocs, doc, getDoc, updateDoc, query, where } from "firebase/firestore"; // Add necessary imports
import { db } from "../../lib/firebase"; // Assuming db instance is correctly configured
import instantJobsService, { InstantJob, JobMessage } from '../../services/instantJobsService';
import InstantJobCard from '../../components/instant-jobs/InstantJobCard';
import MessageSystem from '../../components/instant-jobs/MessageSystem';
import { connectWallet, getCurrentAddress, getWeb3Provider } from "../../services/crypto";

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

const SeekerDashboard = () => {
  const [activeTab, setActiveTab] = useState("myProfile"); // Default tab
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
    router.replace("/admin-login"); // Updated to redirect to the new login page
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


  // Render Settings Tab Content (Editable Form)
  const renderSettings = () => {
    return (
      <div className="bg-black/70 p-10 rounded-lg shadow-lg">
        <h2 className="text-3xl font-semibold text-orange-500 mb-6">Settings</h2>
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

  return (
    <Layout>
      <div className="container mx-auto py-10">
        <h1 className="text-4xl font-bold text-orange-500 mb-8">Dashboard</h1>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Sidebar Navigation */}
          <div className="md:col-span-1">
            <div className="bg-black rounded-lg shadow-lg border border-orange-800">
              {/* User Profile Section */}
              <div className="p-5 border-b border-orange-800 flex flex-col items-center">
                <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-orange-500 mb-3">
                  <img 
                    src={userPhoto || "/images/default-avatar.png"} 
                    alt="Profile" 
                    className="w-full h-full object-cover"
                  />
                </div>
                <h2 className="text-xl font-semibold text-orange-400">{seekerProfile.name || "User"}</h2>
                <p className="text-gray-400 text-sm truncate w-full text-center">{seekerProfile.email}</p>
              </div>
              
              {/* Navigation Menu */}
              <nav className="p-2">
                <button 
                  onClick={() => setActiveTab("myProfile")} 
                  className={`w-full text-left px-4 py-3 rounded-md mb-2 transition-colors ${
                    activeTab === "myProfile" 
                      ? "bg-orange-500 text-white" 
                      : "text-gray-300 hover:bg-orange-500/20"
                  }`}
                >
                  My Profile
                </button>
                <button 
                  onClick={() => setActiveTab("myApplications")} 
                  className={`w-full text-left px-4 py-3 rounded-md mb-2 transition-colors ${
                    activeTab === "myApplications" 
                      ? "bg-orange-500 text-white" 
                      : "text-gray-300 hover:bg-orange-500/20"
                  }`}
                >
                  My Applications
                </button>
                <button 
                  onClick={() => setActiveTab("instantJobs")} 
                  className={`w-full text-left px-4 py-3 rounded-md mb-2 transition-colors ${
                    activeTab === "instantJobs" 
                      ? "bg-orange-500 text-white" 
                      : "text-gray-300 hover:bg-orange-500/20"
                  }`}
                >
                  Instant Jobs
                </button>
                <button 
                  onClick={() => setActiveTab("settings")} 
                  className={`w-full text-left px-4 py-3 rounded-md mb-2 transition-colors ${
                    activeTab === "settings" 
                      ? "bg-orange-500 text-white" 
                      : "text-gray-300 hover:bg-orange-500/20"
                  }`}
                >
                  Settings
                </button>
                
                {/* Wallet Connection Button */}
                <div className="px-3 py-4 border-t border-orange-800/50 mt-2">
                  <button 
                    onClick={handleConnectWallet} 
                    disabled={isConnectingWallet}
                    className="w-full bg-gradient-to-r from-orange-500 to-orange-600 text-white py-3 px-4 rounded-md hover:from-orange-600 hover:to-orange-700 transition-all flex items-center justify-center space-x-2"
                  >
                    {walletAddress ? (
                      <>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="truncate max-w-[120px]">
                          {walletAddress.substring(0, 6)}...{walletAddress.substring(walletAddress.length - 4)}
                        </span>
                      </>
                    ) : isConnectingWallet ? (
                      <span>Connecting...</span>
                    ) : (
                      <>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2z" />
                        </svg>
                        <span>Connect Wallet</span>
                      </>
                    )}
                  </button>
                  {walletError && <p className="text-red-400 text-xs mt-1">{walletError}</p>}
                  {walletAddress && <p className="text-green-400 text-xs mt-1">Wallet connected</p>}
                </div>
                
                <button 
                  onClick={handleLogout} 
                  className="w-full text-left px-4 py-3 rounded-md mb-2 text-red-400 hover:bg-red-900/20 transition-colors mt-2"
                >
                  Logout
                </button>
              </nav>
            </div>
          </div>

          {/* Main Content Area */}
          <div className="md:col-span-3">
            {activeTab === "myProfile" && renderMyProfile()}
            {activeTab === "myApplications" && renderMyApplications()}
            {activeTab === "instantJobs" && renderInstantJobsTab()}
            {activeTab === "settings" && renderSettings()}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default SeekerDashboard;