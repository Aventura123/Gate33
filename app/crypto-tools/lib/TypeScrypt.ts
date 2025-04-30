// File: app/compare/lib/api-client.ts
import {
  LocalGlobalFetchCryptocurrenciesOptions as ImportedGlobalFetchCryptocurrenciesOptions,
} from './TypeScrypt';

// Tipos e interfaces para o projeto

// Opções para buscar criptomoedas (padrão global)
export interface LocalGlobalFetchCryptocurrenciesOptions {
  search?: string;
  timeframe?: string;
  limit?: number;
}

// Opções para buscar criptomoedas localmente
export interface LocalFetchCryptocurrenciesOptionsLocal {
  search?: string;
  timeframe?: string;
  limit?: number;
}

// Opções para buscar dados de comparação local
export interface LocalFetchComparisonOptions {
  symbols: string[];
  timeframe?: string;
}

// Rename the imported LocalFetchComparisonOptions to avoid conflict
type ImportedLocalFetchComparisonOptions = ImportedGlobalFetchCryptocurrenciesOptions;

// Estrutura de resposta da API
export interface ApiResponse {
  data: any[];
  meta: {
    count: number;
    timeframe: string;
  };
}

// Rename the imported ApiResponse to avoid conflict
export type ImportedApiResponse = ImportedGlobalFetchCryptocurrenciesOptions;

export type LocalApiResponse = ImportedGlobalFetchCryptocurrenciesOptions;

// Estrutura de dados de uma criptomoeda - atualizada para CoinGecko API
export interface CryptoData {
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

// Estrutura de dados de uma criptomoeda selecionada - atualizada
export interface SelectedCrypto {
  id: string;
  symbol: string;
  name: string;
  checked: boolean;
}

// Retorno do hook useCryptocurrencies - atualizado
export interface CryptoHookReturn {
  cryptoData: CryptoData[];
  selectedCryptos: SelectedCrypto[];
  loading: boolean;
  error: string | null;
  timeframe: string;
  searchQuery: string;
  handleToggleCrypto: (id: string) => void;  // Atualizado para string
  handleRemoveCrypto: (symbol: string) => void;
  handleClearSelections: () => void;
  handleTimeframeChange: (timeframe: string) => void;
  handleSearchChange: (query: string) => void;
  refreshData: () => Promise<void>;
}

// Opções para o hook useCryptocurrencies
export interface UseCryptocurrenciesOptions {
  initialTimeframe?: string;
  initialSearch?: string;
  search?: string;
  timeframe?: string;
}

/**
 * Fetch all cryptocurrencies with optional filters
 * @param {LocalFetchCryptocurrenciesOptionsLocal} options - Query options
 * @returns {Promise<ApiResponse>} - Promise resolving to cryptocurrency data
 */
export async function fetchCryptocurrencies(options: LocalFetchCryptocurrenciesOptionsLocal = {}): Promise<ApiResponse> {
  const { search = '', timeframe = '24h', limit = 50 } = options;
  
  // Build query string
  const params = new URLSearchParams();
  if (search) params.append('search', search);
  if (timeframe) params.append('timeframe', timeframe);
  if (limit) params.append('limit', limit.toString());
  
  const queryString = params.toString();
  const url = `/api/cryptocurrencies${queryString ? `?${queryString}` : ''}`;
  
  try {
    const response = await fetch(url);
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to fetch cryptocurrency data');
    }
    
    return response.json();
  } catch (error) {
    console.error('Error fetching cryptocurrencies:', error);
    throw error;
  }
}

/**
 * Fetch comparison data for specific cryptocurrencies
 * @param {LocalFetchComparisonOptions} options - Request options
 * @returns {Promise<ApiResponse>} - Promise resolving to cryptocurrency comparison data
 */
export async function fetchComparisonData(options: LocalFetchComparisonOptions): Promise<ApiResponse> {
  const { symbols = [], timeframe = '24h' } = options;
  
  if (!symbols.length) {
    throw new Error('At least one cryptocurrency symbol is required');
  }
  
  try {
    const response = await fetch('/api/cryptocurrencies', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ symbols, timeframe }),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to fetch comparison data');
    }
    
    return response.json();
  } catch (error) {
    console.error('Error fetching comparison data:', error);
    throw error;
  }
}