import { ethers } from 'ethers';
import { logSystem } from '../logSystem';
import { getWsRpcUrls, getHttpRpcUrls } from '../../config/rpcConfig';
import { db } from '../../lib/firebase';
import { collection, getDocs, query, where, doc, getDoc } from 'firebase/firestore';

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

// Define Learn2Earn contract addresses por rede
const learn2EarnContracts = {
  'bsc-testnet': process.env.LEARN2EARN_BSC_TESTNET_ADDRESS || '',
  'avalanche': process.env.LEARN2EARN_AVALANCHE_ADDRESS || '',
  'bsc': process.env.LEARN2EARN_BSC_ADDRESS || '',
  'optimism': process.env.LEARN2EARN_OPTIMISM_ADDRESS || '',
  'polygon': process.env.LEARN2EARN_POLYGON_ADDRESS || '',
  'ethereum': process.env.LEARN2EARN_ETHEREUM_ADDRESS || ''
};

// Define InstantJobsEscrow contract addresses for each network
const instantJobsEscrowContracts = {
  'bsc-testnet': process.env.INSTANT_JOBS_ESCROW_BSC_TESTNET_ADDRESS || '',
  'optimism': process.env.INSTANT_JOBS_ESCROW_OPTIMISM_ADDRESS || '',
  'polygon': process.env.INSTANT_JOBS_ESCROW_POLYGON_ADDRESS || '',
  'bsc': process.env.INSTANT_JOBS_ESCROW_BSC_ADDRESS || '',
  'avalanche': process.env.INSTANT_JOBS_ESCROW_AVALANCHE_ADDRESS || '',
  'ethereum': process.env.INSTANT_JOBS_ESCROW_ETHEREUM_ADDRESS || ''
};

// Redes a monitorar (pode ser configurado por env ou hardcoded)
const MONITOR_NETWORKS = (process.env.MONITOR_NETWORKS || 'polygon,ethereum,binance').split(',').map(n => n.trim().toLowerCase());

const wsRpcUrls = MONITOR_NETWORKS.flatMap(net => getWsRpcUrls(net));
const httpRpcUrls = MONITOR_NETWORKS.flatMap(net => getHttpRpcUrls(net));

