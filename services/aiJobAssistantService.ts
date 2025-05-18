import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';

// We'll initialize the API inside the service to handle SSR properly
let genAI: GoogleGenerativeAI | null = null;

export interface JobSuggestionRequest {
  title: string;
  industry: string;
  experienceLevel: string;
  remoteOption?: string;
  employmentType?: string;
  existingDescription?: string; // Added for improving existing content
  companyProfile?: {
    name?: string;
    description?: string;
  };
}

export interface JobSuggestionResponse {
  description: string;
  requiredSkills: string[];
  responsibilities: string[];
  idealCandidate: string;
  screeningQuestions: string[];
}

// Service for AI-powered job description generation
export const aiJobAssistantService = {  async generateJobDescription(request: JobSuggestionRequest): Promise<JobSuggestionResponse> {
    try {      // Initialize the API if not already done
      if (!genAI) {
        // Try to get API key from environment
        const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
          
        if (!apiKey) {
          console.warn('Gemini API key not found. Using template fallback.');
          return this.getTemplateDescription(request);
        }
        
        try {
          genAI = new GoogleGenerativeAI(apiKey);
          console.log("Gemini API initialized successfully");
        } catch (error) {
          console.error("Failed to initialize Gemini:", error);
          return this.getTemplateDescription(request);
        }
      }
      
      // Return template if we still can't initialize the API
      if (!genAI) {
        console.warn("Could not initialize Gemini API. Using template fallback.");
        return this.getTemplateDescription(request);
      }
      
      // Get the model with safety settings
      const model = genAI.getGenerativeModel({ 
        model: 'gemini-1.5-pro',
        safetySettings: [
          {
            category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
            threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
          },
          {
            category: HarmCategory.HARM_CATEGORY_HARASSMENT, 
            threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
          },
        ],
      });
        // Build the prompt for the model
      // Different prompt based on whether we're improving existing content or creating new
      const prompt = request.existingDescription 
        ? `
          Improve this existing job description for a ${request.title} position.
          Make it more professional, clear, and appealing to qualified candidates.
          
          Title: ${request.title}
          Industry: ${request.industry || 'Blockchain/Web3'}
          Experience Level: ${request.experienceLevel || 'Mid-level'}
          ${request.remoteOption ? `Remote Work: ${request.remoteOption}` : ''}
          ${request.employmentType ? `Employment Type: ${request.employmentType}` : ''}
          ${request.companyProfile?.name ? `Company Name: ${request.companyProfile.name}` : ''}
          ${request.companyProfile?.description ? `About the Company: ${request.companyProfile.description}` : ''}
          
          Existing description to improve:
          ${request.existingDescription}
          
          Return the following fields in the indicated format:
          1. Improved job description (2-3 paragraphs)
          2. List of 5-8 essential skills (just the names separated by commas)
          3. List of 4-6 main responsibilities (one item per line)
          4. Ideal candidate profile (1 paragraph)
          5. 3 screening questions specific to this position
        `
        : `
          Create a professional job description for a position with the following details:
          
          Title: ${request.title}
          Industry: ${request.industry || 'Blockchain/Web3'}
          Experience Level: ${request.experienceLevel || 'Mid-level'}
          ${request.remoteOption ? `Remote Work: ${request.remoteOption}` : ''}
          ${request.employmentType ? `Employment Type: ${request.employmentType}` : ''}
          ${request.companyProfile?.name ? `Company Name: ${request.companyProfile.name}` : ''}
          ${request.companyProfile?.description ? `About the Company: ${request.companyProfile.description}` : ''}
          
          Return the following fields in the indicated format:
          1. Detailed job description (2-3 paragraphs)
          2. List of 5-8 essential skills (just the names separated by commas)
          3. List of 4-6 main responsibilities (one item per line)
          4. Ideal candidate profile (1 paragraph)
          5. 3 screening questions specific to this position
        
        Focus specifically on the blockchain/web3 and cryptocurrency sector. Use attractive and inclusive language.
      `;
      
      // Generate the content
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
        // Process the response and structure it
      console.log("Raw Gemini response:", text);
      
      // More robust response parsing
      let description = '';
      let skills: string[] = [];
      let responsibilities: string[] = [];
      let idealCandidate = '';
      let screeningQuestions: string[] = [];
      
      // Try to extract information using regex patterns
      const descriptionMatch = text.match(/(?:description|job description):(.*?)(?:required skills:|skills:|$)/si);
      if (descriptionMatch && descriptionMatch[1]) {
        description = descriptionMatch[1].trim();
      }
      
      // Extract skills (expect a comma-separated list)
      const skillsMatch = text.match(/(?:required skills|skills):(.*?)(?:responsibilities:|main responsibilities:|$)/si);
      if (skillsMatch && skillsMatch[1]) {
        skills = skillsMatch[1].trim()
          .split(',')
          .map(s => s.trim())
          .filter(s => s && !s.includes('?') && s.length > 2);
      }
      
      // If no skills were found or they look like questions, create a default set based on the job title
      if (skills.length === 0 || skills.some(s => s.includes('?'))) {
        console.warn("Skills parsing failed, using defaults for", request.title);
        skills = this.getDefaultSkillsForPosition(request.title);
      }
      
      // Extract responsibilities (expect bullet points or numbered list)
      const respMatch = text.match(/(?:responsibilities|main responsibilities):(.*?)(?:ideal candidate:|candidate profile:|$)/si);
      if (respMatch && respMatch[1]) {
        responsibilities = respMatch[1].trim()
          .split(/\n|•|-|\d+\./)  // Split by new lines or bullet points
          .map(r => r.trim())
          .filter(r => r && r.length > 5)
          .slice(0, 6);  // Limit to 6 items
      }
      
      // If responsibilities look like questions or aren't found, use defaults
      if (responsibilities.length === 0 || responsibilities.some(r => r.endsWith('?'))) {
        console.warn("Responsibilities parsing failed, using defaults");
        responsibilities = this.getDefaultResponsibilities(request.title);
      }
      
      // Extract ideal candidate profile
      const candidateMatch = text.match(/(?:ideal candidate|candidate profile):(.*?)(?:screening questions:|interview questions:|questions:|$)/si);
      if (candidateMatch && candidateMatch[1]) {
        idealCandidate = candidateMatch[1].trim();
      }
      
      // Extract screening questions
      const questionsMatch = text.match(/(?:screening questions|interview questions|questions):(.*?)$/si);
      if (questionsMatch && questionsMatch[1]) {
        screeningQuestions = questionsMatch[1].trim()
          .split(/\n|•|-|\d+\./)
          .map(q => q.trim())
          .filter(q => q && q.endsWith('?') && q.length > 10)
          .slice(0, 3);
      }
      
      // If we couldn't extract all sections properly, log an error
      if (!description || !idealCandidate || screeningQuestions.length === 0) {
        console.warn("Some sections couldn't be extracted properly from AI response");
      }
      
      return {
        description: description || 'We are looking for a talented professional for this position in the blockchain/Web3 industry.',
        requiredSkills: skills,
        responsibilities: responsibilities,
        idealCandidate: idealCandidate || 'The ideal candidate is passionate about blockchain technology with relevant experience.',
        screeningQuestions: screeningQuestions.length > 0 ? screeningQuestions : [
          `What experience do you have with ${request.title} roles in the blockchain/Web3 space?`,
          'How do you stay updated on the latest industry trends?',
          'Describe a challenging project you worked on and how you overcame obstacles.'
        ],
      };
    } catch (error) {
      console.error('Error generating job description:', error);
      
      // Return a fallback response with error information
      return {
        description: 'Could not generate description. Please try again later.',
        requiredSkills: [],
        responsibilities: [],
        idealCandidate: '',
        screeningQuestions: [],
      };
    }
  },
    // Fallback method that uses templates if the API is unavailable
  getTemplateDescription(jobTitle: string | JobSuggestionRequest): JobSuggestionResponse {
    // Handle if we got a full request object instead of just the title
    const title = typeof jobTitle === 'string' ? jobTitle : jobTitle.title;
    const templates: Record<string, JobSuggestionResponse> = {
      default: {
        description: `We are looking for a talented professional to join our team in the blockchain and web3 space.`,
        requiredSkills: ['Blockchain', 'Web3', 'Smart Contracts', 'DeFi', 'Cryptocurrencies'],
        responsibilities: [
          'Develop and implement blockchain solutions',
          'Collaborate with cross-functional teams',
          'Stay up-to-date with industry trends',
          'Contribute to product development'
        ],
        idealCandidate: 'The ideal candidate is passionate about blockchain technology with a strong technical background.',
        screeningQuestions: [
          'What experience do you have with blockchain technology?',
          'Describe a challenging project you worked on in the web3 space.',
          'How do you stay updated with the latest developments in cryptocurrency?'
        ]
      },
      developer: {
        description: `We are seeking a Blockchain Developer to design, implement, and support blockchain-based solutions. You will be responsible for developing and optimizing smart contracts, dApps, and maintaining blockchain protocols.`,
        requiredSkills: ['Solidity', 'Web3.js', 'Smart Contracts', 'Ethereum', 'JavaScript', 'React'],
        responsibilities: [
          'Develop and deploy smart contracts',
          'Build decentralized applications (dApps)',
          'Implement security best practices for blockchain solutions',
          'Collaborate with product and design teams'
        ],
        idealCandidate: 'The ideal candidate has hands-on experience with Ethereum development, strong understanding of blockchain fundamentals, and excellent problem-solving skills.',
        screeningQuestions: [
          'What experience do you have with Solidity and smart contract development?',
          'Describe a security vulnerability you encountered in a smart contract and how you addressed it.',
          'How would you optimize gas costs for a complex smart contract?'
        ]
      }
    };
      // Try to find a matching template or use the default
    const lowerTitle = typeof title === 'string' ? title.toLowerCase() : '';
    let template = templates.default;
    
    if (lowerTitle.includes('developer') || lowerTitle.includes('engineer')) {
      template = templates.developer;
    }
    
    return template;
  },
    // Helper method to get default skills based on job title
  getDefaultSkillsForPosition(title: string): string[] {
    const lowerTitle = title.toLowerCase();
    
    // Default skills for common blockchain positions
    if (lowerTitle.includes('developer') || lowerTitle.includes('engineer')) {
      return ['Solidity', 'Web3.js', 'Smart Contracts', 'Ethereum', 'JavaScript', 'React', 'DApp Development'];
    }
    
    if (lowerTitle.includes('marketing') || lowerTitle.includes('growth')) {
      return ['Blockchain Marketing', 'Community Building', 'Social Media', 'Content Strategy', 'Growth Hacking', 'Web3 Analytics', 'Token Economics'];
    }
    
    if (lowerTitle.includes('design')) {
      return ['UI/UX Design', 'Web3 Interfaces', 'Figma', 'Responsive Design', 'NFT Design', 'Brand Identity', 'User Research'];
    }
    
    if (lowerTitle.includes('product')) {
      return ['Product Management', 'Agile', 'Blockchain Products', 'User Stories', 'Roadmap Planning', 'DeFi Experience', 'Technical Requirements'];
    }
    
    if (lowerTitle.includes('manager')) {
      return ['Team Leadership', 'Project Management', 'Blockchain Knowledge', 'Strategic Planning', 'Stakeholder Management', 'Budgeting', 'Web3 Industry Experience'];
    }
    
    // Default general blockchain skills for any other position
    return ['Blockchain', 'Web3', 'Cryptocurrency', 'DeFi', 'Smart Contracts', 'Communication', 'Problem Solving'];
  },
  
  // Helper method to get default responsibilities based on job title
  getDefaultResponsibilities(title: string): string[] {
    const lowerTitle = title.toLowerCase();
    
    if (lowerTitle.includes('developer') || lowerTitle.includes('engineer')) {
      return [
        'Develop and maintain smart contracts and blockchain applications',
        'Collaborate with cross-functional teams to define and implement new features',
        'Ensure code quality, security, and efficiency in all blockchain implementations',
        'Stay up-to-date with the latest blockchain technologies and best practices'
      ];
    }
    
    if (lowerTitle.includes('marketing') || lowerTitle.includes('growth')) {
      return [
        'Develop and execute marketing strategies for blockchain/Web3 products',
        'Build and engage with the community through various channels',
        'Create compelling content to educate users about our products',
        'Analyze campaign performance and optimize marketing efforts'
      ];
    }
    
    if (lowerTitle.includes('design')) {
      return [
        'Design user interfaces for Web3 applications and websites',
        'Create visual assets for marketing campaigns and product features',
        'Collaborate with developers to implement design solutions',
        'Conduct user research and incorporate feedback into design iterations'
      ];
    }
    
    if (lowerTitle.includes('product')) {
      return [
        'Define product vision, strategy, and roadmap for blockchain products',
        'Work with engineering teams to deliver new features and improvements',
        'Gather and analyze user feedback to inform product decisions',
        'Monitor market trends and competitive landscape in the blockchain space'
      ];
    }
    
    if (lowerTitle.includes('manager')) {
      return [
        'Lead and mentor a team of professionals in the blockchain industry',
        'Define strategies and objectives aligned with company goals',
        'Oversee projects from conception to completion',
        'Build relationships with key stakeholders and partners'
      ];
    }
    
    // Default general responsibilities
    return [
      'Contribute to the development and growth of our blockchain initiatives',
      'Collaborate with team members across different departments',
      'Stay informed about industry trends and emerging technologies',
      'Represent the company at relevant events and community gatherings'
    ];
  },
};

export default aiJobAssistantService;
