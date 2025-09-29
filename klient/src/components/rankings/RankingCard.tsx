import { Book } from "../books/BookCard";
import { MessageSquare } from "lucide-react";
import { useState } from "react";
import BookReviewModal from "../books/BookReviewModal";

type Props = { book: Book };

export default function RankingCard({ book }: Props) {
  const [showReviewModal, setShowReviewModal] = useState(false);

  return (
    <div className="border rounded-xl shadow-sm p-4 flex flex-col relative">
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

      <div className="text-sm text-slate-500 my-2">
        ⭐ {book.avg_rating?.toFixed(1)} / 5 ({book.reviews_count} recenzji)
      </div>

      <button
        onClick={() => setShowReviewModal(true)}
        className="mt-auto flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-300 hover:bg-slate-50"
      >
        <MessageSquare size={18} /> Zobacz recenzje
      </button>

      {showReviewModal && (
        <BookReviewModal
          bookId={book.id}
          bookTitle={book.title}
          open={showReviewModal}
          onClose={() => setShowReviewModal(false)}
          readOnly={true} // 🔥 brak możliwości dodawania recenzji
        />
      )}
    </div>
  );
}
