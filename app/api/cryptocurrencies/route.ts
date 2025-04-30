// File: app/api/cryptocurrencies/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { 
  getCryptocurrenciesFromFirestore, 
  getCryptoDetailsFromFirestore, 
  saveCryptocurrenciesToFirestore, 
  shouldUpdateCryptoData,
  CryptoData
} from './firebase-service';

const COINGECKO_API_URL = 'https://api.coingecko.com/api/v3';

// GET handler para buscar criptomoedas com filtros
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Extrair parâmetros da query
    const search = searchParams.get('search') || '';
    const timeframe = searchParams.get('timeframe') || '24h';
    const limit = Number(searchParams.get('limit')) || 50;
    const coinId = searchParams.get('id');
    const forceUpdate = searchParams.get('force') === 'true';

    // Se um ID específico for solicitado, retornar detalhes desse coin
    if (coinId) {
      return await getDetailedCoinData(coinId, forceUpdate);
    }
    
    // Buscar dados do Firebase
    const { data: firestoreData, lastUpdated } = await getCryptocurrenciesFromFirestore({
      search,
      timeframe,
      limitCount: limit
    });
    
    // Verificar se precisamos atualizar os dados do Firebase
    const needsUpdate = forceUpdate || await shouldUpdateCryptoData(timeframe) || firestoreData.length === 0;
    
    if (needsUpdate) {
      console.log('Dados precisam ser atualizados. Buscando da API do CoinGecko...');
      try {
        // Atualizar dados do CoinGecko e salvar no Firebase
        const freshData = await fetchFromCoinGecko(timeframe, limit);
        
        // Salvar os dados no Firebase de forma assíncrona (não aguardamos a conclusão)
        saveCryptocurrenciesToFirestore(freshData, timeframe)
          .then(() => console.log('Dados salvos no Firebase com sucesso'))
          .catch(err => console.error('Erro ao salvar dados no Firebase:', err));
        
        // Aplicar filtro de pesquisa se necessário
        let filteredData = freshData;
        if (search) {
          const searchLower = search.toLowerCase();
          filteredData = freshData.filter(
            (crypto) =>
              crypto.name.toLowerCase().includes(searchLower) ||
              crypto.symbol.toLowerCase().includes(searchLower) ||
              crypto.id.toLowerCase().includes(searchLower)
          );
        }
        
        // Retornar os dados frescos
        return NextResponse.json({
          data: filteredData.slice(0, limit),
          meta: {
            count: filteredData.length,
            timeframe,
            source: 'coingecko',
            fromCache: false
          },
        });
      } catch (coinGeckoError) {
        console.error('Erro ao buscar da API do CoinGecko:', coinGeckoError);
        
        // Se houver dados no Firebase, usá-los mesmo que desatualizados
        if (firestoreData.length > 0) {
          console.log('Usando dados do Firebase como fallback');
          return NextResponse.json({
            data: firestoreData,
            meta: {
              count: firestoreData.length,
              timeframe,
              source: 'firebase',
              lastUpdated,
              fallback: true,
              message: 'Usando dados em cache devido a erro na API externa'
            },
          });
        }
        
        // Se não houver dados no Firebase e a API falhar, retornar erro
        return NextResponse.json({ 
          error: 'Falha ao buscar dados de criptomoedas',
          details: 'API externa indisponível e sem dados em cache'
        }, { status: 503 });
      }
    }
    
    // Se não precisar atualizar, usar os dados do Firebase
    console.log('Usando dados atualizados do Firebase');
    return NextResponse.json({
      data: firestoreData,
      meta: {
        count: firestoreData.length,
        timeframe,
        source: 'firebase',
        lastUpdated
      },
    });
  } catch (error) {
    console.error('Erro na API de criptomoedas:', error);
    return NextResponse.json(
      { error: 'Falha ao buscar dados de criptomoedas' },
      { status: 500 }
    );
  }
}

