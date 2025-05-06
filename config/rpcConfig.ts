// Centraliza a configuração dos endpoints RPC para Polygon

const INFURA_KEY = process.env.INFURA_KEY || '7b71460a7cfd447295a93a1d76a71ed6';
const CUSTOM_POLYGON_RPC = process.env.CUSTOM_POLYGON_RPC;

// Lista de endpoints WebSocket (prioridade: custom, privados, públicos gratuitos)
const wsRpcUrls = [
  CUSTOM_POLYGON_RPC && CUSTOM_POLYGON_RPC.startsWith('wss://') ? CUSTOM_POLYGON_RPC : undefined,
  `wss://polygon-mainnet.infura.io/ws/v3/${INFURA_KEY}`,
  'wss://ws-matic-mainnet.chainstacklabs.com',
  'wss://polygon-bor.publicnode.com',
  'wss://polygon-rpc.com/ws',
  // Adicione outros endpoints WebSocket válidos aqui
].filter((url): url is string => typeof url === 'string' && url.length > 0);

// Lista de endpoints HTTP (fallback)
const httpRpcUrls = [
  CUSTOM_POLYGON_RPC,
  `https://polygon-mainnet.infura.io/v3/${INFURA_KEY}`,
  'https://polygon-rpc.com',
  'https://polygon-bor.publicnode.com',
  'https://rpc-mainnet.matic.quiknode.pro',
  // Adicione outros endpoints gratuitos ou privados aqui
].filter((url): url is string => typeof url === 'string' && url.length > 0);

export function getWsRpcUrls() {
  return wsRpcUrls;
}

export function getHttpRpcUrls() {
  return httpRpcUrls;
}

export function getAllRpcUrls() {
  // Prioridade: WebSocket > HTTP
  return [...wsRpcUrls, ...httpRpcUrls];
}
