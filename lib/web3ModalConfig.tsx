import { defaultWagmiConfig } from '@web3modal/wagmi/react';
import { mainnet, polygon, polygonMumbai, sepolia, arbitrum, optimism, avalanche, bsc, base, baseSepolia } from 'viem/chains';

export const projectId = process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID || '3ec307eb85c1037e53c027b7772aea00';

const chains = [mainnet, polygon, polygonMumbai, sepolia, arbitrum, optimism, avalanche, bsc, base, baseSepolia] as const;

// Verificar se estamos no cliente para evitar erros de SSR
const isBrowser = typeof window !== 'undefined';

// Função para obter a URL base atual (funciona em qualquer ambiente)
const getBaseUrl = () => {
  if (isBrowser) {
    // No navegador, usamos a origem atual
    return window.location.origin;
  }
  
  // Valor padrão para SSR
  return process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
};

// Somente criar a configuração se estivermos no navegador
export const wagmiConfig = isBrowser 
  ? defaultWagmiConfig({
      chains,
      projectId,
      metadata: {
        name: 'Gate33',
        description: 'Gate33 Web3 Application',
        url: getBaseUrl(),
        icons: ['https://avatars.githubusercontent.com/u/37784886']
      },
    })
  : null;
