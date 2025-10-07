import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import TopNav from "../components/layout/TopNav";
import UniversitySidebar from "../components/home/UniversitySidebar";
import ConfirmDialog from "../components/ui/ConfirmDialog";
import api from "../lib/api";
import { reactToReply, reportReply, deleteReply } from "../lib/forumApi";
import {
  ThumbsUp,
  ThumbsDown,
  MessageSquarePlus,
  X,
  Hash,
  Search,
  Trash2,
  Flag,
  CornerDownRight,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { useAuth } from "../components/auth/AuthContext";
import { P } from "framer-motion/dist/types.d-Cjd591yU";
import { formatDateOnly } from "../lib/formatDate";
import PostCard from "../components/forum/PostCard";

type Config = { university_faculties: Record<string, string[]> };

type Post = {
  id: number;
  title: string;
  summary: string;
  body: string;
  topic: string;
  university: string;
  created_at: string;
  author: {
    id: number;
    first_name: string;
    last_name: string;
    role: "student" | "researcher" | "admin";
    academic_title?: string | null;
    university?: string | null;
  };
  reactions: Record<string, number>;
  user_reaction?: string | null;
  replies_count: number;
  books?: Array<{
    id: number;
    title: string;
    authors: string;
    thumbnail?: string;
  }>;
};

const TOPICS = [
  "Dyskusja o książce",
  "Recenzja", 
  "Pytanie o książkę",
  "Rekomendacja",
  "Wymiana książek",
  "Ogłoszenia"
];

const PAGE_SIZE = 5;

const REACTIONS = [
  { key: "like", label: "Like 👍" },
  { key: "celebrate", label: "Celebrate 🎉" },
  { key: "support", label: "Support 🤝" },
  { key: "love", label: "Love ❤️" },
  { key: "insightful", label: "Insightful 💡" },
  { key: "funny", label: "Funny 😄" },
];

export default function ForumPage() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();

  const [cfg, setCfg] = useState<Config | null>(null);
  const [selectedUni, setSelectedUni] = useState<string>("wszystkie");

  const [q, setQ] = useState("");
  const [topic, setTopic] = useState<string>("");
  const [page, setPage] = useState(1);

  const [openComposer, setOpenComposer] = useState(false);
  const [formUni, setFormUni] = useState<string>("Ogólne");
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [formTopic, setFormTopic] = useState<string>("");

  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  
  // 🔹 wybrane książki z URL
  const selectedBookIds = useMemo(() => {
    const bookIds = searchParams.get('book_ids');
    return bookIds ? bookIds.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id)) : [];
  }, [searchParams]);
  
  const selectedBookTitles = useMemo(() => {
    const bookTitles = searchParams.get('book_titles');
    return bookTitles ? bookTitles.split(',') : [];
  }, [searchParams]);

  useEffect(() => {
    api
      .get<Config>("/meta/config")
      .then((r) => setCfg(r.data))
      .catch(() => setCfg({ university_faculties: {} }));
  }, []);

  const universities = useMemo(
    () =>
      cfg
        ? Object.keys(cfg.university_faculties).sort((a, b) =>
            a.localeCompare(b, "pl")
          )
        : [],
    [cfg]
  );

  useEffect(() => {
    setFormUni(selectedUni !== "wszystkie" ? selectedUni : "Ogólne");
  }, [selectedUni]);

  // 🔹 automatycznie otwórz formularz gdy są wybrane książki
  useEffect(() => {
    if (selectedBookIds.length > 0 && user?.role !== "admin") {
      setOpenComposer(true);
    }
  }, [selectedBookIds, user?.role]);

  useEffect(() => {
    setPage(1);
    setHasMore(true);
  }, [q, topic, selectedUni]);

  useEffect(() => {
  const load = async () => {
    setLoading(true);
    try {
      const params: any = { q, topic, offset: (page - 1) * PAGE_SIZE, limit: PAGE_SIZE };
      if (selectedUni !== "wszystkie") params.uni = selectedUni;
      const r = await api.get<Post[]>("/forum", { params });
      const newPosts = r.data || [];
      setPosts(newPosts);
      setHasMore(newPosts.length === PAGE_SIZE);
    } finally {
      setLoading(false);
    }
  };
    load();
  }, [q, topic, page, selectedUni]);

  const refresh = async () => {
    const params: any = { q, topic, offset: (page - 1) * PAGE_SIZE, limit: PAGE_SIZE };
    if (selectedUni !== "wszystkie") params.uni = selectedUni;
    const r = await api.get<Post[]>("/forum", { params });
    const newPosts = r.data || [];
    setPosts(newPosts);
    setHasMore(newPosts.length === PAGE_SIZE);
  };

  const handleCloseComposer = () => {
    setOpenComposer(false);
    // Resetuj formularz i wyczyść URL z wybranych książek
    setTitle("");
    setSummary("");
    setFormTopic("");
    // Usuń parametry książek z URL
    const newUrl = new URL(window.location.href);
    newUrl.searchParams.delete('book_ids');
    newUrl.searchParams.delete('book_titles');
    window.history.replaceState({}, '', newUrl.toString());
  };

  const createPost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !summary.trim() || !formTopic.trim()) {
      alert("Tytuł, krótki opis i temat są wymagane.");
      return;
    }
    if (selectedBookIds.length === 0) {
      alert("Musisz wybrać przynajmniej jedną książkę.");
      return;
    }
    await api.post("/forum", {
      title: title.trim(),
      summary: summary.trim(),
      body: summary.trim(),
      topic: formTopic.trim(),
      university: formUni || "Ogólne",
      book_ids: selectedBookIds,
    });
    setTitle("");
    setSummary("");
    setFormTopic("");
    setOpenComposer(false);
    // Usuń parametry książek z URL po zapisaniu
    const newUrl = new URL(window.location.href);
    newUrl.searchParams.delete('book_ids');
    newUrl.searchParams.delete('book_titles');
    window.history.replaceState({}, '', newUrl.toString());
    await refresh();
  };

  const reactToPost = async (postId: number, reaction: string | null) => {
    try {
      const response = await api.post(`/forum/${postId}/react`, { type: reaction });
      const { counts, user_reaction } = response.data;
      
      // Aktualizuj lokalny stan z danymi z serwera
      setPosts(prev => prev.map(post => {
        if (post.id !== postId) return post;
        
        return {
          ...post,
          reactions: counts,
          user_reaction: user_reaction
        };
      }));
    } catch {}
  };

  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [postToDelete, setPostToDelete] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Stan dla wybranej książki
  const [selectedBook, setSelectedBook] = useState<any>(null);

  const deletePost = async (postId: number) => {
    setPostToDelete(postId);
    setShowDeleteDialog(true);
  };

  const handleDeleteConfirm = async () => {
    if (!postToDelete) return;
    
    setIsDeleting(true);
    try {
      await api.delete(`/forum/${postToDelete}`);
      await refresh();
      setShowDeleteDialog(false);
      setPostToDelete(null);
    } catch (error) {
      console.error("Error deleting post:", error);
    } finally {
      setIsDeleting(false);
    }
  };

  const roleBorder = (role: string) =>
    role === "student"
      ? "border-amber-300 bg-amber-50/40"
      : "border-rose-300 bg-rose-50/40";

  const authorLine = (p: Post) => {
    const name = `${p.author.first_name} ${p.author.last_name}`;
    const title =
      p.author.academic_title ??
      (p.author.role === "student" ? "Student" : "Pracownik naukowy");
    const uni = p.author.university || p.university || "";
    return `${name} (${title})${uni ? ` • ${uni}` : ""}`;
  };

  return (
    <div className="h-screen overflow-hidden bg-slate-100 dark:bg-slate-900 flex flex-col">
      <TopNav />
      <div className={`px-2 py-4 w-full h-[calc(100vh-80px)] grid grid-cols-1 gap-4 overflow-hidden ${selectedBook ? 'md:grid-cols-[400px,1fr,400px]' : 'md:grid-cols-[400px,1fr]'}`}>
        <div className="h-full overflow-hidden">
          <UniversitySidebar
            universities={universities}
            selected={selectedUni}
            onSelect={setSelectedUni}
          />
        </div>

        <section className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-600 h-full flex flex-col overflow-hidden">
          <div className="p-4 border-b shrink-0">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <h1 className="text-xl md:text-2xl font-semibold text-slate-900 dark:text-slate-100">Forum</h1>
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-2 bg-gray-50 dark:bg-slate-700 rounded-lg px-3 py-2">
                  <Search size={18} className="text-gray-500 dark:text-slate-400" />
                  <input
                    value={q}
                    onChange={(e) => {
                      setQ(e.target.value);
                      setPage(1);
                    }}
                    className="bg-transparent outline-none text-sm text-slate-900 dark:text-slate-100 placeholder-slate-500 dark:placeholder-slate-400"
                    placeholder="Szukaj w postach…"
                  />
                </div>
                <div className="flex items-center gap-2 bg-gray-50 dark:bg-slate-700 rounded-lg px-3 py-2">
                  <Hash size={18} className="text-gray-500 dark:text-slate-400" />
                  <select
                    value={topic}
                    onChange={(e) => {
                      setTopic(e.target.value);
                      setPage(1);
                    }}
                    className="bg-transparent outline-none text-sm text-slate-900 dark:text-slate-100"
                  >
                    <option value="">Wszystkie tematy</option>
                    {TOPICS.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>

                {openComposer && user?.role !== "admin" && (
                  <button
                    onClick={handleCloseComposer}
                    className="px-4 h-10 rounded-xl text-white font-medium shadow bg-rose-600 hover:bg-rose-700 dark:bg-rose-700 dark:hover:bg-rose-800"
                  >
                    <span className="inline-flex items-center">
                      <X size={16} className="mr-1" /> Zamknij
                    </span>
                  </button>
                )}
              </div>
            </div>

            {openComposer && user?.role !== "admin" && (
              <form
                onSubmit={createPost}
                className="mt-4 rounded-xl border border-indigo-200 dark:border-indigo-600 bg-indigo-50/60 dark:bg-indigo-900/20 p-3 md:p-4"
              >
                {/* 🔹 sekcja wybranych książek */}
                {selectedBookIds.length > 0 && (
                  <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                    <div className="text-sm font-medium text-green-800 dark:text-green-200 mb-2">
                      Wybrane książki ({selectedBookIds.length}):
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {selectedBookTitles.map((title, index) => (
                        <div key={index} className="bg-white dark:bg-slate-800 px-3 py-2 rounded-lg border border-green-300 dark:border-green-700 text-sm text-slate-700 dark:text-slate-300">
                          {title}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <div className="text-xs font-medium text-indigo-800 dark:text-indigo-300 mb-1">
                      Uczelnia
                    </div>
                    <select
                      value={formUni}
                      onChange={(e) => setFormUni(e.target.value)}
                      className="w-full rounded-lg border border-indigo-200 dark:border-indigo-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-3 py-2 outline-none"
                    >
                      <option>Ogólne</option>
                      {universities.map((u) => (
                        <option key={u} value={u}>
                          {u}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="md:col-span-1">
                    <div className="text-xs font-medium text-indigo-800 dark:text-indigo-300 mb-1">
                      Tytuł
                    </div>
                    <input
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="w-full rounded-lg border border-indigo-200 dark:border-indigo-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-500 dark:placeholder-slate-400 px-3 py-2 outline-none"
                      placeholder="Np. Czy ta książka jest warta swej ceny?"
                    />
                  </div>

                  <div>
                    <div className="text-xs font-medium text-indigo-800 dark:text-indigo-300 mb-1">
                      Temat
                    </div>
                    <div className="flex items-center gap-2 rounded-lg border border-indigo-200 dark:border-indigo-600 bg-white dark:bg-slate-800 px-3 py-2">
                      <Hash size={16} className="text-indigo-500 dark:text-indigo-400" />
                      <select
                        value={formTopic}
                        onChange={(e) => setFormTopic(e.target.value)}
                        className="flex-1 bg-transparent outline-none text-slate-900 dark:text-slate-100"
                      >
                        <option value="">Wybierz…</option>
                        {TOPICS.map((t) => (
                          <option key={t} value={t}>
                            {t}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="md:col-span-3">
                    <div className="text-xs font-medium text-indigo-800 dark:text-indigo-300 mb-1">
                      Krótki opis
                    </div>
                    <textarea
                      value={summary}
                      onChange={(e) => setSummary(e.target.value)}
                      rows={3}
                      className="w-full rounded-lg border border-indigo-200 dark:border-indigo-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-500 dark:placeholder-slate-400 px-3 py-2 outline-none"
                      placeholder="W kilku zdaniach…"
                    />
                  </div>
                </div>

                <div className="mt-3 flex justify-end">
                  <button
                    type="submit"
                    className="px-4 h-10 rounded-xl bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-700 dark:hover:bg-indigo-800 text-white font-medium shadow"
                  >
                    Opublikuj
                  </button>
                </div>
              </form>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  className="h-24 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 animate-pulse"
                />
              ))
            ) : posts.length ? (
              posts.map((p) => (
                <PostCard
                  key={p.id}
                  post={p}
                  onReactionsChange={(next) => {
                    // Aktualizuj reakcje w lokalnym stanie
                    setPosts(prev => prev.map(post => 
                      post.id === p.id ? { ...post, reactions: next } : post
                    ));
                  }}
                  onReact={reactToPost}
                  onDelete={deletePost}
                  onReport={async (postId) => {
                    try {
                      await api.post(`/forum/${postId}/report`, {});
                      alert("Zgłoszenie wysłane do administratora.");
                    } catch {}
                  }}
                  onRefresh={refresh}
                  onUserReactionChange={(postId, userReaction) => {
                    setPosts(prev => prev.map(post => 
                      post.id === postId 
                        ? { ...post, user_reaction: userReaction }
                        : post
                    ));
                  }}
                  selectedBook={selectedBook}
                  setSelectedBook={setSelectedBook}
                />
              ))
            ) : (
              <div className="text-slate-600 dark:text-slate-300">
                Brak wpisów dla wybranych filtrów.
              </div>
            )}
          </div>

          <div className="p-3 border-t shrink-0 flex items-center justify-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className={`px-3 py-1.5 rounded shadow ${
              page === 1
                ? "bg-gray-100 dark:bg-slate-700 text-gray-400 dark:text-slate-500 cursor-not-allowed"
                : "bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700 text-slate-900 dark:text-slate-100"
            }`}
          >
            Poprzednia
          </button>

          <div className="text-sm text-gray-600 dark:text-slate-300">Strona {page}</div>

          <button
            onClick={() => setPage((p) => p + 1)}
            disabled={!hasMore}
            className={`px-3 py-1.5 rounded shadow ${
              !hasMore
                ? "bg-gray-100 dark:bg-slate-700 text-gray-400 dark:text-slate-500 cursor-not-allowed"
                : "bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700 text-slate-900 dark:text-slate-100"
            }`}
          >
            Następna
          </button>
        </div>
        </section>

        {/* Trzecia kolumna - Modal książki */}
        {selectedBook && (
          <div className="h-full overflow-hidden">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-600 h-full flex flex-col overflow-hidden">
            <div className="p-4 border-b shrink-0 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Szczegóły książki</h2>
              {selectedBook && (
                <button
                  onClick={() => setSelectedBook(null)}
                  className="p-2 rounded-lg bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                  aria-label="Zamknij"
                >
                  <X size={20} />
                </button>
              )}
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <div className="space-y-4">
                {/* Okładka */}
                <div className="flex justify-center">
                  {selectedBook.thumbnail ? (
                    <img
                      src={selectedBook.thumbnail}
                      alt={selectedBook.title}
                      className="w-48 h-64 object-cover rounded-xl shadow-lg"
                    />
                  ) : (
                    <div className="w-48 h-64 bg-slate-200 dark:bg-slate-700 rounded-xl flex items-center justify-center text-slate-500 dark:text-slate-400">
                      brak okładki
                    </div>
                  )}
                </div>

                {/* Tytuł i autor */}
                <div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-2">
                    {selectedBook.title}
                  </h3>
                  <p className="text-lg text-slate-600 dark:text-slate-300">
                    {selectedBook.authors}
                  </p>
                </div>

                {/* Opis */}
                {selectedBook.description && (
                  <div>
                    <h4 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">
                      Opis
                    </h4>
                    <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                      {selectedBook.description}
                    </p>
                  </div>
                )}

                {/* Szczegóły */}
                <div className="space-y-2">
                  {selectedBook.publisher && (
                    <div>
                      <span className="font-semibold text-slate-900 dark:text-slate-100">Wydawca:</span>
                      <span className="ml-2 text-slate-600 dark:text-slate-300">{selectedBook.publisher}</span>
                    </div>
                  )}
                  {selectedBook.published_date && (
                    <div>
                      <span className="font-semibold text-slate-900 dark:text-slate-100">Data wydania:</span>
                      <span className="ml-2 text-slate-600 dark:text-slate-300">{selectedBook.published_date}</span>
                    </div>
                  )}
                  {selectedBook.isbn && (
                    <div>
                      <span className="font-semibold text-slate-900 dark:text-slate-100">ISBN:</span>
                      <span className="ml-2 text-slate-600 dark:text-slate-300">{selectedBook.isbn}</span>
                    </div>
                  )}
                  {selectedBook.pages && (
                    <div>
                      <span className="font-semibold text-slate-900 dark:text-slate-100">Liczba stron:</span>
                      <span className="ml-2 text-slate-600 dark:text-slate-300">{selectedBook.pages}</span>
                    </div>
                  )}
                </div>

                {/* Gatunek */}
                {selectedBook.genre && (
                  <div>
                    <h4 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">
                      Gatunek
                    </h4>
                    <span className="px-3 py-1 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded-full text-sm font-medium">
                      {selectedBook.genre}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
        )}
      </div>

      <ConfirmDialog
        isOpen={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        onConfirm={handleDeleteConfirm}
        title="Usuń wpis"
        message="Czy na pewno chcesz usunąć ten wpis? Ta operacja jest nieodwracalna."
        confirmText="Usuń"
        cancelText="Anuluj"
        type="danger"
        isLoading={isDeleting}
      />
    </div>
  );
}


/* ──────────────────────── Drzewo odpowiedzi ──────────────────────── */

function ReplyTree({
  nodes,
  currentUser,
  depth = 0,
  reload,
}: {
  nodes: any[];
  currentUser: any;
  depth?: number;
  reload: () => Promise<void>;
}) {
  const indent = depth === 0 ? 0 : 16;

  // sort newer first
  const sorted = [...nodes].sort((a, b) => {
    const ta = new Date(a.created_at || 0).getTime();
    const tb = new Date(b.created_at || 0).getTime();
    return tb - ta;
  });

  return (
    <div className="space-y-2">
      {sorted.map((n) => (
        <ReplyNode
          key={n.id}
          n={n}
          indent={indent}
          depth={depth}
          currentUser={currentUser}
          reload={reload}
        >
          {depth < 1 && n.children?.length ? (
            <ReplyTree
              nodes={n.children}
              depth={depth + 1}
              currentUser={currentUser}
              reload={reload}
            />
          ) : null}
        </ReplyNode>
      ))}
    </div>
  );
}

function ReplyNode({
  n,
  indent,
  depth,
  currentUser,
  reload,
  children,
}: {
  n: any;
  indent: number;
  depth: number;
  currentUser: any;
  reload: () => Promise<void>;
  children?: React.ReactNode;
}) {
  const [answer, setAnswer] = useState("");
  const [openReply, setOpenReply] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const canDelete =
    currentUser && (currentUser.role === "admin" || currentUser.id === n.author.id);
  const canReport = currentUser && currentUser.id !== n.author.id && currentUser.role !== "admin";

  const flaggedCls = n.flagged
    ? "border-amber-300 dark:border-amber-600 bg-amber-50/60 dark:bg-amber-900/20"
    : "border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800";

  const submitAnswer = async () => {
    const text = answer.trim();
    if (!text) return;
    await api.post(`/forum/${n.post_id}/reply`, {
      body: text,
      parent_id: n.id,
    });
    setAnswer("");
    await reload();
  };

  const [counts, setCounts] = useState(n.reactions || { up: 0, down: 0 });

  const doReact = async (type: "up" | "down") => {
    try {
      const { data } = await api.post(`/forum/reply/${n.id}/react`, { type });
      setCounts(data.counts); // <-- aktualizacja licznika
    } catch (err) {
      console.error(err);
    }
  };

  const doReport = async () => {
    await reportReply(n.id);
    alert("Zgłoszono komentarz");
  };

  const doDelete = async () => {
    if (window.confirm("Usunąć komentarz?")) {
      await deleteReply(n.id);
      await reload();
    }
  };

  return (
    <div
      className={`rounded-xl border ${flaggedCls}`}
      style={{ marginLeft: indent }}
    >
      <div className="px-3 py-2">
        <div className="flex items-center justify-between">
          <div className="text-sm text-slate-700 dark:text-slate-300 flex items-center gap-2">
            <span className="font-medium">
              {n.author.first_name} {n.author.last_name}
            </span>
            <span
              className={`text-[11px] px-2 py-0.5 rounded-full border ${
                n.author.role === "student"
                  ? "bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-600"
                  : "bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-600"
              }`}
            >
              {n.author.academic_title ||
                (n.author.role === "student"
                  ? "Student"
                  : "Pracownik naukowy")}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {formatDateOnly(n.created_at)}
            </span>
          </div>
          <div className="flex items-center gap-1">
            {currentUser?.role !== "admin" ? (
              <>
                <button
                  onClick={() => doReact("up")}
                  className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 px-2 py-1 rounded"
                  title="Lubię to"
                >
                  <ThumbsUp size={16} />{" "}
                  <span className="ml-1 text-sm">{counts.up ?? 0}</span>
                </button>
                <button
                  onClick={() => doReact("down")}
                  className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 px-2 py-1 rounded"
                  title="Nie podoba mi się"
                >
                  <ThumbsDown size={16} />{" "}
                  <span className="ml-1 text-sm">{counts.down ?? 0}</span>
                </button>
              </>
            ) : (
              <>
                {/* Dla adminów - tylko liczniki bez możliwości klikania */}
                <div className="text-slate-500 dark:text-slate-400 px-2 py-1 cursor-default" title={`Lubię to: ${counts.up ?? 0}`}>
                  <ThumbsUp size={16} />{" "}
                  <span className="ml-1 text-sm">{counts.up ?? 0}</span>
                </div>
                <div className="text-slate-500 dark:text-slate-400 px-2 py-1 cursor-default" title={`Nie podoba mi się: ${counts.down ?? 0}`}>
                  <ThumbsDown size={16} />{" "}
                  <span className="ml-1 text-sm">{counts.down ?? 0}</span>
                </div>
              </>
            )}
            {canReport && (
              <button
                onClick={doReport}
                className="text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20 px-2 py-1 rounded"
                title="Zgłoś komentarz"
              >
                <Flag size={16} />
              </button>
            )}
            {canDelete && (
              <button
                onClick={doDelete}
                className="text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/20 px-2 py-1 rounded"
                title="Usuń komentarz"
              >
                <Trash2 size={16} />
              </button>
            )}
          </div>
        </div>

        <div className="mt-1 whitespace-pre-wrap break-words text-slate-900 dark:text-slate-100">{n.body}</div>
        <div className="mt-2 flex items-center gap-2">
          {depth === 0 && currentUser?.role !== "admin" && (
            <button
              onClick={() => setOpenReply((v) => !v)}
              className="text-xs px-2 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-600"
            >
              Odpowiedz
            </button>
          )}
          {depth === 0 && n.children?.length ? (
            <button
              onClick={() => setExpanded((v) => !v)}
              className="text-xs px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-600"
            >
              {expanded ? `Zwiń odpowiedzi (${n.children.length})` : `Pokaż odpowiedzi (${n.children.length})`}
            </button>
          ) : null}
        </div>
      </div>
      {/* children tree with indent, collapsible */}
      {depth === 0 && (n.children?.length || openReply) ? (
        <div className="pl-4 border-l border-slate-200 dark:border-slate-600">
          {expanded ? children : null}
          {openReply && currentUser?.role !== "admin" && (
            <div className="px-3 py-2">
              <div className="mt-2 flex items-center gap-2">
                <CornerDownRight size={16} className="text-slate-400 dark:text-slate-500" />
                <input
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  className="flex-1 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-500 dark:placeholder-slate-400 px-3 py-1.5"
                  placeholder="Odpowiedz…"
                />
                <button
                  onClick={submitAnswer}
                  className="px-3 py-1.5 rounded-lg bg-indigo-600 dark:bg-indigo-700 hover:bg-indigo-700 dark:hover:bg-indigo-800 text-white"
                >
                  Wyślij
                </button>
                <button
                  onClick={() => setOpenReply(false)}
                  className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300"
                >
                  Anuluj
                </button>
              </div>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
