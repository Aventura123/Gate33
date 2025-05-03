import React, { useState, useEffect } from 'react';
import { connectWallet, getCurrentAddress } from '../../services/crypto';
import learn2earnContractService from '../../services/learn2earnContractService';
import { collection, addDoc, query, where, getDocs, updateDoc, doc, increment, setDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';

interface ParticipationFormProps {
  learn2earnId: string;  // This is the Firestore document ID
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
  
  // New state for tracking participation registration
  const [isRegistered, setIsRegistered] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [participationChecked, setParticipationChecked] = useState(false);
  
  // Add new state for tracking if the opportunity has ended
  const [hasEnded, setHasEnded] = useState(false);
  const [hasTimeSyncIssue, setHasTimeSyncIssue] = useState(false);
  
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
        // Check if user has already registered participation
        checkParticipation(address);
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

  // Function to check if user has already registered participation
  const checkParticipation = async (address: string) => {
    try {
      const participantsRef = collection(db, "learn2earnParticipants");
      const q = query(
        participantsRef, 
        where("walletAddress", "==", address.toLowerCase()),
        where("learn2earnId", "==", learn2earnId)
      );
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        // User has already registered
        setIsRegistered(true);
        console.log("User has already registered participation");
      }
      
      setParticipationChecked(true);
    } catch (err) {
      console.error("Error checking participation:", err);
    }
  };
  
  // Function to register participation
  const handleRegisterParticipation = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!walletAddress) {
      setError('Please connect your wallet first');
      return;
    }
    
    setRegistering(true);
    setError(null);
    
    try {
      // Register the user's participation
      // Instead of directly writing to Firestore, use the API for better validation
      const response = await fetch('/api/learn2earn', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          learn2earnId,
          walletAddress,
          completedTasks: true,
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to register participation');
      }
      
      // If successful, set as registered
      setIsRegistered(true);
      
      // Sync the blockchain data with Firestore to ensure accurate participant count
      try {
        await learn2earnContractService.syncLearn2EarnStatus(learn2earnId);
      } catch (syncErr) {
        // Don't block the user from continuing if sync fails
        console.warn("Failed to sync Learn2Earn status after registration:", syncErr);
      }
    } catch (err: any) {
      console.error('Error registering participation:', err);
      setError(err.message || 'Failed to register participation');
    } finally {
      setRegistering(false);
    }
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!walletAddress) {
      setError('Please connect your wallet first');
      return;
    }

    if (!isRegistered) {
      setError('You need to register your participation first');
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
      // The learn2earnId prop is the Firestore document ID which we use as the firebaseId for the contract
      const result = await learn2earnContractService.claimLearn2Earn(network, learn2earnId);
      
      if (result.success) {
        setSuccess(true);
        setTransactionHash(result.transactionHash);
        
        // Update the participation document to mark as claimed
        try {
          const participantsRef = collection(db, "learn2earnParticipants");
          const q = query(
            participantsRef, 
            where("walletAddress", "==", walletAddress.toLowerCase()),
            where("learn2earnId", "==", learn2earnId)
          );
          const querySnapshot = await getDocs(q);
          
          if (!querySnapshot.empty) {
            // Update the first matching document (should only be one)
            const docRef = querySnapshot.docs[0].ref;
            await updateDoc(docRef, {
              claimed: true,
              claimedAt: new Date(),
              transactionHash: result.transactionHash
            });
          }
        } catch (updateErr) {
          console.error("Error updating participation status:", updateErr);
          // We don't need to show this error to the user as the claim was successful
        }
      } else if (result.alreadyClaimed) {
        // Se o usuário já reivindicou tokens para esta oportunidade
        setAlreadyClaimed(true);
      } else if (result.invalidId) {
        // Se o ID do Learn2Earn não está no formato correto
        setInvalidId(true);
      } else if (result.invalidSignature) {
        // Se a assinatura é inválida
        setInvalidSignature(true);
      } else if (result.specificError === "ended") {
        // The Learn2Earn opportunity has ended
        setHasEnded(true);
      } else if (result.specificError === "timeSync") {
        // There's a time synchronization issue between the blockchain and our database
        setHasTimeSyncIssue(true);
      } else if (result.notEligible) {
        // Se o usuário não é elegível para reivindicar tokens
        setError("You are not eligible to claim tokens for this Learn2Earn opportunity. Make sure you've completed all tasks.");
      } else if (result.notSupported) {
        // Se a rede não é suportada
        setNetworkMismatch(true);
        setError(`This network (${network}) is not currently supported for Learn2Earn.`);
      } else {
        // Set generic error
        setError(result.message || 'Failed to claim tokens');
      }
    } catch (err: any) {
      console.error('Error claiming tokens:', err);
      const errorMsg = err.message || 'Failed to claim tokens';
      
      // Check if this is a network mismatch error
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

  // Check participation on component load if wallet is already connected
  useEffect(() => {
    const checkWalletAndParticipation = async () => {
      try {
        const address = await getCurrentAddress();
        if (address) {
          setWalletAddress(address);
          checkParticipation(address);
        }
      } catch (err) {
        console.error("Error checking wallet on load:", err);
      }
    };
    
    checkWalletAndParticipation();
  }, [learn2earnId]);
  
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
      ) : hasEnded ? (
        <div className="bg-red-500/20 border border-red-500 rounded-lg p-6 text-center">
          <div className="text-red-500 text-5xl mb-4">⏱</div>
          <h3 className="text-xl font-semibold text-white mb-2">Campaign Has Ended</h3>
          <p className="text-gray-300 mb-4">
            This Learn2Earn opportunity has already ended and is no longer accepting claims. 
            <br/>
            <span className="text-sm text-gray-400 mt-2 block">The campaign has reached its end date or maximum participant limit.</span>
          </p>
          <button
            onClick={() => window.location.href = '/learn2earn'}
            className="bg-gray-600 hover:bg-gray-700 text-white py-2 px-6 rounded-lg"
          >
            Browse Other Campaigns
          </button>
        </div>
      ) : hasTimeSyncIssue ? (
        <div className="bg-amber-500/20 border border-amber-500 rounded-lg p-6 text-center">
          <div className="text-amber-500 text-5xl mb-4">⚠️</div>
          <h3 className="text-xl font-semibold text-white mb-2">Time Synchronization Issue</h3>
          <p className="text-gray-300 mb-4">
            There's a time synchronization issue between the blockchain and our servers. 
            <br/>
            <span className="text-sm text-gray-400 mt-2 block">
              Our records show this campaign is still active, but the blockchain is reporting it has ended.
            </span>
          </p>
          <div className="flex flex-col md:flex-row justify-center gap-2">
            <button
              onClick={() => window.location.reload()}
              className="bg-amber-600 hover:bg-amber-700 text-white py-2 px-6 rounded-lg"
            >
              Try Again
            </button>
            <button
              onClick={() => window.location.href = '/learn2earn'}
              className="bg-gray-600 hover:bg-gray-700 text-white py-2 px-6 rounded-lg"
            >
              Browse Other Campaigns
            </button>
          </div>
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
          ) : !participationChecked ? (
            <div className="flex justify-center">
              <svg className="animate-spin h-10 w-10 text-orange-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <p className="ml-3 text-gray-300">Checking participation status...</p>
            </div>
          ) : !isRegistered ? (
            <form onSubmit={handleRegisterParticipation} className="space-y-6">
              <div className="p-4 bg-gray-800 rounded-lg">
                <h4 className="text-gray-400 text-sm mb-1">Connected Wallet</h4>
                <p className="text-orange-400 font-mono text-sm break-all">{walletAddress}</p>
                <p className="text-gray-500 text-xs mt-1">Make sure you're connected to the {network} network.</p>
              </div>
              
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="tasks-checkbox"
                  className="mr-2"
                  required
                />
                <label htmlFor="tasks-checkbox" className="text-gray-300 text-sm">
                  I confirm that I have completed all the required tasks for this Learn2Earn opportunity.
                </label>
              </div>
              
              <button
                type="submit"
                disabled={registering}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg flex justify-center items-center"
              >
                {registering ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Registering Participation...
                  </>
                ) : "Register Participation"}
              </button>
            </form>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="p-4 bg-gray-800 rounded-lg">
                <h4 className="text-gray-400 text-sm mb-1">Connected Wallet</h4>
                <p className="text-orange-400 font-mono text-sm break-all">{walletAddress}</p>
                <p className="text-gray-500 text-xs mt-1">Make sure you're connected to the {network} network.</p>
              </div>
              
              <div className="p-4 bg-blue-500/20 border border-blue-500 rounded-lg">
                <h4 className="text-blue-400 text-sm mb-1">Participation Registered ✓</h4>
                <p className="text-gray-300 text-sm">
                  Your participation has been registered. You can now claim your tokens.
                </p>
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
            </form>
          )}
          
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
