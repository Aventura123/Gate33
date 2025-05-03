import { NextRequest, NextResponse } from "next/server";
import { ethers } from "ethers";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../../lib/firebase";

// ABI simplificado para o diagnóstico
const DISTRIBUTOR_ABI = [
  "function getAvailableTokens() external view returns (uint256)",
  "function distributors(address) external view returns (bool)",
  "function addDistributor(address distributor) external",
  "function totalDistributedTokens() external view returns (uint256)"
];

const TOKEN_ABI = [
  "function balanceOf(address account) external view returns (uint256)",
];

/**
 * API de diagnóstico para o distribuidor de tokens G33
 * Esta API verifica o estado do contrato distribuidor e corrige problemas comuns
 */
export async function GET(request: NextRequest) {
  try {
    const results = {
      status: "success",
      tokenDistributorAddress: "",
      providerConnected: false,
      walletConnected: false,
      isWalletDistributor: false,
      tokenBalance: "0",
      availableTokens: "0",
      totalDistributed: "0",
      logs: [] as string[],
      errors: [] as string[],
      fixes: [] as string[]
    };

    // Função para adicionar logs
    const log = (message: string) => {
      console.log(message);
      results.logs.push(message);
    };

    // Função para registrar erros
    const logError = (message: string) => {
      console.error(message);
      results.errors.push(message);
    };

    // Função para registrar correções
    const logFix = (message: string) => {
      console.log(`FIX: ${message}`);
      results.fixes.push(message);
    };

    log("Iniciando diagnóstico do distribuidor de tokens G33");

    // 1. Verificar configurações no Firebase
    log("Verificando configurações no Firebase...");
    const configDoc = await getDoc(doc(db, "settings", "contractConfig"));
    
    if (!configDoc.exists()) {
      logError("Documento de configuração do contrato não encontrado no Firebase");
      return NextResponse.json(results, { status: 500 });
    }
    
    const config = configDoc.data();
    const distributorAddress = config.tokenDistributorAddress;
    const tokenAddress = config.g33TokenAddress;
    
    if (!distributorAddress) {
      logError("Endereço do distribuidor não configurado no Firebase");
      return NextResponse.json(results, { status: 500 });
    }

    results.tokenDistributorAddress = distributorAddress;
    log(`Endereço do distribuidor: ${distributorAddress}`);
    
    // 2. Verificar se temos acesso à chave privada
    const privateKey = process.env.DISTRIBUTOR_PRIVATE_KEY;
    if (!privateKey) {
      logError("Chave privada do distribuidor não encontrada nas variáveis de ambiente");
      return NextResponse.json(results, { status: 500 });
    }
    log("Chave privada do distribuidor encontrada");

    // 3. Configurar provider e wallet
    try {
      const rpcUrl = process.env.RPC_URL || "https://polygon-rpc.com";
      log(`Conectando ao provider em: ${rpcUrl}`);
      
      const provider = new ethers.providers.JsonRpcProvider(rpcUrl);
      results.providerConnected = true;
      
      // Verificar conexão com a rede
      const network = await provider.getNetwork();
      log(`Conectado à rede: ${network.name} (chainId: ${network.chainId})`);
      
      // Configurar wallet
      const wallet = new ethers.Wallet(privateKey, provider);
      const walletAddress = await wallet.getAddress();
      results.walletConnected = true;
      log(`Carteira configurada: ${walletAddress}`);

      // 4. Verificar contrato distribuidor
      const distributorContract = new ethers.Contract(distributorAddress, DISTRIBUTOR_ABI, wallet);
      
      // Verificar se a carteira é um distribuidor autorizado
      const isDistributor = await distributorContract.distributors(walletAddress);
      results.isWalletDistributor = isDistributor;
      
      if (!isDistributor) {
        logError(`A carteira ${walletAddress} não é um distribuidor autorizado`);
        // Tentar corrigir registrando a carteira como distribuidor
        try {
          log("Tentando adicionar carteira como distribuidor...");
          const tx = await distributorContract.addDistributor(walletAddress);
          await tx.wait(1);
          logFix(`Carteira ${walletAddress} agora é um distribuidor autorizado`);
          results.isWalletDistributor = true;
        } catch (addError: any) {
          logError(`Falha ao adicionar como distribuidor: ${addError.message}`);
        }
      } else {
        log(`A carteira ${walletAddress} é um distribuidor autorizado`);
      }

      // 5. Verificar tokens disponíveis
      try {
        const availableTokensWei = await distributorContract.getAvailableTokens();
        const availableTokens = ethers.utils.formatEther(availableTokensWei);
        results.availableTokens = availableTokens;
        log(`Tokens disponíveis no contrato distribuidor: ${availableTokens} G33`);

        // Verificar tokens já distribuídos
        const totalDistributedWei = await distributorContract.totalDistributedTokens();
        const totalDistributed = ethers.utils.formatEther(totalDistributedWei);
        results.totalDistributed = totalDistributed;
        log(`Total de tokens já distribuídos: ${totalDistributed} G33`);
        
        if (parseFloat(availableTokens) === 0) {
          logError("Não há tokens disponíveis para distribuição");
        }
      } catch (tokenError: any) {
        logError(`Erro ao verificar tokens disponíveis: ${tokenError.message}`);
      }

      // 6. Verificar saldo do token G33 se tivermos o endereço
      if (tokenAddress) {
        try {
          const tokenContract = new ethers.Contract(tokenAddress, TOKEN_ABI, provider);
          const tokenBalanceWei = await tokenContract.balanceOf(distributorAddress);
          const tokenBalance = ethers.utils.formatEther(tokenBalanceWei);
          results.tokenBalance = tokenBalance;
          log(`Saldo de tokens G33 no distribuidor: ${tokenBalance} G33`);
        } catch (balanceError: any) {
          logError(`Erro ao verificar saldo de tokens: ${balanceError.message}`);
        }
      }

    } catch (error: any) {
      logError(`Erro durante o diagnóstico: ${error.message}`);
      return NextResponse.json(results, { status: 500 });
    }

    log("Diagnóstico concluído");
    return NextResponse.json(results);
    
  } catch (error: any) {
    console.error("Erro ao executar diagnóstico:", error);
    return NextResponse.json({ 
      status: "error", 
      error: error.message || "Erro desconhecido durante o diagnóstico"
    }, { status: 500 });
  }
}