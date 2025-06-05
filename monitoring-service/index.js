/**
 * Gate33 Monitoring Service
 * 
 * This service is responsible for monitoring contracts and balances across different 
 * blockchain networks and updating the status in Firestore.
 */

// Load environment variables with explicit path handling
const path = require('path');
const dotenv = require('dotenv');

// Try to load .env from multiple possible locations
const envPaths = [
  path.join(__dirname, '.env'),
  path.join(process.cwd(), '.env'),
  path.join(__dirname, '../.env'),
  '/opt/gate33-monitoring/.env'
];

let envLoaded = false;
for (const envPath of envPaths) {
  try {
    const result = dotenv.config({ path: envPath });
    if (!result.error) {
      console.log(`✅ Environment loaded from: ${envPath}`);
      envLoaded = true;
      break;
    }
  } catch (error) {
    // Continue to next path
  }
}

if (!envLoaded) {
  console.warn('⚠️ No .env file found, using system environment variables');
}

const express = require('express');
const admin = require('firebase-admin');
const { monitorContracts } = require('./contracts');
const { monitorBalances } = require('./balances');
const { 
  processAlerts,
  hasDataChanged,
  logAlert, 
  logSystemEvent,
  sendEmailAlert,
  checkServiceHealth
} = require('./alerts');

// Initial configuration
const app = express();
const PORT = process.env.PORT || 3002;
const MONITORING_INTERVAL = parseInt(process.env.MONITORING_INTERVAL || '300000', 10); // 5 minutes default
const API_KEY = process.env.API_KEY;

// Initialize Firestore
let db;
try {
  let serviceAccount;
  
  // Debug: Log available environment variables
  console.log('🔍 Checking Firebase environment variables...');
  console.log('FIREBASE_CREDENTIALS_JSON:', !!process.env.FIREBASE_CREDENTIALS_JSON);
  console.log('FIREBASE_CLIENT_EMAIL:', !!process.env.FIREBASE_CLIENT_EMAIL);
  console.log('FIREBASE_PRIVATE_KEY length:', process.env.FIREBASE_PRIVATE_KEY ? process.env.FIREBASE_PRIVATE_KEY.length : 0);
  console.log('FIREBASE_PROJECT_ID:', process.env.FIREBASE_PROJECT_ID);
  
  if (process.env.FIREBASE_CREDENTIALS_JSON) {
    try {
      serviceAccount = JSON.parse(process.env.FIREBASE_CREDENTIALS_JSON);
      console.log('✅ Using FIREBASE_CREDENTIALS_JSON');
    } catch (parseError) {
      console.error('❌ Error parsing FIREBASE_CREDENTIALS_JSON:', parseError.message);
      throw new Error('Invalid FIREBASE_CREDENTIALS_JSON format');
    }
  } else if (process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY && process.env.FIREBASE_PROJECT_ID) {
    serviceAccount = {
      type: 'service_account',
      client_email: process.env.FIREBASE_CLIENT_EMAIL,
      private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      project_id: process.env.FIREBASE_PROJECT_ID,
    };
    console.log('✅ Using individual Firebase environment variables');
  } else {
    // Try to read from a service account file if it exists
    const serviceAccountPath = path.join(__dirname, 'service-account-key.json');
    try {
      serviceAccount = require(serviceAccountPath);
      console.log('✅ Using service account file:', serviceAccountPath);
    } catch (fileError) {
      console.error('❌ No Firebase credentials found. Available options:');
      console.error('1. Set FIREBASE_CREDENTIALS_JSON with complete service account JSON');
      console.error('2. Set FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY, and FIREBASE_PROJECT_ID');
      console.error('3. Place service-account-key.json in the service directory');
      throw new Error('No Firebase credentials found. Please configure Firebase authentication.');
    }
  }
  
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
  
  db = admin.firestore();
  console.log('✅ Firestore initialized successfully');
  
  // Set global db reference for alerts system
  global.db = db;
} catch (error) {
  console.error('❌ Error initializing Firestore:', error);
  process.exit(1);
}

// Express configuration
app.use(express.json());

// Middleware for API Key authentication
const authenticateApiKey = (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ') || authHeader.split(' ')[1] !== API_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  next();
};

