import React, { useEffect, useState } from 'react';
import { db } from '../../lib/firebase';
import { collection, query, where, getDocs, limit, orderBy } from 'firebase/firestore';
import Link from 'next/link';

interface RelatedJobProps {
  currentJobId: string;
  maxJobs?: number;
}

export default function RelatedJobs({ currentJobId, maxJobs = 5 }: RelatedJobProps) {
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    const fetchRelatedJobs = async () => {
      try {
        // Primeiro buscamos o job atual para obter suas tags/categorias
        const jobRef = collection(db, "jobs");
        const jobsQuery = query(
          jobRef,
          where("status", "==", "active"),
          orderBy("createdAt", "desc"),
          limit(maxJobs + 1) // um a mais para caso o job atual esteja entre eles
        );

        const querySnapshot = await getDocs(jobsQuery);
        const jobsList = querySnapshot.docs          .map(doc => ({ id: doc.id, ...doc.data() }))
          .filter(job => job.id !== currentJobId); // Remove o job atual        
        setJobs(jobsList.slice(0, maxJobs)); // Limita ao máximo de jobs especificado
      } catch (error) {
        console.error("Error fetching related jobs:", error);
        setLoadError("Failed to load similar jobs");
      } finally {
        setLoading(false);
      }
    };

    fetchRelatedJobs();
  }, [currentJobId, maxJobs]);
  if (loading) {
    return (
      <div className="space-y-3">
        {[...Array(3)].map((_, idx) => (
          <div key={idx} className="animate-pulse">
            <div className="h-4 bg-black/50 rounded mb-2"></div>
            <div className="h-3 bg-black/40 rounded w-3/4"></div>
          </div>
        ))}
      </div>
    );
  }
  
  if (loadError) {
    return (
      <div className="text-orange-400/70 text-sm italic">
        {loadError}
      </div>
    );
  }
  if (jobs.length === 0) {
    return (
      <div className="text-gray-400 italic text-sm py-1">
        No similar jobs found at the moment.
      </div>
    );
  }
  return (
    <div className="space-y-3">
      {jobs.map((job) => (
        <Link href={`/jobs/${job.id}`} key={job.id} className="block">
          <div className="bg-black/40 hover:bg-black/60 transition-colors p-3 rounded-md border border-orange-500/20 mb-3">
            <h4 className="text-orange-300 font-medium text-sm mb-1">{job.title}</h4>
            <p className="text-gray-400 text-xs mb-2">{job.companyName}</p>
            <div className="flex flex-wrap gap-2">
              {job.jobType && (
                <span className="bg-gray-900/60 text-gray-300 text-xs px-2 py-0.5 rounded-full">
                  {job.jobType}
                </span>
              )}
              {(job.salary || job.salaryRange) && (
                <span className="bg-green-900/30 text-green-300 text-xs px-2 py-0.5 rounded-full">
                  {job.salary || job.salaryRange}
                </span>
              )}
            </div>
          </div>
        </Link>
      ))}
      
      <Link href="/jobs" className="text-orange-400 hover:text-orange-300 text-sm font-medium flex items-center mt-4">
        <span>View all jobs</span>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-4 w-4 ml-1"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 5l7 7-7 7"
          />
        </svg>
      </Link>
    </div>
  );
}
