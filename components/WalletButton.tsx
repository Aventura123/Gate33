"use client";

import React, { useState, useEffect } from 'react';
import { web3Service, NetworkType } from '../services/web3Service';
import { useWallet } from './WalletProvider';
import WalletModal from './WalletModal';

// Helper function to get network color
const getNetworkColor = (network: NetworkType): string => {
  switch (network) {
    case 'polygon': return 'purple';
    case 'binance': return 'yellow';
    case 'avalanche': return 'red';
    case 'optimism': return 'pink';
    case 'base': return 'indigo';
    default: return 'gray';
  }
};

// Helper function to get network details
const getNetworkDetails = (network: NetworkType) => {
  switch (network) {
    case 'polygon':
      return {
        name: 'Polygon Mainnet',
        nativeCurrency: 'MATIC',
        color: 'bg-purple-500'
      };
    case 'binance':
      return {
        name: 'Binance Smart Chain',
        nativeCurrency: 'BNB',
        color: 'bg-yellow-500'
      };    case 'avalanche':
      return {
        name: 'Avalanche C-Chain',
        nativeCurrency: 'AVAX',
        color: 'bg-red-500'
      };
    case 'optimism':
      return {
        name: 'Optimism',
        nativeCurrency: 'ETH',
        color: 'bg-pink-500'
      };
    case 'base':
      return {
        name: 'Base',
        nativeCurrency: 'ETH',
        color: 'bg-indigo-500'
      };
    default:
      return {
        name: String(network).charAt(0).toUpperCase() + String(network).slice(1),
        nativeCurrency: '...',
        color: 'bg-gray-500'
      };
  }
};

// NetworkStatusIndicator component for better visual feedback
const NetworkStatusIndicator: React.FC<{
  isLoading: boolean;
  networkType: NetworkType;
}> = ({ isLoading, networkType }) => {
  const color = getNetworkColor(networkType);
  
  if (!isLoading) return null;
    return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-xl max-w-sm w-full border-2 border-orange-400">
        <div className="flex flex-col items-center">
          <div className="w-16 h-16 rounded-full border-4 border-orange-200 border-t-orange-500 animate-spin mb-4"></div>
          <h3 className="text-lg font-medium mb-2 text-orange-600">Switching Network</h3>
          <p className="text-gray-700 text-center mb-2">
            Connecting to <span className="font-semibold text-orange-600">{networkType.charAt(0).toUpperCase() + networkType.slice(1)}</span> network...
          </p>
          <p className="text-xs bg-orange-50 p-2 rounded-md border border-orange-100 text-gray-600 text-center mt-2 w-full">
            Please approve the request in your wallet if prompted
          </p>
        </div>
      </div>
    </div>
  );
};

// Network Overview component to show after successful network switch
const NetworkOverview: React.FC<{
  networkType: NetworkType;
  showSuccess: boolean;
  onClose: () => void;
}> = ({ networkType, showSuccess, onClose }) => {
  const networkDetails = getNetworkDetails(networkType);
  
  if (!showSuccess) return null;
  
  return (
    <div className="fixed bottom-4 right-4 bg-white shadow-xl rounded-lg p-4 max-w-xs w-full z-50 border border-green-200">
      <div className="flex justify-between items-center mb-2">
        <h3 className="font-medium text-gray-800">Network Changed</h3>
        <button 
          onClick={onClose} 
          className="text-gray-400 hover:text-gray-600"
          aria-label="Close notification"
          title="Close"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      <div className="flex items-center mb-2">
        <div className={`w-3 h-3 rounded-full ${networkDetails.color} mr-2`}></div>
        <span className="text-sm font-medium">{networkDetails.name}</span>
      </div>
      <p className="text-xs text-gray-500">
        You are now connected to the {networkDetails.name} network. Native currency: {networkDetails.nativeCurrency}.
      </p>
        </div>
      );
    };

interface WalletButtonProps {
  onConnect?: (address: string) => void;
  onDisconnect?: () => void;
  className?: string;
  availableNetworks?: NetworkType[];
  showNetworkSelector?: boolean;
  title?: string;
}

