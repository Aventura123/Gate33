import { NextRequest, NextResponse } from 'next/server';
import { ethers } from 'ethers';
import { doc, getDoc, updateDoc, collection, addDoc } from 'firebase/firestore';
import { db } from '../../../../lib/firebase';
import { g33TokenDistributorService } from '../../../../services/g33TokenDistributorService';

// ABI simplificado do contrato G33TokenDistributor
const DISTRIBUTOR_ABI = [
  "function distributeTokens(address donor, uint256 donationAmountUsd) external",
  "function getAvailableTokens() external view returns (uint256)",
  "function distributors(address) external view returns (bool)",
  "function tokensDistributed(address) external view returns (uint256)"
];

// Lista expandida de URLs RPC para maior resiliência
// Incluindo endpoints WebSockets (WSS) que podem contornar alguns firewalls
const POLYGON_RPC_URLS = [
  // WebSocket endpoints que podem contornar bloqueios de firewall
  "wss://polygon-mainnet.g.alchemy.com/v2/demo",  // Alchemy público
  "wss://ws-matic-mainnet.chainstacklabs.com",    // ChainStack
  
  // HTTP endpoints padrão
  'https://polygon-rpc.com',                      // Endpoint padrão
  'https://polygon.llamarpc.com',
  'https://polygon-mainnet.public.blastapi.io',
  'https://polygon.meowrpc.com',
  'https://rpc-mainnet.maticvigil.com',
  'https://polygon-bor.publicnode.com',
  
  // Infura endpoint (com chave pública para teste)
  'https://polygon-mainnet.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161'
];

const INFURA_KEY = "7b71460a7cfd447295a93a1d76a71ed6";
const POLYGON_RPC_URL = `https://polygon-mainnet.infura.io/v3/${INFURA_KEY}`;

// Configurações para diferentes redes
const NETWORK_RPC_URLS = {
  'polygon': POLYGON_RPC_URL,
  'ethereum': process.env.ETHEREUM_RPC_URL || 'https://eth.llamarpc.com',
  'bsc': process.env.BSC_RPC_URL || 'https://bsc-dataseed.binance.org'
};

/**
 * Tenta criar um provider confiável para a rede Polygon com múltiplas tentativas
 * @returns Um provider conectado ou undefined se falhar
 */
async function getReliableProvider(): Promise<ethers.providers.Provider | undefined> {
  console.log("🌐 Tentando conectar ao RPC principal:", POLYGON_RPC_URL);
  
  try {
    // Primeiro, tentar com Infura
    const provider = new ethers.providers.JsonRpcProvider(POLYGON_RPC_URL);
    const blockNumber = await provider.getBlockNumber();
    console.log(`✅ Conexão RPC bem-sucedida. Bloco atual: ${blockNumber}`);
    return provider;
  } catch (error) {
    console.error("❌ Falha ao conectar ao RPC Infura:", error);
    
    // Se Infura falhar, tentar RPC alternativo
    try {
      const backupUrl = "https://polygon-rpc.com";
      console.log("🔄 Tentando RPC alternativo:", backupUrl);
      const provider = new ethers.providers.JsonRpcProvider(backupUrl);
      const blockNumber = await provider.getBlockNumber();
      console.log(`✅ Conexão alternativa bem-sucedida. Bloco: ${blockNumber}`);
      return provider;
    } catch (backupError) {
      console.error("❌ Falha também no RPC alternativo:", backupError);
      return undefined;
    }
  }
}

