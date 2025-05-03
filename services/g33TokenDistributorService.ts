import { ethers } from 'ethers';
import { collection, addDoc, getDocs, query, where, doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

// ABI simplificado do contrato G33TokenDistributor
const DISTRIBUTOR_ABI = [
  "function distributeTokens(address donor, uint256 donationAmountUsd) external",
  "function getAvailableTokens() external view returns (uint256)",
  "function tokensDistributed(address donor) external view returns (uint256)",
  "function totalDonated(address donor) external view returns (uint256)",
  "function totalDistributedTokens() external view returns (uint256)",
  "function totalDonationsUsd() external view returns (uint256)"
];

// Lista de URLs RPC confiáveis para a rede Polygon
const POLYGON_RPC_URLS = [
  // Endpoints WebSockets (WS) - podem contornar certas restrições de rede
  "wss://polygon-mainnet.g.alchemy.com/v2/demo", // Alchemy WS público
  "wss://ws-matic-mainnet.chainstacklabs.com",  // ChainStack WS
  
  // Endpoints HTTP padrão
  "https://polygon-rpc.com",
  "https://polygon.llamarpc.com",
  "https://rpc-mainnet.maticvigil.com",
  "https://polygon-mainnet.public.blastapi.io",
  "https://polygon-bor.publicnode.com",
  "https://polygon.meowrpc.com"
];

// Endpoints locais para desenvolvimento
const LOCAL_RPC_URLS = [
  "http://127.0.0.1:8545", // Ganache / Hardhat padrão
  "http://localhost:8545"  // Alternativo
];

// Configurações para o Infura (usando chave pública para teste)
const INFURA_POLYGON_RPC = "https://polygon-mainnet.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161";

// Interface para registro de doações
interface TokenDonation {
  donorAddress: string;
  donationAmount: number; // valor em cripto
  usdValue: number; // valor convertido para USD
  tokenAmount: number; // quantidade de tokens a serem distribuídos
  transactionHash: string;
  network: string;
  cryptoSymbol: string;
  createdAt: Date;
  status: 'pending' | 'distributed' | 'failed';
  distributionTxHash?: string;
  error?: string; // Campo adicional para armazenar mensagens de erro
}

/**
 * Verifica se a aplicação está em uma rede com acesso à internet limitado
 * e que precisa usar fallbacks especiais
 */
async function isRestrictedNetwork(): Promise<boolean> {
  try {
    // Tenta acessar uma URL externa conhecida
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);
    
    const response = await fetch('https://cloudflare.com', { 
      signal: controller.signal,
      method: 'HEAD'
    });
    clearTimeout(timeoutId);
    
    return !response.ok;
  } catch (error) {
    console.log('Detectada possível restrição de rede');
    return true;
  }
}

/**
 * Serviço para interagir com o contrato G33TokenDistributor
 * Este serviço gerencia a distribuição automática de tokens G33 para doadores
 */
class G33TokenDistributorService {
  private provider: ethers.providers.Provider | null = null;
  private wallet: ethers.Wallet | null = null;
  private contract: ethers.Contract | null = null;
  private distributorAddress: string | null = null;
  private isInitialized: boolean = false;
  private initializationError: string | null = null;
  private lastInitAttempt: number = 0;
  private isDevMode: boolean = process.env.NODE_ENV === 'development';
  private networkRestricted: boolean = false;

  constructor() {
    // Inicialização assíncrona
    this.init();
  }

