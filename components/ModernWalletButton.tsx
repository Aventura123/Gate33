'use client';

import React, { useState, useEffect } from 'react';
import { createWeb3Modal as createModal, useWeb3Modal } from '@web3modal/wagmi/react';
import { mainnet, polygonMumbai, polygon, sepolia } from 'wagmi/chains';
import { useAccount, useDisconnect } from 'wagmi';
import { WagmiConfig, createConfig } from 'wagmi';
import { w3mConnectors } from '@web3modal/ethereum';
import { w3mProvider } from '@web3modal/ethereum';

// ID do projeto - obtendo da variável de ambiente
const projectId = process.env.NEXT_PUBLIC_PROJECT_ID || '9aabcc81f7f1ea4297b818771b48fe8e';

// Criar a configuração do Wagmi
const config = createConfig({
  chains: [mainnet, polygon, polygonMumbai, sepolia],
  connectors: w3mConnectors({ projectId, chains: [mainnet, polygon, polygonMumbai, sepolia] }),
  transports: {
    [mainnet.id]: w3mProvider({ projectId }),
    [polygon.id]: w3mProvider({ projectId }),
    [polygonMumbai.id]: w3mProvider({ projectId }),
    [sepolia.id]: w3mProvider({ projectId })
  }
});

// Initialize Web3Modal in a client-side only context
if (typeof window !== 'undefined') {
  createModal({
    wagmiConfig: config,
    projectId,
    // Remove the chains property as it's not part of WagmiAppKitOptions
    themeMode: 'dark',
    themeVariables: {
      '--w3m-accent-color': '#FB923C',
      '--w3m-background-color': '#000000',
      '--w3m-text-color': '#FFFFFF'
    } as any
  });
}

// Componente da carteira
export function ModernWalletButton() {
  const { open } = useWeb3Modal();
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const [displayAddress, setDisplayAddress] = useState('');

  useEffect(() => {
    if (address) {
      // Formata o endereço para exibição (primeiros 6 chars + ... + últimos 4 chars)
      setDisplayAddress(`${address.substring(0, 6)}...${address.substring(address.length - 4)}`);
    }
  }, [address]);

  return (
    <button
      onClick={isConnected ? () => disconnect() : () => open()}
      className="bg-orange-500 px-4 py-2 rounded-lg text-white font-semibold hover:bg-orange-400 transition-colors"
    >
      {isConnected ? displayAddress : 'Conectar Carteira'}
    </button>
  );
}

// Wrapper para o provider
export function Web3Provider({ children }: { children: React.ReactNode }) {
  return (
    <WagmiConfig config={config}>
      {children}
    </WagmiConfig>
  );
}

export default ModernWalletButton;