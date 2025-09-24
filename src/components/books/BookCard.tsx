import { useState } from "react";
import api from "../../lib/api";
import { Star, MessageSquare } from "lucide-react";
import BookReviewModal from "./BookReviewModal";

export type Book = {
  id: number;
  title: string;
  authors: string;
  thumbnail?: string;
  description?: string;
  avg_rating?: number;
  available_copies?: number;
  published_date?: string;
};

type Props = {
  book: Book;
};

export default function BookCard({ book }: Props) {
  const [rating, setRating] = useState(book.avg_rating || 0);
  const [available, setAvailable] = useState(book.available_copies ?? 0);
  const [showReviewModal, setShowReviewModal] = useState(false);

  const rate = async (value: number) => {
    setRating(value);
    try {
      await api.post(`/books/${book.id}/rate`, { rating: value });
    } catch (err) {
      console.error(err);
    }
  };

  const loan = async () => {
    if (available <= 0) return alert("Brak dostępnych egzemplarzy");
    try {
      await api.post(`/books/${book.id}/loan`, { days: 14 });
      setAvailable((a) => a - 1);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="border rounded-xl shadow-sm p-4 flex flex-col">
      {book.thumbnail ? (
        <img
          src={book.thumbnail}
          alt={book.title}
          className="w-full h-48 object-cover rounded-md mb-3"
        />
      ) : (
        <div className="w-full h-48 bg-slate-200 rounded-md mb-3 flex items-center justify-center text-slate-500">
          brak okładki
        </div>
      )}

      <h3 className="font-semibold line-clamp-2">{book.title}</h3>
      <p className="text-sm text-slate-600 line-clamp-1">{book.authors}</p>

      {/* gwiazdki */}
      <div className="flex items-center gap-1 my-2">
        {[1, 2, 3, 4, 5].map((i) => (
          <Star
            key={i}
            size={18}
            className={`cursor-pointer ${
              i <= rating ? "fill-yellow-400 text-yellow-400" : "text-slate-400"
            }`}
            onClick={() => rate(i)}
          />
        ))}
      </div>

      {/* akcje */}
      <div className="mt-auto flex gap-2">
        <button
          onClick={loan}
          className="flex-1 px-3 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:bg-slate-400"
          disabled={available <= 0}
        >
          {available > 0 ? `Wypożycz (${available})` : "Niedostępna"}
        </button>
        <button
          onClick={() => setShowReviewModal(true)}
          className="px-3 py-2 rounded-lg border border-slate-300 hover:bg-slate-50"
        >
          <MessageSquare size={18} />
        </button>
      </div>

      {/* modal recenzji */}
      {showReviewModal && (
        <BookReviewModal
          bookId={book.id}
          bookTitle={book.title}
          open={showReviewModal}
          onClose={() => setShowReviewModal(false)}
        />
      )}
    </div>
  );
}
