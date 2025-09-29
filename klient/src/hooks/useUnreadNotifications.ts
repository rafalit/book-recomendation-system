import { useEffect, useRef, useState } from "react";
import api from "../lib/api";

export default function useUnreadNotifications() {
  const [count, setCount] = useState(0);
  const timer = useRef<number | null>(null);

  const tick = async () => {
    try {
      const r = await api.get<{ count: number }>("/notifications/unread_count");
      setCount(r.data?.count ?? 0);
    } catch {
    } finally {
      timer.current = window.setTimeout(tick, 45_000);
    }
  };

  useEffect(() => {
    tick();
    return () => {
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, []);

  return count;
}
