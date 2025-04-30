'use client';

import React, { useState, useEffect, useMemo } from 'react';
import ApexCharts from 'react-apexcharts';

// Interfaces for improved typing
interface BitcoinICTChartProps {
  timeframe: string;
  interval: string;
  onTrendUpdate: (timeframe: string, trend: string) => void;
}

interface CandleData {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
}

interface EmaData {
  time: number;
  value: number;
}

interface MacdData {
  macdLine: EmaData[];
  signalLine: EmaData[];
  histogram: EmaData[];
}

interface KeyLevel {
  price: number;
  type: 'support' | 'resistance' | 'order_block';
  description: string;
  timeframe: string;
}

const BitcoinICTChart: React.FC<BitcoinICTChartProps> = ({ timeframe, interval, onTrendUpdate }) => {
  const [chartData, setChartData] = useState<any[]>([]);
  const [chartOptions, setChartOptions] = useState<any>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [keyLevels, setKeyLevels] = useState<KeyLevel[]>([]);
  const [cachedData, setCachedData] = useState<Record<string, CandleData[]>>({}); // Cache local

  // Load data immediately when component mounts, regardless of timeframe selection
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);

      try {
        if (cachedData[interval]) {
          processChartData(cachedData[interval]);
          setIsLoading(false);
          return;
        }

        const data = await fetchBitcoinData(interval);

        if (!data || data.length === 0) {
          throw new Error('No valid data received from API');
        }

        setCachedData((prev) => ({ ...prev, [interval]: data }));
        processChartData(data);
      } catch (error) {
        console.error('Error fetching Bitcoin data:', error);
        setError('Error loading data. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [interval]);

  const processChartData = (data: CandleData[]) => {
    // Process data for ApexCharts
    const seriesData = data.map((item: CandleData) => ({
      x: new Date(item.time),
      y: [item.open, item.high, item.low, item.close],
    }));

    const ema5 = calculateEMA(data, 5);
    const ema21 = calculateEMA(data, 21);
    const macd = calculateMACD(data, 26, 55, 9);

    // Certifique-se de que `levels` está definido corretamente
    const levels = identifyICTKeyLevels(data, interval);
    setKeyLevels(levels);

    // Use o método avançado de análise de tendência em múltiplos timeframes
    const trend = advancedMultiTimeframeTrendAnalysis(data, ema5, ema21, macd, interval);

    // Log para debug
    console.log(`${timeframe} trend: ${trend} [EMA5: ${ema5[ema5.length - 1].value.toFixed(2)}, EMA21: ${ema21[ema21.length - 1].value.toFixed(2)}, MACD: ${macd.macdLine[macd.macdLine.length - 1].value.toFixed(2)}, Signal: ${macd.signalLine[macd.signalLine.length - 1].value.toFixed(2)}]`);

    // Atualiza a tendência para o componente pai
    onTrendUpdate(timeframe, trend);

    // Defina apenas os dados de candlestick, ocultando os indicadores EMA e MACD
    setChartData([
      { name: 'Bitcoin', type: 'candlestick', data: seriesData },
    ]);

    // Use `levels` para configurar as anotações no gráfico
    setChartOptions({
      chart: {
        type: 'candlestick',
        height: 550,
        toolbar: {
          show: true,
          tools: {
            download: true,
            selection: true,
            zoom: true,
            zoomin: true,
            zoomout: true,
            pan: true,
          },
          autoSelected: 'zoom',
        },
        animations: {
          enabled: false,
        },
        background: 'transparent',
      },
      plotOptions: {
        candlestick: {
          colors: {
            upward: '#22c55e',
            downward: '#ef4444',
          },
          wick: {
            useFillColor: true,
          },
        },
      },
      xaxis: {
        type: 'datetime',
        labels: {
          style: {
            colors: '#cbd5e1',
          },
        },
        axisBorder: {
          show: true,
          color: '#334155',
        },
        axisTicks: {
          show: true,
          color: '#334155',
        },
      },
      yaxis: {
        tooltip: {
          enabled: true,
        },
        labels: {
          style: {
            colors: '#cbd5e1',
          },
          formatter: function (val: number) {
            return '$' + val.toFixed(0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
          },
        },
      },
      grid: {
        borderColor: '#334155',
        xaxis: {
          lines: {
            show: true,
          },
        },
      },
      tooltip: {
        theme: 'dark',
        x: {
          format: 'dd MMM HH:mm',
        },
      },
      theme: {
        mode: 'dark',
      },
      annotations: {
        yaxis: levels.map((level: KeyLevel) => ({
          y: level.price,
          borderColor:
            level.type === 'support'
              ? '#22c55e'
              : level.type === 'resistance'
              ? '#ef4444'
              : '#fb923c',
          borderWidth: 2,
          strokeDashArray: level.type === 'order_block' ? 5 : 0,
          label: {
            borderColor:
              level.type === 'support'
                ? '#22c55e'
                : level.type === 'resistance'
                ? '#ef4444'
                : '#fb923c',
            style: {
              fontSize: '10px',
              color: '#fff',
              background:
                level.type === 'support'
                  ? '#22c55e'
                  : level.type === 'resistance'
                  ? '#ef4444'
                  : '#fb923c',
            },
            text: `${level.description} (${level.timeframe})`,
          },
        })),
      },
    });
  };

  return (
    <div className="h-full w-full relative">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-10">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#fb923c]"></div>
        </div>
      )}

      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-10">
          <div className="bg-red-900/70 p-4 rounded-lg text-white text-center">
            <p className="font-bold mb-2">Error</p>
            <p>{error}</p>
            <button
              className="mt-4 px-4 py-2 bg-[#fb923c] rounded hover:bg-[#f97316] transition-colors"
              onClick={() => window.location.reload()}
            >
              Try Again
            </button>
          </div>
        </div>
      )}

      {chartData.length > 0 && !isLoading && !error ? (
        <ApexCharts options={chartOptions} series={chartData} type="candlestick" height={550} />
      ) : !isLoading && !error ? (
        <div className="flex items-center justify-center h-full">
          <p className="text-gray-400">No data available</p>
        </div>
      ) : null}
    </div>
  );
};

