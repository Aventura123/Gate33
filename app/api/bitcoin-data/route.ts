import { NextResponse } from 'next/server';

const API_KEY = process.env.CMC_API_KEY || 'b54bcf4d-1bca-4e8e-9a24-22ff2c3d462c'; // Chave demo
const CACHE_DURATION = 600; // 10 minutos em segundos

// Cache simples para armazenar dados em memory
const cache: { [key: string]: { data: any; timestamp: number } } = {};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type') || 'price';
  const days = searchParams.get('days') || '1';

  // Cache key baseada nos parâmetros
  const cacheKey = `${type}_${days}`;

  // Verificar se temos dados em cache ainda válidos
  const now = Math.floor(Date.now() / 1000);
  if (cache[cacheKey] && now - cache[cacheKey].timestamp < CACHE_DURATION) {
    return NextResponse.json(cache[cacheKey].data);
  }

  try {
    let data;

    // Rota para obter preço atual do BTC
    if (type === 'price') {
      const response = await fetch(
        'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd&include_24hr_change=true',
        { next: { revalidate: CACHE_DURATION } }
      );

      if (!response.ok) {
        throw new Error(`CoinGecko API error: ${response.status}`);
      }

      data = await response.json();
    } 
    // Rota para obter Fear & Greed Index
    else if (type === 'fear-greed') {
      const response = await fetch(
        'https://api.alternative.me/fng/?limit=1',
        { next: { revalidate: CACHE_DURATION } }
      );

      if (!response.ok) {
        throw new Error(`Fear & Greed API error: ${response.status}`);
      }

      data = await response.json();
    }
    // Rota para obter dados OHLC para os gráficos
    else if (type === 'ohlc') {
      const daysParam = parseInt(days as string) || 1;
      const response = await fetch(
        `https://api.coingecko.com/api/v3/coins/bitcoin/ohlc?vs_currency=usd&days=${daysParam}`,
        { next: { revalidate: CACHE_DURATION } }
      );

      if (!response.ok) {
        throw new Error(`CoinGecko OHLC API error: ${response.status}`);
      }

      data = await response.json();
    }

    // Armazenar no cache
    cache[cacheKey] = {
      data,
      timestamp: now
    };

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Bitcoin data API error:', error.message);
    
    // Se houver dados em cache, mesmo que antigos, usar em caso de falha na API
    if (cache[cacheKey]) {
      console.log('Using stale cache data after API failure');
      return NextResponse.json(cache[cacheKey].data);
    }
    
    return NextResponse.json(
      { error: 'Failed to fetch Bitcoin data', message: error.message },
      { status: 500 }
    );
  }
}
