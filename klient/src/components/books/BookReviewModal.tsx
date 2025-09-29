// src/components/books/BookReviewModal.tsx
import { useEffect, useState } from "react";
import { X, Edit3, Trash2, ThumbsUp, ThumbsDown, Pencil, Flag } from "lucide-react";
import api from "../../lib/api";
import { Book } from "./BookCard";

// Typ recenzji z użytkownikiem
type Review = {
  id: number;
  user_id: number;
  user?: {
    id: number;
    first_name: string;
    last_name: string;
    role: "student" | "researcher";
    university: string;
    academic_title?: string | null;
  };
  rating: number;
  text: string;
  created_at: string;
  reactions?: { like: number; dislike: number };
};

type Props = {
  bookId: number;
  bookTitle: string;
  open: boolean;
  onClose: () => void;
  onBookUpdate?: (data: Partial<Book>) => void;
  readOnly?: boolean;
};

// 🔹 badge roli + uczelni
function RoleBadge({ user }: { user: Review["user"] }) {
  if (!user) return null;
  const isStudent = user.role === "student";

  const className = isStudent
    ? "bg-amber-50 text-amber-700 border-amber-300"
    : "bg-indigo-50 text-indigo-700 border-indigo-300";

  const label = isStudent ? "Student" : user.academic_title || "Pracownik naukowy";

  return (
    <span className={`ml-2 text-xs px-2 py-0.5 rounded-full border ${className}`}>
      {label} • {user.university}
    </span>
  );
}