// Função para buscar dados OHLC via proxy local e fallback Moralis
const fetchBitcoinData = async (interval: string): Promise<CandleData[]> => {
  // Mapeamento de intervalos para 'days'
  let days = '1';
  if (interval === '15') days = '1';
  else if (interval === '1H') days = '7';
  else if (interval === '4H') days = '30';
  else if (interval === '1D') days = '90';
  else if (interval === '1W') days = '365';

  // 1. Tente buscar do seu endpoint local (Next.js API route)
  try {
    const response = await fetch(`/api/bitcoin-data?type=ohlc&days=${days}`);
    if (response.ok) {
      const apiData = await response.json();
      // Se vier { data: [...] }, use data.data, senão use direto
      const jsonData = apiData.data ? apiData.data : apiData;
      return jsonData.map((item: any) => ({
        time: item[0],
        open: item[1],
        high: item[2],
        low: item[3],
        close: item[4]
      }));
    }
  } catch (e) {
    // Continua para fallback
  }

  // 2. Fallback: buscar do Moralis (https://deep-index.moralis.io/api/v2/market-data/ohlcv/...)
  try {
    // Atualize a chave do Moralis diretamente no código
    const apiKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJub25jZSI6Ijg0YmNhNmUzLWViOTEtNDAwMi1iN2IzLTg2NzU3NGE0NDM5ZSIsIm9yZ0lkIjoiNDQ0MTYxIiwidXNlcklkIjoiNDU2OTg2IiwidHlwZUlkIjoiNDg1MTZkNTEtZGU0NS00MGZmLTkxOWEtYjRjMDYxMjk2YjU5IiwidHlwZSI6IlBST0pFQ1QiLCJpYXQiOjE3NDU3NzIwMTcsImV4cCI6NDkwMTUzMjAxN30.x1rpqZUbQczrAzd3LEGHF1oYbcZygSxSOq2lL33OY2c';

    // Moralis só aceita alguns intervalos: 1m, 5m, 15m, 1h, 4h, 1d, 1w
    let moralisInterval = '1d';
    if (interval === '15') moralisInterval = '15m';
    else if (interval === '1H') moralisInterval = '1h';
    else if (interval === '4H') moralisInterval = '4h';
    else if (interval === '1D') moralisInterval = '1d';
    else if (interval === '1W') moralisInterval = '1w';

    // Exemplo de endpoint Moralis para BTC/USD (ver docs Moralis)
    const url = `https://deep-index.moralis.io/api/v2/market-data/ohlcv/spot/bitcoin_usd/${moralisInterval}?limit=100`;

    const response = await fetch(url, {
      headers: {
        'accept': 'application/json',
        'X-API-Key': apiKey
      }
    });

    if (response.ok) {
      const moralisData = await response.json();
      // moralisData.result é um array de candles
      return moralisData.result.map((item: any) => ({
        time: new Date(item.t).getTime(),
        open: Number(item.o),
        high: Number(item.h),
        low: Number(item.l),
        close: Number(item.c)
      }));
    }
  } catch (e) {
    console.error('Erro ao buscar dados do Moralis:', e);
    // Continua para fallback localStorage/mock
  }

  // 3. Fallback: localStorage ou mock
  try {
    const cachedData = localStorage.getItem(`bitcoin_data_${interval}`);
    const cachedTimestamp = localStorage.getItem(`bitcoin_data_${interval}_timestamp`);
    if (cachedData && cachedTimestamp) {
      const cacheAge = Date.now() - parseInt(cachedTimestamp);
      if (cacheAge < 3600000) {
        return JSON.parse(cachedData);
      }
    }
  } catch (e) {}

  // 4. Mock
  return generateMockBitcoinData(interval);
};

