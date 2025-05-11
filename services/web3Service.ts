import { ethers } from 'ethers';
import { collection, addDoc, getDocs, query, where, doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { 
  PAYMENT_RECEIVER_ADDRESS, 
  NETWORK_CONFIG, 
  SERVICE_FEE_PERCENTAGE, 
  TRANSACTION_TIMEOUT 
} from '../config/paymentConfig';
import { getHttpRpcUrls } from '../config/rpcConfig';

declare global {
  interface Window {
    ethereum?: any;
  }
}

export type NetworkType = 'ethereum' | 'polygon' | 'binance' | 'binanceTestnet' | 'avalanche' | 'optimism';

export interface WalletInfo {
  address: string;
  chainId: number;
  networkName: string;
}

export interface Transaction {
  hash: string;
  from: string;
  to: string;
  amount: string;
  currency: string;
  networkName: string;
  timestamp: number;
  status: 'pending' | 'confirmed' | 'failed';
  purpose?: string;
}

class Web3Service {
  provider: ethers.providers.Web3Provider | null = null;
  signer: ethers.Signer | null = null;
  walletInfo: WalletInfo | null = null;
  fallbackProvider: ethers.providers.JsonRpcProvider | ethers.providers.InfuraProvider | null = null;
  isInitializing: boolean = false;
  connectionError: string | null = null;
  wcV2Provider: any = null;

  // Network configurations imported from the configuration file
  networks = NETWORK_CONFIG;

  // Inicialize fallback providers
  constructor() {
    this.initializeFallbackProviders();
  }

  /**
   * Gets the name of a network from its chainId
   */
  private getNetworkNameForChainId(chainId: number): string {
    // Specific identification for BSC Testnet (97)
    if (chainId === 97) return 'BSC Testnet';
    // Other common networks
    if (chainId === 1) return 'Ethereum Mainnet';
    if (chainId === 56) return 'Binance Smart Chain';
    if (chainId === 137) return 'Polygon Mainnet';
    if (chainId === 43114) return 'Avalanche C-Chain';
    if (chainId === 10) return 'Optimism';
    if (chainId === 80001) return 'Polygon Mumbai Testnet';
    if (chainId === 11155111) return 'Sepolia Testnet';
    if (chainId === 5) return 'Goerli Testnet';
    // Check configured network mapping
    for (const [name, net] of Object.entries(this.networks)) {
      if (net.chainId === chainId) {
        return net.name;
      }
    }
    return chainId > 0 ? `Network ${chainId}` : 'Unknown';
  }
  /**
   * Listeners para eventos do WalletConnect v2
   */
  private setupWalletConnectV2Listeners() {
    if (!this.wcV2Provider) return;
    
    console.log('[WalletConnect] Setting up event listeners');
    
    // Remove listeners antigos para evitar duplicidade
    try {
      this.wcV2Provider.removeAllListeners?.('session_delete');
      this.wcV2Provider.removeAllListeners?.('accountsChanged');
      this.wcV2Provider.removeAllListeners?.('chainChanged');
      this.wcV2Provider.removeAllListeners?.('disconnect');
      this.wcV2Provider.removeAllListeners?.('connect');
    } catch (error) {
      console.warn('[WalletConnect] Error removing listeners:', error);
    }

    // Listener para desconexão da sessão
    this.wcV2Provider.on?.('session_delete', () => {
      console.log('[WalletConnect] Session deleted event received');
      this.disconnectWallet();
      window.dispatchEvent(new CustomEvent('web3WalletDisconnected'));
    });
    
    // Listener específico para o evento disconnect (complementa session_delete)
    this.wcV2Provider.on?.('disconnect', () => {
      console.log('[WalletConnect] Disconnect event received');
      this.disconnectWallet();
      window.dispatchEvent(new CustomEvent('web3WalletDisconnected'));
    });
    
    // Listener para evento de reconexão
    this.wcV2Provider.on?.('connect', () => {
      console.log('[WalletConnect] Connect event received - connection established');
    });

    // Listener para troca de contas com melhor tratamento de erro
    this.wcV2Provider.on?.('accountsChanged', (accounts: string[]) => {
      console.log('[WalletConnect] Accounts changed:', accounts);
      
      if (!accounts || accounts.length === 0) {
        console.log('[WalletConnect] No accounts available, disconnecting wallet');
        this.disconnectWallet();
        window.dispatchEvent(new CustomEvent('web3WalletDisconnected'));
      } else {
        try {
          if (this.provider && this.signer) {
            this.signer = this.provider.getSigner();
            if (this.walletInfo) {
              this.walletInfo.address = accounts[0];
            }
          }
          window.dispatchEvent(new CustomEvent('web3AccountChanged', { detail: accounts[0] }));
        } catch (error) {
          console.error('[WalletConnect] Error processing account change:', error);
        }
      }
    });

    // Listener para troca de rede com melhor tratamento de SafePal
    this.wcV2Provider.on?.('chainChanged', async (chainId: number | string) => {
      try {
        console.log('[WalletConnect] Chain changed event:', chainId);
        
        // Converter chainId para formato numérico
        let numericChainId = typeof chainId === 'string' ? 
          parseInt(chainId.startsWith('0x') ? chainId.slice(2) : chainId, 16) : 
          chainId;
          
        console.log('[WalletConnect] Numeric chainId:', numericChainId);
        
        // Get network name and configuration
        const networkName = this.getNetworkNameForChainId(numericChainId);
        console.log('[WalletConnect] Network name:', networkName);
        
        // Find network type from configuration
        let networkType: NetworkType | null = null;
        for (const [key, value] of Object.entries(this.networks)) {
          if (value.chainId === numericChainId) {
            networkType = key as NetworkType;
            break;
          }
        }
        
        if (!networkType) {
          console.log('[WalletConnect] Could not determine network type for chainId', numericChainId);
          networkType = 'ethereum'; // Default
        }
        
        // Re-initialize provider with the new chainId
        this.provider = new ethers.providers.Web3Provider(this.wcV2Provider as any, numericChainId);
        this.signer = this.provider.getSigner();
        
        // Get network info from provider
        const network = await this.provider.getNetwork();
        
        // Update wallet info
        if (this.walletInfo) {
          this.walletInfo.chainId = numericChainId;
          this.walletInfo.networkName = networkName;
        }
        
        // Dispatch network change events
        window.dispatchEvent(new CustomEvent('web3NetworkChanged', { 
          detail: this.walletInfo 
        }));
        
        // Also dispatch the successful network switch event to close modals
        window.dispatchEvent(new CustomEvent('web3NetworkSwitched', { 
          detail: { 
            networkType, 
            chainId: numericChainId, 
            name: networkName,
            provider: 'walletconnect' 
          } 
        }));
        
        console.log(`[WalletConnect] Network changed to ${networkName} (${numericChainId})`);
      } catch (error) {
        console.error('[WalletConnect] Error processing chain change:', error);
      }
    });
  }

  /**
   * Inicializa provedores fallback para quando não houver carteira conectada
   */
  private async initializeFallbackProviders() {
    try {
      // Tente primeiro com o Infura como fallback (mais confiável)
      this.fallbackProvider = new ethers.providers.InfuraProvider('mainnet', 'da1aa71d421944c69d9be9e699a29d1d');
    } catch (error) {
      console.warn('Falha ao inicializar Infura provider, tentando outros fallbacks:', error);
      try {
        // Tente alternativos públicos em ordem de prioridade
        const fallbackUrls = [
          'https://mainnet.infura.io/v3/7b71460a7cfd447295a93a1d76a71ed6', // Public Infura
          'https://cloudflare-eth.com', // Cloudflare
          'https://eth-mainnet.public.blastapi.io', // Blast API
          'https://ethereum.publicnode.com', // Public Node
        ];
        
        // Tente cada URL até encontrar uma que funcione
        for (const url of fallbackUrls) {
          try {
            this.fallbackProvider = new ethers.providers.JsonRpcProvider(url);
            // Teste se o provider está funcionando
            await this.fallbackProvider.getBlockNumber();
            console.log('Fallback provider inicializado com sucesso:', url);
            break;
          } catch (e) {
            console.warn(`Fallback provider falhou (${url}):`, e);
            this.fallbackProvider = null;
          }
        }
      } catch (fallbackError) {
        console.error('Todos os fallback providers falharam:', fallbackError);
        this.fallbackProvider = null;
      }
    }
  }

  /**
   * Obtém um provider válido, seja o conectado à carteira ou um fallback
   * Garante que sempre retorne um provider, mesmo que seja offline
   */
  getProvider() {
    if (this.provider) return this.provider;
    if (this.fallbackProvider) return this.fallbackProvider;
    
    // Se nenhum provider estiver disponível, crie um provider estático
    // que não depende de rede externa (útil para previnir erros fatais)
    try {
      return ethers.providers.getDefaultProvider('homestead', {
        // Configuração mínima que não falha mesmo sem conexão
        infura: 'da1aa71d421944c69d9be9e699a29d1d',
        alchemy: 'aBnESsQTECl5REQ7cDPdp1gDDOSg_SzE',
        etherscan: 'YKRAU1FG8JI7T52VNHPVE6NQRPD7SHZ8FB',
        quorum: 1 // Apenas um provedor precisa responder
      });
    } catch (error) {
      console.warn('Falha ao criar provider padrão, usando provider offline:', error);
      // Último recurso: retornar um provider "offline" que não falha
      return new ethers.providers.JsonRpcProvider('http://localhost:8545');
    }
  }

  /**
   * Connects to MetaMask or other compatible web3 wallet
   */
  async connectWallet(retryMode = false): Promise<WalletInfo> {
    try {
      // Check if MetaMask is available
      if (!window.ethereum) {
        throw new Error('MetaMask is not installed. Please install the extension and try again.');
      }

      // Register handlers for network events to automatically reconnect when the network changes
      this.setupNetworkChangeListeners();

      // Request access to the wallet with recovery mode
      if (retryMode) {
        console.log("Trying to connect in recovery mode");
        
        // In recovery mode, wait a moment before trying again
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        try {
          // Try to update ethereum state
          await window.ethereum.request({ method: 'eth_chainId' });
        } catch (e) {
          console.warn("Failed to verify chainId in recovery mode:", e);
        }
      }
      
      await window.ethereum.request({ method: 'eth_requestAccounts' });
      
      // Get chainId directly before creating the provider
      let chainId = 0;
      try {
        const chainIdHex = await window.ethereum.request({ method: 'eth_chainId' });
        chainId = parseInt(chainIdHex, 16);
        console.log("ChainId detected before creating provider:", chainId);
      } catch (e) {
        console.warn("Error getting chainId before creating provider:", e);
      }
      
      // Initialize the provider with detected chainId, without forcing any specific network
      const networkName = chainId === 97 ? "bnbt" : 
                          chainId === 56 ? "bnb" : 
                          chainId === 1 ? "homestead" : 
                          chainId === 137 ? "matic" :
                          chainId === 43114 ? "avalanche" :
                          chainId === 10 ? "optimism" : "any";
                          
      this.provider = new ethers.providers.Web3Provider(window.ethereum, {
        name: networkName,
        chainId: chainId || 0
      });

      // Configure additional properties safely for the type
      if (this.provider) {
        const providerWithConfig = this.provider as any;
        providerWithConfig.pollingInterval = 12000;
        providerWithConfig.stallTimeout = 750;
      }
      
      try {
        // Try to initialize the signer with complete try/catch
        this.signer = this.provider.getSigner();
        const address = await this.signer.getAddress();
        
        // Ensure the provider is ready and stable
        await this.getReliableNetworkInfo();
        
        // Validate the connection
        if (!this.walletInfo) {
          throw new Error("Failed to initialize wallet information");
        }
          console.log('Wallet connected successfully:', this.walletInfo);
        
        // Dispatch event to indicate wallet connection
        window.dispatchEvent(new CustomEvent('web3Connected', { 
          detail: this.walletInfo 
        }));
        
        return this.walletInfo;
      } catch (error) {
        console.error('Error getting wallet information:', error);
        
        // If not yet tried in recovery mode, try once
        if (!retryMode) {
          console.log("Trying again in recovery mode...");
          return this.connectWallet(true);
        }
        
        throw new Error('Could not get wallet information. Try refreshing the page.');
      }
    } catch (error: any) {
      console.error('Error connecting wallet:', error);
      
      // Clear any partial state
      this.provider = null;
      this.signer = null;
      this.walletInfo = null;
      
      throw new Error(`Failed to connect wallet: ${error.message}`);
    }
  }

  /**
   * Connects to WalletConnect v2
   */  async connectWalletConnect(): Promise<WalletInfo> {
    if (typeof window === "undefined") {
      throw new Error("WalletConnect can only be used in the browser");
    }
    
    // Clear any existing WalletConnect connection to ensure clean state
    if (this.wcV2Provider) {
      try {
        console.log('[WalletConnect] Disconnecting existing provider before reconnection');
        await this.wcV2Provider.disconnect();
      } catch (disconnectError) {
        console.warn('[WalletConnect] Error during provider disconnection:', disconnectError);
        // Continue with reconnection even if disconnect fails
      }
      this.wcV2Provider = null;
    }
    
    console.log('[WalletConnect] Initializing new connection...');
    const EthereumProvider = (await import("@walletconnect/ethereum-provider")).default;
    const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID;
    if (!projectId) {
      throw new Error("NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID is not set in .env.local");
    }
    
    // Use the unified Infura key logic from rpcConfig
    const ethRpcList = getHttpRpcUrls('ethereum');
    const infuraRpc = ethRpcList.find(url => url.includes('infura.io'));
    if (!infuraRpc || infuraRpc.includes('undefined')) {
      throw new Error('Ethereum Infura RPC endpoint is not properly configured. Please check your INFURA_KEY in .env.local and rpcConfig.ts.');
    }    // Add popular networks for better wallet compatibility
    const chains = [1, 137, 56, 43114, 10]; // Added Avalanche (43114) and Optimism (10)
    
    // Initialize with optimal configuration for general wallet compatibility
    console.log('[WalletConnect] Creating provider with chains:', chains);
    try {
      this.wcV2Provider = await EthereumProvider.init({
        projectId,
        chains,
        optionalChains: [1, 137, 56, 97, 43114, 10], // Include BSC testnet, Avalanche, and Optimism
        showQrModal: true,
        rpcMap: {
          1: infuraRpc,
          137: "https://polygon-rpc.com",
          56: "https://bsc-dataseed.binance.org/",
          97: "https://data-seed-prebsc-1-s1.binance.org:8545/",
          43114: "https://api.avax.network/ext/bc/C/rpc",
          10: "https://mainnet.optimism.io"
        },
        disableProviderPing: false, // Keep connection alive with pings
        // Use standard storage options that are compatible with WalletConnect types
        storageOptions: {
          // Remove unsupported prefix property
        }
      });
      
      console.log('[WalletConnect] Provider initialized, enabling connection...');
      await this.wcV2Provider.enable();
      console.log('[WalletConnect] Connection enabled successfully');
      
      // Verify connection state
      if (!this.wcV2Provider.session) {
        console.error('[WalletConnect] No session created after enable()');
        throw new Error('Falha ao estabelecer sessão WalletConnect. Por favor, tente novamente.');
      }
      
      console.log('[WalletConnect] Session established:', {
        topic: this.wcV2Provider.session.topic,
        expiry: this.wcV2Provider.session.expiry,
        connected: this.wcV2Provider.connected
      });
      
      // Create provider from WalletConnect
      this.provider = new ethers.providers.Web3Provider(this.wcV2Provider as any);
      this.signer = this.provider.getSigner();
      
      // Get address and network info with better error handling
      let address: string;
      try {
        address = await this.signer.getAddress();
        console.log('[WalletConnect] Connected address:', address);
      } catch (addressError) {
        console.error('[WalletConnect] Failed to get address:', addressError);
        throw new Error('Não foi possível obter o endereço da carteira. Verifique se sua carteira está conectada.');
      }
      
      // Get network with timeout protection
      const networkPromise = this.provider.getNetwork();
      const networkTimeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Tempo esgotado ao obter informações de rede')), 10000);
      });
      
      let network;
      try {
        network = await Promise.race([networkPromise, networkTimeoutPromise]);
        console.log('[WalletConnect] Connected network:', network);
      } catch (networkError) {
        console.error('[WalletConnect] Failed to get network:', networkError);
        // Use a default network if we can't detect it
        network = { chainId: 1, name: 'unknown' };
      }
      
      this.walletInfo = {
        address,
        chainId: network.chainId,
        networkName: this.getNetworkNameForChainId(network.chainId)
      };
      
      // Adiciona listeners para eventos do WalletConnect v2
      this.setupWalletConnectV2Listeners();
      
      // Dispatch event to indicate wallet connection
      window.dispatchEvent(new CustomEvent('web3Connected', { 
        detail: this.walletInfo 
      }));
      
      console.log('[WalletConnect] Connection complete, returning wallet info:', this.walletInfo);
      return this.walletInfo;
    } catch (error) {
      console.error('[WalletConnect] Error during connection process:', error);
      // Clean up failed connection attempt
      if (this.wcV2Provider) {
        try {
          await this.wcV2Provider.disconnect();
        } catch (e) {
          console.warn('[WalletConnect] Error during cleanup after failed connection:', e);
        }
        this.wcV2Provider = null;
      }
      this.provider = null;
      this.signer = null;
      
      // Provide helpful error message
      if (error instanceof Error) {
        if (error.message.includes('User rejected')) {
          throw new Error('Conexão cancelada. Você rejeitou a solicitação de conexão.');
        }
        throw error;
      }
      throw new Error('Falha ao conectar com a carteira. Por favor, tente novamente.');
    }
  }

  /**
   * Sets up listeners for network change events
   */
  private setupNetworkChangeListeners() {
    if (!window.ethereum) return;
    
    // Remove old listeners to avoid duplication
    window.ethereum.removeAllListeners('chainChanged');
    window.ethereum.removeAllListeners('networkChanged');
    window.ethereum.removeAllListeners('accountsChanged');
    
    // When the network changes, reconnect
    window.ethereum.on('chainChanged', async (chainId: string) => {
      try {
        console.log('Network changed to:', chainId);
        
        // Get the numeric chainId
        const numericChainId = parseInt(chainId, 16);
        
        // Determine the network name based on chainId
        let networkName = "any";
        if (numericChainId === 97) networkName = "bnbt";
        else if (numericChainId === 56) networkName = "bnb";
        else if (numericChainId === 1) networkName = "homestead";
        else if (numericChainId === 137) networkName = "matic";
        else if (numericChainId === 43114) networkName = "avalanche";
        else if (numericChainId === 10) networkName = "optimism";
        
        // Reinitialize the provider and signer with the correct chainId
        this.provider = new ethers.providers.Web3Provider(window.ethereum, {
          name: networkName,
          chainId: numericChainId
        });
        
        // Configure additional properties after creation
        if (this.provider) {
          const providerWithConfig = this.provider as any;
          providerWithConfig.pollingInterval = 8000;
          providerWithConfig.stallTimeout = 750;
        }
        
        // Wait a moment for the network to stabilize
        await new Promise(resolve => setTimeout(resolve, 500));
        
        this.signer = this.provider.getSigner();
        
        // Update the wallet information
        await this.getReliableNetworkInfo();
        
        // Trigger an event so other components know about the change
        window.dispatchEvent(new CustomEvent('web3NetworkChanged', { detail: this.walletInfo }));
      } catch (error) {
        console.error('Error processing network change:', error);
        
        // Try to completely reconnect
        this.provider = null;
        this.signer = null;
        
        // Wait a moment before reconnecting
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        try {
          await this.connectWallet(true);
          // Notify only if successfully reconnected
          window.dispatchEvent(new CustomEvent('web3NetworkChanged', { detail: this.walletInfo }));
        } catch (reconnectError) {
          console.error('Error reconnecting after network change:', reconnectError);
        }
      }
    });
    
    // When accounts change
    window.ethereum.on('accountsChanged', async (accounts: string[]) => {
      if (accounts.length === 0) {
        // User disconnected the wallet
        this.disconnectWallet();
        window.dispatchEvent(new CustomEvent('web3WalletDisconnected'));
      } else {
        // User switched accounts
        if (this.provider && this.signer) {
          this.signer = this.provider.getSigner();
          if (this.walletInfo) {
            this.walletInfo.address = accounts[0];
          }
        }
        window.dispatchEvent(new CustomEvent('web3AccountChanged', { detail: accounts[0] }));
      }
    });
  }

  /**
   * Gets reliable network information with multiple attempts
   */
  private async getReliableNetworkInfo() {
    let attempts = 0;
    const maxAttempts = 3;
    while (attempts < maxAttempts) {
      try {
        let network;
        if (this.provider) {
          network = await this.provider.getNetwork();
        } else {
          throw new Error('No provider available');
        }
        let networkName = this.getNetworkNameForChainId(network.chainId);
        if (network.chainId > 0) {
          this.walletInfo = {
            address: await this.signer!.getAddress(),
            chainId: network.chainId,
            networkName
          };
          return this.walletInfo;
        }
        attempts++;
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        attempts++;
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    this.walletInfo = {
      address: await this.signer!.getAddress(),
      chainId: 0,
      networkName: 'Unknown'
    };
    return this.walletInfo;
  }

  /**
   * Disconnects the current wallet
   */
  disconnectWallet() {
    this.provider = null;
    this.signer = null;
    this.walletInfo = null;
  }

  /**
   * Checks if the wallet is connected
   */
  isWalletConnected(): boolean {
    return this.signer !== null && this.walletInfo !== null;
  }

  /**
   * Gets information about the connected wallet
   */
  getWalletInfo(): WalletInfo | null {
    return this.walletInfo;
  }
  /**
   * Switches to a specific network
   */
  async switchNetwork(networkType: NetworkType): Promise<boolean> {
    const network = this.networks[networkType];

    // Log de início da operação com informações importantes
    console.log(`[switchNetwork] Switching to network ${networkType} (chainId: ${network.chainId})`, {
      isUsingWalletConnect: !!this.wcV2Provider,
      hasEthereumProvider: !!window.ethereum
    });
    
    // Caso especial para WalletConnect - neste método sempre usamos tentativa direta
    if (this.wcV2Provider) {
      try {
        // Para WalletConnect, vamos primeiro verificar se o provedor realmente está conectado
        const isConnected = this.wcV2Provider.connected === true;
        
        if (!isConnected) {
          console.log('[switchNetwork] WalletConnect not connected, attempting to reconnect...');
          try {
            await this.wcV2Provider.enable();
            console.log('[switchNetwork] WalletConnect reconnected');
          } catch (enableError) {
            console.error('[switchNetwork] Failed to reconnect WalletConnect:', enableError);
            throw new Error('A conexão com sua carteira WalletConnect foi perdida. Por favor, reconecte-a primeiro.');
          }
        }        
        // Check if the network needs special handling (BSC, Avalanche, or Optimism)
        const needsSpecialHandling = ['binance', 'avalanche', 'optimism'].includes(networkType);
        
        if (needsSpecialHandling) {
          console.log(`[switchNetwork] Special handling for ${networkType} network detected with WalletConnect`);
          // Try to switch networks via wallet_switchEthereumChain
          try {
            const chainIdHex = '0x' + network.chainId.toString(16);
            console.log(`[switchNetwork] Sending wallet_switchEthereumChain request for ${networkType} (${chainIdHex})`);
            
            await this.wcV2Provider.request({
              method: 'wallet_switchEthereumChain',
              params: [{ chainId: chainIdHex }],
            });
            
            console.log(`[switchNetwork] ${networkType} switch succeeded`);
          } catch (switchError: any) {
            console.error(`[switchNetwork] ${networkType} switch failed:`, switchError);
            
            // If we can't switch, try adding the network first
            if (switchError.code === 4902 || switchError.message?.includes('Unrecognized chain ID')) {
              console.log(`[switchNetwork] ${networkType} not found in wallet, attempting to add it...`);
              
              try {
                await this.wcV2Provider.request({
                  method: 'wallet_addEthereumChain',
                  params: [{
                    chainId: '0x' + network.chainId.toString(16),
                    chainName: network.name,
                    nativeCurrency: {
                      name: network.currencySymbol,
                      symbol: network.currencySymbol,
                      decimals: 18
                    },
                    rpcUrls: [network.rpcUrl],
                    blockExplorerUrls: [network.blockExplorer],
                  }]
                });
                
                console.log(`[switchNetwork] ${networkType} added successfully, retrying switch...`);
                
                // Try again after adding the network
                await this.wcV2Provider.request({
                  method: 'wallet_switchEthereumChain',
                  params: [{ chainId: '0x' + network.chainId.toString(16) }],
                });
              } catch (addError: any) {
                console.error(`[switchNetwork] Failed to add ${networkType}:`, addError);
                
                // If user rejected adding the network
                if (addError.code === 4001) {
                  throw new Error(`Você rejeitou adicionar a rede ${network.name}.`);
                }
                
                throw new Error(`Não foi possível adicionar a rede ${network.name}. Por favor, adicione manualmente.`);
              }
            } else {
              throw switchError; // Rethrow the original error if it's not a network not found error
            }
          }
        } else {
          // For other networks, use the standard flow
          console.log(`[switchNetwork] Standard network switch for ${networkType}`);
          const chainIdHex = '0x' + network.chainId.toString(16);
          
          await this.wcV2Provider.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: chainIdHex }],
          });
        }
        
        // Atualizar provider e signer após a troca bem-sucedida
        this.provider = new ethers.providers.Web3Provider(this.wcV2Provider as any, network.chainId);
        this.signer = this.provider.getSigner();
        
        // Atualizar informações da carteira
        if (this.walletInfo) {
          this.walletInfo.chainId = network.chainId;
          this.walletInfo.networkName = network.name;
        }
        
        // Emitir evento de troca bem-sucedida
        window.dispatchEvent(new CustomEvent('web3NetworkSwitched', { 
          detail: { 
            networkType, 
            chainId: network.chainId, 
            name: network.name,
            provider: 'walletconnect' 
          } 
        }));
        
        return true;
      } catch (error: any) {
        console.error('[switchNetwork] WalletConnect network switch error:', error);
        
        // Distinguir entre diferentes tipos de erros para melhor UX
        if (error.code === 4001 || error.message?.includes('User rejected')) {
          throw new Error('Você rejeitou a troca de rede. Por favor, tente novamente.');
        } else if (error.message?.includes('connection') || error.message?.includes('session')) {
          throw new Error('A sessão WalletConnect expirou. Por favor, reconecte sua carteira.');
        } else {
          throw new Error(`Falha ao trocar para a rede ${network.name}: ${error.message || 'Erro desconhecido'}`);
        }
      }
    }
    
    // Caso normal para MetaMask e outros que usam window.ethereum
    if (!window.ethereum) {
      throw new Error('MetaMask is not installed.');
    }
    
    try {
      // Try to switch to the network
      const chainIdHex = `0x${network.chainId.toString(16)}`;
      console.log(`[switchNetwork] Sending wallet_switchEthereumChain to MetaMask (${chainIdHex})`);
      
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: chainIdHex }],
      });
      
      console.log(`[switchNetwork] Network switch to ${networkType} successful`);
      
      // Update the provider after switching
      this.provider = new ethers.providers.Web3Provider(window.ethereum);
      this.signer = this.provider.getSigner();
      
      // Update wallet information
      if (this.walletInfo) {
        this.walletInfo.chainId = network.chainId;
        this.walletInfo.networkName = network.name;
      }
      
      // Emitir evento de troca bem-sucedida
      window.dispatchEvent(new CustomEvent('web3NetworkSwitched', { 
        detail: { 
          networkType, 
          chainId: network.chainId, 
          name: network.name,
          provider: 'metamask' 
        } 
      }));
      
      return true;
    } catch (error: any) {
      // If the network is not added to MetaMask, we try to add it
      if (error.code === 4902) {
        try {
          console.log(`[switchNetwork] Network ${networkType} not found in MetaMask, adding it...`);
          
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [
              {
                chainId: `0x${network.chainId.toString(16)}`,
                chainName: network.name,
                nativeCurrency: {
                  name: network.currencySymbol,
                  symbol: network.currencySymbol,
                  decimals: 18,
                },
                rpcUrls: [network.rpcUrl],
                blockExplorerUrls: [network.blockExplorer],
              },
            ],
          });
          
          console.log(`[switchNetwork] Network ${networkType} added successfully, retrying switch...`);
          return this.switchNetwork(networkType);
        } catch (addError: any) {
          console.error('[switchNetwork] Error adding network:', addError);
          
          if (addError.code === 4001) {
            throw new Error(`Você rejeitou adicionar a rede ${network.name}. Por favor, tente novamente.`);
          } else {
            throw new Error(`Falha ao adicionar a rede ${network.name}: ${addError.message || 'Erro desconhecido'}`);
          }
        }
      }
      
      console.error('[switchNetwork] Error switching network:', error);
      
      if (error.code === 4001) {
        throw new Error('Você rejeitou a troca de rede. Por favor, tente novamente.');
      } else {
        throw new Error(`Falha ao trocar para a rede ${network.name}: ${error.message || 'Erro desconhecido'}`);
      }
    }
  }

  /**
   * Attempts to programmatically switch network for both MetaMask and WalletConnect.
   * Returns true if switch was successful, throws with a clear message if not supported or rejected.
   */  async attemptProgrammaticNetworkSwitch(networkType: NetworkType): Promise<boolean> {
    const network = this.networks[networkType];
    const chainIdHex = '0x' + network.chainId.toString(16);    // WalletConnect v2
    if (this.wcV2Provider) {      
      // Add extensive logging to diagnose WalletConnect session state
      console.log('[WalletConnect] Provider state before network switch:', {
        hasProvider: !!this.wcV2Provider,
        hasSession: !!this.wcV2Provider.session,
        sessionTopic: this.wcV2Provider.session?.topic,
        hasAccounts: !!this.wcV2Provider.session?.accounts,
        accountsLength: this.wcV2Provider.session?.accounts?.length,
        firstAccount: this.wcV2Provider.session?.accounts?.[0],
        connected: this.wcV2Provider.connected,
        sessionProperties: Object.keys(this.wcV2Provider.session || {}),
        currentChainId: network.chainId
      });
      
      // General approach for all WalletConnect wallets
      // Check if we have any indication of a valid connection
      const hasValidSession = this.wcV2Provider.session && this.wcV2Provider.connected === true;
      
      // Defensive: check if session is active
      if (!hasValidSession) {
        console.log('[WalletConnect] Invalid session state detected. Attempting repair...');
        
        // If provider says we're connected, trust that over other indicators
        if (this.wcV2Provider.connected) {
          console.log('[WalletConnect] Provider reports connected=true. Proceeding with network switch.');
        } else {
          throw new Error('Conecte sua carteira WalletConnect antes de trocar de rede.');
        }
      }
      
      try {
        console.log(`Tentando trocar para a rede ${network.name} (chainId: ${network.chainId}) via WalletConnect...`);        // General approach to ensure proper connection for all WalletConnect wallets
        let isConnected = false;
        try {
          // First check the connected flag - most reliable indicator
          isConnected = this.wcV2Provider.connected === true;
          
          // As a secondary check, try to get accounts
          if (isConnected) {
            try {
              const accounts = await this.wcV2Provider.request({ method: 'eth_accounts' });
              console.log('[WalletConnect] Current accounts:', accounts);
              // If we get accounts, that's great, but we won't fail if this doesn't work
              // Some wallets might not properly implement eth_accounts
            } catch (accountsError) {
              console.warn('[WalletConnect] Failed to get accounts, but provider reports connected=true:', accountsError);
              // Continue anyway since we're already considering ourselves connected
            }
          }
        } catch (connectionError) {
          console.warn('[WalletConnect] Error checking connection status:', connectionError);
          // Fall back to connected flag if there was an error checking
          isConnected = this.wcV2Provider.connected === true;
        }
        
        // If not connected, try to re-establish the connection
        if (!isConnected) {
          console.log('[WalletConnect] Not connected. Attempting to reconnect...');
          try {
            await this.wcV2Provider.enable();
            console.log('[WalletConnect] Connection re-established via enable()');
            isConnected = true;
          } catch (enableError) {
            console.error('[WalletConnect] Failed to re-establish connection:', enableError);
            throw new Error('A conexão com sua carteira WalletConnect foi perdida. Por favor, reconecte e tente novamente.');
          }
        }
        
        // Sempre envie o request para o provider WalletConnect
        console.log('[WalletConnect] Enviando request wallet_switchEthereumChain:', {
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: chainIdHex }]
        });
          // Add timeout for all WalletConnect wallets to prevent UI hanging
        const switchPromise = this.wcV2Provider.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: chainIdHex }],
        });
        
        // If the wallet app doesn't respond, we want to time out after a reasonable period
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => {
            reject(new Error('Tempo esgotado ao esperar resposta da carteira. Verifique se seu aplicativo está aberto e tente novamente.'));
          }, 30000); // 30 seconds timeout
        });
        
        try {
          // Wait for either the switch to complete or timeout
          await Promise.race([switchPromise, timeoutPromise]);
          console.log(`[WalletConnect] Rede alterada com sucesso para ${network.name} (${network.chainId})`);
        } catch (error: any) {
          // Handle different types of timeout errors that might come from different wallets
          if (error.message?.includes('Tempo esgotado') || 
              error.message?.includes('timeout') ||
              error.message?.includes('timed out')) {
            throw new Error('Tempo esgotado ao trocar de rede. Verifique se seu aplicativo está aberto e respondendo.');
          }
          throw error; // Rethrow other errors to be handled by the outer catch
        }
        
        // Pequeno delay para garantir atualização
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Atualizar provider e signer
        this.provider = new ethers.providers.Web3Provider(this.wcV2Provider as any, network.chainId);
        this.signer = this.provider.getSigner();
        
        // Atualizar informações da carteira
        if (this.walletInfo) {
          this.walletInfo.chainId = network.chainId;
          this.walletInfo.networkName = network.name;
        }
        
        // Emitir evento para informar mudança bem-sucedida
        window.dispatchEvent(new CustomEvent('web3NetworkSwitched', { 
          detail: { 
            networkType, 
            chainId: network.chainId, 
            name: network.name,
            provider: 'walletconnect' 
          } 
        }));
        
        return true;
      } catch (error: any) {
        console.error('Erro ao tentar trocar de rede via WalletConnect:', error);
        
        // Tentar identificar mais precisamente o tipo de erro
        const errorMessage = error?.message || '';
        const errorCode = error?.code;
        
        // Se a rede não estiver configurada na carteira, tente adicioná-la primeiro
        if (errorCode === 4902 || errorMessage.includes('Unrecognized chain ID')) {          try {            // Enhanced network addition request with better error handling for all WalletConnect wallets
            // Add special handling for Layer 2 networks' parameters
            const decimals = 18; // Default for most networks
            
            // Create the parameters for adding the network
            const addParams = {
              chainId: chainIdHex,
              chainName: network.name,
              nativeCurrency: {
                name: network.currencySymbol,
                symbol: network.currencySymbol,
                decimals: decimals
              },
              rpcUrls: [network.rpcUrl],
              blockExplorerUrls: network.blockExplorer ? [network.blockExplorer] : []
            };
            console.log('[WalletConnect] Enviando request wallet_addEthereumChain:', addParams);
            
            // Handle timeouts properly for all WalletConnect wallets
            const addChainPromise = this.wcV2Provider.request({
              method: 'wallet_addEthereumChain',
              params: [addParams]
            });
            
            // If the wallet app is not responding, we don't want to wait forever
            const timeoutPromise = new Promise((_, reject) => {
              setTimeout(() => {
                reject(new Error('Tempo esgotado ao adicionar nova rede. Verifique se seu aplicativo está aberto.'));
              }, 30000); // 30 seconds timeout
            });
            
            // Wait for either the chain addition to complete or timeout
            await Promise.race([addChainPromise, timeoutPromise]);
            
            console.log(`Rede ${network.name} adicionada com sucesso. Tentando trocar novamente...`);
            
            // Dar um pequeno tempo antes de tentar novamente
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Tentar novamente a troca após adicionar
            return this.attemptProgrammaticNetworkSwitch(networkType);
          } catch (addError: any) {
            console.error('Erro ao adicionar rede:', addError);
            
            if (addError?.code === 4001) {
              throw new Error(`Você rejeitou adicionar a rede ${network.name}. Por favor, tente novamente.`);
            }
            
            throw new Error(`Não foi possível adicionar a rede ${network.name} à sua carteira. Por favor, adicione manualmente.`);
          }
        }
        
        // Método não suportado pela carteira
        if (errorMessage.includes('Unrecognized JSON RPC method') || 
            errorCode === -32601 || 
            errorMessage.includes('Method not supported')) {
          throw new Error(`Sua carteira WalletConnect não suporta troca automática de rede. Por favor, abra o aplicativo da sua carteira e troque manualmente para a rede ${network.name}.`);
        }
        
        // Usuário rejeitou a troca
        if (errorCode === 4001 || errorMessage.includes('User rejected')) {
          throw new Error('Você rejeitou a troca de rede. Por favor, aprove a solicitação em sua carteira.');
        }
        
        // Sessão expirada ou problema de conexão
        if (errorMessage.includes('No matching key') || 
            errorMessage.includes('connection') || 
            errorMessage.includes('session') || 
            errorMessage.includes('expired')) {
          // Este erro será capturado pelo fluxo de reconexão no componente
          throw new Error('A sessão WalletConnect expirou. Precisamos reconectar sua carteira.');
        }
        
        // Erro genérico com detalhes para debugging
        throw new Error(`Não foi possível trocar para a rede ${network.name}. Erro: ${errorMessage || 'Desconhecido'}. Por favor, faça isso manualmente em sua carteira.`);
      }
    }    // MetaMask or injected provider
    if (window.ethereum) {
      try {
        console.log(`Tentando trocar para a rede ${network.name} (chainId: ${network.chainId}) via MetaMask...`);
        
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: chainIdHex }],
        });
        
        console.log(`Rede trocada com sucesso para ${network.name} (chainId: ${network.chainId})`);
        
        // Atualizar provider e signer
        this.provider = new ethers.providers.Web3Provider(window.ethereum);
        this.signer = this.provider.getSigner();
        
        // Atualizar informações da carteira
        if (this.walletInfo) {
          this.walletInfo.chainId = network.chainId;
          this.walletInfo.networkName = network.name;
        }
        
        // Emitir evento para informar mudança bem-sucedida
        window.dispatchEvent(new CustomEvent('web3NetworkSwitched', { 
          detail: { 
            networkType, 
            chainId: network.chainId, 
            name: network.name,
            provider: 'metamask' 
          } 
        }));
        
        return true;
      } catch (error: any) {
        console.error('Erro ao tentar trocar de rede via MetaMask:', error);
        
        // Rede não configurada no MetaMask
        if (error.code === 4902 || error.message?.includes('Unrecognized chain ID')) {
          try {
            console.log(`Rede ${network.name} não encontrada no MetaMask. Tentando adicionar...`);
            
            await window.ethereum.request({
              method: 'wallet_addEthereumChain',
              params: [
                {
                  chainId: chainIdHex,
                  chainName: network.name,
                  nativeCurrency: {
                    name: network.currencySymbol,
                    symbol: network.currencySymbol,
                    decimals: 18,
                  },
                  rpcUrls: [network.rpcUrl],
                  blockExplorerUrls: network.blockExplorer ? [network.blockExplorer] : undefined,
                },
              ],
            });
            
            console.log(`Rede ${network.name} adicionada ao MetaMask. Tentando trocar novamente...`);
            
            // Dar um pequeno tempo antes de tentar novamente
            await new Promise(resolve => setTimeout(resolve, 500));
            
            // Tentar trocar novamente
            return this.attemptProgrammaticNetworkSwitch(networkType);
          } catch (addError: any) {
            console.error('Erro ao adicionar rede ao MetaMask:', addError);
            
            if (addError.code === 4001) {
              throw new Error(`Você rejeitou adicionar a rede ${network.name}. Por favor, tente novamente.`);
            }
            
            throw new Error(`Não foi possível adicionar a rede ${network.name} ao MetaMask. Por favor, adicione manualmente.`);
          }
        }
        
        // Usuário rejeitou a troca
        if (error.code === 4001) {
          throw new Error('Você rejeitou a troca de rede no MetaMask. Por favor, aprove ou troque manualmente.');
        }
        
        // Carteira bloqueada
        if (error.message?.includes('locked') || error.code === -32002) {
          throw new Error('Sua carteira MetaMask está bloqueada. Por favor, desbloqueie-a e tente novamente.');
        }
        
        // Erro genérico com detalhes
        throw new Error(error?.message || 'Não foi possível trocar de rede no MetaMask. Por favor, tente novamente ou faça isso manualmente.');
      }
    }
    
    throw new Error('Nenhuma carteira compatível encontrada. Por favor, instale MetaMask ou use WalletConnect.');
  }

  /**
   * Sends a direct transaction (transfer of ETH/BNB/MATIC)
   */
  async sendTransaction(to: string, amount: string, purpose?: string): Promise<Transaction> {
    if (!this.isWalletConnected()) {
      throw new Error('Wallet not connected');
    }

    try {
      const tx = await this.signer!.sendTransaction({
        to,
        value: ethers.utils.parseEther(amount),
      });

      const network = await this.provider!.getNetwork();
      let networkName = 'unknown';
      let currency = 'ETH';
      
      Object.entries(this.networks).forEach(([name, net]) => {
        if (net.chainId === network.chainId) {
          networkName = net.name;
          currency = net.currencySymbol;
        }
      });

      const transaction: Transaction = {
        hash: tx.hash,
        from: await this.signer!.getAddress(),
        to,
        amount,
        currency,
        networkName,
        timestamp: Date.now(),
        status: 'pending',
        purpose
      };

      // Save the transaction to Firebase
      await this.saveTransactionToFirebase(transaction);

      return transaction;
    } catch (error: any) {
      console.error('Error sending transaction:', error);
      throw new Error(`Failed to send transaction: ${error.message}`);
    }
  }

  /**
   * Saves transaction details to Firebase
   */
  async saveTransactionToFirebase(transaction: Transaction): Promise<void> {
    try {
      await addDoc(collection(db, 'transactions'), transaction);
      console.log('Transaction saved to Firebase');
    } catch (error) {
      console.error('Error saving transaction to Firebase:', error);
    }
  }

  /**
   * Gets transaction history for a specific address
   */
  async getTransactionHistory(address: string): Promise<Transaction[]> {
    try {
      const transactionsRef = collection(db, 'transactions');
      const q = query(
        transactionsRef,
        where('from', '==', address.toLowerCase())
      );
      
      const querySnapshot = await getDocs(q);
      const transactions: Transaction[] = [];
      
      querySnapshot.forEach((doc) => {
        transactions.push(doc.data() as Transaction);
      });
      
      // Sort by timestamp (most recent first)
      return transactions.sort((a, b) => b.timestamp - a.timestamp);
    } catch (error) {
      console.error('Error fetching transaction history:', error);
      throw new Error(`Failed to fetch transaction history: ${(error as Error).message}`);
    }
  }

  /**
   * Checks the status of a transaction
   */
  async checkTransactionStatus(txHash: string): Promise<'pending' | 'confirmed' | 'failed'> {
    if (!this.provider) {
      throw new Error('Provider not initialized');
    }

    try {
      const tx = await this.provider.getTransaction(txHash);
      
      if (!tx) {
        return 'failed';
      }
      
      // If the transaction doesn't have a receipt yet, it's pending
      if (!tx.blockNumber) {
        return 'pending';
      }
      
      const receipt = await this.provider.getTransactionReceipt(txHash);
      
      // If the status is 1, the transaction was confirmed successfully
      if (receipt && receipt.status === 1) {
        return 'confirmed';
      }
      
      return 'failed';
    } catch (error) {
      console.error('Error checking transaction status:', error);
      return 'failed';
    }
  }

  /**
   * Gets payment configurations from Firestore
   */
  async getPaymentConfig() {
    try {
      // Fetch configuration document from Firestore
      const configDoc = await getDoc(doc(db, "settings", "paymentConfig"));
      
      if (configDoc.exists()) {
        return configDoc.data();
      }
      
      // If it doesn't exist, return default settings
      return {
        receiverAddress: PAYMENT_RECEIVER_ADDRESS,
        serviceFee: SERVICE_FEE_PERCENTAGE,
        transactionTimeout: TRANSACTION_TIMEOUT,
        contracts: {}
      };
    } catch (error) {
      console.error('Error fetching payment configurations:', error);
      // In case of error, return default settings
      return {
        receiverAddress: PAYMENT_RECEIVER_ADDRESS,
        serviceFee: SERVICE_FEE_PERCENTAGE,
        transactionTimeout: TRANSACTION_TIMEOUT,
        contracts: {}
      };
    }
  }

  /**
   * Gets the dynamic payment address from Firestore
   */
  async getPaymentReceiverAddress(): Promise<string> {
    try {
      // Fetch configuration document from Firestore
      const configDoc = await getDoc(doc(db, "settings", "paymentConfig"));
      
      if (configDoc.exists() && configDoc.data().receiverAddress) {
        return configDoc.data().receiverAddress;
      }
      
      // If not found in Firestore, use the default value from settings
      return PAYMENT_RECEIVER_ADDRESS;
    } catch (error) {
      console.error('Error fetching payment address:', error);
      // In case of error, return the default address from settings
      return PAYMENT_RECEIVER_ADDRESS;
    }
  }

  /**
   * Gets the current service fee
   */
  async getServiceFee(): Promise<number> {
    try {
      const config = await this.getPaymentConfig();
      return config.serviceFee || SERVICE_FEE_PERCENTAGE;
    } catch (error) {
      console.error('Error fetching service fee:', error);
      return SERVICE_FEE_PERCENTAGE;
    }
  }

  /**
   * Gets the current transaction timeout in milliseconds
   */
  async getTransactionTimeout(): Promise<number> {
    try {
      const config = await this.getPaymentConfig();
      return config.transactionTimeout || TRANSACTION_TIMEOUT;
    } catch (error) {
      console.error('Error fetching transaction timeout:', error);
      return TRANSACTION_TIMEOUT;
    }
  }

  /**
   * Gets the contract address for a specific network
   */
  async getContractAddress(network: NetworkType): Promise<string | null> {
    try {
        const config = await this.getPaymentConfig();

        if (config.contracts && config.contracts[network]) {
            return config.contracts[network];
        }

        // Ensure contractAddress is optional in NETWORK_CONFIG
        const networkConfig = this.networks[network];
        if (networkConfig && 'contractAddress' in networkConfig) {
            return (networkConfig as any).contractAddress || null;
        }

        return null;
    } catch (error) {
        console.error(`Error fetching contract address for ${network}:`, error);
        return null;
    }
  }

  /**
   * Processes a payment based on a job posting plan
   */
  async processJobPostPayment(planId: string, jobId: string): Promise<Transaction> {
    try {
      // Get plan details from Firestore
      const plansRef = collection(db, 'jobPlans');
      const q = query(plansRef, where('id', '==', planId));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        throw new Error('Plan not found');
      }

      const planData = querySnapshot.docs[0].data();

      // Address for payment receipt (fetched dynamically)
      const paymentAddress = await this.getPaymentReceiverAddress();

      // Convert price to string
      const amount = planData.price.toString();

      // Send the transaction
      const transaction = await this.sendTransaction(
        paymentAddress,
        amount,
        `JobPost Payment - Plan: ${planData.name}, Job: ${jobId}`
      ); // Removed the fourth argument to match the expected number of arguments

      // Add gas limit to the transaction options if needed
      const txOptions = { gasLimit: ethers.utils.hexlify(300000) };
      // Apply txOptions where appropriate in the transaction logic

      return transaction;
    } catch (error: any) {
      console.error('Error processing job posting payment:', error);
      throw new Error(`Failed to process payment: ${error.message}`);
    }
  }

  /**
   * Converts ether value to wei
   * @param ether Value in ether
   * @returns Value in wei
   */
  toWei(ether: string): string {
    return ethers.utils.parseEther(ether).toString();
  }

  /**
   * Converts wei value to ether
   * @param wei Value in wei
   * @returns Value in ether
   */
  fromWei(wei: string): string {
    return ethers.utils.formatEther(wei);
  }

  /**
   * Obtains a contract instance
   * @param address Contract address
   * @param abi Contract ABI
   * @returns Contract instance
   */
  async getContract(address: string, abi: any[]): Promise<ethers.Contract> {
    if (!this.isWalletConnected()) {
      throw new Error('Wallet not connected');
    }

    try {
      return new ethers.Contract(address, abi, this.signer!);
    } catch (error: any) {
      console.error('Error getting contract:', error);
      throw new Error(`Failed to get contract: ${error.message}`);
    }
  }

  /**
   * Obtains the current connected wallet address
   * @returns Wallet address
   */
  async getCurrentWalletAddress(): Promise<string> {
    if (!this.isWalletConnected() || !this.signer) {
      throw new Error('Wallet not connected');
    }
    
    try {
      return await this.signer.getAddress();
    } catch (error) {
      console.error('Error getting wallet address:', error);
      throw new Error('Failed to get wallet address');
    }
  }

  /**
   * Checks if an Ethereum address is valid
   * @param address Address to be checked
   * @returns true if valid, false otherwise
   */
  isValidAddress(address: string): boolean {
    try {
      return ethers.utils.isAddress(address);
    } catch (error) {
      console.error('Error validating address:', error);
      return false;
    }
  }

  /**
   * Gets current information of the connected network 
   * @returns Information of the current network (name and chainId)
   */
  async getNetworkInfo(): Promise<{name: string, chainId: number} | null> {
    try {
      const provider = this.getProvider();
      if (!provider) {
        this.connectionError = "No provider available";
        return { name: 'Not Connected', chainId: 0 };
      }
      
      // Use a more reliable method with multiple retries
      let retryCount = 0;
      const maxRetries = 3;
      let lastError = null;
      
      while (retryCount < maxRetries) {
        try {
          // Try to get the network from the provider with improved timeout
          const networkPromise = provider.getNetwork();
          
          // Race between network detection and timeout
          const network = await Promise.race([
            networkPromise,
            new Promise<{name: string, chainId: number}>((_, reject) => {
              setTimeout(() => reject(new Error('Network detection timeout')), 15000); // Increased to 15 seconds for slower connections
            })
          ]);
          
          // Clear any previous error when successful
          this.connectionError = null;
          
          // Check if the chainId is available 
          if (!network.chainId || network.chainId === 0) {
            // Try to get it directly from ethereum
            if (typeof window !== 'undefined' && window.ethereum) {
              try {
                const chainIdHex = await window.ethereum.request({ method: 'eth_chainId' });
                const chainId = parseInt(chainIdHex, 16);
                
                if (chainId && chainId > 0) {
                  // Map network name using our existing function
                  const networkName = this.getNetworkNameForChainId(chainId);
                  return {
                    name: networkName,
                    chainId: chainId
                  };
                }
              } catch (e) {
                console.warn('Failed to get chainId from ethereum:', e);
                // Continue with retry rather than immediately failing
                lastError = e;
                retryCount++;
                continue;
              }
            }
            
            // If we still don't have valid chainId, try another retry
            if (retryCount < maxRetries - 1) {
              retryCount++;
              await new Promise(resolve => setTimeout(resolve, 1000 * retryCount)); // Increasing backoff
              continue;
            }
            
            // If we've exhausted retries, return default with clear error message
            this.connectionError = "Network detection issue. Using default configuration.";
            return {
              name: 'Ethereum (Fallback)',
              chainId: 1 // Default Mainnet
            };
          }
          
          // Ensure the network name is correct using our existing function
          const networkName = this.getNetworkNameForChainId(network.chainId);
          
          return {
            name: networkName,
            chainId: network.chainId
          };
        } catch (error) {
          console.warn(`Failed to detect network (attempt ${retryCount + 1}/${maxRetries}):`, error);
          lastError = error;
          retryCount++;
          
          // Add a delay before retry with increasing backoff
          if (retryCount < maxRetries) {
            await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
          }
        }
      }
      
      // We've exhausted all retries
      console.error('Failed to get network information after multiple retries:', lastError);
      
      // Set a user-friendly error message
      this.connectionError = lastError instanceof Error && lastError.message.includes("could not detect network")
        ? "Network detection issue. Please check your wallet connection and try again."
        : "Could not detect network. Using fallback configuration.";
      
      // Additional fallback mechanism - try to get network name from configured providers
      try {
        if (this.fallbackProvider) {
          const fallbackNetwork = await this.fallbackProvider.getNetwork();
          if (fallbackNetwork && fallbackNetwork.chainId) {
            const networkName = this.getNetworkNameForChainId(fallbackNetwork.chainId);
            return {
              name: `${networkName} (Fallback)`,
              chainId: fallbackNetwork.chainId
            };
          }
        }
      } catch (fallbackError) {
        console.warn('Fallback provider detection also failed:', fallbackError);
      }
      
      // Return default values as last resort
      return {
        name: 'Ethereum (Fallback)',
        chainId: 1
      };
    } catch (error) {
      console.error('Unexpected error getting network information:', error);
      
      // Set a clear error message that will be shown in the UI
      this.connectionError = error instanceof Error 
        ? `Network connection issue: ${error.message.substring(0, 100)}` 
        : "Unknown network error. Using fallback configuration.";
      
      // Try to reinitialize the fallback providers immediately
      try {
        await this.initializeFallbackProviders();
        
        // Try to immediately get network from our newly initialized fallback provider
        if (this.fallbackProvider) {
          try {
            // Set a shorter timeout for this fallback attempt
            const fallbackNetworkPromise = this.fallbackProvider.getNetwork();
            const fallbackNetwork = await Promise.race([
              fallbackNetworkPromise,
              new Promise<never>((_, reject) => {
                setTimeout(() => reject(new Error('Fallback network detection timeout')), 5000);
              })
            ]);
            
            if (fallbackNetwork && fallbackNetwork.chainId) {
              const networkName = this.getNetworkNameForChainId(fallbackNetwork.chainId);
              return {
                name: `${networkName} (Fallback)`,
                chainId: fallbackNetwork.chainId
              };
            }
          } catch (fallbackNetError) {
            console.warn('Immediate fallback network detection failed:', fallbackNetError);
          }
        }
      } catch (reinitError) {
        console.error('Failed to reinitialize fallback providers:', reinitError);
      }
      
      // Return default values in case of error
      return {
        name: 'Ethereum (Fallback)',
        chainId: 1
      };
    }
  }

  /**
   * Returns a Web3Provider that supports the getSigner method
   * @returns Web3Provider with getSigner support or null if unavailable
   */
  getWeb3Provider(): ethers.providers.Web3Provider | null {
    try {
      // Check if we already have an initialized Web3Provider
      if (this.provider instanceof ethers.providers.Web3Provider) {
        return this.provider;
      }

      // If no provider is initialized, try to create a new one
      if (typeof window !== 'undefined' && window.ethereum) {
        // Create a new Web3Provider
        const provider = new ethers.providers.Web3Provider(window.ethereum);
        
        // Store the provider for future use
        this.provider = provider;
        
        console.log("Web3Provider successfully created");
        return provider;
      }
      
      console.error("Ethereum provider not found. Make sure MetaMask is installed and unlocked.");
      return null;
    } catch (error) {
      console.error("Error getting Web3Provider:", error);
      return null;
    }
  }

  /**
   * Returns a WalletConnect signer for a specific network and provider
   * Used to force contract interactions on the selected network, regardless of the wallet's current network
   */
  getWalletConnectSignerForNetwork(network: string, provider?: ethers.providers.JsonRpcProvider): ethers.Signer | null {
    try {
      // Always create a new provider for the forced network
      let forcedProvider = provider;
      if (!forcedProvider) {
        const normalized = network.toLowerCase();
        const rpcList = getHttpRpcUrls(normalized);
        const rpcUrl = rpcList.length > 0 ? rpcList[0] : undefined;
        if (!rpcUrl) return null;
        forcedProvider = new ethers.providers.JsonRpcProvider(rpcUrl);
      }
      // Use the current wallet address if available
      const address = this.walletInfo?.address;
      if (!address) return null;
      // WalletConnect does not expose a private key, so we use the provider and address
      // This will only work for read operations or for contract calls that do not require signing
      // For write operations, WalletConnect must be connected and the user must approve the transaction
      return forcedProvider.getSigner(address);
    } catch (e) {
      console.error('Error creating WalletConnect signer for network:', network, e);
      return null;
    }
  }

  /**
   * Switches MetaMask to the specified network (by normalized name)
   * Throws if MetaMask is not available or user rejects
   */
  async switchNetworkInMetamask(network: string): Promise<void> {
    if (!window.ethereum) throw new Error('MetaMask is not installed.');
    const normalized = network.toLowerCase();
    const key = normalized as keyof typeof NETWORK_CONFIG;
    const netConfig = this.networks[key];
    if (!netConfig) throw new Error(`Network config not found for: ${network}`);
    const chainIdHex = '0x' + netConfig.chainId.toString(16);
    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: chainIdHex }],
      });
    } catch (error: any) {
      // If the network is not added to MetaMask, try to add it
      if (error.code === 4902) {
        await window.ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [
            {
              chainId: chainIdHex,
              chainName: netConfig.name,
              nativeCurrency: {
                name: netConfig.currencySymbol,
                symbol: netConfig.currencySymbol,
                decimals: 18,
              },
              rpcUrls: [netConfig.rpcUrl],
              blockExplorerUrls: [netConfig.blockExplorer],
            },
          ],
        });
      } else {
        throw error;
      }
    }
    // After switching, update provider and signer
    this.provider = new ethers.providers.Web3Provider(window.ethereum);
    this.signer = this.provider.getSigner();
  }

  /**
   * Creates a JsonRpcProvider for a specific network (by normalized name)
   */
  createNetworkProvider(network: string): ethers.providers.JsonRpcProvider | null {
    try {
      const normalized = network.toLowerCase();
      const rpcList = getHttpRpcUrls(normalized);
      const rpcUrl = rpcList.length > 0 ? rpcList[0] : undefined;
      if (!rpcUrl) return null;
      return new ethers.providers.JsonRpcProvider(rpcUrl);
    } catch (e) {
      console.error('Error creating network provider:', network, e);
      return null;
    }
  }
}

export const web3Service = new Web3Service();
export default web3Service;