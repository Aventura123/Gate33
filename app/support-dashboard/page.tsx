"use client";

import Layout from "../../components/Layout";
import { useState, useEffect, useCallback } from "react";
import { collection, getDocs, addDoc, deleteDoc, doc, query, where, updateDoc, getDoc } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { useRouter } from "next/navigation";
import { useAdminPermissions } from "../../hooks/useAdminPermissions";
import { logSystemActivity, logAdminAction } from "../../utils/logSystem";
import { 
  createNotification, 
  createSupportMessageNotification, 
  createCompanyNotification,
  createSupportMessageNotificationForCompany,
  createTicketStatusNotificationForCompany,
  createTicketStatusNotification,
  createTicketAcceptedNotificationForCompany,
  createTicketAcceptedNotification
  // Remova ou adicione aqui apenas funções que realmente existem em ../../lib/notifications
} from "../../lib/notifications";
import '../../styles/support-dashboard.css';

// Define the interface for support ticket
interface SupportTicket {
  id: string;
  subject: string;
  area: string;
  seekerEmail: string;
  description: string;
  status: string;
  createdAt?: string;
  updatedAt?: string;
  acceptedBy?: string;
  acceptedByName?: string;
  attachmentUrl?: string;
  closedBy?: string;
  closedByName?: string;
  closedAt?: string;
}

// Define the interface for support messages
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

