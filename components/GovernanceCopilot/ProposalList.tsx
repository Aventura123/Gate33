"use client";

import React, { useEffect, useState } from 'react';
import ProposalSummary from './ProposalSummary';
import VoteButton from './VoteButton';
import governanceService from '../../services/governanceService';

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
        <p className="text-gray-400">Loading proposals...</p>
      ) : proposals.length === 0 ? (
        <p className="text-gray-400">No active proposals found.</p>
      ) : (
        <ul className="space-y-4">
          {proposals.map((proposal) => (
            <li key={proposal.id} className="bg-neutral-900 rounded p-4 border border-gray-700">
              <div className="flex justify-between items-center mb-2">
                <span className="text-orange-400 font-bold">{proposal.dao}</span>
                <span className="text-xs text-gray-400">{proposal.status} • Até {proposal.endDate}</span>
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
