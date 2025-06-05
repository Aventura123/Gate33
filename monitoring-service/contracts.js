/**
 * Module for blockchain contract monitoring
 * This script is responsible for checking and monitoring contracts on different networks
 */
const ethers = require('ethers');
const fetch = require('node-fetch');
const path = require('path');

// Import RPC config from main project
const rpcConfigPath = path.join(__dirname, '..', 'config', 'rpcConfig.ts');
let getHttpRpcUrls, getWsRpcUrls;

try {
  // To use TypeScript in Node.js, we need to compile or use ts-node
  // Alternatively, let's define the config here based on the existing file
  const INFURA_KEY = process.env.INFURA_KEY || process.env.NEXT_PUBLIC_INFURA_KEY || '7b71460a7cfd447295a93a1d76a71ed6';
  
  const CUSTOM_RPC = {
    polygon: process.env.CUSTOM_POLYGON_RPC,
    ethereum: process.env.CUSTOM_ETHEREUM_RPC,
    binance: process.env.CUSTOM_BSC_RPC,
    avalanche: process.env.CUSTOM_AVALANCHE_RPC,
    optimism: process.env.CUSTOM_OPTIMISM_RPC,
  };

  const HTTP_RPC_URLS = {
    polygon: [
      CUSTOM_RPC.polygon,
      `https://polygon-mainnet.infura.io/v3/${INFURA_KEY}`,
      'https://polygon-rpc.com',
      'https://polygon-bor.publicnode.com',
      'https://rpc-mainnet.matic.quiknode.pro',
    ].filter(Boolean),
    ethereum: [
      CUSTOM_RPC.ethereum,
      `https://mainnet.infura.io/v3/${INFURA_KEY}`,
      'https://eth.llamarpc.com',
      'https://rpc.ankr.com/eth',
    ].filter(Boolean),
    binance: [
      CUSTOM_RPC.binance,
      'https://bsc-dataseed.binance.org',
      'https://bsc.publicnode.com',
    ].filter(Boolean),
    avalanche: [
      CUSTOM_RPC.avalanche,
      'https://api.avax.network/ext/bc/C/rpc',
      'https://avalanche-c-chain.publicnode.com',
    ].filter(Boolean),
    optimism: [
      CUSTOM_RPC.optimism,
      `https://optimism-mainnet.infura.io/v3/${INFURA_KEY}`,
      'https://optimism.publicnode.com',
    ].filter(Boolean),
  };

  getHttpRpcUrls = (network) => {
    const n = network.toLowerCase();
    return HTTP_RPC_URLS[n] || [];
  };

} catch (err) {
  console.warn('⚠️ Could not load rpcConfig, using fallback configuration');
  getHttpRpcUrls = () => [];
}

// Configurations and constants
const ALERT_THRESHOLD_ETH = 0.1;  // Alert if spend is greater than this value in ETH
const ALERT_THRESHOLD_TOKENS = 5000; // Alert if more than 5000 tokens are distributed in one operation

// Networks to monitor
const getNetworks = () => {
  return (process.env.MONITOR_NETWORKS || 'polygon,ethereum,binance').split(',').map(n => n.trim().toLowerCase());
};

// RPC URLs per network - using config from rpcConfig.ts
const getRpcUrls = () => {
  return {
    ethereum: getHttpRpcUrls('ethereum'),
    polygon: getHttpRpcUrls('polygon'),
    binance: getHttpRpcUrls('binance'),
    avalanche: getHttpRpcUrls('avalanche'),
    optimism: getHttpRpcUrls('optimism')
  };
};

// Service wallet address
const getServiceWallet = () => process.env.SERVICE_WALLET_ADDRESS || '0xDdbC4f514019d835Dd9Ac6198fDa45c39512552C';

// Contract addresses
const getTokenDistributor = () => process.env.TOKEN_DISTRIBUTOR_ADDRESS || process.env.G33_TOKEN_DISTRIBUTOR_ADDRESS || '';

// Learn2Earn contracts addresses
const getLearn2EarnContracts = () => ({
  'avalanche': process.env.LEARN2EARN_AVALANCHE_ADDRESS || '',
  'binance': process.env.LEARN2EARN_BSC_ADDRESS || '',
  'optimism': process.env.LEARN2EARN_OPTIMISM_ADDRESS || '',
  'polygon': process.env.LEARN2EARN_POLYGON_ADDRESS || '',
  'ethereum': process.env.LEARN2EARN_ETHEREUM_ADDRESS || ''
});

