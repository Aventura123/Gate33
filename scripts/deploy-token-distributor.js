// Script de deploy para Gate33Token e G33TokenDistributor
// Este script implementa os contratos na seguinte ordem:
// 1. Gate33Token
// 2. G33TokenDistributor (passando o endereço do Gate33Token)
// 3. Chama mintAllToDistributor para enviar todos os tokens para o distribuidor

const { ethers } = require("hardhat");

async function main() {
  console.log("🚀 Iniciando deploy dos contratos Gate33Token e G33TokenDistributor");

  // Deploy do Gate33Token
  console.log("\n📝 Implantando contrato Gate33Token...");
  const Gate33Token = await ethers.getContractFactory("Gate33Token");
  const gate33Token = await Gate33Token.deploy();
  await gate33Token.deployed();
  console.log("✅ Gate33Token implantado no endereço:", gate33Token.address);

  // Deploy do G33TokenDistributor, passando o endereço do Gate33Token
  console.log("\n📝 Implantando contrato G33TokenDistributor...");
  const G33TokenDistributor = await ethers.getContractFactory("G33TokenDistributor");
  const tokenDistributor = await G33TokenDistributor.deploy(gate33Token.address);
  await tokenDistributor.deployed();
  console.log("✅ G33TokenDistributor implantado no endereço:", tokenDistributor.address);

  // Mintar todos os tokens para o distribuidor
  console.log("\n💰 Mintando todos os tokens para o contrato distribuidor...");
  const mintTx = await gate33Token.mintAllToDistributor(tokenDistributor.address);
  await mintTx.wait();
  console.log("✅ Mintagem completa! Transação:", mintTx.hash);

  // Verificar o saldo de tokens no distribuidor
  const tokenBalance = await gate33Token.balanceOf(tokenDistributor.address);
  const formattedBalance = ethers.utils.formatEther(tokenBalance);
  console.log(`\n💼 Saldo de tokens no distribuidor: ${formattedBalance} G33`);

  // Adicionar um endereço servidor como distribuidor autorizado
  if (process.env.SERVER_ADDRESS) {
    console.log("\n🔑 Adicionando o endereço do servidor como distribuidor autorizado...");
    const serverAddress = process.env.SERVER_ADDRESS;
    const authorizeTx = await tokenDistributor.addDistributor(serverAddress);
    await authorizeTx.wait();
    console.log(`✅ Endereço ${serverAddress} autorizado como distribuidor!`);
  }

  // Resumo do deploy
  console.log("\n📋 RESUMO DO DEPLOY");
  console.log("===================");
  console.log(`Gate33Token: ${gate33Token.address}`);
  console.log(`G33TokenDistributor: ${tokenDistributor.address}`);
  console.log(`Total Supply: ${formattedBalance} G33`);
  console.log("\n✨ Deploy concluído com sucesso!");
  console.log("\n⚠️ IMPORTANTE: Configure os endereços no Firebase (settings/contractConfig)");
}

// Executar o script
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Erro durante o deploy:", error);
    process.exit(1);
  });