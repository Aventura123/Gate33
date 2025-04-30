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

/**
 * Connect to the user's wallet (MetaMask or other browser provider)
 */
export const connectWallet = async (): Promise<void> => {
  try {
    if (typeof window === 'undefined' || !window.ethereum) {
      throw new Error("Please install MetaMask or another Ethereum wallet");
    }

    // Request account access
    await window.ethereum.request({ method: "eth_requestAccounts" });
    
    // Add listeners for account and chain changes
    window.ethereum.on("accountsChanged", () => {
      window.location.reload();
    });
    
    window.ethereum.on("chainChanged", () => {
      window.location.reload();
    });
    
  } catch (error) {
    console.error("Failed to connect wallet:", error);
    throw error;
  }
};

/**
 * Get the current connected wallet address
 */
export const getCurrentAddress = async (): Promise<string | null> => {
  try {
    if (typeof window === 'undefined' || !window.ethereum) {
      return null;
    }
    
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const accounts = await provider.listAccounts();
    
    if (accounts.length === 0) {
      return null;
    }
    
    return accounts[0];
  } catch (error) {
    console.error("Error getting current address:", error);
    return null;
  }
};

/**
 * Get a Web3 provider
 */
export const getWeb3Provider = (): ethers.providers.Web3Provider | null => {
  try {
    if (typeof window === 'undefined' || !window.ethereum) {
      return null;
    }
    
    return new ethers.providers.Web3Provider(window.ethereum);
  } catch (error) {
    console.error("Error getting Web3 provider:", error);
    return null;
  }
};

/**
 * Check if wallet is connected
 */
export const isWalletConnected = async (): Promise<boolean> => {
  const address = await getCurrentAddress();
  return !!address;
};

/**
 * Disconnect wallet (for UI purposes - most wallets don't support programmatic disconnection)
 */
export const disconnectWallet = (): void => {
  // This is mostly for UI purposes as most wallets don't support programmatic disconnection
  console.log("Wallet disconnected from application (UI only)");
  // You might want to clear local state related to the wallet here
};