// hooks/useContacts.ts
import { useEffect, useState } from "react";
import axios from "axios";

export type Contact = any; // zgodnie z JSON powyżej

export default function useContacts() {
  const [data, setData] = useState<Record<string, Contact>>({});
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    axios.get("http://127.0.0.1:8000/contact")
      .then(r => setData(r.data))
      .finally(() => setLoading(false));
  }, []);
  return { data, loading };
}
