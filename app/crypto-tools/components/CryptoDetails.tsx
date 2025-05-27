'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';

interface CryptoDetailsProps {
  coinId: string;
}

export default function CryptoDetails({ coinId }: CryptoDetailsProps) {
  const [details, setDetails] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadDetails = async () => {
      setLoading(true);
      setError(null);
      
      try {
        // Usando nosso novo endpoint que busca do Firebase com fallback para CoinGecko
        const response = await fetch(`/api/cryptocurrencies?id=${coinId}`);
        
        if (!response.ok) {
          throw new Error(`Erro ao carregar detalhes: ${response.status}`);
        }
        
        const responseData = await response.json();
        setDetails(responseData.data);
      } catch (err) {
        console.error('Erro ao carregar detalhes da criptomoeda:', err);
        setError('Falha ao carregar os detalhes da criptomoeda.');
      } finally {
        setLoading(false);
      }
    };

    if (coinId) {
      loadDetails();
    }
  }, [coinId]);

  // Função para obter URL da imagem placeholder para criptomoedas
  const getPlaceholderUrl = (size: number = 64) => {
    return `/api/placeholder/${size}/${size}`;
  };

  if (loading) {
    return (
      <div className="p-6 bg-black/40 border border-[#fb923c]/20 rounded-xl mt-8 flex items-center justify-center">
        <div className="flex flex-col items-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-solid border-[#fb923c] border-r-transparent"></div>
          <p className="mt-4 text-gray-300">Loading cryptocurrency details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-black/40 border border-red-500/30 rounded-xl mt-8">
        <p className="text-red-500">{error}</p>
        <button 
          onClick={() => window.location.reload()}
          className="mt-4 bg-[#fb923c] hover:bg-[#f97316] text-white py-2 px-4 rounded transition-colors"
        >
          Tentar novamente
        </button>
      </div>
    );
  }

  if (!details) {
    return (
      <div className="p-6 bg-black/40 border border-[#fb923c]/20 rounded-xl mt-8">
        <p className="text-gray-300">Selecione uma criptomoeda para ver os detalhes.</p>
      </div>
    );
  }

  // Função para formatar valores com base no tipo
  const formatValue = (value: any, type: string): string => {
    if (value === null || value === undefined) return 'N/A';
    
    switch (type) {
      case 'price':
        return value >= 1 
          ? `$${Number(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` 
          : `$${Number(value).toFixed(6)}`;
      case 'percentage':
        return `${value > 0 ? '+' : ''}${Number(value).toFixed(2)}%`;
      case 'marketCap':
        return value >= 1e12 ? `$${(value / 1e12).toFixed(2)}T` :
               value >= 1e9 ? `$${(value / 1e9).toFixed(2)}B` :
               value >= 1e6 ? `$${(value / 1e6).toFixed(2)}M` : 
               `$${Number(value).toLocaleString()}`;
      case 'supply':
        return value >= 1e9 ? `${(value / 1e9).toFixed(2)}B` :
               value >= 1e6 ? `${(value / 1e6).toFixed(2)}M` : 
               `${Number(value).toLocaleString()}`;
      case 'date':
        return new Date(value).toLocaleDateString();
      default:
        return String(value);
    }
  };

  return (
    <div className="p-6 bg-black/40 border border-[#fb923c]/20 rounded-xl mt-8">
      <div className="flex items-center mb-6">
        {details.image ? (
          <Image 
            src={details.image} 
            alt={details.name} 
            width={64} 
            height={64} 
            className="rounded-full mr-4"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.onerror = null;
              target.src = getPlaceholderUrl();
            }}
          />
        ) : (
          <Image 
            src={getPlaceholderUrl()}
            alt={details.name || "Criptomoeda"}
            width={64}
            height={64}
            className="rounded-full mr-4"
          />
        )}
        <div>
          <h2 className="text-2xl font-bold">{details.name}</h2>
          <p className="text-gray-400 text-lg">{details.symbol?.toUpperCase()}</p>
          {details.market_cap_rank && (
            <p className="text-[#fb923c]">Rank #{details.market_cap_rank}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div>
          <h3 className="text-lg font-semibold mb-4 text-[#fb923c]">Preço e Performance</h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-400">Preço atual:</span>
              <span className="font-medium">{formatValue(details.current_price, 'price')}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">24h Variação:</span>
              <span className={`font-medium ${details.price_change_percentage_24h > 0 ? 'text-green-500' : details.price_change_percentage_24h < 0 ? 'text-red-500' : ''}`}>
                {formatValue(details.price_change_percentage_24h, 'percentage')}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">24h Maior:</span>
              <span className="font-medium">{formatValue(details.high_24h, 'price')}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">24h Menor:</span>
              <span className="font-medium">{formatValue(details.low_24h, 'price')}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Maior de todos os tempos:</span>
              <span className="font-medium">{formatValue(details.ath, 'price')}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Desde o ATH:</span>
              <span className={`font-medium ${(details.ath_change_percentage || 0) > 0 ? 'text-green-500' : 'text-red-500'}`}>
                {formatValue(details.ath_change_percentage, 'percentage')}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Data do ATH:</span>
              <span className="font-medium">{formatValue(details.ath_date, 'date')}</span>
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-lg font-semibold mb-4 text-[#fb923c]">Mercado</h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-400">Market Cap:</span>
              <span className="font-medium">{formatValue(details.market_cap, 'marketCap')}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Volume 24h:</span>
              <span className="font-medium">{formatValue(details.total_volume, 'marketCap')}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Circ. Supply:</span>
              <span className="font-medium">{formatValue(details.circulating_supply, 'supply')} {details.symbol?.toUpperCase()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Total Supply:</span>
              <span className="font-medium">
                {details.total_supply ? formatValue(details.total_supply, 'supply') + ` ${details.symbol?.toUpperCase()}` : 'Ilimitado'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Max Supply:</span>
              <span className="font-medium">
                {details.max_supply ? formatValue(details.max_supply, 'supply') + ` ${details.symbol?.toUpperCase()}` : 'Ilimitado'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Última atualização:</span>
              <span className="font-medium">{new Date(details.last_updated).toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>

      {details.description?.en && (
        <div className="mt-6">
          <h3 className="text-lg font-semibold mb-4 text-[#fb923c]">Sobre {details.name}</h3>
          <div 
            className="text-gray-300 prose prose-invert max-w-none" 
            dangerouslySetInnerHTML={{ __html: details.description.en }}
          />
        </div>
      )}
    </div>
  );
}