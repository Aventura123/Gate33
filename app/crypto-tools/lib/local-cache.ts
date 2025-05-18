// File: app/crypto-tools/lib/local-cache.ts
'use client';

/**
 * Utilitário para cache local de dados de criptomoedas
 * Substitui o armazenamento no Firebase por armazenamento local
 */

// Duração padrão do cache em minutos
const DEFAULT_CACHE_TTL = 30; 

// Chaves de cache para os diferentes tipos de dados
const CACHE_KEYS = {
  cryptoList: 'crypto_list_cache',
  cryptoDetails: 'crypto_details_cache',
  lastUpdate: 'crypto_last_update',
  timeframeData: (timeframe: string) => `crypto_${timeframe}_cache`,
};

/**
 * Verifica se os dados em cache estão expirados
 * @param key - Chave do cache para verificar
 * @param ttlMinutes - Tempo de vida em minutos
 * @returns Boolean indicando se o cache está expirado
 */
export function isCacheExpired(key: string, ttlMinutes: number = DEFAULT_CACHE_TTL): boolean {
  if (typeof window === 'undefined') return true;
  
  try {
    const lastUpdate = localStorage.getItem(`${key}_timestamp`);
    if (!lastUpdate) return true;
    
    const lastUpdateTime = parseInt(lastUpdate, 10);
    const now = Date.now();
    const expiryTime = lastUpdateTime + (ttlMinutes * 60 * 1000);
    
    return now > expiryTime;
  } catch (error) {
    console.error('Erro ao verificar expiração do cache:', error);
    return true;
  }
}

/**
 * Salva dados no cache local
 * @param key - Chave do cache
 * @param data - Dados para armazenar
 */
export function saveToCache<T>(key: string, data: T): void {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem(key, JSON.stringify(data));
    localStorage.setItem(`${key}_timestamp`, Date.now().toString());
  } catch (error) {
    console.error('Erro ao salvar no cache local:', error);
  }
}

/**
 * Recupera dados do cache local
 * @param key - Chave do cache
 * @returns Dados armazenados ou null se não encontrados
 */
export function getFromCache<T>(key: string): T | null {
  if (typeof window === 'undefined') return null;
  
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) as T : null;
  } catch (error) {
    console.error('Erro ao ler do cache local:', error);
    return null;
  }
}

/**
 * Limpa todos os dados de cache relacionados a criptomoedas
 */
export function clearCryptoCache(): void {
  if (typeof window === 'undefined') return;
  
  try {
    Object.values(CACHE_KEYS).forEach(key => {
      if (typeof key === 'string') {
        localStorage.removeItem(key);
        localStorage.removeItem(`${key}_timestamp`);
      }
    });
    
    // Limpar caches de timeframes específicos
    ['24h', '7d', '30d', '1y'].forEach(timeframe => {
      const key = CACHE_KEYS.timeframeData(timeframe);
      localStorage.removeItem(key);
      localStorage.removeItem(`${key}_timestamp`);
    });
  } catch (error) {
    console.error('Erro ao limpar cache:', error);
  }
}

export { CACHE_KEYS };
