import { NextResponse } from 'next/server';
import { ethers } from 'ethers';
import { getHttpRpcUrls } from '@/config/rpcConfig';

// Importar configurações e status global do servidor
let serverStatus: any;
try {
  serverStatus = require('../../../../lib/server-init').serverStatus;
} catch (error: any) {
  console.error("Erro ao importar status do servidor:", error);
  serverStatus = { contractMonitoring: { errors: ["Erro ao importar status do servidor"] } };
}

// Função simplificada para testar a conexão com a blockchain usando apenas os RPCs da configuração
async function testBlockchainConnection() {
  const debugInfo: any = { triedUrls: [] };
  try {
    // Obter URLs de RPC da configuração centralizada
    const rpcUrls = getHttpRpcUrls('polygon');
    
    if (!rpcUrls || rpcUrls.length === 0) {
      return {
        success: false,
        error: "Nenhum RPC Polygon configurado",
        debugInfo
      };
    }
    
    // Usar o primeiro RPC válido da lista
    const url = rpcUrls[0];
    debugInfo.triedUrls.push(url);
    
    try {
      const provider = new ethers.providers.JsonRpcProvider(url);
      const blockNumber = await Promise.race([
        provider.getBlockNumber(),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Timeout')), 3000))
      ]);
      
      return {
        success: true,
        provider,
        blockNumber,
        url: url.includes('api_key') ? url.replace(/api_key=.*/, 'api_key=****') : url,
        debugInfo
      };
    } catch (error: any) {
      debugInfo.error = error.message || String(error);
      return {
        success: false,
        error: `Falha ao conectar ao RPC Polygon: ${error.message}`,
        debugInfo
      };
    }
  } catch (error: any) {
    debugInfo.catchError = error.message;
    return {
      success: false,
      error: error.message,
      debugInfo
    };
  }
}

// Tipagem explícita para o retorno da função de status do distribuidor
interface TokenDistributorStatus {
  success: boolean;
  error?: any;
  contract?: any;
  blockchainConnection?: any;
  debugInfo: any;
}

// Função para verificar status do distribuidor de tokens
async function checkTokenDistributorStatus(): Promise<TokenDistributorStatus> {
  try {
    // Endereço do contrato do distribuidor de tokens
    const tokenDistributorAddress = process.env.TOKEN_DISTRIBUTOR_ADDRESS || process.env.G33_TOKEN_DISTRIBUTOR_ADDRESS;
    
    // Verificar se o endereço existe
    if (!tokenDistributorAddress) {
      return {
        success: false,
        error: "Endereço do distribuidor de tokens não configurado no ambiente (.env)",
        debugInfo: { envCheck: "TOKEN_DISTRIBUTOR_ADDRESS e G33_TOKEN_DISTRIBUTOR_ADDRESS não encontrados" }
      };
    }
    
    // Verificar conexão com a blockchain
    const connectionTest = await testBlockchainConnection();
    if (!connectionTest.success || !connectionTest.provider) {
      return {
        success: false,
        error: connectionTest.error || "Erro desconhecido ao conectar à blockchain",
        debugInfo: connectionTest.debugInfo || null
      };
    }
    
    // ABI mínimo para verificar o contrato
    const minimalAbi = [
      // Funções típicas de um contrato de distribuidor de tokens
      "function tokenAddress() view returns (address)",
      "function distributionEnabled() view returns (bool)",
      "function availableTokensForDistribution() view returns (uint256)",
      "function totalDistributed() view returns (uint256)",
      // Não precisamos do evento para verificação básica
    ];
    
    // Criar instância do contrato
    const contract = new ethers.Contract(tokenDistributorAddress, minimalAbi, connectionTest.provider);
    
    // Verificações básicas para ver se o contrato está respondendo
    let contractChecks: any = {
      address: tokenDistributorAddress,
      isValid: false,
      tokenAddress: null,
      distributionEnabled: false,
      availableTokens: "0",
      totalDistributed: "0",
    };
    
    // Verificar se existe um código de contrato nesse endereço
    const code = await connectionTest.provider.getCode(tokenDistributorAddress);
    contractChecks.isValid = code !== "0x";
    
    if (contractChecks.isValid) {
      try {
        // Tentar obter o endereço do token
        contractChecks.tokenAddress = await contract.tokenAddress();
      } catch (error: any) {
        console.warn("Função tokenAddress() não encontrada no contrato:", error);
        // Não é um problema fatal, o contrato pode usar outra nomenclatura
      }
      
      try {
        // Tentar verificar se a distribuição está habilitada
        contractChecks.distributionEnabled = await contract.distributionEnabled();
      } catch (error: any) {
        console.warn("Função distributionEnabled() não encontrada no contrato:", error);
      }
      
      try {
        // Tentar obter tokens disponíveis para distribuição
        const availableTokens = await contract.availableTokensForDistribution();
        contractChecks.availableTokens = ethers.utils.formatEther(availableTokens);
      } catch (error: any) {
        console.warn("Função availableTokensForDistribution() não encontrada no contrato:", error);
      }
      
      try {
        // Tentar obter total distribuído
        const totalDistributed = await contract.totalDistributed();
        contractChecks.totalDistributed = ethers.utils.formatEther(totalDistributed);
      } catch (error: any) {
        console.warn("Função totalDistributed() não encontrada no contrato:", error);
      }
    }
    
    return {
      success: contractChecks.isValid,
      contract: contractChecks,
      blockchainConnection: connectionTest,
      debugInfo: connectionTest.debugInfo || null
    };
  } catch (error: any) {
    console.error("Erro ao verificar status do distribuidor de tokens:", error);
    return {
      success: false,
      error: error.message,
      debugInfo: null
    };
  }
}

