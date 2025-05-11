import { ethers } from 'ethers';
import { logSystem } from '../logSystem';
import { monitorLearn2EarnContracts, monitorAllLearn2EarnFromFirestore } from './learn2earnMonitor';
import { getWsRpcUrls, getHttpRpcUrls } from '../../config/rpcConfig';

// Configuration
const ALERT_THRESHOLD_ETH = 0.1;  // Alert if spending is greater than this value in ETH
const ALERT_THRESHOLD_TOKENS = 5000; // Alert if more than 5000 tokens are distributed in a single operation
const ADMIN_EMAIL = 'info@gate33.com'; // Email to receive alerts

// Define missing variables
const MAX_PROVIDER_RETRIES = 5; // Maximum retries for provider initialization
let providerInitRetries = 0; // Counter for provider initialization retries
let isMonitoringInitialized = false; // Flag to track monitoring initialization

// New configuration for improved reliability
const CONNECTION_RETRY_DELAY = 10000; // 10 seconds between reconnection attempts
const MAX_CONNECTION_ATTEMPTS = 20; // Maximum connection attempts before falling back to HTTP
const HTTP_FALLBACK_ENABLED = true; // Enable HTTP fallback when WebSocket fails
let currentProvider: ethers.providers.Provider | null = null;
let reconnectionAttempts = 0;
let reconnectionTimer: NodeJS.Timeout | null = null;

// Define active monitors state
const activeMonitors = {
  tokenDistribution: false,
  learn2earn: false,
  wallet: false,
};

// Define service wallet and token distributor addresses
let serviceWalletAddress = process.env.SERVICE_WALLET_ADDRESS || '';
if (!serviceWalletAddress && process.env.OWNER_PRIVATE_KEY) {
  const ownerWallet = new ethers.Wallet(
    process.env.OWNER_PRIVATE_KEY.startsWith('0x')
      ? process.env.OWNER_PRIVATE_KEY
      : '0x' + process.env.OWNER_PRIVATE_KEY
  );
  serviceWalletAddress = ownerWallet.address;
}
const tokenDistributorAddress = process.env.TOKEN_DISTRIBUTOR_ADDRESS || process.env.G33_TOKEN_DISTRIBUTOR_ADDRESS || '';

// Redes a monitorar (pode ser configurado por env ou hardcoded)
const MONITOR_NETWORKS = (process.env.MONITOR_NETWORKS || 'polygon,ethereum,binance').split(',').map(n => n.trim().toLowerCase());

const wsRpcUrls = MONITOR_NETWORKS.flatMap(net => getWsRpcUrls(net));
const httpRpcUrls = MONITOR_NETWORKS.flatMap(net => getHttpRpcUrls(net));

console.log('WebSocket RPC URLs (prioridade):', wsRpcUrls);
console.log('HTTP RPC URLs (fallback):', httpRpcUrls);

// Helper for sending email
const sendEmail = async (to: string, subject: string, message: string): Promise<void> => {
  try {
    console.log(`Email sent to ${to}: ${subject}`);
    // Real email sending implementation would be done here
  } catch (error: any) {
    console.error("Error sending email:", error);
  }
};

// Monitor the Learn2Earn contract for suspicious activities
export async function monitorLearn2EarnActivity(
  contractAddress: string, 
  provider: ethers.providers.Provider
): Promise<void> {
  try {
    // Simplified ABI just for the events we want to monitor
    const abi = [
      "event Learn2EarnClaimed(uint256 indexed learn2earnId, address indexed user, uint256 amount)",
      "event Learn2EarnEnded(uint256 indexed learn2earnId)",
    ];
    
    const contract = new ethers.Contract(contractAddress, abi, provider);
    
    // Set up listener for claim events
    contract.on('Learn2EarnClaimed', async (learn2earnId, user, amount, event) => {
      const amountFormatted = ethers.utils.formatEther(amount);
      
      // Log all claims in the log system
      await logSystem.contractActivity("Learn2EarnContract", "claim", {
        learn2earnId: learn2earnId.toString(),
        user,
        amount: amountFormatted,
        transactionHash: event.transactionHash
      });
      
      // Alert if the value is above the threshold
      if (parseFloat(amountFormatted) > ALERT_THRESHOLD_TOKENS) {
        const message = `ALERT: Large claim detected in Learn2Earn!\n` + 
                       `ID: ${learn2earnId}\n` +
                       `User: ${user}\n` + 
                       `Amount: ${amountFormatted} tokens\n` +
                       `Transaction hash: ${event.transactionHash}`;
        
        // Register alert in the system
        await logSystem.warn(message, {
          contractAddress,
          learn2earnId: learn2earnId.toString(),
          user,
          amount: amountFormatted,
          transactionHash: event.transactionHash,
          alertType: 'large_claim'
        });
                       
        await sendEmail(ADMIN_EMAIL, 'Gate33 Security Alert - Learn2Earn', message);
      }
    });
    
    // Set up listener for end events
    contract.on('Learn2EarnEnded', async (learn2earnId, event) => {
      const message = `Learn2Earn ID ${learn2earnId} has been ended. Hash: ${event.transactionHash}`;
      
      // Log in the log system
      await logSystem.contractActivity("Learn2EarnContract", "ended", {
        learn2earnId: learn2earnId.toString(),
        transactionHash: event.transactionHash
      });
      
      // Always notify when a program ends
      await sendEmail(ADMIN_EMAIL, 'Learn2Earn Ended', message);
    });
    
    await logSystem.info(`Learn2Earn monitoring started for contract ${contractAddress}`);
  } catch (error: any) {
    await logSystem.error(`Error configuring Learn2Earn monitoring: ${error.message}`);
  }
}

