import { NextResponse } from 'next/server';
import { restartContractMonitoring } from '../../../../lib/server-init';

export async function POST() {
  try {
    // Restart contract monitoring
    const result = await restartContractMonitoring();
    
    // Return the result
    return NextResponse.json({
      success: result.success,
      message: result.message,
      timestamp: new Date().toISOString()
    }, { status: 200 });
    
  } catch (error: any) {
    console.error("Error restarting monitoring:", error);
    
    return NextResponse.json({ 
      success: false,
      error: error.message || "Unknown error while restarting monitoring",
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}