// Utility functions for page metadata
export const getPageTitle = (pageName?: string): string => {
  const baseTitle = "Gate33";
  if (!pageName) {
    return `${baseTitle} - Your Gateway to Trusted Web3 Opportunities`;
  }
  return `${baseTitle} - ${pageName}`;
};

export const pageConfig = {
  home: "Your Gateway to Trusted Web3 Opportunities",
  jobs: "Jobs",
  "instant-jobs": "Instant Jobs",
  "crypto-tools": "Crypto Tools", 
  "nft": "NFT",
  "learn2earn": "Learn2Earn",
  "company-register": "Company Registration",
  "seeker-signup": "Job Seeker Signup",
  "company-dashboard": "Company Dashboard",
  "seeker-dashboard": "Seeker Dashboard",
  "admin": "Admin Dashboard",
  "login": "Login",
  "donate": "Donate",
  "contact": "Contact",
  "about": "About",
  "faq": "FAQ"
};

// Function to get page title based on pathname
export const getTitleFromPath = (pathname: string): string => {
  // Remove leading slash and get the first segment
  const path = pathname.replace(/^\//, '').split('/')[0];
  
  if (!path || path === '') {
    return getPageTitle(); // Homepage
  }
  
  const pageName = pageConfig[path as keyof typeof pageConfig];
  return getPageTitle(pageName || path.charAt(0).toUpperCase() + path.slice(1));
};
