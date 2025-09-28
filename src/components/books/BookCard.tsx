// src/components/books/BookCard.tsx
import { useState } from "react";
import { MessageSquare, Trash2 } from "lucide-react";
import BookReviewModal from "./BookReviewModal";
import BookLoanModal from "./BookLoanModal";
import api from "../../lib/api";
import { Loan } from "../../types/loan";

export type Book = {
  id: number;
  google_id?: string | null;
  isbn?: string;
  title: string;
  authors: string;
  thumbnail?: string;
  description?: string;
  avg_rating?: number;
  ratings_count?: number;
  reviews_count?: number;
  available_copies?: number;
  published_date?: string;
  created_by?: number;
  categories?: string; 
};

type Props = {
  book: Book;
  disableLoan?: boolean;
  user?: { id: number; role: string };
  onDeleted?: (id: number) => void;
  loan?: Loan;                 // 🔹 aktywne wypożyczenie tej książki
  refreshLoans?: () => void;   // 🔹 callback do odświeżania
};

export default function BookCard({
  book,
  disableLoan = false,
  user,
  onDeleted,
  loan,
  refreshLoans,
}: Props) {
  const [available, setAvailable] = useState(book.available_copies ?? 0);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showLoanModal, setShowLoanModal] = useState(false);

  const loanBook = async ({ due_date }: { due_date: string }) => {
    try {
      await api.post(`/books/${book.id}/loan`, { due_date });
      setAvailable((a) => a - 1);
      refreshLoans?.();
    } catch (err) {
      console.error("❌ Błąd wypożyczenia", err);
    }
  };

  const returnBook = async () => {
    try {
      await api.post(`/books/${book.id}/return`);
      setAvailable((a) => a + 1);
      refreshLoans?.();
      alert("📕 Książka została zwrócona!");
    } catch (err: any) {
      console.error("❌ Błąd zwrotu", err);
      alert(err.response?.data?.detail || "Nie udało się zwrócić książki");
    }
  };

  const handleDelete = async () => {
    if (book.google_id != null) {
      alert("❌ Nie można usuwać książek z Google Books");
      return;
    }
    if (!window.confirm("Na pewno chcesz usunąć tę książkę?")) return;

    try {
      await api.delete(`/books/${book.id}`);
      alert("📕 Książka usunięta");
      onDeleted?.(book.id);
    } catch (err) {
      console.error("❌ Błąd usuwania", err);
      alert("Nie udało się usunąć książki");
    }
  };

  const renderStars = () =>
    [1, 2, 3, 4, 5].map((i) => {
      let symbol = "☆";
      if ((book.avg_rating ?? 0) >= i) symbol = "★";
      else if ((book.avg_rating ?? 0) >= i - 0.5) symbol = "⯪";

      return (
        <span
          key={i}
          className={`text-lg ${symbol !== "☆" ? "text-yellow-400" : "text-slate-300"
            }`}
        >
          {symbol}
        </span>
      );
    });

  return (
    <div className="relative border rounded-xl shadow-sm p-4 flex flex-col">
      {/* 🔹 usuń (tylko własne lub admin) */}
      {book.google_id == null &&
        (user?.id === book.created_by || user?.role === "admin") && (
          <button
            onClick={handleDelete}
            className="absolute top-2 right-2 p-1 bg-red-600 text-white rounded-full hover:bg-red-700"
          >
            <Trash2 size={16} />
          </button>
        )}

      {/* 🔹 okładka */}
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

      {/* 🔹 oceny */}
      <div className="flex items-center gap-2 my-2">
        <div className="flex items-center gap-1">{renderStars()}</div>
        <span className="text-sm text-slate-500">
          {book.avg_rating?.toFixed(1)} / 5
          {book.reviews_count !== undefined && (
            <> ({book.reviews_count} recenzji)</>
          )}
        </span>
      </div>

      {/* 🔹 akcje */}
      <div className="mt-auto flex gap-2">
        {!disableLoan && (
          loan ? (
            loan.user_id === user?.id ? (
              <button
                onClick={returnBook}
                className="flex-1 px-3 py-2 rounded-lg bg-rose-600 text-white hover:bg-rose-700"
              >
                Zwróć książkę
              </button>
            ) : (
              <button
                disabled
                className="flex-1 px-3 py-2 rounded-lg bg-gray-400 text-white cursor-not-allowed"
              >
                Niedostępna
              </button>
            )
          ) : (
            <button
              onClick={() => setShowLoanModal(true)}
              className="flex-1 px-3 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:bg-slate-400"
              disabled={available <= 0}
            >
              {available > 0 ? `Wypożycz (${available})` : "Niedostępna"}
            </button>
          )
        )}
        <button
          onClick={() => setShowReviewModal(true)}
          className="px-3 py-2 rounded-lg border border-slate-300 hover:bg-slate-50"
        >
          <MessageSquare size={18} />
        </button>
      </div>

      {/* 🔹 modale */}
      {showReviewModal && (
        <BookReviewModal
          bookId={book.id ?? 0}
          bookTitle={book.title}
          open={showReviewModal}
          onClose={() => setShowReviewModal(false)}
          onBookUpdate={(data) => {
            if (data.avg_rating !== undefined) {
              book.avg_rating = data.avg_rating;
            }
            if (data.reviews_count !== undefined) {
              book.reviews_count = data.reviews_count;
              book.ratings_count = data.reviews_count;
            }
          }}
        />
      )}

      {showLoanModal && (
        <BookLoanModal
          open={showLoanModal}
          onClose={() => setShowLoanModal(false)}
          onSubmit={loanBook}
          bookTitle={book.title}
          available={available}
        />
      )}
    </div>
  );
}