export async function GET() {
  try {
    // Verificar configuração de tokens
    const tokensConfig = {
      distributorAddress: process.env.TOKEN_DISTRIBUTOR_ADDRESS || process.env.G33_TOKEN_DISTRIBUTOR_ADDRESS,
      tokenAddress: process.env.G33_TOKEN_ADDRESS,
    };
      // Verificar status do monitoramento - priorizar o serverStatus
    let monitoringStatus = {
      initialized: false,
      tokenDistributionActive: false,
      walletMonitoringActive: false,
      errors: ["Status de monitoramento não disponível"],
      warnings: [], 
      connectionType: 'unknown',
      lastStatus: 'unknown'
    };
    
    // Se serverStatus estiver disponível, use-o
    if (serverStatus && serverStatus.contractMonitoring) {
      monitoringStatus = {
        initialized: serverStatus.contractMonitoring.initialized || false,
        tokenDistributionActive: serverStatus.contractMonitoring.tokenDistributionActive || false,
        walletMonitoringActive: serverStatus.contractMonitoring.walletMonitoringActive || false,
        errors: serverStatus.contractMonitoring.errors || [],
        warnings: serverStatus.contractMonitoring.warnings || [],
        connectionType: serverStatus.contractMonitoring.connectionType || 'unknown',
        lastStatus: serverStatus.contractMonitoring.lastStatus || 'unknown'
      };
    }
    
    // Executar verificações do distribuidor de tokens
    const tokenDistributorStatus = await checkTokenDistributorStatus();
    
    // Verificar se há erros específicos relacionados ao distribuidor de tokens
    const tokenErrors = monitoringStatus.errors?.filter((err: string) => 
      err.toLowerCase().includes('token') || 
      err.toLowerCase().includes('distributor')
    ) || [];
    
    // Construir resposta
    const response = {
      tokensConfig,
      monitoringStatus,
      tokenDistribution: tokenDistributorStatus.contract || null,
      blockchainConnection: tokenDistributorStatus.blockchainConnection || null,
      errors: [...tokenErrors], // Erros específicos de token do monitoramento
      warnings: monitoringStatus.warnings || [], // Incluir avisos para informar o usuário
      diagnosticTimestamp: new Date().toISOString(),
      debugInfo: tokenDistributorStatus.blockchainConnection?.debugInfo || tokenDistributorStatus.debugInfo || null
    };
    
    return NextResponse.json(response, { status: 200 });
    
  } catch (error: any) {
    console.error("Erro ao gerar diagnóstico de tokens:", error);
    
    return NextResponse.json({ 
      error: error.message || "Erro desconhecido ao gerar diagnóstico",
      diagnosticTimestamp: new Date().toISOString()
    }, { status: 500 });
  }
}