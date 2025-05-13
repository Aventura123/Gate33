import { BellIcon } from '@heroicons/react/24/outline';
import { Fragment, useState, useEffect } from "react";
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
}

export default function NotificationsPanel({ userId, companyId }: NotificationsPanelProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPanel, setShowPanel] = useState(false);
  const unreadCount = notifications.filter(n => !n.read).length;

  const fetchNotifications = async () => {
    const filterId = userId || companyId;
    const filterField = userId ? "userId" : companyId ? "companyId" : null;
    if (!filterId || !filterField) return;
    setLoading(true);
    try {
      const notificationsRef = collection(db, "notifications");
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

  return (
    <div className="relative inline-block text-left">
      <button
        className="relative focus:outline-none"
        onClick={() => setShowPanel(!showPanel)}
        aria-label="Notifications"
      >
        <BellIcon className="h-7 w-7 text-orange-400" />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white bg-red-600 rounded-full">
            {unreadCount}
          </span>
        )}
      </button>
      {showPanel && (
        <div className="origin-top-right absolute right-0 mt-2 w-80 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-50">
          <div className="py-2 px-4">
            <h3 className="text-lg font-semibold mb-2">Notifications</h3>
            {loading ? (
              <div className="text-gray-500">Loading...</div>
            ) : notifications.length === 0 ? (
              <div className="text-gray-500">No notifications</div>
            ) : (
              <ul className="max-h-80 overflow-y-auto">
                {notifications.map(n => (
                  <li
                    key={n.id}
                    className={`p-2 rounded cursor-pointer ${n.read ? 'bg-gray-100' : 'bg-orange-50 font-bold'}`}
                    onClick={() => markAsRead(n.id)}
                  >
                    <div className="text-sm">{n.title}</div>
                    <div className="text-xs text-gray-600">{n.body}</div>
                    <div className="text-xs text-gray-400">{new Date(n.createdAt?.toDate?.() || n.createdAt).toLocaleString()}</div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
