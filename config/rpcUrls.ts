/**
 * RPC URLs configuration for different blockchain networks
 * These are used for direct JSON-RPC connections when forced network mode is active
 */

// Get Infura key from environment variables (Next.js/Node.js loads from .env.local automatically)
const INFURA_KEY = process.env.INFURA_KEY || process.env.NEXT_PUBLIC_INFURA_KEY;

// Define public RPC endpoints (don't require API keys)
const PUBLIC_RPC_ENDPOINTS: Record<string, string> = {
  ethereum: "https://eth.llamarpc.com",
  polygon: "https://polygon-rpc.com",
  binance: "https://bsc-dataseed.binance.org",
  avalanche: "https://api.avax.network/ext/bc/C/rpc",
  arbitrum: "https://arb1.arbitrum.io/rpc",
  optimism: "https://mainnet.optimism.io",
  fantom: "https://rpc.ftm.tools",
  base: "https://mainnet.base.org",
  zksync: "https://mainnet.era.zksync.io",
  celo: "https://forno.celo.org",
  gnosis: "https://rpc.gnosischain.com",
  cronos: "https://evm.cronos.org",
  
  // Testnets
  goerli: "https://rpc.ankr.com/eth_goerli",
  sepolia: "https://rpc.sepolia.org",
  mumbai: "https://rpc-mumbai.maticvigil.com",
  binanceTestnet: "https://data-seed-prebsc-1-s1.binance.org:8545",
  baseTestnet: "https://goerli.base.org",
  avalancheFuji: "https://api.avax-test.network/ext/bc/C/rpc",
  lineaTestnet: "https://rpc.goerli.linea.build",
  zkSyncTestnet: "https://testnet.era.zksync.dev",
  celoTestnet: "https://alfajores-forno.celo-testnet.org",
};

