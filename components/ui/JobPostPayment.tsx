"use client";

import React, { useState, useEffect } from "react";
import { web3Service } from "../../services/web3Service";
import smartContractService from "../../services/smartContractService";
import { NetworkType } from "../../services/web3Service";
import WalletButton from "../../components/WalletButton";

import { jobService } from "../../services/jobService";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../../lib/firebase";

interface JobPlan {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  features: string[];
  duration: number;
  isPremium: boolean;
  isTopListed: boolean;
}

interface JobPostPaymentProps {
  jobId: string;
  onPaymentSuccess: (planId: string, transactionHash: string) => void;
  onPaymentError: (error: string) => void;
}

const JobPostPayment: React.FC<JobPostPaymentProps> = ({
  jobId,
  onPaymentSuccess,
  onPaymentError,
}) => {
  const [walletConnected, setWalletConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState("");
  const [plans, setPlans] = useState<JobPlan[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<"smartContract" | "usdtSmartContract">("smartContract");
  const [transactionHash, setTransactionHash] = useState<string | null>(null);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [updatingJob, setUpdatingJob] = useState(false);
  const [jobUpdateStatus, setJobUpdateStatus] = useState<"idle" | "updating" | "success" | "error">("idle");

  // Load plans from Firestore
  useEffect(() => {
    const fetchPlans = async () => {
      try {
        setIsLoading(true);
        const plansCollection = collection(db, "jobPlans");
        const plansSnapshot = await getDocs(plansCollection);
        const plansList = plansSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as JobPlan[];

        // Sort plans by price (from cheapest to most expensive)
        plansList.sort((a, b) => a.price - b.price);
        setPlans(plansList);

        // If there are plans, select the first one as default
        if (plansList.length > 0) {
          setSelectedPlanId(plansList[0].id);
        }
      } catch (err) {
        console.error("Error loading plans:", err);
        setError("Unable to load available plans.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchPlans();
  }, []);

  // Utilitário para mapear rede para moeda
  const getNetworkCurrency = (networkName: string | undefined) => {
    if (!networkName) return undefined;
    const map: Record<string, string> = {
      ethereum: "ETH",
      polygon: "MATIC",
      binance: "BNB",
      binancetestnet: "tBNB"
    };
    return map[networkName.toLowerCase()];
  };

  // Process payment via smart contract
  const processContractPayment = async () => {
    if (!walletConnected) {
      setError("Please connect your wallet before proceeding.");
      return;
    }

    if (!selectedPlanId || !jobId) {
      setError("Select a plan before continuing.");
      return;
    }

    setProcessingPayment(true);
    setError(null);

    try {
      // Initialize the contract if needed
      await smartContractService.init();
      
      // Use the correct method from smartContractService
      const result = await smartContractService.processJobPayment(
        selectedPlanId,
        parseFloat(getSelectedPlan()?.price.toString() || "0"),
        jobId
      );
      
      setTransactionHash(result.transactionHash);
      
      // Update job status
      await updateJobStatus(selectedPlanId, result.transactionHash);
      
      if (onPaymentSuccess) {
        onPaymentSuccess(selectedPlanId, result.transactionHash);
      }
    } catch (err: any) {
      console.error("Error processing payment via contract:", err);
      setError(err.message || "Error processing payment via contract");
      if (onPaymentError) {
        onPaymentError(err.message || "Error processing payment via contract");
      }
    } finally {
      setProcessingPayment(false);
    }
  };

  // Process payment via USDT smart contract
  const processUSDTContractPayment = async () => {
    if (!selectedPlanId || !jobId) {
      setError("Select a plan before continuing.");
      return;
    }

    setProcessingPayment(true);
    setError(null);

    try {
      // Initialize the contract if needed
      await smartContractService.init();
      
      // Use the USDT payment method from smartContractService
      const result = await smartContractService.processJobPaymentWithUSDT(
        selectedPlanId,
        parseFloat(getSelectedPlan()?.price.toString() || "0"),
        jobId
      );
      
      setTransactionHash(result.transactionHash);
      
      // Update job status
      await updateJobStatus(selectedPlanId, result.transactionHash);
      
      if (onPaymentSuccess) {
        onPaymentSuccess(selectedPlanId, result.transactionHash);
      }
    } catch (err: any) {
      console.error("Error processing payment via USDT contract:", err);
      setError(err.message || "Error processing payment via USDT contract");
      if (onPaymentError) {
        onPaymentError(err.message || "Error processing payment via USDT contract");
      }
    } finally {
      setProcessingPayment(false);
    }
  };

  // New function to update job status after payment
  const updateJobStatus = async (planId: string, transactionHash: string) => {
    setUpdatingJob(true);
    setJobUpdateStatus("updating");
    
    try {
      await jobService.updateJobAfterPayment(jobId, planId, transactionHash);
      setJobUpdateStatus("success");
    } catch (err: any) {
      console.error("Error updating job status:", err);
      setJobUpdateStatus("error");
      // We don't throw the error here to avoid interrupting the user flow
      // since the payment was processed successfully
    } finally {
      setUpdatingJob(false);
    }
  };

  // Process payment based on the selected method
  const handlePayment = async () => {
    if (!walletConnected) {
      return;
    }

    if (paymentMethod === "smartContract") {
      await processContractPayment();
    } else if (paymentMethod === "usdtSmartContract") {
      // Mostrar alerta informativo sobre o valor que aparecerá na MetaMask
      const selectedPlan = getSelectedPlan();
      if (selectedPlan) {
        const isConfirmed = window.confirm(
          `AVISO IMPORTANTE: Devido a questões técnicas do contrato, o valor que aparecerá na sua carteira poderá mostrar apenas 70% do valor total (${(selectedPlan.price * 0.7).toFixed(2)} USDT). Isto é normal e o valor total correto do plano é ${selectedPlan.price} USDT.\n\nDeseja continuar com o pagamento?`
        );
        if (!isConfirmed) {
          return;
        }
      }
      await processUSDTContractPayment();
    }
  };

  const getSelectedPlan = () => {
    return plans.find((plan) => plan.id === selectedPlanId);
  };

  const formatCurrency = (value: number, currency: string) => {
    return `${value} ${currency}`;
  };

  return (
    <div className="w-full max-w-3xl mx-auto">
      <h2 className="text-2xl font-bold mb-6 text-center">Choose Your Job Posting Plan</h2>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4 relative">
          <span className="block sm:inline">{error}</span>
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center items-center py-10">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
        </div>
      ) : (
        <>
          {/* Plan cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {plans.map((plan) => (
              <div
                key={plan.id}
                className={`border rounded-lg p-4 cursor-pointer ${
                  selectedPlanId === plan.id ? "border-orange-500" : "border-gray-300"
                }`}
                onClick={() => setSelectedPlanId(plan.id)}
              >
                <h3 className="text-lg font-bold mb-2">{plan.name}</h3>
                <p className="text-sm text-gray-600 mb-4">{plan.description}</p>
                <p className="text-lg font-semibold">
                  {formatCurrency(plan.price, plan.currency)}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-6">
            <button
              onClick={handlePayment}
              className="bg-orange-500 text-white px-6 py-2 rounded-lg hover:bg-orange-400 transition-colors"
              disabled={!walletConnected || !selectedPlanId || processingPayment}
            >
              {processingPayment ? "Processing..." : "Complete Payment & Post Job"}
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default JobPostPayment;