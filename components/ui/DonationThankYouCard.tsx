import React, { useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';

interface DonationThankYouCardProps {
  tokenAmount: number;
  donationHash?: string;  // Hash da transação de doação original
  distributionHash?: string;  // Hash da transação de distribuição de token
  networkName?: string;
  onNewDonation?: () => void;
}

const DonationThankYouCard: React.FC<DonationThankYouCardProps> = ({
  tokenAmount,
  donationHash,
  distributionHash,
  networkName = 'Polygon',
  onNewDonation,
}) => {
  // Round down to ensure we don't promise more tokens than will be delivered
  const formattedTokenAmount = Math.floor(tokenAmount);
  
  // Adicionar logs para depuração
  useEffect(() => {
    console.log("DonationThankYouCard - Props recebidas:");
    console.log("donationHash:", donationHash);
    console.log("distributionHash:", distributionHash);
  }, [donationHash, distributionHash]);
    return (
    <div className="max-w-md mx-auto bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl shadow-xl overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-orange-600 to-orange-400 p-3">
        <h3 className="text-lg font-bold text-white text-center">Thank You for Your Donation!</h3>
      </div>
      
      {/* Content */}
      <div className="p-5">        <div className="flex justify-center mb-5">
          <div className="w-20 h-20 bg-orange-500/20 rounded-full flex items-center justify-center">
            <svg className="w-10 h-10 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
            </svg>
          </div>
        </div>
        
        <div className="text-center mb-5">
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
        <div className="bg-gray-800/50 rounded-lg p-3 mb-4">
          <p className="text-xs text-gray-400 mb-2">G33 Token Contract Address:</p>
          <p className="font-mono text-xs text-gray-300 break-all select-all">
             0xc6099a207e9d2d37d1203f060d2e77c1e05008fa
          </p>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <div>
              <p className="text-xs text-gray-400">Token Symbol:</p>
              <p className="font-mono text-xs text-orange-300">G33</p>
            </div>
            <div>
              <p className="text-xs text-gray-400">Decimals:</p>
              <p className="font-mono text-xs text-orange-300">18</p>
            </div>
          </div>
        </div>
          {/* Donation Transaction Hash (if available) */}
        {donationHash && donationHash !== "transaction-hash-placeholder" && (
          <div className="bg-gray-800/50 rounded-lg p-3 mb-4">
            <p className="text-xs text-gray-400 mb-2">Donation Transaction Hash:</p>
            <p className="font-mono text-xs text-gray-300 break-all select-all">{donationHash}</p>
            <div className="mt-2 flex justify-end">
              <Link 
                href={`https://polygonscan.com/tx/${donationHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-orange-400 hover:text-orange-300 text-xs"
              >
                View on Explorer →
              </Link>
            </div>
          </div>
        )}        {/* Token Distribution Transaction Hash (if available) */}
        {distributionHash && distributionHash !== "transaction-hash-placeholder" && (
          <div className="bg-gray-800/50 rounded-lg p-3 mb-4">
            <p className="text-xs text-gray-400 mb-2">Token Distribution Transaction Hash:</p>
            <p className="font-mono text-xs text-gray-300 break-all select-all">{distributionHash}</p>
            <div className="mt-2 flex justify-end">
              <Link 
                href={`https://polygonscan.com/tx/${distributionHash}`}
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
        <div className="border-t border-gray-700 pt-3 mt-3">
          <p className="text-sm text-gray-300 mb-2">What to do next?</p>
          <ul className="text-sm text-gray-400 space-y-1 mb-3">
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