import { ethers } from 'ethers';
import { logSystem } from './logSystem';

// Configurações
const ALERT_THRESHOLD_ETH = 0.1;  // Alerta se o gasto for maior que este valor em ETH
const ALERT_THRESHOLD_TOKENS = 50; // Alerta se mais de 50 tokens forem distribuídos em uma única operação
const ADMIN_EMAIL = 'admin@gate33.com'; // Email para receber alertas

// Helper para enviar email
const sendEmail = async (to: string, subject: string, message: string): Promise<void> => {
  try {
    console.log(`Email enviado para ${to}: ${subject}`);
    // Implementação real do envio de email seria feita aqui
  } catch (error) {
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
    // ABI simplificado para o evento de distribuição de tokens
    const abi = [
      "event TokensDistributed(address indexed donor, uint256 tokenAmount, uint256 donationAmountUsd)"
    ];
    
    const contract = new ethers.Contract(contractAddress, abi, provider);
    
    // Configurar listener para eventos de distribuição
    contract.on('TokensDistributed', async (donor, tokenAmount, donationAmountUsd, event) => {
      const tokens = ethers.utils.formatEther(tokenAmount);
      const usdValue = donationAmountUsd.toNumber() / 100; // Convertendo de centavos para dólares
      
      // Registrar distribuição no sistema de logs
      await logSystem.tokenDistribution(donor, parseFloat(tokens), {
        transactionHash: event.transactionHash,
        usdValue,
        donationAmountUsd: usdValue
      });
      
      // Alertar se uma grande quantidade de tokens for distribuída
      if (parseFloat(tokens) > ALERT_THRESHOLD_TOKENS) {
        const message = `Grande distribuição de tokens G33 detectada!\n` +
                       `Doador: ${donor}\n` +
                       `Tokens: ${tokens} G33\n` +
                       `Valor da doação: $${usdValue.toFixed(2)} USD\n` +
                       `Hash da transação: ${event.transactionHash}`;
        
        // Registrar alerta com maior visibilidade
        await logSystem.warn(message, {
          contractAddress,
          donor,
          tokens: parseFloat(tokens),
          usdValue,
          transactionHash: event.transactionHash,
          alertType: 'large_distribution'
        });
      }
    });
    
    await logSystem.info(`Monitoramento de distribuição de tokens G33 iniciado para o contrato ${contractAddress}`);
  } catch (error: any) {
    await logSystem.error(`Erro ao configurar monitoramento de distribuição de tokens G33: ${error.message}`);
  }
}

