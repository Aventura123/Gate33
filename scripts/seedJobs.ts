// Script to create 5 test jobs for companyId "company-susana1-1745631109298" with special plan
// Run with: npx ts-node scripts/seedJobs.ts
// Compile and run: npx tsc scripts/seedJobs.ts && node scripts/seedJobs.js

import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, collection, addDoc, Timestamp } from 'firebase/firestore/lite';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyBUZ-F0kzPxRdlSkBacI2AnlNe8_-BuSZo",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "gate33-b5029.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "gate33-b5029",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "gate33-b5029.appspot.com",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "823331487278",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:823331487278:web:932f2936eef09e37c3a9bf"
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApps()[0];
const db = getFirestore(app);

// Common data for all jobs
const commonCompanyData = {
  companyId: 'company-susana1-1745631109298',
  companyName: 'Gate33 Tech',
  companyWebsite: 'https://gate33.tech',
  companyDescription: 'An innovative company focused on blockchain and web3 technologies.',
  companyLocation: 'Lisbon, Portugal',
  contactEmail: 'careers@gate33tech.com',
  managerName: 'Susana Ferreira',
  paid: true,
  status: 'active',
  createdAt: Timestamp.now(),
  expiresAt: Timestamp.fromDate(new Date(Date.now() + 30*24*60*60*1000)),
};

