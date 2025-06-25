import React, { useState, useEffect } from "react";
import { collection, addDoc, deleteDoc, doc, getDocs, updateDoc } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { SkillTagsInput } from "../ui/SkillTagsInput";
import { logAdminAction } from "../../utils/logSystem";
import { JOB_CATEGORIES_DROPDOWN } from "../../constants/jobCategories";

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

interface Job {
  id: string;
  title: string;
  jobTitle?: string;
  companyName: string;
  description: string;
  jobDescription?: string;
  requiredSkills?: string | string[];
  location?: string;
  salary?: string;
  salaryRange?: string;
  sourceLink?: string;
  applyLink?: string;
  category?: string;
  jobType?: string;
  experienceLevel?: string;
  techTags?: string[];
  technologies?: string | string[];
  insertedDate?: string;
  isFeatured?: boolean;
  priorityListing?: boolean;
  acceptsCryptoPay?: boolean;
  responsibilities?: string;
  idealCandidate?: string;
  screeningQuestions?: string[];
  disabled?: boolean;
  TP?: boolean;
  status?: 'active' | 'inactive' | 'expired';
  expiresAt?: any;
  fromExternalSource?: boolean;
}

interface JobsManagerProps {
  activeSubTab: string;
  setActiveSubTab: (subTab: string) => void;
}

