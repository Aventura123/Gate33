import { ethers } from 'ethers';
import { collection, addDoc, getDocs, query, where, doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { web3Service } from './web3Service';
// Import the service, but don't initialize it on the client
// We'll use API endpoints for server-side operations instead
let g33TokenDistributorService: any = null;

// Only import the service on the server side
if (typeof window === 'undefined') {
  try {
    g33TokenDistributorService = require('./g33TokenDistributorService').g33TokenDistributorService;
  } catch (error) {
    console.error('Failed to load distributor service on server side:', error);
  }
}

// Token conversion rate: 1 G33 token for each 1 USD donated
const TOKEN_RATE = 1;

// Token distribution information
const TOKEN_INFO = {
  name: 'Gate33 Token',
  symbol: 'G33',
  totalSupply: 3300000, // 3.3 million tokens
};

// Interface for recording donations for token distribution
interface TokenDonation {
  donorAddress: string;
  donationAmount: number; // amount in crypto
  usdValue: number; // value converted to USD
  tokenAmount: number; // quantity of tokens to be distributed
  transactionHash: string;
  network: string;
  cryptoSymbol: string;
  createdAt: Date;
  status: 'pending' | 'distributed' | 'failed';
  distributionTxHash?: string;
  error?: string;
}

// Request current cryptocurrency prices from internal API
async function getCurrentCryptoPrices(): Promise<Record<string, number>> {
  try {
    // Check connectivity before making the call
    const isOnline = navigator.onLine;
    if (!isOnline) {
      console.warn('Device offline, cannot fetch cryptocurrency prices');
      throw new Error('Device offline');
    }
    
    // Request prices of the main cryptocurrencies we accept for donation
    const response = await fetch('/api/cryptocurrencies?limit=50', {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      // Add timeout
      signal: AbortSignal.timeout(8000) // 8 seconds timeout
    });
    
    if (!response.ok) {
      throw new Error(`Failed to get cryptocurrency prices: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    
    // Create a map of symbol to USD price
    const priceMap: Record<string, number> = {};
    if (data && data.data) {
      data.data.forEach((crypto: any) => {
        priceMap[crypto.symbol.toLowerCase()] = crypto.current_price;
      });
      
      // Log the fetched prices for debugging
      console.log('Fetched cryptocurrency prices:', 
        Object.entries(priceMap)
          .filter(([symbol]) => ['eth', 'btc', 'avax', 'usdt', 'usdc', 'bnb'].includes(symbol))
          .map(([symbol, price]) => `${symbol.toUpperCase()}: $${price}`)
          .join(', ')
      );
    }
    
    // Verify we have the required cryptocurrencies
    const requiredCryptos = ['eth', 'avax', 'usdt', 'usdc'];
    const missingCryptos = requiredCryptos.filter(symbol => !priceMap[symbol]);
    
    if (missingCryptos.length > 0) {
      // If we're missing critical cryptocurrencies, try fetching them specifically
      try {
        // Create symbol list for the POST request
        const postResponse = await fetch('/api/cryptocurrencies', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            symbols: missingCryptos.map(s => s.toUpperCase()),
            timeframe: '24h'
          }),
          signal: AbortSignal.timeout(5000)
        });
        
        if (postResponse.ok) {
          const additionalData = await postResponse.json();
          if (additionalData && additionalData.data) {
            additionalData.data.forEach((crypto: any) => {
              priceMap[crypto.symbol.toLowerCase()] = crypto.current_price;
            });
            
            console.log('Fetched additional cryptocurrency prices:', 
              Object.entries(priceMap)
                .filter(([symbol]) => missingCryptos.includes(symbol))
                .map(([symbol, price]) => `${symbol.toUpperCase()}: $${price}`)
                .join(', ')
            );
          }
        }
      } catch (additionalError) {
        console.error('Error fetching additional cryptocurrency data:', additionalError);
      }
    }
    
    // Only add stablecoins parity if needed
    if (!priceMap['usdt']) priceMap['usdt'] = 1;
    if (!priceMap['usdc']) priceMap['usdc'] = 1;
    if (!priceMap['dai']) priceMap['dai'] = 1;
    if (!priceMap['busd']) priceMap['busd'] = 1;
    
    return priceMap;
  } catch (error) {
    console.error('Error getting cryptocurrency prices:', error);
    
    // Instead of hardcoded fallback values, try a secondary API endpoint
    try {
      const backupResponse = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=ethereum,bitcoin,avalanche-2,tether,usd-coin,bnb&vs_currencies=usd', {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(8000)
      });
      
      if (backupResponse.ok) {
        const backupData = await backupResponse.json();
        const backupPriceMap: Record<string, number> = {
          'eth': backupData['ethereum']?.usd,
          'btc': backupData['bitcoin']?.usd,
          'avax': backupData['avalanche-2']?.usd,
          'bnb': backupData['bnb']?.usd,
          'usdt': backupData['tether']?.usd || 1,
          'usdc': backupData['usd-coin']?.usd || 1,
        };
        
        console.log('Using backup cryptocurrency prices:', 
          Object.entries(backupPriceMap)
            .filter(([_, price]) => price !== undefined)
            .map(([symbol, price]) => `${symbol.toUpperCase()}: $${price}`)
            .join(', ')
        );
        
        // Filter out undefined values and ensure stablecoins are set
        for (const symbol in backupPriceMap) {
          if (!backupPriceMap[symbol]) {
            delete backupPriceMap[symbol];
          }
        }
        
        // Ensure stablecoins have values
        if (!backupPriceMap['usdt']) backupPriceMap['usdt'] = 1;
        if (!backupPriceMap['usdc']) backupPriceMap['usdc'] = 1;
        
        return backupPriceMap;
      }
    } catch (backupError) {
      console.error('Backup API also failed:', backupError);
    }
    
    // If all APIs fail, throw an error rather than using outdated fallbacks
    throw new Error('Unable to fetch cryptocurrency prices from any source');
  }
}

// Calculate USD value of a crypto donation
export async function calculateUSDValue(amount: string, cryptoSymbol: string): Promise<number> {
  try {
    // Normalize the cryptocurrency symbol
    const symbol = cryptoSymbol.toLowerCase();
    console.log(`Calculating USD value for ${amount} ${cryptoSymbol.toUpperCase()}`);
    
    // For stablecoins, fast path with 1:1 conversion
    if (symbol === 'usdt' || symbol === 'usdc' || symbol === 'dai' || symbol === 'busd') {
      const value = parseFloat(amount);
      console.log(`Direct 1:1 conversion for stablecoin: ${cryptoSymbol.toUpperCase()} = $${value.toFixed(2)}`);
      return value;
    }
    
    // Get current prices for all supported cryptocurrencies
    const prices = await getCurrentCryptoPrices();
    
    if (prices[symbol]) {
      const cryptoAmount = parseFloat(amount);
      const usdValue = cryptoAmount * prices[symbol];
      console.log(`Conversion using price data: ${amount} ${cryptoSymbol.toUpperCase()} = $${usdValue.toFixed(2)} (rate: $${prices[symbol]})`);
      return usdValue;
    }
    
    // If we get here, we couldn't find a price for this cryptocurrency
    console.error(`Price not available for ${cryptoSymbol.toUpperCase()}. Available prices:`, 
      Object.keys(prices).map(k => k.toUpperCase()).join(', '));
    
    // Try a direct API call as last resort
    try {
      const coinId = getCoinGeckoIdForSymbol(symbol);
      if (coinId) {
        const directResponse = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=usd`, {
          headers: { 'Accept': 'application/json' },
          signal: AbortSignal.timeout(5000)
        });
        
        if (directResponse.ok) {
          const priceData = await directResponse.json();
          if (priceData[coinId]?.usd) {
            const directPrice = priceData[coinId].usd;
            const usdValue = parseFloat(amount) * directPrice;
            console.log(`Direct API fallback: ${amount} ${cryptoSymbol.toUpperCase()} = $${usdValue.toFixed(2)} (rate: $${directPrice})`);
            return usdValue;
          }
        }
      }
    } catch (directApiError) {
      console.error('Error with direct price API call:', directApiError);
    }
    
    throw new Error(`Price not available for ${cryptoSymbol}`);
  } catch (error) {
    console.error(`Error calculating USD value for ${cryptoSymbol}:`, error);
    
    // For stablecoins, always return 1:1 value even with errors
    const symbol = cryptoSymbol.toLowerCase();
    if (symbol === 'usdt' || symbol === 'usdc' || symbol === 'dai' || symbol === 'busd') {
      return parseFloat(amount);
    }
    
    // Re-throw for non-stablecoins
    throw error;
  }
}

