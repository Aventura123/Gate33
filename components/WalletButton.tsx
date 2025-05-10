"use client";

import React, { useState, useEffect } from 'react';
import { web3Service, NetworkType } from '../services/web3Service';

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
  const [showWalletOptions, setShowWalletOptions] = useState(false);
  const [availableNetworks, setAvailableNetworks] = useState<NetworkType[]>(["ethereum", "polygon", "binance"]);
  const [currentNetwork, setCurrentNetwork] = useState<NetworkType>("ethereum");

  useEffect(() => {
    // Map or validate networkName to ensure it matches NetworkType
    const checkConnection = async () => {
      if (web3Service.isWalletConnected()) {
        const walletInfo = web3Service.getWalletInfo();
        if (walletInfo) {
          setIsConnected(true);
          setWalletAddress(walletInfo.address);
          const validNetwork = availableNetworks.includes(walletInfo.networkName as NetworkType)
            ? (walletInfo.networkName as NetworkType)
            : "ethereum"; // Default to a valid NetworkType
          setCurrentNetwork(validNetwork);

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

  useEffect(() => {
    if (isConnected) {
      const walletInfo = web3Service.getWalletInfo();
      if (walletInfo) {
        const validNetwork = availableNetworks.includes(walletInfo.networkName as NetworkType)
          ? (walletInfo.networkName as NetworkType)
          : "ethereum"; // Default to a valid NetworkType
        setCurrentNetwork(validNetwork);
      }
    }
  }, [isConnected]);

  // Ensure networkName is validated or mapped to NetworkType
  const handleConnectMetaMask = async () => {
    setIsLoading(true);
    setError(null);
    setShowWalletOptions(false);
    try {
      const walletInfo = await web3Service.connectWallet();
      setIsConnected(true);
      setWalletAddress(walletInfo.address);

      // Validate or map networkName to NetworkType
      const validNetwork = availableNetworks.find(
        (network) => network === walletInfo.networkName
      ) || "ethereum"; // Default to a valid NetworkType

      setCurrentNetwork(validNetwork as NetworkType);

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

  const handleConnectWalletConnect = async () => {
    setIsLoading(true);
    setError(null);
    setShowWalletOptions(false);
    try {
      const walletInfo = await web3Service.connectWalletConnect();
      setIsConnected(true);
      setWalletAddress(walletInfo.address);

      // Validate or map networkName to NetworkType
      const validNetwork = availableNetworks.find(
        (network) => network === walletInfo.networkName
      ) || "ethereum"; // Default to a valid NetworkType

      setCurrentNetwork(validNetwork as NetworkType);

      if (onConnect) {
        onConnect(walletInfo.address);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to connect with WalletConnect');
      console.error('Error connecting WalletConnect:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisconnect = () => {
    web3Service.disconnectWallet();
    setIsConnected(false);
    setWalletAddress('');
    setCurrentNetwork("ethereum"); // Default to a valid NetworkType

    if (onDisconnect) {
      onDisconnect();
    }
  };

  const handleSwitchNetwork = async (network: NetworkType) => {
    setIsLoading(true);
    setError(null);
    try {
      // Se for WalletConnect, só muda o estado local
      if (web3Service.wcV2Provider) {
        setCurrentNetwork(network);
        // Opcional: pode mostrar um aviso leve, mas não bloqueia
        // setError("Rede alterada apenas no app. Confirme na sua carteira se necessário.");
      } else {
        await web3Service.switchNetwork(network);
        setCurrentNetwork(network);
      }
    } catch (err: any) {
      setError(err.message || "Failed to switch network");
    } finally {
      setIsLoading(false);
    }
  };

  // Formatar endereço para exibição
  const formatAddress = (address: string) => {
    if (!address) return '';
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  };

  // Fix JSX structure by ensuring all tags are properly closed
  return (
    <div className="wallet-button-container relative">
      {error && (
        <div className="text-red-500 text-xs mb-1">
          {error}
        </div>
      )}

      {!isConnected ? (
        <>
          <button 
            onClick={() => setShowWalletOptions((v) => !v)}
            disabled={isLoading}
            className={`bg-orange-500 px-4 py-2 rounded-lg text-white font-semibold hover:bg-orange-400 transition-colors ${isLoading ? 'opacity-70 cursor-not-allowed' : ''} ${className}`}
          >
            {isLoading ? 'Connecting...' : 'Connect Wallet'}
          </button>
          {showWalletOptions && !isLoading && (
            <div className="absolute z-10 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 left-0">
              <button
                onClick={handleConnectMetaMask}
                className="w-full text-left px-4 py-2 hover:bg-orange-100 text-gray-800 rounded-t-lg"
              >
                <span role="img" aria-label="MetaMask" className="mr-2">🦊</span>
                MetaMask
              </button>
              <button
                onClick={handleConnectWalletConnect}
                className="w-full text-left px-4 py-2 hover:bg-orange-100 text-gray-800 rounded-b-lg border-t border-gray-100"
              >
                <span role="img" aria-label="WalletConnect" className="mr-2">🔗</span>
                WalletConnect
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="flex flex-col gap-2">
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

          <div className="network-selector">
            <label className="text-xs text-gray-500">Network:</label>
            <select
              value={currentNetwork}
              onChange={(e) => handleSwitchNetwork(e.target.value as NetworkType)}
              className="text-sm border rounded px-2 py-1 text-black bg-white"
            >
              {availableNetworks.map((network) => (
                <option key={network} value={network}>
                  {network.charAt(0).toUpperCase() + network.slice(1)}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}
    </div>
  );
};

export default WalletButton;
