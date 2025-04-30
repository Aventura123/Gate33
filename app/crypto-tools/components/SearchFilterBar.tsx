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
    <div className="bg-black/40 border border-[#fb923c]/20 rounded-xl p-6 mb-6 flex flex-col gap-4">
      <div className="flex justify-between flex-wrap gap-4">
        <input 
          type="text" 
          placeholder="Search cryptocurrency..." 
          className="flex-1 min-w-[300px] py-3 px-4 bg-[#141414]/80 border border-[#333] rounded-lg text-white text-base focus:outline-none focus:border-[#fb923c]" 
          value={localSearchQuery}
          onChange={handleSearchInput}
        />
        
        <div className="flex gap-2">
          <button 
            className={`bg-[#333] border-none px-4 py-2 rounded-lg cursor-pointer font-medium transition-all ${timeFilter === '24h' ? 'bg-[#fb923c] text-white' : 'text-[#e5e5e5] hover:bg-[#444]'}`}
            onClick={() => onTimeFilterChange('24h')}
          >
            24h
          </button>
          <button 
            className={`bg-[#333] border-none px-4 py-2 rounded-lg cursor-pointer font-medium transition-all ${timeFilter === '7d' ? 'bg-[#fb923c] text-white' : 'text-[#e5e5e5] hover:bg-[#444]'}`}
            onClick={() => onTimeFilterChange('7d')}
          >
            7d
          </button>
          <button 
            className={`bg-[#333] border-none px-4 py-2 rounded-lg cursor-pointer font-medium transition-all ${timeFilter === '1h' ? 'bg-[#fb923c] text-white' : 'text-[#e5e5e5] hover:bg-[#444]'}`}
            onClick={() => onTimeFilterChange('1h')}
          >
            1h
          </button>
        </div>
      </div>
      
      <div className="flex flex-wrap gap-2 mt-4">
        {selectedCryptos.map(crypto => (
          <div key={crypto.id || crypto.symbol} className="bg-[#323232]/80 rounded-full py-1 px-3 flex items-center gap-2">
            {crypto.image ? (
              <Image 
                src={crypto.image} 
                alt={crypto.name} 
                width={20} 
                height={20} 
                className="rounded-full"
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
                width={20}
                height={20}
                className="rounded-full"
              />
            )}
            <span>{crypto.symbol.toUpperCase()}</span>
            <button 
              className="text-[#999] bg-none border-none ml-1 cursor-pointer text-base hover:text-[#ff4136]"
              onClick={() => onRemoveTag(crypto.symbol)}
            >
              ×
            </button>
          </div>
        ))}
        {selectedCryptos.length > 0 && (
          <button 
            className="bg-none border-none text-[#fb923c] cursor-pointer text-sm underline"
            onClick={onClearAll}
          >
            Clear all
          </button>
        )}
      </div>
      
      {selectedCryptos.length > 1 && (
        <div className="mt-2">
          <button 
            className="bg-[#2563eb] text-white px-4 py-2 rounded-lg border-none cursor-pointer font-medium transition-all hover:bg-[#1d4ed8]"
            onClick={onToggleComparison}
          >
            {showComparison ? 'Hide' : 'Show'} Comparison
          </button>
        </div>
      )}
    </div>
  );
}