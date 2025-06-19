// This file has been updated to fetch balances from the Ocean monitoring server
// instead of making direct RPC calls

export type NativeTokenBalance = {
  network: string;
  symbol: string;
  balance: string;
};

// SERVICE_WALLET_ADDRESS is hardcoded here for browser compatibility
const SERVICE_WALLET_ADDRESS = '0xDdbC4f514019d835Dd9Ac6198fDa45c39512552C';

// Fallback network definitions in case the API call fails
const NETWORKS = [
  { key: 'ethereum', symbol: 'ETH' },
  { key: 'binance', symbol: 'BNB' },
  { key: 'avalanche', symbol: 'AVAX' },
  { key: 'polygon', symbol: 'MATIC' },
  { key: 'optimism', symbol: 'ETH' },
];

/**
 * Fetches native token balances from the Ocean monitoring server
 * @param address Wallet address to check balances for (defaults to SERVICE_WALLET_ADDRESS)
 * @returns Promise resolving to an array of NativeTokenBalance objects
 */
export async function fetchNativeTokenBalances(address: string = SERVICE_WALLET_ADDRESS): Promise<NativeTokenBalance[]> {
  try {
    // Get balances from the Ocean monitoring server API
    const response = await fetch(`/api/monitoring/wallet-balance?address=${address}`);
    
    if (response.ok) {
      const data = await response.json();
      if (data.balances && Array.isArray(data.balances)) {
        // Filter duplicates - keep only the last entry for each network
        const uniqueBalances = new Map<string, NativeTokenBalance>();
        data.balances.forEach((balance: NativeTokenBalance) => {
          uniqueBalances.set(balance.network, balance);
        });
        return Array.from(uniqueBalances.values());
      }
    }
    
    throw new Error('Invalid response from monitoring server');
  } catch (error) {
    console.error('Error fetching balances from monitoring server:', error);
    
    // Return placeholder data if the API call fails
    return NETWORKS.map(net => ({ 
      network: net.key, 
      symbol: net.symbol, 
      balance: 'Service unavailable' 
    }));
  }
}