// Helper for sending email
const sendEmail = async (to: string, subject: string, message: string): Promise<void> => {
  try {
    // Email implementation would be here
  } catch (error: any) {
    console.error("Error sending email:", error);
  }
};

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
  try {    if (!contractAddress) {
      throw new Error("Token distribution contract address not provided");
    }

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
        isValid = true;
      } catch (err: any) {
        // If tokenAddress fails, try other functions
        try {
          const totalDistributed = await contract.totalDistributed();
          isValid = true;
        } catch (err2: any) {
          // Last attempt - check if the address has code
          const code = await provider.getCode(contractAddress);
          if (code !== '0x') {
            isValid = true;
          } else {
            throw new Error("Address does not contain contract code");
          }
        }
      }
      
      if (!isValid) {
        throw new Error("Could not validate token distributor contract");
      }
    } catch (contractErr: any) {
      console.error(`Error verifying distribution contract: ${contractErr.message}`);
      throw new Error(`Invalid or inaccessible token distribution contract: ${contractErr.message}`);
    }
      // Set up listener for distribution events
    contract.on('TokensDistributed', async (donor, tokenAmount, donationAmountUsd, event) => {
      try {
        const tokens = ethers.utils.formatEther(tokenAmount);
        const usdValue = donationAmountUsd.toNumber() / 100; // Converting from cents to dollars
        
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
        // Silent monitoring - only log to system
      });
    } catch (listenerErr: any) {      console.warn("Error setting up listener for DonationReceived (non-critical):", listenerErr.message);
    }
    
    try {
      await logSystem.info(`G33 token distribution monitoring started for contract ${contractAddress}`);
    } catch (logErr: any) {
      console.error("Error logging info:", logErr);
    }
      // Check initial contract status to confirm it's working
    try {
      const totalDistributed = await contract.totalDistributed();
      const formattedTotal = ethers.utils.formatEther(totalDistributed);
      
      try {
        const availableTokens = await contract.availableTokensForDistribution();
        // Silent status check
      } catch (err: any) {
        // Silent warning
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

/**
 * Tenta estabelecer uma conexão WebSocket estável, com reconexão automática
 * @returns Uma Promise que resolve para uma instância de WebSocketProvider ou null em caso de falha
 */
async function createStableWebSocketProvider(): Promise<ethers.providers.WebSocketProvider | null> {
  if (wsRpcUrls.length === 0) {
    logSystem.error('Nenhum URL WebSocket disponível para conexão');
    return null;
  }

  // Tentar cada URL de WebSocket em ordem
  for (const wsUrl of wsRpcUrls) {
    try {
      // Criar o provider WebSocket
      const wsProvider = new ethers.providers.WebSocketProvider(wsUrl);
      
      // Configurar handlers para reconexão
      const setupReconnection = (provider: ethers.providers.WebSocketProvider) => {
        const ws = (provider as any)._websocket;
        
        if (!ws) {
          logSystem.error('WebSocket não encontrado no provider, reconexão automática pode não funcionar');
          return;
        }
        
        ws.onclose = (event: any) => {
          // Limpar o timer existente, se houver
          if (reconnectionTimer) {
            clearTimeout(reconnectionTimer);
            reconnectionTimer = null;
          }
          
          // Incrementar contador de tentativas
          reconnectionAttempts++;
          
          // Verificar se atingimos o limite de tentativas
          if (reconnectionAttempts > MAX_CONNECTION_ATTEMPTS) {
            // Log apenas quando exceder tentativas máximas
            logSystem.error(`Falha no WebSocket após ${MAX_CONNECTION_ATTEMPTS} tentativas. Alternando para HTTP.`, {
              reconnectionAttempts,
              lastErrorCode: event.code
            });
            
            // Se HTTP fallback estiver habilitado, reiniciar o monitoramento com HTTP
            if (HTTP_FALLBACK_ENABLED) {
              // Limpar quaisquer monitoramentos ativos
              try {
                provider.removeAllListeners();
              } catch (clearErr) {
                logSystem.error('Erro ao limpar listeners WebSocket', { error: clearErr });
              }
              
              initializeContractMonitoring(true); // true indica que está usando fallback HTTP
              return;
            }
          }
          
          // Tentar reconexão após o delay
          reconnectionTimer = setTimeout(() => {
            try {
              initializeContractMonitoring();
            } catch (err) {
              logSystem.error('Erro ao reiniciar monitoramento WebSocket', { error: err });
            }
          }, CONNECTION_RETRY_DELAY);
        };
        
        ws.onerror = (error: any) => {
          // Log apenas erros críticos do WebSocket
          logSystem.error('Erro crítico no WebSocket', { error });
        };
      };
      
      // Configurar reconexão
      setupReconnection(wsProvider);
      
      // Testar a conexão
      const blockNumber = await Promise.race([
        wsProvider.getBlockNumber(),
        new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('Timeout na conexão WebSocket')), 10000)
        ),      ]);
      
      // Resetar contador de tentativas ao estabelecer uma conexão
      reconnectionAttempts = 0;
      
      // Registrar no sistema
      // Reduzir logs: só registrar conexões WebSocket se for nível debug
      if (process.env.MONITOR_LOG_LEVEL === 'debug') {
        try {
          await logSystem.info(`Conexão WebSocket estabelecida com: ${wsUrl}`);
        } catch (logErr) {
          console.error('Erro ao registrar sucesso de conexão:', logErr);
        }
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
      return null;    }
    
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
      ),    ]);
    
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
      wallet: boolean;
      learn2Earn?: Record<string, boolean>;
      instantJobsEscrow?: Record<string, boolean>;
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
    }    // Verificar se já há uma tentativa de inicialização em andamento
    if (isMonitoringInitialized) {
      return;
    }
      // Limpar monitoramentos existentes antes de inicializar novos
    if (currentProvider) {
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
    const connectToBlockchain = async (): Promise<ethers.providers.Provider | null> => {      // Se especificado para usar HTTP ou após muitas falhas de websocket, ir direto para HTTP
      if (useHttpFallback) {
        return await createFallbackHttpProvider();
      } else {
        // Estratégia padrão: tentar WebSocket primeiro, depois fallback para HTTP
        const wsProvider = await createStableWebSocketProvider();
          if (wsProvider) {
          return wsProvider;
        }
        
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
        }
        
        // Informar o callback sobre a falha
        if (statusCallback) {
          statusCallback(false, null, {
            tokenDistribution: false,
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
        // Inicializar cada monitor com tratamento de erro independente
        // 1. Service wallet monitor
      if (serviceWalletAddress) {
        try {
          monitorServiceWallet(serviceWalletAddress, provider)
            .then(() => {
              activeMonitors.wallet = true;
              
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
        try {
          monitorTokenDistribution(tokenDistributorAddress, provider)
            .then(() => {
              activeMonitors.tokenDistribution = true;
              
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
              setTimeout(() => {
                try {
                  // Tentar com ABI mínima para reduzir problemas de compatibilidade
                  const minimalAbi = [
                    "event TokensDistributed(address indexed donor, uint256 tokenAmount, uint256 donationAmountUsd)"
                  ];
                  
                  const contract = new ethers.Contract(tokenDistributorAddress!, minimalAbi, provider);
                    contract.on('TokensDistributed', async (donor, tokenAmount, donationAmountUsd, event: any) => {
                    try {                      const tokens = ethers.utils.formatEther(tokenAmount);
                      const usdValue = donationAmountUsd.toNumber() / 100;
                      
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
                    }                  });
                  
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
        // 4. Learn2Earn monitors
      const learn2EarnMonitors: Record<string, boolean> = {};
        // Inicializar contrato Learn2Earn em cada rede
      for (const [network, address] of Object.entries(learn2EarnContracts)) {
        if (address) {
          try {
            monitorLearn2Earn(address, provider, network)
              .then(() => {
                learn2EarnMonitors[network] = true;
              })
              .catch((err: any) => {
                console.error(`❌ Falha ao inicializar monitoramento do Learn2Earn (${network}): ${err.message}`);
                
                // Atualizar status global
                if (serverStatus && serverStatus.contractMonitoring) {
                  serverStatus.contractMonitoring.errors.push(
                    `Falha ao inicializar monitoramento do Learn2Earn (${network}): ${err.message}`
                  );
                }
              });
          } catch (l2eErr: any) {
            console.error(`❌ Erro ao iniciar monitoramento do Learn2Earn (${network}):`, l2eErr);
          }
        }
      }
      
      // 5. InstantJobsEscrow monitors
      const instantJobsEscrowMonitors: Record<string, boolean> = {};
      // Initialize InstantJobsEscrow contract on each network
      for (const [network, address] of Object.entries(instantJobsEscrowContracts)) {
        if (address) {
          try {
            monitorInstantJobsEscrow(address, provider, network)
              .then(() => {
                instantJobsEscrowMonitors[network] = true;
              })
              .catch((err: any) => {
                console.error(`❌ Failed to initialize InstantJobsEscrow monitoring (${network}): ${err.message}`);
                
                // Update global status
                if (serverStatus && serverStatus.contractMonitoring) {
                  serverStatus.contractMonitoring.errors.push(
                    `Failed to initialize InstantJobsEscrow monitoring (${network}): ${err.message}`
                  );
                }
              });
          } catch (ijeErr: any) {
            console.error(`❌ Error starting InstantJobsEscrow monitoring (${network}):`, ijeErr);
          }
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
            wallet: activeMonitors.wallet,
            learn2Earn: learn2EarnMonitors,
            instantJobsEscrow: instantJobsEscrowMonitors
          });
        }
        
        // Atualizar status global independentemente do callback
        if (serverStatus && serverStatus.contractMonitoring) {
          serverStatus.contractMonitoring.initialized = true;          
          serverStatus.contractMonitoring.tokenDistributionActive = activeMonitors.tokenDistribution;
          serverStatus.contractMonitoring.walletMonitoringActive = activeMonitors.wallet;
        }
      }, 5000); // Aguardar 5 segundos para garantir que os monitores tiveram tempo para iniciar
      
      try {
        logSystem.info('Sistema de monitoramento de contratos inicializado', {
          rpcUrl: 'Conexão estabelecida com sucesso',
          providerType,          contracts: {
            tokenDistributor: tokenDistributorAddress || 'não configurado'
          },
          serviceWallet: serviceWalletAddress || 'não configurado',          activeMonitors: {
            tokenDistribution: activeMonitors.tokenDistribution,
            wallet: activeMonitors.wallet,
            learn2EarnContracts: Object.keys(learn2EarnMonitors).filter(key => learn2EarnMonitors[key]).length,
            instantJobsEscrowContracts: Object.keys(instantJobsEscrowMonitors).filter(key => instantJobsEscrowMonitors[key]).length
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
        wallet: false
      });
    }
  }
}

/**
 * Monitora um contrato Learn2Earn específico
 * @param address Endereço do contrato Learn2Earn
 * @param provider Provider Ethereum
 * @param network Nome da rede (ex: polygon, bsc, etc.)
 */
async function monitorLearn2Earn(address: string, provider: ethers.providers.Provider, network: string): Promise<void> {
  try {
    // ABI simplificado para Learn2Earn - apenas com os eventos que queremos monitorar
    const minimalAbi = [
      "event TokensClaimed(address indexed participant, uint256 amount)",
      "event ParticipantAdded(address indexed participant, uint256 amount)",
      "event Learn2EarnCreated(uint256 indexed id, address creator, uint256 tokenAmount, uint256 startTime, uint256 endTime)",
      "event MultipleWithdrawals(address indexed user, uint256 count, uint256 totalAmount)"
    ];
    
    // Criar instância do contrato
    const contract = new ethers.Contract(address, minimalAbi, provider);
      // Monitorar evento de tokens reclamados
    contract.on('TokensClaimed', async (participant, amount, event) => {
      // Registrar evento no sistema de logs
      try {
        const tokens = parseFloat(ethers.utils.formatEther(amount));
        await logSystem.info(`Learn2Earn (${network}): Tokens reclamados`, {
          participant,
          amount: tokens,
          transactionHash: event.transactionHash
        });
        
        // Alertar se o valor for alto
        if (tokens > ALERT_THRESHOLD_TOKENS) {          await logSystem.warn(`Alerta: Reclamação de alto valor no Learn2Earn (${network})`, {
            participant,
            amount: tokens,
            transactionHash: event.transactionHash
          });
        }
      } catch (logErr) {
        console.error(`Erro ao registrar evento TokensClaimed (${network}):`, logErr);
      }
    });
      // Monitorar evento de participante adicionado
    contract.on('ParticipantAdded', async (participant, amount, event) => {
      try {
        await logSystem.info(`Learn2Earn (${network}): Novo participante`, {
          participant,
          transactionHash: event.transactionHash
        });
      } catch (logErr) {
        console.error(`Erro ao registrar evento ParticipantAdded (${network}):`, logErr);
      }
    });
      // Monitorar evento de criação de Learn2Earn
    contract.on('Learn2EarnCreated', async (id, creator, tokenAmount, startTime, endTime, event) => {
      const tokens = parseFloat(ethers.utils.formatEther(tokenAmount));
      try {
        await logSystem.info(`Learn2Earn (${network}): Novo Learn2Earn criado`, {
          id: id.toString(),
          creator,
          amount: tokens,
          startTime: new Date(startTime.toNumber() * 1000).toISOString(),
          endTime: new Date(endTime.toNumber() * 1000).toISOString(),
          transactionHash: event.transactionHash
        });          // Alertar se o valor for alto
        if (tokens > ALERT_THRESHOLD_TOKENS) {
          await logSystem.warn(`Alerta: Novo Learn2Earn de alto valor (${network})`, {
            id: id.toString(),
            creator,
            amount: tokens,
            transactionHash: event.transactionHash
          });
        }
      } catch (logErr) {
        console.error(`Erro ao registrar evento Learn2EarnCreated (${network}):`, logErr);
      }
    });
      // Monitorar evento de múltiplos saques (sinal de comportamento potencialmente suspeito)
    contract.on('MultipleWithdrawals', async (user, count, totalAmount, event) => {
      try {
        const tokens = parseFloat(ethers.utils.formatEther(totalAmount));
          // Este é sempre um evento de alerta
        await logSystem.warn(`Alerta: Múltiplos saques de Learn2Earn (${network})`, {
          user,
          count: count.toNumber(),
          totalAmount: tokens,
          transactionHash: event.transactionHash
        });
      } catch (logErr) {
        console.error(`Erro ao registrar evento MultipleWithdrawals (${network}):`, logErr);
      }
    });
    
    // Adicionar informações ao status global
    const { serverStatus } = require('../../lib/server-init');
    if (serverStatus && serverStatus.contractMonitoring) {
      // Garantir que o array existe
      if (!serverStatus.contractMonitoring.learn2EarnContracts) {
        serverStatus.contractMonitoring.learn2EarnContracts = [];
      }
        // Adicionar ou atualizar o contrato na lista
      const existingContractIndex = serverStatus.contractMonitoring.learn2EarnContracts.findIndex(
        (c: {address: string, network: string}) => c.address.toLowerCase() === address.toLowerCase() && c.network === network
      );
      
      if (existingContractIndex >= 0) {
        serverStatus.contractMonitoring.learn2EarnContracts[existingContractIndex].active = true;
      } else {
        serverStatus.contractMonitoring.learn2EarnContracts.push({
          address,
          network,
          active: true,
          name: `Learn2Earn ${network.charAt(0).toUpperCase() + network.slice(1)}`
        });
      }    }
    
    return Promise.resolve();
  } catch (error: any) {
    console.error(`❌ Erro ao monitorar contrato Learn2Earn (${network}) ${address}:`, error);
    return Promise.reject(error);
  }
}

/**
 * Monitora um contrato InstantJobsEscrow para atividade
 * @param address Endereço do contrato InstantJobsEscrow
 * @param provider Provider Ethereum
 * @param network Nome da rede (ex: polygon, bsc, etc.)
 */
async function monitorInstantJobsEscrow(address: string, provider: ethers.providers.Provider, network: string): Promise<void> {
  try {
    // Simplified ABI for InstantJobsEscrow - only with the events we want to monitor
    const minimalAbi = [
      "event JobCreated(string jobId, address indexed employer, uint256 payment)",
      "event JobCompleted(string jobId, address indexed freelancer, uint256 payment)",
      "event JobCancelled(string jobId, address indexed employer, uint256 refundedAmount)",
      "event DisputeRaised(string jobId, address indexed initiator, string reason)",
      "event DisputeResolved(string jobId, address indexed resolvedBy, uint256 freelancerAmount, uint256 employerAmount)",
      "event FundsWithdrawn(string jobId, address indexed recipient, uint256 amount)"
    ];
    
    // Create contract instance
    const contract = new ethers.Contract(address, minimalAbi, provider);
    
    // Track frequent transactions to detect suspicious activity
    const transactionTracker = {
      addresses: {} as Record<string, { count: number, lastTx: number, totalValue: ethers.BigNumber }>,      resetTime: Date.now() + 3600000, // Reset after 1 hour
      
      // Method to record transaction 
      recordTransaction: function(address: string, value: ethers.BigNumber): void {
        const now = Date.now();
        
        // Reset tracker if time elapsed
        if (now > this.resetTime) {
          this.addresses = {};
          this.resetTime = now + 3600000;
        }
        
        if (!this.addresses[address]) {
          this.addresses[address] = { count: 0, lastTx: 0, totalValue: ethers.BigNumber.from(0) };
        }
        
        const addressTracker = this.addresses[address];
        addressTracker.count++;
        addressTracker.lastTx = now;
        addressTracker.totalValue = addressTracker.totalValue.add(value);
        
        // Alert if there's high frequency activity from this address
        if (addressTracker.count >= 5) {
          const ethValue = parseFloat(ethers.utils.formatEther(addressTracker.totalValue));
          logSystem.warn(`High transaction frequency detected in InstantJobsEscrow (${network})`, {
            address,
            transactionCount: addressTracker.count,
            totalValueETH: ethValue
          });
        }
      }
    };
    
    // Monitor JobCreated events 
    contract.on('JobCreated', async (jobId, employer, payment, event) => {
      try {
        const paymentValue = parseFloat(ethers.utils.formatEther(payment));
        
        // Record the transaction for frequency monitoring
        transactionTracker.recordTransaction(employer, payment);
        
        await logSystem.info(`InstantJobsEscrow (${network}): Job created`, {
          jobId,
          employer,
          payment: paymentValue,
          transactionHash: event.transactionHash
        });
        
        // Alert if payment is high
        if (paymentValue > ALERT_THRESHOLD_ETH) {
          await logSystem.warn(`High value job created in InstantJobsEscrow (${network})`, {
            jobId,
            employer, 
            payment: paymentValue,
            transactionHash: event.transactionHash
          });
        }
      } catch (logErr) {
        console.error(`Error logging JobCreated event (${network}):`, logErr);
      }
    });
    
    // Monitor JobCompleted events
    contract.on('JobCompleted', async (jobId, freelancer, payment, event) => {
      try {
        const paymentValue = parseFloat(ethers.utils.formatEther(payment));
        
        // Record the transaction for frequency monitoring
        transactionTracker.recordTransaction(freelancer, payment);
        
        await logSystem.info(`InstantJobsEscrow (${network}): Job completed`, {
          jobId,
          freelancer,
          payment: paymentValue,
          transactionHash: event.transactionHash
        });
      } catch (logErr) {
        console.error(`Error logging JobCompleted event (${network}):`, logErr);
      }
    });
    
    // Monitor JobCancelled events
    contract.on('JobCancelled', async (jobId, employer, refundedAmount, event) => {
      try {
        const refundValue = parseFloat(ethers.utils.formatEther(refundedAmount));
        
        await logSystem.info(`InstantJobsEscrow (${network}): Job cancelled`, {
          jobId,
          employer,
          refundedAmount: refundValue,
          transactionHash: event.transactionHash
        });
      } catch (logErr) {
        console.error(`Error logging JobCancelled event (${network}):`, logErr);
      }
    });
    
    // Monitor DisputeRaised events - important for potential issues
    contract.on('DisputeRaised', async (jobId, initiator, reason, event) => {
      try {
        // Disputes always generate alerts as they may indicate problems
        await logSystem.warn(`Dispute raised in InstantJobsEscrow (${network})`, {
          jobId,
          initiator,
          reason,
          transactionHash: event.transactionHash
        });
      } catch (logErr) {
        console.error(`Error logging DisputeRaised event (${network}):`, logErr);
      }
    });
    
    // Monitor FundsWithdrawn events - especially important for security
    contract.on('FundsWithdrawn', async (jobId, recipient, amount, event) => {
      try {
        const withdrawValue = parseFloat(ethers.utils.formatEther(amount));
        
        // Record the transaction for frequency monitoring
        transactionTracker.recordTransaction(recipient, amount);
        
        await logSystem.info(`InstantJobsEscrow (${network}): Funds withdrawn`, {
          jobId,
          recipient,
          amount: withdrawValue,
          transactionHash: event.transactionHash
        });
        
        // Alert if withdrawal is high value
        if (withdrawValue > ALERT_THRESHOLD_ETH) {
          await logSystem.warn(`High value withdrawal from InstantJobsEscrow (${network})`, {
            jobId,
            recipient,
            amount: withdrawValue,
            transactionHash: event.transactionHash
          });
        }
      } catch (logErr) {
        console.error(`Error logging FundsWithdrawn event (${network}):`, logErr);
      }
    });
    
    // Update global status
    const { serverStatus } = require('../../lib/server-init');
    if (serverStatus && serverStatus.contractMonitoring) {
      // Ensure the array exists
      if (!serverStatus.contractMonitoring.instantJobsEscrowContracts) {
        serverStatus.contractMonitoring.instantJobsEscrowContracts = [];
      }
      
      // Add or update the contract in the list
      const existingContractIndex = serverStatus.contractMonitoring.instantJobsEscrowContracts.findIndex(
        (c: {address: string, network: string}) => c.address.toLowerCase() === address.toLowerCase() && c.network === network
      );
      
      if (existingContractIndex >= 0) {
        serverStatus.contractMonitoring.instantJobsEscrowContracts[existingContractIndex].active = true;
      } else {
        serverStatus.contractMonitoring.instantJobsEscrowContracts.push({
          address,
          network,
          active: true,
          name: `InstantJobs ${network.charAt(0).toUpperCase() + network.slice(1)}`
        });
      }
    }
    
    return Promise.resolve();
  } catch (error: any) {
    console.error(`❌ Error monitoring InstantJobsEscrow contract (${network}) ${address}:`, error);
    return Promise.reject(error);
  }
}

/**
 * Export a function to get the server status
 */
export function getServerStatus() {
  try {
    // Dynamically import serverStatus to avoid circular import issues
    const { serverStatus } = require('../../lib/server-init');
    return serverStatus;
  } catch (error) {
    console.error("Error getting server status:", error);
    // Return a default status in case of error
    return {
      contractMonitoring: {
        initialized: false,
        startTime: null,
        lastRestart: null,
        tokenDistributionActive: false,
        walletMonitoringActive: false,
        connectionType: null,
        errors: ["Error accessing server status: " + (error instanceof Error ? error.message : String(error))],
        rpcUrl: null,
        warnings: [],
        lastStatus: 'unknown'
      }
    };
  }
}

// Interface for contract monitoring state
export interface ContractMonitoringState {
  isWalletMonitoring: boolean;
  isTokenDistributionMonitoring: boolean;
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
    let isWalletMonitoring = false;
    let isTokenDistributionMonitoring = false;
    let tokenDistributions = undefined;
    let errors: string[] = [];    if (typeof window !== 'undefined') {
      try {
        // Obter status do monitoramento de carteira e distribuidor de tokens 
        // diretamente dos estados ativos em memória
        isWalletMonitoring = activeMonitors.wallet;
        isTokenDistributionMonitoring = activeMonitors.tokenDistribution;
      } catch (err) {
        console.error("Erro ao verificar status dos monitores:", err);
        errors.push("Erro ao verificar status dos monitores: " + (err instanceof Error ? err.message : String(err)));
        
        // Fornecer estados padrão em caso de erro, sem usar fallbacks
        isWalletMonitoring = false;
        isTokenDistributionMonitoring = false;
      }
    } else {
      // On the server side, we check configuration
      isWalletMonitoring = !!process.env.SERVICE_WALLET_ADDRESS;
      isTokenDistributionMonitoring = !!process.env.TOKEN_DISTRIBUTOR_ADDRESS;
    }
    
    // Verifique se estamos no lado do cliente para usar valores de memória
    if (typeof window !== 'undefined') {
      // Use os valores determinados diretamente do estado do sistema
      return {
        isWalletMonitoring,
        isTokenDistributionMonitoring,
        // Não usamos placeholders
        walletBalance: isWalletMonitoring ? "Monitorando" : undefined,
        tokenDistributions: isTokenDistributionMonitoring ? { count: 0, totalTokens: "Monitorando" } : undefined,
        errors
      };
    } else {
      // No lado do servidor, usamos apenas o que sabemos com certeza
      return {
        isWalletMonitoring,
        isTokenDistributionMonitoring,
        errors
      };
    }
  } catch (error: any) {
    // Mensagem de erro mais detalhada para depuração
    const errorMessage = error.message || "Erro desconhecido obtendo estado de monitoramento";
    console.error("Erro obtendo estado de monitoramento:", errorMessage, error);
      // No caso de erro grave, retorne um estado consistente
    return {
      isWalletMonitoring: false,
      isTokenDistributionMonitoring: false,
      errors: [`Erro ao verificar estado do monitoramento: ${errorMessage}`]
    };
  }
}

// Export contract addresses for access by API routes
export { learn2EarnContracts };
export { instantJobsEscrowContracts };