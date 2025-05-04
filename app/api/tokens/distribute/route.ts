import { NextRequest, NextResponse } from 'next/server';
import { ethers } from 'ethers';
import { doc, getDoc, updateDoc, collection, addDoc } from 'firebase/firestore';
import { db } from '../../../../lib/firebase';
import { g33TokenDistributorService } from '../../../../services/g33TokenDistributorService';

// Simplified ABI of G33TokenDistributor contract
const DISTRIBUTOR_ABI = [
  "function distributeTokens(address donor, uint256 donationAmountUsd) external",
  "function getAvailableTokens() external view returns (uint256)",
  "function distributors(address) external view returns (bool)",
  "function tokensDistributed(address) external view returns (uint256)"
];

// Expanded list of RPC URLs for greater resilience
// Including WebSockets endpoints (WSS) that can bypass some firewalls
const POLYGON_RPC_URLS = [
  // WebSocket endpoints that can bypass firewall blocks
  "wss://polygon-mainnet.g.alchemy.com/v2/demo",  // Public Alchemy
  "wss://ws-matic-mainnet.chainstacklabs.com",    // ChainStack
  
  // Standard HTTP endpoints
  'https://polygon-rpc.com',                      // Default endpoint
  'https://polygon.llamarpc.com',
  'https://polygon-mainnet.public.blastapi.io',
  'https://polygon.meowrpc.com',
  'https://rpc-mainnet.maticvigil.com',
  'https://polygon-bor.publicnode.com',
  
  // Infura endpoint (with public key for testing)
  'https://polygon-mainnet.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161'
];

const INFURA_KEY = "7b71460a7cfd447295a93a1d76a71ed6";
const POLYGON_RPC_URL = `https://polygon-mainnet.infura.io/v3/${INFURA_KEY}`;

// Settings for different networks
const NETWORK_RPC_URLS = {
  'polygon': POLYGON_RPC_URL,
  'ethereum': process.env.ETHEREUM_RPC_URL || 'https://eth.llamarpc.com',
  'bsc': process.env.BSC_RPC_URL || 'https://bsc-dataseed.binance.org'
};

/**
 * Attempts to create a reliable provider for the Polygon network with multiple attempts
 * @returns A connected provider or undefined if it fails
 */
async function getReliableProvider(): Promise<ethers.providers.Provider | undefined> {
  console.log("🌐 Attempting to connect to main RPC:", POLYGON_RPC_URL);
  
  try {
    // First, try with Infura
    const provider = new ethers.providers.JsonRpcProvider(POLYGON_RPC_URL);
    const blockNumber = await provider.getBlockNumber();
    console.log(`✅ RPC connection successful. Current block: ${blockNumber}`);
    return provider;
  } catch (error) {
    console.error("❌ Failed to connect to Infura RPC:", error);
    
    // If Infura fails, try alternative RPC
    try {
      const backupUrl = "https://polygon-rpc.com";
      console.log("🔄 Trying alternative RPC:", backupUrl);
      const provider = new ethers.providers.JsonRpcProvider(backupUrl);
      const blockNumber = await provider.getBlockNumber();
      console.log(`✅ Alternative connection successful. Block: ${blockNumber}`);
      return provider;
    } catch (backupError) {
      console.error("❌ Alternative RPC also failed:", backupError);
      return undefined;
    }
  }
}

async function createRpcProvider(): Promise<ethers.providers.Provider | undefined> {
  const providerConfigs = [
    {
      url: `https://polygon-mainnet.infura.io/v3/${process.env.INFURA_KEY || "7b71460a7cfd447295a93a1d76a71ed6"}`,
      network: {name: "polygon", chainId: 137}
    },
    {
      url: "https://polygon-rpc.com",
      network: {name: "polygon", chainId: 137}
    },
    {
      url: "https://rpc.ankr.com/polygon",
      network: {name: "polygon", chainId: 137}
    }
  ];

  for (const config of providerConfigs) {
    try {
      console.log(`🔄 [API] Attempting to connect to RPC: ${config.url}`);
      
      const provider = new ethers.providers.JsonRpcProvider({
        url: config.url,
        // Removed invalid 'network' property
        skipFetchSetup: true
      });

      // Add timeout for connection verification
      const networkCheck = Promise.race([
        provider.getNetwork(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 5000))
      ]);

      const network = await networkCheck;
      if ((network as ethers.providers.Network).chainId === 137) {
        const blockNumber = await provider.getBlockNumber();
        console.log(`✅ [API] Successfully connected to RPC ${config.url}. Block: ${blockNumber}`);
        return provider;
      }
    } catch (error) {
      console.warn(`❌ [API] Failed to connect to RPC ${config.url}:`, error instanceof Error ? error.message : String(error));
      continue;
    }
  }

  return undefined;
}

/**
 * API for secure distribution of G33 tokens after donations
 * This API runs on the server side and has secure access to private keys
 */
