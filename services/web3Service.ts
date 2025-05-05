import { ethers } from 'ethers';
import { collection, addDoc, getDocs, query, where, doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { 
  PAYMENT_RECEIVER_ADDRESS, 
  NETWORK_CONFIG, 
  SERVICE_FEE_PERCENTAGE, 
  TRANSACTION_TIMEOUT 
} from '../config/paymentConfig';

declare global {
  interface Window {
    ethereum?: any;
  }
}

export type NetworkType = 'ethereum' | 'polygon' | 'binance' | 'avalanche' | 'optimism';

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

  // Network configurations imported from the configuration file
  networks = NETWORK_CONFIG;

  // Inicialize fallback providers
  constructor() {
    this.initializeFallbackProviders();
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
          'https://mainnet.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161', // Public Infura
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
        // Get network information safely
        let network;
        try {
          network = await this.provider!.getNetwork();
          
          // If the returned chainId is zero, try to get it directly from ethereum
          if (!network.chainId || network.chainId === 0) {
            const chainIdHex = await window.ethereum.request({ method: 'eth_chainId' });
            const chainId = parseInt(chainIdHex, 16);
            
            if (chainId && chainId > 0) {
              network.chainId = chainId;
              console.log('ChainId obtained directly from provider:', chainId);
            } else {
              // Try other detection methods for common networks
              if (window.ethereum.networkVersion === '97') {
                network.chainId = 97; // BSC Testnet
                network.name = 'bnbt';
              } else if (window.ethereum.networkVersion === '56') {
                network.chainId = 56; // BSC Mainnet
                network.name = 'bnb';
              }
            }
          }
        } catch (networkError) {
          console.warn('Error getting network (attempt ' + (attempts + 1) + '):', networkError);
          
          // Try to get chainId directly
          const chainIdHex = await window.ethereum.request({ method: 'eth_chainId' });
          const chainId = parseInt(chainIdHex, 16);
          network = { 
            chainId: chainId || 0, 
            name: this.getNetworkNameForChainId(chainId)
          };
        }
        
        // Map the network name
        let networkName = this.getNetworkNameForChainId(network.chainId);
        
        if (network.chainId > 0) {
          // Success in network detection
          this.walletInfo = {
            address: await this.signer!.getAddress(),
            chainId: network.chainId,
            networkName
          };
          
          return this.walletInfo;
        }
        
        // If chainId is 0, increase attempt count
        attempts++;
        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second before next attempt
      } catch (error) {
        console.error('Error getting network information (attempt ' + (attempts + 1) + '):', error);
        attempts++;
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    // If we got here, failed to detect the network after several attempts
    this.walletInfo = {
      address: await this.signer!.getAddress(),
      chainId: 0,
      networkName: 'Unknown'
    };
    
    console.warn('Could not detect the network correctly after multiple attempts.');
    return this.walletInfo;
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
    if (!window.ethereum) {
      throw new Error('MetaMask is not installed.');
    }

    const network = this.networks[networkType];
    
    try {
      // Try to switch to the network
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: `0x${network.chainId.toString(16)}` }],
      });
      
      // Update the provider after switching
      this.provider = new ethers.providers.Web3Provider(window.ethereum);
      this.signer = this.provider.getSigner();
      
      // Update wallet information
      if (this.walletInfo) {
        this.walletInfo.chainId = network.chainId;
        this.walletInfo.networkName = network.name;
      }
      
      return true;
    } catch (error: any) {
      // If the network is not added to MetaMask, we try to add it
      if (error.code === 4902) {
        try {
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
          return this.switchNetwork(networkType);
        } catch (addError) {
          console.error('Error adding network:', addError);
          throw new Error(`Failed to add network: ${(addError as Error).message}`);
        }
      }
      console.error('Error switching network:', error);
      throw new Error(`Failed to switch network: ${error.message}`);
    }
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
}

export const web3Service = new Web3Service();
export default web3Service;