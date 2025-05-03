import React from 'react';
import Image from 'next/image';
import Link from 'next/link';

interface DonationThankYouCardProps {
  tokenAmount: number;
  transactionHash?: string;
  networkName?: string;
  onNewDonation?: () => void;
}

const DonationThankYouCard: React.FC<DonationThankYouCardProps> = ({
  tokenAmount,
  transactionHash,
  networkName = 'Polygon',
  onNewDonation,
}) => {
  // Round down to ensure we don't promise more tokens than will be delivered
  const formattedTokenAmount = Math.floor(tokenAmount);
  
  return (
    <div className="max-w-md mx-auto bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl shadow-xl overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-orange-600 to-orange-400 p-4">
        <h3 className="text-xl font-bold text-white text-center">Thank You for Your Donation!</h3>
      </div>
      
      {/* Content */}
      <div className="p-6">
        <div className="flex justify-center mb-6">
          <div className="w-24 h-24 bg-orange-500/20 rounded-full flex items-center justify-center">
            <svg className="w-12 h-12 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
            </svg>
          </div>
        </div>
        
        <div className="text-center mb-6">
          <p className="text-gray-300 mb-3">
            Your transaction has been processed successfully. You will receive:
          </p>
          <p className="text-3xl font-bold text-orange-500 mb-1">
            {formattedTokenAmount} <span className="text-xl text-orange-300">G33 Tokens</span>
          </p>
          <p className="text-sm text-gray-400">
            The tokens will be sent to your wallet on the {networkName} network.
          </p>
        </div>
        
        {/* Contract Address */}
        <div className="bg-gray-800/50 rounded-lg p-4 mb-6">
          <p className="text-xs text-gray-400 mb-2">G33 Token Contract Address:</p>
          <p className="font-mono text-xs text-gray-300 break-all select-all">
            0x014Ab399D1F4cAa25D4fFD87848A35Af0F7Bd303
          </p>
        </div>
        
        {/* Transaction Hash (if available) */}
        {transactionHash && (
          <div className="bg-gray-800/50 rounded-lg p-4 mb-6">
            <p className="text-xs text-gray-400 mb-2">Transaction Hash:</p>
            <p className="font-mono text-xs text-gray-300 break-all select-all">{transactionHash}</p>
            <div className="mt-2 flex justify-end">
              <Link 
                href={`https://polygonscan.com/tx/${transactionHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-orange-400 hover:text-orange-300 text-xs"
              >
                View on Explorer →
              </Link>
            </div>
          </div>
        )}
        
        {/* What to do next */}
        <div className="border-t border-gray-700 pt-4 mt-4">
          <p className="text-sm text-gray-300 mb-3">What to do next?</p>
          <ul className="text-sm text-gray-400 space-y-2 mb-4">
            <li className="flex items-start">
              <svg className="w-4 h-4 text-orange-400 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
              <span>You can add the G33 token to your MetaMask wallet</span>
            </li>
            <li className="flex items-start">
              <svg className="w-4 h-4 text-orange-400 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
              <span>Explore the Gate33 project and its features</span>
            </li>
          </ul>
        </div>
        
        {/* Action buttons */}
        <div className="flex justify-center mt-6">
          {onNewDonation && (
            <button 
              onClick={onNewDonation} 
              className="bg-orange-500 hover:bg-orange-600 text-white py-2 px-4 rounded-md transition-colors"
            >
              Make Another Donation
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default DonationThankYouCard;