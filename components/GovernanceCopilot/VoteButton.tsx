import React from 'react';

const VoteButton = ({ proposal }: { proposal: any }) => {
  // TODO: Integrar com Snapshot/Tally para votação real
  const handleVote = () => {
    alert(`Voto enviado para a proposta: ${proposal.title}`);
  };

  return (
    <button
      className="bg-green-600 hover:bg-green-700 text-white text-xs px-4 py-1 rounded"
      onClick={handleVote}
    >
      Votar
    </button>
  );
};

export default VoteButton;
