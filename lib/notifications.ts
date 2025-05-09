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
 * Creates a generic notification in Firestore.
 * @param notification Notification data.
 * @returns Reference to the created document.
 */
export const createNotification = async (notification: NotificationData) => {
  try {
    if (!db) throw new Error("Firestore not initialized");
    if (!notification.userId) {
      console.error("Error: userId is required to create notifications.");
      return null;
    }

    const notificationData = {
      userId: notification.userId,
      title: notification.title,
      body: notification.body,
      type: notification.type || "general",
      read: notification.read || false,      createdAt: serverTimestamp(),
      data: notification.data || {}
    };
    
    const notificationsRef = collection(db, "notifications");
    const docRef = await addDoc(notificationsRef, notificationData);
    console.log(`Notification created successfully: ${docRef.id}`);
    return docRef;
  } catch (error) {
    console.error("Error creating notification:", error);
    throw error;
  }
};

/**
 * Creates a notification for support messages.
 * @param ticketId Support ticket ID.
 * @param userId User ID (seeker or company).
 * @param message Message content.
 * @param senderName Sender name (support).
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
    title: "New support message",
    body: `${senderName}: ${shortenedMessage}`,
    type: "support_message",
    data: { ticketId, message, senderName }
  });
};

/**
 * Creates a notification for ticket status updates.
 * @param ticketId Support ticket ID.
 * @param userId User ID (seeker or company).
 * @param status New ticket status.
 */
export const createTicketStatusNotification = async (
  ticketId: string,
  userId: string,
  status: string
) => {
  await createNotification({
    userId,
    title: "Ticket status update",
    body: `Your ticket status has been updated to: ${status}`,
    type: "ticket_status",
    data: { ticketId, status }
  });
};

/**
 * Creates a notification for tickets accepted by a support agent.
 * @param ticketId Support ticket ID.
 * @param userId User ID (seeker or company).
 * @param agentName Support agent name.
 */
export const createTicketAcceptedNotification = async (
  ticketId: string,
  userId: string,
  agentName: string
) => {
  await createNotification({
    userId,
    title: "Your ticket has been accepted",
    body: `Support agent ${agentName} has accepted your ticket and is ready to help.`,
    type: "ticket_accepted",
    data: { ticketId, agentName }
  });
};