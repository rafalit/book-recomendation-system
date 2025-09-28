// src/hooks/useMyLoans.ts
import { useEffect, useState, useCallback } from "react";
import api from "../lib/api";
import { Loan } from "../types/loan";  

export function useMyLoans() {
  const [loans, setLoans] = useState<Loan[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.get<Loan[]>("/books/loans/active");
      setLoans(r.data);
    } catch (err) {
      console.error("❌ Błąd pobierania aktywnych wypożyczeń", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { loans, refresh, loading };
}
