"use client";

import React, { useState, useEffect } from 'react';
import { web3Service } from '../services/web3Service';

interface WalletButtonProps {
  onConnect?: (address: string) => void;
  onDisconnect?: () => void;
  className?: string;
}

const WalletButton: React.FC<WalletButtonProps> = ({ 
  onConnect, 
  onDisconnect,
  className = ""
}) => {
  const [isConnected, setIsConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Verificar se já existe uma carteira conectada
    const checkConnection = async () => {
      if (web3Service.isWalletConnected()) {
        const walletInfo = web3Service.getWalletInfo();
        if (walletInfo) {
          setIsConnected(true);
          setWalletAddress(walletInfo.address);
          
          if (onConnect) {
            onConnect(walletInfo.address);
          }
        }
      }
    };

    checkConnection();

    // Adicionar evento para detectar mudanças de conta
    if (typeof window !== 'undefined' && window.ethereum) {
      window.ethereum.on('accountsChanged', (accounts: string[]) => {
        if (accounts.length === 0) {
          // Usuário desconectou a conta
          handleDisconnect();
        } else {
          // Usuário trocou para outra conta
          setWalletAddress(accounts[0]);
          setIsConnected(true);
          
          if (onConnect) {
            onConnect(accounts[0]);
          }
        }
      });

      // Detectar mudança de rede
      window.ethereum.on('chainChanged', () => {
        // Recarregar a página quando a rede mudar
        window.location.reload();
      });
    }

    // Cleanup dos listeners
    return () => {
      if (typeof window !== 'undefined' && window.ethereum) {
        window.ethereum.removeAllListeners('accountsChanged');
        window.ethereum.removeAllListeners('chainChanged');
      }
    };
  }, [onConnect, onDisconnect]);

  const handleConnect = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const walletInfo = await web3Service.connectWallet();
      setIsConnected(true);
      setWalletAddress(walletInfo.address);
      
      if (onConnect) {
        onConnect(walletInfo.address);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to connect wallet');
      console.error('Error connecting wallet:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisconnect = () => {
    web3Service.disconnectWallet();
    setIsConnected(false);
    setWalletAddress('');
    
    if (onDisconnect) {
      onDisconnect();
    }
  };

  // Formatar endereço para exibição
  const formatAddress = (address: string) => {
    if (!address) return '';
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  };

  return (
    <div className="wallet-button-container">
      {error && (
        <div className="text-red-500 text-xs mb-1">
          {error}
        </div>
      )}
      
      {!isConnected ? (
        <button 
          onClick={handleConnect}
          disabled={isLoading}
          className={`bg-orange-500 px-4 py-2 rounded-lg text-white font-semibold hover:bg-orange-400 transition-colors ${isLoading ? 'opacity-70 cursor-not-allowed' : ''} ${className}`}
        >
          {isLoading ? 'Connecting...' : 'Connect Wallet'}
        </button>
      ) : (
        <div className="flex items-center gap-2">
          <span className="bg-green-100 text-green-800 text-xs font-medium px-2.5 py-0.5 rounded">
            Connected
          </span>
          <span className="text-sm">{formatAddress(walletAddress)}</span>
          <button
            onClick={handleDisconnect}
            className="text-xs text-red-500 hover:text-red-700"
          >
            Disconnect
          </button>
        </div>
      )}
    </div>
  );
};

export default WalletButton;
