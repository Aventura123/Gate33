import React, { useState, useEffect, useCallback } from "react";
import { collection, query, where, getDocs, addDoc, updateDoc, doc, orderBy, serverTimestamp } from "firebase/firestore";
import { Learn2Earn, Learn2EarnTask } from "../../types/learn2earn";
import learn2earnContractService from "../../services/learn2earnContractService";
import { useWallet } from "../../components/WalletProvider";
import { ethers } from "ethers";
import "../../styles/learn2earn.css";

// Utility function to calculate progress percentage
const calculateProgressPercentage = (totalParticipants: number | undefined, tokenPerParticipant: number, tokenAmount: number): number => {
  return Math.min(100, Math.round((totalParticipants || 0) * tokenPerParticipant / tokenAmount * 100));
};

function getProgressBarFillClass(percent: number) {
  const safePercent = Math.max(0, Math.min(100, Math.round(percent)));
  return `progress-bar-fill progress-bar-fill-${safePercent}`;
}

interface Learn2EarnManagerProps {
  db: any;
  companyId: string;
  companyProfile: any;
}

// Custom hook for detecting mobile devices
function useIsMobileL2E() {
  const [isMobileDevice, setIsMobileDevice] = useState(false);
  
  useEffect(() => {
    const checkIfMobile = () => {
      const userAgent = typeof window.navigator === "undefined" ? "" : navigator.userAgent;
      const mobileByAgent = Boolean(
        userAgent.match(/Android|BlackBerry|iPhone|iPad|iPod|Opera Mini|IEMobile|WPDesktop/i)
      );
      const mobileByWidth = window.innerWidth <= 768;
      setIsMobileDevice(mobileByAgent || mobileByWidth);
    };
    
    checkIfMobile();
    window.addEventListener("resize", checkIfMobile);
    return () => window.removeEventListener("resize", checkIfMobile);
  }, []);
  
  return isMobileDevice;
}

