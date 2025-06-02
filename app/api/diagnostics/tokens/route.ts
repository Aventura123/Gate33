import { NextResponse } from 'next/server';
import { ethers } from 'ethers';
import { getHttpRpcUrls } from '@/config/rpcConfig';

// Import global server config and status
let serverStatus: any;
try {
  serverStatus = require('../../../../lib/server-init').serverStatus;
} catch (error: any) {
  console.error("Error importing server status:", error);
  serverStatus = { contractMonitoring: { errors: ["Error importing server status"] } };
}

// Simplified function to test blockchain connection using only configured RPCs
async function testBlockchainConnection() {
  const debugInfo: any = { triedUrls: [] };
  try {
    // Get RPC URLs from centralized config
    const rpcUrls = getHttpRpcUrls('polygon');
    
    if (!rpcUrls || rpcUrls.length === 0) {
      return {
        success: false,
        error: "No Polygon RPC configured",
        debugInfo
      };
    }
    
    // Use the first valid RPC from the list
    const url = rpcUrls[0];
    debugInfo.triedUrls.push(url);
    
    try {
      const provider = new ethers.providers.JsonRpcProvider(url);
      const blockNumber = await Promise.race([
        provider.getBlockNumber(),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Timeout')), 3000))
      ]);
      
      return {
        success: true,
        provider,
        blockNumber,
        url: url.includes('api_key') ? url.replace(/api_key=.*/, 'api_key=****') : url,
        debugInfo
      };
    } catch (error: any) {
      debugInfo.error = error.message || String(error);
      return {
        success: false,
        error: `Failed to connect to Polygon RPC: ${error.message}`,
        debugInfo
      };
    }
  } catch (error: any) {
    debugInfo.catchError = error.message;
    return {
      success: false,
      error: error.message,
      debugInfo
    };
  }
}

// Explicit typing for the distributor status function return
interface TokenDistributorStatus {
  success: boolean;
  error?: any;
  contract?: any;
  blockchainConnection?: any;
  debugInfo: any;
}

// Function to check token distributor status
async function checkTokenDistributorStatus(): Promise<TokenDistributorStatus> {
  try {
    // Token distributor contract address
    const tokenDistributorAddress = process.env.TOKEN_DISTRIBUTOR_ADDRESS || process.env.G33_TOKEN_DISTRIBUTOR_ADDRESS;
    
    // Check if address exists
    if (!tokenDistributorAddress) {
      return {
        success: false,
        error: "Token distributor address not configured in environment (.env)",
        debugInfo: { envCheck: "TOKEN_DISTRIBUTOR_ADDRESS and G33_TOKEN_DISTRIBUTOR_ADDRESS not found" }
      };
    }
    
    // Check blockchain connection
    const connectionTest = await testBlockchainConnection();
    if (!connectionTest.success || !connectionTest.provider) {
      return {
        success: false,
        error: connectionTest.error || "Unknown error connecting to blockchain",
        debugInfo: connectionTest.debugInfo || null
      };
    }
    
    // Minimal ABI to check the contract
    const minimalAbi = [
      // Typical functions of a token distributor contract
      "function tokenAddress() view returns (address)",
      "function distributionEnabled() view returns (bool)",
      "function availableTokensForDistribution() view returns (uint256)",
      "function totalDistributed() view returns (uint256)",
      // No need for event for basic check
    ];
    
    // Create contract instance
    const contract = new ethers.Contract(tokenDistributorAddress, minimalAbi, connectionTest.provider);
    
    // Basic checks to see if contract is responding
    let contractChecks: any = {
      address: tokenDistributorAddress,
      isValid: false,
      tokenAddress: null,
      distributionEnabled: false,
      availableTokens: "0",
      totalDistributed: "0",
    };
    
    // Check if there is contract code at this address
    const code = await connectionTest.provider.getCode(tokenDistributorAddress);
    contractChecks.isValid = code !== "0x";
    
    if (contractChecks.isValid) {
      try {
        // Try to get token address
        contractChecks.tokenAddress = await contract.tokenAddress();
      } catch (error: any) {
        console.warn("Function tokenAddress() not found in contract:", error);
        // Not a fatal problem, contract may use another name
      }
      
      try {
        // Try to check if distribution is enabled
        contractChecks.distributionEnabled = await contract.distributionEnabled();
      } catch (error: any) {
        console.warn("Function distributionEnabled() not found in contract:", error);
      }
      
      try {
        // Try to get available tokens for distribution
        const availableTokens = await contract.availableTokensForDistribution();
        contractChecks.availableTokens = ethers.utils.formatEther(availableTokens);
      } catch (error: any) {
        console.warn("Function availableTokensForDistribution() not found in contract:", error);
      }
      
      try {
        // Try to get total distributed
        const totalDistributed = await contract.totalDistributed();
        contractChecks.totalDistributed = ethers.utils.formatEther(totalDistributed);
      } catch (error: any) {
        console.warn("Function totalDistributed() not found in contract:", error);
      }
    }
    
    return {
      success: contractChecks.isValid,
      contract: contractChecks,
      blockchainConnection: connectionTest,
      debugInfo: connectionTest.debugInfo || null
    };
  } catch (error: any) {
    console.error("Error checking token distributor status:", error);
    return {
      success: false,
      error: error.message,
      debugInfo: null
    };
  }
}

