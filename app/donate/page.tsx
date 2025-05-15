'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Layout from '../../components/Layout';
import { web3Service } from '../../services/web3Service';
import { tokenService } from '../../services/tokenService';
import WalletButton from '../../components/WalletButton';
import { NetworkType } from '../../services/web3Service';
import { ethers } from 'ethers';
import Image from 'next/image';
import Link from 'next/link';
import { USDT_ADDRESSES, TOKEN_DECIMALS } from '../../config/tokenConfig';
import DonationThankYouCard from '../../components/ui/DonationThankYouCard';
import { useWallet } from '../../components/WalletProvider';
import { getHttpRpcUrls } from '../../config/rpcConfig';

// Donation options
interface CryptoCurrency {
  name: string;
  symbol: string;
  icon: string;
  networks: string[];
}

interface Network {
  id: string;
  name: string;
  icon: string;
  supportedTokens: string[];
}

const cryptocurrencies: CryptoCurrency[] = [
  {
    name: "Ethereum",
    symbol: "ETH",
    icon: "/images/crypto/eth.svg", // Will be replaced by text
    networks: ["ethereum", "polygon", "bsc", "optimism", "avalanche"]
  },
  {
    name: "Avalanche",
    symbol: "AVAX",
    icon: "/images/crypto/avax.svg", // Will be replaced by text
    networks: ["ethereum", "polygon", "bsc", "optimism", "avalanche"]
  },
  {
    name: "BNB",
    symbol: "BNB",
    icon: "/images/crypto/bnb.svg", // Will be replaced by text
    networks: ["ethereum", "polygon", "bsc", "optimism", "avalanche"]
  },
  {
    name: "Tether",
    symbol: "USDT",
    icon: "/images/crypto/usdt.svg", // Will be replaced by text
    networks: ["ethereum", "polygon", "bsc", "optimism", "avalanche"]
  }
];

const networks: Network[] = [
  {
    id: "ethereum",
    name: "Ethereum",
    icon: "/images/networks/ethereum.svg",
    supportedTokens: ["ETH", "AVAX", "BNB", "USDT"]
  },
  {
    id: "polygon",
    name: "Polygon",
    icon: "/images/networks/polygon.svg",
    supportedTokens: ["ETH", "AVAX", "BNB", "USDT"]
  },
  {
    id: "bsc",
    name: "BSC",
    icon: "/images/networks/binance.svg",
    supportedTokens: ["BNB", "ETH", "AVAX", "USDT"]
  },
  {
    id: "avalanche",
    name: "Avalanche C-Chain",
    icon: "/images/networks/avalanche.svg",
    supportedTokens: ["AVAX", "ETH", "BNB", "USDT"]
  },
  {
    id: "optimism",
    name: "Optimism",
    icon: "/images/networks/optimism.svg",
    supportedTokens: ["ETH", "AVAX", "BNB", "USDT"]
  }
];

// Definir tipos mais precisos para os objetos de endereços
interface DonationAddresses {
  [network: string]: {
    [crypto: string]: string;
  };
}

interface TokenContractAddresses {
  [network: string]: {
    [crypto: string]: string;
  };
}

// Converter os objetos existentes para usar os novos tipos
const DONATION_ADDRESSES: DonationAddresses = {
  ethereum: {
    ETH: "0x3805FF925B6B0126849BD260A338391DF5F6E382", 
    AVAX: "0x3805FF925B6B0126849BD260A338391DF5F6E382",
    BNB: "0x3805FF925B6B0126849BD260A338391DF5F6E382",
    USDT: "0x3805FF925B6B0126849BD260A338391DF5F6E382" 
  },
  polygon: {
    ETH: "0x3805FF925B6B0126849BD260A338391DF5F6E382",
    AVAX: "0x3805FF925B6B0126849BD260A338391DF5F6E382",
    BNB: "0x3805FF925B6B0126849BD260A338391DF5F6E382",
    USDT: "0x3805FF925B6B0126849BD260A338391DF5F6E382"
  },
  bsc: {
    BNB: "0x3805FF925B6B0126849BD260A338391DF5F6E382",
    ETH: "0x3805FF925B6B0126849BD260A338391DF5F6E382",
    AVAX: "0x3805FF925B6B0126849BD260A338391DF5F6E382",
    USDT: "0x3805FF925B6B0126849BD260A338391DF5F6E382"
  },
  avalanche: {
    AVAX: "0x3805FF925B6B0126849BD260A338391DF5F6E382",
    ETH: "0x3805FF925B6B0126849BD260A338391DF5F6E382",
    BNB: "0x3805FF925B6B0126849BD260A338391DF5F6E382",
    USDT: "0x3805FF925B6B0126849BD260A338391DF5F6E382"
  },
  optimism: {
    ETH: "0x3805FF925B6B0126849BD260A338391DF5F6E382",
    AVAX: "0x3805FF925B6B0126849BD260A338391DF5F6E382",
    BNB: "0x3805FF925B6B0126849BD260A338391DF5F6E382",
    USDT: "0x3805FF925B6B0126849BD260A338391DF5F6E382"
  }
};

