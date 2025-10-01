import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fetchPosts, ForumPost } from "../../lib/forumApi";
import PostCard from "../../components/forum/PostCard";

const TOPICS = ["AI", "Energetyka", "Dydaktyka", "Stypendia", "Ogłoszenia"];

export default function ForumList() {
  const [q, setQ] = useState("");
  const [topic, setTopic] = useState<string | undefined>();
  const [items, setItems] = useState<ForumPost[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const data = await fetchPosts({ q, topic });
      setItems(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  return (
    <div className="max-w-5xl mx-auto p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-2">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Szukaj wątków…"
            className="px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-500 dark:placeholder-slate-400 w-72"
          />
          <select
            value={topic ?? ""}
            onChange={(e) => setTopic(e.target.value || undefined)}
            className="px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
          >
            <option value="">Wszystkie tematy</option>
            {TOPICS.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <button onClick={load} className="px-4 rounded-xl bg-indigo-600 dark:bg-indigo-700 text-white hover:bg-indigo-700 dark:hover:bg-indigo-800">Filtruj</button>
        </div>
        <Link to="/forum/new" className="px-4 py-2 rounded-xl bg-indigo-700 dark:bg-indigo-600 text-white hover:bg-indigo-800 dark:hover:bg-indigo-700">+ Nowy wpis</Link>
      </div>

      {loading ? (
        <div className="text-slate-500 dark:text-slate-400">Ładowanie…</div>
      ) : items.length === 0 ? (
        <div className="text-slate-500 dark:text-slate-400">Brak wyników.</div>
      ) : (
        <div className="space-y-3">
          {items.map((p) => (
            <PostCard
              key={p.id}
              post={p}
              onReactionsChange={(next) =>
                setItems((prev) => prev.map((x) => (x.id === p.id ? { ...x, reactions: next } : x)))
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}
