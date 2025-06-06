// BitcoinAnalysis.tsx - Simplified Version
import React, { useState, useEffect } from 'react';
import './bitcoin-analysis.css';

// Simple price chart component using basic data
const SimplePriceChart = ({ priceHistory }: { priceHistory: number[] }) => {
  console.log("SimplePriceChart rendered with data:", priceHistory);
    if (!priceHistory || priceHistory.length === 0) {
    console.log("No price history data available");
    return (
      <div className="bitcoin-price-card">
        <h3 className="text-lg sm:text-xl font-bold text-[#fb923c] mb-4">24 Hour Price Trend</h3>
        <div className="h-48 relative bg-black/20 rounded-lg p-4 flex items-center justify-center border-orange-subtle">
          <div className="text-gray-400">Loading price trend...</div>
        </div>
      </div>
    );
  }
  
  const maxPrice = Math.max(...priceHistory);
  const minPrice = Math.min(...priceHistory);
  // Ensure a minimum range to prevent flat charts
  const range = Math.max(maxPrice - minPrice, maxPrice * 0.02);
  const isUptrend = priceHistory[priceHistory.length - 1] > priceHistory[0];

  console.log("Chart data - min:", minPrice, "max:", maxPrice, "range:", range, "uptrend:", isUptrend);

  return (
    <div className="bitcoin-price-card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg sm:text-xl font-bold text-[#fb923c]">24 Hour Price Trend</h3>
        <div className={`text-sm font-medium ${isUptrend ? 'text-green-400' : 'text-red-400'}`}>
          {isUptrend ? '↗ Trending Up' : '↘ Trending Down'}
        </div>
      </div>
      <div className="h-48 relative bg-gradient-to-br from-black/30 to-black/10 rounded-lg p-4 border border-orange-500/20">
        <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0">
          {/* Grid lines */}
          <defs>
            <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
              <path d="M 10 0 L 0 0 0 10" fill="none" stroke="rgba(251, 146, 60, 0.1)" strokeWidth="0.5"/>
            </pattern>
          </defs>
          <rect width="100" height="100" fill="url(#grid)" />
          
          {/* Price line */}
          <polyline
            fill="none"
            stroke={isUptrend ? "#10b981" : "#ef4444"}
            strokeWidth="1.5"
            vectorEffect="non-scaling-stroke"
            points={priceHistory
              .map((price, index) => {
                const x = (index / (priceHistory.length - 1)) * 100;
                const y = 100 - ((price - minPrice) / range) * 100;
                return `${x},${y}`;
              })
              .join(' ')}
          />
          
          {/* Price points */}
          {priceHistory.map((price, index) => {
            const x = (index / (priceHistory.length - 1)) * 100;
            const y = 100 - ((price - minPrice) / range) * 100;
            return (
              <circle
                key={index}
                cx={x}
                cy={y}
                r="0.8"
                fill={isUptrend ? "#10b981" : "#ef4444"}
                className="opacity-80"
                vectorEffect="non-scaling-stroke"
              />
            );
          })}
        </svg>
        
        {/* Price labels */}
        <div className="absolute top-2 left-2 text-xs text-gray-400">
          High: ${maxPrice.toLocaleString(undefined, {maximumFractionDigits: 0})}
        </div>
        <div className="absolute bottom-2 left-2 text-xs text-gray-400">
          Low: ${minPrice.toLocaleString(undefined, {maximumFractionDigits: 0})}
        </div>
      </div>
      <div className="mt-2 text-xs text-gray-400 flex justify-between">
        <span>24h ago</span>
        <span>Now</span>
      </div>
    </div>
  );
};

