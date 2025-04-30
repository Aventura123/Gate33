// File: app/compare/types.ts

import { useCryptocurrencies as useCryptocurrenciesFromHooks } from './lib/hooks';

// Definição atualizada dos tipos para corresponder à API do CoinGecko
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

export interface SelectedCrypto {
  id: string;
  symbol: string;
  name: string;
  image?: string; // Adicionando a propriedade image como opcional
  checked: boolean;
}

// Props para os componentes
export interface SearchFilterBarProps {
  selectedCryptos: SelectedCrypto[];
  timeFilter: string;
  searchQuery: string;
  showComparison: boolean;
  onSearchChange: (query: string) => void;
  onRemoveTag: (symbol: string) => void;
  onClearAll: () => void;
  onTimeFilterChange: (filter: string) => void;
  onToggleComparison: () => void;
}

export interface ComparisonSectionProps {
  selectedCryptos: CryptoData[];
}

export interface CryptoTableProps {
  cryptoData: CryptoData[];
  onCheckboxToggle: (id: string) => void; // Atualizado para string
  onViewDetails: (id: string) => void;
}

// Retorno do hook useCryptocurrencies
export interface CryptoHookReturn {
  cryptoData: CryptoData[];
  selectedCryptos: SelectedCrypto[];
  loading: boolean;
  error: string | null;
  timeframe: string;
  searchQuery: string;
  handleToggleCrypto: (id: string) => void; // Atualizado para string
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
  limit?: number;
}