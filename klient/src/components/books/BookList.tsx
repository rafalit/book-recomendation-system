import BookCard, { Book } from "./BookCard";
import { Loan } from "../../types/loan"; 

type Props = {
  items: Book[];
  loading?: boolean;
  disableLoan?: boolean;
  user?: { id: number; role: string };
  onDeleted?: (id: number) => void;
  onUpdated?: (updatedBook: Book) => void;
  loans?: Loan[];             
  refreshLoans?: () => void;   
  favorites?: Set<number>;
  onToggleFavorite?: (bookId: number) => void;
  selectedBookIds?: Set<number>; // 🔹 wybrane książki do forum
  onToggleBookSelection?: (bookId: number) => void; // 🔹 callback do wyboru książki
  selectedBook?: Book | null; // 🔹 wybrana książka do szczegółów
  setSelectedBook?: (book: Book | null) => void; // 🔹 callback do wyboru książki do szczegółów
};

export default function BookList({
  items,
  loading,
  disableLoan = false,
  user,
  onDeleted,
  onUpdated,
  loans = [],
  refreshLoans,
  favorites,
  onToggleFavorite,
  selectedBookIds,
  onToggleBookSelection,
  selectedBook,
  setSelectedBook,
}: Props) {
  if (loading) {
    return (
      <div className="grid gap-4 p-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="animate-pulse border rounded-xl shadow-sm p-4 flex flex-col h-full bg-white"
          >
            <div className="w-full h-48 bg-slate-200 rounded-md mb-3" />
            <div className="h-4 bg-slate-200 rounded w-3/4 mb-2" />
            <div className="h-3 bg-slate-200 rounded w-1/2" />
          </div>
        ))}
      </div>
    );
  }

  if (!items.length) {
    return (
      <div className="p-6 text-center text-slate-500">
        Ładowanie książek...
      </div>
    );
  }

  return (
    <div className="grid gap-4 p-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 overflow-y-auto">
      {items.map((b) => (
        <BookCard
          key={b.id}
          book={b}
          disableLoan={disableLoan}
          user={user}
          loan={loans.find((l) => l.book_id === b.id)}  // 🔹 przekazujemy całe wypożyczenie
          refreshLoans={refreshLoans}
          onDeleted={onDeleted}
          onUpdated={onUpdated}
          isFavorite={favorites?.has(b.id)}
          onToggleFavorite={onToggleFavorite}
          isSelected={selectedBookIds?.has(b.id)}
          onToggleSelection={onToggleBookSelection}
          selectedBook={selectedBook}
          setSelectedBook={setSelectedBook}
        />
      ))}
    </div>
  );
}
