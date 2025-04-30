import React, { useEffect, useState } from "react";
import { ethers } from 'ethers';
import { USDT_ADDRESSES } from '../config/tokenConfig';
import { toast } from 'react-toastify';

// ERC-20 Token ABI (minimum required functions)
const tokenABI = [
  "function balanceOf(address account) external view returns (uint256)",
  "function decimals() external view returns (uint8)"
];

interface WalletInfoCardProps {
  className?: string;
  walletAddress?: string | null;
  isConnecting?: boolean;
  onConnect?: () => Promise<void>;
  onDisconnect?: () => void;
  error?: string | null;
}

const WalletInfoCard: React.FC<WalletInfoCardProps> = ({
  className = "",
  walletAddress = null,
  isConnecting = false,
  onConnect = async () => {},
  onDisconnect,
  error = null,
}) => {
  const [usdtBalance, setUsdtBalance] = useState<string>('0.00');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [web3ServiceInstance, setWeb3ServiceInstance] = useState<any>(null);

  // Helper function to shorten the wallet address
  const shortenAddress = (address: string) => {
    if (!address) return '';
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  };

  // Function to copy address to clipboard
  const copyAddressToClipboard = () => {
    if (walletAddress) {
      navigator.clipboard.writeText(walletAddress);
      toast.success('Address copied to clipboard');
    }
  };

  // Update wallet info function that can be reused
  const updateWalletInfo = async () => {
    if (!web3ServiceInstance) return;
    
    try {
      if (web3ServiceInstance.isWalletConnected()) {
        const walletInfo = web3ServiceInstance.getWalletInfo();
        
        if (walletInfo?.address) {
          try {
            let usdtAddress = '';

            switch (walletInfo.chainId) {
              case 1:
                usdtAddress = USDT_ADDRESSES.ethereum;
                break;
              case 137:
                usdtAddress = USDT_ADDRESSES.polygon;
                break;
              case 56:
                usdtAddress = USDT_ADDRESSES.binance;
                break;
              case 97:
                usdtAddress = USDT_ADDRESSES.binanceTestnet;
                break;
              default:
                throw new Error('Unsupported network');
            }
            
            if (usdtAddress && web3ServiceInstance.provider) {
              // Create ERC20 token contract instance
              const tokenContract = new ethers.Contract(
                usdtAddress,
                tokenABI,
                web3ServiceInstance.provider
              );
              
              // Get token decimals (USDT typically has 6 decimals, not 18 like ETH)
              const decimals = await tokenContract.decimals();
              
              // Get USDT balance
              const balance = await tokenContract.balanceOf(walletInfo.address);
              const formattedBalance = ethers.utils.formatUnits(balance, decimals);
              
              // Format to 2 decimal places
              setUsdtBalance(Number(formattedBalance).toFixed(2));
            }
          } catch (error) {
            console.error('Error fetching USDT balance:', error);
            toast.error('Failed to fetch USDT balance');
            setUsdtBalance('0.00');
          }
        } else {
          setUsdtBalance('0.00');
        }
      } else {
        setUsdtBalance('0.00');
      }
    } catch (error) {
      console.error('Error getting wallet info:', error);
      toast.error('Error updating wallet info');
      setUsdtBalance('0.00');
    }
  };

  useEffect(() => {
    const loadWeb3Service = async () => {
      setIsLoading(true);
      
      try {
        // Import web3Service dynamically to prevent server-side rendering issues
        const { web3Service } = await import('../services/web3Service');
        setWeb3ServiceInstance(web3Service);
        
        // Initial update of wallet info
        await updateWalletInfo();
      } catch (error) {
        console.error('Error initializing web3Service:', error);
        toast.error('Failed to initialize web3 service');
      } finally {
        setIsLoading(false);
      }
    };

    loadWeb3Service();

    // Check for wallet changes on window focus
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible') {
        updateWalletInfo();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Set up event listeners for wallet connection/disconnection
    const handleWeb3Connected = () => updateWalletInfo();
    const handleWeb3Disconnected = () => {
      setUsdtBalance('0.00');
    };
    const handleWeb3NetworkChanged = () => updateWalletInfo();

    window.addEventListener('web3Connected', handleWeb3Connected);
    window.addEventListener('web3WalletDisconnected', handleWeb3Disconnected);
    window.addEventListener('web3NetworkChanged', handleWeb3NetworkChanged);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('web3Connected', handleWeb3Connected);
      window.removeEventListener('web3WalletDisconnected', handleWeb3Disconnected);
      window.removeEventListener('web3NetworkChanged', handleWeb3NetworkChanged);
    };
  }, [web3ServiceInstance]);

  // Format wallet address for display (first 6 and last 4 characters)
  const formatAddress = (address: string) => {
    if (!address) return '';
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  };

  return (
    <div className={`bg-black/40 rounded-lg p-3 ${className}`}>
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm text-gray-300">Wallet Status:</span>
        <span className={`text-sm font-medium ${walletAddress ? "text-green-500" : "text-yellow-500"}`}>
          {walletAddress ? "Connected" : "Not Connected"}
        </span>
      </div>
      
      {walletAddress ? (
        <div className="text-xs text-gray-400 break-all bg-black/30 p-2 rounded mb-2">
          {formatAddress(walletAddress)}
        </div>
      ) : (
        <button
          onClick={onConnect}
          disabled={isConnecting}
          className={`w-full text-xs bg-orange-500 text-white py-2 rounded font-medium hover:bg-orange-600 transition ${
            isConnecting ? "opacity-70 cursor-not-allowed" : ""
          }`}
        >
          {isConnecting ? "Connecting..." : "Connect Wallet"}
        </button>
      )}
      
      {error && (
        <div className="mt-2 text-xs text-red-500 bg-red-500/10 p-2 rounded">
          {error}
        </div>
      )}
      
      {/* Balance display section */}
      {walletAddress && (
        <div className="mt-2 p-2 bg-black/30 rounded">
          <div className="flex justify-between items-center">
            <span className="text-xs text-gray-300">USDT Balance:</span>
            <span className="text-xs font-medium text-white">{isLoading ? "Loading..." : `${usdtBalance} USDT`}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default WalletInfoCard;
