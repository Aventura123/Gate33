import { ethers } from 'ethers';
import { logSystem } from '../logSystem';
import { monitorLearn2EarnContracts, monitorAllLearn2EarnFromFirestore } from './learn2earnMonitor';

// Configurações
const ALERT_THRESHOLD_ETH = 0.1;  // Alerta se o gasto for maior que este valor em ETH
const ALERT_THRESHOLD_TOKENS = 5000; // Alerta se mais de 50 tokens forem distribuídos em uma única operação
const ADMIN_EMAIL = 'info@gate33.com'; // Email para receber alertas

// Define missing variables
const MAX_PROVIDER_RETRIES = 5; // Maximum retries for provider initialization
let providerInitRetries = 0; // Counter for provider initialization retries
let isMonitoringInitialized = false; // Flag to track monitoring initialization

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

// Define valid RPC URLs
const validRpcUrls = [
  process.env.CUSTOM_POLYGON_RPC,
  'https://polygon-rpc.com',
  'https://polygon-mainnet.public.blastapi.io',
  'https://polygon.llamarpc.com',
  'https://rpc-mainnet.maticvigil.com',
  'https://polygon-bor.publicnode.com',
  `https://polygon-mainnet.infura.io/v3/${process.env.INFURA_KEY || '9aa3d95b3bc440fa88ea12eaa4456161'}`,
  `https://polygon-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_KEY || 'demo'}`,
  'wss://polygon-mainnet.g.alchemy.com/v2/demo',
  'wss://ws-matic-mainnet.chainstacklabs.com',
].filter((url): url is string => typeof url === 'string' && url.length > 0);

// Fix implicit 'any' type for parameters
validRpcUrls.filter((url: string) => url.startsWith('http'));
validRpcUrls.filter((url: string) => url.startsWith('wss://'));

// Helper para enviar email
const sendEmail = async (to: string, subject: string, message: string): Promise<void> => {
  try {
    console.log(`Email enviado para ${to}: ${subject}`);
    // Implementação real do envio de email seria feita aqui
  } catch (error: any) {
    console.error("Erro ao enviar email:", error);
  }
};

// Monitorar o contrato Learn2Earn para atividades suspeitas
export async function monitorLearn2EarnActivity(
  contractAddress: string, 
  provider: ethers.providers.Provider
): Promise<void> {
  try {
    // ABI simplificado apenas para os eventos que queremos monitorar
    const abi = [
      "event Learn2EarnClaimed(uint256 indexed learn2earnId, address indexed user, uint256 amount)",
      "event Learn2EarnEnded(uint256 indexed learn2earnId)",
    ];
    
    const contract = new ethers.Contract(contractAddress, abi, provider);
    
    // Configurar listener para eventos de reivindicação
    contract.on('Learn2EarnClaimed', async (learn2earnId, user, amount, event) => {
      const amountFormatted = ethers.utils.formatEther(amount);
      
      // Registrar todas as reivindicações no sistema de logs
      await logSystem.contractActivity("Learn2EarnContract", "claim", {
        learn2earnId: learn2earnId.toString(),
        user,
        amount: amountFormatted,
        transactionHash: event.transactionHash
      });
      
      // Alertar se o valor for acima do limite
      if (parseFloat(amountFormatted) > ALERT_THRESHOLD_TOKENS) {
        const message = `ALERTA: Reivindicação grande detectada em Learn2Earn!\n` + 
                       `ID: ${learn2earnId}\n` +
                       `Usuário: ${user}\n` + 
                       `Valor: ${amountFormatted} tokens\n` +
                       `Hash da transação: ${event.transactionHash}`;
        
        // Registrar alerta no sistema
        await logSystem.warn(message, {
          contractAddress,
          learn2earnId: learn2earnId.toString(),
          user,
          amount: amountFormatted,
          transactionHash: event.transactionHash,
          alertType: 'large_claim'
        });
                       
        await sendEmail(ADMIN_EMAIL, 'Alerta de Segurança Gate33 - Learn2Earn', message);
      }
    });
    
    // Configurar listener para eventos de encerramento
    contract.on('Learn2EarnEnded', async (learn2earnId, event) => {
      const message = `Learn2Earn ID ${learn2earnId} foi encerrado. Hash: ${event.transactionHash}`;
      
      // Registrar no sistema de logs
      await logSystem.contractActivity("Learn2EarnContract", "ended", {
        learn2earnId: learn2earnId.toString(),
        transactionHash: event.transactionHash
      });
      
      // Sempre notificar quando um programa é encerrado
      await sendEmail(ADMIN_EMAIL, 'Learn2Earn Encerrado', message);
    });
    
    await logSystem.info(`Monitoramento de Learn2Earn iniciado para o contrato ${contractAddress}`);
  } catch (error: any) {
    await logSystem.error(`Erro ao configurar monitoramento de Learn2Earn: ${error.message}`);
  }
}