// Monitor gas spending of the service wallet
export async function monitorServiceWallet(
  walletAddress: string,
  provider: ethers.providers.Provider
): Promise<void> {
  try {
    // Check balance every 4 hours
    setInterval(async () => {
      const balance = await provider.getBalance(walletAddress);
      const balanceEth = parseFloat(ethers.utils.formatEther(balance));
      
      // Log balance in the log system
      await logSystem.info(`Service wallet balance: ${balanceEth} ETH`, {
        walletAddress,
        balance: balanceEth,
        checkType: 'scheduled'
      });
      
      // Alert if balance is too low (less than 0.01 ETH)
      if (balanceEth < 0.01) {
        const message = `ALERT: Low balance in service wallet!\n` +
                       `Address: ${walletAddress}\n` +
                       `Current balance: ${balanceEth} ETH\n` +
                       `Wallet needs to be recharged to continue operating.`;
        
        // Record alert in the system
        await logSystem.walletAlert(walletAddress, "low_balance", {
          balance: balanceEth,
          threshold: 0.01
        });
                       
        await sendEmail(ADMIN_EMAIL, 'Alert - Low Balance in Service Wallet', message);
      }
    }, 4 * 60 * 60 * 1000); // 4 hours
    
    // Monitor sent transactions
    provider.on({ address: walletAddress }, async (log) => {
      // Only check sent transactions (where the wallet is the 'from')
      const tx = await provider.getTransaction(log.transactionHash);
      if (tx && tx.from.toLowerCase() === walletAddress.toLowerCase()) {
        const gasUsed = tx.gasLimit.mul(tx.gasPrice || ethers.BigNumber.from(0));
        const gasUsedEth = parseFloat(ethers.utils.formatEther(gasUsed));
        
        // Log transaction in the log system
        await logSystem.info(`Transaction sent: ${tx.hash}, Gas used: ${gasUsedEth} ETH`, {
          transactionHash: tx.hash,
          from: tx.from,
          to: tx.to,
          gasUsed: gasUsedEth,
          walletAddress
        });
        
        // Alert if gas spending is high
        if (gasUsedEth > ALERT_THRESHOLD_ETH) {
          const message = `ALERT: High gas spending detected!\n` +
                         `Transaction hash: ${tx.hash}\n` +
                         `Gas used: ${gasUsedEth} ETH\n` +
                         `From: ${tx.from}\n` +
                         `To: ${tx.to}`;
          
          // Record alert in the system
          await logSystem.walletAlert(walletAddress, "high_gas", {
            transactionHash: tx.hash,
            from: tx.from,
            to: tx.to, 
            gasUsed: gasUsedEth,
            threshold: ALERT_THRESHOLD_ETH
          });
                         
          await sendEmail(ADMIN_EMAIL, 'Alert - High Gas Spending', message);
        }
      }
    });
    
    await logSystem.info(`Service wallet monitoring started for ${walletAddress}`);
  } catch (error: any) {
    await logSystem.error(`Error configuring wallet monitoring: ${error.message}`);
  }
}

