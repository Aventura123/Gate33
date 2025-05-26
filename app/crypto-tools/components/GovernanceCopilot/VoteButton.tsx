import React, { useState } from 'react';
import governanceService from '../../governanceService';
import { web3Service } from '../../../../services/web3Service';

const VoteButton = ({ proposal }: { proposal: any }) => {
  const [isVoting, setIsVoting] = useState(false);
  const [voteSuccess, setVoteSuccess] = useState(false);

  const handleVote = async () => {
    try {
      setIsVoting(true);
      
      // Check if wallet is connected
      const walletInfo = web3Service.getWalletInfo();
      if (!walletInfo?.address) {
        alert('Please connect your wallet first');
        setIsVoting(false);
        return;
      }
      
      // Submit vote through governanceService
      const success = await governanceService.submitVote({
        proposalId: proposal.id,
        choice: 1, // 1 = Yes (in the future, could have an interface to choose)
        reason: 'Voted via Gate33 Governance Copilot'
      });
      
      if (success) {
        setVoteSuccess(true);
        setTimeout(() => setVoteSuccess(false), 3000); // Reset after 3 seconds
      } else {
        alert('Error sending vote. Please try again.');
      }
    } catch (error) {
      console.error('Error voting:', error);
      alert('Error processing your vote');
    } finally {
      setIsVoting(false);
    }
  };
  
  return (
    <button
      className={`text-white text-xs px-4 py-1 rounded flex items-center ${
        voteSuccess
          ? 'bg-blue-600 hover:bg-blue-700'
          : isVoting
          ? 'bg-gray-600 cursor-wait'
          : 'bg-green-600 hover:bg-green-700'
      }`}
      onClick={handleVote}
      disabled={isVoting || voteSuccess}
    >
      {isVoting ? (
        <>
          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          Processing...
        </>
      ) : voteSuccess ? (
        <>
          <svg className="-ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
          Vote sent!
        </>
      ) : (
        'Vote'
      )}
    </button>
  );
};

export default VoteButton;
