"use client";

import React, { useEffect, useState } from 'react';
import governanceService from '../../services/governanceService';

const HistoryPanel = () => {
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      setLoading(true);
      const data = await governanceService.getVoteHistory();
      setHistory(data);
      setLoading(false);
    };
    fetchHistory();
  }, []);

  return (
    <div className="bg-neutral-800 rounded-lg p-4 shadow">
      <h2 className="text-xl font-semibold text-orange-300 mb-4">Loading history...</h2>
      {loading ? (
        <p className="text-gray-400">Carregando histórico...</p>
      ) : history.length === 0 ? (
        <p className="text-gray-400">No votes found.</p>
      ) : (
        <table className="min-w-full text-gray-300 text-sm">
          <thead>
            <tr>
              <th className="text-left py-2">DAO</th>
              <th className="text-left py-2">Proposal</th>
              <th className="text-left py-2">Data</th>
              <th className="text-left py-2">Vote</th>
            </tr>
          </thead>
          <tbody>
            {history.map((item) => (
              <tr key={item.id} className="border-b border-gray-700">
                <td className="py-2">{item.dao}</td>
                <td className="py-2">{item.title}</td>
                <td className="py-2">{item.date}</td>
                <td className="py-2">{item.vote}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default HistoryPanel;
