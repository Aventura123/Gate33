import { NextResponse } from 'next/server';
import { ethers } from 'ethers';

// Importar configurações e status global do servidor
let serverStatus: any;
try {
  serverStatus = require('../../../../lib/server-init').serverStatus;
} catch (error: any) {
  console.error("Erro ao importar status do servidor:", error);
  serverStatus = { contractMonitoring: { errors: ["Erro ao importar status do servidor"] } };
}

// Função auxiliar para testar a conexão com a blockchain
async function testBlockchainConnection() {
  const debugInfo: any = { triedUrls: [], envVars: {} };
  try {
    // Lista ampliada de RPCs para teste
    const rpcUrls = [
      process.env.CUSTOM_POLYGON_RPC,
      'https://polygon-rpc.com',
      'https://polygon.llamarpc.com',
      'https://polygon-mainnet.public.blastapi.io',
      'https://polygon.drpc.org',
      'https://polygon.blockpi.network/v1/rpc/public',
      'https://polygon.api.onfinality.io/public',
      'https://1rpc.io/matic',
      process.env.ALCHEMY_URL || `https://polygon-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_KEY || "demo"}`,
      process.env.INFURA_URL || `https://polygon-mainnet.infura.io/v3/${process.env.INFURA_KEY || "9aa3d95b3bc440fa88ea12eaa4456161"}`,
    ];
    debugInfo.envVars = {
      CUSTOM_POLYGON_RPC: process.env.CUSTOM_POLYGON_RPC,
      ALCHEMY_URL: process.env.ALCHEMY_URL,
      ALCHEMY_KEY: process.env.ALCHEMY_KEY,
      INFURA_URL: process.env.INFURA_URL,
      INFURA_KEY: process.env.INFURA_KEY,
    };
    // Testar URLs até encontrar uma que funcione
    for (const url of rpcUrls) {
      if (!url) continue;
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
        debugInfo[`${url}`] = error.message || String(error);
        // Continuar tentando o próximo URL
      }
    }
    // Se nenhum RPC funcionou, use dados administrativos do status global
    debugInfo.error = "Não foi possível conectar a nenhum RPC Polygon";
    return {
      success: false,
      error: "Não foi possível conectar a nenhum RPC Polygon",
      administrativeMode: true,
      debugInfo
    };
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
  administrativeMode?: boolean;
  contract?: any;
  blockchainConnection?: any;
  debugInfo: any;
}

// Função para verificar status do distribuidor de tokens
async function checkTokenDistributorStatus(): Promise<TokenDistributorStatus> {
  try {
    // Endereço do contrato do distribuidor de tokens
    const tokenDistributorAddress = process.env.TOKEN_DISTRIBUTOR_ADDRESS || 
                                    process.env.G33_TOKEN_DISTRIBUTOR_ADDRESS ||
                                    "0x137c762cb3eea5c8e5a6ed2fdf41dd47b5e13455"; // Endereço default
    
    // Verificar conexão com a blockchain
    const connectionTest = await testBlockchainConnection();
    if (!connectionTest.success || !connectionTest.provider) {
      return {
        success: false,
        error: connectionTest.error || "Erro desconhecido ao conectar à blockchain",
        administrativeMode: connectionTest.administrativeMode || false,
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
      distributorAddress: process.env.TOKEN_DISTRIBUTOR_ADDRESS || 
                          process.env.G33_TOKEN_DISTRIBUTOR_ADDRESS || 
                          "0x137c762cb3eea5c8e5a6ed2fdf41dd47b5e13455",
      tokenAddress: process.env.G33_TOKEN_ADDRESS || "0xc6099a207e9d2d37d1203f060d2e77c1e05008fa"
    };
    
    // Verificar status do monitoramento - priorizar o serverStatus
    let monitoringStatus = {
      initialized: false,
      tokenDistributionActive: false,
      learn2earnActive: false,
      walletMonitoringActive: false,
      errors: ["Status de monitoramento não disponível"],
      warnings: [], // Adicionando a propriedade 'warnings'
      connectionType: 'unknown', // Adicionando a propriedade 'connectionType'
      lastStatus: 'unknown' // Adicionando a propriedade 'lastStatus'
    };
    
    // Se serverStatus estiver disponível, use-o
    if (serverStatus && serverStatus.contractMonitoring) {
      monitoringStatus = {
        initialized: serverStatus.contractMonitoring.initialized || false,
        tokenDistributionActive: serverStatus.contractMonitoring.tokenDistributionActive || false,
        learn2earnActive: serverStatus.contractMonitoring.learn2earnActive || false,
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
    
    // No modo administrativo, priorizar informações de status do serverStatus
    // Isso garante que os monitores apareçam como "Active" na UI mesmo sem conexão
    if (tokenDistributorStatus.administrativeMode && serverStatus && serverStatus.contractMonitoring) {
      monitoringStatus.tokenDistributionActive = serverStatus.contractMonitoring.tokenDistributionActive;
      monitoringStatus.learn2earnActive = serverStatus.contractMonitoring.learn2earnActive;
      monitoringStatus.walletMonitoringActive = serverStatus.contractMonitoring.walletMonitoringActive;
    }
    
    // Se o monitoramento está ativo via WebSocket ou HTTP, considerar o sistema como não-administrativo
    let administrativeMode = true;
    if (
      monitoringStatus.tokenDistributionActive === true &&
      ["WebSocket", "HTTP", "FallbackProvider"].includes(monitoringStatus.connectionType)
    ) {
      administrativeMode = false;
    }
    
    // Construir resposta
    const response = {
      tokensConfig,
      monitoringStatus,
      tokenDistribution: tokenDistributorStatus.contract || null,
      blockchainConnection: tokenDistributorStatus.blockchainConnection || null,
      errors: [...tokenErrors], // Erros específicos de token do monitoramento
      warnings: monitoringStatus.warnings || [], // Incluir avisos para informar o usuário
      diagnosticTimestamp: new Date().toISOString(),
      administrativeMode,
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