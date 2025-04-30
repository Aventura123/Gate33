"use client";

import React, { useState, useEffect } from "react";
import { web3Service } from "../../services/web3Service";
import smartContractService from "../../services/smartContractService";
import { NetworkType } from "../../services/web3Service";

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
  const [paymentMethod, setPaymentMethod] = useState<"direct" | "smartContract">("direct");
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

  // Connect wallet
  const connectWallet = async () => {
    try {
      setIsLoading(true);
      const walletInfo = await web3Service.connectWallet();
      setWalletConnected(true);
      setWalletAddress(walletInfo.address);
      setIsLoading(false);
    } catch (err: any) {
      console.error("Error connecting wallet:", err);
      setError(err.message || "Error connecting wallet");
      setIsLoading(false);
    }
  };

  // Disconnect wallet
  const disconnectWallet = () => {
    web3Service.disconnectWallet();
    setWalletConnected(false);
    setWalletAddress("");
  };

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

  // Process direct payment
  const processDirectPayment = async () => {
    if (!selectedPlanId || !jobId) {
      setError("Select a plan before continuing.");
      return;
    }
    // Validação de moeda
    const plan = getSelectedPlan();
    const walletInfo = web3Service.getWalletInfo ? web3Service.getWalletInfo() : null;
    const networkCurrency = getNetworkCurrency(walletInfo?.networkName);
    if (plan && networkCurrency && plan.currency.toUpperCase() !== networkCurrency.toUpperCase()) {
      setError(`Para este plano, conecte sua carteira à rede correta para pagar em ${plan.currency}. Rede atual: ${walletInfo?.networkName || 'desconhecida'}`);
      return;
    }
    setProcessingPayment(true);
    setError(null);

    try {
      const transaction = await web3Service.processJobPostPayment(selectedPlanId, jobId);
      setTransactionHash(transaction.hash);
      
      // Update job status
      await updateJobStatus(selectedPlanId, transaction.hash);
      
      if (onPaymentSuccess) {
        onPaymentSuccess(selectedPlanId, transaction.hash);
      }
    } catch (err: any) {
      console.error("Error processing payment:", err);
      setError(err.message || "Error processing payment");
      if (onPaymentError) {
        onPaymentError(err.message || "Error processing payment");
      }
    } finally {
      setProcessingPayment(false);
    }
  };

  // Process payment via smart contract
  const processContractPayment = async () => {
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
      await connectWallet();
      return;
    }

    if (paymentMethod === "direct") {
      await processDirectPayment();
    } else {
      await processContractPayment();
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {plans.map((plan) => (
              <div
                key={plan.id}
                className={`border rounded-lg p-4 cursor-pointer transition-all ${
                  selectedPlanId === plan.id
                    ? "border-orange-500 bg-orange-50 dark:bg-orange-900/20"
                    : "border-gray-200 hover:border-orange-300 dark:border-gray-700"
                }`}
                onClick={() => setSelectedPlanId(plan.id)}
              >
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-lg font-semibold">{plan.name}</h3>
                  {plan.isPremium && (
                    <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded dark:bg-yellow-800 dark:text-yellow-100">
                      Premium
                    </span>
                  )}
                </div>
                
                <p className="text-2xl font-bold mb-2">
                  {formatCurrency(plan.price, plan.currency)}
                </p>
                
                <p className="text-gray-600 dark:text-gray-300 mb-3 text-sm">
                  {plan.description}
                </p>
                
                <div className="mb-3 text-sm">
                  <span className="block">Duration: {plan.duration} days</span>
                  {plan.isTopListed && (
                    <span className="text-green-600 dark:text-green-400">
                      ★ Featured at the top
                    </span>
                  )}
                </div>
                
                {plan.features.length > 0 && (
                  <ul className="text-sm text-gray-600 dark:text-gray-300 mb-4">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-start mb-1">
                        <svg
                          className="h-4 w-4 text-green-500 mr-2 mt-0.5"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                        {feature}
                      </li>
                    ))}
                  </ul>
                )}

                <div className="mt-auto pt-2">
                  <button
                    type="button"
                    className={`w-full py-2 px-4 rounded-md text-center ${
                      selectedPlanId === plan.id
                        ? "bg-orange-500 text-white"
                        : "bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-white"
                    }`}
                    onClick={() => setSelectedPlanId(plan.id)}
                  >
                    {selectedPlanId === plan.id ? "Selected" : "Select"}
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Payment Method Options */}
          {selectedPlanId && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-2">Payment Method</h3>
              <div className="flex flex-col md:flex-row gap-3">
                <button
                  type="button"
                  className={`flex-1 py-3 px-4 rounded-md text-center ${
                    paymentMethod === "direct"
                      ? "bg-orange-500 text-white"
                      : "bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-white"
                  }`}
                  onClick={() => setPaymentMethod("direct")}
                >
                  Direct Payment
                </button>
                <button
                  type="button"
                  className={`flex-1 py-3 px-4 rounded-md text-center ${
                    paymentMethod === "smartContract"
                      ? "bg-orange-500 text-white"
                      : "bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-white"
                  }`}
                  onClick={() => setPaymentMethod("smartContract")}
                >
                  Smart Contract (Secure Payment)
                </button>
              </div>
              <p className="text-sm text-gray-500 mt-2">
                {paymentMethod === "direct"
                  ? "Direct cryptocurrency payment to our wallet."
                  : "Payment processed and verified by our smart contract on the blockchain."}
              </p>
            </div>
          )}

          {/* Summary and Payment Button */}
          {selectedPlanId && (
            <div className="border rounded-lg p-4 bg-gray-50 dark:bg-gray-800 mb-6">
              <h3 className="text-lg font-semibold mb-2">Summary</h3>
              <div className="flex justify-between mb-1">
                <span>Plan:</span>
                <span className="font-medium">{getSelectedPlan()?.name}</span>
              </div>
              <div className="flex justify-between mb-1">
                <span>Duration:</span>
                <span>{getSelectedPlan()?.duration} days</span>
              </div>
              <div className="flex justify-between mb-1">
                <span>Method:</span>
                <span>
                  {paymentMethod === "direct" ? "Direct Payment" : "Smart Contract"}
                </span>
              </div>
              <div className="flex justify-between font-bold mt-2 pt-2 border-t">
                <span>Total:</span>
                <span>
                  {getSelectedPlan() &&
                    formatCurrency(getSelectedPlan()!.price, getSelectedPlan()!.currency)}
                </span>
              </div>
            </div>
          )}

          {/* Connection/Payment Button */}
          <div className="text-center">
            {!walletConnected && (
              <button
                type="button"
                className="bg-blue-600 hover:bg-blue-700 text-white py-3 px-6 rounded-md w-full md:w-auto"
                onClick={connectWallet}
                disabled={isLoading || processingPayment}
              >
                {isLoading ? "Connecting..." : "Connect Wallet"}
              </button>
            )}

            {walletConnected && (
              <>
                <div className="flex items-center justify-center mb-4 gap-2">
                  <span className="bg-green-100 text-green-800 text-xs font-medium px-2.5 py-0.5 rounded dark:bg-green-900 dark:text-green-300">
                    Connected
                  </span>
                  <span className="text-sm text-gray-500 dark:text-gray-400 truncate">
                    {walletAddress.substring(0, 6)}...
                    {walletAddress.substring(walletAddress.length - 4)}
                  </span>
                  <button
                    onClick={disconnectWallet}
                    className="text-sm text-red-500 hover:text-red-700"
                  >
                    Disconnect
                  </button>
                </div>

                <button
                  type="button"
                  className="bg-orange-500 hover:bg-orange-600 text-white py-3 px-6 rounded-md w-full md:w-auto"
                  onClick={handlePayment}
                  disabled={isLoading || processingPayment || !selectedPlanId}
                >
                  {processingPayment
                    ? "Processing..."
                    : `Pay ${
                        getSelectedPlan()
                          ? formatCurrency(
                              getSelectedPlan()!.price,
                              getSelectedPlan()!.currency
                            )
                          : ""
                      }`}
                </button>
              </>
            )}
          </div>

          {/* Transaction Information */}
          {transactionHash && (
            <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg dark:bg-green-900/20 dark:border-green-800">
              <h3 className="text-lg font-semibold text-green-800 dark:text-green-300 mb-2">
                Payment Processed!
              </h3>
              
              <p className="text-sm text-gray-600 dark:text-gray-300 mb-1">
                {jobUpdateStatus === "success" 
                  ? `Your job posting has been published successfully and will be visible for ${getSelectedPlan()?.duration} days.`
                  : jobUpdateStatus === "updating"
                    ? "Updating your job posting status..."
                    : jobUpdateStatus === "error"
                      ? "Your payment was processed, but there was an error updating the job posting status. Our team will be notified and will resolve the issue."
                      : "Processing your payment..."}
              </p>
              
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Transaction ID:{" "}
                <span className="font-mono">{transactionHash}</span>
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default JobPostPayment;