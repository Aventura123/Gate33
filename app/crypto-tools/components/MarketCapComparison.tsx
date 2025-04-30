'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Image from 'next/image';
import { Tab } from '@headlessui/react';
import { ChevronRightIcon } from '@heroicons/react/24/solid';

interface CryptoData {
  id: string;
  symbol: string;
  name: string;
  image: string;
  current_price: number;
  market_cap: number;
  circulating_supply: number;
}

interface MarketCapComparisonProps {
  allCryptoData: CryptoData[];
  loading: boolean;
}

export default function MarketCapComparison({ allCryptoData, loading }: MarketCapComparisonProps) {
  const [baseCrypto, setBaseCrypto] = useState<CryptoData | null>(null);
  const [targetCrypto, setTargetCrypto] = useState<CryptoData | null>(null);
  const [customMarketCap, setCustomMarketCap] = useState<string>('');
  const [searchBase, setSearchBase] = useState<string>('');
  const [searchTarget, setSearchTarget] = useState<string>('');
  const [activeTab, setActiveTab] = useState<number>(0);

  useEffect(() => {
    // Set Bitcoin as default target crypto if available
    const btc = allCryptoData.find(crypto => crypto.symbol.toLowerCase() === 'btc');
    if (btc && !targetCrypto) {
      setTargetCrypto(btc);
    }
    
    // Set XRP as default base crypto if available
    const xrp = allCryptoData.find(crypto => crypto.symbol.toLowerCase() === 'xrp');
    if (xrp && !baseCrypto) {
      setBaseCrypto(xrp);
    }
  }, [allCryptoData, baseCrypto, targetCrypto]);
  
  // Filter cryptocurrencies for selection
  const filteredBaseCryptos = useMemo(() => {
    if (!searchBase) return allCryptoData.slice(0, 20);
    
    return allCryptoData.filter(crypto => 
      crypto.name.toLowerCase().includes(searchBase.toLowerCase()) || 
      crypto.symbol.toLowerCase().includes(searchBase.toLowerCase())
    ).slice(0, 20);
  }, [allCryptoData, searchBase]);
  
  const filteredTargetCryptos = useMemo(() => {
    if (!searchTarget) return allCryptoData.slice(0, 20);
    
    return allCryptoData.filter(crypto => 
      crypto.name.toLowerCase().includes(searchTarget.toLowerCase()) || 
      crypto.symbol.toLowerCase().includes(searchTarget.toLowerCase())
    ).slice(0, 20);
  }, [allCryptoData, searchTarget]);
  
  // Function to get placeholder image URL
  const getPlaceholderUrl = (size: number = 32) => {
    return `/api/placeholder/${size}/${size}`;
  };
  
  // Calculate projected price
  const projectedPrice = useMemo(() => {
    if (!baseCrypto || (!targetCrypto && !customMarketCap)) return null;
    
    // If we have a custom market cap, use it
    if (activeTab === 1 && customMarketCap) {
      const customMcap = parseFloat(customMarketCap.replace(/,/g, ''));
      if (isNaN(customMcap) || customMcap <= 0) return null;
      
      return (customMcap / baseCrypto.circulating_supply);
    }
    
    // Otherwise, use the target crypto's market cap
    if (targetCrypto) {
      return (targetCrypto.market_cap / baseCrypto.circulating_supply);
    }
    
    return null;
  }, [baseCrypto, targetCrypto, customMarketCap, activeTab]);
  
  // Calculate multiplier
  const priceMultiplier = useMemo(() => {
    if (!projectedPrice || !baseCrypto) return null;
    return projectedPrice / baseCrypto.current_price;
  }, [projectedPrice, baseCrypto]);
  
  // Format values
  const formatCurrency = (value: number | null) => {
    if (value === null) return 'N/A';
    
    // For very large values
    if (value >= 1e12) return `$${(value / 1e12).toFixed(2)}T`;
    if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
    if (value >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
    
    // For small or normal values
    if (value >= 1) return `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    if (value >= 0.01) return `$${value.toFixed(4)}`;
    if (value >= 0.0001) return `$${value.toFixed(6)}`;
    
    // For very small values
    return `$${value.toExponential(6)}`;
  };
  
  const formatMultiplier = (value: number | null) => {
    if (value === null) return 'N/A';
    if (value < 1) return `${value.toFixed(2)}x`;
    return `${value.toLocaleString('en-US', { maximumFractionDigits: 2 })}x`;
  };

  if (loading) {
    return (
      <div className="p-6 bg-black/40 border border-[#fb923c]/20 rounded-xl mt-8 flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-solid border-[#fb923c] border-r-transparent"></div>
        <p className="ml-3 text-[#e5e5e5]">Loading market data...</p>
      </div>
    );
  }

  return (
    <div className="bg-black/40 border border-[#fb923c]/20 rounded-xl p-6 mt-8">
      <h2 className="text-2xl font-bold text-[#fb923c] mb-6">Market Cap Comparison</h2>
      
      <Tab.Group selectedIndex={activeTab} onChange={setActiveTab}>
        <Tab.List className="flex space-x-2 p-1 bg-black/20 rounded-xl mb-6">
          <Tab className={({ selected }) => `
            w-full py-2.5 text-sm font-medium leading-5 text-[#e5e5e5] rounded-lg transition-all
            ${selected 
                ? 'bg-[#fb923c] text-white shadow'
                : 'hover:bg-[#fb923c]/20'}
          `}>
            Crypto-to-Crypto
          </Tab>
          <Tab className={({ selected }) => `
            w-full py-2.5 text-sm font-medium leading-5 text-[#e5e5e5] rounded-lg transition-all
            ${selected 
                ? 'bg-[#fb923c] text-white shadow'
                : 'hover:bg-[#fb923c]/20'}
          `}>
            Custom Market Cap
          </Tab>
        </Tab.List>
        
        <Tab.Panels>
          {/* Crypto-to-Crypto Comparison Panel */}
          <Tab.Panel>
            <div className="grid grid-cols-1 lg:grid-cols-7 gap-4 mb-8 items-center">
              {/* Base crypto selection */}
              <div className="lg:col-span-3">
                <label className="block text-sm font-medium text-[#e5e5e5] mb-1">Base Crypto</label>
                <div className="relative">
                  <input
                    type="text"
                    value={searchBase}
                    onChange={e => setSearchBase(e.target.value)}
                    placeholder="Search..."
                    className="w-full bg-[#141414]/80 border border-[#333] rounded-lg text-white text-base p-3 pl-10 focus:outline-none focus:border-[#fb923c]"
                  />
                  <span className="absolute left-3 top-[14px] text-[#999]">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </span>
                </div>
                <div className="mt-2 max-h-60 overflow-y-auto bg-[#141414]/80 border border-[#333] rounded-lg">
                  {filteredBaseCryptos.map(crypto => (
                    <div 
                      key={crypto.id} 
                      className={`flex items-center p-3 cursor-pointer hover:bg-[#323232]/30 ${baseCrypto?.id === crypto.id ? 'bg-[#fb923c]/10' : ''}`}
                      onClick={() => setBaseCrypto(crypto)}
                    >
                      <Image 
                        src={crypto.image || getPlaceholderUrl()}
                        alt={crypto.name}
                        width={24}
                        height={24}
                        className="rounded-full mr-3"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.onerror = null;
                          target.src = getPlaceholderUrl();
                        }}
                      />
                      <div>
                        <div className="font-medium">{crypto.name}</div>
                        <div className="text-[#999] text-sm">{crypto.symbol.toUpperCase()}</div>
                      </div>
                      <div className="ml-auto text-right">
                        <div className="font-medium">{formatCurrency(crypto.current_price)}</div>
                        <div className="text-[#999] text-sm">Mcap: {formatCurrency(crypto.market_cap)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Arrow icon */}
              <div className="flex justify-center">
                <ChevronRightIcon className="h-8 w-8 text-[#fb923c]" />
              </div>
              
              {/* Target crypto selection */}
              <div className="lg:col-span-3">
                <label className="block text-sm font-medium text-[#e5e5e5] mb-1">Target Crypto</label>
                <div className="relative">
                  <input
                    type="text"
                    value={searchTarget}
                    onChange={e => setSearchTarget(e.target.value)}
                    placeholder="Search..."
                    className="w-full bg-[#141414]/80 border border-[#333] rounded-lg text-white text-base p-3 pl-10 focus:outline-none focus:border-[#fb923c]"
                  />
                  <span className="absolute left-3 top-[14px] text-[#999]">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </span>
                </div>
                <div className="mt-2 max-h-60 overflow-y-auto bg-[#141414]/80 border border-[#333] rounded-lg">
                  {filteredTargetCryptos.map(crypto => (
                    <div 
                      key={crypto.id} 
                      className={`flex items-center p-3 cursor-pointer hover:bg-[#323232]/30 ${targetCrypto?.id === crypto.id ? 'bg-[#fb923c]/10' : ''}`}
                      onClick={() => setTargetCrypto(crypto)}
                    >
                      <Image 
                        src={crypto.image || getPlaceholderUrl()}
                        alt={crypto.name}
                        width={24}
                        height={24}
                        className="rounded-full mr-3"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.onerror = null;
                          target.src = getPlaceholderUrl();
                        }}
                      />
                      <div>
                        <div className="font-medium">{crypto.name}</div>
                        <div className="text-[#999] text-sm">{crypto.symbol.toUpperCase()}</div>
                      </div>
                      <div className="ml-auto text-right">
                        <div className="font-medium">{formatCurrency(crypto.current_price)}</div>
                        <div className="text-[#999] text-sm">Mcap: {formatCurrency(crypto.market_cap)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Tab.Panel>
          
          {/* Custom Market Cap Panel */}
          <Tab.Panel>
            <div className="grid grid-cols-1 lg:grid-cols-7 gap-4 mb-8 items-center">
              {/* Base crypto selection */}
              <div className="lg:col-span-3">
                <label className="block text-sm font-medium text-[#e5e5e5] mb-1">Base Crypto</label>
                <div className="relative">
                  <input
                    type="text"
                    value={searchBase}
                    onChange={e => setSearchBase(e.target.value)}
                    placeholder="Search..."
                    className="w-full bg-[#141414]/80 border border-[#333] rounded-lg text-white text-base p-3 pl-10 focus:outline-none focus:border-[#fb923c]"
                  />
                  <span className="absolute left-3 top-[14px] text-[#999]">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </span>
                </div>
                <div className="mt-2 max-h-60 overflow-y-auto bg-[#141414]/80 border border-[#333] rounded-lg">
                  {filteredBaseCryptos.map(crypto => (
                    <div 
                      key={crypto.id} 
                      className={`flex items-center p-3 cursor-pointer hover:bg-[#323232]/30 ${baseCrypto?.id === crypto.id ? 'bg-[#fb923c]/10' : ''}`}
                      onClick={() => setBaseCrypto(crypto)}
                    >
                      <Image 
                        src={crypto.image || getPlaceholderUrl()}
                        alt={crypto.name}
                        width={24}
                        height={24}
                        className="rounded-full mr-3"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.onerror = null;
                          target.src = getPlaceholderUrl();
                        }}
                      />
                      <div>
                        <div className="font-medium">{crypto.name}</div>
                        <div className="text-[#999] text-sm">{crypto.symbol.toUpperCase()}</div>
                      </div>
                      <div className="ml-auto text-right">
                        <div className="font-medium">{formatCurrency(crypto.current_price)}</div>
                        <div className="text-[#999] text-sm">Mcap: {formatCurrency(crypto.market_cap)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Arrow icon */}
              <div className="flex justify-center">
                <ChevronRightIcon className="h-8 w-8 text-[#fb923c]" />
              </div>
              
              {/* Custom Market Cap input */}
              <div className="lg:col-span-3">
                <label className="block text-sm font-medium text-[#e5e5e5] mb-1">Custom Market Cap ($)</label>
                <input
                  type="text"
                  value={customMarketCap}
                  onChange={e => {
                    // Allow only numbers, commas and dots
                    const value = e.target.value.replace(/[^0-9,.]/g, '');
                    setCustomMarketCap(value);
                  }}
                  placeholder="Ex: 1,000,000,000"
                  className="w-full bg-[#141414]/80 border border-[#333] rounded-lg text-white text-base p-3 focus:outline-none focus:border-[#fb923c]"
                />
                
                {/* Shortcut buttons for common Market Caps */}
                <div className="grid grid-cols-3 gap-2 mt-3">
                  <button 
                    className="bg-[#333] text-[#e5e5e5] p-2 rounded-lg text-sm hover:bg-[#fb923c]/20"
                    onClick={() => setCustomMarketCap('1,000,000,000')}
                  >
                    $1B
                  </button>
                  <button 
                    className="bg-[#333] text-[#e5e5e5] p-2 rounded-lg text-sm hover:bg-[#fb923c]/20"
                    onClick={() => setCustomMarketCap('10,000,000,000')}
                  >
                    $10B
                  </button>
                  <button 
                    className="bg-[#333] text-[#e5e5e5] p-2 rounded-lg text-sm hover:bg-[#fb923c]/20"
                    onClick={() => setCustomMarketCap('100,000,000,000')}
                  >
                    $100B
                  </button>
                  <button 
                    className="bg-[#333] text-[#e5e5e5] p-2 rounded-lg text-sm hover:bg-[#fb923c]/20"
                    onClick={() => setCustomMarketCap('500,000,000,000')}
                  >
                    $500B
                  </button>
                  <button 
                    className="bg-[#333] text-[#e5e5e5] p-2 rounded-lg text-sm hover:bg-[#fb923c]/20"
                    onClick={() => setCustomMarketCap('1,000,000,000,000')}
                  >
                    $1T
                  </button>
                  <button 
                    className="bg-[#333] text-[#e5e5e5] p-2 rounded-lg text-sm hover:bg-[#fb923c]/20"
                    onClick={() => setCustomMarketCap('10,000,000,000,000')}
                  >
                    $10T
                  </button>
                </div>
              </div>
            </div>
          </Tab.Panel>
        </Tab.Panels>
      </Tab.Group>
      
      {/* Comparison results */}
      {baseCrypto && (
        <div className="bg-[#141414]/60 rounded-xl p-6 border border-[#444] text-center">
          <div className="flex items-center justify-center mb-6">
            <div className="flex items-center">
              <Image 
                src={baseCrypto.image || getPlaceholderUrl()}
                alt={baseCrypto.name}
                width={40}
                height={40}
                className="rounded-full"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.onerror = null;
                  target.src = getPlaceholderUrl();
                }}
              />
              <span className="text-xl font-bold text-white ml-3">{baseCrypto.symbol.toUpperCase()}</span>
            </div>
            
            <span className="mx-4 text-[#fb923c] font-bold">WITH</span>
            
            <div className="flex items-center">
              {activeTab === 0 && targetCrypto ? (
                <>
                  <Image 
                    src={targetCrypto.image || getPlaceholderUrl()}
                    alt={targetCrypto.name}
                    width={40}
                    height={40}
                    className="rounded-full"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.onerror = null;
                      target.src = getPlaceholderUrl();
                    }}
                  />
                  <span className="text-xl font-bold text-white ml-3">{targetCrypto.symbol.toUpperCase()}</span>
                </>
              ) : (
                <div className="bg-[#fb923c] h-10 w-10 rounded-full flex items-center justify-center">
                  <span className="text-white font-bold">$</span>
                </div>
              )}
              <span className="text-xl font-bold text-white ml-3">
                {activeTab === 0 && targetCrypto
                  ? `${targetCrypto.symbol.toUpperCase()}'S MARKET CAP`
                  : 'CUSTOM MARKET CAP'
                }
              </span>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-[#1a1a1a] p-4 rounded-xl border border-[#333]">
              <h3 className="text-[#999] font-medium mb-2">Current Price</h3>
              <div className="text-2xl font-bold text-white">{formatCurrency(baseCrypto.current_price)}</div>
            </div>
            
            <div className="bg-[#1a1a1a] p-4 rounded-xl border border-[#333]">
              <h3 className="text-[#999] font-medium mb-2">{activeTab === 0 && targetCrypto ? 'Target' : 'Desired'} Market Cap</h3>
              <div className="text-2xl font-bold text-white">{
                activeTab === 0 && targetCrypto 
                  ? formatCurrency(targetCrypto.market_cap)
                  : customMarketCap ? formatCurrency(parseFloat(customMarketCap.replace(/,/g, ''))) : 'N/A'
              }</div>
            </div>
            
            <div className="bg-gradient-to-r from-[#fb923c]/10 to-[#fb923c]/30 p-4 rounded-xl border border-[#fb923c]/40">
              <h3 className="text-[#fb923c] font-medium mb-2">Projected Price</h3>
              <div className="text-2xl font-bold text-white">
                {formatCurrency(projectedPrice)}
                {priceMultiplier !== null && (
                  <span className="text-[#fb923c] ml-2">
                    ({formatMultiplier(priceMultiplier)})
                  </span>
                )}
              </div>
            </div>
          </div>
          
          <div className="mt-6 text-center text-[#999]">
            <p className="text-sm">
              {baseCrypto.name} ({baseCrypto.symbol.toUpperCase()}) with the market cap {
                activeTab === 0 && targetCrypto 
                  ? `of ${targetCrypto.name} (${targetCrypto.symbol.toUpperCase()})` 
                  : 'entered'
              } would have a price of {formatCurrency(projectedPrice)}.
            </p>
            
            {priceMultiplier !== null && (
              <p className="mt-2 text-sm">
                This represents a multiplier of <span className="text-[#fb923c] font-medium">{formatMultiplier(priceMultiplier)}</span> compared to the current price.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}