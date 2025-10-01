import { Book } from "../books/BookCard";
import { MessageSquare } from "lucide-react";
import { useState } from "react";
import BookReviewModal from "../books/BookReviewModal";

type Props = { book: Book };

export default function RankingCard({ book }: Props) {
  const [showReviewModal, setShowReviewModal] = useState(false);

  return (
    <div className="border border-slate-200 dark:border-slate-600 rounded-xl shadow-sm p-4 flex flex-col relative bg-white dark:bg-slate-800">
      {book.thumbnail ? (
        <img
          src={book.thumbnail}
          alt={book.title}
          className="w-full h-48 object-cover rounded-md mb-3"
        />
      ) : (
        <div className="w-full h-48 bg-slate-200 dark:bg-slate-700 rounded-md mb-3 flex items-center justify-center text-slate-500 dark:text-slate-400">
          brak okładki
        </div>
      )}

      <h3 className="font-semibold line-clamp-2 text-slate-900 dark:text-slate-100">{book.title}</h3>
      <p className="text-sm text-slate-600 dark:text-slate-300 line-clamp-1">{book.authors}</p>

      <div className="text-sm text-slate-500 dark:text-slate-400 my-2">
        ⭐ {book.avg_rating?.toFixed(1)} / 5 ({book.reviews_count} recenzji)
      </div>

      <button
        onClick={() => setShowReviewModal(true)}
        className="mt-auto flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200"
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