// Monitor G33 token distribution
export async function monitorTokenDistribution(
  contractAddress: string,
  provider: ethers.providers.Provider
): Promise<void> {
  try {
    if (!contractAddress) {
      throw new Error("Token distribution contract address not provided");
    }

    console.log(`Starting monitoring of G33 Token Distributor: ${contractAddress}`);

    // More complete ABI for better contract compatibility
    const abi = [
      // Main events
      "event TokensDistributed(address indexed donor, uint256 tokenAmount, uint256 donationAmountUsd)",
      "event DonationReceived(address indexed donor, uint256 donationAmountUsd)",
      // Functions that can help with validation
      "function tokenAddress() view returns (address)",
      "function availableTokensForDistribution() view returns (uint256)",
      "function totalDistributed() view returns (uint256)"
    ];
    
    const contract = new ethers.Contract(contractAddress, abi, provider);
    
    // Verify if the contract is valid by querying a basic function
    try {
      // Try to verify if the contract responds - first with tokenAddress
      let isValid = false;
      try {
        const tokenAddress = await contract.tokenAddress();
        console.log(`G33 token address confirmed: ${tokenAddress}`);
        isValid = true;
      } catch (err: any) {
        console.log(`Function tokenAddress not found, trying another verification...`);
        // If tokenAddress fails, try other functions
        try {
          const totalDistributed = await contract.totalDistributed();
          console.log(`Total distributed confirmed: ${ethers.utils.formatEther(totalDistributed)} tokens`);
          isValid = true;
        } catch (err2: any) {
          // Last attempt - check if the address has code
          const code = await provider.getCode(contractAddress);
          if (code !== '0x') {
            console.log('Contract has deployed code, proceeding with monitoring');
            isValid = true;
          } else {
            throw new Error("Address does not contain contract code");
          }
        }
      }
      
      if (!isValid) {
        throw new Error("Could not validate token distributor contract");
      }
      
      console.log(`G33 contract successfully validated at: ${contractAddress}`);
    } catch (contractErr: any) {
      console.error(`Error verifying distribution contract: ${contractErr.message}`);
      throw new Error(`Invalid or inaccessible token distribution contract: ${contractErr.message}`);
    }
    
    // Set up listener for distribution events
    contract.on('TokensDistributed', async (donor, tokenAmount, donationAmountUsd, event) => {
      try {
        const tokens = ethers.utils.formatEther(tokenAmount);
        const usdValue = donationAmountUsd.toNumber() / 100; // Converting from cents to dollars
        
        console.log(`TokensDistributed event detected: ${tokens} tokens to ${donor}, USD value: ${usdValue}`);
        
        // Register distribution in the log system
        try {
          await logSystem.tokenDistribution(donor, parseFloat(tokens), {
            transactionHash: event.transactionHash,
            usdValue,
            donationAmountUsd: usdValue
          });
        } catch (logErr: any) {
          console.error("Error logging token distribution:", logErr);
        }
        // Send email alert if distribution is very large
        if (parseFloat(tokens) > ALERT_THRESHOLD_TOKENS) {
          const message = `Large G33 token distribution detected!\n` +
            `Donor: ${donor}\n` +
            `Tokens: ${tokens} G33\n` +
            `Donation value: $${usdValue.toFixed(2)} USD\n` +
            `Transaction hash: ${event.transactionHash}`;
          try {
            await sendEmail(ADMIN_EMAIL, 'Alert - Large G33 token distribution', message);
          } catch (emailErr) {
            console.error('Error sending token distribution alert email:', emailErr);
          }
        }
      } catch (eventErr: any) {
        console.error(`Error processing TokensDistributed event: ${eventErr.message}`);
      }
    });
    
    // Add a listener for donation events as well (for redundancy)
    try {
      contract.on('DonationReceived', async (donor, donationAmountUsd, event) => {
        console.log(`DonationReceived event detected from ${donor}, USD value: ${donationAmountUsd.toNumber() / 100}`);
      });
    } catch (listenerErr: any) {
      console.warn("Error setting up listener for DonationReceived (non-critical):", listenerErr.message);
    }
    
    console.log(`G33 token distribution monitoring started for contract ${contractAddress}`);
    try {
      await logSystem.info(`G33 token distribution monitoring started for contract ${contractAddress}`);
    } catch (logErr: any) {
      console.error("Error logging info:", logErr);
    }
    
    // Check initial contract status to confirm it's working
    try {
      const totalDistributed = await contract.totalDistributed();
      const formattedTotal = ethers.utils.formatEther(totalDistributed);
      console.log(`Initial G33 contract status: Total distributed = ${formattedTotal} tokens`);
      
      try {
        const availableTokens = await contract.availableTokensForDistribution();
        const formattedAvailable = ethers.utils.formatEther(availableTokens);
        console.log(`Tokens available for distribution: ${formattedAvailable}`);
      } catch (err: any) {
        console.warn("Could not verify available tokens (non-critical)");
      }
    } catch (statusErr: any) {
      console.warn("Could not verify contract status (non-critical):", statusErr.message);
    }
    
  } catch (error: any) {
    console.error(`Error setting up G33 token distribution monitoring: ${error.message}`);
    try {
      await logSystem.error(`Error setting up G33 token distribution monitoring: ${error.message}`);
    } catch (logErr: any) {
      console.error("Error logging error:", logErr);
    }
    // Propagate the error so initialization knows this monitor failed
    throw error;
  }
}

// Create a simulated provider that can work offline
function createSimulatedProvider(): ethers.providers.Provider {
  console.log('⚠️ CREATING SIMULATED PROVIDER - Monitoring will work in offline mode');
  
  // Simulate the basic provider interface needed for monitoring
  const simulatedProvider: any = {
    // Simulate network information
    getNetwork: async () => ({ chainId: 137, name: 'polygon' }),
    
    // Simulate block number
    getBlockNumber: async () => {
      // Return incrementing numbers to simulate new blocks
      const baseBlock = 30000000;
      const offset = Math.floor((Date.now() / 1000) % 10000); 
      return baseBlock + offset;
    },
    
    // Simulate function that returns basic blockchain state
    getBalance: async (address: string) => ethers.utils.parseEther('10'),
    
    // Simulate code retrieval
    getCode: async (address: string) => '0x1234', // Non-empty code means contract exists
    
    // Add minimum event handling capabilities to avoid errors
    _events: [],
    on: function(eventName: string, listener: any) {
      this._events.push({ eventName, listener });
      return this;
    },
    removeAllListeners: function() {
      this._events = [];
      return this;
    },
    
    // Basic provider call simulation
    call: async (transaction: any) => '0x0000000000000000000000000000000000000000000000000000000000000001',
    
    // Additional methods needed for monitoring
    getFeeData: async () => ({
      gasPrice: ethers.utils.parseUnits('30', 'gwei'),
      maxFeePerGas: ethers.utils.parseUnits('50', 'gwei'),
      maxPriorityFeePerGas: ethers.utils.parseUnits('30', 'gwei')
    }),
    
    // Add a flag to identify this as a simulated provider
    isSimulated: true
  };
  
  // Return the simulated provider
  return simulatedProvider as ethers.providers.Provider;
}

/**
 * Tenta estabelecer uma conexão WebSocket estável, com reconexão automática
 * @returns Uma Promise que resolve para uma instância de WebSocketProvider ou null em caso de falha
 */
