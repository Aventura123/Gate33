"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import Layout from "@/components/Layout";
import { collection, getDocs } from "firebase/firestore";
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
  isFeatured: boolean;
  priorityListing?: boolean; // Top Listed jobs
  acceptsCryptoPay: boolean;
  experienceLevel: string; // Junior, Mid, Senior
  techTags?: string[]; // Array of specific technology tags
  responsibilities?: string; // Responsabilidades da vaga
  idealCandidate?: string; // Perfil do candidato ideal
  screeningQuestions?: string[]; // Perguntas de triagem
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

// Hook para detectar se é mobile
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
  const [jobs, setJobs] = useState<Job[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [locationQuery, setLocationQuery] = useState("");
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const isMobile = useIsMobile();
  
  // New states for additional filters
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedJobType, setSelectedJobType] = useState("All Types");
  const [selectedExperienceLevel, setSelectedExperienceLevel] = useState("All Levels");
  const [showCryptoPayOnly, setShowCryptoPayOnly] = useState(false);
  const [showFeaturedOnly, setShowFeaturedOnly] = useState(false);
  
  // State for technology tags filter
  const [selectedTechTags, setSelectedTechTags] = useState<string[]>([]);
  const [showTechTagsFilter, setShowTechTagsFilter] = useState(false);

  // Function to extract technology tags from a skills string
  const extractTechTags = (skills: string): string[] => {
    if (!skills) return [];
    
    const skillsArray = skills.split(',').map(skill => skill.trim());
    return TECH_TAGS.filter(tag => 
      skillsArray.some(skill => 
        skill.toLowerCase().includes(tag.toLowerCase()) || 
        tag.toLowerCase().includes(skill.toLowerCase())
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
  const selectedJob = jobs.find(job => job.id === selectedJobId);

  // Component for job details panel
  const JobDetailsPanel = ({ job }: { job: Job }) => (
    <div className="bg-black/70 rounded-lg border border-orange-500/30 shadow-lg p-6 h-fit sticky top-4">
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1">
          <h2 className="text-2xl font-bold text-orange-400 mb-2">{job.jobTitle}</h2>
          <p className="text-orange-200 text-lg mb-1">{job.companyName}</p>
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <div className="flex items-center bg-black/40 px-3 py-1 rounded-full border border-orange-500/30">
              <svg className="h-4 w-4 text-orange-300 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span className="text-orange-200 text-sm">{job.location}</span>
            </div>
            <div className="bg-black/40 px-3 py-1 rounded-full text-xs text-orange-200 border border-orange-500/30">
              {job.jobType}
            </div>
            <div className="bg-black/40 px-3 py-1 rounded-full text-xs text-orange-200 border border-orange-500/30">
              {job.experienceLevel}
            </div>
            {job.acceptsCryptoPay && (
              <div className="px-3 py-1 bg-orange-500/20 rounded-full text-xs text-orange-400 font-semibold border border-orange-500/50">
                Crypto Pay
              </div>
            )}
          </div>
        </div>
        <button
          onClick={() => setSelectedJobId(null)}
          className="text-orange-400 hover:text-orange-300 text-xl font-bold ml-4"
        >
          ×
        </button>
      </div>

      {/* Job Description */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-orange-300 mb-3">Job Description</h3>
        <div className="text-orange-100 leading-relaxed whitespace-pre-wrap">
          {job.jobDescription}
        </div>
      </div>

      {/* Required Skills */}
      {job.requiredSkills && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-orange-300 mb-3">Required Skills</h3>
          <div className="flex flex-wrap gap-2">
            {job.requiredSkills.split(',').map((skill, index) => (
              <span
                key={index}
                className="bg-black/40 px-3 py-1 rounded-full text-sm text-orange-200 border border-orange-500/30"
              >
                {skill.trim()}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Technology Tags */}
      {job.techTags && job.techTags.length > 0 && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-orange-300 mb-3">Technologies</h3>
          <div className="flex flex-wrap gap-2">
            {job.techTags.map((tag, index) => (
              <span
                key={index}
                className="bg-orange-500/20 px-3 py-1 rounded-full text-sm text-orange-400 border border-orange-500/50"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Responsibilities */}
      {job.responsibilities && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-orange-300 mb-3">Responsibilities</h3>
          <div className="text-orange-100 leading-relaxed whitespace-pre-wrap">
            {job.responsibilities}
          </div>
        </div>
      )}

      {/* Ideal Candidate */}
      {job.idealCandidate && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-orange-300 mb-3">Ideal Candidate</h3>
          <div className="text-orange-100 leading-relaxed whitespace-pre-wrap">
            {job.idealCandidate}
          </div>
        </div>
      )}

      {/* Salary Range */}
      {job.salaryRange && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-orange-300 mb-3">Salary Range</h3>
          <p className="text-orange-100">{job.salaryRange}</p>
        </div>
      )}

      {/* Apply Button */}
      <div className="pt-4 border-t border-orange-500/30">
        <Button 
          onClick={() => window.open(job.applyLink, '_blank')}
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
        const fetchedJobs: Job[] = jobSnapshot.docs.map((doc) => {
          const skillsString = doc.data().requiredSkills || "";
          // Automatically extract technology tags from skills
          const techTags = extractTechTags(skillsString);
          
          const data = doc.data();
          console.log(`Dados da vaga ${doc.id}:`, data);
          
          // Extrair perguntas de triagem - tanto do campo screeningQuestions (array)
          // quanto dos campos individuais question1, question2, etc.
          let screeningQuestions = [];
          
          // Verificar se temos o campo screeningQuestions como array
          if (Array.isArray(data.screeningQuestions)) {
            screeningQuestions = data.screeningQuestions;
          } else {
            // Caso contrário, buscar de fields question1, question2, etc.
            for (let i = 1; i <= 5; i++) {
              const questionKey = `question${i}`;
              if (data[questionKey] && typeof data[questionKey] === 'string' && data[questionKey].trim() !== '') {
                screeningQuestions.push(data[questionKey]);
              }
            }
          }
          
          return {
            id: doc.id,
            jobTitle: data.title || "",
            companyName: data.company || "",
            requiredSkills: skillsString,
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
            
            // Adicionando os novos campos com verificação
            responsibilities: data.responsibilities || "",
            idealCandidate: data.idealCandidate || "",
            screeningQuestions: screeningQuestions
          };
        });
        setJobs(fetchedJobs);
      } catch (error) {
        console.error("Error fetching jobs from Firestore:", error);
      }
    };

    fetchJobs();
  }, []);

  // Filtrar os jobs de acordo com os critérios selecionados
  const filteredJobs = jobs.filter(
    (job) => {
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
    // Primeiro ordena por priorityListing (Top Listed)
    if (a.priorityListing && !b.priorityListing) return -1;
    if (!a.priorityListing && b.priorityListing) return 1;
    
    // Se ambos têm o mesmo status de priorityListing, ordenar por data (mais recentes primeiro)
    return new Date(b.insertedDate).getTime() - new Date(a.insertedDate).getTime();
  });

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

  return (
    <Layout>
      <div className="bg-gradient-to-b from-black via-[#18181b] to-black min-h-screen text-white">
        {/* Header Section */}
        <div className="border-b border-orange-500/30 py-8 px-2 sm:py-16 sm:px-4 bg-black/80">
          <div className="mx-auto text-center max-w-xl">
            <h1 className="text-2xl xs:text-3xl sm:text-4xl md:text-5xl font-bold mb-3 sm:mb-4 leading-tight">
              Find Your Dream <span className="text-orange-400">Blockchain Job</span>
            </h1>
            <p className="text-base xs:text-lg sm:text-xl text-orange-200/80 max-w-full mx-auto">
              Discover the best crypto and blockchain job opportunities at the most innovative companies in Web3.
            </p>
          </div>
        </div>

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
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
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
          </div>

          {/* Results Count */}
          <div className="mb-4 sm:mb-6 text-orange-200 text-sm sm:text-base">
            Found {filteredJobs.length} job listings
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
                  {filteredJobs.map((job) => (
                    <div
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
                      <span className="font-bold text-orange-400 text-base truncate max-w-full mb-1">{job.jobTitle}</span>
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <span className="text-orange-200 flex items-center gap-1">
                          <svg className="h-4 w-4 text-orange-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                          {job.location}
                        </span>
                        <span className="bg-black/40 px-2 py-1 rounded-full text-orange-200 border border-orange-500/30">{job.jobType}</span>
                        <span className="bg-black/40 px-2 py-1 rounded-full text-orange-200 border border-orange-500/30">{job.experienceLevel}</span>
                        {job.salaryRange && (
                          <span className="bg-black/40 px-2 py-1 rounded-full text-orange-200 border border-orange-500/30">{job.salaryRange}</span>
                        )}
                        {job.acceptsCryptoPay && (
                          <span className="px-2 py-1 bg-black/40 rounded-full text-orange-400 font-semibold border border-orange-500/30">Crypto Pay</span>
                        )}
                        <span className="ml-auto text-orange-300 bg-black/40 px-2 py-1 rounded border border-orange-500/30">{getTimeAgo(job.insertedDate)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Column 2: Job Details (2/3 width) */}
            {!isMobile && filteredJobs.length > 0 && (
              <div className="col-span-2">
                <JobDetailsPanel job={filteredJobs.find(j => j.id === selectedJobId) || filteredJobs[0]} />
              </div>
            )}

            {/* Mobile View: Show job details as modal */}
            {selectedJobId && isMobile && (
              <div className="fixed inset-0 bg-black/80 z-40 overflow-y-auto p-4">
                <div className="relative max-w-2xl mx-auto">
                  <button
                    onClick={() => setSelectedJobId(null)} 
                    className="absolute -top-2 right-0 bg-black/60 text-orange-400 hover:text-orange-300 text-xl p-2 w-10 h-10 rounded-full flex items-center justify-center border border-orange-500/30 z-50"
                  >
                    ×
                  </button>
                  <JobDetailsPanel job={filteredJobs.find(j => j.id === selectedJobId) || filteredJobs[0]} />
                </div>
              </div>
            )}
          </div>
          
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
