'use client';

import React, { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import dynamic from 'next/dynamic';
import { Tab } from '@headlessui/react';
import './bitcoin-analysis.css';

// Dynamically import the chart component to avoid SSR issues with browser-only libraries
const BitcoinICTChart = dynamic(
  () => import('../crypto-tools/components/BitcoinICTChart'),
  { ssr: false }
);

// Timeframe options for analysis
const timeframes = [
  { id: 'daily', label: 'Daily', period: '1D' },
  { id: 'weekly', label: 'Weekly', period: '1W' },
  { id: '4h', label: '4 Hours', period: '4H' },
  { id: '1h', label: '1 Hour', period: '1H' },
  { id: '15min', label: '15 Minutes', period: '15' }
];

// Trend Analysis component showing all timeframes
const TrendAnalysis = ({ trends }: { trends: Record<string, string> }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
      {timeframes.map(({ id, label }) => {
        let gradientClass = 'from-gray-gradient';
        if (trends[id] === 'bullish') gradientClass = 'from-green-gradient';
        else if (trends[id] === 'bearish') gradientClass = 'from-red-gradient';
        
        return (
          <div 
            key={id} 
            className={`rounded-lg p-4 text-center shadow-lg ${gradientClass}`}
          >
            <h3 className="text-white text-lg font-semibold mb-2">{label}</h3>
            <p className="text-white text-xl font-bold capitalize">{trends[id] || 'Neutral'}</p>
          </div>
        );
      })}
    </div>
  );
};

// ICT Key Levels Explanation component
const ICTExplanation = () => {
  return (
    <div className="mt-6 bitcoin-price-card">
      <h3 className="text-xl font-bold text-[#fb923c] mb-3">ICT Key Levels</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-3 bg-green-900/20 border border-green-600/30 rounded-lg">
          <div className="flex items-center mb-2">
            <div className="w-4 h-4 bg-green-500 mr-2"></div>
            <h4 className="font-bold text-green-400">Support Levels</h4>
          </div>
          <p className="text-sm text-gray-300">
            Points of historical buying pressure where price has previously reversed from downtrends. These areas may provide support during future price declines.
          </p>
        </div>
        
        <div className="p-3 bg-red-900/20 border border-red-600/30 rounded-lg">
          <div className="flex items-center mb-2">
            <div className="w-4 h-4 bg-red-500 mr-2"></div>
            <h4 className="font-bold text-red-400">Resistance Levels</h4>
          </div>
          <p className="text-sm text-gray-300">
            Points of historical selling pressure where price has previously reversed from uptrends. These areas may act as resistance when price rises.
          </p>
        </div>
        
        <div className="p-3 bg-orange-900/20 border border-orange-600/30 rounded-lg">
          <div className="flex items-center mb-2">
            <div className="w-4 h-4 border-2 border-dashed border-orange-500 mr-2"></div>
            <h4 className="font-bold text-orange-400">Order Blocks</h4>
          </div>
          <p className="text-sm text-gray-300">
            Key areas where smart money has entered the market, creating imbalances that often lead to strong directional moves. These are high-probability reversal zones.
          </p>
        </div>
      </div>
    </div>
  );
};