// Job List Item component
const JobListItem: React.FC<{
  job: Job;
  onDelete: () => void;
  isDeleting: boolean;
  onToggleDisable: () => void;
  isDisabling?: boolean;
  onEdit: () => void;
}> = ({ job, onDelete, isDeleting, onToggleDisable, isDisabling, onEdit }) => {
  const [expanded, setExpanded] = useState(false);
  
  // Helper function to safely render arrays
  const renderTags = (tags: string[] | string | undefined, label: string) => {
    if (!tags) return null;
    const tagArray = Array.isArray(tags) ? tags : [tags];
    if (tagArray.length === 0) return null;
    
    return (
      <div className="mb-2">
        <span className="text-gray-400 text-xs">{label}:</span>
        <div className="flex flex-wrap gap-1 mt-1">
          {tagArray.map((tag, index) => (
            <span key={index} className="px-2 py-1 rounded-full text-xs bg-orange-900/30 text-orange-300 border border-orange-700/50">
              {tag}
            </span>
          ))}
        </div>
      </div>
    );
  };

  // Helper function to format date
  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString();
    } catch {
      return dateString;
    }
  };
  
  return (
    <li      className={`bg-black/30 rounded-xl overflow-hidden transition-all duration-200 ${expanded ? 'border-orange-500' : job.disabled ? 'border-gray-500' : 'border-gray-700'} border ${job.disabled ? 'opacity-70' : ''}`}
    >
      <div 
        className="flex justify-between items-center p-2 md:p-3 cursor-pointer hover:bg-black/40"
        onClick={() => setExpanded(!expanded)}
      >        <div className="flex-1 min-w-0 pr-2">
          <div className="flex items-center gap-2">
            <p className={`font-bold truncate ${job.disabled ? 'text-gray-400' : 'text-orange-400'}`}>
              {job.title || job.jobTitle}
            </p>
            {job.disabled && (
              <span className="px-1 md:px-1.5 py-0.5 rounded-full text-xs bg-gray-800 text-gray-400 border border-gray-700">
                Disabled
              </span>
            )}
            {job.TP && (
              <span className="px-1 md:px-1.5 py-0.5 rounded-full text-xs bg-green-900/50 text-green-300 border border-green-700 animate-pulse">
                TP
              </span>
            )}
            {job.isFeatured && (
              <span className="px-1 md:px-1.5 py-0.5 rounded-full text-xs bg-purple-900/50 text-purple-300 border border-purple-700">
                Featured
              </span>
            )}
            {job.acceptsCryptoPay && (
              <span className="px-1 md:px-1.5 py-0.5 rounded-full text-xs bg-blue-900/50 text-blue-300 border border-blue-700">
                Crypto Pay
              </span>
            )}          </div>
          <p className="text-gray-300 text-xs truncate overflow-hidden whitespace-nowrap text-ellipsis w-full">{job.companyName}</p>
        </div>        <div className="flex items-center gap-1 md:gap-2 flex-shrink-0">
          {job.location && (
            <span className="hidden sm:inline-block px-1 md:px-1.5 py-0.5 rounded-full text-xs bg-black/40 text-orange-300 border border-orange-700/50">
              {job.location}
            </span>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
            }}
            className="bg-blue-600 hover:bg-blue-700 text-white px-1.5 md:px-2 py-1 rounded-md text-xs font-semibold whitespace-nowrap"
          >
            Edit
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation(); // Prevent expansion toggle
              onToggleDisable();
            }}
            className={`${job.disabled ? 'bg-green-600 hover:bg-green-700' : 'bg-yellow-600 hover:bg-yellow-700'} text-white px-1.5 md:px-2 py-1 rounded-md text-xs font-semibold whitespace-nowrap`}
            disabled={isDisabling}
          >
            {isDisabling ? "..." : job.disabled ? "Enable" : "Disable"}
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation(); // Prevent expansion toggle
              onDelete();
            }}
            className="bg-red-600 hover:bg-red-700 text-white px-1.5 md:px-2 py-1 rounded-md text-xs font-semibold whitespace-nowrap"
            disabled={isDeleting}
          >
            {isDeleting ? "..." : "Delete"}
          </button>
          <svg 
            className={`w-4 h-4 md:w-5 md:h-5 text-orange-500 transition-transform duration-200 ${expanded ? 'transform rotate-180' : ''}`} 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>        {expanded && (
        <div className="p-3 md:p-4 border-t border-gray-700 bg-black/20">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3 md:mb-4">
            <div>
              <span className="text-gray-400 text-xs">Job ID:</span>
              <p className="text-gray-300 text-xs font-mono break-all select-all">{job.id}</p>
            </div>
            
            <div>
              <span className="text-gray-400 text-xs">Company:</span>
              <p className="text-orange-300 text-xs">{job.companyName}</p>
            </div>

            {job.category && (
              <div>
                <span className="text-gray-400 text-xs">Category:</span>
                <p className="text-orange-300 text-xs">{job.category}</p>
              </div>
            )}

            {job.jobType && (
              <div>
                <span className="text-gray-400 text-xs">Job Type:</span>
                <p className="text-orange-300 text-xs">{job.jobType}</p>
              </div>
            )}

            {job.experienceLevel && (
              <div>
                <span className="text-gray-400 text-xs">Experience Level:</span>
                <p className="text-orange-300 text-xs">{job.experienceLevel}</p>
              </div>
            )}

            {(job.salary || job.salaryRange) && (
              <div>
                <span className="text-gray-400 text-xs">Salary:</span>
                <p className="text-orange-300 text-xs">{job.salary || job.salaryRange}</p>
              </div>
            )}

            {job.location && (
              <div>
                <span className="text-gray-400 text-xs">Location:</span>
                <p className="text-orange-300 text-xs">{job.location}</p>
              </div>
            )}

            {job.insertedDate && (
              <div>
                <span className="text-gray-400 text-xs">Posted Date:</span>
                <p className="text-orange-300 text-xs">{formatDate(job.insertedDate)}</p>
              </div>
            )}

            {job.status && (
              <div>
                <span className="text-gray-400 text-xs">Status:</span>
                <p className={`text-xs capitalize ${job.status === 'active' ? 'text-green-300' : job.status === 'expired' ? 'text-red-300' : 'text-yellow-300'}`}>
                  {job.status}
                </p>
              </div>
            )}

            {(job.sourceLink || job.applyLink) && (
              <div className="md:col-span-2">
                <span className="text-gray-400 text-xs">Link:</span>
                <a 
                  href={job.sourceLink || job.applyLink} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="text-orange-400 hover:underline break-words block text-xs"
                >
                  {job.sourceLink || job.applyLink}
                </a>
              </div>
            )}
          </div>

          {/* Tags Section */}
          <div className="space-y-2 mb-4">
            {renderTags(job.techTags, "Tech Tags")}
            {renderTags(job.technologies, "Technologies")}
            {renderTags(job.requiredSkills, "Required Skills")}
            
            {job.screeningQuestions && job.screeningQuestions.length > 0 && (
              <div className="mb-2">
                <span className="text-gray-400 text-xs">Screening Questions:</span>
                <ul className="text-orange-300 text-xs mt-1 ml-4">
                  {job.screeningQuestions.map((question, index) => (
                    <li key={index} className="list-disc">{question}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Job Description */}
          <div className="space-y-2 md:space-y-3">            <div>
              <span className="text-gray-400 text-xs">Description:</span>
              <p className="text-white text-xs whitespace-pre-wrap mt-0.5">{job.description || job.jobDescription}</p>
            </div>

            {/* Additional deprecated fields that might still contain data */}
            {job.responsibilities && (
              <div>
                <span className="text-gray-400 text-xs">Responsibilities:</span>
                <p className="text-white text-xs whitespace-pre-wrap mt-0.5">{job.responsibilities}</p>
              </div>
            )}

            {job.idealCandidate && (
              <div>
                <span className="text-gray-400 text-xs">Ideal Candidate:</span>
                <p className="text-white text-xs whitespace-pre-wrap mt-0.5">{job.idealCandidate}</p>
              </div>
            )}
          </div>

          {/* Status Indicators */}
          <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-gray-700">
            {job.fromExternalSource && (
              <span className="px-2 py-1 rounded-full text-xs bg-gray-800 text-gray-300 border border-gray-600">
                External Source
              </span>
            )}
            {job.priorityListing && (
              <span className="px-2 py-1 rounded-full text-xs bg-yellow-900/50 text-yellow-300 border border-yellow-700">
                Priority Listed
              </span>
            )}
            {job.expiresAt && (
              <span className="px-2 py-1 rounded-full text-xs bg-red-900/50 text-red-300 border border-red-700">
                Expires: {formatDate(job.expiresAt.toDate ? job.expiresAt.toDate().toLocaleDateString() : job.expiresAt)}
              </span>
            )}
          </div>
        </div>
      )}
    </li>
  );
};

const JobsManager: React.FC<JobsManagerProps> = ({ activeSubTab, setActiveSubTab }) => {
  // Function to get current admin info for logging
  const getCurrentAdmin = () => {
    if (typeof window !== 'undefined') {
      const adminName = localStorage.getItem("userName") || "Unknown Admin";
      const adminId = localStorage.getItem("userId") || "unknown-id";
      return { adminName, adminId };
    }
    return { adminName: "Unknown Admin", adminId: "unknown-id" };
  };

  // Predefined feature options
  const predefinedFeatures = [
    "Featured in Job Listing",
    "1x Social Media Promotion",
    "2x Social Media Promotion",
    "4x Social Media Promotion",
    "Top Listed",
    "Highlighted in Newsletter"
  ];  // Jobs state
  const [jobs, setJobs] = useState<Job[]>([]);
  const [allJobs, setAllJobs] = useState<Job[]>([]); // Store all jobs for filtering
  const [searchTerm, setSearchTerm] = useState('');
  const [jobsLoading, setJobsLoading] = useState(false);
  const [jobsError, setJobsError] = useState<string | null>(null);
  const [disablingJobId, setDisablingJobId] = useState<string | null>(null);  const [newJob, setNewJob] = useState({
    title: "",
    companyName: "",
    description: "",
    requiredSkills: [] as string[],
    location: "",
    salaryRange: "",
    category: "",
    employmentType: "",
    experienceLevel: "",
    sourceLink: "",
    acceptsCryptoPay: false,
  });const [creatingJob, setCreatingJob] = useState(false);
  const [deletingJobId, setDeletingJobId] = useState<string | null>(null);

  // Job editing state
  const [editingJob, setEditingJob] = useState<Job | null>(null);
  const [isEditingJob, setIsEditingJob] = useState(false);
  const [updatingJobId, setUpdatingJobId] = useState<string | null>(null);

  // Job plans state
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

  // Fetch jobs when component mounts
  useEffect(() => {
    if (activeSubTab === "list") {
      fetchJobs();
    }
  }, [activeSubTab]);

  // Load plans when the 'prices' tab is selected
  useEffect(() => {
    if (activeSubTab === "prices") {
      fetchJobPlans();
    }
  }, [activeSubTab]);
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
      const querySnapshot = await getDocs(jobsCollection);      const jobsList = querySnapshot.docs.map((doc) => {
        // Transform document data into Job object - capture data as it is
        const data = doc.data();
        return {
          id: doc.id,
          title: data.title,
          jobTitle: data.jobTitle,
          companyName: data.companyName || data.company, // Check both fields
          description: data.description,
          jobDescription: data.jobDescription,
          requiredSkills: data.requiredSkills,
          location: data.location,
          salary: data.salary,
          salaryRange: data.salaryRange,
          sourceLink: data.sourceLink,
          applyLink: data.applyLink,
          category: data.category,
          jobType: data.jobType,
          experienceLevel: data.experienceLevel,
          techTags: data.techTags,
          technologies: data.technologies,
          insertedDate: data.insertedDate,
          isFeatured: data.isFeatured,
          priorityListing: data.priorityListing,
          acceptsCryptoPay: data.acceptsCryptoPay,
          responsibilities: data.responsibilities,
          idealCandidate: data.idealCandidate,
          screeningQuestions: data.screeningQuestions,
          disabled: data.disabled,
          TP: data.TP,
          status: data.status,
          expiresAt: data.expiresAt,
          fromExternalSource: data.fromExternalSource
        } as Job;
      });

      setJobs(jobsList);
      setAllJobs(jobsList); // Store all jobs for filtering
    } catch (error) {
      console.error("Error fetching jobs:", error);
      setJobsError("Failed to fetch jobs. Please check the console for more details.");
      setJobs([]);
    } finally {
      setJobsLoading(false);
    }
  };

  // Function to fetch job plans
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
      setJobPlans([]);
    } finally {
      setJobPlansLoading(false);
    }
  };

  // Refetch job plans after any change
  const refreshJobPlans = async () => {
    await fetchJobPlans();
  };
  // Handle job creation
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
      }      // Format the data for Firestore
      const jobData = {        title: newJob.title,
        companyName: newJob.companyName,
        company: newJob.companyName, // Ensure both fields are set for consistency
        description: newJob.description,
        requiredSkills: newJob.requiredSkills,
        location: newJob.location,
        salaryRange: newJob.salaryRange,
        category: newJob.category,
        employmentType: newJob.employmentType, // Employment Type (unified field)
        experienceLevel: newJob.experienceLevel,
        sourceLink: newJob.sourceLink,
        acceptsCryptoPay: newJob.acceptsCryptoPay, // Accepts Crypto Payment
        fromExternalSource: true, // Mark as created from the admin panel
        TP: true, // Team Post - automatically true for all admin-created jobs
        createdAt: new Date().toISOString(),
        insertedDate: new Date().toISOString(), // Add this to match existing schema
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // Set expiration date to 30 days from now
        disabled: false, // By default, jobs are enabled
      };
      
      const docRef = await addDoc(collection(db, "jobs"), jobData);      // Create job object with ID for local state update
      const newJobWithId = {
        id: docRef.id,
        ...newJob,
        disabled: false,
        TP: true, // Automatically true for all admin-created jobs
        acceptsCryptoPay: newJob.acceptsCryptoPay
      };
      
      // Add to all jobs
      const updatedAllJobs = [newJobWithId, ...allJobs];
      setAllJobs(updatedAllJobs);
      
      // Update filtered jobs if needed
      if (searchTerm) {
        if (
          newJobWithId.title?.toLowerCase().includes(searchTerm) || 
          newJobWithId.companyName?.toLowerCase().includes(searchTerm) ||
          newJobWithId.description?.toLowerCase().includes(searchTerm)
        ) {
          setJobs([newJobWithId, ...jobs]);
        }
      } else {
        setJobs(updatedAllJobs);
      }      // Reset form
      setNewJob({
        title: "",
        companyName: "",
        description: "",
        requiredSkills: [],
        location: "",
        salaryRange: "",
        category: "",
        employmentType: "",
        experienceLevel: "",
        sourceLink: "",
        acceptsCryptoPay: false      });

      // Log the job creation
      const { adminName, adminId } = getCurrentAdmin();
      await logAdminAction(
        adminId,
        adminName,
        "Criou um novo job",
        {
          jobId: docRef.id,
          jobTitle: newJob.title,
          companyName: newJob.companyName,
          category: newJob.category,
          location: newJob.location,
          sourceLink: newJob.sourceLink
        }
      );

      alert("Job created successfully!");
    } catch (error) {
      console.error("Error creating job:", error);
      alert("Failed to create job. Please check the console for details.");
    } finally {
      setCreatingJob(false);
    }
  };  // Handle job disable/enable toggle
  const handleToggleJobDisable = async (id: string) => {
    const job = allJobs.find(j => j.id === id);
    if (!job) return;
    
    const action = job.disabled ? "enable" : "disable";
    if (!window.confirm(`Are you sure you want to ${action} this job?`)) return;
    
    setDisablingJobId(id);
    try {
      if (!db) {
        console.error("Firestore is not initialized.");
        return;
      }
      
      // Update job status in Firestore
      await updateDoc(doc(db, "jobs", id), {
        disabled: !job.disabled
      });
        // Update local state
      const updatedAllJobs = allJobs.map(j => 
        j.id === id ? { ...j, disabled: !j.disabled } : j
      );
      setAllJobs(updatedAllJobs);
      
      // Update filtered jobs if we're searching
      if (searchTerm) {
        setJobs(updatedAllJobs.filter(job => 
          job.title?.toLowerCase().includes(searchTerm) || 
          job.companyName?.toLowerCase().includes(searchTerm) ||
          job.description?.toLowerCase().includes(searchTerm)
        ));
      } else {
        setJobs(updatedAllJobs);
      }
      
      // Log the disable/enable action
      const { adminName, adminId } = getCurrentAdmin();
      await logAdminAction(
        adminId,
        adminName,
        `${job.disabled ? "Habilitou" : "Desabilitou"} um job`,
        {
          jobId: id,
          jobTitle: job.title,
          companyName: job.companyName,
          previousState: job.disabled ? "disabled" : "enabled",
          newState: job.disabled ? "enabled" : "disabled"
        }
      );
      
      alert(`Job ${job.disabled ? "enabled" : "disabled"} successfully!`);
    } catch (error) {
      console.error(`Error ${action}ing job:`, error);
      alert(`Failed to ${action} job.`);
    } finally {
      setDisablingJobId(null);
    }
  };
  // Handle job deletion
  const handleDeleteJob = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this job?")) return;
    
    const jobToDelete = allJobs.find(j => j.id === id);
    
    setDeletingJobId(id);
    try {
      if (!db) {
        console.error("Firestore is not initialized.");
        return;
      }
      await deleteDoc(doc(db, "jobs", id));
      
      // Update both job lists after deletion
      const updatedJobs = allJobs.filter(job => job.id !== id);
      setAllJobs(updatedJobs);
      
      // If we're searching, maintain the filter
      if (searchTerm) {
        setJobs(updatedJobs.filter(job => 
          job.title?.toLowerCase().includes(searchTerm) || 
          job.companyName?.toLowerCase().includes(searchTerm) ||
          job.description?.toLowerCase().includes(searchTerm)
        ));
      } else {
        setJobs(updatedJobs);
      }
      
      // Log the deletion action
      const { adminName, adminId } = getCurrentAdmin();
      await logAdminAction(
        adminId,
        adminName,
        "Deletou um job",
        {
          jobId: id,
          jobTitle: jobToDelete?.title || "Unknown",
          companyName: jobToDelete?.companyName || "Unknown",
          category: jobToDelete?.category || "Unknown"
        }
      );
      
      alert("Job deleted successfully!");
    } catch (error) {
      console.error("Error deleting job:", error);
      alert("Failed to delete job.");
    } finally {
      setDeletingJobId(null);    }
  };

  // Handle job editing
  const handleEditJob = (job: Job) => {
    setEditingJob(job);
    setIsEditingJob(true);
  };

  // Handle saving edited job
  const handleSaveEditedJob = async () => {
    if (!editingJob) return;
    
    setUpdatingJobId(editingJob.id);
    try {
      if (!db) {
        console.error("Firestore is not initialized.");
        return;
      }
        await updateDoc(doc(db, "jobs", editingJob.id), {
        ...editingJob,
        company: editingJob.companyName // Ensure both fields are set for consistency
      });
        // Update both job lists after editing
      const updatedJobs = allJobs.map(job => 
        job.id === editingJob.id ? editingJob : job
      );
      setAllJobs(updatedJobs);
      
      // If we're searching, maintain the filter
      if (searchTerm) {
        setJobs(updatedJobs.filter(job => 
          job.title?.toLowerCase().includes(searchTerm) || 
          job.companyName?.toLowerCase().includes(searchTerm) ||
          job.description?.toLowerCase().includes(searchTerm)
        ));
      } else {
        setJobs(updatedJobs);
      }
      
      // Log the edit action
      const { adminName, adminId } = getCurrentAdmin();
      await logAdminAction(
        adminId,
        adminName,
        "Editou um job",
        {
          jobId: editingJob.id,
          jobTitle: editingJob.title,
          companyName: editingJob.companyName,
          category: editingJob.category
        }
      );
      
      setIsEditingJob(false);
      setEditingJob(null);
      alert("Job updated successfully!");
    } catch (error) {
      console.error("Error updating job:", error);
      alert("Failed to update job.");
    } finally {
      setUpdatingJobId(null);
    }
  };

  // Handle canceling job edit
  const handleCancelEditJob = () => {
    setIsEditingJob(false);
    setEditingJob(null);
  };

  // Handle toggling a feature
  const handleToggleFeature = (feature: string) => {
    if (isEditingPlan && selectedPlanForEdit) {
      const currentFeatures = selectedPlanForEdit.features;
      if (currentFeatures.includes(feature)) {
        // Remove feature if already selected
        setSelectedPlanForEdit({
          ...selectedPlanForEdit,
          features: currentFeatures.filter(f => f !== feature)
        });
      } else {
        // Add feature if not already selected
        setSelectedPlanForEdit({
          ...selectedPlanForEdit,
          features: [...currentFeatures, feature]
        });
      }
    } else {
      const currentFeatures = newJobPlan.features;
      if (currentFeatures.includes(feature)) {
        // Remove feature if already selected
        setNewJobPlan({
          ...newJobPlan,
          features: currentFeatures.filter(f => f !== feature)
        });
      } else {
        // Add feature if not already selected
        setNewJobPlan({
          ...newJobPlan,
          features: [...currentFeatures, feature]
        });
      }
    }
  };

  // Handle form input changes for job plan
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

  // Handle job plan creation
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
        isTopListed: false      });
      await refreshJobPlans();
      
      // Log the job plan creation
      const { adminName, adminId } = getCurrentAdmin();
      await logAdminAction(
        adminId,
        adminName,
        "Criou um novo plano de job",
        {
          planName: newJobPlan.name,
          price: newJobPlan.price,
          duration: newJobPlan.duration,
          features: newJobPlan.features
        }
      );
      
      alert("Job plan created successfully!");
    } catch (error) {
      console.error("Error creating job plan:", error);
      alert("Failed to create job plan. Please check the console for details.");
    }
  };

  // Handle job plan update
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
      await updateDoc(doc(db, "jobPlans", id), updateData);      setSelectedPlanForEdit(null);
      setIsEditingPlan(false);
      await refreshJobPlans();
      
      // Log the job plan update
      const { adminName, adminId } = getCurrentAdmin();
      await logAdminAction(
        adminId,
        adminName,
        "Atualizou um plano de job",
        {
          planId: selectedPlanForEdit.id,
          planName: selectedPlanForEdit.name,
          price: selectedPlanForEdit.price,
          duration: selectedPlanForEdit.duration
        }
      );
      
      alert("Job plan updated successfully!");
    } catch (error) {
      console.error("Error updating job plan:", error);
      alert("Failed to update job plan. Please check the console for details.");
    }
  };
  // Handle job plan deletion
  const handleDeleteJobPlan = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this job plan?")) return;
    
    const planToDelete = jobPlans.find(p => p.id === id);
    
    try {
      if (!db) throw new Error("Firestore is not initialized.");
      await deleteDoc(doc(db, "jobPlans", id));
      await refreshJobPlans();
      
      // Log the job plan deletion
      const { adminName, adminId } = getCurrentAdmin();
      await logAdminAction(
        adminId,
        adminName,
        "Deletou um plano de job",
        {
          planId: id,
          planName: planToDelete?.name || "Unknown",
          price: planToDelete?.price || 0
        }
      );
      
      alert("Job plan deleted successfully!");
    } catch (error) {
      console.error("Error deleting job plan:", error);
      alert("Failed to delete job plan.");
    }
  };

  // Handle job plan edit
  const handleEditPlan = (plan: JobPlan) => {
    setSelectedPlanForEdit(plan);
    setIsEditingPlan(true);
  };

  // Handle cancel editing job plan
  const handleCancelEdit = () => {
    setSelectedPlanForEdit(null);
    setIsEditingPlan(false);
  };

  // Determine if the screen is mobile
  const isMobile = typeof window !== 'undefined' ? window.innerWidth < 768 : false;
  return (
    <div>
      <h2 className={`font-bold ${isMobile ? 'text-2xl text-center mb-4' : 'text-3xl mb-6 text-left'} text-orange-500`}>Manage Jobs</h2>      {activeSubTab === "list" && (
        <div className="mt-6 bg-black/30 p-4 md:p-6 rounded-xl mb-6 md:mb-10 border border-gray-700">
          <h3 className="text-lg md:text-xl font-bold text-orange-400 mb-4 md:mb-6">Jobs List</h3>
          
          {/* Search bar */}
          <div className="mb-4 md:mb-6">
            <div className="relative">
              <input
                type="text"
                value={searchTerm}
                placeholder="Search jobs by title, company or description..."
                className="w-full px-3 py-2 bg-black/40 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-orange-400 focus:outline-none"
                onChange={(e) => {
                  const value = e.target.value.toLowerCase();
                  setSearchTerm(value);
                  
                  if (value === '') {
                    setJobs(allJobs); // Reset to all jobs when search is cleared
                  } else {
                    // Filter jobs based on search term
                    const filtered = allJobs.filter(job => 
                      job.title?.toLowerCase().includes(value) || 
                      job.companyName?.toLowerCase().includes(value) ||
                      job.description?.toLowerCase().includes(value)
                    );
                    setJobs(filtered);
                  }
                }}
              />
              <div className="absolute right-3 top-2.5 text-gray-400">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>
          </div>
          
          {jobsLoading && <div className="flex justify-center py-8">
            <div className="w-10 h-10 border-4 border-orange-500 rounded-full animate-spin border-t-transparent"></div>
          </div>}
          
          {jobsError && (
            <div className="bg-red-900/50 border border-red-500 text-white p-3 md:p-4 rounded-lg mb-4 md:mb-6 text-sm">
              {jobsError}
            </div>
          )}
            <div className="max-h-[calc(100vh-300px)] overflow-y-auto">
            <ul className="space-y-2">
              {jobs.map((job) => (                <JobListItem 
                  key={job.id} 
                  job={job} 
                  onDelete={() => handleDeleteJob(job.id)}
                  isDeleting={deletingJobId === job.id}
                  onToggleDisable={() => handleToggleJobDisable(job.id)}
                  isDisabling={disablingJobId === job.id}
                  onEdit={() => handleEditJob(job)}
                />
              ))}
              {jobs.length === 0 && !jobsLoading && !jobsError && (
                <li>
                  <div className="bg-black/40 p-8 rounded-lg text-center">
                    <p className="text-gray-400">No jobs found.</p>
                  </div>
                </li>
              )}
            </ul>
          </div>
        </div>
      )}      {activeSubTab === "create" && (
        <div className="mt-6 bg-black/30 p-4 md:p-6 rounded-xl mb-6 md:mb-10 border border-gray-700">
          <h3 className="text-lg md:text-xl font-bold text-orange-400 mb-4 md:mb-6">Create Job</h3>
          <form onSubmit={handleCreateJob} className="space-y-4 md:space-y-6">
            {/* --- Job Basic Info --- */}
            <div>
              <label htmlFor="jobTitle" className="block text-sm font-semibold text-gray-300 mb-1">Job Title *</label>
              <input 
                id="jobTitle"
                type="text" 
                name="title" 
                value={newJob.title} 
                onChange={(e) => setNewJob({ ...newJob, title: e.target.value })} 
                placeholder="Job Title" 
                className="w-full px-3 py-2 bg-black/40 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-orange-400 focus:outline-none" 
                required 
              />
            </div>
            
            <div>
              <label htmlFor="companyName" className="block text-sm font-semibold text-gray-300 mb-1">Company Name *</label>
              <input 
                id="companyName"
                type="text" 
                name="companyName" 
                placeholder="Company Name" 
                value={newJob.companyName} 
                onChange={(e) => setNewJob({ ...newJob, companyName: e.target.value })} 
                className="w-full px-3 py-2 bg-black/40 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-orange-400 focus:outline-none" 
                required 
              />
            </div>
            
            <div>
              <label htmlFor="jobCategory" className="block text-sm font-semibold text-gray-300 mb-1">Job Category</label>              <select
                id="jobCategory"
                name="category"
                value={newJob.category}
                onChange={(e) => setNewJob({ ...newJob, category: e.target.value })}
                className="w-full px-3 py-2 bg-black/40 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-orange-400 focus:outline-none"
              >
                <option value="">Select Category</option>
                {JOB_CATEGORIES_DROPDOWN.map((category) => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </div>            <div>
              <label htmlFor="jobDescription" className="block text-sm font-semibold text-gray-300 mb-1">Job Description *</label>
              <textarea 
                id="jobDescription"
                name="description" 
                value={newJob.description} 
                onChange={(e) => setNewJob({ ...newJob, description: e.target.value })} 
                placeholder="Enter a complete job description including responsibilities, requirements, ideal candidate profile, benefits, and all relevant details" 
                className="w-full px-3 py-2 bg-black/40 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-orange-400 focus:outline-none" 
                required 
                rows={15} 
              />
              <p className="text-xs text-gray-400 mt-1">Include all job details: position description, responsibilities, requirements, ideal candidate profile, benefits, and technical requirements.</p>
            </div>              {/* Required Skills Section */}
            <div>
              <SkillTagsInput                value={newJob.requiredSkills}
                onChange={(skills) => setNewJob({ ...newJob, requiredSkills: skills })}
                suggestions={['Full Time','Web3','Non Technical','NFT','Marketing','DeFi','Internships','Entry Level','Trading','Zero Knowledge','Human Resources','C++','Full-stack Developer','Developer Relations','iOS','Android Developer','Node.js','SEO','AI']}
                placeholder="Enter skills separated by commas or press Enter"
                label="Required Skills & Tags"
                className="mb-4"
              />
            </div>              {/* Job Details */}            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label htmlFor="jobLocation" className="block text-sm font-semibold text-gray-300 mb-1">Job Location</label>
                <input 
                  id="jobLocation"
                  type="text"
                  name="location" 
                  value={newJob.location} 
                  onChange={(e) => setNewJob({ ...newJob, location: e.target.value })} 
                  placeholder="Leave blank if 100% Remote" 
                  className="w-full px-3 py-2 bg-black/40 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-orange-400 focus:outline-none" 
                />
              </div>
              
              <div>
                <label htmlFor="employmentType" className="block text-sm font-semibold text-gray-300 mb-1">Employment Type</label>
                <select
                  id="employmentType"
                  name="employmentType"
                  value={newJob.employmentType}
                  onChange={(e) => setNewJob({ ...newJob, employmentType: e.target.value })}
                  className="w-full px-3 py-2 bg-black/40 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-orange-400 focus:outline-none"
                >
                  <option value="">Select Employment Type</option>
                  <option value="Full-Time">Full-Time</option>
                  <option value="Part-Time">Part-Time</option>
                  <option value="Contract">Contract</option>
                  <option value="Freelance">Freelance</option>
                  <option value="Internship">Internship</option>
                </select>
              </div>
              
              <div>
                <label htmlFor="experienceLevel" className="block text-sm font-semibold text-gray-300 mb-1">Experience Level</label>
                <select
                  id="experienceLevel"
                  name="experienceLevel"
                  value={newJob.experienceLevel}
                  onChange={(e) => setNewJob({ ...newJob, experienceLevel: e.target.value })}
                  className="w-full px-3 py-2 bg-black/40 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-orange-400 focus:outline-none"
                >
                  <option value="">Select Experience Level</option>
                  <option value="Junior">Junior</option>
                  <option value="Mid-Level">Mid-Level</option>
                  <option value="Senior">Senior</option>
                  <option value="Lead">Lead</option>
                </select>
              </div>
            </div>              <div>
              <label htmlFor="salaryRange" className="block text-sm font-semibold text-gray-300 mb-1">Salary Range</label>
              <input 
                id="salaryRange"
                type="text" 
                name="salaryRange" 
                value={newJob.salaryRange} 
                onChange={(e) => setNewJob({ ...newJob, salaryRange: e.target.value })} 
                placeholder="e.g. $60,000-$90,000/year" 
                className="w-full px-3 py-2 bg-black/40 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-orange-400 focus:outline-none" 
              />
            </div>{/* Crypto Payment */}
            <div>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={newJob.acceptsCryptoPay || false}
                  onChange={(e) => setNewJob({ ...newJob, acceptsCryptoPay: e.target.checked })}
                  className="h-4 w-4 accent-orange-500"
                />
                <span className="text-gray-300">Crypto Payment</span>
              </label>
              <p className="text-xs text-gray-400 mt-1">This company can pay salaries and compensation in cryptocurrency.</p>
            </div>
            
            {/* Application Methods */}{/* Removed Application Link and Contact Email fields as requested */}
              <div>
              <label htmlFor="sourceLink" className="block text-sm font-semibold text-gray-300 mb-1">Source Link (Admin Only) *</label>
              <input 
                id="sourceLink"
                type="text" 
                name="sourceLink" 
                value={newJob.sourceLink} 
                onChange={(e) => setNewJob({ ...newJob, sourceLink: e.target.value })} 
                placeholder="Original job posting URL" 
                className="w-full px-3 py-2 bg-black/40 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-orange-400 focus:outline-none"
                required 
              />
              <p className="text-xs text-gray-400 mt-1">This is only for admin reference and not shown to users.</p>
            </div>
            
            <div className="pt-4">
              <button
                type="submit"
                disabled={creatingJob}
                className="w-full bg-orange-500 text-white px-4 py-2 rounded-lg hover:bg-orange-600 disabled:opacity-60 font-semibold shadow text-sm"
              >
                {creatingJob ? "Creating..." : "Create Job"}
              </button>
            </div>
          </form>
        </div>
      )}      {activeSubTab === "prices" && (
        <div className="mt-6 bg-black/30 p-4 md:p-6 rounded-xl mb-6 md:mb-10 border border-gray-700">
          <h3 className="text-lg md:text-xl font-bold text-orange-400 mb-4 md:mb-6">Job Post Pricing Plans</h3>
          {jobPlansLoading && (
            <div className="flex justify-center py-8">
              <div className="w-10 h-10 border-4 border-orange-500 rounded-full animate-spin border-t-transparent"></div>
            </div>
          )}
          {jobPlansError && (
            <div className="bg-red-900/50 border border-red-500 text-white p-3 md:p-4 rounded-lg mb-4 md:mb-6 text-sm">
              {jobPlansError}
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">            {jobPlans.map((plan) => (
              <div key={plan.id} className="bg-black/30 p-4 md:p-6 rounded-xl border border-gray-700 hover:border-orange-500 transition-colors">
                <div className="flex justify-between items-start mb-2">
                  <h4 className="text-sm md:text-base font-bold text-orange-400">{plan.name}</h4>
                  <span className="text-lg md:text-xl font-bold text-white">{plan.price} USDT</span>
                </div>
                <p className="text-gray-300 mb-3 text-sm break-words">{plan.description}</p>
                {plan.features.length > 0 && (
                  <div className="mb-4">
                    <p className="text-sm font-medium text-gray-300 mb-1">Features:</p>
                    <ul className="list-disc pl-5 text-sm text-gray-400">
                      {plan.features.map((feature, index) => (
                        <li key={index}>{feature}</li>
                      ))}
                    </ul>
                  </div>
                )}
                <div className="flex gap-2 mb-2">
                  {plan.isPremium && (
                    <span className="px-1.5 md:px-2 py-0.5 rounded-full text-xs bg-yellow-900/50 text-yellow-300 border border-yellow-700">
                      Premium
                    </span>
                  )}
                  {plan.isTopListed && (
                    <span className="px-1.5 md:px-2 py-0.5 rounded-full text-xs bg-green-900/50 text-green-300 border border-green-700">
                      Top Listed
                    </span>
                  )}
                </div>
                <p className="text-gray-400 text-xs mb-3">Duration: {plan.duration} days</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEditPlan(plan)}
                    className="bg-orange-500 text-white px-2 md:px-3 py-1.5 rounded-md text-xs font-semibold flex-1"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDeleteJobPlan(plan.id)}
                    className="bg-red-600 hover:bg-red-700 text-white px-2 md:px-3 py-1.5 rounded-md text-xs font-semibold flex-1"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}            {jobPlans.length < 5 && (
              <div 
                className="bg-black/20 p-4 md:p-6 rounded-xl border border-dashed border-gray-600 hover:border-orange-500 transition-all flex flex-col items-center justify-center cursor-pointer"
                onClick={() => setIsEditingPlan(true)}
              >
                <div className="w-12 h-12 rounded-full bg-black/40 flex items-center justify-center mb-2">
                  <span className="text-2xl font-bold text-orange-400">+</span>
                </div>
                <span className="text-gray-300 text-sm">Add New Plan</span>
              </div>
            )}
          </div>          {/* Form for creating or editing plans */}
          {isEditingPlan && (
            <div className="bg-black/30 p-4 md:p-6 rounded-xl border border-gray-700 mb-6 md:mb-10">
              <h3 className="text-lg md:text-xl font-bold text-orange-400 mb-4 md:mb-6">
                {selectedPlanForEdit ? `Edit Plan: ${selectedPlanForEdit.name}` : "Create New Plan"}
              </h3>
              <form onSubmit={selectedPlanForEdit ? handleUpdateJobPlan : handleCreateJobPlan} className="space-y-4 md:space-y-6">
                <div>
                  <label htmlFor="planName" className="block text-sm font-semibold text-gray-300 mb-1">Plan Name</label>
                  <input
                    id="planName"
                    type="text"
                    name="name"
                    value={selectedPlanForEdit ? selectedPlanForEdit.name : newJobPlan.name}
                    onChange={handleJobPlanInputChange}
                    placeholder="Basic Plan, Premium Plan, etc."
                    className="w-full px-3 py-2 bg-black/40 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-orange-400 focus:outline-none"
                    required
                  />
                </div>                <div>
                  <label htmlFor="planPrice" className="block text-sm font-semibold text-gray-300 mb-1">Price</label>
                  <div className="flex">
                    <input
                      id="planPrice"
                      type="number"
                      name="price"
                      value={selectedPlanForEdit ? selectedPlanForEdit.price : newJobPlan.price}
                      onChange={handleJobPlanInputChange}
                      placeholder="70"
                      className="w-full px-3 py-2 bg-black/40 border border-gray-600 rounded-l-lg text-white focus:ring-2 focus:ring-orange-400 focus:outline-none"
                      required
                      min="0"
                      step="any"
                    />
                    <select
                      name="currency"
                      value={selectedPlanForEdit ? selectedPlanForEdit.currency : newJobPlan.currency}
                      onChange={handleJobPlanInputChange}
                      className="border border-gray-600 border-l-0 rounded-r-lg px-3 py-2 bg-black/40 text-white"
                      disabled
                    >
                      <option value="USDT">USDT</option>
                    </select>
                  </div>
                </div>                <div>
                  <label htmlFor="planDescription" className="block text-sm font-semibold text-gray-300 mb-1">Description</label>
                  <textarea
                    id="planDescription"
                    name="description"
                    value={selectedPlanForEdit ? selectedPlanForEdit.description : newJobPlan.description}
                    onChange={handleJobPlanInputChange}
                    placeholder="Short description of what this plan includes"
                    className="w-full px-3 py-2 bg-black/40 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-orange-400 focus:outline-none"
                    rows={3}
                    required
                  />
                </div>
                <div>
                  <label htmlFor="planDuration" className="block text-sm font-semibold text-gray-300 mb-1">Duration (days)</label>
                  <input
                    id="planDuration"
                    type="number"
                    name="duration"
                    value={selectedPlanForEdit ? selectedPlanForEdit.duration : newJobPlan.duration}
                    onChange={handleJobPlanInputChange}
                    placeholder="30"
                    className="w-full px-3 py-2 bg-black/40 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-orange-400 focus:outline-none"
                    required
                    min="1"
                  />
                </div>                <div>
                  <label className="block text-sm font-semibold text-gray-300 mb-1">Features</label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {predefinedFeatures.map((feature) => (
                      <div key={feature} className="flex items-center">
                        <input
                          type="checkbox"
                          id={`feature-${feature.replace(/\s+/g, '-').toLowerCase()}`}
                          checked={
                            isEditingPlan && selectedPlanForEdit
                              ? selectedPlanForEdit.features.includes(feature)
                              : newJobPlan.features.includes(feature)
                          }
                          onChange={() => handleToggleFeature(feature)}
                          className="mr-2 h-5 w-5 accent-orange-500"
                        />
                        <label htmlFor={`feature-${feature.replace(/\s+/g, '-').toLowerCase()}`} className="text-gray-300 text-sm font-medium">
                          {feature}
                        </label>
                      </div>
                    ))}
                  </div>                  {(isEditingPlan && selectedPlanForEdit && selectedPlanForEdit.features.length > 0) || (!isEditingPlan && newJobPlan.features.length > 0) ? (
                    <div className="mt-3">
                      <p className="text-sm font-semibold text-gray-300 mb-1">Selected Features:</p>
                      <ul className="list-disc pl-5 text-sm text-orange-400">
                        {(isEditingPlan && selectedPlanForEdit 
                          ? selectedPlanForEdit.features 
                          : newJobPlan.features).map((feature, index) => (
                          <li key={index}>{feature}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </div>
                <div className="flex justify-end gap-2 pt-4">
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    className="bg-gray-800 hover:bg-gray-700 text-gray-100 px-3 py-1.5 rounded-md text-xs font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="bg-orange-500 text-white px-4 py-2 rounded-lg hover:bg-orange-600 disabled:opacity-60 font-semibold shadow text-sm"
                  >
                    {selectedPlanForEdit ? "Update Plan" : "Create Plan"}
                  </button>
                </div>
              </form>
            </div>
          )}          {/* Help information */}
          {!isEditingPlan && (
            <div className="bg-black/30 p-4 md:p-6 rounded-xl border border-gray-700 mb-6 md:mb-10">
              <h3 className="text-base md:text-lg font-bold text-orange-400 mb-4">Job Posting Plans Information</h3>
              <p className="text-gray-300 text-sm mb-4">
                These plans will be offered to employers when they want to post a new job.
              </p>
              <ul className="list-disc pl-5 text-sm text-gray-400 space-y-2">
                <li>Set different pricing tiers based on features and duration</li>
                <li>Mark premium plans to highlight them to users</li>
                <li>Use "Top Listed" for plans that place jobs at the top of search results</li>
              </ul>
            </div>          )}
        </div>
      )}      {/* Job Edit Modal */}
      {isEditingJob && editingJob && (
        <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-br from-orange-950/80 via-black to-orange-900/60 rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto border border-orange-500/50 shadow-2xl backdrop-blur-sm">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-orange-400">Edit Job</h3>
              <button
                onClick={handleCancelEditJob}
                className="text-gray-400 hover:text-white p-2"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Basic Information */}
              <div className="space-y-4">
                <h4 className="text-lg font-semibold text-orange-300">Basic Information</h4>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Job Title</label>                  <input
                    type="text"
                    value={editingJob.title || editingJob.jobTitle || ''}
                    onChange={(e) => setEditingJob({...editingJob, title: e.target.value, jobTitle: e.target.value})}
                    className="w-full px-3 py-2 bg-black/70 border border-orange-600/50 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-orange-400"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Company Name</label>                  <input
                    type="text"
                    value={editingJob.companyName || ''}
                    onChange={(e) => setEditingJob({...editingJob, companyName: e.target.value})}
                    className="w-full px-3 py-2 bg-black/70 border border-orange-600/50 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-orange-400"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Category</label>                  <select
                    value={editingJob.category || ''}
                    onChange={(e) => setEditingJob({...editingJob, category: e.target.value})}
                    className="w-full px-3 py-2 bg-black/70 border border-orange-600/50 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-orange-400"
                  >
                    <option value="">Select Category</option>
                    {JOB_CATEGORIES_DROPDOWN.map((category) => (
                      <option key={category} value={category}>{category}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Job Type</label>                  <select
                    value={editingJob.jobType || ''}
                    onChange={(e) => setEditingJob({...editingJob, jobType: e.target.value})}
                    className="w-full px-3 py-2 bg-black/70 border border-orange-600/50 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-orange-400"
                  >
                    <option value="">Select Type</option>
                    <option value="Full-time">Full-time</option>
                    <option value="Part-time">Part-time</option>
                    <option value="Contract">Contract</option>
                    <option value="Freelance">Freelance</option>
                    <option value="Internship">Internship</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Experience Level</label>                  <select
                    value={editingJob.experienceLevel || ''}
                    onChange={(e) => setEditingJob({...editingJob, experienceLevel: e.target.value})}
                    className="w-full px-3 py-2 bg-black/70 border border-orange-600/50 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-orange-400"
                  >
                    <option value="">Select Level</option>
                    <option value="Junior">Junior</option>
                    <option value="Mid">Mid</option>
                    <option value="Senior">Senior</option>
                    <option value="Lead">Lead</option>
                    <option value="Executive">Executive</option>
                  </select>
                </div>
              </div>

              {/* Additional Information */}
              <div className="space-y-4">
                <h4 className="text-lg font-semibold text-orange-300">Additional Information</h4>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Location</label>                  <input
                    type="text"
                    value={editingJob.location || ''}
                    onChange={(e) => setEditingJob({...editingJob, location: e.target.value})}
                    className="w-full px-3 py-2 bg-black/70 border border-orange-600/50 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-orange-400"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Salary Range</label>                  <input
                    type="text"
                    value={editingJob.salaryRange || editingJob.salary || ''}
                    onChange={(e) => setEditingJob({...editingJob, salaryRange: e.target.value, salary: e.target.value})}
                    className="w-full px-3 py-2 bg-black/70 border border-orange-600/50 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-orange-400"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Apply Link / Source Link</label>                  <input
                    type="url"
                    value={editingJob.applyLink || editingJob.sourceLink || ''}
                    onChange={(e) => setEditingJob({...editingJob, applyLink: e.target.value, sourceLink: e.target.value})}
                    className="w-full px-3 py-2 bg-black/70 border border-orange-600/50 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-orange-400"
                  />
                </div>                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Required Skills / Tech Tags</label>                  <input
                    type="text"
                    value={Array.isArray(editingJob.requiredSkills) ? editingJob.requiredSkills.join(', ') : editingJob.requiredSkills || ''}
                    onChange={(e) => {
                      const skills = e.target.value;
                      const skillsArray = skills.split(',').map(tag => tag.trim()).filter(tag => tag);
                      setEditingJob({
                        ...editingJob, 
                        requiredSkills: skills,
                        techTags: skillsArray
                      });
                    }}
                    className="w-full px-3 py-2 bg-black/70 border border-orange-600/50 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-orange-400"
                    placeholder="React, Node.js, Solidity, etc."                  />                </div>

                <div>
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={editingJob.acceptsCryptoPay || false}
                      onChange={(e) => setEditingJob({...editingJob, acceptsCryptoPay: e.target.checked})}
                      className="h-4 w-4 accent-orange-500"
                    />
                    <span className="text-gray-300">Crypto Payment</span>
                  </label>
                  <p className="text-xs text-gray-400 mt-1">This company can pay salaries and compensation in cryptocurrency.</p>
                </div>
              </div>
            </div>

            {/* Job Description */}
            <div className="mt-6 space-y-4">
              <h4 className="text-lg font-semibold text-orange-300">Job Description</h4>              <textarea
                value={editingJob.description || editingJob.jobDescription || ''}
                onChange={(e) => setEditingJob({...editingJob, description: e.target.value, jobDescription: e.target.value})}
                rows={8}
                className="w-full px-3 py-2 bg-black/70 border border-orange-600/50 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-orange-400"
                placeholder="Describe the job position, requirements, and responsibilities..."
              />
            </div>

            {/* Action Buttons */}            <div className="flex justify-end space-x-4 mt-6">
              <button
                onClick={handleCancelEditJob}
                className="px-6 py-2 bg-gray-800/80 hover:bg-gray-700 text-white rounded-md transition-colors border border-gray-600"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEditedJob}
                disabled={updatingJobId === editingJob.id}
                className="px-6 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-md transition-colors disabled:opacity-50 shadow-lg"
              >
                {updatingJobId === editingJob.id ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default JobsManager;
