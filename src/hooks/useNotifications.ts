// src/hooks/useNotifications.ts
import { useEffect, useState } from "react";
import api from "../lib/api";
import { Notification } from "../components/notifications/NotificationsDropdown";

export default function useNotifications() {
  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);

  // ✅ pobierz powiadomienia
  const fetchAll = async () => {
    setLoading(true);
    try {
      const res = await api.get<Notification[]>("/notifications");
      setItems(res.data);
    } catch (err) {
      console.error("❌ Błąd pobierania powiadomień:", err);
    } finally {
      setLoading(false);
    }
  };

  // ✅ oznacz jako przeczytane
  const markRead = async (id: number) => {
    try {
      await api.post(`/notifications/${id}/read`);
      setItems((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      );
    } catch (err) {
      console.error("❌ Błąd oznaczania powiadomienia:", err);
    }
  };

  // ✅ usuń powiadomienie
  const remove = async (id: number) => {
    try {
      await api.delete(`/notifications/${id}`);
      setItems((prev) => prev.filter((n) => n.id !== id));
    } catch (err) {
      console.error("❌ Błąd usuwania powiadomienia:", err);
    }
  };

  useEffect(() => {
    fetchAll();
    // Opcjonalnie auto-refresh co 60s
    const timer = setInterval(fetchAll, 60_000);
    return () => clearInterval(timer);
  }, []);

  return { items, loading, fetchAll, markRead, remove };
}
