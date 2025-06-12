'use client';

import React, { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import ContactForm from '../components/ContactForm';
import DevNoticePopup from '../components/DevNoticePopup';
import '../components/index-page.css';

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
    <>
      {showDevNotice && (
        <DevNoticePopup onClose={() => setShowDevNotice(false)} />
      )}
      {/* Hero Section - NOVO LAYOUT COM FUNDO FIXO */}
      <section className="hero-section-fixed-bg relative flex flex-col justify-center min-h-[50vh] px-4 pt-14 pb-12 overflow-hidden">
        <div className="hero-content w-full max-w-6xl mx-auto flex flex-col pt-4">
          {/* Título principal alinhado à esquerda */}
          <h1 className="font-verdana font-bold text-white mb-2 tracking-normal uppercase">
            <span className="text-[42px] leading-[40px] block mb-2">YOUR GATEWAY TO TRUSTED</span>
            <span className="text-gate33-orange text-[42px] leading-[40px] font-bold block mt-1">WEB3 OPPORTUNITIES</span>
          </h1>
          {/* Subtítulo alinhado à esquerda */}
          <p className="font-verdana font-normal text-xl md:text-2xl text-gray-200 mb-10 mt-6 max-w-2xl">
            Hire, Get Hired, Learn and Build Smarter<br />
            <span className="text-gate33-orange font-semibold">Verified. Secure. Web3-Native.</span>
          </p>
          {/* Section Cards com alinhamento aos limites do cartão laranja */}
          <div className="w-full mt-0.5 mb-1.5 relative">
            {/* Logo 3D G33 - Posicionado à esquerda, 3x maior e animado */}
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
            <div className="bg-transparent rounded-2xl py-8 relative overflow-visible w-full max-w-6xl mx-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 h-full w-full">
                {/* For Builders Section - Centered for even spacing */}
                <div className="flex justify-center">
                  <div className="rounded-2xl card-orange-glow p-5 h-auto flex flex-col justify-between w-[98%] group overflow-hidden">
              {/* Barra LED horizontal no topo */}
              <div className="absolute top-3 left-1/2 transform -translate-x-1/2 z-10">
                <div className="led-bar bg-gradient-to-r from-orange-400 via-orange-500 to-orange-400 rounded-full shadow-md shadow-orange-500/50"></div>
              </div>
              <div className="mb-2 text-center">
                <span className="font-verdana uppercase text-lg text-white font-bold tracking-wider mb-2 block">FOR BUILDERS</span>
                <h3 className="font-verdana text-gate33-orange font-medium text-base mb-2">Hire or Get Hired</h3>
                <p className="font-verdana text-gray-300 text-xs leading-relaxed mb-2">
                  Access <span className="text-gate33-orange font-medium">trusted</span> Web3 jobs or post roles with<br />
                  <span className="text-gate33-orange font-medium">escrow protection</span>. Build the future, <span className="text-gate33-orange font-medium">securely</span>.
                </p>
              </div>
              <div className="flex justify-center mb-2 gap-[9.32px]">
                <Link href="/jobs" className="font-verdana text-white font-medium text-sm transition-all duration-200 flex items-center justify-center gate33-btn-orange">
                  Find Jobs
                </Link>
                <span className="font-verdana text-white flex items-center text-[14px]">or</span>
                <Link href="/company-register" className="font-verdana text-white font-medium text-sm transition-all duration-200 flex items-center justify-center gate33-btn-orange">
                  Post Jobs
                </Link>
              </div>
                  </div>
                </div>
                {/* For Hodlers Section - Centered for even spacing */}
                <div className="flex justify-center">
                  <div className="rounded-2xl card-orange-glow card-hodlers p-5 h-auto flex flex-col justify-between w-[98%] group overflow-hidden">
              {/* Barra LED horizontal no topo */}
              <div className="absolute top-3 left-1/2 transform -translate-x-1/2 z-10">
                <div className="led-bar bg-gradient-to-r from-orange-400 via-orange-500 to-orange-400 rounded-full shadow-md shadow-orange-500/50"></div>
              </div>
              <div className="mb-2 text-center">
                <span className="font-verdana uppercase text-lg text-white font-bold tracking-wider mb-2 block">FOR HODLERS</span>
                <h3 className="font-verdana text-gate33-orange font-medium text-base mb-2">Use Crypto Tools</h3>
                <p className="font-verdana text-gray-300 text-xs leading-relaxed mb-2">
                  Analyze the market with <span className="text-gate33-orange font-medium">AI-powered tools</span> and<br />
                  insights. Make informed decisions, <span className="text-gate33-orange font-medium">faster</span>.
                </p>
              </div>
              <div className="flex justify-center mb-2">
                <Link href="/crypto-tools" className="font-verdana text-white font-medium text-sm transition-all duration-200 flex items-center justify-center whitespace-nowrap gate33-btn-orange">
                  Explore Crypto Tools
                </Link>
              </div>
                  </div>
                </div>
                {/* For Explorers Section - Centered for even spacing */}
                <div className="flex justify-center">
                  <div className="rounded-2xl card-orange-glow card-explorers p-5 h-auto flex flex-col justify-between w-[98%] group overflow-hidden">
              {/* Barra LED horizontal no topo */}
              <div className="absolute top-3 left-1/2 transform -translate-x-1/2 z-10">
                <div className="led-bar bg-gradient-to-r from-orange-400 via-orange-500 to-orange-400 rounded-full shadow-md shadow-orange-500/50"></div>
              </div>
              <div className="mb-2 text-center">
                <span className="font-verdana uppercase text-lg text-white font-bold tracking-wider mb-2 block">FOR EXPLORERS</span>
                <h3 className="font-verdana text-gate33-orange font-medium text-base mb-2">Learn 2 Earn</h3>
                <p className="font-verdana text-gray-300 text-xs leading-relaxed mb-2">
                  Take <span className="text-gate33-orange font-medium">Web3 Learn2Earn</span> and <span className="text-gate33-orange font-medium">earn token rewards</span>. Grow your knowledge, grow your portfolio.
                </p>
              </div>
              <div className="flex justify-center mb-2">
                <Link href="/learn2earn" className="font-verdana text-white font-medium text-sm transition-all duration-200 flex items-center justify-center gate33-btn-orange">
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

      {/* EVEN MORE...COMING SOON Section com alinhamento centrado */}
      <div className="w-full mt-0.5 mb-1.5">
        <div
          className="coming-soon-card rounded-[40px] py-8 px-10 shadow-lg shadow-black/10 relative overflow-hidden w-full max-w-6xl mx-auto text-center bg-[#F97316]"
        >
          <h2 className="text-3xl font-bold text-white text-center mb-4">EVEN MORE...COMING SOON</h2>
          <p className="text-[#0F0F0F] text-lg font-normal text-center mb-6">
            We're developing groundbreaking features that will transform how talent connects with opportunities.
          </p>
          <div className="w-full flex justify-center items-center">
            <form className="flex items-center gap-3 w-full max-w-xl mx-auto" onSubmit={e => { e.preventDefault(); handleWaitlistSubscribe(); }}>
              <input
                type="email"
                value={waitlistEmail || ''}
                onChange={e => setWaitlistEmail(e.target.value)}
                placeholder="Enter your e-mail here to stay up-to-date"
                className="waitlist-input-orange flex-1 focus:outline-none"
                disabled={waitlistLoading || waitlistSuccess}
              />
              <button
                type="submit"
                className="waitlist-btn-orange px-4 py-2.5 min-w-[90px]"
                disabled={waitlistLoading || waitlistSuccess}
              >
                Notify Me
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Featured Jobs Section - Novo layout horizontal, cards empilhados à direita */}
      <section id="jobs" className="jobs py-20 px-4 relative">
        <div className="relative z-10 flex flex-col lg:flex-row max-w-7xl mx-auto gap-10 items-start lg:items-center justify-center">
          {/* Coluna esquerda: título, descrição, botão */}
          <div className="flex-1 min-w-[260px] max-w-md lg:sticky lg:top-32 flex flex-col justify-center h-full">
            <h2 className="text-3xl font-bold text-gate33-orange mb-4 text-left">FEATURED JOBS</h2>
            <p className="text-left text-orange-300 mb-4 font-medium">
              Explore some of the current opportunities available on our platform.
            </p>
            <p className="text-gray-200 text-left text-sm mb-8 max-w-xs">
              Access quality Web3 jobs from verified companies or post roles as a trusted employer. Build your profile, manage applications, and connect securely with top talent in one place.
            </p>
            <Link href="/jobs" className="gate33-btn-orange text-white py-2.5 px-12 min-w-[230px] rounded-full font-semibold text-base cursor-pointer transition-all border-none shadow-lg hover:shadow-xl block w-fit">
              Explore The Job-Board
            </Link>
          </div>

          {/* Coluna direita: cards de vagas empilhados */}
          <div className="flex-1 w-full max-w-2xl flex flex-col gap-6">
            {/* Card 1 */}
            <Link href="/jobs" className="rounded-2xl card-orange-glow p-5 h-auto flex flex-row items-stretch w-full group overflow-visible relative cursor-pointer transition-transform hover:scale-[1.025] focus:outline-none focus:ring-2 focus:ring-orange-500">
              {/* Efeito de luz vertical tipo lanterna */}
              <div className="lamp-light-vertical"></div>
              {/* Barra LED vertical à esquerda + efeito de luz só no hover */}
              <div className="flex flex-col justify-center items-center mr-5 relative">
                <div className="led-bar-vertical bg-gradient-to-b from-orange-400 via-orange-500 to-orange-400 rounded-full shadow-md shadow-orange-500/50 w-1 h-12 z-10"></div>
              </div>
              <div className="flex-1">
                <h3 className="font-verdana font-bold text-white text-lg mb-1">Blockchain Developer <span className="text-gray-400 font-normal text-base">@Polygon</span></h3>
                <div className="flex flex-wrap gap-2 mb-2">
                  <span className="bg-orange-500/20 text-orange-400 text-xs px-2 py-0.5 rounded font-semibold">Remote</span>
                  <span className="bg-orange-500/20 text-orange-400 text-xs px-2 py-0.5 rounded font-semibold">Contract</span>
                </div>
                <p className="text-gray-200 text-sm mb-2 text-justify pr-2">
                  Develop and maintain decentralized applications (DApps) using Solidity. Experience with smart contracts and Web3.js.
                </p>
              </div>
            </Link>
            {/* Card 2 */}
            <Link href="/jobs" className="rounded-2xl card-orange-glow p-5 h-auto flex flex-row items-stretch w-full group overflow-visible relative cursor-pointer transition-transform hover:scale-[1.025] focus:outline-none focus:ring-2 focus:ring-orange-500">
              {/* Efeito de luz vertical tipo lanterna */}
              <div className="lamp-light-vertical"></div>
              {/* Barra LED vertical à esquerda + efeito de luz só no hover */}
              <div className="flex flex-col justify-center items-center mr-5 relative">
                <div className="led-bar-vertical bg-gradient-to-b from-orange-400 via-orange-500 to-orange-400 rounded-full shadow-md shadow-orange-500/50 w-1 h-12 z-10"></div>
              </div>
              <div className="flex-1">
                <h3 className="font-verdana font-bold text-white text-lg mb-1">Digital Marketing Analyst <span className="text-gray-400 font-normal text-base">@OpenSea</span></h3>
                <div className="flex flex-wrap gap-2 mb-2">
                  <span className="bg-orange-500/20 text-orange-400 text-xs px-2 py-0.5 rounded font-semibold">Lisbon</span>
                  <span className="bg-orange-500/20 text-orange-400 text-xs px-2 py-0.5 rounded font-semibold">Full-time</span>
                </div>
                <p className="text-gray-200 text-sm mb-2 text-justify pr-2">
                  Develop digital marketing strategies focused on cryptocurrency and blockchain markets. SEO, SEM, and social media.
                </p>
              </div>
            </Link>
            {/* Card 3 */}
            <Link href="/jobs" className="rounded-2xl card-orange-glow p-5 h-auto flex flex-row items-stretch w-full group overflow-visible relative cursor-pointer transition-transform hover:scale-[1.025] focus:outline-none focus:ring-2 focus:ring-orange-500">
              {/* Efeito de luz vertical tipo lanterna */}
              <div className="lamp-light-vertical"></div>
              {/* Barra LED vertical à esquerda + efeito de luz só no hover */}
              <div className="flex flex-col justify-center items-center mr-5 relative">
                <div className="led-bar-vertical bg-gradient-to-b from-orange-400 via-orange-500 to-orange-400 rounded-full shadow-md shadow-orange-500/50 w-1 h-12 z-10"></div>
              </div>
              <div className="flex-1">
                <h3 className="font-verdana font-bold text-white text-lg mb-1">Security Specialist <span className="text-gray-400 font-normal text-base">@Ethereum Foundation</span></h3>
                <div className="flex flex-wrap gap-2 mb-2">
                  <span className="bg-orange-500/20 text-orange-400 text-xs px-2 py-0.5 rounded font-semibold">Remote</span>
                  <span className="bg-orange-500/20 text-orange-400 text-xs px-2 py-0.5 rounded font-semibold">Full-time</span>
                </div>
                <p className="text-gray-200 text-sm mb-2 text-justify pr-2">
                  Conduct thorough audits of smart contracts while implementing robust security protocols to enhance the safety and reliability of blockchain-based applications.
                </p>
              </div>
            </Link>
          </div>
        </div>
      </section>

      <main className="min-h-screen bg-gradient-to-b from-black via-black to-black text-white relative overflow-hidden gate33-main-section">
        <section id="about" className="about py-20 px-4 relative">
          <div className="relative z-10 flex flex-col lg:flex-row max-w-7xl mx-auto gap-4 items-start justify-start">
            {/* Cartões à esquerda - grid 3x2 compacto */}
            <div className="flex-shrink-0 w-full lg:w-[65%]">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 w-full">
                {/* Card 1 */}
                <div className="rounded-2xl card-orange-glow p-4 flex flex-col items-center w-full aspect-square min-h-[240px] max-h-[300px] group overflow-visible relative cursor-pointer transition-transform hover:scale-[1.025] focus:outline-none focus:ring-2 focus:ring-orange-500">
                  <div className="absolute top-3 right-3 z-10">
                    <span className="bg-blue-500 text-white text-xs px-2 py-1 rounded-full font-semibold">New</span>
                  </div>
                  <Image src="/icons/Vector.png" alt="Governance AI Icon" width={40} height={40} className="mb-2" />
                  <div className="flex-1 flex flex-col justify-between w-full">
                    <div>
                      <h3 className="font-verdana font-bold text-white text-lg mb-1">Governance AI</h3>
                      <p className="text-gray-300 text-sm mb-4">
                        Use artificial intelligence to help with governance decisions and proposals. This feature integrates with your connected wallet for DAO interactions.
                      </p>
                    </div>
                    <Link href="/crypto-tools/governance-ai" className="gate33-btn-orange text-white py-2 px-4 rounded-full font-semibold text-sm cursor-pointer transition-all border-none shadow-lg hover:shadow-xl mt-auto">
                      Try This Out
                    </Link>
                  </div>
                </div>
                {/* Card 2 */}
                <div className="rounded-2xl card-orange-glow p-4 flex flex-col items-center w-full aspect-square min-h-[240px] max-h-[300px] group overflow-visible relative cursor-pointer transition-transform hover:scale-[1.025] focus:outline-none focus:ring-2 focus:ring-orange-500">
                  <Image src="/icons/Vector (4).png" alt="Market List Icon" width={40} height={40} className="mb-2" />
                  <div className="flex-1 flex flex-col justify-between w-full">
                    <div>
                      <h3 className="font-verdana font-bold text-white text-lg mb-1">Market List</h3>
                      <p className="text-gray-300 text-sm mb-4">
                        Use artificial intelligence to help with governance decisions and proposals. This feature integrates with your connected wallet for DAO interactions.
                      </p>
                    </div>
                    <Link href="/crypto-tools/market-list" className="gate33-btn-orange text-white py-2 px-4 rounded-full font-semibold text-sm cursor-pointer transition-all border-none shadow-lg hover:shadow-xl mt-auto">
                      Try This Out
                    </Link>
                  </div>
                </div>
                {/* Card 3 */}
                <div className="rounded-2xl card-orange-glow p-4 flex flex-col items-center w-full aspect-square min-h-[240px] max-h-[300px] group overflow-visible relative cursor-pointer transition-transform hover:scale-[1.025] focus:outline-none focus:ring-2 focus:ring-orange-500">
                  <Image src="/icons/Vector (5).png" alt="Bitcoin Analysis Icon" width={40} height={40} className="mb-2" />
                  <div className="flex-1 flex flex-col justify-between w-full">
                    <div>
                      <h3 className="font-verdana font-bold text-white text-lg mb-1">Bitcoin Analysis</h3>
                      <p className="text-gray-300 text-sm mb-4">
                        Real-time Bitcoin price data, market sentiment analysis, and useful trading utilities powered by free APIs.
                      </p>
                    </div>
                    <Link href="/crypto-tools/bitcoin-analysis" className="gate33-btn-orange text-white py-2 px-4 rounded-full font-semibold text-sm cursor-pointer transition-all border-none shadow-lg hover:shadow-xl mt-auto">
                      Try This Out
                    </Link>
                  </div>
                </div>
                {/* Card 4 */}
                <div className="rounded-2xl card-orange-glow p-4 flex flex-col items-center w-full aspect-square min-h-[240px] max-h-[300px] group overflow-visible relative cursor-pointer transition-transform hover:scale-[1.025] focus:outline-none focus:ring-2 focus:ring-orange-500">
                  <div className="absolute top-3 right-3 z-10">
                    <span className="bg-blue-500 text-white text-xs px-2 py-1 rounded-full font-semibold">New</span>
                  </div>
                  <Image src="/icons/Vector (1).png" alt="AI Smart Contracts Icon" width={40} height={40} className="mb-2" />
                  <div className="flex-1 flex flex-col justify-between w-full">
                    <div>
                      <h3 className="font-verdana font-bold text-white text-lg mb-1">AI Smart Contracts</h3>
                      <p className="text-gray-300 text-sm mb-4">
                        AI-powered smart contract auditing tool will analyze your contracts for gas optimization opportunities and security best practices.
                      </p>
                    </div>
                    <button className="bg-gray-400 text-white py-2 px-4 rounded-full font-semibold text-sm cursor-not-allowed mt-auto" disabled>
                      Coming Soon
                    </button>
                  </div>
                </div>
                {/* Card 5 */}
                <div className="rounded-2xl card-orange-glow p-4 flex flex-col items-center w-full aspect-square min-h-[240px] max-h-[300px] group overflow-visible relative cursor-pointer transition-transform hover:scale-[1.025] focus:outline-none focus:ring-2 focus:ring-orange-500">
                  <Image src="/icons/Vector (6).png" alt="Staking Tool Icon" width={40} height={40} className="mb-2" />
                  <div className="flex-1 flex flex-col justify-between w-full">
                    <div>
                      <h3 className="font-verdana font-bold text-white text-lg mb-1">Staking Tool</h3>
                      <p className="text-gray-300 text-sm mb-4">
                        Stake your tokens and earn rewards through our secure staking platform. Support the network while generating passive income.
                      </p>
                    </div>
                    <button className="bg-gray-400 text-white py-2 px-4 rounded-full font-semibold text-sm cursor-not-allowed mt-auto" disabled>
                      Coming Soon
                    </button>
                  </div>
                </div>
                {/* Card 6 */}
                <div className="rounded-2xl card-orange-glow p-4 flex flex-col items-center w-full aspect-square min-h-[240px] max-h-[300px] group overflow-visible relative cursor-pointer transition-transform hover:scale-[1.025] focus:outline-none focus:ring-2 focus:ring-orange-500">
                  <div className="absolute top-3 right-3 z-10">
                    <span className="bg-orange-500 text-white text-xs px-2 py-1 rounded-full font-semibold">Popular</span>
                  </div>
                  <Image src="/icons/Vector (4).png" alt="Market Gap Icon" width={40} height={40} className="mb-2" />
                  <div className="flex-1 flex flex-col justify-between w-full">
                    <div>
                      <h3 className="font-verdana font-bold text-white text-lg mb-1">Market Gap</h3>
                      <p className="text-gray-300 text-sm mb-4">
                        Use artificial intelligence to help with governance decisions and proposals. This feature integrates with your connected wallet for DAO interactions.
                      </p>
                    </div>
                    <Link href="/crypto-tools/market-gap" className="gate33-btn-orange text-white py-2 px-4 rounded-full font-semibold text-sm cursor-pointer transition-all border-none shadow-lg hover:shadow-xl mt-auto">
                      Try This Out
                    </Link>
                  </div>
                </div>
              </div>
            </div>
            {/* Texto à direita alinhado ao topo, largura fixa, sem centralização vertical */}
            <div className="flex-shrink-0 w-full lg:w-[30%] flex flex-col justify-start items-start text-left mt-8 lg:mt-0">
              <h2 className="text-3xl font-bold text-white mb-4 leading-tight">EXPLORE OUR CRYPTO TOOLS</h2>
              <p className="text-orange-400 font-semibold mb-3 leading-snug">Crypto Tools offers solutions for analyzing Ethereum wallets. Features include ENS resolution, wallet age assessment, and dust token detection.</p>
              <p className="text-gray-200 mb-6 leading-snug">Operations are secure in your browser, using public APIs and your Ethereum provider. Private keys remain secure and never exposed.</p>
              <Link href="/crypto-tools" className="gate33-btn-orange text-white py-2.5 px-6 rounded-full font-semibold text-base cursor-pointer transition-all border-none shadow-lg hover:shadow-xl">
                Explore Our Crypto Tools
              </Link>
            </div>
          </div>
        </section>

        <section id="services" className="services py-20 text-center px-4 relative">
          <div className="relative z-10">
            <h2 className="text-3xl font-bold text-gate33-orange mb-6">Our Services</h2>
            <p className="text-gray-200 max-w-4xl mx-auto mb-10 text-base leading-relaxed">
              We offer a range of services tailored to the needs of Web3 professionals and companies, including job postings, talent sourcing, and innovative learning and earning programs.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
              <div className="service-card bg-black/80 rounded-lg p-6 border border-orange-500/20 hover:border-orange-500/40 transition-all shadow-lg">
                <h3 className="text-xl font-medium text-orange-500 mb-4">Job Postings</h3>
                <p className="text-gray-300 text-sm mb-4">
                  Post your job openings and connect with a pool of talented Web3 professionals. Our platform ensures that your listings reach the right audience.
                </p>
                <Link href="/company-register" className="text-orange-400 text-sm hover:underline">
                  Start Hiring Today →
                </Link>
              </div>
              <div className="service-card bg-black/80 rounded-lg p-6 border border-orange-500/20 hover:border-orange-500/40 transition-all shadow-lg">
                <h3 className="text-xl font-medium text-orange-500 mb-4">Talent Sourcing</h3>
                <p className="text-gray-300 text-sm mb-4">
                  Let us help you find the perfect candidate for your Web3 project. We source and vet top talent to match your specific requirements.
                </p>
                <Link href="/contact" className="text-orange-400 text-sm hover:underline">
                  Contact Sales to Learn More →
                </Link>
              </div>
              <div className="service-card bg-black/80 rounded-lg p-6 border border-orange-500/20 hover:border-orange-500/40 transition-all shadow-lg">
                <h3 className="text-xl font-medium text-orange-500 mb-4">Learn and Earn</h3>
                <p className="text-gray-300 text-sm mb-4">
                  Join our Learn2Earn program and gain rewards while you learn. Enhance your skills and increase your visibility to potential employers.
                </p>
                <Link href="/learn2earn" className="text-orange-400 text-sm hover:underline">
                  Discover Learn2Earn →
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section id="companies" className="companies py-20 text-center px-4 relative">
          <div className="relative z-10">
            <h2 className="text-3xl font-bold text-gate33-orange mb-8">Trusted Companies</h2>
            <p className="text-gray-200 max-w-4xl mx-auto mb-10 text-base leading-relaxed">
              All companies on our platform undergo a verification process to ensure a safe environment for candidates.
            </p>
            <div className="company-logos flex flex-wrap justify-center items-center gap-10 mx-auto max-w-5xl mb-10">
              <div className="company-logo bg-black/80 rounded-lg p-5 w-40 h-24 flex items-center justify-center hover:scale-105 hover:shadow-lg transition-all border border-orange-500/10 hover:border-orange-500/30">
                <Image src="/logo2.png" alt="Company Logo" width={120} height={40} className="company-logo-image" />
              </div>
              <div className="company-logo bg-black/80 rounded-lg p-5 w-40 h-24 flex items-center justify-center hover:scale-105 hover:shadow-lg transition-all border border-orange-500/10 hover:border-orange-500/30">
                <Image src="/logo2.png" alt="Company Logo" width={120} height={40} className="company-logo-image" />
              </div>
              <div className="company-logo bg-black/80 rounded-lg p-5 w-40 h-24 flex items-center justify-center hover:scale-105 hover:shadow-lg transition-all border border-orange-500/10 hover:border-orange-500/30">
                <Image src="/logo2.png" alt="Company Logo" width={120} height={40} className="company-logo-image" />
              </div>
              <div className="company-logo bg-black/80 rounded-lg p-5 w-40 h-24 flex items-center justify-center hover:scale-105 hover:shadow-lg transition-all border border-orange-500/10 hover:border-orange-500/30">
                <Image src="/logo2.png" alt="Company Logo" width={120} height={40} className="company-logo-image" />
              </div>
              <div className="company-logo bg-black/80 rounded-lg p-5 w-40 h-24 flex items-center justify-center hover:scale-105 hover:shadow-lg transition-all border border-orange-500/10 hover:border-orange-500/30">
                <Image src="/logo2.png" alt="Company Logo" width={120} height={40} className="company-logo-image" />
              </div>
              <div className="company-logo bg-black/80 rounded-lg p-5 w-40 h-24 flex items-center justify-center hover:scale-105 hover:shadow-lg transition-all border border-orange-500/10 hover:border-orange-500/30">
                <Image src="/logo2.png" alt="Company Logo" width={120} height={40} className="company-logo-image" />
              </div>
            </div>
            <Link href="/crypto-tools" className="text-orange-400 text-sm hover:text-orange-300 hover:underline font-medium">
              View all verified companies →
            </Link>
          </div>
        </section>

        <section id="partners" className="partners py-20 text-center px-4 relative">
          <div className="relative z-10">
            <h2 className="text-3xl font-bold text-gate33-orange mb-8">Our Strategic Partners</h2>
            <p className="text-gray-200 max-w-4xl mx-auto mb-10 text-base leading-relaxed">
              Gate33 has established strategic partnerships with leading organizations in the blockchain, technology, and recruitment sectors. These collaborations enable us to provide enhanced services, cutting-edge solutions, and expanded opportunities for our community.
            </p>
            
            {partners.length > 0 ? (
              <div className="partners-container max-w-6xl mx-auto mb-10">
                {partners.length <= 3 ? (
                  // Center partners when 3 or fewer
                  <div className="flex justify-center items-center gap-8 flex-wrap">
                    {partners.map((partner) => (
                      <div key={partner.id} className="partner-card bg-black/80 rounded-lg p-6 border border-orange-500/20 hover:border-orange-500/50 transition-all shadow-lg flex-shrink-0 w-80">
                        <div className="partner-logo w-full h-20 flex items-center justify-center mb-4">
                          <a href={partner.website || '#'} target="_blank" rel="noopener noreferrer" title={`Visit ${partner.name}`}>
                            <div className="w-24 h-24 rounded-full bg-white flex items-center justify-center shadow-md border-2 border-orange-500 overflow-hidden">
                              <Image 
                                src={partner.logoUrl}
                                alt={`${partner.name} Logo`}
                                width={90}
                                height={90}
                                className="partner-logo-container"
                              />
                            </div>
                          </a>
                        </div>
                        <h3 className="text-xl text-orange-500 mb-2">{partner.name}</h3>
                        <p className="text-gray-300 text-sm mb-4">
                          {partner.description}
                        </p>
                        {partner.website && (
                          <a href={partner.website} target="_blank" rel="noopener noreferrer" className="text-orange-400 text-sm hover:underline">Visit {partner.name} →</a>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  // Scrolling carousel when more than 3 partners
                  <div className="partners-scroll-container overflow-x-auto overflow-y-hidden">
                    <div 
                      ref={carouselRef}
                      className="flex gap-8 pb-4"
                    >
                      {partners.map((partner) => (
                        <div key={partner.id} className="partner-card bg-black/80 rounded-lg p-6 border border-orange-500/20 hover:border-orange-500/50 transition-all shadow-lg flex-shrink-0 w-80">
                          <div className="partner-logo w-full h-20 flex items-center justify-center mb-4">
                            <a href={partner.website || '#'} target="_blank" rel="noopener noreferrer" title={`Visit ${partner.name}`}>
                              <div className="w-24 h-24 rounded-full bg-white flex items-center justify-center shadow-md border-2 border-orange-500 overflow-hidden">
                                <Image 
                                  src={partner.logoUrl}
                                  alt={`${partner.name} Logo`}
                                  width={90}
                                  height={90}
                                  className="partner-logo-container"
                                />
                              </div>
                            </a>
                          </div>
                          <h3 className="text-xl text-orange-500 mb-2">{partner.name}</h3>
                          <p className="text-gray-300 text-sm mb-4">
                            {partner.description}
                          </p>
                          {partner.website && (
                            <a href={partner.website} target="_blank" rel="noopener noreferrer" className="text-orange-400 text-sm hover:underline">Visit {partner.name} →</a>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center mb-10">
                <p className="text-gray-400">Partners will be displayed here once added.</p>
              </div>
            )}
            
            {loading && (
              <div className="text-center mb-10">
                <p className="text-gray-400">Loading partners...</p>
              </div>
            )}
          </div>
        </section>

        <section id="contact" className="contact py-20 text-center px-4 relative">
          <div className="relative z-10">
            <h2 className="text-3xl font-bold text-gate33-orange mb-6">Contact Us</h2>
            <p className="text-gray-200 max-w-xl mx-auto mb-10 text-base leading-relaxed">
              Have a question or need help? Contact us and we'll respond as quickly as possible.
            </p>
            <button
              onClick={() => setShowContactModal(true)}
              className="gate33-btn text-white py-2.5 px-8 rounded-full transition-colors shadow-lg hover:shadow-xl font-medium"
            >
              Get in Touch
            </button>
          </div>
        </section>

        <section id="faq" className="faq py-20 px-4 relative">
          <div className="relative z-10">
            <h2 className="text-3xl font-bold text-gate33-orange mb-10 text-center">Frequently Asked Questions</h2>
            <div className="faq-container max-w-4xl mx-auto bg-black/80 rounded-xl border border-orange-500/10 p-6 shadow-lg">
              <FAQItem
                question="How does Gate33 ensure companies are trustworthy?"
                answer="All companies undergo a rigorous verification process before they can post jobs on our platform. We verify business documents, assess market reputation, and continuously monitor the quality of published jobs to ensure a safe environment for candidates."
              />
              <FAQItem
                question="What makes Gate33 different from other job platforms?"
                answer="Gate33 differentiates itself through three main factors: (1) Rigorous company verification; (2) Use of blockchain technology to ensure data security; (3) Learn2Earn system that allows candidates to earn tokens while improving their professional skills. Additionally, we're developing a revolutionary new feature that will transform how talent connects with opportunities."
              />
              <FAQItem
                question="How does the Learn2Earn program work?"
                answer="Learn2Earn is an exclusive program where partner companies create educational content about their technologies and processes. Candidates who complete this content earn tokens as rewards and increase their chances of being hired by demonstrating interest and knowledge in specific company areas."
              />
              <FAQItem
                question="Is it free for candidates to register on the platform?"
                answer="Yes, registration and job applications are completely free for candidates. Our business model is based on services offered to companies that want to post jobs and access our qualified talent pool."
              />
              <FAQItem
                question="How does Gate33 use blockchain to improve the recruitment process?"
                answer="We use blockchain to: (1) Verify the authenticity of certificates and qualifications; (2) Protect personal data against leaks; (3) Ensure that companies keep their promises during the recruitment process; (4) Enable secure token reward payments through the Learn2Earn program."
              />
              <FAQItem
                question="What is this new feature coming soon?"
                answer="We're developing a groundbreaking new way to connect talent with opportunities that will fundamentally change how work is discovered, agreed upon, and compensated. While we can't reveal all the details yet, it will combine instant matching with verified payments and smart contracts to create a seamless, secure experience for both talent and employers."
              />
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
              onSuccess={() => {
                setShowContactModal(false);
              }}
            />
          </div>
        </div>
      )}
    </>
  );
}

export default Home;