// Helper to map cryptocurrency symbols to CoinGecko IDs
function getCoinGeckoIdForSymbol(symbol: string): string | null {
  const symbolToId: Record<string, string> = {
    'btc': 'bitcoin',
    'eth': 'ethereum',
    'avax': 'avalanche-2',
    'bnb': 'binancecoin',
    'matic': 'matic-network',
    'usdt': 'tether',
    'usdc': 'usd-coin',
    'dai': 'dai',
    'busd': 'binance-usd',
  };
  
  return symbolToId[symbol.toLowerCase()] || null;
}

// Calculate how many G33 tokens would be distributed based on USD value
export function calculateG33TokenAmount(usdValue: number): number {
  return usdValue * TOKEN_RATE;
}

/**
 * Register a donation and process G33 token distribution
 * Using server-side API to ensure access to environment variables
 * @throws Error if token distribution fails
 */
export async function registerTokenDonation(
  donorAddress: string,
  donationAmount: number,
  cryptoSymbol: string,
  transactionHash: string,
  network: string
): Promise<{donationId: string, success: boolean, distributionTxHash?: string, error?: string}> {
  try {
    console.log(`Starting donation registration: ${donationAmount} ${cryptoSymbol} from ${donorAddress}`);

    // Check if the environment is online
    if (!navigator.onLine) {
      throw new Error('Device offline. Please check your internet connection.');
    }
    
    // Calculate value in USD
    const usdValue = await calculateUSDValue(donationAmount.toString(), cryptoSymbol);
    console.log(`USD value calculated: $${usdValue.toFixed(2)}`);
    
    // Calculate G33 token amount
    const tokenAmount = calculateG33TokenAmount(usdValue);
    console.log(`G33 tokens to distribute: ${tokenAmount}`);
    
    // Register the donation locally to keep records even if API fails
    const localDonation: TokenDonation = {
      donorAddress,
      donationAmount,
      usdValue,
      tokenAmount,
      transactionHash,
      network,
      cryptoSymbol,
      createdAt: new Date(),
      status: 'pending'
    };
    
    try {
      // Register in Firebase as pending before calling the API
      const docRef = await addDoc(collection(db, 'tokenDonations'), localDonation);
      const donationId = docRef.id;
      
      console.log('Calling server-side API for token distribution...');
      
      // Call the server-side API with timeout
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000); // 15 seconds
      
      try {
        const response = await fetch('/api/tokens/distribute', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            donorAddress,
            donationAmount,
            usdValue,
            tokenAmount,
            transactionHash,
            network,
            cryptoSymbol,
            donationId
          }),
          signal: controller.signal
        });
        
        clearTimeout(timeout);
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || `Error ${response.status}: ${response.statusText}`);
        }
        
        const result = await response.json();
        
        // Update status in Firebase
        await updateDoc(doc(db, 'tokenDonations', donationId), {
          status: 'distributed',
          distributionTxHash: result.transactionHash,
          updatedAt: new Date()
        });
        
        console.log(`Tokens distributed successfully: ${tokenAmount} G33. Transaction hash: ${result.transactionHash}`);
        return {
          donationId,
          success: true,
          distributionTxHash: result.transactionHash
        };
      } catch (fetchError: any) {
        clearTimeout(timeout);
        
        // Specific error handling by type
        if (fetchError.name === 'AbortError') {
          throw new Error('Timeout exceeded when connecting to the server');
        }
        
        // If the server is unavailable, record but don't completely fail
        await updateDoc(doc(db, 'tokenDonations', donationId), {
          status: 'failed',
          error: fetchError.message || 'Failed to communicate with the server',
          updatedAt: new Date()
        });
        
        throw new Error(fetchError.message || 'Failed to communicate with the server');
      }
    } catch (apiError: any) {
      console.error('Error in token distribution API:', apiError);
      
      // Check if it's a connection/server error
      if (apiError.message.includes('Failed to fetch') || 
          apiError.message.includes('NetworkError') ||
          apiError.message.includes('network') ||
          apiError.message.includes('offline') ||
          apiError.message.includes('ECONNREFUSED')) {
        throw new Error('Connection error with the server. Check if the server is active and your internet connection.');
      }
      
      throw new Error(`Failed to distribute tokens: ${apiError.message}`);
    }
  } catch (error: any) {
    console.error('Error registering donation for tokens:', error);
    return {
      donationId: '',
      success: false,
      error: error.message || 'Unknown error processing token distribution'
    };
  }
}

