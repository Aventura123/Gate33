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
    
    // Tentar buscar do cache local primeiro
    if (typeof window !== 'undefined' && !search) {
      try {
        const cacheKey = `crypto_${timeframe}_cache`;
        const cachedData = localStorage.getItem(cacheKey);
        const cachedTimestamp = localStorage.getItem(`${cacheKey}_timestamp`);
        
        if (cachedData && cachedTimestamp) {
          const lastUpdate = parseInt(cachedTimestamp, 10);
          const now = Date.now();
          // Cache válido por 30 minutos
          if (now - lastUpdate < 30 * 60 * 1000) {
            const parsedData = JSON.parse(cachedData);
            console.log('Usando dados de criptomoedas do cache local');
            return parsedData;
          }
        }
      } catch (error) {
        console.error('Erro ao tentar usar cache local:', error);
      }
    }
    
    // Se não encontrou no cache ou cache expirado, busca na API
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
      
      const responseData = await response.json();
      
      // Salvar no cache local se não for uma busca específica
      if (typeof window !== 'undefined' && !search) {
        try {
          const cacheKey = `crypto_${timeframe}_cache`;
          localStorage.setItem(cacheKey, JSON.stringify(responseData));
          localStorage.setItem(`${cacheKey}_timestamp`, Date.now().toString());
          console.log('Dados de criptomoedas armazenados no cache local');
        } catch (cacheError) {
          console.error('Erro ao salvar dados no cache local:', cacheError);
        }
      }
      
      return responseData;
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
    
    // Tentar buscar do cache local primeiro
    if (typeof window !== 'undefined') {
      try {
        const symbolsKey = symbols.sort().join(',');
        const cacheKey = `crypto_comparison_${symbolsKey}_${timeframe}_cache`;
        const cachedData = localStorage.getItem(cacheKey);
        const cachedTimestamp = localStorage.getItem(`${cacheKey}_timestamp`);
        
        if (cachedData && cachedTimestamp) {
          const lastUpdate = parseInt(cachedTimestamp, 10);
          const now = Date.now();
          // Cache válido por 15 minutos para dados de comparação
          if (now - lastUpdate < 15 * 60 * 1000) {
            const parsedData = JSON.parse(cachedData);
            console.log('Usando dados de comparação do cache local');
            return parsedData;
          }
        }
      } catch (error) {
        console.error('Erro ao tentar usar cache local para comparação:', error);
      }
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
        const responseData = await response.json();
      
      // Salvar os dados de comparação no cache local
      if (typeof window !== 'undefined') {
        try {
          const symbolsKey = symbols.sort().join(',');
          const cacheKey = `crypto_comparison_${symbolsKey}_${timeframe}_cache`;
          localStorage.setItem(cacheKey, JSON.stringify(responseData));
          localStorage.setItem(`${cacheKey}_timestamp`, Date.now().toString());
          console.log('Dados de comparação armazenados no cache local');
        } catch (cacheError) {
          console.error('Erro ao salvar dados de comparação no cache local:', cacheError);
        }
      }
      
      return responseData;
    } catch (error) {
      console.error('Error fetching comparison data:', error);
      throw error;
    }
  }