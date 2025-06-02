import { ethers } from 'ethers';
import { getHttpRpcUrls } from '../../config/rpcConfig';

export type NativeTokenBalance = {
  network: string;
  symbol: string;
  balance: string;
};

// SERVICE_WALLET_ADDRESS is hardcoded here for browser compatibility
const SERVICE_WALLET_ADDRESS = '0xDdbC4f514019d835Dd9Ac6198fDa45c39512552C';

const NETWORKS = [
  { key: 'ethereum', symbol: 'ETH' },
  { key: 'binance', symbol: 'BNB' },
  { key: 'avalanche', symbol: 'AVAX' },
  { key: 'polygon', symbol: 'MATIC' },
  { key: 'optimism', symbol: 'ETH' },
];

export async function fetchNativeTokenBalances(address: string = SERVICE_WALLET_ADDRESS): Promise<NativeTokenBalance[]> {
  const results: NativeTokenBalance[] = [];
  for (const net of NETWORKS) {
    try {
      const rpcUrls = getHttpRpcUrls(net.key);
      if (!rpcUrls.length) {
        results.push({ network: net.key, symbol: net.symbol, balance: 'No RPC URL' });
        continue;
      }
      const provider = new ethers.providers.JsonRpcProvider(rpcUrls[0]);
      const raw = await provider.getBalance(address);
      const formatted = ethers.utils.formatEther(raw);
      results.push({ network: net.key, symbol: net.symbol, balance: formatted });
    } catch (e) {
      results.push({ network: net.key, symbol: net.symbol, balance: 'Error' });
    }
  }
  return results;
}