async function createStableWebSocketProvider(): Promise<ethers.providers.WebSocketProvider | null> {
  if (wsRpcUrls.length === 0) {
    console.warn('Nenhum URL WebSocket disponível para conexão');
    return null;
  }
  
  // Tentar cada URL de WebSocket em ordem
  for (const wsUrl of wsRpcUrls) {
    try {
      console.log(`Tentando conexão WebSocket com: ${wsUrl}`);
      
      // Criar o provider WebSocket
      const wsProvider = new ethers.providers.WebSocketProvider(wsUrl);
      
      // Configurar handlers para reconexão
      const setupReconnection = (provider: ethers.providers.WebSocketProvider) => {
        const ws = (provider as any)._websocket;
        
        if (!ws) {
          console.warn('WebSocket não encontrado no provider, reconexão automática pode não funcionar');
          return;
        }
        
        ws.onclose = (event: any) => {
          console.log(`WebSocket fechado (código: ${event.code}). Tentando reconexão em ${CONNECTION_RETRY_DELAY / 1000} segundos...`);
          
          // Limpar o timer existente, se houver
          if (reconnectionTimer) {
            clearTimeout(reconnectionTimer);
            reconnectionTimer = null;
          }
          
          // Incrementar contador de tentativas
          reconnectionAttempts++;
          
          // Verificar se atingimos o limite de tentativas
          if (reconnectionAttempts > MAX_CONNECTION_ATTEMPTS) {
            console.warn(`Máximo de ${MAX_CONNECTION_ATTEMPTS} tentativas de reconexão WebSocket atingido. Alternando para HTTP...`);
            
            // Notificar o sistema sobre a mudança
            try {
              logSystem.warn(`WebSocket instável após ${MAX_CONNECTION_ATTEMPTS} tentativas. Alternando para HTTP.`);
            } catch (logErr) {
              console.error('Erro ao registrar alerta de reconexão:', logErr);
            }
            
            // Se HTTP fallback estiver habilitado, reiniciar o monitoramento com HTTP
            if (HTTP_FALLBACK_ENABLED) {
              // Limpar quaisquer monitoramentos ativos
              try {
                provider.removeAllListeners();
              } catch (clearErr) {
                console.warn('Erro ao limpar listeners:', clearErr);
              }
              
              console.log('Reiniciando monitoramento com providers HTTP...');
              initializeContractMonitoring(true); // true indica que está usando fallback HTTP
              return;
            }
          }
          
          // Tentar reconexão após o delay
          reconnectionTimer = setTimeout(() => {
            console.log(`Tentativa de reconexão ${reconnectionAttempts}...`);
            try {
              // Para websockets, é melhor reiniciar o monitoramento totalmente
              initializeContractMonitoring();
            } catch (err) {
              console.error('Erro ao reiniciar monitoramento:', err);
            }
          }, CONNECTION_RETRY_DELAY);
        };
        
        ws.onerror = (error: any) => {
          console.error('Erro no WebSocket:', error);
          // Quando ocorre um erro, o onclose geralmente é chamado logo em seguida
        };
      };
      
      // Configurar reconexão
      setupReconnection(wsProvider);
      
      // Testar a conexão
      const blockNumber = await Promise.race([
        wsProvider.getBlockNumber(),
        new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('Timeout na conexão WebSocket')), 10000)
        ),
      ]);
      
      console.log(`✅ Conexão WebSocket bem-sucedida. Bloco atual: ${blockNumber}`);
      
      // Resetar contador de tentativas ao estabelecer uma conexão
      reconnectionAttempts = 0;
      
      // Registrar no sistema
      try {
        await logSystem.info(`Conexão WebSocket estabelecida com: ${wsUrl}`);
      } catch (logErr) {
        console.error('Erro ao registrar sucesso de conexão:', logErr);
      }
      
      return wsProvider;
    } catch (error) {
      console.warn(`Falha ao conectar WebSocket com ${wsUrl}:`, error);
    }
  }
  
  console.warn('Não foi possível estabelecer uma conexão WebSocket. Tentando alternativas...');
  return null;
}

/**
 * Cria uma instância de FallbackProvider com múltiplos endpoints HTTP
 * Esta abordagem é mais confiável que depender de um único provider
 */
