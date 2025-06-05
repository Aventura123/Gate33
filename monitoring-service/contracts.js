/**
 * Módulo para monitoramento de contratos blockchain
 * Este script é responsável por verificar e monitorar os contratos nas diferentes redes
 */
const ethers = require('ethers');
const fetch = require('node-fetch');
const path = require('path');

// Importar configuração RPC do projeto principal
const rpcConfigPath = path.join(__dirname, '..', 'config', 'rpcConfig.ts');
let getHttpRpcUrls, getWsRpcUrls;

try {
  // Para usar TypeScript no Node.js, precisamos compilar ou usar ts-node
  // Como alternativa, vamos definir a configuração aqui baseada no arquivo existente
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
  console.warn('⚠️ Não foi possível carregar rpcConfig, usando configuração de fallback');
  getHttpRpcUrls = () => [];
}

// Configurações e constantes
const ALERT_THRESHOLD_ETH = 0.1;  // Alerta se gasto for maior que este valor em ETH
const ALERT_THRESHOLD_TOKENS = 5000; // Alerta se mais de 5000 tokens forem distribuídos numa operação

// Redes para monitorar
const getNetworks = () => {
  return (process.env.MONITOR_NETWORKS || 'polygon,ethereum,binance').split(',').map(n => n.trim().toLowerCase());
};

// URLs RPC por rede - usando configuração do rpcConfig.ts
const getRpcUrls = () => {
  return {
    ethereum: getHttpRpcUrls('ethereum'),
    polygon: getHttpRpcUrls('polygon'),
    binance: getHttpRpcUrls('binance'),
    avalanche: getHttpRpcUrls('avalanche'),
    optimism: getHttpRpcUrls('optimism')
  };
};

// Endereço da carteira de serviço
const getServiceWallet = () => process.env.SERVICE_WALLET_ADDRESS || '0xDdbC4f514019d835Dd9Ac6198fDa45c39512552C';

// Endereços dos contratos
const getTokenDistributor = () => process.env.TOKEN_DISTRIBUTOR_ADDRESS || process.env.G33_TOKEN_DISTRIBUTOR_ADDRESS || '';

// Learn2Earn contracts addresses
const getLearn2EarnContracts = () => ({
  'avalanche': process.env.LEARN2EARN_AVALANCHE_ADDRESS || '',
  'bsc': process.env.LEARN2EARN_BSC_ADDRESS || '',
  'optimism': process.env.LEARN2EARN_OPTIMISM_ADDRESS || '',
  'polygon': process.env.LEARN2EARN_POLYGON_ADDRESS || '',
  'ethereum': process.env.LEARN2EARN_ETHEREUM_ADDRESS || ''
});

// InstantJobsEscrow contract addresses
const getInstantJobsEscrowContracts = () => ({
  'avalanche': process.env.INSTANT_JOBS_ESCROW_AVALANCHE_ADDRESS || '',
  'bsc': process.env.INSTANT_JOBS_ESCROW_BSC_ADDRESS || '',
  'optimism': process.env.INSTANT_JOBS_ESCROW_OPTIMISM_ADDRESS || '',
  'polygon': process.env.INSTANT_JOBS_ESCROW_POLYGON_ADDRESS || '',
  'ethereum': process.env.INSTANT_JOBS_ESCROW_ETHEREUM_ADDRESS || ''
});