// Monitorar os gastos de gas da carteira de serviço
export async function monitorServiceWallet(
  walletAddress: string,
  provider: ethers.providers.Provider
): Promise<void> {
  try {
    // Verificar saldo a cada 4 horas
    setInterval(async () => {
      const balance = await provider.getBalance(walletAddress);
      const balanceEth = parseFloat(ethers.utils.formatEther(balance));
      
      // Registrar saldo no sistema de logs
      await logSystem.info(`Saldo da carteira de serviço: ${balanceEth} ETH`, {
        walletAddress,
        balance: balanceEth,
        checkType: 'scheduled'
      });
      
      // Alertar se o saldo estiver muito baixo (menos de 0.01 ETH)
      if (balanceEth < 0.01) {
        const message = `ALERTA: Saldo baixo na carteira de serviço!\n` +
                       `Endereço: ${walletAddress}\n` +
                       `Saldo atual: ${balanceEth} ETH\n` +
                       `É necessário recarregar a carteira para continuar operando.`;
        
        // Registrar alerta no sistema
        await logSystem.walletAlert(walletAddress, "low_balance", {
          balance: balanceEth,
          threshold: 0.01
        });
                       
        await sendEmail(ADMIN_EMAIL, 'Alerta - Saldo Baixo na Carteira de Serviço', message);
      }
    }, 4 * 60 * 60 * 1000); // 4 horas
    
    // Monitorar transações enviadas
    provider.on({ address: walletAddress }, async (log) => {
      // Verificar apenas transações enviadas (onde a carteira é o 'from')
      const tx = await provider.getTransaction(log.transactionHash);
      if (tx && tx.from.toLowerCase() === walletAddress.toLowerCase()) {
        const gasUsed = tx.gasLimit.mul(tx.gasPrice || ethers.BigNumber.from(0));
        const gasUsedEth = parseFloat(ethers.utils.formatEther(gasUsed));
        
        // Registrar transação no sistema de logs
        await logSystem.info(`Transação enviada: ${tx.hash}, Gas usado: ${gasUsedEth} ETH`, {
          transactionHash: tx.hash,
          from: tx.from,
          to: tx.to,
          gasUsed: gasUsedEth,
          walletAddress
        });
        
        // Alertar se o gasto com gas for alto
        if (gasUsedEth > ALERT_THRESHOLD_ETH) {
          const message = `ALERTA: Alto gasto com gas detectado!\n` +
                         `Hash da transação: ${tx.hash}\n` +
                         `Gas usado: ${gasUsedEth} ETH\n` +
                         `De: ${tx.from}\n` +
                         `Para: ${tx.to}`;
          
          // Registrar alerta no sistema
          await logSystem.walletAlert(walletAddress, "high_gas", {
            transactionHash: tx.hash,
            from: tx.from,
            to: tx.to, 
            gasUsed: gasUsedEth,
            threshold: ALERT_THRESHOLD_ETH
          });
                         
          await sendEmail(ADMIN_EMAIL, 'Alerta - Alto Gasto com Gas', message);
        }
      }
    });
    
    await logSystem.info(`Monitoramento da carteira de serviço iniciado para ${walletAddress}`);
  } catch (error: any) {
    await logSystem.error(`Erro ao configurar monitoramento da carteira: ${error.message}`);
  }
}

