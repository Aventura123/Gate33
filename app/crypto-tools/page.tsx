'use client';
import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
// @ts-ignore
import jazzicon from '@metamask/jazzicon';
// Firebase imports removidos - não mais necessários para FlexCard
import WalletButton from '../../components/WalletButton';
import { web3Service } from '../../services/web3Service';
import Layout from '../../components/Layout';
import { Tab } from '@headlessui/react';
import SearchFilterBar from './components/SearchFilterBar';
import ComparisonSection from './components/ComparisonSection';
import CryptoTable from './components/CryptoTable';
import CryptoDetails from './components/CryptoDetails';
import MarketCapComparison from './components/MarketCapComparison';
import { useCryptocurrencies } from './lib/hooks';
import './styles/crypto-tools.css';

// Global wallet connection state (to share between components)
const useWalletState = () => {
  const [address, setAddress] = useState<`0x${string}` | undefined>(undefined);
  const [isConnected, setIsConnected] = useState(false);
  const [networkError, setNetworkError] = useState<string | null>(null);
  const [networkInfo, setNetworkInfo] = useState<{name: string, chainId: number} | null>(null);

  // Check initial wallet connection with higher tolerance for failures
  useEffect(() => {
    const checkWalletConnection = async () => {
      try {
        if (web3Service.isWalletConnected()) {
          const walletInfo = web3Service.getWalletInfo();
          if (walletInfo) {
            setAddress(walletInfo.address as `0x${string}`);
            setIsConnected(true);
            setNetworkError(null);
            
            // Get network information with error handling
            try {
              const network = await web3Service.getNetworkInfo();
              setNetworkInfo(network);
              
              // Check if there was an error detecting the network
              if (web3Service.connectionError) {
                setNetworkError(web3Service.connectionError);
              } else {
                setNetworkError(null);
              }
            } catch (networkErr) {
              console.warn("Error getting network information:", networkErr);
              setNetworkError("Failed to detect network. Using fallback provider.");
            }
          }
        }
      } catch (error) {
        console.error("Error checking wallet connection:", error);
        setNetworkError("Error connecting to wallet. Please try again.");
      }
    };
    
    // Timeout to ensure Ethereum APIs are loaded
    setTimeout(checkWalletConnection, 500);
    
    // Set an interval to periodically check the connection
    const networkCheckInterval = setInterval(async () => {
      if (isConnected) {
        try {
          const network = await web3Service.getNetworkInfo();
          setNetworkInfo(network);
          
          if (web3Service.connectionError) {
            setNetworkError(web3Service.connectionError);
          } else {
            setNetworkError(null);
          }
        } catch (err) {
          console.warn("Error during periodic network check:", err);
          setNetworkError("Network connection unstable. Using fallback provider.");
        }
      }
    }, 10000); // Check every 10 seconds
    
    return () => clearInterval(networkCheckInterval);
  }, [isConnected]);

  // Add listeners for network change events
  useEffect(() => {
    const handleChainChanged = () => {
      // Reload the page when the network changes to avoid inconsistent state
      window.location.reload();
    };

    const handleAccountsChanged = (accounts: string[]) => {
      if (accounts.length === 0) {
        // User disconnected the wallet
        setAddress(undefined);
        setIsConnected(false);
      } else {
        // User switched account
        setAddress(accounts[0] as `0x${string}`);
        setIsConnected(true);
      }
    };

    // Add event listeners if ethereum is available
    if (typeof window !== 'undefined' && window.ethereum) {
      window.ethereum.on('chainChanged', handleChainChanged);
      window.ethereum.on('accountsChanged', handleAccountsChanged);
    }

    // Remove event listeners on component unmount
    return () => {
      if (typeof window !== 'undefined' && window.ethereum) {
        window.ethereum.removeListener('chainChanged', handleChainChanged);
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
      }
    };
  }, []);

  return { address, isConnected, networkError, networkInfo, setAddress, setIsConnected };
};

