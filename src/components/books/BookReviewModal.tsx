import { useEffect, useState } from "react";
import { X } from "lucide-react";
import api from "../../lib/api";

type Review = {
  id: number;
  user: { first_name: string; last_name: string };
  rating: number;
  text: string;
  created_at: string;
};

type Props = {
  bookId: number;
  bookTitle: string;
  open: boolean;
  onClose: () => void;
};

export default function BookReviewModal({ bookId, bookTitle, open, onClose }: Props) {
  const [rating, setRating] = useState(0);
  const [text, setText] = useState("");
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(false);

  // 🔎 pobranie istniejących recenzji tylko gdy modal otwarty
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
      const res = await api.post<Review>(`/books/${bookId}/review`, {
        rating,
        text,
      });
      setReviews((prev) => [res.data, ...prev]); // dopisz nową recenzję
      setRating(0);
      setText("");
    } catch (err) {
      console.error(err);
      alert("Błąd podczas dodawania recenzji.");
    }
  };

  // 🔴 teraz dopiero sprawdzamy `open`
  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-2xl relative max-h-[90vh] overflow-hidden flex flex-col">
        {/* zamknij */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-slate-500 hover:text-slate-700"
        >
          <X size={20} />
        </button>

        <h2 className="text-lg font-semibold mb-4">
          Recenzje: <span className="text-indigo-700">{bookTitle}</span>
        </h2>

        {/* formularz dodania recenzji */}
        <div className="border-b pb-4 mb-4">
          <div className="flex gap-1 mb-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <button
                key={i}
                onClick={() => setRating(i)}
                className={`text-2xl ${i <= rating ? "text-yellow-400" : "text-slate-300"}`}
              >
                ★
              </button>
            ))}
          </div>

          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Twoja recenzja..."
            rows={3}
            className="w-full border border-slate-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-indigo-200 outline-none"
          />

          <div className="mt-3 flex justify-end">
            <button
              onClick={handleSubmit}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg"
            >
              Dodaj recenzję
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
                      {r.user.first_name} {r.user.last_name}
                    </span>
                    <span className="text-xs text-slate-500">
                      {new Date(r.created_at).toLocaleDateString("pl-PL")}
                    </span>
                  </div>
                  <div className="flex gap-1 mb-1">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <span key={i} className={i <= r.rating ? "text-yellow-400" : "text-slate-300"}>
                        ★
                      </span>
                    ))}
                  </div>
                  <p className="text-sm text-slate-700">{r.text}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
