// Token addresses for different networks
export const USDT_ADDRESSES = {
  ethereum: "0xdAC17F958D2ee523a2206206994597C13D831ec7",    // Ethereum Mainnet
  polygon: "0xc2132D05D31c914a87C6611C10748AEb04B58e8F",     // Polygon Mainnet
  binance: "0x55d398326f99059fF775485246999027B3197955",     // BSC Mainnet
  binanceTestnet: "0x337610d27c682E347C9cD60BD4b3b107C9d34dDd" // BSC Testnet
};

// Add mock USDT addresses for fallback/testing
export const MOCK_USDT_ADDRESSES = {
  ethereum: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
  polygon: "0xc2132D05D31c914a87C6611C10748AEb04B58e8F",
  binance: "0x55d398326f99059fF775485246999027B3197955",
  binanceTestnet: "0x337610d27c682E347C9cD60BD4b3b107C9d34dDd"
};

// Decimals for each network's USDT implementation
export const TOKEN_DECIMALS = {
  ethereum: 6,     // USDT on Ethereum uses 6 decimals
  polygon: 6,      // USDT on Polygon uses 6 decimals 
  binance: 18,     // USDT on Binance typically uses 18 decimals
  binanceTestnet: 18  // USDT on Binance Testnet uses 18 decimals
};
