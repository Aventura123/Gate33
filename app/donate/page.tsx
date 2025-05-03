'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Layout from '../../components/Layout';
import { web3Service } from '../../services/web3Service';
import { tokenService } from '../../services/tokenService';
import WalletButton from '../../components/WalletButton';
import { NetworkType } from '../../services/web3Service';
import { ethers } from 'ethers';
import Image from 'next/image';
import Link from 'next/link';
import { USDT_ADDRESSES, TOKEN_DECIMALS } from '../../config/tokenConfig';
import DonationThankYouCard from '../../components/ui/DonationThankYouCard';

// Donation options
interface CryptoCurrency {
  name: string;
  symbol: string;
  icon: string;
  networks: string[];
}

interface Network {
  id: string;
  name: string;
  icon: string;
  supportedTokens: string[];
}

const cryptocurrencies: CryptoCurrency[] = [
  {
    name: "Ethereum",
    symbol: "ETH",
    icon: "/images/crypto/eth.svg", // Will be replaced by text
    networks: ["ethereum", "polygon", "bsc"]
  },
  {
    name: "Bitcoin",
    symbol: "BTC",
    icon: "/images/crypto/btc.svg", // Will be replaced by text
    networks: ["bitcoin"]
  },
  {
    name: "Tether",
    symbol: "USDT",
    icon: "/images/crypto/usdt.svg", // Will be replaced by text
    networks: ["ethereum", "polygon", "bsc"]
  }
];

const networks: Network[] = [
  {
    id: "ethereum",
    name: "Ethereum",
    icon: "/images/networks/ethereum.svg",
    supportedTokens: ["ETH", "USDT"]
  },
  {
    id: "polygon",
    name: "Polygon",
    icon: "/images/networks/polygon.svg",
    supportedTokens: ["ETH", "USDT"]
  },
  {
    id: "bsc",
    name: "BSC",
    icon: "/images/networks/binance.svg",
    supportedTokens: ["ETH", "USDT"]
  },
  {
    id: "bitcoin",
    name: "Bitcoin Network",
    icon: "/images/networks/bitcoin.svg",
    supportedTokens: ["BTC"]
  }
];

// Updated wallet addresses
const DONATION_ADDRESSES = {
  ethereum: {
    ETH: "0x3805FF925B6B0126849BD260A338391DF5F6E382", // Updated wallet address
    USDT: "0x3805FF925B6B0126849BD260A338391DF5F6E382" // Same address for simplicity
  },
  polygon: {
    ETH: "0x3805FF925B6B0126849BD260A338391DF5F6E382",
    USDT: "0x3805FF925B6B0126849BD260A338391DF5F6E382"
  },
  bsc: {
    USDT: "0x3805FF925B6B0126849BD260A338391DF5F6E382"
  },
  bitcoin: {
    BTC: "18kWTqh8o8Tzj4Qbekr5FY6AuikLS5zsKJ" // New Bitcoin address
  }
};

// Token contract addresses for ERC20 tokens
const TOKEN_ADDRESSES = {
  ethereum: {
    USDT: "0xdAC17F958D2ee523a2206206994597C13D831ec7"
  },
  polygon: {
    USDT: "0xc2132D05D31c914a87C6611C10748AEb04B58e8F"
  },
  bsc: {
    USDT: "0x55d398326f99059fF775485246999027B3197955"
  }
};

