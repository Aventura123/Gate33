"use client";
import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import web3Service from '../services/web3Service';

interface WalletContextType {
  walletAddress: string | null;
  currentNetwork: string | null;
  isUsingWalletConnect: boolean;
  walletError: string | null;
  isConnectingWallet: boolean;
  availableNetworks: string[];
  connectWallet: (type?: 'metamask' | 'walletconnect') => Promise<void>;
  disconnectWallet: () => void;
  switchNetwork: (network: string) => Promise<void>;
  clearWalletError: () => void;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export const WalletProvider = ({ children }: { children: ReactNode }) => {
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [currentNetwork, setCurrentNetwork] = useState<string | null>(null);
  const [isUsingWalletConnect, setIsUsingWalletConnect] = useState(false);
  const [walletError, setWalletError] = useState<string | null>(null);
  const [isConnectingWallet, setIsConnectingWallet] = useState(false);
  const [availableNetworks] = useState<string[]>(["ethereum", "polygon", "binance", "binanceTestnet", "avalanche", "optimism"]);

  // Query provider and set state
  const updateWalletInfo = async () => {
    try {
      if (web3Service && typeof web3Service.isWalletConnected === 'function') {
        const isConnected = web3Service.isWalletConnected();
        if (isConnected) {
          const walletInfo = web3Service.getWalletInfo();
          setWalletAddress(walletInfo?.address || null);
          setCurrentNetwork(walletInfo?.networkName || null);
          setIsUsingWalletConnect(!!web3Service.wcV2Provider);
          return;
        }
      }
      setWalletAddress(null);
      setCurrentNetwork(null);
      setIsUsingWalletConnect(false);
    } catch (error) {
      setWalletAddress(null);
      setCurrentNetwork(null);
      setIsUsingWalletConnect(false);
    }
  };

  useEffect(() => {
    updateWalletInfo();
    // Event listeners
    const handleWeb3Connected = (e: any) => {
      setWalletAddress(e.detail?.address || e.detail || null);
      if (e.detail?.networkName) setCurrentNetwork(e.detail.networkName);
      setIsUsingWalletConnect(!!web3Service.wcV2Provider);
    };
    const handleWeb3Disconnected = () => {
      setWalletAddress(null);
      setCurrentNetwork(null);
      setIsUsingWalletConnect(false);
    };
    const handleWalletConnected = (e: any) => {
      setWalletAddress(e.detail?.address || e.detail || null);
      if (e.detail?.network) setCurrentNetwork(e.detail.network);
      setIsUsingWalletConnect(!!web3Service.wcV2Provider);
    };
    const handleWalletDisconnected = () => {
      setWalletAddress(null);
      setCurrentNetwork(null);
      setIsUsingWalletConnect(false);
    };
    const handleChainChanged = () => updateWalletInfo();
    const handleAccountsChanged = () => updateWalletInfo();
    const handleNetworkChanged = (e: any) => {
      if (e.detail?.network) setCurrentNetwork(e.detail.network);
      setIsUsingWalletConnect(e.detail?.forced || !!web3Service.wcV2Provider);
    };
    const handleForcedNetwork = (e: any) => {
      if (e.detail?.networkType) setCurrentNetwork(e.detail.networkType);
      setIsUsingWalletConnect(true);
    };
    window.addEventListener('web3Connected', handleWeb3Connected);
    window.addEventListener('web3Disconnected', handleWeb3Disconnected);
    window.addEventListener('walletConnected', handleWalletConnected);
    window.addEventListener('walletDisconnected', handleWalletDisconnected);
    window.addEventListener('chainChanged', handleChainChanged);
    window.addEventListener('accountsChanged', handleAccountsChanged);
    window.addEventListener('networkChanged', handleNetworkChanged);
    window.addEventListener('web3ForcedNetwork', handleForcedNetwork);
    return () => {
      window.removeEventListener('web3Connected', handleWeb3Connected);
      window.removeEventListener('web3Disconnected', handleWeb3Disconnected);
      window.removeEventListener('walletConnected', handleWalletConnected);
      window.removeEventListener('walletDisconnected', handleWalletDisconnected);
      window.removeEventListener('chainChanged', handleChainChanged);
      window.removeEventListener('accountsChanged', handleAccountsChanged);
      window.removeEventListener('networkChanged', handleNetworkChanged);
      window.removeEventListener('web3ForcedNetwork', handleForcedNetwork);
    };
  }, []);

  const connectWallet = async (type?: 'metamask' | 'walletconnect') => {
    setIsConnectingWallet(true);
    setWalletError(null);
    try {
      let walletInfo;
      if (type === 'walletconnect') {
        walletInfo = await web3Service.connectWalletConnect();
      } else {
        walletInfo = await web3Service.connectWallet();
      }
      setWalletAddress(walletInfo?.address || null);
      setCurrentNetwork(walletInfo?.networkName || null);
      setIsUsingWalletConnect(!!web3Service.wcV2Provider);
    } catch (error: any) {
      setWalletError(error.message || 'Failed to connect wallet');
    } finally {
      setIsConnectingWallet(false);
    }
  };

  const disconnectWallet = () => {
    web3Service.disconnectWallet();
    setWalletAddress(null);
    setCurrentNetwork(null);
    setIsUsingWalletConnect(false);
  };

  const switchNetwork = async (network: string) => {
    setWalletError(null);
    try {
      await web3Service.attemptProgrammaticNetworkSwitch(network as any);
      setCurrentNetwork(network);
    } catch (error: any) {
      setWalletError(error.message || 'Failed to switch network');
    }
  };

  const clearWalletError = () => setWalletError(null);

  return (
    <WalletContext.Provider value={{
      walletAddress,
      currentNetwork,
      isUsingWalletConnect,
      walletError,
      isConnectingWallet,
      availableNetworks,
      connectWallet,
      disconnectWallet,
      switchNetwork,
      clearWalletError
    }}>
      {children}
    </WalletContext.Provider>
  );
};

export const useWallet = () => {
  const context = useContext(WalletContext);
  if (!context) throw new Error('useWallet must be used within a WalletProvider');
  return context;
};
