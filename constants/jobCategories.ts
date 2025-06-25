// Job categories used across the application
export const JOB_CATEGORIES = [
  "All",
  "AI",
  "Engineering",
  "Marketing", 
  "Design",
  "Operations",
  "Sales",
  "Product",
  "Finance",
  "DeFi",
  "Web3",
  "Non-Tech",
  "Legal",
  "Security",
  "Developer Relations",
  "Customer Support",
  "Sales & Marketing", 
  "Customer Service",
  "Data",
  "DevOps",
  "Development",
  "Quality Assurance",
  "Research",
  "Content",
  "Community",
  "Business Development",
  "Human Resources",
  "Compliance",
  "Risk Management",
  "Other"
];

// Job categories for dropdowns (excludes "All" option)
export const JOB_CATEGORIES_DROPDOWN = JOB_CATEGORIES.filter(category => category !== "All");

// Job categories for form validation (accepts any from the list)
export const VALID_JOB_CATEGORIES = new Set(JOB_CATEGORIES);

// Function to validate if a category is valid
export const isValidJobCategory = (category: string): boolean => {
  return VALID_JOB_CATEGORIES.has(category);
};
