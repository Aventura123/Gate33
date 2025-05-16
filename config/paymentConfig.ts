// Web3 payment system configurations
import { db } from "../lib/firebase";

// Contract addresses for each network (fallback values)
export const CONTRACT_ADDRESSES = {
  ethereum: '0x0000000000000000000000000000000000000000',
  polygon: '0x0000000000000000000000000000000000000000',
  binance: '0x0000000000000000000000000000000000000000',
  binanceTestnet: '0x0000000000000000000000000000000000000000',
  avalanche: '0x0000000000000000000000000000000000000000',
  optimism: '0x0000000000000000000000000000000000000000'
};

// Network configurations
export const NETWORK_CONFIG = {
  ethereum: {
    chainId: 1,
    name: 'Ethereum Mainnet',
    rpcUrl: 'https://mainnet.infura.io/v3/' + (process.env.NEXT_PUBLIC_INFURA_KEY || ''),
    currencySymbol: 'ETH',
    blockExplorer: 'https://etherscan.io'
  },
  polygon: {
    chainId: 137,
    name: 'Polygon Mainnet',
    rpcUrl: 'https://polygon-rpc.com',
    currencySymbol: 'MATIC',
    blockExplorer: 'https://polygonscan.com'
  },  binance: {
    chainId: 56, // BSC Mainnet chainId
    name: 'Binance Smart Chain',
    rpcUrl: 'https://bsc-dataseed.binance.org',
    currencySymbol: 'BNB',
    blockExplorer: 'https://bscscan.com'
  },
  binanceTestnet: {
    chainId: 97, // BSC Testnet chainId
    name: 'BNB Smart Chain Testnet',
    rpcUrl: 'https://bsc-testnet.public.blastapi.io',
    currencySymbol: 'tBNB',
    blockExplorer: 'https://testnet.bscscan.com'
  },
  avalanche: {
    chainId: 43114,
    name: 'Avalanche C-Chain',
    rpcUrl: 'https://api.avax.network/ext/bc/C/rpc',
    currencySymbol: 'AVAX',
    blockExplorer: 'https://snowtrace.io'
  },
  optimism: {
    chainId: 10,
    name: 'Optimism',
    rpcUrl: 'https://mainnet.optimism.io',
    currencySymbol: 'ETH',
    blockExplorer: 'https://optimistic.etherscan.io'
  }
};

// Service fee applied to payments (percentage)
export const SERVICE_FEE_PERCENTAGE = 5; // 5%

// Maximum time to wait for transaction confirmation (in milliseconds)
export const TRANSACTION_TIMEOUT = 60000; // 1 minute

// ABI for the job payment contract
export const JOB_PAYMENT_ABI = [
  // Main payment functions
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "recipient",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      }
    ],
    "name": "processPayment",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "recipient",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      }
    ],
    "name": "processPaymentWithFee",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "payable",
        "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "paymentId",
        "type": "bytes32"
      }
    ],
    "name": "processPaymentWithHold",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  },
  // Query functions
  {
    "inputs": [],
    "name": "owner",
    "outputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "isPaused",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getTotalPercentage",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  }
];

// Network configuration
export const SUPPORTED_CHAINS = {
  POLYGON: 137,
  MUMBAI: 80001,
  // Add other networks as needed
};

// Default chain ID
export const DEFAULT_CHAIN_ID = SUPPORTED_CHAINS.MUMBAI; // Change as needed

/**
 * Configuration for payment amounts and durations
 * These are FALLBACK values used only when Firebase data is unavailable
 */
export const PAYMENT_CONFIG = {
  // Default job plan pricing (if not available from Firebase)
  defaultJobPlans: [
    {
      id: "basic",
      name: "Basic",
      price: 0.01,
      duration: 30, // 30 days
      features: ["Job listing for 30 days", "Basic visibility"]
    },
    {
      id: "premium",
      name: "Premium",
      price: 0.02,
      duration: 60, // 60 days
      features: ["Job listing for 60 days", "Featured on homepage", "Higher visibility"],
      recommended: true
    },
    {
      id: "enterprise",
      name: "Enterprise",
      price: 0.03,
      duration: 90, // 90 days
      features: ["Job listing for 90 days", "Featured on homepage", "Highest visibility", "Social media promotion"]
    }
  ]
};

export default {
  JOB_PAYMENT_ABI,
  SUPPORTED_CHAINS,
  DEFAULT_CHAIN_ID
};