// Token contract addresses para tokens ERC20
const TOKEN_ADDRESSES: TokenContractAddresses = {
  ethereum: {
    USDT: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
    AVAX: "0x85f138bfEE4ef8e540890CFb48F620571d67Eda3", // WAVAX em Ethereum
    BNB: "0xB8c77482e45F1F44dE1745F52C74426C631bDD52"  // BNB em Ethereum (BEP-20)
  },
  polygon: {
    USDT: "0xc2132D05D31c914a87C6611C10748AEb04B58e8F",
    AVAX: "0x2C89bbc92BD86F8075d1DEcc58C7F4E0107f286b", // WAVAX em Polygon
    BNB: "0x3BA4c387f786bFEE076A58914F5Bd38d668B42c3"  // BNB em Polygon
  },
  bsc: {
    USDT: "0x55d398326f99059fF775485246999027B3197955",
    AVAX: "0x1CE0c2827e2eF14D5C4f29a091d735A204794041", // WAVAX em BSC
    ETH: "0x2170Ed0880ac9A755fd29B2688956BD959F933F8"  // WETH em BSC
  },
  avalanche: {
    USDT: "0x9702230A8Ea53601f5cD2dc00fDBc13d4dF4A8c7", // USDT no Avalanche C-Chain
    ETH: "0x49D5c2BdFfac6CE2BFdB6640F4F80f226bc10bAB", // WETH em Avalanche
    BNB: "0x264c1383EA520f73dd837F915ef3a732e204a493"  // BNB em Avalanche
  },
  optimism: {
    USDT: "0x94b008aA00579c1307B0EF2c499aD98a8ce58e58", // USDT no Optimism
    AVAX: "0x420000000000000000000000000000000000000A", // WAVAX em Optimism (se disponível)
    BNB: "0x4200000000000000000000000000000000000006"   // BNB em Optimism (se disponível)
  }
};

