"use client";


import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Layout from "../../../components/Layout";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../../lib/firebase";
import { Learn2Earn } from "../../../types/learn2earn";
import { formatDate } from "../../../utils/formatDate";
import TaskCard from "../../../components/learn2earn/TaskCard";
import ParticipationForm from "../../../components/learn2earn/ParticipationForm";

// Correct module export
export default function LearnToEarnDetail() {
  const params = useParams();
  const [learn2earn, setLearn2Earn] = useState<Learn2Earn | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTaskIndex, setActiveTaskIndex] = useState(0);

  useEffect(() => {
    const fetchLearn2Earn = async () => {
      try {
        if (!params.id) {
          throw new Error("No ID provided");
        }

        const id = Array.isArray(params.id) ? params.id[0] : params.id;
        
        const docRef = doc(db, "learn2earn", id);
        const docSnap = await getDoc(docRef);

        if (!docSnap.exists()) {
          throw new Error("Learn2Earn opportunity not found");
        }

        const data = {
          id: docSnap.id,
          ...docSnap.data()
        } as Learn2Earn;

        setLearn2Earn(data);
      } catch (err: any) {
        console.error("Error fetching learn2earn:", err);
        setError(err.message || "Failed to load data");
      } finally {
        setLoading(false);
      }
    };

    fetchLearn2Earn();
  }, [params.id]);

  if (loading) {
    return (
      <Layout>
        <div className="min-h-screen bg-gradient-to-b from-black to-orange-500 py-12 px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto">
            <div className="animate-pulse bg-black/30 rounded-lg p-8">
              <div className="h-8 bg-gray-700 rounded mb-6 w-3/4"></div>
              <div className="h-4 bg-gray-700 rounded mb-4 w-full"></div>
              <div className="h-4 bg-gray-700 rounded mb-4 w-5/6"></div>
              <div className="h-4 bg-gray-700 rounded mb-4 w-4/6"></div>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  if (error || !learn2earn) {
    return (
      <Layout>
        <div className="min-h-screen bg-gradient-to-b from-black to-orange-500 py-12 px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto bg-black/30 rounded-lg p-8">
            <h1 className="text-2xl font-bold text-red-500 mb-4">Error</h1>
            <p className="text-white">{error || "Failed to load data"}</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-b from-black to-orange-500 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          {/* Header Section */}
          <div className="bg-black/30 rounded-lg p-8 mb-8">
            <h1 className="text-3xl font-bold text-orange-500 mb-2">{learn2earn.title}</h1>
            <div className="flex flex-wrap gap-4 mb-4">
              <span className="bg-orange-500/20 text-orange-300 px-3 py-1 rounded-full text-sm">
                Reward: {learn2earn.tokenPerParticipant} {learn2earn.tokenSymbol}
              </span>
              <span className="bg-green-500/20 text-green-300 px-3 py-1 rounded-full text-sm">
                {learn2earn.status}
              </span>
              <span className="bg-blue-500/20 text-blue-300 px-3 py-1 rounded-full text-sm">
                Network: {learn2earn.network}
              </span>
            </div>
            <p className="text-gray-300 mb-6">{learn2earn.description}</p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-400">Start Date: <span className="text-white">{formatDate(learn2earn.startDate)}</span></p>
                <p className="text-gray-400">End Date: <span className="text-white">{formatDate(learn2earn.endDate)}</span></p>
              </div>
              <div>
                <p className="text-gray-400">Total Participants: <span className="text-white">{learn2earn.totalParticipants || 0}</span></p>
                {learn2earn.maxParticipants && (
                  <p className="text-gray-400">Max Participants: <span className="text-white">{learn2earn.maxParticipants}</span></p>
                )}
              </div>
            </div>

            {/* Social Links */}
            {learn2earn.socialLinks && Object.values(learn2earn.socialLinks).some(link => !!link) && (
              <div className="mt-6">
                <h3 className="text-lg font-medium text-orange-300 mb-2">Connect with Us</h3>
                <div className="flex gap-3">
                  {learn2earn.socialLinks.website && (
                    <a href={learn2earn.socialLinks.website} target="_blank" rel="noopener noreferrer" title="Visit Website"
                      className="bg-gray-800 hover:bg-gray-700 p-2 rounded-full">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                      </svg>
                    </a>
                  )}
                  {learn2earn.socialLinks.twitter && (
                    <a href={learn2earn.socialLinks.twitter} target="_blank" rel="noopener noreferrer" title="Visit Twitter"
                      className="bg-blue-600 hover:bg-blue-700 p-2 rounded-full">
                      <svg className="h-5 w-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84"></path>
                      </svg>
                    </a>
                  )}
                  {learn2earn.socialLinks.telegram && (
                    <a href={learn2earn.socialLinks.telegram} target="_blank" rel="noopener noreferrer"
                      className="bg-blue-500 hover:bg-blue-600 p-2 rounded-full" title="Visit Telegram">
                      <svg className="h-5 w-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.96 6.502-1.356 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.244-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"></path>
                      </svg>
                    </a>
                  )}
                  {learn2earn.socialLinks.discord && (
                    <a href={learn2earn.socialLinks.discord} target="_blank" rel="noopener noreferrer" title="Visit Discord"
                      className="bg-indigo-600 hover:bg-indigo-700 p-2 rounded-full">
                      <svg className="h-5 w-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.608 1.2495-1.8447-.2762-3.6847-.2762-5.4876 0-.1634-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0786-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276c-.5979.3428-1.2193.6447-1.8721.8922a.076.076 0 00-.0416.1057c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.0777.0777 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189Z"></path>
                      </svg>
                    </a>
                  )}
                </div>
              </div>
            )}
          </div>
          
          {/* Tasks Section */}
          <div className="bg-black/30 rounded-lg p-8 mb-8">
            <h2 className="text-2xl font-bold text-orange-500 mb-6">Learning Tasks</h2>
            
            {learn2earn.tasks.length > 0 ? (
              <div>
                {/* Task Navigation */}
                <div className="flex overflow-x-auto pb-2 mb-6">
                  {learn2earn.tasks.map((task, index) => (
                    <button
                      key={task.id}
                      className={`px-4 py-2 rounded-lg mr-2 whitespace-nowrap ${
                        index === activeTaskIndex 
                          ? 'bg-orange-500 text-white' 
                          : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                      }`}
                      onClick={() => setActiveTaskIndex(index)}
                    >
                      Task {index + 1}: {task.title}
                    </button>
                  ))}
                </div>
                
                {/* Active Task */}
                {learn2earn.tasks.length > activeTaskIndex && (
                  <TaskCard task={learn2earn.tasks[activeTaskIndex]} />
                )}
              </div>
            ) : (
              <p className="text-gray-400">No tasks available for this opportunity.</p>
            )}
          </div>
          
          {/* Participation Form */}
          <div className="bg-black/30 rounded-lg p-8">
            <h2 className="text-2xl font-bold text-orange-500 mb-6">Participate & Earn</h2>
            <ParticipationForm learn2earnId={learn2earn.id} tokenSymbol={learn2earn.tokenSymbol} />
          </div>
        </div>
      </div>
    </Layout>
  );
}