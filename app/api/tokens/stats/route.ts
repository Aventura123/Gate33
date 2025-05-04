import { NextRequest, NextResponse } from 'next/server';
import { g33TokenDistributorService } from '../../../../services/g33TokenDistributorService';

// Token information constants
const TOKEN_INFO = {
  name: 'Gate33 Token',
  symbol: 'G33',
  totalSupply: 3300000, // 3.3 million tokens
};

/**
 * API endpoint to fetch token distribution statistics
 * This runs on the server side with access to environment variables
 */
export async function GET(request: NextRequest) {
  try {
    console.log("🔄 Fetching token distribution statistics");
    
    // Check if the distributor service is properly initialized
    if (!g33TokenDistributorService.checkIsInitialized()) {
      console.warn("⚠️ Token distributor service not initialized");
      
      const initError = g33TokenDistributorService.getInitializationError();
      console.error(`❌ Initialization error: ${initError || 'Unknown error'}`);
      
      // Return basic stats with service unavailable flag
      return NextResponse.json({
        totalSupply: TOKEN_INFO.totalSupply,
        totalDistributed: 0,
        availableForDistribution: TOKEN_INFO.totalSupply,
        totalDonationsUsd: 0,
        percentageDistributed: 0,
        isServiceAvailable: false,
        error: initError || "Service not initialized"
      });
    }
    
    // Fetch statistics from the distributor service
    try {
      const stats = await g33TokenDistributorService.getDistributionStats();
      
      return NextResponse.json({
        totalSupply: TOKEN_INFO.totalSupply,
        totalDistributed: parseFloat(stats.totalDistributed),
        availableForDistribution: parseFloat(stats.availableTokens),
        totalDonationsUsd: parseFloat(stats.totalDonationsUsd),
        percentageDistributed: parseFloat(stats.totalDistributed) / TOKEN_INFO.totalSupply * 100,
        isServiceAvailable: true
      });
    } catch (statsError: any) {
      console.error('❌ Error fetching token statistics:', statsError);
      
      return NextResponse.json({
        totalSupply: TOKEN_INFO.totalSupply,
        totalDistributed: 0,
        availableForDistribution: TOKEN_INFO.totalSupply,
        totalDonationsUsd: 0,
        percentageDistributed: 0,
        isServiceAvailable: false,
        error: statsError.message || "Error fetching statistics"
      }, { status: 500 });
    }
  } catch (error: any) {
    console.error('❌ Unhandled error in token stats API:', error);
    
    return NextResponse.json({
      success: false,
      error: error.message || 'Unknown error fetching token statistics'
    }, { status: 500 });
  }
}