# WalletButton Component

This component provides a customizable wallet connection button with network switching capabilities, supporting both MetaMask and WalletConnect.

## Features

- Connect to MetaMask or WalletConnect
- Network switching support with visual feedback
- BSC (Binance Smart Chain) specialized support for both Mainnet and Testnet
- Customizable network options
- Conditional network selector

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `onConnect` | `(address: string) => void` | `undefined` | Callback when wallet is connected |
| `onDisconnect` | `() => void` | `undefined` | Callback when wallet is disconnected |
| `className` | `string` | `''` | CSS class for styling the button |
| `availableNetworks` | `NetworkType[]` | `["ethereum", "polygon", "binance", "binanceTestnet"]` | Networks to show in the selector |
| `showNetworkSelector` | `boolean` | `true` | Whether to show the network selector after connecting |
| `title` | `string` | `'Connect Wallet'` | Text to display on the connect button |

## Basic Usage

```tsx
import WalletButton from '../components/WalletButton';

export default function MyPage() {
  const handleConnect = (address: string) => {
    console.log(`Wallet connected: ${address}`);
    // Do something with the address
  };

  return (
    <div>
      <WalletButton 
        onConnect={handleConnect}
        onDisconnect={() => console.log('Wallet disconnected')}
      />
    </div>
  );
}
```

## Examples

### Default (All Networks)

```tsx
<WalletButton 
  onConnect={(address) => console.log(`Connected: ${address}`)} 
  onDisconnect={() => console.log('Disconnected')}
/>
```

### Custom Networks

```tsx
<WalletButton 
  availableNetworks={['ethereum', 'polygon']} 
  title="Connect to ETH/MATIC"
  onConnect={handleConnect}
/>
```

### Without Network Selector

```tsx
<WalletButton 
  showNetworkSelector={false}
  title="Simple Connect"
  onConnect={handleConnect}
/>
```

### BSC Only Implementation

```tsx
<WalletButton 
  availableNetworks={['binance', 'binanceTestnet']}
  title="Connect BSC Wallet"
  onConnect={handleConnect}
/>
```

### Layer 2 Networks Implementation

```tsx
<WalletButton 
  availableNetworks={['avalanche', 'optimism']}
  title="Connect L2 Wallet"
  onConnect={handleConnect}
/>
```

### Custom Styling

```tsx
<WalletButton 
  className="bg-blue-500 hover:bg-blue-400 text-white font-bold py-2 px-4 rounded"
  onConnect={handleConnect}
/>
```

## Events

The component dispatches custom events that you can listen for in other parts of your application:

- `walletConnected`: When a wallet is connected successfully
- `walletDisconnected`: When a wallet is disconnected
- `networkChanged`: When the network is changed
- `web3NetworkSwitched`: When a network switch is successful

Example of listening for events:

```typescript
useEffect(() => {
  const handleWalletConnect = (event: any) => {
    const { address, network } = event.detail;
    console.log(`Wallet ${address} connected on ${network}`);
  };
  
  window.addEventListener('walletConnected', handleWalletConnect);
  
  return () => {
    window.removeEventListener('walletConnected', handleWalletConnect);
  };
}, []);
```

## Network Types

The component supports these network types:

- `ethereum`: Ethereum Mainnet
- `polygon`: Polygon Mainnet
- `binance`: Binance Smart Chain Mainnet
- `binanceTestnet`: Binance Smart Chain Testnet
- `avalanche`: Avalanche C-Chain
- `optimism`: Optimism Network

## Wallet Support

- MetaMask and other injected wallets
- WalletConnect protocol (with reconnection support)