export async function POST(request: NextRequest) {
  try {
    console.log("🔄 [API] Starting G33 token distribution");

    let requestData;
    try {
      requestData = await request.json();
    } catch (parseError) {
      console.error("❌ [API] Error parsing request body:", parseError);
      return NextResponse.json(
        { success: false, error: 'Error parsing request body' },
        { status: 400 }
      );
    }

    const { donorAddress, donationId, transactionHash, network, cryptoSymbol } = requestData;
    // Initialize usdValue as let to allow modifications
    let usdValue = requestData.usdValue;

    // DIAGNOSTICS: Adding detailed logs for debugging
    console.log("📊 [API] USD value received:", usdValue, "Type:", typeof usdValue);
    console.log("📊 [API] Complete request data:", JSON.stringify(requestData, null, 2));

    if (!donorAddress || !ethers.utils.isAddress(donorAddress)) {
      return NextResponse.json(
        { success: false, error: 'Invalid donor address' },
        { status: 400 }
      );
    }

    // ADDITIONAL VALIDATIONS: Ensure value is a valid number and in correct format
    if (!usdValue || typeof usdValue !== 'number' || usdValue <= 0) {
      console.error(`❌ [API] Invalid USD value: ${usdValue} (${typeof usdValue})`);
      return NextResponse.json(
        { success: false, error: 'Invalid USD value' },
        { status: 400 }
      );
    }

    // CRITICAL VALIDATION: Check if value is an integer
    if (usdValue % 1 !== 0) {
      console.warn(`⚠️ [API] USD value ${usdValue} contains decimals and will be rounded to ${Math.floor(usdValue)}`);
      usdValue = Math.floor(usdValue);
    }

    // CRITICAL VALIDATION: Ensure minimum value of 1 USD
    if (usdValue < 1) {
      console.error(`❌ [API] USD value too low: ${usdValue}. Minimum required: 1 USD`);
      return NextResponse.json(
        { success: false, error: 'USD value too low. Minimum required: 1 USD', value: usdValue },
        { status: 400 }
      );
    }

    // DIAGNOSTICS: Showing value that will be sent to contract
    console.log(`📊 [API] Final USD value to be processed: ${usdValue}`);
    console.log(`📊 [API] Value that will be sent to contract (x100): ${usdValue * 100}`);
    console.log(`📊 [API] Value in hexadecimal: 0x${(usdValue * 100).toString(16)}`);

    // Ensure service is initialized before proceeding
    if (!g33TokenDistributorService.checkIsInitialized()) {
      console.log("⏳ [API] Waiting for service initialization...");
      // Force initialization and wait for completion
      await g33TokenDistributorService.init(true); // Force initialization even if attempted recently
      
      // Check again after initialization attempt
      if (!g33TokenDistributorService.checkIsInitialized()) {
        const error = g33TokenDistributorService.getInitializationError() || "Unknown error";
        console.error(`❌ [API] Service not initialized after attempt: ${error}`);
        return NextResponse.json(
          { 
            success: false, 
            error: 'Distributor service not initialized', 
            details: `Could not initialize service: ${error}`
          },
          { status: 503 }
        );
      }
    }

    try {
      console.log("✅ [API] Service initialized, proceeding with distribution");
      try {
        const distributionResult = await g33TokenDistributorService.distributeTokens(donorAddress, usdValue, true);

        if (!distributionResult) {
          throw new Error('Failed to distribute tokens. Check logs for more details.');
        }

        console.log("✅ [API] Tokens distributed successfully");

        if (donationId) {
          await updateDoc(doc(db, 'tokenDonations', donationId), {
            status: 'distributed',
            distributionTxHash: distributionResult,
            updatedAt: new Date()
          });
        }

        // Verify transaction to ensure execution didn't fail
        console.log("[API] Checking transaction status on blockchain...");
        const receipt = await g33TokenDistributorService.getTransactionReceipt(distributionResult);
        
        if (receipt && receipt.status === 0) {
          console.error("❌ [API] Transaction was included in blockchain, but contract execution failed (status=0)");
          
          // Update record to reflect error
          if (donationId) {
            await updateDoc(doc(db, 'tokenDonations', donationId), {
              status: 'failed',
              error: 'Execution reverted: Transaction was included in blockchain but contract execution failed',
              updatedAt: new Date()
            });
          }
          
          return NextResponse.json({
            success: false,
            transactionHash: distributionResult,
            error: 'Contract execution failed (execution reverted)',
            message: `Transaction ${distributionResult} was included in blockchain, but execution failed. Check at https://polygonscan.com/tx/${distributionResult}`
          }, { status: 400 });
        }

        return NextResponse.json({
          success: true,
          transactionHash: distributionResult,
          message: `Token distribution completed successfully.`
        });
      } catch (error: unknown) {
        if (error instanceof Error) {
          console.error("❌ [API] Error distributing tokens:", error.message);
          return NextResponse.json(
            { success: false, error: 'Error distributing tokens', details: error.message },
            { status: 500 }
          );
        } else {
          console.error("❌ [API] Unknown error distributing tokens:", error);
          return NextResponse.json(
            { success: false, error: 'Unknown error distributing tokens', details: String(error) },
            { status: 500 }
          );
        }
      }
    } catch (error: unknown) {
      if (error instanceof Error) {
        console.error("❌ [API] Error distributing tokens:", error.message);
        return NextResponse.json(
          { success: false, error: 'Error distributing tokens', details: error.message },
          { status: 500 }
        );
      } else {
        console.error("❌ [API] Unknown error distributing tokens:", error);
        return NextResponse.json(
          { success: false, error: 'Unknown error distributing tokens', details: String(error) },
          { status: 500 }
        );
      }
    }
  } catch (error) {
    console.error("❌ [API] Unexpected error:", error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Unexpected error', 
        details: error instanceof Error ? error.message : String(error) 
      },
      { status: 500 }
    );
  }
}