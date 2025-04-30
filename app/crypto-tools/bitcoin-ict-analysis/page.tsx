'use client';

import React, { useState, useEffect } from 'react';
import Layout from '../../../components/Layout';
import dynamic from 'next/dynamic';
import { Tab } from '@headlessui/react';

// Dynamically import the chart component to avoid SSR issues with browser-only libraries
const BitcoinICTChart = dynamic(
  () => import('../components/BitcoinICTChart'),
  { ssr: false }
);

// Timeframe options for analysis
const timeframes = [
  { id: 'daily', label: 'Diário', period: '1D' },
  { id: 'weekly', label: 'Semanal', period: '1W' },
  { id: '4h', label: '4 horas', period: '4H' },
  { id: '1h', label: '1 hora', period: '1H' },
  { id: '15min', label: '15 minutos', period: '15' }
];

// Trend analysis component showing all timeframes
const TrendAnalysis = ({ trends }: { trends: Record<string, string> }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
      {timeframes.map(({ id, label }) => (
        <div 
          key={id} 
          className={`rounded-lg p-4 text-center shadow-lg ${
            trends[id] === 'alta' 
              ? 'bg-gradient-to-r from-green-800 to-green-600' 
              : trends[id] === 'baixa' 
                ? 'bg-gradient-to-r from-red-800 to-red-600'
                : 'bg-gradient-to-r from-gray-800 to-gray-600'
          }`}
        >
          <h3 className="text-white text-lg font-semibold mb-2">{label}</h3>
          <p className="text-white text-xl font-bold capitalize">{trends[id] || 'Neutro'}</p>
        </div>
      ))}
    </div>
  );
};

export default function BitcoinICTAnalysisPage() {
  const [activeTimeframe, setActiveTimeframe] = useState('daily');
  const [trends, setTrends] = useState<Record<string, string>>({
    daily: 'neutro',
    weekly: 'neutro',
    '4h': 'neutro',
    '1h': 'neutro',
    '15min': 'neutro'
  });

  // Handler for trend updates from the chart component
  const handleTrendUpdate = (timeframe: string, trend: string) => {
    setTrends(prev => ({
      ...prev,
      [timeframe]: trend
    }));
  };

  // Check for strong trend alignment across timeframes
  const hasStrongTrend = () => {
    const trendValues = Object.values(trends);
    return trendValues.every(t => t === trendValues[0]) && trendValues[0] !== 'neutro';
  };

  // Signal generation when all timeframes align
  const getSignal = () => {
    if (!hasStrongTrend()) return null;
    
    const trend = Object.values(trends)[0];
    return {
      type: trend === 'alta' ? 'compra' : 'venda',
      direction: trend,
      stopLevel: trend === 'alta' ? 'último fundo de 1h' : 'último topo de 1h'
    };
  };

  // Signal display component
  const signal = getSignal();

  return (
    <Layout>
      <div className="bg-gradient-to-br from-gray-900 to-black text-white min-h-screen pt-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Page Header */}
          <div className="mb-10">
            <h1 className="text-3xl font-bold text-[#fb923c] mb-2">Análise de Bitcoin com ICT Key Levels</h1>
            <p className="text-gray-400">
              Análise técnica de Bitcoin baseada em níveis de ICT (Inner Circle Trader) e indicadores personalizados para identificar tendências em múltiplos timeframes.
            </p>
          </div>

          {/* Trend Analysis Summary */}
          <div className="mb-8">
            <h2 className="text-xl font-bold text-[#fb923c] mb-4">Análise de Tendência</h2>
            <TrendAnalysis trends={trends} />
          </div>

          {/* Signal Alert Box (only shows when there's a strong trend alignment) */}
          {signal && (
            <div className={`mb-8 p-4 border rounded-lg ${
              signal.type === 'compra' 
                ? 'bg-green-900/30 border-green-600/50' 
                : 'bg-red-900/30 border-red-600/50'
            }`}>
              <div className="flex items-center gap-3">
                <div className={`p-3 rounded-full ${
                  signal.type === 'compra' ? 'bg-green-600' : 'bg-red-600'
                }`}>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    {signal.type === 'compra' 
                      ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                      : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                    }
                  </svg>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">
                    Sinal de {signal.type.toUpperCase()} Detectado
                  </h3>
                  <p className="text-gray-300">
                    Todos os timeframes estão alinhados em tendência de {signal.direction}.
                    Coloque o stop no {signal.stopLevel}.
                  </p>
                </div>
              </div>
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
                    <div className="bg-black/40 border border-[#fb923c]/20 rounded-xl p-4 h-[600px]">
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

          {/* Description of the analysis method */}
          <div className="mt-10 bg-gradient-to-br from-gray-900/70 to-black/70 rounded-lg p-6 border border-[#333]">
            <h2 className="text-xl font-bold text-[#fb923c] mb-4">Sobre a Metodologia</h2>
            <div className="text-gray-300 space-y-4">
              <p>
                Esta análise utiliza níveis de ICT (Inner Circle Trader) combinados com indicadores técnicos para determinar a direção da tendência em múltiplos timeframes.
              </p>
              <p>
                <strong className="text-[#fb923c]">Indicadores utilizados:</strong>
                <ul className="list-disc pl-5 mt-2">
                  <li>EMA 21 e EMA 5 para determinar a direção da tendência</li>
                  <li>MACD de Chris Moody (Períodos: Rápido 26, Lento 55, Sinal 9)</li>
                  <li>Níveis-chave de ICT para identificar áreas de suporte e resistência</li>
                </ul>
              </p>
              <p>
                <strong className="text-[#fb923c]">Geração de Sinais:</strong> Um sinal de compra ou venda é gerado quando todos os timeframes se alinham na mesma direção, com o timeframe de 15 minutos sendo o último a confirmar. O stop deve ser colocado no último topo ou fundo relevante do gráfico de 1 hora.
              </p>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}