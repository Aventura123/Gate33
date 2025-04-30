// File: app/api/cryptocurrencies/firebase-service.ts

import { firebase, db } from '../../../lib/firebase';
import { collection, doc, getDoc, getDocs, setDoc, query, where, orderBy, limit, Timestamp } from 'firebase/firestore';

// Interface para os dados de criptomoedas
export interface CryptoData {
  id: string;
  symbol: string;
  name: string;
  image: string;
  current_price: number;
  market_cap: number;
  market_cap_rank: number;
  fully_diluted_valuation: number | null;
  total_volume: number;
  high_24h: number;
  low_24h: number;
  price_change_24h: number;
  price_change_percentage_24h: number;
  market_cap_change_24h: number;
  market_cap_change_percentage_24h: number;
  circulating_supply: number;
  total_supply: number | null;
  max_supply: number | null;
  ath: number;
  ath_change_percentage: number;
  ath_date: string;
  atl: number;
  atl_change_percentage: number;
  atl_date: string;
  last_updated: string;
  price_change_percentage_1h_in_currency?: number;
  price_change_percentage_24h_in_currency?: number;
  price_change_percentage_7d_in_currency?: number;
}

// Interface para o registro de metadados das atualizações
interface UpdateRecord {
  timeframe: string;
  last_updated: Timestamp;
  source: string;
  count: number;
}

// Constantes para coleções no Firestore
const CRYPTO_COLLECTION = 'cryptocurrencies';
const METADATA_COLLECTION = 'crypto_metadata';
const UPDATE_DOC_ID = 'last_update';

/**
 * Salvar dados de criptomoedas no Firestore
 * @param cryptocurrencies Lista de criptomoedas para salvar
 * @param timeframe Período de tempo dos dados (24h, 7d, etc)
 */
export async function saveCryptocurrenciesToFirestore(
  cryptocurrencies: CryptoData[],
  timeframe: string = '24h'
): Promise<void> {
  try {
    console.log(`Salvando ${cryptocurrencies.length} criptomoedas no Firestore...`);
    
    // Batch updates seriam melhores para grandes volumes, mas para simplificar usaremos operações individuais
    for (const crypto of cryptocurrencies) {
      const docRef = doc(db, CRYPTO_COLLECTION, crypto.id);
      await setDoc(docRef, {
        ...crypto,
        timeframe,
        firebase_updated_at: Timestamp.now()
      }, { merge: true });
    }
    
    // Atualizar o registro de metadados
    const metadataRef = doc(db, METADATA_COLLECTION, UPDATE_DOC_ID);
    await setDoc(metadataRef, {
      [timeframe]: {
        last_updated: Timestamp.now(),
        source: 'coingecko',
        count: cryptocurrencies.length
      }
    }, { merge: true });
    
    console.log(`Dados de ${cryptocurrencies.length} criptomoedas salvos com sucesso`);
  } catch (error) {
    console.error('Erro ao salvar criptomoedas no Firestore:', error);
    throw error;
  }
}

/**
 * Buscar todas as criptomoedas do Firestore com filtros opcionais
 * @param options Opções para filtrar os resultados
 */
export async function getCryptocurrenciesFromFirestore({
  search = '',
  timeframe = '24h',
  limitCount = 50
}: {
  search?: string;
  timeframe?: string;
  limitCount?: number;
} = {}): Promise<{ data: CryptoData[]; lastUpdated: Date | null }> {
  try {
    console.log('Buscando criptomoedas do Firestore...');
    
    // Verificar se os dados estão atualizados
    const metadataRef = doc(db, METADATA_COLLECTION, UPDATE_DOC_ID);
    const metadataSnap = await getDoc(metadataRef);
    
    let lastUpdated: Date | null = null;
    
    if (metadataSnap.exists()) {
      const metadata = metadataSnap.data();
      if (metadata[timeframe]?.last_updated) {
        lastUpdated = metadata[timeframe].last_updated.toDate();
      }
    }
    
    // Criar query base
    let cryptoQuery = query(
      collection(db, CRYPTO_COLLECTION),
      orderBy('market_cap_rank')
    );
    
    // Executar a query
    const querySnapshot = await getDocs(cryptoQuery);
    
    // Processar resultados
    let results: CryptoData[] = [];
    
    querySnapshot.forEach((doc) => {
      const data = doc.data() as CryptoData;
      results.push(data);
    });
    
    // Aplicar filtros adicionais (search, limit) no lado do cliente
    // Idealmente, isso seria feito no lado do servidor, mas para simplificar faremos aqui
    if (search) {
      const searchLower = search.toLowerCase();
      results = results.filter(
        (crypto) =>
          crypto.name.toLowerCase().includes(searchLower) ||
          crypto.symbol.toLowerCase().includes(searchLower) ||
          crypto.id.toLowerCase().includes(searchLower)
      );
    }
    
    // Aplicar limite
    results = results.slice(0, limitCount);
    
    console.log(`Retornando ${results.length} criptomoedas do Firestore`);
    
    return {
      data: results,
      lastUpdated
    };
  } catch (error) {
    console.error('Erro ao buscar criptomoedas do Firestore:', error);
    throw error;
  }
}

/**
 * Buscar detalhes de uma criptomoeda específica do Firestore
 * @param coinId ID da criptomoeda
 */
export async function getCryptoDetailsFromFirestore(coinId: string): Promise<CryptoData | null> {
  try {
    console.log(`Buscando detalhes da criptomoeda ${coinId} do Firestore...`);
    
    const docRef = doc(db, CRYPTO_COLLECTION, coinId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return docSnap.data() as CryptoData;
    }
    
    console.log(`Criptomoeda ${coinId} não encontrada no Firestore`);
    return null;
  } catch (error) {
    console.error(`Erro ao buscar detalhes da criptomoeda ${coinId} do Firestore:`, error);
    throw error;
  }
}

/**
 * Verificar se os dados precisam ser atualizados (mais antigos que 30 minutos)
 * @param timeframe Período de tempo para verificar
 */
export async function shouldUpdateCryptoData(timeframe: string = '24h'): Promise<boolean> {
  try {
    const metadataRef = doc(db, METADATA_COLLECTION, UPDATE_DOC_ID);
    const metadataSnap = await getDoc(metadataRef);
    
    if (!metadataSnap.exists()) {
      console.log('Metadados não encontrados, atualização necessária');
      return true;
    }
    
    const metadata = metadataSnap.data();
    if (!metadata[timeframe]?.last_updated) {
      console.log(`Dados para timeframe ${timeframe} não encontrados, atualização necessária`);
      return true;
    }
    
    const lastUpdated = metadata[timeframe].last_updated.toDate();
    const now = new Date();
    const timeDiff = now.getTime() - lastUpdated.getTime();
    
    // Atualizar se os dados forem mais antigos que 30 minutos (1800000 ms)
    const shouldUpdate = timeDiff > 1800000;
    
    console.log(`Última atualização: ${lastUpdated.toISOString()}, precisa atualizar: ${shouldUpdate}`);
    return shouldUpdate;
  } catch (error) {
    console.error('Erro ao verificar necessidade de atualização dos dados:', error);
    // Em caso de erro, assumir que precisa atualizar
    return true;
  }
}