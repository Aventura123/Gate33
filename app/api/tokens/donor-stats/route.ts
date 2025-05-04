import { NextRequest, NextResponse } from 'next/server';
import { g33TokenDistributorService } from '../../../../services/g33TokenDistributorService';
import { ethers } from 'ethers';

/**
 * API endpoint to fetch token information specific to a donor address
 * This runs on the server side with access to environment variables
 */
export async function GET(request: NextRequest) {
  try {
    // Extract the donor address from the URL query parameters
    const { searchParams } = new URL(request.url);
    const address = searchParams.get('address');
    
    // Validate the address parameter
    if (!address) {
      return NextResponse.json({ 
        error: 'Missing address parameter' 
      }, { status: 400 });
    }
    
    if (!ethers.utils.isAddress(address)) {
      return NextResponse.json({ 
        error: 'Invalid Ethereum address format' 
      }, { status: 400 });
    }
    
    console.log(`🔄 Fetching token information for donor: ${address}`);
    
    // Check if the distributor service is properly initialized
    if (!g33TokenDistributorService.checkIsInitialized()) {
      console.warn("⚠️ Token distributor service not initialized");
      
      const initError = g33TokenDistributorService.getInitializationError();
      console.error(`❌ Initialization error: ${initError || 'Unknown error'}`);
      
      // Return empty stats with service unavailable flag
      return NextResponse.json({
        tokensDistributed: 0,
        isServiceAvailable: false,
        error: initError || "Service not initialized"
      });
    }
    
    // Fetch donor-specific information from the distributor service
    try {
      const tokensStr = await g33TokenDistributorService.getTokensDistributedToDonor(address);
      const tokensDistributed = parseFloat(tokensStr);
      
      return NextResponse.json({
        tokensDistributed,
        isServiceAvailable: true
      });
    } catch (statsError: any) {
      console.error(`❌ Error fetching token information for donor ${address}:`, statsError);
      
      return NextResponse.json({
        tokensDistributed: 0,
        isServiceAvailable: false,
        error: statsError.message || "Error fetching donor statistics"
      }, { status: 500 });
    }
  } catch (error: any) {
    console.error('❌ Unhandled error in donor token stats API:', error);
    
    return NextResponse.json({
      success: false,
      error: error.message || 'Unknown error fetching donor token information'
    }, { status: 500 });
  }
}