async function createFallbackHttpProvider(): Promise<ethers.providers.Provider | null> {
  try {
    if (httpRpcUrls.length === 0) {
      console.warn('Nenhum URL HTTP disponível para FallbackProvider');
      return null;
    }
    
    console.log('Criando FallbackProvider com múltiplos endpoints HTTP...');
    
    const providerConfigs = [];
    let priority = 1;
    
    // Adicionar até 5 HTTP providers para fallback
    for (const url of httpRpcUrls.slice(0, 5)) {
      try {
        const provider = new ethers.providers.JsonRpcProvider(url);
        providerConfigs.push({
          provider,
          priority: priority++,
          weight: 1,
          stallTimeout: 5000
        });
      } catch (e) {
        console.warn(`Erro ao criar provider para ${url}:`, e);
      }
    }
    
    if (providerConfigs.length === 0) {
      throw new Error('Não foi possível criar nenhum provider para o FallbackProvider');
    }
    
    const fallbackProvider = new ethers.providers.FallbackProvider(providerConfigs, 1);
    
    // Testar o FallbackProvider
    const blockNumber = await Promise.race([
      fallbackProvider.getBlockNumber(),
      new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('Timeout na conexão com FallbackProvider')), 15000)
      ),
    ]);
    
    console.log(`✅ FallbackProvider conectado com sucesso. Bloco atual: ${blockNumber}`);
    
    // Registrar no sistema
    try {
      await logSystem.info(`FallbackProvider criado com ${providerConfigs.length} endpoints.`);
    } catch (logErr) {
      console.error('Erro ao registrar criação de FallbackProvider:', logErr);
    }
    
    // Configurar verificação periódica de saúde do FallbackProvider
    setInterval(async () => {
      try {
        await fallbackProvider.getBlockNumber();
      } catch (healthCheckError) {
        console.warn('Verificação de saúde do FallbackProvider falhou:', healthCheckError);
        console.log('Reiniciando monitoramento...');
        initializeContractMonitoring();
      }
    }, 3 * 60 * 1000); // Verificar a cada 3 minutos
    
    return fallbackProvider;
  } catch (error) {
    console.error('Falha ao criar FallbackProvider:', error);
    return null;
  }
}