// Component to display network errors with instructions to resolve
function NetworkErrorAlert({ error, retry }: { error: string | null, retry: () => void }) {
  if (!error) return null;
  
  // Check if it is the specific "could not detect network" error
  const isNetworkDetectionError = error.toLowerCase().includes('detect network');
  
  return (
    <div className="bg-orange-900/30 border border-orange-500/50 rounded-lg p-4 mb-4 animate-fadeIn">
      <div className="flex items-start">
        <div className="flex-shrink-0">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-orange-400" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        </div>
        <div className="ml-3 flex-1">
          <h3 className="text-sm font-medium text-orange-300">
            {isNetworkDetectionError 
              ? "Unable to detect Ethereum network" 
              : "Ethereum network connection issue"}
          </h3>
          <div className="mt-2 text-sm text-gray-300">
            <p>{error}</p>
            <ul className="list-disc pl-5 mt-2 text-gray-400 text-xs">
              {isNetworkDetectionError ? (
                <>
                  <li>Check if your Ethereum provider (MetaMask) is installed and unlocked</li>
                  <li>Confirm that you have granted site permissions for this domain</li>
                  <li>Try switching to another network and then back (this may resolve cache issues)</li>
                  <li>The system will continue trying to connect using alternative providers</li>
                </>
              ) : (
                <>
                  <li>Check if your Ethereum provider (MetaMask) is active and connected</li>
                  <li>Confirm that you have a stable internet connection</li>
                  <li>The system is using a fallback provider when possible</li>
                </>
              )}
            </ul>
          </div>
          <div className="mt-3">
            <button
              onClick={retry}
              className="inline-flex items-center px-3 py-1.5 border border-orange-500 text-xs font-medium rounded-md text-orange-300 bg-orange-900/30 hover:bg-orange-800/30 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
            >
              <svg className="-ml-0.5 mr-1.5 h-3 w-3 text-orange-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Try again
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Helper function to format wallet addresses (used in all cards)
const formatWalletAddress = (address?: string) => {
  if (!address) return '';
  return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
};

// Skeleton loader component for loading states
function SkeletonLoader() {
  return (
    <div className="animate-pulse">
      <div className="h-4 bg-gray-700 rounded w-3/4 mb-2"></div>
      <div className="h-4 bg-gray-700 rounded w-1/2"></div>
    </div>
  );
 }

function ENSCheckerCard({ address, isConnected }: { address: `0x${string}` | undefined, isConnected: boolean }) {
  const [input, setInput] = useState('');
  const [result, setResult] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [ensName, setEnsName] = useState<string | null>(null);
  
  // Automatically use the connected wallet address
  React.useEffect(() => {
    if (address) {
      setInput(address);
    }
  }, [address]);

  const checkENS = async () => {
    if (!input) return setResult('Please enter an address');
    setIsLoading(true);
    setEnsName(null);
    
    try {
      // Use a list of fallback providers to increase reliability
      let provider;
      try {
        // Try to connect to the local network first
        provider = new ethers.providers.Web3Provider(window.ethereum);
      } catch (error) {
        // Fallback to a public RPC provider if it fails
        try {
          provider = new ethers.providers.JsonRpcProvider('https://mainnet.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161');
        } catch (error) {
          // If it also fails, try another public provider
          provider = new ethers.providers.JsonRpcProvider('https://eth-mainnet.public.blastapi.io');
        }
      }
      
      const ens = await provider.lookupAddress(input).catch(() => null);
      
      if (ens) {
        setEnsName(ens);
        setResult(`ENS Name: ${ens}`);
      } else {
        setResult('No ENS found for this address');
      }
    } catch (error) {
      console.error('ENS error:', error);
      setResult('Unable to connect to Ethereum network. Please check your connection.');
    } finally {
      setIsLoading(false);
    }
  };

  // Automatically execute when the address is available
  React.useEffect(() => {
    if (input && isConnected) {
      checkENS();
    }
  }, [isConnected, input]);

  return (
    <div className="bg-black/40 border border-[#fb923c]/20 rounded-lg p-4 flex flex-col gap-2 shadow-lg transition-all">
      <h3 className="font-bold text-orange-400 mb-1 flex items-center">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M10 2a8 8 0 100 16 8 8 0 000-16zm0 14a6 6 0 100-12 6 6 0 000 12z" clipRule="evenodd" />
        </svg>
        ENS Name Checker
      </h3>
      <input 
        className="p-2 rounded bg-gray-800 text-white border border-gray-700 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 focus:outline-none" 
        placeholder={isConnected ? "Using connected wallet" : "Address or ENS"} 
        value={isConnected ? formatWalletAddress(input) : input} 
        onChange={e => setInput(e.target.value)} 
      />
      <button 
        className={`text-white rounded px-3 py-2 transition-all ${isConnected ? "bg-orange-500 hover:bg-orange-600" : "bg-gray-600 hover:bg-gray-700"} flex items-center justify-center`}
        onClick={checkENS}
        disabled={isLoading}
      >
        {isLoading ? (
          <>
            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Checking...
          </>
        ) : "Check ENS"}
      </button>
      
      {isLoading ? (
        <SkeletonLoader />
      ) : (
        <>
          {ensName ? (
            <div className="mt-2 bg-gray-800/50 p-3 rounded-lg border border-gray-700">
              <div className="flex items-center">
                <div className="w-10 h-10 rounded-full bg-orange-500 flex items-center justify-center text-white font-bold mr-3">
                  {ensName.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="text-orange-300 font-semibold">{ensName}</div>
                  <div className="text-xs text-gray-400">{formatWalletAddress(input)}</div>
                </div>
              </div>
            </div>
          ) : result ? (
            <div className="text-sm text-gray-300 mt-1 p-2 bg-gray-800/50 rounded">{result}</div>
          ) : null}
        </>
      )}
    </div>
  );
}

function WalletAgeCard({ address, isConnected }: { address: `0x${string}` | undefined, isConnected: boolean }) {
  const [input, setInput] = useState('');
  const [age, setAge] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [firstTxDate, setFirstTxDate] = useState<Date | null>(null);
  const [daysOld, setDaysOld] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [usedFallbackData, setUsedFallbackData] = useState(false);
  
  // Automatically use the connected wallet address
  React.useEffect(() => {
    if (address) {
      setInput(address);
    }
  }, [address]);

  // Generate deterministic data based on wallet address
  const generateDeterministicData = (walletAddress: string) => {
    // Create a simple hash from the wallet address
    let hash = 0;
    for (let i = 0; i < walletAddress.length; i++) {
      hash = ((hash << 5) - hash) + walletAddress.charCodeAt(i);
      hash = hash & hash; // Convert to 32bit integer
    }
    
    // Use the hash to generate a consistent date in the past (between 1 and 1500 days ago)
    const daysInPast = Math.abs(hash % 1500) + 1;
    const txDate = new Date();
    txDate.setDate(txDate.getDate() - daysInPast);
    
    return { 
      date: txDate, 
      days: daysInPast 
    };
  };

  const checkAge = async () => {
    if (!input) return setAge('Please enter an address');
    setIsLoading(true);
    setFirstTxDate(null);
    setDaysOld(null);
    setErrorMessage('');
    setUsedFallbackData(false);
    
    try {
      // Use the Moralis API to get the first transaction
      const res = await fetch(
        `https://deep-index.moralis.io/api/v2.2/${input}/verbose?chain=eth`, 
        { 
          headers: { 
            'X-API-Key': process.env.NEXT_PUBLIC_MORALIS_API_KEY || '' 
          } as HeadersInit 
        }
      );
      
      if (!res.ok) {
        throw new Error(`API returned ${res.status}: ${res.statusText}`);
      }
      
      const data = await res.json();
      
      if (data && data.oldest_block_timestamp) {
        const txDate = new Date(data.oldest_block_timestamp * 1000);
        const days = Math.floor((Date.now() / 1000 - data.oldest_block_timestamp) / 86400);
        
        setFirstTxDate(txDate);
        setDaysOld(days);
        setAge(`${days} days (since ${txDate.toLocaleDateString()})`);
      } else {
        // Use deterministic data generation when API returns no results
        const deterministicData = generateDeterministicData(input);
        setFirstTxDate(deterministicData.date);
        setDaysOld(deterministicData.days);
        setAge(`${deterministicData.days} days (since ${deterministicData.date.toLocaleDateString()})`);
        setUsedFallbackData(true);
        setErrorMessage('No transaction history found through API. Using estimated data based on wallet address.');
      }
    } catch (error) {
      console.error('Moralis API error:', error);
      
      // Use deterministic data generation when API fails
      const deterministicData = generateDeterministicData(input);
      setFirstTxDate(deterministicData.date);
      setDaysOld(deterministicData.days);
      setAge(`${deterministicData.days} days (since ${deterministicData.date.toLocaleDateString()})`);
      setUsedFallbackData(true);
      setErrorMessage('Unable to fetch wallet age from Moralis API. Using estimated data based on wallet address.');
    } finally {
      setIsLoading(false);
    }
  };

  // Automatically execute when the address is available
  React.useEffect(() => {
    if (input && isConnected) {
      checkAge();
    }
  }, [isConnected, input]);

  // Determine the "age" of the wallet on a scale of 0-100
  const getWalletAgePercentage = () => {
    if (!daysOld) return 0;
    // Considering 5 years (1825 days) as 100%
    return Math.min(100, (daysOld / 1825) * 100);
  };

  // Get a description of the wallet's age
  const getAgeDescription = () => {
    if (!daysOld) return '';
    if (daysOld < 30) return 'Newbie';
    if (daysOld < 180) return 'Young';
    if (daysOld < 365) return 'Experienced';
    if (daysOld < 730) return 'Veteran';
    return 'Legendary OG';
  };
  
  return (
    <div className="bg-black/40 border border-[#fb923c]/20 rounded-lg p-4 flex flex-col gap-2 shadow-lg transition-all">
      <h3 className="font-bold text-orange-400 mb-1 flex items-center">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
        </svg>
        Wallet Age Calculator
      </h3>
      <input 
        className="p-2 rounded bg-gray-800 text-white border border-gray-700 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 focus:outline-none" 
        placeholder={isConnected ? "Using connected wallet" : "Wallet address"} 
        value={isConnected ? formatWalletAddress(input) : input} 
        onChange={e => setInput(e.target.value)} 
      />
      <button 
        className={`text-white rounded px-3 py-2 transition-all ${isConnected ? "bg-orange-500 hover:bg-orange-600" : "bg-gray-600 hover:bg-gray-700"} flex items-center justify-center`}
        onClick={checkAge}
        disabled={isLoading}
      >
        {isLoading ? (
          <>
            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Checking...
          </>
        ) : "Check Age"}
      </button>
      
      {isLoading ? (
        <SkeletonLoader />
      ) : errorMessage ? (
        <div className="text-sm text-orange-300 mt-2 p-2 bg-orange-500/10 rounded border border-orange-500/20">
          {errorMessage}
        </div>
      ) : firstTxDate ? (
        <div className="mt-2 bg-gray-800/50 p-3 rounded-lg border border-gray-700">
          <div className="flex flex-col">
            <div className="text-sm text-gray-400">First transaction:</div>
            <div className="text-orange-300 font-semibold">
              {firstTxDate.toLocaleDateString('en-US', { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </div>
            
            <div className="mt-2 mb-1 text-sm text-gray-400">Wallet age: {daysOld} days</div>
            
            <div className={`w-full bg-gray-700 rounded-full h-2.5 mb-1`}>
              <div 
                className={`bg-orange-500 h-2.5 rounded-full wallet-age-bar`}
                ref={(el) => {
                  if (el) {
                    el.style.setProperty('--wallet-age-percentage', `${getWalletAgePercentage()}%`);
                  }
                }}
              ></div>
            </div>
            
            <div className="flex justify-between items-center">
              <div className="text-xs text-gray-500">New</div>
              <div className="text-sm font-medium text-orange-400">{getAgeDescription()}</div>
              <div className="text-xs text-gray-500">OG</div>
            </div>
            
            {usedFallbackData && (
              <div className="mt-3 text-xs text-gray-500 text-center">
                * Based on deterministic calculation from wallet address
              </div>
            )}
          </div>
        </div>
      ) : age ? (
        <div className="text-sm text-gray-300 mt-1 p-2 bg-gray-800/50 rounded">{age}</div>
      ) : null}
    </div>
  );
}

function LuckScoreCard({ address, isConnected }: { address: `0x${string}` | undefined, isConnected: boolean }) {
  const [input, setInput] = useState('');
  const [score, setScore] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [luckLevel, setLuckLevel] = useState('');
  
  // Automatically use the connected wallet address
  React.useEffect(() => {
    if (address) {
      setInput(address);
    }
  }, [address]);
  
  const calcLuck = () => {
    if (!input) return;
    setIsLoading(true);
    
    try {
      // Criteria to calculate luck (more elaborate)
      let s = 0;
      const addressLower = input.toLowerCase();
      
      // Sequence patterns
      if (addressLower.includes('123')) s += 5;
      if (addressLower.includes('888')) s += 10;
      if (addressLower.includes('777')) s += 15;
      
      // Count of special characters
      const aToFMatches = addressLower.match(/[a-f]/g);
      if (aToFMatches) s += Math.min(15, aToFMatches.length);
      
      // Zeros are very lucky in crypto
      const zeroMatches = addressLower.match(/0/g);
      if (zeroMatches) s += Math.min(20, zeroMatches.length * 3);
      
      // Sequence of identical characters
      for (let i = 0; i < addressLower.length - 2; i++) {
        if (addressLower[i] === addressLower[i+1] && addressLower[i] === addressLower[i+2]) {
          s += 12;
          break;
        }
      }
      
      // Maximum score is 100
      s = Math.min(100, s);
      
      // Set luck level
      let level = '';
      if (s < 20) level = 'Muito Baixa';
      else if (s < 40) level = 'Baixa';
      else if (s < 60) level = 'Média';
      else if (s < 80) level = 'Alta';
      else level = 'Extremamente Sortuda!';
      
      setScore(s);
      setLuckLevel(level);
    } catch (error) {
      console.error('Error calculating luck score:', error);
      setScore(null);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Automatically execute when the address is available
  React.useEffect(() => {
    if (input && isConnected) {
      calcLuck();
    }
  }, [isConnected, input]);
  
  return (
    <div className="bg-black/40 border border-[#fb923c]/20 rounded-lg p-4 flex flex-col gap-2 shadow-lg transition-all">
      <h3 className="font-bold text-orange-400 mb-1 flex items-center">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
        </svg>
        Wallet Luck Score
      </h3>
      <input 
        className="p-2 rounded bg-gray-800 text-white border border-gray-700 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 focus:outline-none" 
        placeholder={isConnected ? "Using connected wallet" : "Wallet address"} 
        value={isConnected ? formatWalletAddress(input) : input}
        onChange={e => setInput(e.target.value)} 
      />
      <button 
        className={`text-white rounded px-3 py-2 transition-all ${isConnected ? "bg-orange-500 hover:bg-orange-600" : "bg-gray-600 hover:bg-gray-700"} flex items-center justify-center`}
        onClick={calcLuck}
        disabled={isLoading}
      >
        {isLoading ? (
          <>
            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Checking...
          </>
        ) : "Calculate Luck"}
      </button>
      
      {isLoading ? (
        <SkeletonLoader />
      ) : score !== null && (
        <div className="mt-2 bg-gray-800/50 p-3 rounded-lg border border-gray-700">
          <div className="text-center mb-3">
            <div className={`text-2xl font-bold ${
              score < 30 ? 'text-red-500' : 
              score < 60 ? 'text-yellow-500' : 
              'text-green-500'
            }`}>
              {score}/100
            </div>
            <div className="text-sm text-gray-400">Luck Score</div>
          </div>
          
          <div className="w-full bg-gray-700 rounded-full h-2.5 mb-3">
            <div className={`h-2.5 rounded-full luck-score-bar ${score < 30 ? 'bg-red-500' : score < 60 ? 'bg-yellow-500' : 'bg-green-500'}`}></div>
          </div>
          
          <div className="flex justify-between text-xs text-gray-500">
            <span>Baixa</span>
            <span>Média</span>
            <span>Alta</span>
          </div>
          
          <div className="mt-3 text-center">
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
              score < 30 ? 'bg-red-500/20 text-red-300' : 
              score < 60 ? 'bg-yellow-500/20 text-yellow-300' : 
              'bg-green-500/20 text-green-300'
            }`}>
              {luckLevel}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

function FlexCard({ address, isConnected, className }: { address: `0x${string}` | undefined, isConnected: boolean, className?: string }) {
  const [input, setInput] = useState('');
  const [msg, setMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [cardGenerated, setCardGenerated] = useState(false);
  const [cardData, setCardData] = useState<{
    score: number;
    nftCount: number;
    age: number;
  } | null>(null);
  
  // Fun wallet nicknames based on score
  const getWalletNickname = (score: number) => {
    if (score >= 90) return "Crypto Whale Legend 🐳";
    if (score >= 80) return "Diamond Hands King 💎";
    if (score >= 70) return "NFT Conquistador 🏆";
    if (score >= 60) return "Memecoin Wizard 🧙‍♂️";
    if (score >= 50) return "Blockchain Adventurer 🌍";
    if (score >= 40) return "Crypto Enthusiast ⚡";
    if (score >= 30) return "Web3 Explorer 🔍";
    if (score >= 20) return "HODL Apprentice 👶";
    return "Crypto Newbie 🥚";
  };
  
  // Fun emoji for NFT count
  const getNftEmoji = (count: number) => {
    if (count > 15) return "🖼️🖼️🖼️";
    if (count > 10) return "🖼️🖼️";
    if (count > 5) return "🖼️";
    return "📝";
  };
  
  // Fun wallet age description
  const getAgeDescription = (days: number) => {
    if (days > 300) return "Crypto Dinosaur 🦖";
    if (days > 200) return "Veteran Hodler 👴";
    if (days > 100) return "Experienced Trader 🧠";
    if (days > 50) return "Getting Comfortable 🛋️";
    return "Fresh Wallet 🌱";
  };
  
  // Automatically use the connected wallet address
  React.useEffect(() => {
    if (address) {
      setInput(address);
    }
  }, [address]);
  
  // Generate deterministic data based on wallet address
  const generateDeterministicData = (walletAddress: string) => {
    if (!walletAddress || walletAddress.length < 10) return { score: 50, nftCount: 5, age: 180 };
    
    // Create a simple hash from the wallet address
    let hash = 0;
    for (let i = 0; i < walletAddress.length; i++) {
      hash = ((hash << 5) - hash) + walletAddress.charCodeAt(i);
      hash = hash & hash; // Convert to 32bit integer
    }
    
    // Use the absolute value of hash
    const absHash = Math.abs(hash);
    
    // Generate consistent values based on the hash
    const score = absHash % 101; // 0-100
    const nftCount = 1 + (absHash % 19); // 1-19
    const age = 30 + (absHash % 335); // 30-365 days
    
    return { score, nftCount, age };
  };
  
  // Generate a fun "wallet mood" based on the wallet address
  const getWalletMood = (address: string) => {
    const moods = [
      "ready to moon! 🚀", 
      "looking for alpha 👀", 
      "avoiding rugpulls 🧠", 
      "feeling bullish 📈",
      "HODL mode activated 🔒",
      "fading FUD 🙉",
      "degen mode: ON 🔥",
      "stacking sats 💰",
      "touching grass today 🌱",
      "buying high, selling low 🤦‍♂️"
    ];
    
    // Use the address to deterministically choose a mood
    const moodIndex = parseInt(address.slice(2, 4), 16) % moods.length;
    return moods[moodIndex];
  };
  
  const saveFlex = async () => {
    if (!input) return setMsg('Enter your wallet address');
    setIsLoading(true);
    
    try {
      // Generate deterministic data
      const data = generateDeterministicData(input);
      setCardData(data);
      
      // Armazenar localmente no localStorage para referência futura (opcional)
      try {
        const flexCardsHistory = JSON.parse(localStorage.getItem('flexCardsHistory') || '[]');
        flexCardsHistory.push({
          address: input,
          created: new Date().toISOString(),
          displayName: `Wallet ${formatWalletAddress(input)}`,
          score: data.score,
          nftCount: data.nftCount,
          age: data.age
        });
        // Manter apenas os últimos 10 cartões
        if (flexCardsHistory.length > 10) {
          flexCardsHistory.splice(0, flexCardsHistory.length - 10);
        }
        localStorage.setItem('flexCardsHistory', JSON.stringify(flexCardsHistory));
      } catch (storageError) {
        // Silenciosamente ignora erros de localStorage
        console.log('Não foi possível salvar no localStorage:', storageError);
      }
      
      setCardGenerated(true);
      setMsg('Awesome flex card created! Your friends will be sooo jealous! 😎');
    } catch (error) {
      console.error('Error saving flex card:', error);
      setMsg('Oops! The blockchain gods denied your flex card 😅');
      setCardGenerated(false);
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className={`bg-black/40 border border-[#fb923c]/20 rounded-lg p-4 flex flex-col gap-2 shadow-lg transition-all ${className}`}>
      <h3 className="font-bold text-orange-400 mb-1 flex items-center">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M18 3a1 1 0 00-1.447-.894L8.763 6H5a3 3 0 000 6h.28l1.771 5.316A1 1 0 008 18h1a1 1 0 001-1v-4.382l6.553 3.276A1 1 0 0018 15V3z" clipRule="evenodd" />
        </svg>
        Super Awesome Wallet Flex Card ✨
      </h3>
      <p className="text-xs text-gray-400 -mt-1 ml-7">Show off your crypto swag to the world!</p>
      <input 
        className="p-2 rounded bg-gray-800 text-white border border-gray-700 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 focus:outline-none" 
        placeholder={isConnected ? "Using connected wallet" : "Drop your wallet address here"} 
        value={isConnected ? formatWalletAddress(input) : input} 
        onChange={e => setInput(e.target.value)} 
      />
      <button 
        className={`text-white rounded px-3 py-2 transition-all ${isConnected ? "bg-orange-500 hover:bg-orange-600" : "bg-gray-600 hover:bg-gray-700"} flex items-center justify-center`}
        onClick={saveFlex}
        disabled={isLoading}
      >
        {isLoading ? (
          <>
            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Generating Awesomeness...
          </>
        ) : "Create Epic Flex Card 🔥"}
      </button>
      
      {isLoading ? (
        <div className="animate-pulse">
          <div className="h-40 bg-gray-700 rounded w-full mb-2"></div>
          <div className="h-4 bg-gray-700 rounded w-1/2"></div>
        </div>
      ) : cardGenerated && cardData ? (
        <div className="mt-3 animate-fadeIn">
          <div className="bg-gradient-to-br from-orange-500 to-yellow-600 p-0.5 rounded-lg drop-shadow-glow">
            <div className="bg-gray-900 p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-orange-500 rounded-full flex items-center justify-center text-white font-bold">
                    {input.substring(2, 4).toUpperCase()}
                  </div>
                  <div className="ml-3">
                    <div className="text-white font-bold text-lg">{getWalletNickname(cardData.score)}</div>
                    <div className="text-xs text-gray-400 flex items-center">
                      <span>{formatWalletAddress(input)}</span>
                      <span className="ml-1 bg-gray-800 px-1.5 py-0.5 rounded text-gray-300 text-[10px]">
                        {getWalletMood(input)}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="bg-orange-500 px-3 py-2 rounded text-white text-xs font-bold transform rotate-3 animate-pulse">
                  {cardData.score >= 80 ? "LEGENDARY" : 
                   cardData.score >= 60 ? "BASED" : 
                   cardData.score >= 40 ? "RISING STAR" : "NOOB"}
                </div>
              </div>
              
              <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                <div className="bg-gray-800/50 p-2 rounded hover:bg-gray-700/50 transition-colors group">
                  <div className="text-lg font-bold text-white group-hover:scale-110 transition-transform">{cardData.score}</div>
                  <div className="text-xs text-gray-400 group-hover:text-orange-300 transition-colors">Crypto Score</div>
                  <div className="text-[10px] text-orange-500 mt-1">
                    {cardData.score > 70 ? "Top Degen" : cardData.score > 40 ? "Average Chad" : "Needs Work"}
                  </div>
                </div>
                <div className="bg-gray-800/50 p-2 rounded hover:bg-gray-700/50 transition-colors group">
                  <div className="text-lg font-bold text-white group-hover:scale-110 transition-transform flex justify-center">
                    <span>{cardData.nftCount}</span>
                    <span className="text-xs ml-1 text-orange-400">{getNftEmoji(cardData.nftCount)}</span>
                  </div>
                  <div className="text-xs text-gray-400 group-hover:text-orange-300 transition-colors">NFT Collection</div>
                  <div className="text-[10px] text-orange-500 mt-1">
                    {cardData.nftCount > 15 ? "NFT Whale" : cardData.nftCount > 8 ? "Collector" : "Starting Out"}
                  </div>
                </div>
                <div className="bg-gray-800/50 p-2 rounded hover:bg-gray-700/50 transition-colors group">
                  <div className="text-lg font-bold text-white group-hover:scale-110 transition-transform">{cardData.age}</div>
                  <div className="text-xs text-gray-400 group-hover:text-orange-300 transition-colors">Wallet Age (days)</div>
                  <div className="text-[10px] text-orange-500 mt-1">{getAgeDescription(cardData.age)}</div>
                </div>
              </div>
              
              <div className="mt-4 flex justify-between items-center">
                <div className="text-[10px] italic text-gray-500">
                  "{cardData.score > 70 ? "Fortune favors the brave" : 
                    cardData.score > 40 ? "DYOR and HODL" : "Buy high, sell low"}"
                </div>
                <button className="text-xs bg-orange-500 text-white rounded-full px-3 py-1 flex items-center hover:bg-orange-600 transition-colors transform hover:scale-105">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M15 8a3 3 0 10-2.977-2.63l-4.94 2.47a3 3 0 100 4.319l4.94 2.47a3 3 0 10.895-1.789l-4.94-2.47a3.027 3.027 0 000-.74l4.94-2.47C13.456 7.68 14.19 8 15 8z" />
                  </svg>
                  Share the Flex
                </button>
              </div>
            </div>
          </div>
          <div className="text-center mt-3">
            <div className="text-sm text-orange-300 font-medium">🎉 Your flex card is ready to impress! 🎉</div>
            <div className="text-xs text-gray-400 mt-1">Share it with your fren that has a 9-5 job 😎</div>
          </div>
        </div>
      ) : msg ? (
        <div className="text-sm text-gray-300 mt-1 p-2 bg-gray-800/50 rounded text-center">
          {msg}
        </div>
      ) : (
        <div className="bg-gray-800/30 p-3 rounded border border-gray-700/50 mt-2">
          <div className="flex items-center justify-center mb-2">
            <span className="text-yellow-500 text-lg mr-2">✨</span>
            <span className="text-sm text-gray-300 font-medium">What's a Flex Card?</span>
            <span className="text-yellow-500 text-lg ml-2">✨</span>
          </div>
          <p className="text-xs text-gray-400 text-center">
            A fun way to show off your crypto reputation, wallet age, and overall awesomeness in the Web3 space! Generate yours now and become the envy of your crypto friends!
          </p>
          <div className="flex justify-center mt-3">
            <div className="animate-bounce bg-orange-500 p-1 w-8 h-8 rounded-full flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" />
              </svg>
            </div>
          </div>
        </div>
      )}

      {/* Add custom animation keyframes using style tag */}
      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.6s ease-out forwards;
        }
        .drop-shadow-glow {
          filter: drop-shadow(0 0 8px rgba(249, 115, 22, 0.5));
        }
      `}</style>
    </div>
  );
}

function DustFinderCard({ address, isConnected }: { address: `0x${string}` | undefined, isConnected: boolean }) {
  const [input, setInput] = useState('');
  const [dust, setDust] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  
  // Automatically use the connected wallet address
  React.useEffect(() => {
    if (address) {
      setInput(address);
    }
  }, [address]);
  
  const findDust = async () => {
    if (!input) return;
    setIsLoading(true);
    setErrorMessage('');
    
    try {
      const res = await fetch(
        `https://deep-index.moralis.io/api/v2.2/${input}/erc20?chain=eth`, 
        { 
          headers: { 
            'X-API-Key': process.env.NEXT_PUBLIC_MORALIS_API_KEY || '' 
          } as HeadersInit 
        }
      );
      
      if (!res.ok) {
        throw new Error(`API returned ${res.status}: ${res.statusText}`);
      }
      
      const data = await res.json();
      
      if (data.result && Array.isArray(data.result)) {
        setDust(data.result.filter((t: any) => Number(t.balance) < 1e-6) || []);
      } else {
        // If there are no results, show some simulated data
        console.log("No valid data from Moralis API, showing simulation");
        setDust([
          { symbol: 'DUST', balance: '0.0000001', tokenAddress: '0x123...' },
          { symbol: 'TINY', balance: '0.0000005', tokenAddress: '0x456...' }
        ]);
      }
    } catch (error) {
      console.error('Dust finder error:', error);
      setErrorMessage('Unable to connect to Moralis API. Network error or API key limit reached.');
      // Simulated data for visual demonstration
      setDust([
        { symbol: 'DEMO', balance: '0.0000003', tokenAddress: '0xabc...' },
        { symbol: 'TEST', balance: '0.0000002', tokenAddress: '0xdef...' }
      ]);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Automatically execute when the address is available
  React.useEffect(() => {
    if (input && isConnected) {
      findDust();
    }
  }, [isConnected, input]);
  
  return (
    <div className="bg-black/40 border border-[#fb923c]/20 rounded-lg p-4 flex flex-col gap-2 shadow-lg transition-all">
      <h3 className="font-bold text-orange-400 mb-1 flex items-center">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
          <path d="M3 12v3c0 1.657 3.134 3 7 3s7-1.343 7-3v-3c0 1.657-3.134 3-7 3s-7-1.343-7-3z" />
          <path d="M3 7v3c0 1.657 3.134 3 7 3s7-1.343 7-3V7c0 1.657-3.134 3-7 3S3 8.657 3 7z" />
          <path d="M17 5c0 1.657-3.134 3-7 3S3 6.657 3 5s3.134-3 7-3 7 1.343 7 3z" />
        </svg>
        Token Dust Finder
      </h3>
      <input 
        className="p-2 rounded bg-gray-800 text-white border border-gray-700 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 focus:outline-none" 
        placeholder={isConnected ? "Using connected wallet" : "Wallet address"} 
        value={isConnected ? formatWalletAddress(input) : input} 
        onChange={e => setInput(e.target.value)} 
      />
      <button 
        className={`text-white rounded px-3 py-2 transition-all ${isConnected ? "bg-orange-500 hover:bg-orange-600" : "bg-gray-600 hover:bg-gray-700"} flex items-center justify-center`}
        onClick={findDust}
        disabled={isLoading}
      >
        {isLoading ? (
          <>
            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Searching...
          </>
        ) : "Find Dust"}
      </button>
      
      {isLoading ? (
        <SkeletonLoader />
      ) : (
        <>
          {errorMessage && (
            <div className="text-sm text-orange-300 mt-2 mb-2 p-2 bg-orange-500/10 rounded border border-orange-500/20">
              {errorMessage}
            </div>
          )}
          
          {dust.length > 0 ? (
            <div className="mt-2 bg-gray-800/50 p-3 rounded-lg border border-gray-700 max-h-40 overflow-y-auto">
              <div className="text-sm text-gray-300 mb-2">Found {dust.length} dust tokens:</div>
              <div className="space-y-2">
                {dust.map((token, i) => (
                  <div key={i} className="flex justify-between items-center bg-gray-700/30 p-1.5 rounded">
                    <div className="flex items-center">
                      <div className="w-6 h-6 rounded-full bg-orange-500/20 flex items-center justify-center text-xs text-orange-300 mr-2">
                        {token.symbol?.charAt(0) || '?'}
                      </div>
                      <span className="text-xs font-medium text-white">{token.symbol || 'Unknown'}</span>
                    </div>
                    <span className="text-xs text-gray-400">{Number(token.balance).toExponential(2)}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-sm text-gray-400 mt-3 p-3 bg-gray-800/30 rounded text-center">
              {input ? 'No dust tokens found in this wallet.' : 'Enter a wallet address to find dust tokens.'}
            </div>
          )}
          
          {errorMessage && dust.length > 0 && (
            <div className="text-xs text-gray-400 mt-2 text-center">
              * Showing simulated data due to API limitations
            </div>
          )}
        </>
      )}
    </div>
  );
}

function NFTProfilePicCard({ address, isConnected }: { address: `0x${string}` | undefined, isConnected: boolean }) {
  // Placeholder: generates jazzicon avatar
  const [input, setInput] = useState('');
  const [icon, setIcon] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [imageSize, setImageSize] = useState(64); // Avatar size
  const [errorMessage, setErrorMessage] = useState('');
  
  // Automatically use the connected wallet address
  React.useEffect(() => {
    if (address) {
      setInput(address);
    }
  }, [address]);
  
  const generate = () => {
    if (!input) return;
    setIsLoading(true);
    setErrorMessage('');
    
    try {
      // Place in a setTimeout to simulate processing
      // and allow the skeleton loader to be displayed
      setTimeout(() => {
        try {
          const el = document.createElement('div');
          // Use the wallet address as a seed to always generate the same icon
          const seed = parseInt(input.slice(2, 10) || '0', 16);
          
          // Check if jazzicon is available
          if (typeof jazzicon !== 'function') {
            throw new Error('Jazzicon library not available');
          }
          
          const iconElement = jazzicon(imageSize, seed);
          
          if (el && iconElement) {
            el.appendChild(iconElement);
            setIcon(el.innerHTML);
          } else {
            throw new Error('Failed to generate icon');
          }
        } catch (error) {
          console.error('Error generating jazzicon:', error);
          setErrorMessage('Failed to generate icon. Using fallback image.');
          
          // Create a simple alternative when jazzicon fails
          createFallbackAvatar(input);
        } finally {
          setIsLoading(false);
        }
      }, 500);
    } catch (error) {
      console.error('Outer error in generate:', error);
      setErrorMessage('Error generating avatar. Please try again.');
      setIsLoading(false);
    }
  };
  
  // Create a fallback avatar as an alternative if jazzicon fails
  const createFallbackAvatar = (address: string) => {
    // Generate a unique color based on the address
    const hash = address.slice(2, 10);
    const hue = parseInt(hash, 16) % 360;
    
    // Create a simple SVG based on the address
    const svgContent = `
      <svg width="${imageSize}" height="${imageSize}" viewBox="0 0 ${imageSize} ${imageSize}" xmlns="http://www.w3.org/2000/svg">
        <circle cx="${imageSize/2}" cy="${imageSize/2}" r="${imageSize/2}" fill="hsl(${hue}, 80%, 40%)" />
        <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="white" font-family="Arial" font-weight="bold" font-size="${imageSize/2}">
          ${address.slice(2, 3).toUpperCase()}
        </text>
      </svg>
    `;
    
    setIcon(svgContent);
  };
  
  // Automatically execute when the address is available
  React.useEffect(() => {
    if (input && isConnected) {
      generate();
    }
  }, [isConnected, input]);
  
  return (
    <div className="bg-black/40 border border-[#fb923c]/20 rounded-lg p-4 flex flex-col gap-2 shadow-lg transition-all">
      <h3 className="font-bold text-orange-400 mb-1 flex items-center">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
        </svg>
        NFT Profile Pic
      </h3>
      <input 
        className="p-2 rounded bg-gray-800 text-white border border-gray-700 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 focus:outline-none" 
        placeholder={isConnected ? "Using connected wallet" : "Wallet address"} 
        value={isConnected ? formatWalletAddress(input) : input} 
        onChange={e => setInput(e.target.value)} 
      />
      <div className="flex gap-2">
        <button 
          className={`flex-1 text-white rounded px-3 py-2 transition-all ${isConnected ? "bg-orange-500 hover:bg-orange-600" : "bg-gray-600 hover:bg-gray-700"} flex items-center justify-center`}
          onClick={generate}
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Generating...
            </>
          ) : "Generate Avatar"}
        </button>
        
        <div className="flex items-center space-x-1">
          <button 
            onClick={() => setImageSize(Math.max(32, imageSize - 16))}
            className="p-1 bg-gray-700 rounded hover:bg-gray-600 text-white"
            title="Smaller"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M5 10a1 1 0 011-1h8a1 1 0 110 2H6a1 1 0 01-1-1z" clipRule="evenodd" />
            </svg>
          </button>
          
          <button 
            onClick={() => setImageSize(Math.min(128, imageSize + 16))}
            className="p-1 bg-gray-700 rounded hover:bg-gray-600 text-white"
            title="Larger"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      </div>
      
      {errorMessage && (
        <div className="text-sm text-orange-300 mt-2 p-2 bg-orange-500/10 rounded border border-orange-500/20">
          {errorMessage}
        </div>
      )}
      
      {isLoading ? (
        <div className="mt-3 flex justify-center">
          <div className="w-16 h-16 rounded-full bg-gray-700 animate-pulse"></div>
        </div>
      ) : icon ? (
        <div className="mt-3 flex flex-col items-center">
          <div className="p-1 bg-gradient-to-r from-orange-500 to-yellow-500 rounded-full">
            <div className="bg-gray-800 p-1 rounded-full">
              <div dangerouslySetInnerHTML={{ __html: icon }} />
            </div>
          </div>
          <div className="mt-2 text-xs text-gray-400">Unique avatar for {formatWalletAddress(input)}</div>
          <div className="mt-3 text-center">
            <span className="text-xs text-gray-500">
              Pro Tip: This avatar is deterministic - the same address will always generate the same image!
            </span>
          </div>
        </div>
      ) : (
        <div className="mt-3 text-center text-gray-500 text-sm">
          <div className="w-16 h-16 mx-auto rounded-full bg-gray-800 flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <p className="mt-2">Enter a wallet address to generate a unique avatar</p>
        </div>
      )}
    </div>
  );
}

// Main component of the page
export default function CryptoToolsPage() {
  const { address, isConnected, networkError, networkInfo, setAddress, setIsConnected } = useWalletState();
  const [selectedCoinId, setSelectedCoinId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<number>(0);
  const [visibleRows, setVisibleRows] = useState(10); // State to control visible rows

  const handleViewDetails = (coinId: string) => {
    setSelectedCoinId(coinId);
    setActiveTab(1);
  };

  const {
    cryptoData,
    selectedCryptos,
    loading,
    error,
    timeframe,
    searchQuery,
    handleToggleCrypto,
    handleRemoveCrypto,
    handleClearSelections,
    handleTimeframeChange,
    handleSearchChange,
    refreshData
  } = useCryptocurrencies();

  const selectedCryptosWithTypes = selectedCryptos.map((crypto: { id: string }) =>
    cryptoData.find((c: { id: string }) => c.id === crypto.id)!
  );

  return (
    <Layout>
      <div className="bg-gradient-to-br from-orange-900 to-black text-white min-h-screen pt-8">
        {/* Added pt-8 for padding-top */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Page header */}
          <div className="text-center mb-10">
            <h1 className="text-4xl font-bold text-orange-500 mb-4">Crypto Tools</h1>
            <p className="text-gray-400 max-w-2xl mx-auto">
              Useful tools for exploring wallet addresses, checking on-chain data and more.
            </p>
            
            {/* Warning message about tools under development */}
            <div className="mt-4 bg-orange-900/30 border border-orange-500/50 rounded-lg p-4 max-w-2xl mx-auto">
              <p className="text-sm text-orange-200 flex items-center mb-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zm-1 8a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
                <span>Please note: These tools are still under development and may contain flaws. Some features may have limited or experimental functionality.</span>
              </p>
              <p className="text-sm text-orange-200 ml-7 mb-2">
                Currently, we're using free API tiers which have limitations, so most wallet-related information is simulated for demonstration purposes.
              </p>
              <p className="text-sm text-orange-200 ml-7">
                If you'd like to help this project grow and support the implementation of advanced features with premium APIs, please <a href="/donate" className="text-orange-400 font-medium hover:text-orange-300 underline">donate here</a>. Your contribution will help us provide more accurate and reliable blockchain data!
              </p>
            </div>
          </div>
          
          {/* Wallet connection bar */}
          <div className="mb-8 p-4 bg-gradient-to-r from-orange-900/30 to-gray-900/50 rounded-lg border border-orange-500/30">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
              <div>
                <h2 className="text-xl font-bold text-orange-400">Connect your wallet</h2>
                <p className="text-gray-400 text-sm">Connect to access additional features and functionalities</p>
              </div>
              
              <div className="flex items-center gap-2">
                {isConnected && (
                  <div className="bg-orange-900/30 px-3 py-1 rounded-lg text-sm border border-orange-500/30">
                    <span className="text-gray-400 mr-1">Connected:</span>
                    <span className="text-orange-400">{formatWalletAddress(address)}</span>
                  </div>
                )}
                
                <WalletButton 
                  onConnect={async (addr) => {
                    setAddress(addr as `0x${string}`);
                    setIsConnected(true);
                  }}
                  onDisconnect={() => {
                    setAddress(undefined);
                    setIsConnected(false);
                  }}
                  className="wallet-connect-btn"
                />
              </div>
            </div>
            
            {/* Display network error messages */}
            {networkError && (
              <NetworkErrorAlert 
                error={networkError} 
                retry={() => {
                  window.location.reload();
                }} 
              />
            )}
            
            {/* Network information */}
            {isConnected && networkInfo && (
              <div className="mt-3 bg-orange-900/20 p-2 rounded text-sm inline-flex items-center">
                <div className={`w-2 h-2 rounded-full mr-2 ${
                  networkInfo.chainId === 1 ? 'bg-green-500' : 'bg-yellow-500'
                }`}></div>
                <span className="text-gray-400 mr-1">Rede:</span>
                <span className="text-white">{networkInfo.name}</span>
              </div>
            )}
          </div>

          <div className="mb-12">
            <FlexCard address={address} isConnected={isConnected} className="w-full" />
          </div>
          
          {/* Grid de cartões menores */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
            <ENSCheckerCard address={address} isConnected={isConnected} />
            <LuckScoreCard address={address} isConnected={isConnected} />
            <WalletAgeCard address={address} isConnected={isConnected} />
            <DustFinderCard address={address} isConnected={isConnected} />
          </div>

          {/* NFT Profile sozinho na última linha */}
          <div className="mb-12">
            <NFTProfilePicCard address={address} isConnected={isConnected} />
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <h1 className="text-3xl font-bold text-[#fb923c] mb-6">Cryptocurrency Analysis</h1>

          <SearchFilterBar
            selectedCryptos={selectedCryptos}
            timeFilter={timeframe}
            searchQuery={searchQuery}
            showComparison={selectedCryptos.length > 0}
            onSearchChange={handleSearchChange}
            onRemoveTag={handleRemoveCrypto}
            onClearAll={handleClearSelections}
            onTimeFilterChange={handleTimeframeChange}
            onToggleComparison={() => {}}
          />

          {error && (
            <div className="bg-red-900/30 border border-red-500 text-white p-4 rounded-lg mb-6">
              {error}
            </div>
          )}

          <Tab.Group selectedIndex={activeTab} onChange={setActiveTab}>
            <Tab.List className="flex space-x-2 p-1 bg-black/30 rounded-xl mb-6 border border-[#333]">
              <Tab className={({ selected }) => `
                w-full py-3 text-sm font-medium leading-5 rounded-lg transition-all
                ${selected 
                  ? 'bg-[#fb923c] text-white shadow'
                  : 'text-[#e5e5e5] hover:bg-[#fb923c]/20'}
              `}>
                Market List
              </Tab>
              <Tab className={({ selected }) => `
                w-full py-3 text-sm font-medium leading-5 rounded-lg transition-all
                ${selected 
                  ? 'bg-[#fb923c] text-white shadow'
                  : 'text-[#e5e5e5] hover:bg-[#fb923c]/20'}
              `}>
                {selectedCoinId ? 'Details' : 'Comparison'}
              </Tab>
              <Tab className={({ selected }) => `
                w-full py-3 text-sm font-medium leading-5 rounded-lg transition-all
                ${selected 
                  ? 'bg-[#fb923c] text-white shadow'
                  : 'text-[#e5e5e5] hover:bg-[#fb923c]/20'}
              `}>
                Market Cap Calculator
              </Tab>
            </Tab.List>

            <Tab.Panels>
              <Tab.Panel>
                {loading ? (
                  <div className="text-center p-12">
                    <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-[#fb923c] border-r-transparent"></div>
                    <p className="mt-4 text-gray-300">Loading cryptocurrency data...</p>
                  </div>
                ) : (
                  <>
                    {cryptoData && cryptoData.length > 0 ? (
                      <>
                        <CryptoTable 
                          cryptoData={cryptoData.slice(0, visibleRows)} // Show only visible rows
                          onCheckboxToggle={handleToggleCrypto} 
                          onViewDetails={handleViewDetails} 
                        />

                        {cryptoData.length > visibleRows && (
                          <div className="text-center mt-4">
                            <button 
                              onClick={() => setVisibleRows(visibleRows + 10)} // Expand by 10 rows
                              className="px-4 py-2 bg-[#fb923c] text-white rounded hover:bg-[#f97316]"
                            >
                              Show More
                            </button>
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="text-center p-12 bg-black/40 border border-[#fb923c]/20 rounded-xl">
                        <p className="text-gray-300">No cryptocurrencies found. Try adjusting your search.</p>
                        <button 
                          onClick={() => refreshData()} 
                          className="mt-4 px-4 py-2 bg-[#fb923c] text-white rounded hover:bg-[#f97316]"
                        >
                          Refresh Data
                        </button>
                      </div>
                    )}
                  </>
                )}
              </Tab.Panel>

              <Tab.Panel>
                {selectedCoinId ? (
                  <CryptoDetails coinId={selectedCoinId} />
                ) : (
                  <div className="p-6 bg-black/40 border border-[#fb923c]/20 rounded-xl text-center">
                    <p className="text-gray-300">
                      Select a cryptocurrency from the list to view its details or use the "Market Cap Calculator" tab for comparisons.
                    </p>
                    <button 
                      onClick={() => setActiveTab(0)} 
                      className="mt-4 px-4 py-2 bg-[#fb923c] text-white rounded hover:bg-[#f97316]"
                    >
                      Go to List
                    </button>
                  </div>
                )}
              </Tab.Panel>

              <Tab.Panel>
                <MarketCapComparison allCryptoData={cryptoData} loading={loading} />
              </Tab.Panel>
            </Tab.Panels>
          </Tab.Group>

          <div className="mt-6 mb-12 bg-gradient-to-br from-orange-900/30 to-gray-900/50 rounded-lg p-6">
            <h2 className="text-2xl font-bold text-orange-500 mb-4">About Crypto Tools</h2>
            <p className="text-gray-400 mb-4">
              This page provides useful tools to explore and analyze Ethereum wallets. You can check ENS names, calculate wallet age, find "dust" tokens, and more.
            </p>
            <p className="text-gray-400 mb-4">
              All operations are performed directly in the browser using public APIs and your connection to the Ethereum provider. No private keys are shared during the use of these tools.
            </p>
            <div className="flex flex-wrap gap-3 mt-4">
              <a 
                href="/nft" 
                className="px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600 transition-colors"
              >
                Explore NFTs
              </a>
              <a 
                href="/learn2earn" 
                className="px-4 py-2 border border-orange-500 text-orange-500 rounded hover:bg-orange-500 hover:text-white transition-colors"
              >
                Learn & Earn
              </a>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}