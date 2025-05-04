/**
 * Inicialização do lado do servidor para o Gate33
 * 
 * Este arquivo contém a lógica para iniciar serviços que devem ser executados
 * apenas uma vez quando o servidor inicia, como o monitoramento de contratos blockchain.
 */
import dotenv from 'dotenv';
import { initializeContractMonitoring } from '../utils/contractMonitor';
import { logSystem } from '../utils/logSystem';

dotenv.config();

// Status global para rastreamento do estado do serviço
interface ServerStatus {
  contractMonitoring: {
    initialized: boolean;
    startTime: number | null;
    lastRestart: number | null;
    tokenDistributionActive: boolean;
    learn2earnActive: boolean;
    walletMonitoringActive: boolean;
    connectionType: string | null;
    errors: string[];
  }
}

// Status global do servidor - será acessado pela API de diagnóstico
export const serverStatus: ServerStatus = {
  contractMonitoring: {
    initialized: false,
    startTime: null,
    lastRestart: null,
    tokenDistributionActive: false,
    learn2earnActive: false,
    walletMonitoringActive: false,
    connectionType: null,
    errors: [],
  }
};

// Flag para garantir que a inicialização ocorra apenas uma vez
let isInitialized = false;

/**
 * Inicia todos os serviços do lado do servidor
 * Esta função só deve ser chamada uma vez quando o servidor inicia
 */
export function initializeServer() {
  // Garantir que a inicialização ocorra apenas uma vez
  if (isInitialized) {
    console.log('Servidor já foi inicializado anteriormente. Ignorando solicitação de inicialização duplicada.');
    return;
  }

  console.log('🚀 Iniciando serviços do servidor Gate33...');
  
  try {
    // Iniciar monitoramento de contratos blockchain
    console.log('📊 Iniciando monitoramento de contratos blockchain...');
    
    // Atualizando o status antes de iniciar
    serverStatus.contractMonitoring.startTime = Date.now();
    
    // Modificação no initializeContractMonitoring para fornecer um callback
    // que atualiza o status do servidor quando o monitoramento é inicializado
    const onMonitoringInitialized = (
      success: boolean, 
      providerType: string | null = null, 
      activeMonitors: {
        tokenDistribution: boolean;
        learn2earn: boolean;
        wallet: boolean;
      } = {
        tokenDistribution: false,
        learn2earn: false,
        wallet: false
      }
    ) => {
      if (success) {
        console.log('✅ Monitoramento de contratos blockchain inicializado com sucesso!');
        serverStatus.contractMonitoring.initialized = true;
        serverStatus.contractMonitoring.connectionType = providerType;
        serverStatus.contractMonitoring.tokenDistributionActive = activeMonitors.tokenDistribution;
        serverStatus.contractMonitoring.learn2earnActive = activeMonitors.learn2earn;
        serverStatus.contractMonitoring.walletMonitoringActive = activeMonitors.wallet;
      } else {
        console.error('❌ Falha ao inicializar monitoramento de contratos blockchain');
        serverStatus.contractMonitoring.initialized = false;
        serverStatus.contractMonitoring.errors.push(
          `Falha na inicialização em ${new Date().toISOString()}`
        );
      }
    };
    
    // Iniciar o monitoramento de contratos
    initializeContractMonitoring();
    
    // Definir um timeout para verificar se o monitoramento foi inicializado
    setTimeout(() => {
      if (!serverStatus.contractMonitoring.initialized) {
        console.warn('⚠️ O monitoramento de contratos não foi confirmado como inicializado após 30 segundos.');
        
        // Tentativa de recuperação: verificar se as variáveis de ambiente necessárias estão definidas
        if (!process.env.TOKEN_DISTRIBUTOR_ADDRESS) {
          console.error('❌ TOKEN_DISTRIBUTOR_ADDRESS não está configurado nas variáveis de ambiente');
          serverStatus.contractMonitoring.errors.push(
            'TOKEN_DISTRIBUTOR_ADDRESS não configurado'
          );
        }
        
        if (!process.env.DISTRIBUTOR_PRIVATE_KEY) {
          console.error('❌ DISTRIBUTOR_PRIVATE_KEY não está configurado nas variáveis de ambiente');
          serverStatus.contractMonitoring.errors.push(
            'DISTRIBUTOR_PRIVATE_KEY não configurado'
          );
        }
      }
    }, 30000); // 30 segundos para verificar se o monitoramento foi inicializado
    
    // Quaisquer outros serviços do lado do servidor podem ser iniciados aqui
    
    // Marcar como inicializado
    isInitialized = true;
    
    console.log('✅ Inicialização do servidor concluída!');
  } catch (error) {
    console.error('❌ Erro durante a inicialização do servidor:', error);
    serverStatus.contractMonitoring.errors.push(
      `Erro na inicialização: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
    );
  }
}

// Se este arquivo for importado diretamente no servidor, iniciar imediatamente
if (typeof window === 'undefined') {
  console.log('📝 server-init.ts carregado no ambiente servidor');
  initializeServer();
}

// Exportar função para reiniciar o monitoramento em caso de falha
export async function restartContractMonitoring() {
  try {
    console.log('🔄 Tentando reiniciar monitoramento de contratos...');
    serverStatus.contractMonitoring.lastRestart = Date.now();
    serverStatus.contractMonitoring.initialized = false;
    
    // Registrar tentativa de reinicialização
    await logSystem.info('Tentativa de reinicialização do monitoramento de contratos', {
      timestamp: new Date().toISOString(),
      previousErrors: [...serverStatus.contractMonitoring.errors]
    });
    
    // Limpar erros anteriores antes da reinicialização
    serverStatus.contractMonitoring.errors = [];
    
    // Reiniciar o monitoramento
    initializeContractMonitoring();
    
    return { success: true, message: 'Tentativa de reinicialização iniciada' };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    console.error('❌ Erro ao tentar reiniciar monitoramento:', errorMessage);
    
    serverStatus.contractMonitoring.errors.push(`Erro na reinicialização: ${errorMessage}`);
    
    return { 
      success: false, 
      message: `Falha ao reiniciar: ${errorMessage}`
    };
  }
}