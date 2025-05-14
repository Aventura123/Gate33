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
  adminId?: string; // Adicionando suporte para adminId
  open?: boolean;
  onClose?: () => void;
  overlay?: boolean;
}

export function NotificationBell({ unreadCount, onClick }: { unreadCount: number; onClick: () => void }) {
  return (
    <button
      className="relative focus:outline-none"
      onClick={onClick}
      aria-label="Notificações"
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
  
  // Determinar o tipo de usuário para personalizar o título
  const userType = userId ? 'user' : (companyId ? 'company' : (adminId ? 'admin' : ''));

  const fetchNotifications = async () => {
    if (!userId && !companyId && !adminId) {
      setLoading(false);
      return;
    }
    setLoading(true);    try {
      // Determinar qual coleção de notificações usar
      const collectionName = adminId ? "adminNotifications" : "notifications";
      const notificationsRef = collection(db, collectionName);
      
    const allNotificationsSnapshot = await getDocs(collection(db, collectionName));
      const allNotifications = allNotificationsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
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
      } else if (adminId) {
        q = query(
          notificationsRef,
          where("adminId", "==", adminId),
          orderBy("createdAt", "desc")
        );
      }
      if (!q) {
        setLoading(false);
        return;
      }      
      const snapshot = await getDocs(q);
      const allDocs = snapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) }));
      if (allDocs.length === 0) {
      }

      // Map the notifications to ensure proper formatting
      const mappedNotifications = allDocs.map((n: any) => {
        
        // Get the title from the right place
        let title = '';
        if (n.title) title = n.title;
        else if (n.data?.title) title = n.data.title;
        
        // Get the body from the right place
        let body = '';
        if (n.body) body = n.body;
        else if (n.data?.body) body = n.data.body;
        
        // Get the type
        let type = n.type || n.data?.type || 'general';
        
        // Handle read status
        let read = false;
        if (typeof n.read === 'boolean') read = n.read;
        else if (typeof n.data?.read === 'boolean') read = n.data.read;
        
        // Handle the timestamp (most critical part)
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
        
        const result = {
          id: n.id,
          title,
          body,
          type,
          read,
          createdAt,
          data: n.data || {}
        };
        
        return result;
      });
      
      setNotifications(mappedNotifications);
    } catch (err) {
      setNotifications([]);
    }
    setLoading(false);
  };
  useEffect(() => {
    // Só executa se userId, companyId ou adminId estiverem definidos
    if (!userId && !companyId && !adminId) return;
    fetchNotifications();
    const interval = setInterval(fetchNotifications, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [userId, companyId, adminId]);
  const markAsRead = async (id: string) => {
    try {
      // Determinar qual coleção usar
      const collectionName = adminId ? "adminNotifications" : "notifications";
      await updateDoc(doc(db, collectionName, id), { read: true });
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    } catch (error) {
    }
  };

  const clearAllNotifications = async () => {
    setLoading(true);
    try {      // Determinar qual coleção usar
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
        } else if (adminId && data.adminId === adminId) {
          docsToDelete.push({ id: docSnap.id });
        }
      });      const batchDeletes = docsToDelete.map(docToDelete => deleteDoc(doc(db, collectionName, docToDelete.id)));
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
        <div className="relative w-full max-w-md h-full bg-[#18120b] border-l border-orange-900 shadow-2xl flex flex-col animate-slide-in-right">          <div className="flex items-center justify-between p-4 border-b border-orange-900">
            <span className="text-lg font-bold text-orange-400">
              {adminId ? 'Notificações de Administrador' : 'Notificações'}
            </span>
            <div className="flex items-center gap-2">
              {notifications.length > 0 && (
                <button onClick={clearAllNotifications} className="text-orange-400 hover:text-red-500 transition" title="Limpar todas as notificações" aria-label="Limpar todas as notificações">
                  <TrashIcon className="h-6 w-6" />
                </button>
              )}
              <button onClick={onClose} className="text-orange-400 hover:text-orange-200" title="Fechar painel de notificações" aria-label="Fechar painel de notificações">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {loading ? (
              <div className="text-gray-400 text-center mt-10">A carregar...</div>
            ) : notifications.length === 0 ? (
              <div className="text-gray-400 text-center mt-10">
                {adminId ? 'Sem notificações de administrador.' : 'Sem notificações.'}
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
  // Se não estiver no modo overlay, mas precisamos mostrar o painel
  if (!overlay && open) {
    return (
      <div className="notifications-panel bg-[#18120b] border border-orange-900 rounded-lg shadow-xl p-4 w-80 max-h-96 overflow-y-auto">
        <div className="flex items-center justify-between mb-3 border-b border-orange-900 pb-2">
          <span className="text-lg font-bold text-orange-400">Notificações</span>
          <div className="flex items-center gap-2">
            {notifications.length > 0 && (
              <button onClick={clearAllNotifications} className="text-orange-400 hover:text-red-500 transition" title="Limpar todas as notificações">
                <TrashIcon className="h-5 w-5" />
              </button>
            )}
            {onClose && (
              <button onClick={onClose} className="text-orange-400 hover:text-orange-200" title="Fechar painel de notificações">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>
        <div className="space-y-2">
          {loading ? (
            <div className="text-gray-400 text-center py-4">A carregar...</div>
          ) : notifications.length === 0 ? (
            <div className="text-gray-400 text-center py-4">Sem notificações.</div>
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
