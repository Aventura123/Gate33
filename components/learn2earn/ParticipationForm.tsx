import React, { useState } from 'react';
import { connectWallet, getCurrentAddress } from '../../services/crypto';

interface ParticipationFormProps {
  learn2earnId: string;
  tokenSymbol: string;
}

const ParticipationForm: React.FC<ParticipationFormProps> = ({ learn2earnId, tokenSymbol }) => {
  const [walletAddress, setWalletAddress] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  
  const handleConnectWallet = async () => {
    setIsConnecting(true);
    setError(null);
    
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
    
    setSubmitting(true);
    setError(null);
    
    try {
      // TODO: Implement actual submission to your backend/contract
      // This is a placeholder for the actual implementation
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      setSuccess(true);
    } catch (err: any) {
      console.error('Error submitting participation:', err);
      setError(err.message || 'Failed to submit participation');
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
          <button
            onClick={() => window.location.reload()}
            className="bg-green-600 hover:bg-green-700 text-white py-2 px-6 rounded-lg"
          >
            Complete
          </button>
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
            <div className="mt-4 p-3 bg-red-500/20 border border-red-500 text-red-500 rounded-lg">
              {error}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default ParticipationForm;
