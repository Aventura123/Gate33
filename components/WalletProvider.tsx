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
  disconnectWallet: () => Promise<void>;
  switchNetwork: (network: string) => Promise<void>;
  clearWalletError: () => void;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export const WalletProvider = ({ children }: { children: ReactNode }) => {
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [currentNetwork, setCurrentNetwork] = useState<string | null>("base");
  const [isUsingWalletConnect, setIsUsingWalletConnect] = useState(false);
  const [walletError, setWalletError] = useState<string | null>(null);
  const [isConnectingWallet, setIsConnectingWallet] = useState(false);
  const [availableNetworks] = useState<string[]>(["base", "polygon", "binance", "avalanche", "optimism"]);

  // Function to normalize network names to match our expected format
  const normalizeNetworkName = (networkName: string): string => {
    const normalized = networkName.toLowerCase();
    if (normalized === 'base') return 'base';
    if (normalized === 'binance smart chain' || normalized === 'bsc') return 'binance';
    if (normalized === 'polygon mainnet' || normalized === 'matic') return 'polygon';
    if (normalized === 'avalanche c-chain' || normalized === 'avax') return 'avalanche';
    if (normalized === 'optimism') return 'optimism';
    return normalized;
  };

  // Function to dispatch forced network event for all components
  const dispatchForcedNetwork = (networkType: string, reason: string) => {
    window.dispatchEvent(new CustomEvent('web3ForcedNetwork', { 
      detail: { 
        networkType,
        forced: true,
        reason
      } 
    }));
  };

  // Query provider and set state
  const updateWalletInfo = async () => {
    try {
      if (web3Service && typeof web3Service.isWalletConnected === 'function') {
        const isConnected = web3Service.isWalletConnected();
        console.log('[WalletProvider] Wallet connected status:', isConnected);
        if (isConnected) {
          const walletInfo = web3Service.getWalletInfo();
          console.log('[WalletProvider] Wallet info:', walletInfo);
          setWalletAddress(walletInfo?.address || null);
          
          // Normalize network name and force it for all components
          const networkName = walletInfo?.networkName;
          if (networkName) {
            const normalizedNetwork = normalizeNetworkName(networkName);
            console.log('[WalletProvider] Setting network to:', normalizedNetwork);
            setCurrentNetwork(normalizedNetwork);
            
            // Force the detected network for all components
            dispatchForcedNetwork(normalizedNetwork, `Wallet connected - forcing ${normalizedNetwork} network`);
          } else {
            console.log('[WalletProvider] No network name, defaulting to base');
            setCurrentNetwork('base');
            
            // Force Base when no network is detected
            dispatchForcedNetwork('base', 'No network detected - defaulting to Base');
          }
          setIsUsingWalletConnect(!!web3Service.wcV2Provider);
          return;
        }
      }
      // When no wallet is connected, keep Base as default network
      console.log('[WalletProvider] No wallet connected, setting base as default');
      setWalletAddress(null);
      setCurrentNetwork("base"); // Force Base as default instead of null
      setIsUsingWalletConnect(false);
      
      // Force Base network for all components when no wallet is connected
      dispatchForcedNetwork('base', 'No wallet connected - forcing Base as default');
    } catch (error) {
      // On error, also keep Base as default network
      console.log('[WalletProvider] Error in updateWalletInfo, setting base as default:', error);
      setWalletAddress(null);
      setCurrentNetwork("base"); // Force Base as default instead of null
      setIsUsingWalletConnect(false);
    }
  };

  useEffect(() => {
    updateWalletInfo();
    // Event listeners
    const handleWeb3Connected = (e: any) => {
      setWalletAddress(e.detail?.address || e.detail || null);
      if (e.detail?.networkName) {
        const networkName = e.detail.networkName;
        const normalizedNetwork = normalizeNetworkName(networkName);
        setCurrentNetwork(normalizedNetwork);
        
        // Force the detected network for all components
        dispatchForcedNetwork(normalizedNetwork, `Wallet connected via web3Connected - forcing ${normalizedNetwork} network`);
      }
      setIsUsingWalletConnect(!!web3Service.wcV2Provider);
    };
    const handleWeb3Disconnected = () => {
      setWalletAddress(null);
      setCurrentNetwork("base"); // Keep Base as default instead of null
      setIsUsingWalletConnect(false);
    };
    const handleWalletConnected = (e: any) => {
      setWalletAddress(e.detail?.address || e.detail || null);
      if (e.detail?.network) {
        const networkName = e.detail.network;
        const normalizedNetwork = normalizeNetworkName(networkName);
        setCurrentNetwork(normalizedNetwork);
        
        // Force the detected network for all components
        dispatchForcedNetwork(normalizedNetwork, `Wallet connected via walletConnected - forcing ${normalizedNetwork} network`);
      }
      setIsUsingWalletConnect(!!web3Service.wcV2Provider);
    };
    const handleWalletDisconnected = () => {
      setWalletAddress(null);
      setCurrentNetwork("base"); // Keep Base as default instead of null
      setIsUsingWalletConnect(false);
    };
    const handleChainChanged = () => updateWalletInfo();
    const handleAccountsChanged = () => updateWalletInfo();
    const handleNetworkChanged = (e: any) => {
      if (e.detail?.network) {
        const networkName = e.detail.network;
        const normalizedNetwork = normalizeNetworkName(networkName);
        setCurrentNetwork(normalizedNetwork);
        
        // Force the changed network for all components
        dispatchForcedNetwork(normalizedNetwork, `Network changed - forcing ${normalizedNetwork} network`);
      }
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

  // Force network as default when no wallet is connected (Base) or force detected network when wallet is connected
  useEffect(() => {
    console.log('[WalletProvider] Force network useEffect - walletAddress:', walletAddress, 'currentNetwork:', currentNetwork);
    if (!walletAddress && currentNetwork !== "base") {
      console.log('[WalletProvider] Forcing network to base');
      setCurrentNetwork("base");
      // Dispatch event to inform components that Base is being forced
      dispatchForcedNetwork('base', 'No wallet connected - defaulting to Base');
    } else if (walletAddress && currentNetwork) {
      // Force the current network when wallet is connected
      console.log('[WalletProvider] Wallet connected, forcing current network:', currentNetwork);
      dispatchForcedNetwork(currentNetwork, `Wallet connected - forcing ${currentNetwork} network`);
    }
  }, [walletAddress, currentNetwork]);

  const connectWallet = async (type?: 'metamask' | 'walletconnect') => {
    // Prevent multiple concurrent connection attempts
    if (isConnectingWallet) {
      console.log('[WalletProvider] Connection already in progress, ignoring duplicate request');
      return;
    }
    
    setIsConnectingWallet(true);
    setWalletError(null);
    try {
      let walletInfo;
      if (type === 'walletconnect') {
        walletInfo = await web3Service.connectWalletConnect();
        // Defensive WalletConnect session event listener to prevent errors
        if (web3Service.wcV2Provider && typeof web3Service.wcV2Provider.on === 'function') {
          // Prevent duplicate listeners
          web3Service.wcV2Provider.removeAllListeners?.('session_event');
          web3Service.wcV2Provider.on('session_event', (event: any) => {
            // Defensive: log or ignore session events to prevent WalletConnect errors
            // console.debug('[WalletConnect] session_event:', event);
          });
        }
      } else {
        walletInfo = await web3Service.connectWallet();
      }
      setWalletAddress(walletInfo?.address || null);
      // Normalize network name and force it for all components
      const networkName = walletInfo?.networkName;
      if (networkName) {
        const normalizedNetwork = normalizeNetworkName(networkName);
        setCurrentNetwork(normalizedNetwork);
        
        // Force the connected network for all components
        dispatchForcedNetwork(normalizedNetwork, `Wallet connected via connectWallet - forcing ${normalizedNetwork} network`);
      } else {
        setCurrentNetwork('base');
        
        // Force Base when no network is detected
        dispatchForcedNetwork('base', 'No network detected in connectWallet - defaulting to Base');
      }
      setIsUsingWalletConnect(!!web3Service.wcV2Provider);
    } catch (error: any) {
      setWalletError(error.message || 'Failed to connect wallet');
    } finally {
      setIsConnectingWallet(false);
    }
  };

  const disconnectWallet = async () => {
    try {
      console.log('[WalletProvider] Starting wallet disconnection...');
      await web3Service.disconnectWallet();
      setWalletAddress(null);
      setCurrentNetwork("base");
      setIsUsingWalletConnect(false);
      setWalletError(null);
      
      // Clear any additional local state that might persist
      if (typeof window !== 'undefined') {
        // Clear any wallet-related cookies or session data if needed
        // This ensures complete cleanup across the application
      }
      
      // Force Base when disconnecting
      dispatchForcedNetwork('base', 'Wallet disconnected - forcing Base as default');
      
      console.log('[WalletProvider] Wallet disconnection completed successfully');
    } catch (error) {
      console.error('[WalletProvider] Error during disconnect:', error);
      // Even if disconnect fails, clear the local state
      setWalletAddress(null);
      setCurrentNetwork("base");
      setIsUsingWalletConnect(false);
      setWalletError(null);
      
      // Force Base when disconnecting
      dispatchForcedNetwork('base', 'Wallet disconnected - forcing Base as default');
      
      console.log('[WalletProvider] Local state cleared despite disconnect error');
    }
  };

  const switchNetwork = async (network: string) => {
    setWalletError(null);
    try {
      await web3Service.attemptProgrammaticNetworkSwitch(network as any);
      const normalizedNetwork = normalizeNetworkName(network);
      setCurrentNetwork(normalizedNetwork);
      
      // Force the switched network for all components
      dispatchForcedNetwork(normalizedNetwork, `Network switched - forcing ${normalizedNetwork} network`);
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
