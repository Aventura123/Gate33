'use client';

import React from 'react';
import { mainnet, polygonMumbai, polygon, sepolia } from 'wagmi/chains';
import { createConfig } from 'wagmi';
import { http } from 'wagmi';

// Configuração das chains
const chains = [mainnet, polygon, polygonMumbai, sepolia] as const;

// Criar configuração do cliente
const config = createConfig({
  chains,
  transports: {
    [mainnet.id]: http(),
    [polygon.id]: http(),
    [polygonMumbai.id]: http(),
    [sepolia.id]: http()
  }
});

// Componente temporário enquanto resolvemos os problemas com @reown/appkit
export function ReownWalletButton() {
  return (
    <button className="bg-orange-500 px-4 py-2 rounded-lg text-white font-semibold hover:bg-orange-400 transition-colors">
      Conectar Carteira (Reown)
    </button>
  );
}

export default ReownWalletButton;