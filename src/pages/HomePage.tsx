import { useEffect, useState } from "react";
import axios from "axios";

type Me = {
  id: number;
  email: string;
  full_name?: string;
  role: string;
  university?: string;
  faculty?: string;
  field?: string | null;
  study_year?: string | null;
  academic_title?: string | null;
};

export default function HomePage() {
  const [me, setMe] = useState<Me | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;
    axios
      .get<Me>("http://127.0.0.1:8000/me", {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => setMe(res.data))
      .catch(() => setMe(null));
  }, []);

  const logout = () => {
    localStorage.removeItem("token");
    window.location.href = "/login";
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="font-semibold">Book Recommender</div>
          <button
            onClick={logout}
            className="px-3 py-1.5 rounded-lg border hover:bg-slate-100"
          >
            Wyloguj
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-semibold">Witaj {me?.full_name ?? me?.email} 👋</h1>
        <p className="text-slate-600 mt-1">
          Rola: <b>{me?.role}</b>{me?.university ? ` • ${me.university}` : ""}{me?.faculty ? ` • ${me.faculty}` : ""}
        </p>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className="bg-white rounded-2xl border p-5">
            <h2 className="font-medium">Twoje konto</h2>
            <ul className="mt-2 text-sm text-slate-700 space-y-1">
              <li>Email: {me?.email}</li>
              {me?.field && <li>Kierunek: {me.field}</li>}
              {me?.study_year && <li>Rok studiów: {me.study_year}</li>}
              {me?.academic_title && <li>Tytuł: {me.academic_title}</li>}
            </ul>
          </div>
          <div className="bg-white rounded-2xl border p-5">
            <h2 className="font-medium">Co dalej?</h2>
            <p className="text-sm text-slate-700 mt-2">
              Tutaj wyląduje dashboard z rekomendacjami książek, filtrami, itd.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