export async function GET() {
  try {
    // Check token configuration
    const tokensConfig = {
      distributorAddress: process.env.TOKEN_DISTRIBUTOR_ADDRESS || process.env.G33_TOKEN_DISTRIBUTOR_ADDRESS,
      tokenAddress: process.env.G33_TOKEN_ADDRESS,
    };
      // Check monitoring status - prioritize serverStatus
    let monitoringStatus = {
      initialized: false,
      tokenDistributionActive: false,
      walletMonitoringActive: false,
      errors: ["Monitoring status not available"],
      warnings: [], 
      connectionType: 'unknown',
      lastStatus: 'unknown'
    };
    
    // If serverStatus is available, use it
    if (serverStatus && serverStatus.contractMonitoring) {
      monitoringStatus = {
        initialized: serverStatus.contractMonitoring.initialized || false,
        tokenDistributionActive: serverStatus.contractMonitoring.tokenDistributionActive || false,
        walletMonitoringActive: serverStatus.contractMonitoring.walletMonitoringActive || false,
        errors: serverStatus.contractMonitoring.errors || [],
        warnings: serverStatus.contractMonitoring.warnings || [],
        connectionType: serverStatus.contractMonitoring.connectionType || 'unknown',
        lastStatus: serverStatus.contractMonitoring.lastStatus || 'unknown'
      };
    }
    
    // Run token distributor checks
    const tokenDistributorStatus = await checkTokenDistributorStatus();
    
    // Check for specific errors related to token distributor
    const tokenErrors = monitoringStatus.errors?.filter((err: string) => 
      err.toLowerCase().includes('token') || 
      err.toLowerCase().includes('distributor')
    ) || [];
    
    // Build response
    const response = {
      tokensConfig,
      monitoringStatus,
      tokenDistribution: tokenDistributorStatus.contract || null,
      blockchainConnection: tokenDistributorStatus.blockchainConnection || null,
      errors: [...tokenErrors], // Specific token monitoring errors
      warnings: monitoringStatus.warnings || [], // Include warnings to inform user
      diagnosticTimestamp: new Date().toISOString(),
      debugInfo: tokenDistributorStatus.blockchainConnection?.debugInfo || tokenDistributorStatus.debugInfo || null
    };
    
    return NextResponse.json(response, { status: 200 });
    
  } catch (error: any) {
    console.error("Error generating token diagnostics:", error);
    
    return NextResponse.json({ 
      error: error.message || "Unknown error generating diagnostics",
      diagnosticTimestamp: new Date().toISOString()
    }, { status: 500 });
  }
}