// Get token distribution statistics
export async function getTokenDistributionStats() {
  try {
    // On the client side, use the API instead of direct service call
    if (typeof window !== 'undefined') {
      try {
        const response = await fetch('/api/tokens/stats');
        if (!response.ok) {
          throw new Error('Failed to fetch token stats from API');
        }
        return await response.json();
      } catch (error) {
        console.error('Error fetching token stats via API:', error);
        return {
          totalSupply: TOKEN_INFO.totalSupply,
          totalDistributed: 0,
          availableForDistribution: TOKEN_INFO.totalSupply,
          totalDonationsUsd: 0,
          percentageDistributed: 0,
          isServiceAvailable: false
        };
      }
    }

    // Server-side execution with direct access to the service
    if (!g33TokenDistributorService || !g33TokenDistributorService.checkIsInitialized()) {
      return {
        totalSupply: TOKEN_INFO.totalSupply,
        totalDistributed: 0,
        availableForDistribution: TOKEN_INFO.totalSupply,
        totalDonationsUsd: 0,
        percentageDistributed: 0,
        isServiceAvailable: false
      };
    }
    
    const stats = await g33TokenDistributorService.getDistributionStats();
    
    return {
      totalSupply: TOKEN_INFO.totalSupply,
      totalDistributed: parseFloat(stats.totalDistributed),
      availableForDistribution: parseFloat(stats.availableTokens),
      totalDonationsUsd: parseFloat(stats.totalDonationsUsd),
      percentageDistributed: parseFloat(stats.totalDistributed) / TOKEN_INFO.totalSupply * 100,
      isServiceAvailable: true
    };
   } catch (error) {
    console.error('Error getting distribution statistics:', error);
    return {
      totalSupply: TOKEN_INFO.totalSupply,
      totalDistributed: 0,
      availableForDistribution: TOKEN_INFO.totalSupply,
      totalDonationsUsd: 0,
      percentageDistributed: 0,
      isServiceAvailable: false
    };
  }
}

