// src/components/books/BookCard.tsx
import { useState } from "react";
import { MessageSquare, Trash2, Star as StarIcon, Edit } from "lucide-react";
import BookReviewModal from "./BookReviewModal";
import BookLoanModal from "./BookLoanModal";
import BookEditModal from "./BookEditModal";
import ConfirmDialog from "../ui/ConfirmDialog";
import api from "../../lib/api";
import { Loan } from "../../types/loan";

export type Book = {
  id: number;
  google_id?: string | null;
  isbn?: string;
  title: string;
  authors: string;
  publisher?: string;
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
  onUpdated?: (updatedBook: Book) => void;
  loan?: Loan;                 // 🔹 aktywne wypożyczenie tej książki
  refreshLoans?: () => void;   // 🔹 callback do odświeżania
  isFavorite?: boolean;
  onToggleFavorite?: (bookId: number) => void;
  isSelected?: boolean;       // 🔹 czy książka jest wybrana do forum
  onToggleSelection?: (bookId: number) => void; // 🔹 callback do wyboru książki
  selectedBook?: Book | null; // 🔹 wybrana książka do szczegółów
  setSelectedBook?: (book: Book | null) => void; // 🔹 callback do wyboru książki do szczegółów
};

export default function BookCard({
  book,
  disableLoan = false,
  user,
  onDeleted,
  onUpdated,
  loan,
  refreshLoans,
  isFavorite = false,
  onToggleFavorite,
  isSelected = false,
  onToggleSelection,
  selectedBook,
  setSelectedBook,
}: Props) {
  const [available, setAvailable] = useState(book.available_copies ?? 0);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showLoanModal, setShowLoanModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  const loanBook = async ({ due_date }: { due_date: string }) => {
    try {
      await api.post(`/books/${book.id}/loan`, { due_date });
      setAvailable((a) => a - 1);
      refreshLoans?.();
    } catch (err: any) {
      console.error("❌ Błąd wypożyczenia", err);
      const errorMessage = err.response?.data?.detail || "Nie udało się wypożyczyć książki";
      alert(`Błąd wypożyczenia: ${errorMessage}`);
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

  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (book.google_id != null) {
      alert("❌ Nie można usuwać książek z Google Books");
      return;
    }
    setShowDeleteDialog(true);
  };

  const handleDeleteConfirm = async () => {
    setIsDeleting(true);
    try {
      await api.delete(`/books/${book.id}`);
      alert("📕 Książka usunięta");
      onDeleted?.(book.id);
      setShowDeleteDialog(false);
    } catch (err) {
      console.error("❌ Błąd usuwania", err);
      alert("Nie udało się usunąć książki");
    } finally {
      setIsDeleting(false);
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
    <div className="relative border border-slate-200 dark:border-slate-600 rounded-xl shadow-sm p-4 flex flex-col bg-white dark:bg-slate-800">
      {/* 🔹 lewa-góra: białe kółko do wyboru książek */}
      {onToggleSelection && (
        <button
          onClick={() => onToggleSelection(book.id)}
          className={`absolute top-2 left-2 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
            isSelected 
              ? "bg-green-500 border-green-500 text-white" 
              : "bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600 hover:border-green-400"
          }`}
          title={isSelected ? "Usuń z wyboru" : "Wybierz do dyskusji"}
        >
          {isSelected && <span className="text-xs">✓</span>}
        </button>
      )}
      
      {/* 🔹 prawa-góra: przyciski akcji */}
      {book.google_id == null && user?.id === book.created_by ? (
        <div className="absolute top-2 right-2 flex gap-1">
          <button
            onClick={() => setShowEditModal(true)}
            className="p-1 bg-indigo-600 text-white rounded-full hover:bg-indigo-700"
            title="Edytuj książkę"
          >
            <Edit size={16} />
          </button>
          <button
            onClick={handleDelete}
            className="p-1 bg-red-600 text-white rounded-full hover:bg-red-700"
            title="Usuń książkę"
          >
            <Trash2 size={16} />
          </button>
        </div>
      ) : book.google_id == null && user?.role === "admin" ? (
        <button
          onClick={handleDelete}
          className="absolute top-2 right-2 p-1 bg-red-600 text-white rounded-full hover:bg-red-700"
          title="Usuń książkę"
        >
          <Trash2 size={16} />
        </button>
      ) : user?.role !== "admin" ? (
        <button
          onClick={() => onToggleFavorite?.(book.id)}
          className={`absolute top-2 right-2 p-1 rounded-full border ${
            isFavorite ? "bg-yellow-400 text-white border-yellow-500" : "bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 border-slate-300 dark:border-slate-600"
          } hover:bg-yellow-100 dark:hover:bg-yellow-900`}
          title={isFavorite ? "Usuń z ulubionych" : "Dodaj do ulubionych"}
        >
          <StarIcon size={16} fill={isFavorite ? "currentColor" : "none"} />
        </button>
      ) : null}

      {/* 🔹 okładka */}
      {book.thumbnail ? (
        <img
          src={book.thumbnail}
          alt={book.title}
          className="w-full h-48 object-cover rounded-md mb-3 cursor-pointer"
          onClick={() => setSelectedBook?.(book)}
        />
      ) : (
        <div
          className="w-full h-48 bg-slate-200 dark:bg-slate-700 rounded-md mb-3 flex items-center justify-center text-slate-500 dark:text-slate-400 cursor-pointer"
          onClick={() => setSelectedBook?.(book)}
        >
          brak okładki
        </div>
      )}

      <h3 className="font-semibold line-clamp-2 text-slate-900 dark:text-slate-100">{book.title}</h3>
      <p className="text-sm text-slate-600 dark:text-slate-300 line-clamp-1">{book.authors}</p>

      {/* 🔹 oceny */}
      <div className="flex items-center gap-2 my-2">
        <div className="flex items-center gap-1">{renderStars()}</div>
        <span className="text-sm text-slate-500 dark:text-slate-400">
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
          className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200"
          title={user?.role === "admin" ? "Przeglądaj i moderuj recenzje" : "Dodaj recenzję"}
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
          readOnly={user?.role === "admin"}
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


      {showEditModal && (
        <BookEditModal
          open={showEditModal}
          onClose={() => setShowEditModal(false)}
          book={book}
          onUpdated={(updatedBook) => {
            // Update the book data in the parent component
            if (onUpdated) {
              onUpdated(updatedBook);
            }
            // Update local state
            setAvailable(updatedBook.available_copies ?? 0);
          }}
        />
      )}

      <ConfirmDialog
        isOpen={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        onConfirm={handleDeleteConfirm}
        title="Usuń książkę"
        message="Czy na pewno chcesz usunąć tę książkę? Ta operacja jest nieodwracalna."
        confirmText="Usuń"
        cancelText="Anuluj"
        type="danger"
        isLoading={isDeleting}
      />
    </div>
  );
}
