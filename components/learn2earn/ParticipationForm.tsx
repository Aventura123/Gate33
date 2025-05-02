import React, { useState } from 'react';
import { connectWallet, getCurrentAddress } from '../../services/crypto';
import learn2earnContractService from '../../services/learn2earnContractService';

interface ParticipationFormProps {
  learn2earnId: string;
  tokenSymbol: string;
  network?: string;
}

const ParticipationForm: React.FC<ParticipationFormProps> = ({ learn2earnId, tokenSymbol, network }) => {
  const [walletAddress, setWalletAddress] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [transactionHash, setTransactionHash] = useState<string | null>(null);
  const [alreadyClaimed, setAlreadyClaimed] = useState(false);
  const [networkMismatch, setNetworkMismatch] = useState(false);
  const [invalidId, setInvalidId] = useState(false);
  const [invalidSignature, setInvalidSignature] = useState(false);
  
  const handleConnectWallet = async () => {
    setIsConnecting(true);
    setError(null);
    setNetworkMismatch(false);
    setInvalidId(false);
    setInvalidSignature(false);
    
    try {
      await connectWallet();
      const address = await getCurrentAddress();
      
      if (address) {
        setWalletAddress(address);
      } else {
        throw new Error('Unable to get wallet address');
      }
    } catch (err: any) {
      console.error('Error connecting wallet:', err);
      setError(err.message || 'Failed to connect wallet');
    } finally {
      setIsConnecting(false);
    }
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!walletAddress) {
      setError('Please connect your wallet first');
      return;
    }

    if (!network) {
      setError('Network information not available. Please try again later.');
      return;
    }
    
    setSubmitting(true);
    setError(null);
    setAlreadyClaimed(false);
    setNetworkMismatch(false);
    setInvalidId(false);
    setInvalidSignature(false);
    
    try {
      // Integração real com o contrato Learn2Earn
      const result = await learn2earnContractService.claimLearn2Earn(network, learn2earnId);
      
      if (result.success) {
        setSuccess(true);
        setTransactionHash(result.transactionHash);
      } else if (result.alreadyClaimed) {
        // Se o usuário já reivindicou tokens para esta oportunidade
        setAlreadyClaimed(true);
      } else if (result.invalidId) {
        // Se o ID do Learn2Earn não está no formato correto
        setInvalidId(true);
      } else if (result.invalidSignature) {
        // Se a assinatura é inválida
        setInvalidSignature(true);
      } else if (result.notEligible) {
        // Se o usuário não é elegível para reivindicar tokens
        setError("You are not eligible to claim tokens for this Learn2Earn opportunity. Make sure you've completed all tasks.");
      } else if (result.notSupported) {
        // Se a rede não é suportada
        setNetworkMismatch(true);
        setError(`This network (${network}) is not currently supported for Learn2Earn.`);
      } else if (result.message && result.message.includes("transaction failed")) {
        // Caso específico de CALL_EXCEPTION
        setError("Transaction was rejected by the contract. This could be due to:"+
                "\n• You haven't completed all the required tasks"+
                "\n• You've already claimed your tokens"+
                "\n• The Learn2Earn opportunity has ended or not started yet"+
                "\n• You're connected to the wrong network");
        
        // Se temos um hash de transação, vamos mostrá-lo para referência
        if (result.transactionHash) {
          setTransactionHash(result.transactionHash);
        }
      } else {
        // Outro erro
        throw new Error(result.message || 'Failed to claim tokens');
      }
    } catch (err: any) {
      console.error('Error submitting participation:', err);
      
      // Verificar se é erro de rede (wrong network)
      const errorMsg = err.message || 'Failed to submit participation';
      if (errorMsg.toLowerCase().includes("network") || 
          errorMsg.toLowerCase().includes("chain") || 
          errorMsg.toLowerCase().includes("wrong")) {
        setNetworkMismatch(true);
        setError(`Please make sure you're connected to the ${network} network.`);
      } else {
        setError(errorMsg);
      }
    } finally {
      setSubmitting(false);
    }
  };
  
  return (
    <div>
      {success ? (
        <div className="bg-green-500/20 border border-green-500 rounded-lg p-6 text-center">
          <div className="text-green-500 text-5xl mb-4">✓</div>
          <h3 className="text-xl font-semibold text-white mb-2">Participation Successful!</h3>
          <p className="text-gray-300 mb-4">
            Your participation has been submitted. You will receive your {tokenSymbol} tokens soon.
          </p>
          {transactionHash && (
            <div className="mb-4">
              <p className="text-sm text-gray-400 mb-2">Transaction Hash:</p>
              <p className="font-mono text-xs break-all bg-black/30 p-2 rounded">{transactionHash}</p>
            </div>
          )}
          <button
            onClick={() => window.location.reload()}
            className="bg-green-600 hover:bg-green-700 text-white py-2 px-6 rounded-lg"
          >
            Complete
          </button>
        </div>
      ) : alreadyClaimed ? (
        <div className="bg-blue-500/20 border border-blue-500 rounded-lg p-6 text-center">
          <div className="text-blue-500 text-5xl mb-4">ℹ</div>
          <h3 className="text-xl font-semibold text-white mb-2">Already Claimed</h3>
          <p className="text-gray-300 mb-4">
            You have already claimed tokens for this Learn2Earn opportunity.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-6 rounded-lg"
          >
            Close
          </button>
        </div>
      ) : invalidId ? (
        <div className="bg-yellow-500/20 border border-yellow-500 rounded-lg p-6 text-center">
          <div className="text-yellow-500 text-5xl mb-4">⚠️</div>
          <h3 className="text-xl font-semibold text-white mb-2">Configuration Issue</h3>
          <p className="text-gray-300 mb-4">
            This Learn2Earn opportunity has an invalid or missing contract ID. Please contact support for assistance.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="bg-yellow-600 hover:bg-yellow-700 text-white py-2 px-6 rounded-lg"
          >
            Close
          </button>
        </div>
      ) : invalidSignature ? (
        <div className="bg-purple-500/20 border border-purple-500 rounded-lg p-6 text-center">
          <div className="text-purple-500 text-5xl mb-4">🔐</div>
          <h3 className="text-xl font-semibold text-white mb-2">Authentication Required</h3>
          <p className="text-gray-300 mb-4">
            Token claiming requires authentication from the backend to verify you've completed all tasks.
            <br/><br/>
            <span className="text-purple-300">This is a development environment. In production, you'll need a signature service to verify completed tasks.</span>
          </p>
          <button
            onClick={() => window.location.reload()}
            className="bg-purple-600 hover:bg-purple-700 text-white py-2 px-6 rounded-lg"
          >
            Close
          </button>
        </div>
      ) : networkMismatch ? (
        <div className="bg-orange-500/20 border border-orange-500 rounded-lg p-6">
          <h3 className="text-xl font-semibold text-orange-400 mb-2">Network Mismatch</h3>
          <p className="text-gray-300 mb-4">
            Please make sure you're connected to the <strong className="text-orange-400">{network}</strong> network in your wallet.
          </p>
          <div className="flex space-x-3">
            <button
              onClick={handleConnectWallet}
              className="bg-orange-500 hover:bg-orange-600 text-white py-2 px-4 rounded-lg"
            >
              Switch Network
            </button>
            <button
              onClick={() => setNetworkMismatch(false)}
              className="bg-gray-700 hover:bg-gray-600 text-white py-2 px-4 rounded-lg"
            >
              Dismiss
            </button>
          </div>
        </div>
      ) : (
        <>
          <p className="text-gray-300 mb-6">
            Complete all tasks above and submit this form to earn {tokenSymbol} tokens. Your wallet will be verified before tokens are distributed.
          </p>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            {!walletAddress ? (
              <button
                type="button"
                onClick={handleConnectWallet}
                disabled={isConnecting}
                className="w-full bg-orange-500 hover:bg-orange-600 text-white font-medium py-3 px-4 rounded-lg flex justify-center items-center"
              >
                {isConnecting ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Connecting Wallet...
                  </>
                ) : "Connect Wallet to Participate"}
              </button>
            ) : (
              <>
                <div className="p-4 bg-gray-800 rounded-lg">
                  <h4 className="text-gray-400 text-sm mb-1">Connected Wallet</h4>
                  <p className="text-orange-400 font-mono text-sm break-all">{walletAddress}</p>
                  <p className="text-gray-500 text-xs mt-1">Make sure you're connected to the {network} network.</p>
                </div>
                
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="terms-checkbox"
                    className="mr-2"
                    required
                  />
                  <label htmlFor="terms-checkbox" className="text-gray-300 text-sm">
                    I confirm that I have completed all tasks and understand that rewards are subject to verification.
                  </label>
                </div>
                
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-3 px-4 rounded-lg flex justify-center items-center"
                >
                  {submitting ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Submitting...
                    </>
                  ) : `Submit & Claim ${tokenSymbol} Tokens`}
                </button>
              </>
            )}
          </form>
          
          {error && (
            <div className="mt-4 p-3 bg-red-500/20 border border-red-500 rounded-lg">
              <p className="text-red-500 mb-2 font-medium">Error:</p>
              <p className="text-red-400 whitespace-pre-line">{error}</p>
              
              {transactionHash && (
                <div className="mt-3 pt-3 border-t border-red-500/30">
                  <p className="text-xs text-red-400 mb-1">Transaction hash for debugging:</p>
                  <p className="font-mono text-xs break-all">{transactionHash}</p>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default ParticipationForm;
