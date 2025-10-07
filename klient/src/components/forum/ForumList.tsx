import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fetchPosts, ForumPost } from "../../lib/forumApi";
import PostCard from "../../components/forum/PostCard";
import { useAuth } from "../auth/AuthContext";
import { Search, Filter, Plus, MessageSquare, Users, BookOpen, Sparkles } from "lucide-react";

const TOPICS = [
  "Dyskusja o książce",
  "Recenzja", 
  "Pytanie o książkę",
  "Rekomendacja",
  "Wymiana książek",
  "Ogłoszenia"
];

const TOPIC_ICONS = {
  "Dyskusja o książce": MessageSquare,
  "Recenzja": BookOpen,
  "Pytanie o książkę": Users,
  "Rekomendacja": Sparkles,
  "Wymiana książek": BookOpen,
  "Ogłoszenia": MessageSquare,
};

export default function ForumList() {
  const { user } = useAuth();
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header Section */}
        <div className="mb-8">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-indigo-600 via-purple-600 to-blue-600 bg-clip-text text-transparent mb-4">
              Forum Dyskusyjne
            </h1>
            <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
              Dziel się opiniami, zadawaj pytania i odkrywaj nowe książki razem z innymi czytelnikami
            </p>
          </div>

          {/* Search and Filters */}
          <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 dark:border-slate-700/50 p-6 mb-6">
            <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
              <div className="flex flex-col sm:flex-row gap-3 flex-1">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
                  <input
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="Szukaj wątków, autorów, książek..."
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-500 dark:placeholder-slate-400 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200"
                  />
                </div>
                
                <div className="relative">
                  <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
                  <select
                    value={topic ?? ""}
                    onChange={(e) => setTopic(e.target.value || undefined)}
                    className="pl-10 pr-8 py-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200 appearance-none cursor-pointer min-w-[200px]"
                  >
                    <option value="">Wszystkie tematy</option>
                    {TOPICS.map((t) => {
                      const IconComponent = TOPIC_ICONS[t as keyof typeof TOPIC_ICONS];
                      return (
                        <option key={t} value={t}>{t}</option>
                      );
                    })}
                  </select>
                </div>
                
                <button 
                  onClick={load} 
                  className="px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-medium hover:from-indigo-700 hover:to-purple-700 transform hover:scale-105 transition-all duration-200 shadow-lg hover:shadow-xl"
                >
                  Filtruj
                </button>
              </div>
              
              {user?.role !== "admin" && (
                <Link 
                  to="/forum/new" 
                  className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-medium hover:from-emerald-700 hover:to-teal-700 transform hover:scale-105 transition-all duration-200 shadow-lg hover:shadow-xl"
                >
                  <Plus className="w-5 h-5" />
                  Nowy wpis
                </Link>
              )}
            </div>
          </div>

          {/* Stats Bar */}
          <div className="flex flex-wrap gap-4 mb-6">
            <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm rounded-xl px-4 py-2 border border-white/20 dark:border-slate-700/50">
              <span className="text-sm text-slate-600 dark:text-slate-400">
                Znaleziono <span className="font-semibold text-indigo-600 dark:text-indigo-400">{items.length}</span> wątków
              </span>
            </div>
            {topic && (
              <div className="bg-indigo-100/80 dark:bg-indigo-900/30 backdrop-blur-sm rounded-xl px-4 py-2 border border-indigo-200/50 dark:border-indigo-700/50">
                <span className="text-sm text-indigo-700 dark:text-indigo-300">
                  Filtr: <span className="font-semibold">{topic}</span>
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-200 border-t-indigo-600 mb-4"></div>
            <p className="text-slate-600 dark:text-slate-400 text-lg">Ładowanie wątków...</p>
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-16">
            <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm rounded-2xl p-12 border border-white/20 dark:border-slate-700/50 max-w-md mx-auto">
              <MessageSquare className="w-16 h-16 text-slate-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-slate-700 dark:text-slate-300 mb-2">
                Brak wyników
              </h3>
              <p className="text-slate-500 dark:text-slate-400 mb-6">
                {q || topic 
                  ? "Nie znaleziono wątków spełniających kryteria wyszukiwania" 
                  : "Jeszcze nie ma żadnych wątków na forum"
                }
              </p>
              {user?.role !== "admin" && (
                <Link 
                  to="/forum/new" 
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-medium hover:from-indigo-700 hover:to-purple-700 transform hover:scale-105 transition-all duration-200"
                >
                  <Plus className="w-5 h-5" />
                  Stwórz pierwszy wątek
                </Link>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {items.map((p) => (
              <div 
                key={p.id}
                className="transform hover:scale-[1.02] transition-all duration-300"
              >
                <PostCard
                  post={p}
                  onReactionsChange={(next) =>
                    setItems((prev) => prev.map((x) => (x.id === p.id ? { ...x, reactions: next } : x)))
                  }
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
