import { useEffect, useState } from "react";
import { collection, query, where, getDocs, orderBy } from "firebase/firestore";
import { db } from "../../../lib/firebase";

interface Notification {
  id: string;
  title: string;
  body: string;
  type: string;
  read: boolean;
  createdAt: any;
  data?: any;
}

const POLL_INTERVAL = 10000; // 10 segundos

export default function Notifications({ userId }: { userId: string }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const notificationsRef = collection(db, "notifications");
      const q = query(
        notificationsRef,
        where("userId", "==", userId),
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
  }, [userId]);

  return (
    <div>
      <h3 className="font-bold mb-2">Notificações</h3>
      {loading ? (
        <div>Carregando...</div>
      ) : notifications.length === 0 ? (
        <div>Sem notificações.</div>
      ) : (
        <ul>
          {notifications.map(n => (
            <li key={n.id} className="mb-2">
              <div className="font-semibold">{n.title}</div>
              <div>{n.body}</div>
              <div className="text-xs text-gray-400">{n.createdAt?.toDate?.().toLocaleString?.() || ""}</div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