// Inicializar monitoramento (chamar esta função ao iniciar o servidor)
export function initializeContractMonitoring(): void {
  try {
    // Importar o serverStatus dinamicamente para evitar problemas de importação circular
    const { serverStatus } = require('../lib/server-init');

    // Lista de RPCs confiáveis para backup em caso de falha
    const rpcUrls = [
      process.env.CUSTOM_POLYGON_RPC, // RPC personalizado (se configurado)
      
      // WebSockets - melhor performance para eventos em tempo real
      "wss://polygon-mainnet.g.alchemy.com/v2/demo",
      "wss://ws-matic-mainnet.chainstacklabs.com",
      
      // HTTP RPCs
      'https://polygon-rpc.com',
      'https://polygon-mainnet.public.blastapi.io',
      'https://polygon.llamarpc.com',
      'https://rpc-mainnet.maticvigil.com',
      'https://polygon-bor.publicnode.com',
      'https://polygon.meowrpc.com',
      
      // RPCs com APIs
      `https://polygon-mainnet.infura.io/v3/${process.env.INFURA_KEY || "9aa3d95b3bc440fa88ea12eaa4456161"}`,
      `https://polygon-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_KEY || "demo"}`,
    ];
    
    // Verificar e logar as chaves privadas disponíveis para diagnóstico
    console.log("Verificando chaves privadas disponíveis...");
    
    // Lista de possíveis variáveis de ambiente para a chave privada
    const possibleEnvKeys = [
      "OWNER_PRIVATE_KEY", // Alterado para primeiro lugar para ser priorizado
      "DISTRIBUTOR_PRIVATE_KEY",
      "PRIVATE_KEY_DISTRIBUTOR",
      "TOKEN_DISTRIBUTOR_KEY",
      "POLYGON_DISTRIBUTOR_KEY",
      "WALLET_PRIVATE_KEY",
      "PRIVATE_KEY"
    ];
    
    // Verificar cada possível variável de ambiente
    let foundKey = false;
    for (const keyName of possibleEnvKeys) {
      if (process.env[keyName]) {
        console.log(`✅ Chave privada encontrada na variável: ${keyName}`);
        foundKey = true;
        break;
      }
    }
    
    if (!foundKey) {
      console.error("❌ Nenhuma chave privada encontrada nas variáveis de ambiente. O monitoramento pode falhar.");
      // Adicionar erro ao status global
      if (serverStatus && serverStatus.contractMonitoring) {
        serverStatus.contractMonitoring.errors.push(
          'Nenhuma chave privada encontrada nas variáveis de ambiente'
        );
      }
    }
    
    // Filtrar URLs vazias ou nulas
    const validRpcUrls = rpcUrls.filter(url => url);
    
    // Variável para controlar o estado de execução
    let isMonitoringInitialized = false;
    let providerInitRetries = 0;
    const MAX_PROVIDER_RETRIES = 2; // Máximo de tentativas para inicializar o provider
    
    // Função para criar um provider com retry e limites
    const createReliableProvider = async (): Promise<ethers.providers.Provider | null> => {
      // Se já atingimos o número máximo de tentativas, não tentar novamente
      if (providerInitRetries >= MAX_PROVIDER_RETRIES) {
        console.warn(`Atingido o máximo de ${MAX_PROVIDER_RETRIES} tentativas para inicializar o provider. O monitoramento será desativado.`);
        
        // Atualizar status global
        if (serverStatus && serverStatus.contractMonitoring) {
          serverStatus.contractMonitoring.errors.push(
            `Atingido o limite máximo de ${MAX_PROVIDER_RETRIES} tentativas para conectar à blockchain.`
          );
        }
        
        return null;
      }
      
      providerInitRetries++;
      console.log(`Tentativa ${providerInitRetries}/${MAX_PROVIDER_RETRIES} para inicializar o provider`);
      
      // Primeiro tentar WebSockets, que são melhores para eventos
      const wsUrls = validRpcUrls.filter((url): url is string => typeof url === 'string' && url.startsWith('wss://'));
      
      for (const url of wsUrls) {
        try {
          console.log(`Tentando conectar ao WebSocket RPC para monitoramento: ${url}`);
          // Agora url é garantido como string pelo type guard no filter acima
          const provider = new ethers.providers.WebSocketProvider(url);
          
          // Teste a conexão com o provider
          const blockNumber = await Promise.race([
            provider.getBlockNumber(),
            new Promise<never>((_, reject) => 
              setTimeout(() => reject(new Error('Timeout ao conectar ao WebSocket RPC')), 8000)
            ),
          ]);
          
          console.log(`✅ Conexão WebSocket RPC bem-sucedida para monitoramento, bloco atual: ${blockNumber}`);
          
          // Atualizar status global
          if (serverStatus && serverStatus.contractMonitoring) {
            serverStatus.contractMonitoring.connectionType = "WebSocket";
          }
          
          return provider;
        } catch (error) {
          console.warn(`❌ Falha ao conectar ao WebSocket RPC ${url} para monitoramento:`, error);
        }
      }
      
      // Se WebSockets falharem, tente HTTP RPCs
      const httpUrls = validRpcUrls.filter((url): url is string => typeof url === 'string' && url.startsWith('http'));
      
      for (const url of httpUrls) {
        try {
          console.log(`Tentando conectar ao HTTP RPC para monitoramento: ${url}`);
          const provider = new ethers.providers.JsonRpcProvider(url);
          
          // Teste a conexão com o provider
          const blockNumber = await Promise.race([
            provider.getBlockNumber(),
            new Promise<never>((_, reject) => 
              setTimeout(() => reject(new Error('Timeout ao conectar ao HTTP RPC')), 8000)
            ),
          ]);
          
          console.log(`✅ Conexão HTTP RPC bem-sucedida para monitoramento, bloco atual: ${blockNumber}`);
          
          // Atualizar status global
          if (serverStatus && serverStatus.contractMonitoring) {
            serverStatus.contractMonitoring.connectionType = "HTTP";
          }
          
          return provider;
        } catch (error) {
          console.warn(`❌ Falha ao conectar ao HTTP RPC ${url} para monitoramento:`, error);
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
            setTimeout(() => reject(new Error('Timeout ao conectar com FallbackProvider')), 10000)
          ),
        ]);
        
        console.log(`✅ FallbackProvider conectado com sucesso, bloco atual: ${blockNumber}`);
        
        // Atualizar status global
        if (serverStatus && serverStatus.contractMonitoring) {
          serverStatus.contractMonitoring.connectionType = "FallbackProvider";
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
        logSystem.error('Não foi possível estabelecer conexão com nenhum provider. O monitoramento de contratos não será iniciado.');
        
        // Atualizar status global
        if (serverStatus && serverStatus.contractMonitoring) {
          serverStatus.contractMonitoring.initialized = false;
          serverStatus.contractMonitoring.errors.push(
            'Falha ao conectar com qualquer provider blockchain. O monitoramento não será iniciado.'
          );
        }
        
        return;
      }
      
      // Configurar manipuladores de eventos para reconexão automática
      if ('_websocket' in provider) {
        console.log('Configurando manipuladores de evento para o WebSocketProvider...');
        
        // Definir função de reconexão para WebSocketProvider
        const ws = (provider as any)._websocket;
        
        ws.onclose = () => {
          console.log('Conexão WebSocket fechada. Tentando reconectar em 10 segundos...');
          
          // Atualizar status global
          if (serverStatus && serverStatus.contractMonitoring) {
            serverStatus.contractMonitoring.errors.push(
              `Conexão WebSocket fechada em ${new Date().toISOString()}. Tentando reconectar...`
            );
          }
          
          // Tentar reconectar após 10 segundos
          setTimeout(() => {
            console.log('Reiniciando monitoramento devido à desconexão do WebSocket...');
            initializeContractMonitoring();
          }, 10000);
        };
      } else {
        // Para providers que não são WebSocket, configurar verificações periódicas
        const healthCheckInterval = setInterval(async () => {
          try {
            await provider.getBlockNumber();
            // Se a chamada acima não lançar exceção, o provider está funcionando
          } catch (error) {
            console.log('Falha na verificação de saúde do provider. Tentando reiniciar o monitoramento...');
            
            // Atualizar status global
            if (serverStatus && serverStatus.contractMonitoring) {
              serverStatus.contractMonitoring.errors.push(
                `Falha na verificação de saúde do provider em ${new Date().toISOString()}. Reiniciando monitoramento...`
              );
            }
            
            clearInterval(healthCheckInterval);
            initializeContractMonitoring();
          }
        }, 5 * 60 * 1000); // Verificar a cada 5 minutos
      }
      
      isMonitoringInitialized = true;
      
      // Obter configurações do ambiente
      const learn2earnAddress = process.env.LEARN2EARN_CONTRACT_ADDRESS;
      const serviceWalletAddress = process.env.SERVICE_WALLET_ADDRESS;
      const tokenDistributorAddress = process.env.TOKEN_DISTRIBUTOR_ADDRESS || 
                                      "0x137c762cb3eea5c8e5a6ed2fdf41dd47b5e13455"; // Endereço fixo como fallback
      
      // Rastrear quais monitores estão ativos
      const activeMonitors = {
        learn2earn: false,
        wallet: false,
        tokenDistribution: false
      };
      
      if (learn2earnAddress) {
        monitorLearn2EarnActivity(learn2earnAddress, provider);
        activeMonitors.learn2earn = true;
      }
      
      if (serviceWalletAddress) {
        monitorServiceWallet(serviceWalletAddress, provider);
        activeMonitors.wallet = true;
      }
      
      if (tokenDistributorAddress) {
        monitorTokenDistribution(tokenDistributorAddress, provider);
        activeMonitors.tokenDistribution = true;
      }
      
      // Atualizar status global
      if (serverStatus && serverStatus.contractMonitoring) {
        serverStatus.contractMonitoring.initialized = true;
        serverStatus.contractMonitoring.tokenDistributionActive = activeMonitors.tokenDistribution;
        serverStatus.contractMonitoring.learn2earnActive = activeMonitors.learn2earn;
        serverStatus.contractMonitoring.walletMonitoringActive = activeMonitors.wallet;
      }
      
      logSystem.info('Sistema de monitoramento de contratos inicializado', {
        rpcUrl: 'Conexão estabelecida com sucesso',
        providerType: ('_websocket' in provider) ? 'WebSocket' : 'HTTP',
        contracts: {
          learn2earn: learn2earnAddress || 'não configurado',
          tokenDistributor: tokenDistributorAddress || 'não configurado'
        },
        serviceWallet: serviceWalletAddress || 'não configurado'
      });
    }).catch(error => {
      logSystem.error(`Falha ao criar provider para monitoramento: ${error.message}`);
      
      // Atualizar status global
      if (serverStatus && serverStatus.contractMonitoring) {
        serverStatus.contractMonitoring.initialized = false;
        serverStatus.contractMonitoring.errors.push(
          `Erro fatal ao inicializar monitoramento: ${error.message}`
        );
      }
    });
    
    // Define um tempo limite geral para o processo de inicialização
    setTimeout(() => {
      if (!isMonitoringInitialized) {
        logSystem.error(`Tempo limite excedido para inicializar o monitoramento de contratos. O processo foi cancelado.`);
        
        // Atualizar status global
        if (serverStatus && serverStatus.contractMonitoring) {
          serverStatus.contractMonitoring.errors.push(
            'Timeout ao inicializar monitoramento. O processo foi cancelado.'
          );
        }
      }
    }, 30000); // 30 segundos para o timeout geral
    
  } catch (error: any) {
    logSystem.error(`Erro ao inicializar monitoramento de contratos: ${error.message}`);
    
    // Atualizar status global
    try {
      const { serverStatus } = require('../lib/server-init');
      if (serverStatus && serverStatus.contractMonitoring) {
        serverStatus.contractMonitoring.initialized = false;
        serverStatus.contractMonitoring.errors.push(
          `Erro ao inicializar monitoramento: ${error.message}`
        );
      }
    } catch (importError) {
      // Ignorar erro de importação
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
          
          // Atualizar estado com base nos dados reais
          isTokenDistributionMonitoring = !!data.tokensConfig?.distributorAddress && 
                                          data.tokensConfig?.distributorAddress !== "Not configured" &&
                                          data.monitoringStatus?.tokenDistributionMonitoring === true;
          
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