// Generate realistic mock Bitcoin data when API fails
const generateMockBitcoinData = (interval: string): CandleData[] => {
  const now = new Date();
  const candles: CandleData[] = [];
  
  // Determine parameters based on timeframe
  let candleCount = 0;
  let timeIncrement = 0;
  let basePrice = 63500; // Starting price around current Bitcoin value
  const volatility = 0.02; // 2% price movement
  
  if (interval === '15') {
    candleCount = 96; // 24 hours of 15-min candles
    timeIncrement = 15 * 60 * 1000; // 15 minutes in ms
  } else if (interval === '1H') {
    candleCount = 168; // 7 days of hourly candles
    timeIncrement = 60 * 60 * 1000; // 1 hour in ms
  } else if (interval === '4H') {
    candleCount = 180; // 30 days of 4-hour candles
    timeIncrement = 4 * 60 * 60 * 1000; // 4 hours in ms
  } else if (interval === '1D') {
    candleCount = 90; // 90 days
    timeIncrement = 24 * 60 * 60 * 1000; // 1 day in ms
  } else if (interval === '1W') {
    candleCount = 52; // 52 weeks
    timeIncrement = 7 * 24 * 60 * 60 * 1000; // 1 week in ms
  }
  
  // Create a timestamp for the start time
  let time = now.getTime() - (timeIncrement * candleCount);
  
  // Add a realistic trend with some randomness
  for (let i = 0; i < candleCount; i++) {
    // Random price movement with slight upward bias
    const movement = (Math.random() - 0.48) * volatility;
    basePrice = basePrice * (1 + movement);
    
    // Create realistic OHLC data
    const open = basePrice;
    const close = basePrice * (1 + (Math.random() - 0.5) * 0.005);
    const high = Math.max(open, close) * (1 + Math.random() * 0.005);
    const low = Math.min(open, close) * (1 - Math.random() * 0.005);
    
    candles.push({
      time,
      open,
      high,
      low,
      close
    });
    
    // Move to next candle time
    time += timeIncrement;
  }
  
  return candles;
};

// Calculate EMA (Exponential Moving Average)
const calculateEMA = (data: CandleData[], period: number): EmaData[] => {
  const k = 2 / (period + 1);
  let ema = data[0].close;
  const emaData: EmaData[] = [];
  
  for (let i = 0; i < data.length; i++) {
    ema = (data[i].close - ema) * k + ema;
    emaData.push({
      time: data[i].time,
      value: ema
    });
  }
  
  return emaData;
};

