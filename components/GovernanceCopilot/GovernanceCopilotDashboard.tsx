import React from 'react';
import Layout from '../Layout';
import WalletButton from '../WalletButton';
import ProposalList from './ProposalList';
import HistoryPanel from './HistoryPanel';

const GovernanceCopilotDashboard = () => {
  return (
    <Layout>
      <div className="bg-gradient-to-b from-black via-[#18181b] to-black min-h-screen text-white">
        <div className="max-w-4xl mx-auto py-8 px-2 sm:py-16 sm:px-4">
          <h1 className="text-3xl sm:text-4xl font-bold text-orange-400 mb-6 text-center">Governance Copilot</h1>
          <div className="mb-4 flex justify-end">
            <WalletButton />
          </div>
          <ProposalList />
          <div className="mt-8">
            <HistoryPanel />
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default GovernanceCopilotDashboard;
