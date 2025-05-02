"use client";

import React, { useState } from 'react';
import { ethers } from 'ethers';

interface Learn2EarnTestButtonProps {
  contractAddress: string;
  network: string;
}

const Learn2EarnTestButton: React.FC<Learn2EarnTestButtonProps> = ({ contractAddress, network }) => {
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const supportedNetworks = ['ethereum', 'bsc', 'sepolia', 'mumbai', 'bscTestnet'];

  const getNetworkParams = (network: string) => {
    switch(network.toLowerCase()) {
      case 'ethereum': return { 
        chainId: '0x1', 
        chainName: 'Ethereum Mainnet',
        rpcUrls: ['https://mainnet.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161']
      };
      case 'bsc': return { 
        chainId: '0x38', 
        chainName: 'Binance Smart Chain',
        rpcUrls: ['https://bsc-dataseed.binance.org/']
      };
      case 'sepolia': return { 
        chainId: '0xaa36a7', 
        chainName: 'Sepolia Testnet',
        rpcUrls: ['https://rpc.sepolia.org']
      };
      case 'mumbai': return { 
        chainId: '0x13881', 
        chainName: 'Mumbai Testnet',
        rpcUrls: ['https://rpc-mumbai.maticvigil.com']
      };
      case 'bsctestnet': return { 
        chainId: '0x61', 
        chainName: 'BSC Testnet',
        rpcUrls: ['https://data-seed-prebsc-1-s1.binance.org:8545/']
      };
      default: throw new Error(`Unsupported network: ${network}`);
    }
  };

  const handleNetworkChange = () => {
    window.ethereum.on('chainChanged', () => {
      window.location.reload();
    });
  };

  React.useEffect(() => {
    if (window.ethereum) {
      handleNetworkChange();
    }
  }, []);

  const handleTest = async () => {
    setTesting(true);
    setResult(null);
    
    try {
      // Check if window.ethereum is available
      if (!window.ethereum) {
        throw new Error("MetaMask or compatible wallet not found. Please install MetaMask.");
      }
      
      // Request account access
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      if (!accounts || accounts.length === 0) {
        throw new Error("No Ethereum accounts found. Please connect your wallet.");
      }
      
      // Get the current network
      const chainId = await window.ethereum.request({ method: 'eth_chainId' });
      
      // Get the expected network params
      const expectedNetwork = getNetworkParams(network);
      
      // Check if we need to switch networks
      if (chainId !== expectedNetwork.chainId) {
        try {
          // Try to switch to the network
          await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: expectedNetwork.chainId }],
          });
        } catch (switchError: any) {
          // This error code indicates the chain has not been added to MetaMask
          if (switchError.code === 4902) {
            await window.ethereum.request({
              method: 'wallet_addEthereumChain',
              params: [
                {
                  chainId: expectedNetwork.chainId,
                  chainName: expectedNetwork.chainName,
                  rpcUrls: expectedNetwork.rpcUrls,
                },
              ],
            });
          } else {
            throw switchError;
          }
        }
      }
      
      // Create a provider
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();
      
      // Create a contract instance
      const contract = new ethers.Contract(
        contractAddress,
        [
          "function owner() view returns (address)",
          "function name() view returns (string)",
          "function symbol() view returns (string)"
        ],
        signer
      );
      
      // Test contract functions
      let contractInfo = '';
      
      try {
        const owner = await contract.owner();
        contractInfo += `Owner: ${owner}\n`;
      } catch (e) {
        console.log("Not an owner-based contract");
      }
      
      try {
        const name = await contract.name();
        contractInfo += `Name: ${name}\n`;
      } catch (e) {
        console.log("Contract doesn't have a name function");
      }
      
      try {
        const symbol = await contract.symbol();
        contractInfo += `Symbol: ${symbol}\n`;
      } catch (e) {
        console.log("Contract doesn't have a symbol function");
      }
      
      if (contractInfo === '') {
        contractInfo = 'Contract exists but none of the standard methods (owner, name, symbol) were found.';
      }
      
      // Set the result
      setResult(`Contract tested successfully on ${expectedNetwork.chainName}:\n\n${contractInfo}`);
      
    } catch (error: any) {
      console.error('Contract test error:', error);
      setResult(`Error: ${error.message || 'Unknown error occurred'}`);
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="mt-4">
      <button
        onClick={handleTest}
        disabled={testing || !contractAddress}
        className={`px-4 py-2 rounded-md text-white ${
          testing || !contractAddress
            ? 'bg-gray-500 cursor-not-allowed'
            : 'bg-blue-600 hover:bg-blue-700'
        }`}
      >
        {testing ? 'Testing Contract...' : 'Test Contract'}
      </button>
      
      {result && (
        <div className="mt-4 p-3 bg-black/30 rounded border border-gray-700 text-sm whitespace-pre-wrap">
          {result}
        </div>
      )}
    </div>
  );
};

export default Learn2EarnTestButton;