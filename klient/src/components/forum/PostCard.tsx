import { Link } from "react-router-dom";
import { useState } from "react";
import ReactionBar from "./ReactionBar";
import ConfirmDialog from "../ui/ConfirmDialog";
import { ForumPost, addReply, reactToReply, reportReply, deleteReply } from "../../lib/forumApi";
import { formatDateOnly } from "../../lib/formatDate";
import { useAuth } from "../auth/AuthContext";
import api from "../../lib/api";
import { Trash2, Flag, ChevronDown, ChevronUp, X } from "lucide-react";

function RoleBadge({ role }: { role: string }) {
  const isStudent = role === "student";
  const color = isStudent ? "emerald" : "indigo";
  return (
    <span className={`text-xs px-3 py-1 rounded-full border bg-${color}-50 dark:bg-${color}-900/20 text-${color}-700 dark:text-${color}-300 border-${color}-300 dark:border-${color}-600 font-medium`}>
      {isStudent ? "Student" : "Pracownik naukowy"}
    </span>
  );
}

function BookCovers({ books, onBookClick }: { books: ForumPost['books'], onBookClick: (book: any) => void }) {
  if (!books || books.length === 0) return null;
  
  // Oblicz rozmiar okładek na podstawie liczby książek
  const getCoverSize = (count: number) => {
    if (count === 1) return "w-24 h-32"; // 96x128px
    if (count === 2) return "w-20 h-28"; // 80x112px  
    if (count === 3) return "w-18 h-24"; // 72x96px
    return "w-16 h-22"; // 64x88px dla 4+
  };
  
  const coverSize = getCoverSize(books.length);
  
  return (
    <div className="flex gap-3 justify-end">
      {books.slice(0, 4).map((book) => (
        <div key={book.id} className="flex-shrink-0 group relative">
          {book.thumbnail ? (
            <img 
              src={book.thumbnail} 
              alt={book.title} 
              className={`${coverSize} object-cover rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 border-3 border-white dark:border-slate-600 hover:scale-105 cursor-pointer`} 
              title={book.title}
              onClick={() => onBookClick(book)}
            />
          ) : (
            <div 
              className={`${coverSize} bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-600 rounded-xl shadow-lg border-3 border-white dark:border-slate-600 flex items-center justify-center hover:scale-105 transition-transform duration-300 cursor-pointer`}
              onClick={() => onBookClick(book)}
            >
              <div className="text-xs text-slate-600 dark:text-slate-300 font-bold text-center px-2">
                brak okładki
              </div>
            </div>
          )}
        </div>
      ))}
      {books.length > 4 && (
        <div className={`${coverSize} bg-gradient-to-br from-indigo-100 to-indigo-200 dark:from-indigo-800 dark:to-indigo-900 rounded-xl shadow-lg border-3 border-white dark:border-slate-600 flex items-center justify-center hover:scale-105 transition-transform duration-300`}>
          <div className="text-sm text-indigo-700 dark:text-indigo-300 font-bold">
            +{books.length - 4}
          </div>
        </div>
      )}
    </div>
  );
}

