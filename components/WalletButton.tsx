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
                <ModalBackdrop open={showNetworkModal} onClose={() => setShowNetworkModal(false)}>
                  <div className="rounded-2xl wallet-modal-shadow border border-orange-400 bg-white/80 dark:bg-black/80 backdrop-blur-xl p-6 min-w-[320px] max-w-[95vw] mx-auto relative">
                    <button className="absolute top-3 right-3 text-orange-400 hover:text-orange-600 transition" onClick={() => setShowNetworkModal(false)} aria-label="Close">
                      <svg width="20" height="20" fill="none" viewBox="0 0 24 24"><path stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
                    </button>
                    <h3 className="text-lg font-semibold mb-4 text-orange-600">Select Network</h3>
                    <div className="flex flex-col gap-3">
                      {(() => {
                        const rows: NetworkType[][] = [];
                        for (let i = 0; i < availableNetworks.length; i += 3) {
                          rows.push(availableNetworks.slice(i, i + 3));
                        }
                        return rows.map((row, idx) => (
                          <div key={idx} className="flex flex-row gap-3 justify-center">
                            {row.map((network) => {
                              const details = getNetworkDetails(network);
                              const isActive = network === currentNetwork;
                              return (
                                <button
                                  key={network}
                                  onClick={() => handleSwitchNetwork(network)}
                                  className={`flex items-center gap-2 px-3 py-2 rounded-full text-xs font-medium border transition-all ${isActive ? 'border-orange-500 text-white shadow pointer-events-none bg-orange-400' : 'border-transparent text-gray-800 dark:text-gray-200 opacity-80 hover:opacity-100 hover:border-orange-400 hover:scale-105 pointer-events-auto bg-white/60 dark:bg-black/60'} min-w-90`}
                                  type="button"
                                >
                                  <span className={`w-3 h-3 rounded-full mr-2 ${details.color}`} />
                                  <span className="flex flex-col items-start">
                                    <span>{details.name}</span>
                                    <span className="text-[10px] text-gray-400 lowercase">{network}</span>
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        ));
                      })()}
                    </div>
                  </div>
                </ModalBackdrop>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Modal backdrop with children prop
const ModalBackdrop: React.FC<{ open: boolean; onClose: () => void; children: React.ReactNode }> = ({ open, onClose, children }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm transition-all">
      <div className="absolute inset-0" onClick={onClose} />
      <div className="relative z-10">{children}</div>
    </div>
  );
};

const WalletModal: React.FC<{
  open: boolean;
  onClose: () => void;
  walletAddress: string | null;
  currentNetwork: string | null;
  isUsingWalletConnect: boolean;
  availableNetworks: string[];
  onDisconnect: () => void;
  onSwitchNetwork: (network: string) => void;
}> = ({ open, onClose, walletAddress, currentNetwork, isUsingWalletConnect, availableNetworks, onDisconnect, onSwitchNetwork }) => {
  // Helper for network details
  const getNetworkDetails = (network: string) => {
    switch (network) {
      case 'ethereum': return { name: 'Ethereum', color: 'bg-[#FB923C]' };
      case 'polygon': return { name: 'Polygon', color: 'bg-purple-500' };
      case 'binance': return { name: 'BNB Smart Chain', color: 'bg-yellow-400' };
      case 'binanceTestnet': return { name: 'BSC Testnet', color: 'bg-orange-400' };
      case 'optimism': return { name: 'OP Mainnet', color: 'bg-pink-400' };
      case 'avalanche': return { name: 'Avalanche', color: 'bg-gray-400' };
      default: return { name: network, color: 'bg-gray-400' };
    }
  };
  // Organize networks in rows of 3
  const rows: string[][] = [];
  for (let i = 0; i < availableNetworks.length; i += 3) {
    rows.push(availableNetworks.slice(i, i + 3));
  }
  return (
    <ModalBackdrop open={open} onClose={onClose}>
      <div className="rounded-2xl shadow-2xl border border-white/10 bg-white/70 dark:bg-black/70 backdrop-blur-xl p-6 min-w-[320px] max-w-[95vw] mx-auto relative wallet-modal-shadow">
        <button className="absolute top-3 right-3 text-gray-400 hover:text-orange-500 transition" onClick={onClose} aria-label="Close">
          <svg width="20" height="20" fill="none" viewBox="0 0 24 24"><path stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
        </button>
        <h2 className="text-lg font-semibold mb-2 text-gray-900 dark:text-white">Manage Wallet</h2>
        <div className="mb-4">
          <span className="block text-xs text-gray-500 mb-1">Your network is:</span>
          <div className="flex flex-col gap-2 mb-2">
            {rows.map((row: string[], idx: number) => (
              <div key={idx} className="flex flex-row gap-2 justify-center">
                {row.map((n: string) => {
                  const d = getNetworkDetails(n);
                  const isActive = n === currentNetwork;
                  return (
                    <button
                      key={n}
                      onClick={() => !isActive && onSwitchNetwork(n)}
                      className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium border transition-all ${d.color} ${isActive ? 'border-orange-500 text-white shadow pointer-events-none' : 'border-transparent text-gray-800 dark:text-gray-200 opacity-80 hover:opacity-100 hover:border-orange-400 hover:scale-105 pointer-events-auto'} bg-opacity-80 min-w-90`}
                      type="button"
                    >
                      <span className={`w-2 h-2 rounded-full ${d.color} mr-1`} />
                      {d.name}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2 mb-4">
          {isUsingWalletConnect ? (
            <img src="https://raw.githubusercontent.com/WalletConnect/walletconnect-assets/master/svg/walletconnect-logo.svg" alt="WalletConnect" className="w-5 h-5" />
          ) : (
            <img src="/logo.png" alt="MetaMask" className="w-5 h-5" />
          )}
          <span className="text-xs text-gray-700 dark:text-gray-200 font-mono select-all">{walletAddress ? walletAddress.slice(0,6) + '...' + walletAddress.slice(-6) : ''}</span>
        </div>
        <button
          className="w-full py-2 rounded-lg bg-[#FB923C] text-white font-semibold text-sm shadow hover:bg-orange-400 transition mb-2"
          onClick={onDisconnect}
        >
          Disconnect your Wallet
        </button>
        <div className="text-xs text-gray-500 text-center mt-2">
          If you have any questions – please contact <a href="/support" className="text-orange-500 underline">Support</a>.<br/>
          <span className="inline-flex gap-2 mt-1">
            <a href="https://t.me/gate33" target="_blank" rel="noopener" aria-label="Telegram"><svg width="16" height="16" fill="none" viewBox="0 0 24 24"><path d="M9.04 13.47l-.37 4.13c.53 0 .76-.23 1.04-.5l2.5-2.38 5.18 3.78c.95.53 1.63.25 1.87-.88l3.4-15.88c.34-1.56-.56-2.17-1.57-1.8L1.6 9.13c-1.53.6-1.5 1.47-.26 1.85l4.13 1.29 9.6-6.06c.45-.28.87-.13.53.18l-7.8 7.08z" fill="#FB923C"/></svg></a>
            <a href="https://twitter.com/gate33" target="_blank" rel="noopener" aria-label="Twitter"><svg width="16" height="16" fill="none" viewBox="0 0 24 24"><path d="M22.46 5.92c-.8.36-1.67.6-2.58.71a4.48 4.48 0 0 0 1.97-2.48 8.94 8.94 0 0 1-2.83 1.08A4.48 4.48 0 0 0 16.1 4c-2.48 0-4.5 2.02-4.5 4.5 0 .35.04.7.11 1.03C7.69 9.4 4.07 7.7 1.64 5.15c-.38.65-.6 1.4-.6 2.2 0 1.52.77 2.86 1.95 3.65-.72-.02-1.4-.22-1.99-.55v.06c0 2.13 1.52 3.9 3.54 4.3-.37.1-.76.16-1.16.16-.28 0-.55-.03-.81-.08.55 1.7 2.16 2.94 4.07 2.97A9.01 9.01 0 0 1 2 20.29c-.29 0-.57-.02-.85-.05A12.77 12.77 0 0 0 8.29 22c7.55 0 11.68-6.26 11.68-11.68 0-.18-.01-.36-.02-.54.8-.58 1.5-1.3 2.05-2.12z" fill="#FB923C"/></svg></a>
          </span>
        </div>
      </div>
    </ModalBackdrop>
  );
};

export default WalletButton;
