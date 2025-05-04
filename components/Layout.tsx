import React, { useState, useEffect } from 'react';
import '../components/global.css';
import AdPopup from './AdPopup';
import UserProfileButton from './UserProfileButton';

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

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
            <a href="/instant-jobs" className="hover:text-orange-500">Instant Jobs</a>
            <a href="/learn2earn" className="hover:text-orange-500">Learn2Earn</a>
            
            {/* Ferramentas e recursos */}
            <a href="/crypto-tools" className="hover:text-orange-500">Crypto Tools</a>
            <a href="/bitcoin-analysis" className="hover:text-orange-500">Bitcoin Analysis</a>
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
        className={`${
          menuOpen ? 'translate-x-0' : 'translate-x-full'
        } fixed top-0 right-0 h-full w-64 bg-black/95 z-50 p-4 transition-transform duration-300 ease-in-out md:hidden`}
      >
        {/* Close Button inside the panel */}
        <button
          className="absolute top-4 right-4 text-orange-500 focus:outline-none text-2xl"
          onClick={() => setMenuOpen(false)} /* Closes the menu */
        >
          &times; {/* 'X' character for close */}
        </button>
        <div className="mt-12 flex flex-col gap-4"> {/* Add margin-top to avoid overlap with close button */}
          {/* Principais páginas */}
          <a href="/" className="block px-4 py-2 hover:text-orange-500" onClick={() => setMenuOpen(false)}>Home</a>
          <a href="/#about" className="block hover:text-orange-500 mb-2" onClick={() => setMenuOpen(false)}>About</a>
          <a href="/#services" className="block hover:text-orange-500 mb-2" onClick={() => setMenuOpen(false)}>Services</a>
          
          {/* Separador visual */}
          <div className="border-t border-gray-700 my-1"></div>
          
          {/* Funcionalidades de emprego e oportunidades */}
          <a href="/jobs" className="block px-4 py-2 hover:text-orange-500" onClick={() => setMenuOpen(false)}>Jobs</a>
          <a href="/instant-jobs" className="block px-4 py-2 hover:text-orange-500" onClick={() => setMenuOpen(false)}>Instant Jobs</a>
          <a href="/learn2earn" className="block px-4 py-2 hover:text-orange-500" onClick={() => setMenuOpen(false)}>Learn2Earn</a>
          
          {/* Separador visual */}
          <div className="border-t border-gray-700 my-1"></div>
          
          {/* Ferramentas e recursos */}
          <a href="/nft" className="block px-4 py-2 hover:text-orange-500" onClick={() => setMenuOpen(false)}>NFT</a>
          <a href="/crypto-tools" className="block px-4 py-2 hover:text-orange-500" onClick={() => setMenuOpen(false)}>Crypto Tools</a>
          <a href="/bitcoin-analysis" className="block px-4 py-2 hover:text-orange-500" onClick={() => setMenuOpen(false)}>Bitcoin Analysis</a>
          <a href="/donate" className="block px-4 py-2 hover:text-orange-500 font-medium" onClick={() => setMenuOpen(false)}>Donate</a>
          
          {/* Páginas adicionais */}
          <a href="/#faq" className="block hover:text-orange-500 mb-2" onClick={() => setMenuOpen(false)}>FAQ</a>
          <a href="/#contact" className="block hover:text-orange-500" onClick={() => setMenuOpen(false)}>Contact</a>
          
          {/* Separador para os botões de login/signup */}
          <div className="border-t border-gray-700 my-2"></div>
          
          {/* Mostrar o botão de perfil quando logado, ou os botões de login/signup quando não */}
          {isLoggedIn ? (
            <div className="px-4 py-2">
              <UserProfileButton />
            </div>
          ) : (
            <>
              <a 
                href="/login" 
                className="mx-4 my-1 px-4 py-2 border border-orange-500 text-orange-500 rounded text-center hover:bg-orange-500 hover:text-white transition-colors" 
                onClick={() => setMenuOpen(false)}
              >
                Login
              </a>
              <a 
                href="/seeker-signup" 
                className="mx-4 my-1 px-4 py-2 bg-orange-500 text-white rounded text-center hover:bg-orange-600 transition-colors" 
                onClick={() => setMenuOpen(false)}
              >
                Signup
              </a>
            </>
          )}
        </div>
      </nav>

      {/* Main Content */}
      <main className="pt-16">{children}</main>

      {/* Advertisement Popup */}
      <AdPopup />

      {/* Footer */}
      <footer id="main-footer" className="bg-black text-white py-10 border-t-4 border-orange-500">
        <div className="max-w-6xl mx-auto px-4 grid grid-cols-1 gap-8 sm:grid-cols-2 md:grid-cols-5">
          <div>
            <h4 className="text-orange-500 font-bold text-lg mb-4">About Gate33</h4>
            <p className="text-gray-400 text-sm">
              Your trusted partner for exchange listings.
            </p>
          </div>
          <div>
            <h4 className="text-orange-500 font-bold text-lg mb-4">Quick Links</h4>
            <nav className="text-gray-400 text-sm">
              <a href="/jobs" className="block hover:text-orange-500 mb-2">Jobs</a>
              <a href="/instant-jobs" className="block hover:text-orange-500 mb-2">Instant Jobs</a>
              <a href="/learn2earn" className="block hover:text-orange-500 mb-2">Learn2Earn</a>
              <a href="/nft" className="block hover:text-orange-500 mb-2">NFT</a>
              <a href="/crypto-tools" className="block hover:text-orange-500 mb-2">Crypto Tools</a>
              <a href="/bitcoin-analysis" className="block hover:text-orange-500 mb-2">Bitcoin Analysis</a>
              <a href="/donate" className="block hover:text-orange-500 mb-2 font-medium">Donate</a>
            </nav>
          </div>
          <div>
            <h4 className="text-orange-500 font-bold text-lg mb-4">Services</h4>
            <nav className="text-gray-400 text-sm">
              <a href="/seeker-signup" className="block hover:text-orange-500 mb-2">For Job Seekers</a>
              <a href="/company-register" className="block hover:text-orange-500 mb-2">For Companies</a>
              <a href="/learn2earn" className="block hover:text-orange-500 mb-2">Learn2Earn</a>
            </nav>
          </div>
          <div>
            <h4 className="text-orange-500 font-bold text-lg mb-4">Contact</h4>
            <nav className="text-gray-400 text-sm">
              <a href="/contact" className="block hover:text-orange-500 mb-2">Contact Us</a>
              <a href="/#about" className="block hover:text-orange-500 mb-2">About</a>
              <a href="/#services" className="block hover:text-orange-500 mb-2">Services</a>
              <a href="/#faq" className="block hover:text-orange-500 mb-2">FAQ</a> {/* Added FAQ link */}
            </nav>
          </div>
          <div>
            <h4 className="text-orange-500 font-bold text-lg mb-4">Socials</h4>
            <nav className="text-gray-400 text-sm">
              <a href="https://t.me/gate33" target="_blank" rel="noopener noreferrer" className="block hover:text-orange-500 mb-2">Telegram</a>
              <a href="https://twitter.com/gate33" target="_blank" rel="noopener noreferrer" className="block hover:text-orange-500 mb-2">Twitter</a>
              <a href="https://linkedin.com/company/gate33" target="_blank" rel="noopener noreferrer" className="block hover:text-orange-500">LinkedIn</a>
            </nav>
          </div>
        </div>
        <div className="mt-8 pt-4 text-center text-gray-500 text-sm">
          <p>© 2025 Gate33. All Rights Reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default Layout;

