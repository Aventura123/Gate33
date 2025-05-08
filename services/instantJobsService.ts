import { collection, addDoc, getDocs, getDoc, updateDoc, doc, query, where, Timestamp, serverTimestamp } from "firebase/firestore";
import { db } from "../lib/firebase";
import { web3Service } from "./web3Service";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { v4 as uuidv4 } from "uuid";
import { instantJobsEscrowService } from "./instantJobsEscrowService";

// Commission fee percentage for Gate33 platform
const PLATFORM_COMMISSION_PERCENTAGE = 5; // 5% commission

export interface InstantJob {
  id?: string;
  title: string;
  description: string;
  category: string;
  companyId: string;
  companyName: string;
  budget: number;
  currency: string;
  deadline: Date | Timestamp;
  requiredSkills: string[];
  status: 'open' | 'accepted' | 'in_progress' | 'completed' | 'approved' | 'disputed' | 'closed';
  createdAt: Date | Timestamp;
  updatedAt: Date | Timestamp;
  acceptedBy?: string;
  acceptedByName?: string;
  transactionHash?: string;
  contractAddress?: string;
  walletAddress?: string; // Worker's wallet address
  escrowDeposited?: boolean; // Whether the company has deposited funds
  estimatedTime?: string; // Added to support optional field
}

export interface JobMessage {
  id?: string;
  jobId: string;
  senderId: string;
  senderName: string;
  senderType: 'company' | 'worker';
  message: string;
  timestamp: Date | Timestamp;
  isRead: boolean;
  attachments?: string[];
}

class InstantJobsService {
  async createInstantJob(jobData: Omit<InstantJob, 'id' | 'createdAt' | 'updatedAt' | 'status'>): Promise<string> {
    try {
      if (!db) throw new Error("Firestore is not initialized");
      
      const jobCollection = collection(db, "instantJobs");
      const newJob = {
        ...jobData,
        status: 'open',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        escrowDeposited: false
      };
      
      const jobRef = await addDoc(jobCollection, newJob);
      
      // Add a notification for administrators
      const notificationsCollection = collection(db, "adminNotifications");
      await addDoc(notificationsCollection, {
        type: "instantJob",
        message: `New micro-task created by ${jobData.companyName}: ${jobData.title}`,
        jobId: jobRef.id,
        companyId: jobData.companyId,
        read: false,
        createdAt: serverTimestamp()
      });
      
      return jobRef.id;
    } catch (error) {
      console.error("Error creating micro-task:", error);
      throw error;
    }
  }
  
  async acceptInstantJob(jobId: string, workerId: string, workerName: string): Promise<void> {
    try {
      if (!db) throw new Error("Firestore is not initialized");
      
      const jobRef = doc(db, "instantJobs", jobId);
      const jobSnap = await getDoc(jobRef);
      
      if (!jobSnap.exists()) {
        throw new Error("Micro-task not found");
      }
      
      const jobData = jobSnap.data();
      if (jobData.status !== 'open') {
        throw new Error("This micro-task is not available");
      }
      
      await updateDoc(jobRef, {
        status: 'accepted',
        acceptedBy: workerId,
        acceptedByName: workerName,
        updatedAt: serverTimestamp()
      });
      
      // Send notification to the company
      const notifCollection = collection(db, "notifications");
      await addDoc(notifCollection, {
        recipientId: jobData.companyId,
        recipientType: 'company',
        title: "Micro-task accepted",
        message: `Your micro-task "${jobData.title}" has been accepted by ${workerName}`,
        read: false,
        jobId: jobId,
        createdAt: serverTimestamp()
      });
    } catch (error) {
      console.error("Error accepting micro-task:", error);
      throw error;
    }
  }

