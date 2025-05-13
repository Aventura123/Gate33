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

export default function NotificationsPanel({ userId, companyId, open, onClose, overlay }: NotificationsPanelProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const unreadCount = notifications.filter(n => !n.read).length;

  const fetchNotifications = async () => {
    if (!userId && !companyId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const notificationsRef = collection(db, "notifications");
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
        );
      }
      if (!q) {
        setLoading(false);
        return;
      }
      const snapshot = await getDocs(q);
      const allDocs = snapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) }));
      let list: Notification[] = allDocs;
      setNotifications(list.map((n: any) => ({
        id: n.id,
        title: n.title || n.data?.title || '',
        body: n.body || n.data?.body || n.data?.message || '',
        type: n.type || n.data?.type || '',
        read: n.read ?? n.data?.read ?? false,
        createdAt: n.createdAt && typeof n.createdAt.toDate === 'function'
          ? n.createdAt.toDate()
          : (typeof n.createdAt === 'string' ? new Date(n.createdAt) : (n.data?.createdAt && typeof n.data.createdAt.toDate === 'function' ? n.data.createdAt.toDate() : '')),
        data: n.data || {},
      })));
    } catch (err) {
      setNotifications([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    // Só executa se userId ou companyId estiverem definidos
    if (!userId && !companyId) return;
    fetchNotifications();
    const interval = setInterval(fetchNotifications, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [userId, companyId]);

  const markAsRead = async (id: string) => {
    try {
      await updateDoc(doc(db, "notifications", id), { read: true });
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    } catch {}
  };

  const clearAllNotifications = async () => {
    setLoading(true);
    try {
      const notificationsRef = collection(db, "notifications");
      const q = query(notificationsRef, orderBy("createdAt", "desc"));
      const snapshot = await getDocs(q);
      
      // Criando array tipado para armazenar documentos a serem excluídos
      const docsToDelete: Array<{id: string}> = [];
        // Filtrando os documentos conforme o userId ou companyId
      snapshot.docs.forEach(docSnap => {
        const data = docSnap.data();
        if (userId && data.userId === userId) {
          docsToDelete.push({ id: docSnap.id });
        } else if (companyId && data.companyId === companyId) {
          docsToDelete.push({ id: docSnap.id });
        }
      });
      const batchDeletes = docsToDelete.map(docToDelete => deleteDoc(doc(db, "notifications", docToDelete.id)));
      await Promise.all(batchDeletes);
      setNotifications([]);
    } catch (err) {
      console.error("Erro ao excluir notificações:", err);
      // Optionally handle error
    }
    setLoading(false);
  };

  // Drawer overlay mode
  if (overlay && open) {
    return createPortal(
      <div className="fixed inset-0 z-[100] flex justify-end">
        <div className="fixed inset-0 bg-black/80" onClick={onClose} />
        <div className="relative w-full max-w-md h-full bg-[#18120b] border-l border-orange-900 shadow-2xl flex flex-col animate-slide-in-right">
          <div className="flex items-center justify-between p-4 border-b border-orange-900">
            <span className="text-lg font-bold text-orange-400">Notifications</span>
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
              <div className="text-gray-400 text-center mt-10">No notifications.</div>
            ) : (
              notifications.map(n => (
                <div
                  key={n.id}
                  className={`p-3 rounded-lg border ${n.read ? 'border-gray-700 bg-black/40' : 'border-orange-500 bg-orange-900/20'} text-white shadow-sm`}
                  tabIndex={0}
                  onClick={() => !n.read && markAsRead(n.id)}
                  onFocus={() => !n.read && markAsRead(n.id)}
                >
                  <div className="font-semibold text-orange-300 mb-1">{n.title || 'Notification'}</div>
                  <div className="text-sm text-gray-200">{n.body}</div>
                  <div className="text-xs text-gray-400 mt-1">{n.createdAt ? new Date(n.createdAt?.toDate?.() || n.createdAt).toLocaleString() : ''}</div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>,
      typeof window !== 'undefined' ? document.body : ({} as any)
    );
  }
  // Se não estiver no modo overlay, mas precisamos mostrar o painel
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
            notifications.map(n => (
              <div
                key={n.id}
                className={`p-2 rounded-lg border ${n.read ? 'border-gray-700 bg-black/40' : 'border-orange-500 bg-orange-900/20'} text-white cursor-pointer`}
                onClick={() => !n.read && markAsRead(n.id)}
              >
                <div className="font-semibold text-orange-300 text-sm">{n.title || 'Notification'}</div>
                <div className="text-xs text-gray-200">{n.body}</div>
                <div className="text-xs text-gray-400 mt-1">{n.createdAt ? new Date(n.createdAt?.toDate?.() || n.createdAt).toLocaleString() : ''}</div>
              </div>
            ))
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
