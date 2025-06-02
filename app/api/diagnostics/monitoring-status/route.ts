import { NextResponse } from 'next/server';
import { 
  getServerStatus, 
  learn2EarnContracts as allLearn2EarnContracts,
  instantJobsEscrowContracts as allInstantJobsEscrowContracts 
} from '../../../../utils/monitors/contractMonitor';

export async function GET() {
  try {
    // Get the current server status
    const status = getServerStatus() || {};
    const contractMonitoring = status.contractMonitoring || {};
    // Build a list of all possible networks from learn2EarnContracts
    const allContracts: { [key: string]: any } = allLearn2EarnContracts && typeof allLearn2EarnContracts === 'object' ? allLearn2EarnContracts : {};
    const allNetworks = Object.keys(allContracts);
    // Get the current monitored contracts (may be empty or partial)
    const monitored = contractMonitoring.learn2EarnContracts || [];
    // Build a map for quick lookup
    const monitoredMap = Object.fromEntries((Array.isArray(monitored) ? monitored : []).map((c: any) => [c.network, c]));    // Get InstantJobsEscrow contracts data
    const allInstantJobsContracts: { [key: string]: any } = typeof allInstantJobsEscrowContracts === 'object' && allInstantJobsEscrowContracts !== null ? allInstantJobsEscrowContracts : {};
    const allInstantJobsNetworks = Object.keys(allInstantJobsContracts);
    const monitoredInstantJobs = contractMonitoring.instantJobsEscrowContracts || [];
    const monitoredInstantJobsMap = Object.fromEntries((Array.isArray(monitoredInstantJobs) ? monitoredInstantJobs : []).map((c: any) => [c.network, c]));

    // Compose the full list for the UI
    const learn2EarnContracts = allNetworks.map(network => {
      const address = allContracts[network] || '';
      const monitoredEntry = monitoredMap[network];
      // If address is empty, not monitored
      if (!address) {
        return {
          address: '',
          network,
          active: false,
        };
      }
      // If monitored, preserve any extra info (like name)
      if (monitoredEntry) {
        return {
          ...monitoredEntry,
          address,
          network,
          active: true,
        };
      }
      // If address exists but not monitored yet (should be rare)
      return {
        address,
        network,
        active: true,
      };    });    // Process InstantJobsEscrow contracts
    const instantJobsEscrowContracts = allInstantJobsNetworks.map(network => {
      const address = allInstantJobsContracts[network] || '';
      const monitoredEntry = monitoredInstantJobsMap[network];
      
      // If address is empty, not monitored
      if (!address) {
        return {
          address: '',
          network,
          active: false,
        };
      }
      
      // If monitored, preserve any extra info (like name)
      if (monitoredEntry) {
        return {
          ...monitoredEntry,
          address,
          network,
          active: true,
        };
      }
      
      // If address exists but not monitored yet (should be rare)
      return {
        address,
        network,
        active: true,
      };
    });
    return NextResponse.json({
      initialized: contractMonitoring.initialized,
      walletMonitoringActive: contractMonitoring.walletMonitoringActive,
      tokenDistributionActive: contractMonitoring.tokenDistributionActive,
      learn2EarnContracts,
      instantJobsEscrowContracts,
      lastChecked: new Date().toISOString(),
      errors: contractMonitoring.errors || [],
    }, { status: 200 });
    
  } catch (error: any) {
    console.error("Error fetching monitoring status:", error);
    
    return NextResponse.json({ 
      success: false,
      error: error.message || "Unknown error fetching monitoring status",
      initialized: false,
      walletMonitoringActive: false,
      tokenDistributionActive: false,
      lastChecked: new Date().toISOString(),
      errors: [error.message || "Unknown error"]
    }, { status: 500 });
  }
}
