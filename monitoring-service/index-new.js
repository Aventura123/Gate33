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
  // Tentar carregar as credenciais do Firebase a partir da variável de ambiente ou arquivo
  const serviceAccount = process.env.FIREBASE_CREDENTIALS_JSON
    ? JSON.parse(process.env.FIREBASE_CREDENTIALS_JSON)
    : require(process.env.FIRESTORE_CREDENTIALS || './credentials.json');
  
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
function authenticateApiKey(req, res, next) {
  if (!API_KEY) {
    return next(); // Se não houver API_KEY configurada, permitir acesso
  }
  
  const providedKey = req.headers['x-api-key'] || req.query.apiKey;
  
  if (providedKey !== API_KEY) {
    return res.status(401).json({ error: 'API Key inválida' });
  }
  
  next();
}

// Variável global para armazenar o intervalo de monitoramento
global.monitoringInterval = null;

// Função para executar monitoramento completo
async function runFullMonitoring(options = {}) {
  console.log('🔍 Iniciando verificação completa...');
  
  const results = {
    timestamp: new Date().toISOString(),
    contracts: null,
    balances: null,
    errors: []
  };

  try {
    // Verificar contratos
    if (options.checkContracts !== false) {
      const contractResult = await monitorContracts(db);
      results.contracts = contractResult;
      if (contractResult.errors && contractResult.errors.length > 0) {
        results.errors.push(...contractResult.errors);
      }
    }

    // Verificar saldos
    if (options.checkBalances !== false) {
      const balanceResult = await monitorBalances(db);
      results.balances = balanceResult;
      if (balanceResult.errors && balanceResult.errors.length > 0) {
        results.errors.push(...balanceResult.errors);
      }
    }

    // Registrar resultado geral
    await db.collection('monitoring').doc('lastRun').set({
      timestamp: results.timestamp,
      success: results.errors.length === 0,
      contractsChecked: options.checkContracts !== false,
      balancesChecked: options.checkBalances !== false,
      totalErrors: results.errors.length
    }, { merge: true });

    console.log(`✅ Verificação completa finalizada. Erros: ${results.errors.length}`);

  } catch (error) {
    console.error('❌ Erro durante monitoramento:', error);
    results.errors.push(`Erro geral: ${error.message}`);
    
    // Registrar erro no Firestore
    try {
      await db.collection('monitoring').doc('lastRun').set({
        timestamp: results.timestamp,
        success: false,
        error: error.message
      }, { merge: true });
    } catch (firestoreError) {
      console.error('❌ Erro ao registrar erro no Firestore:', firestoreError);
    }
  }

  return results;
}

// Endpoint para status do serviço
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    monitoring: global.monitoringInterval !== null
  });
});

// Endpoint para executar verificação manual
app.post('/check', authenticateApiKey, async (req, res) => {
  try {
    const options = req.body || {};
    const results = await runFullMonitoring(options);
    res.json(results);
  } catch (error) {
    console.error('❌ Erro na verificação manual:', error);
    res.status(500).json({ error: error.message });
  }
});

// Endpoint para reiniciar monitoramento
app.post('/restart', authenticateApiKey, async (req, res) => {
  try {
    const interval = req.body.interval || MONITORING_INTERVAL;
    
    // Parar monitoramento atual
    if (global.monitoringInterval) {
      clearInterval(global.monitoringInterval);
      global.monitoringInterval = null;
    }

    // Atualizar status no Firestore
    await db.collection('monitoring').doc('status').set({
      active: false,
      lastRestart: new Date().toISOString(),
      restartedBy: 'api',
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
      message: 'Monitoramento reiniciado com sucesso',
      interval: interval,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Erro ao reiniciar monitoramento:', error);
    res.status(500).json({ error: error.message });
  }
});

// Endpoint para parar monitoramento
app.post('/stop', authenticateApiKey, async (req, res) => {
  try {
    if (global.monitoringInterval) {
      clearInterval(global.monitoringInterval);
      global.monitoringInterval = null;
    }

    await db.collection('monitoring').doc('status').set({
      active: false,
      stoppedAt: new Date().toISOString(),
      stoppedBy: 'api'
    }, { merge: true });

    res.json({ 
      success: true, 
      message: 'Monitoramento parado',
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Erro ao parar monitoramento:', error);
    res.status(500).json({ error: error.message });
  }
});

// Função para iniciar monitoramento periódico
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
        await db.collection('monitoring').doc('errors').set({
          timestamp: new Date().toISOString(),
          error: error.message,
          type: 'periodic_monitoring'
        }, { merge: true });
      } catch (firestoreError) {
        console.error('Erro ao registrar erro no Firestore:', firestoreError);
      }
    }
  }, interval);

  // Atualizar status no Firestore
  db.collection('monitoring').doc('status').set({
    active: true,
    startedAt: new Date().toISOString(),
    interval: interval,
    pid: process.pid
  }, { merge: true }).catch(err => console.error('Erro ao atualizar status:', err));
}

// Função para parar monitoramento
function stopMonitoring() {
  if (global.monitoringInterval) {
    clearInterval(global.monitoringInterval);
    global.monitoringInterval = null;
    console.log('🛑 Monitoramento parado');
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('🛑 Recebido SIGINT, parando monitoramento...');
  stopMonitoring();
  
  try {
    await db.collection('monitoring').doc('status').set({
      active: false,
      stoppedAt: new Date().toISOString(),
      stoppedBy: 'sigint'
    }, { merge: true });
  } catch (error) {
    console.error('Erro ao atualizar status final:', error);
  }
  
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('🛑 Recebido SIGTERM, parando monitoramento...');
  stopMonitoring();
  
  try {
    await db.collection('monitoring').doc('status').set({
      active: false,
      stoppedAt: new Date().toISOString(),
      stoppedBy: 'sigterm'
    }, { merge: true });
  } catch (error) {
    console.error('Erro ao atualizar status final:', error);
  }
  
  process.exit(0);
});

// Iniciar servidor HTTP
app.listen(PORT, () => {
  console.log(`🚀 Gate33 Monitoring Service rodando na porta ${PORT}`);
  console.log(`📊 Monitoramento iniciará em ${MONITORING_INTERVAL}ms`);
  
  // Iniciar monitoramento após 5 segundos
  setTimeout(() => {
    startMonitoring();
  }, 5000);
});

// Tratamento de erros não capturados
process.on('uncaughtException', (error) => {
  console.error('❌ Erro não capturado:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Promise rejeitada não tratada:', reason);
});
