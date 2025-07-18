import React, { useState, useEffect } from 'react';
import { useWallet } from '../WalletProvider';
import { useAuth } from '../AuthProvider';
import learn2earnContractService from '../../services/learn2earnContractService';
import { collection, addDoc, query, where, getDocs, updateDoc, doc, increment, setDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import WalletButton from '../WalletButton';

interface ParticipationFormProps {
  learn2earnId: string;  // This is the Firestore document ID
  tokenSymbol: string;
  network?: string;
  onRegistrationComplete?: () => void; // New callback for registration completion
}

const ParticipationForm: React.FC<ParticipationFormProps> = ({ 
  learn2earnId, 
  tokenSymbol, 
  network,
  onRegistrationComplete 
}) => {
  const {
    walletAddress,
    isConnectingWallet,
    connectWallet,
    currentNetwork
  } = useWallet();
  
  const { user } = useAuth();
  
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
  const [showNetworkModal, setShowNetworkModal] = useState(false);
  
  // Function to check if user has already registered participation
  const checkParticipation = async (address: string) => {
    try {
      const participantsRef = collection(db, "learn2earnParticipants");
      
      // Check by wallet address OR by seeker ID to prevent duplicate participation
      const queries = [];
      
      // Query by wallet address
      queries.push(query(
        participantsRef, 
        where("walletAddress", "==", address.toLowerCase()),
        where("learn2earnId", "==", learn2earnId)
      ));
      
      // Query by seeker ID if user is authenticated
      if (user?.uid) {
        queries.push(query(
          participantsRef, 
          where("seekerId", "==", user.uid),
          where("learn2earnId", "==", learn2earnId)
        ));
      }
      
      // Execute all queries
      const queryResults = await Promise.all(queries.map(q => getDocs(q)));
      
      // Check if any query returned results
      const hasParticipated = queryResults.some(querySnapshot => !querySnapshot.empty);
      
      if (hasParticipated) {
        // User has already registered (either with this wallet or with this account)
        setIsRegistered(true);
        console.log("User has already registered participation");
        // Call the registration complete callback if provided
        if (onRegistrationComplete) onRegistrationComplete();
      }
      
      setParticipationChecked(true);
    } catch (err) {
      console.error("Error checking participation:", err);
    }
  };
  
  // Function to register participation
  const handleRegisterParticipation = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user?.uid) {
      setError('You must be logged in to participate. Please log in to your account first.');
      return;
    }
    
    if (!walletAddress) {
      await connectWallet();
      if (!walletAddress) {
        setError('Please connect your wallet first');
        return;
      }
    }
    
    setRegistering(true);
    setError(null);
    
    try {
      // Register the user's participation with both wallet address and seeker ID
      const response = await fetch('/api/learn2earn', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          learn2earnId,
          walletAddress,
          seekerId: user.uid, // Include seeker ID for validation
          answers: [], // Simple participation, no quiz answers
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to register participation');
      }
      
      // If successful, set as registered
      setIsRegistered(true);
      
      // Call the registration complete callback if provided
      if (onRegistrationComplete) onRegistrationComplete();
      
    } catch (err: any) {
      console.error('Error registering participation:', err);
      setError(err.message || 'Failed to register participation');
    } finally {
      setRegistering(false);
    }
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user?.uid) {
      setError('You must be logged in to claim tokens. Please log in to your account first.');
      return;
    }
    
    if (!walletAddress) {
      await connectWallet();
      if (!walletAddress) {
        setError('Please connect your wallet first');
        return;
      }
    }

    if (!isRegistered) {
      setError('You need to register your participation first');
      return;
    }

    if (!network) {
      setError(`Network information not available for this Learn2Earn opportunity. Please refresh the page and try again.`);
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
          
          // Try to find the participation document by seeker ID first, then by wallet address
          let participationDoc = null;
          
          if (user?.uid) {
            const seekerQuery = query(
              participantsRef, 
              where("seekerId", "==", user.uid),
              where("learn2earnId", "==", learn2earnId)
            );
            const seekerSnapshot = await getDocs(seekerQuery);
            if (!seekerSnapshot.empty) {
              participationDoc = seekerSnapshot.docs[0];
            }
          }
          
          // Fallback to wallet address if not found by seeker ID
          if (!participationDoc) {
            const walletQuery = query(
              participantsRef, 
              where("walletAddress", "==", walletAddress.toLowerCase()),
              where("learn2earnId", "==", learn2earnId)
            );
            const walletSnapshot = await getDocs(walletQuery);
            if (!walletSnapshot.empty) {
              participationDoc = walletSnapshot.docs[0];
            }
          }
          
          if (participationDoc) {
            await updateDoc(participationDoc.ref, {
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
        // If the user has already claimed tokens for this opportunity
        setAlreadyClaimed(true);
      } else if (result.invalidId) {
        // If the Learn2Earn ID is not in the correct format
        setInvalidId(true);
      } else if (result.invalidSignature) {
        // If the signature is invalid
        setInvalidSignature(true);
      } else if (result.specificError === "ended") {
        // The Learn2Earn opportunity has ended
        setHasEnded(true);
      } else if (result.specificError === "timeSync") {
        // There's a time synchronization issue between the blockchain and our database
        setHasTimeSyncIssue(true);              } else if (result.notEligible) {
        // If the user is not eligible to claim tokens
        setError(`You are not eligible to claim tokens for this Learn2Earn opportunity. Please ensure you've completed all required tasks and that your wallet is connected to the ${network} network.`);
      } else if (result.notSupported) {
        // If the network is not supported
        setNetworkMismatch(true);
        setError(`This Learn2Earn opportunity requires the ${network} network. Please switch your wallet to ${network} to participate.`);
      } else {
        // Set generic error with network verification reminder
        const errorMessage = result.message || 'Failed to claim tokens';
        if (errorMessage.toLowerCase().includes('reward amount') || errorMessage.toLowerCase().includes('network')) {
          setError(`${errorMessage}\n\nPlease verify that your wallet is connected to the ${network} network, which is required for this Learn2Earn opportunity.`);
        } else {
          setError(errorMessage);
        }
      }
    } catch (err: any) {
      console.error('Error claiming tokens:', err);
      const errorMsg = err.message || 'Failed to claim tokens';
      
      // Check if this is a network mismatch error
      if (errorMsg.toLowerCase().includes("network") || 
          errorMsg.toLowerCase().includes("chain") || 
          errorMsg.toLowerCase().includes("wrong") ||
          errorMsg.toLowerCase().includes("reward amount")) {
        setNetworkMismatch(true);
        setError(`Network mismatch detected. This Learn2Earn opportunity requires the ${network} network. Please switch your wallet to ${network} and try again.`);
      } else {
        setError(errorMsg);
      }
    } finally {
      setSubmitting(false);
    }
  };

  // Check participation on component load if wallet is connected and user is authenticated
  useEffect(() => {
    if (walletAddress && user?.uid) {
      checkParticipation(walletAddress);
    }
  }, [learn2earnId, walletAddress, user?.uid]);
  
  // Helper: should show switch network button?
  const shouldShowSwitchNetwork = walletAddress && network && currentNetwork && currentNetwork !== network;
  
  // Open WalletModal automatically if network mismatch
  useEffect(() => {
    if (shouldShowSwitchNetwork) {
      setShowNetworkModal(true);
    } else {
      setShowNetworkModal(false);
    }
  }, [shouldShowSwitchNetwork]);
  
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
        <>
          {/* Network mismatch: show message only */}
          <div className="bg-orange-500/20 border border-orange-500 rounded-lg p-6 text-center">
            <div className="text-orange-500 text-5xl mb-4">🔗</div>
            <h3 className="text-xl font-semibold text-orange-400 mb-2">Wrong Network</h3>
            <p className="text-gray-300 mb-4">
              This Learn2Earn opportunity requires the <strong className="text-orange-400">{network}</strong> network, but you're currently connected to <strong className="text-orange-400">{currentNetwork}</strong>.
            </p>
            <p className="text-orange-400 text-sm mb-4">Please switch to the {network} network in your wallet to participate in this opportunity.</p>
            <div className="bg-orange-500/10 border border-orange-500/30 rounded p-3 text-sm text-gray-300">
              <strong>How to switch networks:</strong><br/>
              1. Open your wallet (MetaMask, etc.)<br/>
              2. Look for the network selector<br/>
              3. Select "{network}" from the list<br/>
              4. Return here and try again
            </div>
          </div>
        </>
      ) : (
        <>
          <p className="text-gray-300 mb-6">
            Complete all tasks above and submit this form to earn {tokenSymbol} tokens. Your wallet will be verified before tokens are distributed.
          </p>
          
          {!walletAddress ? (
            <WalletButton 
              showNetworkSelector={false}
              title="Connect to Participate"
              onConnect={() => {}}
              className="w-full bg-orange-500 hover:bg-orange-600 text-white font-medium py-3 px-4 rounded-lg"
            />
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
                <h4 className="text-white text-sm mb-1 text-center">Connected Wallet</h4>
                <div className="mt-2">
                  <WalletButton 
                    showNetworkSelector={true}
                    title="Connect Wallet"
                    onConnect={() => {}}
                    className=""
                  />
                </div>
                <div className="text-center mt-3">
                  <p className="text-white text-xs">Make sure you're connected to the <span className="text-orange-400 font-medium">{network}</span> network.</p>
                  <p className="text-gray-300 text-xs mt-1">The network indicator above should show a colored dot when properly connected.</p>
                </div>
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
                <h4 className="text-white text-sm mb-1 text-center">Connected Wallet</h4>
                <div className="mt-2">
                  <WalletButton 
                    showNetworkSelector={true}
                    title="Connect Wallet"
                    onConnect={() => {}}
                    className=""
                  />
                </div>
                <div className="text-center mt-3">
                  <p className="text-white text-xs">Make sure you're connected to the <span className="text-orange-400 font-medium">{network}</span> network.</p>
                  <p className="text-gray-300 text-xs mt-1">The network indicator above should show a colored dot when properly connected.</p>
                </div>
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
                    Check your wallet - Approve transaction
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
