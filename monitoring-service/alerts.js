/**
 * Alert and Notification System for Gate33 Monitoring Service
 * 
 * This module is responsible for:
 * - Detecting situations that require alerts
 * - Sending email notifications
 * - Logging alerts to Firebase
 * - Critical system logs
 */
const nodemailer = require('nodemailer');

// Nodemailer configuration
let transporter;
try {
  // Check if required environment variables are defined
  if (!process.env.EMAIL_HOST || !process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
    throw new Error('Missing required email environment variables: EMAIL_HOST, EMAIL_USER, EMAIL_PASSWORD');
  }
  
  transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: parseInt(process.env.EMAIL_PORT || '465'),
    secure: process.env.EMAIL_SECURE === 'true',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD
    }
  });
} catch (error) {
  console.error('❌ Error configuring email transporter:', error);
  console.error('❌ Make sure EMAIL_HOST, EMAIL_USER, and EMAIL_PASSWORD environment variables are set');
}

// Alert thresholds
const BALANCE_THRESHOLD_PERCENTAGE = 0.5; // 50% of current balance
const UNUSUAL_ACTIVITY_THRESHOLD = {
  learn2earn: {
    claimsPerHour: 100, // More than 100 claims per hour is considered unusual
    largeClaimAmount: 1000 // Claims above 1000 tokens
  },
  instantjobs: {
    jobsPerHour: 50, // More than 50 jobs per hour
    largeJobValue: 500, // Jobs above 500 tokens
    cancelledJobsPercentage: 0.3 // 30% of cancelled jobs is unusual
  },
  tokenDistributor: {
    distributionPerHour: 10000, // More than 10k tokens distributed per hour
    largeDistribution: 5000 // Individual distributions above 5k tokens
  }
};

// Cache for previous values (to detect changes)
let previousValues = {
  balances: {},
  contractStats: {},
  lastAlertTimes: {}
};

/**
 * Function to send email alert
 */
