"use client";

import React, { useState, useEffect } from 'react';
import { web3Service, NetworkType } from '../services/web3Service';
import { useWallet } from './WalletProvider';

// Helper function to get network color
const getNetworkColor = (network: NetworkType): string => {
  switch (network) {
    case 'ethereum': return 'blue';
    case 'polygon': return 'purple';
    case 'binance': return 'yellow';
    case 'binanceTestnet': return 'orange';
    case 'avalanche': return 'red';
    case 'optimism': return 'pink';
    default: return 'gray';
  }
};

// Helper function to get network details
const getNetworkDetails = (network: NetworkType) => {
  switch (network) {
    case 'ethereum':
      return {
        name: 'Ethereum Mainnet',
        nativeCurrency: 'ETH',
        color: 'blue'
      };
    case 'polygon':
      return {
        name: 'Polygon Mainnet',
        nativeCurrency: 'MATIC',
        color: 'purple'
      };
    case 'binance':
      return {
        name: 'Binance Smart Chain',
        nativeCurrency: 'BNB',
        color: 'yellow'
      };
    case 'binanceTestnet':
      return {
        name: 'BSC Testnet',
        nativeCurrency: 'tBNB',
        color: 'orange'
      };
    case 'avalanche':
      return {
        name: 'Avalanche C-Chain',
        nativeCurrency: 'AVAX',
        color: 'red'      };
    case 'optimism':
      return {
        name: 'Optimism',
        nativeCurrency: 'ETH',
        color: 'pink'
      };
    default:
      return {
        name: String(network).charAt(0).toUpperCase() + String(network).slice(1),
        nativeCurrency: '...',
        color: 'gray'
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
        <div className={`w-3 h-3 rounded-full bg-${networkDetails.color}-500 mr-2`}></div>
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
    "ethereum", "polygon", "binance", "binanceTestnet", "avalanche", "optimism"
  ]) as NetworkType[];

  // Format address for display
  const formatAddress = (address: string) => {
    if (!address) return '';
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  };

  // Handle connect/disconnect
  const handleConnect = async (type: 'metamask' | 'walletconnect') => {
    try {
      await connectWallet(type);
      if (onConnect && walletAddress) onConnect(walletAddress);
      setShowWalletOptions(false);
    } catch {}
  };
  const handleDisconnect = () => {
    disconnectWallet();
    if (onDisconnect) onDisconnect();
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
        <div className="fixed bottom-4 right-4 bg-white shadow-xl rounded-lg p-4 max-w-xs w-full z-50 border border-green-200">
          <div className="flex justify-between items-center mb-2">
            <h3 className="font-medium text-gray-800">Network Changed</h3>
            <button onClick={() => setShowNetworkSuccess(false)} className="text-gray-400 hover:text-gray-600" aria-label="Close notification" title="Close">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
          <div className="flex items-center mb-2">
            <div className={`w-3 h-3 rounded-full bg-green-500 mr-2`}></div>
            <span className="text-sm font-medium">{currentNetwork ? currentNetwork.charAt(0).toUpperCase() + currentNetwork.slice(1) : ''}</span>
          </div>
          <p className="text-xs text-gray-500">You are now connected to the {currentNetwork} network.</p>
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
            <div className="absolute z-10 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 left-0">
              <button
                onClick={() => handleConnect('metamask')}
                className="w-full text-left px-4 py-2 hover:bg-orange-100 text-gray-800 rounded-t-lg"
              >
                <span role="img" aria-label="MetaMask" className="mr-2">🦊</span>
                MetaMask
              </button>
              <button
                onClick={() => handleConnect('walletconnect')}
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
            <span className="bg-green-100 text-green-800 text-xs font-medium px-2.5 py-0.5 rounded">Connected</span>
            <span className="text-sm">{formatAddress(walletAddress)}</span>
            <button onClick={handleDisconnect} className="text-xs text-red-500 hover:text-red-700">Disconnect</button>
          </div>
          {showNetworkSelector && (
            <div className="network-selector flex items-center">
              <button onClick={() => setShowNetworkModal(true)} className="flex items-center text-sm border rounded px-2 py-1 hover:bg-gray-50">
                {(() => {
                  const details = getNetworkDetails(currentNetwork as NetworkType);
                  return (
                    <>
                      <span className={`inline-block w-3 h-3 rounded-full mr-2 bg-${details.color}-500`}></span>
                      {details.name}
                    </>
                  );
                })()}
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
              </button>
              {showNetworkModal && (
                <div className="fixed inset-0 z-50 overflow-auto bg-black bg-opacity-50 flex items-center justify-center">
                  <div className="bg-white rounded-lg p-6 max-w-md w-full shadow-xl border-2 border-orange-400">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-lg font-semibold text-orange-600">Select Network</h3>
                      <button onClick={() => setShowNetworkModal(false)} className="text-orange-400 hover:text-orange-600" aria-label="Close network selection modal" title="Close">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                      </button>
                    </div>
                    <div className="grid gap-3">
                      {availableNetworks.map((network: NetworkType) => {
                        const details = getNetworkDetails(network);
                        return (
                          <button
                            key={network}
                            onClick={() => handleSwitchNetwork(network)}
                            className={`flex items-center p-3 rounded-lg transform transition-all duration-200 hover:bg-orange-50 hover:border hover:border-orange-200 hover:shadow-sm`}
                          >
                            <span className={`inline-block w-4 h-4 rounded-full mr-3 bg-${details.color}-500`}></span>
                            <div className="flex-1 text-left">
                              <p className="font-medium text-gray-700">{details.name}</p>
                              <p className="text-xs text-gray-500">{network}</p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default WalletButton;
