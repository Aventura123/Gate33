"use client";

import React, { useEffect, useState } from 'react';
import ProposalSummary from './ProposalSummary';
import VoteButton from './VoteButton';
import governanceService from '../../governanceService';

const ProposalList = () => {
  const [proposals, setProposals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProposals = async () => {
      setLoading(true);
      const data = await governanceService.getActiveProposals();
      setProposals(data);
      setLoading(false);
    };
    fetchProposals();
  }, []);
  return (
    <div className="bg-neutral-800 rounded-lg p-4 shadow mb-8">
      <h2 className="text-xl font-semibold text-orange-300 mb-4">Active Proposals</h2>
      {loading ? (
        <div className="flex justify-center py-8">
          <svg className="animate-spin h-8 w-8 text-orange-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        </div>
      ) : proposals.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-400 mb-2">No active proposals found.</p>
          <p className="text-xs text-gray-500">Check back later for new governance proposals</p>
        </div>
      ) : (
        <ul className="space-y-4">
          {proposals.map((proposal, index) => (
            <li key={proposal.id} className="proposal-item bg-neutral-900 rounded p-4 border border-gray-700">
              <div className="flex justify-between items-center mb-2">
                <div className="flex items-center">
                  <span className="text-orange-400 font-bold">{proposal.dao}</span>
                  {proposal.status === 'Active' && (
                    <span className="ml-2 inline-flex relative">
                      <span className="absolute top-1 left-1 w-2 h-2 bg-orange-500 rounded-full active-indicator"></span>
                      <span className="relative pl-4 text-xs text-orange-300">Live</span>
                    </span>
                  )}
                </div>
                <span className="text-xs text-gray-400">{proposal.status !== 'Active' ? proposal.status : ''} {proposal.endDate ? `• Until ${proposal.endDate}` : ''}</span>
              </div>
              <h3 className="text-lg text-white font-semibold mb-1">{proposal.title}</h3>
              <ProposalSummary proposal={proposal} />
              <div className="mt-2 flex gap-2">
                <VoteButton proposal={proposal} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default ProposalList;