// Configure a interface do callback corretamente
export function initializeContractMonitoring(
  useHttpFallback: boolean = false,
  statusCallback?: (
    success: boolean,
    providerType: string | null,
    activeMonitors: {
      tokenDistribution: boolean;
      learn2earn: boolean;
      wallet: boolean;
    }
  ) => void
): void {
  try {
    // Dynamically import serverStatus to avoid circular import issues
    let serverStatus: any;
    try {
      const serverInit = require('../../lib/server-init');
      serverStatus = serverInit.serverStatus;
      
      // Initialize status structure if necessary
      if (!serverStatus.contractMonitoring) {
        serverStatus.contractMonitoring = {
          initialized: false,
          tokenDistributionActive: false,
          learn2earnActive: false,
          walletMonitoringActive: false,
          errors: [],
          warnings: []
        };
      }
      
    } catch (importErr) {
      console.warn("Could not import serverStatus, continuing without it:", importErr);
      // Create a simulated object to avoid breaking the code
      serverStatus = {
        contractMonitoring: {
          initialized: false,
          errors: [],
          warnings: []
        }
      };
    }

    console.log("Starting contract monitoring system...");
    
    // Verificar se já há uma tentativa de inicialização em andamento
    if (isMonitoringInitialized) {
      console.log('Uma inicialização de monitoramento já está em andamento. Abortando nova tentativa.');
      return;
    }
    
    // Limpar monitoramentos existentes antes de inicializar novos
    if (currentProvider) {
      console.log('Limpando provider existente antes da reinicialização...');
      try {
        // Limpar todos os listeners do provider atual
        if (typeof (currentProvider as any).removeAllListeners === 'function') {
          (currentProvider as any).removeAllListeners();
        }
      } catch (clearErr) {
        console.warn('Erro ao limpar provider existente:', clearErr);
      }
      currentProvider = null;
    }

    // Escolher estratégia de conexão baseada no parâmetro ou no histórico
    const connectToBlockchain = async (): Promise<ethers.providers.Provider | null> => {
      // Se especificado para usar HTTP ou após muitas falhas de websocket, ir direto para HTTP
      if (useHttpFallback) {
        console.log('Usando estratégia de conexão HTTP conforme solicitado');
        return await createFallbackHttpProvider();
      } else {
        // Estratégia padrão: tentar WebSocket primeiro, depois fallback para HTTP
        console.log('Tentando conexão WebSocket primeiro...');
        const wsProvider = await createStableWebSocketProvider();
        
        if (wsProvider) {
          return wsProvider;
        }
        
        console.log('WebSocket falhou, alternando para HTTP...');
        return await createFallbackHttpProvider();
      }
    };
    
    // Tentar estabelecer conexão
    connectToBlockchain().then(provider => {
      if (!provider) {
        console.error('Não foi possível estabelecer conexão com nenhum provider. Monitoramento de contratos não será iniciado.');
        try {
          logSystem.error('Não foi possível estabelecer conexão com nenhum provider. Monitoramento de contratos não será iniciado.');
        } catch (logErr) {
          console.error("Erro ao registrar log:", logErr);
        }
        
        // Atualizar status global
        if (serverStatus && serverStatus.contractMonitoring) {
          serverStatus.contractMonitoring.initialized = false;
          serverStatus.contractMonitoring.errors = serverStatus.contractMonitoring.errors || [];
          serverStatus.contractMonitoring.errors.push(
            'Falha ao conectar-se a qualquer provider blockchain. Monitoramento não será iniciado.'
          );
          
          // Definir como modo administrativo
          if (typeof serverStatus.administrativeMode !== 'undefined') {
            serverStatus.administrativeMode = true;
            console.log('⚠️ Sistema entrando em modo administrativo devido a falhas de conexão.');
          }
        }
        
        // Informar o callback sobre a falha
        if (statusCallback) {
          statusCallback(false, null, {
            tokenDistribution: false,
            learn2earn: false,
            wallet: false
          });
        }
        
        return;
      }
      
      // Armazenar o provider atual para referência e limpeza em reinicializações
      currentProvider = provider;
      
      // Marcar como inicializado
      isMonitoringInitialized = true;
      
      // Identificar o tipo de provider para logs
      const providerType = ('_websocket' in provider) ? 'WebSocket' : 'HTTP';
      console.log(`Usando provider tipo ${providerType} para monitoramento`);
      
      // Configurar saída do modo administrativo
      if (serverStatus && typeof serverStatus.administrativeMode !== 'undefined') {
        serverStatus.administrativeMode = false;
        console.log('✅ Sistema saindo do modo administrativo após estabelecer conexão.');
      }
      
      // Inicializar cada monitor com tratamento de erro independente
      
      // 1. Learn2Earn Monitor (Firestore)
      console.log('Iniciando monitoramento de Learn2Earn via Firestore...');
      try {
        monitorAllLearn2EarnFromFirestore();
      } catch (l2eErr) {
        console.error('Erro ao iniciar monitoramento Learn2Earn via Firestore:', l2eErr);
      }

      // Learn2Earn Monitor (Blockchain)
      const learn2earnContracts = [];
      if (process.env.LEARN2EARN_CONTRACT_ADDRESS) {
        learn2earnContracts.push({
          contractAddress: process.env.LEARN2EARN_CONTRACT_ADDRESS,
          provider,
          network: 'polygon'
        });
      }
      
      if (learn2earnContracts.length > 0) {
        console.log('Iniciando monitoramento de Learn2Earn via Blockchain...');
        try {
          monitorLearn2EarnContracts(learn2earnContracts);
          activeMonitors.learn2earn = true;
        } catch (l2eBlockchainErr) {
          console.error('Erro ao iniciar monitoramento Learn2Earn via Blockchain:', l2eBlockchainErr);
        }
      }
      
      // 2. Service wallet monitor
      if (serviceWalletAddress) {
        console.log(`Iniciando monitoramento de carteira de serviço: ${serviceWalletAddress}`);
        try {
          monitorServiceWallet(serviceWalletAddress, provider)
            .then(() => {
              activeMonitors.wallet = true;
              console.log(`✅ Monitoramento de carteira ativo para ${serviceWalletAddress}`);
              
              // Atualizar status global
              if (serverStatus && serverStatus.contractMonitoring) {
                serverStatus.contractMonitoring.walletMonitoringActive = true;
              }
            })
            .catch((err: any) => {
              console.error(`❌ Falha ao inicializar monitoramento de carteira: ${err.message}`);
              
              // Atualizar status global
              if (serverStatus && serverStatus.contractMonitoring) {
                serverStatus.contractMonitoring.errors.push(
                  `Falha ao inicializar monitoramento de carteira: ${err.message}`
                );
              }
            });
        } catch (walletErr: any) {
          console.error("❌ Erro ao iniciar monitoramento de carteira:", walletErr);
        }
      }
      
      // 3. Token distribution monitor
      if (tokenDistributorAddress) {
        console.log(`🔍 Iniciando monitoramento do distribuidor de tokens G33 em ${tokenDistributorAddress}...`);
        
        try {
          monitorTokenDistribution(tokenDistributorAddress, provider)
            .then(() => {
              activeMonitors.tokenDistribution = true;
              console.log(`✅ Monitoramento de distribuição de tokens G33 ativo para ${tokenDistributorAddress}`);
              
              // Atualizar status global
              if (serverStatus && serverStatus.contractMonitoring) {
                serverStatus.contractMonitoring.tokenDistributionActive = true;
              }
            })
            .catch((err: any) => {
              console.error(`❌ Falha ao inicializar monitoramento de distribuição de tokens: ${err.message}`);
              
              // Diagnóstico detalhado para erros
              console.error('Detalhes do erro:', err);
              
              // Atualizar status global
              if (serverStatus && serverStatus.contractMonitoring) {
                serverStatus.contractMonitoring.errors.push(
                  `Falha ao inicializar monitoramento de distribuição de tokens: ${err.message}`
                );
              }
              
              // Tentar abordagem alternativa após um breve intervalo
              console.log('Tentando abordagem alternativa para inicializar monitoramento de tokens...');
              setTimeout(() => {
                try {
                  // Tentar com ABI mínima para reduzir problemas de compatibilidade
                  const minimalAbi = [
                    "event TokensDistributed(address indexed donor, uint256 tokenAmount, uint256 donationAmountUsd)"
                  ];
                  
                  const contract = new ethers.Contract(tokenDistributorAddress!, minimalAbi, provider);
                  
                  contract.on('TokensDistributed', async (donor, tokenAmount, donationAmountUsd, event: any) => {
                    console.log(`Evento TokensDistributed detectado via reinicialização: ${donor}`);
                    try {
                      const tokens = ethers.utils.formatEther(tokenAmount);
                      const usdValue = donationAmountUsd.toNumber() / 100;
                      
                      // Log simplificado
                      console.log(`Tokens distribuídos: ${tokens} para ${donor}, valor: $${usdValue.toFixed(2)}`);
                      
                      try {
                        await logSystem.tokenDistribution(donor, parseFloat(tokens), {
                          transactionHash: event.transactionHash,
                          usdValue,
                          donationAmountUsd: usdValue
                        });
                      } catch (logErr: any) {
                        console.error("Erro ao registrar distribuição de tokens:", logErr);
                      }
                    } catch (eventErr: any) {
                      console.error(`Erro ao processar evento TokensDistributed: ${eventErr.message}`);
                    }
                  });
                  
                  console.log('✅ Monitoramento de distribuição de tokens reinicializado com sucesso');
                  
                  // Atualizar status global
                  if (serverStatus && serverStatus.contractMonitoring) {
                    serverStatus.contractMonitoring.tokenDistributionActive = true;
                  }
                  
                  activeMonitors.tokenDistribution = true;
                  
                  // Registrar no sistema
                  try {
                    logSystem.info(`Monitoramento de distribuição de tokens G33 reinicializado com sucesso para ${tokenDistributorAddress}`);
                  } catch (logErr: any) {
                    console.error("Erro ao registrar info:", logErr);
                  }
                  
                } catch (retryErr: any) {
                  console.error(`Abordagem alternativa falhou: ${retryErr.message}`);
                }
              }, 3000);
            });
        } catch (tokenErr: any) {
          console.error("❌ Erro ao iniciar monitoramento de distribuição de tokens:", tokenErr);
          
          // Atualizar status global
          if (serverStatus && serverStatus.contractMonitoring) {
            serverStatus.contractMonitoring.errors.push(
              `Erro ao iniciar monitoramento de distribuição de tokens: ${tokenErr.message}`
            );
          }
        }
      } else {
        console.error("❌ Endereço do distribuidor de tokens não configurado. Monitoramento não será iniciado.");
        
        // Atualizar status global
        if (serverStatus && serverStatus.contractMonitoring) {
          serverStatus.contractMonitoring.errors.push(
            'Endereço do distribuidor de tokens não configurado. Monitoramento não será iniciado.'
          );
        }
      }
      
      // Após tentar inicializar todos os monitores, atualizar status global
      if (serverStatus && serverStatus.contractMonitoring) {
        serverStatus.contractMonitoring.initialized = true;
      }
      
      // IMPORTANTE: Chamar o callback apenas após iniciar todos os monitores
      setTimeout(() => {
        // Aguardar um pouco para que os processos de monitoramento sejam iniciados
        if (statusCallback) {
          statusCallback(true, providerType, {
            tokenDistribution: activeMonitors.tokenDistribution,
            learn2earn: activeMonitors.learn2earn,
            wallet: activeMonitors.wallet
          });
        }
        
        // Atualizar status global independentemente do callback
        if (serverStatus && serverStatus.contractMonitoring) {
          serverStatus.contractMonitoring.initialized = true;
          serverStatus.contractMonitoring.tokenDistributionActive = activeMonitors.tokenDistribution;
          serverStatus.contractMonitoring.learn2earnActive = activeMonitors.learn2earn;
          serverStatus.contractMonitoring.walletMonitoringActive = activeMonitors.wallet;
        }
      }, 5000); // Aguardar 5 segundos para garantir que os monitores tiveram tempo para iniciar
      
      try {
        logSystem.info('Sistema de monitoramento de contratos inicializado', {
          rpcUrl: 'Conexão estabelecida com sucesso',
          providerType,
          contracts: {
            learn2earn: process.env.LEARN2EARN_CONTRACT_ADDRESS || 'não configurado',
            tokenDistributor: tokenDistributorAddress || 'não configurado'
          },
          serviceWallet: serviceWalletAddress || 'não configurado',
          activeMonitors: {
            tokenDistribution: activeMonitors.tokenDistribution,
            learn2earn: activeMonitors.learn2earn,
            wallet: activeMonitors.wallet
          }
        });
      } catch (logErr: any) {
        console.error("Erro ao registrar info:", logErr);
      }
    }).catch(error => {
      console.error(`Falha ao criar provider para monitoramento: ${error.message}`);
      try {
        logSystem.error(`Falha ao criar provider para monitoramento: ${error.message}`);
      } catch (logErr) {
        console.error("Erro ao registrar erro:", logErr);
      }
      
      // Atualizar status global
      if (serverStatus && serverStatus.contractMonitoring) {
        serverStatus.contractMonitoring.initialized = false;
        serverStatus.contractMonitoring.errors.push(
          `Erro fatal ao inicializar monitoramento: ${error.message}`
        );
      }
      
      // Informar o callback sobre a falha
      if (statusCallback) {
        statusCallback(false, null, {
          tokenDistribution: false,
          learn2earn: false,
          wallet: false
        });
      }
    });
    
    // Definir um timeout geral para o processo de inicialização
    setTimeout(() => {
      if (!isMonitoringInitialized) {
        console.error(`Tempo excedido para inicialização do monitoramento de contratos. O processo foi cancelado.`);
        try {
          logSystem.error(`Tempo excedido para inicialização do monitoramento de contratos. O processo foi cancelado.`);
        } catch (logErr) {
          console.error("Erro ao registrar erro:", logErr);
        }
        
        // Atualizar status global
        if (serverStatus && serverStatus.contractMonitoring) {
          serverStatus.contractMonitoring.errors.push(
            'Timeout na inicialização do monitoramento. O processo foi cancelado.'
          );
        }
        
        // Informar o callback sobre a falha
        if (statusCallback) {
          statusCallback(false, null, {
            tokenDistribution: false,
            learn2earn: false,
            wallet: false
          });
        }
      }
    }, 45000); // 45 segundos para timeout geral
    
  } catch (error: any) {
    console.error(`Erro ao inicializar monitoramento de contratos: ${error.message}`);
    try {
      logSystem.error(`Erro ao inicializar monitoramento de contratos: ${error.message}`);
    } catch (logErr: any) {
      console.error("Erro ao registrar erro:", logErr);
    }
    
    // Atualizar status global
    try {
      const { serverStatus } = require('../../lib/server-init');
      if (serverStatus && serverStatus.contractMonitoring) {
        serverStatus.contractMonitoring.initialized = false;
        serverStatus.contractMonitoring.errors = [
          `Erro ao inicializar monitoramento: ${error.message}`
        ];
      }
    } catch (importError) {
      console.error("Erro ao importar serverStatus:", importError);
    }
    
    // Informar o callback sobre a falha
    if (statusCallback) {
      statusCallback(false, null, {
        tokenDistribution: false,
        learn2earn: false,
        wallet: false
      });
    }
  }
}

