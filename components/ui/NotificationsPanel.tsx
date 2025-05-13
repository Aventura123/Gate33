import { BellIcon } from '@heroicons/react/24/outline';
import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { collection, query, where, getDocs, orderBy, updateDoc, doc } from "firebase/firestore";
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
    let filterId, filterField, collectionName;
    if (userId) {
      filterId = userId;
      filterField = "userId";
      collectionName = "seekersNotifications";
    } else if (companyId) {
      filterId = companyId;
      filterField = "companyId";
      collectionName = "notifications";
    } else {
      return;
    }
    setLoading(true);
    try {
      const notificationsRef = collection(db, collectionName);
      const q = query(
        notificationsRef,
        where(filterField, "==", filterId),
        orderBy("createdAt", "desc")
      );
      const snapshot = await getDocs(q);
      const list: Notification[] = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Notification[];
      setNotifications(list);
    } catch (err) {
      setNotifications([]);
    }
    setLoading(false);
  };

  useEffect(() => {
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

  // Drawer overlay mode
  if (overlay && open) {
    return createPortal(
      <div className="fixed inset-0 z-[100] flex justify-end">
        <div className="fixed inset-0 bg-black/80" onClick={onClose} />
        <div className="relative w-full max-w-md h-full bg-[#18120b] border-l border-orange-900 shadow-2xl flex flex-col animate-slide-in-right">
          <div className="flex items-center justify-between p-4 border-b border-orange-900">
            <span className="text-lg font-bold text-orange-400">Notifications</span>
            <button onClick={onClose} className="text-orange-400 hover:text-orange-200" title="Close notifications panel" aria-label="Close notifications panel">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
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

  // Bell only (for sidebar/profile card)
  return null;
}
