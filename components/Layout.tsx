"use client";

import React, { useState, useEffect } from 'react';
import '../components/global.css';
import AdPopup from './AdPopup';
import UserProfileButton from './UserProfileButton';

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const isProduction = process.env.NEXT_PUBLIC_DEPLOY_STAGE === "production";

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

  return (
    <div className="layout">
      {/* Header */}
      <header className="site-header w-full bg-black text-white fixed top-0 left-0 z-40"> {/* Lower z-index for header */}
        <div className="w-full flex justify-between items-center py-4 px-8">
          <a href="/" className="logo flex items-center">
            <img src="/logo.png" alt="Gate33 Logo" className="w-10 h-10 mr-2" />
            <span className="text-orange-500 font-bold text-xl">Gate33</span>
          </a>
          {/* Hamburger Menu Button - Only opens the menu */}
          <button
            className="md:hidden text-orange-500 focus:outline-none z-50" /* Ensure button is clickable */
            onClick={() => setMenuOpen(true)} /* Only opens */
          >
            Menu {/* Or use an icon */}
          </button>
          {/* Desktop Navigation (Hidden on Mobile) */}
          <nav className="hidden md:flex gap-4 items-center">
            {/* Principais páginas */}
            <a href="/" className="hover:text-orange-500">Home</a>

            
            {/* Funcionalidades de emprego e oportunidades */}
            <a href="/jobs" className="hover:text-orange-500">Jobs</a>
            {isProduction ? (
              <span className="text-gray-500 cursor-not-allowed opacity-60">Instant Jobs (Coming Soon)</span>
            ) : (
              <a href="/instant-jobs" className="hover:text-orange-500">Instant Jobs</a>
            )}
            <a href="/learn2earn" className="hover:text-orange-500">Learn2Earn</a>
            
            {/* Ferramentas e recursos */}
            <a href="/crypto-tools" className="hover:text-orange-500">Crypto Tools</a>
            <a href="/nft" className="hover:text-orange-500">NFT</a>
            
            {/* Páginas adicionais */}
            <a href="/#faq" className="hover:text-orange-500">FAQ</a>
            <a href="/#contact" className="hover:text-orange-500">Contact</a>
            
            {/* Mostrar o botão de perfil quando logado, ou os botões de login/signup quando não */}
            {isLoggedIn ? (
              <UserProfileButton className="ml-4" />
            ) : (
              <div className="flex ml-4 gap-2">
                <a href="/login" className="px-4 py-2 border border-orange-500 text-orange-500 rounded hover:bg-orange-500 hover:text-white transition-colors">Login</a>
                <a href="/seeker-signup" className="px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600 transition-colors">Signup</a>
              </div>
            )}
          </nav>
        </div>
        {/* Orange Divider */}
        <div className="w-full h-1 bg-orange-500"></div>
      </header>

      {/* Mobile Navigation Panel (Slides from right) */}
      <nav
        className={`fixed top-0 right-0 h-full w-72 max-w-full bg-black/95 z-50 transition-transform duration-300 ease-in-out md:hidden overflow-y-auto mobile-nav-panel ${menuOpen ? 'translate-x-0' : 'translate-x-full'}`}
      >
        {/* Close Button inside the panel */}
        <button
          className="absolute top-4 right-4 text-orange-500 focus:outline-none text-2xl"
          onClick={() => setMenuOpen(false)}
        >
          &times;
        </button>
        <div className="mt-12 flex flex-col px-3 pb-6">
          {/* Principais páginas */}
          <a href="/" className="block py-1.5 text-base hover:text-orange-500" onClick={() => setMenuOpen(false)}>Home</a>
          <a href="/#about" className="block py-1.5 text-base hover:text-orange-500" onClick={() => setMenuOpen(false)}>About</a>
          <a href="/#services" className="block py-1.5 text-base hover:text-orange-500" onClick={() => setMenuOpen(false)}>Services</a>
          
          <div className="border-t border-gray-700 my-0.5"></div>
          
          <a href="/jobs" className="block py-1.5 text-base hover:text-orange-500" onClick={() => setMenuOpen(false)}>Jobs</a>
          {isProduction ? (
            <span className="block py-1.5 text-base text-gray-500 cursor-not-allowed opacity-60">Instant Jobs (Coming Soon)</span>
          ) : (
            <a href="/instant-jobs" className="block py-1.5 text-base hover:text-orange-500" onClick={() => setMenuOpen(false)}>Instant Jobs</a>
          )}
          <a href="/learn2earn" className="block py-1.5 text-base hover:text-orange-500" onClick={() => setMenuOpen(false)}>Learn2Earn</a>
          
          <div className="border-t border-gray-700 my-0.5"></div>
          
          <a href="/nft" className="block py-1.5 text-base hover:text-orange-500" onClick={() => setMenuOpen(false)}>NFT</a>
          <a href="/crypto-tools" className="block py-1.5 text-base hover:text-orange-500" onClick={() => setMenuOpen(false)}>Crypto Tools</a>
          <a href="/donate" className="block py-1.5 text-base hover:text-orange-500 font-medium" onClick={() => setMenuOpen(false)}>Donate</a>
          <a href="/#faq" className="block py-1.5 text-base hover:text-orange-500" onClick={() => setMenuOpen(false)}>FAQ</a>
          <a href="/#contact" className="block py-1.5 text-base hover:text-orange-500" onClick={() => setMenuOpen(false)}>Contact</a>
          
          <div className="border-t border-gray-700 my-0.5"></div>
          
          {/* Botões de login ou componente de perfil */}
          {isLoggedIn ? (
            <div className="pt-1 -ml-1">
              <UserProfileButton />
            </div>
          ) : (
            <div className="flex flex-col gap-1 pt-1">
              <a 
                href="/login" 
                className="block w-full px-3 py-1.5 border border-orange-500 text-orange-500 rounded text-center hover:bg-orange-500 hover:text-white transition-colors" 
                onClick={() => setMenuOpen(false)}
              >
                Login
              </a>
              <a 
                href="/seeker-signup" 
                className="block w-full px-3 py-1.5 bg-orange-500 text-white rounded text-center hover:bg-orange-600 transition-colors" 
                onClick={() => setMenuOpen(false)}
              >
                Signup
              </a>
            </div>
          )}
        </div>
      </nav>

      {/* Main Content */}
      <main className="pt-14 sm:pt-16 px-0 sm:px-0 md:px-0 lg:px-0 w-full">{children}</main>

      {/* Advertisement Popup */}
      <AdPopup />

      {/* Footer */}
      <footer id="main-footer" className="bg-black text-white py-6 sm:py-10 border-t-4 border-orange-500">
        <div className="max-w-6xl mx-auto px-4 grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-2 md:grid-cols-5">
          <div className="col-span-2 sm:col-span-1">
            <h4 className="text-orange-500 font-bold text-base sm:text-lg mb-2 sm:mb-4">About Gate33</h4>
            <p className="text-gray-400 text-xs sm:text-sm">
              Your trusted platform for secure work, real opportunities, and user protection in the Web3 job market.
            </p>
          </div>
          <div>
            <h4 className="text-orange-500 font-bold text-base sm:text-lg mb-2 sm:mb-4">Quick Links</h4>
            <nav className="text-gray-400 text-xs sm:text-sm">
              <a href="/jobs" className="block hover:text-orange-500 mb-1 sm:mb-2">Jobs</a>
              {isProduction ? (
                <span className="block mb-1 sm:mb-2 text-gray-500 cursor-not-allowed opacity-60">Instant Jobs (Coming Soon)</span>
              ) : (
                <a href="/instant-jobs" className="block hover:text-orange-500 mb-1 sm:mb-2">Instant Jobs</a>
              )}
              <a href="/learn2earn" className="block hover:text-orange-500 mb-1 sm:mb-2">Learn2Earn</a>
              <a href="/nft" className="block hover:text-orange-500 mb-1 sm:mb-2">NFT</a>
              <a href="/crypto-tools" className="block hover:text-orange-500 mb-1 sm:mb-2">Crypto Tools</a>
              <a href="/donate" className="block hover:text-orange-500 mb-1 sm:mb-2 font-medium">Donate</a>
            </nav>
          </div>
          <div>
            <h4 className="text-orange-500 font-bold text-base sm:text-lg mb-2 sm:mb-4">Services</h4>
            <nav className="text-gray-400 text-xs sm:text-sm">
              <a href="/seeker-signup" className="block hover:text-orange-500 mb-1 sm:mb-2">For Job Seekers</a>
              <a href="/company-register" className="block hover:text-orange-500 mb-1 sm:mb-2">For Companies</a>
              <a href="/learn2earn" className="block hover:text-orange-500 mb-1 sm:mb-2">Learn2Earn</a>
            </nav>
          </div>
          <div>
            <h4 className="text-orange-500 font-bold text-base sm:text-lg mb-2 sm:mb-4">Contact</h4>
            <nav className="text-gray-400 text-xs sm:text-sm">
              <a href="/contact" className="block hover:text-orange-500 mb-1 sm:mb-2">Contact Us</a>
              <a href="/#about" className="block hover:text-orange-500 mb-1 sm:mb-2">About</a>
              <a href="/#services" className="block hover:text-orange-500 mb-1 sm:mb-2">Services</a>
              <a href="/#faq" className="block hover:text-orange-500 mb-1 sm:mb-2">FAQ</a>
            </nav>
          </div>
          <div>
            <h4 className="text-orange-500 font-bold text-base sm:text-lg mb-2 sm:mb-4">Socials</h4>
            <nav className="text-gray-400 text-xs sm:text-sm">
              <a href="https://t.me/gate33_tg_channel" target="_blank" rel="noopener noreferrer" className="block hover:text-orange-500 mb-1 sm:mb-2">Telegram</a>
              <a href="https://x.com/x_Gate33" target="_blank" rel="noopener noreferrer" className="block hover:text-orange-500 mb-1 sm:mb-2">X (Twitter)</a>
              <a href="https://www.linkedin.com/company/gate33" target="_blank" rel="noopener noreferrer" className="block hover:text-orange-500">LinkedIn</a>
            </nav>
          </div>
        </div>
        <div className="mt-6 sm:mt-8 pt-3 sm:pt-4 text-center text-gray-500 text-xs sm:text-sm">
          <p>© 2025 Gate33. All Rights Reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default Layout;

