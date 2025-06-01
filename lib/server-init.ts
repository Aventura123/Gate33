/**
 * Server-side initialization for Gate33
 * 
 * This file contains the logic to start services that should be executed
 * only once when the server starts, such as blockchain contract monitoring.
 */
import dotenv from 'dotenv';
import { initializeContractMonitoring } from '../utils/monitors/contractMonitor';
import { logSystem } from '../utils/logSystem';
import { getWsRpcUrls, getHttpRpcUrls, getAllRpcUrls } from '../config/rpcConfig';

dotenv.config();

// Global status for service state tracking
interface ServerStatus {
  contractMonitoring: {
    initialized: boolean;
    startTime: number | null;
    lastRestart: number | null;
    tokenDistributionActive: boolean;
    walletMonitoringActive: boolean;
    connectionType: string | null;
    errors: string[];
    rpcUrl: string | null;
    warnings: string[];
    lastStatus: 'active' | 'inactive' | 'unknown';
    learn2EarnContracts?: {
      address: string;
      network: string;
      active: boolean;
      name?: string;
      title?: string;
    }[];
    instantJobsEscrowContracts?: {
      address: string;
      network: string;
      active: boolean;
      name?: string;
      title?: string;
    }[];
  }
}

// Global server status - will be accessed by the diagnostic API
export const serverStatus: ServerStatus = {
  contractMonitoring: {
    initialized: false,
    startTime: null,
    lastRestart: null,
    tokenDistributionActive: false,
    walletMonitoringActive: false,
    connectionType: null,
    errors: [],
    rpcUrl: null,
    warnings: [],
    lastStatus: 'unknown',
    learn2EarnContracts: [],
    instantJobsEscrowContracts: []
  }
};

// Flag to ensure initialization only happens once
let isInitialized = false;

// Networks to monitor (configured by env or default)
const MONITOR_NETWORKS = (process.env.MONITOR_NETWORKS || 'polygon,ethereum,binance').split(',').map(n => n.trim().toLowerCase());

/**
 * Starts all server-side services
 * This function should only be called once when the server starts
 */
