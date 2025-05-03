import { ethers } from 'ethers';
import { collection, addDoc, getDocs, query, where, doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { web3Service } from './web3Service';
import { g33TokenDistributorService } from './g33TokenDistributorService';

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
  status: 'pending' | 'minted';
}

// Solicitar preços atuais das criptomoedas da API interna
async function getCurrentCryptoPrices(): Promise<Record<string, number>> {
  try {
    // Solicitar os preços das principais criptomoedas que aceitamos para doação
    const response = await fetch('/api/cryptocurrencies?limit=10');
    
    if (!response.ok) {
      throw new Error('Falha ao obter preços de criptomoedas');
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
}

// Calcular quantos tokens G33 seriam distribuídos com base no valor em USD
export function calculateG33TokenAmount(usdValue: number): number {
  return usdValue * TOKEN_RATE;
}

// Registrar uma doação e processar distribuição de tokens G33
export async function registerTokenDonation(
  donorAddress: string,
  donationAmount: number,
  cryptoSymbol: string,
  transactionHash: string,
  network: string
): Promise<string> {
  try {
    // Calcular valor em USD
    const usdValue = await calculateUSDValue(donationAmount.toString(), cryptoSymbol);
    
    // Calcular quantidade de tokens G33
    const tokenAmount = calculateG33TokenAmount(usdValue);
    
    // Usar o distribuidor para processar a doação e enviar tokens automaticamente
    const donationId = await g33TokenDistributorService.processDonation(
      donorAddress,
      donationAmount,
      usdValue,
      tokenAmount,
      transactionHash,
      network,
      cryptoSymbol
    );
    
    console.log(`Doação registrada para distribuição de tokens: ${tokenAmount} G33`);
    return donationId;
  } catch (error) {
    console.error('Erro ao registrar doação para tokens:', error);
    throw error;
  }
}

// Obter estatísticas de distribuição de tokens
export async function getTokenDistributionStats() {
  try {
    const stats = await g33TokenDistributorService.getDistributionStats();
    
    return {
      totalSupply: TOKEN_INFO.totalSupply,
      totalDistributed: parseFloat(stats.totalDistributed),
      availableForDistribution: parseFloat(stats.availableTokens),
      totalDonationsUsd: parseFloat(stats.totalDonationsUsd),
      percentageDistributed: parseFloat(stats.totalDistributed) / TOKEN_INFO.totalSupply * 100
    };
  } catch (error) {
    console.error('Erro ao obter estatísticas de distribuição:', error);
    return {
      totalSupply: TOKEN_INFO.totalSupply,
      totalDistributed: 0,
      availableForDistribution: TOKEN_INFO.totalSupply,
      totalDonationsUsd: 0,
      percentageDistributed: 0
    };
  }
}

// Verificar se um doador já recebeu tokens
export async function getTokensDistributedToDonor(address: string): Promise<number> {
  try {
    const tokensStr = await g33TokenDistributorService.getTokensDistributedToDonor(address);
    return parseFloat(tokensStr);
  } catch (error) {
    console.error('Erro ao obter tokens distribuídos para doador:', error);
    return 0;
  }
}

// Objeto do serviço exportado
export const tokenService = {
  calculateUSDValue,
  calculateG33TokenAmount,
  registerTokenDonation,
  getTokenDistributionStats,
  getTokensDistributedToDonor,
  TOKEN_INFO
};

export default tokenService;