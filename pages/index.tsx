'use client';

import React, { useState, useEffect } from 'react';
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
        <span className="text-orange-500 text-xl">{isOpen ? '-' : '+'}</span>
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
  const [waitlistError, setWaitlistError] = useState("");

  useEffect(() => {
    fetchPartners();
  }, []);

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

  // Matrix Rain Effect
  useEffect(() => {
    const matrix = document.getElementById('matrix-container');
    if (!matrix) return;

    const chars = '01GATE33BLOCKCHAIN';
    const createMatrixChar = () => {
      const char = document.createElement('div');
      char.className = 'matrix-char';
      char.textContent = chars[Math.floor(Math.random() * chars.length)];
      char.style.left = Math.random() * 100 + '%';
      char.style.animationDuration = (Math.random() * 3 + 2) + 's';
      char.style.animationDelay = Math.random() * 2 + 's';
      matrix.appendChild(char);

      // Remove char after animation
      setTimeout(() => {
        if (char.parentNode) {
          char.parentNode.removeChild(char);
        }
      }, 5000);
    };

    // Create matrix chars periodically
    const interval = setInterval(createMatrixChar, 100);

    return () => {
      clearInterval(interval);
      if (matrix) {
        matrix.innerHTML = '';
      }
    };
  }, []);

  return (
    <>
      <div id="matrix-container"></div>
      {showDevNotice && (
        <DevNoticePopup onClose={() => setShowDevNotice(false)} />
      )}
      {/* Hero Section - NOVO LAYOUT */}
      <section className="relative flex flex-col items-center justify-center min-h-[90vh] bg-gradient-to-br from-black via-[#1a1a1a] to-black px-4 py-16 overflow-hidden">
        {/* BG Portão decorativo */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
          <Image
            src="/images/bg.png"
            alt="Gate33 Portal Background"
            fill
            className="bg-portal-image"
            priority
            sizes="100vw"
          />
        </div>
        {/* Efeito de luz da lâmpada - posicionado exatamente na lanterna */}
        <div className="lamp-light-effect" />
        {/* Cone de luz da lâmpada */}
        <div className="lamp-cone-light" />
        {/* Logo centralizado - ligeiramente abaixo da luz e menor */}
        <div className="mt-4 mb-6 flex flex-col items-center z-10">
          <Image
            src="/images/Logo_Icon-temp-no-glow.png"
            alt="Gate33 Logo"
            width={150}
            height={150}
            className="mx-auto logo-with-glow"
            priority
          />
        </div>
        {/* Título principal */}
        <h1 className="text-2xl md:text-4xl font-bold text-center text-white mb-2 tracking-wide">
          YOUR GATEWAY TO TRUSTED<br />
          <span className="text-orange-500 text-3xl md:text-5xl font-extrabold block mt-1">WEB3 OPPORTUNITIES</span>
        </h1>
        {/* Subtítulo */}
        <p className="text-base md:text-lg text-center text-gray-200 mb-10 mt-2 max-w-2xl">
          Hire, Get Hired, Learn and Build Smarter&nbsp;
          <span className="text-orange-400 font-semibold">Verified. Secure. Web3-Native.</span>
        </p>
        {/* Cards */}
        <div className="w-full max-w-6xl flex flex-col md:flex-row gap-6 justify-center items-center mt-4">
          {/* Card 1 */}
          <div className="bg-black/90 rounded-2xl p-7 flex-1 min-w-[390px] max-w-md flex flex-col items-start border border-[#232323] shadow-lg relative">
            <span className="uppercase text-xs text-orange-400 font-bold mb-2">For Builders</span>
            <span className="text-white font-semibold text-lg mb-1">Hire or Get Hired</span>
            <p className="text-gray-300 text-sm mb-5">
              Access trusted Web3 jobs or post roles with escrow protection. Build the future, securely.
            </p>
            <div className="flex gap-2 w-full">
              <Link href="/jobs" className="flex-1 bg-orange-500 hover:bg-orange-400 text-white font-bold py-2 px-4 rounded-full text-sm text-center transition-all">
                Find Jobs
              </Link>
              <Link href="/company-register" className="flex-1 bg-[#232323] hover:bg-orange-500 hover:text-white text-orange-400 font-bold py-2 px-4 rounded-full text-sm text-center border border-orange-500 transition-all">
                Post Jobs
              </Link>
            </div>
            {/* Badge opcional */}
            <span className="absolute top-4 right-4 text-[10px] text-orange-300 bg-black/60 px-2 py-1 rounded-full border border-orange-400 font-bold">ESCROW</span>
          </div>
          {/* Card 2 */}
          <div className="bg-black/90 rounded-2xl p-7 flex-1 min-w-[390px] max-w-md flex flex-col items-start border border-[#232323] shadow-lg relative">
            <span className="uppercase text-xs text-orange-400 font-bold mb-2">For Hodlers</span>
            <span className="text-white font-semibold text-lg mb-1">Use Crypto Tools</span>
            <p className="text-gray-300 text-sm mb-5">
              Analyze the market with AI-powered tools and insights. Make informed decisions, faster.
            </p>
            <Link href="/crypto-tools" className="w-full bg-orange-500 hover:bg-orange-400 text-white font-bold py-2 px-4 rounded-full text-sm text-center transition-all">
              Explore Crypto Tools
            </Link>
            {/* Badge opcional */}
            <span className="absolute top-4 right-4 text-[10px] text-green-300 bg-black/60 px-2 py-1 rounded-full border border-green-400 font-bold">AI TOOLS</span>
          </div>
          {/* Card 3 */}
          <div className="bg-black/90 rounded-2xl p-7 flex-1 min-w-[390px] max-w-md flex flex-col items-start border border-[#232323] shadow-lg relative">
            <span className="uppercase text-xs text-orange-400 font-bold mb-2">For Explorers</span>
            <span className="text-white font-semibold text-lg mb-1">Learn 2 Earn</span>
            <p className="text-gray-300 text-sm mb-5">
              Enhance your skills while earning rewards. Complete courses and get certified in Web3 technologies.
            </p>
            <Link href="/learn2earn" className="w-full bg-orange-500 hover:bg-orange-400 text-white font-bold py-2 px-4 rounded-full text-sm text-center transition-all">
              Start Learning
            </Link>
            {/* Badge opcional */}
            <span className="absolute top-4 right-4 text-[10px] text-purple-300 bg-black/60 px-2 py-1 rounded-full border border-purple-400 font-bold">LEARN</span>
          </div>
        </div>

        {/* EVEN MORE...COMING SOON Section */}
        <div className="w-full mt-14 mb-6 z-10 flex justify-center">
          <div className="bg-orange-500 rounded-lg py-5 px-6 shadow-lg relative overflow-hidden max-w-4xl mx-auto text-center">
            <h2 className="text-3xl font-bold text-white py-2">EVEN MORE...COMING SOON</h2>
            <p className="text-white text-lg leading-relaxed pb-3 max-w-2xl mx-auto">
              We're developing groundbreaking features that will transform how talent connects with opportunities.
            </p>
            <div className="pt-3 pb-4">
              <div className="flex flex-col items-center justify-center gap-3 max-w-md mx-auto">
                <input
                  type="email"
                  value={waitlistEmail || ''}
                  onChange={e => setWaitlistEmail(e.target.value)}
                  placeholder="Enter your e-mail here to stay up-to-date"
                  className="waitlist-input bg-black/40 text-white text-sm px-6 py-2.5 rounded-md focus:outline-none focus:ring-2 focus:ring-white w-full shadow-sm placeholder:text-gray-300 border border-black/30 text-center"
                  disabled={waitlistLoading || waitlistSuccess}
                />
                <button
                  className="waitlist-btn bg-black text-white py-2.5 px-6 rounded-md hover:bg-black/70 transition-colors font-semibold text-sm shadow-md border border-white/30 focus:outline-none focus:ring-2 focus:ring-white whitespace-nowrap w-full sm:w-1/2"
                  onClick={handleWaitlistSubscribe}
                  disabled={waitlistLoading || waitlistSuccess}
                >
                  {waitlistLoading ? 'Sending...' : waitlistSuccess ? 'Subscribed!' : 'Join the Waitlist'}
                </button>
              </div>
            </div>
            {waitlistError && <div className="text-red-200 text-xs pb-1 text-center">{waitlistError === 'Please enter a valid email address.' ? 'Please enter a valid email address.' : 'Failed to subscribe. Please try again later.'}</div>}
            {waitlistSuccess && <div className="text-green-200 text-xs pb-1 text-center">You have joined the waitlist!</div>}
          </div>
        </div>
        
        {/* Gradient transition overlay */}
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-black to-transparent"></div>
      </section>

      <main className="min-h-screen bg-gradient-to-b from-black via-black to-black text-white relative overflow-hidden gate33-main-section">

        <section id="about" className="about py-20 text-center px-4 relative overflow-hidden bg-gradient-to-b from-black/90 to-black">
          {/* Overlay escuro para melhor legibilidade */}
          <div className="absolute inset-0 bg-black/60"></div>
          <div className="relative z-10">
            <h2 className="text-3xl font-bold text-orange-500 mb-8">Why Choose Gate33?</h2>
            <p className="text-gray-200 mb-10 max-w-5xl mx-auto text-base leading-relaxed">
              We offer a secure environment where verified companies post genuine job opportunities and qualified candidates can 
              find real opportunities. Our platform uses blockchain technology to ensure greater transparency and security throughout the process.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 text-left mt-10 px-5 max-w-6xl mx-auto">
              <div className="bg-black/10 rounded-lg p-8 backdrop-blur-sm border border-orange-500/20 hover:-translate-y-2 hover:shadow-lg transition-all">
                <h3 className="text-xl text-orange-500 mb-4">Verified Companies</h3>
                <p className="text-gray-200 text-sm">
                  All companies on our platform undergo a rigorous verification process to ensure 
                  legitimacy and reliability in job postings.
                </p>
              </div>
              <div className="bg-black/10 rounded-lg p-8 backdrop-blur-sm border border-orange-500/20 hover:-translate-y-2 hover:shadow-lg transition-all">
                <h3 className="text-xl text-orange-500 mb-4">Quality Opportunities</h3>
                <p className="text-gray-200 text-sm">
                  Curated high-quality job listings with detailed descriptions, clear benefits, and 
                  transparent selection processes.
                </p>
              </div>
              <div className="bg-black/10 rounded-lg p-8 backdrop-blur-sm border border-orange-500/20 hover:-translate-y-2 hover:shadow-lg transition-all">
                <h3 className="text-xl text-orange-500 mb-4">Data Security</h3>
                <p className="text-gray-200 text-sm">
                  Our platform prioritizes the protection of your personal information with 
                  advanced security measures to keep your profile and application data safe.
                </p>
              </div>
              <div className="bg-black/10 rounded-lg p-8 backdrop-blur-sm border border-orange-500/20 hover:-translate-y-2 hover:shadow-lg transition-all">
                <h3 className="text-xl text-orange-500 mb-4">Learn2Earn</h3>
                <p className="text-gray-200 text-sm">
                  Enhance your skills and earn rewards by participating in our Learn2Earn program, 
                  where learning converts into real opportunities.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section id="services" className="services py-20 text-center bg-black px-4 relative">
          <div className="absolute inset-0 bg-orange-900/5"></div>
          <div className="relative z-10">
            <h2 className="text-3xl font-bold text-orange-500 mb-8">Our Services</h2>
            <p className="text-gray-200 max-w-4xl mx-auto mb-10 text-base leading-relaxed">
              Gate33 offers a complete platform to connect companies and candidates securely and efficiently.
            </p>
            <div className="services-grid grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
              <div className="service-card bg-black/80 rounded-lg p-8 text-left border border-orange-500/20 hover:translate-y-[-10px] hover:bg-black hover:border-orange-500/40 transition-all shadow-lg">
                <div className="service-icon text-orange-500 text-5xl mb-4">🔎</div>
                <h3 className="text-xl text-orange-500 mb-4">For Job Seekers</h3>
                <p className="text-gray-200 text-sm mb-4 text-left">
                  Access quality jobs from verified companies, create a standout professional profile, and 
                  track your applications in one place.
                </p>
                <Link href="/seeker-signup" className="text-orange-400 text-sm hover:underline">Register as a job seeker →</Link>
              </div>
              <div className="service-card bg-black/80 rounded-lg p-8 text-left border border-orange-500/20 hover:translate-y-[-10px] hover:bg-black hover:border-orange-500/40 transition-all shadow-lg">
                <div className="service-icon text-orange-500 text-5xl mb-4">💼</div>
                <h3 className="text-xl text-orange-500 mb-4">For Companies</h3>
                <p className="text-gray-200 text-sm mb-4 text-left">
                  Post jobs for qualified professionals, manage applications, and maintain a 
                  corporate profile that highlights your culture and values.
                </p>
                <Link href="/company-register" className="text-orange-400 text-sm hover:underline">Register as a company →</Link>
              </div>
              <div className="service-card bg-black/80 rounded-lg p-8 text-left border border-orange-500/20 hover:translate-y-[-10px] hover:bg-black hover:border-orange-500/40 transition-all shadow-lg">
                <div className="service-icon text-orange-500 text-5xl mb-4">🧠</div>
                <h3 className="text-xl text-orange-500 mb-4">Learn2Earn</h3>
                <p className="text-gray-200 text-sm mb-4 text-left">
                  Participate in educational programs offered by partner companies, learn new 
                  skills, and receive token rewards for completing courses.
                </p>
                <Link href="/learn2earn" className="text-orange-400 text-sm hover:underline">Discover Learn2Earn →</Link>
              </div>
            </div>
          </div>
        </section>

        <section id="jobs" className="jobs py-20 text-center bg-black px-4 relative">
          <div className="absolute inset-0 bg-orange-900/5 bg-gradient-to-b from-transparent via-black/90 to-transparent"></div>
          <div className="relative z-10">
            <h2 className="text-3xl font-bold text-orange-500 mb-8">Featured Jobs</h2>
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
              <Link href="/jobs" className="bg-orange-500 text-white py-3 px-8 rounded-full font-semibold text-lg cursor-pointer transition-all hover:bg-orange-600 border-none shadow-lg hover:shadow-xl">
                View all jobs
              </Link>
            </div>
          </div>
        </section>

        <section id="companies" className="companies py-20 text-center bg-black px-4 relative">
          <div className="absolute inset-0 bg-orange-900/5"></div>
          <div className="relative z-10">
            <h2 className="text-3xl font-bold text-orange-500 mb-8">Trusted Companies</h2>
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

        <section id="partners" className="partners py-20 text-center bg-black px-4 relative">
          <div className="absolute inset-0 bg-gradient-to-r from-black via-orange-900/10 to-black"></div>
          <div className="relative z-10">
            <h2 className="text-3xl font-bold text-orange-500 mb-8">Our Partners</h2>
            <p className="text-gray-200 max-w-4xl mx-auto mb-10 text-base leading-relaxed">
              We collaborate with industry leaders to bring you the best opportunities and resources in the blockchain and tech space.
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
                    <div className="flex gap-8 pb-4" style={{ width: `${partners.length * 340}px` }}>
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
            
            <div className="mt-10">
              <Link href="/partners" className="bg-orange-500 text-white py-2.5 px-8 rounded-full hover:bg-orange-600 transition-colors shadow-lg hover:shadow-xl font-medium">
                Become a Partner
              </Link>
            </div>
          </div>
        </section>

        <section id="faq" className="faq py-20 bg-black px-4 relative">
          <div className="absolute inset-0 bg-orange-900/5 bg-gradient-to-b from-transparent via-black/90 to-transparent"></div>
          <div className="relative z-10">
            <h2 className="text-3xl font-bold text-orange-500 mb-10 text-center">Frequently Asked Questions</h2>
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

        <section id="contact" className="contact bg-black py-20 text-center px-4 relative">
          <div className="absolute inset-0 bg-gradient-to-t from-black via-orange-900/5 to-black"></div>
          <div className="relative z-10">
            <h2 className="text-3xl font-bold text-orange-500 mb-6">Contact Us</h2>
            <p className="text-gray-200 max-w-xl mx-auto mb-10 text-base leading-relaxed">
              Have a question or need help? Contact us and we'll respond as quickly as possible.
            </p>
            <div className="max-w-md mx-auto">
              <ContactForm 
                title="" 
                submitButtonText="Send Message"
                className="border border-orange-500/20 bg-black/80 shadow-lg rounded-xl"
                defaultSubject="Contact from Gate33 Website"
                showSubjectField={false}
              />
            </div>
          </div>
        </section>
      </main>
    </>
  );
}

export default Home;

