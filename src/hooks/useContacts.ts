// hooks/useContacts.ts
import { useEffect, useState } from "react";
import api from "../lib/api";

export type Contact = any;

export default function useContacts() {
  const [data, setData] = useState<Record<string, Contact>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const ctrl = new AbortController();
    (async () => {
      try {
        setLoading(true);
        const r = await api.get<Record<string, Contact>>("/contact", {
          signal: ctrl.signal as any,
        });
        setData(r.data || {});
        setError(null);
      } catch (e: any) {
        if (e?.name !== "CanceledError") {
          setError(e?.response?.data?.detail ?? "Nie udało się pobrać kontaktów");
          setData({});
        }
      } finally {
        setLoading(false);
      }
    })();
    return () => ctrl.abort();
  }, []);

  return { data, loading, error };
}