// InstantJobsEscrow contract addresses
const getInstantJobsEscrowContracts = () => ({
  'avalanche': process.env.INSTANT_JOBS_ESCROW_AVALANCHE_ADDRESS || '',
  'binance': process.env.INSTANT_JOBS_ESCROW_BSC_ADDRESS || '',
  'optimism': process.env.INSTANT_JOBS_ESCROW_OPTIMISM_ADDRESS || '',
  'polygon': process.env.INSTANT_JOBS_ESCROW_POLYGON_ADDRESS || '',
  'ethereum': process.env.INSTANT_JOBS_ESCROW_ETHEREUM_ADDRESS || ''
});

// Main function to monitor contracts
async function monitorContracts(db) {
  console.log('🔍 Checking blockchain contracts...');
  const results = {
    timestamp: new Date().toISOString(),
    errors: []
  };

  // Create providers for each network
  const networks = getNetworks();
  const rpcUrls = getRpcUrls();
  const providers = {};

  // Initialize providers for each configured network
  for (const network of networks) {
    try {
      const urls = rpcUrls[network];
      if (!urls || !urls.length) {
        results.errors.push(`RPC URL not configured for network ${network}`);
        continue;
      }      // Use the first available URL
      providers[network] = new ethers.providers.JsonRpcProvider(urls[0]);
      
      // Check connection
      await providers[network].getBlockNumber();
      console.log(`✅ Connection established with ${network}`);
    } catch (error) {
      console.error(`❌ Error connecting to network ${network}:`, error);
      results.errors.push(`Failed to connect to network ${network}: ${error.message}`);
    }
  }

  // Check service wallet
  const serviceWalletAddress = getServiceWallet();
  const monitDocs = [];

  if (serviceWalletAddress) {
    for (const [network, provider] of Object.entries(providers)) {      try {
        const balance = await provider.getBalance(serviceWalletAddress);
        const balanceEth = parseFloat(ethers.formatEther(balance));
        
        console.log(`💰 Balance on ${network}: ${balanceEth} ETH`);
        
        // Register in Firestore
        const walletDoc = {
          network,
          address: serviceWalletAddress,
          balance: balanceEth,
          timestamp: new Date().toISOString(),
          type: 'wallet'
        };
        
        monitDocs.push({
          collection: 'monitoring',
          id: `wallet_${network}`,
          data: walletDoc
        });

        // Check if balance is low
        if (balanceEth < 0.01) {
          const message = `⚠️ Alert: Low balance in service wallet on network ${network}: ${balanceEth} ETH`;
          console.warn(message);
          results.errors.push(message);
            // Additional record for alerts
          monitDocs.push({
            collection: 'monitoring/data/alerts',
            id: `wallet_low_${network}_${Date.now()}`,
            data: {
              type: 'wallet_balance',
              severity: 'warning',
              message,
              timestamp: new Date().toISOString()
            }
          });
        }
      } catch (error) {
        console.error(`❌ Error checking wallet on ${network}:`, error);
        results.errors.push(`Failed to check wallet on ${network}: ${error.message}`);
      }
    }
  } else {
    console.warn('⚠️ Service wallet address not configured');
    results.errors.push('Service wallet address not configured');
  }

  // Check Learn2Earn contracts
  const learn2EarnContracts = getLearn2EarnContracts();
  for (const [network, address] of Object.entries(learn2EarnContracts)) {
    if (!address) continue;
      try {
      // Check if we have a provider for this network
      if (!providers[network]) {
        console.warn(`⚠️ Provider not available for Learn2Earn on ${network}`);
        continue;
      }
      
      // Use the correct provider
      const provider = providers[network];
      
      // Minimal ABI for Learn2Earn
      const minimalAbi = [
        "function name() view returns (string)",
        "function totalClaims() view returns (uint256)",
        "function isActive() view returns (bool)"
      ];
      
      // Create contract instance
      const contract = new ethers.Contract(address, minimalAbi, provider);
      
      // Check status
      let active = false;
      try {
        active = await contract.isActive();
      } catch (statusErr) {
        // Function may not exist in all versions
        active = true; // Assume active if unable to check
      }
      
      // Register in Firestore
      const contractDoc = {
        network,
        address,
        active,
        timestamp: new Date().toISOString(),
        type: 'learn2earn'
      };
      
      monitDocs.push({
        collection: 'monitoring',
        id: `learn2earn_${network}`,
        data: contractDoc
      });
      
      console.log(`📘 Learn2Earn on ${network}: ${active ? 'Active' : 'Inactive'}`);
      
    } catch (error) {
      console.error(`❌ Error checking Learn2Earn on ${network}:`, error);
      results.errors.push(`Failed to check Learn2Earn on ${network}: ${error.message}`);
    }
  }
  
  // Check InstantJobsEscrow contracts
  const instantJobsContracts = getInstantJobsEscrowContracts();
  for (const [network, address] of Object.entries(instantJobsContracts)) {
    if (!address) continue;
      try {
      // Check if we have a provider for this network
      if (!providers[network]) {
        console.warn(`⚠️ Provider not available for InstantJobsEscrow on ${network}`);
        continue;
      }
      
      // Use the correct provider
      const provider = providers[network];
      
      // Minimal ABI for InstantJobsEscrow
      const minimalAbi = [
        "function getEscrowStats() view returns (uint256, uint256, uint256, uint256)"
      ];
      
      // Create contract instance
      const contract = new ethers.Contract(address, minimalAbi, provider);
      
      // Check status
      let active = true;  // Assume active by default
      let stats = [0, 0, 0, 0];
      
      try {
        stats = await contract.getEscrowStats();
      } catch (statusErr) {
        // Function may not exist in all versions
        console.warn(`⚠️ Could not get stats from ${network}:`, statusErr.message);
      }
      
      // Register in Firestore
      const contractDoc = {
        network,
        address,
        active,
        totalJobs: stats[0]?.toString() || '0',
        activeJobs: stats[1]?.toString() || '0',
        completedJobs: stats[2]?.toString() || '0',
        cancelledJobs: stats[3]?.toString() || '0',
        timestamp: new Date().toISOString(),
        type: 'instantjobs'
      };
      
      monitDocs.push({
        collection: 'monitoring',
        id: `instantjobs_${network}`,
        data: contractDoc
      });
      
      console.log(`🔄 InstantJobsEscrow on ${network}: Active`);
      
    } catch (error) {
      console.error(`❌ Error checking InstantJobsEscrow on ${network}:`, error);
      results.errors.push(`Failed to check InstantJobsEscrow on ${network}: ${error.message}`);
    }
  }
  
  // Check Token Distributor
  const tokenDistributorAddress = getTokenDistributor();
  if (tokenDistributorAddress) {
    // Assume Token Distributor is on Polygon network
    const network = 'polygon';
    if (providers[network]) {
      try {
        // Minimal ABI for TokenDistributor
        const minimalAbi = [
          "function totalDistributed() view returns (uint256)",
          "function availableTokensForDistribution() view returns (uint256)"
        ];
        
        // Create contract instance
        const contract = new ethers.Contract(tokenDistributorAddress, minimalAbi, providers[network]);
        
        // Check status
        const totalDistributed = await contract.totalDistributed();
        const formattedTotal = ethers.formatEther(totalDistributed);
        
        let availableTokens = '0';
        try {
          const available = await contract.availableTokensForDistribution();
          availableTokens = ethers.formatEther(available);
        } catch (availErr) {
          console.warn("⚠️ Could not get available tokens:", availErr.message);
        }
        
        // Register in Firestore
        const contractDoc = {
          network,
          address: tokenDistributorAddress,
          totalDistributed: formattedTotal,
          availableTokens,
          active: true,
          timestamp: new Date().toISOString(),
          type: 'tokendistributor'
        };
        
        monitDocs.push({
          collection: 'monitoring',
          id: 'tokendistributor',
          data: contractDoc
        });
        
        console.log(`🪙 Token Distributor: ${formattedTotal} tokens distributed`);
        
      } catch (error) {
        console.error(`❌ Error checking Token Distributor:`, error);
        results.errors.push(`Failed to check Token Distributor: ${error.message}`);
      }
    } else {
      console.warn(`⚠️ Provider not available for Token Distributor on ${network}`);
      results.errors.push(`Provider not available for Token Distributor`);
    }
  } else {
    console.warn('⚠️ Token Distributor address not configured');
    results.errors.push('Token Distributor address not configured');
  }
  
  // Register documents in Firestore
  if (monitDocs.length > 0) {
    try {
      const batch = db.batch();
      
      for (const doc of monitDocs) {
        // Correct for the right subcollection
        const docRef = db.collection('monitoring').doc('contracts').collection('items').doc(doc.id);
        batch.set(docRef, doc.data, { merge: true });
      }
      
      await batch.commit();
      console.log(`✅ ${monitDocs.length} documents updated in Firestore`);
    } catch (firestoreError) {
      console.error(`❌ Error updating Firestore:`, firestoreError);
      results.errors.push(`Failed to update Firestore: ${firestoreError.message}`);
    }
  }
  
  // Update monitoring status
  const active = Object.keys(providers).length > 0;
  
  try {
    await db.collection('monitoring').doc('status').set({
      contractsActive: active,
      lastContractCheck: new Date().toISOString(),
      monitContracts: monitDocs.length,
      contractsErrors: results.errors
    }, { merge: true });
  } catch (statusErr) {
    console.error(`❌ Error updating status:`, statusErr);
    results.errors.push(`Failed to update status: ${statusErr.message}`);
  }

  return results;
}

module.exports = { monitorContracts };
