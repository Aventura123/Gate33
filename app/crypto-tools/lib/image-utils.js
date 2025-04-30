// File: app/compare/lib/image-utils.js

/**
 * Get cryptocurrency icon URL by symbol
 * 
 * This function returns a URL for a cryptocurrency icon.
 * In a real application, you would fetch these from an API like CoinGecko,
 * but for this demo we're using placeholder images.
 * 
 * @param {string} symbol - Cryptocurrency symbol
 * @param {number} size - Icon size in pixels
 * @returns {string} URL for the cryptocurrency icon
 */
export function getCryptoIconUrl(symbol, size = 32) {
    // In a real application, this would be replaced with actual API calls to 
    // services like CoinGecko that provide cryptocurrency icons
    
    // Example implementation using placeholders:
    // return `https://api.coinicons.net/icon/${symbol.toLowerCase()}/${size}`;
    
    // For this demo, we'll return a placeholder
    return `/api/placeholder/${size}/${size}`;
  }
  
  /**
   * Get cryptocurrency color by symbol
   * 
   * In a real implementation, you would map these colors to actual brand colors
   * of the cryptocurrencies.
   * 
   * @param {string} symbol - Cryptocurrency symbol
   * @returns {string} Hex color code
   */
  export function getCryptoColor(symbol) {
    const colorMap = {
      'BTC': '#f7931a', // Bitcoin orange
      'ETH': '#627eea', // Ethereum blue
      'USDT': '#26a17b', // Tether green
      'SOL': '#00ffbd', // Solana teal
      'BNB': '#f3ba2f', // Binance yellow
      'XRP': '#23292f', // Ripple dark
      'ADA': '#0033ad', // Cardano blue
      'DOGE': '#ba9f33', // Dogecoin gold
      'DOT': '#e6007a', // Polkadot pink
      'AVAX': '#e84142', // Avalanche red
      'MATIC': '#8247e5', // Polygon purple
      'LINK': '#2a5ada'  // Chainlink blue
    };
    
    return colorMap[symbol] || '#718096'; // Default gray for unknown symbols
  }