export function initializeServer() {
  // Ensure initialization happens only once
  if (isInitialized) {
    console.log('Server has already been initialized. Ignoring duplicate initialization request.');
    return;
  }

  console.log('🚀 Starting Gate33 server services...');
  
  try {
    // Start blockchain contract monitoring
    console.log('📊 Starting blockchain contract monitoring...');
    
    // Updating status before starting
    serverStatus.contractMonitoring.startTime = Date.now();
      // Start contract monitoring with a callback function that updates the status
    initializeContractMonitoring(false, (success: boolean, providerType: string | null, activeMonitors: {
      tokenDistribution: boolean;
      wallet: boolean;
      learn2Earn?: Record<string, boolean>;
      instantJobsEscrow?: Record<string, boolean>;
    }) => {
      if (success) {
        console.log('✅ Blockchain contract monitoring initialized successfully!');
        serverStatus.contractMonitoring.initialized = true;
        serverStatus.contractMonitoring.connectionType = providerType;
        serverStatus.contractMonitoring.tokenDistributionActive = activeMonitors.tokenDistribution;
        serverStatus.contractMonitoring.walletMonitoringActive = activeMonitors.wallet;
        serverStatus.contractMonitoring.lastStatus = 'active';
        
        logSystem.info('Contract monitoring successfully activated', {
          connectionType: providerType,
          activeMonitors
        });
      } else {
        console.error('❌ Failed to initialize blockchain contract monitoring');
        serverStatus.contractMonitoring.initialized = false;
        serverStatus.contractMonitoring.errors.push(
          `Initialization failure at ${new Date().toISOString()}`
        );
        serverStatus.contractMonitoring.lastStatus = 'inactive';
        
        logSystem.error('Failed to initialize contract monitoring', {
          timestamp: new Date().toISOString()
        });
      }
    });
    
    // Set a timeout to check if monitoring was initialized
    setTimeout(() => {
      if (!serverStatus.contractMonitoring.initialized) {
        console.warn('⚠️ Contract monitoring was not confirmed as initialized after 30 seconds.');
        // No administrative activations should be here - just log the warning
      }
    }, 30000); // 30 seconds to check if monitoring was initialized
    
    // Any other server-side services can be started here
    
    // Mark as initialized
    isInitialized = true;
    
    console.log('✅ Server initialization completed!');
  } catch (error: any) {
    console.error('❌ Error during server initialization:', error);
    serverStatus.contractMonitoring.errors.push(
      `Initialization error: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
    serverStatus.contractMonitoring.lastStatus = 'inactive';
  }
}

// If this file is imported directly on the server, start immediately
if (typeof window === 'undefined') {
  console.log('📝 server-init.ts loaded in server environment');
  initializeServer();
}

// Export function to restart monitoring in case of failure
export async function restartContractMonitoring() {
  try {
    console.log('🔄 Attempting to restart contract monitoring...');
    serverStatus.contractMonitoring.lastRestart = Date.now();
    
    // Don't clear the current state until we're sure the restart was successful
    const previousStatus = {
      initialized: serverStatus.contractMonitoring.initialized,
      tokenDistributionActive: serverStatus.contractMonitoring.tokenDistributionActive,
      walletMonitoringActive: serverStatus.contractMonitoring.walletMonitoringActive,
    };
    
    // Log restart attempt
    await logSystem.info('Attempt to restart contract monitoring', {
      timestamp: new Date().toISOString(),
      previousErrors: [...serverStatus.contractMonitoring.errors]
    });
    
    // Clear previous errors before restarting
    serverStatus.contractMonitoring.errors = [];
    
    // Create Promise to control timeout
    return new Promise<{success: boolean, message: string}>((resolve) => {
      // Control timeout to avoid waiting indefinitely
      const timeoutId = setTimeout(() => {
        console.warn('⚠️ Timeout in monitoring restart');
        
        // Since timeout occurred, report actual status
        serverStatus.contractMonitoring.warnings.push(
          'Restart timeout - monitoring may not be active'
        );
        
        resolve({
          success: false,
          message: 'Timeout during restart attempt'
        });
      }, 15000); // 15 seconds timeout
      
      // Try to restart monitoring
      try {
        initializeContractMonitoring(false, (success: boolean, providerType: string | null, activeMonitors: {
          tokenDistribution: boolean;
          wallet: boolean;
        }) => {
          // Clear the timeout since the callback was called
          clearTimeout(timeoutId);
          
          if (success) {
            console.log('✅ Contract monitoring restarted successfully!');
            serverStatus.contractMonitoring.initialized = true;
            serverStatus.contractMonitoring.connectionType = providerType;
            serverStatus.contractMonitoring.tokenDistributionActive = activeMonitors.tokenDistribution;
            serverStatus.contractMonitoring.walletMonitoringActive = activeMonitors.wallet;
            serverStatus.contractMonitoring.lastStatus = 'active';
            
            resolve({
              success: true,
              message: 'Monitoring restarted successfully'
            });
          } else {
            console.error('❌ Failed to restart contract monitoring');
            serverStatus.contractMonitoring.errors.push(
              `Restart failure at ${new Date().toISOString()}`
            );
            
            // Report actual failure status
            serverStatus.contractMonitoring.lastStatus = 'inactive';
            
            resolve({
              success: false,
              message: 'Failed to restart monitoring'
            });
          }
        });
      } catch (error) {
        // In case of exception, clear timeout
        clearTimeout(timeoutId);
        
        console.error('❌ Error trying to restart monitoring:', error);
        
        // Report actual failure status
        serverStatus.contractMonitoring.lastStatus = 'inactive';
        
        resolve({
          success: false,
          message: 'Error occurred during restart attempt'
        });
      }
    });
    
  } catch (error: any) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ Error trying to restart monitoring:', errorMessage);
    
    serverStatus.contractMonitoring.errors.push(`Restart error: ${errorMessage}`);
    
    // Report actual failure
    serverStatus.contractMonitoring.lastStatus = 'inactive';
    
    return { 
      success: false,
      message: `Failed to restart monitoring: ${errorMessage}`
    };
  }
}