// File: app/crypto-tools/components/CryptoTable.tsx
'use client';

import React from 'react';
import Image from 'next/image';

// Atualizando a interface para coincidir com o formato de dados da API CoinGecko
interface Crypto {
  id: string;
  symbol: string;
  name: string;
  image: string;
  current_price: number;
  price_change_percentage_24h: number;
  market_cap: number;
  total_volume: number;
  circulating_supply: number;
  checked?: boolean;
}

export interface CryptoTableProps {
  cryptoData: Crypto[];
  onCheckboxToggle: (id: string) => void;
  onViewDetails: (id: string) => void;
}

export default function CryptoTable({ cryptoData, onCheckboxToggle, onViewDetails }: CryptoTableProps) {
  const formatValue = (value: number | null | undefined, type: string, symbol: string = ''): string => {
    if (value === null || value === undefined) return 'N/A';
    
    switch (type) {
      case 'price':
        return value >= 1 ? `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : 
                           `$${value.toFixed(6)}`;
      case 'percentage':
        return `${value > 0 ? '+' : ''}${value.toFixed(2)}%`;
      case 'marketCap':
        return value >= 1e12 ? `$${(value / 1e12).toFixed(2)}T` :
               value >= 1e9 ? `$${(value / 1e9).toFixed(2)}B` :
               value >= 1e6 ? `$${(value / 1e6).toFixed(2)}M` : 
               `$${value.toLocaleString()}`;
      case 'volume':
        return value >= 1e9 ? `$${(value / 1e9).toFixed(1)}B` :
               value >= 1e6 ? `$${(value / 1e6).toFixed(1)}M` : 
               `$${value.toLocaleString()}`;
      case 'supply':
        return `${value >= 1e9 ? (value / 1e9).toFixed(1) + 'B' :
                value >= 1e6 ? (value / 1e6).toFixed(1) + 'M' : 
                value.toLocaleString()} ${symbol}`;
      default:
        return value.toString();
    }
  };
  
  // Função para obter URL da imagem placeholder para criptomoedas
  const getPlaceholderUrl = (symbol: string, size: number = 32) => {
    return `/api/placeholder/${size}/${size}`;
  };
  
  return (
    <div className="w-full bg-black/40 border border-[#fb923c]/20 rounded-xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead className="bg-[#141414]/80">
            <tr>
              <th className="w-10 p-4 text-left font-medium text-[#e5e5e5]"></th>
              <th className="w-12 p-4 text-left font-medium text-[#e5e5e5]">
                <button className="bg-none border-none text-[#e5e5e5] font-medium cursor-pointer flex items-center p-0 hover:text-[#fb923c]">
                  #
                </button>
              </th>
              <th className="p-4 text-left font-medium text-[#e5e5e5]">
                <button className="bg-none border-none text-[#e5e5e5] font-medium cursor-pointer flex items-center p-0 hover:text-[#fb923c]">
                  Name
                </button>
              </th>
              <th className="p-4 text-right font-medium text-[#e5e5e5]">
                <button className="bg-none border-none text-[#e5e5e5] font-medium cursor-pointer flex items-center justify-end ml-auto p-0 hover:text-[#fb923c]">
                  Price
                </button>
              </th>
              <th className="p-4 text-right font-medium text-[#e5e5e5]">
                <button className="bg-none border-none text-[#e5e5e5] font-medium cursor-pointer flex items-center justify-end ml-auto p-0 hover:text-[#fb923c]">
                  24h %
                </button>
              </th>
              <th className="p-4 text-right font-medium text-[#e5e5e5]">
                <button className="bg-none border-none text-[#e5e5e5] font-medium cursor-pointer flex items-center justify-end ml-auto p-0 hover:text-[#fb923c]">
                  Market Cap
                </button>
              </th>
              <th className="p-4 text-right font-medium text-[#e5e5e5]">
                <button className="bg-none border-none text-[#e5e5e5] font-medium cursor-pointer flex items-center justify-end ml-auto p-0 hover:text-[#fb923c]">
                  Volume (24h)
                </button>
              </th>
              <th className="p-4 text-right font-medium text-[#e5e5e5]">
                <button className="bg-none border-none text-[#e5e5e5] font-medium cursor-pointer flex items-center justify-end ml-auto p-0 hover:text-[#fb923c]">
                  Circ. Supply
                </button>
              </th>
              <th className="p-4 text-right font-medium text-[#e5e5e5]">
                <button className="bg-none border-none text-[#e5e5e5] font-medium cursor-pointer flex items-center justify-end ml-auto p-0 hover:text-[#fb923c]">
                  Actions
                </button>
              </th>
            </tr>
          </thead>
          <tbody>
            {cryptoData.map((crypto, index) => (
              <tr 
                key={crypto.id} 
                className={`hover:bg-[#323232]/30 ${crypto.checked ? 'bg-[#fb923c]/10' : ''}`}
              >
                <td className="p-4 border-b border-[#222]">
                  <input 
                    type="checkbox" 
                    checked={!!crypto.checked} 
                    onChange={() => onCheckboxToggle(crypto.id)} 
                    className="w-[18px] h-[18px] accent-[#fb923c]"
                    title={`Select ${crypto.name}`}
                  />
                </td>
                <td className="p-4 border-b border-[#222] text-[#999]">{index + 1}</td>
                <td className="p-4 border-b border-[#222]">
                  <div className="flex items-center">
                    {crypto.image ? (
                      <Image 
                        src={crypto.image} 
                        alt={crypto.name} 
                        width={32} 
                        height={32} 
                        className="rounded-full mr-3"
                        // Usar imagem placeholder se a imagem original falhar
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.onerror = null; // Evitar loop infinito
                          target.src = getPlaceholderUrl(crypto.symbol);
                        }}
                      />
                    ) : (
                      <Image 
                        src={getPlaceholderUrl(crypto.symbol)}
                        alt={crypto.name}
                        width={32}
                        height={32}
                        className="rounded-full mr-3"
                      />
                    )}
                    <div>
                      <div className="font-medium">{crypto.name}</div>
                      <div className="text-[#999] text-sm">{crypto.symbol.toUpperCase()}</div>
                    </div>
                  </div>
                </td>
                <td className="p-4 border-b border-[#222] text-right">
                  {formatValue(crypto.current_price, 'price')}
                </td>
                <td className={`p-4 border-b border-[#222] text-right ${crypto.price_change_percentage_24h > 0 ? 'text-[#10b981]' : crypto.price_change_percentage_24h < 0 ? 'text-[#ef4444]' : ''}`}>
                  {formatValue(crypto.price_change_percentage_24h, 'percentage')}
                </td>
                <td className="p-4 border-b border-[#222] text-right">
                  {formatValue(crypto.market_cap, 'marketCap')}
                </td>
                <td className="p-4 border-b border-[#222] text-right">
                  {formatValue(crypto.total_volume, 'volume')}
                </td>
                <td className="p-4 border-b border-[#222] text-right">
                  {formatValue(crypto.circulating_supply, 'supply', crypto.symbol.toUpperCase())}
                </td>
                <td className="p-4 border-b border-[#222] text-right">
                  <button
                    onClick={() => onViewDetails(crypto.id)}
                    className="text-blue-500 hover:underline"
                  >
                    View Details
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
