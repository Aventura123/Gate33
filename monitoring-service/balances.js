/**
 * Módulo para monitoramento de saldos de tokens nativos em múltiplas redes
 * Este script é responsável por verificar os saldos das carteiras em diferentes blockchains
 */
const ethers = require('ethers');

// Usar a mesma configuração RPC do arquivo contracts.js
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

const getHttpRpcUrls = (network) => {
  const n = network.toLowerCase();
  return HTTP_RPC_URLS[n] || [];
};

// Configurações
const BALANCE_ALERT_THRESHOLD = 0.001; // Alerta se saldo for menor que este valor

// Redes para monitorar saldos
const getNetworks = () => {
  return (process.env.MONITOR_NETWORKS || 'polygon,ethereum,binance').split(',').map(n => n.trim().toLowerCase());
};

// Carteiras para monitorar
const getWalletsToMonitor = () => {
  const wallets = [];
  
  // Carteira de serviço principal
  if (process.env.SERVICE_WALLET_ADDRESS) {
    wallets.push({
      address: process.env.SERVICE_WALLET_ADDRESS,
      name: 'Service Wallet',
      type: 'service'
    });
  }
  
  // Carteira admin
  if (process.env.ADMIN_WALLET_ADDRESS) {
    wallets.push({
      address: process.env.ADMIN_WALLET_ADDRESS,
      name: 'Admin Wallet',
      type: 'admin'
    });
  }
  
  // Carteiras adicionais do .env
  const additionalWallets = process.env.MONITOR_WALLETS ? process.env.MONITOR_WALLETS.split(',') : [];
  additionalWallets.forEach((wallet, index) => {
    if (wallet.trim()) {
      wallets.push({
        address: wallet.trim(),
        name: `Monitor Wallet ${index + 1}`,
        type: 'monitor'
      });
    }
  });
  
  return wallets;
};

// Função para obter nome da moeda nativa por rede
const getNativeCurrency = (network) => {
  const currencies = {
    ethereum: 'ETH',
    polygon: 'MATIC',
    binance: 'BNB',
    avalanche: 'AVAX',
    optimism: 'ETH'
  };
  
  return currencies[network.toLowerCase()] || 'ETH';
};

// Função principal para monitorar saldos
async function monitorBalances(db) {
  console.log('💰 Verificando saldos de tokens nativos...');
  const results = {
    timestamp: new Date().toISOString(),
    errors: [],
    balances: []
  };

  const networks = getNetworks();
  const wallets = getWalletsToMonitor();
  const providers = {};

  if (wallets.length === 0) {
    console.warn('⚠️ Nenhuma carteira configurada para monitoramento');
    results.errors.push('Nenhuma carteira configurada para monitoramento');
    return results;
  }

  // Inicializar providers para cada rede
  for (const network of networks) {
    try {
      const urls = getHttpRpcUrls(network);
      if (!urls || !urls.length) {
        console.warn(`⚠️ RPC URL não configurada para rede ${network}`);
        results.errors.push(`RPC URL não configurada para rede ${network}`);
        continue;      }      // Tentar conectar com o primeiro URL disponível
      let connected = false;
      for (const url of urls) {
        try {
          providers[network] = new ethers.providers.JsonRpcProvider(url);
          await providers[network].getBlockNumber();
          console.log(`✅ Conexão de saldos estabelecida com ${network} via ${url}`);
          connected = true;
          break;
        } catch (urlError) {
          console.warn(`⚠️ Falha na URL ${url} para ${network}:`, urlError.message);
        }
      }

      if (!connected) {
        results.errors.push(`Falha ao conectar à rede ${network}`);
      }
    } catch (error) {
      console.error(`❌ Erro conectando à rede ${network}:`, error);
      results.errors.push(`Falha ao conectar à rede ${network}: ${error.message}`);
    }
  }

  const balanceDocs = [];

  // Verificar saldos para cada combinação de carteira e rede
  for (const wallet of wallets) {
    for (const [network, provider] of Object.entries(providers)) {
      try {        const balance = await provider.getBalance(wallet.address);
        const balanceEth = parseFloat(ethers.formatEther(balance));
        const currency = getNativeCurrency(network);
        
        console.log(`💰 ${wallet.name} - ${network}: ${balanceEth} ${currency}`);
        
        const balanceDoc = {
          network,
          walletAddress: wallet.address,
          walletName: wallet.name,
          walletType: wallet.type,
          balance: balanceEth,
          currency,
          timestamp: new Date().toISOString()
        };
        
        results.balances.push(balanceDoc);
          // Registrar no Firestore
        balanceDocs.push({
          collection: 'monitoring/data/balances', // Corrigido para a estrutura recomendada (3 componentes)
          id: `${wallet.type}_${network}_${wallet.address.slice(-8)}`,
          data: balanceDoc
        });

        // Verificar se o saldo está baixo
        if (balanceEth < BALANCE_ALERT_THRESHOLD) {
          const alertMessage = `⚠️ Alerta: Saldo baixo em ${wallet.name} na rede ${network}: ${balanceEth} ${currency}`;
          console.warn(alertMessage);
          results.errors.push(alertMessage);
            // Registro adicional para alertas
          balanceDocs.push({
            collection: 'monitoring/data/alerts',
            id: `balance_low_${wallet.type}_${network}_${Date.now()}`,
            data: {
              type: 'wallet_balance',
              severity: 'warning',
              message: alertMessage,
              walletAddress: wallet.address,
              walletName: wallet.name,
              network,
              balance: balanceEth,
              currency,
              timestamp: new Date().toISOString()
            }
          });
        }
        
      } catch (error) {
        const errorMsg = `Erro verificando saldo de ${wallet.name} em ${network}: ${error.message}`;
        console.error(`❌ ${errorMsg}`);
        results.errors.push(errorMsg);
      }
    }
  }

  // Registrar documentos no Firestore
  if (balanceDocs.length > 0) {
    try {
      const batch = db.batch();
      
      for (const doc of balanceDocs) {
        // Corrigir para subcoleção correta
        const docRef = db.collection('monitoring').doc('balances').collection('items').doc(doc.id);
        batch.set(docRef, doc.data, { merge: true });
      }
      
      await batch.commit();
      console.log(`✅ ${balanceDocs.length} documentos de saldo atualizados no Firestore`);
      
    } catch (firestoreError) {
      console.error(`❌ Erro ao atualizar saldos no Firestore:`, firestoreError);
      results.errors.push(`Falha ao atualizar saldos no Firestore: ${firestoreError.message}`);
    }
  }

  // Atualizar status de monitoramento de saldos
  try {
    await db.collection('monitoring').doc('status').set({
      balancesActive: Object.keys(providers).length > 0,
      lastBalanceCheck: new Date().toISOString(),
      monitoredWallets: wallets.length,
      balanceErrors: results.errors.filter(err => err.includes('saldo') || err.includes('balance'))
    }, { merge: true });
  } catch (statusErr) {
    console.error(`❌ Erro ao atualizar status de saldos:`, statusErr);
    results.errors.push(`Falha ao atualizar status de saldos: ${statusErr.message}`);
  }

  return results;
}

module.exports = { monitorBalances };