export default function DonatePage() {
  const [selectedCrypto, setSelectedCrypto] = useState<CryptoCurrency | null>(null);
  const [selectedNetwork, setSelectedNetwork] = useState<Network | null>(null);
  const [donationAmount, setDonationAmount] = useState<string>('');
  const [donationStep, setDonationStep] = useState<'select_crypto' | 'select_network' | 'enter_amount' | 'confirmation' | 'processing' | 'success' | 'error'>('select_crypto');
  const [isProcessing, setIsProcessing] = useState(false);
  const [donationHash, setDonationHash] = useState<string | null>(null);
  const [transactionHash, setTransactionHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [estimatedTokens, setEstimatedTokens] = useState<number | null>(null);
  const [usdValue, setUsdValue] = useState<number | null>(null);

  // Use global wallet context
  const {
    walletAddress,
    currentNetwork,
    isConnectingWallet,
    connectWallet,
    disconnectWallet,
    switchNetwork: contextSwitchNetwork,
    isUsingWalletConnect,
  } = useWallet();

  // Recalcular o valor estimado quando a criptomoeda ou a rede mudar
  useEffect(() => {
    if (donationStep === 'enter_amount' && selectedCrypto && donationAmount && parseFloat(donationAmount) > 0) {
      console.log(`Recalculando estimativa para ${donationAmount} ${selectedCrypto.symbol}`);
      calculateEstimatedTokens(donationAmount, selectedCrypto.symbol);
    }
  }, [selectedCrypto, selectedNetwork, donationStep]);

  // Handle cryptocurrency selection
  const handleCryptoSelect = (crypto: CryptoCurrency) => {
    setSelectedCrypto(crypto);
    // Seleciona automaticamente a primeira rede disponível para a moeda
    const defaultNetwork = networks.find(n => crypto.networks.includes(n.id)) || null;
    setSelectedNetwork(defaultNetwork);
    setDonationStep('enter_amount');
    // Quando mudar diretamente para enter_amount, garantir que o valor seja recalculado
    if (donationAmount && parseFloat(donationAmount) > 0) {
      setTimeout(() => calculateEstimatedTokens(donationAmount, crypto.symbol), 100);
    }
  };

  // Handle network selection
  const handleNetworkSelect = (network: Network) => {
    setSelectedNetwork(network);
    setDonationStep('enter_amount');
  };

  // Handle donation amount input
  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Allow only numbers and decimals
    const value = e.target.value.replace(/[^0-9.]/g, '');
    setDonationAmount(value);
    
    // Calculate estimated tokens if the value is valid
    if (value && parseFloat(value) > 0 && selectedCrypto) {
      calculateEstimatedTokens(value, selectedCrypto.symbol);
    } else {
      setEstimatedTokens(null);
      setUsdValue(null);
    }
  };
  
  // Calculate estimated G33 tokens based on donation amount
  const calculateEstimatedTokens = async (amount: string, cryptoSymbol: string) => {
    try {
      // Use tokenService to calculate USD value
      const usdAmount = await tokenService.calculateUSDValue(amount, cryptoSymbol);
      setUsdValue(usdAmount);
      
      // Calculate token amount (1 token per $1 USD)
      const tokenAmount = tokenService.calculateG33TokenAmount(usdAmount);
      setEstimatedTokens(tokenAmount);
    } catch (error) {
      console.error("Error calculating tokens:", error);
      setEstimatedTokens(null);
      setUsdValue(null);
    }
  };

  // Handle donation confirmation
  const handleConfirmDonation = () => {
    if (!selectedCrypto || !selectedNetwork || !donationAmount || parseFloat(donationAmount) <= 0) {
      setError("Please enter a valid donation amount");
      return;
    }
    if (usdValue !== null && usdValue < 1) {
      setError("Minimum donation is 1 USDT or equivalent");
      return;
    }
    setDonationStep('confirmation');
  };

  // Switch to the correct network if needed
  const switchNetwork = async (networkId: string): Promise<boolean> => {
    try {
      if (!walletAddress) {
        throw new Error("Please connect your wallet first");
      }
      setError(null); // Clear any previous error

      // Corrige o nome da rede para buscar o RPC correto
      const rpcNetworkId = networkId === 'binance' ? 'bsc' : networkId;
      const rpcUrls = getHttpRpcUrls(rpcNetworkId);
      if (!rpcUrls.length) {
        throw new Error(`No RPC URLs configured for network ${networkId}`);
      }

      // Configurações específicas para doações (usando mainnet para todas as redes)
      // Agora centralizado em config/rpcConfig.ts, não precisa mais de rpcUrl/currencySymbol duplicados
      const networkConfigs: Record<string, { chainId: number; name: string; blockExplorer: string; currencySymbol: string }> = {
        'ethereum': {
          chainId: 1,
          name: 'Ethereum Mainnet',
          blockExplorer: 'https://etherscan.io',
          currencySymbol: 'ETH',
        },
        'polygon': {
          chainId: 137,
          name: 'Polygon Mainnet',
          blockExplorer: 'https://polygonscan.com',
          currencySymbol: 'MATIC',
        },
        'bsc': {
          chainId: 56,
          name: 'Binance Smart Chain',
          blockExplorer: 'https://bscscan.com',
          currencySymbol: 'BNB',
        },
        'avalanche': {
          chainId: 43114,
          name: 'Avalanche C-Chain',
          blockExplorer: 'https://snowtrace.io',
          currencySymbol: 'AVAX',
        },
        'optimism': {
          chainId: 10,
          name: 'Optimism',
          blockExplorer: 'https://optimistic.etherscan.io',
          currencySymbol: 'ETH',
        },
      };

      if (!networkConfigs[networkId]) {
        throw new Error(`Network ${networkId} is not supported for donations`);
      }
      const netConfig = networkConfigs[networkId];
      setError("Requesting network switch... Please confirm in your wallet.");
      if (!window.ethereum) {
        throw new Error("No crypto wallet found. Please install MetaMask.");
      }
      try {
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: `0x${netConfig.chainId.toString(16)}` }],
        });
        setError(null); // Clear message after success
        return true;
      } catch (switchError: any) {
        if (switchError.code === 4902) {
          try {
            await window.ethereum.request({
              method: 'wallet_addEthereumChain',
              params: [
                {
                  chainId: `0x${netConfig.chainId.toString(16)}`,
                  chainName: netConfig.name,
                  nativeCurrency: {
                    name: netConfig.currencySymbol,
                    symbol: netConfig.currencySymbol,
                    decimals: 18,
                  },
                  rpcUrls: rpcUrls,
                  blockExplorerUrls: [netConfig.blockExplorer],
                },
              ],
            });
            return await switchNetwork(networkId); // Tenta novamente após adicionar
          } catch (addError: any) {
            console.error("Error adding network:", addError);
            setError(`Unable to add ${selectedNetwork?.name || networkId}: ${addError.message}`);
            return false;
          }
        }
        console.error("Error switching network:", switchError);
        setError(`Unable to switch to ${selectedNetwork?.name || networkId}: ${switchError.message}`);
        return false;
      }
    } catch (error: any) {
      console.error("Error preparing network switch:", error);
      setError(error.message || "Error attempting to switch network");
      return false;
    }
  };

  const waitForTransactionConfirmation = async (provider: ethers.providers.Web3Provider, txHash: string, retries = 5, interval = 3000): Promise<void> => {
    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        const receipt = await provider.getTransactionReceipt(txHash);
        if (receipt && receipt.status === 1) {
          console.log("Transaction confirmed:", receipt);
          return;
        }
      } catch (error) {
        console.error("Error checking transaction receipt:", error);
      }
      console.log(`Retrying transaction confirmation... (${attempt + 1}/${retries})`);
      await new Promise(resolve => setTimeout(resolve, interval));
    }
    throw new Error("Transaction confirmation timed out. Please check the transaction hash manually.");
  };

  // Handle the donation transaction
  async function processDonation() {
    setIsProcessing(true);
    setError(null);
    setDonationStep('processing');
  
    try {
      if (!selectedCrypto || !selectedNetwork || !donationAmount) {
        throw new Error("Donation details are incomplete.");
      }
  
      if (!walletAddress) {
        throw new Error("Please connect your wallet first.");
      }
  
      if (currentNetwork !== selectedNetwork.id) {
        const switched = await switchNetwork(selectedNetwork.id);
        if (!switched) {
          throw new Error("Failed to switch network. Please switch manually and try again.");
        }
      }

      let txHash = "transaction-hash-placeholder";
      let tokenTxSuccess = false;
      
      // Verificar se o token é nativo da rede ou se é um token ERC-20
      const isNativeToken = (
        (selectedCrypto.symbol === "ETH" && selectedNetwork.id === "ethereum") || 
        (selectedCrypto.symbol === "AVAX" && selectedNetwork.id === "avalanche") || 
        (selectedCrypto.symbol === "BNB" && selectedNetwork.id === "bsc")
      );
      
      // Validar que a carteira está na rede correta antes de prosseguir
      const provider = await web3Service.getWeb3Provider();
      if (!provider) {
        throw new Error("Unable to connect to your wallet. Please check your connection and try again.");
      }
      
      // Abrir a MetaMask diretamente sem verificações prévias de saldo
      // para permitir que a própria carteira mostre erros de forma amigável
      try {
        if (isNativeToken) {
          // Processamento para tokens nativos (ETH na Ethereum, BNB na BSC, AVAX na Avalanche)
          console.log(`Processing native ${selectedCrypto.symbol} transaction on ${selectedNetwork.name}...`);
          const recipientAddress = DONATION_ADDRESSES[selectedNetwork.id]?.[selectedCrypto.symbol];
          if (!recipientAddress) {
            throw new Error(`Donation address not found for ${selectedCrypto.symbol} on ${selectedNetwork.name}`);
          }

          const signer = provider.getSigner();
          
          // Criar a transação nativa e enviar diretamente para a MetaMask processar
          const tx = await signer.sendTransaction({
            to: recipientAddress,
            value: ethers.utils.parseEther(donationAmount),
          });

          console.log(`Waiting for ${selectedCrypto.symbol} transaction confirmation...`);
          await waitForTransactionConfirmation(provider, tx.hash);
          txHash = tx.hash;
          setDonationHash(txHash);
          tokenTxSuccess = true;
          console.log(`${selectedCrypto.symbol} transaction sent successfully! Hash: ${txHash}`);
        } else {
          // Processamento para tokens não-nativos (todos tratados como ERC-20)
          console.log(`Processing token ${selectedCrypto.symbol} as ERC-20 on ${selectedNetwork.name}...`);
          
          const recipientAddress = DONATION_ADDRESSES[selectedNetwork.id]?.[selectedCrypto.symbol];
          if (!recipientAddress) {
            throw new Error(`Donation address not found for ${selectedCrypto.symbol} on ${selectedNetwork.name}`);
          }

          // Verificar se há um endereço de contrato para o token na rede atual
          const tokenAddress = TOKEN_ADDRESSES[selectedNetwork.id]?.[selectedCrypto.symbol];
          if (!tokenAddress) {
            throw new Error(`Token ${selectedCrypto.symbol} is not currently supported on ${selectedNetwork.name}.`);
          }

          const signer = provider.getSigner();
          const tokenContract = new ethers.Contract(
            tokenAddress,
            [
              'function approve(address spender, uint256 amount) public returns (bool)',
              'function transfer(address to, uint256 amount) public returns (bool)',
              'function balanceOf(address account) public view returns (uint256)',
              'function allowance(address owner, address spender) public view returns (uint256)',
              'function decimals() public view returns (uint8)'
            ],
            signer
          );

          // Verificar decimais do token
          let decimals;
          try {
            decimals = await tokenContract.decimals();
            console.log(`Token decimals: ${decimals}`);
          } catch (error) {
            decimals = 18; // Fallback para o valor padrão
          }
          
          const amount = ethers.utils.parseUnits(donationAmount, decimals);
          
          // Enviar a transação do token ERC-20 diretamente para a MetaMask processar
          const tx = await tokenContract.transfer(recipientAddress, amount);

          console.log(`Waiting for ${selectedCrypto.symbol} transaction confirmation...`);
          await waitForTransactionConfirmation(provider, tx.hash);
          txHash = tx.hash;
          setDonationHash(txHash);
          tokenTxSuccess = true;
          console.log(`${selectedCrypto.symbol} transaction sent successfully! Hash: ${txHash}`);
        }
      } catch (txError: any) {
        console.error("Error sending transaction:", txError);
        
        // Traduzir mensagens de erro comuns para formato mais amigável
        if (txError.message) {
          // Verificar saldo insuficiente
          if (txError.message.includes("insufficient funds") || 
              txError.message.includes("insufficient balance") ||
              txError.message.includes("exceeds balance")) {
            throw new Error(`You don't have enough ${selectedCrypto.symbol} in your wallet to complete this donation.`);
          }
          
          // Erro de rejeição pelo usuário
          if (txError.message.includes("user rejected") || 
              txError.message.includes("User denied") ||
              txError.message.includes("user cancelled")) {
            throw new Error(`Transaction cancelled. You can try again when you're ready.`);
          }
          
          // Erro de gas 
          if (txError.message.includes("gas required exceeds")) {
            throw new Error(`The network is congested right now. Please try again with a higher gas limit.`);
          }
          
          // Erro de nonce
          if (txError.message.includes("nonce")) {
            throw new Error(`Transaction sequence error. Please reset your MetaMask account or try again later.`);
          }
        }
        
        // Mensagem de erro padrão mais amigável se não encaixar em nenhum caso específico
        throw new Error(`There was a problem processing your ${selectedCrypto.symbol} transaction. Please check your wallet and try again.`);
      }

      // Continue com a distribuição de tokens G33
      console.log("Starting G33 token distribution...");

      try {
        const result = await tokenService.processDonationAndDistributeTokens(
          walletAddress,
          parseFloat(donationAmount),
          selectedCrypto.symbol,
          txHash,
          selectedNetwork.id,
          false // Não esperar pela confirmação da blockchain
        );

        if (!result.success) {
          console.error("Failed to distribute G33 tokens:", result.error);
          throw new Error(result.error || "Failed to distribute G33 tokens. The donation was completed successfully, but there was an issue with token distribution.");
        }

        console.log("Resultado completo da distribuição de tokens:", result);
        console.log("Hash de distribuição recebido:", result.distributionTxHash);
        
        setTransactionHash(result.distributionTxHash || null);
        setDonationStep('success');
        console.log("Donation and token distribution initiated successfully!");
      } catch (error) {
        if (error instanceof SyntaxError) {
          console.error("JSON parsing error:", error.message);
        } else {
          console.error("Error distributing G33 tokens:", error);
        }
        
        if (tokenTxSuccess) {
          // Se a doação foi bem-sucedida mas a distribuição de tokens falhou
          setError("Your donation was successful, but there was an issue distributing your G33 tokens. Our team will ensure you receive them shortly.");
          setDonationStep('success'); // Ainda mostra o sucesso já que a doação foi completada
        } else {
          setError(error instanceof Error ? error.message : "Error distributing G33 tokens. Please try again.");
          setDonationStep('error');
        }
      } finally {
        setIsProcessing(false);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error("Error processing donation:", errorMessage);
      setError(errorMessage || "Unknown error processing donation.");
      setDonationStep('error');
    } finally {
      setIsProcessing(false);
    }
  }

  // Reset the flow
  const resetDonation = () => {
    setSelectedCrypto(null);
    setSelectedNetwork(null);
    setDonationAmount('');
    setDonationStep('select_crypto');
    setError(null);
    setTransactionHash(null);
  };

  return (
    <Layout>
      <div className="min-h-screen bg-gray-900 text-white">
        {/* Hero Section */}
        <section className="relative py-20 px-4 sm:px-6 lg:px-8 overflow-hidden">
          <div className="absolute inset-0 z-0 opacity-20">
            <div className="absolute inset-0 bg-gradient-to-r from-orange-500 to-purple-600" />
          </div>
          
          <div className="max-w-7xl mx-auto relative z-10">
            <div className="text-center">
              <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4">
                Support <span className="text-orange-500">Gate33</span>
              </h1>
              <p className="text-xl md:text-2xl text-gray-300 max-w-3xl mx-auto">
                Help us build a safer Web3 job marketplace by contributing to our project
              </p>
            </div>
          </div>
        </section>

        {/* Project Description */}
        <section className="py-16 px-4 sm:px-6 lg:px-8 bg-gray-900">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold mb-8 text-center">Our Mission</h2>
            <div className="prose prose-lg prose-invert max-w-none">
              <p className="mb-6">
                Gate33 was created with a clear purpose: to establish a secure environment for Web3 job seekers. Through rigorous manual validation of companies using our platform, we prevent fraud that often turns dream job opportunities into nightmares.
              </p>
              <p className="mb-6">
                Our platform goes beyond traditional job boards by incorporating innovative features like our InstantJobs system, which provides a competitive edge over other solutions in the market. This feature allows professionals to take on small tasks and projects, creating additional income streams while building their portfolios.
              </p>
              <p className="mb-6">
                At Gate33, we prioritize security over profit. Every company undergoes a thorough verification process before they can post jobs, and we continuously monitor the quality of published opportunities. Our blockchain-based infrastructure ensures data integrity while our Learn2Earn system rewards candidates for improving their professional skills.
              </p>
              <p>
                Your donations will directly support the continued development of Gate33, helping us create more tools and features to protect and empower job seekers in the Web3 space.
              </p>
            </div>
          </div>
        </section>

        {/* Donation Form */}
        <section className="py-16 px-4 sm:px-6 lg:px-8 bg-gray-800">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-3xl font-bold mb-8 text-center">Make a Donation</h2>
            
            <div className="mb-8 flex justify-center">
              <div className="inline-flex rounded-md shadow">
                <WalletButton className="px-8 py-3" availableNetworks={["ethereum", "polygon", "binance", "avalanche", "optimism"]} />
              </div>
            </div>
            
            {/* Token reward explanation */}
            <div className="bg-gray-900 p-6 rounded-lg shadow-lg mb-8">
              <h3 className="text-xl font-semibold mb-4">Souvenir Token</h3>
              <p className="text-gray-300 mb-4">
                As a thank you for your donation, you will receive G33 tokens as a memento. These tokens serve as a digital souvenir of your contribution to the Gate33 project.
              </p>
              <p className="text-gray-300">
                While we currently don't have specific plans for the utility of these tokens, they may eventually bring advantages on the platform as a form of recognition for your early support.
              </p>
            </div>
            
            {/* Donation Flow */}
            <div className="bg-gray-900 p-6 rounded-lg shadow-lg">
              {donationStep === 'select_crypto' && (
                <div>
                  <h3 className="text-xl font-semibold mb-4">1. Select Cryptocurrency</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {cryptocurrencies.map((crypto) => (
                      <div 
                        key={crypto.symbol}
                        className="p-4 rounded-lg cursor-pointer border border-gray-700 hover:border-orange-500 hover:bg-gray-800 transition duration-200"
                        onClick={() => handleCryptoSelect(crypto)}
                      >
                        <div className="flex items-center">
                          <div className="w-10 h-10 mr-3 flex-shrink-0">
                            <div className="w-full h-full bg-gray-700 rounded-full flex items-center justify-center">
                              {crypto.symbol}
                            </div>
                          </div>
                          <div>
                            <h4 className="font-medium">{crypto.name}</h4>
                            <p className="text-sm text-gray-400">{crypto.symbol}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Remove select_network step and go directly to enter_amount */}
              {donationStep === 'enter_amount' && selectedCrypto && selectedNetwork && (
                <div>
                  <button 
                    onClick={() => setDonationStep('select_crypto')} 
                    className="mb-4 text-orange-400 hover:text-orange-300 flex items-center"
                  >
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path>
                    </svg>
                    Back
                  </button>
                  
                  <h3 className="text-xl font-semibold mb-4">2. Enter Donation Amount</h3>
                  
                  <div className="mb-6">
                    <div className="flex items-center bg-gray-800 rounded-lg p-3 border border-gray-700">
                      <div className="mr-3">
                        <div className="w-10 h-10 bg-gray-700 rounded-full flex items-center justify-center">
                          {selectedCrypto?.symbol}
                        </div>
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">{selectedCrypto?.name}</p>
                        <p className="text-sm text-gray-400">on {selectedNetwork?.name}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mb-6">
                    <label htmlFor="amount" className="block text-sm font-medium text-gray-400 mb-2">
                      Amount ({selectedCrypto?.symbol})
                    </label>
                    <div className="mt-1 relative rounded-md shadow-sm">
                      <input
                        type="text"
                        id="amount"
                        className="bg-gray-800 focus:ring-orange-500 focus:border-orange-500 block w-full pr-12 sm:text-sm border-gray-700 rounded-md p-3"
                        placeholder="0.00"
                        value={donationAmount}
                        onChange={handleAmountChange}
                      />
                      <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                        <span className="text-gray-500 sm:text-sm">
                          {selectedCrypto?.symbol}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Display USD value and estimated tokens */}
                  {usdValue !== null && estimatedTokens !== null && (
                    <div className="mt-4 p-4 bg-gray-800/60 border border-orange-500/20 rounded-lg text-center">
                      <p className="text-sm text-gray-300 mb-2">Estimated value of your donation:</p>
                      {usdValue !== null ? (
                        <p className="text-xl font-bold text-white mb-1">
                          ${usdValue.toFixed(2)} <span className="text-gray-400">USD</span>
                        </p>
                      ) : (
                        <p className="text-xl font-bold text-white mb-1">- <span className="text-gray-400">USD</span></p>
                      )}
                      <p className="text-sm text-gray-400 mb-2">You will receive approximately:</p>
                      {estimatedTokens !== null ? (
                        <p className="text-2xl font-bold text-orange-500 mb-1">
                          {Math.floor(estimatedTokens)} <span className="text-gray-300">G33 Tokens</span>
                        </p>
                      ) : (
                        <p className="text-2xl font-bold text-orange-500 mb-1">- <span className="text-gray-300">G33 Tokens</span></p>
                      )}
                      <p className="text-xs text-gray-400 mt-2">1 G33 Token for each $1 USD donated</p>
                    </div>
                  )}
                  
                  <div className="flex justify-center">
                    <button
                      type="button"
                      className="px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
                      onClick={handleConfirmDonation}
                      disabled={!donationAmount || parseFloat(donationAmount) <= 0 || (usdValue !== null && usdValue < 1)}
                    >
                      Continue
                    </button>
                  </div>
                </div>
              )}

              {donationStep === 'confirmation' && selectedCrypto && selectedNetwork && (
                <div>
                  <button 
                    onClick={() => setDonationStep('enter_amount')} 
                    className="mb-4 text-orange-400 hover:text-orange-300 flex items-center"
                  >
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path>
                    </svg>
                    Back
                  </button>
                  
                  <h3 className="text-xl font-semibold mb-4">3. Confirm Your Donation</h3>
                  
                  <div className="bg-gray-800 rounded-lg p-6 mb-6">
                    <div className="flex justify-between mb-4">
                      <span className="text-gray-400">Amount:</span>
                      <span className="font-medium">
                        {donationAmount} {selectedCrypto?.symbol}
                      </span>
                    </div>
                    <div className="flex justify-between mb-4">
                      <span className="text-gray-400">Network:</span>
                      <span className="font-medium">
                        {currentNetwork ? (networks.find(n => n.id === currentNetwork)?.name || currentNetwork) : (selectedNetwork?.name || '-')}
                      </span>
                    </div>
                    <div className="flex justify-between mb-4">
                      <span className="text-gray-400">G33 Tokens:</span>
                      <span className="font-medium">
                        {estimatedTokens !== null ? Math.floor(estimatedTokens) : '-'} G33
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 mb-2">
                      Wallet: {walletAddress ? `${walletAddress.substring(0, 6)}...${walletAddress.substring(walletAddress.length - 4)}` : '-'}
                    </p>
                  </div>
                  
                  <div className="flex justify-center">
                    {selectedNetwork?.id === 'avalanche' && selectedCrypto?.symbol === 'AVAX' ? (
                      <button
                        type="button"
                        className="px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
                        onClick={processDonation}
                        disabled={!walletAddress || isProcessing}
                      >
                        {isProcessing ? "Processing..." : "Complete Donation"}
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
                        onClick={processDonation}
                        disabled={!walletAddress || isProcessing}
                      >
                        {isProcessing ? "Processing..." : "Complete Donation"}
                      </button>
                    )}
                  </div>
                </div>
              )}

              {donationStep === 'processing' && (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-orange-500 mx-auto mb-4"></div>
                  <h3 className="text-xl font-semibold mb-2">Processing Your Donation</h3>
                  <p className="text-gray-400">Please confirm the transaction in your wallet when prompted</p>
                </div>
              )}

              {donationStep === 'success' && (
                <DonationThankYouCard
                  tokenAmount={estimatedTokens || 0}
                  donationHash={donationHash || undefined}
                  distributionHash={transactionHash || undefined}
                  networkName={selectedNetwork?.name || 'Polygon'}
                  onNewDonation={resetDonation}
                />
              )}

              {donationStep === 'error' && error && (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                    </svg>
                  </div>
                  
                  <h3 className="text-xl font-semibold mb-2">Transaction Failed</h3>
                  <p className="text-gray-400 mb-4">{error}</p>
                  
                  <div className="mt-6">
                    <button
                      type="button"
                      className="px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
                      onClick={() => setDonationStep('confirmation')}
                    >
                      Try Again
                    </button>
                  </div>
                </div>
              )}
              
              {error && donationStep !== 'error' && (
                <div className="mt-4 p-3 bg-red-900/30 border border-red-800/50 rounded-lg">
                  <p className="text-sm text-red-400">{error}</p>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="py-16 px-4 sm:px-6 lg:px-8 bg-gray-900">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold mb-8 text-center">Frequently Asked Questions</h2>
            
            <div className="space-y-6">
              <div className="bg-gray-800 rounded-lg p-6">
                <h3 className="text-xl font-semibold mb-2">How are donations used?</h3>
                <p className="text-gray-400">
                  All donations go directly toward developing and maintaining the Gate33 platform. This includes improving security features, expanding our verification processes, and building new tools to protect job seekers in the Web3 space.
                </p>
              </div>
              
              <div className="bg-gray-800 rounded-lg p-6">
                <h3 className="text-xl font-semibold mb-2">What are the G33 tokens I'll receive?</h3>
                <p className="text-gray-400">
                  The G33 tokens you receive are digital souvenirs as a thank you for your contribution. While they don't currently have specific functionality, they serve as a memento of your early support for Gate33. In the future, these tokens may offer benefits within our platform as a way to show appreciation to our early supporters.
                </p>
              </div>
              
              <div className="bg-gray-800 rounded-lg p-6">
                <h3 className="text-xl font-semibold mb-2">Can I donate using a non-crypto payment method?</h3>
                <p className="text-gray-400">
                  Currently, we only accept cryptocurrency donations. This aligns with our focus on Web3 technologies and provides greater transparency regarding how funds are utilized.
                </p>
              </div>
              
              <div className="bg-gray-800 rounded-lg p-6">
                <h3 className="text-xl font-semibold mb-2">Is my donation tax-deductible?</h3>
                <p className="text-gray-400">
                  Gate33 is not a registered charitable organization, so donations are not tax-deductible. Please consult with a tax professional regarding the tax implications of cryptocurrency donations in your jurisdiction.
                </p>
              </div>
              
              <div className="bg-gray-800 rounded-lg p-6">
                <h3 className="text-xl font-semibold mb-2">What makes Gate33 different from other job platforms?</h3>
                <p className="text-gray-400">
                  Gate33 differentiates itself through three main factors: (1) Rigorous company verification to prevent fraud; (2) Use of blockchain technology to ensure data security; (3) Learn2Earn system that allows candidates to earn tokens while improving their professional skills. Additionally, our InstantJobs feature provides flexible work opportunities beyond traditional employment models.
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </Layout>
  );
}