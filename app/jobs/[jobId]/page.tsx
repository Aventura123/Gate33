"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { db } from "../../../lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import Layout from "@/components/Layout";
import AdsSidebar from "../AdsSidebar";

export default function JobDetailsPage({ params }: { params: Promise<{ jobId: string }> }) {
  const router = useRouter();
  const { jobId } = use(params);
  const [job, setJob] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchJob = async () => {
      try {
        const jobRef = doc(db, "jobs", jobId);
        const jobSnap = await getDoc(jobRef);
        if (jobSnap.exists()) {
          setJob(jobSnap.data());
        } else {
          setError("Job not found.");
        }
      } catch (err) {
        setError("Error loading job.");
      } finally {
        setLoading(false);
      }
    };
    fetchJob();
  }, [jobId]);
  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-b from-black via-[#18181b] to-black pt-16 md:pt-20 pb-12 px-3 sm:px-5 lg:px-8 xl:px-12">
        <div className="max-w-7xl mx-auto mb-4">
          <button 
            onClick={() => router.push('/jobs')}
            className="inline-flex items-center text-orange-400 hover:text-orange-300 transition-colors"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 mr-1"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
            Back to Jobs
          </button>        </div>        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 xl:grid-cols-14 gap-4 lg:gap-6">          {/* Ads column (left) */}
          <div className="lg:col-span-2 xl:col-span-2 order-2 lg:order-1">
            <AdsSidebar />
          </div>          {/* Main Content */}
          <div className="lg:col-span-7 xl:col-span-9 order-1 lg:order-2">
            <div className="w-full">
              {loading ? (
                <div className="text-center text-gray-300 py-12">Loading...</div>
              ) : error ? (
                <div className="text-center text-red-400 py-12">{error}</div>
              ) : (
                <div className="bg-black/70 rounded-lg p-5 lg:p-8 shadow-lg border border-orange-500/30 w-full">                  <div className="border-b border-orange-500/20 pb-5 mb-6">
                    <div className="flex flex-wrap items-center mb-4 justify-between">
                      <div className="flex flex-wrap items-center">
                        <h1 className="text-3xl font-bold text-orange-400 mb-3">{job?.title || "Job"}</h1>
                        {job?.companyName && (
                          <span className="inline-flex items-center bg-black/40 text-orange-200 text-sm px-3 py-1 rounded-full mr-2 mb-2">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                            </svg>
                            {job.companyName}
                          </span>
                        )}
                      </div>
                      {jobId && (
                        <div className="ml-auto text-xs text-gray-400 font-mono select-all whitespace-nowrap min-w-fit" title="Job ID">
                          <span className="bg-black/60 border border-orange-900 px-2 py-1 rounded">ID: {jobId}</span>
                        </div>
                      )}
                    </div>
                    
                    {/* Job Type, Experience Level, and Salary - Added at the top */}
                    <div className="flex flex-wrap gap-2 mb-4">
                      {/* Job Type */}
                      {job?.jobType && (
                        <span className="inline-flex items-center bg-black/40 border border-orange-500/30 text-orange-200 text-sm px-3 py-1 rounded-full">
                          {job.jobType}
                        </span>
                      )}
                      
                      {/* Experience Level */}
                      {job?.experienceLevel && (
                        <span className="inline-flex items-center bg-black/40 border border-orange-500/30 text-orange-200 text-sm px-3 py-1 rounded-full">
                          {job.experienceLevel}
                        </span>
                      )}
                      
                      {/* Remote Option */}
                      {job?.remoteOption && (
                        <span className="inline-flex items-center bg-cyan-500/20 text-cyan-300 text-sm px-3 py-1 rounded-full border border-cyan-500/30">
                          <svg className="h-3.5 w-3.5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 21l3-1.5L15 21l-.75-4M12 3v8m0 0l3.5-3.5M12 11l-3.5-3.5" /></svg>
                          {job.remoteOption}
                        </span>
                      )}
                      
                      {/* Location */}
                      {job?.location && (
                        <span className="inline-flex items-center bg-black/40 text-orange-200 text-sm px-3 py-1 rounded-full border border-orange-500/30">
                          <svg className="h-3.5 w-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 1 1-6 0 3 3 0 0 1 6 0z" />
                          </svg>
                          {job.location}
                        </span>
                      )}
                      
                      {/* Salary Range */}
                      {job?.salaryRange && (
                        <span className="inline-flex items-center bg-green-500/20 text-green-300 text-sm px-3 py-1 rounded-full border border-green-500/30">
                          <svg className="h-3.5 w-3.5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                          {job.salaryRange}
                        </span>
                      )}
                    </div>
                      <div className="flex flex-wrap items-center mb-4">
                      {/* Additional metadata about the job - if needed */}
                      {/* We've moved salary, location, job type to the top bar */}
                      
                      {/* Display any other salary information not already shown */}
                      {(job?.salaryMin || job?.salaryMax) && !job.salary && !job.salaryRange && (
                        <span className="inline-flex items-center bg-green-500/20 text-green-300 text-sm px-3 py-1 rounded-full mr-2 mb-2">
                          <svg className="h-3.5 w-3.5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                          {job.salaryMin ? `From ${job.salaryMin}` : ''}{job.salaryMin && job.salaryMax ? ' - ' : ''}{job.salaryMax ? `Up to ${job.salaryMax}` : ''}
                        </span>                      )}
                      {/* Posted Date */}
                      {job?.createdAt && (
                        <span className="inline-flex items-center bg-gray-500/20 text-gray-300 text-sm px-3 py-1 rounded-full mr-2 mb-2">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          Posted: {job.createdAt?.seconds ? new Date(job.createdAt.seconds * 1000).toLocaleDateString('en-GB', {day: '2-digit',month: '2-digit',year: 'numeric'}).replace(/\//g, '/') : "DD/MM/YYYY"}
                        </span>
                      )}
                    </div>                    <div className="border-t border-orange-500/30 mt-6 pt-6">
                      {/* Combined Skills & Technologies */}
                      {(() => {
                        // Get skills from requiredSkills field
                        const skills = job?.requiredSkills ? 
                          (Array.isArray(job.requiredSkills) ? job.requiredSkills : String(job.requiredSkills).split(','))
                            .map((skill: string) => skill.trim()).filter((skill: string) => skill) : [];
                        
                        // Get technologies from multiple possible fields
                        const techs = job?.technologies ? 
                          (Array.isArray(job.technologies) ? job.technologies : String(job.technologies).split(','))
                            .map((tech: string) => tech.trim()).filter((tech: string) => tech) : [];
                        
                        const techTags = job?.techTags && Array.isArray(job.techTags) ? job.techTags : [];
                        
                        // Combine all skills and technologies
                        const allItems = [...skills, ...techs, ...techTags];
                        
                        // Remove duplicates (case-insensitive)
                        const uniqueItems = allItems.filter((item, index, arr) => 
                          arr.findIndex(otherItem => otherItem.toLowerCase() === item.toLowerCase()) === index
                        );
                        
                        return uniqueItems.length > 0 ? (
                          <>
                            <h3 className="text-orange-400 text-lg font-bold mb-2">Skills & Technologies</h3>
                            <div className="flex flex-wrap gap-2 mb-6">
                              {uniqueItems.map((item: string, idx: number) => (                                <span key={idx} className="border border-orange-500 text-orange-300 px-4 py-1 rounded-full text-sm font-medium bg-transparent">
                                  {item}
                                </span>
                              ))}
                            </div>                          </>
                        ) : null;                      })()}
                      
                      {job?.description && (
                        <>
                          <h3 className="text-orange-400 text-lg font-bold mb-2">Description</h3>
                          <p className="text-gray-200 mb-6 whitespace-pre-wrap">{job.description}</p>
                        </>
                      )}
                    </div>{/* Application button */}
                    <div className="mt-8 flex justify-center">
                      {job?.applicationLink ? (
                        <a
                          href={job.applicationLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 rounded-lg text-lg font-semibold shadow-md transition"
                        >
                          Apply for this Job
                        </a>
                      ) : (
                        <button
                          onClick={() => router.push(`/jobs/apply/${jobId}`)}
                          className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 rounded-lg text-lg font-semibold shadow-md"
                        >
                          Apply for this Job
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>          </div>
        </div>
      </div>
    </Layout>
  );
}
