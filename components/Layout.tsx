"use client";

import React, { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import '../components/global.css';
import AdPopup from './AdPopup';
import UserProfileButton from './UserProfileButton';
import ContactForm from './ContactForm';

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [jobsDropdownOpen, setJobsDropdownOpen] = useState(false);
  const [toolsDropdownOpen, setToolsDropdownOpen] = useState(false);
  const [learnDropdownOpen, setLearnDropdownOpen] = useState(false);
  const isProduction = process.env.NEXT_PUBLIC_DEPLOY_STAGE === "production";
  
  // Get current pathname for highlighting active menu items
  const pathname = usePathname();

  // Function to check if a menu item is active
  const isActiveMenuItem = (path: string) => {
    return pathname === path;
  };

  // Function to get menu item styling with active state
  const getMenuItemClasses = (path: string) => {
    const baseClasses = "block px-4 py-2 text-base font-verdana font-normal leading-[24px] tracking-normal uppercase transition-all duration-200 relative";
    const activeClasses = "text-white border-l-2 border-orange-500 bg-orange-500/10";
    const inactiveClasses = "text-gray-300 hover:text-white hover:border-l-2 hover:border-orange-500 hover:bg-orange-500/5";
    
    return `${baseClasses} ${isActiveMenuItem(path) ? activeClasses : inactiveClasses}`;
  };

  // Function to get mobile menu item styling with active state
  const getMobileMenuItemClasses = (path: string) => {
    const baseClasses = "block py-1.5 text-base transition-colors";
    const activeClasses = "text-orange-500 font-bold bg-orange-500/10";
    const inactiveClasses = "hover:text-orange-500";
    
    return `${baseClasses} ${isActiveMenuItem(path) ? activeClasses : inactiveClasses}`;
  };

  // Mobile detection hook
  useEffect(() => {
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkIsMobile();
    window.addEventListener('resize', checkIsMobile);

    return () => {
      window.removeEventListener('resize', checkIsMobile);
    };
  }, []);

  // Verificar se o usuário está logado para decidir quais botões mostrar
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Add debugging to see what's in localStorage
      console.log("Login check - seekerToken:", localStorage.getItem("seekerToken"));
      console.log("Login check - token:", localStorage.getItem("token"));
      console.log("Login check - companyId:", localStorage.getItem("companyId"));
      console.log("Login check - companyName:", localStorage.getItem("companyName"));
      
      const hasToken = Boolean(
        localStorage.getItem("seekerToken") || 
        localStorage.getItem("token") || 
        localStorage.getItem("companyId")
      );
      console.log("Login check - isLoggedIn:", hasToken);
      setIsLoggedIn(hasToken);
    }
  }, []);

  // Force component re-render when localStorage changes
  useEffect(() => {
    const handleStorageChange = () => {
      const hasToken = Boolean(
        localStorage.getItem("seekerToken") || 
        localStorage.getItem("token") || 
        localStorage.getItem("companyId")
      );
      setIsLoggedIn(hasToken);
    };

    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  // Dropdown close timers
  const [jobsDropdownTimer, setJobsDropdownTimer] = useState<NodeJS.Timeout | null>(null);
  const [toolsDropdownTimer, setToolsDropdownTimer] = useState<NodeJS.Timeout | null>(null);
  const [learnDropdownTimer, setLearnDropdownTimer] = useState<NodeJS.Timeout | null>(null);

  // Dropdown handlers
  const handleJobsEnter = () => {
    if (jobsDropdownTimer) clearTimeout(jobsDropdownTimer);
    if (toolsDropdownTimer) clearTimeout(toolsDropdownTimer);
    if (learnDropdownTimer) clearTimeout(learnDropdownTimer);
    setJobsDropdownOpen(true);
    setToolsDropdownOpen(false);
    setLearnDropdownOpen(false);
  };
  const handleJobsLeave = () => {
    const timer = setTimeout(() => setJobsDropdownOpen(false), 1000);
    setJobsDropdownTimer(timer);
  };
  const handleToolsEnter = () => {
    if (jobsDropdownTimer) clearTimeout(jobsDropdownTimer);
    if (toolsDropdownTimer) clearTimeout(toolsDropdownTimer);
    if (learnDropdownTimer) clearTimeout(learnDropdownTimer);
    setToolsDropdownOpen(true);
    setJobsDropdownOpen(false);
    setLearnDropdownOpen(false);
  };
  const handleToolsLeave = () => {
    const timer = setTimeout(() => setToolsDropdownOpen(false), 1000);
    setToolsDropdownTimer(timer);
  };
  const handleLearnEnter = () => {
    if (jobsDropdownTimer) clearTimeout(jobsDropdownTimer);
    if (toolsDropdownTimer) clearTimeout(toolsDropdownTimer);
    if (learnDropdownTimer) clearTimeout(learnDropdownTimer);
    setLearnDropdownOpen(true);
    setJobsDropdownOpen(false);
    setToolsDropdownOpen(false);
  };
  const handleLearnLeave = () => {
    const timer = setTimeout(() => setLearnDropdownOpen(false), 1000);
    setLearnDropdownTimer(timer);
  };

  return (
    <div className="layout">
      {/* Header with Professional Glassmorphism */}
      <header
        className="site-header fixed h-[8vh] left-0 top-0 w-full z-[60] backdrop-blur-[20px] bg-gradient-to-b from-[rgba(15,15,15,0.4)] to-[rgba(15,15,15,0.2)] text-white gate33-header-fullwidth overflow-visible"
      >
        <div className="w-full flex justify-between items-center py-4 px-6 h-16">
          <a href="/" className="logo flex items-center">
            <img src="/images/GATE33-LOGO-wordmark.png" alt="Gate33 Logo" className="h-6" />
          </a>
          
          {/* Hamburger Menu Button - Toggles the menu */}
          <button
            className="md:hidden text-orange-500 focus:outline-none z-50 flex items-center"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            <span className="mr-2 text-sm font-medium">Menu</span>
            {menuOpen ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
          
          {/* Desktop Navigation */}
          <nav className="hidden md:flex gap-8 items-center relative">
            {/* Jobs Dropdown */}
            <div 
              className="relative"
              onMouseEnter={handleJobsEnter}
              onMouseLeave={handleJobsLeave}
            >
              <button className="flex items-center gap-1 hover:text-orange-500 transition-colors font-verdana text-sm font-bold leading-[18px] tracking-normal text-center">
                JOBS
                <img src="/Vectors/Vector.svg" alt="dropdown" className="w-3 h-2" />
              </button>
              {jobsDropdownOpen && (
                <div className="absolute top-full left-0 mt-1 bg-black/70 border border-white/20 rounded-lg shadow-xl min-w-[200px] z-[70] backdrop-blur-sm"
                  onMouseEnter={handleJobsEnter}
                  onMouseLeave={handleJobsLeave}
                >
                  <div className="py-2">
                    <a href="/jobs" className={getMenuItemClasses('/jobs')}>JOB-BOARD</a>
                    {!isProduction && (
                      <a href="/instant-jobs" className={getMenuItemClasses('/instant-jobs')}>INSTANT JOBS</a>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Tools Dropdown */}
            <div 
              className="relative"
              onMouseEnter={handleToolsEnter}
              onMouseLeave={handleToolsLeave}
            >
              <button className="flex items-center gap-1 hover:text-orange-500 transition-colors font-verdana text-sm font-bold leading-[18px] tracking-normal text-center">
                TOOLS
                <img src="/Vectors/Vector.svg" alt="dropdown" className="w-3 h-2" />
              </button>
              {toolsDropdownOpen && (
                <div className="absolute top-full left-0 mt-1 bg-black/70 border border-white/20 rounded-lg shadow-xl min-w-[200px] z-[70] backdrop-blur-sm"
                  onMouseEnter={handleToolsEnter}
                  onMouseLeave={handleToolsLeave}
                >
                  <div className="py-2">
                    <a href="/crypto-tools" className={getMenuItemClasses('/crypto-tools')}>CRYPTO TOOLS</a>
                    <a href="/nft" className={getMenuItemClasses('/nft')}>NFT</a>
                  </div>
                </div>
              )}
            </div>

            {/* Learn Dropdown */}
            <div 
              className="relative"
              onMouseEnter={handleLearnEnter}
              onMouseLeave={handleLearnLeave}
            >
              <button className="flex items-center gap-1 hover:text-orange-500 transition-colors font-verdana text-sm font-bold leading-[18px] tracking-normal text-center">
                LEARN
                <img src="/Vectors/Vector.svg" alt="dropdown" className="w-3 h-2" />
              </button>
              {learnDropdownOpen && (
                <div className="absolute top-full left-0 mt-1 bg-black/70 border border-white/20 rounded-lg shadow-xl min-w-[200px] z-[70] backdrop-blur-sm"
                  onMouseEnter={handleLearnEnter}
                  onMouseLeave={handleLearnLeave}
                >
                  <div className="py-2">
                    <a href="/learn2earn" className={getMenuItemClasses('/learn2earn')}>LEARN2EARN</a>
                  </div>
                </div>
              )}
            </div>

            {/* Login/Signup Button */}
            {isLoggedIn ? (
              <UserProfileButton className="ml-4" />
            ) : (
              <a 
                href="/login" 
                className="px-6 py-2 bg-orange-500 text-white rounded-full hover:bg-orange-600 transition-colors font-medium"
              >
                Log In / Sign Up
              </a>
            )}
          </nav>
        </div>
      </header>

      {/* Mobile Navigation Panel (Slides from right) */}
      <nav
        className={`fixed top-0 right-0 h-full w-72 max-w-full bg-black/85 z-[70] transition-transform duration-300 ease-in-out md:hidden overflow-y-auto mobile-nav-panel backdrop-blur-sm ${menuOpen ? 'translate-x-0' : 'translate-x-full'}`}
      >
        {/* Close Button inside the panel */}
        <button
          className="absolute top-4 right-4 text-orange-500 focus:outline-none text-2xl"
          onClick={() => setMenuOpen(false)}
        >
          &times;
        </button>
        
        <div className="flex flex-col px-4 pb-6 pt-16">
          {/* Home link */}
          <a href="/" className={`block py-2 text-lg font-medium hover:text-orange-500 transition-colors mb-4 border-b border-gray-800 pb-4`} onClick={() => setMenuOpen(false)}>HOME</a>
          
          {/* JOBS Dropdown */}
          <div className="mb-4">
            <h4 className="text-orange-500 font-bold text-lg mb-2">JOBS</h4>
            <div className="ml-2 border-l border-gray-700 pl-3">
              <a href="/jobs" className={getMobileMenuItemClasses('/jobs')} onClick={() => setMenuOpen(false)}>JOB-BOARD</a>
              {isProduction ? (
                <span className="block py-1.5 text-base text-gray-500 cursor-not-allowed opacity-60">INSTANT JOBS (Coming Soon)</span>
              ) : (
                <a href="/instant-jobs" className={getMobileMenuItemClasses('/instant-jobs')} onClick={() => setMenuOpen(false)}>INSTANT JOBS</a>
              )}
            </div>
          </div>
          
          {/* TOOLS Dropdown */}
          <div className="mb-4">
            <h4 className="text-orange-500 font-bold text-lg mb-2">TOOLS</h4>
            <div className="ml-2 border-l border-gray-700 pl-3">
              <a href="/crypto-tools" className={getMobileMenuItemClasses('/crypto-tools')} onClick={() => setMenuOpen(false)}>CRYPTO TOOLS</a>
              <a href="/nft" className={getMobileMenuItemClasses('/nft')} onClick={() => setMenuOpen(false)}>NFT</a>
            </div>
          </div>
          
          {/* LEARN Dropdown */}
          <div className="mb-4">
            <h4 className="text-orange-500 font-bold text-lg mb-2">LEARN</h4>
            <div className="ml-2 border-l border-gray-700 pl-3">
              <a href="/learn2earn" className={getMobileMenuItemClasses('/learn2earn')} onClick={() => setMenuOpen(false)}>LEARN2EARN</a>
            </div>
          </div>
          
          <div className="border-t border-gray-800 my-2"></div>
          
          {/* Login/Profile Section */}
          {isLoggedIn ? (
            <div className="pt-2">
              <UserProfileButton />
            </div>
          ) : (
            <div className="pt-2">
              <a 
                href="/login" 
                className="block w-full px-6 py-2.5 bg-orange-500 text-white rounded-full text-center hover:bg-orange-600 transition-colors font-medium" 
                onClick={() => setMenuOpen(false)}
              >
                Log In / Sign Up
              </a>
            </div>
          )}
        </div>
      </nav>

      {/* Main Content with spacing for glassmorphism header */}
      <main className="px-0 sm:px-0 md:px-0 lg:px-0 w-full mt-[2vh]">{children}</main>

      {/* Advertisement Popup */}
      <AdPopup />

      {/* Modern Footer - Only show contact form on index page */}
      <footer id="main-footer" className="bg-[#FF6A00] text-black pt-10 pb-2 border-t-4 border-orange-500 mt-10">
        <div className="max-w-7xl mx-auto px-4 grid grid-cols-1 md:grid-cols-2 gap-10">
          {/* Left: Contact Info & Socials */}
          <div className="flex flex-col gap-4 justify-between">
            <div>
              <h2 className="text-2xl font-bold mb-2">GET IN TOUCH</h2>
              <p className="mb-4 text-base">Have questions or need support? Our team is here to help you navigate the Web3 universe.</p>
              <ul className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2 text-base">
                <li className="flex items-center gap-2"><span className="material-icons text-lg">.</span> support@gate33.net</li>
                <li className="flex items-center gap-2"><span className="material-icons text-lg">.</span> Follow us on X</li>
                <li className="flex items-center gap-2"><span className="material-icons text-lg">.</span> Join our Discord community</li>
                <li className="flex items-center gap-2"><span className="material-icons text-lg">.</span> Join our Telegram</li>
                <li className="flex items-center gap-2"><span className="material-icons text-lg">.</span> Decentralized globally</li>
                <li className="flex items-center gap-2"><span className="material-icons text-lg">.</span> Follow us on LinkedIn</li>
              </ul>
            </div>
          </div>
          {/* Right: Contact Form (only on index) */}
          <div className="flex flex-col justify-center">
            {pathname === '/' && (
              <div className="p-0 m-0">
                <ContactForm
                  title=""
                  submitButtonText="Send Message"
                  className="border-0 bg-transparent p-0 contact-footer-form"
                  defaultSubject="Contact from Gate33 Website"
                  showSubjectField={false}
                />
              </div>
            )}
          </div>
        </div>
        <hr className="my-8 border-black/30" />
        <div className="max-w-7xl mx-auto px-4 grid grid-cols-2 md:grid-cols-5 gap-6 pb-2">
          <div>
            <h4 className="text-white font-bold text-base mb-2">Quick Links</h4>
            <nav className="text-black/80 text-sm">
              <a href="/jobs" className="block hover:underline">Jobs</a>
              <span className="block text-black/40">Instant Jobs (Coming Soon)</span>
              <a href="/learn2earn" className="block hover:underline">Learn2Earn</a>
              <a href="/donate" className="block hover:underline">Invest in us</a>
              <a href="/crypto-tools" className="block hover:underline">Crypto Tools</a>
              <a href="/donate" className="block hover:underline">Donate</a>
            </nav>
          </div>
          <div>
            <h4 className="text-white font-bold text-base mb-2">Services</h4>
            <nav className="text-black/80 text-sm">
              <a href="/seeker-signup" className="block hover:underline">For Job Seekers</a>
              <a href="/company-register" className="block hover:underline">For Companies</a>
              <a href="/learn2earn" className="block hover:underline">Learn2Earn</a>
            </nav>
          </div>
          <div>
            <h4 className="text-white font-bold text-base mb-2">Contact</h4>
            <nav className="text-black/80 text-sm">
              <a href="/contact" className="block hover:underline">Contact Us</a>
              <a href="/#about" className="block hover:underline">About</a>
              <a href="/#services" className="block hover:underline">Services</a>
              <a href="/#faq" className="block hover:underline">FAQ</a>
            </nav>
          </div>
          <div>
            <h4 className="text-white font-bold text-base mb-2">About Gate33</h4>
            <p className="text-black/80 text-xs">
              Your trusted platform for secure work, real opportunities, and user protection in the Web3 job market.
            </p>
          </div>
          <div>
            <h4 className="text-white font-bold text-base mb-2">Socials</h4>
            <nav className="text-black/80 text-sm">
              <a href="https://t.me/gate33_tg_channel" target="_blank" rel="noopener noreferrer" className="block hover:underline">Telegram</a>
              <a href="https://x.com/x_Gate33" target="_blank" rel="noopener noreferrer" className="block hover:underline">X (Twitter)</a>
              <a href="https://www.linkedin.com/company/gate33" target="_blank" rel="noopener noreferrer" className="block hover:underline">LinkedIn</a>
            </nav>
          </div>
        </div>
        <div className="text-center text-black/60 text-xs mt-4 pb-2">
          © 2025 Gate33. All Rights Reserved.
        </div>
      </footer>
    </div>
  );
};

export default Layout;