async function createRpcProvider(): Promise<ethers.providers.Provider | undefined> {
  const providerConfigs = [
    {
      url: `https://polygon-mainnet.infura.io/v3/${process.env.INFURA_KEY || "7b71460a7cfd447295a93a1d76a71ed6"}`,
      network: {name: "polygon", chainId: 137}
    },
    {
      url: "https://polygon-rpc.com",
      network: {name: "polygon", chainId: 137}
    },
    {
      url: "https://rpc.ankr.com/polygon",
      network: {name: "polygon", chainId: 137}
    }
  ];

  for (const config of providerConfigs) {
    try {
      console.log(`🔄 [API] Tentando conectar ao RPC: ${config.url}`);
      
      const provider = new ethers.providers.JsonRpcProvider({
        url: config.url,
        // Removed invalid 'network' property
        skipFetchSetup: true
      });

      // Adicionar timeout para a verificação de conexão
      const networkCheck = Promise.race([
        provider.getNetwork(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 5000))
      ]);

      const network = await networkCheck;
      if ((network as ethers.providers.Network).chainId === 137) {
        const blockNumber = await provider.getBlockNumber();
        console.log(`✅ [API] Conectado com sucesso ao RPC ${config.url}. Bloco: ${blockNumber}`);
        return provider;
      }
    } catch (error) {
      console.warn(`❌ [API] Falha ao conectar ao RPC ${config.url}:`, error instanceof Error ? error.message : String(error));
      continue;
    }
  }

  return undefined;
}

/**
 * API para distribuição segura de tokens G33 após doações
 * Esta API é executada do lado do servidor e tem acesso seguro às chaves privadas
 */
