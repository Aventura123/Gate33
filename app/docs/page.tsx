'use client';

import React, { useState } from 'react';
import FullScreenLayout from '../../components/FullScreenLayout';

export default function DocsPage() {
  const [activeSection, setActiveSection] = useState('introduction');

  const menuItems = [
    { id: 'introduction', label: 'Introducing Gate33', icon: '📖' },
    { 
      id: 'platform', 
      label: 'PLATFORM', 
      isCategory: true,
      children: [
        { id: 'overview', label: 'Overview', icon: '🎯' },
        { id: 'features', label: 'Core Features', icon: '⚡' },
        { id: 'architecture', label: 'Platform Architecture', icon: '🏗️' }
      ]
    },    { 
      id: 'token', 
      label: 'G33 TOKEN', 
      isCategory: true,
      children: [
        { id: 'tokenomics', label: 'Tokenomics', icon: '💰' },
        { id: 'utilities', label: 'Token Utilities', icon: '🔧' },
        { id: 'distribution', label: 'Distribution', icon: '📊' }
      ]
    },    { 
      id: 'nfts', 
      label: 'NFTS', 
      isCategory: true,
      children: [
        { id: 'supporter-nfts', label: 'Supporter NFTs', icon: '🎨' },
        { id: 'member-nfts', label: 'Member NFTs', icon: '👑' }
      ]
    },{ 
      id: 'economics', 
      label: 'ECONOMICS', 
      isCategory: true,
      children: [
        { id: 'revenue-model', label: 'Revenue Model', icon: '💰' },
        { id: 'market-projections', label: 'Market Projections', icon: '📊' },
        { id: 'risk-analysis', label: 'Risk Analysis', icon: '⚖️' }
      ]
    },    { 
      id: 'extra', 
      label: 'EXTRA', 
      isCategory: true,
      children: [
        { id: 'whitepaper', label: 'Official Whitepaper', icon: '📄' },
        { id: 'roadmap', label: 'Roadmap', icon: '🗺️' },
        { id: 'team', label: 'Team & Governance', icon: '👥' }
      ]
    }
  ];
  const renderContent = () => {
    switch(activeSection) {
      case 'introduction':
        return (
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-6">Introducing Gate33</h1>
            <div className="prose max-w-none">
              <p className="text-lg text-gray-700 mb-6">
                Gate33 is a next-generation platform designed to profoundly transform the Web3 work ecosystem. 
                Much more than just a decentralized job board, Gate33 acts as a complete, secure, and transparent 
                environment where companies and professionals can interact with confidence and protection.
              </p>
              
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-6 mb-6">
                <h3 className="text-xl font-semibold text-orange-800 mb-4">🚨 Market Problem</h3>
                <p className="text-orange-700 mb-3">
                  The Web3 job market has been severely affected by scams. In 2024 alone, losses exceeded 
                  <strong> $220 million</strong> - representing 40% of frauds in that period.
                </p>
                <ul className="text-orange-700 list-disc list-inside space-y-1">
                  <li>62% of Web3 professionals have faced fraudulent job offers</li>
                  <li>78% distrust unaudited recruitment processes</li>
                  <li>Average losses per victim exceed $8,500</li>
                </ul>
              </div>

              <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-6">
                <h3 className="text-xl font-semibold text-green-800 mb-4">✅ Gate33 Solution</h3>
                <p className="text-green-700 mb-3">
                  Through blockchain technology and smart contracts, we enable secure job postings, 
                  automated microtask execution, and decentralized payment management.
                </p>
                <ul className="text-green-700 list-disc list-inside space-y-1">
                  <li>Three-level verification before publishing job posts</li>
                  <li>On-chain reputation system for employers and candidates</li>
                  <li>Escrow payments automatically via smart contracts</li>
                  <li>85% estimated reduction in fraud cases</li>
                </ul>
              </div>

              <p className="text-gray-600 mb-4">
                Gate33 positions itself as a true enabler of Web3 adoption, offering not only professional 
                opportunities, but also educational tools, governance mechanisms, and gamified features, 
                always with an emphasis on privacy and user experience.
              </p>
              
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-6">
                <p className="text-blue-800 text-sm">
                  <strong>Our Motto:</strong> "Innovate with Security" - For comprehensive technical details, 
                  please refer to our official whitepaper.
                </p>
              </div>
            </div>
          </div>
        );
      
      case 'whitepaper':
        return (
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-6">Official Whitepaper</h1>
            <div className="bg-white border border-gray-200 rounded-lg p-8">
              <div className="flex items-center mb-6">
                <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mr-4">
                  <span className="text-orange-600 text-2xl">📄</span>
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">Gate33 Whitepaper</h2>
                  <p className="text-gray-600">Comprehensive platform documentation</p>
                </div>
              </div>
              <p className="text-gray-700 mb-6">
                Access our complete whitepaper to understand Gate33's vision, technology, tokenomics, and roadmap. 
                This document contains the most accurate and up-to-date information about our platform.
              </p>
              <a 
                href="/whitepaper.pdf" 
                target="_blank"
                className="inline-flex items-center px-6 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors font-medium"
              >
                <span className="mr-2">📥</span>
                Download PDF
              </a>
            </div>
          </div>
        );
        case 'overview':
        return (
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-6">Platform Overview</h1>
            <div className="prose max-w-none">
              <p className="text-lg text-gray-700 mb-6">
                Gate33 is a comprehensive decentralized platform that revolutionizes the Web3 job market 
                through audited smart contracts, proactive verification, and a complete ecosystem of tools.
              </p>
              
              <div className="grid md:grid-cols-2 gap-6 mb-8">
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <div className="flex items-center mb-4">
                    <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center mr-3">
                      <span className="text-orange-600">💼</span>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900">JobBoard System</h3>
                  </div>
                  <ul className="text-gray-600 space-y-2 text-sm">
                    <li>• Only verified companies can post jobs</li>
                    <li>• Smart contract-based escrow payments</li>
                    <li>• Advanced filtering by technology & location</li>
                    <li>• Gamified design for better UX</li>
                  </ul>
                </div>

                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <div className="flex items-center mb-4">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                      <span className="text-blue-600">�️</span>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900">Company Verification</h3>
                  </div>
                  <ul className="text-gray-600 space-y-2 text-sm">
                    <li>• Manual verification with official docs</li>
                    <li>• Legal existence validation</li>
                    <li>• Trust badge system</li>
                    <li>• Continuous reputation monitoring</li>
                  </ul>
                </div>

                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <div className="flex items-center mb-4">
                    <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mr-3">
                      <span className="text-green-600">🎓</span>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900">Learn2Earn</h3>
                  </div>
                  <ul className="text-gray-600 space-y-2 text-sm">
                    <li>• Smart contracts reward learning</li>
                    <li>• Automatic token distribution</li>
                    <li>• Gamified educational content</li>
                    <li>• Skill development tracking</li>
                  </ul>
                </div>

                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <div className="flex items-center mb-4">
                    <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center mr-3">
                      <span className="text-purple-600">🔧</span>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900">CryptoTools</h3>
                  </div>
                  <ul className="text-gray-600 space-y-2 text-sm">
                    <li>• 10+ advanced blockchain tools</li>
                    <li>• Wallet analysis & ENS checker</li>
                    <li>• AI Smart Contract audits</li>
                    <li>• Governance AI copilot</li>
                  </ul>
                </div>
              </div>

              <div className="bg-gradient-to-r from-orange-50 to-blue-50 border border-orange-200 rounded-lg p-6">
                <h3 className="text-xl font-semibold text-gray-900 mb-4">🏗️ Technical Infrastructure</h3>
                <div className="grid md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <h4 className="font-semibold text-gray-800 mb-2">Multi-Chain Support</h4>
                    <p className="text-gray-600">Native support for 6 major blockchains with automatic fallback</p>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-800 mb-2">24/7 Monitoring</h4>
                    <p className="text-gray-600">Automated contract monitoring with real-time alerts</p>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-800 mb-2">Smart Contracts</h4>
                    <p className="text-gray-600">Audited contracts for payments, escrow, and rewards</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
        case 'features':
        return (
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-6">Core Features</h1>
            <div className="prose max-w-none">
              <p className="text-lg text-gray-700 mb-8">
                Gate33 offers a comprehensive suite of features designed to create a secure, efficient, and 
                rewarding Web3 work environment.
              </p>

              {/* Gate33 JobBoard */}
              <div className="bg-white border border-orange-200 rounded-lg p-8 mb-8">
                <div className="flex items-center mb-6">
                  <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mr-4">
                    <span className="text-orange-600 text-2xl">💼</span>
                  </div>
                  <div>
                    <h2 className="text-2xl font-semibold text-gray-900">Gate33 JobBoard</h2>
                    <p className="text-gray-600">Web3 Job Posting System</p>
                  </div>
                </div>
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-semibold text-gray-800 mb-3">🔍 Advanced Features</h4>
                    <ul className="text-gray-600 space-y-2 text-sm">
                      <li>• Advanced filters by category, technology, contract type</li>
                      <li>• Experience level and location filtering</li>
                      <li>• Crypto payment option integration</li>
                      <li>• "Featured" and "Team Posting" highlights</li>
                      <li>• Gamified design inspired by dopamine studies</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-800 mb-3">⚡ Smart Integration</h4>
                    <ul className="text-gray-600 space-y-2 text-sm">
                      <li>• Direct application via integrated modal</li>
                      <li>• Applications recorded in database</li>
                      <li>• Automatic company notifications</li>
                      <li>• Email alerts for new job postings</li>
                      <li>• Smart contract-based escrow payments</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* CryptoTools Ecosystem */}
              <div className="bg-white border border-blue-200 rounded-lg p-8 mb-8">
                <div className="flex items-center mb-6">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mr-4">
                    <span className="text-blue-600 text-2xl">🔧</span>
                  </div>
                  <div>
                    <h2 className="text-2xl font-semibold text-gray-900">CryptoTools Ecosystem</h2>
                    <p className="text-gray-600">10+ Advanced Blockchain Tools</p>
                  </div>
                </div>
                
                <div className="grid md:grid-cols-3 gap-6 mb-6">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h4 className="font-semibold text-blue-800 mb-3">🔍 Wallet Analysis</h4>
                    <ul className="text-blue-700 space-y-1 text-sm">
                      <li>• ENS Name Checker with fallback</li>
                      <li>• Wallet Age Calculator via Moralis</li>
                      <li>• Luck Score (0-100 proprietary algorithm)</li>
                      <li>• Shareable Flex Cards</li>
                      <li>• Dust Token Finder</li>
                      <li>• NFT Profile Generator</li>
                    </ul>
                  </div>
                  
                  <div className="bg-green-50 p-4 rounded-lg">
                    <h4 className="font-semibold text-green-800 mb-3">💰 Reward Tools</h4>
                    <ul className="text-green-700 space-y-1 text-sm">
                      <li>• Stake for passive income</li>
                      <li>• Platform native token rewards</li>
                      <li>• Token ROI Calculator</li>
                      <li>• Market Cap Comparisons</li>
                    </ul>
                  </div>
                  
                  <div className="bg-purple-50 p-4 rounded-lg">
                    <h4 className="font-semibold text-purple-800 mb-3">🤖 AI & Governance</h4>
                    <ul className="text-purple-700 space-y-1 text-sm">
                      <li>• Governance AI Copilot (in dev)</li>
                      <li>• AI Smart Contract Audit</li>
                      <li>• DAO proposal analysis</li>
                      <li>• Bitcoin Network Analysis</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Learn2Earn */}
              <div className="bg-white border border-green-200 rounded-lg p-8 mb-8">
                <div className="flex items-center mb-6">
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mr-4">
                    <span className="text-green-600 text-2xl">🎓</span>
                  </div>
                  <div>
                    <h2 className="text-2xl font-semibold text-gray-900">Gamified Learn2Earn</h2>
                    <p className="text-gray-600">Educational Reward System</p>
                  </div>
                </div>
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <ul className="text-gray-600 space-y-2">
                      <li>• Smart contracts that automatically reward learning</li>
                      <li>• Automatic distribution via Learn2EarnContract</li>
                      <li>• Gamified educational content</li>
                      <li>• Skill development tracking</li>
                    </ul>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg">
                    <h4 className="font-semibold text-green-800 mb-2">How it Works</h4>
                    <p className="text-green-700 text-sm">
                      Complete educational modules and earn tokens automatically through our smart contracts. 
                      Track your progress and build verifiable skills in the Web3 ecosystem.
                    </p>
                  </div>
                </div>
              </div>

              {/* Dashboards */}
              <div className="bg-white border border-purple-200 rounded-lg p-8">
                <div className="flex items-center mb-6">
                  <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mr-4">
                    <span className="text-purple-600 text-2xl">📊</span>
                  </div>
                  <div>
                    <h2 className="text-2xl font-semibold text-gray-900">Intuitive Dashboards</h2>
                    <p className="text-gray-600">Specialized interfaces for all user types</p>
                  </div>
                </div>
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="bg-purple-50 p-4 rounded-lg">
                    <h4 className="font-semibold text-purple-800 mb-3">👤 Seeker Dashboard</h4>
                    <ul className="text-purple-700 space-y-1 text-sm">
                      <li>• Direct company interaction</li>
                      <li>• Integrated microtask support</li>
                      <li>• Simplified profile management</li>
                      <li>• Skills and work history organization</li>
                    </ul>
                  </div>
                  <div className="bg-orange-50 p-4 rounded-lg">
                    <h4 className="font-semibold text-orange-800 mb-3">🏢 Company Dashboard</h4>
                    <ul className="text-orange-700 space-y-1 text-sm">
                      <li>• Create and manage job posts</li>
                      <li>• Performance metrics tracking</li>
                      <li>• Learn2Earn program management</li>
                      <li>• Specialized support integration</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
        case 'architecture':
        return (
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-6">Platform Architecture</h1>
            <div className="prose max-w-none">
              <p className="text-lg text-gray-700 mb-8">
                Gate33's technical infrastructure is built on a robust multi-chain architecture with 
                comprehensive monitoring and security features.
              </p>

              {/* Smart Contracts */}
              <div className="bg-white border border-blue-200 rounded-lg p-8 mb-8">
                <h2 className="text-2xl font-semibold text-gray-900 mb-6 flex items-center">
                  <span className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                    <span className="text-blue-600">📜</span>
                  </span>
                  Smart Contracts
                </h2>
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <h4 className="font-semibold text-blue-800 mb-2">Gate33PaymentProcessor</h4>
                      <p className="text-blue-700 text-sm">Handles all Web3 payments with security and transparency</p>
                    </div>
                    <div className="bg-green-50 p-4 rounded-lg">
                      <h4 className="font-semibold text-green-800 mb-2">InstantJobsEscrow</h4>
                      <p className="text-green-700 text-sm">Manages microtask deposits and dispute resolution automatically</p>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="bg-purple-50 p-4 rounded-lg">
                      <h4 className="font-semibold text-purple-800 mb-2">Learn2EarnContract</h4>
                      <p className="text-purple-700 text-sm">Educational reward system with automatic token distribution</p>
                    </div>
                    <div className="bg-orange-50 p-4 rounded-lg">
                      <h4 className="font-semibold text-orange-800 mb-2">G33TokenDistributorv2</h4>
                      <p className="text-orange-700 text-sm">Distribution system for G33 souvenir tokens</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Multi-Chain Architecture */}
              <div className="bg-white border border-green-200 rounded-lg p-8 mb-8">
                <h2 className="text-2xl font-semibold text-gray-900 mb-6 flex items-center">
                  <span className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center mr-3">
                    <span className="text-green-600">🔗</span>
                  </span>
                  Multi-Chain Architecture
                </h2>
                <div className="grid md:grid-cols-3 gap-6">
                  <div className="bg-green-50 p-4 rounded-lg">
                    <h4 className="font-semibold text-green-800 mb-3">6 Active Networks</h4>
                    <p className="text-green-700 text-sm mb-3">Native support for major blockchains ensuring maximum compatibility</p>
                    <ul className="text-green-600 text-xs space-y-1">
                      <li>• Ethereum</li>
                      <li>• Polygon</li>
                      <li>• BSC</li>
                      <li>• Base</li>
                      <li>• Arbitrum</li>
                      <li>• Optimism</li>
                    </ul>
                  </div>
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h4 className="font-semibold text-blue-800 mb-3">Automatic Fallback</h4>
                    <p className="text-blue-700 text-sm">Seamless switching between RPC providers for maximum uptime</p>
                  </div>
                  <div className="bg-purple-50 p-4 rounded-lg">
                    <h4 className="font-semibold text-purple-800 mb-3">Dynamic Configuration</h4>
                    <p className="text-purple-700 text-sm">Real-time configuration via Firestore with blockchain-database sync</p>
                  </div>
                </div>
              </div>

              {/* Monitoring System */}
              <div className="bg-white border border-orange-200 rounded-lg p-8">
                <h2 className="text-2xl font-semibold text-gray-900 mb-6 flex items-center">
                  <span className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center mr-3">
                    <span className="text-orange-600">📊</span>
                  </span>
                  24/7 Monitoring System
                </h2>
                <div className="grid md:grid-cols-4 gap-4">
                  <div className="bg-orange-50 p-4 rounded-lg text-center">
                    <div className="text-orange-600 text-2xl mb-2">🔍</div>
                    <h4 className="font-semibold text-orange-800 text-sm">Contract Monitoring</h4>
                    <p className="text-orange-700 text-xs mt-1">Automated 24/7 surveillance</p>
                  </div>
                  <div className="bg-red-50 p-4 rounded-lg text-center">
                    <div className="text-red-600 text-2xl mb-2">🚨</div>
                    <h4 className="font-semibold text-red-800 text-sm">Email Alerts</h4>
                    <p className="text-red-700 text-xs mt-1">Instant notifications for anomalies</p>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg text-center">
                    <div className="text-green-600 text-2xl mb-2">📈</div>
                    <h4 className="font-semibold text-green-800 text-sm">Real-time Dashboard</h4>
                    <p className="text-green-700 text-xs mt-1">Live metrics for administrators</p>
                  </div>
                  <div className="bg-blue-50 p-4 rounded-lg text-center">
                    <div className="text-blue-600 text-2xl mb-2">📋</div>
                    <h4 className="font-semibold text-blue-800 text-sm">Auditable Logs</h4>
                    <p className="text-blue-700 text-xs mt-1">Complete system transparency</p>
                  </div>
                </div>
              </div>

              {/* Competitive Advantages */}
              <div className="bg-gradient-to-r from-orange-50 to-blue-50 border border-orange-200 rounded-lg p-6 mt-8">
                <h3 className="text-xl font-semibold text-gray-900 mb-4">🏆 Technological Competitive Advantages</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-orange-200">
                        <th className="text-left py-2 font-semibold text-gray-800">Feature</th>
                        <th className="text-left py-2 font-semibold text-orange-600">Gate33</th>
                        <th className="text-left py-2 font-semibold text-gray-600">Traditional Competitors</th>
                      </tr>
                    </thead>
                    <tbody className="space-y-2">
                      <tr className="border-b border-gray-100">
                        <td className="py-2 font-medium">Multi-Network Monitoring</td>
                        <td className="py-2 text-orange-600">6 active networks</td>
                        <td className="py-2 text-gray-600">Limited/Nonexistent</td>
                      </tr>
                      <tr className="border-b border-gray-100">
                        <td className="py-2 font-medium">CryptoTools Suite</td>
                        <td className="py-2 text-orange-600">10+ tools</td>
                        <td className="py-2 text-gray-600">Basic functionalities</td>
                      </tr>
                      <tr className="border-b border-gray-100">
                        <td className="py-2 font-medium">Governance AI</td>
                        <td className="py-2 text-orange-600">In development</td>
                        <td className="py-2 text-gray-600">Nonexistent</td>
                      </tr>
                      <tr className="border-b border-gray-100">
                        <td className="py-2 font-medium">Alert System</td>
                        <td className="py-2 text-orange-600">Fully automated</td>
                        <td className="py-2 text-gray-600">Manual monitoring</td>
                      </tr>
                      <tr>
                        <td className="py-2 font-medium">Proactive Verification</td>
                        <td className="py-2 text-orange-600">On-chain and off-chain</td>
                        <td className="py-2 text-gray-600">Reactive process</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        );        case 'tokenomics':
        return (
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-6">Tokenomics</h1>
            <div className="prose max-w-none">
              <div className="bg-white border border-gray-200 rounded-lg p-12 text-center">
                <div className="w-24 h-24 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <span className="text-orange-600 text-4xl">💰</span>
                </div>
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">Coming Soon</h2>
                <p className="text-lg text-gray-600 mb-6 max-w-2xl mx-auto">
                  Detailed tokenomics information will be released soon. Our team is working on 
                  finalizing the comprehensive token economy design for the Gate33 ecosystem.
                </p>
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-6 max-w-xl mx-auto">
                  <p className="text-orange-700 text-sm">
                    <strong>What to expect:</strong> Token distribution model, utility mechanisms, 
                    reward systems, and governance participation details.
                  </p>
                </div>
              </div>
            </div>
          </div>
        );
        case 'utilities':
        return (
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-6">Token Utilities</h1>
            <div className="prose max-w-none">
              <div className="bg-white border border-gray-200 rounded-lg p-12 text-center">
                <div className="w-24 h-24 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <span className="text-orange-600 text-4xl">🔧</span>
                </div>
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">Coming Soon</h2>
                <p className="text-lg text-gray-600 mb-6 max-w-2xl mx-auto">
                  Detailed information about G33 token utilities will be released soon. Our team is working on 
                  finalizing the comprehensive utility mechanisms within the Gate33 ecosystem.
                </p>
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-6 max-w-xl mx-auto">
                  <p className="text-orange-700 text-sm">
                    <strong>What to expect:</strong> Staking mechanisms, governance participation, 
                    platform fee discounts, and exclusive feature access.
                  </p>
                </div>
              </div>
            </div>
          </div>        );
      
      case 'revenue-model':
        return (
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-6">Revenue Model</h1>
            <div className="prose max-w-none">
              <p className="text-lg text-gray-700 mb-8">
                Our revenue model is based on charging fees for platform services, creating sustainable 
                monetization aligned with blockchain best practices.
              </p>
              
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="bg-blue-50 p-6 rounded-lg">
                    <h4 className="font-semibold text-blue-800 mb-3 flex items-center">
                      <span className="mr-2">💼</span>
                      Job Posting Fee
                    </h4>
                    <p className="text-blue-700">Companies pay fees to publish job offers on the platform</p>
                  </div>
                  <div className="bg-green-50 p-6 rounded-lg">
                    <h4 className="font-semibold text-green-800 mb-3 flex items-center">
                      <span className="mr-2">🎓</span>
                      Learn2Earn Fee
                    </h4>
                    <p className="text-green-700">Fee charged to create Learn2Earn activities, promoting engagement</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="bg-purple-50 p-6 rounded-lg">
                    <h4 className="font-semibold text-purple-800 mb-3 flex items-center">
                      <span className="mr-2">⚡</span>
                      InstantJobs Fee
                    </h4>
                    <p className="text-purple-700">Microtasks subject to transaction or hiring fees</p>
                  </div>
                  <div className="bg-orange-50 p-6 rounded-lg">
                    <h4 className="font-semibold text-orange-800 mb-3 flex items-center">
                      <span className="mr-2">🔧</span>
                      Advanced Tools Fee
                    </h4>
                    <p className="text-orange-700">Usage fees for premium CryptoTools and AI services</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );      case 'market-projections':
        return (
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-6">Market Analysis & Projections</h1>
            <div className="prose max-w-none">
              <p className="text-lg text-gray-700 mb-8">
                Gate33 targets a rapidly growing Web3 freelance market with significant revenue potential 
                and clear market positioning strategy.
              </p>

              {/* TAM/SAM/SOM Analysis */}
              <div className="grid md:grid-cols-3 gap-6 mb-8">
                <div className="bg-green-50 p-6 rounded-lg text-center">
                  <div className="text-3xl font-bold text-green-600 mb-2">$127B</div>
                  <h4 className="font-semibold text-green-800 mb-2">TAM</h4>
                  <p className="text-green-700 text-sm mb-3">Total Addressable Market</p>
                  <div className="text-green-600 text-xs">
                    Global freelance work market with 15% annual growth rate
                  </div>
                </div>
                <div className="bg-blue-50 p-6 rounded-lg text-center">
                  <div className="text-3xl font-bold text-blue-600 mb-2">$8.5B</div>
                  <h4 className="font-semibold text-blue-800 mb-2">SAM</h4>
                  <p className="text-blue-700 text-sm mb-3">Serviceable Available Market</p>
                  <div className="text-blue-600 text-xs">
                    Remote Web3 & blockchain tech professionals
                  </div>
                </div>
                <div className="bg-orange-50 p-6 rounded-lg text-center">
                  <div className="text-3xl font-bold text-orange-600 mb-2">$425M</div>
                  <h4 className="font-semibold text-orange-800 mb-2">SOM</h4>
                  <p className="text-orange-700 text-sm mb-3">Serviceable Obtainable Market</p>
                  <div className="text-orange-600 text-xs">
                    0.5% target market share in 5 years
                  </div>
                </div>
              </div>

              {/* Market Analysis Deep Dive */}
              <div className="bg-white border border-gray-200 rounded-lg p-8 mb-8">
                <h2 className="text-2xl font-semibold text-gray-900 mb-6">Market Opportunity Analysis</h2>
                
                <div className="grid md:grid-cols-2 gap-8 mb-6">
                  <div className="bg-red-50 border border-red-200 rounded-lg p-6">
                    <h4 className="font-semibold text-red-800 mb-4 flex items-center">
                      <span className="mr-2">🚨</span>
                      Market Problem
                    </h4>
                    <div className="space-y-3">
                      <div className="bg-white bg-opacity-70 p-3 rounded">
                        <div className="text-2xl font-bold text-red-600">$220M+</div>
                        <p className="text-red-700 text-sm">Lost to Web3 job scams in 2024 (40% of total frauds)</p>
                      </div>
                      <ul className="text-red-700 text-sm space-y-1">
                        <li>• 62% of Web3 professionals faced fraudulent offers</li>
                        <li>• 78% distrust unaudited recruitment processes</li>
                        <li>• Average loss per victim: $8,500</li>
                        <li>• 71% gave up Web3 opportunities due to lack of guarantees</li>
                      </ul>
                    </div>
                  </div>

                  <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                    <h4 className="font-semibold text-green-800 mb-4 flex items-center">
                      <span className="mr-2">✅</span>
                      Gate33 Solution Impact
                    </h4>
                    <div className="space-y-3">
                      <div className="bg-white bg-opacity-70 p-3 rounded">
                        <div className="text-2xl font-bold text-green-600">85%</div>
                        <p className="text-green-700 text-sm">Estimated fraud reduction through proactive verification</p>
                      </div>
                      <ul className="text-green-700 text-sm space-y-1">
                        <li>• Three-level verification before job posting</li>
                        <li>• On-chain reputation system</li>
                        <li>• Smart contract escrow payments</li>
                        <li>• Eliminates vulnerability period for early users</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                  <h4 className="font-semibold text-blue-800 mb-4">Market Size Validation</h4>
                  <p className="text-blue-700 text-sm mb-3">
                    The $425M SOM target represents 0.5% of an estimated $85B Web3 freelance market, 
                    indicating rapid growth potential in this emerging niche.
                  </p>
                  <div className="grid md:grid-cols-2 gap-4 text-xs">
                    <div>
                      <strong className="text-blue-800">Growth Drivers:</strong>
                      <ul className="text-blue-600 mt-1 space-y-1">
                        <li>• Increasing Web3 adoption</li>
                        <li>• Remote work normalization</li>
                        <li>• Specialized talent shortage</li>
                      </ul>
                    </div>
                    <div>
                      <strong className="text-blue-800">Market Position:</strong>
                      <ul className="text-blue-600 mt-1 space-y-1">
                        <li>• First-mover advantage in verified Web3 jobs</li>
                        <li>• Comprehensive security approach</li>
                        <li>• Multi-revenue stream model</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>

              {/* Target Audience Segmentation */}
              <div className="bg-white border border-purple-200 rounded-lg p-8">
                <h2 className="text-2xl font-semibold text-gray-900 mb-6">Target Audience Analysis</h2>
                
                <div className="grid md:grid-cols-2 gap-8">
                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-6">
                    <h4 className="font-semibold text-purple-800 mb-4 flex items-center">
                      <span className="mr-2">🎯</span>
                      Primary Segment (Core Revenue)
                    </h4>
                    <ul className="text-purple-700 space-y-2 text-sm">
                      <li>• <strong>Web3 professionals & blockchain developers:</strong> High-value skilled talent</li>
                      <li>• <strong>Companies seeking specialized talent:</strong> Primary revenue source</li>
                      <li>• <strong>Freelancers transitioning into Web3:</strong> Growing market segment</li>
                    </ul>
                    <div className="bg-white bg-opacity-70 p-3 rounded mt-4">
                      <p className="text-purple-600 text-xs">
                        <strong>Revenue Focus:</strong> Job posting fees, escrow services, premium tools
                      </p>
                    </div>
                  </div>

                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-6">
                    <h4 className="font-semibold text-orange-800 mb-4 flex items-center">
                      <span className="mr-2">📈</span>
                      Secondary Segment (Growth)
                    </h4>
                    <ul className="text-orange-700 space-y-2 text-sm">
                      <li>• <strong>New users learning Web3:</strong> Learn2Earn participants</li>
                      <li>• <strong>Traditional companies exploring blockchain:</strong> Expansion opportunity</li>
                      <li>• <strong>Crypto investors & enthusiasts:</strong> CryptoTools users</li>
                    </ul>
                    <div className="bg-white bg-opacity-70 p-3 rounded mt-4">
                      <p className="text-orange-600 text-xs">
                        <strong>Growth Focus:</strong> Platform adoption, tool usage, ecosystem expansion
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 mt-6">
                  <h4 className="font-semibold text-gray-800 mb-3">Market Entry Strategy</h4>
                  <p className="text-gray-700 text-sm">
                    Securing 0.5% market share in a competitive, fragmented market requires innovative value proposition 
                    and strong execution. Gate33's proactive security approach differentiates from reactive competitors, 
                    targeting the significant trust gap in the current Web3 job market.
                  </p>
                </div>
              </div>
            </div>
          </div>
        );case 'supporter-nfts':
        return (
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-6">Supporter NFTs</h1>
            <div className="prose max-w-none">              <p className="text-lg text-gray-700 mb-8">
                Gate33 offers Supporter NFTs designed to recognize and reward early supporters 
                and development contributors with exclusive benefits.
              </p>              <div className="max-w-2xl mx-auto">
                {/* Supporter NFTs */}
                <div className="bg-white border border-purple-200 rounded-lg p-8">
                  <div className="flex items-center mb-6">
                    <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mr-4">
                      <span className="text-purple-600 text-2xl">🎨</span>
                    </div>
                    <div>
                      <h2 className="text-2xl font-semibold text-gray-900">Supporter NFTs</h2>
                      <p className="text-gray-600">Community recognition</p>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <h4 className="font-semibold text-purple-800">Purpose & Benefits</h4>
                    <ul className="text-gray-600 space-y-2 text-sm">
                      <li>• Recognition for supporting the cause</li>
                      <li>• Potential future platform benefits</li>
                      <li>• Community status and prestige</li>
                      <li>• Early access to new features</li>
                    </ul>
                    <div className="bg-purple-50 p-4 rounded-lg mt-4">
                      <p className="text-purple-700 text-sm">
                        <strong>Target:</strong> Community members who believe in Gate33's mission 
                        and want to show their support for the Web3 job market transformation.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Community Impact */}
              <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg p-8 mt-8">
                <h3 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
                  <span className="mr-2">🌟</span>
                  Community Impact
                </h3>
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-semibold text-purple-800 mb-3">Recognition & Status</h4>
                    <p className="text-gray-700 text-sm mb-3">
                      Supporter NFTs provide visible recognition within the Gate33 community, 
                      showcasing early belief in the platform's mission.
                    </p>
                    <ul className="text-gray-600 text-xs space-y-1">
                      <li>• Community badge and status</li>
                      <li>• Early supporter recognition</li>
                      <li>• Exclusive community access</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold text-blue-800 mb-3">Future Benefits</h4>
                    <p className="text-gray-700 text-sm mb-3">
                      As the platform grows, Supporter NFTs may unlock additional 
                      benefits and exclusive features for early community members.
                    </p>
                    <ul className="text-gray-600 text-xs space-y-1">
                      <li>• Priority feature access</li>
                      <li>• Special community events</li>
                      <li>• Platform milestone rewards</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );      case 'member-nfts':
        return (
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-6">Member NFTs - Premium Investment Tier</h1>
            <div className="prose max-w-none">
              <p className="text-lg text-gray-700 mb-8">
                Member NFTs represent the premium investment tier in Gate33's ecosystem, 
                limited to 10 exclusive holders with direct revenue participation.
              </p>

              {/* Key Investment Metrics */}
              <div className="bg-white border border-yellow-200 rounded-lg p-8 mb-8">
                <h2 className="text-2xl font-semibold text-gray-900 mb-6 flex items-center">
                  <span className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center mr-3">
                    <span className="text-yellow-600">💰</span>
                  </span>
                  Investment Structure
                </h2>
                <div className="grid md:grid-cols-3 gap-6 mb-6">
                  <div className="bg-yellow-50 p-6 rounded-lg text-center">
                    <div className="text-3xl font-bold text-yellow-600 mb-2">10</div>
                    <h4 className="font-semibold text-yellow-800 mb-2">Total Supply</h4>
                    <p className="text-yellow-700 text-sm">Extremely limited collection ensuring exclusivity</p>
                  </div>
                  <div className="bg-green-50 p-6 rounded-lg text-center">
                    <div className="text-3xl font-bold text-green-600 mb-2">20%</div>
                    <h4 className="font-semibold text-green-800 mb-2">Revenue Share</h4>
                    <p className="text-green-700 text-sm">Collective share of job posting revenue</p>
                  </div>
                  <div className="bg-blue-50 p-6 rounded-lg text-center">
                    <div className="text-3xl font-bold text-blue-600 mb-2">∞</div>
                    <h4 className="font-semibold text-blue-800 mb-2">Duration</h4>
                    <p className="text-blue-700 text-sm">Perpetual revenue rights</p>
                  </div>
                </div>
                
                <div className="bg-yellow-100 border border-yellow-300 rounded-lg p-6">
                  <h4 className="font-semibold text-yellow-800 mb-3">Revenue Distribution Model</h4>
                  <p className="text-yellow-700 text-sm mb-3">
                    Member NFT holders collectively receive 20% of all job posting fees generated by the platform. 
                    This creates a direct investment return tied to platform growth and adoption.
                  </p>                  <div className="text-yellow-600 text-xs">
                    <strong>Revenue Model:</strong> Member NFT holders collectively receive 20% 
                    of job posting fees, with distribution proportional among the 10 holders.
                  </div>
                </div>
              </div>

              {/* Benefits & Privileges */}
              <div className="bg-white border border-blue-200 rounded-lg p-8 mb-8">
                <h2 className="text-2xl font-semibold text-gray-900 mb-6">Member Privileges</h2>
                <div className="grid md:grid-cols-2 gap-8">
                  <div>
                    <h4 className="font-semibold text-blue-800 mb-4 flex items-center">
                      <span className="mr-2">💼</span>
                      Business Benefits
                    </h4>
                    <ul className="text-gray-600 space-y-2 text-sm">
                      <li>• Direct revenue sharing from job postings</li>
                      <li>• Funding contribution to initial development</li>
                      <li>• Access to platform business metrics</li>
                      <li>• Quarterly revenue distribution</li>
                      <li>• Early access to new revenue streams</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold text-blue-800 mb-4 flex items-center">
                      <span className="mr-2">🎯</span>
                      Platform Privileges
                    </h4>
                    <ul className="text-gray-600 space-y-2 text-sm">
                      <li>• Direct influence on development priorities</li>
                      <li>• Premium customer support</li>
                      <li>• Beta access to new features</li>
                      <li>• Exclusive Member-only community</li>
                      <li>• Priority in strategic partnerships</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Investment Risk & Opportunity */}
              <div className="bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-lg p-8">
                <h3 className="text-xl font-semibold text-gray-900 mb-6">Investment Analysis</h3>
                <div className="grid md:grid-cols-2 gap-8">
                  <div>
                    <h4 className="font-semibold text-green-800 mb-4">📈 Growth Opportunity</h4>                    <ul className="text-green-700 space-y-2 text-sm">
                      <li>• Direct exposure to job posting revenue growth</li>
                      <li>• Platform at 80% maturity reduces development risk</li>
                      <li>• Multi-revenue stream diversification</li>
                      <li>• Web3 market growth potential</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold text-blue-800 mb-4">⚖️ Risk Considerations</h4>
                    <ul className="text-blue-700 space-y-2 text-sm">
                      <li>• Early-stage platform adoption risk</li>
                      <li>• Web3 market volatility exposure</li>
                      <li>• Regulatory environment changes</li>
                      <li>• Competition in job board space</li>
                    </ul>
                  </div>
                </div>
                
                <div className="bg-white bg-opacity-70 rounded-lg p-6 mt-6">
                  <h4 className="font-semibold text-gray-800 mb-3">Investment Thesis Summary</h4>                  <p className="text-gray-700 text-sm">
                    Member NFTs offer a unique opportunity to participate in the revenue growth of a Web3 job platform 
                    targeting fraud reduction in the emerging Web3 market. With limited supply and direct revenue exposure, 
                    these NFTs combine collectible value with business investment returns.
                  </p>
                </div>
              </div>
            </div>
          </div>
        );      
      case 'distribution':
        return (
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-6">Token Distribution</h1>
            <div className="prose max-w-none">
              <p className="text-lg text-gray-700 mb-8">
                Gate33's token distribution strategy focuses on sustainable growth, community rewards, 
                and platform development funding.
              </p>

              <div className="bg-white border border-gray-200 rounded-lg p-8">
                <div className="text-center mb-8">
                  <h2 className="text-2xl font-semibold text-gray-900 mb-4">Distribution Strategy</h2>
                  <p className="text-gray-600">
                    Details of our token distribution will be announced closer to the official token launch. 
                    Current focus is on platform development and early adopter rewards through souvenir tokens.
                  </p>
                </div>

                <div className="grid md:grid-cols-2 gap-8">
                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-6">
                    <h3 className="text-xl font-semibold text-orange-800 mb-4">🎯 Current Phase</h3>
                    <ul className="text-orange-700 space-y-2">
                      <li>• Souvenir tokens for early supporters</li>
                      <li>• Learn2Earn reward distribution</li>
                      <li>• Community building incentives</li>
                      <li>• Platform development funding</li>
                    </ul>
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                    <h3 className="text-xl font-semibold text-blue-800 mb-4">🚀 Future Launch</h3>
                    <ul className="text-blue-700 space-y-2">
                      <li>• Native G33 token launch</li>
                      <li>• Souvenir token conversion</li>
                      <li>• DEX/CEX listings</li>
                      <li>• Expanded utility implementation</li>
                    </ul>
                  </div>
                </div>

                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mt-8">
                  <h4 className="font-semibold text-yellow-800 mb-3">⚠️ Important Notice</h4>
                  <p className="text-yellow-700 text-sm">
                    Detailed tokenomics, including distribution percentages, vesting schedules, and conversion rates 
                    from souvenir tokens to G33 tokens, will be published in our upcoming token documentation. 
                    Stay tuned for official announcements.
                  </p>
                </div>
              </div>
            </div>
          </div>
        );        case 'risk-analysis':
        return (
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-6">Risk Analysis & Evaluation</h1>
            <div className="prose max-w-none">
              <p className="text-lg text-gray-700 mb-8">
                Comprehensive risk assessment covering platform, technical, and market risks 
                with implemented mitigation strategies for investor transparency.
              </p>

              {/* Protocol/Platform Risks */}
              <div className="bg-white border border-blue-200 rounded-lg p-8 mb-8">
                <h2 className="text-2xl font-semibold text-gray-900 mb-6 flex items-center">
                  <span className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                    <span className="text-blue-600">🛡️</span>
                  </span>
                  Protocol & Platform Risks
                </h2>
                <div className="grid md:grid-cols-2 gap-8">
                  <div>
                    <h4 className="font-semibold text-blue-800 mb-4">Risk Factors</h4>
                    <ul className="text-gray-600 space-y-2 text-sm">
                      <li>• Smart contract vulnerabilities</li>
                      <li>• Multi-chain complexity risks</li>
                      <li>• Platform adoption challenges</li>
                      <li>• Regulatory environment changes</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold text-blue-800 mb-4">Mitigation Strategies</h4>
                    <ul className="text-gray-600 space-y-2 text-sm">
                      <li>• Upgradeable contracts for security fixes</li>
                      <li>• Multi-network architecture with redundancy</li>
                      <li>• Configurations validated and securely stored</li>
                      <li>• Proactive compliance monitoring</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Asset/Data Risks */}
              <div className="bg-white border border-green-200 rounded-lg p-8 mb-8">
                <h2 className="text-2xl font-semibold text-gray-900 mb-6 flex items-center">
                  <span className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center mr-3">
                    <span className="text-green-600">🔒</span>
                  </span>
                  Asset & Data Security
                </h2>
                <div className="grid md:grid-cols-2 gap-8">
                  <div className="bg-green-50 p-6 rounded-lg">
                    <h4 className="font-semibold text-green-800 mb-3">Security Design</h4>
                    <ul className="text-green-700 space-y-2 text-sm">
                      <li>• Privacy-focused tool design</li>
                      <li>• Audited and tested smart contracts</li>
                      <li>• Multi-network architecture redundancy</li>
                    </ul>
                  </div>
                  <div className="bg-green-50 p-6 rounded-lg">
                    <h4 className="font-semibold text-green-800 mb-3">Active Monitoring</h4>
                    <ul className="text-green-700 space-y-2 text-sm">
                      <li>• 24/7 automated monitoring system</li>
                      <li>• Real-time alerts for anomalies</li>
                      <li>• Data backups in multiple locations</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Privacy Compliance */}
              <div className="bg-white border border-purple-200 rounded-lg p-8 mb-8">
                <h2 className="text-2xl font-semibold text-gray-900 mb-6 flex items-center">
                  <span className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center mr-3">
                    <span className="text-purple-600">⚖️</span>
                  </span>
                  Privacy & Compliance
                </h2>
                <div className="grid md:grid-cols-3 gap-6">
                  <div className="bg-purple-50 p-4 rounded-lg">
                    <h4 className="font-semibold text-purple-800 mb-2">GDPR Compliance</h4>
                    <p className="text-purple-700 text-sm">Full compliance with GDPR guidelines and requirements</p>
                  </div>
                  <div className="bg-purple-50 p-4 rounded-lg">
                    <h4 className="font-semibold text-purple-800 mb-2">Data Retention</h4>
                    <p className="text-purple-700 text-sm">Transparent data retention policies implemented</p>
                  </div>
                  <div className="bg-purple-50 p-4 rounded-lg">
                    <h4 className="font-semibold text-purple-800 mb-2">User Rights</h4>
                    <p className="text-purple-700 text-sm">Right to be forgotten implemented and operational</p>
                  </div>
                </div>
              </div>

              {/* Market & Competition Risks */}
              <div className="bg-white border border-orange-200 rounded-lg p-8">
                <h2 className="text-2xl font-semibold text-gray-900 mb-6 flex items-center">
                  <span className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center mr-3">
                    <span className="text-orange-600">📊</span>
                  </span>
                  Market & Competition Analysis
                </h2>
                <div className="grid md:grid-cols-2 gap-8">
                  <div>
                    <h4 className="font-semibold text-orange-800 mb-4">Market Risks</h4>
                    <ul className="text-gray-600 space-y-2 text-sm">
                      <li>• Web3 market volatility and cycles</li>
                      <li>• Adoption rate uncertainty</li>
                      <li>• Competitive landscape evolution</li>
                      <li>• Regulatory changes impact</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold text-orange-800 mb-4">Competitive Advantages</h4>
                    <ul className="text-gray-600 space-y-2 text-sm">
                      <li>• First-mover in proactive verification</li>
                      <li>• 85% fraud reduction capability</li>
                      <li>• Comprehensive platform approach</li>
                      <li>• Multiple revenue streams</li>
                    </ul>
                  </div>
                </div>
                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-6 mt-6">
                  <h4 className="font-semibold text-orange-800 mb-3">Risk Mitigation Summary</h4>
                  <p className="text-orange-700 text-sm">
                    Gate33's comprehensive approach to risk management combines technical security, 
                    regulatory compliance, and market positioning to minimize exposure while maximizing 
                    growth potential in the emerging Web3 job market.
                  </p>
                </div>
              </div>
            </div>
          </div>
        );
          case 'roadmap':
        return (
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-6">Gate33 Roadmap & Timeline</h1>
            <div className="prose max-w-none">
              <p className="text-lg text-gray-700 mb-8">
                Our strategic roadmap outlines the technological evolution and market expansion of Gate33's 
                Web3 job platform ecosystem through key development phases.
              </p>

              {/* Current Status - Circuit Origin */}
              <div className="relative bg-gradient-to-r from-black to-gray-900 rounded-lg p-8 mb-8 overflow-hidden">
                <div className="absolute inset-0 opacity-10">
                  <div className="absolute top-4 left-4 w-2 h-2 bg-orange-400 rounded-full animate-pulse"></div>
                  <div className="absolute top-8 right-8 w-1 h-1 bg-orange-400 rounded-full animate-pulse delay-100"></div>
                  <div className="absolute bottom-6 left-12 w-1.5 h-1.5 bg-orange-400 rounded-full animate-pulse delay-200"></div>
                  <div className="absolute bottom-4 right-6 w-1 h-1 bg-orange-400 rounded-full animate-pulse delay-300"></div>
                </div>
                
                <div className="relative z-10">
                  <div className="flex items-center mb-6">
                    <div className="w-12 h-12 bg-orange-500 rounded-lg flex items-center justify-center mr-4">
                      <span className="text-white text-2xl">⚡</span>
                    </div>
                    <div>
                      <h2 className="text-2xl font-semibold text-white">Current Status (June 2025)</h2>
                      <p className="text-orange-200">Platform Foundation & Core Development</p>
                    </div>
                  </div>
                  
                  <div className="grid md:grid-cols-3 gap-6">
                    <div className="bg-gray-800 bg-opacity-60 border border-orange-500 border-opacity-30 rounded-lg p-4">
                      <div className="flex items-center mb-3">
                        <div className="w-3 h-3 bg-orange-400 rounded-full mr-2"></div>
                        <h4 className="text-orange-300 font-semibold text-sm">Platform Maturity</h4>
                      </div>
                      <p className="text-gray-300 text-sm">Functional platform at 80% maturity with core systems operational</p>
                    </div>
                    
                    <div className="bg-gray-800 bg-opacity-60 border border-orange-500 border-opacity-30 rounded-lg p-4">
                      <div className="flex items-center mb-3">
                        <div className="w-3 h-3 bg-orange-400 rounded-full mr-2"></div>
                        <h4 className="text-orange-300 font-semibold text-sm">Feature Pipeline</h4>
                      </div>
                      <p className="text-gray-300 text-sm">New tools and features in development for official launch</p>
                    </div>
                    
                    <div className="bg-gray-800 bg-opacity-60 border border-orange-500 border-opacity-30 rounded-lg p-4">
                      <div className="flex items-center mb-3">
                        <div className="w-3 h-3 bg-orange-400 rounded-full mr-2"></div>
                        <h4 className="text-orange-300 font-semibold text-sm">Network Integration</h4>
                      </div>
                      <p className="text-gray-300 text-sm">Partnerships and blockchain network integrations in progress</p>
                    </div>
                  </div>
                </div>
                
                {/* Circuit lines extending down */}
                <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2">
                  <div className="w-0.5 h-8 bg-gradient-to-b from-orange-400 to-transparent"></div>
                </div>
              </div>

              {/* Phase 1 - 2025 */}
              <div className="relative">
                {/* Connecting line */}
                <div className="absolute left-1/2 top-0 transform -translate-x-1/2 w-0.5 h-8 bg-gradient-to-b from-orange-400 via-orange-300 to-transparent"></div>
                
                <div className="bg-gradient-to-r from-orange-50 to-orange-100 border-2 border-orange-300 rounded-lg p-8 mb-8">
                  <div className="flex items-center mb-6">
                    <div className="w-12 h-12 bg-orange-500 rounded-lg flex items-center justify-center mr-4 relative">
                      <span className="text-white text-xl font-bold">1</span>
                      <div className="absolute -top-1 -right-1 w-4 h-4 bg-orange-600 rounded-full flex items-center justify-center">
                        <div className="w-2 h-2 bg-white rounded-full"></div>
                      </div>
                    </div>
                    <div>
                      <h2 className="text-2xl font-semibold text-gray-900">Phase 1 - Strategic Consolidation</h2>
                      <p className="text-orange-700 font-medium">2025 • Foundation Strengthening</p>
                    </div>
                  </div>
                  
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div className="bg-white border border-orange-200 rounded-lg p-4">
                        <div className="flex items-center mb-2">
                          <div className="w-2 h-2 bg-orange-500 rounded-full mr-2"></div>
                          <h4 className="font-semibold text-orange-800">Platform Optimization</h4>
                        </div>
                        <p className="text-gray-700 text-sm">Continuous optimization to improve user experience and scalability</p>
                      </div>
                      
                      <div className="bg-white border border-orange-200 rounded-lg p-4">
                        <div className="flex items-center mb-2">
                          <div className="w-2 h-2 bg-orange-500 rounded-full mr-2"></div>
                          <h4 className="font-semibold text-orange-800">Blockchain Expansion</h4>
                        </div>
                        <p className="text-gray-700 text-sm">Integration with new blockchains, increasing interoperability</p>
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      <div className="bg-white border border-orange-200 rounded-lg p-4">
                        <div className="flex items-center mb-2">
                          <div className="w-2 h-2 bg-orange-500 rounded-full mr-2"></div>
                          <h4 className="font-semibold text-orange-800">Strategic Partnerships</h4>
                        </div>
                        <p className="text-gray-700 text-sm">Establishment of strategic partnerships with relevant market players</p>
                      </div>
                      
                      <div className="bg-orange-100 border border-orange-300 rounded-lg p-4">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-orange-600">Q4 2025</div>
                          <p className="text-orange-700 text-sm font-medium">Phase Completion Target</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Circuit line to next phase */}
                <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-0.5 h-8 bg-gradient-to-b from-orange-300 to-blue-300"></div>
              </div>

              {/* Phase 2 - 2026 */}
              <div className="relative">
                <div className="bg-gradient-to-r from-blue-50 to-blue-100 border-2 border-blue-300 rounded-lg p-8 mb-8">
                  <div className="flex items-center mb-6">
                    <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center mr-4 relative">
                      <span className="text-white text-xl font-bold">2</span>
                      <div className="absolute -top-1 -right-1 w-4 h-4 bg-blue-600 rounded-full flex items-center justify-center">
                        <div className="w-2 h-2 bg-white rounded-full"></div>
                      </div>
                    </div>
                    <div>
                      <h2 className="text-2xl font-semibold text-gray-900">Phase 2 - Ecosystem Expansion</h2>
                      <p className="text-blue-700 font-medium">2026 • Market Growth & Token Launch</p>
                    </div>
                  </div>
                  
                  <div className="grid md:grid-cols-3 gap-4">
                    <div className="bg-white border border-blue-200 rounded-lg p-4">
                      <div className="flex items-center mb-2">
                        <div className="w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
                        <h4 className="font-semibold text-blue-800 text-sm">G33 Token Launch</h4>
                      </div>
                      <p className="text-gray-700 text-xs">Foster participation and incentives within the ecosystem</p>
                    </div>
                    
                    <div className="bg-white border border-blue-200 rounded-lg p-4">
                      <div className="flex items-center mb-2">
                        <div className="w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
                        <h4 className="font-semibold text-blue-800 text-sm">International Expansion</h4>
                      </div>
                      <p className="text-gray-700 text-xs">Focus on strategic global markets</p>
                    </div>
                    
                    <div className="bg-white border border-blue-200 rounded-lg p-4">
                      <div className="flex items-center mb-2">
                        <div className="w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
                        <h4 className="font-semibold text-blue-800 text-sm">CryptoTools Expansion</h4>
                      </div>
                      <p className="text-gray-700 text-xs">Enhanced blockchain tools portfolio</p>
                    </div>
                    
                    <div className="bg-white border border-blue-200 rounded-lg p-4">
                      <div className="flex items-center mb-2">
                        <div className="w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
                        <h4 className="font-semibold text-blue-800 text-sm">Company Validation</h4>
                      </div>
                      <p className="text-gray-700 text-xs">Growth of validated company network</p>
                    </div>
                    
                    <div className="bg-white border border-blue-200 rounded-lg p-4">
                      <div className="flex items-center mb-2">
                        <div className="w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
                        <h4 className="font-semibold text-blue-800 text-sm">DEX/CEX Listings</h4>
                      </div>
                      <p className="text-gray-700 text-xs">G33 token exchange listings</p>
                    </div>
                    
                    <div className="bg-blue-100 border border-blue-300 rounded-lg p-4">
                      <div className="text-center">
                        <div className="text-xl font-bold text-blue-600">2026</div>
                        <p className="text-blue-700 text-xs font-medium">Expansion Year</p>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Circuit line to next phase */}
                <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-0.5 h-8 bg-gradient-to-b from-blue-300 to-purple-300"></div>
              </div>

              {/* Phase 3 - 2027 */}
              <div className="relative">
                <div className="bg-gradient-to-r from-purple-50 to-purple-100 border-2 border-purple-300 rounded-lg p-8 mb-8">
                  <div className="flex items-center mb-6">
                    <div className="w-12 h-12 bg-purple-500 rounded-lg flex items-center justify-center mr-4 relative">
                      <span className="text-white text-xl font-bold">3</span>
                      <div className="absolute -top-1 -right-1 w-4 h-4 bg-purple-600 rounded-full flex items-center justify-center">
                        <div className="w-2 h-2 bg-white rounded-full"></div>
                      </div>
                    </div>
                    <div>
                      <h2 className="text-2xl font-semibold text-gray-900">Phase 3 - Innovation & Market Acceleration</h2>
                      <p className="text-purple-700 font-medium">2027 • Advanced Innovation & Diversification</p>
                    </div>
                  </div>
                  
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div className="bg-white border border-purple-200 rounded-lg p-4">
                        <div className="flex items-center mb-2">
                          <div className="w-2 h-2 bg-purple-500 rounded-full mr-2"></div>
                          <h4 className="font-semibold text-purple-800">Product Innovation</h4>
                        </div>
                        <p className="text-gray-700 text-sm">Development and launch of new products aligned with market demands</p>
                      </div>
                      
                      <div className="bg-white border border-purple-200 rounded-lg p-4">
                        <div className="flex items-center mb-2">
                          <div className="w-2 h-2 bg-purple-500 rounded-full mr-2"></div>
                          <h4 className="font-semibold text-purple-800">Strategic Acquisitions</h4>
                        </div>
                        <p className="text-gray-700 text-sm">Execution of strategic acquisitions to accelerate growth and expand capabilities</p>
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      <div className="bg-white border border-purple-200 rounded-lg p-4">
                        <div className="flex items-center mb-2">
                          <div className="w-2 h-2 bg-purple-500 rounded-full mr-2"></div>
                          <h4 className="font-semibold text-purple-800">Market Verticals</h4>
                        </div>
                        <p className="text-gray-700 text-sm">Exploration of new market verticals, broadening platform scope</p>
                      </div>
                      
                      <div className="bg-purple-100 border border-purple-300 rounded-lg p-4">
                        <div className="text-center">
                          <div className="text-xl font-bold text-purple-600">2027+</div>
                          <p className="text-purple-700 text-sm font-medium">Innovation Leadership</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Future Vision */}
              <div className="bg-gradient-to-r from-gray-900 to-black rounded-lg p-8 text-center relative overflow-hidden">
                <div className="absolute inset-0 opacity-20">
                  <div className="absolute top-6 left-8 w-1 h-1 bg-orange-400 rounded-full animate-ping"></div>
                  <div className="absolute top-12 right-12 w-1.5 h-1.5 bg-blue-400 rounded-full animate-ping delay-100"></div>
                  <div className="absolute bottom-8 left-16 w-1 h-1 bg-purple-400 rounded-full animate-ping delay-200"></div>
                  <div className="absolute bottom-6 right-8 w-2 h-2 bg-orange-400 rounded-full animate-ping delay-300"></div>
                </div>
                
                <div className="relative z-10">
                  <h3 className="text-2xl font-bold text-white mb-4">🚀 Long-term Vision</h3>
                  <p className="text-gray-300 max-w-3xl mx-auto">
                    Gate33 envisions becoming the leading decentralized platform for Web3 work opportunities, 
                    setting the industry standard for security, transparency, and innovation in blockchain-based employment solutions.
                  </p>
                  
                  <div className="grid md:grid-cols-3 gap-6 mt-8">
                    <div className="text-center">
                      <div className="text-orange-400 text-3xl mb-2">🌐</div>
                      <h4 className="text-orange-300 font-semibold mb-1">Global Leadership</h4>
                      <p className="text-gray-400 text-sm">Industry-leading Web3 job platform</p>
                    </div>
                    <div className="text-center">
                      <div className="text-blue-400 text-3xl mb-2">🔒</div>
                      <h4 className="text-blue-300 font-semibold mb-1">Security Standard</h4>
                      <p className="text-gray-400 text-sm">Benchmark for platform security</p>
                    </div>
                    <div className="text-center">
                      <div className="text-purple-400 text-3xl mb-2">⚡</div>
                      <h4 className="text-purple-300 font-semibold mb-1">Innovation Hub</h4>
                      <p className="text-gray-400 text-sm">Driving Web3 work innovation</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case 'team':
        return (
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-6">Team & Governance</h1>
            <div className="prose max-w-none">
              <p className="text-lg text-gray-700 mb-8">
                Gate33 is powered by a young, dynamic, and continuously growing team of professionals 
                with complementary skills across blockchain technology, product development, marketing, and operations.
              </p>

              {/* Team Overview */}
              <div className="bg-white border border-blue-200 rounded-lg p-8 mb-8">
                <div className="flex items-center mb-6">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mr-4">
                    <span className="text-blue-600 text-2xl">👥</span>
                  </div>
                  <div>
                    <h2 className="text-2xl font-semibold text-gray-900">Dynamic Team Structure</h2>
                    <p className="text-gray-600">Agile and innovative professionals</p>
                  </div>
                </div>
                
                <div className="grid md:grid-cols-2 gap-8 mb-6">
                  <div>
                    <h4 className="font-semibold text-blue-800 mb-4">🚀 Team Characteristics</h4>
                    <ul className="text-gray-600 space-y-2 text-sm">
                      <li>• Young and dynamic professionals</li>
                      <li>• Continuously growing team structure</li>
                      <li>• Complementary skills across disciplines</li>
                      <li>• Agile development methodology</li>
                      <li>• Innovation-focused mindset</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold text-blue-800 mb-4">🎯 Core Competencies</h4>
                    <ul className="text-gray-600 space-y-2 text-sm">
                      <li>• Blockchain technology expertise</li>
                      <li>• Product development and UX design</li>
                      <li>• Marketing and community building</li>
                      <li>• Operations and business strategy</li>
                      <li>• Smart contract development and security</li>
                    </ul>
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                  <h4 className="font-semibold text-blue-800 mb-3">🔄 Agile Execution Model</h4>
                  <p className="text-blue-700 text-sm">
                    Our team structure enables Gate33 to remain agile and innovative while strengthening 
                    execution capabilities. This combination allows rapid adaptation to market changes 
                    and efficient implementation of new features and technologies.
                  </p>
                </div>
              </div>

              {/* Governance Structure */}
              <div className="bg-white border border-orange-200 rounded-lg p-8 mb-8">
                <div className="flex items-center mb-6">
                  <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mr-4">
                    <span className="text-orange-600 text-2xl">🏛️</span>
                  </div>
                  <div>
                    <h2 className="text-2xl font-semibold text-gray-900">Governance Framework</h2>
                    <p className="text-gray-600">Transparent and efficient decision-making</p>
                  </div>
                </div>
                
                <div className="grid md:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <div className="bg-orange-50 p-4 rounded-lg">
                      <h4 className="font-semibold text-orange-800 mb-3">🎯 Strategic Leadership</h4>
                      <ul className="text-orange-700 text-sm space-y-1">
                        <li>• Clear vision and mission alignment</li>
                        <li>• Executive decision-making authority</li>
                        <li>• Strategic direction establishment</li>
                        <li>• Resource allocation optimization</li>
                      </ul>
                    </div>
                    <div className="bg-green-50 p-4 rounded-lg">
                      <h4 className="font-semibold text-green-800 mb-3">🗳️ Participatory Mechanisms</h4>
                      <ul className="text-green-700 text-sm space-y-1">
                        <li>• Community input on platform improvements</li>
                        <li>• Stakeholder feedback integration</li>
                        <li>• Transparent communication channels</li>
                        <li>• User-driven feature development</li>
                      </ul>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="bg-purple-50 p-4 rounded-lg">
                      <h4 className="font-semibold text-purple-800 mb-3">⚖️ Balanced Approach</h4>
                      <ul className="text-purple-700 text-sm space-y-1">
                        <li>• Efficiency with transparency</li>
                        <li>• Active community participation</li>
                        <li>• Mission-focused governance</li>
                        <li>• Stakeholder value alignment</li>
                      </ul>
                    </div>
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <h4 className="font-semibold text-blue-800 mb-3">🔄 Continuous Evolution</h4>
                      <ul className="text-blue-700 text-sm space-y-1">
                        <li>• Adaptive governance model</li>
                        <li>• Regular process optimization</li>
                        <li>• Feedback-driven improvements</li>
                        <li>• Scalable decision-making framework</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>

              {/* Vision & Mission Alignment */}
              <div className="bg-gradient-to-r from-orange-50 to-blue-50 border border-orange-200 rounded-lg p-8">
                <h3 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
                  <span className="mr-2">🎯</span>
                  Vision & Mission Alignment
                </h3>
                <div className="grid md:grid-cols-2 gap-8">
                  <div>
                    <h4 className="font-semibold text-orange-800 mb-3">🚀 Our Mission</h4>
                    <p className="text-gray-700 text-sm mb-4">
                      To transform the Web3 work ecosystem by creating a secure, transparent, 
                      and fraud-resistant platform that connects companies and professionals 
                      with confidence and protection.
                    </p>
                    <div className="bg-white bg-opacity-70 p-3 rounded">
                      <p className="text-orange-600 text-xs font-medium">
                        "Innovate with Security" - Building trust in Web3 employment
                      </p>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-semibold text-blue-800 mb-3">🌟 Strategic Governance</h4>
                    <p className="text-gray-700 text-sm mb-4">
                      Gate33's governance structure ensures transparency, efficiency, and active 
                      participation while maintaining clear strategic direction and mission focus.
                    </p>
                    <div className="bg-white bg-opacity-70 p-3 rounded">
                      <p className="text-blue-600 text-xs font-medium">
                        Strategic decisions balanced with community input and stakeholder value
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
    }
  };
  return (
    <FullScreenLayout>
      <div className="min-h-screen bg-gray-50">
        <div className="flex">
          
          {/* Sidebar */}
          <div className="w-80 bg-white border-r border-gray-200 min-h-screen">
            <div className="p-6 pt-24">
              <h2 className="text-lg font-semibold text-gray-900 mb-6">Documentation</h2>
              <nav className="space-y-1">
                {menuItems.map((item) => (
                  <div key={item.id}>
                    {item.isCategory ? (
                      <>
                        <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mt-6 mb-2">
                          {item.label}
                        </div>
                        {item.children?.map((child) => (
                          <button
                            key={child.id}
                            onClick={() => setActiveSection(child.id)}
                            className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors flex items-center ${
                              activeSection === child.id
                                ? 'bg-orange-50 text-orange-700 border-r-2 border-orange-500'
                                : 'text-gray-700 hover:bg-gray-50'
                            }`}
                          >
                            <span className="mr-3">{child.icon}</span>
                            {child.label}
                          </button>
                        ))}
                      </>
                    ) : (
                      <button
                        onClick={() => setActiveSection(item.id)}
                        className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors flex items-center ${
                          activeSection === item.id
                            ? 'bg-orange-50 text-orange-700 border-r-2 border-orange-500'
                            : 'text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        <span className="mr-3">{item.icon}</span>
                        {item.label}
                      </button>
                    )}
                  </div>
                ))}
              </nav>
            </div>
          </div>          {/* Main Content */}
          <div className="flex-1">
            <div className="max-w-4xl mx-auto px-8 py-12 pt-24">
              {renderContent()}
            </div>
          </div>

        </div>
      </div>
    </FullScreenLayout>
  );
}
