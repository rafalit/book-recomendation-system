import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createPost } from "../../lib/forumApi";

const TOPICS = [
  "Dyskusja o książce",
  "Recenzja", 
  "Pytanie o książkę",
  "Rekomendacja",
  "Wymiana książek",
  "Ogłoszenia"
];

type Book = {
  id: number;
  title: string;
  authors: string;
  thumbnail?: string;
};

type Props = {
  selectedBooks?: Book[]; // 🔹 książki wybrane z BookCard
};

export default function ForumCreate({ selectedBooks = [] }: Props) {
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
    if (selectedBooks.length === 0) {
      alert("Musisz wybrać przynajmniej jedną książkę.");
      return;
    }
    setBusy(true);
    try {
      const { id } = await createPost({ 
        title, 
        summary, 
        body, 
        topic,
        book_ids: selectedBooks.map(book => book.id)
      });
      nav(`/forum/${id}`);
    } catch (e: any) {
      alert(e?.response?.data?.detail ?? "Nie udało się dodać wpisu.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-4">
      <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100 mb-4">Nowy wpis</h1>
      
      {/* 🔹 sekcja wybranych książek */}
      {selectedBooks.length > 0 && (
        <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
          <h3 className="text-sm font-medium text-green-800 dark:text-green-200 mb-2">
            Wybrane książki ({selectedBooks.length}):
          </h3>
          <div className="flex flex-wrap gap-2">
            {selectedBooks.map((book) => (
              <div key={book.id} className="flex items-center gap-2 bg-white dark:bg-slate-800 px-3 py-2 rounded-lg border border-green-300 dark:border-green-700">
                {book.thumbnail && (
                  <img src={book.thumbnail} alt={book.title} className="w-8 h-8 object-cover rounded" />
                )}
                <span className="text-sm text-slate-700 dark:text-slate-300">
                  {book.title}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
      
      <form onSubmit={submit} className="space-y-3">
        <input className="w-full border border-slate-300 dark:border-slate-600 rounded-xl px-3 py-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-500 dark:placeholder-slate-400" placeholder="Tytuł" value={title} onChange={(e)=>setTitle(e.target.value)} />
        <input className="w-full border border-slate-300 dark:border-slate-600 rounded-xl px-3 py-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-500 dark:placeholder-slate-400" placeholder="Krótki opis" value={summary} onChange={(e)=>setSummary(e.target.value)} />
        <select className="w-full border border-slate-300 dark:border-slate-600 rounded-xl px-3 py-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100" value={topic} onChange={(e)=>setTopic(e.target.value)}>
          <option value="">Wybierz temat…</option>
          {TOPICS.map((t)=> <option key={t} value={t}>{t}</option>)}
        </select>
        <textarea className="w-full border border-slate-300 dark:border-slate-600 rounded-xl px-3 py-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-500 dark:placeholder-slate-400" rows={10} placeholder="Treść…" value={body} onChange={(e)=>setBody(e.target.value)} />
        <div className="flex gap-2">
          <button disabled={busy} className="px-4 py-2 rounded-xl bg-indigo-700 dark:bg-indigo-600 text-white hover:bg-indigo-800 dark:hover:bg-indigo-700 disabled:opacity-50">Opublikuj</button>
        </div>
      </form>
    </div>
  );
}
