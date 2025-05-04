import { NextResponse } from 'next/server';
import { g33TokenDistributorService } from '../../../../services/g33TokenDistributorService';

// Limitador de métodos para apenas GET
export const dynamic = 'force-dynamic'; // Não cachear este endpoint
export const revalidate = 0; // Sempre recuperar dados frescos

export async function GET() {
  try {
    // Recuperar status do servidor compartilhado
    const { serverStatus } = require('../../../../lib/server-init');

    // Obter estatísticas de distribuição de tokens do serviço
    let tokenDistributionStats;
    let serviceErrors = [];
    let isDistributorInitialized = false;

    try {
      // Verificar se o serviço está inicializado
      isDistributorInitialized = g33TokenDistributorService.checkIsInitialized();

      // Se inicializado, buscar estatísticas
      if (isDistributorInitialized) {
        tokenDistributionStats = await g33TokenDistributorService.getDistributionStats();
      } else {
        // Adicionar o erro de inicialização
        const initError = g33TokenDistributorService.getInitializationError();
        serviceErrors.push(initError || "Serviço de distribuição de tokens não inicializado");
      }
    } catch (error) {
      console.error("Erro ao obter estatísticas de distribuição:", error);
      serviceErrors.push(error instanceof Error 
        ? error.message 
        : "Erro desconhecido ao obter estatísticas de distribuição");
    }

    // Dados de configuração dos tokens
    const tokensConfig = {
      // Uso de valores do ambiente ou fallbacks
      distributorAddress: process.env.TOKEN_DISTRIBUTOR_ADDRESS || 
                          serverStatus?.contractConfig?.tokenDistributorAddress || 
                          "Not configured",
      tokenAddress: process.env.G33_TOKEN_ADDRESS || 
                     serverStatus?.contractConfig?.tokenAddress || 
                     "Not configured",
    };

    // Status de monitoramento
    const monitoringStatus = {
      tokenDistributionMonitoring: serverStatus?.contractMonitoring?.tokenDistributionActive || false,
      learn2earnActive: serverStatus?.contractMonitoring?.learn2earnActive || false,
      walletMonitoringActive: serverStatus?.contractMonitoring?.walletMonitoringActive || false,
      connectionType: serverStatus?.contractMonitoring?.connectionType || "Unavailable"
    };

    // Concatenar erros do serviço e do sistema
    const errors = [
      ...(serverStatus?.contractMonitoring?.errors || []),
      ...serviceErrors
    ];

    // Montar resposta
    return NextResponse.json({
      tokensConfig,
      monitoringStatus,
      tokenDistribution: tokenDistributionStats,
      errors,
      serviceInitialized: isDistributorInitialized,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("Erro na API de diagnóstico de tokens:", error);
    return NextResponse.json({
      error: "Falha ao obter dados de diagnóstico",
      message: error instanceof Error ? error.message : "Erro desconhecido",
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}