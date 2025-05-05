// Configurações para o sistema de pagamentos web3
import { db } from "../lib/firebase";
import { collection, getDocs, query, where } from "firebase/firestore";

// Endereço da carteira que receberá pagamentos
export const PAYMENT_RECEIVER_ADDRESS = process.env.NEXT_PUBLIC_PAYMENT_ADDRESS || '0xC5669da4aF25d78382683a69f3E13364894c756D';

/**
 * Configuration for blockchain payment contracts
 */
export const CONTRACT_ADDRESSES = {
  // Ethereum mainnet contract address
  ethereum: "0xD7ACd2a9FD159E69Bb102A1ca21C9a3e3A5F771B", // Endereço real
  
  // Polygon (Matic) mainnet contract address
  polygon: "0xD7ACd2a9FD159E69Bb102A1ca21C9a3e3A5F771B", // Endereço real
  
  // Binance Smart Chain contract address
  binance: "0xD7ACd2a9FD159E69Bb102A1ca21C9a3e3A5F771B", // Endereço real
  
  // Binance Testnet contract address
  binanceTestnet: "0xD7ACd2a9FD159E69Bb102A1ca21C9a3e3A5F771B", // Endereço real
  
  // Avalanche C-Chain contract address
  avalanche: "0xD7ACd2a9FD159E69Bb102A1ca21C9a3e3A5F771B", // Endereço real
  
  // Optimism contract address
  optimism: "0xD7ACd2a9FD159E69Bb102A1ca21C9a3e3A5F771B", // Endereço real
  
  // Job payment-specific contract address
  jobPayment: "0xD7ACd2a9FD159E69Bb102A1ca21C9a3e3A5F771B" // Endereço real para job payments
};

// Função para carregar o endereço do contrato do Firebase
export async function loadContractAddressFromFirebase(): Promise<string> {
  try {
    // Primeiro tenta buscar das settings
    const configSnap = await getDocs(collection(db, "settings"));
    let contracts: Record<string, string> = {};
    if (!configSnap.empty) {
      const data = configSnap.docs[0].data();
      if (data.contracts && data.contracts.binanceTestnet) {
        console.log('Contrato carregado das settings:', data.contracts.binanceTestnet);
        return data.contracts.binanceTestnet;
      }
    }
    
    // Se não encontrou nas settings, tenta buscar dos contractConfigs
    const contractsCollection = collection(db, "contractConfigs");
    const q = query(contractsCollection, where("type", "==", "payment"));
    const contractSnapshot = await getDocs(q);
    
    if (!contractSnapshot.empty) {
      const contractData = contractSnapshot.docs[0].data();
      if (contractData.contractAddress) {
        console.log('Contrato carregado dos contractConfigs:', contractData.contractAddress);
        return contractData.contractAddress;
      }
    }
    
    // Se nenhum for encontrado, retorna o endereço padrão
    console.log('Usando endereço padrão do contrato:', CONTRACT_ADDRESSES.binanceTestnet);
    return CONTRACT_ADDRESSES.binanceTestnet;
  } catch (error) {
    console.error("Erro ao carregar endereço do contrato do Firebase:", error);
    // Em caso de erro, retornar o endereço padrão
    return CONTRACT_ADDRESSES.binanceTestnet;
  }
}

// Configurações de redes
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
  },
  binance: {
    chainId: 97, // BSC Testnet chainId
    name: 'BSC Testnet',
    rpcUrl: 'https://data-seed-prebsc-1-s1.binance.org:8545',
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

// Taxa de serviço aplicada aos pagamentos (em porcentagem)
export const SERVICE_FEE_PERCENTAGE = 5; // 5%

// Tempo máximo para aguardar confirmação da transação (em milissegundos)
export const TRANSACTION_TIMEOUT = 60000; // 1 minuto

// Smart contract configuration for job payments

// Contract address for the job payment system - será carregado dinamicamente do Firebase
export const JOB_PAYMENT_ADDRESS: string = CONTRACT_ADDRESSES.binanceTestnet; 

// ABI for the job payment contract
export const JOB_PAYMENT_ABI = [
  // Funções principais para pagamentos
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
  // Funções de consulta
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
  JOB_PAYMENT_ADDRESS,
  loadContractAddressFromFirebase,
  JOB_PAYMENT_ABI,
  SUPPORTED_CHAINS,
  DEFAULT_CHAIN_ID,
  CONTRACT_ADDRESSES
};