'use client';

import React, { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import Layout from '../components/Layout';
import ContactForm from '../components/ContactForm';
import DevNoticePopup from '../components/DevNoticePopup';

interface Partner {
  id: string;
  name: string;
  logoUrl: string;
  description: string;
  website: string;
  createdAt?: string;
}

interface FAQItemProps {
  question: string;
  answer: string;
}

const FAQItem: React.FC<FAQItemProps> = ({ question, answer }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className={`faq-item ${isOpen ? 'active' : ''}`}>
      <div
        className="faq-question"
        onClick={() => setIsOpen(!isOpen)}
      >
        {question}
        <span className="text-gate33-orange text-xl">{isOpen ? '-' : '+'}</span>
      </div>
      <div
        className={`faq-answer ${isOpen ? 'open' : ''}`}
      >
        <p>{answer}</p>
      </div>
    </div>
  );
};

// Modern FAQ Item Component
const ModernFAQItem = ({ question, answer, open = false, highlight = false }: { question: string, answer: React.ReactNode, open?: boolean, highlight?: boolean }) => {
  const [isOpen, setIsOpen] = useState(false); // Always start closed
  return (
    <div className={`rounded-xl border border-orange-500/20 shadow-md transition-all bg-[#181A20] text-white ${isOpen ? 'border-orange-500 shadow-orange-500/20' : ''} ${highlight ? 'font-semibold' : ''}`}>      <button
        className={`w-full flex justify-between items-center px-5 py-4 text-left focus:outline-none transition-colors gate33-faq-btn ${highlight ? 'text-gate33-orange' : 'text-white'}`}
        onClick={() => setIsOpen((v) => !v)}
      >
        <h3 className={`text-lg md:text-xl font-verdana font-medium ${isOpen ? 'text-gate33-orange' : 'text-white'}`}>{question}</h3>
        <span className={`ml-4 text-xl font-bold transition-transform ${isOpen ? 'text-white rotate-180' : 'text-gate33-orange'}`}>⌄</span>
      </button>      {isOpen && (
        <div className="px-5 pb-4 text-sm leading-relaxed text-gray-300 animate-fade-in">
          {answer}
        </div>
      )}
    </div>
  );
};

