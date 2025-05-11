"use client";

import React from 'react';
import WalletButton from './WalletButton';
import { NetworkType } from '../services/web3Service';

const WalletButtonExamples: React.FC = () => {
  // Example of handling wallet connection
  const handleConnect = (address: string) => {
    console.log(`Wallet connected: ${address}`);
  };

  // Example of handling wallet disconnection
  const handleDisconnect = () => {
    console.log('Wallet disconnected');
  };

  return (
    <div className="p-6 space-y-8">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">WalletButton Examples</h1>

      <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
        {/* Default WalletButton - All networks */}
        <div className="p-4 border rounded-lg bg-white shadow-sm">
          <h2 className="text-lg font-semibold mb-2">Default Configuration</h2>
          <p className="text-sm text-gray-600 mb-4">
            Default WalletButton with all networks and network selector
          </p>          <WalletButton 
            onConnect={handleConnect} 
            onDisconnect={handleDisconnect}
            availableNetworks={['ethereum', 'polygon', 'binance', 'binanceTestnet', 'avalanche', 'optimism'] as NetworkType[]}
          />
        </div>

        {/* Only ETH and Polygon */}
        <div className="p-4 border rounded-lg bg-white shadow-sm">
          <h2 className="text-lg font-semibold mb-2">Limited Networks</h2>
          <p className="text-sm text-gray-600 mb-4">
            Only Ethereum and Polygon networks available
          </p>
          <WalletButton 
            onConnect={handleConnect} 
            onDisconnect={handleDisconnect}
            availableNetworks={['ethereum', 'polygon'] as NetworkType[]}
          />
        </div>

        {/* Only BSC Networks */}
        <div className="p-4 border rounded-lg bg-white shadow-sm">
          <h2 className="text-lg font-semibold mb-2">BSC Networks Only</h2>
          <p className="text-sm text-gray-600 mb-4">
            Only Binance Smart Chain networks (Mainnet and Testnet)
          </p>
          <WalletButton 
            onConnect={handleConnect} 
            onDisconnect={handleDisconnect}
            availableNetworks={['binance', 'binanceTestnet'] as NetworkType[]}
            title="Connect BSC Wallet"
          />
        </div>

        {/* No Network Selector */}
        <div className="p-4 border rounded-lg bg-white shadow-sm">
          <h2 className="text-lg font-semibold mb-2">Without Network Selector</h2>
          <p className="text-sm text-gray-600 mb-4">
            WalletButton with network selector hidden
          </p>
          <WalletButton 
            onConnect={handleConnect} 
            onDisconnect={handleDisconnect}
            showNetworkSelector={false}
            title="Simple Connect"
          />
        </div>        {/* Only Layer 2 Networks */}
        <div className="p-4 border rounded-lg bg-white shadow-sm">
          <h2 className="text-lg font-semibold mb-2">Layer 2 Networks</h2>
          <p className="text-sm text-gray-600 mb-4">
            Only Avalanche and Optimism networks
          </p>
          <WalletButton 
            onConnect={handleConnect} 
            onDisconnect={handleDisconnect}
            availableNetworks={['avalanche', 'optimism'] as NetworkType[]}
            title="Connect L2 Wallet"
          />
        </div>

        {/* Custom styling */}
        <div className="p-4 border rounded-lg bg-blue-50 shadow-sm">
          <h2 className="text-lg font-semibold mb-2">Custom Styling</h2>
          <p className="text-sm text-gray-600 mb-4">
            WalletButton with custom CSS class
          </p>
          <WalletButton 
            onConnect={handleConnect} 
            onDisconnect={handleDisconnect}
            className="bg-blue-500 hover:bg-blue-400 px-6 rounded-full"
            title="Connect"
          />
        </div>
      </div>

      <div className="mt-8 p-4 border rounded-lg bg-gray-50">
        <h2 className="text-lg font-semibold mb-2">Usage Instructions</h2>
        <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-sm">
{`// Basic usage
<WalletButton 
  onConnect={(address) => console.log(\`Connected: \${address}\`)} 
  onDisconnect={() => console.log('Disconnected')}
/>

// Custom networks
<WalletButton 
  availableNetworks={['ethereum', 'polygon']} 
  title="Connect to ETH/MATIC"
/>

// Without network selector
<WalletButton 
  showNetworkSelector={false}
  title="Simple Connect"
/>

// BSC only implementation
<WalletButton 
  availableNetworks={['binance', 'binanceTestnet']}
  title="Connect BSC Wallet"
/>

// Layer 2 networks only
<WalletButton 
  availableNetworks={['avalanche', 'optimism']}
  title="Connect L2 Wallet"
/>
`}
        </pre>
      </div>
    </div>
  );
};

export default WalletButtonExamples;