// Função para buscar dados do CoinGecko
async function fetchFromCoinGecko(timeframe: string = '24h', limit: number = 50): Promise<CryptoData[]> {
  // Mapear timeframe para o parâmetro de porcentagem de mudança de preço do CoinGecko
  let priceChangePercentage = '24h';
  if (timeframe === '1h') priceChangePercentage = '1h';
  if (timeframe === '7d') priceChangePercentage = '7d';
  
  // Buscar dados do CoinGecko
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
    const errorText = await response.text();
    console.error('Erro na API do CoinGecko:', errorText);
    throw new Error(`Erro na API do CoinGecko: ${response.status} ${errorText}`);
  }
  
  return await response.json();
}

// Função para buscar detalhes de uma criptomoeda específica
async function getDetailedCoinData(coinId: string, forceUpdate: boolean = false) {
  try {
    // Tentar buscar do Firebase primeiro
    const cachedCoin = await getCryptoDetailsFromFirestore(coinId);
    
    // Se tiver no Firebase e não for forçada atualização, retornar dados em cache
    if (cachedCoin && !forceUpdate) {
      return NextResponse.json({
        data: cachedCoin,
        meta: {
          source: 'firebase',
          fromCache: true
        }
      });
    }
    
    // Buscar dados frescos da API
    try {
      const response = await fetch(
        `${COINGECKO_API_URL}/coins/${coinId}?localization=false&tickers=false&market_data=true&community_data=false&developer_data=false`,
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
      
      const coinData = await response.json();
      
      // Formatar os dados para nosso formato padrão
      const formattedData = {
        id: coinData.id,
        symbol: coinData.symbol,
        name: coinData.name,
        image: coinData.image?.large || coinData.image?.small,
        current_price: coinData.market_data?.current_price?.usd,
        market_cap: coinData.market_data?.market_cap?.usd,
        market_cap_rank: coinData.market_cap_rank,
        fully_diluted_valuation: coinData.market_data?.fully_diluted_valuation?.usd,
        total_volume: coinData.market_data?.total_volume?.usd,
        high_24h: coinData.market_data?.high_24h?.usd,
        low_24h: coinData.market_data?.low_24h?.usd,
        price_change_24h: coinData.market_data?.price_change_24h,
        price_change_percentage_24h: coinData.market_data?.price_change_percentage_24h,
        market_cap_change_24h: coinData.market_data?.market_cap_change_24h,
        market_cap_change_percentage_24h: coinData.market_data?.market_cap_change_percentage_24h,
        circulating_supply: coinData.market_data?.circulating_supply,
        total_supply: coinData.market_data?.total_supply,
        max_supply: coinData.market_data?.max_supply,
        ath: coinData.market_data?.ath?.usd,
        ath_change_percentage: coinData.market_data?.ath_change_percentage?.usd,
        ath_date: coinData.market_data?.ath_date?.usd,
        atl: coinData.market_data?.atl?.usd,
        atl_change_percentage: coinData.market_data?.atl_change_percentage?.usd,
        atl_date: coinData.market_data?.atl_date?.usd,
        last_updated: coinData.last_updated,
        description: coinData.description?.en,
        links: coinData.links,
        categories: coinData.categories,
        sentiment_votes_up_percentage: coinData.sentiment_votes_up_percentage,
        sentiment_votes_down_percentage: coinData.sentiment_votes_down_percentage,
      };
      
      // Salvar no Firebase de forma assíncrona
      saveCryptocurrenciesToFirestore([formattedData as CryptoData], '24h')
        .then(() => console.log(`Detalhes da criptomoeda ${coinId} salvos no Firebase`))
        .catch(err => console.error(`Erro ao salvar detalhes da criptomoeda ${coinId} no Firebase:`, err));
      
      return NextResponse.json({
        data: formattedData,
        meta: {
          source: 'coingecko',
          fromCache: false
        }
      });
    } catch (apiError) {
      console.error(`Erro ao buscar ${coinId} da API do CoinGecko:`, apiError);
      
      // Se temos dados em cache, retorná-los como fallback
      if (cachedCoin) {
        return NextResponse.json({
          data: cachedCoin,
          meta: {
            source: 'firebase',
            fromCache: true,
            fallback: true,
            message: 'Usando dados em cache devido a erro na API externa'
          }
        });
      }
      
      // Se não temos dados em cache e a API falhou, retornar erro
      if ((apiError as any).message?.includes('429')) {
        return NextResponse.json({ 
          error: 'Limite de taxa da API atingido',
          details: 'Limite de chamadas à API CoinGecko excedido. Tente novamente mais tarde.'
        }, { status: 429 });
      }
      
      return NextResponse.json({ 
        error: 'Falha ao buscar detalhes da criptomoeda',
        details: (apiError as Error).message
      }, { status: 503 });
    }
  } catch (error) {
    console.error(`Erro ao buscar detalhes para ${coinId}:`, error);
    return NextResponse.json(
      { error: 'Falha ao buscar detalhes da criptomoeda' },
      { status: 500 }
    );
  }
}

// POST handler para buscar dados de comparação para criptomoedas específicas
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { symbols = [], timeframe = '24h' } = body;
    
    if (!symbols.length) {
      return NextResponse.json(
        { error: 'É necessário pelo menos um símbolo de criptomoeda' },
        { status: 400 }
      );
    }
    
    // Buscar todas as criptomoedas do Firebase
    const { data: firestoreData, lastUpdated } = await getCryptocurrenciesFromFirestore({
      timeframe,
      limitCount: 250 // Limite maior para ter mais chances de encontrar todas as moedas solicitadas
    });
    
    // Filtrar para obter apenas as criptomoedas solicitadas
    const symbolsLower = symbols.map((s: string) => s.toLowerCase());
    const filteredData = firestoreData.filter((crypto) =>
      symbolsLower.includes(crypto.symbol.toLowerCase()) ||
      symbolsLower.includes(crypto.id.toLowerCase())
    );
    
    // Se encontramos todas as criptomoedas solicitadas no Firebase, retorná-las
    if (filteredData.length === symbols.length) {
      return NextResponse.json({
        data: filteredData,
        meta: {
          count: filteredData.length,
          timeframe,
          source: 'firebase',
          lastUpdated
        },
      });
    }
    
    // Se não encontramos todas, tentar buscar da API
    try {
      const freshData = await fetchFromCoinGecko(timeframe, 250);
      
      // Salvar dados no Firebase de forma assíncrona
      saveCryptocurrenciesToFirestore(freshData, timeframe)
        .then(() => console.log('Dados completos salvos no Firebase'))
        .catch(err => console.error('Erro ao salvar dados completos no Firebase:', err));
      
      // Filtrar para obter as criptomoedas solicitadas
      const filteredFreshData = freshData.filter((crypto) =>
        symbolsLower.includes(crypto.symbol.toLowerCase()) ||
        symbolsLower.includes(crypto.id.toLowerCase())
      );
      
      return NextResponse.json({
        data: filteredFreshData,
        meta: {
          count: filteredFreshData.length,
          timeframe,
          source: 'coingecko',
          fromCache: false
        },
      });
    } catch (apiError) {
      console.error('Erro ao buscar da API do CoinGecko para comparação:', apiError);
      
      // Se temos algumas criptomoedas no Firebase, retorná-las como fallback
      if (filteredData.length > 0) {
        return NextResponse.json({
          data: filteredData,
          meta: {
            count: filteredData.length,
            timeframe,
            source: 'firebase',
            lastUpdated,
            fallback: true,
            found: filteredData.length,
            requested: symbols.length,
            message: 'Dados parciais disponíveis devido a erro na API externa'
          },
        });
      }
      
      // Se não temos nada no Firebase e a API falhou, retornar erro
      return NextResponse.json({ 
        error: 'Falha ao buscar dados de comparação',
        details: 'API externa indisponível e sem dados em cache'
      }, { status: 503 });
    }
  } catch (error) {
    console.error('Erro na API de comparação de criptomoedas:', error);
    return NextResponse.json(
      { error: 'Falha ao buscar dados de comparação de criptomoedas' },
      { status: 500 }
    );
  }
}