// Route to check status
app.get('/status', async (req, res) => {
  try {
    const statusDoc = await db.collection('monitoring').doc('status').get();
    const status = statusDoc.exists ? statusDoc.data() : { isRunning: false, error: 'Status not available' };
    
    // Add uptime to response
    const uptimeMs = process.uptime() * 1000;
    const days = Math.floor(uptimeMs / (1000 * 60 * 60 * 24));
    const hours = Math.floor((uptimeMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((uptimeMs % (1000 * 60 * 60)) / (1000 * 60));
    
    status.uptime = `${days}d ${hours}h ${minutes}m`;
    status.serviceVersion = require('./package.json').version;
    
    // Fetch contract monitoring data from subcollection
    try {
      const contractsSnapshot = await db.collection('monitoring').doc('contracts').collection('items').get();
      const learn2EarnContracts = [];
      const instantJobsEscrowContracts = [];
      
      contractsSnapshot.forEach(doc => {
        const data = doc.data();
        if (data.type === 'learn2earn') {
          learn2EarnContracts.push({
            address: data.address,
            network: data.network,
            active: data.active || false,
            name: 'Learn2Earn'
          });
        } else if (data.type === 'instantjobs') {
          instantJobsEscrowContracts.push({
            address: data.address,
            network: data.network,
            active: data.active || false,
            name: 'InstantJobs Escrow',
            totalJobs: data.totalJobs,
            activeJobs: data.activeJobs,
            completedJobs: data.completedJobs,
            cancelledJobs: data.cancelledJobs
          });
        }
      });
      
      // Add contracts to status response
      status.learn2EarnContracts = learn2EarnContracts;
      status.instantJobsEscrowContracts = instantJobsEscrowContracts;
    } catch (contractError) {
      console.error('Error fetching contracts data:', contractError);
      status.learn2EarnContracts = [];
      status.instantJobsEscrowContracts = [];
    }
    
    res.json(status);
  } catch (error) {
    console.error('Error fetching status:', error);
    res.status(500).json({ error: 'Error fetching status' });
  }
});

// Route to trigger manual check
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
    
    // Check contracts if specified or by default
    if (options.checkContracts !== false) {
      const contractResult = await monitorContracts(db);
      results.details.contractsChecked = true;
      if (contractResult.errors && contractResult.errors.length) {
        results.details.issuesFound += contractResult.errors.length;
      }
    }
    
    // Check balances if specified or by default
    if (options.checkBalances !== false) {
      const balanceResult = await monitorBalances(db);
      results.details.balancesChecked = true;
      if (balanceResult.errors && balanceResult.errors.length) {
        results.details.issuesFound += balanceResult.errors.length;
      }
    }
    
    // Update timestamp of last check
    await db.collection('monitoring').doc('status').set({
      lastCheck: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
    
    results.success = true;
    res.json(results);
  } catch (error) {
    console.error('Error executing check:', error);
    res.status(500).json({
      success: false,
      timestamp: new Date().toISOString(),
      error: error.message || 'Unknown error during check'
    });
  }
});

// Route to restart monitoring
app.post('/restart', authenticateApiKey, async (req, res) => {
  try {
    // Stop current monitoring
    if (global.monitoringInterval) {
      clearInterval(global.monitoringInterval);
    }
    
    // Reset the status
    await db.collection('monitoring').doc('status').set({
      isRunning: true,
      startedAt: admin.firestore.FieldValue.serverTimestamp(),
      restartedAt: admin.firestore.FieldValue.serverTimestamp(),
      errors: []
    }, { merge: true });
    
    // Execute an immediate check
    await Promise.all([
      monitorContracts(db),
      monitorBalances(db)
    ]);
    
    // Restart the monitoring interval
    startMonitoring();
    
    res.json({
      success: true,
      message: 'Monitoring service restarted successfully',
      newState: {
        isRunning: true,
        startedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error restarting monitoring:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Unknown error while restarting monitoring'
    });
  }
});

// Route to get configuration
app.get('/config', authenticateApiKey, async (req, res) => {
  res.json({
    monitoringInterval: MONITORING_INTERVAL,
    conditionalWrites: process.env.CONDITIONAL_WRITES === 'true',
    serviceWalletAddress: process.env.SERVICE_WALLET_ADDRESS,
    networksMonitored: (process.env.MONITOR_NETWORKS || 'polygon,ethereum,binance').split(','),
  });
});

// Route to update configuration
app.put('/config', authenticateApiKey, async (req, res) => {
  try {
    const updates = req.body;
    const configDoc = await db.collection('monitoring').doc('config').get();
    
    // Update configuration in Firestore
    await db.collection('monitoring').doc('config').set(updates, { merge: true });
    
    // Respond with current configuration
    res.json({
      success: true,
      message: 'Configuration updated successfully',
      config: {
        ...configDoc.exists ? configDoc.data() : {},
        ...updates
      }
    });
    
    // Restart the service if monitoring interval was changed
    if (updates.monitoringInterval && updates.monitoringInterval !== MONITORING_INTERVAL) {
      if (global.monitoringInterval) {
        clearInterval(global.monitoringInterval);
      }
      startMonitoring(updates.monitoringInterval);
    }
  } catch (error) {
    console.error('Error updating configuration:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Unknown error updating configuration'
    });
  }
});

// Function to compare shallow objects (can be improved for deep if needed)
function isEqual(obj1, obj2) {
  return JSON.stringify(obj1) === JSON.stringify(obj2);
}

// Function for continuous monitoring
async function continuousMonitoring() {
  console.log('🔄 Starting continuous monitoring');
  let lastContractsState = null;
  let lastBalancesState = null;

  while (true) {
    let contractsChanged = false;
    let balancesChanged = false;
    try {
      // Monitor contracts
      const contractsResult = await monitorContracts(db);
      if (!isEqual(contractsResult, lastContractsState)) {
        // Save each contract individually in the correct subcollection
        if (contractsResult && contractsResult.balances === undefined && contractsResult.errors === undefined) {
          // fallback: if contractsResult has no contracts, save everything in doc
          await db.collection('monitoring').doc('contracts').set(contractsResult, { merge: true });
        } else if (contractsResult && Array.isArray(contractsResult.contracts)) {
          // If contractsResult.contracts is an array, save each one
          const batch = db.batch();
          for (const contract of contractsResult.contracts) {
            if (contract && contract.id) {
              const docRef = db.collection('monitoring').doc('contracts').collection('items').doc(contract.id);
              batch.set(docRef, contract, { merge: true });
            }
          }
          await batch.commit();
        } else {
          // Default structure: save each contract by id
          const batch = db.batch();
          for (const key in contractsResult) {
            if (contractsResult[key] && contractsResult[key].id) {
              const docRef = db.collection('monitoring').doc('contracts').collection('items').doc(contractsResult[key].id);
              batch.set(docRef, contractsResult[key], { merge: true });
            }
          }
          await batch.commit();
        }
        lastContractsState = contractsResult;
        contractsChanged = true;
        console.log('✔️ Contracts updated in Firestore');
      }

      // Monitor balances
      const balancesResult = await monitorBalances(db);
      if (!isEqual(balancesResult, lastBalancesState)) {
        // Save each balance individually in the correct subcollection
        if (balancesResult && Array.isArray(balancesResult.balances)) {
          const batch = db.batch();
          for (const balance of balancesResult.balances) {
            if (balance && balance.walletAddress && balance.network) {
              const docId = `${balance.walletType}_${balance.network}_${balance.walletAddress.slice(-8)}`;
              const docRef = db.collection('monitoring').doc('balances').collection('items').doc(docId);
              batch.set(docRef, balance, { merge: true });
            }
          }
          await batch.commit();
        } else {
          // fallback: save everything in doc
          await db.collection('monitoring').doc('balances').set(balancesResult, { merge: true });
        }
        lastBalancesState = balancesResult;
        balancesChanged = true;
        console.log('✔️ Balances updated in Firestore');
      }

      // Send email alerts if there was a relevant change
      if (contractsChanged || balancesChanged) {
        if (typeof sendMonitoringAlert === 'function') {
          await sendMonitoringAlert({ contractsChanged, balancesChanged, contractsResult, balancesResult });
        }
      }
    } catch (error) {
      console.error('Error during continuous monitoring:', error);
      try {
        await db.collection('monitoring').doc('status').update({
          errors: admin.firestore.FieldValue.arrayUnion({
            timestamp: new Date().toISOString(),
            message: error.message,
            stack: error.stack
          })
        });
      } catch (dbError) {
        console.error('Error logging error to Firestore:', dbError);
      }
    }
    // 1 hour delay (3600000 ms)
    await new Promise(res => setTimeout(res, 3600000));
  }
}

// Start the server
app.listen(PORT, () => {
  console.log(`🚀 Gate33 Monitoring server started on port ${PORT}`);
  db.collection('monitoring').doc('status').set({
    isRunning: true,
    version: require('./package.json').version,
    startedAt: admin.firestore.FieldValue.serverTimestamp(),
    lastCheck: null,
    errors: []
  }, { merge: true })
  .then(() => {
    console.log('✅ Status initialized in Firestore');
    // Start continuous monitoring
    continuousMonitoring();
  })
  .catch(error => {
    console.error('❌ Error initializing status:', error);
  });
});

// Shutdown handling
process.on('SIGINT', async () => {
  console.log('Shutting down the monitoring service...');
  
  if (global.monitoringInterval) {
    clearInterval(global.monitoringInterval);
  }
  
  try {
    await db.collection('monitoring').doc('status').update({
      isRunning: false,
      stoppedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    console.log('Status updated to "inactive" in Firestore');
  } catch (error) {
    console.error('Error updating shutdown status:', error);
  }
  
  process.exit(0);
});

// Route to fetch wallet balances
app.get('/wallet-balance', async (req, res) => {
  try {
    // Fetch most recent balance data from Firestore
    const balancesSnapshot = await db.collection('monitoring').doc('balances').collection('items').get();
    
    if (balancesSnapshot.empty) {
      return res.json({
        balances: [],
        message: 'No balances found',
        timestamp: new Date().toISOString()
      });
    }
    
    const balances = [];
    balancesSnapshot.forEach(doc => {
      const data = doc.data();
      balances.push({
        network: data.network,
        symbol: data.currency,
        balance: data.balance ? data.balance.toString() : '0',
        walletName: data.walletName,
        walletType: data.walletType,
        timestamp: data.timestamp
      });
    });
    
    res.json({
      balances,
      totalWallets: balances.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching balances:', error);
    res.status(500).json({ 
      error: 'Error fetching wallet balances',
      details: error.message 
    });
  }
});

// Route to trigger manual check
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
    
    // Check contracts if specified or by default
    if (options.checkContracts !== false) {
      const contractResult = await monitorContracts(db);
      results.details.contractsChecked = true;
      if (contractResult.errors && contractResult.errors.length) {
        results.details.issuesFound += contractResult.errors.length;
      }
    }
    
    // Check balances if specified or by default
    if (options.checkBalances !== false) {
      const balanceResult = await monitorBalances(db);
      results.details.balancesChecked = true;
      if (balanceResult.errors && balanceResult.errors.length) {
        results.details.issuesFound += balanceResult.errors.length;
      }
    }
    
    // Update timestamp of last check
    await db.collection('monitoring').doc('status').set({
      lastCheck: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
    
    results.success = true;
    res.json(results);
  } catch (error) {
    console.error('Error executing check:', error);
    res.status(500).json({
      success: false,
      timestamp: new Date().toISOString(),
      error: error.message || 'Unknown error during check'
    });
  }
});

// Route to restart monitoring
app.post('/restart', authenticateApiKey, async (req, res) => {
  try {
    // Stop current monitoring
    if (global.monitoringInterval) {
      clearInterval(global.monitoringInterval);
    }
    
    // Reset the status
    await db.collection('monitoring').doc('status').set({
      isRunning: true,
      startedAt: admin.firestore.FieldValue.serverTimestamp(),
      restartedAt: admin.firestore.FieldValue.serverTimestamp(),
      errors: []
    }, { merge: true });
    
    // Execute an immediate check
    await Promise.all([
      monitorContracts(db),
      monitorBalances(db)
    ]);
    
    // Restart the monitoring interval
    startMonitoring();
    
    res.json({
      success: true,
      message: 'Monitoring service restarted successfully',
      newState: {
        isRunning: true,
        startedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error restarting monitoring:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Unknown error while restarting monitoring'
    });
  }
});

// Route to get configuration
app.get('/config', authenticateApiKey, async (req, res) => {
  res.json({
    monitoringInterval: MONITORING_INTERVAL,
    conditionalWrites: process.env.CONDITIONAL_WRITES === 'true',
    serviceWalletAddress: process.env.SERVICE_WALLET_ADDRESS,
    networksMonitored: (process.env.MONITOR_NETWORKS || 'polygon,ethereum,binance').split(','),
  });
});

// Route to update configuration
app.put('/config', authenticateApiKey, async (req, res) => {
  try {
    const updates = req.body;
    const configDoc = await db.collection('monitoring').doc('config').get();
    
    // Update configuration in Firestore
    await db.collection('monitoring').doc('config').set(updates, { merge: true });
    
    // Respond with current configuration
    res.json({
      success: true,
      message: 'Configuration updated successfully',
      config: {
        ...configDoc.exists ? configDoc.data() : {},
        ...updates
      }
    });
    
    // Restart the service if monitoring interval was changed
    if (updates.monitoringInterval && updates.monitoringInterval !== MONITORING_INTERVAL) {
      if (global.monitoringInterval) {
        clearInterval(global.monitoringInterval);
      }
      startMonitoring(updates.monitoringInterval);
    }
  } catch (error) {
    console.error('Error updating configuration:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Unknown error updating configuration'
    });
  }
});

// Function to compare shallow objects (can be improved for deep if needed)
function isEqual(obj1, obj2) {
  return JSON.stringify(obj1) === JSON.stringify(obj2);
}

// Function for continuous monitoring
async function continuousMonitoring() {
  console.log('🔄 Starting continuous monitoring');
  let lastContractsState = null;
  let lastBalancesState = null;

  while (true) {
    let contractsChanged = false;
    let balancesChanged = false;
    try {
      // Monitor contracts
      const contractsResult = await monitorContracts(db);
      if (!isEqual(contractsResult, lastContractsState)) {
        // Save each contract individually in the correct subcollection
        if (contractsResult && contractsResult.balances === undefined && contractsResult.errors === undefined) {
          // fallback: if contractsResult has no contracts, save everything in doc
          await db.collection('monitoring').doc('contracts').set(contractsResult, { merge: true });
        } else if (contractsResult && Array.isArray(contractsResult.contracts)) {
          // If contractsResult.contracts is an array, save each one
          const batch = db.batch();
          for (const contract of contractsResult.contracts) {
            if (contract && contract.id) {
              const docRef = db.collection('monitoring').doc('contracts').collection('items').doc(contract.id);
              batch.set(docRef, contract, { merge: true });
            }
          }
          await batch.commit();
        } else {
          // Default structure: save each contract by id
          const batch = db.batch();
          for (const key in contractsResult) {
            if (contractsResult[key] && contractsResult[key].id) {
              const docRef = db.collection('monitoring').doc('contracts').collection('items').doc(contractsResult[key].id);
              batch.set(docRef, contractsResult[key], { merge: true });
            }
          }
          await batch.commit();
        }
        lastContractsState = contractsResult;
        contractsChanged = true;
        console.log('✔️ Contracts updated in Firestore');
      }

      // Monitor balances
      const balancesResult = await monitorBalances(db);
      if (!isEqual(balancesResult, lastBalancesState)) {
        // Save each balance individually in the correct subcollection
        if (balancesResult && Array.isArray(balancesResult.balances)) {
          const batch = db.batch();
          for (const balance of balancesResult.balances) {
            if (balance && balance.walletAddress && balance.network) {
              const docId = `${balance.walletType}_${balance.network}_${balance.walletAddress.slice(-8)}`;
              const docRef = db.collection('monitoring').doc('balances').collection('items').doc(docId);
              batch.set(docRef, balance, { merge: true });
            }
          }
          await batch.commit();
        } else {
          // fallback: save everything in doc
          await db.collection('monitoring').doc('balances').set(balancesResult, { merge: true });
        }
        lastBalancesState = balancesResult;
        balancesChanged = true;
        console.log('✔️ Balances updated in Firestore');
      }

      // Send email alerts if there was a relevant change
      if (contractsChanged || balancesChanged) {
        if (typeof sendMonitoringAlert === 'function') {
          await sendMonitoringAlert({ contractsChanged, balancesChanged, contractsResult, balancesResult });
        }
      }
    } catch (error) {
      console.error('Error during continuous monitoring:', error);
      try {
        await db.collection('monitoring').doc('status').update({
          errors: admin.firestore.FieldValue.arrayUnion({
            timestamp: new Date().toISOString(),
            message: error.message,
            stack: error.stack
          })
        });
      } catch (dbError) {
        console.error('Error logging error to Firestore:', dbError);
      }
    }
    // 1 hour delay (3600000 ms)
    await new Promise(res => setTimeout(res, 3600000));
  }
}

// Start the server
app.listen(PORT, () => {
  console.log(`🚀 Gate33 Monitoring server started on port ${PORT}`);
  db.collection('monitoring').doc('status').set({
    isRunning: true,
    version: require('./package.json').version,
    startedAt: admin.firestore.FieldValue.serverTimestamp(),
    lastCheck: null,
    errors: []
  }, { merge: true })
  .then(() => {
    console.log('✅ Status initialized in Firestore');
    // Start continuous monitoring
    continuousMonitoring();
  })
  .catch(error => {
    console.error('❌ Error initializing status:', error);
  });
});

// Shutdown handling
process.on('SIGINT', async () => {
  console.log('Shutting down the monitoring service...');
  
  if (global.monitoringInterval) {
    clearInterval(global.monitoringInterval);
  }
  
  try {
    await db.collection('monitoring').doc('status').update({
      isRunning: false,
      stoppedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    console.log('Status updated to "inactive" in Firestore');
  } catch (error) {
    console.error('Error updating shutdown status:', error);
  }
  
  process.exit(0);
});
