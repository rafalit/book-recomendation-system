// components/auth/AuthContext.tsx
import React, { createContext, useEffect, useState, useContext } from "react";
import api, { setApiToken } from "../../lib/api";

type User = any;
type AuthCtx = {
  user: User | null;
  token: string | null;
  setToken: (t: string | null) => void;
};
const Ctx = createContext<AuthCtx>({ user: null, token: null, setToken: () => {} });

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem("token"));
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    // zawsze ustawiaj axios
    setApiToken(token);

    if (token) {
      localStorage.setItem("token", token);
      (async () => {
        try {
          const me = await api.get("/auth/me");
          setUser(me.data);
          localStorage.setItem("user", JSON.stringify(me.data));
        } catch {
          // token nie działa → wyczyść
          setUser(null);
          setApiToken(null);
        }
      })();
    } else {
      setUser(null);
      localStorage.removeItem("token");
      localStorage.removeItem("user");
    }
  }, [token]);

  return <Ctx.Provider value={{ user, token, setToken }}>{children}</Ctx.Provider>;
}

export const useAuth = () => useContext(Ctx);
