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
import { JOB_CATEGORIES } from "../../constants/jobCategories";

// Additional categories specific to instant jobs
const INSTANT_JOB_CATEGORIES = [
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

const isProduction = process.env.NEXT_PUBLIC_DEPLOY_STAGE === "production";

export default function InstantJobsPage() {
  if (isProduction) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-white">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-4 text-orange-500">Coming Soon</h1>
          <p className="text-lg text-gray-300">This feature will be available soon.</p>
        </div>
      </div>
    );
  }

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
        <title>Instant Jobs | Gate33</title>      </Head>      <Layout>
        <div className="min-h-screen bg-gradient-to-b from-black via-[#1a1a1a] to-black pt-16 md:pt-20 pb-12 px-3 sm:px-5 lg:px-8 xl:px-12">
          <div className="max-w-7xl mx-auto">            {/* Header with distinct design */}
            <div className="mb-8 bg-gradient-to-r from-orange-900/80 to-orange-600/80 backdrop-blur-sm p-6 rounded-xl shadow-2xl border border-orange-500/30">
              <div className="flex items-center mb-3">
                <div className="w-10 h-10 bg-orange-500/20 rounded-lg flex items-center justify-center mr-3">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-white mb-1">Instant Jobs</h1>
                  <p className="text-orange-100/90">
                    Quick microtasks & short-term projects. Apply instantly and get paid fast!
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-3 text-sm text-orange-100/80">
                <div className="flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Quick turnaround
                </div>
                <div className="flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  Fast payments
                </div>
                <div className="flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Instant applications
                </div>
              </div>
            </div>            {/* Search and filters */}
            <div className="bg-black/70 backdrop-blur-sm p-6 rounded-xl shadow-2xl border border-orange-500/20 mb-8">
              <h2 className="text-lg font-semibold text-orange-400 mb-4 flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                </svg>
                Filter & Search
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">                {/* Search input */}
                <div>
                  <label htmlFor="search" className="block text-sm font-medium text-orange-300 mb-1">
                    Search Tasks
                  </label>
                  <input
                    type="text"
                    id="search"
                    placeholder="Search by title or description..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full p-3 bg-black/50 border border-orange-500/30 rounded-lg text-white placeholder:text-gray-400 focus:border-orange-400 focus:ring-2 focus:ring-orange-400/20 transition-all"
                  />
                </div>
                
                {/* Category dropdown */}
                <div>
                  <label htmlFor="category" className="block text-sm font-medium text-orange-300 mb-1">
                    Category
                  </label>
                  <select
                    id="category"
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="w-full p-3 bg-black/50 border border-orange-500/30 rounded-lg text-white focus:border-orange-400 focus:ring-2 focus:ring-orange-400/20 transition-all"
                  >
                  {INSTANT_JOB_CATEGORIES.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </div>              
              {/* Budget range */}
              <div>
                <label className="block text-sm font-medium text-orange-300 mb-1">
                  Budget Range ($)
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    type="number"
                    placeholder="Min"
                    value={minBudget}
                    onChange={(e) => setMinBudget(e.target.value)}
                    className="w-full p-3 bg-black/50 border border-orange-500/30 rounded-lg text-white placeholder:text-gray-400 focus:border-orange-400 focus:ring-2 focus:ring-orange-400/20 transition-all"
                  />
                  <span className="text-orange-400 font-medium">to</span>
                  <input
                    type="number"
                    placeholder="Max"
                    value={maxBudget}
                    onChange={(e) => setMaxBudget(e.target.value)}
                    className="w-full p-3 bg-black/50 border border-orange-500/30 rounded-lg text-white placeholder:text-gray-400 focus:border-orange-400 focus:ring-2 focus:ring-orange-400/20 transition-all"
                  />
                </div>
              </div>
            </div>            
            {/* Skills filter */}
            <div className="bg-black/50 backdrop-blur-sm p-4 rounded-xl border border-orange-500/20">
              <button
                onClick={() => setShowSkillsFilter(!showSkillsFilter)}
                className="flex items-center text-orange-400 hover:text-orange-300 font-medium transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
                <span>{showSkillsFilter ? "Hide Skills Filter" : "Filter by Skills"}</span>
                <svg
                  className={`w-4 h-4 ml-2 transform transition-transform ${showSkillsFilter ? "rotate-180" : ""}`}
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
                      className={`px-3 py-1 rounded-full text-sm font-medium transition-all ${
                        selectedSkills.includes(skill)
                          ? "bg-orange-500 text-white shadow-lg"
                          : "bg-black/50 text-orange-200 hover:bg-orange-500/20 border border-orange-500/30"
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
              <div>
                <h2 className="text-xl font-bold text-orange-400 mb-1">
                  Available Tasks
                </h2>
                <p className="text-gray-400 text-sm">
                  {filteredJobs.length} {filteredJobs.length === 1 ? 'task' : 'tasks'} found
                </p>
              </div>
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
              <div className="bg-black/50 backdrop-blur-sm border border-orange-500/20 rounded-xl p-8 text-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-orange-400 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p className="text-orange-200 mb-2 text-lg">No instant tasks found</p>
                <p className="text-orange-300/60">Try adjusting your filters or check back later for new opportunities.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                {filteredJobs.map((job) => (                  <div 
                    key={job.id}
                    className="bg-black/60 backdrop-blur-sm border border-orange-500/30 rounded-lg overflow-hidden hover:border-orange-400 hover:shadow-xl hover:shadow-orange-500/10 transition-all duration-300 group"
                  >
                    <div className="p-4">
                      {/* Job header */}
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-white group-hover:text-orange-200 transition-colors line-clamp-1">{job.title}</h3>
                          {job.companyName && (
                            <p className="text-orange-300/80 text-sm mt-1 flex items-center">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                              </svg>
                              {job.companyName}
                            </p>
                          )}
                        </div>
                        <div>
                          <span className="bg-gradient-to-r from-orange-500 to-orange-600 text-white text-sm font-bold px-3 py-1 rounded-full shadow-lg">
                            ${job.budget}
                          </span>
                        </div>
                      </div>                      
                      {/* Job category and type */}
                      <div className="flex flex-wrap gap-2 mb-3">
                        {job.category && (
                          <span className="inline-flex items-center bg-orange-500/20 text-orange-300 text-xs px-2 py-1 rounded-full">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                            </svg>
                            {job.category}
                          </span>
                        )}
                      </div>
                      
                      {/* Job description */}
                      <p className="text-gray-300 mb-3 text-sm leading-relaxed line-clamp-2">{job.description}</p>
                      
                      {/* Required skills */}
                      {job.requiredSkills && job.requiredSkills.length > 0 && (
                        <div className="mb-3">
                          <p className="text-orange-300 text-xs font-medium mb-1">Skills:</p>
                          <div className="flex flex-wrap gap-1">
                            {job.requiredSkills.slice(0, 3).map((skill, index) => (
                              <span key={index} className="bg-black/50 border border-orange-500/30 text-orange-200 text-xs px-2 py-1 rounded">
                                {skill}
                              </span>
                            ))}
                            {job.requiredSkills.length > 3 && (
                              <span className="text-orange-400 text-xs px-2 py-1">
                                +{job.requiredSkills.length - 3} more
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                      
                      {/* Apply button */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center text-orange-300/80 text-xs">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          {job.estimatedTime ? `${job.estimatedTime}` : 'Quick task'}
                        </div>
                        
                        <Button
                          onClick={() => handleApply(job.id ?? "")}
                          disabled={isApplying || hasApplied(job.id ?? "")}
                          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                            hasApplied(job.id ?? "")
                              ? "bg-gray-600 text-gray-300 cursor-not-allowed"
                              : "bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white shadow-lg hover:shadow-xl"
                          }`}
                        >
                          {hasApplied(job.id ?? "")
                            ? "✓ Applied"
                            : isApplying
                            ? "Applying..."
                            : "Apply Now"}
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>            )}
          </div>
        </div>
      </div>
      </Layout>
    </>
  );
}