// Use environment variables if available, otherwise use public endpoints or Infura if key exists
export const RPC_URLS: Record<string, string> = {
  // Mainnet networks
  ethereum: process.env.NEXT_PUBLIC_ETHEREUM_RPC_URL
    || (INFURA_KEY ? `https://mainnet.infura.io/v3/${INFURA_KEY}` : PUBLIC_RPC_ENDPOINTS.ethereum),
  polygon: process.env.NEXT_PUBLIC_POLYGON_RPC_URL
    || PUBLIC_RPC_ENDPOINTS.polygon,
  binance: process.env.NEXT_PUBLIC_BSC_RPC_URL
    || PUBLIC_RPC_ENDPOINTS.binance,
  avalanche: process.env.NEXT_PUBLIC_AVALANCHE_RPC_URL
    || PUBLIC_RPC_ENDPOINTS.avalanche,
  arbitrum: process.env.NEXT_PUBLIC_ARBITRUM_RPC_URL
    || (INFURA_KEY ? `https://arbitrum-mainnet.infura.io/v3/${INFURA_KEY}` : PUBLIC_RPC_ENDPOINTS.arbitrum),
  optimism: process.env.NEXT_PUBLIC_OPTIMISM_RPC_URL
    || (INFURA_KEY ? `https://optimism-mainnet.infura.io/v3/${INFURA_KEY}` : PUBLIC_RPC_ENDPOINTS.optimism),
  fantom: process.env.NEXT_PUBLIC_FANTOM_RPC_URL
    || PUBLIC_RPC_ENDPOINTS.fantom,
  base: process.env.NEXT_PUBLIC_BASE_RPC_URL
    || PUBLIC_RPC_ENDPOINTS.base,
  zksync: process.env.NEXT_PUBLIC_ZKSYNC_RPC_URL
    || PUBLIC_RPC_ENDPOINTS.zksync,
  linea: process.env.NEXT_PUBLIC_LINEA_RPC_URL
    || (INFURA_KEY ? `https://linea-mainnet.infura.io/v3/${INFURA_KEY}` : PUBLIC_RPC_ENDPOINTS.linea),
  celo: process.env.NEXT_PUBLIC_CELO_RPC_URL
    || PUBLIC_RPC_ENDPOINTS.celo,
  gnosis: process.env.NEXT_PUBLIC_GNOSIS_RPC_URL
    || PUBLIC_RPC_ENDPOINTS.gnosis,
  cronos: process.env.NEXT_PUBLIC_CRONOS_RPC_URL
    || PUBLIC_RPC_ENDPOINTS.cronos,
  
  // Testnets
  goerli: process.env.NEXT_PUBLIC_GOERLI_RPC_URL
    || (INFURA_KEY ? `https://goerli.infura.io/v3/${INFURA_KEY}` : PUBLIC_RPC_ENDPOINTS.goerli),
  sepolia: process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL
    || (INFURA_KEY ? `https://sepolia.infura.io/v3/${INFURA_KEY}` : PUBLIC_RPC_ENDPOINTS.sepolia),
  mumbai: process.env.NEXT_PUBLIC_MUMBAI_RPC_URL
    || PUBLIC_RPC_ENDPOINTS.mumbai,
  binanceTestnet: process.env.NEXT_PUBLIC_BSC_TESTNET_RPC_URL
    || PUBLIC_RPC_ENDPOINTS.binanceTestnet,
  arbitrumTestnet: process.env.NEXT_PUBLIC_ARBITRUM_TESTNET_RPC_URL
    || (INFURA_KEY ? `https://arbitrum-goerli.infura.io/v3/${INFURA_KEY}` : PUBLIC_RPC_ENDPOINTS.arbitrumTestnet),
  optimismTestnet: process.env.NEXT_PUBLIC_OPTIMISM_TESTNET_RPC_URL
    || (INFURA_KEY ? `https://optimism-goerli.infura.io/v3/${INFURA_KEY}` : PUBLIC_RPC_ENDPOINTS.optimismTestnet),
  baseTestnet: process.env.NEXT_PUBLIC_BASE_TESTNET_RPC_URL
    || PUBLIC_RPC_ENDPOINTS.baseTestnet,
  avalancheFuji: process.env.NEXT_PUBLIC_AVALANCHE_FUJI_RPC_URL
    || PUBLIC_RPC_ENDPOINTS.avalancheFuji,
  lineaTestnet: process.env.NEXT_PUBLIC_LINEA_TESTNET_RPC_URL
    || PUBLIC_RPC_ENDPOINTS.lineaTestnet,
  zkSyncTestnet: process.env.NEXT_PUBLIC_ZKSYNC_TESTNET_RPC_URL
    || PUBLIC_RPC_ENDPOINTS.zkSyncTestnet,
  celoTestnet: process.env.NEXT_PUBLIC_CELO_TESTNET_RPC_URL
    || PUBLIC_RPC_ENDPOINTS.celoTestnet,
};

// Debug: log which endpoint is being used for each network (apenas para desenvolvimento)
if (process.env.NODE_ENV !== "production") {
  Object.entries(RPC_URLS).forEach(([network, url]) => {
    // Verificar se url é uma string antes de chamar includes()
    if (url && typeof url === 'string' && url.includes("infura.io/v3/undefined")) {
      // eslint-disable-next-line no-console
      console.warn(`⚠️ [rpcUrls] Endpoint Infura sem chave para ${network}: ${url}`);
    }
  });
}

/**
 * Get the RPC URL for a specific network
 * @param network Network name (ethereum, polygon, etc.)
 * @returns The RPC URL for the specified network or null if not found
 */
export function getRpcUrl(network: string): string | null {
  // Normalize network name to match our keys
  const normalized = network.toLowerCase()
    .replace(" mainnet", "")
    .replace("bsc", "binance")
    .replace("matic", "polygon")
    .replace("fuji", "avalanchefuji")
    .replace("xdai", "gnosis");
  
  return RPC_URLS[normalized] || null;
}

export default RPC_URLS;