// Calculate MACD (fallback to standard MACD if Chris Moody settings are unavailable)
const calculateMACD = (data: CandleData[], fastPeriod = 12, slowPeriod = 26, signalPeriod = 9): MacdData => {
  // Calculate EMAs
  const fastEMA = calculateEMA(data, fastPeriod);
  const slowEMA = calculateEMA(data, slowPeriod);

  // MACD Line = Fast EMA - Slow EMA
  const macdLine: EmaData[] = [];
  for (let i = 0; i < data.length; i++) {
    if (i < fastEMA.length && i < slowEMA.length) {
      macdLine.push({
        time: data[i].time,
        value: fastEMA[i].value - slowEMA[i].value
      });
    }
  }

  // Signal Line = EMA of MACD Line
  let signalEMA = macdLine[0]?.value || 0;
  const k = 2 / (signalPeriod + 1);
  const signalLine: EmaData[] = [];

  for (let i = 0; i < macdLine.length; i++) {
    signalEMA = (macdLine[i].value - signalEMA) * k + signalEMA;
    signalLine.push({
      time: macdLine[i].time,
      value: signalEMA
    });
  }

  // Histogram = MACD Line - Signal Line
  const histogram: EmaData[] = [];
  for (let i = 0; i < macdLine.length; i++) {
    if (i < signalLine.length) {
      histogram.push({
        time: macdLine[i].time,
        value: macdLine[i].value - signalLine[i].value
      });
    }
  }

  return { macdLine, signalLine, histogram };
};

// Identify ICT key levels (support, resistance and order blocks)
const identifyICTKeyLevels = (data: CandleData[], interval: string): KeyLevel[] => {
  if (data.length < 20) return [];
  
  const levels: KeyLevel[] = [];
  const timeframeLabel = 
    interval === '15' ? '15min' : 
    interval === '1H' ? '1H' : 
    interval === '4H' ? '4H' : 
    interval === '1D' ? '1D' : '1W';
  
  // Look back window depends on timeframe
  const lookbackPeriod = 
    interval === '15' ? 96 : // 24 hours (4 candles per hour)
    interval === '1H' ? 24 : // 24 hours
    interval === '4H' ? 30 : // 5 days
    interval === '1D' ? 30 : // 30 days
    14; // 14 weeks
  
  const recentData = data.slice(-Math.min(lookbackPeriod, data.length));
  
  // Find swing highs (potential resistance)
  for (let i = 2; i < recentData.length - 2; i++) {
    if (recentData[i].high > recentData[i-1].high && 
        recentData[i].high > recentData[i-2].high && 
        recentData[i].high > recentData[i+1].high && 
        recentData[i].high > recentData[i+2].high) {
      
      // Check if this is a significant level (not too close to another)
      const isUnique = !levels.some(level => 
        Math.abs(level.price - recentData[i].high) / recentData[i].high < 0.01
      );
      
      if (isUnique) {
        levels.push({
          price: recentData[i].high,
          type: 'resistance',
          description: 'Resistance',
          timeframe: timeframeLabel
        });
      }
    }
  }
  
  // Find swing lows (potential support)
  for (let i = 2; i < recentData.length - 2; i++) {
    if (recentData[i].low < recentData[i-1].low && 
        recentData[i].low < recentData[i-2].low && 
        recentData[i].low < recentData[i+1].low && 
        recentData[i].low < recentData[i+2].low) {
      
      // Check if this is a significant level (not too close to another)
      const isUnique = !levels.some(level => 
        Math.abs(level.price - recentData[i].low) / recentData[i].low < 0.01
      );
      
      if (isUnique) {
        levels.push({
          price: recentData[i].low,
          type: 'support',
          description: 'Support',
          timeframe: timeframeLabel
        });
      }
    }
  }
  
  // Identify potential ICT order blocks (strong rejection candles)
  for (let i = 1; i < recentData.length - 1; i++) {
    const currentCandle = recentData[i];
    const nextCandle = recentData[i+1];
    
    // Bullish order block: candle with strong move down followed by reversal up
    if (currentCandle.close < currentCandle.open && 
        Math.abs(currentCandle.close - currentCandle.open) / currentCandle.open > 0.005 &&
        nextCandle.close > nextCandle.open &&
        nextCandle.close > currentCandle.close) {
      
      levels.push({
        price: (currentCandle.open + currentCandle.close) / 2,
        type: 'order_block',
        description: 'Bullish OB',
        timeframe: timeframeLabel
      });
    }
    
    // Bearish order block: candle with strong move up followed by reversal down
    if (currentCandle.close > currentCandle.open && 
        Math.abs(currentCandle.close - currentCandle.open) / currentCandle.open > 0.005 &&
        nextCandle.close < nextCandle.open &&
        nextCandle.close < currentCandle.close) {
      
      levels.push({
        price: (currentCandle.open + currentCandle.close) / 2,
        type: 'order_block',
        description: 'Bearish OB',
        timeframe: timeframeLabel
      });
    }
  }
  
  // Limit the number of displayed levels to avoid cluttering the chart
  // Sort by recency (using index in the recentData array)
  return levels.slice(0, 5);
};

