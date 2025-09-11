// AuthContext.tsx (skrót)
import axios from "axios";
import React, { createContext, useEffect, useState, useContext } from "react";

type User = any;
type AuthCtx = { user: User | null; token: string | null; setToken: (t: string | null) => void };
const Ctx = createContext<AuthCtx>({ user: null, token: null, setToken: () => {} });

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem("token"));
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    if (token) {
      axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
      axios
        .get("http://127.0.0.1:8000/me")
        .then(r => setUser(r.data))
        .catch(err => {
          if (err?.response?.status === 401) {
            // wygasł / nieprawidłowy – wyloguj „po cichu”
            delete axios.defaults.headers.common["Authorization"];
            localStorage.removeItem("token");
            setToken(null);
            setUser(null);
          } else {
            console.info("Nie udało się pobrać /me:", err?.message || err);
          }
        });
    } else {
      delete axios.defaults.headers.common["Authorization"];
      setUser(null);
    }
  }, [token]);

  useEffect(() => {
    if (token) localStorage.setItem("token", token);
  }, [token]);

  return <Ctx.Provider value={{ user, token, setToken }}>{children}</Ctx.Provider>;
}

export const useAuth = () => useContext(Ctx);
