import { getFirestore, collection, doc, updateDoc, addDoc, Timestamp, FieldValue, getDoc, getDocs, increment } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { web3Service } from './web3Service';
import smartContractService from './smartContractService';
import axios from 'axios';

// Ensure Firestore is initialized
const firestore = getFirestore();

interface JobPaymentInfo {
  jobId: string;
  planId: string;
  transactionHash: string;
  amount: number;
  currency: string;
  paidAt: Timestamp;
  expiresAt: Timestamp;
  status: 'pending' | 'confirmed' | 'failed' | 'expired';
}

// Interface for document snapshot
interface DocSnap {
  ref: any;
  data: () => any;
}

class JobService {
  /**
   * Updates the status of a job after payment
   */
  async updateJobAfterPayment(
    jobId: string, 
    planId: string, 
    transactionHash: string
  ): Promise<boolean> {
    try {
      // 1. Check if the job exists
      const jobRef = doc(firestore, 'jobs', jobId);
      const jobSnap = await getDoc(jobRef);
      
      if (!jobSnap.exists()) {
        throw new Error(`Job not found: ${jobId}`);
      }
      
      // 2. Check if the plan exists
      const planRef = doc(firestore, 'jobPlans', planId);
      const planSnap = await getDoc(planRef);
      
      if (!planSnap.exists()) {
        throw new Error(`Plan not found: ${planId}`);
      }
      
      const planData = planSnap.data();
      
      // 3. Get transaction status
      const txStatus = await web3Service.checkTransactionStatus(transactionHash);
      
      if (txStatus === 'failed') {
        throw new Error('The transaction failed on the blockchain');
      }
      
      // 4. Calculate expiration date based on plan duration
      const duration = planData.duration || 30; // Duration in days, default: 30 days
      const now = new Date();
      const expirationDate = new Date();
      expirationDate.setDate(now.getDate() + duration);
      
      // 5. Get distribution info from contract
      let distribution = {};
      let distributionPercentages = {};
      let distributionAddresses = {};
      let totalDistributed = 0;
      try {
        // Get percentages and addresses from contract
        const percentages = await smartContractService.getDistributionPercentages();
        const feeCollector = await smartContractService.getFeeCollector();
        const developmentWallet = await smartContractService.getDevelopmentWallet();
        const charityWallet = await smartContractService.getCharityWallet();
        const evolutionWallet = await smartContractService.getEvolutionWallet();
        
        // Calculate distributed values
        const amount = planData.price;
        const fee = (amount * (percentages.feePercentage || 0)) / 1000;
        const development = (amount * (percentages.developmentPercentage || 0)) / 1000;
        const charity = (amount * (percentages.charityPercentage || 0)) / 1000;
        const evolution = (amount * (percentages.evolutionPercentage || 0)) / 1000;
        totalDistributed = fee + development + charity + evolution;
        
        distribution = {
          feeCollector: { address: feeCollector, amount: fee },
          development: { address: developmentWallet, amount: development },
          charity: { address: charityWallet, amount: charity },
          evolution: { address: evolutionWallet, amount: evolution },
          totalDistributed,
          mainRecipient: { amount: amount - totalDistributed }
        };
        distributionPercentages = {
          feePercentage: percentages.feePercentage,
          developmentPercentage: percentages.developmentPercentage,
          charityPercentage: percentages.charityPercentage,
          evolutionPercentage: percentages.evolutionPercentage,
          totalPercentage: percentages.totalPercentage
        };
        distributionAddresses = {
          feeCollector,
          developmentWallet,
          charityWallet,
          evolutionWallet
        };      } catch (err) {
        console.error('Error getting contract distribution:', err);
      }
      
      // 6. Update job status
      await updateDoc(jobRef, {
        status: 'active',
        paid: true,
        planId: planId,
        planName: planData.name,
        planPrice: planData.price,
        planCurrency: planData.currency,
        isPremium: planData.isPremium || false,
        isTopListed: planData.isTopListed || false,
        transactionHash: transactionHash,
        paidAt: Timestamp.fromDate(now),
        expiresAt: Timestamp.fromDate(expirationDate),
        lastUpdated: Timestamp.fromDate(now)
      });
      
      // 7. Record payment in history (with distribution)
      const paymentInfo: any = {
        jobId,
        planId,
        transactionHash,
        amount: planData.price,
        currency: planData.currency,
        paidAt: Timestamp.fromDate(now),
        expiresAt: Timestamp.fromDate(expirationDate),
        status: txStatus,
        distribution,
        distributionPercentages,
        distributionAddresses
      };
      
      await addDoc(collection(firestore, 'jobPayments'), paymentInfo);
      
      return true;
    } catch (error) {
      console.error('Error updating job after payment:', error);
      throw error;
    }
  }

