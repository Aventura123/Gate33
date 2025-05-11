"use client";

import React, { useState, useEffect } from 'react';
import { web3Service, NetworkType } from '../services/web3Service';

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
  const [isConnected, setIsConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showWalletOptions, setShowWalletOptions] = useState(false);
  const [showNetworkModal, setShowNetworkModal] = useState(false);
  const [showNetworkSuccess, setShowNetworkSuccess] = useState(false);  const [availableNetworks, setAvailableNetworks] = useState<NetworkType[]>(
    propNetworks || ["ethereum", "polygon", "binance", "binanceTestnet", "avalanche", "optimism"]
  );
  const [currentNetwork, setCurrentNetwork] = useState<NetworkType>("ethereum");
  const [needsReconnect, setNeedsReconnect] = useState(false);
  const [pendingNetworkSwitch, setPendingNetworkSwitch] = useState<NetworkType | null>(null);
  // Effect to initialize component with propNetworks
  useEffect(() => {
    if (propNetworks && propNetworks.length > 0) {
      setAvailableNetworks(propNetworks);
    }
  }, [propNetworks]);

  useEffect(() => {
    // Map or validate networkName to ensure it matches NetworkType
    const checkConnection = async () => {
      if (web3Service.isWalletConnected()) {
        const walletInfo = web3Service.getWalletInfo();
        if (walletInfo) {
          setIsConnected(true);
          setWalletAddress(walletInfo.address);
          
          // Check if the current network is in our available networks
          const validNetwork = availableNetworks.includes(walletInfo.networkName as NetworkType)
            ? (walletInfo.networkName as NetworkType)
            : availableNetworks[0]; // Default to first available network
            
          setCurrentNetwork(validNetwork);

          if (onConnect) {
            onConnect(walletInfo.address);
          }
        }
      }
    };

    checkConnection();

    // Add event to detect account changes
    if (typeof window !== 'undefined' && window.ethereum) {
      window.ethereum.on('accountsChanged', (accounts: string[]) => {
        if (accounts.length === 0) {
          // User disconnected the account
          handleDisconnect();
        } else {
          // User switched to another account
          setWalletAddress(accounts[0]);
          setIsConnected(true);
          
          if (onConnect) {
            onConnect(accounts[0]);
          }
        }
      });

      // Detect network change
      window.ethereum.on('chainChanged', () => {
        // Reload the page when the network changes
        window.location.reload();
      });
    }

    // Cleanup listeners
    return () => {
      if (typeof window !== 'undefined' && window.ethereum) {
        window.ethereum.removeAllListeners('accountsChanged');
        window.ethereum.removeAllListeners('chainChanged');
      }
    };
  }, [onConnect, onDisconnect, availableNetworks]);
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
  // Effect to handle WalletConnect automatic reconnection
  useEffect(() => {
    const handleReconnection = async () => {
      if (needsReconnect && pendingNetworkSwitch) {
        try {
          setError('Session expired. Reconnecting wallet...');
          
          // Close networks modal while reconnecting to avoid confusion
          setShowNetworkModal(false);
          
          console.log('Starting automatic reconnection of WalletConnect wallet...');
          
          // Reconnect WalletConnect
          const walletInfo = await web3Service.connectWalletConnect();
          // LOG provider and session after reconnection
          console.log('[WalletButton] After reconnection: wcV2Provider', web3Service.wcV2Provider);
          console.log('[WalletButton] After reconnection: wcV2Provider.session', web3Service.wcV2Provider?.session);
          if (!web3Service.wcV2Provider || !web3Service.wcV2Provider.session || !web3Service.wcV2Provider.session.accounts || web3Service.wcV2Provider.session.accounts.length === 0) {
            setError('The WalletConnect session is not active. Open your wallet app and connect again.');
            setIsLoading(false);
            setNeedsReconnect(false);
            setPendingNetworkSwitch(null);
            return;
          }
          setIsConnected(true);
          setWalletAddress(walletInfo.address);
          
          // Small delay to ensure the connection is established
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          // Network switch log for debug
          console.log(`[WalletButton] Trying to switch to network: ${pendingNetworkSwitch}, with provider type: ${web3Service.wcV2Provider ? 'WalletConnect' : 'MetaMask/Injected'}`);
          
          // Try network switch again after reconnection
          setError('Wallet reconnected. Applying network switch...');
          await web3Service.attemptProgrammaticNetworkSwitch(pendingNetworkSwitch);
          setCurrentNetwork(pendingNetworkSwitch);
          
          // Clear reconnection state
          setPendingNetworkSwitch(null);
          setNeedsReconnect(false);
          setError(null);
          
          // Notify other application components about the change
          window.dispatchEvent(new CustomEvent('networkChanged', {
            detail: { network: pendingNetworkSwitch, forced: !!web3Service.wcV2Provider }
          }));
          
          console.log(`Successfully reconnected and switched to network ${pendingNetworkSwitch}`);
        } catch (err: any) {
          console.error('Error during automatic reconnection:', err);
          
          // Provide specific guidance based on error type
          if (err.message?.includes('User closed') || 
              err.message?.includes('User rejected') || 
              err.message?.includes('rejected') ||
              err.message?.includes('cancelou')) {
            setError('The reconnection was canceled. Try connecting your wallet again.');
          } 
          else if (err.message?.includes('timeout') || 
                   err.message?.includes('timed out') || 
                   err.message?.includes('tempo esgotado')) {
            setError('Reconnection timeout. Check if your wallet app is open and try again.');
          }
          else {
            setError(`Reconnection failed: ${err.message}. Please switch networks manually in your wallet.`);
          }
          
          setPendingNetworkSwitch(null);
          setNeedsReconnect(false);
        } finally {
          setIsLoading(false);
        }
      }
    };

    if (needsReconnect && pendingNetworkSwitch) {
      handleReconnection();
    }
    // Register listener for successful network switch events
    const handleNetworkSwitched = (event: any) => {
      const { networkType, chainId, name, provider } = event.detail;
      console.log(`Network switch event detected: ${name} (${chainId}) via ${provider || 'unknown'}`);
      setCurrentNetwork(networkType);
      setError(null);
      setIsLoading(false);
      setPendingNetworkSwitch(null);
      setShowNetworkSuccess(true);
      
      // Close the network modal only after successful network switch
      setShowNetworkModal(false);
      
      console.log('[WalletButton] Network switched successfully, modal closed');
    };
    
    window.addEventListener('web3NetworkSwitched', handleNetworkSwitched);
    
    return () => {
      window.removeEventListener('web3NetworkSwitched', handleNetworkSwitched);
    };
  }, [needsReconnect, pendingNetworkSwitch]);

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

      setCurrentNetwork(validNetwork as NetworkType);      if (onConnect) {
        onConnect(walletInfo.address);
      }
      
      // Dispatch event to notify other components about wallet connection
      window.dispatchEvent(new CustomEvent('walletConnected', { 
        detail: { address: walletInfo.address, network: validNetwork } 
      }));
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

      setCurrentNetwork(validNetwork as NetworkType);      if (onConnect) {
        onConnect(walletInfo.address);
      }
      
      // Dispatch event to notify other components about wallet connection
      window.dispatchEvent(new CustomEvent('walletConnected', { 
        detail: { address: walletInfo.address, network: validNetwork } 
      }));
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

    // Dispatch event to notify other components about wallet disconnection
    window.dispatchEvent(new CustomEvent('walletDisconnected'));

    if (onDisconnect) {
      onDisconnect();
    }
  };  const handleSwitchNetwork = async (network: NetworkType) => {
    if (network === currentNetwork) {
      // If we are already on the selected network, just close the modal and do nothing
      setShowNetworkModal(false);
      return;
    }
    
    setIsLoading(true);
    setError(null);
    try {
      // Store pending network to show status indicator
      setPendingNetworkSwitch(network);
      
      // Debug log
      console.log(`[WalletButton] Starting switch to network: ${network}`);
      
      // Try to change network programmatically (both for MetaMask and WalletConnect)
      await web3Service.attemptProgrammaticNetworkSwitch(network);
      
      // Log after switch attempt
      console.log(`[WalletButton] After switch attempt to: ${network}`);
      
      // Update local state after successful change
      setCurrentNetwork(network);
      setPendingNetworkSwitch(null);
      
      // Notify other application components about the change
      window.dispatchEvent(new CustomEvent('networkChanged', {
        detail: { network, forced: !!web3Service.wcV2Provider }
      }));
      
      // Visual success feedback
      setError(null);
      setShowNetworkSuccess(true);
      
      // Hide notification after 5 seconds
      setTimeout(() => {
        setShowNetworkSuccess(false);
      }, 5000);
      setShowNetworkSuccess(true);
      
      console.log(`Network changed to ${network} ${web3Service.wcV2Provider ? '(WalletConnect)' : '(MetaMask)'}`);
    } catch (err: any) {
      console.error('Error switching networks:', err);
        console.log('[WalletButton] Detailed error in network switch:', {
        message: err.message,
        hasWcProvider: !!web3Service.wcV2Provider,
        code: err.code
      });
      
      // Check if it's an expired session error or WalletConnect connection
      const isSessionExpiredError = err.message?.includes('Connect your wallet') || 
                                   err.message?.includes('session expired') ||
                                   err.message?.includes('WalletConnect session') ||
                                   err.message?.includes('connection') ||
                                   err.message?.includes('Please call connect') || 
                                   err.message?.includes('connection is not open') ||
                                   err.message?.includes('connect') ||
                                   err.message?.includes('reconnect');
      
      // If it's WalletConnect and session/connection error, start reconnection flow
      if (isSessionExpiredError && web3Service.wcV2Provider) {
        console.log('[WalletButton] WalletConnect connection error detected. Starting automatic reconnection...');
        setPendingNetworkSwitch(network);
        setNeedsReconnect(true);
        setError('We detected a connection problem. Starting reconnection...');
        return;
      }
      
      // Specific feedback based on error type for better UX
      if (err.message?.includes('User rejected') || 
          err.message?.includes('rejected') ||
          err.message?.includes('cancelled') ||
          err.code === 4001) {
        setError('You rejected the network switch. Try again when you are ready.');
      } 
      else if (err.message?.includes('switch manually') || 
               err.message?.includes('not supported') ||
               err.message?.includes('Unrecognized') ||
               err.message?.includes('not support')) {
        setError(`Your wallet doesn't support automatic network switching. Please open your wallet app and change to ${network.charAt(0).toUpperCase() + network.slice(1)} network manually.`);
      }
      else if (err.message?.includes('Time expired') || 
               err.message?.includes('timeout') ||
               err.message?.includes('timed out')) {
        setError('Timeout waiting for wallet response. Check if your app is open and try again.');
      }
      else {
        setError(err.message || 'Could not switch networks. Try again or change manually in your wallet app.');
      }} finally {
      // Only disable loading if we're not in a reconnection process
      if (!needsReconnect) {
        setIsLoading(false);
        setPendingNetworkSwitch(null);
      }
    }
  };  // Handle BSC specific switching with retry mechanism and better WalletConnect support
  const handleBSCNetworkSwitch = async (networkType: NetworkType = 'binance') => {
    // Check if it's a valid BSC network (mainnet or testnet)
    if (networkType !== 'binance' && networkType !== 'binanceTestnet') {
      networkType = 'binance'; // Default to mainnet if value is invalid
    }
    
    if (currentNetwork === networkType) {
      setShowNetworkModal(false);
      return;
    }
    
    setIsLoading(true);
    setError(null);
    setPendingNetworkSwitch(networkType);
    
    console.log(`[WalletButton] Starting special switch to ${networkType === 'binance' ? 'BSC Mainnet' : 'BSC Testnet'}`);
    
    // Detect if we're using WalletConnect
    const isUsingWalletConnect = !!web3Service.wcV2Provider;
    console.log('[WalletButton] Using WalletConnect:', isUsingWalletConnect);
    
    try {
      // First check - we verify if we're using WalletConnect and adjust the strategy
      if (isUsingWalletConnect) {
        console.log(`[WalletButton] Using specific method for WalletConnect with ${networkType}`);
        await web3Service.attemptProgrammaticNetworkSwitch(networkType);
      } else {
        // First attempt for MetaMask/other providers
        await web3Service.switchNetwork(networkType);
      }
        console.log(`[WalletButton] Switch to ${networkType} successful on first attempt`);
      
      // Update current network
      setCurrentNetwork(networkType);
      setShowNetworkSuccess(true);
      setShowNetworkModal(false);
      
      // Notify other components
      window.dispatchEvent(new CustomEvent('networkChanged', {
        detail: { network: networkType, forced: isUsingWalletConnect }
      }));
      
    } catch (err: any) {
      console.error('[WalletButton] First error switching to BSC:', err);
      
      // Check if it's an expired WalletConnect session error
      const isSessionExpiredError = err.message?.includes('session expired') || 
                                   err.message?.includes('WalletConnect') ||
                                   err.message?.includes('session') || 
                                   err.message?.includes('connection') ||
                                   err.message?.includes('reconnect');
      
      if (isUsingWalletConnect && isSessionExpiredError) {
        console.log('[WalletButton] WalletConnect session error detected. Starting reconnection process...');
        setNeedsReconnect(true);
        setError('The connection to your wallet was lost. Trying to reconnect...');
        return;
      }
      
      try {
        // More wait time for BSC which tends to be slower
        await new Promise(resolve => setTimeout(resolve, 2000));
            console.log(`[WalletButton] Making second attempt for ${networkType}`);
        
        // Always use the more robust method in the second attempt
        await web3Service.attemptProgrammaticNetworkSwitch(networkType);
        
        console.log(`[WalletButton] Switch to ${networkType} successful on second attempt`);
        setCurrentNetwork(networkType);
        setShowNetworkSuccess(true);
        setShowNetworkModal(false);
        
        // Notify other components
        window.dispatchEvent(new CustomEvent('networkChanged', {
          detail: { network: networkType, forced: isUsingWalletConnect }
        }));
        
      } catch (retryErr: any) {
        console.error('[WalletButton] Failed on second attempt for BSC too:', retryErr);
          // Specialized error handling for BSC
        if (retryErr.message?.includes('User rejected') || retryErr.code === 4001) {
          setError(`You rejected the switch to ${networkType === 'binance' ? 'Binance Smart Chain' : 'BSC Testnet'} network.`);
        } else if (retryErr.message?.includes('session') || retryErr.message?.includes('connection')) {
          setNeedsReconnect(true);
          setError('The connection to your wallet was lost. Trying to reconnect...');
        } else {
          const networkConfig = web3Service.networks[networkType];
          setError(`Failed to connect to ${networkType === 'binance' ? 'Binance Smart Chain' : 'BSC Testnet'}. Please add the network manually in your wallet with ChainID: ${networkConfig.chainId}, Name: ${networkConfig.name}, RPC: ${networkConfig.rpcUrl}`);
        }
      }
    } finally {
      // Only remove loading if we're not trying to reconnect
      if (!needsReconnect) {
        setIsLoading(false);
        setPendingNetworkSwitch(null);
      }
    }  };
  
  // Modify the network button for BSC to use the specialized handler
  const renderNetworkButton = (network: NetworkType) => {
    const isCurrentNetwork = currentNetwork === network;
    const networkColor = network === 'ethereum' ? 'blue' : 
                          network === 'polygon' ? 'purple' : 
                          network === 'binance' ? 'yellow' : 
                          network === 'binanceTestnet' ? 'orange' : 
                          network === 'avalanche' ? 'red' : 
                          network === 'optimism' ? 'pink' : 'gray'; 
    const handleClick = (network === 'binance' || network === 'binanceTestnet') ? 
                         () => handleBSCNetworkSwitch(network) : 
                         () => handleSwitchNetwork(network);
    
    return (
      <button
        key={network}
        onClick={handleClick}
        className={`flex items-center p-3 rounded-lg transform transition-all duration-200 ${
          isLoading ? 'opacity-70 cursor-not-allowed' : 
          isCurrentNetwork ? 
            `bg-orange-100 border border-orange-300 shadow-md` : 
            'hover:bg-orange-50 hover:border hover:border-orange-200 hover:shadow-sm'
        }`}
        disabled={isLoading}
      >
        <span className={`inline-block w-4 h-4 rounded-full mr-3 bg-${networkColor}-${isCurrentNetwork ? '500' : '400'}`}></span>
        <div className="flex-1 text-left">
          <p className={`font-medium ${isCurrentNetwork ? 'text-orange-700' : 'text-gray-700'}`}>
            {network.charAt(0).toUpperCase() + network.slice(1)}
          </p>          <p className="text-xs text-gray-500">
            {network === 'ethereum' ? 'Ethereum Mainnet' : 
             network === 'polygon' ? 'Polygon Mainnet' : 
             network === 'binance' ? 'Binance Smart Chain' : 
             network === 'binanceTestnet' ? 'BSC Testnet' : 
             network === 'avalanche' ? 'Avalanche C-Chain' : 
             network === 'optimism' ? 'Optimism' : 'Network'}
          </p>
        </div>
        {isCurrentNetwork && (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        )}
      </button>
    );
  };

  // Format address for display
  const formatAddress = (address: string) => {
    if (!address) return '';
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  };

  return (
    <div className="wallet-button-container relative">
      {/* Network Status Indicator - Only show when loading */}
      {isLoading && pendingNetworkSwitch && (
        <NetworkStatusIndicator 
          isLoading={isLoading} 
          networkType={pendingNetworkSwitch} 
        />
      )}
      
      {/* Network Success Notification */}
      <NetworkOverview
        networkType={currentNetwork}
        showSuccess={showNetworkSuccess}
        onClose={() => setShowNetworkSuccess(false)}
      />

      {error && (
        <div className="text-red-500 text-xs mb-1">
          {error}
        </div>
      )}
        {/* Network Status Indicator - Only show when loading */}
      {isLoading && pendingNetworkSwitch && (
        <NetworkStatusIndicator 
          isLoading={isLoading} 
          networkType={pendingNetworkSwitch} 
        />
      )}
      
      {/* Network Success Notification */}      <NetworkOverview
        networkType={currentNetwork}
        showSuccess={showNetworkSuccess}
        onClose={() => setShowNetworkSuccess(false)}
      />

      {!isConnected ? (
        <>          <button 
            onClick={() => setShowWalletOptions((v) => !v)}
            disabled={isLoading}
            className={`bg-orange-500 px-4 py-2 rounded-lg text-white font-semibold hover:bg-orange-400 transition-colors ${isLoading ? 'opacity-70 cursor-not-allowed' : ''} ${className}`}
          >
            {isLoading ? 'Connecting...' : title}
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
          </div>          {/* Only render network selector if showNetworkSelector is true */}
          {showNetworkSelector && (
            <div className="network-selector flex items-center">
              <button 
                onClick={() => setShowNetworkModal(true)} 
                className="flex items-center text-sm border rounded px-2 py-1 hover:bg-gray-50"
              >                <span className={`inline-block w-3 h-3 rounded-full mr-2 ${
                  currentNetwork === 'ethereum' ? 'bg-blue-500' : 
                  currentNetwork === 'polygon' ? 'bg-purple-500' : 
                  currentNetwork === 'binance' ? 'bg-yellow-500' : 
                  currentNetwork === 'binanceTestnet' ? 'bg-orange-500' :
                  currentNetwork === 'avalanche' ? 'bg-red-500' : 
                  currentNetwork === 'optimism' ? 'bg-pink-500' :
                  'bg-gray-500'
                }`}></span>
                {currentNetwork.charAt(0).toUpperCase() + currentNetwork.slice(1)}
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {/* Network Selection Modal */}
              {showNetworkModal && (
                <div className="fixed inset-0 z-50 overflow-auto bg-black bg-opacity-50 flex items-center justify-center">
                  <div className="bg-white rounded-lg p-6 max-w-md w-full shadow-xl border-2 border-orange-400">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-lg font-semibold text-orange-600">Select Network</h3>                      <button 
                        onClick={() => setShowNetworkModal(false)} 
                        className="text-orange-400 hover:text-orange-600"
                        aria-label="Close network selection modal"
                        title="Close"
                      ><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                    <div className="grid gap-3">
                      {availableNetworks.map(renderNetworkButton)}
                    </div>
                    <p className="mt-4 text-xs text-gray-600 bg-orange-50 p-2 rounded-md border border-orange-100">
                      {web3Service.wcV2Provider ? 
                        '🔗 Switching to Ethereum and Polygon is supported with WalletConnect! For BSC, we use an enhanced connection method. If you encounter issues, try switching networks manually in your wallet app.' : 
                        '🦊 Network switching is fully supported for Ethereum, Polygon, and BSC directly from this interface.'}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>      )}
    </div>
  );
};

export default WalletButton;
