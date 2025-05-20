import React, { useState, useEffect } from 'react';
import { JobSuggestionRequest, JobSuggestionResponse, aiJobAssistantService } from '../../services/aiJobAssistantService';

// Add this debug function to check if the API key is available
function checkApiKeyAvailable() {
  const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
  if (!apiKey) {
    console.warn("Gemini API key not found in environment variables");
    return false;
  }
  return true;
}

interface AIJobAssistantProps {
  jobData: {
    title: string;
    description: string;
    requiredSkills: string;
    responsibilities: string;
    idealCandidate: string;
    screeningQuestions?: string[];
    experienceLevel?: string;
    remoteOption?: string;
    employmentType?: string;
    [key: string]: any;
  };
  updateJobData: (newData: any) => void;
  companyProfile: {
    name?: string;
    description?: string;
    website?: string;
    location?: string;
    [key: string]: any;
  };
  setScreeningQuestions?: (questions: string[]) => void; // NEW PROP
  isMobile?: boolean; // Added to detect mobile
}

const AIJobAssistant: React.FC<AIJobAssistantProps> = ({ jobData, updateJobData, companyProfile, setScreeningQuestions, isMobile = false }) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedContent, setGeneratedContent] = useState<JobSuggestionResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  
  // Determine if we're improving existing content or generating new content
  const hasExistingDescription = !!jobData.description?.trim();
  
  // Debug mode for development
  const [debugMode] = useState(false);
  
  // Check if API key is available on component mount
  useEffect(() => {
    const apiKeyAvailable = checkApiKeyAvailable();
    if (!apiKeyAvailable && debugMode) {
      console.warn('Gemini API key not found. Will use template fallbacks.');
    }
  }, [debugMode]);

  const generateJobDescription = async (shouldImprove = false) => {
    if (!jobData.title) {
      setError("Please fill in at least the job title before using the assistant.");
      return;
    }

    setIsGenerating(true);
    setError(null);
    setSuccessMessage(null);
    
    if (debugMode) {
      console.log("Request data:", {
        title: jobData.title,
        industry: 'Blockchain/Web3',
        experienceLevel: jobData.experienceLevel || 'Mid-level',
        existingDescription: shouldImprove ? jobData.description : '',
      });
    }

    try {
      const request: JobSuggestionRequest = {
        title: jobData.title,
        industry: 'Blockchain/Web3',
        experienceLevel: jobData.experienceLevel || 'Mid-level',
        remoteOption: jobData.remoteOption,
        employmentType: jobData.employmentType,
        existingDescription: shouldImprove ? jobData.description : '',
        companyProfile: {
          name: companyProfile.name,
          description: companyProfile.description
        }
      };

      // Force using template in development if API key issues persist
      const result = await aiJobAssistantService.generateJobDescription(request);
      
      if (debugMode) {
        console.log("AI Response:", result);
      }
      
      setGeneratedContent(result);
    } catch (err) {
      console.error("Error generating content:", err);
      setError("Failed to generate job description. Please try again later.");
    } finally {
      setIsGenerating(false);
    }
  };  const applyGeneratedContent = () => {
    if (!generatedContent) return;

    // Prepare responsibilities and candidate info string formats
    const responsibilitiesList = generatedContent.responsibilities.map(r => `• ${r}`).join('\n');
    const idealCandidateInfo = generatedContent.idealCandidate;
    
    // Handle screening questions - make sure they're formatted properly
    const screeningQuestionsList = generatedContent.screeningQuestions;

    updateJobData({
      ...jobData,
      description: generatedContent.description,
      // For skills, convert to comma-separated format (for tags UI)
      requiredSkills: generatedContent.requiredSkills.join(', '),
      // Set each field individually
      responsibilities: responsibilitiesList,
      idealCandidate: idealCandidateInfo,
      // Make sure to add the screening questions
      screeningQuestions: screeningQuestionsList
    });

    // --- NEW: update local screeningQuestions state if setter provided ---
    if (setScreeningQuestions) {
      setScreeningQuestions(screeningQuestionsList);
    }

    setSuccessMessage("Todos os campos foram atualizados com sucesso");
    setGeneratedContent(null);
  };

  return (
    <div className={`bg-black/70 rounded-lg border border-orange-500/30 ${isMobile ? 'p-2 mb-4' : 'p-6 mb-6'}`}>
      {/* Collapsible header for mobile */}
      <div 
        onClick={() => isMobile && setExpanded(!expanded)} 
        className={`${isMobile ? 'cursor-pointer flex justify-between items-center' : ''}`}
      >
        <h3 className={`${isMobile ? 'text-sm mt-0.5 mb-0.5' : 'text-xl mb-4'} font-bold text-orange-500`}>
          AI Job Assistant
        </h3>
        {isMobile && (
          <span className="text-orange-500 text-sm">
            {expanded ? '▲' : '▼'}
          </span>
        )}
      </div>
      
      {/* Content - collapsible on mobile */}
      {(!isMobile || expanded) && (
        <>
          <p className={`text-gray-300 ${isMobile ? 'text-2xs mb-1.5' : 'mb-3'}`}>
            {hasExistingDescription 
              ? "Enhance your job description with our AI assistant."
              : "Generate professional job descriptions with AI."}
          </p>
            
          {error && (
            <div className={`bg-red-900/50 border border-red-500/30 text-red-200 ${isMobile ? 'p-1.5 mb-2 text-2xs' : 'p-3 mb-3'} rounded`}>
              <p>{error}</p>
            </div>
          )}

          {successMessage && (
            <div className={`bg-green-900/50 border border-green-500/30 text-green-200 ${isMobile ? 'p-1.5 mb-2 text-2xs' : 'p-3 mb-3'} rounded`}>
              <p>{successMessage}</p>
            </div>
          )}
          
          <div className={`flex ${isMobile ? 'flex-col gap-1' : 'sm:flex-row gap-3'}`}>
            <button
              onClick={() => generateJobDescription(false)}
              disabled={isGenerating || !jobData.title}
              className={`${isMobile ? 'py-1 px-1.5 text-2xs' : 'py-3 px-4 text-sm'} rounded ${isMobile ? '' : 'flex-1'} font-medium transition-all ${
                isGenerating || !jobData.title
                  ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                  : 'bg-orange-600 hover:bg-orange-500 text-white'
              }`}
            >
              {isGenerating ? (
                <span className="flex items-center justify-center">
                  <svg className={`animate-spin ${isMobile ? 'h-2 w-2 mr-0.5' : 'h-5 w-5 mr-2'}`} viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  {isMobile ? 'Gerando...' : 'Generating...'}
                </span>
              ) : (
                isMobile ? 'Gerar' : 'Generate New Description'
              )}
            </button>
            
            {hasExistingDescription && (
              <button
                onClick={() => generateJobDescription(true)}
                disabled={isGenerating || !jobData.title}
                className={`${isMobile ? 'py-1 px-1.5 text-2xs' : 'py-3 px-4 text-sm'} rounded ${isMobile ? '' : 'flex-1'} font-medium transition-all ${
                  isGenerating || !jobData.title
                    ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-500 text-white'
                }`}
              >
                {isGenerating ? (
                  <span className="flex items-center justify-center">
                    <svg className={`animate-spin ${isMobile ? 'h-2 w-2 mr-0.5' : 'h-5 w-5 mr-2'}`} viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    {isMobile ? 'Melhorando...' : 'Improving...'}
                  </span>
                ) : (
                  isMobile ? 'Melhorar' : 'Improve Existing Description'
                )}
              </button>
            )}
          </div>
        </>
      )}
      
      {generatedContent && (
        <div className={`${isMobile ? 'mt-4' : 'mt-6'} border border-orange-500/30 rounded-lg ${isMobile ? 'p-3' : 'p-4'} bg-black/50`}>
          <h4 className={`${isMobile ? 'text-base' : 'text-lg'} font-semibold text-orange-400 mb-2`}>Generated Content</h4>
          
          <div className="mb-3">
            <h5 className="text-sm font-medium text-orange-300">Description:</h5>
            <p className={`text-gray-200 ${isMobile ? 'text-xs' : 'text-sm'} whitespace-pre-wrap`}>{generatedContent.description}</p>
          </div>
          
          <div className="mb-3">
            <h5 className="text-sm font-medium text-orange-300">Required Skills:</h5>
            <div className="flex flex-wrap gap-1 mt-1">
              {generatedContent.requiredSkills.map((skill, i) => (
                <span key={i} className={`bg-orange-900/30 text-orange-200 px-2 py-1 rounded ${isMobile ? 'text-xs' : 'text-xs'}`}>
                  {skill}
                </span>
              ))}
            </div>
          </div>
          
          <div className="mb-3">
            <h5 className="text-sm font-medium text-orange-300">Responsibilities:</h5>
            <ul className={`list-disc pl-5 text-gray-200 ${isMobile ? 'text-xs' : 'text-sm'}`}>
              {generatedContent.responsibilities.map((resp, i) => (
                <li key={i}>{resp}</li>
              ))}
            </ul>
          </div>
          
          <div className="mb-3">
            <h5 className="text-sm font-medium text-orange-300">Ideal Candidate:</h5>
            <p className={`text-gray-200 ${isMobile ? 'text-xs' : 'text-sm'}`}>{generatedContent.idealCandidate}</p>
          </div>
          
          <div className="mb-4">
            <h5 className="text-sm font-medium text-orange-300">Screening Questions:</h5>
            <ul className={`list-decimal pl-5 text-gray-200 ${isMobile ? 'text-xs' : 'text-sm'}`}>
              {generatedContent.screeningQuestions.map((q, i) => (
                <li key={i}>{q}</li>
              ))}
            </ul>
          </div>
          
          <div className="flex justify-between mt-3">
            <button
              onClick={() => setGeneratedContent(null)}
              className={`${isMobile ? 'px-3 py-1 text-xs' : 'px-4 py-2'} bg-gray-700 text-gray-200 rounded hover:bg-gray-600`}
            >
              Cancel
            </button>
            <button
              onClick={applyGeneratedContent}
              className={`${isMobile ? 'px-3 py-1 text-xs' : 'px-4 py-2'} bg-orange-600 text-white rounded hover:bg-orange-500`}
            >
              Apply Content
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AIJobAssistant;
