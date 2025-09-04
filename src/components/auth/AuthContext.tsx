import React, { createContext, useContext, useEffect, useState } from "react";
import axios from "axios";

type User = any; // nie zakładamy sztywnego schematu; mapujemy w TopNav

type AuthCtx = {
  user: User | null;
  setUser: (u: User | null) => void;
};

const Ctx = createContext<AuthCtx>({ user: null, setUser: () => {} });

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  // wczytaj z localStorage po odświeżeniu
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
      const cached = localStorage.getItem("user");
      if (cached) setUser(JSON.parse(cached));
      // opcjonalnie odśwież me:
      axios.get("http://127.0.0.1:8000/me").then(r => {
        setUser(r.data);
        localStorage.setItem("user", JSON.stringify(r.data));
      }).catch(() => {});
    }
  }, []);

  return <Ctx.Provider value={{ user, setUser }}>{children}</Ctx.Provider>;
}

export function useAuth() {
  return useContext(Ctx);
}
