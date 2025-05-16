// Centralizes the configuration of RPC endpoints for multiple networks

const INFURA_KEY = process.env.INFURA_KEY || process.env.NEXT_PUBLIC_INFURA_KEY || '7b71460a7cfd447295a93a1d76a71ed6';

// Custom endpoints per network (allows override via env)
const CUSTOM_RPC: Record<string, string | undefined> = {
  polygon: process.env.CUSTOM_POLYGON_RPC,
  ethereum: process.env.CUSTOM_ETHEREUM_RPC,
  binance: process.env.CUSTOM_BSC_RPC,
  binanceTestnet: process.env.CUSTOM_BSC_TESTNET_RPC,
  avalanche: process.env.CUSTOM_AVALANCHE_RPC,
  optimism: process.env.CUSTOM_OPTIMISM_RPC,
};

// HTTP endpoints per network
const HTTP_RPC_URLS: Record<string, string[]> = {
  polygon: [
    CUSTOM_RPC.polygon,
    `https://polygon-mainnet.infura.io/v3/${INFURA_KEY}`,
    'https://polygon-rpc.com',
    'https://polygon-bor.publicnode.com',
    'https://rpc-mainnet.matic.quiknode.pro',
  ].filter(Boolean) as string[],
  ethereum: [
    CUSTOM_RPC.ethereum,
    `https://mainnet.infura.io/v3/${INFURA_KEY}`,
    'https://eth.llamarpc.com',
    'https://rpc.ankr.com/eth',
  ].filter(Boolean) as string[],
  binance: [
    CUSTOM_RPC.binance,
    'https://bsc-dataseed.binance.org',
    'https://bsc.publicnode.com',
  ].filter(Boolean) as string[],
  binanceTestnet: [
    CUSTOM_RPC.binanceTestnet,
    'https://bsc-testnet.public.blastapi.io',
    'https://data-seed-prebsc-1-s1.binance.org:8545',
    'https://data-seed-prebsc-2-s1.binance.org:8545',
    'https://bsc-testnet.publicnode.com',
  ].filter(Boolean) as string[],
  avalanche: [
    CUSTOM_RPC.avalanche,
    'https://api.avax.network/ext/bc/C/rpc',
    'https://avalanche-c-chain.publicnode.com',
  ].filter(Boolean) as string[],
  optimism: [
    CUSTOM_RPC.optimism,
    `https://optimism-mainnet.infura.io/v3/${INFURA_KEY}`,
    'https://optimism.publicnode.com',
  ].filter(Boolean) as string[],
};

// WebSocket endpoints per network
const WS_RPC_URLS: Record<string, string[]> = {
  polygon: [
    CUSTOM_RPC.polygon && CUSTOM_RPC.polygon.startsWith('wss://') ? CUSTOM_RPC.polygon : undefined,
    `wss://polygon-mainnet.infura.io/ws/v3/${INFURA_KEY}`,
    'wss://ws-matic-mainnet.chainstacklabs.com',
    'wss://polygon-bor.publicnode.com',
    'wss://polygon-rpc.com/ws',
  ].filter(Boolean) as string[],
  ethereum: [
    CUSTOM_RPC.ethereum && CUSTOM_RPC.ethereum.startsWith('wss://') ? CUSTOM_RPC.ethereum : undefined,
    `wss://mainnet.infura.io/ws/v3/${INFURA_KEY}`,
  ].filter(Boolean) as string[],
  binance: [
    CUSTOM_RPC.binance && CUSTOM_RPC.binance.startsWith('wss://') ? CUSTOM_RPC.binance : undefined,
    'wss://bsc-ws-node.nariox.org:443',
  ].filter(Boolean) as string[],
  binanceTestnet: [
    CUSTOM_RPC.binanceTestnet && CUSTOM_RPC.binanceTestnet.startsWith('wss://') ? CUSTOM_RPC.binanceTestnet : undefined,
    'wss://bsc-testnet.publicnode.com',
  ].filter(Boolean) as string[],
  avalanche: [
    CUSTOM_RPC.avalanche && CUSTOM_RPC.avalanche.startsWith('wss://') ? CUSTOM_RPC.avalanche : undefined,
    'wss://avalanche-c-chain.publicnode.com/ws',
    'wss://api.avax.network/ext/bc/C/ws',
  ].filter(Boolean) as string[],
  optimism: [
    CUSTOM_RPC.optimism && CUSTOM_RPC.optimism.startsWith('wss://') ? CUSTOM_RPC.optimism : undefined,
    `wss://optimism-mainnet.infura.io/ws/v3/${INFURA_KEY}`,
    'wss://optimism.publicnode.com',
  ].filter(Boolean) as string[],
};

export function getHttpRpcUrls(network: string): string[] {
  const n = network.toLowerCase();
  return HTTP_RPC_URLS[n] || [];
}

export function getWsRpcUrls(network: string): string[] {
  const n = network.toLowerCase();
  return WS_RPC_URLS[n] || [];
}

export function getAllRpcUrls(network: string): string[] {
  return [...getWsRpcUrls(network), ...getHttpRpcUrls(network)];
}
