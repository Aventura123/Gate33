/**
 * Gate33 Monitoring Service
 * 
 * Este serviço é responsável por monitorar contratos e saldos em diferentes 
 * redes blockchain e atualizar o status no Firestore.
 */
require('dotenv').config();
const express = require('express');
const admin = require('firebase-admin');
const { monitorContracts } = require('./contracts');
const { monitorBalances } = require('./balances');

// Configuração inicial
const app = express();
const PORT = process.env.PORT || 3001;
const MONITORING_INTERVAL = parseInt(process.env.MONITORING_INTERVAL || '300000', 10); // 5 minutos default
const API_KEY = process.env.API_KEY;

// Inicializa o Firestore
let db;
try {
  let serviceAccount;
  if (process.env.FIREBASE_CREDENTIALS_JSON) {
    serviceAccount = JSON.parse(process.env.FIREBASE_CREDENTIALS_JSON);
  } else if (process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
    serviceAccount = {
      type: 'service_account',
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID,
    };
  } else {
    throw new Error('No Firebase credentials found. Please set FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY environment variables.');
  }

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });

  db = admin.firestore();
  console.log('✅ Firestore inicializado com sucesso');
} catch (error) {
  console.error('❌ Erro ao inicializar Firestore:', error);
  process.exit(1);
}

// Configuração do Express
app.use(express.json());

// Middleware para autenticação por API Key
const authenticateApiKey = (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ') || authHeader.split(' ')[1] !== API_KEY) {
    return res.status(401).json({ error: 'Não autorizado' });
  }
  
  next();
};

