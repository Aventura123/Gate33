// File: app/crypto-tools/components/SearchFilterBar.tsx
'use client';

import Image from 'next/image';
import { useState, useEffect } from 'react';
import { SearchFilterBarProps } from '@/app/crypto-tools/types';

export default function SearchFilterBar({ 
  selectedCryptos, 
  timeFilter,
  searchQuery,
  showComparison,
  onSearchChange, 
  onRemoveTag, 
  onClearAll, 
  onTimeFilterChange,
  onToggleComparison
}: SearchFilterBarProps) {
  const [localSearchQuery, setLocalSearchQuery] = useState<string>(searchQuery);

  // Update local search query when prop changes
  useEffect(() => {
    setLocalSearchQuery(searchQuery);
  }, [searchQuery]);

  const handleSearchInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setLocalSearchQuery(value);
    onSearchChange(value);
  };

  // Function to get placeholder image URL for cryptocurrencies
  const getPlaceholderUrl = (size: number = 20) => {
    return `/api/placeholder/${size}/${size}`;
  };
  return (
    <div className="bg-black/40 border border-[#fb923c]/20 rounded-xl p-4 sm:p-6 mb-6 flex flex-col gap-3 sm:gap-4">
      <div className="flex flex-col sm:flex-row sm:justify-between gap-3 sm:gap-4">
        <input 
          type="text" 
          placeholder="Search cryptocurrency..." 
          className="flex-1 min-w-0 sm:min-w-[300px] py-2.5 sm:py-3 px-3 sm:px-4 bg-[#141414]/80 border border-[#333] rounded-lg text-white text-sm sm:text-base focus:outline-none focus:border-[#fb923c]" 
          value={localSearchQuery}
          onChange={handleSearchInput}
        />
        
        <div className="flex gap-1.5 sm:gap-2 justify-center sm:justify-start">
          <button 
            className={`bg-[#333] border-none px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg cursor-pointer font-medium text-sm sm:text-base transition-all ${timeFilter === '24h' ? 'bg-[#fb923c] text-white' : 'text-[#e5e5e5] hover:bg-[#444]'}`}
            onClick={() => onTimeFilterChange('24h')}
          >
            24h
          </button>
          <button 
            className={`bg-[#333] border-none px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg cursor-pointer font-medium text-sm sm:text-base transition-all ${timeFilter === '7d' ? 'bg-[#fb923c] text-white' : 'text-[#e5e5e5] hover:bg-[#444]'}`}
            onClick={() => onTimeFilterChange('7d')}
          >
            7d
          </button>
          <button 
            className={`bg-[#333] border-none px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg cursor-pointer font-medium text-sm sm:text-base transition-all ${timeFilter === '1h' ? 'bg-[#fb923c] text-white' : 'text-[#e5e5e5] hover:bg-[#444]'}`}
            onClick={() => onTimeFilterChange('1h')}
          >
            1h
          </button>
        </div>
      </div>      
      <div className="flex flex-wrap gap-1.5 sm:gap-2 mt-3 sm:mt-4">
        {selectedCryptos.map(crypto => (
          <div key={crypto.id || crypto.symbol} className="bg-[#323232]/80 rounded-full py-1 px-2 sm:px-3 flex items-center gap-1.5 sm:gap-2">
            {crypto.image ? (
              <Image 
                src={crypto.image} 
                alt={crypto.name} 
                width={16} 
                height={16} 
                className="rounded-full sm:w-5 sm:h-5"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.onerror = null;
                  target.src = getPlaceholderUrl();
                }}
              />
            ) : (
              <Image 
                src={getPlaceholderUrl()}
                alt={crypto.name}
                width={16}
                height={16}
                className="rounded-full sm:w-5 sm:h-5"
              />
            )}
            <span className="text-xs sm:text-sm">{crypto.symbol.toUpperCase()}</span>
            <button 
              className="text-[#999] bg-none border-none ml-0.5 sm:ml-1 cursor-pointer text-sm sm:text-base hover:text-[#ff4136]"
              onClick={() => onRemoveTag(crypto.symbol)}
            >
              ×
            </button>
          </div>
        ))}
        {selectedCryptos.length > 0 && (
          <button 
            className="bg-none border-none text-[#fb923c] cursor-pointer text-xs sm:text-sm underline"
            onClick={onClearAll}
          >
            Clear all
          </button>
        )}
      </div>
      
      {selectedCryptos.length > 1 && (
        <div className="mt-2 sm:mt-2">
          <button 
            className="w-full sm:w-auto bg-[#2563eb] text-white px-4 py-2 rounded-lg border-none cursor-pointer font-medium text-sm sm:text-base transition-all hover:bg-[#1d4ed8]"
            onClick={onToggleComparison}
          >
            {showComparison ? 'Hide' : 'Show'} Comparison
          </button>
        </div>
      )}
    </div>
  );
}