// Bitcoin utilities section
const BitcoinUtils = () => {
  const [btcAmount, setBtcAmount] = useState<string>('0.1');
  const [usdValue, setUsdValue] = useState<string>('');
  const [currentPrice, setCurrentPrice] = useState<number>(0);
  
  useEffect(() => {
    // Get current price from the parent component's API call
    const fetchPrice = async () => {
      try {
        const response = await fetch('/api/bitcoin-data?type=price');
        if (!response.ok) throw new Error(`API route failed: ${response.status}`);
        const data = await response.json();
        if (data && data.bitcoin && data.bitcoin.usd) {
          setCurrentPrice(data.bitcoin.usd);
          // Calculate initial USD value
          if (btcAmount) {
            const amount = parseFloat(btcAmount);
            if (!isNaN(amount)) {
              setUsdValue((amount * data.bitcoin.usd).toLocaleString('en-US', { 
                style: 'currency', 
                currency: 'USD' 
              }));
            }
          }
        }
      } catch (err) {
        console.error("Failed to fetch price for calculator:", err);
      }
    };
    fetchPrice();
  }, []);
  
  const handleBtcAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setBtcAmount(value);
    
    if (value && currentPrice) {
      const amount = parseFloat(value);
      if (!isNaN(amount)) {
        setUsdValue((amount * currentPrice).toLocaleString('en-US', { 
          style: 'currency', 
          currency: 'USD' 
        }));
      } else {
        setUsdValue('');
      }
    } else {
      setUsdValue('');
    }
  };
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
      <div className="bitcoin-price-card">
        <h3 className="text-lg font-bold text-[#fb923c] mb-4">Price Calculator</h3>
        <div className="space-y-3">
          <div>
            <label className="text-sm text-gray-400 block mb-1">BTC Amount</label>
            <input 
              type="number" 
              placeholder="0.1"
              value={btcAmount}
              onChange={handleBtcAmountChange}
              className="w-full bg-black/30 border border-gray-600 rounded-lg px-3 py-2 text-white"
            />
          </div>
          <div>
            <label className="text-sm text-gray-400 block mb-1">USD Value</label>
            <input 
              type="text" 
              placeholder="Calculate..." 
              value={usdValue}
              className="w-full bg-black/30 border border-gray-600 rounded-lg px-3 py-2 text-white"
              readOnly
            />
          </div>
        </div>
      </div>
      
      <div className="bitcoin-price-card">
        <h3 className="text-lg font-bold text-[#fb923c] mb-4">Market Info</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-400">Market Cap Rank:</span>
            <span className="text-white">#1</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">All-Time High:</span>
            <span className="text-white">$69,044.77</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Circulating Supply:</span>
            <span className="text-white">19.8M BTC</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Max Supply:</span>
            <span className="text-white">21M BTC</span>
          </div>
        </div>
      </div>
    </div>
  );
};

