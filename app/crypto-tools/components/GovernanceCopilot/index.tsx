import React, { useState } from 'react';
import ProposalList from './ProposalList';
import HistoryPanel from './HistoryPanel';
import { web3Service } from '../../../../services/web3Service';

const GovernanceCopilot = () => {
  const [activeTab, setActiveTab] = useState<'proposals' | 'history'>('proposals');
  const walletInfo = web3Service.getWalletInfo();
  const walletConnected = !!walletInfo?.address;

  return (
    <div className="governance-container">
      {/* Tabs Navigation */}
      <div className="mb-6 border-b border-gray-700">
        <div className="flex gap-4">
          <button 
            className={`pb-2 px-1 text-sm font-medium ${activeTab === 'proposals' ? 'border-b-2 border-orange-400 text-orange-400' : 'text-gray-400 hover:text-gray-200'}`}
            onClick={() => setActiveTab('proposals')}
          >
            Active Proposals
          </button>
          <button 
            className={`pb-2 px-1 text-sm font-medium ${activeTab === 'history' ? 'border-b-2 border-orange-400 text-orange-400' : 'text-gray-400 hover:text-gray-200'}`}
            onClick={() => setActiveTab('history')}
          >
            Voting History
          </button>
        </div>
      </div>

      {/* Wallet Status */}
      {walletConnected && (
        <div className="bg-green-900/20 text-green-400 text-xs rounded p-2 mb-4 flex items-center">
          <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          Wallet connected. Your votes will be signed with {walletInfo?.address.substring(0, 6)}...{walletInfo?.address.substring(walletInfo.address.length - 4)}
        </div>
      )}
      
      {/* Active Tab Content */}
      {activeTab === 'proposals' ? (
        <ProposalList />
      ) : (
        <HistoryPanel />
      )}
    </div>
  );
};

export default GovernanceCopilot;