  /**
   * Periodically checks the status of pending transactions
   * This function can be called by a cron job or a serverless function
   */
  async checkPendingTransactions(): Promise<void> {
    try {
      // Fetch payments with pending status
      const pendingPaymentsQuery = collection(firestore, 'jobPayments');
      const pendingPaymentsSnapshot = await getDocs(pendingPaymentsQuery);
      
      const promises = pendingPaymentsSnapshot.docs.map(async (docSnap: DocSnap) => {
        const payment = docSnap.data() as JobPaymentInfo;
        const txStatus = await web3Service.checkTransactionStatus(payment.transactionHash);
        
        if (txStatus !== 'pending') {
          // Update payment status
          await updateDoc(docSnap.ref, { status: txStatus });
          
          if (txStatus === 'confirmed') {
            // If confirmed, update the job
            const jobRef = doc(firestore, 'jobs', payment.jobId);
            await updateDoc(jobRef, { status: 'active', paid: true });
          }
        }
      });
      
      await Promise.all(promises);
    } catch (error) {
      console.error('Error checking pending transactions:', error);
    }
  }

  /**
   * Renews an existing job
   */
  async renewJob(jobId: string, planId: string, transactionHash: string): Promise<boolean> {
    try {
      const result = await this.updateJobAfterPayment(jobId, planId, transactionHash);
      
      if (result) {
        // Additional renewal-specific logic, if necessary
        const jobRef = doc(firestore, 'jobs', jobId);
        await updateDoc(jobRef, {
          renewedAt: Timestamp.now(),
          renewCount: increment(1)
        });
      }
      
      return result;
    } catch (error) {
      console.error('Error renewing job:', error);
      throw error;
    }
  }

  /**
   * Processes a job payment using the unified provider/signer logic
   * @param planId Pricing plan ID
   * @param amount Payment amount
   * @param companyId Company ID
   * @param network (optional) Forced network (for WalletConnect)
   * @returns Transaction result
   */
  async processJobPayment(planId: string, amount: number, companyId: string, network?: string) {
    // Ensure robust provider/signer selection for all payment flows
    if (!network) {
      // This warning helps catch legacy/incorrect usage in dev/test
      console.warn('[jobService] processJobPayment called without network. Ensure correct network is always selected!');
    }
    // This delegates to smartContractService, which uses the unified provider/signer logic
    return await smartContractService.processJobPayment(planId, amount, companyId, network);
  }

  /**
   * Processes a job payment with USDT using the unified provider/signer logic
   * @param planId Pricing plan ID
   * @param amount Payment amount
   * @param companyId Company ID
   * @param network (optional) Forced network (for WalletConnect)
   * @returns Transaction result
   */
  async processJobPaymentWithUSDT(planId: string, amount: number, companyId: string, network?: string) {
    // Ensure robust provider/signer selection for all payment flows
    if (!network) {
      // This warning helps catch legacy/incorrect usage in dev/test
      console.warn('[jobService] processJobPaymentWithUSDT called without network. Ensure correct network is always selected!');
    }
    // This delegates to smartContractService, which uses the unified provider/signer logic
    return await smartContractService.processJobPaymentWithUSDT(planId, amount, companyId, network);
  }
}

export const jobService = new JobService();
export default jobService;

export const fetchJobs = async (): Promise<any> => {
  try {
    const response = await axios.get('/api/jobs');
    return response.data;
  } catch (error) {
    console.error('Error fetching jobs:', error);
    throw new Error('Failed to fetch jobs. Please try again later.');
  }
};

export const createJob = async (jobData: any): Promise<any> => {
  try {
    const response = await axios.post('/api/jobs', jobData);
    return response.data;
  } catch (error) {
    console.error('Error creating job:', error);
    throw new Error('Failed to create job. Please check your input and try again.');
  }
};

export const deleteJob = async (jobId: string): Promise<void> => {
  try {
    await axios.delete(`/api/jobs/${jobId}`);
  } catch (error) {
    console.error('Error deleting job:', error);
    throw new Error('Failed to delete job. Please try again later.');
  }
};