import { useEffect, useState } from "react";
import api from "../lib/api";

export type Notification = {
  id: number;
  text: string;
  read: boolean;
};

export default function useNotifications() {
  const [items, setItems] = useState<Notification[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get("/notifications");
        setItems(data);
      } catch (e) {
        console.error("Błąd ładowania powiadomień", e);
      }
    })();
  }, []);

  const markRead = async (id: number) => {
    try {
      await api.post(`/notifications/${id}/read`);
      setItems((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      );
    } catch (e) {
      console.error("Błąd przy oznaczaniu powiadomienia", e);
    }
  };

  const remove = async (id: number) => {
    try {
      await api.delete(`/notifications/${id}`);
      setItems((prev) => prev.filter((n) => n.id !== id));
    } catch (e) {
      console.error("Błąd przy usuwaniu powiadomienia", e);
    }
  };

  return { items, markRead, remove };
}