function Home() {
  const [showDevNotice, setShowDevNotice] = useState(true);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(false);
  const [waitlistEmail, setWaitlistEmail] = useState("");
  const [waitlistLoading, setWaitlistLoading] = useState(false);
  const [waitlistSuccess, setWaitlistSuccess] = useState(false);
  const carouselRef = useRef<HTMLDivElement>(null);
  const [waitlistError, setWaitlistError] = useState("");
  const [showContactModal, setShowContactModal] = useState(false);
  const [activeJobCard, setActiveJobCard] = useState<number>(-1);

  // Job cards data
  const featuredJobs = [
    { id: 0, title: "Blockchain Developer" },
    { id: 1, title: "Digital Marketing Analyst" },
    { id: 2, title: "Security Specialist" }
  ];

  // Card sections data
  const cardSections = [
    { id: 0, title: "FOR BUILDERS" },
    { id: 1, title: "FOR HODLERS" },
    { id: 2, title: "FOR EXPLORERS" }
  ];

  useEffect(() => {
    fetchPartners();
  }, []);

  // Set carousel width after partners are loaded
  useEffect(() => {
    if (carouselRef.current && partners.length > 3) {
      carouselRef.current.style.width = `${partners.length * 340}px`;
    }
  }, [partners]);

  const fetchPartners = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/partners');
      if (!response.ok) {
        throw new Error('Failed to fetch partners');
      }
      const partnersData = await response.json();
      setPartners(partnersData);
    } catch (error) {
      console.error('Error fetching partners:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleWaitlistSubscribe = async () => {
    setWaitlistLoading(true);
    setWaitlistError("");
    setWaitlistSuccess(false);
    try {
      if (!waitlistEmail || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(waitlistEmail)) {
        setWaitlistError("Please enter a valid email address.");
        setWaitlistLoading(false);
        return;
      }
      // Import Firestore methods dynamically (for SSR safety)
      const { getDocs, collection, addDoc, serverTimestamp } = await import("firebase/firestore");
      const { db } = await import("../lib/firebase");
      // Check for duplicates
      const snapshot = await getDocs(collection(db, "jobAlertSubscribers"));
      const exists = snapshot.docs.some(doc => doc.data().email === waitlistEmail);
      if (exists) {
        setWaitlistError("This email is already subscribed.");
        setWaitlistLoading(false);
        return;
      }
      await addDoc(collection(db, "jobAlertSubscribers"), {
        email: waitlistEmail,
        createdAt: serverTimestamp(),
        active: true
      });
      setWaitlistSuccess(true);
      setWaitlistEmail("");
    } catch (err) {
      setWaitlistError("Failed to subscribe. Please try again later.");
    } finally {
      setWaitlistLoading(false);
    }
  };


  return (
    <Layout>
      <>
        {/* Card Indicators */}
        <div className="card-indicators hidden lg:flex">
          {cardSections.map((section) => (
            <div
              key={section.id}
              className={`card-indicator ${activeJobCard === section.id ? 'active' : ''}`}
            />
          ))}
        </div>

      {/* Hero Section - NEW LAYOUT WITH FIXED BACKGROUND */}
      <section className="hero-section-fixed-bg relative flex flex-col justify-center min-h-[50vh] px-4 pt-16 md:pt-20 pb-12 overflow-hidden">
        <div className="hero-content w-full max-w-6xl mx-auto flex flex-col pt-4">          {/* Main title aligned left */}
          <h1 className="font-verdana font-bold text-white mb-2 tracking-normal uppercase">
            <span className="text-2xl md:text-5xl leading-tight block mb-2">YOUR GATEWAY TO TRUSTED</span>
            <span className="text-gate33-orange text-2xl md:text-5xl leading-tight font-bold block mt-1">WEB3 OPPORTUNITIES</span>
          </h1>
          {/* Subtitle aligned left */}
          <p className="font-verdana font-normal text-lg md:text-xl lg:text-2xl text-gray-200 mb-6 md:mb-10 mt-4 md:mt-6 max-w-2xl">
            Hire, Get Hired, Learn and Build Smarter<br />
            <span className="text-gate33-orange font-semibold">Verified. Secure. Web3-Native.</span>
          </p>
          {/* Section Cards aligned to orange card limits */}
          <div className="w-full mt-0.5 mb-1.5 relative">
            {/* 3D G33 Logo - Left positioned, 3x larger and animated */}
            <div className="hidden lg:block absolute left-[-1px] top-[-300px] z-0">
              <Image
                src="/images/3a1c587e459142a944acdb0e7aa6e10e2d631aab.png"
                alt="Gate33 3D Logo"
                width={1100}
                height={1100}
                className="opacity-70 drop-shadow-2xl logo3d-animation"
                priority
              />
            </div>
            <div className="bg-transparent rounded-2xl py-6 md:py-8 relative overflow-visible w-full max-w-6xl mx-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-8 h-full w-full">
                {/* For Builders Section - Centered for even spacing */}
                <div className="flex justify-center">
                  <div 
                    className="rounded-2xl card-orange-glow p-4 md:p-5 h-auto flex flex-col justify-between w-full md:w-[98%] group overflow-hidden"
                    onMouseEnter={() => setActiveJobCard(0)}
                    onMouseLeave={() => setActiveJobCard(0)}                  >
              {/* Horizontal LED bar at the top */}
              <div className="absolute top-3 left-1/2 transform -translate-x-1/2 z-10">
                <div className="led-bar bg-gradient-to-r from-orange-400 via-orange-500 to-orange-400 rounded-full shadow-md shadow-orange-500/50"></div>
              </div>              <div className="mb-2 text-center">
                <span className="font-verdana uppercase text-sm md:text-lg text-white font-bold tracking-wider mb-1 md:mb-2 block">FOR BUILDERS</span>
                <h3 className="font-verdana text-gate33-orange font-medium text-base md:text-lg mb-1 md:mb-2">Hire or Get Hired</h3>
                <p className="font-verdana text-gray-300 text-sm leading-relaxed mb-2">
                  Access <span className="text-gate33-orange font-medium">trusted</span> Web3 jobs or post roles with<br className="hidden md:block" />
                  <span className="text-gate33-orange font-medium">escrow protection</span>. Build the future, <span className="text-gate33-orange font-medium">securely</span>.
                </p>
              </div>              <div className="flex flex-col sm:flex-row justify-center items-center mb-2 gap-2 sm:gap-[9.32px]">
                <Link href="/jobs" className="font-verdana text-white font-medium text-sm md:text-base transition-all duration-200 flex items-center justify-center gate33-btn-orange w-full sm:w-auto">
                  Find Jobs
                </Link>
                <span className="font-verdana text-white items-center text-sm md:text-base hidden sm:flex">or</span>
                <Link href="/company-register" className="font-verdana text-white font-medium text-sm md:text-base transition-all duration-200 flex items-center justify-center gate33-btn-orange w-full sm:w-auto">
                  Post Jobs
                </Link>
              </div>
                  </div>
                </div>
                {/* For Hodlers Section - Centered for even spacing */}
                <div className="flex justify-center">
                  <div 
                    className="rounded-2xl card-orange-glow card-hodlers p-4 md:p-5 h-auto flex flex-col justify-between w-full md:w-[98%] group overflow-hidden"
                    onMouseEnter={() => setActiveJobCard(1)}
                    onMouseLeave={() => setActiveJobCard(0)}                  >
              {/* Horizontal LED bar at the top */}
              <div className="absolute top-3 left-1/2 transform -translate-x-1/2 z-10">
                <div className="led-bar bg-gradient-to-r from-orange-400 via-orange-500 to-orange-400 rounded-full shadow-md shadow-orange-500/50"></div>
              </div>              <div className="mb-2 text-center">
                <span className="font-verdana uppercase text-sm md:text-lg text-white font-bold tracking-wider mb-1 md:mb-2 block">FOR HODLERS</span>
                <h3 className="font-verdana text-gate33-orange font-medium text-base md:text-lg mb-1 md:mb-2">Use Crypto Tools</h3>
                <p className="font-verdana text-gray-300 text-sm leading-relaxed mb-2">
                  Analyze the market with <span className="text-gate33-orange font-medium">AI-powered tools</span> and<br className="hidden md:block" />
                  insights. Make informed decisions, <span className="text-gate33-orange font-medium">faster</span>.
                </p>
              </div>              <div className="flex justify-center mb-2">
                <Link href="/crypto-tools" className="font-verdana text-white font-medium text-sm md:text-base transition-all duration-200 flex items-center justify-center whitespace-nowrap gate33-btn-orange w-full sm:w-auto">
                  Explore Crypto Tools
                </Link>
              </div>
                  </div>
                </div>                {/* For Explorers Section - Centered for even spacing */}
                <div className="flex justify-center">
                  <div 
                    className="rounded-2xl card-orange-glow card-explorers p-4 md:p-5 h-auto flex flex-col justify-between w-full md:w-[98%] group overflow-hidden"
                    onMouseEnter={() => setActiveJobCard(2)}
                    onMouseLeave={() => setActiveJobCard(0)}                  >
              {/* Horizontal LED bar at the top */}
              <div className="absolute top-3 left-1/2 transform -translate-x-1/2 z-10">
                <div className="led-bar bg-gradient-to-r from-orange-400 via-orange-500 to-orange-400 rounded-full shadow-md shadow-orange-500/50"></div>
              </div>              <div className="mb-2 text-center">
                <span className="font-verdana uppercase text-sm md:text-lg text-white font-bold tracking-wider mb-1 md:mb-2 block">FOR EXPLORERS</span>
                <h3 className="font-verdana text-gate33-orange font-medium text-base md:text-lg mb-1 md:mb-2">Learn 2 Earn</h3>
                <p className="font-verdana text-gray-300 text-sm leading-relaxed mb-2">
                  Take <span className="text-gate33-orange font-medium">Web3 Learn2Earn</span> and <span className="text-gate33-orange font-medium">earn token rewards</span>. Grow your knowledge, grow your portfolio.
                </p>
              </div>              <div className="flex justify-center mb-2">
                <Link href="/learn2earn" className="font-verdana text-white font-medium text-sm md:text-base transition-all duration-200 flex items-center justify-center gate33-btn-orange w-full sm:w-auto">
                  Start Learning
                </Link>
              </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
      {showDevNotice && (
        <DevNoticePopup onClose={() => setShowDevNotice(false)} />
      )}      {/* EVEN MORE...COMING SOON Section with centered alignment */}
      <div className="w-full mt-0.5 mb-1.5">
        <div
          className="coming-soon-card rounded-[40px] py-6 md:py-8 px-4 md:px-10 shadow-lg shadow-black/10 relative overflow-hidden w-full max-w-6xl mx-auto text-center bg-[#F97316]"
        >
          <h2 className="text-xl md:text-3xl font-bold text-white text-center mb-3 md:mb-4">EVEN MORE...COMING SOON</h2>
          <p className="text-[#0F0F0F] text-sm md:text-lg font-normal text-center mb-4 md:mb-6 px-2">
            We're developing groundbreaking features that will transform how talent connects with opportunities.
          </p>
          <div className="w-full flex justify-center items-center">
            <form className="flex flex-col sm:flex-row items-center gap-3 w-full max-w-xl mx-auto" onSubmit={e => { e.preventDefault(); handleWaitlistSubscribe(); }}>
              <input
                type="email"
                value={waitlistEmail || ''}
                onChange={e => setWaitlistEmail(e.target.value)}
                placeholder="Enter your e-mail here to stay up-to-date"
                className="waitlist-input-orange flex-1 w-full sm:w-auto focus:outline-none text-sm"
                disabled={waitlistLoading || waitlistSuccess}
              />
              <button
                type="submit"
                className="waitlist-btn-orange px-4 py-2.5 min-w-[90px] w-full sm:w-auto text-sm"
                disabled={waitlistLoading || waitlistSuccess}
              >
                Notify Me
              </button>
            </form>
          </div>
        </div>
      </div>      {/* Featured Jobs Section - New horizontal layout, cards stacked on the right */}
      <section id="jobs" className="jobs py-6 md:py-10 px-4 relative">
        <div className="relative z-10 flex flex-col lg:flex-row max-w-7xl mx-auto gap-6 md:gap-10 items-start lg:items-center justify-center">          {/* Left column: title, description, button */}
          <div className="flex-shrink-0 w-full lg:w-[35%] flex flex-col justify-center items-start text-center lg:text-left lg:pl-4"><h2 className="text-2xl md:text-3xl font-verdana font-bold text-gate33-orange mb-3 md:mb-4">FEATURED JOBS</h2>
            <p className="text-orange-300 mb-3 md:mb-4 font-verdana font-medium text-sm md:text-base">
              Explore some of the current opportunities available on our platform.
            </p>
            <p className="text-gray-200 text-xs md:text-sm mb-6 md:mb-8 max-w-xs mx-auto lg:mx-0 font-verdana">
              Access quality Web3 jobs from verified companies or post roles as a trusted employer. Build your profile, manage applications, and connect securely with top talent in one place.
            </p>
            <Link href="/jobs" className="gate33-btn-orange text-white py-2.5 px-8 md:px-12 min-w-[200px] md:min-w-[230px] rounded-full font-semibold text-sm md:text-base cursor-pointer transition-all border-none shadow-lg hover:shadow-xl block w-fit mx-auto lg:mx-0">
              Explore The Job-Board
            </Link>
          </div>          {/* Right column: stacked job cards */}
          <div className="w-full lg:w-[65%] flex flex-col gap-4 md:gap-6 relative">
            {/* Job Indicators */}
            <div className="job-indicators hidden lg:flex">
              {[0, 1, 2].map((idx) => (
                <div
                  key={idx}
                  className={`job-indicator ${((activeJobCard === -1 && idx === 1) || activeJobCard === idx) ? 'active' : ''}`}
                />
              ))}
            </div>

            {/* Card 1: Blockchain Developer */}
            <Link 
              href="/jobs" 
              className="rounded-2xl card-orange-glow p-4 md:p-5 h-auto flex flex-row items-stretch w-full group overflow-visible relative cursor-pointer transition-transform hover:scale-[1.025] focus:outline-none focus:ring-2 focus:ring-orange-500"              onMouseEnter={() => setActiveJobCard(0)}
              onMouseLeave={() => setActiveJobCard(-1)}
            >
              {/* Vertical lantern-style light effect */}
              <div className="lamp-light-vertical"></div>
              {/* Vertical LED bar on the left + light effect only on hover */}
              <div className="flex flex-col justify-center items-center mr-3 md:mr-5 relative">
                <div className="led-bar-vertical bg-gradient-to-b from-orange-400 via-orange-500 to-orange-400 rounded-full shadow-md shadow-orange-500/50 w-1 h-8 md:h-12 z-10"></div>
              </div>
              <div className="flex-1">
                <h3 className="font-verdana font-bold text-white text-sm md:text-lg mb-1">Blockchain Developer <span className="text-gray-400 font-normal text-xs md:text-base">@Polygon</span></h3>
                <div className="flex flex-wrap gap-1 md:gap-2 mb-2">
                  <span className="bg-orange-500/20 text-orange-400 text-xs px-2 py-0.5 rounded font-semibold">Remote</span>
                  <span className="bg-orange-500/20 text-orange-400 text-xs px-2 py-0.5 rounded font-semibold">Contract</span>
                </div>
                <p className="text-gray-200 text-xs md:text-sm mb-2 text-justify pr-2">
                  Develop and maintain decentralized applications (DApps) using Solidity. Experience with smart contracts and Web3.js.
                </p>
              </div>
            </Link>
            {/* Card 2: Digital Marketing Analyst */}
            <Link 
              href="/jobs" 
              className="rounded-2xl card-orange-glow p-4 md:p-5 h-auto flex flex-row items-stretch w-full group overflow-visible relative cursor-pointer transition-transform hover:scale-[1.025] focus:outline-none focus:ring-2 focus:ring-orange-500"              onMouseEnter={() => setActiveJobCard(1)}
              onMouseLeave={() => setActiveJobCard(-1)}
            >
              {/* Vertical lantern-style light effect */}
              <div className="lamp-light-vertical"></div>
              {/* Vertical LED bar on the left + light effect only on hover */}
              <div className="flex flex-col justify-center items-center mr-3 md:mr-5 relative">
                <div className="led-bar-vertical bg-gradient-to-b from-orange-400 via-orange-500 to-orange-400 rounded-full shadow-md shadow-orange-500/50 w-1 h-8 md:h-12 z-10"></div>
              </div>
              <div className="flex-1">
                <h3 className="font-verdana font-bold text-white text-sm md:text-lg mb-1">Digital Marketing Analyst <span className="text-gray-400 font-normal text-xs md:text-base">@OpenSea</span></h3>
                <div className="flex flex-wrap gap-1 md:gap-2 mb-2">
                  <span className="bg-orange-500/20 text-orange-400 text-xs px-2 py-0.5 rounded font-semibold">Lisbon</span>
                  <span className="bg-orange-500/20 text-orange-400 text-xs px-2 py-0.5 rounded font-semibold">Full-time</span>
                </div>
                <p className="text-gray-200 text-xs md:text-sm mb-2 text-justify pr-2">
                  Develop digital marketing strategies focused on cryptocurrency and blockchain markets. SEO, SEM, and social media.
                </p>
              </div>
            </Link>
            {/* Card 3: Security Specialist */}
            <Link 
              href="/jobs" 
              className="rounded-2xl card-orange-glow p-4 md:p-5 h-auto flex flex-row items-stretch w-full group overflow-visible relative cursor-pointer transition-transform hover:scale-[1.025] focus:outline-none focus:ring-2 focus:ring-orange-500"              onMouseEnter={() => setActiveJobCard(2)}
              onMouseLeave={() => setActiveJobCard(-1)}
            >
              {/* Vertical lantern-style light effect */}
              <div className="lamp-light-vertical"></div>
              {/* Vertical LED bar on the left + light effect only on hover */}
              <div className="flex flex-col justify-center items-center mr-3 md:mr-5 relative">
                <div className="led-bar-vertical bg-gradient-to-b from-orange-400 via-orange-500 to-orange-400 rounded-full shadow-md shadow-orange-500/50 w-1 h-8 md:h-12 z-10"></div>
              </div>
              <div className="flex-1">
                <h3 className="font-verdana font-bold text-white text-sm md:text-lg mb-1">Security Specialist <span className="text-gray-400 font-normal text-xs md:text-base">@Ethereum Foundation</span></h3>
                <div className="flex flex-wrap gap-1 md:gap-2 mb-2">
                  <span className="bg-orange-500/20 text-orange-400 text-xs px-2 py-0.5 rounded font-semibold">Remote</span>
                  <span className="bg-orange-500/20 text-orange-400 text-xs px-2 py-0.5 rounded font-semibold">Full-time</span>
                </div>
                <p className="text-gray-200 text-xs md:text-sm mb-2 text-justify pr-2">
                  Conduct thorough audits of smart contracts while implementing robust security protocols to enhance the safety and reliability of blockchain-based applications.
                </p>
              </div>
            </Link>
          </div>
        </div>      </section>      <main className="min-h-screen text-white relative overflow-hidden gate33-main-section pt-16 md:pt-20 p-4 md:p-8">
        {/* Top orange divider line */}
        <div className="max-w-7xl mx-auto px-4">
          <div className="w-full h-[3px] bg-gate33-orange z-20 my-8 rounded"></div>
        </div>
        
        <section id="about" className="about py-6 md:py-10 px-4 relative">
          <div className="relative z-10 max-w-7xl mx-auto">
            {/* Mobile-first layout: text above cards */}            <div className="flex flex-col items-center text-center lg:hidden mb-8">              <h2 className="text-2xl font-verdana font-bold text-white mb-3">EXPLORE OUR<br />CRYPTO TOOLS</h2>
              <p className="text-orange-500 mb-3 font-verdana font-medium text-sm max-w-sm">
                Crypto Tools offers solutions for analyzing Ethereum wallets. Features include ENS resolution, wallet age assessment, and dust token detection.
              </p>
              <p className="text-gray-200 text-xs mb-6 max-w-xs font-verdana">
                Operations are secure in your browser, using public APIs and your Ethereum provider. Private keys remain secure and never exposed.
              </p>
              <Link href="/crypto-tools" className="gate33-btn-orange text-white py-2.5 px-8 min-w-[200px] rounded-full font-semibold text-sm cursor-pointer transition-all border-none shadow-lg hover:shadow-xl block w-fit">
                Explore Our Crypto Tools
              </Link>
            </div>            <div className="flex flex-col lg:flex-row gap-6 md:gap-8 items-center justify-center">
              {/* Cards Grid - Full width on mobile */}
              <div className="w-full lg:w-[65%]">
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4 lg:gap-1 w-full">
                  {/* Card 1 */}
                  <div className="rounded-2xl card-orange-glow p-3 md:p-6 flex flex-col items-center w-full aspect-square min-h-[200px] md:min-h-[280px] max-h-[250px] md:max-h-[320px] group overflow-visible relative cursor-pointer transition-transform hover:scale-[1.025] focus:outline-none focus:ring-2 focus:ring-orange-500">
                    <div className="absolute top-2 md:top-4 right-2 md:right-4 z-10">
                      <span className="bg-blue-500 text-white text-xs px-1.5 md:px-2 py-0.5 md:py-1 rounded-full font-semibold">New</span>
                    </div>
                    <Image src="/icons/Vector.png" alt="Governance AI Icon" width={20} height={20} className="md:w-8 md:h-8 mb-2 md:mb-4" />
                    <div className="flex-1 flex flex-col justify-between w-full text-center">
                      <div>
                        <h3 className="font-verdana font-bold text-white text-sm md:text-base mb-1 md:mb-2">Governance AI</h3>
                        <p className="text-gray-300 text-xs leading-tight md:leading-relaxed mb-2 md:mb-4">
                          Use artificial intelligence to help with governance decisions and proposals. This feature integrates with your connected wallet for DAO interactions.
                        </p>
                      </div>                      <Link href="/crypto-tools#governance-ai" className="gate33-btn-orange text-white py-1 md:py-2 px-2 md:px-4 rounded-full font-semibold text-xs cursor-pointer transition-all border-none shadow-lg hover:shadow-xl mt-auto mx-auto block w-fit">
                        Try This Out
                      </Link>
                    </div>
                  </div>
                  {/* Card 2 */}
                  <div className="rounded-2xl card-orange-glow p-3 md:p-6 flex flex-col items-center w-full aspect-square min-h-[200px] md:min-h-[280px] max-h-[250px] md:max-h-[320px] group overflow-visible relative cursor-pointer transition-transform hover:scale-[1.025] focus:outline-none focus:ring-2 focus:ring-orange-500">
                    <div className="absolute top-2 md:top-4 right-2 md:right-4 z-10">
                      <span className="bg-orange-500 text-white text-xs px-1.5 md:px-2 py-0.5 md:py-1 rounded-full font-semibold">Popular</span>
                    </div>
                    <Image src="/icons/Vector (4).png" alt="Market List Icon" width={20} height={20} className="md:w-8 md:h-8 mb-2 md:mb-4" />
                    <div className="flex-1 flex flex-col justify-between w-full text-center">
                      <div>
                        <h3 className="font-verdana font-bold text-white text-sm md:text-base mb-1 md:mb-2">Market List</h3>
                        <p className="text-gray-300 text-xs leading-tight md:leading-relaxed mb-2 md:mb-4">
                          Use artificial intelligence to help with governance decisions and proposals. This feature integrates with your connected wallet for DAO interactions.
                        </p>
                      </div>                      <Link href="/crypto-tools#market-list" className="gate33-btn-orange text-white py-1 md:py-2 px-2 md:px-4 rounded-full font-semibold text-xs cursor-pointer transition-all border-none shadow-lg hover:shadow-xl mt-auto mx-auto block w-fit">
                        Try This Out
                      </Link>
                    </div>
                  </div>
                  {/* Card 3 */}
                  <div className="rounded-2xl card-orange-glow p-3 md:p-6 flex flex-col items-center w-full aspect-square min-h-[200px] md:min-h-[280px] max-h-[250px] md:max-h-[320px] group overflow-visible relative cursor-pointer transition-transform hover:scale-[1.025] focus:outline-none focus:ring-2 focus:ring-orange-500">
                    <Image src="/icons/Vector (5).png" alt="Bitcoin Analysis Icon" width={20} height={20} className="md:w-8 md:h-8 mb-2 md:mb-4" />
                    <div className="flex-1 flex flex-col justify-between w-full text-center">
                      <div>
                        <h3 className="font-verdana font-bold text-white text-sm md:text-base mb-1 md:mb-2">Bitcoin Analysis</h3>
                        <p className="text-gray-300 text-xs leading-tight md:leading-relaxed mb-2 md:mb-4">
                          Real-time Bitcoin price data, market sentiment analysis, and useful trading utilities powered by free APIs.
                        </p>
                      </div>                      <Link href="/crypto-tools#bitcoin-analysis" className="gate33-btn-orange text-white py-1 md:py-2 px-2 md:px-4 rounded-full font-semibold text-xs cursor-pointer transition-all border-none shadow-lg hover:shadow-xl mt-auto mx-auto block w-fit">
                        Try This Out
                      </Link>
                    </div>
                  </div>
                  {/* Card 4 */}
                  <div className="rounded-2xl card-orange-glow p-3 md:p-6 flex flex-col items-center w-full aspect-square min-h-[200px] md:min-h-[280px] max-h-[250px] md:max-h-[320px] group overflow-visible relative cursor-pointer transition-transform hover:scale-[1.025] focus:outline-none focus:ring-2 focus:ring-orange-500">
                    <div className="absolute top-2 md:top-4 right-2 md:right-4 z-10">
                      <span className="bg-blue-500 text-white text-xs px-1.5 md:px-2 py-0.5 md:py-1 rounded-full font-semibold">New</span>
                    </div>
                    <Image src="/icons/Vector (1).png" alt="AI Smart Contracts Icon" width={20} height={20} className="md:w-8 md:h-8 mb-2 md:mb-4" />
                    <div className="flex-1 flex flex-col justify-between w-full text-center">
                      <div>
                        <h3 className="font-verdana font-bold text-white text-sm md:text-base mb-1 md:mb-2">AI Smart Contracts</h3>
                        <p className="text-gray-300 text-xs leading-tight md:leading-relaxed mb-2 md:mb-4">
                          AI-powered smart contract auditing tool will analyze your contracts for gas optimization opportunities and security best practices.
                        </p>
                      </div>
                      <button className="bg-gray-600 text-gray-300 py-1 md:py-2 px-2 md:px-4 rounded-full font-semibold text-xs cursor-not-allowed mt-auto mx-auto block w-fit" disabled>
                        Coming Soon
                      </button>
                    </div>
                  </div>
                  {/* Card 5 */}
                  <div className="rounded-2xl card-orange-glow p-3 md:p-6 flex flex-col items-center w-full aspect-square min-h-[200px] md:min-h-[280px] max-h-[250px] md:max-h-[320px] group overflow-visible relative cursor-pointer transition-transform hover:scale-[1.025] focus:outline-none focus:ring-2 focus:ring-orange-500">
                    <Image src="/icons/Vector (6).png" alt="Staking Tool Icon" width={20} height={20} className="md:w-8 md:h-8 mb-2 md:mb-4" />
                    <div className="flex-1 flex flex-col justify-between w-full text-center">
                      <div>
                        <h3 className="font-verdana font-bold text-white text-sm md:text-base mb-1 md:mb-2">Staking Tool</h3>
                        <p className="text-gray-300 text-xs leading-tight md:leading-relaxed mb-2 md:mb-4">
                          Stake your tokens and earn rewards through our secure staking platform. Support the network while generating passive income.
                        </p>
                      </div>
                      <button className="bg-gray-600 text-gray-300 py-1 md:py-2 px-2 md:px-4 rounded-full font-semibold text-xs cursor-not-allowed mt-auto mx-auto block w-fit" disabled>
                        Coming Soon
                      </button>
                    </div>
                  </div>
                  {/* Card 6 */}
                  <div className="rounded-2xl card-orange-glow p-3 md:p-6 flex flex-col items-center w-full aspect-square min-h-[160px] md:min-h-[280px] max-h-[200px] md:max-h-[320px] group overflow-visible relative cursor-pointer transition-transform hover:scale-[1.025] focus:outline-none focus:ring-2 focus:ring-orange-500">
                    <div className="absolute top-2 md:top-4 right-2 md:right-4 z-10">
                      <span className="bg-orange-500 text-white text-xs px-1.5 md:px-2 py-0.5 md:py-1 rounded-full font-semibold">Popular</span>
                    </div>
                    <Image src="/icons/Vector (4).png" alt="Market Cap Icon" width={20} height={20} className="md:w-8 md:h-8 mb-2 md:mb-4" />
                    <div className="flex-1 flex flex-col justify-between w-full text-center">
                      <div>
                        <h3 className="font-verdana font-bold text-white text-sm md:text-base mb-1 md:mb-2">Market Cap</h3>
                        <p className="text-gray-300 text-xs leading-tight md:leading-relaxed mb-2 md:mb-4">
                          Analyze market capitalization data and trends across different cryptocurrencies to make informed investment decisions.
                        </p>
                      </div>                      <Link href="/crypto-tools#market-cap" className="gate33-btn-orange text-white py-1 md:py-2 px-2 md:px-4 rounded-full font-semibold text-xs cursor-pointer transition-all border-none shadow-lg hover:shadow-xl mt-auto mx-auto block w-fit">
                        Try This Out
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
              {/* Right text - Desktop only */}              <div className="hidden lg:flex flex-shrink-0 w-full lg:w-[35%] flex-col justify-center items-start text-left mt-6 lg:mt-0 lg:pl-20 xl:pl-24">                <h2 className="text-2xl md:text-3xl font-verdana font-bold text-white mb-3 md:mb-4">EXPLORE OUR<br />CRYPTO TOOLS</h2>
                <p className="text-orange-500 mb-3 md:mb-4 font-verdana font-medium text-sm md:text-base">
                  Crypto Tools offers solutions for analyzing<br />Ethereum wallets. Features include ENS<br />resolution, wallet age assessment, and<br />dust token detection.
                </p><p className="text-gray-300 text-sm md:text-base mb-6 md:mb-8 max-w-xs font-verdana leading-relaxed">
                  Operations are secure in your browser, using public<br />APIs and your Ethereum provider. Private keys<br />remain secure and never exposed.
                </p>                <Link href="/crypto-tools" className="gate33-btn-orange text-white py-2.5 px-10 md:px-14 min-w-[240px] md:min-w-[280px] rounded-full font-semibold text-sm md:text-base cursor-pointer transition-all border-none shadow-lg hover:shadow-xl block w-fit">
                  Explore Our Crypto Tools
                </Link>
              </div>
            </div>
          </div>
        </section>
        
        {/* Bottom orange divider line */}
        <div className="max-w-7xl mx-auto px-4">
          <div className="w-full h-[3px] bg-gate33-orange z-20 my-8 rounded"></div>
        </div>

        {/* LEARN2EARN SECTION - substitui Our Services */}
        <section id="learn2earn" className="py-6 md:py-10 px-4 relative">
          <div className="max-w-7xl mx-auto flex flex-col lg:flex-row gap-6 md:gap-10 items-stretch relative z-10">
            {/* Sidebar */}            <div className="lg:w-1/3 flex flex-col justify-center mb-6 lg:mb-0 text-center lg:text-left">              <h2 className="text-xl md:text-2xl lg:text-3xl font-verdana font-bold text-white mb-3 leading-tight">ACTIVE LEARN & EARN<br />OPPORTUNITIES</h2>
              <p className="text-orange-500 text-sm md:text-base mb-5 md:mb-6 max-w-xs mx-auto lg:mx-0 font-verdana leading-relaxed">Complete educational tasks and<br />earn crypto rewards</p>
              <button className="gate33-btn-orange text-white py-2.5 px-10 md:px-12 rounded-full font-semibold text-sm md:text-base w-fit mx-auto lg:mx-0 min-w-[220px] md:min-w-[240px]">See All Opportunities</button>
            </div>
            {/* Cards Grid */}
            <div className="lg:w-2/3 grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8 items-stretch">
              {/* Card 1 */}
              <div className="relative rounded-2xl card-orange-glow p-4 md:p-6 flex flex-col min-h-[200px] md:min-h-[210px] group overflow-visible transition-transform hover:scale-[1.025] focus:outline-none focus:ring-2 focus:ring-orange-500">
                <div className="absolute top-3 md:top-4 right-3 md:right-4 z-10">
                  <span className="bg-green-900 text-green-300 text-xs px-2 py-1 rounded-full font-semibold">Earn 0.01 ETH</span>
                </div>
                <div className="mb-2 text-left">
                  <span className="text-xs text-gray-400 block mb-1">Ends: May 23, 2025 at 03:00 AM</span>
                  <h3 className="font-bold text-white text-sm md:text-lg mb-1">Ethereum Fundamentals</h3>
                  <p className="text-gray-300 text-xs mb-2 line-clamp-2 learn2earn-description">Complete this 4-module course to understand Ethereum's architecture and smart contract basics.</p>
                </div>
                <div className="flex items-center justify-between mt-auto">
                  <span className="text-xs text-orange-300 flex items-center"><span className="inline-block w-2 h-2 bg-orange-400 rounded-full mr-1"></span>4,321 enrolled</span>
                  <a href="#" className="text-orange-400 text-xs font-semibold hover:underline">Start learning</a>
                </div>
              </div>
              {/* Card 2 */}
              <div className="relative rounded-2xl card-orange-glow p-4 md:p-6 flex flex-col min-h-[200px] md:min-h-[210px] group overflow-visible transition-transform hover:scale-[1.025] focus:outline-none focus:ring-2 focus:ring-orange-500">
                <div className="absolute top-3 md:top-4 right-3 md:right-4 z-10">
                  <span className="bg-green-900 text-green-300 text-xs px-2 py-1 rounded-full font-semibold">Earn 50 USDC</span>
                </div>
                <div className="mb-2 text-left">
                  <span className="text-xs text-gray-400 block mb-1">Ends: May 23, 2025 at 03:00 AM</span>
                  <h3 className="font-bold text-white text-sm md:text-lg mb-1">DeFi Protocols</h3>
                  <p className="text-gray-300 text-xs mb-2 line-clamp-2 learn2earn-description">Learn how decentralized finance works and how to interact with major lending and exchange protocols.</p>
                </div>
                <div className="flex items-center justify-between mt-auto">
                  <span className="text-xs text-orange-300 flex items-center"><span className="inline-block w-2 h-2 bg-orange-400 rounded-full mr-1"></span>2,157 enrolled</span>
                  <a href="#" className="text-orange-400 text-xs font-semibold hover:underline">Start learning</a>
                </div>
              </div>
              {/* Card 3 */}
              <div className="relative rounded-2xl card-orange-glow p-4 md:p-6 flex flex-col min-h-[200px] md:min-h-[210px] group overflow-visible transition-transform hover:scale-[1.025] focus:outline-none focus:ring-2 focus:ring-orange-500">
                <div className="absolute top-3 md:top-4 right-3 md:right-4 z-10">
                  <span className="bg-green-900 text-green-300 text-xs px-2 py-1 rounded-full font-semibold">Earn 0.01 ETH</span>
                </div>
                <div className="mb-2 text-left">
                  <span className="text-xs text-gray-400 block mb-1">Ends: May 23, 2025 at 03:00 AM</span>
                  <h3 className="font-bold text-white text-sm md:text-lg mb-1">Ethereum Fundamentals</h3>
                  <p className="text-gray-300 text-xs mb-2 line-clamp-2 learn2earn-description">Complete this 4-module course to understand Ethereum's architecture and smart contract basics.</p>
                </div>
                <div className="flex items-center justify-between mt-auto">
                  <span className="text-xs text-orange-300 flex items-center"><span className="inline-block w-2 h-2 bg-orange-400 rounded-full mr-1"></span>4,321 enrolled</span>
                  <a href="#" className="text-orange-400 text-xs font-semibold hover:underline">Start learning</a>
                </div>
              </div>
              {/* Card 4 - Coming Soon - Oculto em mobile */}
              <div className="relative rounded-2xl card-orange-glow p-4 md:p-6 flex-col min-h-[200px] md:min-h-[210px] items-center justify-center group overflow-visible opacity-60 cursor-not-allowed md:col-span-1 col-span-1 mx-auto md:mx-0 max-w-[280px] md:max-w-none learn2earn-coming-soon hidden md:flex">
                <span className="text-gray-400 text-sm">MORE COMING SOON</span>
              </div>
            </div>
          </div>
        </section>

        {/* Orange divider line after Learn2Earn */}
        <div className="max-w-7xl mx-auto px-4">
          <div className="w-full h-[3px] bg-gate33-orange z-20 my-8 rounded"></div>
        </div>        {/* WHY CHOOSE GATE33 - substitui Trusted Companies */}
        <section id="why-gate33" className="py-3 md:py-4 px-4 relative">
          <div className="max-w-7xl mx-auto relative z-10">
            {/* Top orange line removed, content pulled up */}            <h2 className="text-xl md:text-2xl lg:text-3xl font-verdana font-bold text-gate33-orange mb-1 text-center tracking-wide mt-0">WHY CHOOSE GATE33?</h2>
            <p className="text-gray-200 max-w-3xl mx-auto mb-3 md:mb-4 text-center text-sm md:text-base leading-relaxed px-4 font-verdana">
              We offer a secure environment where verified companies post genuine job opportunities and qualified candidates can find real opportunities.
            </p>            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8 lg:gap-10 max-w-7xl mx-auto">
              {/* Verified Companies */}
              <div className="flex flex-col items-center text-center">                <div className="mb-1 md:mb-2 flex items-center justify-center w-28 h-28 md:w-36 md:h-36 lg:w-40 lg:h-40">
                  <Image src="/icons/21. Verified.png" alt="Verified Companies" width={160} height={160} className="w-full h-full object-contain" />
                </div>
                <h3 className="font-verdana font-bold text-white text-lg md:text-xl lg:text-2xl mb-1">Verified Companies</h3>
                <p className="text-gray-400 text-sm md:text-base font-verdana leading-relaxed">All companies on our platform undergo a rigorous verification process to ensure legitimacy and reliability in job postings.</p>
              </div>
              {/* Quality Opportunities */}
              <div className="flex flex-col items-center text-center">                <div className="mb-1 md:mb-2 flex items-center justify-center w-28 h-28 md:w-36 md:h-36 lg:w-40 lg:h-40">
                  <Image src="/icons/Rating.png" alt="Quality Opportunities" width={160} height={160} className="w-full h-full object-contain" />
                </div>
                <h3 className="font-verdana font-bold text-white text-lg md:text-xl lg:text-2xl mb-1">Quality Opportunities</h3>
                <p className="text-gray-400 text-sm md:text-base font-verdana leading-relaxed">Curated high-quality job listings with detailed descriptions, clear benefits, and transparent selection processes.</p>
              </div>              {/* Data Security */}
              <div className="flex flex-col items-center text-center">
                <div className="mb-1 md:mb-2 flex items-center justify-center w-28 h-28 md:w-36 md:h-36 lg:w-40 lg:h-40">
                  <Image src="/icons/rat2.png" alt="Data Security" width={160} height={160} className="w-full h-full object-contain" />
                </div>
                <h2 className="font-verdana font-bold text-white text-lg md:text-xl lg:text-2xl mb-1">Data Security</h2>
                <p className="text-gray-400 text-sm md:text-base font-verdana leading-relaxed">Our platform prioritizes the protection of your personal information with advanced security measures to keep your profile and application data safe.</p>
              </div>
              {/* Learn2Earn */}
              <div className="flex flex-col items-center text-center">
                <div className="mb-1 md:mb-2 flex items-center justify-center w-28 h-28 md:w-36 md:h-36 lg:w-40 lg:h-40">
                  <Image src="/icons/rat3.png" alt="Learn2Earn" width={160} height={160} className="w-full h-full object-contain" />
                </div>
                <h2 className="font-verdana font-bold text-white text-lg md:text-xl lg:text-2xl mb-1">Learn2Earn</h2>
                <p className="text-gray-400 text-sm md:text-base font-verdana leading-relaxed">Enhance your skills and earn rewards by participating in our Learn2Earn program, where learning converts into real opportunities.</p>
              </div>
            </div></div>
        </section>

        {/* PARTNERS/INDUSTRY LEADERS SECTION */}
        <section id="partners" className="py-3 md:py-4 px-4 bg-[#181C22] relative">
          <div className="max-w-7xl mx-auto relative z-10">            <h2 className="text-xl md:text-2xl lg:text-3xl font-verdana font-bold text-center mb-4 md:mb-6 tracking-wide">
              TRUSTED BY <span className="text-gate33-orange">INDUSTRY LEADERS</span>
            </h2>
            {/* Partner logos carousel - larger cards and round logos */}
            <div className="flex overflow-x-auto gap-8 md:gap-12 py-2 px-2 scrollbar-hide items-center justify-center" ref={carouselRef}>
              {partners && partners.length > 0 ? (
                partners.map((partner) => (
                  <a
                    key={partner.id}
                    href={partner.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={`Visit ${partner.name}`}
                    className="bg-black rounded-2xl flex items-center justify-center min-w-[100px] min-h-[100px] w-[100px] h-[100px] md:min-w-[130px] md:min-h-[130px] md:w-[130px] md:h-[130px] mx-2 shadow-lg transition-transform hover:scale-105 focus:outline-none"
                  >
                    <span className="sr-only">{`Visit ${partner.name}`}</span>
                    <div className="rounded-full bg-[#222] flex items-center justify-center w-[70px] h-[70px] md:w-[90px] md:h-[90px]">
                      <Image src={partner.logoUrl} alt={partner.name} width={60} height={60} className="md:w-20 md:h-20 object-contain rounded-full" />
                    </div>
                  </a>
                ))
              ) : (
                <span className="text-gray-400 text-sm">No partners yet.</span>
              )}
            </div>
            <div className="flex justify-center mt-2">
              <Link href="/partners" className="text-orange-400 text-sm hover:underline font-medium flex items-center gap-1">
                View all Partners <span className="ml-1">→</span>
              </Link>
            </div>          </div>
        </section>

        <section id="faq" className="faq py-10 px-4 relative">
          <div className="relative z-10">
            <h2 className="text-3xl font-bold text-gate33-orange mb-6 text-center">FAQS</h2>
            <p className="text-center text-gray-300 mb-8 max-w-2xl mx-auto">We get asked these questions a lot so if you have questions of your own it’s best to start here. Not helpful? No worries you can ask us your own below.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">              {/* Column 1 */}
              <div className="flex flex-col gap-4">
                <ModernFAQItem question="What is Gate33?" answer="Gate33 is a platform that connects talent and companies in the Web3 space, ensuring trust, security, and innovation through blockchain technology." />
                <ModernFAQItem question="How does Learn2Earn work?" open highlight answer={<span>Gate33 differentiates itself through three main factors:<br /><br />1. Rigorous company verification;<br />2. Use of blockchain technology to ensure data security;<br />3. Learn2Earn system that allows candidates to earn tokens while improving their professional skills. Additionally, we are developing a revolutionary new feature that will transform how talent connects with opportunities.</span>} />
                <ModernFAQItem question="Is Gate33 available worldwide?" answer="Yes, Gate33 is available to users and companies globally." />
                <ModernFAQItem question="How do I get started with Gate33?" answer="Simply sign up on our platform, complete your profile, and start exploring opportunities or posting jobs." />
              </div>              {/* Column 2 */}
              <div className="flex flex-col gap-4">
                <ModernFAQItem question="What is Gate33?" answer="Gate33 is a platform that connects talent and companies in the Web3 space, ensuring trust, security, and innovation through blockchain technology." />
                <ModernFAQItem question="How does Learn2Earn work?" answer={<span>Gate33 differentiates itself through three main factors:<br /><br />1. Rigorous company verification;<br />2. Use of blockchain technology to ensure data security;<br />3. Learn2Earn system that allows candidates to earn tokens while improving their professional skills. Additionally, we are developing a revolutionary feature that will transform the connection between talent and opportunities.</span>} />
                <ModernFAQItem question="Is Gate33 available worldwide?" answer="Yes, Gate33 is available to users and companies globally." />
              </div>
            </div>
          </div>
        </section>

      </main>

      {/* Contact Modal */}
      {showContactModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-black/95 rounded-xl border border-orange-500/20 p-6 w-full max-w-md relative shadow-2xl">
            <button
              onClick={() => setShowContactModal(false)}
              className="absolute top-4 right-4 text-orange-400 hover:text-orange-300 text-2xl font-bold"
            >
              ×
            </button>
            <h3 className="text-2xl font-bold text-orange-500 mb-4 text-center">Contact Us</h3>
            <ContactForm 
              title="" 
              submitButtonText="Send Message"
              className="border-0"
              defaultSubject="Contact from Gate33 Website"
              showSubjectField={false}
              onSuccess={() => {                setShowContactModal(false);
              }}
            />
          </div>
        </div>
      )}
      </>
    </Layout>
  );
}

export default Home;