// Monitorar distribuição de tokens G33
export async function monitorTokenDistribution(
  contractAddress: string,
  provider: ethers.providers.Provider
): Promise<void> {
  try {
    if (!contractAddress) {
      throw new Error("Endereço do contrato de distribuição de tokens não fornecido");
    }

    console.log(`Iniciando monitoramento do Distribuidor de Tokens G33: ${contractAddress}`);

    // ABI mais completo para melhor compatibilidade com o contrato
    const abi = [
      // Eventos principais
      "event TokensDistributed(address indexed donor, uint256 tokenAmount, uint256 donationAmountUsd)",
      "event DonationReceived(address indexed donor, uint256 donationAmountUsd)",
      // Funções que podem ajudar na validação
      "function tokenAddress() view returns (address)",
      "function availableTokensForDistribution() view returns (uint256)",
      "function totalDistributed() view returns (uint256)"
    ];
    
    const contract = new ethers.Contract(contractAddress, abi, provider);
    
    // Verificar se o contrato é válido consultando uma função básica
    try {
      // Tentar verificar se o contrato responde - primeiro com tokenAddress
      let isValid = false;
      try {
        const tokenAddress = await contract.tokenAddress();
        console.log(`Endereço do token G33 confirmado: ${tokenAddress}`);
        isValid = true;
      } catch (err: any) {
        console.log(`Função tokenAddress não encontrada, tentando outra verificação...`);
        // Se tokenAddress falhar, tentar outras funções
        try {
          const totalDistributed = await contract.totalDistributed();
          console.log(`Total distribuído confirmado: ${ethers.utils.formatEther(totalDistributed)} tokens`);
          isValid = true;
        } catch (err2: any) {
          // Última tentativa - verificar se o endereço tem código
          const code = await provider.getCode(contractAddress);
          if (code !== '0x') {
            console.log('Contrato possui código implantado, prosseguindo com monitoramento');
            isValid = true;
          } else {
            throw new Error("Endereço não contém código de contrato");
          }
        }
      }
      
      if (!isValid) {
        throw new Error("Não foi possível validar o contrato do distribuidor de tokens");
      }
      
      console.log(`Contrato G33 validado com sucesso em: ${contractAddress}`);
    } catch (contractErr: any) {
      console.error(`Erro ao verificar contrato de distribuição: ${contractErr.message}`);
      throw new Error(`Contrato de distribuição de tokens inválido ou inacessível: ${contractErr.message}`);
    }
    
    // Configurar listener para eventos de distribuição
    contract.on('TokensDistributed', async (donor, tokenAmount, donationAmountUsd, event) => {
      try {
        const tokens = ethers.utils.formatEther(tokenAmount);
        const usdValue = donationAmountUsd.toNumber() / 100; // Convertendo de centavos para dólares
        
        console.log(`Evento TokensDistributed detectado: ${tokens} tokens para ${donor}, valor USD: ${usdValue}`);
        
        // Registrar distribuição no sistema de logs
        try {
          await logSystem.tokenDistribution(donor, parseFloat(tokens), {
            transactionHash: event.transactionHash,
            usdValue,
            donationAmountUsd: usdValue
          });
        } catch (logErr: any) {
          console.error("Erro ao registrar token distribution no log:", logErr);
        }
        // Enviar alerta por e-mail se distribuição for muito grande
        if (parseFloat(tokens) > ALERT_THRESHOLD_TOKENS) {
          const message = `Grande distribuição de tokens G33 detectada!\n` +
            `Doador: ${donor}\n` +
            `Tokens: ${tokens} G33\n` +
            `Valor da doação: $${usdValue.toFixed(2)} USD\n` +
            `Hash da transação: ${event.transactionHash}`;
          try {
            await sendEmail(ADMIN_EMAIL, 'Alerta - Grande distribuição de tokens G33', message);
          } catch (emailErr) {
            console.error('Erro ao enviar alerta de distribuição de tokens por e-mail:', emailErr);
          }
        }
      } catch (eventErr: any) {
        console.error(`Erro ao processar evento TokensDistributed: ${eventErr.message}`);
      }
    });
    
    // Adicionar um listener para eventos de doação também (para redundância)
    try {
      contract.on('DonationReceived', async (donor, donationAmountUsd, event) => {
        console.log(`Evento DonationReceived detectado de ${donor}, valor USD: ${donationAmountUsd.toNumber() / 100}`);
      });
    } catch (listenerErr: any) {
      console.warn("Erro ao configurar listener para DonationReceived (não crítico):", listenerErr.message);
    }
    
    console.log(`Monitoramento de distribuição de tokens G33 iniciado para o contrato ${contractAddress}`);
    try {
      await logSystem.info(`Monitoramento de distribuição de tokens G33 iniciado para o contrato ${contractAddress}`);
    } catch (logErr: any) {
      console.error("Erro ao registrar info no log:", logErr);
    }
    
    // Verificar status inicial do contrato para confirmar que está funcionando
    try {
      const totalDistributed = await contract.totalDistributed();
      const formattedTotal = ethers.utils.formatEther(totalDistributed);
      console.log(`Status inicial do contrato G33: Total distribuído = ${formattedTotal} tokens`);
      
      try {
        const availableTokens = await contract.availableTokensForDistribution();
        const formattedAvailable = ethers.utils.formatEther(availableTokens);
        console.log(`Tokens disponíveis para distribuição: ${formattedAvailable}`);
      } catch (err: any) {
        console.warn("Não foi possível verificar tokens disponíveis (não crítico)");
      }
    } catch (statusErr: any) {
      console.warn("Não foi possível verificar status do contrato (não crítico):", statusErr.message);
    }
    
  } catch (error: any) {
    console.error(`Erro ao configurar monitoramento de distribuição de tokens G33: ${error.message}`);
    try {
      await logSystem.error(`Erro ao configurar monitoramento de distribuição de tokens G33: ${error.message}`);
    } catch (logErr: any) {
      console.error("Erro ao registrar error no log:", logErr);
    }
    // Propagar o erro para que a inicialização saiba que este monitor falhou
    throw error;
  }
}

