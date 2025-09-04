import { ReactNode, useEffect } from "react";
import { Navigate } from "react-router-dom";
import axios from "axios";

export default function ProtectedRoute({ children }: { children: ReactNode }) {
  const token = localStorage.getItem("token");

  useEffect(() => {
    if (token) {
      axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
    }
  }, [token]);

  if (!token) return <Navigate to="/login" replace />;
  return <>{children}</>;
}
