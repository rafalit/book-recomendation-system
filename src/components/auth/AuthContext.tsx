import React, { createContext, useEffect, useState, useContext } from "react";
import api from "../../lib/api";

type User = any;
type AuthCtx = { user: User | null; token: string | null; setToken: (t: string | null) => void };
const Ctx = createContext<AuthCtx>({ user: null, token: null, setToken: () => {} });

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem("token"));
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    if (!token) {
      setUser(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const me = await api.get("/me");
        if (!cancelled) setUser(me.data);
      } catch {
        if (!cancelled) {
          setUser(null);
          setToken(null);
          localStorage.removeItem("token");
        }
      }
    })();
    return () => { cancelled = true; };
  }, [token]);

  useEffect(() => {
    if (token) localStorage.setItem("token", token);
  }, [token]);

  return <Ctx.Provider value={{ user, token, setToken }}>{children}</Ctx.Provider>;
}

export const useAuth = () => useContext(Ctx);
