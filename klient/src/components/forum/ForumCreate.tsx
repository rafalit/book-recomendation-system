import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createPost } from "../../lib/forumApi";

const TOPICS = ["AI", "Energetyka", "Dydaktyka", "Stypendia", "Ogłoszenia"];

export default function ForumCreate() {
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [body, setBody] = useState("");
  const [topic, setTopic] = useState("");
  const [busy, setBusy] = useState(false);
  const nav = useNavigate();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !summary || !body || !topic) {
      alert("Wszystkie pola są wymagane.");
      return;
    }
    setBusy(true);
    try {
      const { id } = await createPost({ title, summary, body, topic });
      nav(`/forum/${id}`);
    } catch (e: any) {
      alert(e?.response?.data?.detail ?? "Nie udało się dodać wpisu.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-4">
      <h1 className="text-2xl font-semibold mb-4">Nowy wpis</h1>
      <form onSubmit={submit} className="space-y-3">
        <input className="w-full border rounded-xl px-3 py-2" placeholder="Tytuł" value={title} onChange={(e)=>setTitle(e.target.value)} />
        <input className="w-full border rounded-xl px-3 py-2" placeholder="Krótki opis" value={summary} onChange={(e)=>setSummary(e.target.value)} />
        <select className="w-full border rounded-xl px-3 py-2" value={topic} onChange={(e)=>setTopic(e.target.value)}>
          <option value="">Wybierz temat…</option>
          {TOPICS.map((t)=> <option key={t} value={t}>{t}</option>)}
        </select>
        <textarea className="w-full border rounded-xl px-3 py-2" rows={10} placeholder="Treść…" value={body} onChange={(e)=>setBody(e.target.value)} />
        <div className="flex gap-2">
          <button disabled={busy} className="px-4 py-2 rounded-xl bg-indigo-700 text-white">Opublikuj</button>
        </div>
      </form>
    </div>
  );
}
