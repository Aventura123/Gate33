import { Connection, PublicKey } from '@solana/web3.js';
import { logSystem } from '../logSystem';

/**
 * Monitora um contrato (conta/programa) Solana para Learn2Earn
 * Por enquanto, monitora apenas o saldo da conta, mas pode ser expandido para eventos customizados.
 */
export async function monitorSolanaLearn2Earn(contractAddress: string, rpcUrl: string) {
  const connection = new Connection(rpcUrl, 'confirmed');
  const pubkey = new PublicKey(contractAddress);

  setInterval(async () => {
    try {
      const balance = await connection.getBalance(pubkey);
      await logSystem.info(`Saldo do contrato Solana ${contractAddress}: ${balance / 1e9} SOL`, {
        contractAddress,
        network: 'solana',
        balance: balance / 1e9
      });
      // Aqui você pode adicionar lógica para monitorar eventos customizados do seu programa
    } catch (err: any) {
      await logSystem.error(`Erro ao monitorar contrato Solana: ${err.message}`);
    }
  }, 60000); // a cada 1 minuto
}