const SupportDashboard: React.FC = () => {
  const router = useRouter();
  const { role, loading: permissionsLoading, error: permissionsError } = useAdminPermissions({
    redirectUrl: "/support-login" // Specify that we want to redirect to the support login
  });
  
  const [activeTab, setActiveTab] = useState<"jobs" | "instantJobs" | "chat">("jobs");
  const [activeSubTab, setActiveSubTab] = useState<string | null>("list");
  
  // State for job management
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
  
  // State for instant job management
  const [instantJobs, setInstantJobs] = useState<any[]>([]);
  const [instantJobsLoading, setInstantJobsLoading] = useState(false);
  const [instantJobsError, setInstantJobsError] = useState<string | null>(null);

  // States for support ticket management
  const [selectedTicket, setSelectedTicket] = useState<any | null>(null);
  const [ticketMessages, setTicketMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);
  const [ticketSearchQuery, setTicketSearchQuery] = useState("");
  const [ticketStatusFilter, setTicketStatusFilter] = useState<'all' | 'open' | 'closed'>('all');

  // States for search bar
  const [jobSearchQuery, setJobSearchQuery] = useState("");
  const [instantJobSearchQuery, setInstantJobSearchQuery] = useState("");
  const [filteredJobs, setFilteredJobs] = useState<any[]>([]);
  const [filteredInstantJobs, setFilteredInstantJobs] = useState<any[]>([]);
  
  // State for tracking tickets with unread messages
  const [ticketsWithUnreadMessages, setTicketsWithUnreadMessages] = useState<string[]>([]);
  // State for controlling automatic refresh interval (every minute)
  const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null);
  const [lastCheckTime, setLastCheckTime] = useState<Date | null>(null);
  
  // Separate states for seeker and company tickets
  const [seekerTickets, setSeekerTickets] = useState<SupportTicket[]>([]);
  const [companyTickets, setCompanyTickets] = useState<any[]>([]);
  const [ticketsTypeTab, setTicketsTypeTab] = useState<'seekers' | 'companies'>('seekers');
  const [filteredSeekerTickets, setFilteredSeekerTickets] = useState<SupportTicket[]>([]);
  const [filteredCompanyTickets, setFilteredCompanyTickets] = useState<any[]>([]);
  const [seekerTicketsLoading, setSeekerTicketsLoading] = useState(false);
  const [seekerTicketsError, setSeekerTicketsError] = useState<string | null>(null);
  const [companyTicketsLoading, setCompanyTicketsLoading] = useState(false);
  const [companyTicketsError, setCompanyTicketsError] = useState<string | null>(null);
  
  // State for closed tickets archive
  const [ticketsSubSection, setTicketsSubSection] = useState<'active' | 'closed'>('active');
  const [closedSeekerTickets, setClosedSeekerTickets] = useState<SupportTicket[]>([]);
  const [closedCompanyTickets, setClosedCompanyTickets] = useState<any[]>([]);
  const [filteredClosedSeekerTickets, setFilteredClosedSeekerTickets] = useState<SupportTicket[]>([]);
  const [filteredClosedCompanyTickets, setFilteredClosedCompanyTickets] = useState<any[]>([]);
  const [closedTicketsLoading, setClosedTicketsLoading] = useState(false);
  const [closedTicketsError, setClosedTicketsError] = useState<string | null>(null);

  // Authentication and permissions verification
  useEffect(() => {
    // Check if the user is logged in
    const token = localStorage.getItem("token");
    if (!token) {
      console.log("Token not found, redirecting to support login");
      router.replace("/support-login");
      return;
    }
    
    // Check user permissions after loading
    if (!permissionsLoading) {
      if (permissionsError) {
        console.error("Error loading permissions:", permissionsError);
        router.replace("/support-login");
        return;
      }
      
      // Check if user has support or super_admin role
      if (role !== 'support' && role !== 'super_admin') {
        console.log("User doesn't have support permissions:", role);
        router.replace("/support-login"); // Changed from "/admin/access-denied" to "/support-login"
        return;
      }
      
      // Log access to the support panel
      const logAccess = async () => {
        try {
          const userId = localStorage.getItem("userId") || "unknown";
          const userName = localStorage.getItem("userName") || "unknown";
          await logSystemActivity(
            "admin_action",
            userName,
            {
              userId,
              userRole: role,
              action: "Access to support panel",
              timestamp: new Date().toISOString(),
              browser: navigator.userAgent
            }
          );
          console.log("Access to support panel logged successfully");
        } catch (error) {
          console.error("Error logging access:", error);
        }
      };
      
      logAccess();
    }
  }, [permissionsLoading, permissionsError, role, router]);

  // Function to fetch jobs
  const fetchJobs = async () => {
    setJobsLoading(true);
    setJobsError(null);
    try {
      if (!db) {
        console.error("Firestore is not initialized.");
        throw new Error("Firestore is not initialized.");
      }

      const jobsCollection = collection(db, "jobs");
      const querySnapshot = await getDocs(jobsCollection);

      const jobsList = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      setJobs(jobsList);
    } catch (error) {
      console.error("Error fetching jobs:", error);
      setJobsError("Failed to fetch jobs. Please check the console for more details.");
      setJobs([]);
    } finally {
      setJobsLoading(false);
    }
  };

  // Function to fetch instant jobs
  const fetchInstantJobs = async () => {
    setInstantJobsLoading(true);
    setInstantJobsError(null);
    try {
      if (!db) {
        console.error("Firestore is not initialized.");
        throw new Error("Firestore is not initialized.");
      }

      const instantJobsCollection = collection(db, "instantJobs");
      const querySnapshot = await getDocs(instantJobsCollection);

      const instantJobsList = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      setInstantJobs(instantJobsList);
    } catch (error) {
      console.error("Error fetching instant jobs:", error);
      setInstantJobsError("Failed to fetch instant jobs. Please check the console for more details.");
      setInstantJobs([]);
    } finally {
      setInstantJobsLoading(false);
    }
  };

  // Function to create a new job
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
        fromSupportPanel: true,
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
      };

      const jobRef = await addDoc(collection(db, "jobs"), jobData);

      // Register job creation in the log system
      try {
        const userId = localStorage.getItem("userId") || "unknown";
        const userName = localStorage.getItem("userName") || "unknown";
        
        await logSystemActivity(
          "create",
          userName,
          {
            userId,
            userRole: role,
            entityType: "job",
            entityId: jobRef.id,
            entityData: {
              title: newJob.title,
              company: newJob.companyName
            },
            timestamp: new Date().toISOString()
          }
        );
        console.log("Job creation logged");
      } catch (logError) {
        console.error("Error logging job creation:", logError);
      }

      setNewJob({
        title: "",
        companyName: "",
        description: "",
        location: "",
        salary: "",
        sourceLink: "",
      });

      fetchJobs();
      alert("Job created successfully!");
    } catch (error) {
      console.error("Error creating job:", error);
      alert("Failed to create job. Please check the console for details.");
    } finally {
      setCreatingJob(false);
    }
  };

  // Fetch data when tab changes
  useEffect(() => {
    if (activeTab === "jobs") {
      fetchJobs();
    } else if (activeTab === "instantJobs") {
      fetchInstantJobs();
    }
  }, [activeTab]);

  // Fetch data when sub-tab changes
  useEffect(() => {
    if (activeTab === "jobs") {
      if (activeSubTab === "list") {
        fetchJobs();
      }
    }
  }, [activeSubTab, activeTab]);

  // Filter jobs based on search
  useEffect(() => {
    if (jobs.length > 0) {
      const filtered = jobs.filter(
        (job) =>
          job.title?.toLowerCase().includes(jobSearchQuery.toLowerCase()) ||
          job.companyName?.toLowerCase().includes(jobSearchQuery.toLowerCase()) ||
          job.description?.toLowerCase().includes(jobSearchQuery.toLowerCase()) ||
          job.location?.toLowerCase().includes(jobSearchQuery.toLowerCase())
      );
      setFilteredJobs(filtered);
    } else {
      setFilteredJobs([]);
    }
  }, [jobs, jobSearchQuery]);

  // Filter instant jobs based on search
  useEffect(() => {
    if (instantJobs.length > 0) {
      const filtered = instantJobs.filter(
        (job) =>
          job.title?.toLowerCase().includes(instantJobSearchQuery.toLowerCase()) ||
          job.description?.toLowerCase().includes(instantJobSearchQuery.toLowerCase()) ||
          job.budget?.toString().toLowerCase().includes(instantJobSearchQuery.toLowerCase())
      );
      setFilteredInstantJobs(filtered);
    } else {
      setFilteredInstantJobs([]);
    }
  }, [instantJobs, instantJobSearchQuery]);

  const handleTabChange = async (newTab: "jobs" | "instantJobs" | "chat", subTab: string | null = null) => {
    // Log navigation in the logging system
    try {
      const userId = localStorage.getItem("userId") || "unknown";
      const userName = localStorage.getItem("userName") || "unknown";
      
      await logSystemActivity(
        "admin_action",
        userName,
        {
          userId,
          userRole: role,
          action: "Navigation in support panel",
          details: {
            from: { tab: activeTab, subTab: activeSubTab },
            to: { tab: newTab, subTab: subTab }
          },
          timestamp: new Date().toISOString()
        }
      );
      console.log("Tab navigation logged");
    } catch (error) {
      console.error("Error logging navigation:", error);
    }
    
    // Update states
    setActiveTab(newTab);
    setActiveSubTab(subTab);
  };

  // Logout function with activity logging
  const handleLogout = async () => {
    try {
      // Log logout in the system
      const userId = localStorage.getItem("userId") || "unknown";
      const userName = localStorage.getItem("userName") || "unknown";
      
      await logSystemActivity(
        "logout",
        userName,
        {
          userId,
          userRole: role,
          timestamp: new Date().toISOString(),
          portal: "support-dashboard"
        }
      );
      
      console.log("Logout logged");
    } catch (error) {
      console.error("Error logging logout:", error);
    } finally {
      // Clear session data and redirect
      localStorage.removeItem("token");
      localStorage.removeItem("userId");
      localStorage.removeItem("userEmail");
      localStorage.removeItem("userName");
      localStorage.removeItem("userRole");
      router.push("/support-login");
    }
  };

  // Function to delete a job with log recording
  const handleDeleteJob = async (jobId: string) => {
    if (!window.confirm("Are you sure you want to delete this job? This action cannot be undone.")) {
      return;
    }
    
    setDeletingJobId(jobId);
    try {
      if (!db) {
        throw new Error("Firestore is not initialized.");
      }
      
      // Find the job to be deleted to log it
      const jobToDelete = jobs.find(job => job.id === jobId);
      
      // Delete from Firestore
      await deleteDoc(doc(db, "jobs", jobId));
      
      // Update local list
      setJobs(jobs.filter((job) => job.id !== jobId));
      setFilteredJobs(filteredJobs.filter((job) => job.id !== jobId));
      
      // Register the deletion in the log system
      try {
        const userId = localStorage.getItem("userId") || "unknown";
        const userName = localStorage.getItem("userName") || "unknown";
        
        await logSystemActivity(
          "delete",
          userName,
          {
            userId,
            userRole: role,
            entityType: "job",
            entityId: jobId,
            entityData: jobToDelete ? {
              title: jobToDelete.title,
              company: jobToDelete.companyName
            } : { info: "Job data not available" },
            timestamp: new Date().toISOString()
          }
        );
        console.log("Job deletion logged");
      } catch (logError) {
        console.error("Error logging job deletion:", logError);
      }
      
      alert("Job deleted successfully!");
    } catch (error) {
      console.error("Error deleting job:", error);
      alert("Failed to delete job. Please check the console for details.");
    } finally {
      setDeletingJobId(null);
    }
  };

  // Function to resolve disputes with logging
  const handleResolveDispute = async (jobId: string, resolution: 'buyer' | 'seller' | 'split') => {
    try {
      if (!db) {
        throw new Error("Firestore is not initialized.");
      }
      
      // Find the disputed job
      const disputedJob = instantJobs.find(job => job.id === jobId);
      if (!disputedJob) {
        throw new Error("Disputed job not found");
      }
      
      // Update the dispute status in Firestore
      // This is a simplified implementation, the real one would depend on your database structure
      // await updateDoc(doc(db, "instantJobs", jobId), {
      //   hasDispute: false,
      //   disputeResolution: resolution,
      //   resolvedAt: new Date().toISOString(),
      //   resolvedBy: localStorage.getItem("userId")
      // });
      
      // Mockup for demonstration - remove in real implementation
      alert(`Dispute for job "${disputedJob.title}" resolved in favor of ${resolution}`);
      
      // Log the dispute resolution in the log system
      try {
        const userId = localStorage.getItem("userId") || "unknown";
        const userName = localStorage.getItem("userName") || "unknown";
        
        await logSystemActivity(
          "admin_action",
          userName,
          {
            userId,
            userRole: role,
            action: "Dispute resolution",
            entityType: "instantJob",
            entityId: jobId,
            resolution,
            entityData: {
              title: disputedJob.title,
              budget: disputedJob.budget,
              disputeReason: disputedJob.disputeReason
            },
            timestamp: new Date().toISOString()
          }
        );
        console.log("Dispute resolution logged");
      } catch (logError) {
        console.error("Error logging dispute resolution:", logError);
      }
      
      // Update local list
      fetchInstantJobs();
    } catch (error) {
      console.error("Error resolving dispute:", error);
      alert("Failed to resolve dispute. Please check the console for details.");
    }
  };
  
  // Log when an admin views job details
  const handleViewJobDetails = async (jobId: string) => {
    try {
      const userId = localStorage.getItem("userId") || "unknown";
      const userName = localStorage.getItem("userName") || "unknown";
      const viewedJob = jobs.find(job => job.id === jobId);
      
      if (!viewedJob) return;
      
      await logSystemActivity(
        "admin_action",
        userName,
        {
          userId,
          userRole: role,
          action: "View details",
          entityType: "job",
          entityId: jobId,
          entityData: {
            title: viewedJob.title,
            company: viewedJob.companyName
          },
          timestamp: new Date().toISOString()
        }
      );
    } catch (error) {
      console.error("Error logging job view:", error);
    }
  };

  // Function to fetch seeker tickets
  const fetchSeekerTickets = async () => {
    setSeekerTicketsLoading(true);
    setSeekerTicketsError(null);
    try {
      if (!db) throw new Error("Firestore is not initialized.");
      const ticketsCollection = collection(db, "supportTickets");
      // Only fetch tickets that are not closed
      const activeTicketsQuery = query(
        ticketsCollection,
        where("status", "!=", "closed")
      );
      const querySnapshot = await getDocs(activeTicketsQuery);
      const ticketsList: SupportTicket[] = querySnapshot.docs
        .map((doc) => ({
          id: doc.id,
          subject: doc.data().subject || '',
          area: doc.data().area || '',
          seekerEmail: doc.data().seekerEmail || '',
          description: doc.data().description || '',
          status: doc.data().status || 'open',
          createdAt: doc.data().createdAt || '',
          updatedAt: doc.data().updatedAt || '',
          acceptedBy: doc.data().acceptedBy,
          acceptedByName: doc.data().acceptedByName,
          attachmentUrl: doc.data().attachmentUrl,
          closedBy: doc.data().closedBy,
          closedByName: doc.data().closedByName,
          closedAt: doc.data().closedAt,
        }))
        .filter((t) => t.seekerEmail && t.area);
      setSeekerTickets(ticketsList);
      setFilteredSeekerTickets(ticketsList);
    } catch (error) {
      setSeekerTicketsError("Failed to fetch seeker tickets.");
      setSeekerTickets([]);
      setFilteredSeekerTickets([]);
    } finally {
      setSeekerTicketsLoading(false);
    }
  };

  // Function to fetch company tickets
  const fetchCompanyTickets = async () => {
    setCompanyTicketsLoading(true);
    setCompanyTicketsError(null);
    try {
      if (!db) throw new Error("Firestore is not initialized.");
      const ticketsCollection = collection(db, "supportTickets");
      
      // Only fetch company tickets that are not closed
      const activeCompanyTicketsQuery = query(
        ticketsCollection,
        where("userType", "==", "company"),
        where("status", "!=", "closed")
      );
      
      const querySnapshot = await getDocs(activeCompanyTicketsQuery);
      const ticketsList = querySnapshot.docs
        .map((doc) => ({
          id: doc.id,
          subject: doc.data().subject || '',
          category: doc.data().category || '',
          userName: doc.data().userName || '',
          userType: doc.data().userType || '',
          description: doc.data().description || '',
          status: doc.data().status || 'open',
          createdAt: doc.data().createdAt || '',
          updatedAt: doc.data().updatedAt || '',
          acceptedBy: doc.data().acceptedBy,
          acceptedByName: doc.data().acceptedByName,
          attachmentUrl: doc.data().attachmentUrl,
          closedBy: doc.data().closedBy,
          closedByName: doc.data().closedByName,
          closedAt: doc.data().closedAt,
        }));
        
      setCompanyTickets(ticketsList);
      setFilteredCompanyTickets(ticketsList);
    } catch (error) {
      setCompanyTicketsError("Failed to fetch company tickets.");
      setCompanyTickets([]);
      setFilteredCompanyTickets([]);
    } finally {
      setCompanyTicketsLoading(false);
    }
  };

  // Function to fetch closed seeker tickets
  const fetchClosedSeekerTickets = async () => {
    setClosedTicketsLoading(true);
    setClosedTicketsError(null);
    try {
      if (!db) throw new Error("Firestore is not initialized.");
      const ticketsCollection = collection(db, "supportTickets");
      const closedTicketsQuery = query(
        ticketsCollection,
        where("status", "==", "closed")
      );
      const querySnapshot = await getDocs(closedTicketsQuery);
      
      const closedTicketsList: SupportTicket[] = querySnapshot.docs
        .map((doc) => ({
          id: doc.id,
          subject: doc.data().subject || '',
          area: doc.data().area || '',
          seekerEmail: doc.data().seekerEmail || '',
          description: doc.data().description || '',
          status: doc.data().status || 'closed',
          createdAt: doc.data().createdAt || '',
          updatedAt: doc.data().updatedAt || '',
          acceptedBy: doc.data().acceptedBy,
          acceptedByName: doc.data().acceptedByName,
          attachmentUrl: doc.data().attachmentUrl,
          closedBy: doc.data().closedBy,
          closedByName: doc.data().closedByName,
          closedAt: doc.data().closedAt,
        }))
        .filter((t) => t.seekerEmail && t.area);
        
      setClosedSeekerTickets(closedTicketsList);
      setFilteredClosedSeekerTickets(closedTicketsList);
    } catch (error) {
      setClosedTicketsError("Failed to fetch closed seeker tickets.");
      setClosedSeekerTickets([]);
      setFilteredClosedSeekerTickets([]);
    } finally {
      setClosedTicketsLoading(false);
    }
  };

  // Function to fetch closed company tickets  
  const fetchClosedCompanyTickets = async () => {
    setClosedTicketsLoading(true);
    setClosedTicketsError(null);
    try {
      if (!db) throw new Error("Firestore is not initialized.");
      const ticketsCollection = collection(db, "supportTickets");
      const closedTicketsQuery = query(
        ticketsCollection,
        where("status", "==", "closed"),
        where("userType", "==", "company")
      );
      const querySnapshot = await getDocs(closedTicketsQuery);
      
      const closedTicketsList = querySnapshot.docs
        .map((doc) => ({
          id: doc.id,
          subject: doc.data().subject || '',
          category: doc.data().category || '',
          userName: doc.data().userName || '',
          userType: doc.data().userType || '',
          description: doc.data().description || '',
          status: doc.data().status || 'closed',
          createdAt: doc.data().createdAt || '',
          updatedAt: doc.data().updatedAt || '',
          acceptedBy: doc.data().acceptedBy,
          acceptedByName: doc.data().acceptedByName,
          attachmentUrl: doc.data().attachmentUrl,
          closedBy: doc.data().closedBy,
          closedByName: doc.data().closedByName,
          closedAt: doc.data().closedAt,
        }))
        .filter((t) => t.userType === 'company');
        
      setClosedCompanyTickets(closedTicketsList);
      setFilteredClosedCompanyTickets(closedTicketsList);
    } catch (error) {
      setClosedTicketsError("Failed to fetch closed company tickets.");
      setClosedCompanyTickets([]);
      setFilteredClosedCompanyTickets([]);
    } finally {
      setClosedTicketsLoading(false);
    }
  };

  // Update search when switching ticket type tab
  useEffect(() => {
    if (activeTab === 'chat' && activeSubTab === 'tickets') {
      if (ticketsTypeTab === 'seekers') fetchSeekerTickets();
      else fetchCompanyTickets();
    }
  }, [activeTab, activeSubTab, ticketsTypeTab]);

  // Function to fetch messages of a ticket
  const fetchTicketMessages = async (ticketId: string) => {
    try {
      if (!db) {
        console.error("Firestore is not initialized.");
        throw new Error("Firestore is not initialized.");
      }

      const messagesCollection = collection(db, "supportMessages");
      const messagesQuery = query(messagesCollection, where("ticketId", "==", ticketId));
      const querySnapshot = await getDocs(messagesQuery);

      const messagesList: SupportMessage[] = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ticketId: doc.data().ticketId || '',
        senderId: doc.data().senderId || '',
        senderName: doc.data().senderName,
        senderType: doc.data().senderType || '',
        message: doc.data().message || '',
        createdAt: doc.data().createdAt || new Date().toISOString(),
        isSystemMessage: doc.data().isSystemMessage,
        read: doc.data().read
      }));

      // Sort by creation date (oldest first)
      messagesList.sort((a, b) => {
        return new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime();
      });

      setTicketMessages(messagesList);
    } catch (error) {
      console.error("Error fetching ticket messages:", error);
      setTicketMessages([]);
    }
  };

  // Function to accept a support ticket
  const handleAcceptTicket = async (ticketId: string) => {
    try {
      if (!db) {
        throw new Error("Firestore is not initialized.");
      }

      const userId = localStorage.getItem("userId") || "unknown";
      const userName = localStorage.getItem("userName") || "unknown";
      
      // Update the ticket in Firestore
      const ticketRef = doc(db, "supportTickets", ticketId);
      await updateDoc(ticketRef, {
        acceptedBy: userId,
        acceptedByName: userName,
        acceptedAt: new Date().toISOString(),
        status: "open"
      });      // Fetch ticket to determine if it's a company or seeker ticket
      const ticketSnap = await getDoc(ticketRef);
      if (ticketSnap.exists()) {
        const ticket = ticketSnap.data();
        
        // Check if this is a company ticket
        const isCompanyTicket = ticket.userType === 'company';
        
        if (isCompanyTicket && ticket.userId) {
          // Use company notification for company tickets
          await createTicketAcceptedNotificationForCompany(
            ticketId,
            ticket.userId,
            userName
          );
          console.log(`Ticket accepted notification sent to company ${ticket.userId}`);
        } else if (ticket.seekerId) {
          // Use regular notification for seeker tickets
          await createTicketAcceptedNotification(
            ticketId,
            ticket.seekerId,
            userName
          );
          console.log(`Ticket accepted notification sent to seeker ${ticket.seekerId}`);
        }
      }

      // Update the ticket on the screen for seekers and companies
      if (ticketsTypeTab === 'seekers') {
        setSeekerTickets((prev: SupportTicket[]) => 
          prev.map(ticket => 
            ticket.id === ticketId 
              ? { 
                  ...ticket, 
                  acceptedBy: userId, 
                  acceptedByName: userName,
                  acceptedAt: new Date().toISOString(),
                  status: "open"
                } 
              : ticket
          )
        );
        setFilteredSeekerTickets((prev: SupportTicket[]) => 
          prev.map(ticket => 
            ticket.id === ticketId 
              ? { 
                  ...ticket, 
                  acceptedBy: userId, 
                  acceptedByName: userName,
                  acceptedAt: new Date().toISOString(),
                  status: "open"
                } 
              : ticket
          )
        );
      } else {
        setCompanyTickets((prev: any[]) =>
          prev.map(ticket =>
            ticket.id === ticketId
              ? {
                  ...ticket,
                  acceptedBy: userId,
                  acceptedByName: userName,
                  acceptedAt: new Date().toISOString(),
                  status: "open"
                }
              : ticket
          )
        );
        setFilteredCompanyTickets((prev: any[]) =>
          prev.map(ticket =>
            ticket.id === ticketId
              ? {
                  ...ticket,
                  acceptedBy: userId,
                  acceptedByName: userName,
                  acceptedAt: new Date().toISOString(),
                  status: "open"
                }
              : ticket
          )
        );
      }

      if (selectedTicket?.id === ticketId) {
        setSelectedTicket((prev: any | null) => prev ? { 
          ...prev, 
          acceptedBy: userId,
          acceptedByName: userName,
          acceptedAt: new Date().toISOString(),
          status: "open"
        } : null);
      }
      
      // Log the action in the logs
      await logSystemActivity(
        "admin_action",
        userName,
        {
          userId,
          userRole: role,
          action: "Accepted support ticket",
          entityType: "supportTicket",
          entityId: ticketId,
          timestamp: new Date().toISOString()
        }
      );
      
      // Send a system message to the ticket
      await addDoc(collection(db, "supportMessages"), {
        ticketId,
        senderId: userId,
        senderName: userName,
        senderType: "support",
        message: "Ticket accepted! How can I help you?", // This was already in English
        createdAt: new Date().toISOString(),
        isSystemMessage: true
      });
      
      // Reload the ticket messages
      fetchTicketMessages(ticketId);
      
      alert("Ticket accepted successfully!");
    } catch (error) {
      console.error("Error accepting ticket:", error);
      alert("Failed to accept ticket. Please check the console for details.");
    }
  };

  // Function to send a message in a ticket
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket || !newMessage.trim() || !db) {
      return;
    }
    
    setSendingMessage(true);
    try {
      const userId = localStorage.getItem("userId") || "unknown";
      const userName = localStorage.getItem("userName") || "unknown";
      
      // First get the latest ticket data to ensure we have seekerId
      const ticketRef = doc(db, "supportTickets", selectedTicket.id);
      const ticketSnap = await getDoc(ticketRef);
      
      // Get seekerId, may be in different fields depending on ticket type
      let seekerId = selectedTicket.seekerId;
      
      if (ticketSnap.exists()) {
        const ticketData = ticketSnap.data();
        seekerId = ticketData.seekerId || ticketData.userId || selectedTicket.seekerId;
      }
      
      // Add the message to Firestore
      await addDoc(collection(db, "supportMessages"), {
        ticketId: selectedTicket.id,
        senderId: userId,
        senderName: userName,
        senderType: "support",
        message: newMessage,
        createdAt: new Date().toISOString()
      });
        // Determine if this is a company ticket or seeker ticket
      let isCompanyTicket = false;
      let companyId = null;
      
      if (ticketSnap.exists()) {
        const ticketData = ticketSnap.data();
        isCompanyTicket = ticketData.userType === 'company';
        companyId = isCompanyTicket ? ticketData.userId : null;
      }
      
      // Send notification based on user type (company or seeker)
      if (isCompanyTicket && companyId) {
        // This is a company ticket, use company notification
        await createSupportMessageNotificationForCompany(
          selectedTicket.id,
          companyId,
          newMessage,
          userName
        );
        console.log(`Support message notification sent to company ${companyId}`);
      } else if (seekerId) {
        // This is a seeker ticket
        await createSupportMessageNotification(
          selectedTicket.id,
          seekerId,
          newMessage,
          userName
        );
        console.log(`Support message notification sent to seeker ${seekerId}`);
      } else {
        console.log("No recipient ID found for notification in ticket", selectedTicket.id);
        
        // Fallback - try to find seekerId from ticket email
        if (selectedTicket.seekerEmail) {
          const usersRef = collection(db, "users");
          const emailQuery = query(usersRef, where("email", "==", selectedTicket.seekerEmail));
          const userSnap = await getDocs(emailQuery);
          
          if (!userSnap.empty) {
            const userDocId = userSnap.docs[0].id;
            
            await createSupportMessageNotification(
              selectedTicket.id,
              userDocId,
              newMessage,
              userName
            );
            console.log(`Support message notification sent to seeker ${userDocId} (found by email)`);
          } else {
            console.log("Could not find user by email:", selectedTicket.seekerEmail);
          }
        }
      }
      
      // Clear the message field
      setNewMessage("");
      
      // Reload the messages
      fetchTicketMessages(selectedTicket.id);
      
      // Log the action in the logs
      await logSystemActivity(
        "admin_action",
        userName,
        {
          userId,
          userRole: role,
          action: "Sent message in support ticket",
          entityType: "supportTicket",
          entityId: selectedTicket.id,
          timestamp: new Date().toISOString()
        }
      );
    } catch (error) {
      console.error("Error sending message:", error);
      alert("Failed to send message. Please check the console for details.");
    } finally {
      setSendingMessage(false);
    }
  };

  // Function to close a support ticket
  const handleCloseTicket = async (ticketId: string) => {
    if (!window.confirm("Are you sure you want to close this ticket? This will mark it as resolved.")) {
      return;
    }
    
    try {
      if (!db) {
        throw new Error("Firestore is not initialized.");
      }

      const userId = localStorage.getItem("userId") || "unknown";
      const userName = localStorage.getItem("userName") || "unknown";
      
      // Update the ticket in Firestore
      const ticketRef = doc(db, "supportTickets", ticketId);
      await updateDoc(ticketRef, {
        status: "closed",
        closedBy: userId,
        closedByName: userName,
        closedAt: new Date().toISOString()
      });

      // Update the ticket on the screen for seekers and companies
      if (ticketsTypeTab === 'seekers') {
        setSeekerTickets((prev: SupportTicket[]) => 
          prev.map(ticket => 
            ticket.id === ticketId 
              ? { 
                  ...ticket, 
                  status: "closed",
                  closedBy: userId,
                  closedByName: userName,
                  closedAt: new Date().toISOString()
                } 
              : ticket
          )
        );
        setFilteredSeekerTickets((prev: SupportTicket[]) => 
          prev.map(ticket => 
            ticket.id === ticketId 
              ? { 
                  ...ticket, 
                  status: "closed",
                  closedBy: userId,
                  closedByName: userName,
                  closedAt: new Date().toISOString()
                } 
              : ticket
          )
        );
      } else {
        setCompanyTickets((prev: any[]) =>
          prev.map(ticket =>
            ticket.id === ticketId
              ? {
                  ...ticket,
                  status: "closed",
                  closedBy: userId,
                  closedByName: userName,
                  closedAt: new Date().toISOString()
                }
              : ticket
          )
        );
        setFilteredCompanyTickets((prev: any[]) =>
          prev.map(ticket =>
            ticket.id === ticketId
              ? {
                  ...ticket,
                  status: "closed",
                  closedBy: userId,
                  closedByName: userName,
                  closedAt: new Date().toISOString()
                }
              : ticket
          )
        );
      }

      if (selectedTicket?.id === ticketId) {
        setSelectedTicket((prev: any | null) => prev ? { 
          ...prev, 
          status: "closed",
          closedBy: userId,
          closedByName: userName,
          closedAt: new Date().toISOString()
        } : null);
      }
      
      // Log the action in the logs
      await logSystemActivity(
        "admin_action",
        userName,
        {
          userId,
          userRole: role,
          action: "Closed support ticket",
          entityType: "supportTicket",
          entityId: ticketId,
          timestamp: new Date().toISOString()
        }
      );
        // Send a system message to the ticket
      await addDoc(collection(db, "supportMessages"), {
        ticketId,
        senderId: userId,
        senderName: userName,
        senderType: "support",
        message: "This ticket has been marked as resolved and closed. If you need further assistance, please open a new ticket.",
        createdAt: new Date().toISOString(),
        isSystemMessage: true
      });
      
      // Fetch ticket to determine if it's a company or seeker ticket
      const ticketSnap = await getDoc(doc(db, "supportTickets", ticketId));
      if (ticketSnap.exists()) {
        const ticket = ticketSnap.data();
        
        // Check if this is a company ticket
        const isCompanyTicket = ticket.userType === 'company';
        
        if (isCompanyTicket && ticket.userId) {
          // Use company notification for company tickets
          await createTicketStatusNotificationForCompany(
            ticketId,
            ticket.userId,
            "closed"
          );
          console.log(`Ticket closed notification sent to company ${ticket.userId}`);
        } else if (ticket.seekerId) {
          // Use regular notification for seeker tickets
          await createTicketStatusNotification(
            ticketId,
            ticket.seekerId,
            "closed"
          );
          console.log(`Ticket closed notification sent to seeker ${ticket.seekerId}`);
        }
      }
      
      // Reload the ticket messages
      fetchTicketMessages(ticketId);
      
      alert("Ticket closed successfully!");
    } catch (error) {
      console.error("Error closing ticket:", error);
      alert("Failed to close ticket. Please check the console for details.");
    }
  };

  // Function to check for unread messages from seekers
  const checkUnreadMessages = async () => {
    try {
      if (!db) throw new Error("Firestore is not initialized.");
      
      // Array to store IDs of tickets with unread messages
      const ticketsWithUnread: string[] = [];
      
      try {
        // Fetch all open tickets
        const ticketsRef = collection(db, "supportTickets");
        const openTicketsQuery = query(ticketsRef, where("status", "!=", "closed"));
        const ticketsSnapshot = await getDocs(openTicketsQuery);
        
        // For each ticket, check if there are unread messages
        for (const ticketDoc of ticketsSnapshot.docs) {
          const ticketId = ticketDoc.id;
          
          // Fetch the ticket messages - using a simplified approach
          // to avoid the composite index error
          const messagesRef = collection(db, "supportMessages");
          const simpleMessagesQuery = query(
            messagesRef, 
            where("ticketId", "==", ticketId)
          );
          
          const messagesSnapshot = await getDocs(simpleMessagesQuery);
          
          // Filter unread seeker messages in memory
          const hasUnreadMessages = messagesSnapshot.docs.some(
            doc => doc.data().senderType !== "support" && doc.data().read === false
          );
          
          // If there are unread messages from the seeker, add to the list
          if (hasUnreadMessages) {
            ticketsWithUnread.push(ticketId);
          }
        }
        
      } catch (queryError: any) {
        // If the specific index error occurs, show an alert with the link
        if (queryError.code === 'failed-precondition' && queryError.message?.includes('index')) {
          console.error("Firestore index error:", queryError.message);
          
          // Extract the index link from the error message, if present
          const indexUrlMatch = queryError.message.match(/(https:\/\/console\.firebase\.google\.com\/.*?)\s/);
          const indexUrl = indexUrlMatch ? indexUrlMatch[1] : null;
          
          if (indexUrl) {
            console.warn("Você precisa criar um índice para esta consulta. Acesse:", indexUrl);
            // Opcional: exibir uma notificação para o usuário sobre a necessidade do índice
            // alert(`É necessário criar um índice para esta consulta. O administrador deve acessar: ${indexUrl}`);
          }
        } else {
          console.error("Error checking for unread messages:", queryError);
        }
      }
      
      // Update state with the list of tickets that have unread messages
      setTicketsWithUnreadMessages(ticketsWithUnread);
      
    } catch (error) {
      console.error("Error checking for unread messages:", error);
    }
  };

  // Refresh unread messages status when tickets are fetched
  useEffect(() => {
    if (activeTab === 'chat' && activeSubTab === 'tickets' && ticketsSubSection === 'active') {
      checkUnreadMessages();
    }
  }, [seekerTickets, companyTickets, activeTab, activeSubTab, ticketsSubSection]);

  // Implement mechanism to start/stop polling when necessary
  useEffect(() => {
    // Start polling only when on active tickets tab
    if (activeTab === 'chat' && activeSubTab === 'tickets' && ticketsSubSection === 'active') {
      // Clear any existing interval
      if (pollingInterval) {
        clearInterval(pollingInterval);
      }
      
      // Start new polling interval every 1 minute exactly (60 seconds)
      const interval = setInterval(() => {
        console.log("Automatically checking for new messages (every 1 minute)");
        setLastCheckTime(new Date());
        
        // Fetch tickets and check for unread messages
        if (ticketsTypeTab === 'seekers') {
          fetchSeekerTickets();
        } else {
          fetchCompanyTickets();
        }
        checkUnreadMessages();
      }, 60000); // Exactly 60,000 milliseconds = 1 minute
      
      setPollingInterval(interval);
      
      // Clear interval when component is unmounted
      return () => {
        if (interval) clearInterval(interval);
      };
    } else if (pollingInterval) {
      // If not on correct tab, clear the interval
      clearInterval(pollingInterval);
      setPollingInterval(null);
    }
  }, [activeTab, activeSubTab, ticketsSubSection, ticketsTypeTab]);

  // Update search when switching ticket type tab
  useEffect(() => {
    if (activeTab === 'chat' && activeSubTab === 'tickets') {
      if (ticketsTypeTab === 'seekers') fetchSeekerTickets();
      else fetchCompanyTickets();
    }
  }, [activeTab, activeSubTab, ticketsTypeTab]);

  return (
    <Layout>
      {permissionsLoading ? (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-900 to-black text-white">
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-4">Loading...</h2>
            <p>Verifying your permissions</p>
          </div>
        </div>
      ) : (
        <main className="min-h-screen flex bg-gradient-to-br from-blue-900 to-black text-white">
          {/* Sidebar */}
          <aside className="w-1/4 bg-black/70 p-6 flex flex-col items-start min-h-screen">
            <h2 className="text-blue-400 text-xl font-bold mb-6">Support Dashboard</h2>
            <ul className="space-y-4 w-full">
              <li>
                <div
                  className={`cursor-pointer p-3 rounded-lg text-center ${
                    activeTab === "jobs" ? "bg-blue-500 text-white" : "bg-black/50 text-gray-300"
                  }`}
                  onClick={() => handleTabChange("jobs", "list")}
                >
                  Manage Jobs
                </div>
                {activeTab === "jobs" && (
                  <ul className="ml-4 mt-2 space-y-2">
                    <li
                      className={`cursor-pointer p-2 rounded-lg text-center ${
                        activeSubTab === "list" ? "bg-blue-500 text-white" : "bg-black/50 text-gray-300"
                      }`}
                      onClick={() => handleTabChange("jobs", "list")}
                    >
                      Jobs List
                    </li>
                    <li
                      className={`cursor-pointer p-2 rounded-lg text-center ${
                        activeSubTab === "create" ? "bg-blue-500 text-white" : "bg-black/50 text-gray-300"
                      }`}
                      onClick={() => handleTabChange("jobs", "create")}
                    >
                      Create Job
                    </li>
                  </ul>
                )}
              </li>
              <li>
                <div
                  className={`cursor-pointer p-3 rounded-lg text-center ${
                    activeTab === "instantJobs" ? "bg-blue-500 text-white" : "bg-black/50 text-gray-300"
                  }`}
                  onClick={() => handleTabChange("instantJobs", "list")}
                >
                  Manage Instant Jobs
                </div>
                {activeTab === "instantJobs" && (
                  <ul className="ml-4 mt-2 space-y-2">
                    <li
                      className={`cursor-pointer p-2 rounded-lg text-center ${
                        activeSubTab === "list" ? "bg-blue-500 text-white" : "bg-black/50 text-gray-300"
                      }`}
                      onClick={() => handleTabChange("instantJobs", "list")}
                    >
                      List Instant Jobs
                    </li>
                    <li
                      className={`cursor-pointer p-2 rounded-lg text-center ${
                        activeSubTab === "disputes" ? "bg-blue-500 text-white" : "bg-black/50 text-gray-300"
                      }`}
                      onClick={() => handleTabChange("instantJobs", "disputes")}
                    >
                      Disputes
                    </li>
                  </ul>
                )}
              </li>
              <li>
                <div
                  className={`cursor-pointer p-3 rounded-lg text-center ${
                    activeTab === "chat" ? "bg-blue-500 text-white" : "bg-black/50 text-gray-300"
                  }`}
                  onClick={() => handleTabChange("chat", "tickets")}
                >
                  Assistance
                </div>
                {activeTab === "chat" && (
                  <ul className="ml-4 mt-2 space-y-2">
                    <li
                      className={`cursor-pointer p-2 rounded-lg text-center ${
                        activeSubTab === "tickets" ? "bg-blue-500 text-white" : "bg-black/50 text-gray-300"
                      }`}
                      onClick={() => handleTabChange("chat", "tickets")}
                    >
                      Support Tickets
                    </li>
                    <li
                      className={`cursor-pointer p-2 rounded-lg text-center ${
                        activeSubTab === "livechat" ? "bg-blue-500 text-white" : "bg-black/50 text-gray-300"
                      }`}
                      onClick={() => handleTabChange("chat", "livechat")}
                    >
                      Live Chat
                    </li>
                  </ul>
                )}
              </li>
            </ul>
            
            {/* Logout Button */}
            <div className="mt-auto pt-6 w-full">
              <button
                onClick={handleLogout}
                className="w-full p-3 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors flex items-center justify-center"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Logout
              </button>
            </div>
          </aside>
          {/* Main Content */}
          <div className="flex-1 p-6">
            {/* Jobs - List */}
            {activeTab === "jobs" && activeSubTab === "list" && (
              <div>
                <h2 className="text-3xl font-semibold text-blue-500 mb-6">Jobs List</h2>
                
                {/* Search bar for Jobs */}
                <div className="mb-6">
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Search jobs by title, company, description or location..."
                      className="w-full px-4 py-2 bg-black/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={jobSearchQuery}
                      onChange={(e) => setJobSearchQuery(e.target.value)}
                    />
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                      <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </div>
                  </div>
                </div>
                
                {jobsLoading && <p className="text-gray-400">Loading jobs...</p>}
                {jobsError && <p className="text-red-400">{jobsError}</p>}
                {!jobsLoading && !jobsError && filteredJobs.length === 0 && (
                  <p className="text-gray-400">No jobs matching your search criteria.</p>
                )}
                
                <div className="bg-black/50 p-6 rounded-lg mb-6">
                  <ul className="space-y-4">
                    {filteredJobs.map((job) => (
                      <li key={job.id} className="bg-black/40 p-4 rounded-lg border border-gray-700">
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="text-xl font-semibold text-blue-400">{job.title}</h3>
                            <p className="text-gray-300">{job.companyName}</p>
                            <p className="text-sm text-gray-400 mt-1">
                              {job.location && <span className="mr-2">📍 {job.location}</span>}
                              {job.salary && <span>💰 {job.salary}</span>}
                            </p>
                            <p className="mt-2 text-gray-300">{job.description}</p>
                            {job.sourceLink && (
                              <a
                                href={job.sourceLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="mt-2 inline-block text-blue-400 hover:underline"
                              >
                                Source Link
                              </a>
                            )}
                            <p className="text-xs text-gray-500 mt-2">
                              Posted: {new Date(job.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {/* Jobs - Create */}
            {activeTab === "jobs" && activeSubTab === "create" && (
              <div>
                <h2 className="text-3xl font-semibold text-blue-500 mb-6">Create Job</h2>
                <div className="bg-black/50 p-6 rounded-lg">
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
                      rows={5}
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
                      className="w-full bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded-lg"
                      disabled={creatingJob}
                    >
                      {creatingJob ? "Creating..." : "Create Job"}
                    </button>
                  </form>
                </div>
              </div>
            )}

            {/* Instant Jobs - List */}
            {activeTab === "instantJobs" && activeSubTab === "list" && (
              <div>
                <h2 className="text-3xl font-semibold text-blue-500 mb-6">Instant Jobs List</h2>
                
                {/* Search bar for Instant Jobs */}
                <div className="mb-6">
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Search instant jobs by title, description or budget..."
                      className="w-full px-4 py-2 bg-black/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={instantJobSearchQuery}
                      onChange={(e) => setInstantJobSearchQuery(e.target.value)}
                    />
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                      <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </div>
                  </div>
                </div>
                
                {instantJobsLoading && <p className="text-gray-400">Loading instant jobs...</p>}
                {instantJobsError && <p className="text-red-400">{instantJobsError}</p>}
                
                <div className="bg-black/50 p-6 rounded-lg mb-6">
                  {!instantJobsLoading && !instantJobsError && filteredInstantJobs.length === 0 ? (
                    <p className="text-gray-400">No instant jobs matching your search criteria.</p>
                  ) : (
                    <ul className="space-y-4">
                      {filteredInstantJobs.map((job) => (
                        <li key={job.id} className="bg-black/40 p-4 rounded-lg border border-gray-700">
                          <div className="flex justify-between items-start">
                            <div>
                              <h3 className="text-xl font-semibold text-blue-400">{job.title}</h3>
                              <p className="text-gray-300">Budget: {job.budget}</p>
                              <p className="mt-2 text-gray-300">{job.description}</p>
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            )}

            {/* Instant Jobs - Disputes */}
            {activeTab === "instantJobs" && activeSubTab === "disputes" && (
              <div>
                <h2 className="text-3xl font-semibold text-blue-500 mb-6">Resolve Disputes</h2>
                
                <div className="bg-black/50 p-6 rounded-lg mb-6">
                  <h3 className="text-xl text-blue-400 mb-4">Pending Disputes</h3>
                  <p className="text-gray-300 mb-6">This section displays instant jobs that have open disputes requiring resolution.</p>
                  
                  {instantJobsLoading && <p className="text-gray-400">Loading disputes...</p>}
                  {instantJobsError && <p className="text-red-400">{instantJobsError}</p>}
                  
                  {!instantJobsLoading && !instantJobsError && (
                    <div className="space-y-4">
                      {instantJobs.filter(job => job.hasDispute).length > 0 ? (
                        <ul className="space-y-4">
                          {instantJobs
                            .filter(job => job.hasDispute)
                            .map((job) => (
                              <li key={job.id} className="bg-black/40 p-4 rounded-lg border border-red-800">
                                <div className="flex justify-between items-start">
                                  <div>
                                    <div className="flex items-center">
                                      <h3 className="text-xl font-semibold text-blue-400">{job.title}</h3>
                                      <span className="ml-2 px-2 py-1 bg-red-600 text-white text-xs rounded">Disputed</span>
                                    </div>
                                    <p className="text-gray-300">Budget: {job.budget}</p>
                                    <p className="mt-2 text-gray-300">{job.description}</p>
                                    <div className="mt-4 p-3 bg-red-900/30 rounded border border-red-800">
                                      <h4 className="text-red-400 font-medium">Dispute Reason:</h4>
                                      <p className="text-gray-300">{job.disputeReason || "No reason provided"}</p>
                                    </div>
                                    <div className="mt-3">
                                      <button
                                        className="bg-yellow-500 hover:bg-yellow-600 text-white py-1 px-3 rounded mr-2"
                                        onClick={() => alert("Dispute resolution interface coming soon")}
                                      >
                                        Resolve Dispute
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              </li>
                            ))}

                        </ul>
                      ) : (
                        <div className="text-center py-10">
                          <p className="text-gray-400">No open disputes at this time.</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Live Chat */}
            {activeTab === "chat" && activeSubTab === "livechat" && (
              <div>
                <h2 className="text-3xl font-semibold text-blue-500 mb-6">Live Chat</h2>
                <div className="bg-black/50 p-6 rounded-lg mb-6">
                  <div className="flex justify-center items-center py-10">
                    <div className="text-center">
                      <h3 className="text-xl text-blue-400 mb-4">Live Chat Feature</h3>
                      <p className="text-gray-300 mb-4">This feature is coming soon!</p>
                      <p className="text-gray-400">
                        You will be able to provide real-time support to users through live chat.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Assistance - Support Tickets */}
            {activeTab === "chat" && activeSubTab === "tickets" && (
              <div>
                <h2 className="text-3xl font-semibold text-blue-500 mb-6">Support Tickets</h2>
                {/* Tickets type tabs */}
                <div className="mb-4 flex gap-2">
                  <button
                    className={`px-4 py-2 rounded ${ticketsTypeTab === 'seekers' ? 'bg-blue-600 text-white' : 'bg-black/40 text-blue-300'}`}
                    onClick={() => setTicketsTypeTab('seekers')}
                  >
                    Seeker Tickets
                  </button>
                  <button
                    className={`px-4 py-2 rounded ${ticketsTypeTab === 'companies' ? 'bg-blue-600 text-white' : 'bg-black/40 text-blue-300'}`}
                    onClick={() => setTicketsTypeTab('companies')}
                  >
                    Company Tickets
                  </button>
                </div>
                
                {/* Active vs Closed tickets tabs */}
                <div className="mb-4 flex gap-2">
                  <button
                    className={`px-4 py-2 rounded ${ticketsSubSection === 'active' ? 'bg-green-600 text-white' : 'bg-black/40 text-green-300'}`}
                    onClick={() => {
                      setTicketsSubSection('active');
                      if (ticketsTypeTab === 'seekers') {
                        fetchSeekerTickets();
                      } else {
                        fetchCompanyTickets();
                      }
                    }}
                  >
                    Active Tickets
                  </button>
                  <button
                    className={`px-4 py-2 rounded ${ticketsSubSection === 'closed' ? 'bg-green-600 text-white' : 'bg-black/40 text-green-300'}`}
                    onClick={() => {
                      setTicketsSubSection('closed');
                      if (ticketsTypeTab === 'seekers') {
                        fetchClosedSeekerTickets();
                      } else {
                        fetchClosedCompanyTickets();
                      }
                    }}
                  >
                    Closed Tickets
                  </button>
                </div>
                
                {/* Search bar and filter */}
                <div className="mb-6 flex gap-4">
                  <input
                    type="text"
                    placeholder={ticketsTypeTab === 'seekers' ? "Search by subject, area, or email..." : "Search by subject, category, or user..."}
                    className="flex-1 px-4 py-2 bg-black/50 border border-gray-600 rounded-lg text-white placeholder-gray-400"
                    value={ticketSearchQuery}
                    onChange={e => {
                      setTicketSearchQuery(e.target.value);
                      const q = e.target.value.toLowerCase();
                      if (ticketsSubSection === 'active') {
                        if (ticketsTypeTab === 'seekers') {
                          setFilteredSeekerTickets(
                            seekerTickets.filter(
                              t => t.subject?.toLowerCase().includes(q) || 
                                t.area?.toLowerCase().includes(q) || 
                                t.seekerEmail?.toLowerCase().includes(q) || 
                                t.id.toLowerCase().includes(q)
                            )
                          );
                        } else {
                          setFilteredCompanyTickets(
                            companyTickets.filter(
                              t => t.subject?.toLowerCase().includes(q) || 
                                t.category?.toLowerCase().includes(q) || 
                                t.userName?.toLowerCase().includes(q) || 
                                t.id.toLowerCase().includes(q)
                            )
                          );
                        }
                      } else {
                        if (ticketsTypeTab === 'seekers') {
                          setFilteredClosedSeekerTickets(
                            closedSeekerTickets.filter(
                              t => t.subject?.toLowerCase().includes(q) || 
                                t.area?.toLowerCase().includes(q) || 
                                t.seekerEmail?.toLowerCase().includes(q) || 
                                t.id.toLowerCase().includes(q)
                            )
                          );
                        } else {
                          setFilteredClosedCompanyTickets(
                            closedCompanyTickets.filter(
                              t => t.subject?.toLowerCase().includes(q) || 
                                t.category?.toLowerCase().includes(q) || 
                                t.userName?.toLowerCase().includes(q) || 
                                t.id.toLowerCase().includes(q)
                            )
                          );
                        }
                      }
                    }}
                  />
                  <button
                    className="px-4 py-2 bg-blue-500 rounded text-white"
                    onClick={() => {
                      if (ticketsSubSection === 'active') {
                        if (ticketsTypeTab === 'seekers') fetchSeekerTickets();
                        else fetchCompanyTickets();
                      } else {
                        if (ticketsTypeTab === 'seekers') fetchClosedSeekerTickets();
                        else fetchClosedCompanyTickets();
                      }
                    }}
                    type="button"
                  >
                    Refresh
                  </button>
                </div>
                
                <div className="flex gap-6">
                  {/* Ticket List */}
                  <div className="w-1/3 min-w-[220px] max-w-xs border-r border-blue-900 pr-4 overflow-y-auto ticket-list">
                    {ticketsSubSection === 'active' ? (
                      // Active tickets list
                      (ticketsTypeTab === 'seekers' ? seekerTicketsLoading : companyTicketsLoading) ? (
                        <div className="text-gray-400">Loading tickets...</div>
                      ) : (ticketsTypeTab === 'seekers' ? seekerTicketsError : companyTicketsError) ? (
                        <div className="text-red-400">{ticketsTypeTab === 'seekers' ? seekerTicketsError : companyTicketsError}</div>
                      ) : (ticketsTypeTab === 'seekers' ? filteredSeekerTickets : filteredCompanyTickets).length === 0 ? (
                        <div className="text-gray-400">No active tickets found.</div>
                      ) : (
                        <ul className="space-y-2">
                          {(ticketsTypeTab === 'seekers' ? filteredSeekerTickets : filteredCompanyTickets).map(ticket => (
                            <li key={ticket.id}>
                              <button
                                className={`w-full text-left p-3 rounded-lg border ${ticketsWithUnreadMessages.includes(ticket.id) ? 'border-red-500' : 'border-blue-700/30'} bg-black/40 hover:bg-blue-900/30 transition-colors ${selectedTicket?.id === ticket.id ? 'border-blue-500 bg-blue-900/40' : ''}`}
                                onClick={() => {
                                  setSelectedTicket(ticket);
                                  fetchTicketMessages(ticket.id);
                                }}
                              >
                                <div className="flex justify-between items-start">
                                  <div className="font-semibold text-blue-400 truncate">{ticket.subject}</div>
                                  <div className="text-xs text-gray-400 bg-gray-800/70 px-2 py-1 rounded">
                                    ID: {ticket.id.substring(0, 8)}
                                  </div>
                                </div>
                                <div className="flex justify-between items-center">
                                  <div className="text-xs text-gray-400 truncate">{ticketsTypeTab === 'seekers' ? ticket.area : ticket.category}</div>
                                  {ticketsWithUnreadMessages.includes(ticket.id) && (
                                    <div className="flex items-center">
                                      <span className="animate-pulse inline-block w-2 h-2 rounded-full bg-red-500 mr-1"></span>
                                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                                      </svg>
                                    </div>
                                  )}
                                </div>
                                <div className="text-xs text-gray-500">{ticketsTypeTab === 'seekers' ? ticket.seekerEmail : ticket.userName}</div>
                                <div className="text-xs text-gray-500">{typeof ticket.createdAt === 'string' && ticket.createdAt ? new Date(ticket.createdAt).toLocaleString() : new Date().toLocaleString()}</div>
                                <div className="text-xs mt-1">
                                  <span className={`px-2 py-0.5 rounded ${ticket.status === 'open' ? 'bg-yellow-900 text-yellow-300' : 'bg-green-900 text-green-300'}`}>{ticket.status}</span>
                                </div>
                                {ticket.acceptedBy && (
                                  <div className="text-xs text-blue-300 mt-1">Accepted</div>
                                )}
                              </button>
                            </li>
                          ))}
                        </ul>
                      )
                    ) : (
                      // Closed tickets list
                      closedTicketsLoading ? (
                        <div className="text-gray-400">Loading closed tickets...</div>
                      ) : closedTicketsError ? (
                        <div className="text-red-400">{closedTicketsError}</div>
                      ) : (ticketsTypeTab === 'seekers' ? filteredClosedSeekerTickets : filteredClosedCompanyTickets).length === 0 ? (
                        <div className="text-gray-400">No closed tickets found.</div>
                      ) : (
                        <ul className="space-y-2">
                          {(ticketsTypeTab === 'seekers' ? filteredClosedSeekerTickets : filteredClosedCompanyTickets).map(ticket => (
                            <li key={ticket.id}>
                              <button
                                className={`w-full text-left p-3 rounded-lg border border-green-700/30 bg-black/40 hover:bg-green-900/30 transition-colors ${selectedTicket?.id === ticket.id ? 'border-green-500 bg-green-900/40' : ''}`}
                                onClick={() => {
                                  setSelectedTicket(ticket);
                                  fetchTicketMessages(ticket.id);
                                }}
                              >
                                <div className="flex justify-between items-start">
                                  <div className="font-semibold text-green-400 truncate">{ticket.subject}</div>
                                  <div className="text-xs text-gray-400 bg-gray-800/70 px-2 py-1 rounded">
                                    ID: {ticket.id.substring(0, 8)}
                                  </div>
                                </div>
                                <div className="text-xs text-gray-400 truncate">{ticketsTypeTab === 'seekers' ? ticket.area : ticket.category}</div>
                                <div className="text-xs text-gray-500">{ticketsTypeTab === 'seekers' ? ticket.seekerEmail : ticket.userName}</div>
                                <div className="text-xs text-gray-500">{typeof ticket.createdAt === 'string' && ticket.createdAt ? new Date(ticket.createdAt).toLocaleString() : new Date().toLocaleString()}</div>
                                <div className="flex justify-between items-center text-xs mt-1">
                                  <span className="px-2 py-0.5 rounded bg-green-900 text-green-300">closed</span>
                                  <span className="text-xs text-gray-400">
                                    {typeof ticket.closedAt === 'string' && ticket.closedAt ? 
                                      new Date(ticket.closedAt).toLocaleDateString() : ''}
                                  </span>
                                </div>
                                {ticket.closedByName && (
                                  <div className="text-xs text-green-300 mt-1">Closed by: {ticket.closedByName}</div>
                                )}
                              </button>
                            </li>
                          ))}
                        </ul>
                      )
                    )}
                  </div>
                  
                  {/* Ticket Details & Chat - This part remains the same */}
                  <div className="flex-1 min-w-0">
                    {selectedTicket ? (
                      <div className="ticket-details-container">
                        {/* Ticket header - fixed at top */}
                        <div className="ticket-header">
                          <div className="flex justify-between items-start">
                            <div className="text-lg font-bold text-blue-400">{selectedTicket.subject}</div>
                            <div className="text-xs text-gray-400 bg-gray-800/70 px-2 py-1 rounded">
                              ID: {selectedTicket.id}
                            </div>
                          </div>
                          <div className="text-sm text-gray-400">
                            {ticketsTypeTab === 'seekers'
                              ? <>Area: {selectedTicket.area}</>
                              : <>Category: {selectedTicket.category}</>
                            }
                          </div>
                          <div className="text-xs text-gray-500">
                            Opened: {typeof selectedTicket.createdAt === 'string' && selectedTicket.createdAt ? new Date(selectedTicket.createdAt).toLocaleString() : new Date().toLocaleString()}
                          </div>
                          <div className="text-xs mt-1">
                            <span className={`px-2 py-0.5 rounded ${selectedTicket.status === 'open' ? 'bg-yellow-900 text-yellow-300' : 'bg-green-900 text-green-300'}`}>{selectedTicket.status}</span>
                          </div>
                          <div className="mt-2 text-gray-300">{selectedTicket.description}</div>
                          {selectedTicket.attachmentUrl && (
                            <div className="mt-2">
                              <a href={selectedTicket.attachmentUrl} target="_blank" rel="noopener noreferrer" className="text-blue-400 underline">View Attachment</a>
                            </div>
                          )}
                          <div className="mt-2 text-xs text-blue-200">
                            {selectedTicket.acceptedByName && <>Accepted by: {selectedTicket.acceptedByName}</> }
                          </div>
                          {selectedTicket.closedByName && (
                            <div className="mt-2 text-xs text-green-200">
                              Closed by: {selectedTicket.closedByName} on {typeof selectedTicket.closedAt === 'string' && selectedTicket.closedAt ? new Date(selectedTicket.closedAt).toLocaleString() : ''}
                            </div>
                          )}
                        </div>
                        
                        {/* Messages container with fixed height and scrollbar */}
                        <div className="ticket-messages-container">
                          {ticketMessages.length === 0 ? (
                            <div className="text-gray-400">No messages yet.</div>
                          ) : (
                            <ul className="space-y-3">
                              {ticketMessages.map(msg => (
                                <li key={msg.id} className={msg.senderType === 'support' ? 'message-support' : 'message-seeker'}>
                                  <div className={msg.senderType === 'support' ? 'message-bubble-support' : 'message-bubble-seeker'}>
                                    {msg.message}
                                    <div className="text-xs text-gray-300 mt-1 text-right">{new Date(msg.createdAt).toLocaleString()}</div>
                                  </div>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                        
                        {/* Actions - fixed at bottom */}
                        <div className="ticket-actions-container">
                          {/* Actions */}
                          <div className="flex gap-2 mt-4 border-t border-blue-900 pt-4">
                            {/* Accept ticket - only for active tickets */}
                            {(!selectedTicket?.acceptedBy && selectedTicket?.status === 'open' || 
                              !selectedTicket?.acceptedBy && selectedTicket?.status === 'pending') && (
                              <button
                                className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                                onClick={() => handleAcceptTicket(selectedTicket.id)}
                              >
                                Accept Ticket
                              </button>
                            )}
                            
                            {/* Close ticket - only for active tickets */}
                            {(selectedTicket?.status === 'open' || selectedTicket?.status === 'pending') && (
                              <button
                                className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
                                onClick={() => handleCloseTicket(selectedTicket.id)}
                              >
                                Close Ticket
                              </button>
                            )}
                          </div>
                          
                          {/* Chat input - only for active tickets */}
                          {selectedTicket.status === 'open' && selectedTicket.acceptedBy && (
                            <form onSubmit={handleSendMessage} className="flex gap-2 mt-4">
                              <input
                                type="text"
                                className="flex-1 p-2 rounded bg-black/40 border border-blue-500/30 text-white"
                                placeholder="Type your message..."
                                value={newMessage}
                                onChange={e => setNewMessage(e.target.value)}
                                disabled={sendingMessage}
                                required
                              />
                              <button
                                type="submit"
                                className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-60"
                                disabled={sendingMessage || !newMessage.trim()}
                              >
                                {sendingMessage ? 'Sending...' : 'Send'}
                              </button>
                            </form>
                          )}
                          {selectedTicket.status === 'closed' && (
                            <div className="text-green-400 text-sm mt-4">This ticket is closed.</div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="text-gray-400 flex items-center justify-center h-full">
                        Select a ticket to view details and chat history
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>
      )}
    </Layout>
  );
};

export default SupportDashboard;