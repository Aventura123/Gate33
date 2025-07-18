"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import Layout from '../../../../components/Layout';
import '../../../../components/index-page.css';
import '../../../../components/global.css';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../../../lib/firebase';

interface CoinferenceXData {
  affiliateLink?: string;
  ticketUrl?: string;
  discountCode?: string;
  priceRange?: string;
  specialOffer?: string;
  active?: boolean;
}

export default function CoinferenceXPage() {
  const [dynamicData, setDynamicData] = useState<CoinferenceXData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDynamicData = async () => {
      try {
        // Buscar apenas dados dinâmicos do Firebase
        const docRef = doc(db, 'partners', 'coinferencex');
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          const data = docSnap.data();
          setDynamicData({
            affiliateLink: data.eventDetails?.affiliateLink || data.affiliateLink,
            ticketUrl: data.eventDetails?.ticketUrl || data.ticketUrl,
            discountCode: data.eventDetails?.discountCode || data.discountCode,
            priceRange: data.eventDetails?.priceRange || data.priceRange,
            specialOffer: data.specialOffer,
            active: data.active !== false
          });
        }
      } catch (err) {
        console.error('Error fetching CoinferenceX data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchDynamicData();
  }, []);

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-black to-gray-900 relative overflow-hidden">
        
        {/* Enhanced Background with Professional Dark Gradient */}
        <div className="fixed inset-0 opacity-15 z-0">
          <div className="w-full h-full" style={{
            backgroundImage: `
              radial-gradient(circle at 20% 20%, rgba(255,165,0,0.08) 0%, transparent 60%),
              radial-gradient(circle at 80% 80%, rgba(255,204,0,0.06) 0%, transparent 60%),
              linear-gradient(135deg, transparent 30%, rgba(255,255,255,0.02) 30%, rgba(255,255,255,0.02) 50%, transparent 50%, transparent 75%, rgba(255,255,255,0.02) 75%)
            `,
            backgroundSize: '900px 900px, 700px 700px, 140px 140px',
            backgroundPosition: '0 0, 100% 100%, 70px 70px'
          }}></div>
        </div>

        {/* Subtle Floating Particles */}
        <div className="fixed inset-0 opacity-6 z-0">
          <div className="w-full h-full" style={{
            backgroundImage: `
              radial-gradient(circle at 25% 25%, rgba(255,165,0,0.12) 0.8px, transparent 0.8px),
              radial-gradient(circle at 75% 75%, rgba(255,165,0,0.08) 0.6px, transparent 0.6px),
              radial-gradient(circle at 50% 10%, rgba(255,255,255,0.04) 0.4px, transparent 0.4px)
            `,
            backgroundSize: '220px 220px, 280px 280px, 160px 160px',
            animation: 'float 25s ease-in-out infinite'
          }}></div>
        </div>

        {/* Enhanced CSS Animations */}
        <style jsx>{`
          @keyframes float {
            0%, 100% { transform: translateY(0px) rotate(0deg); }
            50% { transform: translateY(-20px) rotate(180deg); }
          }
          @keyframes fadeInUp {
            from { opacity: 0; transform: translateY(50px); }
            to { opacity: 1; transform: translateY(0); }
          }
          @keyframes slideInLeft {
            from { opacity: 0; transform: translateX(-50px); }
            to { opacity: 1; transform: translateX(0); }
          }
          @keyframes slideInRight {
            from { opacity: 0; transform: translateX(50px); }
            to { opacity: 1; transform: translateX(0); }
          }
          @keyframes glow {
            0%, 100% { box-shadow: 0 0 20px rgba(255, 165, 0, 0.3); }
            50% { box-shadow: 0 0 40px rgba(255, 165, 0, 0.6); }
          }
          @keyframes pulse {
            0%, 100% { transform: scale(1); opacity: 1; }
            50% { transform: scale(1.05); opacity: 0.9; }
          }
          @keyframes shimmer {
            0% { transform: translateX(-100%); }
            100% { transform: translateX(100%); }
          }
          @keyframes slide-infinite {
            0% { transform: translateX(0); }
            100% { transform: translateX(-50%); }
          }
          
          .animate-fadeInUp {
            animation: fadeInUp 0.8s ease-out forwards;
            opacity: 0;
          }
          .animate-slideInLeft {
            animation: slideInLeft 0.8s ease-out forwards;
            opacity: 0;
          }
          .animate-slideInRight {
            animation: slideInRight 0.8s ease-out forwards;
            opacity: 0;
          }
          .animate-glow {
            animation: glow 3s ease-in-out infinite;
          }
          .animate-pulse-slow {
            animation: pulse 4s ease-in-out infinite;
          }
          .animate-slide-infinite {
            animation: slide-infinite 80s linear infinite;
          }
          
          .animate-delay-100 { animation-delay: 0.1s; }
          .animate-delay-200 { animation-delay: 0.2s; }
          .animate-delay-300 { animation-delay: 0.3s; }
          .animate-delay-400 { animation-delay: 0.4s; }
          .animate-delay-500 { animation-delay: 0.5s; }
          .animate-delay-600 { animation-delay: 0.6s; }
          .animate-delay-700 { animation-delay: 0.7s; }
          .animate-delay-800 { animation-delay: 0.8s; }
          .animate-delay-900 { animation-delay: 0.9s; }
          .animate-delay-1000 { animation-delay: 1.0s; }
          .animate-delay-1100 { animation-delay: 1.1s; }
          .animate-delay-1200 { animation-delay: 1.2s; }
          
          /* Smooth scroll behavior */
          html {
            scroll-behavior: smooth;
          }
          
          /* Custom scrollbar */
          ::-webkit-scrollbar {
            width: 8px;
          }
          ::-webkit-scrollbar-track {
            background: rgba(55, 65, 81, 0.5);
          }
          ::-webkit-scrollbar-thumb {
            background: rgba(255, 165, 0, 0.5);
            border-radius: 4px;
          }
          ::-webkit-scrollbar-thumb:hover {
            background: rgba(255, 165, 0, 0.8);
          }
          
          /* Pause animation on hover */
          .animate-slide-infinite:hover {
            animation-play-state: paused;
          }
        `}</style>
        
        {/* Content that scrolls over the fixed background */}
        <div className="relative z-10">
          
          {/* Hero Section - Enhanced with Parallax */}
          <section className="relative min-h-screen flex items-center justify-start overflow-hidden">
            {/* Hero Background Image */}
            <div className="absolute inset-0 z-0">
              <div 
                className="w-full h-full bg-cover bg-center bg-no-repeat"
                style={{
                  backgroundImage: 'url("/coinference/coinference.png")',
                  filter: 'brightness(0.6) contrast(1.1)'
                }}
              />
              {/* Overlay gradient */}
              <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/30 to-black/60" />
              <div className="absolute inset-0" style={{
                backgroundImage: 'radial-gradient(ellipse at center, rgba(255,165,0,0.08) 0%, transparent 70%)',
                transform: 'translateZ(0)' // Enable hardware acceleration
              }} />
            </div>
            
            <div className="relative z-10 text-left max-w-2xl px-4 animate-fadeInUp pt-8 md:pt-16 ml-12 md:ml-20 lg:ml-32">
              {/* Logo with Enhanced Animation */}
              <div className="flex items-center justify-center mb-8 animate-delay-100">
                <div className="relative group">
                  <div className="absolute inset-0 bg-yellow-400/20 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                  <img 
                    src="https://coinferencex.com/_next/image?url=%2Fassets%2FLogo_nofont_!.png&w=256&q=75"
                    alt="CoinferenceX Logo"
                    className="w-28 h-28 md:w-32 md:h-32 lg:w-36 lg:h-36 object-contain relative z-10 transform group-hover:scale-110 transition-transform duration-300"
                  />
                </div>
              </div>
              
              {/* Main Title with Text Shadow */}
              <h1 className="text-4xl md:text-6xl lg:text-7xl xl:text-8xl font-bold text-white mb-4 tracking-tight animate-delay-200 text-center"
                  style={{
                    textShadow: '0 0 30px rgba(255,165,0,0.3), 0 0 60px rgba(255,165,0,0.1)'
                  }}>
                CoinFerenceX
              </h1>
              <p className="text-lg md:text-xl lg:text-2xl text-yellow-300 mb-6 font-medium animate-delay-300 text-center">
                The World's First <span className="text-yellow-400 font-bold">Decentralized Summit</span>
              </p>
              
              {/* Date and Location with Better Styling */}
              <div className="mb-8 animate-delay-400 text-center">
                <h2 className="text-base md:text-lg lg:text-xl text-yellow-200 font-bold mb-2">
                  September 29-30, 2025 | Singapore
                </h2>
                <p className="text-sm md:text-base lg:text-lg text-gray-300 max-w-2xl leading-relaxed">
                  Singapore will bring together 25,000+ decision-makers to connect, exchange ideas, 
                  network, and shape the industry on September 29-30, 2025
                </p>
              </div>
              
              {/* Enhanced CTA Buttons */}
              <div className="flex flex-wrap justify-center gap-4 mb-2 animate-delay-500">
                {!loading && dynamicData?.affiliateLink ? (
                  <>
                    <a 
                      href={dynamicData.affiliateLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="relative group bg-gradient-to-r from-yellow-300 to-yellow-400 text-black px-10 py-4 rounded-full font-bold text-lg transition-all duration-300 shadow-lg hover:shadow-2xl transform hover:scale-105 hover:from-yellow-400 hover:to-yellow-500 overflow-hidden animate-glow"
                    >
                      <span className="relative z-10">
                        Buy Tickets with Discount
                        {dynamicData.discountCode && (
                          <span className="ml-2 text-sm bg-black/20 px-3 py-1 rounded-full">
                            {dynamicData.discountCode}
                          </span>
                        )}
                      </span>
                      <div className="absolute inset-0 bg-white/20 transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
                    </a>
                    <a 
                      href="https://coinferencex.com/sponsors"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="relative group bg-gradient-to-r from-gray-700 to-gray-800 text-white border-2 border-yellow-300 px-10 py-4 rounded-full font-bold text-lg transition-all duration-300 shadow-lg hover:shadow-2xl transform hover:scale-105 hover:bg-gradient-to-r hover:from-yellow-300 hover:to-yellow-400 hover:text-black overflow-hidden"
                    >
                      <span className="relative z-10">Become a Sponsor</span>
                      <div className="absolute inset-0 bg-white/10 transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
                    </a>
                  </>
                ) : (
                  <>
                    <button 
                      className="relative group bg-gradient-to-r from-yellow-300 to-yellow-400 text-black px-10 py-4 rounded-full font-bold text-lg transition-all duration-300 shadow-lg hover:shadow-2xl transform hover:scale-105 hover:from-yellow-400 hover:to-yellow-500 cursor-pointer overflow-hidden"
                    >
                      <span className="relative z-10 group-hover:opacity-0 transition-opacity duration-300">Buy Tickets with Discount</span>
                      <span className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10">Coming Soon</span>
                      <div className="absolute inset-0 bg-white/20 transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
                    </button>
                    <button 
                      className="relative group bg-gradient-to-r from-gray-700 to-gray-800 text-white border-2 border-yellow-300 px-10 py-4 rounded-full font-bold text-lg transition-all duration-300 shadow-lg hover:shadow-2xl transform hover:scale-105 hover:bg-gradient-to-r hover:from-yellow-300 hover:to-yellow-400 hover:text-black cursor-pointer overflow-hidden"
                    >
                      <span className="relative z-10 group-hover:opacity-0 transition-opacity duration-300">Become a Sponsor</span>
                      <span className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10">Coming Soon</span>
                      <div className="absolute inset-0 bg-white/10 transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
                    </button>
                  </>
                )}
              </div>
              
              {/* Price Range */}
              {!loading && dynamicData?.priceRange && (
                <p className="text-yellow-300 text-lg animate-delay-600 text-center">
                  Tickets from {dynamicData.priceRange}
                </p>
              )}
            </div>
          </section>

          {/* Stats Section - Enhanced with Dark Background and Animations */}
          <section className="py-16 px-4 relative z-20 bg-gradient-to-r from-gray-900/80 via-gray-800/80 to-gray-900/80 backdrop-blur-sm border-y border-gray-700/20">
            <div className="max-w-7xl mx-auto animate-fadeInUp">
              <h2 className="text-4xl md:text-5xl font-bold text-white mb-4 text-center">
                Get your project invested. See how with
              </h2>
              <h3 className="text-3xl md:text-4xl font-bold text-yellow-300 mb-16 text-center">
                CoinferenceX Singapore
              </h3>
              
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-8 max-w-5xl mx-auto">
                {[
                  { number: '7500+', label: 'Attendees Joining' },
                  { number: '600+', label: 'KOLs' },
                  { number: '400+', label: 'Media' },
                  { number: '450+', label: 'Partners' },
                  { number: '250+', label: 'Investors Joining' },
                  { number: '750+', label: 'Startups' }
                ].map((stat, index) => (                <div key={index} className={`text-center group hover:scale-105 transition-all duration-300 animate-fadeInUp animate-delay-${(index + 1) * 100} p-4 rounded-lg hover:bg-gray-800/30`}>
                  <div className="relative">
                    <div className="absolute inset-0 bg-yellow-300/12 blur-lg rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    <div className="text-4xl md:text-5xl font-bold text-yellow-300 mb-2 relative z-10 group-hover:text-yellow-200 transition-colors drop-shadow-lg">
                      {stat.number}
                    </div>
                  </div>
                  <div className="text-gray-300 text-sm group-hover:text-white transition-colors font-medium">
                    {stat.label}
                  </div>
                </div>
                ))}
              </div>
              
              <div className="text-center mt-12 animate-fadeInUp animate-delay-700">
                <p className="text-lg text-gray-500 font-medium">Global Web3 Collective</p>
              </div>
            </div>
          </section>

        {/* What to Expect Section - Enhanced Animations */}
        <section className="py-20 px-4 relative z-20">
          <div className="max-w-7xl mx-auto">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div className="space-y-6 animate-slideInLeft">
                <h2 className="text-4xl md:text-5xl font-bold text-white mb-8">
                  Singapore is where blockchain dreams become reality — and the world's leading Web3 projects already believe in the vision.
                </h2>
                <p className="text-gray-400 text-lg leading-relaxed">
                  These were the builders, backers, and believers of our Dubai edition.
                </p>
                <div className="pt-6">
                  {!loading && dynamicData?.affiliateLink && (
                    <a 
                      href={dynamicData.affiliateLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="relative group bg-gradient-to-r from-yellow-300 to-yellow-400 text-black px-8 py-4 rounded-full font-bold text-lg transition-all duration-300 shadow-lg hover:shadow-2xl transform hover:scale-105 hover:from-yellow-400 hover:to-yellow-500 inline-block overflow-hidden"
                    >
                      <span className="relative z-10">Buy Tickets with Discount</span>
                      <div className="absolute inset-0 bg-white/20 transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
                    </a>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 animate-slideInRight">
                <div className="group">
                  <img 
                    src="https://coinferencex.com/_next/image?url=%2Fassets%2FCompanies_Main_3_1.jpg&w=828&q=75"
                    alt="What to Expect - Left"
                    className="w-full h-64 object-cover rounded-lg transform group-hover:scale-105 transition-transform duration-300 shadow-lg group-hover:shadow-2xl"
                  />
                </div>
                <div className="group">
                  <img 
                    src="https://coinferencex.com/_next/image?url=%2Fassets%2FCompanies_Main_3_2.jpg&w=828&q=75"
                    alt="What to Expect - Right"
                    className="w-full h-64 object-cover rounded-lg transform group-hover:scale-105 transition-transform duration-300 shadow-lg group-hover:shadow-2xl"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Topics Section - Enhanced with Better Cards */}
        <section className="py-20 px-4 relative z-20">
          <div className="max-w-7xl mx-auto">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-16 text-center animate-fadeInUp">
              What Topics <span className="text-yellow-300">Will Be Discussed?</span>
            </h2>
            
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
              {[
                { name: 'Sustainable Blockchain', icon: '🌱' },
                { name: 'Infrastructure', icon: '🏗️' },
                { name: 'DePIN', icon: '📡' },
                { name: 'Mining', icon: '⛏️' },
                { name: 'Regulation & Compliance', icon: '⚖️' },
                { name: 'Play-to-Earn (P2E)', icon: '🎮' },
                { name: 'Decentralized Governance', icon: '🗳️' },
                { name: 'Gaming', icon: '🕹️' },
                { name: 'RWAs', icon: '🏢' },
                { name: 'Blockchain Security', icon: '🔒' },
                { name: 'Memecoins', icon: '🐸' },
                { name: 'DeFi 2.0', icon: '💰' }
              ].map((topic, index) => (
                <div key={topic.name} className={`text-center p-6 bg-gradient-to-br from-gray-800/80 to-gray-900/80 rounded-xl backdrop-blur-sm border border-gray-600/40 hover:border-yellow-300/50 transition-all duration-300 group hover:scale-105 hover:shadow-2xl hover:shadow-yellow-300/20 animate-fadeInUp animate-delay-${(index + 1) * 100} hover:bg-gradient-to-br hover:from-gray-700/90 hover:to-gray-800/90`}>
                  <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-yellow-300/20 to-yellow-400/20 rounded-full flex items-center justify-center group-hover:from-yellow-300/30 group-hover:to-yellow-400/30 transition-all duration-300 group-hover:scale-110 shadow-lg">
                    <span className="text-2xl group-hover:scale-110 transition-transform duration-300 filter drop-shadow-sm">{topic.icon}</span>
                  </div>
                  <p className="text-gray-300 font-medium text-sm group-hover:text-white transition-colors duration-300">{topic.name}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Past Speakers Section - Enhanced with Hover Effects */}
        <section className="py-20 px-4 relative z-20">
          <div className="max-w-7xl mx-auto">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6 text-center animate-fadeInUp">
              Past Speakers
            </h2>
            <p className="text-xl text-gray-400 mb-16 text-center animate-fadeInUp animate-delay-200">
              The Leading Voices On Crypto's Biggest Stage.
            </p>
            
            <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-6 mb-12">
              {[
                'vivien.png', 'kevinlee.png', 'sergey.png', 'yusuf.png', 'clara.png', 'dimitriy.png', 'kennymanta.png',
                'alexmomot.png', 'dyma.png', 'arbane.png', 'sasha.png', 'joshua.png', 'parker.png', 'vivien.png'
              ].map((speaker, index) => (
                <div key={index} className={`aspect-square group animate-fadeInUp animate-delay-${(index + 1) * 100}`}>
                  <div className="relative overflow-hidden rounded-lg">
                    <img 
                      src={`https://coinferencex.com/assets/Speakers%20Past/${speaker}`}
                      alt={`Speaker ${index + 1}`}
                      className="w-full h-full object-cover rounded-lg transform group-hover:scale-110 transition-transform duration-300 filter group-hover:brightness-110"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-lg"></div>
                    <div className="absolute inset-0 ring-2 ring-yellow-300/0 group-hover:ring-yellow-300/50 transition-all duration-300 rounded-lg"></div>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="text-center animate-fadeInUp animate-delay-700">
              <p className="text-gray-400 text-lg mb-6">
                Join industry leaders, investors, and innovators at the most anticipated Web3 event of 2025.
              </p>
            </div>
          </div>
        </section>

        {/* What People Say Section - Horizontal Carousel */}
        <section className="py-20 relative z-20">
          <div className="max-w-7xl mx-auto px-4">
            <div className="text-center mb-16">
              <img 
                src="https://coinferencex.com/_next/image?url=%2Fassets%2FHashtag_CoinFerenceX.png&w=384&q=75"
                alt="CoinferenceX Hashtag"
                className="w-64 h-auto mx-auto mb-8 animate-fadeInUp"
              />
              <h2 className="text-4xl md:text-5xl font-bold text-white mb-8 animate-fadeInUp animate-delay-200">
                What People Say About CoinferenceX?
              </h2>
            </div>
          </div>
          
          {/* Horizontal Sliding Carousel - Full Width */}
          <div className="relative overflow-hidden mb-12 w-full">
            <div className="flex animate-slide-infinite"
                 style={{ width: 'calc(200%)', gap: '12px' }}>
              {[
                'https://i.postimg.cc/x1fBzz7h/Socials-1.png',
                'https://i.postimg.cc/QtTz3k99/Socials-2.png',
                'https://i.postimg.cc/XvhPmDJ6/Socials-5.png',
                'https://i.postimg.cc/fbkFHhMv/Socials-4.png',
                'https://i.postimg.cc/gjbTkX8M/Socials-3.png',
                'https://i.postimg.cc/XN9P1L6t/Socials-6.png',
                'https://i.postimg.cc/ZnPD9bLJ/Socials-7.png',
                // Duplicando as imagens para criar o efeito infinito
                'https://i.postimg.cc/x1fBzz7h/Socials-1.png',
                'https://i.postimg.cc/QtTz3k99/Socials-2.png',
                'https://i.postimg.cc/XvhPmDJ6/Socials-5.png',
                'https://i.postimg.cc/fbkFHhMv/Socials-4.png',
                'https://i.postimg.cc/gjbTkX8M/Socials-3.png',
                'https://i.postimg.cc/XN9P1L6t/Socials-6.png',
                'https://i.postimg.cc/ZnPD9bLJ/Socials-7.png'
              ].map((post, index) => (
                <div key={index} className="flex-shrink-0 w-80 h-80 group">
                  <div className="relative overflow-hidden rounded-lg h-full">
                    <img 
                      src={post}
                      alt={`Social media post ${index + 1}`}
                      className="w-full h-full object-cover rounded-lg transform group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-lg"></div>
                    <div className="absolute inset-0 ring-2 ring-yellow-300/0 group-hover:ring-yellow-300/40 transition-all duration-300 rounded-lg"></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          {/* Enhanced CTA Buttons */}
          <div className="text-center animate-fadeInUp animate-delay-500 px-4">
            <div className="flex flex-wrap justify-center gap-4">
              {!loading && dynamicData?.affiliateLink && (
                <a 
                  href={dynamicData.affiliateLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="relative group bg-gradient-to-r from-yellow-300 to-yellow-400 text-black px-8 py-3 rounded-full font-bold text-lg transition-all duration-300 shadow-lg hover:shadow-2xl transform hover:scale-105 hover:from-yellow-400 hover:to-yellow-500 overflow-hidden"
                >
                  <span className="relative z-10">Buy Tickets with Discount</span>
                  <div className="absolute inset-0 bg-white/20 transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
                </a>
              )}
            </div>
          </div>
        </section>

        {/* Enhanced Special Offer */}
        {!loading && dynamicData?.specialOffer && (
          <section className="py-16 px-4 bg-gradient-to-r from-green-600/30 via-green-500/20 to-green-400/30 backdrop-blur-sm relative z-20 border-y border-green-400/20">
            <div className="max-w-4xl mx-auto text-center animate-fadeInUp">
              <div className="relative">
                <div className="absolute inset-0 bg-green-400/10 blur-2xl rounded-full"></div>
                <h2 className="text-3xl font-bold text-green-400 mb-4 relative z-10">
                  🎟️ Special Gate33 Offer
                </h2>
              </div>
              <p className="text-gray-200 text-lg mb-6 animate-fadeInUp animate-delay-200">
                {dynamicData.specialOffer}
              </p>
              {dynamicData.affiliateLink && (
                <a 
                  href={dynamicData.affiliateLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="relative group inline-block bg-gradient-to-r from-green-500 to-green-600 text-white px-8 py-4 rounded-full font-bold text-lg transition-all duration-300 shadow-lg hover:shadow-2xl transform hover:scale-105 hover:from-green-600 hover:to-green-700 overflow-hidden animate-fadeInUp animate-delay-400"
                >
                  <span className="relative z-10">Claim Your Discount</span>
                  <div className="absolute inset-0 bg-white/20 transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
                </a>
              )}
            </div>
          </section>
        )}

        {/* Enhanced Final CTA Section */}
        <section className="py-20 px-4 text-center relative z-20 bg-gradient-to-r from-gray-800/60 via-gray-900/60 to-gray-800/60 backdrop-blur-sm border-t border-gray-700/30">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6 animate-fadeInUp">
              Ready to Experience the Future?
            </h2>
            <p className="text-gray-300 text-xl mb-8 animate-fadeInUp animate-delay-200">
              Join the conference that's actually built by the Web3 community, for the Web3 community.
            </p>
            
            <div className="flex flex-wrap justify-center gap-6 animate-fadeInUp animate-delay-400">
              {!loading && dynamicData?.affiliateLink ? (
                <a 
                  href={dynamicData.affiliateLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="relative group bg-gradient-to-r from-yellow-300 to-yellow-400 text-black px-10 py-4 rounded-full font-bold text-lg transition-all duration-300 shadow-lg hover:shadow-2xl transform hover:scale-105 hover:from-yellow-400 hover:to-yellow-500 overflow-hidden"
                >
                  <span className="relative z-10">
                    Get Your Tickets with Discount
                    {dynamicData.discountCode && (
                      <span className="ml-2 text-sm bg-black/20 px-3 py-1 rounded-full">
                        {dynamicData.discountCode}
                      </span>
                    )}
                  </span>
                  <div className="absolute inset-0 bg-white/20 transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
                </a>
              ) : (
                <button 
                  className="relative group bg-gradient-to-r from-yellow-300 to-yellow-400 text-black px-10 py-4 rounded-full font-bold text-lg transition-all duration-300 shadow-lg hover:shadow-2xl transform hover:scale-105 hover:from-yellow-400 hover:to-yellow-500 cursor-pointer overflow-hidden"
                >
                  <span className="relative z-10 group-hover:opacity-0 transition-opacity duration-300">Get Your Tickets with Discount</span>
                  <span className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10">Coming Soon</span>
                  <div className="absolute inset-0 bg-white/20 transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
                </button>
              )}
            </div>
          </div>
        </section>

        {/* Enhanced Navigation */}
        <section className="py-8 px-4 max-w-6xl mx-auto relative z-20">
          <div className="flex justify-between items-center">
            <Link 
              href="/partners/events" 
              className="text-yellow-300 hover:text-yellow-200 transition-colors duration-300 group flex items-center gap-2"
            >
              <span className="transform group-hover:-translate-x-1 transition-transform duration-300">←</span>
              <span>Back to Events</span>
            </Link>
            <Link 
              href="/partners" 
              className="text-yellow-300 hover:text-yellow-200 transition-colors duration-300 group flex items-center gap-2"
            >
              <span>All Partners</span>
              <span className="transform group-hover:translate-x-1 transition-transform duration-300">→</span>
            </Link>
          </div>
        </section>
        
        </div> {/* End of relative z-10 content container */}
      </div>
    </Layout>
  );
}