// Komponent dla pojedynczego komentarza
function ReplyCard({ reply, currentUser, reload }: { reply: any; currentUser: any; reload: () => Promise<void> }) {
  const [counts, setCounts] = useState(reply.reactions || { up: 0, down: 0 });
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const canDelete = currentUser && (currentUser.role === "admin" || currentUser.id === reply.author.id);
  const canReport = currentUser && currentUser.id !== reply.author.id && currentUser.role !== "admin";

  const doReact = async (type: "up" | "down") => {
    try {
      const result = await reactToReply(reply.id, type);
      setCounts(result.counts);
    } catch (err) {
      console.error(err);
    }
  };

  const doReport = async () => {
    await reportReply(reply.id);
    alert("Zgłoszono komentarz");
  };

  const handleDeleteConfirm = async () => {
    setIsDeleting(true);
    try {
      await deleteReply(reply.id);
      await reload();
    } catch (error) {
      console.error("Error deleting reply:", error);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="bg-slate-50 dark:bg-slate-700 rounded-2xl p-4">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-br from-slate-400 to-slate-600 rounded-full flex items-center justify-center text-white font-medium text-sm">
            {reply.author.first_name[0]}{reply.author.last_name[0]}
          </div>
           <div>
             <div className="font-medium text-slate-900 dark:text-slate-100">
               {reply.author.first_name} {reply.author.last_name}
               {reply.author.academic_title && (
                 <span className="ml-2 text-sm text-slate-600 dark:text-slate-300">
                   {reply.author.academic_title}
                 </span>
        )}
      </div>
             <div className="text-xs text-slate-500 dark:text-slate-400">
               {reply.author.university && (
                 <span className="mr-2">{reply.author.university}</span>
               )}
               {formatDateOnly(reply.created_at)}
             </div>
           </div>
        </div>
        
        <div className="flex items-center gap-2">
          {currentUser?.role !== "admin" ? (
            <>
               <button
                 onClick={() => doReact("up")}
                 className="flex items-center gap-1 text-slate-600 dark:text-slate-400 hover:text-green-600 dark:hover:text-green-400 px-2 py-1 rounded transition-colors"
                 title="Lubię to"
               >
                 <span className="text-lg">👍</span>
                 <span className="text-sm">{counts.up || 0}</span>
               </button>
               <button
                 onClick={() => doReact("down")}
                 className="flex items-center gap-1 text-slate-600 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 px-2 py-1 rounded transition-colors"
                 title="Nie podoba mi się"
               >
                 <span className="text-lg">👎</span>
                 <span className="text-sm">{counts.down || 0}</span>
               </button>
            </>
          ) : (
            <>
              <div className="flex items-center gap-1 text-slate-500 dark:text-slate-400 px-2 py-1">
                <span className="text-lg">👍</span>
                <span className="text-sm">{counts.up || 0}</span>
              </div>
              <div className="flex items-center gap-1 text-slate-500 dark:text-slate-400 px-2 py-1">
                <span className="text-lg">👎</span>
                <span className="text-sm">{counts.down || 0}</span>
              </div>
            </>
          )}
          
          {canReport && (
            <button
              onClick={doReport}
              className="text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20 px-2 py-1 rounded transition-colors"
              title="Zgłoś komentarz"
            >
              <Flag size={16} />
            </button>
          )}
          
          {canDelete && (
            <button
              onClick={() => setShowDeleteDialog(true)}
              disabled={isDeleting}
              className="text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/20 px-2 py-1 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="Usuń komentarz"
            >
              <Trash2 size={16} />
            </button>
          )}
        </div>
      </div>

      <div className="text-slate-700 dark:text-slate-300 leading-relaxed">
        {reply.body}
      </div>

      <ConfirmDialog
        isOpen={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        onConfirm={handleDeleteConfirm}
        title="Usuń komentarz"
        message="Czy na pewno chcesz usunąć ten komentarz? Ta operacja jest nieodwracalna."
        confirmText="Usuń"
        cancelText="Anuluj"
        type="danger"
        isLoading={isDeleting}
      />
    </div>
  );
}

export default function PostCard({
  post,
  onReactionsChange,
  onReact,
  onDelete,
  onReport,
  onRefresh,
  onUserReactionChange,
  selectedBook,
  setSelectedBook,
}: {
  post: ForumPost;
  onReactionsChange?: (next: Record<string, number>) => void;
  onReact?: (postId: number, reaction: string | null) => Promise<void>;
  onDelete?: (postId: number) => Promise<void>;
  onReport?: (postId: number) => Promise<void>;
  onRefresh?: () => Promise<void>;
  onUserReactionChange?: (postId: number, userReaction: string | null) => void;
  selectedBook?: any;
  setSelectedBook?: (book: any) => void;
}) {
  const { user } = useAuth();
  const [showComments, setShowComments] = useState(false);
  const [replies, setReplies] = useState<any[]>([]);
  const [loadingReplies, setLoadingReplies] = useState(false);
  const [newComment, setNewComment] = useState("");

  const canDelete = user && (user.role === "admin" || user.id === post.author.id);
  const canReport = user && user.id !== post.author.id && user.role !== "admin";

  const loadReplies = async () => {
    setLoadingReplies(true);
    try {
      const response = await api.get(`/forum/${post.id}`);
      setReplies(response.data?.replies || []);
    } finally {
      setLoadingReplies(false);
    }
  };

  const toggleComments = async () => {
    const willShow = !showComments;
    setShowComments(willShow);
    if (willShow && replies.length === 0) {
      await loadReplies();
    }
  };

  const submitComment = async () => {
    if (!newComment.trim() || !user) return;
    try {
      await addReply(post.id, newComment.trim());
      setNewComment("");
      await loadReplies();
      // Przeładuj licznik komentarzy w głównym komponencie
      if (onRefresh) {
        await onRefresh();
      }
    } catch (error) {
      console.error("Error adding comment:", error);
    }
  };

  const handleReact = async (postId: number, reaction: string | null) => {
    if (onReact) {
      await onReact(postId, reaction);
    }
  };

  const handleUserReactionChange = (userReaction: string | null) => {
    if (onUserReactionChange) {
      onUserReactionChange(post.id, userReaction);
    }
  };

  const handleBookClick = async (book: any) => {
    if (!setSelectedBook) return;
    try {
      // Pobierz pełne informacje o książce z API
      const response = await api.get(`/books/${book.id}`);
      setSelectedBook(response.data);
    } catch (error) {
      console.error("Error fetching book details:", error);
    }
  };

  const handleDelete = async (postId: number) => {
    if (onDelete) {
      await onDelete(postId);
    }
  };

  const handleReport = async (postId: number) => {
    if (onReport) {
      await onReport(postId);
    }
  };
  
  return (
    <>
      <div className="group bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-2xl border border-white/20 dark:border-slate-700/50 shadow-xl hover:shadow-2xl transition-all duration-300 overflow-hidden hover:border-indigo-200/50 dark:hover:border-indigo-700/50">
                {/* Header z gradientem */}
                <div className="bg-gradient-to-r from-indigo-50/80 to-purple-50/80 dark:from-slate-800/80 dark:to-slate-700/80 backdrop-blur-sm px-8 py-6 border-b border-slate-200/50 dark:border-slate-600/50">
                  {/* Informacje o autorze i przyciski akcji w jednej linii */}
                  <div className="flex items-center justify-between mb-4">
                    {/* Informacje o autorze */}
                      <div className="flex items-center gap-3 flex-wrap">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                            {post.author.first_name[0]}{post.author.last_name[0]}
                          </div>
                          <div>
                            <div className="font-semibold text-slate-900 dark:text-slate-100">
                              {post.author.first_name} {post.author.last_name}
                            </div>
                            <div className="text-sm text-slate-500 dark:text-slate-400">
                              {post.author.academic_title || (post.author.role === "student" ? "Student" : "Pracownik naukowy")}
                            </div>
                          </div>
                        </div>

                        {post.author.university && (
                        <div className="px-3 py-1 bg-blue-100/80 dark:bg-blue-900/40 backdrop-blur-sm text-blue-700 dark:text-blue-300 rounded-full text-sm font-medium border border-blue-200/50 dark:border-blue-700/50">
                            {post.author.university}
                          </div>
                        )}

                      <div className="px-3 py-1 bg-emerald-100/80 dark:bg-emerald-900/40 backdrop-blur-sm text-emerald-700 dark:text-emerald-300 rounded-full text-sm font-medium border border-emerald-200/50 dark:border-emerald-700/50">
                          {post.topic}
                        </div>

                        <div className="text-sm text-slate-500 dark:text-slate-400">
                          {formatDateOnly(post.created_at)}
                      </div>
                    </div>

                    {/* Przyciski akcji */}
                    <div className="flex items-center gap-2">
                      {canDelete && (
                        <button
                          onClick={() => handleDelete(post.id)}
                          className="p-2 rounded-lg bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-600 hover:bg-rose-100 dark:hover:bg-rose-900/30 transition-colors"
                          title="Usuń wpis"
                        >
                          <Trash2 size={18} />
                        </button>
                      )}
                      {user && (user.role === "admin" || user.id === post.author.id) && (
                        <button
                          onClick={() => {/* TODO: implement edit */}}
                          className="p-2 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
                          title="Edytuj wpis"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                      )}
                      {canReport && (
                        <button
                          onClick={() => handleReport(post.id)}
                          className="p-2 rounded-lg bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-600 hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors"
                          title="Zgłoś wpis"
                        >
                          <Flag size={18} />
                        </button>
                      )}
                    </div>
                  </div>

      <div className="flex items-start justify-between">
        <div className="flex-1">
          {/* Zawartość posta w okrągłym prostokącie */}
          <div className="inline-block px-4 py-3 bg-white/70 dark:bg-slate-700/70 backdrop-blur-sm rounded-2xl border border-slate-200/50 dark:border-slate-600/50 shadow-lg">
                      {/* Tytuł */}
                      <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-3">
            {post.title}
                      </h2>
          
            {/* Opis */}
                      <div className="text-slate-600 dark:text-slate-300 text-lg leading-relaxed">
                        {post.summary}
            </div>
          </div>
        </div>

                   {/* Okładki książek po prawej stronie */}
          {post.books && post.books.length > 0 && (
                     <div className="ml-8 flex-shrink-0">
                       <BookCovers books={post.books} onBookClick={handleBookClick} />
                     </div>
                   )}
                 </div>
               </div>

      {/* Główna zawartość */}
      <div className="px-8 py-6 bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm">
        {/* Reakcje */}
        <div className="mb-6">
                <ReactionBar
                  postId={post.id}
                  counts={post.reactions || {}}
                  onChange={onReactionsChange}
                  userRole={user?.role}
                  userReaction={post.user_reaction}
                  onUserReactionChange={handleUserReactionChange}
                />
        </div>

        {/* Komentarze */}
        <div className="border-t border-slate-200/50 dark:border-slate-600/50 pt-6">
          <button
            onClick={toggleComments}
            className="flex items-center gap-3 text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 font-medium transition-colors duration-200 mb-4"
          >
            <svg className={`w-5 h-5 transition-transform duration-200 ${showComments ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
            <span>Komentarze ({post.replies_count})</span>
          </button>

          {showComments && (
            <div className="space-y-4">
              {loadingReplies ? (
                <div className="text-slate-500 dark:text-slate-400 text-center py-8">
                  <div className="animate-spin w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full mx-auto mb-2"></div>
                  Ładowanie komentarzy...
                </div>
              ) : replies.length === 0 ? (
                <div className="text-slate-500 dark:text-slate-400 text-center py-8">
                  Brak komentarzy. Bądź pierwszym!
                </div>
              ) : (
                <div className="space-y-4">
                  {replies.map((reply) => (
                    <ReplyCard 
                      key={reply.id} 
                      reply={reply} 
                      currentUser={user}
                      reload={loadReplies}
                    />
              ))}
            </div>
          )}

              {/* Formularz dodawania komentarza */}
              {user && user.role !== "admin" && (
                <div className="bg-slate-50/80 dark:bg-slate-700/80 backdrop-blur-sm rounded-2xl p-6 border border-slate-200/50 dark:border-slate-600/50">
                  <div className="flex gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                      {user.first_name[0]}{user.last_name[0]}
                    </div>
                    <div className="flex-1">
                      <textarea
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        placeholder="Dodaj komentarz..."
                        className="w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-500 dark:placeholder-slate-400 px-4 py-3 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        rows={3}
                      />
                      <div className="mt-3 flex justify-end">
                        <button
                          onClick={submitComment}
                          disabled={!newComment.trim()}
                          className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-700 dark:hover:bg-indigo-800 text-white rounded-xl font-medium transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Dodaj komentarz
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
    </>
  );
}

