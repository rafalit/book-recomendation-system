// src/pages/ForumDetail.tsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../../lib/api";
import { addReply, fetchPost } from "../../lib/forumApi";
import ReactionBar from "../../components/forum/ReactionBar";
import ReportDialog from "../../components/forum/ReportDialog";
import ConfirmDialog from "../../components/ui/ConfirmDialog";
import { useAuth } from "../../components/auth/AuthContext";
import { formatDateOnly } from "../../lib/formatDate";

type Author = {
  id: number;
  first_name: string;
  last_name: string;
  role: "student" | "researcher" | "admin" | string;
  university?: string | null;
  academic_title?: string | null; // <-- ważne, backend powinien to zwracać
};

type ReplyNode = {
  id: number;
  body: string;
  created_at: string;
  author: Author;
  children?: ReplyNode[];
};

type PostDetail = {
  id: number;
  title: string;
  summary: string;
  body: string;
  topic: string;
  created_at: string;
  author: Author;
  reactions: Record<string, number>;
  replies: ReplyNode[];
  books?: Array<{
    id: number;
    title: string;
    authors: string;
    thumbnail?: string;
  }>;
};

function LineBadge({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={`ml-2 text-[11px] px-2 py-0.5 rounded-full border ${className}`}>
      {children}
    </span>
  );
}

function AuthorLine({ a }: { a: Author }) {
  const title = a.academic_title || (a.role === "student" ? "Student" : "Pracownik naukowy");
  const uni = a.university ? ` • ${a.university}` : "";
  const roleColor = a.role === "student" ? "bg-amber-50 text-amber-700 border-amber-300" : "bg-rose-50 text-rose-700 border-rose-300";
  return (
    <div className="mt-2 text-xs text-slate-500">
      {a.first_name} {a.last_name}
      <LineBadge className={roleColor}>{title}</LineBadge>
      {uni && <span className="ml-2">{uni}</span>}
    </div>
  );
}