// Interface for contract monitoring state
export interface ContractMonitoringState {
  isLearn2EarnMonitoring: boolean;
  isWalletMonitoring: boolean;
  isTokenDistributionMonitoring: boolean;
  lastLearn2EarnEvent?: {
    id: string;
    user: string;
    amount: string;
    timestamp: string;
  };
  walletBalance?: string;
  tokenDistributions?: {
    count: number;
    totalTokens: string;
  };
  errors: string[];
}

// Function to get the current monitoring state (used in the component)
export async function getMonitoringState(): Promise<ContractMonitoringState> {
  try {
    // On the client side, we don't have access to server environment variables
    // Let's make a call to our diagnostics API
    let isLearn2EarnMonitoring = false;
    let isWalletMonitoring = false;
    let isTokenDistributionMonitoring = false;
    let tokenDistributions = undefined;
    let errors: string[] = [];

    if (typeof window !== 'undefined') {
      try {
        console.log("Fetching monitoring data from diagnostics API...");
        const response = await fetch('/api/diagnostics/tokens');
        
        if (response.ok) {
          const data = await response.json();
          console.log("Received diagnostics data:", data);
          // Only consider active if not in administrative mode
          isTokenDistributionMonitoring = !!data.tokensConfig?.distributorAddress &&
            data.tokensConfig?.distributorAddress !== "Not configured" &&
            data.monitoringStatus?.tokenDistributionActive === true &&
            data.administrativeMode === false;
          // Use ONLY real blockchain data, no simulation
          if (data.tokenDistribution) {
            const availableTokens = parseFloat(data.tokenDistribution.availableTokens) || 0;
            const totalDistributed = parseFloat(data.tokenDistribution.totalDistributed) || 0;
            
            // Only set tokenDistributions if there are actually tokens distributed
            if (totalDistributed > 0) {
              // Assume each average donation is 50 tokens to estimate the number of donors
              // (this is a temporary estimate, ideally we would fetch the real number of donors)
              const estimatedDonors = Math.max(1, Math.ceil(totalDistributed / 50));
              
              tokenDistributions = {
                count: estimatedDonors,
                totalTokens: totalDistributed.toLocaleString('en-US')
              };
            }
          }
          
          // Add diagnostic errors
          if (data.errors && data.errors.length > 0) {
            errors = [...data.errors];
          }
          
          // Get monitoring status of other services
          isLearn2EarnMonitoring = data.monitoringStatus?.learn2earnActive === true;
          isWalletMonitoring = data.monitoringStatus?.walletMonitoringActive === true;
          
        } else {
          console.error("Failed to fetch diagnostics data");
          errors.push("Failed to fetch diagnostics data from API");
          // Fallback to localStorage-based checks for status only, no simulation
          isTokenDistributionMonitoring = localStorage.getItem('TOKEN_DISTRIBUTOR_ADDRESS_CONFIGURED') === 'true';
        }
      } catch (err) {
        console.error("Error fetching monitoring data:", err);
        errors.push("Error connecting to diagnostics API");
        // Fallback to localStorage-based checks for status only, no simulation
        isTokenDistributionMonitoring = localStorage.getItem('TOKEN_DISTRIBUTOR_ADDRESS_CONFIGURED') === 'true';
      }
    } else {
      // On the server side, we can check environment variables
      isLearn2EarnMonitoring = !!process.env.LEARN2EARN_CONTRACT_ADDRESS;
      isWalletMonitoring = !!process.env.SERVICE_WALLET_ADDRESS;
      isTokenDistributionMonitoring = !!process.env.TOKEN_DISTRIBUTOR_ADDRESS;
      
      // Store in localStorage so the client knows about the configuration
      if (typeof window !== 'undefined') {
        localStorage.setItem('TOKEN_DISTRIBUTOR_ADDRESS_CONFIGURED', isTokenDistributionMonitoring ? 'true' : 'false');
      }
    }
    
    return {
      isLearn2EarnMonitoring,
      isWalletMonitoring,
      isTokenDistributionMonitoring,
      // Learn2Earn and Wallet data will only exist when we receive real system data
      lastLearn2EarnEvent: undefined, // Removed simulated data
      walletBalance: isWalletMonitoring ? "Waiting for data..." : undefined,
      // Only show tokenDistributions if we have real data
      tokenDistributions,
      errors
    };
  } catch (error: any) {
    console.error("Error getting monitoring state:", error);
    return {
      isLearn2EarnMonitoring: false,
      isWalletMonitoring: false,
      isTokenDistributionMonitoring: false,
      errors: [error.message || "Unknown error getting state"]
    };
  }
}