  async depositJobFunds(jobId: string, companyId: string, network: string, walletAddress: string): Promise<void> {
    try {
      if (!db) throw new Error("Firestore is not initialized");
      
      // Get the job data
      const jobRef = doc(db, "instantJobs", jobId);
      const jobSnap = await getDoc(jobRef);
      
      if (!jobSnap.exists()) {
        throw new Error("Micro-task not found");
      }
      
      const jobData = jobSnap.data() as InstantJob;
      
      if (jobData.companyId !== companyId) {
        throw new Error("You don't have permission to deposit funds for this task");
      }
      
      if (!jobData.acceptedBy) {
        throw new Error("This task hasn't been accepted by any worker yet");
      }
      
      if (jobData.escrowDeposited) {
        throw new Error("Funds are already in escrow for this task");
      }
      
      // Calculate deadline timestamp in seconds
      const deadlineTimestamp = jobData.deadline instanceof Timestamp 
        ? jobData.deadline.seconds
        : Math.floor(new Date(jobData.deadline).getTime() / 1000);
      
      // Create job in escrow contract
      const result = await instantJobsEscrowService.createJob(
        network,
        jobId,
        jobData.budget,
        deadlineTimestamp
      );
      
      // Update job with transaction details and worker's wallet address
      await updateDoc(jobRef, {
        transactionHash: result.transactionHash,
        contractAddress: result.contractAddress,
        walletAddress, // Worker's wallet address
        escrowDeposited: true,
        updatedAt: serverTimestamp()
      });
      
      // Send notification to the worker
      const notifCollection = collection(db, "notifications");
      await addDoc(notifCollection, {
        recipientId: jobData.acceptedBy,
        recipientType: 'worker',
        title: "Funds deposited",
        message: `Funds have been deposited in escrow for the task "${jobData.title}". You can start working now.`,
        read: false,
        jobId: jobId,
        createdAt: serverTimestamp()
      });
      
    } catch (error) {
      console.error("Error depositing funds for micro-task:", error);
      throw error;
    }
  }
  
  async markAsCompleted(jobId: string, workerId: string): Promise<void> {
    try {
      const jobRef = doc(db, "instantJobs", jobId);
      const jobSnap = await getDoc(jobRef);
      
      if (!jobSnap.exists()) {
        throw new Error("Micro-task not found");
      }
      
      const jobData = jobSnap.data();
      if (jobData.acceptedBy !== workerId) {
        throw new Error("You don't have permission to mark this task as completed");
      }
      
      if (jobData.status !== 'accepted' && jobData.status !== 'in_progress') {
        throw new Error("This micro-task cannot be marked as completed");
      }
      
      await updateDoc(jobRef, {
        status: 'completed',
        updatedAt: serverTimestamp()
      });
      
      // If we have a blockchain transaction, update the contract as well
      if (jobData.escrowDeposited && jobData.transactionHash) {
        try {
          // Determine network from job data or use default
          const network = jobData.currency.toLowerCase() === 'eth' ? 'ethereum' : 'polygon';
          
          await instantJobsEscrowService.completeJob(network, jobId);
        } catch (error) {
          console.error("Error updating blockchain contract:", error);
          // Continue anyway, we've updated the Firestore status
        }
      }
      
      // Send notification to the company
      const notifCollection = collection(db, "notifications");
      await addDoc(notifCollection, {
        recipientId: jobData.companyId,
        recipientType: 'company',
        title: "Micro-task completed",
        message: `The micro-task "${jobData.title}" has been marked as completed. Please review and approve.`,
        read: false,
        jobId: jobId,
        createdAt: serverTimestamp()
      });
    } catch (error) {
      console.error("Error marking micro-task as completed:", error);
      throw error;
    }
  }
  
  async approveJob(jobId: string, companyId: string): Promise<void> {
    try {
      const jobRef = doc(db, "instantJobs", jobId);
      const jobSnap = await getDoc(jobRef);
      
      if (!jobSnap.exists()) {
        throw new Error("Micro-task not found");
      }
      
      const jobData = jobSnap.data();
      if (jobData.companyId !== companyId) {
        throw new Error("You don't have permission to approve this task");
      }
      
      if (jobData.status !== 'completed') {
        throw new Error("This micro-task cannot be approved");
      }
      
      await updateDoc(jobRef, {
        status: 'approved',
        updatedAt: serverTimestamp()
      });
      
      // If there's a blockchain transaction, release payment
      if (jobData.escrowDeposited && jobData.transactionHash) {
        try {
          // Determine network from job data or use default
          const network = jobData.currency.toLowerCase() === 'eth' ? 'ethereum' : 'polygon';
          
          // Calculate commission amount (5% of total)
          const totalAmount = jobData.budget;
          const commissionAmount = (totalAmount * PLATFORM_COMMISSION_PERCENTAGE) / 100;
          const workerAmount = totalAmount - commissionAmount;
          
          // Log the payment details
          console.log(`Releasing payment: Total: ${totalAmount}, Commission: ${commissionAmount}, To Worker: ${workerAmount}`);
          
          await instantJobsEscrowService.approveAndPay(network, jobId);
          
          // Record the commission payment in Firestore
          const commissionsCollection = collection(db, "commissions");
          await addDoc(commissionsCollection, {
            jobId,
            jobType: 'instant',
            amount: commissionAmount,
            currency: jobData.currency,
            companyId: jobData.companyId,
            workerId: jobData.acceptedBy,
            transactionHash: jobData.transactionHash,
            timestamp: serverTimestamp()
          });
        } catch (error) {
          console.error("Error releasing blockchain payment:", error);
          // Continue anyway, we've updated the Firestore status
        }
      }
      
      // Send notification to the worker
      const notifCollection = collection(db, "notifications");
      await addDoc(notifCollection, {
        recipientId: jobData.acceptedBy,
        recipientType: 'worker',
        title: "Micro-task approved",
        message: `Congratulations! The micro-task "${jobData.title}" has been approved. Payment will be sent soon.`,
        read: false,
        jobId: jobId,
        createdAt: serverTimestamp()
      });
    } catch (error) {
      console.error("Error approving micro-task:", error);
      throw error;
    }
  }
  
