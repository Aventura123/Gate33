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
 * Serviço para interagir com o contrato G33TokenDistributor
 * Este serviço gerencia a distribuição automática de tokens G33 para doadores
 */
class G33TokenDistributorService {
  private provider: ethers.providers.JsonRpcProvider | null = null;
  private wallet: ethers.Wallet | null = null;
  private contract: ethers.Contract | null = null;
  private distributorAddress: string | null = null;
  private isInitialized: boolean = false;
  private initializationError: string | null = null;
  private lastInitAttempt: number = 0;

  constructor() {
    // Inicialização assíncrona
    this.init();
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
      
      // Buscar configurações do contrato no Firebase
      const configDoc = await getDoc(doc(db, "settings", "contractConfig"));
      
      if (configDoc.exists()) {
        const config = configDoc.data();
        this.distributorAddress = config.tokenDistributorAddress;
        console.log(`Endereço do distribuidor obtido: ${this.distributorAddress}`);
        
        // Verificar a chave privada de duas formas: como variável de ambiente direta ou dentro de process.env
        let privateKey = process.env.DISTRIBUTOR_PRIVATE_KEY;
        
        // Verificação da presença da chave privada
        if (!privateKey) {
          throw new Error("Chave privada do distribuidor não encontrada nas variáveis de ambiente");
        }
        
        const rpcUrl = config.rpcUrl || process.env.RPC_URL || "https://polygon-rpc.com";
        console.log(`URL RPC a ser usada: ${rpcUrl}`);
        
        if (this.distributorAddress && privateKey) {
          // Configurar provider e wallet
          this.provider = new ethers.providers.JsonRpcProvider(rpcUrl);
          this.wallet = new ethers.Wallet(privateKey, this.provider);
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
            throw new Error(`Erro ao acessar funções do contrato: ${errorMessage}`);
          }
          
          return;
        } else {
          throw new Error(`Configurações incompletas: distribuidor=${!!this.distributorAddress}, chavePrivada=${!!privateKey}`);
        }
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