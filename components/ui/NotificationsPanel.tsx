"use client";

import { BellIcon, TrashIcon } from '@heroicons/react/24/outline';
import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { collection, query, where, getDocs, orderBy, updateDoc, doc, deleteDoc, Query, DocumentData } from "firebase/firestore";
import { db } from "../../lib/firebase";

interface Notification {
  id: string;
  title: string;
  body: string;
  type: string;
  read: boolean;
  createdAt: any;
  data?: any;
}

const POLL_INTERVAL = 10000; // 10 seconds

interface NotificationsPanelProps {
  userId?: string;
  companyId?: string;
  adminId?: string; // Support for adminId
  open?: boolean;
  onClose?: () => void;
  overlay?: boolean;
}

export function NotificationBell({ unreadCount, onClick }: { unreadCount: number; onClick: () => void }) {
  return (
    <button
      className="relative focus:outline-none"
      onClick={onClick}
      aria-label="Notifications"
    >
      <BellIcon className="h-7 w-7 text-orange-400 hover:text-orange-300 transition" />
      {unreadCount > 0 && (
        <span className="absolute -top-1 -right-1 bg-red-600 text-white text-xs rounded-full px-1.5 py-0.5 font-bold">{unreadCount}</span>
      )}
    </button>
  );
}

export default function NotificationsPanel({ userId, companyId, adminId, open, onClose, overlay }: NotificationsPanelProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const unreadCount = notifications.filter(n => !n.read).length;
  
  // Determine user type for custom title
  const userType = userId ? 'user' : (companyId ? 'company' : (adminId ? 'admin' : ''));
  
  const fetchNotifications = async () => {
    if (!userId && !companyId && !adminId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      // Determine which notification collection to use
      const collectionName = adminId ? "adminNotifications" : "notifications";
      const notificationsRef = collection(db, collectionName);
      
      // Initialize allNotifications as an array that we'll populate
      let allNotifications: Array<any> = [];
      
      let q: Query<DocumentData> | undefined = undefined;
      if (userId) {
        q = query(
          notificationsRef,
          where("userId", "==", userId),
          orderBy("createdAt", "desc")
        );
      } else if (companyId) {
        q = query(
          notificationsRef,
          where("companyId", "==", companyId),
          orderBy("createdAt", "desc")
        );      } else if (adminId) {
        // For super_admins, fetch all notifications from adminNotifications
        q = query(
          notificationsRef,
          orderBy("createdAt", "desc")
        );
      }
      if (!q) {
        setLoading(false);
        return;
      }        if (q) {
        const snapshot = await getDocs(q);
        const docs = snapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) }));
        allNotifications.push(...docs);
      }

      // Map the notifications to ensure proper formatting
      const mappedNotifications = allNotifications.map((n: any) => {
        // Fallbacks for required fields
        let title = n.title || n.data?.title || '';
        let body = n.body || n.data?.body || '';
        let type = n.type || n.data?.type || 'general';
        // If no title/body, try to build something useful
        if (!title) {
          if (type === 'payment') {
            title = 'New payment received';
            if (n.companyId) title += ` from ${n.companyId}`;
          } else if (type === 'job') {
            title = n.data?.jobTitle || 'New job created';
          } else if (type === 'microtask') {
            title = 'New micro-task created';
          } else {
            title = 'Notification';
          }
        }
        if (!body) {
          if (type === 'payment' && n.amount) {
            body = `Amount: ${n.amount}`;
            if (n.transactionHash) body += `\nTx: ${n.transactionHash}`;
          } else if (type === 'job' && n.data?.jobTitle) {
            body = n.data.jobTitle;
          } else if (type === 'microtask' && n.data?.description) {
            body = n.data.description;
          } else if (n.message) {
            body = n.message;
          }
        }
        let read = typeof n.read === 'boolean' ? n.read : (typeof n.data?.read === 'boolean' ? n.data.read : false);
        let createdAt: any = '';
        if (n.createdAt) {
          if (typeof n.createdAt.toDate === 'function') {
            createdAt = n.createdAt.toDate();
          } else if (typeof n.createdAt === 'string') {
            createdAt = new Date(n.createdAt);
          }
        } else if (n.data?.createdAt) {
          if (typeof n.data.createdAt.toDate === 'function') {
            createdAt = n.data.createdAt.toDate();
          } else if (typeof n.data.createdAt === 'string') {
            createdAt = new Date(n.data.createdAt);
          }
        }
        return {
          id: n.id,
          title,
          body,
          type,
          read,
          createdAt,
          data: n.data || {}
        };
      });
      
      setNotifications(mappedNotifications);
    } catch (err) {
      setNotifications([]);
    }
    setLoading(false);
  };
  useEffect(() => {
    // Only execute if userId, companyId, or adminId are defined
    if (!userId && !companyId && !adminId) return;
    fetchNotifications();
    const interval = setInterval(fetchNotifications, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [userId, companyId, adminId]);
  const markAsRead = async (id: string) => {
    try {
      // Determine which collection to use
      const collectionName = adminId ? "adminNotifications" : "notifications";
      await updateDoc(doc(db, collectionName, id), { read: true });
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    } catch (error) {
    }
  };
  const clearAllNotifications = async () => {
    setLoading(true);
    try {
      // Determine which collection to use
      const collectionName = adminId ? "adminNotifications" : "notifications";
      const notificationsRef = collection(db, collectionName);
      const q = query(notificationsRef, orderBy("createdAt", "desc"));
      const snapshot = await getDocs(q);
      
      // Criando array tipado para armazenar documentos a serem excluídos
      const docsToDelete: Array<{id: string}> = [];
        // Filtrando os documentos conforme o userId, companyId ou adminId
      snapshot.docs.forEach(docSnap => {
        const data = docSnap.data();
        if (userId && data.userId === userId) {
          docsToDelete.push({ id: docSnap.id });
        } else if (companyId && data.companyId === companyId) {
          docsToDelete.push({ id: docSnap.id });
        } else if (adminId) {
          // Para super_admins, excluir todas as notificações de admin
          // Sabemos que todas as notificações de admin são compartilhadas (shared)
          docsToDelete.push({ id: docSnap.id });
        }
      });
      
      const batchDeletes = docsToDelete.map(docToDelete => deleteDoc(doc(db, collectionName, docToDelete.id)));
      await Promise.all(batchDeletes);
      setNotifications([]);
    } catch (err) {
    }
    setLoading(false);
  };

  // Render a single notification item
  const renderNotificationItem = (n: Notification) => {
    // Format the date safely
    const formattedDate = (() => {
      try {
        if (!n.createdAt) return '';
        
        // If it's a Date object
        if (n.createdAt instanceof Date) {
          return n.createdAt.toLocaleString();
        }
        
        // If it has a toDate method (Firestore timestamp)
        if (typeof n.createdAt.toDate === 'function') {
          return n.createdAt.toDate().toLocaleString();
        }
        
        // If it's a string that can be parsed as a date
        return new Date(n.createdAt).toLocaleString();
      } catch (error) {
        return '';
      }
    })();
    
    return (
      <div
        key={n.id}
        className={`p-3 rounded-lg border ${n.read ? 'border-gray-700 bg-black/40' : 'border-orange-500 bg-orange-900/20'} text-white shadow-sm cursor-pointer`}
        tabIndex={0}
        onClick={() => !n.read && markAsRead(n.id)}
        onFocus={() => !n.read && markAsRead(n.id)}
      >
        <div className="font-semibold text-orange-300 mb-1">{n.title || 'Notificação'}</div>
        <div className="text-sm text-gray-200">{n.body}</div>
        <div className="text-xs text-gray-400 mt-1">{formattedDate}</div>
      </div>
    );
  };

  // Drawer overlay mode
  if (overlay && open) {
    return createPortal(
      <div className="fixed inset-0 z-[100] flex justify-end">
        <div className="fixed inset-0 bg-black/80" onClick={onClose} />
        <div className="relative w-full max-w-md h-full bg-[#18120b] border-l border-orange-900 shadow-2xl flex flex-col animate-slide-in-right">
          <div className="flex items-center justify-between p-4 border-b border-orange-900">
            <span className="text-lg font-bold text-orange-400">
              {adminId ? 'Admin Notifications' : 'Notifications'}
            </span>
            <div className="flex items-center gap-2">
              {notifications.length > 0 && (
                <button onClick={clearAllNotifications} className="text-orange-400 hover:text-red-500 transition" title="Clear all notifications" aria-label="Clear all notifications">
                  <TrashIcon className="h-6 w-6" />
                </button>
              )}
              <button onClick={onClose} className="text-orange-400 hover:text-orange-200" title="Close notifications panel" aria-label="Close notifications panel">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {loading ? (
              <div className="text-gray-400 text-center mt-10">Loading...</div>
            ) : notifications.length === 0 ? (
              <div className="text-gray-400 text-center mt-10">
                {adminId ? 'No admin notifications.' : 'No notifications.'}
              </div>
            ) : (
              notifications.map(n => renderNotificationItem(n))
            )}
          </div>
        </div>
      </div>,
      typeof window !== 'undefined' ? document.body : ({} as any)
    );
  }
  // If not in overlay mode, but need to show the panel
  if (!overlay && open) {
    return (
      <div className="notifications-panel bg-[#18120b] border border-orange-900 rounded-lg shadow-xl p-4 w-80 max-h-96 overflow-y-auto">
        <div className="flex items-center justify-between mb-3 border-b border-orange-900 pb-2">
          <span className="text-lg font-bold text-orange-400">Notifications</span>
          <div className="flex items-center gap-2">
            {notifications.length > 0 && (
              <button onClick={clearAllNotifications} className="text-orange-400 hover:text-red-500 transition" title="Clear all notifications">
                <TrashIcon className="h-5 w-5" />
              </button>
            )}
            {onClose && (
              <button onClick={onClose} className="text-orange-400 hover:text-orange-200" title="Close notifications panel">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>
        <div className="space-y-2">
          {loading ? (
            <div className="text-gray-400 text-center py-4">Loading...</div>
          ) : notifications.length === 0 ? (
            <div className="text-gray-400 text-center py-4">No notifications.</div>
          ) : (
            notifications.map(n => renderNotificationItem(n))
          )}
        </div>
      </div>
    );
  }
  
  // Bell only (for sidebar/profile card)
  if (!overlay && !open) {
    return (
      <NotificationBell 
        unreadCount={unreadCount}
        onClick={onClose || (() => {})}
      />
    );
  }
  
  // Default case
  return null;
}