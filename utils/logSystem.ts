import { db } from "../lib/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

/**
 * Tipos de ações que podem ser registradas no sistema
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
  | "system";

/**
 * Interface para os dados de log do sistema
 */
export interface SystemLogData {
  action: SystemLogAction;
  user: string;
  details?: Record<string, any>;
}

/**
 * Registra uma ação no sistema de logs
 * @param action Tipo de ação realizada
 * @param user ID ou nome do usuário que realizou a ação
 * @param details Detalhes adicionais sobre a ação
 * @returns Promise com o ID do log criado ou null em caso de erro
 */
export async function logSystemActivity(
  action: SystemLogAction,
  user: string,
  details: Record<string, any> = {}
): Promise<string | null> {
  try {
    if (!db) {
      console.error("Firebase não está inicializado");
      return null;
    }

    // Cria a coleção systemLogs se ela não existir
    const logsCollection = collection(db, "systemLogs");

    // Cria o documento de log
    const logData: SystemLogData & { timestamp: any } = {
      action,
      user,
      details,
      timestamp: serverTimestamp() // Usa o timestamp do servidor para consistência
    };

    // Adiciona o documento à coleção
    const docRef = await addDoc(logsCollection, logData);
    console.log(`Log registrado com sucesso: ${action} por ${user}`);
    
    return docRef.id;
  } catch (error) {
    console.error("Erro ao registrar log:", error);
    return null;
  }
}

/**
 * Registra uma ação administrativa no sistema de logs
 * @param adminId ID do administrador
 * @param adminName Nome do administrador
 * @param action Descrição da ação realizada
 * @param details Detalhes adicionais sobre a ação
 * @returns Promise com o ID do log criado ou null em caso de erro
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