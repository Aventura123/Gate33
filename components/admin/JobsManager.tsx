import React, { useState, useEffect } from "react";
import { collection, addDoc, deleteDoc, doc, getDocs, updateDoc } from "firebase/firestore";
import { db } from "../../lib/firebase";

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
  companyName: string;
  description: string;
  location?: string;
  salary?: string;
  sourceLink: string;
}

interface JobsManagerProps {
  activeSubTab: string;
  setActiveSubTab: (subTab: string) => void;
}

const JobsManager: React.FC<JobsManagerProps> = ({ activeSubTab, setActiveSubTab }) => {
  // Predefined feature options
  const predefinedFeatures = [
    "Featured in Job Listing",
    "1x Social Media Promotion",
    "2x Social Media Promotion",
    "4x Social Media Promotion",
    "Top Listed",
    "Highlighted in Newsletter"
  ];

  // Jobs state
  const [jobs, setJobs] = useState<Job[]>([]);
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
      const querySnapshot = await getDocs(jobsCollection);

      const jobsList = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Job[];

      setJobs(jobsList);
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

  // Handle job deletion
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
        isTopListed: false
      });
      await refreshJobPlans();
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

  // Handle job plan deletion
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
      <h2 className={`font-bold ${isMobile ? 'text-2xl text-center mb-4' : 'text-3xl mb-6 text-left'} text-orange-500`}>Manage Jobs</h2>

      {activeSubTab === "list" && (
        <div className="mt-6 bg-black/50 p-6 rounded-lg">
          <h3 className="text-xl text-orange-400 mb-4">Jobs List</h3>
          {jobsLoading && <p className="text-gray-400">Loading jobs...</p>}
          {jobsError && <p className="text-red-400">{jobsError}</p>}
          <div className="max-h-80 overflow-y-auto">
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
                    <span className="bg-yellow-500/20 text-yellow-300 text-xs px-2 py-1 rounded-full">Premium</span>
                  )}
                  {plan.isTopListed && (
                    <span className="bg-green-500/20 text-green-300 text-xs px-2 py-1 rounded-full">Top Listed</span>
                  )}
                </div>
                <p className="text-gray-400 text-xs mb-3">Duration: {plan.duration} days</p>
                <div className="flex gap-2">
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
                  <span className="text-2xl font-bold text-orange-400">+</span>
                </div>
                <span className="text-gray-300">Add New Plan</span>
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
                </div>                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Features</label>
                  <div className="grid grid-cols-2 gap-2">
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
                          className="mr-2 h-4 w-4"
                        />
                        <label htmlFor={`feature-${feature.replace(/\s+/g, '-').toLowerCase()}`} className="text-gray-300">
                          {feature}
                        </label>
                      </div>
                    ))}
                  </div>
                  {(isEditingPlan && selectedPlanForEdit && selectedPlanForEdit.features.length > 0) || (!isEditingPlan && newJobPlan.features.length > 0) ? (
                    <div className="mt-3">
                      <p className="text-sm font-medium text-gray-300 mb-1">Selected Features:</p>
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
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default JobsManager;
