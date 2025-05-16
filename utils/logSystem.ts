import { db } from "../lib/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

/**
 * Types of actions that can be logged in the system
 */
export type SystemLogAction = 
  | "login" 
  | "logout" 
  | "create" 
  | "update" 
  | "delete" 
  | "approve" 
  | "reject" 
  | "payment" 
  | "admin_action" 
  | "system"
  | "contract_activity"   // Added for contract monitoring
  | "token_distribution"  // Added for token distribution
  | "wallet_alert";       // Added for wallet alerts

/**
 * Interface for system log data
 */
export interface SystemLogData {
  action: SystemLogAction;
  user: string;
  details?: Record<string, any>;
}

/**
 * Logs an action in the system logs
 * @param action Type of action performed
 * @param user ID or name of the user who performed the action
 * @param details Additional details about the action
 * @returns Promise with the ID of the created log or null in case of error
 */
export async function logSystemActivity(
  action: SystemLogAction,
  user: string,
  details: Record<string, any> = {}
): Promise<string | null> {
  try {
    if (!db) {
      console.error("Firebase is not initialized");
      return null;
    }

    // Creates the systemLogs collection if it does not exist
    const logsCollection = collection(db, "systemLogs");

    // Creates the log document
    const logData: SystemLogData & { timestamp: any } = {
      action,
      user,
      details,
      timestamp: serverTimestamp() // Uses server timestamp for consistency
    };

    // Adds the document to the collection
    const docRef = await addDoc(logsCollection, logData);
    console.log(`Log successfully registered: ${action} by ${user}`);
    
    return docRef.id;
  } catch (error) {
    console.error("Error registering log:", error);
    return null;
  }
}

/**
 * Logs an administrative action in the system logs
 * @param adminId Administrator ID
 * @param adminName Administrator name
 * @param action Description of the action performed
 * @param details Additional details about the action
 * @returns Promise with the ID of the created log or null in case of error
 */
export async function logAdminAction(
  adminId: string,
  adminName: string,
  action: string,
  details: Record<string, any> = {}
): Promise<string | null> {
  return logSystemActivity(
    "admin_action",
    adminName || adminId,
    {
      adminId,
      actionDescription: action,
      ...details
    }
  );
}

/**
 * Logs activity related to smart contracts
 * @param contractName Contract name (e.g., "Learn2EarnContract")
 * @param activityType Type of activity (e.g., "claim", "distribution", "transaction")
 * @param details Activity details
 * @returns Promise with the ID of the created log or null in case of error
 */
export async function logContractActivity(
  contractName: string,
  activityType: string,
  details: Record<string, any> = {}
): Promise<string | null> {
  return logSystemActivity(
    "contract_activity",
    contractName,
    {
      activityType,
      ...details
    }
  );
}

/**
 * Logs G33 token distribution activity
 * @param recipient Address that received the tokens
 * @param amount Amount of tokens distributed
 * @param details Additional details about the distribution
 * @returns Promise with the ID of the created log or null in case of error 
 */
export async function logTokenDistribution(
  recipient: string,
  amount: number,
  details: Record<string, any> = {}
): Promise<string | null> {
  return logSystemActivity(
    "token_distribution",
    "G33TokenDistributor",
    {
      recipient,
      amount,
      ...details
    }
  );
}

/**
 * Logs an alert related to the service wallet
 * @param walletAddress Wallet address
 * @param alertType Type of alert (e.g., "low_balance", "high_gas", "suspicious_tx")
 * @param details Alert details
 * @returns Promise with the ID of the created log or null in case of error
 */
export async function logWalletAlert(
  walletAddress: string,
  alertType: string,
  details: Record<string, any> = {}
): Promise<string | null> {
  return logSystemActivity(
    "wallet_alert",
    walletAddress,
    {
      alertType,
      ...details
    }
  );
}

// Utility export for use in other modules
export const logSystem = {
  info: async (message: string, details: Record<string, any> = {}) => {
    return logSystemActivity("system", "SYSTEM", { message, level: "info", ...details });
  },
  warn: async (message: string, details: Record<string, any> = {}) => {
    return logSystemActivity("system", "SYSTEM", { message, level: "warn", ...details });
  },
  error: async (message: string, details: Record<string, any> = {}) => {
    return logSystemActivity("system", "SYSTEM", { message, level: "error", ...details });
  },
  contractActivity: logContractActivity,
  tokenDistribution: logTokenDistribution,
  walletAlert: logWalletAlert,
  adminAction: logAdminAction
};