"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../../lib/firebase";
import { Learn2Earn, Learn2EarnTask } from "../../../types/learn2earn";
import Layout from "../../../components/Layout";
import TaskCard from "../../../components/learn2earn/TaskCard";
import ParticipationForm from "../../../components/learn2earn/ParticipationForm";
import { formatDate } from "../../../utils/formatDate";
import Link from "next/link";

export default function Learn2EarnDetailPage() {
  const params = useParams();
  const id = params?.id as string;

  const [learn2Earn, setLearn2Earn] = useState<Learn2Earn | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentTaskIndex, setCurrentTaskIndex] = useState(0);

  useEffect(() => {
    const fetchLearn2Earn = async () => {
      if (!id) return;

      try {
        setLoading(true);
        setError(null);

        const docRef = doc(db, "learn2earn", id);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data() as Omit<Learn2Earn, "id">;
          setLearn2Earn({
            id: docSnap.id,
            ...data,
          });
        } else {
          setError("Learn2Earn opportunity not found");
        }
      } catch (err: any) {
        console.error("Error fetching learn2earn:", err);
        setError(err.message || "Failed to load data");
      } finally {
        setLoading(false);
      }
    };

    fetchLearn2Earn();
  }, [id]);

  const handleNextTask = () => {
    if (learn2Earn && currentTaskIndex < learn2Earn.tasks.length - 1) {
      setCurrentTaskIndex(currentTaskIndex + 1);
    }
  };

  const handlePrevTask = () => {
    if (currentTaskIndex > 0) {
      setCurrentTaskIndex(currentTaskIndex - 1);
    }
  };

  const isLastTask = learn2Earn && currentTaskIndex === learn2Earn.tasks.length - 1;

  // Render loading state
  if (loading) {
    return (
      <Layout>
        <div className="min-h-screen bg-gradient-to-b from-black to-orange-900 py-12 px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto">
            <div className="animate-pulse">
              <div className="h-8 bg-gray-700 rounded w-3/4 mb-4"></div>
              <div className="h-4 bg-gray-700 rounded w-full mb-2"></div>
              <div className="h-4 bg-gray-700 rounded w-5/6 mb-4"></div>
              <div className="h-64 bg-gray-800 rounded-lg mb-6"></div>
              <div className="h-12 bg-gray-700 rounded"></div>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  // Render error state
  if (error || !learn2Earn) {
    return (
      <Layout>
        <div className="min-h-screen bg-gradient-to-b from-black to-orange-900 py-12 px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto text-center">
            <div className="bg-red-500/20 border border-red-500 text-red-500 p-4 rounded-lg mb-6">
              {error || "Learn2Earn opportunity not found"}
            </div>
            <Link
              href="/learn2earn"
              className="bg-orange-500 hover:bg-orange-600 text-white py-2 px-6 rounded-lg inline-block"
            >
              Back to Learn2Earn
            </Link>
          </div>
        </div>
      </Layout>
    );
  }

  const currentTask = learn2Earn.tasks[currentTaskIndex];

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-b from-black to-orange-900 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          {/* Back button */}
          <div className="mb-6">
            <Link
              href="/learn2earn"
              className="inline-flex items-center text-orange-400 hover:text-orange-300"
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
              Back to Learn2Earn
            </Link>
          </div>

          {/* Header section */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-white mb-4">{learn2Earn.title}</h1>
            <p className="text-gray-300 mb-6">{learn2Earn.description}</p>

            {/* Badges */}
            <div className="flex flex-wrap gap-2 mb-4">
              <span className="bg-orange-500/20 text-orange-300 px-3 py-1 rounded-full text-xs">
                {learn2Earn.tokenPerParticipant} {learn2Earn.tokenSymbol}
              </span>
              {learn2Earn.status === "active" ? (
                <span className="bg-green-500/20 text-green-300 px-3 py-1 rounded-full text-xs">
                  Active
                </span>
              ) : (
                <span className="bg-gray-500/20 text-gray-300 px-3 py-1 rounded-full text-xs">
                  {learn2Earn.status}
                </span>
              )}
              {learn2Earn.network && (
                <span className="bg-blue-500/20 text-blue-300 px-3 py-1 rounded-full text-xs">
                  {learn2Earn.network}
                </span>
              )}
            </div>

            {/* Info grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-black/20 p-4 rounded-lg">
                <h4 className="text-gray-400 text-sm mb-1">Start Date</h4>
                <p className="text-white">{formatDate(learn2Earn.startDate)}</p>
              </div>
              <div className="bg-black/20 p-4 rounded-lg">
                <h4 className="text-gray-400 text-sm mb-1">End Date</h4>
                <p className="text-white">{formatDate(learn2Earn.endDate)}</p>
              </div>
              <div className="bg-black/20 p-4 rounded-lg">
                <h4 className="text-gray-400 text-sm mb-1">Participants</h4>
                <p className="text-white">
                  {learn2Earn.totalParticipants || 0}
                  {learn2Earn.maxParticipants ? ` / ${learn2Earn.maxParticipants}` : ""}
                </p>
              </div>
            </div>

            {/* Social links if available */}
            {learn2Earn.socialLinks && Object.values(learn2Earn.socialLinks).some(Boolean) && (
              <div className="flex space-x-4 mb-6">
                {learn2Earn.socialLinks.website && (
                  <a
                    href={learn2Earn.socialLinks.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-orange-400 hover:text-orange-300"
                  >
                    Website
                  </a>
                )}
                {learn2Earn.socialLinks.twitter && (
                  <a
                    href={learn2Earn.socialLinks.twitter}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-orange-400 hover:text-orange-300"
                  >
                    Twitter
                  </a>
                )}
                {learn2Earn.socialLinks.discord && (
                  <a
                    href={learn2Earn.socialLinks.discord}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-orange-400 hover:text-orange-300"
                  >
                    Discord
                  </a>
                )}
                {learn2Earn.socialLinks.telegram && (
                  <a
                    href={learn2Earn.socialLinks.telegram}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-orange-400 hover:text-orange-300"
                  >
                    Telegram
                  </a>
                )}
              </div>
            )}
          </div>

          {/* Tasks section */}
          <div className="mb-10">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-semibold text-white">
                {currentTaskIndex + 1} / {learn2Earn.tasks.length}: {currentTask?.title}
              </h2>
              <div className="flex space-x-2">
                <button
                  onClick={handlePrevTask}
                  disabled={currentTaskIndex === 0}
                  className={`p-2 rounded-lg ${
                    currentTaskIndex === 0
                      ? "bg-gray-700 text-gray-500 cursor-not-allowed"
                      : "bg-gray-700 text-white hover:bg-gray-600"
                  }`}
                  aria-label="Previous task"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5"
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
                </button>
                <button
                  onClick={handleNextTask}
                  disabled={currentTaskIndex === learn2Earn.tasks.length - 1}
                  className={`p-2 rounded-lg ${
                    currentTaskIndex === learn2Earn.tasks.length - 1
                      ? "bg-gray-700 text-gray-500 cursor-not-allowed"
                      : "bg-gray-700 text-white hover:bg-gray-600"
                  }`}
                  aria-label="Next task"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5"
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
                </button>
              </div>
            </div>

            {/* Task card component */}
            <TaskCard task={currentTask} />

            {/* Task navigation pills */}
            <div className="flex justify-center mt-6 space-x-2 overflow-x-auto pb-2">
              {learn2Earn.tasks.map((task, index) => (
                <button
                  key={task.id}
                  onClick={() => setCurrentTaskIndex(index)}
                  className={`w-3 h-3 rounded-full ${
                    index === currentTaskIndex ? "bg-orange-500" : "bg-gray-600"
                  }`}
                  aria-label={`Go to task ${index + 1}`}
                ></button>
              ))}
            </div>
          </div>

          {/* Participation form */}
          <div className="bg-black/30 rounded-lg p-6">
            <h2 className="text-2xl font-semibold text-white mb-4">
              Complete & Claim Rewards
            </h2>
            <ParticipationForm 
              learn2earnId={learn2Earn.id} 
              tokenSymbol={learn2Earn.tokenSymbol}
              network={learn2Earn.network} 
            />
          </div>
        </div>
      </div>
    </Layout>
  );
}