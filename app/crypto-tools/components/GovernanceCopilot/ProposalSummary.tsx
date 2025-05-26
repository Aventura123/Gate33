import React from 'react';

interface ProposalSummaryProps {
  proposal: {
    id: string;
    title: string;
    description: string;
    dao: string;
  };
}

const ProposalSummary = ({ proposal }: ProposalSummaryProps) => {
  const [summary, setSummary] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // This function would be integrated with OpenAI or another AI service
  const generateAISummary = async (proposalText: string, dao: string) => {
    // Here would be the call to the OpenAI API
    // For now we use simulated responses based on the DAO
    
    // Simulation of different responses based on the DAO
    const mockSummaries = {
      'Aave': 'This Aave proposal aims to change the interest rate of stablecoin X from 3% to 4.5%. The measure is supported by delegates Y and Z. Low risk of centralization, estimated fiscal benefit of +12% to the protocol.',
      'Optimism': 'Optimism proposal to allocate 1M OP for a new round of grants. Focus on social impact projects and education. Estimated return: 15% growth in the ecosystem over the next 6 months.',
      'default': 'This proposal seeks to implement structural changes in the DAO governance. The main stakeholders are favorable, with low risk of community fragmentation.'
    };
    
    // Returns the simulated response based on the DAO, or the default response if the DAO is not recognized
    return mockSummaries[dao as keyof typeof mockSummaries] || mockSummaries.default;
  };

  const handleGenerateSummary = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // In a real scenario, would send the complete proposal description
      const aiSummary = await generateAISummary(proposal.description, proposal.dao);
      setSummary(aiSummary);
    } catch (err) {
      console.error('Error generating summary:', err);
      setError('Unable to generate summary. Please try again later.');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="bg-neutral-950 rounded p-3 mt-2">
      {summary ? (
        <div className="animate-fadeIn">
          <div className="flex items-center mb-1">
            <svg className="w-4 h-4 text-orange-400 mr-1" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
              <path d="M5.5 16.5c0-.966.784-1.75 1.75-1.75h5.5c.966 0 1.75.784 1.75 1.75v.5c0 .138-.112.25-.25.25h-9c-.138 0-.25-.112-.25-.25v-.5zm1.75-1.75c-.068 0-.136.001-.203.005A2.738 2.738 0 015 12c0-1.519 1.231-2.75 2.75-2.75h4.5c1.519 0 2.75 1.231 2.75 2.75 0 1.245-.826 2.298-1.995 2.643A2.738 2.738 0 0112.75 14.75h-5.5zM8 10c-1.105 0-2-1.12-2-2.5S6.895 5 8 5s2 1.12 2 2.5-1.12 2.5-2 2.5z"/>
            </svg>
            <span className="text-xs font-medium text-orange-400">AI Summary</span>
          </div>
          <p className="text-gray-200 text-sm mb-2 border-l-2 border-orange-500/30 pl-2">{summary}</p>
          <div className="flex justify-between items-center">
            <button
              className="text-xs text-orange-400 underline"
              onClick={() => setSummary(null)}
            >
              View original description
            </button>
            <span className="text-xs text-gray-500">Powered by AI</span>
          </div>
        </div>
      ) : error ? (
        <div className="animate-fadeIn">
          <p className="text-red-400 text-sm mb-2">{error}</p>
          <button
            className="bg-gray-600 hover:bg-gray-700 text-white text-xs px-3 py-1 rounded"
            onClick={() => setError(null)}
          >
            Back to description
          </button>
        </div>
      ) : (
        <div>
          <p className="text-gray-400 text-sm mb-2">
            {proposal.description.length > 150 
              ? `${proposal.description.substring(0, 150)}...` 
              : proposal.description}
          </p>
          <div className="flex justify-between items-center">
            <button
              className="flex items-center bg-orange-500 hover:bg-orange-600 text-white text-xs px-3 py-1 rounded"
              onClick={handleGenerateSummary}
              disabled={loading}
            >
              {loading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-3 w-3 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Generating summary...
                </>
              ) : (
                <>
                  <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                    <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                  </svg>
                  Generate AI summary
                </>
              )}
            </button>
            {proposal.description.length > 150 && (
              <button 
                className="text-xs text-gray-400 underline"
                onClick={() => alert(proposal.description)}
              >
                View full
              </button>
            )}
          </div>
        </div>
      )}
      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-in-out;
        }
      `}</style>
    </div>
  );
};

export default ProposalSummary;