export default function BitcoinAnalysisPage() {
  const [activeTimeframe, setActiveTimeframe] = useState('daily');
  const [trends, setTrends] = useState<Record<string, string>>({
    daily: 'neutral',
    weekly: 'neutral',
    '4h': 'neutral',
    '1h': 'neutral',
    '15min': 'neutral'
  });
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [btcPrice, setBtcPrice] = useState<string>('Loading...');
  const [priceChange, setPriceChange] = useState<string>('-');
  const [priceChangeClass, setPriceChangeClass] = useState<string>('text-gray-400');
  const [fetchError, setFetchError] = useState<boolean>(false);
  
  // Fear & Greed Index state
  const [fearGreedValue, setFearGreedValue] = useState<number>(50);
  const [fearGreedText, setFearGreedText] = useState<string>('Neutral');
  const [fearGreedClass, setFearGreedClass] = useState<string>('from-gray-gradient');
  const [fearGreedFetching, setFearGreedFetching] = useState<boolean>(true);

  // Handler for trend updates from the chart component
  const handleTrendUpdate = (timeframe: string, trend: string) => {
    setTrends(prev => ({
      ...prev,
      [timeframe]: trend
    }));
    setLastUpdated(new Date());
  };

  // Use useEffect to handle date display only on the client side
  const [dateString, setDateString] = useState<string>('');
  useEffect(() => {
    // This will only run on the client
    setDateString(lastUpdated.toLocaleString());
  }, [lastUpdated]);

  // Check for strong trend alignment across timeframes
  const hasStrongTrend = () => {
    const trendValues = Object.values(trends);
    return trendValues.every(t => t === trendValues[0]) && trendValues[0] !== 'neutral';
  };

  // Check for trend alignment in specific direction
  const calculateTrendStrength = (direction: 'bullish' | 'bearish') => {
    const alignedTimeframes = Object.entries(trends).filter(([_, trend]) => trend === direction);
    return {
      count: alignedTimeframes.length,
      timeframes: alignedTimeframes.map(([timeframe, _]) => 
        timeframes.find(t => t.id === timeframe)?.label || timeframe
      ),
      percentage: (alignedTimeframes.length / Object.keys(trends).length) * 100
    };
  };

  // Signal generation when all timeframes align with 15min being the last
  const getSignal = () => {
    const bullishStrength = calculateTrendStrength('bullish');
    const bearishStrength = calculateTrendStrength('bearish');

    if (trends['15min'] !== 'neutral' && 
        ((bullishStrength.count >= 4 && trends['15min'] === 'bullish') || 
         (bearishStrength.count >= 4 && trends['15min'] === 'bearish'))) {
      return {
        type: trends['15min'] === 'bullish' ? 'buy' : 'sell',
        direction: trends['15min'],
        strength: trends['15min'] === 'bullish' ? bullishStrength : bearishStrength,
        stopLevel: trends['15min'] === 'bullish' ? 'last 1H low' : 'last 1H high'
      };
    }

    return null;
  };

  // Get the signal if it exists
  const signal = getSignal();

  useEffect(() => {
    const fetchBitcoinPrice = async () => {
      try {
        setFetchError(false);
        // Fetch BTC price and 24h change from the API route
        const response = await fetch('/api/bitcoin-data?type=price'); // Changed URL

        if (!response.ok) {
          // Handle potential errors from the API route itself
          const errorData = await response.json().catch(() => ({})); // Try to parse error JSON
          console.error('API Route Error:', response.status, errorData.error || 'Unknown error');
          throw new Error(`API route failed: ${response.status}`);
        }

        const data = await response.json();

        if (data && data.bitcoin) {
          setBtcPrice(`$${data.bitcoin.usd.toLocaleString()}`);
          const change = data.bitcoin.usd_24h_change;
          setPriceChange(`${change.toFixed(2)}%`);
          // Use Tailwind classes directly for conditional styling
          setPriceChangeClass(change >= 0 ? 'ml-2 text-sm text-green-400' : 'ml-2 text-sm text-red-400');
        } else {
          // Handle case where API route returns unexpected data
          console.error('Invalid data structure received from API route:', data);
          throw new Error('Invalid data structure from API route');
        }
      } catch (err) {
        console.error('Error fetching BTC price via API route:', err);
        setFetchError(true);
        setBtcPrice('N/A'); // Indicate data is unavailable
        setPriceChange('-');
        setPriceChangeClass('ml-2 text-sm text-gray-400');
      }
    };

    fetchBitcoinPrice();
    // Optional: Add a timer to refetch periodically if needed, 
    // but the API route caching should help reduce direct hits
    const intervalId = setInterval(fetchBitcoinPrice, 60000); // Refresh every 60 seconds
    return () => clearInterval(intervalId); // Cleanup interval

  }, []); // Empty dependency array ensures this runs once on mount + interval cleanup

  // Effect to load all timeframes on page initialization
  useEffect(() => {
    // Implementation is complete in the BitcoinICTChart component,
    // the charts will load all timeframe data and update trends automatically
  }, []);

  // Create hidden chart components for each timeframe to preload all data
  const preloadAllTimeframes = (
    <div className="hidden">
      {timeframes.map(({ id, period }) => (
        <BitcoinICTChart 
          key={id}
          timeframe={id} 
          interval={period} 
          onTrendUpdate={handleTrendUpdate}
        />
      ))}
    </div>
  );

  // Fetch Fear & Greed Index
  useEffect(() => {
    const fetchFearGreedIndex = async () => {
      try {
        setFearGreedFetching(true);
        const response = await fetch('/api/bitcoin-data?type=fear-greed');
        
        if (!response.ok) {
          throw new Error(`API route failed: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data && data.data && data.data[0]) {
          const fgIndex = parseInt(data.data[0].value);
          setFearGreedValue(fgIndex);
          
          // Set text and color class based on value
          if (fgIndex <= 25) {
            setFearGreedText('Extreme Fear');
            setFearGreedClass('from-red-gradient');
          } else if (fgIndex <= 45) {
            setFearGreedText('Fear');
            setFearGreedClass('from-orange-gradient');
          } else if (fgIndex <= 55) {
            setFearGreedText('Neutral');
            setFearGreedClass('from-gray-gradient');
          } else if (fgIndex <= 75) {
            setFearGreedText('Greed');
            setFearGreedClass('from-yellow-gradient');
          } else {
            setFearGreedText('Extreme Greed');
            setFearGreedClass('from-green-gradient');
          }
        } else {
          throw new Error('Invalid data structure from API');
        }
      } catch (err) {
        console.error('Error fetching Fear & Greed Index:', err);
        // Use default neutral settings on error
        setFearGreedText('No Data');
        setFearGreedClass('from-gray-gradient');
      } finally {
        setFearGreedFetching(false);
      }
    };
    
    fetchFearGreedIndex();
    const intervalId = setInterval(fetchFearGreedIndex, 3600000); // Refresh every hour
    return () => clearInterval(intervalId);
  }, []);

  return (
    <Layout>
      <div className="bitcoin-analysis-container">
        {/* Hidden preload charts */}
        {preloadAllTimeframes}
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Page Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-[#fb923c] mb-2">Bitcoin Analysis with ICT Key Levels</h1>
            <p className="text-gray-400">
              Professional Bitcoin technical analysis based on ICT (Inner Circle Trader) methodology and multi-timeframe trend alignment.
            </p>
            <div className="flex justify-between items-center mt-4">
              <div className="text-xs text-gray-500">
                Last updated: {dateString}
              </div>
              <button 
                onClick={() => window.location.reload()} 
                className="px-3 py-1 bg-[#fb923c]/20 hover:bg-[#fb923c]/30 text-[#fb923c] rounded-md text-sm flex items-center"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Refresh          
              </button>
            </div>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {/* Current Price Card */}
            <div className="bitcoin-price-card">
              <h3 className="text-gray-400 text-sm mb-1">Current BTC Price</h3>
              <div className="text-2xl font-bold text-white">{btcPrice}</div>
              <div className="flex items-center mt-1">
                <span className="text-gray-400 text-sm">24h change:</span>
                <span className={priceChangeClass}>{priceChange}</span>
              </div>
              {fetchError && (
                <div className="mt-2 text-xs text-amber-500">
                  Unable to fetch price data. Retrying...
                </div>
              )}
            </div>
            
            {/* Fear & Greed Index Card */}
            <div className={`${fearGreedClass} rounded-xl p-5 relative overflow-hidden`}>
              <h3 className="text-gray-200 text-sm mb-1">Fear & Greed Index</h3>
              <div className="flex items-center justify-between">
                <div className="text-2xl font-bold text-white">{fearGreedText}</div>
                <div className="fear-greed-number">
                  {fearGreedValue}
                </div>
              </div>
              {fearGreedFetching && (
                <div className="loading-indicator">
                  <div className="loading-spinner"></div>
                </div>
              )}
              <div className="fear-greed-bar">
                <div
                  className={`fear-greed-value width-${Math.min(Math.floor(fearGreedValue / 10) * 10, 100)}`}
                ></div>
              </div>
            </div>
            
            {/* Trend Strength Card */}
            <div className="bitcoin-price-card">
              <h3 className="text-gray-400 text-sm mb-1">Trend Strength</h3>
              <div className="text-2xl font-bold text-white">
                {calculateTrendStrength('bullish').count > calculateTrendStrength('bearish').count 
                  ? `Bullish (${calculateTrendStrength('bullish').percentage.toFixed(0)}%)`
                  : calculateTrendStrength('bearish').count > calculateTrendStrength('bullish').count 
                    ? `Bearish (${calculateTrendStrength('bearish').percentage.toFixed(0)}%)`
                    : 'Neutral (0%)'
                }
              </div>
              <div className="fear-greed-bar">
                <div
                  className={`
                    trend-meter width-${Math.floor(
                      Math.min(
                        (calculateTrendStrength('bullish').count > calculateTrendStrength('bearish').count
                          ? calculateTrendStrength('bullish').percentage
                          : calculateTrendStrength('bearish').count > calculateTrendStrength('bullish').count
                            ? calculateTrendStrength('bearish').percentage
                            : 0),
                        100
                      ) / 10 * 10)}`}
                  ></div>
              </div>
            </div>
            
            {/* Trading Recommendation Card */}
            <div className="bitcoin-price-card">
              <h3 className="text-gray-400 text-sm mb-1">Trading Recommendation</h3>
              <div className="text-2xl font-bold text-white">
                {calculateTrendStrength('bullish').count > 3
                  ? 'Buy' 
                  : calculateTrendStrength('bearish').count > 3
                    ? 'Sell' 
                    : 'Neutral'}
              </div>
              <div className="text-sm text-gray-400 mt-1">            
                {calculateTrendStrength('bullish').count > 3 
                  ? `Strong bullish alignment across ${calculateTrendStrength('bullish').count} timeframes`
                  : calculateTrendStrength('bearish').count > 3
                    ? `Strong bearish alignment across ${calculateTrendStrength('bearish').count} timeframes`
                    : 'Mixed signals - consider waiting for clearer trend'}
              </div>
            </div>
          </div>

          {/* Trend Analysis Summary */}
          <div className="mb-8">
            <h2 className="text-xl font-bold text-[#fb923c] mb-4">Multi-Timeframe Trend Analysis</h2>
            <TrendAnalysis trends={trends} />
          </div>

          {/* Signal Alert Box */}
          {signal && (
            <div className={`mb-8 p-4 rounded-lg ${signal.type === 'buy' ? 'signal-buy' : 'signal-sell'}`}>
              <div className="flex items-center gap-3">
                <div className={`p-3 rounded-full ${signal.type === 'buy' ? 'signal-icon-bg-buy' : 'signal-icon-bg-sell'}`}>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    {signal.type === 'buy'
                      ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                      : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                    }            
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-white">
                  {signal.type.toUpperCase()} Signal Detected
                </h3>
              </div>
              <p className="text-gray-300">
                All timeframes are aligned in a {signal.direction} trend.
                Place your stop at the {signal.stopLevel}.
              </p>
            </div>
          )}

          {/* Chart Tabs */}
          <div className="mb-6">
            <Tab.Group selectedIndex={timeframes.findIndex(t => t.id === activeTimeframe)} onChange={(index) => setActiveTimeframe(timeframes[index].id)}>
              <Tab.List className="flex space-x-2 p-1 bg-black/30 rounded-xl mb-6 border border-[#333]">
                {timeframes.map(({ id, label }) => (
                  <Tab 
                    key={id}
                    className={({ selected }) => `
                      w-full py-3 text-sm font-medium leading-5 rounded-lg transition-all
                      ${selected 
                        ? 'bg-[#fb923c] text-white shadow'
                        : 'text-[#e5e5e5] hover:bg-[#fb923c]/20'}
                    `}
                  >
                    {label}
                  </Tab>
                ))}
              </Tab.List>
              
              <Tab.Panels>
                {timeframes.map(({ id, period }) => (
                  <Tab.Panel key={id}>
                    <div className="chart-container">
                      <BitcoinICTChart 
                        timeframe={id} 
                        interval={period} 
                        onTrendUpdate={handleTrendUpdate}
                      />
                    </div>
                  </Tab.Panel>
                ))}
              </Tab.Panels>
            </Tab.Group>
          </div>

          {/* ICT Key Levels Explanation */}
          <ICTExplanation />

          {/* Description of the analysis method */}
          <div className="methodology-section">
            <h2 className="text-xl font-bold text-[#fb923c] mb-4">About Our Analysis Methodology</h2>
            <div className="text-gray-300 space-y-4">
              <p>
                Our Bitcoin analysis approach uses a proprietary combination of advanced technical indicators and the respected ICT (Inner Circle Trader) methodology to identify key price levels and market direction.
              </p>
              <p>
                <strong className="text-[#fb923c]">Multi-Timeframe Analysis:</strong> We analyze Bitcoin price action across various timeframes to identify trend alignment and high-probability trading opportunities.
              </p>
              <p>
                <strong className="text-[#fb923c]">Smart Money Concepts:</strong> Our analysis incorporates institutional order flow concepts, market structure, and liquidity zones to help understand where large market participants are positioned.
              </p>
            </div>
          </div>
          
          {/* Disclaimer Card */}
          <div className="disclaimer-card">
            <h3 className="text-xl font-bold text-red-400 mb-3 flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              Important Disclaimer
            </h3>
            <div className="text-gray-300 space-y-2">
              <p>
                This analysis is provided for educational and informational purposes only and should not be considered as financial advice.
              </p>
              <p>
                <strong className="text-red-400">Trading Risk Warning:</strong> Cryptocurrency trading involves substantial risk of loss and is not suitable for all investors. Past performance is not indicative of future results, and any trading signals generated by our analysis may not be accurate or profitable.
              </p>
              <p>
                Always conduct your own research and consider your financial circumstances before making any investment decisions.
              </p>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}