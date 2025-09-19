// auth/AuthContext.tsx
import React, { createContext, useEffect, useState, useContext } from "react";
import api, { setApiToken } from "../../lib/api";

type User = any;
type AuthCtx = { user: User | null; token: string | null; setToken: (t: string | null) => void };
const Ctx = createContext<AuthCtx>({ user: null, token: null, setToken: () => {} });

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem("token"));
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    setApiToken(token);

    if (token) localStorage.setItem("token", token);
    else localStorage.removeItem("token");

    let cancelled = false;
    (async () => {
      if (!token) { setUser(null); return; }
      try {
        const me = await api.get("/auth/me"); 
        if (!cancelled) setUser(me.data);
      } catch {
        if (!cancelled) {
          setUser(null);
          setApiToken(null);
          localStorage.removeItem("token");
        }
      }
    })();

    return () => { cancelled = true; };
  }, [token]);

  return <Ctx.Provider value={{ user, token, setToken }}>{children}</Ctx.Provider>;
}

export const useAuth = () => useContext(Ctx);
