import BookCard, { Book } from "./BookCard";

export default function BookList({
    items,
    loading,
}: {
    items: Book[];
    loading?: boolean;
}) {
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
                Brak książek do wyświetlenia.
            </div>
        );
    }

    return (
        <div className="grid gap-4 p-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 overflow-y-auto">
            {items.map((book, idx) => (
                <BookCard key={book.id ?? `${book.title}-${idx}`} book={book} />
            ))}
        </div>
    );
}
