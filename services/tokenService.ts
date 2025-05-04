import { ethers } from 'ethers';
import { collection, addDoc, getDocs, query, where, doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { web3Service } from './web3Service';
// Import the service, but don't initialize it on the client
// We'll use API endpoints for server-side operations instead
let g33TokenDistributorService: any = null;

// Only import the service on the server side
if (typeof window === 'undefined') {
  try {
    g33TokenDistributorService = require('./g33TokenDistributorService').g33TokenDistributorService;
  } catch (error) {
    console.error('Failed to load distributor service on server side:', error);
  }
}

// Taxa de conversão: 1 token G33 por cada 1 USD doado
const TOKEN_RATE = 1;

// Informações sobre os tokens para distribuição
const TOKEN_INFO = {
  name: 'Gate33 Token',
  symbol: 'G33',
  totalSupply: 3300000, // 3.3 milhões de tokens
};

// Interface para registrar doação para distribuição de tokens
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
  error?: string;
}

// Solicitar preços atuais das criptomoedas da API interna
async function getCurrentCryptoPrices(): Promise<Record<string, number>> {
  try {
    // Verificar a conectividade antes de fazer a chamada
    const isOnline = navigator.onLine;
    if (!isOnline) {
      console.warn('Dispositivo offline, usando preços de fallback');
      throw new Error('Dispositivo offline');
    }
    
    // Solicitar os preços das principais criptomoedas que aceitamos para doação
    const response = await fetch('/api/cryptocurrencies?limit=10', {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      // Adicionar timeout
      signal: AbortSignal.timeout(5000) // 5 segundos de timeout
    });
    
    if (!response.ok) {
      throw new Error(`Falha ao obter preços de criptomoedas: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    
    // Criar um mapa de símbolo para preço em USD
    const priceMap: Record<string, number> = {};
    if (data && data.data) {
      data.data.forEach((crypto: any) => {
        priceMap[crypto.symbol.toLowerCase()] = crypto.current_price;
      });
    }
    
    // Adicionar fallback para os principais tokens
    if (!priceMap['eth']) priceMap['eth'] = 3500;
    if (!priceMap['btc']) priceMap['btc'] = 70000;
    if (!priceMap['usdt']) priceMap['usdt'] = 1;
    if (!priceMap['usdc']) priceMap['usdc'] = 1;
    
    return priceMap;
  } catch (error) {
    console.error('Erro ao obter preços de criptomoedas:', error);
    
    // Retornar preços de fallback para os principais tokens
    return {
      'eth': 3500,
      'btc': 70000,
      'usdt': 1,
      'usdc': 1,
      'bnb': 600
    };
  }
}

// Calcular valor em USD de uma doação em cripto
export async function calculateUSDValue(amount: string, cryptoSymbol: string): Promise<number> {
  try {
    const prices = await getCurrentCryptoPrices();
    const symbol = cryptoSymbol.toLowerCase();
    
    if (prices[symbol]) {
      const cryptoAmount = parseFloat(amount);
      return cryptoAmount * prices[symbol];
    }
    
    // Fallback: Se for uma stablecoin conhecida, assumir paridade com USD
    if (symbol === 'usdt' || symbol === 'usdc' || symbol === 'dai' || symbol === 'busd') {
      return parseFloat(amount);
    }
    
    throw new Error(`Preço não disponível para ${cryptoSymbol}`);
  } catch (error) {
    // Para stablecoins, sempre retornar o valor 1:1 mesmo com erros
    const symbol = cryptoSymbol.toLowerCase();
    if (symbol === 'usdt' || symbol === 'usdc' || symbol === 'dai' || symbol === 'busd') {
      return parseFloat(amount);
    }
    throw error;
  }
}

// Calcular quantos tokens G33 seriam distribuídos com base no valor em USD
export function calculateG33TokenAmount(usdValue: number): number {
  return usdValue * TOKEN_RATE;
}

/**
 * Registrar uma doação e processar distribuição de tokens G33
 * Usando API server-side para garantir acesso às variáveis de ambiente
 * @throws Error se a distribuição de tokens falhar
 */
export async function registerTokenDonation(
  donorAddress: string,
  donationAmount: number,
  cryptoSymbol: string,
  transactionHash: string,
  network: string
): Promise<{donationId: string, success: boolean, distributionTxHash?: string, error?: string}> {
  try {
    console.log(`Iniciando registro de doação: ${donationAmount} ${cryptoSymbol} de ${donorAddress}`);

    // Verificar se o ambiente está online
    if (!navigator.onLine) {
      throw new Error('Dispositivo offline. Por favor, verifique sua conexão com a internet.');
    }
    
    // Calcular valor em USD
    const usdValue = await calculateUSDValue(donationAmount.toString(), cryptoSymbol);
    console.log(`Valor em USD calculado: $${usdValue.toFixed(2)}`);
    
    // Calcular quantidade de tokens G33
    const tokenAmount = calculateG33TokenAmount(usdValue);
    console.log(`Tokens G33 a distribuir: ${tokenAmount}`);
    
    // Registrar localmente a doação para ter histórico mesmo se a API falhar
    const localDonation: TokenDonation = {
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
    
    try {
      // Registrar no Firebase como pendente antes de chamar a API
      const docRef = await addDoc(collection(db, 'tokenDonations'), localDonation);
      const donationId = docRef.id;
      
      console.log('Chamando API server-side para distribuição de tokens...');
      
      // Chamar a API server-side com timeout
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000); // 15 segundos
      
      try {
        const response = await fetch('/api/tokens/distribute', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            donorAddress,
            donationAmount,
            usdValue,
            tokenAmount,
            transactionHash,
            network,
            cryptoSymbol,
            donationId
          }),
          signal: controller.signal
        });
        
        clearTimeout(timeout);
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || `Erro ${response.status}: ${response.statusText}`);
        }
        
        const result = await response.json();
        
        // Atualizar status no Firebase
        await updateDoc(doc(db, 'tokenDonations', donationId), {
          status: 'distributed',
          distributionTxHash: result.transactionHash,
          updatedAt: new Date()
        });
        
        console.log(`Tokens distribuídos com sucesso: ${tokenAmount} G33. Hash da transação: ${result.transactionHash}`);
        return {
          donationId,
          success: true,
          distributionTxHash: result.transactionHash
        };
      } catch (fetchError: any) {
        clearTimeout(timeout);
        
        // Tratamento específico por tipo de erro
        if (fetchError.name === 'AbortError') {
          throw new Error('Tempo limite excedido ao conectar com o servidor');
        }
        
        // Se o servidor não está disponível, registrar, mas não falhar completamente
        await updateDoc(doc(db, 'tokenDonations', donationId), {
          status: 'failed',
          error: fetchError.message || 'Falha na comunicação com o servidor',
          updatedAt: new Date()
        });
        
        throw new Error(fetchError.message || 'Falha na comunicação com o servidor');
      }
    } catch (apiError: any) {
      console.error('Erro na API de distribuição de tokens:', apiError);
      
      // Verificar se é um erro de conexão/servidor
      if (apiError.message.includes('Failed to fetch') || 
          apiError.message.includes('NetworkError') ||
          apiError.message.includes('network') ||
          apiError.message.includes('offline') ||
          apiError.message.includes('ECONNREFUSED')) {
        throw new Error('Erro de conexão com o servidor. Verifique se o servidor está ativo e sua conexão com a internet.');
      }
      
      throw new Error(`Falha na distribuição de tokens: ${apiError.message}`);
    }
  } catch (error: any) {
    console.error('Erro ao registrar doação para tokens:', error);
    return {
      donationId: '',
      success: false,
      error: error.message || 'Erro desconhecido ao processar distribuição de tokens'
    };
  }
}

// Obter estatísticas de distribuição de tokens
export async function getTokenDistributionStats() {
  try {
    // On the client side, use the API instead of direct service call
    if (typeof window !== 'undefined') {
      try {
        const response = await fetch('/api/tokens/stats');
        if (!response.ok) {
          throw new Error('Failed to fetch token stats from API');
        }
        return await response.json();
      } catch (error) {
        console.error('Error fetching token stats via API:', error);
        return {
          totalSupply: TOKEN_INFO.totalSupply,
          totalDistributed: 0,
          availableForDistribution: TOKEN_INFO.totalSupply,
          totalDonationsUsd: 0,
          percentageDistributed: 0,
          isServiceAvailable: false
        };
      }
    }

    // Server-side execution with direct access to the service
    if (!g33TokenDistributorService || !g33TokenDistributorService.checkIsInitialized()) {
      return {
        totalSupply: TOKEN_INFO.totalSupply,
        totalDistributed: 0,
        availableForDistribution: TOKEN_INFO.totalSupply,
        totalDonationsUsd: 0,
        percentageDistributed: 0,
        isServiceAvailable: false
      };
    }
    
    const stats = await g33TokenDistributorService.getDistributionStats();
    
    return {
      totalSupply: TOKEN_INFO.totalSupply,
      totalDistributed: parseFloat(stats.totalDistributed),
      availableForDistribution: parseFloat(stats.availableTokens),
      totalDonationsUsd: parseFloat(stats.totalDonationsUsd),
      percentageDistributed: parseFloat(stats.totalDistributed) / TOKEN_INFO.totalSupply * 100,
      isServiceAvailable: true
    };
   } catch (error) {
    console.error('Erro ao obter estatísticas de distribuição:', error);
    return {
      totalSupply: TOKEN_INFO.totalSupply,
      totalDistributed: 0,
      availableForDistribution: TOKEN_INFO.totalSupply,
      totalDonationsUsd: 0,
      percentageDistributed: 0,
      isServiceAvailable: false
    };
  }
}

// Verificar se um doador já recebeu tokens
export async function getTokensDistributedToDonor(address: string): Promise<number> {
  try {
    // On the client side, use the API instead of direct service call
    if (typeof window !== 'undefined') {
      try {
        const response = await fetch(`/api/tokens/donor-stats?address=${encodeURIComponent(address)}`);
        if (!response.ok) {
          throw new Error('Failed to fetch donor token stats from API');
        }
        const data = await response.json();
        return data.tokensDistributed || 0;
      } catch (error) {
        console.error('Error fetching donor token stats via API:', error);
        return 0;
      }
    }

    // Server-side execution with direct access to the service
    if (!g33TokenDistributorService || !g33TokenDistributorService.checkIsInitialized()) {
      return 0;
    }
    
    const tokensStr = await g33TokenDistributorService.getTokensDistributedToDonor(address);
    return parseFloat(tokensStr);
  } catch (error) {
    console.error('Erro ao obter tokens distribuídos para doador:', error);
    return 0;
  }
}

export async function processDonationAndDistributeTokens(
  donorAddress: string,
  donationAmount: number,
  cryptoSymbol: string,
  transactionHash: string,
  network: string,
  waitForConfirmation: boolean = false
): Promise<{ success: boolean; distributionTxHash?: string; error?: string }> {
  try {
    console.log(`Iniciando processamento de doação: ${donationAmount} ${cryptoSymbol} de ${donorAddress}`);

    // Calcular valor em USD
    const usdValue = await calculateUSDValue(donationAmount.toString(), cryptoSymbol);
    console.log(`Valor em USD calculado: $${usdValue.toFixed(2)}`);

    // Calcular quantidade de tokens G33
    const tokenAmount = calculateG33TokenAmount(usdValue);
    console.log(`Tokens G33 a distribuir: ${tokenAmount}`);

    // Registrar localmente a doação no Firebase
    const donationRecord = {
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

    const docRef = await addDoc(collection(db, 'tokenDonations'), donationRecord);
    const donationId = docRef.id;

    // Use API endpoint on client side
    if (typeof window !== 'undefined') {
      const response = await fetch('/api/tokens/distribute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          donorAddress,
          donationAmount,
          usdValue,
          tokenAmount,
          transactionHash,
          network,
          cryptoSymbol,
          donationId,
          waitForConfirmation
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Error ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      
      // Update the Firebase record with the result
      await updateDoc(doc(db, 'tokenDonations', donationId), {
        status: result.success ? 'distributed' : 'failed',
        distributionTxHash: result.distributionTxHash || null,
        error: result.error || null,
        updatedAt: new Date()
      });

      return {
        success: result.success,
        distributionTxHash: result.distributionTxHash,
        error: result.error
      };
    }

    // Server-side execution with direct access to the service
    if (!g33TokenDistributorService || !g33TokenDistributorService.checkIsInitialized()) {
      throw new Error('Token distributor service is not available on the server');
    }

    // Usar o contrato inteligente diretamente para distribuir tokens
    console.log('Distribuindo tokens diretamente usando o contrato inteligente...');
    const distributionTxHash = await g33TokenDistributorService.distributeTokens(
      donorAddress, 
      usdValue,
      waitForConfirmation
    );

    if (!distributionTxHash) {
      throw new Error('Falha ao distribuir tokens usando o contrato inteligente.');
    }

    console.log(`Tokens distribuídos com sucesso. Hash da transação: ${distributionTxHash}`);

    // Atualizar o status no Firebase
    await updateDoc(doc(db, 'tokenDonations', donationId), {
      status: 'distributed',
      distributionTxHash,
      updatedAt: new Date()
    });

    return {
      success: true,
      distributionTxHash
    };
  } catch (error: any) {
    console.error('Erro ao processar doação e distribuir tokens:', error);
    return {
      success: false,
      error: error.message || 'Erro desconhecido ao processar doação.'
    };
  }
}

// Objeto do serviço exportado
export const tokenService = {
  calculateUSDValue,
  calculateG33TokenAmount,
  registerTokenDonation,
  getTokenDistributionStats,
  getTokensDistributedToDonor,
  processDonationAndDistributeTokens,
  TOKEN_INFO
};

export default tokenService;