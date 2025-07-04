"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import Layout from "@/components/Layout";
import { collection, getDocs, doc, updateDoc } from "firebase/firestore";
import { db } from "../../lib/firebase";

// Defining the types
interface Job {
  id: string;
  jobTitle: string;
  companyName: string;
  requiredSkills: string;
  jobDescription: string;
  applyLink: string;
  category: string;
  insertedDate: string;
  location: string;
  jobType: string; // Full-time, Part-time, etc.
  salaryRange: string;
  isFeatured: boolean;  priorityListing?: boolean; // Top Listed jobs
  acceptsCryptoPay: boolean;
  experienceLevel: string; // Junior, Mid, Senior
  techTags?: string[]; // Array of specific technology tags
  technologies?: string | string[]; // Technologies field (can be string or array)
  responsibilities?: string; // Job responsibilities - DEPRECATED: content moved to jobDescription
  idealCandidate?: string; // Ideal candidate profile - DEPRECATED: content moved to jobDescription
  screeningQuestions?: string[]; // Screening questions
  disabled?: boolean; // Whether the job is disabled and shouldn't be shown publicly
  TP?: boolean; // True Posting - posted by team
  status?: 'active' | 'inactive' | 'expired'; // Job status
  expiresAt?: any; // Job expiration date (Firestore Timestamp or Date)
  fromExternalSource?: boolean; // Whether the job is from external source
  sourceLink?: string; // External source link for external jobs
}

// Array of categories for the filter
const JOB_CATEGORIES = [
  "All",
  "Engineering",
  "Marketing",
  "Design",
  "Operations",
  "Sales",
  "Product",
  "Finance",
  "DeFi",
  "Web3",
  "Non-Tech",
  "Other"
];

// Array of common web3/blockchain technologies
const TECH_TAGS = [
  "Solidity",
  "Rust",
  "Web3.js",
  "Ethers.js",
  "React",
  "Next.js",
  "TypeScript",
  "Smart Contracts",
  "DeFi",
  "NFT",
  "DAO",
  "Layer 2",
  "Ethereum",
  "Solana",
  "Polkadot",
  "NEAR",
  "Cosmos",
  "Zero Knowledge",
  "Polygon",
  "Arbitrum",
  "Optimism",
  "Blockchain",
  "Cryptography",
  "Consensus",
  "zkEVM",
  "Rollups",
  "IPFS",
  "Filecoin",
  "Chainlink",
  "The Graph",
  "Python",
  "Go",
  "Node.js",
  "Move",
  "Substrate",
  "Hardhat",
  "Truffle",
  "Foundry",
  "MetaMask",
  "WalletConnect"
];

// Array of job types
const JOB_TYPES = [
  "All Types",
  "Full-Time",
  "Part-Time",
  "Contract",
  "Freelance"
];

// Array of experience levels
const EXPERIENCE_LEVELS = [
  "All Levels",
  "Junior",
  "Mid-Level",
  "Senior",
  "Lead"
];

// Hook to detect if it's mobile
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 640);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);
  return isMobile;
}

