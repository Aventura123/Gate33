// File: app/compare/lib/hooks.ts
'use client';

import { useState, useEffect, useCallback } from 'react';
import { fetchCryptocurrencies as fetchCryptocurrenciesFromApi } from './api-client';
import { CryptoData, CryptoHookReturn, SelectedCrypto, UseCryptocurrenciesOptions } from '../types';

/**
 * Custom hook for handling cryptocurrency data
 * 
 * @param {UseCryptocurrenciesOptions} options - Hook options
 * @returns {CryptoHookReturn} - States and handler functions
 */
export function useCryptocurrencies(options: UseCryptocurrenciesOptions = {}): CryptoHookReturn {
  const { initialTimeframe = '24h', initialSearch = '' } = options;

  const [cryptoData, setCryptoData] = useState<CryptoData[]>([]);
  const [selectedCryptos, setSelectedCryptos] = useState<SelectedCrypto[]>([]);
  const [timeframe, setTimeframe] = useState<string>(initialTimeframe);
  const [searchQuery, setSearchQuery] = useState<string>(initialSearch);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async (search = searchQuery) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetchCryptocurrenciesFromApi({
        search,
        timeframe,
        limit: 50,
      });

      // Adaptar os dados da API do CoinGecko para o formato esperado pelo componente
      const cryptosWithChecked = response.data.map((crypto: any) => ({
        ...crypto,
        checked: selectedCryptos.some((selected) => selected.symbol === crypto.symbol),
      }));

      setCryptoData(cryptosWithChecked);
    } catch (err) {
      setError('Failed to load cryptocurrency data. Please try again later.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, timeframe, selectedCryptos]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Atualizado para usar id do tipo string
  const handleToggleCrypto = useCallback((id: string) => {
    setCryptoData((currentData) => {
      const updatedData = currentData.map((crypto) => {
        if (crypto.id === id) {
          return { ...crypto, checked: !crypto.checked };
        }
        return crypto;
      });

      // Atualizado para incluir image no objeto SelectedCrypto
      const selected = updatedData
        .filter((crypto) => crypto.checked)
        .map(({ id, symbol, name, image }) => ({ 
          id, 
          symbol, 
          name, 
          image, 
          checked: true 
        }));

      setSelectedCryptos(selected);

      return updatedData;
    });
  }, []);

  const handleRemoveCrypto = useCallback((symbol: string) => {
    setSelectedCryptos((current) => current.filter((crypto) => crypto.symbol !== symbol));

    setCryptoData((currentData) =>
      currentData.map((crypto) => {
        if (crypto.symbol === symbol) {
          return { ...crypto, checked: false };
        }
        return crypto;
      })
    );
  }, []);

  const handleClearSelections = useCallback(() => {
    setSelectedCryptos([]);

    setCryptoData((currentData) =>
      currentData.map((crypto) => ({ ...crypto, checked: false }))
    );
  }, []);

  const handleTimeframeChange = useCallback((newTimeframe: string) => {
    setTimeframe(newTimeframe);
  }, []);

  const handleSearchChange = useCallback((query: string) => {
    setSearchQuery(query);
    loadData(query);
  }, [loadData]);

  return {
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
    refreshData: loadData,
  };
}

// Função atualizada para usar a API de criptomoedas implementada
export async function fetchCryptocurrencies(options: UseCryptocurrenciesOptions): Promise<any> {
  const { search, timeframe } = options;

  try {
    const params = new URLSearchParams();
    if (search) params.append('search', search || '');
    if (timeframe) params.append('timeframe', timeframe || '24h');
    
    const queryString = params.toString();
    const response = await fetch(
      `/api/cryptocurrencies${queryString ? `?${queryString}` : ''}`
    );

    if (!response.ok) {
      throw new Error('Failed to fetch cryptocurrency data');
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching cryptocurrencies:', error);
    throw error;
  }
}

export async function fetchCryptoDetails(coinId: string): Promise<any> {
  try {
    const response = await fetch(`/api/cryptocurrencies?id=${coinId}`);
    if (!response.ok) {
      throw new Error('Failed to fetch cryptocurrency details');
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching cryptocurrency details:', error);
    throw error;
  }
}