  // Messaging system with file attachments
  async sendMessage(messageData: Omit<JobMessage, 'id' | 'timestamp' | 'isRead'>, files?: File[]): Promise<string> {
    try {
      if (!db) throw new Error("Firestore is not initialized");
      
      // Upload files if provided
      let attachmentUrls: string[] = [];
      
      if (files && files.length > 0) {
        const storage = getStorage();
        
        // Upload each file and collect URLs
        for (const file of files) {
          const fileId = uuidv4();
          const fileExtension = file.name.split('.').pop();
          const filePath = `job-attachments/${messageData.jobId}/${fileId}.${fileExtension}`;
          
          const storageRef = ref(storage, filePath);
          await uploadBytes(storageRef, file);
          
          const downloadUrl = await getDownloadURL(storageRef);
          attachmentUrls.push(downloadUrl);
        }
      }
      
      const messagesCollection = collection(db, "jobMessages");
      const newMessage = {
        ...messageData,
        timestamp: serverTimestamp(),
        isRead: false,
        attachments: attachmentUrls
      };
      
      const messageRef = await addDoc(messagesCollection, newMessage);
      
      // Update the job's last activity
      const jobRef = doc(db, "instantJobs", messageData.jobId);
      await updateDoc(jobRef, {
        lastActivity: serverTimestamp()
      });
      
      // Send notification to the recipient
      // First we need to fetch the job to know who to notify
      const jobSnap = await getDoc(jobRef);
      
      if (!jobSnap.exists()) {
        throw new Error("Micro-task not found");
      }
      
      const jobData = jobSnap.data() as InstantJob;
      
      const notifCollection = collection(db, "notifications");
      let recipientId;
      let recipientType;
      
      if (messageData.senderType === 'company') {
        // Check if the job has an assigned worker
        if (!jobData.acceptedBy) {
          throw new Error("This micro-task hasn't been accepted by a worker yet");
        }
        recipientId = jobData.acceptedBy;
        recipientType = 'worker';
      } else {
        recipientId = jobData.companyId;
        recipientType = 'company';
      }
      
      const notifMessage = attachmentUrls.length > 0
        ? `New message with ${attachmentUrls.length} attachment(s) for task "${jobData.title}"`
        : `New message for task "${jobData.title}"`;
        
      await addDoc(notifCollection, {
        recipientId,
        recipientType,
        title: "New message",
        message: notifMessage,
        read: false,
        jobId: messageData.jobId,
        createdAt: serverTimestamp()
      });
      
      return messageRef.id;
    } catch (error) {
      console.error("Error sending message:", error);
      throw error;
    }
  }
  
  async getMessages(jobId: string): Promise<JobMessage[]> {
    try {
      if (!db) throw new Error("Firestore is not initialized");
      
      const messagesCollection = collection(db, "jobMessages");
      const q = query(messagesCollection, where("jobId", "==", jobId));
      const messagesSnapshot = await getDocs(q);
      
      const messages: JobMessage[] = [];
      messagesSnapshot.forEach((doc) => {
        messages.push({
          id: doc.id,
          ...doc.data()
        } as JobMessage);
      });
      
      // Sort messages by timestamp
      return messages.sort((a, b) => {
        const timeA = a.timestamp instanceof Timestamp ? a.timestamp.toMillis() : new Date(a.timestamp).getTime();
        const timeB = b.timestamp instanceof Timestamp ? b.timestamp.toMillis() : new Date(b.timestamp).getTime();
        return timeA - timeB;
      });
    } catch (error) {
      console.error("Error fetching messages:", error);
      throw error;
    }
  }
  
