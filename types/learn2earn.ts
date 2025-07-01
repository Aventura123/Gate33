import { Timestamp } from 'firebase/firestore';

// Define task types for Learn2Earn
export interface Learn2EarnTask {
  id: string;
  type: 'content' | 'question';
  title: string;
  description: string;
  videoUrl?: string;
  contentText?: string;
  question?: string;
  options?: string[];
  correctOption?: number;
  contentType?: 'full' | 'link';
  externalUrl?: string;
  linkTitle?: string;
  linkDescription?: string;
  resourceType?: 'website' | 'video' | 'document' | 'article';
}

// Define the main Learn2Earn interface
export interface Learn2Earn {
  id: string; // The Firestore document ID
  title: string;
  description: string;
  tokenSymbol: string; // e.g., "ETH", "USDT"
  tokenAmount: number;
  tokenAddress: string;
  tokenPerParticipant: number;
  totalParticipants: number;
  maxParticipants?: number;
  startDate: Date | Timestamp | string | null;
  endDate: Date | Timestamp | string | null;
  tasks: Learn2EarnTask[];
  status: 'active' | 'paused' | 'completed' | 'draft';
  companyId: string;
  contractAddress?: string;  transactionHash?: string;
  createdAt?: Date | Timestamp | string;
  updatedAt?: Date | Timestamp | string;
  deletedAt?: Date | Timestamp | string;
  learn2earnId?: string | number;
  firebaseId?: string; // The ID passed to the contract during creation for reference
  contractId?: number; // The numeric ID in the blockchain contract (replacing learn2earnId)
  network?: string;
  socialLinks?: {
    discord?: string;
    telegram?: string;
    twitter?: string;
    website?: string;
  }
}

// Define an interface for creating a new Learn2Earn (omitting id and companyId)
export type NewLearn2Earn = Omit<Learn2Earn, 'id' | 'companyId'>;
