"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import Layout from "@/components/Layout";
import instantJobsService, { InstantJob } from "@/services/instantJobsService";
import InstantJobCard from "@/components/instant-jobs/InstantJobCard";
import { useRouter } from "next/navigation";
import { auth, db } from "../../lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import Head from "next/head";

// Array of categories for filtering - expanded to be more specific to instant jobs
const JOB_CATEGORIES = [
  "All",
  "Development",
  "Design",
  "Marketing",
  "Content",
  "Research",
  "Testing",
  "Data Entry",
  "Support",
  "Microtasks",
  "Blockchain",
  "Web3",
  "Other"
];

// Array of skills for filtering - customized for instant jobs
const COMMON_SKILLS = [
  "JavaScript",
  "React",
  "Node.js",
  "TypeScript",
  "Solidity",
  "UI/UX",
  "Graphic Design",
  "Content Writing",
  "SEO",
  "Smart Contracts",
  "Web3",
  "Data Analysis",
  "Testing",
  "Customer Support",
  "Quick Tasks",
  "Short-term Work"
];

export default function InstantJobsPage() {
  const [availableJobs, setAvailableJobs] = useState<InstantJob[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [minBudget, setMinBudget] = useState("");
  const [maxBudget, setMaxBudget] = useState("");
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [showSkillsFilter, setShowSkillsFilter] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [myApplications, setMyApplications] = useState<any[]>([]);
  const [isApplying, setIsApplying] = useState(false);
  
  const router = useRouter();

  // Fetch instant jobs and user data on component mount
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        // Fetch all available instant jobs
        const jobs = await instantJobsService.getAvailableInstantJobs();
        setAvailableJobs(jobs);
        
        // Check if user is logged in and fetch their applications
        onAuthStateChanged(auth, async (user) => {
          if (user) {
            setUserId(user.uid);
            
            try {
              // Verify if the user is a seeker
              const userRef = doc(db, "seekers", user.uid);
              const userSnapshot = await getDoc(userRef);
              
              if (userSnapshot.exists()) {
                // Fetch user's applications
                const applications = await instantJobsService.getWorkerApplications(user.uid);
                setMyApplications(applications);
              }
            } catch (error) {
              console.error("Error fetching user data:", error);
            }
          }
        });
      } catch (error) {
        console.error("Error fetching instant jobs:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  // Handle job application
  const handleApply = async (jobId: string) => {
    if (!userId) {
      router.push("/login?redirect=/instant-jobs");
      return;
    }
    
    setIsApplying(true);
    try {
      // Fetch user profile
      const userRef = doc(db, "seekers", userId);
      const userSnapshot = await getDoc(userRef);
      
      if (!userSnapshot.exists()) {
        throw new Error("User profile not found");
      }
      
      const userData = userSnapshot.data();
      
      // Apply for the job
      await instantJobsService.applyForInstantJob(
        jobId,
        userId,
        userData.name || userData.fullName || "Anonymous",
        userData.walletAddress || ""
      );
      
      // Update applications list
      const applications = await instantJobsService.getWorkerApplications(userId);
      setMyApplications(applications);
      
      alert("Application submitted successfully!");
    } catch (error) {
      console.error("Error applying for job:", error);
      alert("Failed to apply for job. Please try again.");
    } finally {
      setIsApplying(false);
    }
  };

  // Toggle skill selection
  const toggleSkill = (skill: string) => {
    if (selectedSkills.includes(skill)) {
      setSelectedSkills(selectedSkills.filter(s => s !== skill));
    } else {
      setSelectedSkills([...selectedSkills, skill]);
    }
  };

  // Filter jobs based on search criteria
  const filteredJobs = availableJobs.filter(job => {
    // Filter by category
    if (selectedCategory !== "All" && job.category !== selectedCategory) {
      return false;
    }
    
    // Filter by search query
    if (searchQuery && 
      !job.title.toLowerCase().includes(searchQuery.toLowerCase()) && 
      !job.description.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    
    // Filter by budget
    const budget = parseFloat(job.budget.toString());
    if (minBudget && budget < parseFloat(minBudget)) {
      return false;
    }
    if (maxBudget && budget > parseFloat(maxBudget)) {
      return false;
    }
    
    // Filter by skills
    if (selectedSkills.length > 0) {
      const jobSkills = job.requiredSkills || [];
      const hasMatchingSkill = selectedSkills.some(skill => 
        jobSkills.some(jobSkill => 
          jobSkill.toLowerCase().includes(skill.toLowerCase())
        )
      );
      if (!hasMatchingSkill) {
        return false;
      }
    }
    
    return true;
  });

  // Check if a job has already been applied for
  const hasApplied = (jobId: string) => {
    return myApplications.some(app => app.jobId === jobId);
  };

  return (
    <>
      <Head>
        <title>Instant Jobs | Gate33</title>
      </Head>
      <Layout>
        <div className="container mx-auto px-4 py-8">
          {/* Header with distinct design */}
          <div className="mb-8 bg-gradient-to-r from-orange-800 to-orange-600 p-6 rounded-lg shadow-lg">
            <h1 className="text-3xl font-bold text-white mb-2">Instant Jobs</h1>
            <p className="text-white/80">
              Quick, short-term tasks that you can complete right away. Get paid fast for your skills!
            </p>
          </div>
          
          {/* Search and filters */}
          <div className="bg-gray-900 p-6 rounded-lg shadow-md mb-8 border border-gray-800">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              {/* Search input */}
              <div>
                <label htmlFor="search" className="block text-sm font-medium text-gray-400 mb-1">
                  Search
                </label>
                <input
                  type="text"
                  id="search"
                  placeholder="Search by title or description"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full p-3 bg-gray-800 border border-gray-700 rounded-md text-white placeholder:text-gray-500"
                />
              </div>
              
              {/* Category dropdown */}
              <div>
                <label htmlFor="category" className="block text-sm font-medium text-gray-400 mb-1">
                  Category
                </label>
                <select
                  id="category"
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full p-3 bg-gray-800 border border-gray-700 rounded-md text-white"
                >
                  {JOB_CATEGORIES.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </div>
              
              {/* Budget range */}
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">
                  Budget Range
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    type="number"
                    placeholder="Min $"
                    value={minBudget}
                    onChange={(e) => setMinBudget(e.target.value)}
                    className="w-full p-3 bg-gray-800 border border-gray-700 rounded-md text-white placeholder:text-gray-500"
                  />
                  <span className="text-gray-500">-</span>
                  <input
                    type="number"
                    placeholder="Max $"
                    value={maxBudget}
                    onChange={(e) => setMaxBudget(e.target.value)}
                    className="w-full p-3 bg-gray-800 border border-gray-700 rounded-md text-white placeholder:text-gray-500"
                  />
                </div>
              </div>
            </div>
            
            {/* Skills filter */}
            <div>
              <button
                onClick={() => setShowSkillsFilter(!showSkillsFilter)}
                className="flex items-center text-orange-400 hover:text-orange-300 mt-2"
              >
                <span>{showSkillsFilter ? "Hide Skills" : "Filter by Skills"}</span>
                <svg
                  className={`w-4 h-4 ml-1 transform ${showSkillsFilter ? "rotate-180" : ""}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </button>
              
              {showSkillsFilter && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {COMMON_SKILLS.map((skill) => (
                    <button
                      key={skill}
                      onClick={() => toggleSkill(skill)}
                      className={`px-3 py-1 rounded-full text-sm ${
                        selectedSkills.includes(skill)
                          ? "bg-orange-500 text-white"
                          : "bg-gray-800 text-gray-300 hover:bg-gray-700"
                      }`}
                    >
                      {skill}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
          
          {/* Job listings */}
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-orange-400">
                Available Instant Jobs ({filteredJobs.length})
              </h2>
              {userId && (
                <button
                  onClick={() => router.push('/seeker-dashboard')}
                  className="text-sm text-orange-400 hover:text-orange-300 flex items-center"
                >
                  <span>View My Applications</span>
                  <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </button>
              )}
            </div>
            
            {isLoading ? (
              <div className="flex justify-center my-16">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500"></div>
              </div>
            ) : filteredJobs.length === 0 ? (
              <div className="bg-gray-900 border border-gray-800 rounded-lg p-8 text-center">
                <p className="text-gray-400 mb-2">No instant jobs found matching your criteria.</p>
                <p className="text-gray-500">Try adjusting your filters or check back later.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {filteredJobs.map((job) => (
                  <div 
                    key={job.id}
                    className="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden hover:border-orange-500/30 transition-all duration-200"
                  >
                    <div className="p-6">
                      {/* Job header */}
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="text-xl font-medium text-white">{job.title}</h3>
                          <p className="text-gray-400 text-sm mt-1">{job.companyName ?? ""}</p>
                        </div>
                        <span className="bg-orange-500/20 text-orange-400 text-sm font-medium px-3 py-1 rounded-full">
                          ${job.budget}
                        </span>
                      </div>
                      
                      {/* Job category tag */}
                      <div className="mb-4">
                        <span className="inline-block bg-gray-800 text-gray-300 text-xs px-2 py-1 rounded">
                          {job.category || 'Uncategorized'}
                        </span>
                      </div>
                      
                      {/* Job description */}
                      <p className="text-gray-300 mb-4 line-clamp-3">{job.description}</p>
                      
                      {/* Required skills */}
                      {job.requiredSkills && job.requiredSkills.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-4">
                          {job.requiredSkills.map((skill, index) => (
                            <span key={index} className="bg-gray-800 text-gray-300 text-xs px-2 py-1 rounded">
                              {skill}
                            </span>
                          ))}
                        </div>
                      )}
                      
                      {/* Apply button */}
                      <div className="mt-4 flex items-center justify-between">
                        <span className="text-gray-400 text-sm">
                          {job.estimatedTime ? `Est. time: ${job.estimatedTime}` : 'Quick task'}
                        </span>
                        
                        <Button
                          onClick={() => handleApply(job.id ?? "")}
                          disabled={isApplying || hasApplied(job.id ?? "")}
                          className={`px-4 py-2 rounded-md ${
                            hasApplied(job.id ?? "")
                              ? "bg-gray-700 text-gray-300 cursor-not-allowed"
                              : "bg-orange-500 hover:bg-orange-600 text-white"
                          }`}
                        >
                          {hasApplied(job.id ?? "")
                            ? "Applied"
                            : isApplying
                            ? "Applying..."
                            : "Apply Now"}
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </Layout>
    </>
  );
}