  async markMessageAsRead(messageId: string): Promise<void> {
    try {
      if (!db) throw new Error("Firestore is not initialized");
      
      const messageRef = doc(db, "jobMessages", messageId);
      await updateDoc(messageRef, {
        isRead: true
      });
    } catch (error) {
      console.error("Error marking message as read:", error);
      throw error;
    }
  }
  
  async getInstantJobsByCompany(companyId: string): Promise<InstantJob[]> {
    try {
      if (!db) throw new Error("Firestore is not initialized");
      
      const jobsCollection = collection(db, "instantJobs");
      const q = query(jobsCollection, where("companyId", "==", companyId));
      const jobsSnapshot = await getDocs(q);
      
      const jobs: InstantJob[] = [];
      jobsSnapshot.forEach((doc) => {
        jobs.push({
          id: doc.id,
          ...doc.data()
        } as InstantJob);
      });
      
      return jobs;
    } catch (error) {
      console.error("Error fetching company's micro-tasks:", error);
      throw error;
    }
  }
  
  async getInstantJobsByWorker(workerId: string): Promise<InstantJob[]> {
    try {
      if (!db) throw new Error("Firestore is not initialized");
      
      const jobsCollection = collection(db, "instantJobs");
      const q = query(jobsCollection, where("acceptedBy", "==", workerId));
      const jobsSnapshot = await getDocs(q);
      
      const jobs: InstantJob[] = [];
      jobsSnapshot.forEach((doc) => {
        jobs.push({
          id: doc.id,
          ...doc.data()
        } as InstantJob);
      });
      
      return jobs;
    } catch (error) {
      console.error("Error fetching worker's micro-tasks:", error);
      throw error;
    }
  }

  async applyForInstantJob(jobId: string, workerId: string, workerName: string, walletAddress: string | null = null): Promise<void> {
    try {
      if (!db) throw new Error("Firestore is not initialized");
      
      // Check if job exists and is open
      const jobRef = doc(db, "instantJobs", jobId);
      const jobSnap = await getDoc(jobRef);
      
      if (!jobSnap.exists()) {
        throw new Error("Micro-task not found");
      }
      
      const jobData = jobSnap.data() as InstantJob;
      
      if (jobData.status !== 'open') {
        throw new Error("This micro-task is not available for applications");
      }
      
      // Create an application
      const applicationsCollection = collection(db, "jobApplications");
      await addDoc(applicationsCollection, {
        jobId,
        workerId,
        workerName,
        walletAddress, // Can now be null, will be updated later
        jobTitle: jobData.title,
        companyId: jobData.companyId,
        companyName: jobData.companyName,
        status: 'pending',
        applicationDate: serverTimestamp()
      });
      
      // Send notification to the company
      const notifCollection = collection(db, "notifications");
      await addDoc(notifCollection, {
        recipientId: jobData.companyId,
        recipientType: 'company',
        title: "New application",
        message: `${workerName} has applied for your micro-task "${jobData.title}"`,
        read: false,
        jobId: jobId,
        createdAt: serverTimestamp()
      });
    } catch (error) {
      console.error("Error applying for micro-task:", error);
      throw error;
    }
  }
  
  async getJobApplications(jobId: string): Promise<any[]> {
    try {
      if (!db) throw new Error("Firestore is not initialized");
      
      const applicationsCollection = collection(db, "jobApplications");
      const q = query(applicationsCollection, where("jobId", "==", jobId));
      const applicationsSnapshot = await getDocs(q);
      
      const applications: any[] = [];
      applicationsSnapshot.forEach((doc) => {
        applications.push({
          id: doc.id,
          ...doc.data()
        });
      });
      
      return applications;
    } catch (error) {
      console.error("Error fetching job applications:", error);
      throw error;
    }
  }
  
  async getWorkerApplications(workerId: string): Promise<any[]> {
    try {
      if (!db) throw new Error("Firestore is not initialized");
      
      const applicationsCollection = collection(db, "jobApplications");
      const q = query(applicationsCollection, where("workerId", "==", workerId));
      const applicationsSnapshot = await getDocs(q);
      
      const applications: any[] = [];
      applicationsSnapshot.forEach((doc) => {
        applications.push({
          id: doc.id,
          ...doc.data()
        });
      });
      
      return applications;
    } catch (error) {
      console.error("Error fetching worker applications:", error);
      throw error;
    }
  }
  