// Função principal para monitorar contratos
async function monitorContracts(db) {
  console.log('🔍 Verificando contratos blockchain...');
  const results = {
    timestamp: new Date().toISOString(),
    errors: []
  };

  // Criar providers para cada rede
  const networks = getNetworks();
  const rpcUrls = getRpcUrls();
  const providers = {};

  // Inicializar providers para cada rede configurada
  for (const network of networks) {
    try {
      const urls = rpcUrls[network];
      if (!urls || !urls.length) {
        results.errors.push(`RPC URL não configurada para rede ${network}`);
        continue;
      }      // Usar o primeiro URL disponível
      providers[network] = new ethers.JsonRpcProvider(urls[0]);
      
      // Verificar conexão
      await providers[network].getBlockNumber();
      console.log(`✅ Conexão estabelecida com ${network}`);
    } catch (error) {
      console.error(`❌ Erro conectando à rede ${network}:`, error);
      results.errors.push(`Falha ao conectar à rede ${network}: ${error.message}`);
    }
  }

  // Verificar carteira de serviço
  const serviceWalletAddress = getServiceWallet();
  const monitDocs = [];

  if (serviceWalletAddress) {
    for (const [network, provider] of Object.entries(providers)) {      try {
        const balance = await provider.getBalance(serviceWalletAddress);
        const balanceEth = parseFloat(ethers.formatEther(balance));
        
        console.log(`💰 Saldo na ${network}: ${balanceEth} ETH`);
        
        // Registrar no Firestore
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

        // Verificar se o saldo está baixo
        if (balanceEth < 0.01) {
          const message = `⚠️ Alerta: Saldo baixo na carteira de serviço na rede ${network}: ${balanceEth} ETH`;
          console.warn(message);
          results.errors.push(message);
            // Registro adicional para alertas
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
        console.error(`❌ Erro verificando carteira em ${network}:`, error);
        results.errors.push(`Falha ao verificar carteira em ${network}: ${error.message}`);
      }
    }
  } else {
    console.warn('⚠️ Endereço da carteira de serviço não configurado');
    results.errors.push('Endereço da carteira de serviço não configurado');
  }

  // Verificar contratos Learn2Earn
  const learn2EarnContracts = getLearn2EarnContracts();
  for (const [network, address] of Object.entries(learn2EarnContracts)) {
    if (!address) continue;
      try {
      // Verificar se temos um provider para esta rede
      if (!providers[network]) {
        console.warn(`⚠️ Provider não disponível para Learn2Earn em ${network}`);
        continue;
      }
      
      // Usar o provider correto
      const provider = providers[network];
      
      // ABI mínimo para Learn2Earn
      const minimalAbi = [
        "function name() view returns (string)",
        "function totalClaims() view returns (uint256)",
        "function isActive() view returns (bool)"
      ];
      
      // Criar instância do contrato
      const contract = new ethers.Contract(address, minimalAbi, provider);
      
      // Verificar status
      let active = false;
      try {
        active = await contract.isActive();
      } catch (statusErr) {
        // Função pode não existir em todas versões
        active = true; // Assumir ativo se não conseguir verificar
      }
      
      // Registrar no Firestore
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
      
      console.log(`📘 Learn2Earn em ${network}: ${active ? 'Ativo' : 'Inativo'}`);
      
    } catch (error) {
      console.error(`❌ Erro verificando Learn2Earn em ${network}:`, error);
      results.errors.push(`Falha ao verificar Learn2Earn em ${network}: ${error.message}`);
    }
  }
  
  // Verificar contratos InstantJobsEscrow
  const instantJobsContracts = getInstantJobsEscrowContracts();
  for (const [network, address] of Object.entries(instantJobsContracts)) {
    if (!address) continue;
      try {
      // Verificar se temos um provider para esta rede
      if (!providers[network]) {
        console.warn(`⚠️ Provider não disponível para InstantJobsEscrow em ${network}`);
        continue;
      }
      
      // Usar o provider correto
      const provider = providers[network];
      
      // ABI mínimo para InstantJobsEscrow
      const minimalAbi = [
        "function getEscrowStats() view returns (uint256, uint256, uint256, uint256)"
      ];
      
      // Criar instância do contrato
      const contract = new ethers.Contract(address, minimalAbi, provider);
      
      // Verificar status
      let active = true;  // Assumir ativo por padrão
      let stats = [0, 0, 0, 0];
      
      try {
        stats = await contract.getEscrowStats();
      } catch (statusErr) {
        // Função pode não existir em todas versões
        console.warn(`⚠️ Não foi possível obter estatísticas de ${network}:`, statusErr.message);
      }
      
      // Registrar no Firestore
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
      
      console.log(`🔄 InstantJobsEscrow em ${network}: Ativo`);
      
    } catch (error) {
      console.error(`❌ Erro verificando InstantJobsEscrow em ${network}:`, error);
      results.errors.push(`Falha ao verificar InstantJobsEscrow em ${network}: ${error.message}`);
    }
  }
  
  // Verificar Token Distributor
  const tokenDistributorAddress = getTokenDistributor();
  if (tokenDistributorAddress) {
    // Assumir que o Token Distributor está na rede Polygon
    const network = 'polygon';
    if (providers[network]) {
      try {
        // ABI mínimo para TokenDistributor
        const minimalAbi = [
          "function totalDistributed() view returns (uint256)",
          "function availableTokensForDistribution() view returns (uint256)"
        ];
        
        // Criar instância do contrato
        const contract = new ethers.Contract(tokenDistributorAddress, minimalAbi, providers[network]);
        
        // Verificar status        const totalDistributed = await contract.totalDistributed();
        const formattedTotal = ethers.formatEther(totalDistributed);
        
        let availableTokens = '0';
        try {
          const available = await contract.availableTokensForDistribution();
          availableTokens = ethers.formatEther(available);
        } catch (availErr) {
          console.warn("⚠️ Não foi possível obter tokens disponíveis:", availErr.message);
        }
        
        // Registrar no Firestore
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
        
        console.log(`🪙 Token Distributor: ${formattedTotal} tokens distribuídos`);
        
      } catch (error) {
        console.error(`❌ Erro verificando Token Distributor:`, error);
        results.errors.push(`Falha ao verificar Token Distributor: ${error.message}`);
      }
    } else {
      console.warn(`⚠️ Provider não disponível para Token Distributor em ${network}`);
      results.errors.push(`Provider não disponível para Token Distributor`);
    }
  } else {
    console.warn('⚠️ Endereço do Token Distributor não configurado');
    results.errors.push('Endereço do Token Distributor não configurado');
  }
  
  // Registrar documentos no Firestore
  if (monitDocs.length > 0) {
    try {
      const batch = db.batch();
      
      for (const doc of monitDocs) {
        // Corrigir para subcoleção correta
        const docRef = db.collection('monitoring').doc('contracts').collection('items').doc(doc.id);
        batch.set(docRef, doc.data, { merge: true });
      }
      
      await batch.commit();
      console.log(`✅ ${monitDocs.length} documentos atualizados no Firestore`);
    } catch (firestoreError) {
      console.error(`❌ Erro ao atualizar Firestore:`, firestoreError);
      results.errors.push(`Falha ao atualizar Firestore: ${firestoreError.message}`);
    }
  }
  
  // Atualizar status de monitoramento
  const active = Object.keys(providers).length > 0;
  
  try {
    await db.collection('monitoring').doc('status').set({
      contractsActive: active,
      lastContractCheck: new Date().toISOString(),
      monitContracts: monitDocs.length,
      contractsErrors: results.errors
    }, { merge: true });
  } catch (statusErr) {
    console.error(`❌ Erro ao atualizar status:`, statusErr);
    results.errors.push(`Falha ao atualizar status: ${statusErr.message}`);
  }

  return results;
}

module.exports = { monitorContracts };