export default function DonatePage() {
  const [walletConnected, setWalletConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState<string>('');
  const [currentNetwork, setCurrentNetwork] = useState<string | null>(null);
  const [selectedCrypto, setSelectedCrypto] = useState<CryptoCurrency | null>(null);
  const [selectedNetwork, setSelectedNetwork] = useState<Network | null>(null);
  const [donationAmount, setDonationAmount] = useState<string>('');
  const [donationStep, setDonationStep] = useState<'select_crypto' | 'select_network' | 'enter_amount' | 'confirmation' | 'processing' | 'success' | 'error'>('select_crypto');
  const [isProcessing, setIsProcessing] = useState(false);
  const [transactionHash, setTransactionHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [estimatedTokens, setEstimatedTokens] = useState<number | null>(null);
  const [usdValue, setUsdValue] = useState<number | null>(null);

  // Check wallet connection when component mounts
  useEffect(() => {
    if (web3Service.isWalletConnected()) {
      const walletInfo = web3Service.getWalletInfo();
      if (walletInfo) {
        setWalletConnected(true);
        setWalletAddress(walletInfo.address);
        
        // Map network name to our network ids
        const networkMap: Record<string, string> = {
          'Ethereum Mainnet': 'ethereum',
          'Polygon': 'polygon',
          'BSC': 'bsc',
          'BSC Testnet': 'bsc'
        };
        
        const mappedNetwork = networkMap[walletInfo.networkName] || null;
        setCurrentNetwork(mappedNetwork);
      }
    }
  }, []);

  // Handle wallet connection
  const handleConnect = async (address: string) => {
    setWalletAddress(address);
    setWalletConnected(true);
    
    const walletInfo = web3Service.getWalletInfo();
    if (walletInfo) {
      // Map network name to our network ids
      const networkMap: Record<string, string> = {
        'Ethereum Mainnet': 'ethereum',
        'Polygon': 'polygon',
        'BSC': 'bsc',
        'BSC Testnet': 'bsc'
      };
      
      const mappedNetwork = networkMap[walletInfo.networkName] || null;
      setCurrentNetwork(mappedNetwork);
    }
  };

  // Handle wallet disconnect
  const handleDisconnect = () => {
    setWalletAddress('');
    setWalletConnected(false);
    setCurrentNetwork(null);
  };

  // Handle cryptocurrency selection
  const handleCryptoSelect = (crypto: CryptoCurrency) => {
    setSelectedCrypto(crypto);
    
    // If only one network is available for this crypto, select it automatically
    if (crypto.networks.length === 1) {
      const network = networks.find(n => n.id === crypto.networks[0]) || null;
      setSelectedNetwork(network);
      setDonationStep('enter_amount');
    } else {
      setDonationStep('select_network');
    }
  };

  // Handle network selection
  const handleNetworkSelect = (network: Network) => {
    setSelectedNetwork(network);
    setDonationStep('enter_amount');
  };

  // Handle donation amount input
  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Allow only numbers and decimals
    const value = e.target.value.replace(/[^0-9.]/g, '');
    setDonationAmount(value);
    
    // Calculate estimated tokens if the value is valid
    if (value && parseFloat(value) > 0 && selectedCrypto) {
      calculateEstimatedTokens(value, selectedCrypto.symbol);
    } else {
      setEstimatedTokens(null);
      setUsdValue(null);
    }
  };
  
  // Calculate estimated G33 tokens based on donation amount
  const calculateEstimatedTokens = async (amount: string, cryptoSymbol: string) => {
    try {
      // Use tokenService to calculate USD value
      const usdAmount = await tokenService.calculateUSDValue(amount, cryptoSymbol);
      setUsdValue(usdAmount);
      
      // Calculate token amount (1 token per $1 USD)
      const tokenAmount = tokenService.calculateG33TokenAmount(usdAmount);
      setEstimatedTokens(tokenAmount);
    } catch (error) {
      console.error("Error calculating tokens:", error);
      setEstimatedTokens(null);
      setUsdValue(null);
    }
  };

  // Handle donation confirmation
  const handleConfirmDonation = () => {
    if (!selectedCrypto || !selectedNetwork || !donationAmount || parseFloat(donationAmount) <= 0) {
      setError("Please enter a valid donation amount");
      return;
    }
    
    setDonationStep('confirmation');
  };

  // Switch to the correct network if needed
  const switchNetwork = async (networkId: string): Promise<boolean> => {
    try {
      if (!walletConnected) {
        throw new Error("Please connect your wallet first");
      }
      
      setError(null); // Clear any previous error
      
      const networkTypeMap: Record<string, NetworkType> = {
        'ethereum': 'ethereum',
        'polygon': 'polygon',
        'bsc': 'binance'
      };
      
      const networkType = networkTypeMap[networkId];
      if (!networkType) {
        throw new Error(`Network ${networkId} is not supported for direct wallet transactions`);
      }
      
      // Show processing message
      setError("Requesting network switch... Please confirm in your wallet.");
      
      try {
        await web3Service.switchNetwork(networkType);
        setCurrentNetwork(networkId);
        setError(null); // Clear message after success
        return true;
      } catch (switchError: any) {
        console.error("Error switching network:", switchError);
        setError(`Unable to switch to ${selectedNetwork?.name}: ${switchError.message}`);
        return false;
      }
    } catch (error: any) {
      console.error("Error preparing network switch:", error);
      setError(error.message || "Error attempting to switch network");
      return false;
    }
  };

  // Handle the donation transaction
  const processDonation = async () => {
    setIsProcessing(true);
    setError(null);
    setDonationStep('processing');
    
    try {
      if (!selectedCrypto || !selectedNetwork || !donationAmount) {
        throw new Error("Missing donation details");
      }
      
      if (!walletConnected) {
        throw new Error("Please connect your wallet first");
      }
      
      if (selectedNetwork.id === 'bitcoin' && selectedCrypto.symbol === 'BTC') {
        // For Bitcoin, we just show the address as we can't directly process the transaction
        setDonationStep('success');
        return;
      }
      
      // Make sure we're on the correct network
      if (currentNetwork !== selectedNetwork.id) {
        const switched = await switchNetwork(selectedNetwork.id);
        if (!switched) {
          throw new Error("Network switching failed. Please switch manually and try again.");
        }
      }
      
      if (selectedCrypto.symbol === 'ETH') {
        // For ETH (native token), send a direct transaction
        const networkAddresses = DONATION_ADDRESSES[selectedNetwork.id as keyof typeof DONATION_ADDRESSES];
        
        if (!networkAddresses || !('ETH' in networkAddresses)) {
          throw new Error("ETH recipient address not configured for this network");
        }
        
        const recipientAddress = networkAddresses['ETH' as keyof typeof networkAddresses];
        if (!recipientAddress) {
          throw new Error("Recipient address not configured for this network");
        }
        
        const transaction = await web3Service.sendTransaction(
          recipientAddress,
          donationAmount,
          `Gate33 Donation`
        );
        
        setTransactionHash(transaction.hash);
        
        // Register the ETH donation for G33 token distribution
        try {
          await tokenService.registerTokenDonation(
            walletAddress,
            parseFloat(donationAmount),
            selectedCrypto.symbol,
            transaction.hash,
            selectedNetwork.id
          );
        } catch (tokenError) {
          console.error("Error registering tokens (transaction completed):", tokenError);
          // Do not fail the main transaction if token registration fails
        }
        
        setDonationStep('success');
      } else {
        // For USDT or other tokens, need to use contract methods
        const cryptoSymbol = selectedCrypto.symbol;
        const networkId = selectedNetwork.id as keyof typeof TOKEN_ADDRESSES;
        
        const tokenNetworkAddresses = TOKEN_ADDRESSES[networkId];
        if (!tokenNetworkAddresses) {
          throw new Error(`No tokens configured for network ${selectedNetwork.name}`);
        }
        
        const tokenAddress = tokenNetworkAddresses[cryptoSymbol as keyof typeof tokenNetworkAddresses];
        if (!tokenAddress) {
          throw new Error(`${cryptoSymbol} token address not configured for ${selectedNetwork.name}`);
        }
        
        const networkAddresses = DONATION_ADDRESSES[networkId];
        if (!networkAddresses) {
          throw new Error(`No donation addresses configured for network ${selectedNetwork.name}`);
        }
        
        const recipientAddress = networkAddresses[cryptoSymbol as keyof typeof networkAddresses];
        if (!recipientAddress) {
          throw new Error(`${cryptoSymbol} recipient address not configured for ${selectedNetwork.name}`);
        }
        
        // Connect to provider and token contract
        const provider = new ethers.providers.Web3Provider(window.ethereum);
        const signer = provider.getSigner();
        
        // ERC20 Token ABI - just the functions we need
        const tokenABI = [
          "function approve(address spender, uint256 amount) external returns (bool)",
          "function transfer(address recipient, uint256 amount) external returns (bool)",
          "function balanceOf(address account) external view returns (uint256)",
          "function decimals() external view returns (uint8)"
        ];
        
        const tokenContract = new ethers.Contract(tokenAddress, tokenABI, signer);
        
        // Get token decimals
        const decimals = await tokenContract.decimals();
        
        // Convert amount to token units
        const amount = ethers.utils.parseUnits(donationAmount, decimals);
        
        // Send the token transfer transaction
        const tx = await tokenContract.transfer(recipientAddress, amount);
        
        setTransactionHash(tx.hash);
        
        // Register the donation for future G33 token distribution
        try {
          const donorAddress = await signer.getAddress();
          await tokenService.registerTokenDonation(
            donorAddress,
            parseFloat(donationAmount),
            selectedCrypto.symbol,
            tx.hash,
            selectedNetwork.id
          );
        } catch (tokenError) {
          console.error("Error registering tokens (transaction completed):", tokenError);
          // Do not fail the main transaction if token registration fails
        }
        
        setDonationStep('success');
      }
    } catch (error: any) {
      console.error("Donation error:", error);
      setError(error.message || "An error occurred while processing your donation");
      setDonationStep('error');
    } finally {
      setIsProcessing(false);
    }
  };

  // Reset the flow
  const resetDonation = () => {
    setSelectedCrypto(null);
    setSelectedNetwork(null);
    setDonationAmount('');
    setDonationStep('select_crypto');
    setError(null);
    setTransactionHash(null);
  };

  return (
    <Layout>
      <div className="min-h-screen bg-gray-900 text-white">
        {/* Hero Section */}
        <section className="relative py-20 px-4 sm:px-6 lg:px-8 overflow-hidden">
          <div className="absolute inset-0 z-0 opacity-20">
            <div className="absolute inset-0 bg-gradient-to-r from-orange-500 to-purple-600" />
          </div>
          
          <div className="max-w-7xl mx-auto relative z-10">
            <div className="text-center">
              <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4">
                Support <span className="text-orange-500">Gate33</span>
              </h1>
              <p className="text-xl md:text-2xl text-gray-300 max-w-3xl mx-auto">
                Help us build a safer Web3 job marketplace by contributing to our project
              </p>
              
              <div className="mt-10 flex justify-center">
                <div className="inline-flex rounded-md shadow">
                  <WalletButton
                    onConnect={handleConnect}
                    onDisconnect={handleDisconnect}
                    className="px-8 py-3"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Project Description */}
        <section className="py-16 px-4 sm:px-6 lg:px-8 bg-gray-900">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold mb-8 text-center">Our Mission</h2>
            <div className="prose prose-lg prose-invert max-w-none">
              <p className="mb-6">
                Gate33 was created with a clear purpose: to establish a secure environment for Web3 job seekers. Through rigorous manual validation of companies using our platform, we prevent fraud that often turns dream job opportunities into nightmares.
              </p>
              <p className="mb-6">
                Our platform goes beyond traditional job boards by incorporating innovative features like our InstantJobs system, which provides a competitive edge over other solutions in the market. This feature allows professionals to take on small tasks and projects, creating additional income streams while building their portfolios.
              </p>
              <p className="mb-6">
                At Gate33, we prioritize security over profit. Every company undergoes a thorough verification process before they can post jobs, and we continuously monitor the quality of published opportunities. Our blockchain-based infrastructure ensures data integrity while our Learn2Earn system rewards candidates for improving their professional skills.
              </p>
              <p>
                Your donations will directly support the continued development of Gate33, helping us create more tools and features to protect and empower job seekers in the Web3 space.
              </p>
            </div>
          </div>
        </section>

        {/* Donation Form */}
        <section className="py-16 px-4 sm:px-6 lg:px-8 bg-gray-800">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-3xl font-bold mb-8 text-center">Make a Donation</h2>
            
            {/* Token reward explanation */}
            <div className="bg-gray-900 p-6 rounded-lg shadow-lg mb-8">
              <h3 className="text-xl font-semibold mb-4">Souvenir Token</h3>
              <p className="text-gray-300 mb-4">
                As a thank you for your donation, you will receive G33 tokens as a memento. These tokens serve as a digital souvenir of your contribution to the Gate33 project.
              </p>
              <p className="text-gray-300">
                While we currently don't have specific plans for the utility of these tokens, they may eventually bring advantages on the platform as a form of recognition for your early support.
              </p>
            </div>
            
            {/* Donation Flow */}
            <div className="bg-gray-900 p-6 rounded-lg shadow-lg">
              {donationStep === 'select_crypto' && (
                <div>
                  <h3 className="text-xl font-semibold mb-4">1. Select Cryptocurrency</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {cryptocurrencies.map((crypto) => (
                      <div 
                        key={crypto.symbol}
                        className="p-4 rounded-lg cursor-pointer border border-gray-700 hover:border-orange-500 hover:bg-gray-800 transition duration-200"
                        onClick={() => handleCryptoSelect(crypto)}
                      >
                        <div className="flex items-center">
                          <div className="w-10 h-10 mr-3 flex-shrink-0">
                            <div className="w-full h-full bg-gray-700 rounded-full flex items-center justify-center">
                              {crypto.symbol}
                            </div>
                          </div>
                          <div>
                            <h4 className="font-medium">{crypto.name}</h4>
                            <p className="text-sm text-gray-400">{crypto.symbol}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {donationStep === 'select_network' && selectedCrypto && (
                <div>
                  <button 
                    onClick={() => setDonationStep('select_crypto')} 
                    className="mb-4 text-orange-400 hover:text-orange-300 flex items-center"
                  >
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path>
                    </svg>
                    Back to Cryptocurrencies
                  </button>
                  
                  <h3 className="text-xl font-semibold mb-4">2. Select Network</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {networks
                      .filter(network => selectedCrypto.networks.includes(network.id))
                      .map((network) => (
                        <div 
                          key={network.id}
                          className="p-4 rounded-lg cursor-pointer border border-gray-700 hover:border-orange-500 hover:bg-gray-800 transition duration-200"
                          onClick={() => handleNetworkSelect(network)}
                        >
                          <div className="flex items-center">
                            <div className="w-10 h-10 mr-3 flex-shrink-0">
                              <div className="w-full h-full bg-gray-700 rounded-full flex items-center justify-center">
                                {network.id.substring(0, 3).toUpperCase()}
                              </div>
                            </div>
                            <div>
                              <h4 className="font-medium">{network.name}</h4>
                              <p className="text-sm text-gray-400">
                                Supports: {network.supportedTokens.join(', ')}
                              </p>
                            </div>
                          </div>
                        </div>
                    ))}
                  </div>
                </div>
              )}

              {donationStep === 'enter_amount' && selectedCrypto && selectedNetwork && (
                <div>
                  <button 
                    onClick={() => selectedCrypto.networks.length > 1 ? setDonationStep('select_network') : setDonationStep('select_crypto')} 
                    className="mb-4 text-orange-400 hover:text-orange-300 flex items-center"
                  >
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path>
                    </svg>
                    Back
                  </button>
                  
                  <h3 className="text-xl font-semibold mb-4">3. Enter Donation Amount</h3>
                  
                  <div className="mb-6">
                    <div className="flex items-center bg-gray-800 rounded-lg p-3 border border-gray-700">
                      <div className="mr-3">
                        <div className="w-10 h-10 bg-gray-700 rounded-full flex items-center justify-center">
                          {selectedCrypto.symbol}
                        </div>
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">{selectedCrypto.name}</p>
                        <p className="text-sm text-gray-400">on {selectedNetwork.name}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mb-6">
                    <label htmlFor="amount" className="block text-sm font-medium text-gray-400 mb-2">
                      Amount ({selectedCrypto.symbol})
                    </label>
                    <div className="mt-1 relative rounded-md shadow-sm">
                      <input
                        type="text"
                        id="amount"
                        className="bg-gray-800 focus:ring-orange-500 focus:border-orange-500 block w-full pr-12 sm:text-sm border-gray-700 rounded-md p-3"
                        placeholder="0.00"
                        value={donationAmount}
                        onChange={handleAmountChange}
                      />
                      <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                        <span className="text-gray-500 sm:text-sm">
                          {selectedCrypto.symbol}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Display USD value and estimated tokens */}
                  {usdValue !== null && estimatedTokens !== null && (
                    <div className="mt-4 p-4 bg-gray-800/60 border border-orange-500/20 rounded-lg text-center">
                      <p className="text-sm text-gray-300 mb-2">Estimated value of your donation:</p>
                      <p className="text-xl font-bold text-white mb-1">
                        ${usdValue.toFixed(2)} <span className="text-gray-400">USD</span>
                      </p>
                      <p className="text-sm text-gray-400 mb-2">You will receive approximately:</p>
                      <p className="text-2xl font-bold text-orange-500 mb-1">
                        {Math.floor(estimatedTokens)} <span className="text-gray-300">G33 Tokens</span>
                      </p>
                      <p className="text-xs text-gray-400 mt-2">1 G33 Token for each $1 USD donated</p>
                    </div>
                  )}
                  
                  <div className="flex justify-center">
                    <button
                      type="button"
                      className="px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
                      onClick={handleConfirmDonation}
                      disabled={!donationAmount || parseFloat(donationAmount) <= 0}
                    >
                      Continue
                    </button>
                  </div>
                </div>
              )}

              {donationStep === 'confirmation' && selectedCrypto && selectedNetwork && (
                <div>
                  <button 
                    onClick={() => setDonationStep('enter_amount')} 
                    className="mb-4 text-orange-400 hover:text-orange-300 flex items-center"
                  >
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path>
                    </svg>
                    Back
                  </button>
                  
                  <h3 className="text-xl font-semibold mb-4">4. Confirm Your Donation</h3>
                  
                  <div className="bg-gray-800 rounded-lg p-6 mb-6">
                    <div className="flex justify-between mb-4">
                      <span className="text-gray-400">Amount:</span>
                      <span className="font-medium">
                        {donationAmount} {selectedCrypto.symbol}
                      </span>
                    </div>
                    
                    <div className="flex justify-between mb-4">
                      <span className="text-gray-400">Network:</span>
                      <span className="font-medium">
                        {selectedNetwork.name}
                      </span>
                    </div>
                    
                    {selectedNetwork.id === 'bitcoin' && selectedCrypto.symbol === 'BTC' ? (
                      <div className="mt-6 p-4 bg-gray-900 rounded-lg">
                        <p className="text-center mb-2 text-sm text-gray-400">Send BTC to this address:</p>
                        <div className="bg-gray-700 p-3 rounded text-center break-all">
                          {DONATION_ADDRESSES.bitcoin.BTC}
                        </div>
                      </div>
                    ) : (
                      <div className="mt-6">
                        {walletConnected ? (
                          <div>
                            <p className="text-xs text-gray-400 mb-2">
                              Connected wallet: {walletAddress.substring(0, 6)}...{walletAddress.substring(walletAddress.length - 4)}
                            </p>
                            
                            {currentNetwork !== selectedNetwork.id && (
                              <div className="p-3 bg-yellow-900/30 border border-yellow-800/50 rounded-lg mb-4">
                                <p className="text-sm mb-3">
                                  You need to switch to {selectedNetwork.name} network to continue.
                                </p>
                                <button
                                  type="button"
                                  className="w-full px-4 py-2 text-sm font-medium rounded-md text-white bg-yellow-600 hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500"
                                  onClick={() => switchNetwork(selectedNetwork.id)}
                                >
                                  Switch to {selectedNetwork.name}
                                </button>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="p-3 bg-yellow-900/30 border border-yellow-800/50 rounded-lg mb-4">
                            <p className="text-sm">
                              Please connect your wallet to proceed with the donation.
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  
                  <div className="flex justify-center">
                    {selectedNetwork.id === 'bitcoin' && selectedCrypto.symbol === 'BTC' ? (
                      <button
                        type="button"
                        className="px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                        onClick={() => setDonationStep('success')}
                      >
                        I've Sent the Bitcoin
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
                        onClick={processDonation}
                        disabled={!walletConnected || isProcessing}
                      >
                        {isProcessing ? "Processing..." : "Complete Donation"}
                      </button>
                    )}
                  </div>
                </div>
              )}

              {donationStep === 'processing' && (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-orange-500 mx-auto mb-4"></div>
                  <h3 className="text-xl font-semibold mb-2">Processing Your Donation</h3>
                  <p className="text-gray-400">Please confirm the transaction in your wallet when prompted</p>
                </div>
              )}

              {donationStep === 'success' && (
                <DonationThankYouCard
                  tokenAmount={estimatedTokens || 0}
                  transactionHash={transactionHash || undefined}
                  networkName={selectedNetwork?.name || 'Polygon'}
                  onNewDonation={resetDonation}
                />
              )}

              {donationStep === 'error' && error && (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                    </svg>
                  </div>
                  
                  <h3 className="text-xl font-semibold mb-2">Transaction Failed</h3>
                  <p className="text-gray-400 mb-4">{error}</p>
                  
                  <div className="mt-6">
                    <button
                      type="button"
                      className="px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
                      onClick={() => setDonationStep('confirmation')}
                    >
                      Try Again
                    </button>
                  </div>
                </div>
              )}
              
              {error && donationStep !== 'error' && (
                <div className="mt-4 p-3 bg-red-900/30 border border-red-800/50 rounded-lg">
                  <p className="text-sm text-red-400">{error}</p>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="py-16 px-4 sm:px-6 lg:px-8 bg-gray-900">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold mb-8 text-center">Frequently Asked Questions</h2>
            
            <div className="space-y-6">
              <div className="bg-gray-800 rounded-lg p-6">
                <h3 className="text-xl font-semibold mb-2">How are donations used?</h3>
                <p className="text-gray-400">
                  All donations go directly toward developing and maintaining the Gate33 platform. This includes improving security features, expanding our verification processes, and building new tools to protect job seekers in the Web3 space.
                </p>
              </div>
              
              <div className="bg-gray-800 rounded-lg p-6">
                <h3 className="text-xl font-semibold mb-2">What are the G33 tokens I'll receive?</h3>
                <p className="text-gray-400">
                  The G33 tokens you receive are digital souvenirs as a thank you for your contribution. While they don't currently have specific functionality, they serve as a memento of your early support for Gate33. In the future, these tokens may offer benefits within our platform as a way to show appreciation to our early supporters.
                </p>
              </div>
              
              <div className="bg-gray-800 rounded-lg p-6">
                <h3 className="text-xl font-semibold mb-2">Can I donate using a non-crypto payment method?</h3>
                <p className="text-gray-400">
                  Currently, we only accept cryptocurrency donations. This aligns with our focus on Web3 technologies and provides greater transparency regarding how funds are utilized.
                </p>
              </div>
              
              <div className="bg-gray-800 rounded-lg p-6">
                <h3 className="text-xl font-semibold mb-2">Is my donation tax-deductible?</h3>
                <p className="text-gray-400">
                  Gate33 is not a registered charitable organization, so donations are not tax-deductible. Please consult with a tax professional regarding the tax implications of cryptocurrency donations in your jurisdiction.
                </p>
              </div>
              
              <div className="bg-gray-800 rounded-lg p-6">
                <h3 className="text-xl font-semibold mb-2">What makes Gate33 different from other job platforms?</h3>
                <p className="text-gray-400">
                  Gate33 differentiates itself through three main factors: (1) Rigorous company verification to prevent fraud; (2) Use of blockchain technology to ensure data security; (3) Learn2Earn system that allows candidates to earn tokens while improving their professional skills. Additionally, our InstantJobs feature provides flexible work opportunities beyond traditional employment models.
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </Layout>
  );
}