  /**
   * Tenta criar um provider confiável para a rede Polygon com múltiplas tentativas
   * @returns Um provider conectado ou null se falhar
   */
  private async createReliablePolygonProvider(): Promise<ethers.providers.Provider | null> {
    try {
      // Verificar se estamos em uma rede restrita
      this.networkRestricted = await isRestrictedNetwork();
      
      // Lista final de URLs para tentar
      let urlsToTry = [...POLYGON_RPC_URLS];
      
      // Em redes restritas ou ambiente de desenvolvimento, adiciona endpoints locais
      if (this.networkRestricted || this.isDevMode) {
        console.log('Usando também endpoints locais (desenvolvimento/rede restrita)');
        urlsToTry = [...urlsToTry, ...LOCAL_RPC_URLS];
      }
      
      // Tentar cada URL RPC até encontrar uma que funcione
      for (const url of urlsToTry) {
        try {
          console.log(`Tentando conectar ao RPC: ${url}`);
          
          let provider: ethers.providers.Provider;
          
          // Diferentes tipos de conexão baseados na URL
          if (url.startsWith('wss://')) {
            // WebSockets provider
            provider = new ethers.providers.WebSocketProvider(url);
          } else {
            // JsonRpc provider padrão
            provider = new ethers.providers.JsonRpcProvider(url);
          }
          
          // Teste a conexão com o provider obtendo o número do bloco atual
          const blockNumber = await Promise.race([
            provider.getBlockNumber(),
            new Promise<number>((_, reject) => {
              setTimeout(() => reject(new Error('Timeout ao conectar ao RPC')), 5000);
            })
          ]);
          
          console.log(`✅ Conexão com RPC bem-sucedida via ${url}, bloco atual: ${blockNumber}`);
          return provider;
        } catch (error) {
          console.warn(`❌ Falha ao conectar ao RPC ${url}: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
          // Continuar para o próximo URL
        }
      }
      
      // Se estamos em modo de desenvolvimento, criar um provider simulado
      if (this.isDevMode) {
        console.log('📝 Criando provider simulado para desenvolvimento...');
        
        // Este provider não fará conexões reais, mas permitirá testes em ambientes sem blockchain
        const mockProvider = new ethers.providers.FallbackProvider([
          new ethers.providers.JsonRpcProvider('http://localhost:8545')
        ], 1);
        
        // Override do getBlockNumber para desenvolvimento
        const originalGetBlockNumber = mockProvider.getBlockNumber.bind(mockProvider);
        mockProvider.getBlockNumber = async function() {
          try {
            return await originalGetBlockNumber();
          } catch (error) {
            console.warn('Usando bloco simulado para desenvolvimento');
            return Promise.resolve(0);
          }
        };
        
        return mockProvider;
      }
      
      console.error('❌ Todas as tentativas de conexão à rede Polygon falharam');
      return null;
      
    } catch (error) {
      console.error('❌ Erro crítico ao criar provider:', error);
      return null;
    }
  }

  /**
   * Inicializa o serviço carregando configurações e conectando ao contrato
   */
  async init(): Promise<void> {
    try {
      // Evitar tentativas frequentes de inicialização
      const now = Date.now();
      if (this.lastInitAttempt > 0 && (now - this.lastInitAttempt) < 60000) {
        console.log("Tentativa de inicialização muito recente, aguardando antes de tentar novamente");
        return;
      }
      
      this.lastInitAttempt = now;
      this.initializationError = null;
      console.log("Iniciando G33TokenDistributorService...");
      
      // Buscar configurações do contrato no Firebase (apenas o endereço do contrato)
      const configDoc = await getDoc(doc(db, "settings", "contractConfig"));
      
      if (configDoc.exists()) {
        const config = configDoc.data();
        this.distributorAddress = config.tokenDistributorAddress;
        console.log(`Endereço do distribuidor obtido: ${this.distributorAddress}`);
        
        // Verificar a chave privada
        let privateKey = process.env.DISTRIBUTOR_PRIVATE_KEY;
        
        // No modo de desenvolvimento, podemos usar uma chave privada simulada se não houver uma real
        if (!privateKey && this.isDevMode) {
          privateKey = "0x0000000000000000000000000000000000000000000000000000000000000001"; // Chave simulada
          console.log("🔑 Usando chave privada simulada para desenvolvimento");
        } else if (!privateKey) {
          throw new Error("Chave privada do distribuidor não encontrada nas variáveis de ambiente");
        }
        
        // Configurar provider com mecanismo de retry para a rede Polygon
        const provider = await this.createReliablePolygonProvider();
        
        if (!provider) {
          if (this.isDevMode) {
            console.log("⚠️ Não foi possível conectar à blockchain. Operando em modo de desenvolvimento limitado.");
            this.isInitialized = true; // Em desenvolvimento, permitimos inicialização mesmo sem provider
            return;
          } else {
            throw new Error("Não foi possível estabelecer conexão com a rede Polygon. Verifique sua conexão com a internet.");
          }
        }
        
        this.provider = provider;
        // Adicionar operador '!' para garantir que TypeScript entenda que privateKey é uma string
        this.wallet = new ethers.Wallet(privateKey!, provider);
        const walletAddress = await this.wallet.getAddress();
        console.log(`Carteira do distribuidor configurada: ${walletAddress.substring(0, 6)}...${walletAddress.substring(walletAddress.length - 4)}`);
        
        // Conectar ao contrato
        this.contract = new ethers.Contract(this.distributorAddress, DISTRIBUTOR_ABI, this.wallet);
        
        // Verificar se o contrato está acessível
        try {
          const availableTokens = await this.contract.getAvailableTokens();
          console.log(`Contrato do distribuidor conectado com sucesso. Tokens disponíveis: ${ethers.utils.formatEther(availableTokens)}`);
          this.isInitialized = true;
        } catch (contractError: unknown) {
          const errorMessage = contractError instanceof Error 
            ? contractError.message
            : "Erro desconhecido ao acessar funções do contrato";
            
          // Em desenvolvimento, permitir inicialização mesmo com erro no contrato
          if (this.isDevMode) {
            console.warn(`⚠️ Erro ao acessar funções do contrato: ${errorMessage}`);
            console.log("⚠️ Continuando em modo de desenvolvimento limitado");
            this.isInitialized = true;
          } else {
            throw new Error(`Erro ao acessar funções do contrato: ${errorMessage}`);
          }
        }
        
        return;
      } else {
        throw new Error("Documento de configuração do contrato não encontrado no Firebase");
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
      this.initializationError = errorMessage;
      console.error("Erro ao inicializar G33TokenDistributorService:", errorMessage);
      this.isInitialized = false;
    }
  }

  /**
   * Verifica se o serviço está inicializado e pronto para uso
   * @returns Verdadeiro se o serviço estiver inicializado
   */
  private async ensureInitialized(): Promise<boolean> {
    if (this.isInitialized) return true;
    
    // Tentar inicializar novamente
    await this.init();
    return this.isInitialized;
  }

  /**
   * Distribui tokens G33 para um doador com base no valor da doação em USD
   * @param donorAddress Endereço do doador
   * @param usdValue Valor da doação em USD (número decimal)
   * @returns Hash da transação de distribuição ou null se falhar
   */
  async distributeTokens(donorAddress: string, usdValue: number): Promise<string | null> {
    try {
      if (!(await this.ensureInitialized())) {
        throw new Error(`Serviço não inicializado. Erro: ${this.initializationError || "Desconhecido"}`);
      }
      
      // No modo de desenvolvimento sem contrato real, simular distribuição
      if (this.isDevMode && (!this.contract || !this.provider)) {
        console.log(`🔶 [SIMULAÇÃO] Distribuindo ${usdValue} tokens G33 para ${donorAddress}`);
        return "0x" + [...Array(64)].map(() => Math.floor(Math.random() * 16).toString(16)).join('');
      }
      
      // Verificar se há tokens disponíveis
      const availableTokensWei = await this.contract!.getAvailableTokens();
      const availableTokens = parseFloat(ethers.utils.formatEther(availableTokensWei));
      const tokensNeeded = usdValue; // 1 token por 1 USD
      
      console.log(`Distribuição de tokens: ${tokensNeeded} tokens necessários, ${availableTokens} tokens disponíveis`);
      
      if (availableTokens < tokensNeeded) {
        throw new Error(`Tokens insuficientes no contrato distribuidor. Disponível: ${availableTokens}, Necessário: ${tokensNeeded}`);
      }
      
      // Converter valor USD para o formato esperado pelo contrato (multiplicado por 100 para precisão)
      const usdValueScaled = Math.floor(usdValue * 100);
      
      console.log(`Chamando contrato para distribuir tokens para ${donorAddress}: ${usdValue} USD (${usdValueScaled} scaled)`);
      
      // Chamar a função do contrato para distribuir tokens
      const tx = await this.contract!.distributeTokens(donorAddress, usdValueScaled);
      console.log(`Transação de distribuição iniciada: ${tx.hash}`);
      
      const receipt = await tx.wait(1);
      console.log(`Tokens G33 distribuídos para ${donorAddress}. Hash: ${receipt.transactionHash}`);
      return receipt.transactionHash;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
      console.error("Erro ao distribuir tokens G33:", errorMessage);
      return null;
    }
  }

  /**
   * Registra uma doação e distribui tokens G33 automaticamente
   * @param donorAddress Endereço do doador
   * @param donationAmount Valor doado em criptomoeda
   * @param usdValue Valor equivalente em USD
   * @param tokenAmount Quantidade de tokens a distribuir
   * @param transactionHash Hash da transação de doação
   * @param network Rede da doação
   * @param cryptoSymbol Símbolo da criptomoeda usada
   * @returns ID do documento no Firebase
   */
  async processDonation(
    donorAddress: string,
    donationAmount: number,
    usdValue: number,
    tokenAmount: number,
    transactionHash: string,
    network: string,
    cryptoSymbol: string
  ): Promise<string> {
    // Registrar a doação no Firebase
    const tokenDonation: TokenDonation = {
      donorAddress,
      donationAmount,
      usdValue,
      tokenAmount,
      transactionHash,
      network,
      cryptoSymbol,
      createdAt: new Date(),
      status: 'pending'
    };
    
    // Adicionar ao Firebase
    const docRef = await addDoc(collection(db, 'tokenDonations'), tokenDonation);
    
    // Tentar distribuir tokens automaticamente
    try {
      console.log(`Processando doação para distribuição de tokens: ${tokenAmount} G33 para ${donorAddress}`);
      
      // Verificar inicialização antes de tentar distribuir
      if (!(await this.ensureInitialized())) {
        throw new Error(`Serviço distribuidor não inicializado. Erro: ${this.initializationError || "Desconhecido"}`);
      }
      
      const distributionTxHash = await this.distributeTokens(donorAddress, usdValue);
      
      if (distributionTxHash) {
        // Atualizar o registro com o resultado da distribuição
        await updateDoc(docRef, {
          status: 'distributed',
          distributionTxHash
        });
        
        console.log(`Doação processada e tokens distribuídos com sucesso: ${tokenAmount} G33 para ${donorAddress}`);
      } else {
        // Distribuição falhou, mas o registro foi criado
        await updateDoc(docRef, {
          status: 'failed',
          error: 'Falha na distribuição automática de tokens'
        });
        
        console.log(`Registro de doação criado, mas distribuição de tokens falhou`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
      console.error("Erro ao processar distribuição de tokens:", errorMessage);
      
      // Atualizar status para falha
      await updateDoc(docRef, {
        status: 'failed',
        error: errorMessage
      });
    }
    
    return docRef.id;
  }

  /**
   * Obtém o total de tokens disponíveis para distribuição
   * @returns Quantidade de tokens disponíveis ou 0 se não for possível obter
   */
  async getAvailableTokens(): Promise<string> {
    try {
      if (!(await this.ensureInitialized())) {
        return "0";
      }
      
      const availableTokens = await this.contract!.getAvailableTokens();
      return ethers.utils.formatEther(availableTokens);
    } catch (error) {
      console.error("Erro ao obter tokens disponíveis:", error);
      return "0";
    }
  }

  /**
   * Obtém estatísticas de distribuição
   */
  async getDistributionStats() {
    try {
      if (!(await this.ensureInitialized())) {
        return {
          totalDistributed: "0",
          totalDonationsUsd: "0",
          availableTokens: "0"
        };
      }
      
      const [totalDistributed, totalDonationsUsd, availableTokens] = await Promise.all([
        this.contract!.totalDistributedTokens(),
        this.contract!.totalDonationsUsd(),
        this.contract!.getAvailableTokens()
      ]);
      
      return {
        totalDistributed: ethers.utils.formatEther(totalDistributed),
        // totalDonationsUsd é armazenado com 2 casas decimais extras (x100)
        totalDonationsUsd: (Number(totalDonationsUsd) / 100).toString(),
        availableTokens: ethers.utils.formatEther(availableTokens)
      };
    } catch (error) {
      console.error("Erro ao obter estatísticas de distribuição:", error);
      return {
        totalDistributed: "0",
        totalDonationsUsd: "0",
        availableTokens: "0"
      };
    }
  }

  /**
   * Obtém o total de tokens já distribuídos para um doador específico
   * @param donorAddress Endereço do doador
   */
  async getTokensDistributedToDonor(donorAddress: string): Promise<string> {
    try {
      if (!(await this.ensureInitialized())) {
        return "0";
      }
      
      const tokenAmount = await this.contract!.tokensDistributed(donorAddress);
      return ethers.utils.formatEther(tokenAmount);
    } catch (error) {
      console.error(`Erro ao obter tokens distribuídos para ${donorAddress}:`, error);
      return "0";
    }
  }
}

// Exportar a instância do serviço
export const g33TokenDistributorService = new G33TokenDistributorService();

// Atualizar o endereço do contrato distribuidor no Firebase
(async () => {
  try {
    const distributorAddress = "0x0726e207027cb4cffb28c3e65e90ec908916f38c"; // Endereço correto do contrato implantado
    await updateDoc(doc(db, "settings", "contractConfig"), {
      tokenDistributorAddress: distributorAddress
    });
    console.log("Endereço do contrato distribuidor atualizado no Firebase");
  } catch (err) {
    console.error("Erro ao atualizar endereço do contrato no Firebase:", err);
  }
})();

export default g33TokenDistributorService;