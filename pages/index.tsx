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
      <section className="hero-section-fixed-bg relative flex flex-col justify-center min-h-[90vh] px-4 py-16 overflow-hidden">
        <div className="hero-content w-full max-w-6xl mx-auto flex flex-col pt-20">
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
          <div className="w-full mt-14 mb-6 relative">
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
                  <div className="rounded-2xl card-orange-glow card-builders p-5 h-auto flex flex-col justify-between w-[98%] group overflow-hidden">
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
              <div className="flex justify-center mb-2" style={{ gap: '9.32px' }}>
                <Link href="/jobs" className="font-verdana text-white font-medium text-sm transition-all duration-200 flex items-center justify-center" style={{ 
                  width: '150px', 
                  height: '34px', 
                  borderRadius: '12px', 
                  paddingLeft: '20px', 
                  paddingRight: '20px',
                  paddingTop: '0',
                  paddingBottom: '0',
                  background: '#FF6A00'
                }}>
                  Find Jobs
                </Link>
                <span className="font-verdana text-white flex items-center" style={{ fontSize: '14px' }}>or</span>
                <Link href="/company-register" className="font-verdana text-white font-medium text-sm transition-all duration-200 flex items-center justify-center" style={{ 
                  width: '150px', 
                  height: '34px', 
                  borderRadius: '12px', 
                  paddingLeft: '20px', 
                  paddingRight: '20px',
                  paddingTop: '0',
                  paddingBottom: '0',
                  background: '#FF6A00'
                }}>
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
                <Link href="/crypto-tools" className="font-verdana text-white font-medium text-sm transition-all duration-200 flex items-center justify-center whitespace-nowrap" style={{ 
                  width: '180px', 
                  height: '34px', 
                  borderRadius: '12px', 
                  paddingLeft: '20px', 
                  paddingRight: '20px',
                  paddingTop: '0',
                  paddingBottom: '0',
                  background: '#FF6A00'
                }}>
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
                <Link href="/learn2earn" className="font-verdana text-white font-medium text-sm transition-all duration-200 flex items-center justify-center" style={{ 
                  width: '180px', 
                  height: '34px', 
                  borderRadius: '12px', 
                  paddingLeft: '20px', 
                  paddingRight: '20px',
                  paddingTop: '0',
                  paddingBottom: '0',
                  background: '#FF6A00'
                }}>
                  Start Learning
                </Link>
              </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          {/* EVEN MORE...COMING SOON Section com alinhamento centrado */}
          <div className="w-full mt-14 mb-6">
            <div
              className="coming-soon-card rounded-[40px] py-8 px-10 shadow-lg shadow-black/10 relative overflow-hidden w-full max-w-6xl mx-auto text-center"
              style={{ background: '#F97316' }}
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
        </div>
      </section>

      <main className="min-h-screen bg-gradient-to-b from-black via-black to-black text-white relative overflow-hidden gate33-main-section">

        <section id="about" className="about py-20 text-center px-4 relative overflow-hidden">
          <div className="relative z-10">
            <h2 className="text-3xl font-bold text-gate33-orange mb-8">Why Choose Gate33?</h2>
            <p className="text-gray-200 mb-10 max-w-5xl mx-auto text-base leading-relaxed">
              We offer a secure environment where verified companies post genuine job opportunities and qualified candidates can 
              find real opportunities. Our platform uses blockchain technology to ensure greater transparency and security throughout the process.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 text-left mt-10 px-5 max-w-6xl mx-auto">
              <div className="bg-black/10 rounded-lg p-8 backdrop-blur-sm border border-orange-500/20 hover:-translate-y-2 hover:shadow-lg transition-all">
                <h3 className="text-xl text-gate33-orange mb-4">Verified Companies</h3>
                <p className="text-gray-200 text-sm">
                  All companies on our platform undergo a rigorous verification process to ensure 
                  legitimacy and reliability in job postings.
                </p>
              </div>
              <div className="bg-black/10 rounded-lg p-8 backdrop-blur-sm border border-orange-500/20 hover:-translate-y-2 hover:shadow-lg transition-all">
                <h3 className="text-xl text-gate33-orange mb-4">Quality Opportunities</h3>
                <p className="text-gray-200 text-sm">
                  Curated high-quality job listings with detailed descriptions, clear benefits, and 
                  transparent selection processes.
                </p>
              </div>
              <div className="bg-black/10 rounded-lg p-8 backdrop-blur-sm border border-orange-500/20 hover:-translate-y-2 hover:shadow-lg transition-all">
                <h3 className="text-xl text-gate33-orange mb-4">Data Security</h3>
                <p className="text-gray-200 text-sm">
                  Our platform prioritizes the protection of your personal information with 
                  advanced security measures to keep your profile and application data safe.
                </p>
              </div>
              <div className="bg-black/10 rounded-lg p-8 backdrop-blur-sm border border-orange-500/20 hover:-translate-y-2 hover:shadow-lg transition-all">
                <h3 className="text-xl text-gate33-orange mb-4">Learn2Earn</h3>
                <p className="text-gray-200 text-sm">
                  Enhance your skills and earn rewards by participating in our Learn2Earn program, 
                  where learning converts into real opportunities.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section id="services" className="services py-20 text-center px-4 relative">
          <div className="relative z-10">
            <h2 className="text-3xl font-bold text-gate33-orange mb-8">Our Services</h2>
            <p className="text-gray-200 max-w-4xl mx-auto mb-10 text-base leading-relaxed">
              Gate33 offers a complete platform to connect companies and candidates securely and efficiently.
            </p>
            <div className="services-grid grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
              <div className="service-card bg-black/80 rounded-lg p-7 h-40 max-w-xs min-h-[160px] text-left border border-orange-500/20 hover:translate-y-[-10px] hover:bg-black hover:border-orange-500/40 transition-all shadow-lg">
                <div className="service-icon text-orange-500 text-5xl mb-4">🔎</div>
                <h3 className="text-xl text-gate33-orange mb-4">For Job Seekers</h3>
                <p className="text-gray-200 text-sm mb-4 text-left">
                  Access quality jobs from verified companies, create a standout professional profile, and 
                  track your applications in one place.
                </p>
                <Link href="/seeker-signup" className="text-orange-400 text-sm hover:underline">Register as a job seeker →</Link>
              </div>
              <div className="service-card bg-black/80 rounded-lg p-7 h-40 max-w-xs min-h-[160px] text-left border border-orange-500/20 hover:translate-y-[-10px] hover:bg-black hover:border-orange-500/40 transition-all shadow-lg">
                <div className="service-icon text-orange-500 text-5xl mb-4">💼</div>
                <h3 className="text-xl text-gate33-orange mb-4">For Companies</h3>
                <p className="text-gray-200 text-sm mb-4 text-left">
                  Post jobs for qualified professionals, manage applications, and maintain a 
                  corporate profile that highlights your culture and values.
                </p>
                <Link href="/company-register" className="text-orange-400 text-sm hover:underline">Register as a company →</Link>
              </div>
              <div className="service-card bg-black/80 rounded-lg p-7 h-40 max-w-xs min-h-[160px] text-left border border-orange-500/20 hover:translate-y-[-10px] hover:bg-black hover:border-orange-500/40 transition-all shadow-lg">
                <div className="service-icon text-orange-500 text-5xl mb-4">🧠</div>
                <h3 className="text-xl text-gate33-orange mb-4">Learn2Earn</h3>
                <p className="text-gray-200 text-sm mb-4 text-left">
                  Participate in educational programs offered by partner companies, learn new 
                  skills, and receive token rewards for completing courses.
                </p>
                <Link href="/learn2earn" className="text-orange-400 text-sm hover:underline">Discover Learn2Earn →</Link>
              </div>
            </div>
          </div>
        </section>

        <section id="jobs" className="jobs py-20 text-center px-4 relative">
          <div className="relative z-10">
            <h2 className="text-3xl font-bold text-gate33-orange mb-8">Featured Jobs</h2>
            <p className="text-gray-200 max-w-4xl mx-auto mb-10 text-base leading-relaxed">
              Explore some of the current opportunities available on our platform.
            </p>
            <div className="jobs-grid grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
              <div className="job-card bg-black/80 rounded-lg p-6 border border-orange-500/20 hover:border-orange-500/40 transition-all shadow-lg hover:shadow-xl">
                <h3 className="text-xl font-medium text-orange-500 mb-2">Blockchain Developer</h3>
                <p className="text-gray-500 text-sm mb-4">TechFinance • Remote</p>
                <p className="text-gray-300 text-sm mb-4 line-clamp-3">
                  Develop and maintain decentralized applications (DApps) using Solidity. Experience with smart contracts and Web3.js.
                </p>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-400">Full-time</span>
                  <Link href="/jobs" className="text-orange-400 text-sm hover:underline">View job</Link>
                </div>
              </div>
              <div className="job-card bg-black/80 rounded-lg p-6 border border-orange-500/20 hover:border-orange-500/40 transition-all shadow-lg hover:shadow-xl">
                <h3 className="text-xl font-medium text-orange-500 mb-2">Digital Marketing Analyst</h3>
                <p className="text-gray-500 text-sm mb-4">CryptoMedia • São Paulo</p>
                <p className="text-gray-300 text-sm mb-4 line-clamp-3">
                  Develop digital marketing strategies focused on cryptocurrency and blockchain markets. SEO, SEM, and social media.
                </p>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-400">Full-time</span>
                  <Link href="/jobs" className="text-orange-400 text-sm hover:underline">View job</Link>
                </div>
              </div>
              <div className="job-card bg-black/80 rounded-lg p-6 border border-orange-500/20 hover:border-orange-500/40 transition-all shadow-lg hover:shadow-xl">
                <h3 className="text-xl font-medium text-orange-500 mb-2">Security Specialist</h3>
                <p className="text-gray-500 text-sm mb-4">SecureChain • Lisbon</p>
                <p className="text-gray-300 text-sm mb-4 line-clamp-3">
                  Audit smart contracts and implement security protocols in blockchain-based applications.
                </p>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-400">Full-time</span>
                  <Link href="/jobs" className="text-orange-400 text-sm hover:underline">View job</Link>
                </div>
              </div>
            </div>
            <div className="mt-10">
              <Link href="/jobs" className="gate33-btn text-white py-3 px-8 rounded-full font-semibold text-lg cursor-pointer transition-all border-none shadow-lg hover:shadow-xl">
                View all jobs
              </Link>
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