const jobs = [
  {
    // Job 1: Featured in Social Media
    title: 'Senior Solidity Developer',
    description: 'We are looking for a Senior Solidity Developer with DeFi experience to lead the development of our smart contracts. The ideal candidate will have solid experience in Ethereum, Solidity, and secure contract architecture.',
    shortDescription: 'Develop secure and efficient smart contracts for DeFi projects.',
    category: 'Development',
    location: 'Remote',
    jobType: 'Full-time',
    salary: '€70k - €90k',
    salaryRange: '€70k - €90k',
    experienceLevel: 'Senior',
    blockchainExperience: 'Advanced',
    remoteOption: 'Full Remote',
    requiredSkills: 'Solidity, Ethereum, Smart Contracts, DeFi, Web3.js, Hardhat, OpenZeppelin, Security Auditing',
    responsibilities: 'Develop high-quality smart contracts, conduct security audits, implement DeFi protocols, collaborate with frontend teams.',
    idealCandidate: 'Professional with at least 3 years of experience in Solidity, deep knowledge of blockchain security, and involvement in DeFi projects.',
    planId: 'test-plan-socmed',
    planName: 'Social Media Premium',
    planDuration: 30,
    planCurrency: 'EUR',
    socialMediaPromotion: 4,
    socialMediaPromotionCount: 0,
    isTopListed: false,
    highlightedInNewsletter: false,
    featured: false,
    screeningQuestions: [
      'Which DeFi projects have you worked on?',
      'Describe how you approach security in smart contracts',
      'What was the most challenging Solidity project you have developed?'
    ],
    ...commonCompanyData
  },  {
    // Job 2: Featured in Newsletter
    title: 'Full Stack Blockchain Developer',
    description: 'We are looking for a Full Stack developer focused on blockchain to create intuitive user interfaces and integrate them with our backend and blockchain infrastructure. The ideal candidate will combine modern frontend skills (React/Next.js) with blockchain integration knowledge.',
    shortDescription: 'Create modern interfaces for blockchain applications.',
    category: 'Development',
    location: 'Lisbon',
    jobType: 'Full-time',
    salary: '€50k - €75k',
    salaryRange: '€50k - €75k',
    experienceLevel: 'Mid-Senior',
    blockchainExperience: 'Intermediate',
    remoteOption: 'Hybrid',
    requiredSkills: 'React, TypeScript, Next.js, Ethers.js, Web3 Integration, Node.js, GraphQL, Tailwind CSS',
    responsibilities: 'Develop responsive user interfaces, implement blockchain wallet integration, optimize performance, collaborate with designers and blockchain developers.',
    idealCandidate: 'Developer with good experience in React and TypeScript, familiarity with blockchain libraries, and passion for creating excellent UX for web3 products.',
    planId: 'test-plan-newsletter',
    planName: 'Newsletter Featured',
    planDuration: 30,
    planCurrency: 'EUR',
    socialMediaPromotion: 0,
    socialMediaPromotionCount: 0,
    isTopListed: false,
    highlightedInNewsletter: true,
    featured: false,
    applicationLink: 'https://gate33tech.com/careers/fullstack',
    screeningQuestions: [
      'Which Web3 projects have you worked on?',
      'Explain how you would implement MetaMask integration in a React app',
      'How do you handle performance optimization in Next.js applications?'
    ],
    ...commonCompanyData
  },  {
    // Job 3: Top Listed
    title: 'Product Manager - Crypto Exchange',
    description: 'We are looking for an experienced Product Manager to lead the development of our new exchange platform. The ideal candidate will have experience with financial products, understanding of the crypto market, and the ability to lead multidisciplinary teams.',
    shortDescription: 'Lead the development of our exchange platform.',
    category: 'Management',
    location: 'Porto',
    jobType: 'Full-time',
    salary: '€65k - €85k',
    salaryRange: '€65k - €85k',
    experienceLevel: 'Senior',
    blockchainExperience: 'Intermediate',
    remoteOption: 'Hybrid',
    requiredSkills: 'Product Management, Agile, Crypto Markets, UX Design, Business Strategy, Stakeholder Management',
    responsibilities: 'Define product roadmap, coordinate between technical and business teams, analyze market and competitors, define success metrics and KPIs.',
    idealCandidate: 'Professional with experience in fintech/crypto product management, sufficient technical understanding to communicate with developers, and strategic business vision.',
    planId: 'test-plan-toplisted',
    planName: 'Top Listed Premium',
    planDuration: 30,
    planCurrency: 'EUR',
    socialMediaPromotion: 0,
    socialMediaPromotionCount: 0,
    isTopListed: true,
    highlightedInNewsletter: false,
    featured: false,
    screeningQuestions: [
      'What is your experience with financial or crypto products?',
      'How do you prioritize features in a roadmap?',
      'Describe how you would handle conflicting requirements between technical and business teams'
    ],
    ...commonCompanyData
  },  {
    // Job 4: Featured in Job Listing
    title: 'UI/UX Designer - Web3 Applications',
    description: 'We are looking for a UI/UX designer passionate about creating amazing experiences for web3 applications. The ideal candidate will combine visual design skills with UX knowledge for blockchain technologies, creating interfaces that make the technology accessible to all users.',
    shortDescription: 'Create amazing designs for web3 applications that captivate users.',
    category: 'Design',
    location: 'Lisbon',
    jobType: 'Contract',
    salary: '€45k - €65k',
    salaryRange: '€45k - €65k',
    experienceLevel: 'Mid-Senior',
    blockchainExperience: 'Basic',
    remoteOption: 'Full Remote',
    requiredSkills: 'Figma, Adobe Creative Suite, Wireframing, Prototyping, User Research, Design Systems, Web3 UI Patterns',
    responsibilities: 'Create interactive prototypes, develop design systems, conduct user research, simplify complex blockchain flows for end users.',
    idealCandidate: 'Designer with proven experience in UX/UI for digital products, ideally with exposure to fintech or blockchain products, with a portfolio demonstrating user-centered design.',
    planId: 'test-plan-featured',
    planName: 'Featured Listing Premium',
    planDuration: 30,
    planCurrency: 'EUR',
    socialMediaPromotion: 0,
    socialMediaPromotionCount: 0,
    isTopListed: false,
    highlightedInNewsletter: false,
    featured: true,
    applicationLink: 'https://gate33tech.com/careers/design',
    screeningQuestions: [
      'Share a link to your portfolio',
      'How would you simplify an interface for a DEX?',
      'What unique challenges do you see in designing for web3 applications?'
    ],
    ...commonCompanyData
  },  {
    // Job 5: All features enabled - Premium
    title: 'CTO / Technical Co-Founder',
    description: 'We are looking for a CTO/Co-founder to lead our technical team and help define the company\'s technical vision. The ideal candidate will combine deep technical knowledge in blockchain and web3 with leadership skills and product vision.',
    shortDescription: 'Lead our technical team and define the company\'s technology vision.',
    category: 'Executive',
    location: 'Lisbon',
    jobType: 'Full-time',
    salary: '€90k - €120k',
    salaryRange: '€90k - €120k',
    experienceLevel: 'Executive',
    blockchainExperience: 'Expert',
    remoteOption: 'Hybrid',
    requiredSkills: 'Blockchain Architecture, Team Leadership, Technical Strategy, Ethereum, DeFi, Smart Contract Security, Scalability Solutions, DAO Governance',
    responsibilities: 'Define technical strategy, lead development team, make architecture decisions, manage infrastructure, collaborate with stakeholders and investors.',
    idealCandidate: 'Technology leader with at least 5 years of blockchain experience, proven track record of building and leading technical teams, and startup experience.',
    planId: 'test-plan-premium',
    planName: 'Complete Premium Package',
    planDuration: 30,
    planCurrency: 'EUR',
    socialMediaPromotion: 4,
    socialMediaPromotionCount: 0,
    isTopListed: true,
    highlightedInNewsletter: true,
    featured: true,
    screeningQuestions: [
      'What is your previous experience as a CTO or technical leader?',
      'How would you approach the scalability of a blockchain application?',
      'Which blockchain technologies do you believe will have the greatest impact in the next 5 years?',
      'Share your experience managing technical teams in a startup environment'
    ],
    ...commonCompanyData
  },  {
    // Job 6: Basic without promotions
    title: 'Junior Blockchain Developer',
    description: 'We are hiring a Junior Blockchain Developer to join our growing team. This is a perfect opportunity for early career developers who want to enter the blockchain and web3 world.',
    shortDescription: 'Start your blockchain development career with our team.',
    category: 'Development',
    location: 'Remote',
    jobType: 'Full-time',
    salary: '€30k - €45k',
    salaryRange: '€30k - €45k',
    experienceLevel: 'Junior',
    blockchainExperience: 'Basic',
    remoteOption: 'Full Remote',
    requiredSkills: 'JavaScript/TypeScript, React, Basic Solidity, Ethers.js/Web3.js, Git',
    responsibilities: 'Develop features for our web3 products, implement blockchain integrations, write tests, contribute to technical documentation, continuously learn about blockchain technologies.',
    idealCandidate: 'Early career developer with basic blockchain knowledge, strong foundation in JavaScript/TypeScript, and willingness to learn and grow in the web3 area.',
    planId: 'test-plan-basic',
    planName: 'Basic Listing',
    planDuration: 30,
    planCurrency: 'EUR',
    socialMediaPromotion: 0,
    socialMediaPromotionCount: 0,
    isTopListed: false,
    highlightedInNewsletter: false,
    featured: false,
    ...commonCompanyData
  }
];

async function seedJobs() {
  for (const job of jobs) {
    const docRef = await addDoc(collection(db, 'jobs'), job);
    console.log(`Job created with ID: ${docRef.id}`);
  }
  process.exit(0);
}

seedJobs().catch((err) => {
  console.error('Error seeding jobs:', err);
  process.exit(1);
});
