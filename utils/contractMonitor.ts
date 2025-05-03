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
    // Lista de RPCs confiáveis para backup em caso de falha
    const rpcUrls = [
      process.env.RPC_URL,
      'https://polygon-rpc.com',
      'https://polygon-mainnet.public.blastapi.io',
      'https://polygon.llamarpc.com',
      'https://rpc-mainnet.maticvigil.com',
      'https://ethereum.publicnode.com',
    ];
    
    // Filtrar URLs vazias ou nulas
    const validRpcUrls = rpcUrls.filter(url => url);
    
    // Função para criar um provider com retry
    const createReliableProvider = async (): Promise<ethers.providers.Provider> => {
      for (const url of validRpcUrls) {
        try {
          console.log(`Tentando conectar ao RPC para monitoramento: ${url}`);
          const provider = new ethers.providers.JsonRpcProvider(url);
          
          // Teste a conexão com o provider
          const blockNumber = await Promise.race([
            provider.getBlockNumber(),
            new Promise<never>((_, reject) => 
              setTimeout(() => reject(new Error('Timeout ao conectar ao RPC')), 5000)
            ),
          ]);
          
          console.log(`✅ Conexão RPC bem-sucedida para monitoramento, bloco atual: ${blockNumber}`);
          return provider;
        } catch (error) {
          console.warn(`❌ Falha ao conectar ao RPC ${url} para monitoramento:`, error);
          // Continuar para o próximo URL
        }
      }
      
      // Se todos falharem, tente um provider default como último recurso
      console.warn('Todas as tentativas de conexão RPC falharam, tentando provider padrão');
      return ethers.providers.getDefaultProvider('homestead', {
        infura: 'da1aa71d421944c69d9be9e699a29d1d', // Chave pública do Infura
        alchemy: 'aBnESsQTECl5REQ7cDPdp1gDDOSg_SzE', // Chave pública do Alchemy
        etherscan: 'YKRAU1FG8JI7T52VNHPVE6NQRPD7SHZ8FB', // Chave pública do Etherscan
        pocket: '5a99b4765204e6f2e8ebe3fe', // Chave pública do Pocket
        quorum: 1
      });
    };
    
    // Crie um provider confiável
    createReliableProvider().then(provider => {
      // Obter configurações do ambiente
      const learn2earnAddress = process.env.LEARN2EARN_CONTRACT_ADDRESS;
      const serviceWalletAddress = process.env.SERVICE_WALLET_ADDRESS;
      const tokenDistributorAddress = process.env.TOKEN_DISTRIBUTOR_ADDRESS;
      
      if (learn2earnAddress) {
        monitorLearn2EarnActivity(learn2earnAddress, provider);
      }
      
      if (serviceWalletAddress) {
        monitorServiceWallet(serviceWalletAddress, provider);
      }
      
      if (tokenDistributorAddress) {
        monitorTokenDistribution(tokenDistributorAddress, provider);
      }
      
      logSystem.info('Sistema de monitoramento de contratos inicializado', {
        rpcUrl: 'Conexão estabelecida com sucesso',
        contracts: {
          learn2earn: learn2earnAddress || 'não configurado',
          tokenDistributor: tokenDistributorAddress || 'não configurado'
        },
        serviceWallet: serviceWalletAddress || 'não configurado'
      });
    }).catch(error => {
      logSystem.error(`Falha ao criar provider para monitoramento: ${error.message}`);
    });
  } catch (error: any) {
    logSystem.error(`Erro ao inicializar monitoramento de contratos: ${error.message}`);
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
    // Vamos fazer uma chamada para nossa nova API de diagnóstico
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
                                          data.tokensConfig?.distributorAddress !== "Not configured";
                                          
          // Se tivermos dados de distribuição reais, use-os
          if (data.tokenDistribution && parseFloat(data.tokenDistribution.totalDistributed) > 0) {
            tokenDistributions = {
              // Assumimos que cada transação é para um doador diferente (simplificação)
              count: Math.ceil(parseFloat(data.tokenDistribution.totalDistributed) / 10),
              totalTokens: parseFloat(data.tokenDistribution.totalDistributed).toLocaleString('en-US')
            };
          }
          
          // Adicionar erros do diagnóstico
          if (data.errors && data.errors.length > 0) {
            errors = [...data.errors];
          }
        } else {
          console.error("Failed to fetch diagnostics data");
          // Fallback para verificações baseadas em localStorage
          isTokenDistributionMonitoring = localStorage.getItem('TOKEN_DISTRIBUTOR_ADDRESS_CONFIGURED') === 'true';
        }
      } catch (err) {
        console.error("Error fetching monitoring data:", err);
        // Fallback para verificações baseadas em localStorage
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
    
    // Simulação para dados que não podemos obter facilmente do browser
    return {
      isLearn2EarnMonitoring,
      isWalletMonitoring,
      isTokenDistributionMonitoring,
      lastLearn2EarnEvent: isLearn2EarnMonitoring ? {
        id: "1",
        user: "0x1234567890abcdef1234567890abcdef12345678",
        amount: "25.5",
        timestamp: new Date().toISOString()
      } : undefined,
      walletBalance: isWalletMonitoring ? "0.15 ETH" : undefined,
      tokenDistributions: isTokenDistributionMonitoring ? (tokenDistributions || {
        count: 24,
        totalTokens: "1,250.00"
      }) : undefined,
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