// Token addresses for different networks
export const USDT_ADDRESSES = {
  ethereum: "0xdAC17F958D2ee523a2206206994597C13D831ec7",    // Ethereum Mainnet
  polygon: "0xc2132D05D31c914a87C6611C10748AEb04B58e8F",     // Polygon Mainnet
  binance: "0x55d398326f99059fF775485246999027B3197955",     // BSC Mainnet
  avalanche: "0x9702230A8Ea53601f5cD2dc00fDBc13d4dF4A8c7",    // Avalanche C-Chain
  optimism: "0x94b008aA00579c1307B0EF2c499aD98a8ce58e58",     // Optimism
  base: "0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2"          // Base Mainnet USDT
};

// Add mock USDT addresses for fallback/testing
export const MOCK_USDT_ADDRESSES = {
  ethereum: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
  polygon: "0xc2132D05D31c914a87C6611C10748AEb04B58e8F",
  binance: "0x55d398326f99059fF775485246999027B3197955",
  avalanche: "0x9702230A8Ea53601f5cD2dc00fDBc13d4dF4A8c7",
  optimism: "0x94b008aA00579c1307B0EF2c499aD98a8ce58e58",
  base: "0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2"
};

// Decimals for each network's USDT implementation
export const TOKEN_DECIMALS = {
  ethereum: 6,     // USDT on Ethereum uses 6 decimals
  polygon: 6,      // USDT on Polygon uses 6 decimals 
  binance: 18,     // USDT on Binance typically uses 18 decimals
  avalanche: 6,    // USDT on Avalanche uses 6 decimals
  optimism: 6,     // USDT on Optimism uses 6 decimals
  base: 6          // USDT on Base uses 6 decimals
};