const Learn2EarnManager: React.FC<Learn2EarnManagerProps> = ({
  db,
  companyId,
  companyProfile,
}) => {
  // --- Main states ---
  const [learn2earn, setLearn2Earn] = useState<Learn2Earn[]>([]);
  const [isLoadingLearn2Earn, setIsLoadingLearn2Earn] = useState(false);
  const [feePercent, setFeePercent] = useState<number>(5);
  const [learn2EarnSubTab, setLearn2EarnSubTab] = useState<'new' | 'my'>('my');
  const [learn2EarnStep, setLearn2EarnStep] = useState<'info' | 'tasks' | 'confirmation'>('info');
  // Sync states
  const [syncing, setSyncing] = useState(false);
  const [syncWarnings, setSyncWarnings] = useState<{id: string; msg: string}[]>([]);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [nextSyncTime, setNextSyncTime] = useState<Date | null>(null);
  const [learn2earnData, setLearn2EarnData] = useState<Omit<Learn2Earn, 'id' | 'companyId'>>({
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
    socialLinks: { discord: "", telegram: "", twitter: "", website: "" },
    network: '',
  });
  const [currentTask, setCurrentTask] = useState<Omit<Learn2EarnTask, 'id'>>({
    type: 'content',
    title: "",
    description: "",
    contentText: "",
  });  const [currentQuestionOptions, setCurrentQuestionOptions] = useState<string[]>(['', '', '', '']);
  const [correctOptionIndex, setCorrectOptionIndex] = useState(0);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [isDepositConfirmed, setIsDepositConfirmed] = useState(false);
  const [depositError, setDepositError] = useState<string | null>(null);
  const [isProcessingDeposit, setIsProcessingDeposit] = useState(false);  const [availableNetworks, setAvailableNetworks] = useState<string[]>([]);
  const [isLoadingNetworks, setIsLoadingNetworks] = useState(false);  // Expansion state for Learn2Earn cards
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [expandedCardId, setExpandedCardId] = useState<string | null>(null);
  // Draft management states
  const [drafts, setDrafts] = useState<Learn2Earn[]>([]);
  const [showDraftModal, setShowDraftModal] = useState(false);
  const [isLoadingDrafts, setIsLoadingDrafts] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [currentDraftId, setCurrentDraftId] = useState<string | null>(null);
  // Access wallet context using useWallet hook
  const wallet = useWallet();

  const walletAddress = wallet.walletAddress;
  const handleConnectWallet = wallet.connectWallet;
  const currentNetwork = wallet.currentNetwork;
  // If you need provider/signer for contracts, create a utility in provider or use a specific hook, like other components

  // --- Main functions and useEffects (fetch, create, toggle, etc) ---

  // Function to toggle status (activate/deactivate) Learn2Earn
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
  // Function to fetch Learn2Earn opportunities
  const fetchLearn2Earn = useCallback(async () => {
    if (!db || !companyId) return;
    setIsLoadingLearn2Earn(true);
    try {
      const learn2earnCollection = collection(db, "learn2earn");
      const q = query(
        learn2earnCollection, 
        where("companyId", "==", companyId),
        where("status", "!=", "draft") // Exclude drafts from main listing
      );
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

  // Effect to fetch Learn2Earn when tab is activated
  useEffect(() => {
    fetchLearn2Earn();
  }, [fetchLearn2Earn]);

  // Function to fetch available networks
  const fetchAvailableNetworks = useCallback(async () => {
    setIsLoadingNetworks(true);
    try {
      const networks = await learn2earnContractService.getSupportedNetworks();
      setAvailableNetworks(networks);
    } catch (error) {
      setAvailableNetworks([]);
    } finally {
      setIsLoadingNetworks(false);
    }  }, [learn2earnContractService]);  // Fetch networks when tab is activated  
  useEffect(() => {
    fetchAvailableNetworks();
  }, [fetchAvailableNetworks]);
  // Function to fetch drafts
  const fetchDrafts = useCallback(async () => {
    if (!db || !companyId) return;
    setIsLoadingDrafts(true);
    try {
      console.log("Fetching drafts for companyId:", companyId);
      const draftsCollection = collection(db, "learn2earn_drafts");
      const q = query(
        draftsCollection, 
        where("companyId", "==", companyId)
      );
      const draftsSnapshot = await getDocs(q);
      console.log("Drafts snapshot size:", draftsSnapshot.size);      const fetchedDrafts: Learn2Earn[] = draftsSnapshot.docs
        .map((doc) => {
          console.log("Draft document:", doc.id, doc.data());
          return {
            id: doc.id,
            ...doc.data(),
          } as Learn2Earn;
        })
        .filter(draft => !(draft as any).deleted); // Filter out deleted drafts after fetching
      setDrafts(fetchedDrafts);
      console.log("Fetched drafts (after filtering):", fetchedDrafts);
    } catch (error) {
      console.error("Error fetching drafts:", error);
    } finally {
      setIsLoadingDrafts(false);
    }
  }, [db, companyId]);  // Function to save as draft
  const saveDraft = async () => {
    if (!db || !companyId) {
      alert("Not authenticated. Please login again.");
      return;
    }
    
    if (!learn2earnData.title) {
      alert("Please enter at least a title to save as draft");
      return;
    }

    setIsSavingDraft(true);
    try {
      console.log("Saving draft with data:", learn2earnData);
      console.log("Current draft ID:", currentDraftId);
      
      const draftData = {
        ...learn2earnData,
        companyId,
        status: 'draft',
        updatedAt: serverTimestamp(),
        deleted: false,
      };

      if (currentDraftId) {
        // Update existing draft
        console.log("Updating existing draft:", currentDraftId);
        const draftRef = doc(db, "learn2earn_drafts", currentDraftId);
        await updateDoc(draftRef, draftData);
        console.log("Draft updated successfully");
        alert("Draft updated successfully!");
      } else {
        // Create new draft
        console.log("Creating new draft");
        const draftsCollection = collection(db, "learn2earn_drafts");
        const draftDataWithCreatedAt = {
          ...draftData,
          createdAt: serverTimestamp(),
        };
        const docRef = await addDoc(draftsCollection, draftDataWithCreatedAt);
        console.log("New draft created with ID:", docRef.id);
        setCurrentDraftId(docRef.id);
        alert("Draft saved successfully!");
      }
      
      fetchDrafts(); // Refresh drafts list
    } catch (error) {
      console.error("Error saving draft:", error);
      alert("Failed to save draft. Please try again.");
    } finally {
      setIsSavingDraft(false);
    }
  };  // Function to load draft
  const loadDraft = (draft: Learn2Earn) => {
    console.log("Loading draft:", draft);
    
    // Ensure we handle dates properly
    let startDate = null;
    let endDate = null;
    
    if (draft.startDate) {
      if (typeof draft.startDate === 'object' && 'toDate' in draft.startDate) {
        startDate = (draft.startDate as any).toDate();
      } else if (draft.startDate instanceof Date) {
        startDate = draft.startDate;
      } else if (typeof draft.startDate === 'string') {
        startDate = new Date(draft.startDate);
      }
    }
    
    if (draft.endDate) {
      if (typeof draft.endDate === 'object' && 'toDate' in draft.endDate) {
        endDate = (draft.endDate as any).toDate();
      } else if (draft.endDate instanceof Date) {
        endDate = draft.endDate;
      } else if (typeof draft.endDate === 'string') {
        endDate = new Date(draft.endDate);
      }
    }
    
    setLearn2EarnData({
      title: draft.title || "",
      description: draft.description || "",
      tokenSymbol: draft.tokenSymbol || "",
      tokenAmount: draft.tokenAmount || 0,
      tokenAddress: draft.tokenAddress || "",
      tokenPerParticipant: draft.tokenPerParticipant || 0,
      totalParticipants: draft.totalParticipants || 0,
      maxParticipants: draft.maxParticipants,
      startDate: startDate,
      endDate: endDate,
      tasks: draft.tasks || [],
      status: 'draft',
      contractAddress: draft.contractAddress || "",
      transactionHash: draft.transactionHash || "",
      socialLinks: draft.socialLinks || { discord: "", telegram: "", twitter: "", website: "" },
      network: draft.network || '',
    });
    
    setCurrentDraftId(draft.id);
    setShowDraftModal(false);
    setLearn2EarnSubTab('new'); // Switch to new tab
    
    // Clear any existing editing state
    setEditingTaskId(null);
    setCurrentTask({
      type: 'content',
      title: "",
      description: "",
      contentText: "",
    });
    setCurrentQuestionOptions(['', '', '', '']);
    setCorrectOptionIndex(0);
    
    // Determine which step to show based on draft content
    if (draft.tasks && draft.tasks.length > 0) {
      setLearn2EarnStep('tasks');
    } else {
      setLearn2EarnStep('info');
    }
    
    console.log("Draft loaded successfully");
  };// Function to delete draft
  const deleteDraft = async (draftId: string) => {
    if (!db) return;
    
    if (!confirm('Are you sure you want to delete this draft? This action cannot be undone.')) return;
    
    try {
      console.log("Deleting draft:", draftId);
      const draftRef = doc(db, "learn2earn_drafts", draftId);
      await updateDoc(draftRef, { deleted: true });
      
      // If we're currently editing this draft, clear the form
      if (currentDraftId === draftId) {
        resetLearn2EarnForm();
      }
      
      fetchDrafts(); // Refresh drafts list
      alert("Draft deleted successfully!");
    } catch (error) {
      console.error("Error deleting draft:", error);
      alert("Failed to delete draft. Please try again.");
    }
  };
  // Function to reset form and current draft
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
      socialLinks: { discord: "", telegram: "", twitter: "", website: "" },
      network: '',
    });
    setCurrentDraftId(null);
    setCurrentTask({
      type: 'content',
      title: "",
      description: "",
      contentText: "",
    });
    setCurrentQuestionOptions(['', '', '', '']);
    setCorrectOptionIndex(0);
    setEditingTaskId(null);
    setIsDepositConfirmed(false);
  };

  // Fetch drafts when component mounts
  useEffect(() => {
    fetchDrafts();
  }, [fetchDrafts]);
  
  // Dummy function for details (placeholder)
  const fetchL2LStats = (l2lId: string) => {};
  // Function to sync status
  const syncStatuses = useCallback(async () => {
    if (!learn2earn || learn2earn.length === 0) return;
    setSyncing(true);
    const warnings: {id:string; msg:string}[] = [];
    console.log(`Starting Learn2Earn sync - ${new Date().toISOString()}`);
    for (const l2l of learn2earn) {
      try {
        let newStatus = l2l.status;
        const now = new Date();

        // Robust date parsing
        let startDate: Date | null = null;
        let endDate: Date | null = null;
        try {
          if (l2l.startDate) {
            if (l2l.startDate instanceof Date && !isNaN(l2l.startDate.getTime())) {
              startDate = l2l.startDate;
            } else if (
              typeof l2l.startDate === "object" &&
              typeof (l2l.startDate as any).toDate === "function"
            ) {
              const d = (l2l.startDate as any).toDate();
              if (d instanceof Date && !isNaN(d.getTime())) startDate = d;
            } else if (typeof l2l.startDate === "string" || typeof l2l.startDate === "number") {
              const d = new Date(l2l.startDate);
              if (d instanceof Date && !isNaN(d.getTime())) startDate = d;
            }
          }
          if (l2l.endDate) {
            if (l2l.endDate instanceof Date && !isNaN(l2l.endDate.getTime())) {
              endDate = l2l.endDate;
            } else if (
              typeof l2l.endDate === "object" &&
              typeof (l2l.endDate as any).toDate === "function"
            ) {
              const d = (l2l.endDate as any).toDate();
              if (d instanceof Date && !isNaN(d.getTime())) endDate = d;
            } else if (typeof l2l.endDate === "string" || typeof l2l.endDate === "number") {
              const d = new Date(l2l.endDate);
              if (d instanceof Date && !isNaN(d.getTime())) endDate = d;
            }
          }
        } catch (dateErr) {
          warnings.push({id: l2l.id, msg: `Invalid date format for Learn2Earn: ${l2l.title}`});
          console.error("Date parse error for L2L", l2l, dateErr);
          continue;
        }

        // Defensive checks for participants
        const maxParticipants = typeof l2l.maxParticipants === "number" && !isNaN(l2l.maxParticipants) ? l2l.maxParticipants : undefined;
        const totalParticipants = typeof l2l.totalParticipants === "number" && !isNaN(l2l.totalParticipants) ? l2l.totalParticipants : 0;

        // Rule 1: If not started yet
        if (startDate && now < startDate) {
          newStatus = "draft";
        }
        // Rule 2: If already ended (date or participants)
        else if (
          (endDate && now > endDate) ||
          (maxParticipants !== undefined && totalParticipants >= maxParticipants)
        ) {
          newStatus = "completed";
        }
        // Rule 3: If active (started but not ended)
        else if (
          startDate && now >= startDate &&
          (!endDate || now <= endDate) &&
          (maxParticipants === undefined || totalParticipants < maxParticipants)
        ) {
          newStatus = "active";
        } else {
          // defensive fallback
          newStatus = "draft";
        }

        if (l2l.status !== newStatus) {
          await updateDoc(doc(db, "learn2earn", l2l.id), { status: newStatus });
          warnings.push({id: l2l.id, msg: `Status updated: ${l2l.status} → ${newStatus}`});
          l2l.status = newStatus;
        }
      } catch (err) {
        warnings.push({id: l2l.id, msg: `Error synchronizing Learn2Earn status: ${l2l.title} (${err instanceof Error ? err.message : String(err)})`});
        console.error("Error in syncStatuses for L2L", l2l, err);
      }
    }
    setSyncWarnings(warnings);
    setSyncing(false);
    setLastSyncTime(new Date());
    return warnings;
  }, [learn2earn, db]);  // Effect to run sync on component load
  useEffect(() => {
    syncStatuses();
  }, [syncStatuses]);
  
  // Automatic sync at midnight
  useEffect(() => {
    // Function to calculate next midnight
    const getNextMidnight = () => {
      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setDate(now.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);
      return tomorrow;
    };
    
    // Function to schedule next sync
    const scheduleNextSync = () => {
      const nextMidnight = getNextMidnight();
      const timeUntilMidnight = nextMidnight.getTime() - Date.now();
      
      console.log(`Scheduling next sync for ${nextMidnight.toLocaleString()}`);
      setNextSyncTime(nextMidnight);
      
      // Set timer for next midnight
      const timer = setTimeout(() => {
        console.log("Running automatic sync at midnight");
        syncStatuses().then(() => {
          setLastSyncTime(new Date());
          scheduleNextSync(); // Schedule next sync
        });
      }, timeUntilMidnight);
      
      return timer;
    };
    
    // Start scheduling when component mounts
    const timer = scheduleNextSync();
    
    // Clear timer when component unmounts
    return () => clearTimeout(timer);
  }, [syncStatuses]);
    // Automatic synchronization at midnight
  useEffect(() => {
    // Function to calculate when the next midnight will be
    const getNextMidnight = () => {
      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setDate(now.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);
      return tomorrow;
    };
    
    // Function to schedule the next synchronization
    const scheduleNextSync = () => {
      const nextMidnight = getNextMidnight();
      const timeUntilMidnight = nextMidnight.getTime() - Date.now();
      
      console.log(`Scheduling next synchronization for ${nextMidnight.toLocaleString()}`);
      setNextSyncTime(nextMidnight);
      
      // Set timer for next midnight
      const timer = setTimeout(() => {
        console.log("Running automatic synchronization at midnight");
        syncStatuses().then(() => {
          setLastSyncTime(new Date());
          scheduleNextSync(); // Schedule next sync
        });
      }, timeUntilMidnight);
      
      return timer;
    };
    
    // Start scheduling when the component mounts
    const timer = scheduleNextSync();
    
    // Clear timer when the component unmounts
    return () => clearTimeout(timer);
  }, [syncStatuses]);  // Handler for Learn2Earn form changes
  const handleLearn2EarnChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (name === 'tokenAmount' || name === 'totalParticipants' || name === 'tokenPerParticipant') {
      const numValue = value ? Number(value) : 0;
      const updatedData = {...learn2earnData, [name]: numValue};
      if ((name === 'tokenAmount' || name === 'tokenPerParticipant') && 
          updatedData.tokenAmount > 0 && updatedData.tokenPerParticipant > 0) {
        const calculatedMaxParticipants = Math.floor(updatedData.tokenAmount / updatedData.tokenPerParticipant);
        updatedData.maxParticipants = calculatedMaxParticipants;
      }
      setLearn2EarnData(updatedData);
    } else if (name === 'maxParticipants') {
      setLearn2EarnData({...learn2earnData, [name]: value ? Number(value) : undefined});
    } else {
      setLearn2EarnData({...learn2earnData, [name]: value ?? ""});
    }
  };

  // Handler for dates
  const handleDateChange = (name: 'startDate' | 'endDate', date: Date) => {
    setLearn2EarnData({...learn2earnData, [name]: date});
  };  // Handler to add task
  const addTask = () => {
    if (!currentTask.title || !currentTask.description) {
      alert("Please fill in all task fields");
      return;
    }
    
    // Validations for specific task types
    if (currentTask.type === 'content' && currentTask.contentType === 'link') {
      if (!currentTask.externalUrl) {
        alert("Please enter a resource URL");
        return;
      }
      if (!currentTask.linkTitle) {
        alert("Please enter a display text for the link");
        return;
      }
    } else if (currentTask.type === 'content' && (!currentTask.contentType || currentTask.contentType === 'full')) {
      if (!currentTask.contentText || currentTask.contentText.trim() === '') {
        alert("Please add some educational content");
        return;
      }
    }
    
    let newTask: Learn2EarnTask;
    if (currentTask.type === 'content') {
      newTask = {
        ...currentTask,
        id: Date.now().toString()
      };
    } else {
      newTask = {
        ...currentTask,
        id: Date.now().toString(),
        options: currentQuestionOptions,
        correctOption: correctOptionIndex // <-- should be number
      };
    }
    setLearn2EarnData({
      ...learn2earnData,
      tasks: [...learn2earnData.tasks, newTask]
    });
    
    // Clear form - same as cancelEditTask
    cancelEditTask();
  };
  // Handler to remove task
  const removeTask = (taskId: string) => {
    // If we're editing this task, cancel editing
    if (editingTaskId === taskId) {
      cancelEditTask();
    }
    setLearn2EarnData({
      ...learn2earnData,
      tasks: learn2earnData.tasks.filter(task => task.id !== taskId)
    });
  };

  // Function to start editing a task
  const editTask = (task: Learn2EarnTask) => {
    setEditingTaskId(task.id);
    setCurrentTask({
      type: task.type,
      title: task.title,
      description: task.description,
      contentText: task.contentText || "",
      contentType: task.contentType,
      externalUrl: task.externalUrl,
      linkTitle: task.linkTitle,
      question: task.question,
    });
    
    if (task.type === 'question' && task.options) {
      setCurrentQuestionOptions([...task.options]);
      setCorrectOptionIndex(task.correctOption || 0);
    }
  };

  // Function to update existing task
  const updateTask = () => {
    if (!editingTaskId) {
      alert("No task selected for editing");
      return;
    }

    if (!currentTask.title || !currentTask.description) {
      alert("Please fill in all task fields");
      return;
    }
    
    // Same validations as addTask
    if (currentTask.type === 'content' && currentTask.contentType === 'link') {
      if (!currentTask.externalUrl) {
        alert("Please enter a resource URL");
        return;
      }
      if (!currentTask.linkTitle) {
        alert("Please enter a display text for the link");
        return;
      }
    } else if (currentTask.type === 'content' && (!currentTask.contentType || currentTask.contentType === 'full')) {
      if (!currentTask.contentText || currentTask.contentText.trim() === '') {
        alert("Please add some educational content");
        return;
      }
    }

    let updatedTask: Learn2EarnTask;
    if (currentTask.type === 'content') {
      updatedTask = {
        ...currentTask,
        id: editingTaskId
      };
    } else {
      updatedTask = {
        ...currentTask,
        id: editingTaskId,
        options: currentQuestionOptions,
        correctOption: correctOptionIndex
      };
    }

    setLearn2EarnData({
      ...learn2earnData,
      tasks: learn2earnData.tasks.map(task => 
        task.id === editingTaskId ? updatedTask : task
      )
    });

    // Clear editing state
    cancelEditTask();
  };

  // Function to cancel editing task
  const cancelEditTask = () => {
    setEditingTaskId(null);
    setCurrentTask({
      type: 'content',
      description: "",
      contentText: "",
      title: ""
    });
    setCurrentQuestionOptions(['', '', '', '']);
    setCorrectOptionIndex(0);
  };

  // Handler for task form changes
  const handleTaskChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setCurrentTask({ ...currentTask, [name]: value });
  };

  // Function to create Learn2Earn
  const createLearn2Earn = async () => {
    if (!db || !companyId) {
      alert("Not authenticated. Please login again.");
      return;
    }    if (!learn2earnData.title || !learn2earnData.description || 
        !learn2earnData.tokenSymbol || !learn2earnData.tokenAddress ||
        learn2earnData.tokenAmount <= 0 || learn2earnData.tokenPerParticipant <= 0 ||
        !learn2earnData.startDate || 
        learn2earnData.tasks.length === 0) {
      alert("Please fill in all required fields and add at least one task");
      return;
    }
    if (!learn2earnData.network) {
      alert("Please select a blockchain network");
      return;
    }
    if (learn2earnData.tokenPerParticipant > learn2earnData.tokenAmount) {
      alert("Tokens per participant cannot exceed total token amount");
      return;
    }
    setIsProcessingDeposit(true);
    setDepositError(null);
    try {
      if (!walletAddress) {
        await handleConnectWallet();
        await new Promise(resolve => setTimeout(resolve, 500));
        if (!walletAddress) {
          throw new Error("Wallet connection is required to create a learn2earn opportunity");
        }
      }
      const normalizedNetwork = learn2earnData.network.trim().toLowerCase();
      const isApproved = await learn2earnContractService.checkTokenApproval(
        normalizedNetwork,
        learn2earnData.tokenAddress
      );
      if (!isApproved) {
        alert("You need to approve the token first. Please confirm the approval transaction in your wallet.");
        await learn2earnContractService.approveToken(
          normalizedNetwork,
          learn2earnData.tokenAddress
        );
      }
      const learn2earnFirebaseId = `learn2earn_${Date.now()}`;
      let startDate: Date, endDate: Date;
      if (learn2earnData.startDate) {
        if (typeof learn2earnData.startDate === 'object') {
          if ('toDate' in learn2earnData.startDate && typeof learn2earnData.startDate.toDate === 'function') {
            startDate = learn2earnData.startDate.toDate();
          } else if (learn2earnData.startDate instanceof Date) {
            startDate = learn2earnData.startDate;
          } else {
            startDate = new Date(Date.now() + 5 * 60 * 1000);
          }
        } else if (typeof learn2earnData.startDate === 'string') {
          startDate = new Date(learn2earnData.startDate);
        } else {
          startDate = new Date(Date.now() + 5 * 60 * 1000);
        }      } else {
        startDate = new Date(Date.now() + 5 * 60 * 1000);
      }

      // Set endDate to 365 days after startDate
      endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 365);

      const now = new Date();
      const minStartTime = new Date(now.getTime() + 5 * 60 * 1000);
      if (startDate < now) {
        startDate = minStartTime;
      }
      const endBuffer = 1 * 60 * 60 * 1000;
      const adjustedEndDate = new Date(endDate.getTime() + endBuffer);      // Calculate the total value to be sent, considering that the contract subtracts the fee
      // To ensure that the specified amount is actually available for distribution
      // If the user wants to distribute X tokens, we need to send X / (1 - fee/100) tokens
      const feeMultiplier = 1 - (feePercent / 100);
      const adjustedTokenAmount = learn2earnData.tokenAmount / feeMultiplier;
      
      const depositResult = await learn2earnContractService.createLearn2Earn(
        normalizedNetwork,
        learn2earnFirebaseId,
        learn2earnData.tokenAddress,
        adjustedTokenAmount, // Adjusted value to compensate for the fee deduction
        startDate,
        endDate,
        learn2earnData.maxParticipants || 0
      );
      if (!depositResult.success) {
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
          const feeAmount = depositResult.feeAmount ? depositResult.feeAmount : (learn2earnData.tokenAmount * feePercent / 100);
          throw new Error(`You need additional ${feeAmount} ${learn2earnData.tokenSymbol} to cover the platform fee.`);
        }
        else if (depositResult.executionReverted) {
          throw new Error(`Transaction would fail: ${depositResult.message || "Unknown contract error"}. Please check your wallet and try again.`);
        }
        throw new Error(depositResult.message || "Failed to create learn2earn opportunity. Please check your wallet and try again.");
      }
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
      await addDoc(learn2earnCollection, newLearn2Earn);
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
        createdAt: new Date()      });
      
      // If this was created from a draft, delete the draft
      if (currentDraftId) {
        try {
          console.log("Deleting draft after successful creation:", currentDraftId);
          const draftRef = doc(db, "learn2earn_drafts", currentDraftId);
          await updateDoc(draftRef, { deleted: true });
          console.log("Draft deleted successfully");
        } catch (draftError) {
          console.error("Error deleting draft:", draftError);
          // Don't fail the whole operation if draft deletion fails
        }
      }
      
      resetLearn2EarnForm();
      fetchLearn2Earn();
      fetchDrafts(); // Refresh drafts list to remove deleted draft
      setLearn2EarnStep('confirmation');
    } catch (error: any) {
      console.error("Error creating learn2earn:",error);
      setDepositError(error.message || "Failed to create learn2earn opportunity. Please check your wallet and try again.");
    } finally {
      setIsProcessingDeposit(false);    }
  };

  // Helper to format date for display
  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'N/A';
    if (timestamp instanceof Date) return timestamp.toLocaleDateString();
    if (typeof timestamp === "object" && typeof timestamp.toDate === "function") {
      const d = timestamp.toDate();
      if (d instanceof Date && !isNaN(d.getTime())) return d.toLocaleDateString();
    }
    if (typeof timestamp === "string" || typeof timestamp === "number") {
      const d = new Date(timestamp);
      if (d instanceof Date && !isNaN(d.getTime())) return d.toLocaleDateString();
    }
    return 'N/A';
  };  // --- Main rendering ---
  const isMobileDevice = useIsMobileL2E();
  return (
    <div className="w-full">
      <div className="bg-black/70 rounded-lg shadow-lg p-6 pt-16 md:pt-20">        {/* Main section title */}
        <h2 className="text-2xl font-bold text-orange-500 mb-2 text-center">
          Learn2Earn Opportunities
          {currentDraftId && (
            <span className="text-sm text-yellow-400 ml-2 font-normal">
              (Editing Draft)
            </span>
          )}
        </h2>
        <div className="flex gap-6 mb-6 items-end border-b border-orange-900/60">
          <button
            className={`relative text-base font-semibold mr-2 transition-colors pb-1 ${learn2EarnSubTab === 'my' ? 'text-orange-500' : 'text-orange-300 hover:text-orange-400'}`}
            onClick={() => setLearn2EarnSubTab('my')}
          >
            My Learn2Earn
            {learn2EarnSubTab === 'my' && (
              <span className="absolute left-0 right-0 -bottom-[2px] h-[2px] bg-orange-500 rounded" />
            )}
          </button>          <button
            className={`relative text-base font-semibold transition-colors pb-1 ${learn2EarnSubTab === 'new' ? 'text-orange-500' : 'text-orange-300 hover:text-orange-400'}`}
            onClick={() => setLearn2EarnSubTab('new')}
          >
            {currentDraftId ? `Edit Draft: ${learn2earnData.title || 'Untitled'}` : 'New Learn2Earn'}
            {learn2EarnSubTab === 'new' && (
              <span className="absolute left-0 right-0 -bottom-[2px] h-[2px] bg-orange-500 rounded" />
            )}
          </button>
        </div>
        {/* Render the appropriate subcomponent based on the selected subtab */}
        {learn2EarnSubTab === 'new' ? (
          // --- renderNewLearn2Earn migrated JSX ---
          isLoadingLearn2Earn ? (
            <p className="text-gray-300 py-4">Loading...</p>
          ) : learn2EarnStep === 'info' ? (
            <form onSubmit={(e) => {
              e.preventDefault();
              setLearn2EarnStep('tasks');
            }}>
              {/* Blockchain Network */}
              <div className="mb-4">
                <label className="block text-gray-300 mb-2">Blockchain Network</label>
                <select
                  name="network"
                  value={learn2earnData.network}
                  onChange={handleLearn2EarnChange}
                  className="w-full bg-black/50 border border-orange-500 rounded p-2 text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
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
                        }).catch((error: Error) => {
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
              {/* Title */}
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
              {/* Description */}
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
              {/* Token Symbol & Address */}
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
              {/* Token Amount & Per Participant */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-gray-300 mb-2">Total Token Amount</label>
                  <input
                    type="number"
                    name="tokenAmount"
                    value={learn2earnData.tokenAmount || ''}
                    onChange={handleLearn2EarnChange}
                    placeholder="Total amount of tokens to distribute"
                    className="w-full bg-black/50 border border-gray-700 rounded p-2 text-white"                    required
                    min="0"
                    step="0.000001"
                  />
                  <p className="text-xs text-gray-400 mt-1">Fee: {feePercent}% (will be added to the specified token amount)</p>
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
              {/* Start Date */}
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
                />              </div>
              {/* End Date - Auto-calculated to 365 days after start date */}
              {/* Max Participants (readonly, calculated) */}
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
              {/* Social Links */}
              <div className="mb-4">
                <label className="block text-gray-300 mb-2">Social Links (optional)</label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <input
                    type="url"
                    name="website"
                    value={learn2earnData.socialLinks?.website || ''}
                    onChange={e => setLearn2EarnData({
                      ...learn2earnData,
                      socialLinks: { ...learn2earnData.socialLinks, website: e.target.value }
                    })}
                    placeholder="Website"
                    className="w-full bg-black/50 border border-gray-700 rounded p-2 text-white"
                  />
                  <input
                    type="text"
                    name="twitter"
                    value={learn2earnData.socialLinks?.twitter || ''}
                    onChange={e => setLearn2EarnData({
                      ...learn2earnData,
                      socialLinks: { ...learn2earnData.socialLinks, twitter: e.target.value }
                    })}
                    placeholder="Twitter"
                    className="w-full bg-black/50 border border-gray-700 rounded p-2 text-white"
                  />
                  <input
                    type="text"
                    name="telegram"
                    value={learn2earnData.socialLinks?.telegram || ''}
                    onChange={e => setLearn2EarnData({
                      ...learn2earnData,
                      socialLinks: { ...learn2earnData.socialLinks, telegram: e.target.value }
                    })}
                    placeholder="Telegram"
                    className="w-full bg-black/50 border border-gray-700 rounded p-2 text-white"
                  />
                  <input
                    type="text"
                    name="discord"
                    value={learn2earnData.socialLinks?.discord || ''}
                    onChange={e => setLearn2EarnData({
                      ...learn2earnData,
                      socialLinks: { ...learn2earnData.socialLinks, discord: e.target.value }
                    })}
                    placeholder="Discord"
                    className="w-full bg-black/50 border border-gray-700 rounded p-2 text-white"
                  />
                </div>              </div>            {/* Buttons */}              <div className="mt-4 flex justify-between">
                <div className="flex space-x-2">
                  <button
                    type="button"
                    onClick={() => setShowDraftModal(true)}
                    className="bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 transition-colors"
                  >
                    Load Draft
                  </button>
                  <button
                    type="button"
                    onClick={saveDraft}
                    disabled={isSavingDraft || !learn2earnData.title}
                    className={`bg-yellow-600 text-white py-2 px-4 rounded transition-colors ${
                      isSavingDraft || !learn2earnData.title
                        ? 'opacity-50 cursor-not-allowed'
                        : 'hover:bg-yellow-700'
                    }`}
                  >
                    {isSavingDraft ? 'Saving...' : currentDraftId ? 'Update Draft' : 'Save Draft'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (currentDraftId || learn2earnData.title || learn2earnData.description) {
                        if (confirm('Are you sure you want to start a new Learn2Earn? Any unsaved changes will be lost.')) {
                          resetLearn2EarnForm();
                        }
                      } else {
                        resetLearn2EarnForm();
                      }
                    }}
                    className="bg-gray-600 text-white py-2 px-4 rounded hover:bg-gray-700 transition-colors"
                  >
                    New
                  </button>
                </div>
                <button
                  type="submit"
                  className="bg-orange-500 text-white py-2 px-6 rounded hover:bg-orange-600 transition-colors"
                >
                  Next: Add Tasks
                </button>
              </div></form>        ) : learn2EarnStep === 'tasks' ? (
          <div className="space-y-6">            {learn2earnData.tasks.length > 0 && (
              <div className="mb-6">
                <h4 className="text-xl font-medium text-white mb-2">Current Tasks</h4>
                <ul className="space-y-2">
                  {learn2earnData.tasks.map((task, index) => (
                    <li key={task.id} className={`bg-black/30 p-3 rounded-lg border ${editingTaskId === task.id ? 'border-yellow-500' : 'border-gray-700'} flex justify-between items-center cursor-pointer hover:bg-black/40 transition-colors`}>
                      <div 
                        className="flex-1"
                        onClick={() => editTask(task)}
                      >
                        <p className="text-white font-medium">{task.title}</p>
                        <p className="text-sm text-gray-400">
                          {task.type === 'content' ? 'Educational Content' : 'Quiz Question'}
                          {editingTaskId === task.id && (
                            <span className="text-yellow-400 ml-2">(Editing)</span>
                          )}
                        </p>
                        <p className="text-xs text-gray-500">Click to edit</p>
                      </div>
                      <div className="flex space-x-2">
                        {editingTaskId === task.id && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              cancelEditTask();
                            }}
                            className="text-gray-500 hover:text-gray-400 px-2 py-1 text-sm"
                          >
                            Cancel
                          </button>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            removeTask(task.id);
                          }}
                          className="text-red-500 hover:text-red-400"
                        >
                          Remove
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>            )}

            {editingTaskId && (
              <div className="mb-4 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                <p className="text-yellow-400 text-sm font-medium">
                  ✏️ Editing Task: {learn2earnData.tasks.find(t => t.id === editingTaskId)?.title || 'Unknown Task'}
                </p>
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
            </div>            {currentTask.type === 'content' ? (
              <div className="mb-6">
                <div className="mb-4 flex items-center">
                  <label className="block text-gray-300 mr-4">Content Type:</label>
                  <div className="flex space-x-3">
                    <div className="flex items-center">
                      <input 
                        type="radio" 
                        id="content-type-full" 
                        name="contentType"
                        checked={!currentTask.contentType || currentTask.contentType === 'full'} 
                        onChange={() => setCurrentTask({...currentTask, contentType: 'full'})}
                        className="mr-2" 
                      />
                      <label htmlFor="content-type-full" className="text-white text-sm">Rich Content</label>
                    </div>
                    <div className="flex items-center">
                      <input 
                        type="radio" 
                        id="content-type-link" 
                        name="contentType"
                        checked={currentTask.contentType === 'link'} 
                        onChange={() => setCurrentTask({...currentTask, contentType: 'link'})}
                        className="mr-2" 
                      />
                      <label htmlFor="content-type-link" className="text-white text-sm">External Link Only</label>
                    </div>
                  </div>
                </div>
                
                {(!currentTask.contentType || currentTask.contentType === 'full') ? (
                  <>
                    <label className="block text-gray-300 mb-2">Educational Content</label>
                    <div className="mb-2 flex space-x-2">
                      <button 
                        type="button"                      onClick={() => {
                          const textArea = document.querySelector('textarea[name="contentText"]') as HTMLTextAreaElement;
                          if (textArea) {
                            const start = textArea.selectionStart;
                            const end = textArea.selectionEnd;
                            const text = currentTask.contentText || '';
                            const newText = text.substring(0, start) + '**Bold Text**' + text.substring(end);
                            setCurrentTask({...currentTask, contentText: newText});
                          }
                        }}
                        className="bg-gray-800 text-white px-2 py-1 text-sm rounded hover:bg-gray-700"
                      >
                        B
                      </button>
                      <button 
                        type="button"                      onClick={() => {
                          const textArea = document.querySelector('textarea[name="contentText"]') as HTMLTextAreaElement;
                          if (textArea) {
                            const start = textArea.selectionStart;
                            const end = textArea.selectionEnd;
                            const text = currentTask.contentText || '';
                            const newText = text.substring(0, start) + '*Italic Text*' + text.substring(end);
                            setCurrentTask({...currentTask, contentText: newText});
                          }
                        }}
                        className="bg-gray-800 text-white px-2 py-1 text-sm rounded hover:bg-gray-700 italic"
                      >
                        I
                      </button>
                      <button 
                        type="button"                      onClick={() => {
                          const textArea = document.querySelector('textarea[name="contentText"]') as HTMLTextAreaElement;
                          if (textArea) {
                            const start = textArea.selectionStart;
                            const text = currentTask.contentText || '';
                            const newText = text.substring(0, start) + '\n• List item\n• Another item\n• One more item\n' + text.substring(start);
                            setCurrentTask({...currentTask, contentText: newText});
                          }
                        }}
                        className="bg-gray-800 text-white px-2 py-1 text-sm rounded hover:bg-gray-700"
                      >
                        • List
                      </button>
                      <button 
                        type="button"
                        onClick={() => {
                          const videoUrl = prompt("Enter a YouTube or Vimeo URL:");
                          if (videoUrl) {
                            const text = currentTask.contentText || '';
                            const newText = text + (text ? '\n\n' : '') + `[VIDEO](${videoUrl})`;
                            setCurrentTask({...currentTask, contentText: newText});
                          }
                        }}
                        className="bg-gray-800 text-white px-2 py-1 text-sm rounded hover:bg-gray-700"
                      >
                        + Video
                      </button>
                      <button 
                        type="button"
                        onClick={() => {
                          const externalUrl = prompt("Enter resource URL (website, document, etc.):");
                          if (externalUrl) {
                            const linkTitle = prompt("Enter a title for this link:", "External Resource");
                            const text = currentTask.contentText || '';
                            const newText = text + (text ? '\n\n' : '') + `[LINK:${linkTitle}](${externalUrl})`;
                            setCurrentTask({...currentTask, contentText: newText});
                          }
                        }}
                        className="bg-gray-800 text-white px-2 py-1 text-sm rounded hover:bg-gray-700"
                      >
                        + Link
                      </button>
                    </div>
                    <textarea
                      name="contentText"
                      value={currentTask.contentText}
                      onChange={handleTaskChange}
                      placeholder="Enter educational content. You can use markdown formatting: **bold**, *italic*, • lists, etc."
                      className="w-full bg-black/50 border border-gray-700 rounded p-2 text-white h-32 font-mono"
                    ></textarea>
                    <p className="text-xs text-gray-400 mt-1">
                      This content supports basic formatting. Use the formatting buttons above or markdown syntax.
                    </p>
                  </>
                ) : (
                  <>
                    <div className="grid grid-cols-1 gap-4">
                      <div>
                        <label className="block text-gray-300 mb-2">Resource Type</label>
                        <select
                          name="resourceType"
                          value={currentTask.resourceType || 'website'}
                          onChange={(e) => setCurrentTask({...currentTask, resourceType: e.target.value as 'website' | 'video' | 'document' | 'article'})}
                          className="w-full bg-black/50 border border-gray-700 rounded p-2 text-white"
                        >
                          <option value="website">Website</option>
                          <option value="video">Video (YouTube, Vimeo, etc.)</option>
                          <option value="document">Document (PDF, etc.)</option>
                          <option value="article">Article</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-gray-300 mb-2">Resource URL</label>
                        <input
                          type="url"
                          name="externalUrl"
                          value={currentTask.externalUrl || ''}
                          onChange={(e) => setCurrentTask({...currentTask, externalUrl: e.target.value})}
                          placeholder="https://example.com"
                          className="w-full bg-black/50 border border-gray-700 rounded p-2 text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-gray-300 mb-2">Display Text</label>
                        <input
                          type="text"
                          name="linkTitle"
                          value={currentTask.linkTitle || ''}
                          onChange={(e) => setCurrentTask({...currentTask, linkTitle: e.target.value})}
                          placeholder="Click here to view this resource"
                          className="w-full bg-black/50 border border-gray-700 rounded p-2 text-white"
                        />
                        <p className="text-xs text-gray-400 mt-1">
                          This text will be shown as a clickable link to your external resource
                        </p>
                      </div>
                      <div>
                        <label className="block text-gray-300 mb-2">Short Instructions (Optional)</label>
                        <textarea
                          name="linkDescription"
                          value={currentTask.linkDescription || ''}
                          onChange={(e) => setCurrentTask({...currentTask, linkDescription: e.target.value})}
                          placeholder="Please read the article and pay attention to the key concepts."
                          className="w-full bg-black/50 border border-gray-700 rounded p-2 text-white h-16"
                        ></textarea>
                      </div>
                    </div>
                  </>
                )}
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
                </div>                <div className="mb-6">
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
                      {currentQuestionOptions.length > 2 && (
                        <button
                          type="button"
                          onClick={() => {
                            const newOptions = [...currentQuestionOptions];
                            newOptions.splice(index, 1);
                            setCurrentQuestionOptions(newOptions);
                            if (correctOptionIndex === index) {
                              setCorrectOptionIndex(0);
                            } else if (correctOptionIndex > index) {
                              setCorrectOptionIndex(correctOptionIndex - 1);
                            }
                          }}
                          className="ml-2 text-red-500 hover:text-red-400 px-2"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  ))}
                  
                  <div className="mt-3">
                    <button
                      type="button"
                      onClick={() => {
                        setCurrentQuestionOptions([...currentQuestionOptions, '']);
                      }}
                      className="text-sm bg-gray-700 text-white py-1 px-3 rounded hover:bg-gray-600 transition-colors"
                    >
                      + Add Option
                    </button>
                  </div>
                </div></>
            )}            {/* Preview Section */}
            {currentTask.title && currentTask.description && (
              <div className="mb-6 p-4 bg-black/30 border border-gray-700 rounded-md">
                <h5 className="font-medium text-orange-400 mb-2">Task Preview</h5>
                <div className="mb-2">
                  <span className="text-gray-400 text-sm">Title:</span>
                  <p className="text-white">{currentTask.title}</p>
                </div>
                <div className="mb-2">
                  <span className="text-gray-400 text-sm">Description:</span>
                  <p className="text-white">{currentTask.description}</p>
                </div>                {currentTask.type === 'content' ? (
                  <>
                    {currentTask.contentType === 'link' ? (
                      <>
                        <span className="text-gray-400 text-sm">External Resource:</span>
                        <div className="p-2 bg-black/40 rounded mt-1 mb-2 text-white">
                          <div className="flex flex-col">
                            <span className="text-sm">
                              <strong>Type:</strong> {currentTask.resourceType || 'Website'}
                            </span>
                            <span className="text-sm">
                              <strong>URL:</strong> {currentTask.externalUrl || <em className="text-gray-500">No URL added yet</em>}
                            </span>
                            <span className="text-sm">
                              <strong>Display Text:</strong> {currentTask.linkTitle || <em className="text-gray-500">No display text added yet</em>}
                            </span>
                            {currentTask.linkDescription && (
                              <span className="text-sm">
                                <strong>Instructions:</strong> {currentTask.linkDescription}
                              </span>
                            )}
                          </div>
                        </div>
                      </>
                    ) : (
                      <>
                        <span className="text-gray-400 text-sm">Content:</span>
                        <div className="p-2 bg-black/40 rounded mt-1 mb-2 text-white">
                          {currentTask.contentText || <em className="text-gray-500">No content added yet</em>}
                        </div>
                      </>
                    )}
                  </>
                ) : (
                  <>
                    <span className="text-gray-400 text-sm">Question:</span>
                    <p className="text-white mb-2">{currentTask.question}</p>
                    <span className="text-gray-400 text-sm">Options:</span>
                    <ul className="mt-1 mb-2">
                      {currentQuestionOptions.map((option, index) => (
                        <li key={index} className={`text-white ${correctOptionIndex === index ? 'font-bold text-green-400' : ''}`}>
                          {index + 1}. {option || <em className="text-gray-500">Empty option</em>}
                          {correctOptionIndex === index && <span className="ml-2 text-xs">(Correct)</span>}
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </div>
            )}            <div className="mt-4 mb-6 flex space-x-2 justify-start">
              {editingTaskId ? (
                <>
                  <button
                    onClick={updateTask}
                    className="bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 transition-colors"
                  >
                    Update Task
                  </button>
                  <button
                    onClick={cancelEditTask}
                    className="bg-gray-600 text-white py-2 px-4 rounded hover:bg-gray-700 transition-colors"
                  >
                    Cancel Edit
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={addTask}
                    className="bg-green-600 text-white py-2 px-4 rounded hover:bg-green-700 transition-colors"
                  >
                    Add Task
                  </button>
                  <button
                    onClick={cancelEditTask}
                    className="bg-gray-600 text-white py-2 px-4 rounded hover:bg-gray-700 transition-colors"
                  >
                    Clear Form
                  </button>
                </>
              )}
            </div>
            
            {/* Task Creation Completion */}
            <div className="mb-6 p-4 bg-black/30 border border-green-500/30 rounded-md">
              <h5 className="font-medium text-green-400 mb-2">Task Creation Summary</h5>
              <p className="text-white mb-2">You have created <span className="font-bold">{learn2earnData.tasks.length}</span> tasks for this Learn2Earn campaign.</p>
              {learn2earnData.tasks.length === 0 ? (
                <p className="text-yellow-400">Add at least one task above before proceeding to the next step.</p>
              ) : (
                <p className="text-gray-300">You can add more tasks or proceed to the next step to confirm your Learn2Earn campaign.</p>
              )}
            </div>

            {/* Deposit Information */}
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
              </div>              <div className="grid grid-cols-2 gap-3 mb-3">
                <div className="bg-black/50 p-2 rounded-md">
                  <div className="text-xs text-gray-400">Start</div>
                  <div className="text-sm font-medium text-white">
                    {learn2earnData.startDate ? new Date(learn2earnData.startDate as any).toLocaleDateString() : 'Not set'}
                  </div>
                </div>
                <div className="bg-black/50 p-2 rounded-md">
                  <div className="text-xs text-gray-400">End (Auto: +365 days)</div>
                  <div className="text-sm font-medium text-white">
                    {learn2earnData.startDate ? 
                      (() => {
                        const endDate = new Date(learn2earnData.startDate as any);
                        endDate.setDate(endDate.getDate() + 365);
                        return endDate.toLocaleDateString();
                      })() : 
                      'Will be set automatically'
                    }
                  </div>
                </div>
              </div><div className="grid grid-cols-2 gap-3 mb-3">
                <div className="bg-black/50 p-2 rounded-md">
                  <div className="text-xs text-gray-400">Total Amount to Send</div>
                  <div className="text-sm font-medium text-white">
                    {(learn2earnData.tokenAmount / (1 - (feePercent / 100))).toFixed(6)} {learn2earnData.tokenSymbol}
                  </div>
                </div>                <div className="bg-black/50 p-2 rounded-md">
                  <div className="text-xs text-gray-400 font-bold">Fee ({feePercent}%)</div>
                  <div className="text-sm font-medium text-orange-400">
                    {(learn2earnData.tokenAmount / (1 - (feePercent / 100)) * feePercent / 100).toFixed(6)} {learn2earnData.tokenSymbol}
                  </div>
                </div>
              </div>
                <div className="bg-black/50 p-2 rounded-md mt-3">
                <div className="text-xs text-gray-400">Fee Calculation Explanation</div>
                <div className="text-xs text-gray-300">
                  The fee is subtracted from the total amount you send. This means that if you want to distribute {learn2earnData.tokenAmount} {learn2earnData.tokenSymbol} to participants, 
                  you need to send a higher amount that includes the fee.
                </div>
              </div>
              
              <div className="bg-black/50 p-2 rounded-md mt-3">
                <div className="text-xs text-gray-400">Example Calculation</div>
                <div className="text-xs text-gray-300">
                  <strong>For example:</strong> If you want to distribute 100 {learn2earnData.tokenSymbol} with a fee of {feePercent}%:
                  <ul className="list-disc pl-4 mt-1">
                    <li>Total amount to send = 100 ÷ (1 - {feePercent}/100) = 100 ÷ {(1 - (feePercent/100)).toFixed(2)} = {(100 / (1 - (feePercent / 100))).toFixed(2)} {learn2earnData.tokenSymbol}</li>
                    <li>Fee amount = {(100 / (1 - (feePercent / 100)) * feePercent / 100).toFixed(2)} {learn2earnData.tokenSymbol}</li>
                    <li>Amount available for rewards = 100 {learn2earnData.tokenSymbol}</li>
                  </ul>
                  <p className="mt-1">The contract subtracts the fee from the total amount you send, so we adjust the total to ensure participants receive the full amount you specified.</p>
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
            </div>            <div className="mt-4 flex justify-between">
              <div className="flex space-x-2">
                <button
                  type="button"
                  onClick={() => setShowDraftModal(true)}
                  className="bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 transition-colors"
                >
                  Load Draft
                </button>
                <button
                  type="button"
                  onClick={saveDraft}
                  disabled={isSavingDraft || !learn2earnData.title}
                  className={`bg-yellow-600 text-white py-2 px-4 rounded transition-colors ${
                    isSavingDraft || !learn2earnData.title
                      ? 'opacity-50 cursor-not-allowed'
                      : 'hover:bg-yellow-700'
                  }`}
                >
                  {isSavingDraft ? 'Saving...' : currentDraftId ? 'Update Draft' : 'Save Draft'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (currentDraftId || learn2earnData.title || learn2earnData.description || learn2earnData.tasks.length > 0) {
                      if (confirm('Are you sure you want to start a new Learn2Earn? Any unsaved changes will be lost.')) {
                        resetLearn2EarnForm();
                        setLearn2EarnStep('info');
                      }
                    } else {
                      resetLearn2EarnForm();
                      setLearn2EarnStep('info');
                    }
                  }}
                  className="bg-gray-600 text-white py-2 px-4 rounded hover:bg-gray-700 transition-colors"
                >
                  New
                </button>
              </div>
              <div>
                <button
                  onClick={() => setLearn2EarnStep('info')}
                  className="bg-gray-700 text-white py-2 px-4 mr-2 rounded hover:bg-gray-600 transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={createLearn2Earn}
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
          </div>        ) : learn2EarnStep === 'confirmation' ? (
          <div className="space-y-6 text-center">
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
        ) : null
      ) : (
        // --- renderMyLearn2Earn migrated JSX ---
        isLoadingLearn2Earn || syncing ? (
          <p className="text-gray-300 py-4">Loading & synchronizing Learn2Earn opportunities...</p>
        ) : (          <div>
            <div>
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
                  {learn2earn.map((item) => {
                    const isExpanded = expandedCardId === item.id;
                    return (
                      <div
                        key={item.id}
                        className={`bg-black/30 rounded-lg border border-gray-700 transition-all duration-200 ${isExpanded ? 'p-6' : 'p-3 cursor-pointer hover:shadow-lg'}`}
                        onClick={() => setExpandedCardId(isExpanded ? null : item.id)}
                      >
                        <div className="flex justify-between items-center">
                          <div>
                            <h4 className="text-lg font-medium text-orange-300 truncate max-w-xs">{item.title}</h4>
                            <p className="text-gray-400 text-sm truncate max-w-xs">{item.description}</p>
                          </div>
                          <span className={`px-3 py-1 text-xs font-medium rounded-full ${
                            item.status === 'active' ? 'bg-green-500/20 text-green-400' :
                            item.status === 'completed' ? 'bg-orange-500/20 text-orange-400' :
                            'bg-gray-500/20 text-gray-400'
                          }`}>
                            {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                          </span>
                        </div>
                        {isExpanded && (
                          <div className="mt-4 space-y-2">
                            {/* Resumo detalhado do L2L (como antes) */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                            <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="bg-black/20 p-3 rounded-md">
                                <div className="text-sm text-gray-400">Start Date</div>
                                <div className="text-white">{formatDate(item.startDate)}</div>
                              </div>
                              <div className="bg-black/20 p-3 rounded-md">
                                <div className="text-sm text-gray-400">End Date</div>
                                <div className="text-white">{formatDate(item.endDate)}</div>
                              </div>
                              <div className="bg-black/20 p-3 rounded-md col-span-1 md:col-span-2">
                                <div className="text-sm text-gray-400">Network</div>
                                <div className="flex items-center">
                                  <span className="bg-gray-700 text-xs px-2 py-1 rounded mr-2">
                                    {(item.network ?? "N/A").toUpperCase()}
                                  </span>
                                  {item.contractAddress && (
                                    <span className="text-xs text-gray-400 truncate">
                                      Token Contract: {item.tokenAddress ? item.tokenAddress.substring(0, 8) + '...' + item.tokenAddress.substring(item.tokenAddress.length - 6) : 'N/A'}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                            {/* Token Distribution Progress */}
                            <div className="mt-4">
                              <div className="flex justify-between text-xs text-gray-400 mb-1">
                                <span>Token Distribution Progress</span>
                                <span>
                                  {calculateProgressPercentage(item.totalParticipants, item.tokenPerParticipant, item.tokenAmount)}%
                                </span>
                              </div>
                              <div className="progress-bar w-full">
                                <div
                                  className={getProgressBarFillClass(calculateProgressPercentage(item.totalParticipants, item.tokenPerParticipant, item.tokenAmount))}
                                  aria-label={`Progress: ${calculateProgressPercentage(item.totalParticipants, item.tokenPerParticipant, item.tokenAmount)}%`}
                                ></div>
                              </div>
                            </div>
                            <div className="mt-2 flex space-x-2 justify-end">
                              <button
                                onClick={e => {
                                  e.stopPropagation();
                                  setLearn2Earn(learn2earn => learn2earn.map(l2l => l2l.id === item.id ? { ...l2l, _showFullDetails: !(l2l as any)._showFullDetails } : l2l));
                                }}
                                className="bg-blue-600 text-white px-3 py-1 rounded-md hover:bg-blue-700"
                              >
                                {(item as any)._showFullDetails ? 'Hide Details' : 'View Details'}
                              </button>
                            </div>
                            {/* Full details only if requested */}
                            {(item as any)._showFullDetails && (
                              <div className="mt-6">
                                <h5 className="text-lg font-semibold text-orange-400 mb-2">Learn2Earn Details</h5>
                                <div className="mb-4 text-gray-300">
                                  <strong>Description:</strong> {item.description}
                                </div>
                                {item.tasks && item.tasks.length > 0 && (
                                  <div className="mb-4">
                                    <h6 className="text-md font-medium text-orange-300 mb-2">Tasks</h6>
                                    <div className="space-y-4">
                                      {item.tasks.map((task) => (
                                        <React.Suspense fallback={<div>Loading task...</div>} key={task.id}>
                                          {(() => {
                                            const TaskCard = require('../../components/learn2earn/TaskCard').default;
                                            return <TaskCard task={task} isReadOnly />;
                                          })()}
                                        </React.Suspense>
                                      ))}
                                    </div>
                                  </div>
                                )}
                                <div className="mb-2 text-gray-400 text-xs">
                                  <strong>Rules:</strong> Complete all tasks and quizzes to earn rewards. Tokens are distributed per participant as specified.
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}                </div>
              )}
            </div>
          </div>        )
      )}
        {/* Draft Modal - Gate33 Style */}
      {showDraftModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-black/90 border border-orange-500/30 p-6 rounded-lg max-w-2xl w-full max-h-[80vh] overflow-y-auto m-4 shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-semibold text-white">Load Draft</h3>
              <button
                onClick={() => setShowDraftModal(false)}
                className="text-gray-400 hover:text-orange-400 text-2xl transition-colors"
              >
                ×
              </button>
            </div>
            
            {isLoadingDrafts ? (
              <div className="py-8 text-center">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
                <p className="text-gray-300 mt-2">Loading drafts...</p>
              </div>
            ) : drafts.length === 0 ? (
              <p className="text-gray-300 py-8 text-center">No drafts found.</p>
            ) : (
              <div className="space-y-3">
                {drafts.map((draft) => (
                  <div
                    key={draft.id}
                    className={`bg-black/50 border rounded-lg p-4 transition-all hover:bg-black/70 ${
                      currentDraftId === draft.id 
                        ? 'border-orange-500 bg-orange-500/10' 
                        : 'border-gray-700 hover:border-orange-500/50'
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <div className="flex-1">
                        <div className="flex items-center mb-2">
                          <h4 className="text-lg font-medium text-white">
                            {draft.title || 'Untitled Draft'}
                          </h4>
                          {currentDraftId === draft.id && (
                            <span className="ml-2 px-2 py-1 bg-orange-500/20 text-orange-400 text-xs rounded">
                              Currently Editing
                            </span>
                          )}
                        </div>
                        <p className="text-gray-400 text-sm">
                          Updated: {
                            draft.updatedAt ? 
                              new Date((draft.updatedAt as any).toDate?.() || draft.updatedAt).toLocaleDateString() :
                              'Unknown'
                          }
                        </p>
                      </div>
                      <div className="flex space-x-2 ml-4">
                        <button
                          onClick={() => loadDraft(draft)}
                          className="bg-orange-500 text-white px-4 py-2 rounded text-sm hover:bg-orange-600 transition-colors font-medium"
                        >
                          Load
                        </button>
                        <button
                          onClick={() => deleteDraft(draft.id)}
                          className="bg-gray-700 text-white px-4 py-2 rounded text-sm hover:bg-red-600 transition-colors font-medium"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            <div className="mt-6 flex justify-center">
              <button
                onClick={() => setShowDraftModal(false)}
                className="bg-gray-700 text-white px-6 py-2 rounded hover:bg-gray-600 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
};

export default Learn2EarnManager;
