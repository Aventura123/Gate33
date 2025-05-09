import { ethers } from "ethers";

export interface Crypto {
  symbol: string;
  name: string;
}

export async function getSupportedCryptocurrencies(): Promise<Crypto[]> {
  return [
    { symbol: "BTC", name: "Bitcoin" },
    { symbol: "ETH", name: "Ethereum" },
    { symbol: "LTC", name: "Litecoin" },
  ];
}

export async function processPayment(
  crypto: Crypto,
  amount: number,
  address: string
): Promise<{ success: boolean; message: string }> {
  if (!crypto || amount <= 0 || !address) {
    return { success: false, message: "Invalid payment details" };
  }

  return { success: true, message: `Payment of ${amount} ${crypto.symbol} sent to ${address}` };
}

// Todas as funções de conexão de wallet abaixo foram descontinuadas em favor do web3Service e WalletButton
// Utilize apenas web3Service.connectWallet(), web3Service.connectWalletConnect(), web3Service.getWalletInfo(), etc.

// export const connectWallet = async (): Promise<void> => { ... }
// export const getCurrentAddress = async (): Promise<string | null> => { ... }
// export const getWeb3Provider = (): ethers.providers.Web3Provider | null => { ... }
// export const isWalletConnected = async (): Promise<boolean> => { ... }
// export const disconnectWallet = (): void => { ... }