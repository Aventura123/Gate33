// Script para testar detecção de rede
const { ethers } = require('ethers');

// Simular diferentes redes e ver como o ethers detecta
const testNetworks = [
  { chainId: 1, name: 'homestead' },
  { chainId: 56, name: 'bnb' },
  { chainId: 137, name: 'matic' },
  { chainId: 8453, name: 'unknown' }, // Base - pode ser detectado como 'unknown'
  { chainId: 10, name: 'optimism' },
  { chainId: 43114, name: 'unknown' }, // Avalanche - pode ser detectado como 'unknown'
];

console.log('Mapeamento de chainId para nome de rede:');
testNetworks.forEach(network => {
  console.log(`ChainId ${network.chainId}: ${network.name}`);
});

console.log('\nMapeamento recomendado para o código:');
console.log('const chainIdToNetwork = {');
testNetworks.forEach(network => {
  let networkName = network.name;
  
  // Corrigir nomes conhecidos
  if (network.chainId === 1) networkName = 'ethereum';
  if (network.chainId === 56) networkName = 'binance';
  if (network.chainId === 137) networkName = 'polygon';
  if (network.chainId === 8453) networkName = 'base';
  if (network.chainId === 10) networkName = 'optimism';
  if (network.chainId === 43114) networkName = 'avalanche';
  
  console.log(`  ${network.chainId}: '${networkName}',`);
});
console.log('};');
