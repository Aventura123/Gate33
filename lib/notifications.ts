import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "./firebase";

interface NotificationData {
  userId: string;
  title: string;
  body: string;
  type: string;
  read?: boolean;
  data?: any;
}

/**
 * Cria uma notificação genérica no Firestore.
 * @param notification Dados da notificação.
 * @returns Referência do documento criado.
 */
export const createNotification = async (notification: NotificationData) => {
  try {
    if (!db) throw new Error("Firestore não inicializado");
    if (!notification.userId) {
      console.error("Erro: userId é obrigatório para criar notificações.");
      return null;
    }

    const notificationData = {
      userId: notification.userId,
      title: notification.title,
      body: notification.body,
      type: notification.type || "general",
      read: notification.read || false,
      createdAt: serverTimestamp(),
      data: notification.data || {}
    };

    const notificationsRef = collection(db, "notifications");
    const docRef = await addDoc(notificationsRef, notificationData);

    console.log(`Notificação criada com sucesso: ${docRef.id}`);
    return docRef;
  } catch (error) {
    console.error("Erro ao criar notificação:", error);
    throw error;
  }
};

/**
 * Cria uma notificação para mensagens de suporte.
 * @param ticketId ID do ticket de suporte.
 * @param userId ID do usuário (seeker ou company).
 * @param message Conteúdo da mensagem.
 * @param senderName Nome do remetente (suporte).
 */
export const createSupportMessageNotification = async (
  ticketId: string,
  userId: string,
  message: string,
  senderName: string
) => {
  const shortenedMessage = message.length > 50 ? `${message.substring(0, 47)}...` : message;
  await createNotification({
    userId,
    title: "Nova mensagem de suporte",
    body: `${senderName}: ${shortenedMessage}`,
    type: "support_message",
    data: { ticketId, message, senderName }
  });
};

/**
 * Cria uma notificação para atualizações de status de tickets.
 * @param ticketId ID do ticket de suporte.
 * @param userId ID do usuário (seeker ou company).
 * @param status Novo status do ticket.
 */
export const createTicketStatusNotification = async (
  ticketId: string,
  userId: string,
  status: string
) => {
  await createNotification({
    userId,
    title: "Atualização no status do ticket",
    body: `O status do seu ticket foi atualizado para: ${status}`,
    type: "ticket_status",
    data: { ticketId, status }
  });
};

/**
 * Cria uma notificação para tickets aceitos por um agente de suporte.
 * @param ticketId ID do ticket de suporte.
 * @param userId ID do usuário (seeker ou company).
 * @param agentName Nome do agente de suporte.
 */
export const createTicketAcceptedNotification = async (
  ticketId: string,
  userId: string,
  agentName: string
) => {
  await createNotification({
    userId,
    title: "Seu ticket foi aceito",
    body: `O agente de suporte ${agentName} aceitou seu ticket e está pronto para ajudar.`,
    type: "ticket_accepted",
    data: { ticketId, agentName }
  });
};