// Rota para verificar status
app.get('/status', async (req, res) => {
  try {
    const statusDoc = await db.collection('monitoring').doc('status').get();
    const status = statusDoc.exists ? statusDoc.data() : { isRunning: false, error: 'Status não disponível' };
    
    // Adicionar uptime à resposta
    const uptimeMs = process.uptime() * 1000;
    const days = Math.floor(uptimeMs / (1000 * 60 * 60 * 24));
    const hours = Math.floor((uptimeMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((uptimeMs % (1000 * 60 * 60)) / (1000 * 60));
    
    status.uptime = `${days}d ${hours}h ${minutes}m`;
    status.serviceVersion = require('./package.json').version;
    
    res.json(status);
  } catch (error) {
    console.error('Erro ao buscar status:', error);
    res.status(500).json({ error: 'Erro ao buscar status' });
  }
});

// Rota para acionar verificação manual
app.post('/trigger-check', authenticateApiKey, async (req, res) => {
  const options = req.body || {};
  
  try {
    const results = {
      timestamp: new Date().toISOString(),
      details: {
        balancesChecked: false,
        contractsChecked: false,
        issuesFound: 0
      }
    };
    
    // Verificar contratos se especificado ou por padrão
    if (options.checkContracts !== false) {
      const contractResult = await monitorContracts(db);
      results.details.contractsChecked = true;
      if (contractResult.errors && contractResult.errors.length) {
        results.details.issuesFound += contractResult.errors.length;
      }
    }
    
    // Verificar saldos se especificado ou por padrão
    if (options.checkBalances !== false) {
      const balanceResult = await monitorBalances(db);
      results.details.balancesChecked = true;
      if (balanceResult.errors && balanceResult.errors.length) {
        results.details.issuesFound += balanceResult.errors.length;
      }
    }
    
    // Atualizar timestamp da última verificação
    await db.collection('monitoring').doc('status').set({
      lastCheck: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
    
    results.success = true;
    res.json(results);
  } catch (error) {
    console.error('Erro ao executar verificação:', error);
    res.status(500).json({
      success: false,
      timestamp: new Date().toISOString(),
      error: error.message || 'Erro desconhecido durante verificação'
    });
  }
});

// Rota para reiniciar monitoramento
app.post('/restart', authenticateApiKey, async (req, res) => {
  try {
    // Parar a monitoração atual
    if (global.monitoringInterval) {
      clearInterval(global.monitoringInterval);
    }
    
    // Resetar o status
    await db.collection('monitoring').doc('status').set({
      isRunning: true,
      startedAt: admin.firestore.FieldValue.serverTimestamp(),
      restartedAt: admin.firestore.FieldValue.serverTimestamp(),
      errors: []
    }, { merge: true });
    
    // Executar uma verificação imediata
    await Promise.all([
      monitorContracts(db),
      monitorBalances(db)
    ]);
    
    // Reiniciar o intervalo de monitoramento
    startMonitoring();
    
    res.json({
      success: true,
      message: 'Serviço de monitoramento reiniciado com sucesso',
      newState: {
        isRunning: true,
        startedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Erro ao reiniciar monitoramento:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Erro desconhecido ao reiniciar monitoramento'
    });
  }
});

// Rota para obter configuração
app.get('/config', authenticateApiKey, async (req, res) => {
  res.json({
    monitoringInterval: MONITORING_INTERVAL,
    conditionalWrites: process.env.CONDITIONAL_WRITES === 'true',
    serviceWalletAddress: process.env.SERVICE_WALLET_ADDRESS,
    networksMonitored: (process.env.MONITOR_NETWORKS || 'polygon,ethereum,binance').split(','),
  });
});

// Rota para atualizar configuração
app.put('/config', authenticateApiKey, async (req, res) => {
  try {
    const updates = req.body;
    const configDoc = await db.collection('monitoring').doc('config').get();
    
    // Atualizar a configuração no Firestore
    await db.collection('monitoring').doc('config').set(updates, { merge: true });
    
    // Responder com a configuração atual
    res.json({
      success: true,
      message: 'Configuração atualizada com sucesso',
      config: {
        ...configDoc.exists ? configDoc.data() : {},
        ...updates
      }
    });
    
    // Reiniciar o serviço se o intervalo de monitoramento foi alterado
    if (updates.monitoringInterval && updates.monitoringInterval !== MONITORING_INTERVAL) {
      if (global.monitoringInterval) {
        clearInterval(global.monitoringInterval);
      }
      startMonitoring(updates.monitoringInterval);
    }
  } catch (error) {
    console.error('Erro ao atualizar configuração:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Erro desconhecido ao atualizar configuração'
    });
  }
});

// Função para iniciar o monitoramento periódico
function startMonitoring(interval = MONITORING_INTERVAL) {
  console.log(`🔄 Iniciando monitoramento com intervalo de ${interval}ms`);
  
  // Executar uma verificação imediatamente
  Promise.all([
    monitorContracts(db),
    monitorBalances(db)
  ]).catch(err => console.error('Erro na verificação inicial:', err));
  
  // Configurar verificação periódica
  global.monitoringInterval = setInterval(async () => {
    try {
      await Promise.all([
        monitorContracts(db),
        monitorBalances(db)
      ]);
    } catch (error) {
      console.error('Erro durante monitoramento periódico:', error);
      
      // Registrar erro no Firestore
      try {
        await db.collection('monitoring').doc('status').update({
          errors: admin.firestore.FieldValue.arrayUnion({
            timestamp: new Date().toISOString(),
            message: error.message,
            stack: error.stack
          })
        });
      } catch (dbError) {
        console.error('Erro ao registrar erro no Firestore:', dbError);
      }
    }
  }, interval);
}

// Iniciar o servidor
app.listen(PORT, () => {
  console.log(`🚀 Servidor Gate33 Monitoring iniciado na porta ${PORT}`);
  
  // Inicializar status no Firestore
  db.collection('monitoring').doc('status').set({
    isRunning: true,
    version: require('./package.json').version,
    startedAt: admin.firestore.FieldValue.serverTimestamp(),
    lastCheck: null,
    errors: []
  }, { merge: true })
  .then(() => {
    console.log('✅ Status inicializado no Firestore');
    
    // Iniciar o monitoramento periódico
    startMonitoring();
  })
  .catch(error => {
    console.error('❌ Erro ao inicializar status:', error);
  });
});

// Tratamento de encerramento
process.on('SIGINT', async () => {
  console.log('Encerrando o serviço de monitoramento...');
  
  if (global.monitoringInterval) {
    clearInterval(global.monitoringInterval);
  }
  
  try {
    await db.collection('monitoring').doc('status').update({
      isRunning: false,
      stoppedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    console.log('Status atualizado para "inativo" no Firestore');
  } catch (error) {
    console.error('Erro ao atualizar status de encerramento:', error);
  }
  
  process.exit(0);
});