export async function POST(request: NextRequest) {
  try {
    console.log("🔄 [API] Iniciando distribuição de tokens G33");

    let requestData;
    try {
      requestData = await request.json();
    } catch (parseError) {
      console.error("❌ [API] Erro ao analisar corpo da requisição:", parseError);
      return NextResponse.json(
        { success: false, error: 'Erro ao analisar corpo da requisição' },
        { status: 400 }
      );
    }

    const { donorAddress, donationId, transactionHash, network, cryptoSymbol } = requestData;
    // Inicializamos usdValue como let para permitir modificações
    let usdValue = requestData.usdValue;

    // DIAGNÓSTICO: Adicionando logs detalhados para debug
    console.log("📊 [API] Valor USD recebido:", usdValue, "Tipo:", typeof usdValue);
    console.log("📊 [API] Dados completos da requisição:", JSON.stringify(requestData, null, 2));

    if (!donorAddress || !ethers.utils.isAddress(donorAddress)) {
      return NextResponse.json(
        { success: false, error: 'Endereço de doador inválido' },
        { status: 400 }
      );
    }

    // VALIDAÇÕES ADICIONAIS: Garantir que o valor é um número válido e no formato correto
    if (!usdValue || typeof usdValue !== 'number' || usdValue <= 0) {
      console.error(`❌ [API] Valor USD inválido: ${usdValue} (${typeof usdValue})`);
      return NextResponse.json(
        { success: false, error: 'Valor USD inválido' },
        { status: 400 }
      );
    }

    // VALIDAÇÃO CRÍTICA: Verificar se o valor é um inteiro
    if (usdValue % 1 !== 0) {
      console.warn(`⚠️ [API] O valor USD ${usdValue} contém decimais e será arredondado para ${Math.floor(usdValue)}`);
      usdValue = Math.floor(usdValue);
    }

    // VALIDAÇÃO CRÍTICA: Garantir valor mínimo de 1 USD
    if (usdValue < 1) {
      console.error(`❌ [API] Valor USD muito baixo: ${usdValue}. Mínimo necessário: 1 USD`);
      return NextResponse.json(
        { success: false, error: 'Valor USD muito baixo. Mínimo necessário: 1 USD', value: usdValue },
        { status: 400 }
      );
    }

    // DIAGNÓSTICO: Mostrando valor que será enviado ao contrato
    console.log(`📊 [API] Valor USD final a ser processado: ${usdValue}`);
    console.log(`📊 [API] Valor que será enviado ao contrato (x100): ${usdValue * 100}`);
    console.log(`📊 [API] Valor em hexadecimal: 0x${(usdValue * 100).toString(16)}`);

    // Garantir que o serviço está inicializado antes de prosseguir
    if (!g33TokenDistributorService.checkIsInitialized()) {
      console.log("⏳ [API] Aguardando inicialização do serviço...");
      // Forçar uma inicialização e aguardar sua conclusão
      await g33TokenDistributorService.init(true); // Forçar inicialização mesmo que tenha sido tentada recentemente
      
      // Verificar novamente após a tentativa de inicialização
      if (!g33TokenDistributorService.checkIsInitialized()) {
        const error = g33TokenDistributorService.getInitializationError() || "Erro desconhecido";
        console.error(`❌ [API] Serviço não inicializado após tentativa: ${error}`);
        return NextResponse.json(
          { 
            success: false, 
            error: 'Serviço distribuidor não inicializado', 
            details: `Não foi possível inicializar o serviço: ${error}`
          },
          { status: 503 }
        );
      }
    }

    try {
      console.log("✅ [API] Serviço inicializado, prosseguindo com distribuição");
      try {
        const distributionResult = await g33TokenDistributorService.distributeTokens(donorAddress, usdValue, true);

        if (!distributionResult) {
          throw new Error('Falha ao distribuir tokens. Verifique os logs para mais detalhes.');
        }

        console.log("✅ [API] Tokens distribuídos com sucesso");

        if (donationId) {
          await updateDoc(doc(db, 'tokenDonations', donationId), {
            status: 'distributed',
            distributionTxHash: distributionResult,
            updatedAt: new Date()
          });
        }

        // Verificar a transação para garantir que não houve falha de execução
        console.log("[API] Verificando status da transação na blockchain...");
        const receipt = await g33TokenDistributorService.getTransactionReceipt(distributionResult);
        
        if (receipt && receipt.status === 0) {
          console.error("❌ [API] Transação foi incluída na blockchain, mas a execução do contrato falhou (status=0)");
          
          // Atualizar o registro para refletir o erro
          if (donationId) {
            await updateDoc(doc(db, 'tokenDonations', donationId), {
              status: 'failed',
              error: 'Execution reverted: A transação foi incluída na blockchain mas a execução do contrato falhou',
              updatedAt: new Date()
            });
          }
          
          return NextResponse.json({
            success: false,
            transactionHash: distributionResult,
            error: 'Falha na execução do contrato (execution reverted)',
            message: `A transação ${distributionResult} foi incluída na blockchain, mas a execução falhou. Verifique em https://polygonscan.com/tx/${distributionResult}`
          }, { status: 400 });
        }

        return NextResponse.json({
          success: true,
          transactionHash: distributionResult,
          message: `Distribuição de tokens concluída com sucesso.`
        });
      } catch (error: unknown) {
        if (error instanceof Error) {
          console.error("❌ [API] Erro ao distribuir tokens:", error.message);
          return NextResponse.json(
            { success: false, error: 'Erro ao distribuir tokens', details: error.message },
            { status: 500 }
          );
        } else {
          console.error("❌ [API] Erro desconhecido ao distribuir tokens:", error);
          return NextResponse.json(
            { success: false, error: 'Erro desconhecido ao distribuir tokens', details: String(error) },
            { status: 500 }
          );
        }
      }
    } catch (error: unknown) {
      if (error instanceof Error) {
        console.error("❌ [API] Erro ao distribuir tokens:", error.message);
        return NextResponse.json(
          { success: false, error: 'Erro ao distribuir tokens', details: error.message },
          { status: 500 }
        );
      } else {
        console.error("❌ [API] Erro desconhecido ao distribuir tokens:", error);
        return NextResponse.json(
          { success: false, error: 'Erro desconhecido ao distribuir tokens', details: String(error) },
          { status: 500 }
        );
      }
    }
  } catch (error) {
    console.error("❌ [API] Erro inesperado:", error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Erro inesperado', 
        details: error instanceof Error ? error.message : String(error) 
      },
      { status: 500 }
    );
  }
}