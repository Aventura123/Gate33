import React, { useState } from 'react';

// Mock: Replace with OpenAI integration
const mockSummary =
  'Esta proposta visa mudar a taxa de juros da stablecoin X de 3% para 4,5%. A medida é apoiada por delegados Y e Z. Risco baixo de centralização, benefício fiscal estimado de +12% ao protocolo.';

const ProposalSummary = ({ proposal }: { proposal: any }) => {
  const [summary, setSummary] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleGenerateSummary = async () => {
    setLoading(true);
    // TODO: Integrar com OpenAI API
    setTimeout(() => {
      setSummary(mockSummary);
      setLoading(false);
    }, 1200);
  };

  return (
    <div className="bg-neutral-950 rounded p-3 mt-2">
      {summary ? (
        <div>
          <p className="text-gray-200 text-sm mb-2">{summary}</p>
          <button
            className="text-xs text-orange-400 underline"
            onClick={() => setSummary(null)}
          >
            Ver descrição original
          </button>
        </div>
      ) : (
        <div>
          <p className="text-gray-400 text-sm mb-2">{proposal.description}</p>
          <button
            className="bg-orange-500 hover:bg-orange-600 text-white text-xs px-3 py-1 rounded"
            onClick={handleGenerateSummary}
            disabled={loading}
          >
            {loading ? 'Gerando resumo...' : 'Generate summary with AI'}
          </button>
        </div>
      )}
    </div>
  );
};

export default ProposalSummary;
