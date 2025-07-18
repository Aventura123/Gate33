"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import Layout from "../../components/Layout";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { Learn2Earn } from "../../types/learn2earn";
import { formatDate } from "../../utils/formatDate";
import WalletButton from '../../components/WalletButton';
import { useAuth } from '../../components/AuthProvider';

export default function Learn2EarnPage() {
  const [learn2earns, setLearn2Earns] = useState<Learn2Earn[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('all');
  const { user, userRole } = useAuth();

  useEffect(() => {
    const fetchLearn2Earns = async () => {
      try {
        setLoading(true);
        
        // Create a reference to the collection
        const learn2earnCollection = collection(db, "learn2earn");
        
        // Create different queries based on filter
        let querySnapshot;
        if (filter !== 'all') {
          const filteredQuery = query(learn2earnCollection, where("status", "==", filter));
          querySnapshot = await getDocs(filteredQuery);
        } else {
          // Only show active and completed, not draft
          const filteredQuery = query(learn2earnCollection, where("status", "in", ["active", "completed"]));
          querySnapshot = await getDocs(filteredQuery);
        }
        
        // Map the data with correct typing
        const fetchedLearn2Earns = querySnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            // Ensure all required properties are present with the correct types
            title: data.title || "",
            description: data.description || "",
            tokenSymbol: data.tokenSymbol || "",
            tokenPerParticipant: data.tokenPerParticipant || 0,
            status: data.status || "active",
            network: data.network || "",
            tasks: data.tasks || [],
            createdAt: data.createdAt || null,
            endDate: data.endDate || null,
          } as Learn2Earn;
        });
        
        // Sort by date, newest first - with safer type handling
        fetchedLearn2Earns.sort((a, b) => {
          let dateA = 0;
          let dateB = 0;
          
          if (a.createdAt) {
            if (typeof a.createdAt === 'object' && 'toDate' in a.createdAt && typeof a.createdAt.toDate === 'function') {
              dateA = a.createdAt.toDate().getTime();
            } else if (a.createdAt instanceof Date) {
              dateA = a.createdAt.getTime();
            } else if (typeof a.createdAt === 'string') {
              dateA = new Date(a.createdAt).getTime();
            }
          }
          
          if (b.createdAt) {
            if (typeof b.createdAt === 'object' && 'toDate' in b.createdAt && typeof b.createdAt.toDate === 'function') {
              dateB = b.createdAt.toDate().getTime();
            } else if (b.createdAt instanceof Date) {
              dateB = b.createdAt.getTime();
            } else if (typeof b.createdAt === 'string') {
              dateB = new Date(b.createdAt).getTime();
            }
          }
          
          return dateB - dateA;
        });
        
        setLearn2Earns(fetchedLearn2Earns);
      } catch (err: any) {
        console.error("Error fetching learn2earn opportunities:", err);
        setError(err.message || "Failed to load data");
      } finally {
        setLoading(false);
      }
    };
    
    fetchLearn2Earns();
  }, [filter]);
  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-b from-black to-orange-900 pt-16 md:pt-20 pb-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-white mb-4">Learn2Earn Opportunities</h1>
            <p className="text-xl text-gray-300">Complete educational tasks and earn crypto rewards</p>
          </div>

          {/* WalletButton for connection (hidden, but can be triggered programmatically) */}
          <div className="hidden">
            <WalletButton />
          </div>

          {/* Filters */}
          <div className="flex justify-center mb-8">
            <div className="inline-flex rounded-md shadow-sm" role="group">
              <button
                onClick={() => setFilter('all')}
                className={`px-4 py-2 text-sm font-medium rounded-l-lg ${
                  filter === 'all' 
                    ? 'bg-orange-500 text-white' 
                    : 'bg-black/50 text-gray-300 hover:bg-black/70'
                }`}
                aria-label="Show all opportunities"
              >
                All
              </button>
              <button
                onClick={() => setFilter('active')}
                className={`px-4 py-2 text-sm font-medium ${
                  filter === 'active' 
                    ? 'bg-orange-500 text-white' 
                    : 'bg-black/50 text-gray-300 hover:bg-black/70'
                }`}
                aria-label="Show active opportunities"
              >
                Active
              </button>
              <button
                onClick={() => setFilter('completed')}
                className={`px-4 py-2 text-sm font-medium rounded-r-lg ${
                  filter === 'completed' 
                    ? 'bg-orange-500 text-white' 
                    : 'bg-black/50 text-gray-300 hover:bg-black/70'
                }`}
                aria-label="Show completed opportunities"
              >
                Completed
              </button>
            </div>
          </div>
          
          {/* Loading State */}
          {loading && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((item) => (
                <div key={item} className="bg-black/30 rounded-lg p-6 animate-pulse">
                  <div className="h-6 bg-gray-700 rounded w-3/4 mb-4"></div>
                  <div className="h-4 bg-gray-700 rounded w-full mb-2"></div>
                  <div className="h-4 bg-gray-700 rounded w-5/6 mb-4"></div>
                  <div className="flex space-x-2 mb-4">
                    <div className="h-8 w-16 bg-gray-700 rounded-full"></div>
                    <div className="h-8 w-16 bg-gray-700 rounded-full"></div>
                  </div>
                  <div className="h-10 bg-gray-700 rounded"></div>
                </div>
              ))}
            </div>
          )}
          
          {/* Error State */}
          {error && !loading && (
            <div className="bg-red-500/20 border border-red-500 text-red-500 p-4 rounded-lg text-center">
              {error}
            </div>
          )}
          
          {/* Empty State */}
          {!loading && !error && learn2earns.length === 0 && (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">🔍</div>
              <h3 className="text-2xl font-medium text-white mb-2">No learn2earn opportunities found</h3>
              <p className="text-gray-400">
                {filter !== 'all' 
                  ? `There are no ${filter} learn2earn opportunities at the moment.` 
                  : 'There are no learn2earn opportunities at the moment.'}
              </p>
            </div>
          )}
          
          {/* Learn2Earn Cards */}
          {!loading && !error && learn2earns.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {learn2earns.map((item) => {
                const isLoggedInAsSeeker = user && userRole === 'seeker';
                
                if (isLoggedInAsSeeker) {
                  return (
                    <Link 
                      key={item.id} 
                      href={`/learn2earn/${item.id}`}
                      className="bg-black/30 rounded-lg p-6 transition-all hover:bg-black/40 hover:translate-y-[-4px] hover:shadow-lg"
                      title={`View details of ${item.title}`}
                      aria-label={`Learn2Earn opportunity: ${item.title}`}
                    >
                      <h3 className="text-xl font-semibold text-orange-400 mb-2">{item.title}</h3>
                      <p className="text-gray-300 mb-4 text-sm line-clamp-2">{item.description}</p>
                      
                      <div className="flex flex-wrap gap-2 mb-4">
                        <span className="bg-orange-500/20 text-orange-300 px-3 py-1 rounded-full text-xs">
                          {item.tokenPerParticipant} {item.tokenSymbol}
                        </span>
                        {item.status === 'active' ? (
                          <span className="bg-green-500/20 text-green-300 px-3 py-1 rounded-full text-xs">Active</span>
                        ) : (
                          <span className="bg-gray-500/20 text-gray-300 px-3 py-1 rounded-full text-xs">Completed</span>
                        )}
                        {item.network && (
                          <span className="bg-blue-500/20 text-blue-300 px-3 py-1 rounded-full text-xs">
                            {item.network}
                          </span>
                        )}
                      </div>
                      
                      <div className="flex justify-between items-center text-xs text-gray-400 mb-4">
                        <div>
                          <p>Ends: {formatDate(item.endDate)}</p>
                        </div>
                        <div>
                          <p>{item.tasks?.length || 0} Tasks</p>
                        </div>
                      </div>
                      
                      <div className="w-full bg-orange-500 hover:bg-orange-600 text-white py-2 rounded-lg text-sm font-medium transition text-center">
                        View Details
                      </div>
                    </Link>
                  );
                } else {
                  return (
                    <div 
                      key={item.id} 
                      className="bg-black/30 rounded-lg p-6 relative group cursor-not-allowed opacity-75"
                      title={user ? "Only seekers can participate in Learn2Earn" : "Please login as a seeker to participate"}
                    >
                      <h3 className="text-xl font-semibold text-orange-400 mb-2">{item.title}</h3>
                      <p className="text-gray-300 mb-4 text-sm line-clamp-2">{item.description}</p>
                      
                      <div className="flex flex-wrap gap-2 mb-4">
                        <span className="bg-orange-500/20 text-orange-300 px-3 py-1 rounded-full text-xs">
                          {item.tokenPerParticipant} {item.tokenSymbol}
                        </span>
                        {item.status === 'active' ? (
                          <span className="bg-green-500/20 text-green-300 px-3 py-1 rounded-full text-xs">Active</span>
                        ) : (
                          <span className="bg-gray-500/20 text-gray-300 px-3 py-1 rounded-full text-xs">Completed</span>
                        )}
                        {item.network && (
                          <span className="bg-blue-500/20 text-blue-300 px-3 py-1 rounded-full text-xs">
                            {item.network}
                          </span>
                        )}
                      </div>
                      
                      <div className="flex justify-between items-center text-xs text-gray-400 mb-4">
                        <div>
                          <p>Ends: {formatDate(item.endDate)}</p>
                        </div>
                        <div>
                          <p>{item.tasks?.length || 0} Tasks</p>
                        </div>
                      </div>
                      
                      <div className="w-full bg-gray-600 text-gray-300 py-2 rounded-lg text-sm font-medium text-center cursor-not-allowed">
                        {user ? "Seeker Access Required" : "Login Required"}
                      </div>
                      
                      {/* Tooltip */}
                      <div className="absolute inset-0 bg-black/60 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
                        <div className="bg-white text-black px-4 py-2 rounded-lg text-sm font-medium text-center">
                          {user 
                            ? "Only seekers can participate in Learn2Earn opportunities" 
                            : "Please login as a seeker to participate in Learn2Earn"
                          }
                        </div>
                      </div>
                    </div>
                  );
                }
              })}
            </div>
          )}
          
          {/* Informative Card about Learn2Earn - Redesigned in English and more compact */}
          <div className="mt-16 bg-gradient-to-br from-black/80 to-orange-900/40 border-2 border-orange-500 rounded-lg shadow-lg shadow-orange-500/20">
            <div className="relative p-6">
              {/* Decorative element */}
              <div className="absolute top-0 right-0 w-24 h-24 bg-orange-500/10 rounded-full -mr-8 -mt-8 z-0"></div>
              
              <div className="relative z-10">
                <h2 className="text-2xl font-bold text-orange-400 mb-4 text-center">What is Learn2Earn?</h2>
                
                <div className="flex flex-col md:flex-row gap-4 items-center">
                  <div className="md:w-1/5 text-center">
                    <div className="inline-block p-4 bg-orange-500/20 rounded-full">
                      <span className="text-5xl">🎓</span>
                    </div>
                  </div>
                  
                  <div className="md:w-4/5 text-gray-200">
                    <p className="mb-3 text-base">
                      Learn2Earn is an interactive educational platform where you can learn about blockchain and crypto while earning token rewards.
                    </p>
                    <p className="text-base">
                      Complete modules, quizzes and tasks from project teams to gain knowledge about blockchain technology and receive cryptocurrency tokens as rewards.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}