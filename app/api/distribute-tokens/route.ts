import { NextRequest, NextResponse } from 'next/server';
import { ethers } from 'ethers';
import { doc, getDoc, updateDoc, collection, addDoc } from 'firebase/firestore';
import { db } from '../../../lib/firebase';

// ABI simplificado do contrato G33TokenDistributor
const DISTRIBUTOR_ABI = [
  "function distributeTokens(address donor, uint256 donationAmountUsd) external",
  "function getAvailableTokens() external view returns (uint256)"
];

/**
 * API para distribuição segura de tokens G33 após doações
 * Esta API é executada do lado do servidor e tem acesso seguro às chaves privadas
 */
export async function POST(request: NextRequest) {
  try {
    console.log("🔄 Iniciando solicitação de distribuição de tokens G33");
    const { donorAddress, usdValue, donationId, transactionHash, network, cryptoSymbol } = await request.json();
    
    // Validação básica de parâmetros
    if (!donorAddress || !usdValue) {
      return NextResponse.json(
        { success: false, error: 'Parâmetros inválidos - endereço do doador e valor USD são obrigatórios' },
        { status: 400 }
      );
    }
    
    console.log(`📋 Detalhes da solicitação:
      - Endereço do doador: ${donorAddress}
      - Valor USD: $${usdValue}
      - ID da doação: ${donationId || 'Não fornecido'}
      - Hash da transação: ${transactionHash || 'Não fornecido'}
      - Rede: ${network || 'Não especificada'}
    `);

    // Acessar a chave privada do distribuidor (disponível no servidor)
    const privateKey = process.env.DISTRIBUTOR_PRIVATE_KEY;
    if (!privateKey) {
      console.error('❌ Chave privada do distribuidor não encontrada nas variáveis de ambiente');
      return NextResponse.json(
        { success: false, error: 'Configuração do distribuidor incompleta no servidor' },
        { status: 500 }
      );
    }
    
    // Buscar endereço do contrato distribuidor no Firebase
    console.log("🔍 Buscando configurações do contrato distribuidor...");
    const configDocRef = doc(db, "settings", "contractConfig");
    const configSnap = await getDoc(configDocRef);
    
    if (!configSnap.exists()) {
      console.error("❌ Configuração do contrato não encontrada");
      return NextResponse.json(
        { success: false, error: 'Configuração do contrato não encontrada' },
        { status: 500 }
      );
    }
    
    const config = configSnap.data();
    const distributorAddress = config.tokenDistributorAddress;
    console.log(`✅ Endereço do contrato distribuidor encontrado: ${distributorAddress}`);
    
    // Configurar provider e wallet
    const rpcUrl = process.env.RPC_URL || "https://polygon-rpc.com";
    console.log(`🌐 Conectando à rede via RPC: ${rpcUrl}`);
    
    const provider = new ethers.providers.JsonRpcProvider(rpcUrl);
    const wallet = new ethers.Wallet(privateKey, provider);
    
    // Verificar que a carteira está configurada corretamente
    const walletAddress = await wallet.getAddress();
    console.log(`👛 Carteira do distribuidor configurada: ${walletAddress.substring(0, 6)}...${walletAddress.substring(walletAddress.length - 4)}`);
    
    // Conectar ao contrato distribuidor
    const contract = new ethers.Contract(distributorAddress, DISTRIBUTOR_ABI, wallet);
    
    // Verificar se há tokens suficientes disponíveis
    const availableTokensWei = await contract.getAvailableTokens();
    const availableTokens = parseFloat(ethers.utils.formatEther(availableTokensWei));
    const tokensNeeded = usdValue; // 1 token por 1 USD
    
    console.log(`💰 Tokens disponíveis para distribuição: ${availableTokens}`);
    console.log(`🎯 Tokens necessários para esta doação: ${tokensNeeded}`);
    
    if (availableTokens < tokensNeeded) {
      console.error(`❌ Tokens insuficientes no contrato distribuidor (${availableTokens} disponíveis, ${tokensNeeded} necessários)`);
      return NextResponse.json(
        { 
          success: false, 
          error: `Tokens insuficientes no distribuidor. Disponível: ${availableTokens}, Necessário: ${tokensNeeded}` 
        },
        { status: 400 }
      );
    }
    
    // Converter valor USD para o formato esperado pelo contrato (x100 para precisão de 2 casas decimais)
    const usdValueScaled = Math.floor(usdValue * 100);
    console.log(`🧮 Valor USD escalado para o contrato: ${usdValueScaled}`);
    
    // Executar a distribuição de tokens
    console.log(`🚀 Enviando transação para distribuir ${tokensNeeded} tokens para ${donorAddress}...`);
    const tx = await contract.distributeTokens(donorAddress, usdValueScaled);
    console.log(`📤 Transação enviada! Hash: ${tx.hash}`);
    
    // Aguardar confirmação (1 bloco)
    console.log("⏳ Aguardando confirmação da transação...");
    const receipt = await tx.wait(1);
    console.log(`✅ Transação confirmada! Gas usado: ${receipt.gasUsed.toString()}`);
    
    // Se temos um ID de doação, atualizamos o registro no Firebase
    if (donationId) {
      try {
        const donationRef = doc(db, 'tokenDonations', donationId);
        await updateDoc(donationRef, {
          status: 'distributed',
          distributionTxHash: tx.hash
        });
        console.log(`📝 Registro de doação ${donationId} atualizado com sucesso`);
      } catch (updateError) {
        console.error("⚠️ Erro ao atualizar registro da doação:", updateError);
        // Não falha a requisição se apenas a atualização do registro falhar
      }
    } else {
      // Se não temos um ID de doação, criamos um novo registro
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
        console.log("📝 Novo registro de doação criado");
      } catch (addError) {
        console.error("⚠️ Erro ao criar novo registro de doação:", addError);
        // Não falha a requisição se apenas a criação do registro falhar
      }
    }
    
    // Retornar sucesso
    return NextResponse.json({
      success: true,
      transactionHash: tx.hash,
      tokenAmount: tokensNeeded,
      message: `Distribuição de ${tokensNeeded} tokens G33 concluída com sucesso`
    });
    
  } catch (error: any) {
    console.error('❌ Erro ao distribuir tokens:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Erro ao distribuir tokens',
        details: error.code || error.reason || 'Erro interno no servidor'
      },
      { status: 500 }
    );
  }
}