  async approveApplication(applicationId: string, companyId: string): Promise<void> {
    try {
      if (!db) throw new Error("Firestore is not initialized");
      
      // Get the application
      const applicationRef = doc(db, "jobApplications", applicationId);
      const applicationSnap = await getDoc(applicationRef);
      
      if (!applicationSnap.exists()) {
        throw new Error("Application not found");
      }
      
      const application = applicationSnap.data();
      
      // Check if the company has permission
      const jobRef = doc(db, "instantJobs", application.jobId);
      const jobSnap = await getDoc(jobRef);
      
      if (!jobSnap.exists()) {
        throw new Error("Job not found");
      }
      
      const jobData = jobSnap.data();
      if (jobData.companyId !== companyId) {
        throw new Error("You don't have permission to approve this application");
      }
      
      // Update application status
      await updateDoc(applicationRef, {
        status: 'approved'
      });
      
      // Update job with worker info
      await updateDoc(jobRef, {
        status: 'accepted',
        acceptedBy: application.workerId,
        acceptedByName: application.workerName,
        walletAddress: application.walletAddress,
        updatedAt: serverTimestamp()
      });
      
      // Reject other applications for this job
      const applicationsCollection = collection(db, "jobApplications");
      const q = query(
        applicationsCollection, 
        where("jobId", "==", application.jobId),
        where("id", "!=", applicationId)
      );
      
      const otherAppsSnapshot = await getDocs(q);
      
      otherAppsSnapshot.forEach(async (appDoc) => {
        await updateDoc(doc(db, "jobApplications", appDoc.id), {
          status: 'rejected'
        });
        
        // Notify rejected applicants
        await addDoc(collection(db, "notifications"), {
          recipientId: appDoc.data().workerId,
          recipientType: 'worker',
          title: "Application rejected",
          message: `Your application for "${jobData.title}" was not selected`,
          read: false,
          jobId: application.jobId,
          createdAt: serverTimestamp()
        });
      });
      
      // Notify approved worker - Modified to include wallet connection request
      await addDoc(collection(db, "notifications"), {
        recipientId: application.workerId,
        recipientType: 'worker',
        title: "Application approved",
        message: `Congratulations! Your application for "${jobData.title}" has been approved. Please connect your wallet in your dashboard to receive payment when the job is completed.`,
        read: false,
        jobId: application.jobId,
        type: "wallet_needed", // Adding a special type to identify this notification
        createdAt: serverTimestamp()
      });
    } catch (error) {
      console.error("Error approving application:", error);
      throw error;
    }
  }
  
  async getAvailableInstantJobs(): Promise<InstantJob[]> {
    try {
      if (!db) throw new Error("Firestore is not initialized");
      
      const jobsCollection = collection(db, "instantJobs");
      const q = query(jobsCollection, where("status", "==", "open"));
      const jobsSnapshot = await getDocs(q);
      
      const jobs: InstantJob[] = [];
      jobsSnapshot.forEach((doc) => {
        jobs.push({
          id: doc.id,
          ...doc.data()
        } as InstantJob);
      });
      
      return jobs;
    } catch (error) {
      console.error("Error fetching available micro-tasks:", error);
      throw error;
    }
  }

  async getJobById(jobId: string): Promise<InstantJob | null> {
    try {
      if (!db) throw new Error("Firestore is not initialized");
      
      const jobRef = doc(db, "instantJobs", jobId);
      const jobSnap = await getDoc(jobRef);
      
      if (!jobSnap.exists()) {
        return null;
      }
      
      return {
        id: jobSnap.id,
        ...jobSnap.data()
      } as InstantJob;
    } catch (error) {
      console.error("Error fetching micro-task by ID:", error);
      throw error;
    }
  }

  // New function to update wallet address after application
  async updateApplicationWalletAddress(applicationId: string, workerId: string, walletAddress: string): Promise<void> {
    try {
      if (!db) throw new Error("Firestore is not initialized");
      
      // Get the application
      const applicationRef = doc(db, "jobApplications", applicationId);
      const applicationSnap = await getDoc(applicationRef);
      
      if (!applicationSnap.exists()) {
        throw new Error("Application not found");
      }
      
      const application = applicationSnap.data();
      
      // Check if the worker has permission
      if (application.workerId !== workerId) {
        throw new Error("You don't have permission to update this application");
      }
      
      // Update wallet address in the application
      await updateDoc(applicationRef, {
        walletAddress: walletAddress
      });
      
      // If the application is already approved, also update in the job
      if (application.status === 'approved') {
        const jobRef = doc(db, "instantJobs", application.jobId);
        await updateDoc(jobRef, {
          walletAddress: walletAddress
        });
      }
      
    } catch (error) {
      console.error("Error updating wallet address:", error);
      throw error;
    }
  }
}

export const instantJobsService = new InstantJobsService();
export default instantJobsService;