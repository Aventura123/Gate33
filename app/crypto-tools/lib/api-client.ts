// File: app/compare/lib/api-client.ts

interface FetchCryptocurrenciesOptions {
    search?: string;
    timeframe?: string;
    limit?: number;
  }
  
  interface FetchComparisonOptions {
    symbols: string[];
    timeframe?: string;
  }
  
  interface ApiResponse {
    data: any[];
    meta: {
      count: number;
      timeframe: string;
    };
  }
  
  /**
   * Fetch all cryptocurrencies with optional filters
   * @param {FetchCryptocurrenciesOptions} options - Query options
   * @returns {Promise<ApiResponse>} - Promise resolving to cryptocurrency data
   */
  export async function fetchCryptocurrencies(options: FetchCryptocurrenciesOptions = {}): Promise<ApiResponse> {
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
   * @param {FetchComparisonOptions} options - Request options
   * @returns {Promise<ApiResponse>} - Promise resolving to cryptocurrency comparison data
   */
  export async function fetchComparisonData(options: FetchComparisonOptions): Promise<ApiResponse> {
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