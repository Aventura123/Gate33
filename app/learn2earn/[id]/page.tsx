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
import "../../../styles/learn2earn.css";

enum CardStep {
  OVERVIEW = 0,
  CONTENT = 1,
  QUIZ = 2,
  THANK_YOU = 3,
  CLAIM = 4
}

export default function Learn2EarnDetailPage() {
  const params = useParams();
  const id = params?.id as string;

  const [learn2Earn, setLearn2Earn] = useState<Learn2Earn | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // New state for sequential card flow
  const [currentStep, setCurrentStep] = useState<CardStep>(CardStep.OVERVIEW);
  const [currentContentIndex, setCurrentContentIndex] = useState(0);
  const [currentQuizIndex, setCurrentQuizIndex] = useState(0);
  const [quizAnswers, setQuizAnswers] = useState<{[key: string]: number}>({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [allCorrect, setAllCorrect] = useState(false);
  const [isRegistered, setIsRegistered] = useState(false);

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

  // Function to separate content and quiz tasks
  const getContentTasks = () => {
    return learn2Earn?.tasks.filter(task => task.type === 'content') || [];
  };

  const getQuizTasks = () => {
    return learn2Earn?.tasks.filter(task => task.type === 'question') || [];
  };

  // Navigation functions
  const handleNextStep = () => {
    if (currentStep < CardStep.CLAIM) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevStep = () => {
    if (currentStep > CardStep.OVERVIEW) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleNextContent = () => {
    const contentTasks = getContentTasks();
    if (currentContentIndex < contentTasks.length - 1) {
      setCurrentContentIndex(currentContentIndex + 1);
    } else {
      // Move to quiz step if we're at the last content
      setCurrentStep(CardStep.QUIZ);
    }
  };

  const handlePrevContent = () => {
    if (currentContentIndex > 0) {
      setCurrentContentIndex(currentContentIndex - 1);
    } else {
      // Go back to overview if we're at the first content
      setCurrentStep(CardStep.OVERVIEW);
    }
  };

  const handleNextQuiz = () => {
    const quizTasks = getQuizTasks();
    if (currentQuizIndex < quizTasks.length - 1) {
      setCurrentQuizIndex(currentQuizIndex + 1);
    } else if (!quizSubmitted) {
      // Submit answers if we're at the last question
      handleSubmitQuiz();
    }
  };

  const handlePrevQuiz = () => {
    if (currentQuizIndex > 0) {
      setCurrentQuizIndex(currentQuizIndex - 1);
    } else {
      // Go back to content if we're at the first quiz
      const contentTasks = getContentTasks();
      if (contentTasks.length > 0) {
        setCurrentStep(CardStep.CONTENT);
        setCurrentContentIndex(contentTasks.length - 1);
      } else {
        setCurrentStep(CardStep.OVERVIEW);
      }
    }
  };

  const handleAnswerSelect = (questionId: string, optionIndex: number) => {
    setQuizAnswers({
      ...quizAnswers,
      [questionId]: optionIndex
    });
  };

  const handleSubmitQuiz = () => {
    setQuizSubmitted(true);
    
    const quizTasks = getQuizTasks();
    const allAnswersCorrect = quizTasks.every(task => 
      quizAnswers[task.id] === task.correctOption
    );
    
    setAllCorrect(allAnswersCorrect);
    
    if (allAnswersCorrect) {
      // If all correct, proceed to thank you card
      setCurrentStep(CardStep.THANK_YOU);
    }
  };

  const handleRestartQuiz = () => {
    setQuizAnswers({});
    setQuizSubmitted(false);
    setCurrentQuizIndex(0);
  };

  const handleRegistrationComplete = () => {
    setIsRegistered(true);
    setCurrentStep(CardStep.CLAIM);
  };

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

  // Get separated tasks
  const contentTasks = getContentTasks();
  const quizTasks = getQuizTasks();
  const currentContent = contentTasks[currentContentIndex] || null;
  const currentQuiz = quizTasks[currentQuizIndex] || null;

  // Render content based on current step
  const renderStepContent = () => {
    switch (currentStep) {
      case CardStep.OVERVIEW:
        return (
          <div className="bg-black/20 rounded-lg p-6 border border-gray-800">
            <h2 className="text-2xl font-bold text-orange-300 mb-4">{learn2Earn.title}</h2>
            <p className="text-gray-300 mb-6">{learn2Earn.description}</p>

            {/* Summary box */}
            <div className="bg-black/30 p-4 rounded-lg mb-6">
              <h3 className="text-lg font-medium text-white mb-3">Activity Summary</h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-gray-400">Content Sections:</span>
                  <span className="text-white ml-2">{contentTasks.length}</span>
                </div>
                <div>
                  <span className="text-gray-400">Quiz Questions:</span>
                  <span className="text-white ml-2">{quizTasks.length}</span>
                </div>
                <div>
                  <span className="text-gray-400">Reward:</span>
                  <span className="text-white ml-2">
                    {learn2Earn.tokenPerParticipant} {learn2Earn.tokenSymbol}
                  </span>
                </div>
                <div>
                  <span className="text-gray-400">Network:</span>
                  <span className="text-white ml-2">{learn2Earn.network}</span>
                </div>
              </div>
            </div>

            <button
              onClick={handleNextStep}
              className="w-full bg-orange-500 hover:bg-orange-600 text-white font-medium py-3 px-4 rounded-lg"
            >
              Start Learning
            </button>
          </div>
        );

      case CardStep.CONTENT:
        return (
          <div className="bg-black/20 rounded-lg p-6 border border-gray-800">
            {currentContent ? (
              <>
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-bold text-orange-300">
                    {currentContentIndex + 1}/{contentTasks.length}: {currentContent.title}
                  </h2>
                  <span className="text-gray-400 text-sm">Content Section</span>
                </div>
                
                <TaskCard task={currentContent} isReadOnly />

                <div className="flex justify-between mt-6">
                  <button
                    onClick={handlePrevContent}
                    className="bg-gray-700 hover:bg-gray-600 text-white py-2 px-6 rounded-lg"
                  >
                    Back
                  </button>
                  <button
                    onClick={handleNextContent}
                    className="bg-orange-500 hover:bg-orange-600 text-white py-2 px-6 rounded-lg"
                  >
                    {currentContentIndex < contentTasks.length - 1 ? "Next Content" : "Start Quiz"}
                  </button>
                </div>
              </>
            ) : (
              <div className="text-center">
                <p className="text-gray-300 mb-4">No educational content available.</p>
                <div className="flex justify-center gap-4">
                  <button
                    onClick={() => setCurrentStep(CardStep.OVERVIEW)}
                    className="bg-gray-700 hover:bg-gray-600 text-white py-2 px-6 rounded-lg"
                  >
                    Back to Overview
                  </button>
                  <button
                    onClick={() => setCurrentStep(CardStep.QUIZ)}
                    className="bg-orange-500 hover:bg-orange-600 text-white py-2 px-6 rounded-lg"
                  >
                    Continue to Quiz
                  </button>
                </div>
              </div>
            )}
          </div>
        );

      case CardStep.QUIZ:
        return (
          <div className="bg-black/20 rounded-lg p-6 border border-gray-800">
            {quizTasks.length > 0 && currentQuiz ? (
              <>
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-bold text-orange-300">
                    Question {currentQuizIndex + 1}/{quizTasks.length}
                  </h2>
                  <span className="text-gray-400 text-sm">Quiz</span>
                </div>

                <div className="mb-6">
                  <h3 className="text-lg font-medium text-white mb-3">{currentQuiz.question}</h3>
                  
                  <div className="space-y-3">
                    {currentQuiz.options?.map((option, index) => (
                      <div 
                        key={index} 
                        className={`flex items-start p-3 rounded-lg border ${
                          quizSubmitted 
                            ? index === currentQuiz.correctOption
                              ? "border-green-500 bg-green-500/10"
                              : index === quizAnswers[currentQuiz.id]
                                ? "border-red-500 bg-red-500/10" 
                                : "border-gray-700"
                            : quizAnswers[currentQuiz.id] === index
                              ? "border-orange-500 bg-black/40"
                              : "border-gray-700 hover:border-gray-600 cursor-pointer"
                        }`}
                        onClick={() => !quizSubmitted && handleAnswerSelect(currentQuiz.id, index)}
                      >
                        <input
                          type="radio"
                          id={`option-${index}`}
                          name={`question-${currentQuiz.id}`}
                          checked={quizAnswers[currentQuiz.id] === index}
                          onChange={() => !quizSubmitted && handleAnswerSelect(currentQuiz.id, index)}
                          className="mr-3 mt-1"
                          disabled={quizSubmitted}
                        />
                        <label 
                          htmlFor={`option-${index}`}
                          className="text-gray-300 cursor-pointer flex-1"
                        >
                          {option}
                        </label>
                        
                        {quizSubmitted && (
                          <span>
                            {index === currentQuiz.correctOption && (
                              <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                              </svg>
                            )}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                  
                  {quizSubmitted && !allCorrect && (
                    <div className="mt-4 p-3 bg-red-500/20 border border-red-500 rounded-lg">
                      <p className="text-red-400">
                        Some answers are incorrect. Would you like to try again?
                      </p>
                    </div>
                  )}
                </div>

                <div className="flex justify-between">
                  {!quizSubmitted ? (
                    <>
                      <button
                        onClick={handlePrevQuiz}
                        className="bg-gray-700 hover:bg-gray-600 text-white py-2 px-6 rounded-lg"
                        disabled={currentQuizIndex === 0}
                      >
                        {currentQuizIndex === 0 && contentTasks.length > 0 ? "Back to Content" : "Previous Question"}
                      </button>
                      
                      <button
                        onClick={handleNextQuiz}
                        className="bg-orange-500 hover:bg-orange-600 text-white py-2 px-6 rounded-lg"
                        disabled={quizAnswers[currentQuiz.id] === undefined}
                      >
                        {currentQuizIndex < quizTasks.length - 1 ? "Next Question" : "Submit Answers"}
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={handleRestartQuiz}
                        className="bg-gray-700 hover:bg-gray-600 text-white py-2 px-6 rounded-lg"
                      >
                        Try Again
                      </button>
                      
                      {allCorrect && (
                        <button
                          onClick={() => setCurrentStep(CardStep.THANK_YOU)}
                          className="bg-green-600 hover:bg-green-700 text-white py-2 px-6 rounded-lg"
                        >
                          Continue
                        </button>
                      )}
                    </>
                  )}
                </div>
              </>
            ) : (
              <div className="text-center">
                <p className="text-gray-300 mb-4">No quiz questions available.</p>
                <div className="flex justify-center gap-4">
                  <button
                    onClick={() => setCurrentStep(CardStep.CONTENT)}
                    className="bg-gray-700 hover:bg-gray-600 text-white py-2 px-6 rounded-lg"
                  >
                    Back to Content
                  </button>
                  <button
                    onClick={() => setCurrentStep(CardStep.THANK_YOU)}
                    className="bg-orange-500 hover:bg-orange-600 text-white py-2 px-6 rounded-lg"
                  >
                    Continue
                  </button>
                </div>
              </div>
            )}
          </div>
        );

      case CardStep.THANK_YOU:
        return (
          <div className="bg-black/20 rounded-lg p-6 border border-gray-800">
            <div className="text-center">
              <div className="text-green-500 text-5xl mb-4">✓</div>
              <h2 className="text-2xl font-bold text-white mb-4">Well Done!</h2>
              <p className="text-gray-300 mb-6">
                You've successfully completed all the learning tasks and quiz questions.
              </p>
              
              {/* Social media box */}
              {learn2Earn.socialLinks && Object.values(learn2Earn.socialLinks).some(Boolean) && (
                <div className="bg-black/30 p-4 rounded-lg mb-6">
                  <h3 className="text-lg font-medium text-white mb-3">Follow {learn2Earn.title} on Social Media</h3>
                  <div className="flex flex-wrap justify-center gap-4">
                    {learn2Earn.socialLinks.website && (
                      <a
                        href={learn2Earn.socialLinks.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg inline-flex items-center"
                      >
                        Website
                      </a>
                    )}
                    {learn2Earn.socialLinks.twitter && (
                      <a
                        href={learn2Earn.socialLinks.twitter}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-sky-500 hover:bg-sky-600 text-white py-2 px-4 rounded-lg inline-flex items-center"
                      >
                        Twitter
                      </a>
                    )}
                    {learn2Earn.socialLinks.discord && (
                      <a
                        href={learn2Earn.socialLinks.discord}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-indigo-600 hover:bg-indigo-700 text-white py-2 px-4 rounded-lg inline-flex items-center"
                      >
                        Discord
                      </a>
                    )}
                    {learn2Earn.socialLinks.telegram && (
                      <a
                        href={learn2Earn.socialLinks.telegram}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded-lg inline-flex items-center"
                      >
                        Telegram
                      </a>
                    )}
                  </div>
                </div>
              )}
              
              <button
                onClick={() => setCurrentStep(CardStep.CLAIM)}
                className="bg-orange-500 hover:bg-orange-600 text-white py-2 px-6 rounded-lg"
              >
                Continue to Claim Rewards
              </button>
            </div>
          </div>
        );

      case CardStep.CLAIM:
        return (
          <div className="bg-black/30 rounded-lg p-6">
            <h2 className="text-2xl font-semibold text-white mb-4">
              Complete & Claim Rewards
            </h2>
            <ParticipationForm 
              learn2earnId={learn2Earn.id} 
              tokenSymbol={learn2Earn.tokenSymbol}
              network={learn2Earn.network} 
              onRegistrationComplete={handleRegistrationComplete}
            />
          </div>
        );
    }
  };

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

          {/* Progress bar */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-400">Progress</span>
              <span className="text-sm text-gray-400">
                Step {currentStep + 1} of {Object.keys(CardStep).length / 2}
              </span>
            </div>
            <div className="h-2 bg-gray-700 rounded-full">
              <div
                className={`h-2 bg-orange-500 rounded-full transition-all duration-300 progress-step-${currentStep}`}
              ></div>
            </div>
          </div>

          {/* Header section with basic info */}
          <div className="mb-8">
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
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
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
          </div>

          {/* Dynamic step content */}
          {renderStepContent()}
          
          {/* Informative Card about Learn2Earn */}
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