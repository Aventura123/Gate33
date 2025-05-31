import { NextResponse } from 'next/server';
import { getServerStatus } from '../../../../utils/monitors/contractMonitor';

export async function GET() {
  try {    // Get the current server status
    const status = getServerStatus();
    
    // Add debug information to help troubleshoot
    console.log("API: Current monitoring status:", {
      initialized: status.contractMonitoring.initialized,
      walletActive: status.contractMonitoring.walletMonitoringActive,
      tokenDistributionActive: status.contractMonitoring.tokenDistributionActive
    });
    
    return NextResponse.json({
      initialized: status.contractMonitoring.initialized,
      walletMonitoringActive: status.contractMonitoring.walletMonitoringActive,
      tokenDistributionActive: status.contractMonitoring.tokenDistributionActive,
      lastChecked: new Date().toISOString(),
      errors: status.contractMonitoring.errors || [],
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