export default function JobsPage() {
  const router = useRouter();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [locationQuery, setLocationQuery] = useState("");
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const isMobile = useIsMobile();
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const jobsPerPage = 20;
  
  // New states for additional filters
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedJobType, setSelectedJobType] = useState("All Types");
  const [selectedExperienceLevel, setSelectedExperienceLevel] = useState("All Levels");
  const [showCryptoPayOnly, setShowCryptoPayOnly] = useState(false);
  const [showFeaturedOnly, setShowFeaturedOnly] = useState(false);
  
  // State for technology tags filter
  const [selectedTechTags, setSelectedTechTags] = useState<string[]>([]);
  const [showTechTagsFilter, setShowTechTagsFilter] = useState(false);
  // Function to extract technology tags from skills (handles both string or array)
  const extractTechTags = (skills: string | string[]): string[] => {
    if (!skills) return [];
    
    // Convert to array if it's a string
    const skillsArray = Array.isArray(skills) 
      ? skills 
      : skills.split(',').map(skill => skill.trim());
    
    return TECH_TAGS.filter(tag => 
      skillsArray.some(skill => 
        typeof skill === 'string' && (
          skill.toLowerCase().includes(tag.toLowerCase()) || 
          tag.toLowerCase().includes(skill.toLowerCase())
        )
      )
    );
  };

  // Calculate time elapsed since posting
  const getTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "1d";
    return `${diffDays}d`;
  };

  // Get the selected job details
  const selectedJob = jobs.find(job => job.id === selectedJobId);    // Function to handle job application
  const handleApplyClick = (job: Job) => {
    // If job is from external source, redirect to sourceLink
    if (job.fromExternalSource && job.sourceLink) {
      window.open(job.sourceLink, '_blank');
      return;
    }
    
    // If it's not from external source, redirect to internal apply page
    if (!job.fromExternalSource) {
      router.push(`/jobs/apply/${job.id}`);
      return;
    }
    
    // Fallback: if it's a True Posting (TP - posted by team), use applyLink
    if (job.TP && job.applyLink) {
      window.open(job.applyLink, '_blank');
      return;
    }
    
    // Secondary fallback: if there's an applyLink, use it
    if (job.applyLink && job.applyLink.trim() !== '') {
      window.open(job.applyLink, '_blank');
      return;
    }
    
    // Final fallback: redirect to internal apply page
    router.push(`/jobs/apply/${job.id}`);
  };

  // Component for job details panel
  const JobDetailsPanel = ({ job, hideCloseButton, onClose, isMobileModal }: { job: Job, hideCloseButton?: boolean, onClose?: () => void, isMobileModal?: boolean }) => (
    <div className={`bg-black/70 rounded-lg border border-orange-500/30 shadow-lg ${isMobileModal ? 'p-4 sm:p-6 h-auto' : 'p-6 h-fit sticky top-4'}`}>
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <h2 className={`font-bold text-orange-400 ${isMobileModal ? 'text-xl sm:text-2xl' : 'text-2xl'}`}>{job.jobTitle}</h2>
            {job.TP && (
              <div className="bg-green-600 text-white text-xs font-bold px-2 py-1 rounded-md animate-pulse">
                TP
              </div>
            )}
          </div>
          <p className={`text-orange-200 mb-1 ${isMobileModal ? 'text-base sm:text-lg' : 'text-lg'}`}>{job.companyName}</p>
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <div className="flex items-center bg-black/40 px-3 py-1 rounded-full border border-orange-500/30">
              <svg className="h-4 w-4 text-orange-300 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 1 1-6 0 3 3 0 0 1 6 0z" />
              </svg>
              <span className="text-orange-200 text-sm">{job.location}</span>
            </div>
            <div className="bg-black/40 px-3 py-1 rounded-full text-xs text-orange-200 border border-orange-500/30">
              {job.jobType}
            </div>
            <div className="bg-black/40 px-3 py-1 rounded-full text-xs text-orange-200 border border-orange-500/30">
              {job.experienceLevel}
            </div>
            {job.salaryRange && (
              <div className="bg-black/40 px-3 py-1 rounded-full text-xs text-orange-200 border border-orange-500/30">
                {job.salaryRange}
              </div>
            )}
            {job.acceptsCryptoPay && (
              <div className="px-3 py-1 bg-orange-500/20 rounded-full text-xs text-orange-400 font-semibold border border-orange-500/50">
                Crypto Pay
              </div>
            )}
          </div>
        </div>        {/* Close button - only shows on mobile modal */}
        {isMobileModal && onClose && (
          <button
            onClick={onClose}
            className="text-orange-400 hover:text-orange-300 font-bold text-2xl p-1"
          >
            ×
          </button>
        )}
      </div>

      {/* Combined Skills & Technologies - Moved before job description */}
      {(() => {
        // Get skills from requiredSkills field
        const skills = job.requiredSkills ? 
          job.requiredSkills.split(',').map((skill: string) => skill.trim()).filter((skill: string) => skill) : [];
        
        // Get technologies from techTags or technologies field
        const techTags = job.techTags && Array.isArray(job.techTags) ? job.techTags : [];
        const technologies = job.technologies ? 
          (Array.isArray(job.technologies) ? job.technologies : job.technologies.split(','))
            .map((tech: string) => tech.trim()).filter((tech: string) => tech) : [];
        
        // Combine all skills and technologies
        const allItems = [...skills, ...techTags, ...technologies];
        
        // Remove duplicates (case-insensitive)
        const uniqueItems = allItems.filter((item, index, arr) => 
          arr.findIndex(otherItem => otherItem.toLowerCase() === item.toLowerCase()) === index
        );
        
        return uniqueItems.length > 0 ? (
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-orange-300 mb-3">Skills & Technologies</h3>
            <div className="flex flex-wrap gap-2">
              {uniqueItems.map((item, index) => (
                <span
                  key={index}
                  className="bg-orange-500/20 px-3 py-1 rounded-full text-sm text-orange-400 border border-orange-500/50"
                >
                  {item}
                </span>
              ))}
            </div>
          </div>
        ) : null;
      })()}

      {/* Job Description */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-orange-300 mb-3">Job Description</h3>
        <div className="text-orange-100 leading-relaxed whitespace-pre-wrap">
          {job.jobDescription}
        </div>
      </div>
      
      {/* Job ID - positioned discreetly before the border */}
      <div className="flex justify-end mb-1">
        <span className="text-orange-200/50 text-[10px]">ID: {job.id}</span>
      </div>
      
      {/* Apply Button */}
      <div className="pt-4 border-t border-orange-500/30">
        <Button 
          onClick={() => handleApplyClick(job)}
          className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3 transition-colors"
        >
          Apply Now
        </Button>
      </div>
    </div>
  );

  useEffect(() => {
    const fetchJobs = async () => {
      try {
        if (!db) throw new Error("Firestore is not initialized");

        const jobCollection = collection(db, "jobs");
        const jobSnapshot = await getDocs(jobCollection);
        const fetchedJobs: Job[] = jobSnapshot.docs.map((doc) => {          // Get requiredSkills from data (can be string or array)
          const skillsData = doc.data().requiredSkills || "";
          console.log(`Job ${doc.id} requiredSkills type:`, typeof skillsData, Array.isArray(skillsData), skillsData);
          // Automatically extract technology tags from skills
          const techTags = extractTechTags(skillsData);
          
          const data = doc.data();
          console.log(`Job data ${doc.id}:`, data);
          
          // Extract screening questions - both from screeningQuestions field (array)
          // and from individual fields question1, question2, etc.
          let screeningQuestions = [];
          
          // Check if we have the screeningQuestions field as an array
          if (Array.isArray(data.screeningQuestions)) {
            screeningQuestions = data.screeningQuestions;
          } else {
            // Otherwise, search from question1, question2, etc. fields
            for (let i = 1; i <= 5; i++) {
              const questionKey = `question${i}`;
              if (data[questionKey] && typeof data[questionKey] === 'string' && data[questionKey].trim() !== '') {
                screeningQuestions.push(data[questionKey]);
              }
            }
          }            return {
            id: doc.id,
            jobTitle: data.title || "",
            companyName: data.companyName || data.company || "",
            requiredSkills: Array.isArray(data.requiredSkills) 
              ? data.requiredSkills.join(', ') 
              : (data.requiredSkills || ""),
            jobDescription: data.description || "",
            applyLink: data.applicationLink || "",
            category: data.category || "Other",
            insertedDate: data.insertedDate || data.createdAt || new Date().toISOString(),
            location: data.location || "Remote",
            jobType: data.jobType || "Full-Time",
            salaryRange: data.salaryRange || "",
            isFeatured: data.isFeatured || data.featured || false, // Support both property names for backwards compatibility
            priorityListing: data.priorityListing || false, // Top Listed jobs appear at the top of the list
            acceptsCryptoPay: data.acceptsCryptoPay || false,
            experienceLevel: data.experienceLevel || "Mid-Level",
            techTags: techTags, // Add the extracted tags
            disabled: data.disabled || false, // Include disabled status
            
            // Adding the deprecated fields for backwards compatibility (content should be in jobDescription now)
            responsibilities: data.responsibilities || "",
            idealCandidate: data.idealCandidate || "",
            screeningQuestions: screeningQuestions,
            TP: data.TP || false, // True Posting - posted by team
            
            // Include status and expiration fields for filters
            status: data.status || 'active',
            expiresAt: data.expiresAt || null,
            
            // Include new fields for external source handling
            fromExternalSource: data.fromExternalSource || false,
            sourceLink: data.sourceLink || ""
          };
        });
        setJobs(fetchedJobs);
        
        // Check and update expired jobs after loading
        await checkAndUpdateExpiredJobs(fetchedJobs);
      } catch (error) {
        console.error("Error fetching jobs from Firestore:", error);
      }
    };

    fetchJobs();
  }, []);

  // Filter jobs according to selected criteria
  const filteredJobs = jobs.filter(
    (job) => {
      // Don't show disabled jobs on public page
      if (job.disabled) return false;
      
      // Filter jobs with 'inactive' status (already including those that were automatically updated)
      if (job.status === 'inactive') return false;
      
      const matchesSearch = job.jobTitle.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesLocation = job.location.toLowerCase().includes(locationQuery.toLowerCase());
      const matchesCategory = selectedCategory === "All" || job.category === selectedCategory;
      const matchesJobType = selectedJobType === "All Types" || job.jobType === selectedJobType;
      const matchesExperience = selectedExperienceLevel === "All Levels" || job.experienceLevel === selectedExperienceLevel;
      const matchesCryptoPay = !showCryptoPayOnly || job.acceptsCryptoPay;
      const matchesFeatured = !showFeaturedOnly || job.isFeatured;
      
      // Check if the job contains all the selected technology tags
      const matchesTechTags = selectedTechTags.length === 0 || 
        selectedTechTags.every(tag => job.techTags?.includes(tag));
      
      return matchesSearch && matchesLocation && matchesCategory && matchesJobType && 
             matchesExperience && matchesCryptoPay && matchesFeatured && matchesTechTags;
    }
  ).sort((a, b) => {
    // First sort by priorityListing (Top Listed)
    if (a.priorityListing && !b.priorityListing) return -1;
    if (!a.priorityListing && b.priorityListing) return 1;
    
    // If both have the same priorityListing status, sort by date (most recent first)
    return new Date(b.insertedDate).getTime() - new Date(a.insertedDate).getTime();
  });

  // Apply pagination to filtered jobs
  const totalFilteredJobs = filteredJobs.length;
  const totalPages = Math.ceil(totalFilteredJobs / jobsPerPage);
  const indexOfLastJob = currentPage * jobsPerPage;
  const indexOfFirstJob = indexOfLastJob - jobsPerPage;
  const currentJobs = filteredJobs.slice(indexOfFirstJob, indexOfLastJob);
  // Function to handle page changes
  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
      // Reset selected job when changing pages
      setSelectedJobId(null);
      // Scroll to the job listings section
      setTimeout(() => {
        const jobListElement = document.querySelector('.grid.grid-cols-1');
        if (jobListElement) {
          jobListElement.scrollIntoView({ behavior: "smooth", block: "start" });
        } else {
          window.scrollTo({ top: 300, behavior: "smooth" });
        }
      }, 100);
    }
  };

  const handlePrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
      // Reset selected job when changing pages
      setSelectedJobId(null);
      // Scroll to the job listings section
      setTimeout(() => {
        const jobListElement = document.querySelector('.grid.grid-cols-1');
        if (jobListElement) {
          jobListElement.scrollIntoView({ behavior: "smooth", block: "start" });
        } else {
          window.scrollTo({ top: 300, behavior: "smooth" });
        }
      }, 100);
    }
  };
  
  // Email Signup Section
  const [alertEmail, setAlertEmail] = useState("");
  const [subscribing, setSubscribing] = useState(false);
  const [subscribeSuccess, setSubscribeSuccess] = useState(false);
  const [subscribeError, setSubscribeError] = useState("");

  const handleJobAlertSubscribe = async () => {
    setSubscribing(true);
    setSubscribeError("");
    setSubscribeSuccess(false);
    try {
      if (!alertEmail || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(alertEmail)) {
        setSubscribeError("Please enter a valid email address.");
        setSubscribing(false);
        return;
      }
      // Check for duplicates (optional, can be removed for performance)
      const snapshot = await getDocs(collection(db, "jobAlertSubscribers"));
      const exists = snapshot.docs.some(doc => doc.data().email === alertEmail);
      if (exists) {
        setSubscribeError("This email is already subscribed.");
        setSubscribing(false);
        return;
      }
      await import("firebase/firestore").then(async ({ addDoc, serverTimestamp }) => {
        await addDoc(collection(db, "jobAlertSubscribers"), {
          email: alertEmail,
          createdAt: serverTimestamp(),
          active: true
        });
      });
      setSubscribeSuccess(true);
      setAlertEmail("");
    } catch (err) {
      setSubscribeError("Failed to subscribe. Please try again later.");
    } finally {
      setSubscribing(false);
    }
  };

  // Function to check and update expired jobs
  const checkAndUpdateExpiredJobs = async (jobsToCheck: Job[]) => {
    const now = new Date();
    const expiredJobs: Job[] = [];

    for (const job of jobsToCheck) {
      // Check if the job has an expiration date
      if (job.expiresAt) {
        let expiresAt: Date;
        
        // Convert Firestore Timestamp to Date if necessary
        if (job.expiresAt.toDate) {
          expiresAt = job.expiresAt.toDate();
        } else {
          expiresAt = new Date(job.expiresAt);
        }

        // If expired and still active, mark for update
        if (expiresAt < now && job.status === 'active') {
          expiredJobs.push(job);
        }
      }
    }

    // Update expired jobs in Firestore
    if (expiredJobs.length > 0) {
      try {
        const updatePromises = expiredJobs.map(job => 
          updateDoc(doc(db, 'jobs', job.id), {
            status: 'inactive'
          })
        );
        
        await Promise.all(updatePromises);
        console.log(`Updated ${expiredJobs.length} expired jobs to inactive status`);
        
        // Update local state
        setJobs(prevJobs => 
          prevJobs.map(job => 
            expiredJobs.find(expiredJob => expiredJob.id === job.id)
              ? { ...job, status: 'inactive' as const }
              : job
          )
        );
      } catch (error) {
        console.error('Error updating expired jobs:', error);
      }
    }
  };
  return (
    <Layout>
      <div className="bg-gradient-to-b from-black via-[#18181b] to-black min-h-screen text-white pt-16 md:pt-20">
        {/* Header Section */}
        <div className="border-b border-orange-500/30 py-8 px-2 sm:py-16 sm:px-4 bg-black/80">
          <div className="mx-auto text-center max-w-xl">
            <h1 className="text-2xl xs:text-3xl sm:text-4xl md:text-5xl font-bold mb-3 sm:mb-4 leading-tight">
              Find Your Dream <span className="text-orange-400">Blockchain Job</span>
            </h1>
            <p className="text-base xs:text-lg sm:text-xl text-orange-200/80 max-w-full mx-auto">
              Discover the best crypto and blockchain job opportunities at the most innovative companies in Web3.
            </p>
          </div>        </div>

        <div className="container mx-auto py-8 sm:py-12 px-2 sm:px-4 lg:px-8">
          {/* Categoria Tabs */}
          <div className="mb-6 sm:mb-8 w-full">
            <div className="flex flex-wrap justify-center gap-x-3 gap-y-2 pb-2 w-full">
              {JOB_CATEGORIES.map((category) => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`px-3 py-1 sm:px-4 sm:py-2 rounded-full whitespace-nowrap text-xs sm:text-sm font-semibold transition-colors shadow-sm border border-orange-500/30
                    ${selectedCategory === category 
                      ? "bg-orange-500 text-white border-orange-500" 
                      : "bg-black/60 text-orange-200 border-orange-500/30 hover:bg-orange-900/30"}`}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>

          {/* Search & Filter Row */}
          <div className="mb-6 sm:mb-8 flex flex-col lg:flex-row gap-3 sm:gap-4">
            <div className="w-full lg:w-2/5">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search for jobs..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-5 py-3 rounded bg-black/40 border border-orange-500/30 text-white focus:outline-none focus:ring-2 focus:ring-orange-400 placeholder-orange-200/60"
                />
                <svg className="absolute right-3 top-3.5 h-5 w-5 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>
            <div className="w-full lg:w-2/5">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Filter by location..."
                  value={locationQuery}
                  onChange={(e) => setLocationQuery(e.target.value)}
                  className="w-full px-5 py-3 rounded bg-black/40 border border-orange-500/30 text-white focus:outline-none focus:ring-2 focus:ring-orange-400 placeholder-orange-200/60"
                />
                <svg className="absolute right-3 top-3.5 h-5 w-5 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 1 1-6 0 3 3 0 0 1 6 0z" />
                </svg>
              </div>
            </div>
            <div className="w-full lg:w-1/5">
              <button
                onClick={() => {
                  setSearchQuery("");
                  setLocationQuery("");
                  setSelectedCategory("All");
                  setSelectedJobType("All Types");
                  setSelectedExperienceLevel("All Levels");
                  setShowCryptoPayOnly(false);
                  setShowFeaturedOnly(false);
                }}
                className="w-full px-5 py-3 rounded bg-black/40 border border-orange-500/30 text-orange-200 font-semibold hover:bg-orange-900/30 transition-colors"
              >
                Clear Filters
              </button>
            </div>
          </div>

          {/* Advanced Filters */}
          <div className="mb-6 sm:mb-8 p-4 sm:p-6 bg-black/60 rounded-lg border border-orange-500/30 shadow-lg">
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-4">
              <div className="w-full sm:w-1/3">
                <label className="block text-orange-300 mb-2 font-semibold">Job Type</label>
                <select
                  value={selectedJobType}
                  onChange={(e) => setSelectedJobType(e.target.value)}
                  className="w-full px-4 py-2 rounded bg-black/40 border border-orange-500/30 text-white focus:outline-none focus:ring-2 focus:ring-orange-400"
                >
                  {JOB_TYPES.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>
              <div className="w-full sm:w-1/3">
                <label className="block text-orange-300 mb-2 font-semibold">Experience Level</label>
                <select
                  value={selectedExperienceLevel}
                  onChange={(e) => setSelectedExperienceLevel(e.target.value)}
                  className="w-full px-4 py-2 rounded bg-black/40 border border-orange-500/30 text-white focus:outline-none focus:ring-2 focus:ring-orange-400"
                >
                  {EXPERIENCE_LEVELS.map(level => (
                    <option key={level} value={level}>{level}</option>
                  ))}
                </select>
              </div>
              <div className="w-full sm:w-1/3 flex space-x-4 items-end">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showCryptoPayOnly}
                    onChange={() => setShowCryptoPayOnly(!showCryptoPayOnly)}
                    className="h-4 w-4 accent-orange-500"
                  />
                  <span className="text-orange-200 font-medium">Crypto Pay</span>
                </label>
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showFeaturedOnly}
                    onChange={() => setShowFeaturedOnly(!showFeaturedOnly)}
                    className="h-4 w-4 accent-orange-500"
                  />
                  <span className="text-orange-200 font-medium">Featured Only</span>
                </label>
              </div>
            </div>
            {/* Tech Tags Filter */}
            <div className="mt-4">
              <div className="flex justify-between items-center mb-2">
                <label className="block text-orange-300 font-semibold">Filter by Technologies</label>
                <button 
                  onClick={() => setShowTechTagsFilter(!showTechTagsFilter)}
                  className="text-sm text-orange-400 hover:text-orange-300"
                >
                  {showTechTagsFilter ? 'Hide' : 'Show'} Technologies
                </button>
              </div>
              {showTechTagsFilter && (
                <div className="mt-2 border border-orange-500/30 rounded-lg p-4 bg-black/40">
                  <div className="mb-2 text-sm text-orange-200">
                    Select technologies to filter jobs:
                  </div>
                  <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto">
                    {TECH_TAGS.map(tag => (
                      <button
                        key={tag}
                        onClick={() => {
                          if (selectedTechTags.includes(tag)) {
                            setSelectedTechTags(selectedTechTags.filter(t => t !== tag));
                          } else {
                            setSelectedTechTags([...selectedTechTags, tag]);
                          }
                        }}
                        className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors border border-orange-500/30 shadow-sm
                          ${selectedTechTags.includes(tag)
                            ? "bg-orange-500 text-white border-orange-500"
                            : "bg-black/60 text-orange-200 border-orange-500/30 hover:bg-orange-900/30"}`}
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                  {selectedTechTags.length > 0 && (
                    <div className="mt-4 flex justify-between items-center">
                      <span className="text-sm text-orange-200">
                        {selectedTechTags.length} {selectedTechTags.length === 1 ? 'technology' : 'technologies'} selected
                      </span>
                      <button
                        onClick={() => setSelectedTechTags([])}
                        className="text-sm text-orange-400 hover:text-orange-300"
                      >
                        Clear selections
                      </button>
                    </div>
                  )}
                </div>
              )}
              {selectedTechTags.length > 0 && !showTechTagsFilter && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {selectedTechTags.map(tag => (
                    <div key={tag} className="bg-orange-500 text-white px-3 py-1 rounded-full text-xs font-semibold flex items-center">
                      {tag}
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedTechTags(selectedTechTags.filter(t => t !== tag));
                        }}
                        className="ml-2 hover:text-orange-200"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={() => setSelectedTechTags([])}
                    className="text-xs text-orange-400 hover:text-orange-300 underline"
                  >
                    Clear all
                  </button>
                </div>
              )}
            </div>
          </div>          {/* Results Count */}
          <div className="mb-4 sm:mb-6 text-orange-200 text-sm sm:text-base">
            Found {filteredJobs.length} job listings {totalFilteredJobs > 0 && `(Showing ${indexOfFirstJob + 1}-${Math.min(indexOfLastJob, totalFilteredJobs)} of ${totalFilteredJobs})`}
          </div>

          {/* Job Listings with two column layout */}
          <div className={`grid ${filteredJobs.length > 0 && !isMobile ? 'grid-cols-1 lg:grid-cols-3 gap-6' : 'grid-cols-1'}`}>
            {/* Column 1: Job List (1/3 width) */}
            <div className={`${filteredJobs.length > 0 && !isMobile ? 'col-span-1' : 'col-span-1'}`}>
              {filteredJobs.length === 0 ? (
                <div className="bg-black/60 rounded-lg p-6 sm:p-8 text-center border border-orange-500/30">
                  <p className="text-orange-200 mb-4">No job listings match your search criteria.</p>
                  <Button 
                    onClick={() => {
                      setSearchQuery("");
                      setLocationQuery("");
                      setSelectedCategory("All");
                      setSelectedJobType("All Types");
                      setSelectedExperienceLevel("All Levels");
                      setShowCryptoPayOnly(false);
                      setShowFeaturedOnly(false);
                    }}
                    className="bg-orange-500 hover:bg-orange-600 text-white transition-colors"
                  >
                    Clear Filters
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {currentJobs.map((job) => (                    <div
                      key={job.id}
                      className={`bg-black/70 rounded-lg border border-orange-500/30 shadow-lg px-3 py-2 flex flex-col transition-all duration-300 relative cursor-pointer hover:border-orange-400 ${selectedJobId === job.id ? 'border-orange-400 ring-2 ring-orange-400/50' : ''}`}
                      onClick={() => setSelectedJobId(job.id)}
                    >
                      {/* Featured Badge */}
                      {job.isFeatured && (
                        <div className="absolute left-0 -top-3 w-20 h-8 z-30 pointer-events-none select-none overflow-visible">
                          <div className="bg-orange-500 text-white text-xs font-bold shadow border-2 border-white w-24 text-center py-1 px-0 animate-pulse rotate-[-25deg] -translate-x-6 translate-y-2 rounded-md">
                            <span className="mr-1 align-middle">★</span> Featured
                          </div>
                        </div>
                      )}
                      {/* True Posting Badge */}
                      {job.TP && (
                        <div className="absolute right-2 top-2 z-30">
                          <div className="bg-green-600 text-white text-xs font-bold px-2 py-1 rounded-md animate-pulse">
                            TP
                          </div>
                        </div>
                      )}
                      {/* Título do Job */}
                      <span className="font-bold text-orange-400 text-base truncate max-w-full">{job.jobTitle}</span>
                        {/* Empresa com ícone */}
                      <div className="flex items-center gap-1 mb-2 mt-1">
                        <svg className="h-4 w-4 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                        <span className="text-orange-400 text-sm font-bold">{job.companyName}</span>
                      </div>
                      
                      {/* Localização - limitada a uma linha */}                      {/* Localização - limitada a uma linha */}
                      <div className="text-orange-200 flex items-center gap-1 mb-2 text-xs truncate w-full">
                        <svg className="h-4 w-4 min-w-4 text-orange-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 1 1-6 0 3 3 0 0 1 6 0z" /></svg>
                        <span className="truncate">{job.location}</span>
                      </div>
                      
                      {/* Outros badges */}
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <span className="bg-black/40 px-2 py-1 rounded-full text-orange-200 border border-orange-500/30">{job.jobType}</span>
                        <span className="bg-black/40 px-2 py-1 rounded-full text-orange-200 border border-orange-500/30">{job.experienceLevel}</span>
                        {job.salaryRange && (
                          <span className="bg-black/40 px-2 py-1 rounded-full text-orange-200 border border-orange-500/30">{job.salaryRange}</span>
                        )}
                        {job.acceptsCryptoPay && (
                          <span className="px-2 py-1 bg-orange-500/20 rounded-full text-orange-400 font-semibold border border-orange-500/50">Crypto Pay</span>
                        )}                        <span className="ml-auto text-orange-300 bg-black/40 px-2 py-1 rounded border border-orange-500/30">{getTimeAgo(job.insertedDate)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              {/* Pagination Controls */}
              {filteredJobs.length > 0 && totalPages > 1 && (
                <div className="flex justify-between items-center mt-6 border-t border-orange-500/30 pt-4">
                  <button
                    onClick={handlePrevPage}
                    disabled={currentPage === 1}
                    className={`flex items-center gap-1 px-4 py-2 rounded-lg ${
                      currentPage === 1 
                      ? 'text-orange-500/50 cursor-not-allowed' 
                      : 'bg-black/40 border border-orange-500/30 text-orange-400 hover:bg-orange-900/30'
                    }`}
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    Previous
                  </button>
                  
                  <div className="text-orange-200 text-sm">
                    Page {currentPage} of {totalPages}
                  </div>
                  
                  <button
                    onClick={handleNextPage}
                    disabled={currentPage === totalPages}
                    className={`flex items-center gap-1 px-4 py-2 rounded-lg ${
                      currentPage === totalPages 
                      ? 'text-orange-500/50 cursor-not-allowed' 
                      : 'bg-black/40 border border-orange-500/30 text-orange-400 hover:bg-orange-900/30'
                    }`}
                  >
                    Next
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              )}
            </div>

            {/* Column 2: Job Details (2/3 width) - Desktop only */}
            {!isMobile && filteredJobs.length > 0 && (
              <div className="col-span-2">
                <JobDetailsPanel job={filteredJobs.find(j => j.id === selectedJobId) || filteredJobs[0]} />
              </div>
            )}            {/* Mobile View: Show job details as modal only when a job is selected */}
            {isMobile && selectedJobId && (
              <div className="fixed inset-0 bg-black/90 z-40 overflow-y-auto">
                <div className="min-h-screen p-2 sm:p-4 pt-16 sm:pt-20">
                  <div className="w-full max-w-2xl mx-auto">
                    <JobDetailsPanel 
                      job={filteredJobs.find(j => j.id === selectedJobId) || filteredJobs[0]} 
                      onClose={() => setSelectedJobId(null)}
                      isMobileModal={true}
                    />
                  </div>
                </div>
              </div>
            )}          </div>
          
          {/* Email Signup Section */}
          <div className="mt-10 sm:mt-16 bg-black/60 rounded-lg p-6 sm:p-8 border border-orange-500/30">
            <div className="text-center mb-4 sm:mb-6">
              <h2 className="text-xl sm:text-2xl font-bold text-orange-100">Subscribe to Job Alerts</h2>
              <p className="text-orange-200 mt-2">Get the latest blockchain job opportunities delivered straight to your inbox.</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 max-w-xl mx-auto">
              <input
                type="email"
                value={alertEmail}
                onChange={e => setAlertEmail(e.target.value)}
                placeholder="Enter your email"
                className="flex-grow px-4 sm:px-5 py-2 sm:py-3 border border-orange-500/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400 bg-black/40 text-orange-100 text-sm sm:text-base"
                disabled={subscribing || subscribeSuccess}
              />
              <Button
                className="bg-orange-500 hover:bg-orange-600 text-white transition-colors font-semibold text-sm sm:text-base"
                onClick={handleJobAlertSubscribe}
                disabled={subscribing || subscribeSuccess}
              >
                {subscribing ? "Subscribing..." : subscribeSuccess ? "Subscribed!" : "Subscribe"}
              </Button>
            </div>
            {subscribeError && <div className="text-red-400 text-center mt-2">{subscribeError}</div>}
            {subscribeSuccess && <div className="text-green-400 text-center mt-2">You have been subscribed to job alerts!</div>}
          </div>
        </div>
      </div>
    </Layout>
  );
}