function Reply({
  node,
  postId,
  onReload,
  userRole,
}: {
  node: ReplyNode;
  postId: number;
  onReload: () => void;
  userRole?: string;
}) {
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [val, setVal] = useState("");
  const hasChildren = (node.children && node.children.length > 0) || false;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const body = val.trim();
    if (!body) return;
    await api.post(`/forum/${postId}/reply`, { body, parent_id: node.id });
    setVal("");
    setOpen(false);
    onReload();
  };

  return (
    <div className="border rounded-xl p-3 bg-white">
      <div className="text-sm text-slate-600">
        {node.author.first_name} {node.author.last_name}
        <LineBadge className={node.author.role === "student" ? "bg-amber-50 text-amber-700 border-amber-300" : "bg-rose-50 text-rose-700 border-rose-300"}>
          {node.author.academic_title || (node.author.role === "student" ? "Student" : "Pracownik naukowy")}
        </LineBadge>
        <span className="ml-2">• {formatDateOnly(node.created_at)}</span>
      </div>
      <div className="mt-1 whitespace-pre-wrap break-words">{node.body}</div>

      <div className="mt-2 flex items-center gap-2">
        {userRole !== "admin" && (
          <button
            onClick={() => setOpen(true)}
            className="text-xs px-2 py-1 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200"
          >
            Odpowiedz
          </button>
        )}
        {hasChildren && (
          <button
            onClick={() => setExpanded((e) => !e)}
            className="text-xs px-2 py-1 rounded-lg bg-slate-100 text-slate-700 border border-slate-200"
          >
            {expanded ? `Zwiń odpowiedzi (${node.children?.length || 0})` : `Pokaż odpowiedzi (${node.children?.length || 0})`}
          </button>
        )}
      </div>

      {(hasChildren || open) && (
        <div className="mt-3 space-y-2 pl-4 border-l">
          {hasChildren && expanded && (
            <div className="space-y-2">
              {[...node.children!]
                .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                .map((ch) => (
                  <Reply key={ch.id} node={ch} postId={postId} onReload={onReload} userRole={userRole} />
                ))}
            </div>
          )}

          {open && userRole !== "admin" && (
            <form onSubmit={submit} className="flex gap-2">
              <input
                value={val}
                onChange={(e) => setVal(e.target.value)}
                className="flex-1 border rounded-xl px-3 py-2"
                placeholder="Twoja odpowiedź…"
              />
              <button className="px-3 rounded-xl bg-indigo-700 text-white">Wyślij</button>
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  setVal("");
                }}
                className="px-3 rounded-xl bg-slate-100"
              >
                Anuluj
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  );
}

export default function ForumDetail() {
  const { id = "" } = useParams();
  const postId = Number(id);
  const [post, setPost] = useState<PostDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [answer, setAnswer] = useState("");
  const [showReport, setShowReport] = useState(false);
  const nav = useNavigate();
  const { user } = useAuth();

  const isOwner = useMemo(() => (user && post ? user.id === post.author.id : false), [user, post]);
  const canDelete = useMemo(() => (user && post ? isOwner || user.role === "admin" : false), [user, post, isOwner]);

  const load = async () => {
    setLoading(true);
    try {
      const data = await fetchPost(postId);
      setPost(data as unknown as PostDetail);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!Number.isFinite(postId)) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [postId]);

  const submitReply = async (e: React.FormEvent) => {
    e.preventDefault();
    const body = answer.trim();
    if (!body) return;
    await addReply(postId, body);
    setAnswer("");
    await load();
  };

  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const handleDeleteConfirm = async () => {
    if (!post) return;
    
    setIsDeleting(true);
    try {
      await api.delete(`/forum/${post.id}`);
      nav("/forum");
    } catch (error) {
      console.error("Error deleting post:", error);
      setIsDeleting(false);
    }
  };

  if (loading) return <div className="p-4 text-slate-500">Ładowanie…</div>;
  if (!post) return <div className="p-4 text-slate-500">Nie znaleziono.</div>;

  const frame = post.author.role === "student" ? "border-amber-300" : "border-rose-300";

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-4">
      {/* Post */}
      <div className={`rounded-2xl border ${frame} bg-white p-5 shadow-sm`}>
        <div className="text-2xl font-semibold break-words">{post.title}</div>
        <div className="text-slate-600 mt-1 whitespace-pre-wrap break-words">{post.summary}</div>

        {/* 🔹 wyświetl powiązane książki */}
        {post.books && post.books.length > 0 && (
          <div className="mt-3 p-3 bg-slate-50 dark:bg-slate-700 rounded-lg">
            <div className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Powiązane książki:
            </div>
            <div className="flex flex-wrap gap-2">
              {post.books.map((book) => (
                <div key={book.id} className="flex items-center gap-2 bg-white dark:bg-slate-800 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600">
                  {book.thumbnail && (
                    <img src={book.thumbnail} alt={book.title} className="w-8 h-8 object-cover rounded" />
                  )}
                  <div className="text-sm">
                    <div className="font-medium text-slate-900 dark:text-slate-100">{book.title}</div>
                    <div className="text-slate-600 dark:text-slate-400">{book.authors}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <AuthorLine a={post.author} />

        <div className="mt-1 text-xs text-slate-500">
          <span>#{post.topic}</span>
          <span className="ml-2">• {formatDateOnly(post.created_at)}</span>
        </div>

        <div className="prose max-w-none mt-4 whitespace-pre-wrap break-words">{post.body}</div>

        <div className="mt-4 flex items-center justify-between gap-2 flex-wrap">
          <ReactionBar
            postId={post.id}
            counts={post.reactions || {}}
            onChange={(next) => setPost((p) => (p ? { ...p, reactions: next } : p))}
            userRole={user?.role}
          />

          <div className="flex items-center gap-2">
            {canDelete && (
              <button 
                onClick={() => setShowDeleteDialog(true)} 
                disabled={isDeleting}
                className="px-3 py-1.5 rounded-lg bg-rose-600 text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-rose-700 transition-colors"
              >
                Usuń wpis
              </button>
            )}
            {!isOwner && user?.role !== "admin" && (
              <button
                onClick={() => setShowReport(true)}
                className="px-3 py-1.5 rounded-lg bg-rose-50 text-rose-700 border border-rose-200"
              >
                Zgłoś
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Odpowiedzi */}
      <div className="rounded-2xl border bg-white p-5 shadow-sm">
        <div className="text-lg font-semibold mb-3">Odpowiedzi</div>

        {post.replies?.length ? (
          <div className="space-y-3">
            {post.replies.map((r) => (
              <Reply key={r.id} node={r} postId={post.id} onReload={load} userRole={user?.role} />
            ))}
          </div>
        ) : (
          <div className="text-slate-500">Brak odpowiedzi.</div>
        )}

        {/* nowa odpowiedź (top-level) - ukryte dla adminów */}
        {user?.role !== "admin" && (
          <form onSubmit={submitReply} className="mt-4 flex gap-2">
            <input
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              className="flex-1 border rounded-xl px-3 py-2"
              placeholder="Napisz odpowiedź…"
            />
            <button className="px-4 rounded-xl bg-indigo-700 text-white">Wyślij</button>
          </form>
        )}
      </div>

      {showReport && (
        <ReportDialog
          postId={post.id}
          onClose={() => setShowReport(false)}
          onReported={() => alert("Zgłoszenie wysłane.")}
        />
      )}

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