// Check if a donor has already received tokens
export async function getTokensDistributedToDonor(address: string): Promise<number> {
  try {
    // On the client side, use the API instead of direct service call
    if (typeof window !== 'undefined') {
      try {
        const response = await fetch(`/api/tokens/donor-stats?address=${encodeURIComponent(address)}`);
        if (!response.ok) {
          throw new Error('Failed to fetch donor token stats from API');
        }
        const data = await response.json();
        return data.tokensDistributed || 0;
      } catch (error) {
        console.error('Error fetching donor token stats via API:', error);
        return 0;
      }
    }

    // Server-side execution with direct access to the service
    if (!g33TokenDistributorService || !g33TokenDistributorService.checkIsInitialized()) {
      return 0;
    }
    
    const tokensStr = await g33TokenDistributorService.getTokensDistributedToDonor(address);
    return parseFloat(tokensStr);
  } catch (error) {
    console.error('Error getting tokens distributed to donor:', error);
    return 0;
  }
}

export async function processDonationAndDistributeTokens(
  donorAddress: string,
  donationAmount: number,
  cryptoSymbol: string,
  transactionHash: string,
  network: string,
  waitForConfirmation: boolean = false
): Promise<{ success: boolean; distributionTxHash?: string; error?: string }> {
  try {
    console.log(`Starting donation processing: ${donationAmount} ${cryptoSymbol} from ${donorAddress}`);
    console.log(`waitForConfirmation: ${waitForConfirmation}`);

    // Calculate value in USD
    const usdValue = await calculateUSDValue(donationAmount.toString(), cryptoSymbol);
    console.log(`USD value calculated: $${usdValue.toFixed(2)}`);

    // Calculate G33 token amount
    const tokenAmount = calculateG33TokenAmount(usdValue);
    console.log(`G33 tokens to distribute: ${tokenAmount}`);

    // Register the donation locally in Firebase
    const donationRecord = {
      donorAddress,
      donationAmount,
      usdValue,
      tokenAmount,
      transactionHash,
      network,
      cryptoSymbol,
      createdAt: new Date(),
      status: 'pending'
    };

    const docRef = await addDoc(collection(db, 'tokenDonations'), donationRecord);
    const donationId = docRef.id;

    // Use API endpoint on client side
    if (typeof window !== 'undefined') {
      console.log('Calling API to distribute tokens with payload:', {
        donorAddress,
        usdValue,
        waitForConfirmation
      });
      
      const response = await fetch('/api/tokens/distribute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          donorAddress,
          donationAmount,
          usdValue,
          tokenAmount,
          transactionHash,
          network,
          cryptoSymbol,
          donationId,
          waitForConfirmation
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Error ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      console.log('Token distribution API response:', result);
      console.log('Transaction hash received:', result.transactionHash);
      
      // Update the Firebase record with the result
      await updateDoc(doc(db, 'tokenDonations', donationId), {
        status: result.success ? 'distributed' : 'failed',
        distributionTxHash: result.transactionHash || null,
        error: result.error || null,
        updatedAt: new Date()
      });

      return {
        success: result.success,
        distributionTxHash: result.transactionHash,
        error: result.error
      };
    }

    // Server-side execution with direct access to the service
    if (!g33TokenDistributorService || !g33TokenDistributorService.checkIsInitialized()) {
      throw new Error('Token distributor service is not available on the server');
    }

    // Use smart contract directly to distribute tokens
    console.log('Distributing tokens directly using the smart contract...');
    const distributionTxHash = await g33TokenDistributorService.distributeTokens(
      donorAddress, 
      usdValue,
      waitForConfirmation
    );

    if (!distributionTxHash) {
      throw new Error('Failed to distribute tokens using the smart contract.');
    }

    console.log(`Tokens distributed successfully. Transaction hash: ${distributionTxHash}`);

    // Update status in Firebase
    await updateDoc(doc(db, 'tokenDonations', donationId), {
      status: 'distributed',
      distributionTxHash,
      updatedAt: new Date()
    });

    return {
      success: true,
      distributionTxHash
    };
  } catch (error: any) {
    console.error('Error processing donation and distributing tokens:', error);
    return {
      success: false,
      error: error.message || 'Unknown error processing donation.'
    };
  }
}

// Exported service object
export const tokenService = {
  calculateUSDValue,
  calculateG33TokenAmount,
  registerTokenDonation,
  getTokenDistributionStats,
  getTokensDistributedToDonor,
  processDonationAndDistributeTokens,
  TOKEN_INFO
};

export default tokenService;