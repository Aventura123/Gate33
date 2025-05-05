import { NextResponse } from 'next/server';
import { restartContractMonitoring } from '../../../../lib/server-init';

export async function POST() {
  try {
    // Reiniciar o monitoramento de contratos
    const result = await restartContractMonitoring();
    
    // Retornar o resultado
    return NextResponse.json({
      success: result.success,
      message: result.message,
      timestamp: new Date().toISOString()
    }, { status: 200 });
    
  } catch (error: any) {
    console.error("Erro ao reiniciar monitoramento:", error);
    
    return NextResponse.json({ 
      success: false,
      error: error.message || "Erro desconhecido ao reiniciar monitoramento",
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}