export interface OptimizeJobPostInput {
  jobTitle: string;
  jobDescription: string;
  companyName: string;
  companyDescription: string;
  requiredSkills: string;
  jobType: string; // Added field for job type (remote/presential)
  employmentType: string; // Added field for employment type (full-time/part-time)
  location: string; // Added field for location
  category: string; // Added field for category
}

export interface OptimizeJobPostOutput {
  optimizedJobDescription: string;
  suggestedImprovements: string;
}

export async function optimizeJobPost(input: OptimizeJobPostInput): Promise<OptimizeJobPostOutput> {
  // Simulação de otimização de descrição de vaga
  return {
    optimizedJobDescription: `Optimized: ${input.jobDescription}`,
    suggestedImprovements: "Consider adding more details about the required skills.",
  };
}