import { NextRequest, NextResponse } from 'next/server';
import { ethers } from 'ethers';
import { doc, getDoc, updateDoc, collection, addDoc } from 'firebase/firestore';
import { db } from '../../../../lib/firebase';

// ABI simplificado do contrato G33TokenDistributor
const DISTRIBUTOR_ABI = [
  "function distributeTokens(address donor, uint256 donationAmountUsd) external",
  "function getAvailableTokens() external view returns (uint256)"
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
    
    // Log full environment variables for debugging (hiding sensitive data)
    console.log("🔧 [API] Variáveis de ambiente disponíveis:", Object.keys(process.env)
      .filter(key => !key.includes('KEY') && !key.includes('SECRET') && !key.includes('PASSWORD'))
      .join(', '));
    
    // Verify DISTRIBUTOR_PRIVATE_KEY presence but don't log actual value
    if (process.env.DISTRIBUTOR_PRIVATE_KEY) {
      console.log("✅ [API] DISTRIBUTOR_PRIVATE_KEY está configurada e disponível");
    } else {
      console.error("❌ [API] DISTRIBUTOR_PRIVATE_KEY não está configurada");
    }
    
    let requestData;
    try {
      requestData = await request.json();
      console.log(`📋 [API] Dados da solicitação recebidos: ${JSON.stringify({
        donorAddress: requestData.donorAddress,
        usdValue: requestData.usdValue,
        donationId: requestData.donationId || 'Não fornecido',
        network: requestData.network || 'polygon'
      })}`);
    } catch (parseError) {
      console.error("❌ [API] Erro ao analisar corpo da requisição:", parseError);
      return NextResponse.json(
        { success: false, error: 'Erro ao analisar corpo da requisição' },
        { status: 400 }
      );
    }
    
    const { donorAddress, usdValue, donationId, transactionHash, network, cryptoSymbol } = requestData;
    
    // Validação de parâmetros
    if (!donorAddress || !ethers.utils.isAddress(donorAddress)) {
      console.error("❌ [API] Endereço de doador inválido:", donorAddress);
      return NextResponse.json(
        { success: false, error: 'Endereço de doador inválido' },
        { status: 400 }
      );
    }

    if (!usdValue || typeof usdValue !== 'number' || usdValue <= 0) {
      return NextResponse.json(
        { success: false, error: 'Valor USD inválido' },
        { status: 400 }
      );
    }
    
    console.log(`📋 Dados da solicitação:
      - Doador: ${donorAddress} 
      - Valor USD: $${usdValue}
      - ID da doação: ${donationId || 'Não fornecido'}
      - Rede origem: ${network || 'polygon'}
    `);

    // Obter chave privada do distribuidor (armazenada em variáveis de ambiente)
    const privateKey = process.env.DISTRIBUTOR_PRIVATE_KEY;
    if (!privateKey) {
      console.error('❌ [API] Chave privada do distribuidor não configurada');
      return NextResponse.json(
        { success: false, error: 'Erro de configuração do servidor: DISTRIBUTOR_PRIVATE_KEY não encontrada' },
        { status: 500 }
      );
    }
    
    // Buscar endereço do contrato distribuidor no Firebase
    try {
      console.log("[API] Tentando acessar o Firebase para obter configuração do contrato...");
      const configDocRef = doc(db, "settings", "contractConfig");
      const configSnap = await getDoc(configDocRef);
      
      if (!configSnap.exists()) {
        console.error("❌ [API] Documento de configuração não encontrado no Firebase");
        return NextResponse.json(
          { success: false, error: 'Documento de configuração do contrato não encontrado' },
          { status: 500 }
        );
      }
      
      if (!configSnap.data().tokenDistributorAddress) {
        console.error("❌ [API] Endereço do distribuidor não configurado no documento Firebase");
        return NextResponse.json(
          { success: false, error: 'Endereço do contrato distribuidor não configurado' },
          { status: 500 }
        );
      }
      
      const distributorAddress = configSnap.data().tokenDistributorAddress;
      console.log(`✅ [API] Endereço do contrato distribuidor obtido: ${distributorAddress}`);
    
      // Obter um provider confiável usando nosso método de fallback
      console.log(`🌐 [API] Tentando conectar à Polygon com múltiplos endpoints...`);
      const provider = await createRpcProvider();
      
      if (!provider) {
        console.error('❌ [API] Erro fatal: Não foi possível obter um provider válido');
        return NextResponse.json(
          { 
            success: false, 
            error: 'Não foi possível estabelecer conexão com a blockchain. Tente novamente mais tarde.',
            details: "Falha ao conectar com todos os endpoints RPC disponíveis"
          },
          { status: 503 }
        );
      }
      
      console.log(`✅ [API] Conexão com provider blockchain estabelecida com sucesso`);
      
      // Configurar wallet
      try {
        // Definir tokensNeeded no início do bloco
        const tokensNeeded = usdValue;
        console.log("[API] Configurando wallet com a chave privada...");
        const wallet = new ethers.Wallet(privateKey, provider);
        const walletAddress = await wallet.getAddress();
        
        console.log(`👛 [API] Carteira do distribuidor configurada: ${walletAddress.substring(0, 6)}...${walletAddress.substring(walletAddress.length - 4)}`);
        
        // Verificar o saldo de MATIC da carteira para diagnóstico
        const walletBalance = await provider.getBalance(walletAddress);
        console.log(`💰 [API] Saldo de MATIC da carteira: ${ethers.utils.formatEther(walletBalance)} MATIC`);
        
        if (walletBalance.isZero()) {
          console.error("❌ [API] A carteira do distribuidor não tem saldo de MATIC");
          return NextResponse.json(
            { success: false, error: 'A carteira do distribuidor não tem saldo de MATIC para pagar gas' },
            { status: 400 }
          );
        }
        
        // Conectar ao contrato
        console.log(`[API] Conectando ao contrato ${distributorAddress}...`);
        const contract = new ethers.Contract(distributorAddress, DISTRIBUTOR_ABI, wallet);
        
        // Verificar saldo de tokens disponíveis
        console.log("[API] Verificando saldo de tokens disponíveis...");
        let availableTokensWei;
        try {
          availableTokensWei = await contract.getAvailableTokens();
          const availableTokens = parseFloat(ethers.utils.formatEther(availableTokensWei));
          
          console.log(`💰 [API] Tokens disponíveis: ${availableTokens.toFixed(2)}`);
          console.log(`🎯 [API] Tokens necessários: ${tokensNeeded.toFixed(2)}`);
          
          if (availableTokens < tokensNeeded) {
            console.error(`❌ [API] Tokens insuficientes (${availableTokens} disponíveis, ${tokensNeeded} necessários)`);
            return NextResponse.json(
              { 
                success: false, 
                error: `Tokens insuficientes no distribuidor`,
                availableTokens,
                tokensNeeded
              },
              { status: 400 }
            );
          }
        } catch (contractError) {
          console.error("❌ [API] Erro ao acessar função getAvailableTokens do contrato:", contractError);
          return NextResponse.json(
            { 
              success: false, 
              error: 'Erro ao acessar contrato inteligente',
              details: contractError instanceof Error ? contractError.message : "Erro desconhecido no contrato"
            },
            { status: 500 }
          );
        }
        
        // Escalar valor USD para o formato esperado pelo contrato
        // IMPORTANTE: O contrato atual divide o valor por 100 E não considera casas decimais
        // Para compensar isso, multiplicamos o valor por 100 (para o contrato) e por 10^18 (para casas decimais)
        // 1 USD deveria ser 1 token completo (10^18 wei)
        const multiplier = BigInt(100) * BigInt(10 ** 18);
        const usdValueScaled = ethers.BigNumber.from(
          Math.floor(usdValue * 100).toString()
        ).mul(ethers.BigNumber.from(10).pow(18));
        
        console.log(`💱 [API] Valor USD original: $${usdValue}`);
        console.log(`💱 [API] Valor USD escalado: ${usdValueScaled.toString()} (para considerar divisão por 100 e 18 casas decimais)`);
        
        // Obter valores atuais de gas da rede
        console.log("[API] Obtendo fee data da rede...");
        let feeData;
        try {
          feeData = await provider.getFeeData();
          console.log("[API] Fee data obtido com sucesso");
        } catch (feeError) {
          console.error("❌ [API] Erro ao obter fee data da rede:", feeError);
          feeData = {
            gasPrice: ethers.utils.parseUnits("35", "gwei"),
            maxFeePerGas: ethers.utils.parseUnits("60", "gwei"),
            maxPriorityFeePerGas: ethers.utils.parseUnits("30", "gwei")
          };
          console.log("[API] Usando fee data de fallback");
        }
        
        // Configurar gas com valores suficientes para Polygon
        const gasLimit = ethers.utils.hexlify(80000); // Valor fixo para o gas limit
        
        // IMPORTANTE: Polygon exige pelo menos 25 gwei para maxPriorityFeePerGas (gas tip cap)
        // Usar 30 gwei para garantir que a transação seja aceita
        const maxPriorityFeePerGas = ethers.utils.parseUnits("30", "gwei"); 
        
        // Usar um valor de maxFeePerGas também adequado
        const maxFeePerGas = ethers.utils.parseUnits("60", "gwei");
        
        // Calcular custo estimado da transação
        const estimatedGasCost = maxFeePerGas.mul(gasLimit);
        console.log(`⛽ [API] Custo estimado da transação: ${ethers.utils.formatEther(estimatedGasCost)} MATIC`);
        
        if (estimatedGasCost.gt(walletBalance)) {
          console.error(`❌ [API] Fundos insuficientes para a transação. Necessário: ${ethers.utils.formatEther(estimatedGasCost)} MATIC, Disponível: ${ethers.utils.formatEther(walletBalance)} MATIC`);
          return NextResponse.json(
            { 
              success: false, 
              error: `Fundos insuficientes na carteira distribuidora`,
              required: ethers.utils.formatEther(estimatedGasCost),
              available: ethers.utils.formatEther(walletBalance)
            },
            { status: 400 }
          );
        }
        
        console.log(`🚀 [API] Distribuindo ${tokensNeeded} tokens para ${donorAddress}...`);
        console.log(`⛽ [API] Configurações de gas: 
          - Gas Limit: ${gasLimit}
          - MaxPriorityFeePerGas: ${ethers.utils.formatUnits(maxPriorityFeePerGas, "gwei")} gwei
          - MaxFeePerGas: ${ethers.utils.formatUnits(maxFeePerGas, "gwei")} gwei
        `);
        
        // Enviar transação com configurações de gas explícitas e baixas
        console.log("[API] Enviando transação para o contrato...");
        const tx = await contract.distributeTokens(donorAddress, usdValueScaled, {
          gasLimit,
          maxPriorityFeePerGas,
          maxFeePerGas,
          type: 2 // Tipo EIP-1559 para suportar as configurações de gas
        });
        
        console.log(`📤 [API] Transação enviada: ${tx.hash}`);
        
        // Aguardar confirmação
        console.log("[API] Aguardando confirmação da transação (1 bloco)...");
        const receipt = await tx.wait(1);
        console.log(`✅ [API] Transação confirmada! Gas usado: ${receipt.gasUsed.toString()}`);
        
        // Atualizar registro no Firebase se temos um ID de doação
        if (donationId) {
          try {
            console.log(`[API] Atualizando registro de doação ${donationId} no Firebase...`);
            const donationRef = doc(db, 'tokenDonations', donationId);
            await updateDoc(donationRef, {
              status: 'distributed',
              distributionTxHash: tx.hash,
              updatedAt: new Date()
            });
            console.log("[API] Registro de doação atualizado com sucesso");
          } catch (updateError) {
            console.error("⚠️ [API] Erro ao atualizar registro da doação:", updateError);
            // Não falha a operação principal se apenas o update falhar
          }
        } else {
          // Criar novo registro se não temos um ID existente
          try {
            await addDoc(collection(db, 'tokenDonations'), {
              donorAddress,
              donationAmount: 0, // Não temos o valor original em cripto
              usdValue,
              tokenAmount: tokensNeeded,
              transactionHash: transactionHash || tx.hash,
              network: network || 'polygon',
              cryptoSymbol: cryptoSymbol || 'UNKNOWN',
              createdAt: new Date(),
              status: 'distributed',
              distributionTxHash: tx.hash
            });
          } catch (addError) {
            console.error("⚠️ Erro ao criar registro de doação:", addError);
            // Não falha a operação principal se apenas a criação do registro falhar
          }
        }
        
        // Retornar resposta de sucesso
        console.log("[API] Operação concluída com sucesso, retornando resposta");
        return NextResponse.json({
          success: true,
          transactionHash: tx.hash,
          tokenAmount: tokensNeeded,
          recordUpdated: !!donationId,
          message: `Distribuição de ${tokensNeeded} tokens G33 concluída com sucesso`
        });
        
      } catch (walletError) {
        if (walletError instanceof Error) {
          console.error("❌ [API] Erro ao configurar wallet ou interagir com contrato:", walletError.message);
          console.error("Stack trace:", walletError.stack);
          return NextResponse.json(
            { 
              success: false, 
              error: 'Erro ao interagir com a blockchain',
              details: walletError.message
            },
            { status: 500 }
          );
        } else {
          console.error("❌ [API] Erro desconhecido ao configurar wallet ou interagir com contrato:", walletError);
          return NextResponse.json(
            { 
              success: false, 
              error: 'Erro desconhecido ao interagir com a blockchain',
              details: String(walletError)
            },
            { status: 500 }
          );
        }
      }
    } catch (firebaseError) {
      console.error("❌ [API] Erro ao acessar Firebase:", firebaseError);
      return NextResponse.json(
        { 
          success: false, 
          error: 'Erro ao acessar configurações no banco de dados',
          details: firebaseError instanceof Error ? firebaseError.message : "Erro desconhecido no Firebase"
        },
        { status: 500 }
      );
    }
    
  } catch (error: any) {
    // Log complete error with stack trace
    console.error('❌ [API] Erro grave na distribuição de tokens:', error);
    console.error('Stack trace:', error.stack);
    
    // Verificar tipo específico de erro
    let statusCode = 500;
    let errorMessage = 'Erro ao processar a distribuição de tokens';
    let errorDetails = {};
    
    if (error.code === 'INSUFFICIENT_FUNDS') {
      statusCode = 400;
      errorMessage = 'Fundos insuficientes para gas na carteira do distribuidor';
    } else if (error.code === 'UNPREDICTABLE_GAS_LIMIT') {
      statusCode = 400;
      errorMessage = 'Erro na estimativa de gas para a transação';
    } else if (error.code === 'CALL_EXCEPTION') {
      statusCode = 400;
      errorMessage = 'Erro ao chamar o contrato distribuidor';
    } else if (error.code === 'SERVER_ERROR') {
      statusCode = 500;
      errorMessage = 'Erro interno do servidor';
    } else if (error.message && error.message.includes('network')) {
      statusCode = 503;
      errorMessage = 'Erro de conexão com a rede blockchain';
    } else if (error.message && error.message.includes('inicializa')) {
      statusCode = 503;
      errorMessage = 'Serviço distribuidor não inicializado completamente';
    } else if (error.code === 'TIMEOUT') {
      statusCode = 504;
      errorMessage = 'Tempo limite excedido na conexão com a blockchain';
    } else if (error.message && error.message.includes('insufficient funds')) {
      statusCode = 400;
      errorMessage = 'Fundos insuficientes na carteira do distribuidor para enviar a transação';
      console.error("Detalhes do erro de fundos insuficientes:", error);
    }
    
    // Log detalhado para depuração
    console.log(`⚠️ [API] Distribuição falhou: ${errorMessage}`, {
      statusCode,
      errorCode: error.code || 'UNKNOWN_ERROR',
      errorReason: error.reason || null,
      errorMessage: error.message || null,
      stack: error.stack ? error.stack.split('\n').slice(0, 3).join('\n') : null
    });
    
    return NextResponse.json(
      { 
        success: false, 
        error: errorMessage,
        code: error.code || 'UNKNOWN_ERROR',
        details: error.reason || error.message || 'Erro interno do servidor'
      },
      { status: statusCode }
    );
  }
}