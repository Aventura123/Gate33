import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { collection, getDocs, query, where, limit, orderBy } from 'firebase/firestore';
import { db } from '../../lib/firebase';

interface FeaturedJob {
  id: string;
  title: string;
  companyName: string;
  description: string;
  category: string;
  featured: boolean;
  highlight?: boolean;
}

// FeaturedJob já tem tudo o que precisamos

export default function AdsSidebar({ currentJobId }: { currentJobId?: string }) {
  const [featuredJobs, setFeaturedJobs] = useState<FeaturedJob[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFeaturedJobs = async () => {
      try {
        const jobsQuery = query(
          collection(db, "jobs"),
          where("featured", "==", true),
          orderBy("createdAt", "desc"),
          limit(5)
        );
        
        const querySnapshot = await getDocs(jobsQuery);
        const jobs = querySnapshot.docs
          .map(doc => ({ 
            id: doc.id,
            title: doc.data().title || doc.data().jobTitle,
            companyName: doc.data().companyName,
            description: doc.data().description || doc.data().jobDescription?.substring(0, 100) + '...',
            category: doc.data().category,
            featured: true,
            highlight: Math.random() > 0.5 // Random highlight for visual variety
          }))
          .filter(job => job.id !== currentJobId); // Exclude current job if we're on a job page
        
        setFeaturedJobs(jobs);
      } catch (error) {
        console.error("Error fetching featured jobs:", error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchFeaturedJobs();
  }, [currentJobId]);
  // Agora usamos apenas os jobs em destaque reais do banco de dados
  const displayItems = featuredJobs;return (
    <aside className="sticky top-24">
      <div className="bg-black/80 rounded-lg overflow-hidden border-t-2 border-orange-500/70">
        <div className="bg-gradient-to-r from-orange-900/70 to-black p-3 border-b border-orange-500/30">
          <h3 className="text-orange-400 font-bold text-lg">Featured Jobs</h3>
        </div>
        
        <div className="p-4">          {loading ? (
            <div className="flex justify-center p-4">
              <div className="w-6 h-6 border-2 border-orange-500 rounded-full animate-spin border-t-transparent"></div>
            </div>
          ) : displayItems.length === 0 ? (
            <div className="text-center py-4">
              <p className="text-gray-400 text-sm">Nenhuma vaga em destaque disponível no momento.</p>
            </div>
          ) : (
            <ul className="space-y-4">
              {displayItems.map(item => (<li key={item.id} className={`rounded-md overflow-hidden ${item.highlight ? 'border border-orange-500/30' : 'border border-gray-800'}`}>
                  <Link 
                    href={`/jobs/apply/${item.id}`}
                    className="block hover:bg-black/60 transition-colors"
                  >
                    <div className={`p-3 ${item.highlight ? 'bg-black/60' : 'bg-black/40'}`}>
                      <div className="flex items-center justify-between">
                        <span className="text-orange-300 font-medium text-sm hover:text-orange-200">
                          {item.title}
                        </span>
                        <span className="bg-orange-900/40 text-orange-300 text-xs px-2 py-0.5 rounded-full">
                          {item.category || 'Job'}
                        </span>
                      </div>
                      <p className="text-gray-400 text-xs mt-1">{item.companyName}</p>
                      <p className="text-gray-400 text-xs mt-2 line-clamp-2">{item.description}</p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </aside>
  );
}