export default function BookReviewModal({
  bookId,
  bookTitle,
  open,
  onClose,
  onBookUpdate,
  readOnly = false,
}: Props) {
  const [rating, setRating] = useState(0);
  const [text, setText] = useState("");
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(false);

  const [editingId, setEditingId] = useState<number | null>(null);

  // TODO: pobierz currentUserId z auth (np. localStorage / api / context)
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const currentUserId = user?.id;

  useEffect(() => {
    if (!open) return;
    const fetchReviews = async () => {
      setLoading(true);
      try {
        const res = await api.get<Review[]>(`/books/${bookId}/reviews`);
        setReviews(res.data);
      } catch (err) {
        console.error(err);
        setReviews([]);
      } finally {
        setLoading(false);
      }
    };
    fetchReviews();
  }, [bookId, open]);

  const handleSubmit = async () => {
    if (!rating || !text.trim()) {
      alert("Dodaj ocenę i treść recenzji.");
      return;
    }

    try {
      if (editingId) {
        // ✏️ aktualizacja recenzji
        const res = await api.put(`/books/${bookId}/reviews/${editingId}`, {
          rating,
          text,
        });
        setReviews((prev) =>
          prev.map((r) => (r.id === editingId ? res.data.review : r))
        );

        if (onBookUpdate) {
          onBookUpdate({
            avg_rating: res.data.avg_rating,
            reviews_count: res.data.reviews_count,
          });
        }
      } else {
        // ➕ nowa recenzja
        const res = await api.post(`/books/${bookId}/review`, { rating, text });
        setReviews((prev) => [res.data.review, ...prev]);

        if (onBookUpdate) {
          onBookUpdate({
            avg_rating: res.data.avg_rating,
            reviews_count: res.data.reviews_count,
          });
        }
      }

      setRating(0);
      setText("");
      setEditingId(null);
    } catch (err) {
      console.error(err);
      alert("Błąd podczas zapisu recenzji.");
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("Na pewno chcesz usunąć recenzję?")) return;
    try {
      const res = await api.delete(`/books/${bookId}/reviews/${id}`);
      setReviews((prev) => prev.filter((r) => r.id !== id));

      if (onBookUpdate) {
        onBookUpdate({
          avg_rating: res.data.avg_rating,
          reviews_count: res.data.reviews_count,
        });
      }
    } catch (err) {
      console.error(err);
      alert("Błąd podczas usuwania recenzji.");
    }
  };

  const handleReact = async (id: number, type: "thumbs_up" | "thumbs_down") => {
    try {
      const res = await api.post(`/books/${bookId}/reviews/${id}/react`, { type });
      setReviews((prev) =>
        prev.map((r) =>
          r.id === id
            ? {
              ...r,
              reactions: {
                like: res.data.thumbs_up,
                dislike: res.data.thumbs_down,
              },
            }
            : r
        )
      );
    } catch (err) {
      console.error(err);
      alert("Błąd podczas reakcji.");
    }
  };


  const handleReport = async (id: number) => {
    if (!window.confirm("Zgłosić tę recenzję?")) return;
    try {
      await api.post(`/books/${bookId}/reviews/${id}/report`);
      alert("Zgłoszenie wysłane.");
    } catch (err) {
      console.error(err);
      alert("Błąd podczas zgłaszania recenzji.");
    }
  };

  if (!open) return null;

  // 🔹 renderowanie gwiazdek (do formularza)
  const renderStars = () => {
    return [1, 2, 3, 4, 5].map((i) => {
      let symbol = "☆";
      if (rating >= i) symbol = "★";
      else if (rating >= i - 0.5) symbol = "⯪";

      return (
        <span
          key={i}
          className={`cursor-pointer text-xl ${symbol !== "☆" ? "text-yellow-400" : "text-slate-400"
            }`}
          onClick={(e) => {
            const { offsetX, target } = e.nativeEvent as MouseEvent;
            const width = (target as HTMLElement).offsetWidth;
            if (offsetX < width / 2) {
              setRating(i - 0.5);
            } else {
              setRating(i);
            }
          }}
        >
          {symbol}
        </span>
      );
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-2xl relative max-h-[90vh] overflow-hidden flex flex-col">
        {/* zamknięcie */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-slate-500 hover:text-slate-700"
        >
          <X size={20} />
        </button>

        <h2 className="text-lg font-semibold mb-4">
          Recenzje: <span className="text-indigo-700">{bookTitle}</span>
        </h2>

        {/* formularz */}
        <div className="border-b pb-4 mb-4">
          <div className="flex gap-1 mb-2">{renderStars()}</div>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Twoja recenzja..."
            rows={3}
            className="w-full border border-slate-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-indigo-200 outline-none"
          />
          <div className="mt-3 flex justify-end gap-2">
            {editingId && (
              <button
                onClick={() => {
                  setEditingId(null);
                  setText("");
                  setRating(0);
                }}
                className="px-4 py-2 border rounded-lg text-slate-600 hover:bg-slate-100"
              >
                Anuluj edycję
              </button>
            )}
            <button
              onClick={handleSubmit}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg"
            >
              {editingId ? "Zapisz zmiany" : "Dodaj recenzję"}
            </button>
          </div>
        </div>

        {/* lista recenzji */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <p className="text-center text-slate-500">Ładowanie recenzji...</p>
          ) : reviews.length === 0 ? (
            <p className="text-center text-slate-500">Brak recenzji.</p>
          ) : (
            <ul className="space-y-4">
              {reviews.map((r) => (
                <li key={r.id} className="border-b pb-2">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-slate-800">
                      {r.user?.first_name} {r.user?.last_name}
                      <RoleBadge user={r.user} />
                    </span>
                    <div className="flex items-center gap-2">
                      {r.user?.id === currentUserId ? (
                        <>
                          <button
                            onClick={() => {
                              setEditingId(r.id);
                              setText(r.text);
                              setRating(r.rating);
                            }}
                            className="text-blue-500 hover:text-blue-700"
                            title="Edytuj"
                          >
                            <Pencil size={16} />
                          </button>
                          <button
                            onClick={() => handleDelete(r.id)}
                            className="text-red-500 hover:text-red-700"
                            title="Usuń"
                          >
                            <Trash2 size={16} />
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => handleReact(r.id, "thumbs_up")}
                            className="text-green-600 hover:text-green-800 flex items-center gap-1 text-xs"
                            title="Lubię to"
                          >
                            <ThumbsUp size={16} />
                            {r.reactions?.like ?? 0}
                          </button>
                          <button
                            onClick={() => handleReact(r.id, "thumbs_down")}
                            className="text-orange-600 hover:text-orange-800 flex items-center gap-1 text-xs"
                            title="Nie podoba mi się"
                          >
                            <ThumbsDown size={16} />
                            {r.reactions?.dislike ?? 0}
                          </button>
                          <button
                            onClick={() => handleReport(r.id)}
                            className="text-rose-600 hover:text-rose-800"
                            title="Zgłoś"
                          >
                            <Flag size={16} />
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* gwiazdki */}
                  <div className="flex gap-1 mb-1">
                    {[1, 2, 3, 4, 5].map((i) => {
                      const full = i <= Math.floor(r.rating);
                      const half = !full && i - 0.5 <= r.rating;
                      return (
                        <span
                          key={i}
                          className={
                            full || half ? "text-yellow-400" : "text-slate-300"
                          }
                        >
                          {full ? "★" : half ? "⯪" : "☆"}
                        </span>
                      );
                    })}
                  </div>

                  <p className="text-sm text-slate-700 mb-1">{r.text}</p>

                  <div className="flex justify-end">
                    <span className="text-xs text-slate-500">
                      {new Date(r.created_at).toLocaleDateString("pl-PL")}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
