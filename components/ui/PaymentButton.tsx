"use client";

import React, { useState } from "react";
import { web3Service } from "../../services/web3Service";

interface PaymentButtonProps {
  amount: string;
  currency?: string;
  recipientAddress: string;
  purpose?: string;
  label?: string;
  className?: string;
  onSuccess?: (txHash: string) => void;
  onError?: (error: string) => void;
  onProcessing?: () => void;
}

const PaymentButton: React.FC<PaymentButtonProps> = ({
  amount,
  currency = "ETH",
  recipientAddress,
  purpose,
  label = "Pagar",
  className = "",
  onSuccess,
  onError,
  onProcessing,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [walletConnected, setWalletConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);

  const connectWallet = async () => {
    setIsConnecting(true);
    setError(null);

    try {
      await web3Service.connectWallet();
      setWalletConnected(true);
    } catch (err: any) {
      setError(err.message || "Falha ao conectar carteira");
      if (onError) {
        onError(err.message || "Falha ao conectar carteira");
      }
    } finally {
      setIsConnecting(false);
    }
  };

  const handlePayment = async () => {
    // Se a carteira não estiver conectada, conecta primeiro
    if (!web3Service.isWalletConnected()) {
      await connectWallet();
      return;
    }

    setIsLoading(true);
    setError(null);

    if (onProcessing) {
      onProcessing();
    }

    try {
      const transaction = await web3Service.sendTransaction(
        recipientAddress,
        amount,
        purpose
      );

      setTxHash(transaction.hash);
      
      if (onSuccess) {
        onSuccess(transaction.hash);
      }
    } catch (err: any) {
      const errorMessage = err.message || "Erro ao processar pagamento";
      setError(errorMessage);
      
      if (onError) {
        onError(errorMessage);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const buttonLabel = isConnecting 
    ? "Connecting..." 
    : isLoading 
      ? "Processing..." : txHash 
        ? "Payment Complete" 
        : `${label} ${amount} ${currency}`;

  const buttonClass = `
    px-4 py-2 rounded-md font-medium text-center transition-all
    ${
      txHash
        ? "bg-green-500 hover:bg-green-600 text-white"
        : isLoading || isConnecting
          ? "bg-gray-400 text-gray-800 cursor-not-allowed"
          : "bg-orange-500 hover:bg-orange-600 text-white"
    }
    ${className}
  `;

  const isDisabled = isLoading || isConnecting || !!txHash;

  return (
    <div className="payment-button-container">
      {error && (
        <div className="text-red-500 text-sm mb-2">
          Erro: {error}
        </div>
      )}
      
      <button
        type="button"
        className={buttonClass}
        onClick={handlePayment}
        disabled={isDisabled}
      >
        {buttonLabel}
      </button>
      
      {txHash && (
        <div className="mt-2 text-sm text-gray-600">
          <p className="text-green-600">Transação enviada com sucesso!</p>
          <p className="text-xs truncate">
            Hash: <span className="font-mono">{txHash}</span>
          </p>
        </div>
      )}
    </div>
  );
};

export default PaymentButton;