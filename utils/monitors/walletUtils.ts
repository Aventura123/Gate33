// Utility functions for wallet data management

/**
 * Saves the wallet balance to local storage for fallback during connection issues
 * @param balance The wallet balance to cache
 */
export function cacheWalletBalance(balance: string): void {
  try {
    if (typeof window !== 'undefined' && balance && balance !== 'Waiting for data...') {
      localStorage.setItem('CACHED_WALLET_BALANCE', balance);
      localStorage.setItem('CACHED_WALLET_BALANCE_TIMESTAMP', new Date().toISOString());
    }
  } catch (error) {
    console.error('Error caching wallet balance:', error);
  }
}

/**
 * Retrieves cached wallet balance from local storage
 * @returns An object containing the balance and timestamp, or null if no cached data exists
 */
export function getCachedWalletBalance(): { balance: string; timestamp: string } | null {
  try {
    if (typeof window !== 'undefined') {
      const balance = localStorage.getItem('CACHED_WALLET_BALANCE');
      const timestamp = localStorage.getItem('CACHED_WALLET_BALANCE_TIMESTAMP');
      
      if (balance && timestamp) {
        return { balance, timestamp };
      }
    }
    return null;
  } catch (error) {
    console.error('Error retrieving cached wallet balance:', error);
    return null;
  }
}

/**
 * Gets the wallet balance, either from the API or from cache if API fails
 * @returns A promise that resolves to the wallet balance string
 */
export async function getWalletBalanceWithFallback(): Promise<string> {
  try {
    // Try to get the current balance through the API proxy
    const response = await fetch('/api/monitoring/wallet-balance');

    if (response.ok) {
      const data = await response.json();

      if (data.balance) {
        // Cache the new balance for future use
        cacheWalletBalance(data.balance);
        console.log('[WalletUtils] API balance fetched:', data.balance);
        return data.balance;
      }

      // If we have a connection issue but we have cache data
      if (data.errors?.length > 0) {
        const cachedData = getCachedWalletBalance();
        if (cachedData) {
          console.log('[WalletUtils] API error, using cached balance:', cachedData.balance);
          // Return the cached balance with a note that it's cached
          return `${cachedData.balance} (cached)`;
        }
      }
    }

    // If API call fails, try to get cached data
    const cachedData = getCachedWalletBalance();
    if (cachedData) {
      console.log('[WalletUtils] API failed, using cached balance:', cachedData.balance);
      return `${cachedData.balance} (cached)`;
    }

    // If all else fails, return a default message
    console.log('[WalletUtils] Connection issue - can\'t fetch balance');
    return "Connection issue - can't fetch balance";
  } catch (error) {
    console.error('[WalletUtils] Error fetching wallet balance:', error);

    // Try to get cached data in case of error
    const cachedData = getCachedWalletBalance();
    if (cachedData) {
      console.log('[WalletUtils] Exception, using cached balance:', cachedData.balance);
      return `${cachedData.balance} (cached)`;
    }

    return 'Error fetching balance data';
  }
}

/**
 * Clears all cached wallet data from localStorage
 */
export function clearWalletCache(): void {
  try {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('CACHED_WALLET_BALANCE');
      localStorage.removeItem('CACHED_WALLET_BALANCE_TIMESTAMP');
      console.log('[WalletUtils] Wallet cache cleared successfully');
    }
  } catch (error) {
    console.error('Error clearing wallet cache:', error);
  }
}

/**
 * Updates the cached wallet balance when receiving data from the API response
 * @param apiResponse The response from the diagnostics API
 */
export function updateWalletCacheFromApiResponse(apiResponse: any): void {
  try {
    if (apiResponse?.walletData?.balance) {
      cacheWalletBalance(apiResponse.walletData.balance);
    }
    
    // If the response explicitly includes cache data, use that
    if (apiResponse?.cacheWalletBalance?.balance) {
      cacheWalletBalance(apiResponse.cacheWalletBalance.balance);
    }
  } catch (error) {
    console.error('Error updating wallet cache from API response:', error);
  }
}