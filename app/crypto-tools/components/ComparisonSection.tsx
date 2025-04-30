// File: app/crypto-tools/components/ComparisonSection.tsx
'use client';

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
  total_supply: number | null;
  max_supply: number | null;
  checked?: boolean;
}

interface ComparisonSectionProps {
  selectedCryptos: Crypto[];
}

export default function ComparisonSection({ selectedCryptos }: ComparisonSectionProps) {
  // Only display the section if there are selected cryptos
  if (!selectedCryptos || selectedCryptos.length === 0) return null;
  
  const formatValue = (value: number | null | undefined, type: 'price' | 'percentage' | 'marketCap' | 'volume' | 'supply', symbol: string = ''): string => {
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
  const getPlaceholderUrl = (size: number = 24) => {
    return `/api/placeholder/${size}/${size}`;
  };
  
  return (
    <div className="bg-black/60 border border-[#fb923c]/30 rounded-xl p-6 mb-6 overflow-auto">
      <h2 className="text-2xl font-bold text-[#fb923c] mb-4">Cryptocurrency Comparison</h2>
      
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="p-3 text-left border-b border-[#333]"></th>
              {selectedCryptos.map(crypto => (
                <th key={crypto.symbol} className="p-3 text-left border-b border-[#333]">
                  <div className="flex items-center gap-2">
                    {crypto.image ? (
                      <Image 
                        src={crypto.image} 
                        alt={crypto.name} 
                        width={24} 
                        height={24} 
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
                        width={24}
                        height={24}
                        className="rounded-full"
                      />
                    )}
                    <div>
                      <div>{crypto.name}</div>
                      <div className="text-[#999] text-sm font-normal">{crypto.symbol.toUpperCase()}</div>
                    </div>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="py-4 px-3 border-b border-[#222] text-[#999]">Price</td>
              {selectedCryptos.map(crypto => (
                <td key={`${crypto.symbol}-price`} className="py-4 px-3 border-b border-[#222]">
                  {formatValue(crypto.current_price, 'price')}
                </td>
              ))}
            </tr>
            <tr>
              <td className="py-4 px-3 border-b border-[#222] text-[#999]">Market Cap</td>
              {selectedCryptos.map(crypto => (
                <td key={`${crypto.symbol}-marketcap`} className="py-4 px-3 border-b border-[#222]">
                  {formatValue(crypto.market_cap, 'marketCap')}
                </td>
              ))}
            </tr>
            <tr>
              <td className="py-4 px-3 border-b border-[#222] text-[#999]">Volume (24h)</td>
              {selectedCryptos.map(crypto => (
                <td key={`${crypto.symbol}-volume`} className="py-4 px-3 border-b border-[#222]">
                  {formatValue(crypto.total_volume, 'volume')}
                </td>
              ))}
            </tr>
            <tr>
              <td className="py-4 px-3 border-b border-[#222] text-[#999]">Change (24h)</td>
              {selectedCryptos.map(crypto => (
                <td 
                  key={`${crypto.symbol}-change`}
                  className={`py-4 px-3 border-b border-[#222] ${crypto.price_change_percentage_24h > 0 ? 'text-[#10b981]' : crypto.price_change_percentage_24h < 0 ? 'text-[#ef4444]' : ''}`}
                >
                  {formatValue(crypto.price_change_percentage_24h, 'percentage')}
                </td>
              ))}
            </tr>
            <tr>
              <td className="py-4 px-3 border-b border-[#222] text-[#999]">Circulating Supply</td>
              {selectedCryptos.map(crypto => (
                <td key={`${crypto.symbol}-circulating`} className="py-4 px-3 border-b border-[#222]">
                  {formatValue(crypto.circulating_supply, 'supply', crypto.symbol.toUpperCase())}
                </td>
              ))}
            </tr>
            <tr>
              <td className="py-4 px-3 text-[#999]">Max Supply</td>
              {selectedCryptos.map(crypto => (
                <td key={`${crypto.symbol}-maxsupply`} className="py-4 px-3">
                  {crypto.max_supply ? formatValue(crypto.max_supply, 'supply', crypto.symbol.toUpperCase()) : 'Unlimited'}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}