// Método avançado para análise de tendência em múltiplos timeframes
const advancedMultiTimeframeTrendAnalysis = (
  data: CandleData[],
  ema5: EmaData[],
  ema21: EmaData[],
  macd: MacdData,
  interval: string
): string => {
  if (data.length < 30) return 'neutral';

  const ema5Last = ema5[ema5.length - 1].value;
  const ema21Last = ema21[ema21.length - 1].value;
  const macdLast = macd.macdLine[macd.macdLine.length - 1].value;
  const signalLast = macd.signalLine[macd.signalLine.length - 1].value;

  // 1. Critérios clássicos (EMA e MACD)
  const emaUptrend = ema5Last > ema21Last;
  const emaDowntrend = ema5Last < ema21Last;
  const macdUptrend = macdLast > 0 && macdLast > signalLast;
  const macdDowntrend = macdLast < 0 && macdLast < signalLast;

  // 2. Análise de estrutura de preço
  const recentData = data.slice(-30);
  const highs = recentData.map(candle => candle.high);
  const lows = recentData.map(candle => candle.low);

  const isHigherHighs = checkHigherHighs(highs);
  const isHigherLows = checkHigherLows(lows);
  const isLowerHighs = checkLowerHighs(highs);
  const isLowerLows = checkLowerLows(lows);

  // 3. Ponderação com base no timeframe
  let weightEma = 0.4;
  let weightMacd = 0.3;
  let weightStructure = 0.3;

  if (interval === '1W' || interval === '1D') {
    weightStructure = 0.5;
    weightEma = 0.3;
    weightMacd = 0.2;
  }

  // 4. Cálculo da pontuação combinada
  let bullishScore = 0;
  let bearishScore = 0;

  if (emaUptrend) bullishScore += weightEma;
  if (emaDowntrend) bearishScore += weightEma;

  if (macdUptrend) bullishScore += weightMacd;
  if (macdDowntrend) bearishScore += weightMacd;

  if (isHigherHighs && isHigherLows) bullishScore += weightStructure;
  if (isLowerHighs && isLowerLows) bearishScore += weightStructure;

  // 5. Determinar tendência final
  if (bullishScore > bearishScore) {
    return 'bullish';
  } else if (bearishScore > bullishScore) {
    return 'bearish';
  } else {
    return 'neutral';
  }
};

// Funções auxiliares para análise de estrutura de preço
const checkHigherHighs = (highs: number[]): boolean => {
  for (let i = 1; i < highs.length; i++) {
    if (highs[i] <= highs[i - 1]) return false;
  }
  return true;
};

const checkHigherLows = (lows: number[]): boolean => {
  for (let i = 1; i < lows.length; i++) {
    if (lows[i] <= lows[i - 1]) return false;
  }
  return true;
};

const checkLowerHighs = (highs: number[]): boolean => {
  for (let i = 1; i < highs.length; i++) {
    if (highs[i] >= highs[i - 1]) return false;
  }
  return true;
};

const checkLowerLows = (lows: number[]): boolean => {
  for (let i = 1; i < lows.length; i++) {
    if (lows[i] >= lows[i - 1]) return false;
  }
  return true;
};

export default BitcoinICTChart;