// File: app/api/cryptocurrencies/update-service.ts

import { 
  saveCryptocurrenciesToFirestore, 
  shouldUpdateCryptoData 
} from './firebase-service';

const COINGECKO_API_URL = 'https://api.coingecko.com/api/v3';

// Função para buscar dados do CoinGecko
async function fetchFromCoinGecko(timeframe: string = '24h', limit: number = 100) {
  // Mapear timeframe para o parâmetro de porcentagem de mudança de preço do CoinGecko
  let priceChangePercentage = '24h';
  if (timeframe === '1h') priceChangePercentage = '1h';
  if (timeframe === '7d') priceChangePercentage = '7d';
  
  // Buscar dados do CoinGecko
  try {
    const response = await fetch(
      `${COINGECKO_API_URL}/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=${limit}&page=1&sparkline=false&price_change_percentage=${priceChangePercentage}`,
      {
        headers: {
          'Accept': 'application/json',
        },
        cache: 'no-store',
      }
    );
    
    if (!response.ok) {
      throw new Error(`Erro na API do CoinGecko: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Erro ao buscar dados do CoinGecko:', error);
    throw error;
  }
}

// Função principal para atualizar dados de criptomoedas
export async function updateCryptoData() {
  console.log('Iniciando atualização periódica de dados de criptomoedas...');
  
  // Lista de timeframes a atualizar
  const timeframes = ['24h', '1h', '7d'];
  
  for (const timeframe of timeframes) {
    try {
      // Verificar se os dados para este timeframe precisam ser atualizados
      const needsUpdate = await shouldUpdateCryptoData(timeframe);
      
      if (needsUpdate) {
        console.log(`Atualizando dados para timeframe ${timeframe}...`);
        const data = await fetchFromCoinGecko(timeframe, 250);
        await saveCryptocurrenciesToFirestore(data, timeframe);
        console.log(`Dados para timeframe ${timeframe} atualizados com sucesso!`);
      } else {
        console.log(`Dados para timeframe ${timeframe} ainda estão atualizados, pulando...`);
      }
    } catch (error) {
      console.error(`Erro ao atualizar dados para timeframe ${timeframe}:`, error);
    }
  }
  
  console.log('Processo de atualização concluído!');
  return { success: true, timestamp: new Date().toISOString() };
}

// Exportar handler de API para rotas API que podem chamar manualmente a atualização
export async function handleUpdateRequest() {
  try {
    const result = await updateCryptoData();
    return { status: 200, body: result };
  } catch (error) {
    console.error('Erro no handler de atualização:', error);
    return { 
      status: 500, 
      body: { 
        error: 'Falha na atualização dos dados',
        message: (error as Error).message
      }
    };
  }
}