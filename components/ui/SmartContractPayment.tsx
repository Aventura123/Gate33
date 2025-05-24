"use client";

import React, { useState, useEffect } from "react";
import { web3Service } from "../../services/web3Service";
import smartContractService from "../../services/smartContractService";
import { NetworkType } from "../../services/web3Service";

interface SmartContractPaymentProps {
  amount: string;
  recipientAddress: string;
  purpose?: string;
  network?: NetworkType;
  includeFee?: boolean;
  label?: string;
  className?: string;
  onSuccess?: (txHash: string) => void;
  onError?: (error: string) => void;
  children?: React.ReactNode;
}

const SmartContractPayment: React.FC<SmartContractPaymentProps> = ({
  amount,
  recipientAddress,
  purpose,
  network = "ethereum",
  includeFee = true,
  label = "Pagar via Contrato",
  className = "",
  onSuccess,
  onError,
  children,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isSwitchingNetwork, setIsSwitchingNetwork] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [walletConnected, setWalletConnected] = useState(false);
  const [walletInfo, setWalletInfo] = useState<any>(null);
  const [contractReady, setContractReady] = useState(false);

  // Verificar se a carteira já está conectada ao carregar o componente
  useEffect(() => {
    const checkConnection = async () => {
      if (web3Service.isWalletConnected()) {
        setWalletConnected(true);
        setWalletInfo(web3Service.getWalletInfo());
      }
    };

    checkConnection();
  }, []);

  // Trocar para a rede correta
  const switchNetwork = async () => {
    if (isSwitchingNetwork) return;

    setIsSwitchingNetwork(true);
    setError(null);

    try {
      await web3Service.switchNetwork(network);
      setWalletInfo(web3Service.getWalletInfo());
      await initializeContract();
    } catch (err: any) {
      setError(err.message || "Falha ao trocar de rede");
      if (onError) {
        onError(err.message || "Falha ao trocar de rede");
      }
    } finally {
      setIsSwitchingNetwork(false);
    }
  };

  // Inicializar o contrato
  const initializeContract = async () => {
    try {
      await smartContractService.init();
      setContractReady(true);
    } catch (err: any) {
      setError(err.message || "Falha ao inicializar contrato");
      if (onError) {
        onError(err.message || "Falha ao inicializar contrato");
      }
    }
  };

  // Processar pagamento
  const handlePayment = async () => {
    if (!walletConnected) {
      setError("Por favor, conecte sua carteira antes de prosseguir.");
      return;
    }

    if (!contractReady) {
      await initializeContract();
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await smartContractService.processJobPayment(
        purpose || "payment",
        parseFloat(amount),
        recipientAddress
      );

      setTxHash(result.transactionHash);

      if (onSuccess) {
        onSuccess(result.transactionHash);
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
  const buttonLabel = () => {
    if (isSwitchingNetwork) return "Switching Network...";
    if (isLoading) return "Processing...";
    if (txHash) return "Payment Complete";
    return `${label} ${amount} ETH`;
  };

  const buttonClass = `
    px-4 py-2 rounded-md font-medium text-center transition-all
    ${
      txHash
        ? "bg-green-500 hover:bg-green-600 text-white"
        : isLoading || isSwitchingNetwork
          ? "bg-gray-400 text-gray-800 cursor-not-allowed"
          : "bg-blue-600 hover:bg-blue-700 text-white"
    }
    ${className}
  `;

  const isDisabled = isLoading || isSwitchingNetwork || !!txHash;

  return (
    <div className="smart-contract-payment-container">
      {error && (
        <div className="text-red-500 text-sm mb-2">
          Erro: {error}
        </div>
      )}

      {walletConnected && walletInfo && (
        <div className="mb-2 text-sm text-gray-600">
          <div className="flex items-center gap-2">
            <span className="bg-green-100 text-green-800 text-xs font-medium px-2 py-0.5 rounded dark:bg-green-900 dark:text-green-300">
              Conectado
            </span>
            <span className="text-gray-500">
              {walletInfo.address.substring(0, 6)}...
              {walletInfo.address.substring(walletInfo.address.length - 4)}
            </span>
          </div>
          {walletInfo.networkName && (
            <div className="mt-1">
              <span className="text-xs text-gray-500">
                Rede: {walletInfo.networkName}
              </span>
              {walletInfo.networkName.toLowerCase() !== network && (
                <span className="text-xs text-red-500 ml-2">
                  (Rede incorreta)
                </span>
              )}
            </div>
          )}
        </div>
      )}

      <button
        type="button"
        className={buttonClass}
        onClick={handlePayment}
        disabled={isDisabled}
      >
        {buttonLabel()}
      </button>

      {txHash && (
        <div className="mt-2 text-sm">
          <p className="text-green-600">Transação enviada com sucesso!</p>
          <p className="text-xs text-gray-500 truncate">
            Hash: <span className="font-mono">{txHash}</span>
          </p>
        </div>
      )}

      {children}
    </div>
  );
};

export default SmartContractPayment;