// Create a simulated provider that can work offline
function createSimulatedProvider(): ethers.providers.Provider {
  console.log('⚠️ CRIANDO PROVIDER SIMULADO - O monitoramento funcionará em modo offline');
  
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

// Inicializar monitoramento (chamar esta função ao iniciar o servidor)
export function initializeContractMonitoring(
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
    // Importar o serverStatus dinamicamente para evitar problemas de importação circular
    let serverStatus: any;
    try {
      const serverInit = require('../../lib/server-init');
      serverStatus = serverInit.serverStatus;
      
      // Inicializar a estrutura de status se necessário
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
      console.warn("Não foi possível importar serverStatus, continuando sem ele:", importErr);
      // Criar um objeto simulado para não quebrar o código
      serverStatus = {
        contractMonitoring: {
          initialized: false,
          errors: [],
          warnings: []
        }
      };
    }

    console.log("Iniciando sistema de monitoramento de contratos...");

    // Lista de RPCs confiáveis para backup em caso de falha
    const rpcUrls = [
      process.env.CUSTOM_POLYGON_RPC, // RPC personalizado (se configurado)
      
      // HTTP RPCs - melhor compatibilidade inicial
      'https://polygon-rpc.com',
      'https://polygon-mainnet.public.blastapi.io',
      'https://polygon.llamarpc.com',
      'https://rpc-mainnet.maticvigil.com',
      'https://polygon-bor.publicnode.com',
      
      // RPCs com APIs
      `https://polygon-mainnet.infura.io/v3/${process.env.INFURA_KEY || "9aa3d95b3bc440fa88ea12eaa4456161"}`,
      `https://polygon-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_KEY || "demo"}`,
      
      // WebSockets - tentar após os HTTP providers
      "wss://polygon-mainnet.g.alchemy.com/v2/demo",
      "wss://ws-matic-mainnet.chainstacklabs.com",
    ];
    
    // Verificar e logar os endereços de contratos disponíveis
    console.log("Verificando endereços de contratos...");
    
    const learn2earnAddress = process.env.LEARN2EARN_CONTRACT_ADDRESS;
    if (learn2earnAddress) {
      console.log(`✅ Contrato Learn2Earn encontrado: ${learn2earnAddress}`);
    } else {
      console.warn("⚠️ Endereço do contrato Learn2Earn não encontrado nas variáveis de ambiente");
    }
    
    const createReliableProvider = async (): Promise<ethers.providers.Provider | null> => {
      // Se já atingimos o número máximo de tentativas, não tentar novamente
      if (providerInitRetries >= MAX_PROVIDER_RETRIES) {
        console.warn(`Atingido o máximo de ${MAX_PROVIDER_RETRIES} tentativas para inicializar o provider. O monitoramento será desativado.`);
        
        // Atualizar status global
        if (serverStatus && serverStatus.contractMonitoring) {
          serverStatus.contractMonitoring.errors = serverStatus.contractMonitoring.errors || [];
          serverStatus.contractMonitoring.errors.push(
            `Atingido o limite máximo de ${MAX_PROVIDER_RETRIES} tentativas para conectar à blockchain.`
          );
        }
        
        return null;
      }
      
      providerInitRetries++;
      console.log(`Tentativa ${providerInitRetries}/${MAX_PROVIDER_RETRIES} para inicializar o provider`);
      
      // Primeiro tentar HTTP RPCs - mais estáveis para conexão inicial
      const httpUrls = validRpcUrls.filter((url): url is string => typeof url === 'string' && url.startsWith('http'));
      
      for (const url of httpUrls) {
        try {
          console.log(`Tentando conectar ao HTTP RPC para monitoramento: ${url}`);
          const provider = new ethers.providers.JsonRpcProvider(url);
          
          // Teste a conexão com o provider
          const blockNumber = await Promise.race([
            provider.getBlockNumber(),
            new Promise<never>((_, reject) => 
              setTimeout(() => reject(new Error('Timeout ao conectar ao HTTP RPC')), 10000)
            ),
          ]);
          
          console.log(`✅ Conexão HTTP RPC bem-sucedida para monitoramento, bloco atual: ${blockNumber}`);
          
          // Atualizar status global
          if (serverStatus && serverStatus.contractMonitoring) {
            serverStatus.contractMonitoring.connectionType = "HTTP";
            serverStatus.contractMonitoring.rpcUrl = url.replace(/\/v3\/.*/, '/v3/****'); // Ocultar chaves API
          }
          
          return provider;
        } catch (error) {
          console.warn(`❌ Falha ao conectar ao HTTP RPC ${url} para monitoramento:`, error);
        }
      }
      
      // Se HTTP RPCs falharem, tente WebSockets
      const wsUrls = validRpcUrls.filter((url): url is string => typeof url === 'string' && url.startsWith('wss://'));
      
      for (const url of wsUrls) {
        try {
          console.log(`Tentando conectar ao WebSocket RPC para monitoramento: ${url}`);
          const provider = new ethers.providers.WebSocketProvider(url);
          
          // Teste a conexão com o provider
          const blockNumber = await Promise.race([
            provider.getBlockNumber(),
            new Promise<never>((_, reject) => 
              setTimeout(() => reject(new Error('Timeout ao conectar ao WebSocket RPC')), 10000)
            ),
          ]);
          
          console.log(`✅ Conexão WebSocket RPC bem-sucedida para monitoramento, bloco atual: ${blockNumber}`);
          
          // Atualizar status global
          if (serverStatus && serverStatus.contractMonitoring) {
            serverStatus.contractMonitoring.connectionType = "WebSocket";
            serverStatus.contractMonitoring.rpcUrl = url.replace(/\/v2\/.*/, '/v2/****'); // Ocultar chaves API
          }
          
          return provider;
        } catch (error) {
          console.warn(`❌ Falha ao conectar ao WebSocket RPC ${url} para monitoramento:`, error);
        }
      }
      
      // Como último recurso, tentar um FallbackProvider com múltiplos provedores
      try {
        console.log('Tentando utilizar FallbackProvider com múltiplos endpoints...');
        
        const providerConfigs = [];
        let priority = 1;
        
        // Adicionar até 3 provedores HTTP para o fallback
        for (const url of httpUrls.slice(0, 3)) {
          try {
            const provider = new ethers.providers.JsonRpcProvider(url);
            providerConfigs.push({
              provider,
              priority: priority++,
              weight: 1,
              stallTimeout: 5000
            });
          } catch (e) {
            // Ignorar erros de criação do provider
            console.warn(`Não foi possível criar provider para ${url}:`, e);
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
            setTimeout(() => reject(new Error('Timeout ao conectar com FallbackProvider')), 15000)
          ),
        ]);
        
        console.log(`✅ FallbackProvider conectado com sucesso, bloco atual: ${blockNumber}`);
        
        // Atualizar status global
        if (serverStatus && serverStatus.contractMonitoring) {
          serverStatus.contractMonitoring.connectionType = "FallbackProvider";
          serverStatus.contractMonitoring.rpcUrl = "Multiple RPC endpoints";
        }
        
        return fallbackProvider;
      } catch (fallbackError) {
        console.error('❌ Também falhou ao conectar usando FallbackProvider:', fallbackError);
        return null;
      }
    };
    
    // Tente criar um provider confiável
    createReliableProvider().then(provider => {
      // Se não conseguimos um provider, não continue
      if (!provider) {
        console.error('Não foi possível estabelecer conexão com nenhum provider. O monitoramento de contratos não será iniciado.');
        try {
          logSystem.error('Não foi possível estabelecer conexão com nenhum provider. O monitoramento de contratos não será iniciado.');
        } catch (logErr) {
          console.error("Erro ao registrar error no log:", logErr);
        }
        
        // Atualizar status global
        if (serverStatus && serverStatus.contractMonitoring) {
          serverStatus.contractMonitoring.initialized = false;
          serverStatus.contractMonitoring.errors = serverStatus.contractMonitoring.errors || [];
          serverStatus.contractMonitoring.errors.push(
            'Falha ao conectar com qualquer provider blockchain. O monitoramento não será iniciado.'
          );
        }
        
        // Informar o callback que falhou
        if (statusCallback) {
          statusCallback(false, null, {
            tokenDistribution: false,
            learn2earn: false,
            wallet: false
          });
        }
        
        return;
      }
      
      // Configurar manipuladores de eventos para reconexão automática
      if ('_websocket' in provider) {
        console.log('Configurando manipuladores de evento para o WebSocketProvider...');
        
        try {
          // Definir função de reconexão para WebSocketProvider
          const ws = (provider as any)._websocket;
          
          ws.onclose = () => {
            console.log('Conexão WebSocket fechada. Tentando reconectar em 10 segundos...');
            
            // Atualizar status global
            if (serverStatus && serverStatus.contractMonitoring) {
              serverStatus.contractMonitoring.errors = serverStatus.contractMonitoring.errors || [];
              serverStatus.contractMonitoring.errors.push(
                `Conexão WebSocket fechada em ${new Date().toISOString()}. Tentando reconectar...`
              );
            }
            
            // Tentar reconectar após 10 segundos
            setTimeout(() => {
              console.log('Reiniciando monitoramento devido à desconexão do WebSocket...');
              try {
                initializeContractMonitoring();
              } catch (restartErr) {
                console.error("Erro ao reiniciar monitoramento:", restartErr);
              }
            }, 10000);
          };
        } catch (wsError) {
          console.error("Erro ao configurar eventos WebSocket:", wsError);
        }
      } else {
        // Para providers que não são WebSocket, configurar verificações periódicas
        try {
          const healthCheckInterval = setInterval(async () => {
            try {
              await provider.getBlockNumber();
              // Se a chamada acima não lançar exceção, o provider está funcionando
            } catch (error) {
              console.log('Falha na verificação de saúde do provider. Tentando reiniciar o monitoramento...');
              
              // Atualizar status global
              if (serverStatus && serverStatus.contractMonitoring) {
                serverStatus.contractMonitoring.errors = serverStatus.contractMonitoring.errors || [];
                serverStatus.contractMonitoring.errors.push(
                  `Falha na verificação de saúde do provider em ${new Date().toISOString()}. Reiniciando monitoramento...`
                );
              }
              
              clearInterval(healthCheckInterval);
              try {
                initializeContractMonitoring();
              } catch (restartErr) {
                console.error("Erro ao reiniciar monitoramento:", restartErr);
              }
            }
          }, 5 * 60 * 1000); // Verificar a cada 5 minutos
        } catch (healthCheckError) {
          console.error("Erro ao configurar verificação de saúde:", healthCheckError);
        }
      }
      
      isMonitoringInitialized = true;
      
      // Inicializar cada monitor com tratamento de erros independente
      
      // 1. Monitor Learn2Earn (Firestore)
      monitorAllLearn2EarnFromFirestore();

      // 1. Monitor Learn2Earn
      const learn2earnContracts = [];
      if (process.env.LEARN2EARN_CONTRACT_ADDRESS) {
        learn2earnContracts.push({
          contractAddress: process.env.LEARN2EARN_CONTRACT_ADDRESS,
          provider,
          network: 'polygon' // ou outro identificador
        });
      }
      // Adicione outros contratos aqui, se necessário
      if (learn2earnContracts.length > 0) {
        monitorLearn2EarnContracts(learn2earnContracts);
        activeMonitors.learn2earn = true;
      }
      
      // 2. Monitor de carteira de serviço
      if (serviceWalletAddress) {
        try {
          monitorServiceWallet(serviceWalletAddress, provider)
            .then(() => {
              activeMonitors.wallet = true;
              console.log(`✅ Monitoramento de carteira de serviço ativo para ${serviceWalletAddress}`);
              
              // Atualizar status global
              if (serverStatus && serverStatus.contractMonitoring) {
                serverStatus.contractMonitoring.walletMonitoringActive = true;
              }
            })
            .catch((err: any) => {
              console.error(`❌ Falha ao inicializar monitoramento da carteira de serviço: ${err.message}`);
              
              // Atualizar status global
              if (serverStatus && serverStatus.contractMonitoring) {
                serverStatus.contractMonitoring.errors.push(
                  `Falha ao inicializar monitoramento da carteira: ${err.message}`
                );
              }
            });
        } catch (walletErr: any) {
          console.error("❌ Erro ao iniciar monitoramento de carteira:", walletErr);
        }
      }
      
      // 3. Monitor de distribuição de tokens - FOCO PRINCIPAL DA CORREÇÃO
      if (tokenDistributorAddress) {
        try {
          console.log(`🔍 Inicializando monitoramento do distribuidor de tokens G33 em ${tokenDistributorAddress}...`);
          
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
              
              // Registro de erro detalhado para diagnóstico
              console.error('Detalhes do erro:', err);
              
              // Atualizar status global
              if (serverStatus && serverStatus.contractMonitoring) {
                serverStatus.contractMonitoring.errors.push(
                  `Falha ao inicializar monitoramento de distribuição de tokens: ${err.message}`
                );
              }
              
              // Tentar nova inicialização com abordagem alternativa após um breve intervalo
              console.log('Tentando abordagem alternativa para inicializar o monitoramento de tokens...');
              setTimeout(() => {
                try {
                  // Tente com um ABI mínimo para reduzir problemas de compatibilidade
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
                        console.error("Erro ao registrar token distribution no log:", logErr);
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
                  
                  // Registrar no sistema de logs
                  try {
                    logSystem.info(`Monitoramento de distribuição de tokens G33 reinicializado com sucesso para ${tokenDistributorAddress}`);
                  } catch (logErr: any) {
                    console.error("Erro ao registrar info no log:", logErr);
                  }
                  
                } catch (retryErr: any) {
                  console.error(`Falha na abordagem alternativa: ${retryErr.message}`);
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
        console.error("❌ Endereço do distribuidor de tokens não configurado. O monitoramento não será iniciado.");
        
        // Atualizar status global
        if (serverStatus && serverStatus.contractMonitoring) {
          serverStatus.contractMonitoring.errors.push(
            'Endereço do distribuidor de tokens não configurado. O monitoramento não será iniciado.'
          );
        }
      }
      
      // Após tentar inicializar todos os monitores, atualizar o status global
      if (serverStatus && serverStatus.contractMonitoring) {
        serverStatus.contractMonitoring.initialized = true;
      }
      
      // IMPORTANTE: Chamar o callback somente depois de iniciar todos os monitores
      setTimeout(() => {
        // Esperar um pouco para que os processos de monitoramento possam ser iniciados
        if (statusCallback) {
          const providerType = ('_websocket' in provider) ? 'WebSocket' : 'HTTP';
          statusCallback(true, providerType, {
            tokenDistribution: activeMonitors.tokenDistribution,
            learn2earn: activeMonitors.learn2earn,
            wallet: activeMonitors.wallet
          });
        }
        
        // Independente do callback, forçar a atualização do status global
        if (serverStatus && serverStatus.contractMonitoring) {
          serverStatus.contractMonitoring.initialized = true;
          serverStatus.contractMonitoring.tokenDistributionActive = activeMonitors.tokenDistribution;
          serverStatus.contractMonitoring.learn2earnActive = activeMonitors.learn2earn;
          serverStatus.contractMonitoring.walletMonitoringActive = activeMonitors.wallet;
        }
      }, 5000); // Esperar 5 segundos para garantir que os monitores tiveram tempo de iniciar
      
      try {
        logSystem.info('Sistema de monitoramento de contratos inicializado', {
          rpcUrl: 'Conexão estabelecida com sucesso',
          providerType: ('_websocket' in provider) ? 'WebSocket' : 'HTTP',
          contracts: {
            learn2earn: learn2earnAddress || 'não configurado',
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
        console.error("Erro ao registrar info no log:", logErr);
      }
    }).catch(error => {
      console.error(`Falha ao criar provider para monitoramento: ${error.message}`);
      try {
        logSystem.error(`Falha ao criar provider para monitoramento: ${error.message}`);
      } catch (logErr) {
        console.error("Erro ao registrar error no log:", logErr);
      }
      
      // Atualizar status global
      if (serverStatus && serverStatus.contractMonitoring) {
        serverStatus.contractMonitoring.initialized = false;
        serverStatus.contractMonitoring.errors.push(
          `Erro fatal ao inicializar monitoramento: ${error.message}`
        );
      }
      
      // Informar o callback que falhou
      if (statusCallback) {
        statusCallback(false, null, {
          tokenDistribution: false,
          learn2earn: false,
          wallet: false
        });
      }
    });
    
    // Define um tempo limite geral para o processo de inicialização
    setTimeout(() => {
      if (!isMonitoringInitialized) {
        console.error(`Tempo limite excedido para inicializar o monitoramento de contratos. O processo foi cancelado.`);
        try {
          logSystem.error(`Tempo limite excedido para inicializar o monitoramento de contratos. O processo foi cancelado.`);
        } catch (logErr) {
          console.error("Erro ao registrar error no log:", logErr);
        }
        
        // Atualizar status global
        if (serverStatus && serverStatus.contractMonitoring) {
          serverStatus.contractMonitoring.errors.push(
            'Timeout ao inicializar monitoramento. O processo foi cancelado.'
          );
        }
        
        // Informar o callback que falhou
        if (statusCallback) {
          statusCallback(false, null, {
            tokenDistribution: false,
            learn2earn: false,
            wallet: false
          });
        }
      }
    }, 45000); // 45 segundos para o timeout geral
    
  } catch (error: any) {
    console.error(`Erro ao inicializar monitoramento de contratos: ${error.message}`);
    try {
      logSystem.error(`Erro ao inicializar monitoramento de contratos: ${error.message}`);
    } catch (logErr: any) {
      console.error("Erro ao registrar error no log:", logErr);
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
    
    // Informar o callback que falhou
    if (statusCallback) {
      statusCallback(false, null, {
        tokenDistribution: false,
        learn2earn: false,
        wallet: false
      });
    }
  }
}

// Interface para o estado de monitoramento do contrato
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

// Função para obter o estado atual do monitoramento (usada no componente)
export async function getMonitoringState(): Promise<ContractMonitoringState> {
  try {
    // No lado do cliente, não temos acesso às variáveis de ambiente do servidor
    // Vamos fazer uma chamada para nossa API de diagnóstico
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
          // Só considerar ativo se não estiver em modo administrativo
          isTokenDistributionMonitoring = !!data.tokensConfig?.distributorAddress &&
            data.tokensConfig?.distributorAddress !== "Not configured" &&
            data.monitoringStatus?.tokenDistributionActive === true &&
            data.administrativeMode === false;
          // Usar APENAS dados reais da blockchain, sem simulação
          if (data.tokenDistribution) {
            const availableTokens = parseFloat(data.tokenDistribution.availableTokens) || 0;
            const totalDistributed = parseFloat(data.tokenDistribution.totalDistributed) || 0;
            
            // Apenas definir tokenDistributions se realmente houver tokens distribuídos
            if (totalDistributed > 0) {
              // Assumir que cada doação média é de 50 tokens para estimar o número de doadores
              // (essa é uma estimativa temporária, idealmente buscaríamos o número real de doadores)
              const estimatedDonors = Math.max(1, Math.ceil(totalDistributed / 50));
              
              tokenDistributions = {
                count: estimatedDonors,
                totalTokens: totalDistributed.toLocaleString('en-US')
              };
            }
          }
          
          // Adicionar erros do diagnóstico
          if (data.errors && data.errors.length > 0) {
            errors = [...data.errors];
          }
          
          // Obter status de monitoramento de outros serviços
          isLearn2EarnMonitoring = data.monitoringStatus?.learn2earnActive === true;
          isWalletMonitoring = data.monitoringStatus?.walletMonitoringActive === true;
          
        } else {
          console.error("Failed to fetch diagnostics data");
          errors.push("Falha ao obter dados de diagnóstico da API");
          // Fallback para verificações baseadas em localStorage apenas para status, sem dados simulados
          isTokenDistributionMonitoring = localStorage.getItem('TOKEN_DISTRIBUTOR_ADDRESS_CONFIGURED') === 'true';
        }
      } catch (err) {
        console.error("Error fetching monitoring data:", err);
        errors.push("Erro ao conectar com a API de diagnóstico");
        // Fallback para verificações baseadas em localStorage apenas para status, sem dados simulados
        isTokenDistributionMonitoring = localStorage.getItem('TOKEN_DISTRIBUTOR_ADDRESS_CONFIGURED') === 'true';
      }
    } else {
      // No lado do servidor, podemos verificar as variáveis de ambiente
      isLearn2EarnMonitoring = !!process.env.LEARN2EARN_CONTRACT_ADDRESS;
      isWalletMonitoring = !!process.env.SERVICE_WALLET_ADDRESS;
      isTokenDistributionMonitoring = !!process.env.TOKEN_DISTRIBUTOR_ADDRESS;
      
      // Armazenar em localStorage para que o cliente saiba da configuração
      if (typeof window !== 'undefined') {
        localStorage.setItem('TOKEN_DISTRIBUTOR_ADDRESS_CONFIGURED', isTokenDistributionMonitoring ? 'true' : 'false');
      }
    }
    
    return {
      isLearn2EarnMonitoring,
      isWalletMonitoring,
      isTokenDistributionMonitoring,
      // Learn2Earn e Wallet dados só existirão quando recebermos dados reais do sistema
      lastLearn2EarnEvent: undefined, // Removido dados simulados
      walletBalance: isWalletMonitoring ? "Waiting for data..." : undefined,
      // Apenas mostrar tokenDistributions se tiver dados reais
      tokenDistributions,
      errors
    };
  } catch (error: any) {
    console.error("Erro ao obter estado de monitoramento:", error);
    return {
      isLearn2EarnMonitoring: false,
      isWalletMonitoring: false,
      isTokenDistributionMonitoring: false,
      errors: [error.message || "Erro desconhecido ao obter estado"]
    };
  }
}