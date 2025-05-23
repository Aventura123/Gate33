import { getFirestore } from "firebase-admin/firestore";

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
  | "contract_activity"
  | "token_distribution"
  | "wallet_alert";

export interface SystemLogData {
  action: SystemLogAction;
  user: string;
  details?: Record<string, any>;
}

export async function logSystemActivity(
  action: SystemLogAction,
  user: string,
  details: Record<string, any> = {}
): Promise<string | null> {
  try {
    const db = getFirestore();
    const logsCollection = db.collection("systemLogs");
    const logData: SystemLogData & { timestamp: any } = {
      action,
      user,
      details,
      timestamp: new Date()
    };
    const docRef = await logsCollection.add(logData);
    console.log(`Log successfully registered: ${action} by ${user}`);
    return docRef.id;
  } catch (error) {
    console.error("Error registering log:", error);
    return null;
  }
}