async function sendEmailAlert(subject, message, isUrgent = false) {
  if (!transporter) {
    console.error('❌ Email transporter not configured');
    return false;
  }

  try {
    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: process.env.SUPPORT_EMAIL || 'info@gate33.net',
      subject: `[Gate33 ${isUrgent ? 'URGENT' : 'Alert'}] ${subject}`,
      html: `
        <h2>Gate33 Monitoring Alert</h2>
        <p><strong>Timestamp:</strong> ${new Date().toISOString()}</p>
        <p><strong>Severity:</strong> ${isUrgent ? 'URGENT' : 'Warning'}</p>
        <hr>
        <div>${message}</div>
        <hr>
        <p><small>This is an automated message from Gate33 Monitoring Service.</small></p>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log(`📧 Email alert sent: ${subject}`);
    return true;
  } catch (error) {
    console.error('❌ Error sending email alert:', error);
    return false;
  }
}

/**
 * Function to log alert to Firebase
 */
async function logAlert(db, type, severity, message, details = {}) {
  try {
    const alertDoc = {
      type,
      severity, // 'info', 'warning', 'error', 'critical'
      message,
      details,
      timestamp: new Date().toISOString(),
      resolved: false,
      notificationSent: false
    };

    await db.collection('monitoring').doc('alerts').collection('items').add(alertDoc);
    console.log(`📝 Alert logged: ${type} - ${message}`);
    
    return true;
  } catch (error) {
    console.error('❌ Error logging alert to Firebase:', error);
    return false;
  }
}

/**
 * Function to log to system logs when service stops
 */
async function logSystemEvent(db, action, details = {}) {
  try {
    const logDoc = {
      action,
      details,
      timestamp: new Date().toISOString(),
      user: 'MONITORING_SERVICE',
      source: 'monitoring-service'
    };

    await db.collection('systemLogs').add(logDoc);
    console.log(`📋 System event logged: ${action}`);
    
    return true;
  } catch (error) {
    console.error('❌ Error logging system event:', error);
    return false;
  }
}

/**
 * Function to check balance alerts (50% of previous value)
 */
async function checkBalanceAlerts(db, balancesData) {
  const alerts = [];

  if (!balancesData || !balancesData.balances) {
    return alerts;
  }

  for (const balance of balancesData.balances) {
    if (!balance || !balance.walletAddress || !balance.network) continue;
    
    const walletKey = `${balance.walletType}_${balance.network}_${balance.walletAddress}`;
    const currentBalance = parseFloat(balance.balance) || 0;
    const previousBalance = previousValues.balances[walletKey];
    
    if (previousBalance && currentBalance < (previousBalance * BALANCE_THRESHOLD_PERCENTAGE)) {
      const alert = {
        type: 'balance_alert',
        severity: 'warning',
        message: `Wallet balance dropped below 50% threshold`,
        details: {
          wallet: walletKey,
          network: balance.network,
          walletType: balance.walletType,
          currentBalance,
          previousBalance,
          percentageDropped: ((previousBalance - currentBalance) / previousBalance * 100).toFixed(2)
        }
      };
      
      alerts.push(alert);        // Send email if it's a significant drop
        if (currentBalance < (previousBalance * 0.3)) { // 70% drop
        await sendEmailAlert(
          'Critical Balance Alert',
          `<p>Wallet ${walletKey} balance has dropped significantly:</p>
           <ul>
             <li>Network: ${balance.network}</li>
             <li>Previous: ${previousBalance}</li>
             <li>Current: ${currentBalance}</li>
             <li>Drop: ${alert.details.percentageDropped}%</li>
           </ul>`,
          true
        );
      }
        await logAlert(db, alert.type, alert.severity, alert.message, alert.details);
    }
    
    // Update cache
    previousValues.balances[walletKey] = currentBalance;
  }
  
  return alerts;
}

/**
 * Function to check unusual activity alerts in contracts
 */
async function checkContractActivityAlerts(db, contractData) {
  const alerts = [];
  const currentTime = Date.now();

  if (!contractData) {
    return alerts;
  }
  // Process contract data based on actual structure
  // contractData can be an object with properties per network or an array
  let contracts = [];
  
  if (Array.isArray(contractData.contracts)) {
    contracts = contractData.contracts;  } else if (typeof contractData === 'object') {
    // Convert object to array of contracts
    for (const [key, value] of Object.entries(contractData)) {
      if (value && typeof value === 'object' && value.network) {
        contracts.push({ id: key, ...value });
      }
    }
  }

  // Group contracts by type and network
  const contractsByType = {
    learn2earn: {},
    instantjobs: {},
    tokenDistributor: null
  };

  contracts.forEach(contract => {
    if (contract.type === 'learn2earn') {
      if (!contractsByType.learn2earn[contract.network]) {
        contractsByType.learn2earn[contract.network] = [];
      }
      contractsByType.learn2earn[contract.network].push(contract);
    } else if (contract.type === 'instantjobs') {
      if (!contractsByType.instantjobs[contract.network]) {
        contractsByType.instantjobs[contract.network] = [];
      }
      contractsByType.instantjobs[contract.network].push(contract);
    } else if (contract.type === 'token_distributor') {
      contractsByType.tokenDistributor = contract;
    }
  });

  // Learn2Earn alerts
  for (const [network, networkContracts] of Object.entries(contractsByType.learn2earn)) {
    for (const contract of networkContracts) {
      const contractKey = `learn2earn_${network}_${contract.address}`;
      const previousStats = previousValues.contractStats[contractKey];
        if (previousStats && contract.stats) {
        // Check claims per hour
        const timeDiff = (currentTime - previousStats.timestamp) / (1000 * 60 * 60); // hours
        const claimsDiff = (contract.stats.totalClaims || 0) - (previousStats.totalClaims || 0);
        const claimsPerHour = claimsDiff / timeDiff;
        
        if (timeDiff > 0 && claimsPerHour > UNUSUAL_ACTIVITY_THRESHOLD.learn2earn.claimsPerHour) {
          const alert = {
            type: 'learn2earn_unusual_activity',
            severity: 'warning',
            message: `Unusual claim activity detected on ${network}`,
            details: {
              network,
              contractAddress: contract.address,
              claimsPerHour: claimsPerHour.toFixed(2),
              threshold: UNUSUAL_ACTIVITY_THRESHOLD.learn2earn.claimsPerHour,
              totalClaims: contract.stats.totalClaims
            }
          };
          
          alerts.push(alert);          await logAlert(db, alert.type, alert.severity, alert.message, alert.details);
        }
      }
      
      // Update cache
      if (contract.stats) {
        previousValues.contractStats[contractKey] = {
          ...contract.stats,
          timestamp: currentTime
        };
      }
    }
  }

  // InstantJobs alerts
  for (const [network, networkContracts] of Object.entries(contractsByType.instantjobs)) {
    for (const contract of networkContracts) {
      const contractKey = `instantjobs_${network}_${contract.address}`;
      const previousStats = previousValues.contractStats[contractKey];
        if (previousStats && contract.stats) {
        // Check jobs per hour
        const timeDiff = (currentTime - previousStats.timestamp) / (1000 * 60 * 60);
        const jobsDiff = (contract.stats.totalJobs || 0) - (previousStats.totalJobs || 0);
        const jobsPerHour = jobsDiff / timeDiff;
        
        if (timeDiff > 0 && jobsPerHour > UNUSUAL_ACTIVITY_THRESHOLD.instantjobs.jobsPerHour) {
          const alert = {
            type: 'instantjobs_unusual_activity',
            severity: 'warning',
            message: `Unusual job creation activity detected on ${network}`,
            details: {
              network,
              contractAddress: contract.address,
              jobsPerHour: jobsPerHour.toFixed(2),
              threshold: UNUSUAL_ACTIVITY_THRESHOLD.instantjobs.jobsPerHour,
              totalJobs: contract.stats.totalJobs
            }
          };
          
          alerts.push(alert);
          await logAlert(db, alert.type, alert.severity, alert.message, alert.details);
        }
        
        // Check cancelled jobs percentage
        if (contract.stats.totalJobs > 0) {
          const cancelledPercentage = (contract.stats.cancelledJobs || 0) / contract.stats.totalJobs;
          if (cancelledPercentage > UNUSUAL_ACTIVITY_THRESHOLD.instantjobs.cancelledJobsPercentage) {
            const alert = {
              type: 'instantjobs_high_cancellation',
              severity: 'error',
              message: `High job cancellation rate detected on ${network}`,
              details: {
                network,
                contractAddress: contract.address,
                cancelledPercentage: (cancelledPercentage * 100).toFixed(2),
                threshold: (UNUSUAL_ACTIVITY_THRESHOLD.instantjobs.cancelledJobsPercentage * 100).toFixed(2),
                totalJobs: contract.stats.totalJobs,
                cancelledJobs: contract.stats.cancelledJobs
              }
            };
            
            alerts.push(alert);
            await logAlert(db, alert.type, alert.severity, alert.message, alert.details);
          }
        }
      }
      
      // Update cache
      if (contract.stats) {
        previousValues.contractStats[contractKey] = {
          ...contract.stats,
          timestamp: currentTime
        };
      }
    }
  }

  // Token Distributor alerts
  if (contractsByType.tokenDistributor) {
    const contract = contractsByType.tokenDistributor;
    const contractKey = 'token_distributor';
    const previousStats = previousValues.contractStats[contractKey];
    
    if (previousStats && contract.stats) {
      const timeDiff = (currentTime - previousStats.timestamp) / (1000 * 60 * 60);
      const distributionDiff = (parseFloat(contract.stats.totalDistributed) || 0) - (parseFloat(previousStats.totalDistributed) || 0);
      const distributionPerHour = distributionDiff / timeDiff;
      
      if (timeDiff > 0 && distributionPerHour > UNUSUAL_ACTIVITY_THRESHOLD.tokenDistributor.distributionPerHour) {
        const alert = {
          type: 'token_distributor_unusual_activity',
          severity: 'warning',
          message: `Unusual token distribution activity detected`,
          details: {
            contractAddress: contract.address,
            distributionPerHour: distributionPerHour.toFixed(2),
            threshold: UNUSUAL_ACTIVITY_THRESHOLD.tokenDistributor.distributionPerHour,
            totalDistributed: contract.stats.totalDistributed
          }
        };
        
        alerts.push(alert);
        await logAlert(db, alert.type, alert.severity, alert.message, alert.details);
      }
      
      // Check if available tokens are low
      const availableTokens = parseFloat(contract.stats.availableTokens) || 0;
      if (availableTokens < 1000) { // Less than 1000 tokens available
        const alert = {
          type: 'token_distributor_low_balance',
          severity: 'error',
          message: `Token Distributor is running low on available tokens`,
          details: {
            contractAddress: contract.address,
            availableTokens,
            threshold: 1000,
            totalDistributed: contract.stats.totalDistributed
          }
        };
        
        alerts.push(alert);
        await logAlert(db, alert.type, alert.severity, alert.message, alert.details);
        
        // Send email for low tokens
        await sendEmailAlert(
          'Token Distributor Low Balance',
          `<p>The Token Distributor contract is running low on available tokens:</p>
           <ul>
             <li>Contract: ${contract.address}</li>
             <li>Available tokens: ${availableTokens}</li>
             <li>Total distributed: ${contract.stats.totalDistributed}</li>
           </ul>
           <p>Please replenish the contract balance soon.</p>`,
          true
        );
      }
    }
    
    // Update cache
    if (contract.stats) {
      previousValues.contractStats[contractKey] = {
        ...contract.stats,
        timestamp: currentTime
      };
    }
  }

  return alerts;
}

/**
 * Function to check if the service has stopped working
 */
async function checkServiceHealth(db) {
  try {
    const currentTime = Date.now();
    const lastHealthCheck = previousValues.lastHealthCheck || currentTime;
    const timeSinceLastCheck = currentTime - lastHealthCheck;
    
    // If more than 10 minutes have passed since the last check, something might be wrong
    if (timeSinceLastCheck > 600000) { // 10 minutes
      await logSystemEvent(db, 'service_health_warning', {
        timeSinceLastCheck: timeSinceLastCheck,
        message: 'Long interval between health checks detected'
      });
      
      await sendEmailAlert(
        'Monitoring Service Health Warning',
        `<p>The monitoring service has not performed a health check for ${Math.round(timeSinceLastCheck / 60000)} minutes.</p>
         <p>This may indicate that the service is experiencing issues.</p>`,
        true
      );
    }
    
    previousValues.lastHealthCheck = currentTime;
    
    return true;
  } catch (error) {
    console.error('❌ Error checking service health:', error);
    return false;
  }
}

/**
 * Function to check only if there were changes before logging to Firebase
 */
function hasDataChanged(currentData, previousData) {
  if (!previousData) return true;
  
  // Make a simple deep comparison
  const currentStr = JSON.stringify(currentData);
  const previousStr = JSON.stringify(previousData);
  
  return currentStr !== previousStr;
}

/**
 * Main function to process all alerts
 */
async function processAlerts(db, monitoringData) {
  try {
    const alerts = [];
    
    // Check balance alerts
    if (monitoringData.balances) {
      const balanceAlerts = await checkBalanceAlerts(db, monitoringData.balances);
      alerts.push(...balanceAlerts);
    }
    
    // Check contract activity alerts
    if (monitoringData.contracts) {
      const contractAlerts = await checkContractActivityAlerts(db, monitoringData.contracts);
      alerts.push(...contractAlerts);
    }
    
    // Check service health
    await checkServiceHealth(db);
    
    // Log normal service activity
    await logSystemEvent(db, 'monitoring_cycle_completed', {
      alertsGenerated: alerts.length,
      timestamp: new Date().toISOString()
    });
    
    return alerts;
  } catch (error) {
    console.error('❌ Error processing alerts:', error);
    
    // Log system error
    await logSystemEvent(db, 'monitoring_error', {
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
    
    return [];
  }
}

// Handlers for when the process is terminated
process.on('SIGINT', async () => {
  console.log('📴 Monitoring service shutting down...');
  if (global.db) {
    await logSystemEvent(global.db, 'service_shutdown', {
      reason: 'SIGINT',
      timestamp: new Date().toISOString()
    });
    
    await sendEmailAlert(
      'Monitoring Service Shutdown',
      '<p>The Gate33 monitoring service has been shut down.</p><p>Please check the server status.</p>',
      true
    );
  }
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('📴 Monitoring service terminating...');
  if (global.db) {
    await logSystemEvent(global.db, 'service_shutdown', {
      reason: 'SIGTERM',
      timestamp: new Date().toISOString()
    });
    
    await sendEmailAlert(
      'Monitoring Service Terminated',
      '<p>The Gate33 monitoring service has been terminated.</p><p>Please check the server status.</p>',
      true
    );
  }
  process.exit(0);
});

process.on('uncaughtException', async (error) => {
  console.error('💥 Uncaught Exception:', error);
  if (global.db) {
    await logSystemEvent(global.db, 'service_crashed', {
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
    
    await sendEmailAlert(
      'Monitoring Service Crashed',
      `<p>The Gate33 monitoring service has crashed due to an uncaught exception:</p>
       <pre>${error.message}</pre>
       <p>The service will attempt to restart automatically.</p>`,
      true
    );
  }
  process.exit(1);
});

module.exports = {
  processAlerts,
  hasDataChanged,
  logAlert,
  logSystemEvent,
  sendEmailAlert,
  checkServiceHealth
};
