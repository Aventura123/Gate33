import { NextRequest, NextResponse } from "next/server";
import { ethers } from "ethers";
import { collection, query, where, getDocs, doc, getDoc } from "firebase/firestore";
import { db } from "../../../../lib/firebase";

// ABI simplificado para o diagnóstico
const DISTRIBUTOR_ABI = [
  "function getAvailableTokens() external view returns (uint256)",
  "function distributors(address) external view returns (bool)",
  "function totalDistributedTokens() external view returns (uint256)"
];

// Lista de URLs RPC confiáveis específicas para a rede Polygon
const POLYGON_RPC_URLS = [
  // Endpoints WebSockets (WS) - podem contornar certas restrições de rede
  "wss://polygon-mainnet.g.alchemy.com/v2/demo", // Alchemy WS público
  "wss://ws-matic-mainnet.chainstacklabs.com",  // ChainStack WS
  
  // Endpoints HTTP padrão
  "https://polygon-rpc.com",
  "https://polygon.llamarpc.com",
  "https://rpc-mainnet.maticvigil.com",
  "https://polygon-mainnet.public.blastapi.io",
  "https://polygon-bor.publicnode.com",
  "https://polygon.meowrpc.com"
];

// Endpoints locais para desenvolvimento
const LOCAL_RPC_URLS = [
  "http://127.0.0.1:8545", // Ganache / Hardhat padrão
  "http://localhost:8545"  // Alternativo
];

// Infura Polygon URL (com chave pública)
const INFURA_POLYGON_RPC = "https://polygon-mainnet.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161";

/**
 * Verifica se a aplicação está em uma rede com acesso à internet limitado
 * e que precisa usar fallbacks especiais
 */
async function isRestrictedNetwork(): Promise<boolean> {
  try {
    // Tenta acessar uma URL externa conhecida
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);
    
    const response = await fetch('https://cloudflare.com', { 
      signal: controller.signal,
      method: 'HEAD'
    });
    clearTimeout(timeoutId);
    
    return !response.ok;
  } catch (error) {
    console.log('[DIAGNOSTIC] Detectada possível restrição de rede');
    return true;
  }
}

/**
 * Cria um provider confiável para a rede Polygon ou rede local
 * @returns Provider conectado ou lança exceção se todas as tentativas falharem
 */
async function createReliableProvider(): Promise<ethers.providers.Provider> {
  const restrictedNetwork = await isRestrictedNetwork();
  let urlsToTry = [...POLYGON_RPC_URLS];
  
  // Em redes restritas ou ambiente de desenvolvimento, adiciona endpoints locais
  if (restrictedNetwork || process.env.NODE_ENV === 'development') {
    console.log('[DIAGNOSTIC] Usando também endpoints locais (desenvolvimento/rede restrita)');
    urlsToTry = [...urlsToTry, ...LOCAL_RPC_URLS];
  }
  
  // Tentar cada URL até encontrar uma que funcione
  for (const url of urlsToTry) {
    try {
      console.log(`[DIAGNOSTIC] Tentando conectar ao RPC: ${url}`);
      
      let provider: ethers.providers.Provider;
      
      // Diferentes tipos de conexão baseados na URL
      if (url.startsWith('wss://')) {
        // WebSockets provider
        provider = new ethers.providers.WebSocketProvider(url);
      } else {
        // JsonRpc provider padrão
        provider = new ethers.providers.JsonRpcProvider(url);
      }
      
      // Teste a conexão obtendo o número do bloco atual
      const blockNumber = await Promise.race([
        provider.getBlockNumber(),
        new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('Timeout ao conectar ao provider')), 5000)
        ),
      ]);
      
      console.log(`[DIAGNOSTIC] ✅ Conexão RPC bem-sucedida via ${url}, bloco atual: ${blockNumber}`);
      return provider;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      console.warn(`[DIAGNOSTIC] ❌ Falha ao conectar ao RPC ${url}: ${errorMessage}`);
      // Continuar para o próximo URL
    }
  }

  // Última chance: criar um provider de desenvolvimento (sem conexão real)
  // Útil para ambientes de desenvolvimento onde a rede blockchain não está disponível
  if (process.env.NODE_ENV === 'development') {
    try {
      console.log('[DIAGNOSTIC] Tentando criar provider estático para desenvolvimento');
      // Este provider não fará conexões reais, mas permitirá testes em ambientes sem blockchain
      const mockProvider = new ethers.providers.FallbackProvider([
        new ethers.providers.JsonRpcProvider('http://localhost:8545')
      ], 1);
      
      // Override do getBlockNumber para não falhar em ambiente de desenvolvimento
      mockProvider.getBlockNumber = async () => Promise.resolve(0);
      
      return mockProvider;
    } catch (error) {
      console.error('[DIAGNOSTIC] ❌ Falha ao criar provider de desenvolvimento');
    }
  }
  
  // Se tudo falhar, lance uma exceção
  throw new Error("Não foi possível estabelecer conexão com nenhum provider blockchain. Recomendações: 1) Verifique a conexão de internet; 2) Desative firewalls ou proxies restritivos; 3) Em desenvolvimento, inicie uma blockchain local.");
}