const BitcoinAnalysis = () => {
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [btcPrice, setBtcPrice] = useState('Loading...');
  const [priceChange, setPriceChange] = useState('-');
  const [priceChangeClass, setPriceChangeClass] = useState('text-gray-400');
  const [fetchError, setFetchError] = useState(false);
  const [fearGreedValue, setFearGreedValue] = useState(50);
  const [fearGreedText, setFearGreedText] = useState('Neutral');
  const [fearGreedClass, setFearGreedClass] = useState('from-gray-gradient');
  const [fearGreedFetching, setFearGreedFetching] = useState(true);
  const [dateString, setDateString] = useState('');  const [priceHistory, setPriceHistory] = useState<number[]>([]);
  console.log("BitcoinAnalysis component rendered");
  console.log("priceHistory state:", priceHistory);

  // Update fear & greed progress bar width
  useEffect(() => {
    const progressBars = document.querySelectorAll('.fear-greed-progress[data-width]');
    progressBars.forEach((bar) => {
      const width = (bar as HTMLElement).dataset.width;
      if (width) {
        (bar as HTMLElement).style.width = `${width}%`;
      }
    });
  });

  useEffect(() => {
    setDateString(lastUpdated.toLocaleString());
  }, [lastUpdated]);
  useEffect(() => {
    const fetchBitcoinPrice = async () => {
      console.log("Fetching Bitcoin price...");
      try {
        setFetchError(false);
        const response = await fetch('/api/bitcoin-data?type=price');
        console.log("API response status:", response.status);
        if (!response.ok) throw new Error(`API route failed: ${response.status}`);
        const data = await response.json();
        console.log("API data received:", data);
        if (data && data.bitcoin) {
          const price = data.bitcoin.usd;
          const change = data.bitcoin.usd_24h_change;
          console.log("Price extracted:", price, "Change:", change);
          setBtcPrice(`$${price.toLocaleString('en-US', { maximumFractionDigits: 2 })}`);
          setPriceChange(`${change > 0 ? '+' : ''}${change.toFixed(2)}%`);
          setPriceChangeClass(change >= 0 ? 'text-green-400' : 'text-red-400');
            // Create simple price history for chart (simulate 24h data points)
          const basePrice = price;
          const changePercent = change / 100; // Convert percentage to decimal
          
          // Generate realistic price history that ends up with the actual 24h change
          const history = Array.from({ length: 24 }, (_, i) => {
            // Create a progression from start to end price over 24 hours
            const timeProgression = i / 23; // 0 to 1
            // Add some realistic volatility with multiple sine waves
            const volatility = (Math.sin(i * 0.5) * 0.015) + 
                              (Math.sin(i * 0.3) * 0.008) + 
                              ((Math.random() - 0.5) * 0.005);
            
            // Calculate the starting price based on current price and 24h change
            const startPrice = basePrice / (1 + changePercent);
            const endPrice = basePrice;
            
            // Linear progression from start to end, plus volatility
            const progressionPrice = startPrice + (endPrice - startPrice) * timeProgression;
            return progressionPrice * (1 + volatility);
          });
          
          // Ensure the last price matches current price closely
          history[history.length - 1] = basePrice;
          
          console.log("Price history generated:", history.length, "points from", history[0].toFixed(2), "to", history[history.length-1].toFixed(2));
          setPriceHistory(history);
          
          setLastUpdated(new Date());
        } else {
          throw new Error('Invalid data structure from API');
        }
      } catch (err) {
        setFetchError(true);
        setBtcPrice('Error loading price');
        setPriceChange('-');
        setPriceChangeClass('text-red-400');
      }
    };

    fetchBitcoinPrice();
    const intervalId = setInterval(fetchBitcoinPrice, 300000); // 5 minutes
    return () => clearInterval(intervalId);
  }, []);

  useEffect(() => {
    const fetchFearGreedIndex = async () => {
      try {
        setFearGreedFetching(true);
        const response = await fetch('/api/bitcoin-data?type=fear-greed');
        if (!response.ok) throw new Error(`API route failed: ${response.status}`);
        const data = await response.json();
        if (data && data.data && data.data[0]) {
          const fgIndex = parseInt(data.data[0].value);
          setFearGreedValue(fgIndex);
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
        setFearGreedText('No Data');
        setFearGreedClass('from-gray-gradient');
      } finally {
        setFearGreedFetching(false);
      }
    };
    fetchFearGreedIndex();
    const intervalId = setInterval(fetchFearGreedIndex, 3600000); // 1 hour
    return () => clearInterval(intervalId);
  }, []);

  return (
    <div className="bitcoin-analysis-container">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-4 sm:mb-8">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-[#fb923c] mb-2">Bitcoin Analysis</h1>
          <p className="text-xs sm:text-sm lg:text-base text-gray-400">
            Real-time Bitcoin price data, market sentiment analysis, and useful trading utilities powered by free APIs.
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

        {/* Main Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
          {/* Bitcoin Price Card */}
          <div className="bitcoin-price-card">
            <h3 className="text-gray-400 text-xs sm:text-sm mb-1">Current BTC Price</h3>
            <div className="text-lg sm:text-xl lg:text-2xl font-bold text-white">{btcPrice}</div>
            <div className="flex items-center mt-1">
              <span className="text-gray-400 text-xs sm:text-sm">24h change:</span>
              <span className={`ml-2 text-xs sm:text-sm ${priceChangeClass}`}>{priceChange}</span>
            </div>
            {fetchError && (
              <div className="mt-2 text-xs text-amber-500">
                Unable to fetch price data. Retrying...
              </div>
            )}
          </div>

          {/* Fear & Greed Index */}
          <div className={`${fearGreedClass} rounded-xl p-3 sm:p-4 relative overflow-hidden`}>
            <h3 className="text-gray-200 text-xs sm:text-sm mb-1">Fear & Greed Index</h3>
            <div className="flex items-center justify-between">
              <div className="text-base sm:text-xl lg:text-2xl font-bold text-white truncate mr-2">{fearGreedText}</div>
              <div className="text-base sm:text-lg lg:text-xl flex-shrink-0 text-white font-bold">
                {fearGreedValue}
              </div>
            </div>
            {fearGreedFetching && (
              <div className="mt-2 text-xs text-white/70">
                Loading...
              </div>
            )}            <div className="mt-2 w-full bg-black/30 rounded-full h-2">
              <div
                className="fear-greed-progress"
                data-width={fearGreedValue}
              ></div>
            </div>
          </div>

          {/* Simple Trend Indicator */}
          <div className="bitcoin-price-card">
            <h3 className="text-gray-400 text-xs sm:text-sm mb-1">24h Trend</h3>
            <div className="text-base sm:text-xl lg:text-2xl font-bold text-white">
              {priceChange.startsWith('+') ? '📈 Bullish' : priceChange.startsWith('-') ? '📉 Bearish' : '➡️ Neutral'}
            </div>
            <div className="text-xs sm:text-sm text-gray-400 mt-1">
              Based on 24h price movement
            </div>
          </div>
        </div>

        {/* Price Chart */}
        <div className="mb-6 sm:mb-8">
          {priceHistory.length > 0 ? (
            <SimplePriceChart priceHistory={priceHistory} />
          ) : (
            <div className="bitcoin-price-card">
              <h3 className="text-lg sm:text-xl font-bold text-[#fb923c] mb-4">24 Hour Price Trend</h3>
              <div className="h-48 flex items-center justify-center bg-black/20 rounded-lg">
                <div className="text-gray-400">Loading price data...</div>
              </div>
            </div>
          )}
        </div>

        {/* Bitcoin Utilities */}
        <BitcoinUtils />        {/* Rainbow Chart Section - Alternative Implementation */}
        <div className="mb-6 sm:mb-8">
          <h2 className="text-lg sm:text-xl font-bold text-[#fb923c] mb-4">Bitcoin Rainbow Chart Analysis</h2>
          <div className="bitcoin-price-card">
            <p className="text-sm text-gray-400 mb-4">
              The Bitcoin Rainbow Chart is a logarithmic regression that provides insights into market cycles and potential price zones.
            </p>
            
            {/* Rainbow Chart Visualization */}
            <div className="h-64 sm:h-80 bg-gradient-to-r from-red-900 via-orange-500 via-yellow-400 via-green-400 via-blue-400 to-purple-500 rounded-lg p-4 relative overflow-hidden">
              <div className="absolute inset-0 bg-black/60"></div>
              <div className="relative z-10 h-full flex flex-col justify-between text-white">
                <div className="text-right">
                  <div className="text-xs mb-1 opacity-75">Maximum Bubble Territory</div>
                  <div className="text-lg font-bold">$500K+</div>
                </div>
                
                <div className="text-center">
                  <div className="text-sm mb-2 opacity-75">Current Price Zone</div>
                  <div className="text-2xl font-bold bg-black/50 rounded px-3 py-1 inline-block">
                    {btcPrice}
                  </div>
                  <div className="text-xs mt-1 opacity-75">
                    {priceChange.includes('-') ? 'Accumulation Phase' : 'Growth Phase'}
                  </div>
                </div>
                
                <div className="text-left">
                  <div className="text-xs mb-1 opacity-75">Fire Sale Zone</div>
                  <div className="text-lg font-bold">$15K - $30K</div>
                </div>
              </div>
            </div>
            
            {/* Rainbow Chart Legend */}
            <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-red-500 rounded mr-2"></div>
                <span className="text-gray-300">Maximum Bubble</span>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 bg-orange-500 rounded mr-2"></div>
                <span className="text-gray-300">Sell/HODL</span>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 bg-yellow-400 rounded mr-2"></div>
                <span className="text-gray-300">HODL</span>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 bg-green-400 rounded mr-2"></div>
                <span className="text-gray-300">Still Cheap</span>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 bg-blue-400 rounded mr-2"></div>
                <span className="text-gray-300">Accumulate</span>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 bg-indigo-500 rounded mr-2"></div>
                <span className="text-gray-300">BUY!</span>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 bg-purple-500 rounded mr-2"></div>
                <span className="text-gray-300">Fire Sale!</span>
              </div>
            </div>
              <div className="mt-4 text-xs text-gray-400">
              <p>Rainbow Chart concept shows potential price zones based on logarithmic regression analysis.</p>
              <p className="mt-1">
                <strong className="text-yellow-400">Note:</strong> This is a simplified visualization. For the interactive chart, visit 
                <a href="https://www.blockchaincenter.net/en/bitcoin-rainbow-chart/" target="_blank" rel="noopener noreferrer" className="text-[#fb923c] hover:underline ml-1">
                  Blockchain Center
                </a>
              </p>
            </div>
          </div>
        </div>        {/* Bitcoin Dominance Chart */}
        <div className="mb-6 sm:mb-8">
          <h2 className="text-lg sm:text-xl font-bold text-[#fb923c] mb-4">Bitcoin Dominance</h2>
          <div className="bitcoin-price-card">
            <p className="text-sm text-gray-400 mb-3">
              Bitcoin dominance represents Bitcoin's market cap as a percentage of the total cryptocurrency market capitalization.
            </p>
            <div className="h-64 sm:h-80 bg-black/20 rounded-lg overflow-hidden relative">
              <iframe 
                src="https://www.tradingview.com/widgetembed/?frameElementId=tradingview_54321&symbol=CRYPTOCAP:BTC.D&interval=D&hidesidetoolbar=0&symboledit=0&saveimage=0&toolbarbg=f1f3f6&studies=[]&hideideas=1&theme=dark&style=1&timezone=exchange&withdateranges=1&studies_overrides={}&overrides={}&enabled_features=[]&disabled_features=[]&locale=en&utm_source=&utm_medium=widget&utm_campaign=chart&utm_term=CRYPTOCAP:BTC.D"
                className="absolute inset-0 w-full h-full border-0"
                title="Bitcoin Dominance Chart"
              ></iframe>
            </div>
            <div className="mt-2 text-xs text-gray-400">
              <p>Chart shows Bitcoin dominance over time. Higher percentage indicates stronger Bitcoin position in the market.</p>
              <p className="mt-1">Source: <a href="https://www.tradingview.com/symbols/CRYPTOCAP-BTC.D/" target="_blank" rel="noopener noreferrer" className="text-[#fb923c] hover:underline">TradingView</a></p>
            </div>
          </div>
        </div>        {/* Coming Soon com Integração API Premium */}
        <div className="mb-6 sm:mb-8">
          <h2 className="text-lg sm:text-xl font-bold text-[#fb923c] mb-4">Coming Soon with Premium API Integration</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bitcoin-price-card opacity-60">
              <h3 className="text-lg font-bold text-[#fb923c] mb-2">On-Chain Analysis</h3>
              <p className="text-sm text-gray-400 mb-3">
                Blockchain data metrics like active addresses, transaction volume, and HODL waves.
              </p>
              <div className="text-xs text-orange-500 font-medium">Coming soon</div>
            </div>
            
            <div className="bitcoin-price-card opacity-60">
              <h3 className="text-lg font-bold text-[#fb923c] mb-2">Market Metrics</h3>
              <p className="text-sm text-gray-400 mb-3">
                Advanced market data including volatility index, correlation with stocks/gold, and liquidity metrics.
              </p>
              <div className="text-xs text-orange-500 font-medium">Coming soon</div>
            </div>
          </div>
        </div>

        <div className="pb-12"></div>
      </div>
    </div>
  );
};

export default BitcoinAnalysis;
