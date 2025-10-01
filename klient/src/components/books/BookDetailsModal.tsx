import React from "react";

import { X } from "lucide-react";

import { Book } from "./BookCard";

type Props = {
  open: boolean;
  onClose: () => void;
  book: Book;
};

export default function BookDetailsModal({ open, onClose, book }: Props) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[1000]"
      aria-modal="true"
      role="dialog"
    >
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="absolute inset-0 flex items-start sm:items-center justify-center p-4 overflow-y-auto">
        <div className="relative w-full max-w-3xl bg-white rounded-2xl shadow-xl border border-slate-200">
          <button
            onClick={onClose}
            className="absolute top-3 right-3 p-2 rounded-lg hover:bg-slate-100"
            aria-label="Zamknij"
          >
            <X size={18} />
          </button>

          <div className="grid grid-cols-1 md:grid-cols-[220px,1fr] gap-4 p-4">
            <div>
              {book.thumbnail ? (
                <img
                  src={book.thumbnail}
                  alt={book.title}
                  className="w-full h-[320px] object-cover rounded-xl border"
                />
              ) : (
                <div className="w-full h-[320px] rounded-xl bg-slate-200 flex items-center justify-center text-slate-500">
                  brak okładki
                </div>
              )}
            </div>

            <div className="min-w-0">
              <h3 className="text-xl font-semibold break-words">{book.title}</h3>
              <div className="text-slate-600 mt-1 break-words">
                {book.authors}
              </div>

              <div className="mt-2 flex flex-wrap gap-3 text-sm text-slate-600">
                {book.published_date && (
                  <span className="px-2 py-0.5 rounded-full border bg-slate-50">
                    Rok: {book.published_date}
                  </span>
                )}
                {book.categories && (
                  <span className="px-2 py-0.5 rounded-full border bg-slate-50">
                    Kategorie: {book.categories}
                  </span>
                )}
                {book.avg_rating != null && (
                  <span className="px-2 py-0.5 rounded-full border bg-yellow-50 text-yellow-700 border-yellow-200">
                    Średnia: {book.avg_rating?.toFixed(1)} / 5
                  </span>
                )}
                {book.reviews_count != null && (
                  <span className="px-2 py-0.5 rounded-full border bg-indigo-50 text-indigo-700 border-indigo-200">
                    Recenzje: {book.reviews_count}
                  </span>
                )}
              </div>

              {book.description && (
                <div className="mt-4">
                  <div className="text-sm font-medium text-slate-700 mb-1">
                    Opis
                  </div>
                  <div className="prose prose-sm max-w-none text-slate-700 whitespace-pre-wrap break-words">
                    {book.description}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