const WalletButton: React.FC<WalletButtonProps> = ({ 
  onConnect, 
  onDisconnect,
  className = "",
  availableNetworks: propNetworks,
  showNetworkSelector = true,
  title = "Connect Wallet"
}) => {
  // Use global wallet context
  const {
    walletAddress,
    currentNetwork,
    isConnectingWallet,
    isUsingWalletConnect,
    walletError,
    connectWallet,
    disconnectWallet,
    switchNetwork,
    availableNetworks: contextNetworks
  } = useWallet();

  // Local UI state only for modals and dropdowns
  const [showWalletOptions, setShowWalletOptions] = useState(false);
  const [showNetworkModal, setShowNetworkModal] = useState(false);
  const [showNetworkSuccess, setShowNetworkSuccess] = useState(false);
  // Prefer context networks if available
  const availableNetworks: NetworkType[] = (propNetworks || contextNetworks || [
    "base", "polygon", "binance", "avalanche", "optimism"
  ]) as NetworkType[];

  // Format address for display
  const formatAddress = (address: string) => {
    if (!address) return '';
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  };

  // Handle connect/disconnect
  const handleConnect = async (type: 'metamask' | 'walletconnect') => {
    // Prevent multiple connection attempts
    if (isConnectingWallet) {
      console.log('[WalletButton] Connection already in progress, ignoring request');
      return;
    }
    
    try {
      await connectWallet(type);
      if (onConnect && walletAddress) onConnect(walletAddress);
      setShowWalletOptions(false);
    } catch (error) {
      console.error('[WalletButton] Connection error:', error);
    }
  };
  const handleDisconnect = async () => {
    try {
      await disconnectWallet();
      if (onDisconnect) onDisconnect();
    } catch (error) {
      console.error('[WalletButton] Error during disconnect:', error);
      // Still call onDisconnect even if there was an error
      if (onDisconnect) onDisconnect();
    }
  };

  // Handle network switch
  const handleSwitchNetwork = async (network: NetworkType) => {
    try {
      await switchNetwork(network);
      setShowNetworkModal(false);
      setShowNetworkSuccess(true);
      setTimeout(() => setShowNetworkSuccess(false), 5000);
    } catch {}
  };

  // Render
  return (
    <div className="wallet-button-container relative">
      {/* Network Success Notification */}
      {showNetworkSuccess && (
        <div className="fixed bottom-4 right-4 rounded-2xl border border-orange-400 bg-black/80 backdrop-blur-xl p-4 max-w-xs w-full z-50 wallet-modal-shadow">
          <div className="flex justify-between items-center mb-2">
            <h3 className="font-medium text-orange-500 text-base">Network Changed</h3>
            <button onClick={() => setShowNetworkSuccess(false)} className="text-orange-500 hover:text-orange-400 transition" aria-label="Close notification" title="Close">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
          <div className="flex items-center mb-2">
            <span className={`w-3 h-3 rounded-full mr-2 ${getNetworkDetails(currentNetwork as NetworkType).color}`} />
            <span className="text-sm font-medium text-gray-200">{getNetworkDetails(currentNetwork as NetworkType).name}</span>
          </div>
          <p className="text-xs text-gray-400">You are now connected to the {currentNetwork} network.</p>
        </div>
      )}
      {walletError && (
        <div className="text-red-500 text-xs mb-1">{walletError}</div>
      )}
      {!walletAddress ? (
        <>
          <button 
            onClick={() => setShowWalletOptions((v) => !v)}
            disabled={isConnectingWallet}
            className={`bg-orange-500 px-4 py-2 rounded-lg text-white font-semibold hover:bg-orange-400 transition-colors ${isConnectingWallet ? 'opacity-70 cursor-not-allowed' : ''} ${className}`}
          >
            {isConnectingWallet ? 'Connecting...' : title}
          </button>
          {showWalletOptions && !isConnectingWallet && (
            <div className="absolute z-10 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 left-1/2 transform -translate-x-1/2">
              <button
                onClick={() => handleConnect('metamask')}
                disabled={isConnectingWallet}
                className="w-full text-left px-4 py-2 hover:bg-orange-100 text-gray-800 rounded-t-lg flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span role="img" aria-label="MetaMask" className="mr-2">🦊</span>
                MetaMask
              </button>
              <button
                onClick={() => handleConnect('walletconnect')}
                disabled={isConnectingWallet}
                className="w-full text-left px-4 py-2 hover:bg-orange-100 text-gray-800 rounded-b-lg border-t border-gray-100 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span role="img" aria-label="WalletConnect" className="mr-2">🔗</span>
                WalletConnect
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="flex flex-col gap-2 items-center">
          <div className="flex items-center gap-2">
            {/* Provider icon */}
            {isUsingWalletConnect ? (
              <span role="img" aria-label="WalletConnect" className="w-5 h-5">🔗</span>
            ) : (
              <span role="img" aria-label="MetaMask" className="w-5 h-5">🦊</span>
            )}
            {/* Address */}
            <span className="bg-green-900/30 text-green-400 text-xs font-medium px-2.5 py-0.5 rounded select-all">Connected</span>
            <span className="text-sm font-mono text-gray-200 select-all">{formatAddress(walletAddress)}</span>
            {/* Disconnect button */}
            <button onClick={handleDisconnect} className="ml-1 px-2 py-0.5 rounded text-xs text-orange-400 border border-orange-400 hover:bg-orange-400 hover:text-white transition">Disconnect</button>
          </div>
          {showNetworkSelector && (
            <div className="flex items-center mt-1">
              <button
                type="button"
                onClick={() => setShowNetworkModal(true)}
                onMouseDown={e => e.preventDefault()}
                className="flex items-center text-sm border border-gray-700 rounded px-2 py-1 hover:bg-orange-900/10 transition"
              >
                {(() => {
                  const details = getNetworkDetails(currentNetwork as NetworkType);
                  return (
                    <>
                      <span className={`inline-block w-3 h-3 rounded-full mr-2 ${details.color}`}></span>
                      <span className="text-gray-200">{details.name}</span>
                    </>
                  );
                })()}
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
              </button>
            </div>
          )}
        </div>
      )}
      {/* Wallet Modal sempre renderizado quando showNetworkModal for true */}
      {showNetworkModal && (
        <WalletModal
          open={showNetworkModal}
          onClose={() => setShowNetworkModal(false)}
          walletAddress={walletAddress}
          currentNetwork={currentNetwork}
          isUsingWalletConnect={isUsingWalletConnect}
          availableNetworks={availableNetworks}
          onDisconnect={handleDisconnect}
          onSwitchNetwork={(network) => { handleSwitchNetwork(network as NetworkType); }}
        />
      )}
    </div>
  );
};

export default WalletButton;