/**
 * API de diagnóstico para o distribuidor de tokens G33
 * Esta API verifica o status do monitoramento e o processo de distribuição de tokens
 */
export async function GET(request: NextRequest) {
  try {
    const results = {
      status: "success",
      environment: process.env.NODE_ENV,
      tokensConfig: {
        distributorAddress: process.env.TOKEN_DISTRIBUTOR_ADDRESS || "Not configured",
        privateKeyConfigured: !!process.env.DISTRIBUTOR_PRIVATE_KEY,
        rpcUrl: "Usando múltiplos endpoints (HTTP/WS)"
      },
      monitoringStatus: {
        tokenDistributionMonitoring: false,
        isServiceInitialized: false,
        networkRestricted: false
      },
      firebaseConfig: {},
      tokenDistribution: {
        availableTokens: "0",
        totalDistributed: "0",
        isWalletDistributor: false
      },
      pendingDonations: [] as { id: string; donorAddress: any; usdValue: any; tokenAmount: any; createdAt: any }[],
      errors: [] as string[],
      logs: [] as string[]
    };

    // Função para adicionar logs
    const log = (message: string) => {
      console.log(`[DIAGNOSTIC] ${message}`);
      results.logs.push(message);
    };

    // Função para registrar erros
    const logError = (message: string) => {
      console.error(`[DIAGNOSTIC ERROR] ${message}`);
      results.errors.push(message);
    };

    log("Starting G33 Token Distribution diagnostic");
    
    // Verificar restrições de rede
    const networkRestricted = await isRestrictedNetwork();
    results.monitoringStatus.networkRestricted = networkRestricted;
    if (networkRestricted) {
      log("⚠️ Possíveis restrições de rede detectadas. Usando modo de compatibilidade.");
    }

    // 1. Verificar configurações do ambiente
    log("Checking environment variables...");
    const distributorAddress = process.env.TOKEN_DISTRIBUTOR_ADDRESS;
    const privateKey = process.env.DISTRIBUTOR_PRIVATE_KEY;

    if (!distributorAddress) {
      logError("TOKEN_DISTRIBUTOR_ADDRESS environment variable is not configured");
    } else {
      log(`TOKEN_DISTRIBUTOR_ADDRESS is set to: ${distributorAddress}`);
    }

    if (!privateKey) {
      logError("DISTRIBUTOR_PRIVATE_KEY environment variable is not configured");
    } else {
      log("DISTRIBUTOR_PRIVATE_KEY is configured");
    }

    log("Usando múltiplos endpoints RPC (HTTP e WebSockets)");

    // 2. Verificar configurações no Firebase
    log("Checking Firebase contract configuration...");
    try {
      const configDoc = await getDoc(doc(db, "settings", "contractConfig"));
      if (!configDoc.exists()) {
        logError("Contract configuration not found in Firebase");
      } else {
        const config = configDoc.data();
        results.firebaseConfig = {
          tokenDistributorAddress: config.tokenDistributorAddress || "Not set",
          g33TokenAddress: config.g33TokenAddress || "Not set"
        };
        
        log(`Firebase distributor address: ${config.tokenDistributorAddress || "Not set"}`);
        
        // Verificar se o endereço no Firebase coincide com a variável de ambiente
        if (distributorAddress && config.tokenDistributorAddress !== distributorAddress) {
          logError(`Distributor address mismatch: 
            Environment: ${distributorAddress}
            Firebase: ${config.tokenDistributorAddress}`);
        }
      }
    } catch (error: any) {
      logError(`Failed to get Firebase config: ${error.message}`);
    }

    // 3. Verificar status do contrato na blockchain
    log("Checking blockchain contract status...");
    if (distributorAddress && (privateKey || process.env.NODE_ENV === "development")) {
      try {
        log("Connecting to blockchain with reliable provider...");
        
        try {
          const provider = await createReliableProvider();
          let wallet: ethers.Wallet;
          
          // Em desenvolvimento, podemos criar uma carteira temporária
          if (!privateKey && process.env.NODE_ENV === "development") {
            wallet = ethers.Wallet.createRandom().connect(provider);
            log(`Created temporary wallet for testing: ${wallet.address}`);
          } else {
            wallet = new ethers.Wallet(privateKey!, provider);
            log(`Using configured wallet: ${wallet.address}`);
          }

          const contract = new ethers.Contract(distributorAddress, DISTRIBUTOR_ABI, wallet);
          
          try {
            // Verificar se é um distribuidor autorizado
            const isDistributor = await Promise.race([
              contract.distributors(wallet.address),
              new Promise<boolean>((_, reject) => 
                setTimeout(() => reject(new Error('Timeout ao verificar status de distribuidor')), 5000)
              ),
            ]);
            
            results.tokenDistribution.isWalletDistributor = isDistributor;
            log(`Is wallet an authorized distributor: ${isDistributor}`);
            
            // Obter tokens disponíveis e distribuídos
            const availableTokensWei = await Promise.race([
              contract.getAvailableTokens(),
              new Promise<any>((_, reject) => 
                setTimeout(() => reject(new Error('Timeout ao obter tokens disponíveis')), 5000)
              ),
            ]);
            
            const availableTokens = ethers.utils.formatEther(availableTokensWei);
            results.tokenDistribution.availableTokens = availableTokens;
            log(`Available tokens: ${availableTokens} G33`);
            
            const totalDistributedWei = await Promise.race([
              contract.totalDistributedTokens(),
              new Promise<any>((_, reject) => 
                setTimeout(() => reject(new Error('Timeout ao obter total distribuído')), 5000)
              ),
            ]);
            
            const totalDistributed = ethers.utils.formatEther(totalDistributedWei);
            results.tokenDistribution.totalDistributed = totalDistributed;
            log(`Total distributed tokens: ${totalDistributed} G33`);
          } catch (contractError: any) {
            // Se estamos no ambiente de desenvolvimento, podemos simular dados para testes
            if (process.env.NODE_ENV === 'development') {
              log("⚠️ Usando dados simulados no ambiente de desenvolvimento");
              results.tokenDistribution = {
                availableTokens: "1000.0",
                totalDistributed: "500.0",
                isWalletDistributor: true
              };
            } else {
              throw contractError;
            }
          }
        } catch (providerError: any) {
          logError(`Error with blockchain provider: ${providerError.message || "Unknown provider error"}`);
          
          // Em desenvolvimento, podemos continuar com dados simulados
          if (process.env.NODE_ENV === 'development') {
            log("⚠️ Modo de desenvolvimento: continuando com dados simulados");
            results.tokenDistribution = {
              availableTokens: "1000.0",
              totalDistributed: "500.0",
              isWalletDistributor: true
            };
          }
        }
      } catch (error: any) {
        logError(`Error connecting to blockchain: ${error.message}`);
      }
    } else {
      logError("Cannot check blockchain status: missing distributor address or private key");
    }

    // 4. Verificar doações pendentes no Firebase
    log("Checking for pending donations in Firebase...");
    try {
      const donationsRef = collection(db, 'tokenDonations');
      const pendingQuery = query(donationsRef, where("status", "==", "pending"));
      const pendingSnapshot = await getDocs(pendingQuery);
      
      if (pendingSnapshot.empty) {
        log("No pending donations found");
      } else {
        const pendingDonations = pendingSnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            donorAddress: data.donorAddress,
            usdValue: data.usdValue,
            tokenAmount: data.tokenAmount,
            createdAt: data.createdAt?.toDate?.() || data.createdAt
          };
        });
        
        results.pendingDonations = pendingDonations;
        log(`Found ${pendingDonations.length} pending donations`);
      }
    } catch (error: any) {
      logError(`Error checking pending donations: ${error.message}`);
    }

    log("Diagnostic completed");
    return NextResponse.json(results);
  } catch (error: any) {
    console.error("Error in diagnostic API:", error);
    return NextResponse.json({
      status: "error",
      error: error.message || "Unknown error occurred"
    }, { status: 500 });
  }
}