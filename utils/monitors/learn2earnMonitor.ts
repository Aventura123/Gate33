import { ethers } from 'ethers';
import { logSystem } from '../logSystem';
import { db } from '../../lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { monitorSolanaLearn2Earn } from './solanaMonitor';

const NETWORK_RPC: Record<string, string> = {
  bsctestnet: 'https://data-seed-prebsc-1-s1.binance.org:8545/',
  bsc: 'https://bsc-dataseed.binance.org/',
  polygon: 'https://polygon-rpc.com',
  eth: 'https://mainnet.infura.io/v3/SEU_INFURA_KEY',
  avax: 'https://api.avax.network/ext/bc/C/rpc',
  // Novas redes:
  solana: 'https://api.mainnet-beta.solana.com', // Para referência, não EVM
  sui: 'https://fullnode.mainnet.sui.io:443',    // Para referência, não EVM
  aptos: 'https://fullnode.mainnet.aptoslabs.com/v1', // Para referência, não EVM
  singularityfinance: 'https://rpc.singularity.gold', // Exemplo, ajuste se necessário
};

// Função para monitorar múltiplos contratos Learn2Earn em diferentes blockchains
export async function monitorLearn2EarnContracts(
  contracts: { contractAddress: string, provider: ethers.providers.Provider, network?: string }[]
) {
  for (const { contractAddress, provider, network } of contracts) {
    monitorLearn2EarnActivity(contractAddress, provider, network);
  }
}

// Função individual (copiada do contractMonitor.ts, pode ser melhorada depois)
export async function monitorLearn2EarnActivity(
  contractAddress: string,
  provider: ethers.providers.Provider,
  network?: string
): Promise<void> {
  try {
    const abi = [
      "event Learn2EarnClaimed(uint256 indexed learn2earnId, address indexed user, uint256 amount)",
      "event Learn2EarnEnded(uint256 indexed learn2earnId)",
    ];
    const contract = new ethers.Contract(contractAddress, abi, provider);
    contract.on('Learn2EarnClaimed', async (learn2earnId, user, amount, event) => {
      const amountFormatted = ethers.utils.formatEther(amount);
      await logSystem.contractActivity("Learn2EarnContract", "claim", {
        learn2earnId: learn2earnId.toString(),
        user,
        amount: amountFormatted,
        transactionHash: event.transactionHash,
        network
      });
      // ...alerta grande reivindicação...
    });
    contract.on('Learn2EarnEnded', async (learn2earnId, event) => {
      await logSystem.contractActivity("Learn2EarnContract", "ended", {
        learn2earnId: learn2earnId.toString(),
        transactionHash: event.transactionHash,
        network
      });
    });
    await logSystem.info(`Monitoramento de Learn2Earn iniciado para o contrato ${contractAddress} na rede ${network || ''}`);
  } catch (error: any) {
    await logSystem.error(`Erro ao configurar monitoramento de Learn2Earn: ${error.message}`);
  }
}

export async function monitorAllLearn2EarnFromFirestore() {
  const docRef = doc(db, 'settings', 'learn2earn');
  const docSnap = await getDoc(docRef);
  if (!docSnap.exists()) return;
  const contracts = docSnap.data().contracts || [];
  const monitors = [];
  for (const c of contracts) {
    if (c.network === 'solana') {
      monitorSolanaLearn2Earn(c.contractAddress, NETWORK_RPC.solana);
      continue;
    }
    const rpc = NETWORK_RPC[c.network];
    if (!rpc) continue;
    const provider = new ethers.providers.JsonRpcProvider(rpc);
    monitors.push({
      contractAddress: c.contractAddress,
      provider,
      network: c.network,
    });
  }
  if (monitors.length > 0) {
    monitorLearn2EarnContracts(monitors);
  }
}