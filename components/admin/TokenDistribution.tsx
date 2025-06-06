import React, { useState, useEffect } from 'react';
import { tokenService } from '../../services/tokenService';
import ManualTokenDistribution from './ManualTokenDistribution';

interface TokenStats {
  totalSupply: number;
  totalDistributed: number;
  availableForDistribution: number;
  totalDonationsUsd: number;
  percentageDistributed: number;
  isServiceAvailable: boolean;
  error?: string;
}

const TokenDistribution: React.FC = () => {
  const [stats, setStats] = useState<TokenStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      const tokenStats = await tokenService.getTokenDistributionStats();
      setStats(tokenStats);
      setError(null);
    } catch (err) {
      console.error('Error fetching token distribution stats:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch token statistics');
    } finally {
      if (isRefresh) {
        setRefreshing(false);
      } else {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const handleRefresh = () => {
    fetchStats(true);
  };

  const formatNumber = (num: number): string => {
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(2)}M`;
    } else if (num >= 1000) {
      return `${(num / 1000).toFixed(2)}K`;
    }
    return num.toFixed(2);
  };  if (loading) {
    return (
      <div className="bg-black/30 p-3 sm:p-4 lg:p-6 rounded-xl border border-gray-700">
        <h2 className="text-base sm:text-lg lg:text-xl font-bold text-orange-400 mb-4 lg:mb-6">Token Distribution</h2>
        <div className="flex items-center justify-center h-32 sm:h-48 lg:h-64">
          <div className="animate-spin rounded-full h-8 w-8 sm:h-10 sm:w-10 lg:h-12 lg:w-12 border-b-2 border-orange-500"></div>
        </div>
      </div>
    );
  }return (
    <div className="bg-black/30 p-3 sm:p-4 lg:p-6 rounded-xl border border-gray-700 hover:border-orange-500 transition-colors">
      {/* Header */}
      <div className="mb-4 lg:mb-6">
        <h2 className="text-base sm:text-lg lg:text-xl font-bold text-orange-400">Token Distribution</h2>
      </div>
      
      {error && (
        <div className="bg-red-900/50 border border-red-500 text-white p-3 lg:p-4 rounded-lg mb-4 lg:mb-6 text-sm">
          <strong>Error:</strong> {error}
        </div>
      )}

      {stats && (
        <div className="space-y-4 lg:space-y-6">
          {/* Service Status */}
          <div className="bg-black/70 border border-orange-700 rounded-xl p-3 sm:p-4 lg:p-6 backdrop-blur-sm">
            <div className="flex flex-col space-y-3 sm:flex-row sm:justify-between sm:items-center sm:space-y-0">
              <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-3">
                <h3 className="text-base sm:text-lg lg:text-xl font-bold text-orange-400">Service Status</h3>
                <div className="flex items-center space-x-2">
                  <div
                    className={`w-3 h-3 rounded-full ${
                      stats.isServiceAvailable ? 'bg-green-500' : 'bg-red-500'
                    }`}
                  />
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    stats.isServiceAvailable 
                      ? 'bg-orange-900/50 text-orange-300 border border-orange-700' 
                      : 'bg-red-900/50 text-red-300 border border-red-700'
                  }`}>
                    {stats.isServiceAvailable ? 'Online' : 'Offline'}
                  </span>
                </div>
              </div>
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="bg-orange-500 text-white px-3 py-2 sm:px-4 rounded-lg hover:bg-orange-600 disabled:opacity-60 font-semibold shadow text-sm w-full sm:w-auto flex items-center justify-center space-x-2 min-h-[40px]"
              >
                <svg 
                  className={`w-4 h-4 flex-shrink-0 ${refreshing ? 'animate-spin' : ''}`} 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2} 
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" 
                  />
                </svg>
                <span className="whitespace-nowrap">{refreshing ? 'Updating...' : 'Refresh'}</span>
              </button>
            </div>
            {stats.error && !stats.isServiceAvailable && (
              <div className="text-gray-400 text-sm mt-3">
                Error: {stats.error}
              </div>
            )}
          </div>

          {/* Distribution Overview */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div className="bg-black/30 border border-gray-700 hover:border-orange-500 rounded-xl p-3 sm:p-4 transition-colors">
              <h3 className="text-xs sm:text-sm font-semibold text-gray-300 mb-1">Total Supply</h3>
              <p className="text-lg sm:text-xl lg:text-2xl font-bold text-white break-words">{formatNumber(stats.totalSupply)}</p>
              <p className="text-xs text-gray-400">G33 Tokens</p>
            </div>

            <div className="bg-black/30 border border-gray-700 hover:border-orange-500 rounded-xl p-3 sm:p-4 transition-colors">
              <h3 className="text-xs sm:text-sm font-semibold text-gray-300 mb-1">Distributed</h3>
              <p className="text-lg sm:text-xl lg:text-2xl font-bold text-green-400 break-words">{formatNumber(stats.totalDistributed)}</p>
              <p className="text-xs text-gray-400">{stats.percentageDistributed.toFixed(2)}% of supply</p>
            </div>

            <div className="bg-black/30 border border-gray-700 hover:border-orange-500 rounded-xl p-3 sm:p-4 transition-colors">
              <h3 className="text-xs sm:text-sm font-semibold text-gray-300 mb-1">Available</h3>
              <p className="text-lg sm:text-xl lg:text-2xl font-bold text-orange-400 break-words">{formatNumber(stats.availableForDistribution)}</p>
              <p className="text-xs text-gray-400">Ready to distribute</p>
            </div>

            <div className="bg-black/30 border border-gray-700 hover:border-orange-500 rounded-xl p-3 sm:p-4 transition-colors">
              <h3 className="text-xs sm:text-sm font-semibold text-gray-300 mb-1">Total Donations</h3>
              <p className="text-lg sm:text-xl lg:text-2xl font-bold text-blue-400 break-words">${formatNumber(stats.totalDonationsUsd)}</p>
              <p className="text-xs text-gray-400">USD equivalent</p>
            </div>
          </div>

          {/* Distribution Progress */}
          <div className="bg-black/30 border border-gray-700 hover:border-orange-500 rounded-xl p-3 sm:p-4 lg:p-6 transition-colors">
            <h3 className="text-base sm:text-lg lg:text-xl font-bold text-orange-400 mb-3 sm:mb-4">Distribution Progress</h3>
            <div className="space-y-2 sm:space-y-3">
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-300 font-medium">Progress</span>
                <span className="text-white font-bold">{stats.percentageDistributed.toFixed(2)}%</span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-2 sm:h-3">
                <div
                  className="bg-gradient-to-r from-orange-500 to-green-500 h-2 sm:h-3 rounded-full transition-all duration-300"
                  style={{ width: `${Math.min(stats.percentageDistributed, 100)}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-gray-400">
                <span>0</span>
                <span>{formatNumber(stats.totalSupply)}</span>
              </div>
            </div>
          </div>

          {/* Manual Token Distribution */}
          <ManualTokenDistribution 
            adminId="admin"
            onDistributionComplete={(result) => {
              console.log('Manual distribution completed:', result);
              // Refresh stats after successful distribution
              if (result.success) {
                fetchStats(true);
              }
            }}
          />

          {/* Last Updated */}
          <div className="text-center sm:text-right">
            <p className="text-xs text-gray-400">
              Last updated: {new Date().toLocaleString()}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default TokenDistribution;
