// src/pages/BooksPage.tsx
import { useEffect, useMemo, useState, useCallback } from "react";
import TopNav from "../components/layout/TopNav";
import UniversitySidebar from "../components/home/UniversitySidebar";
import BookList from "../components/books/BookList";
import BookFilters, { BookFiltersValue } from "../components/books/BookFilters";
import BookAddModal from "../components/books/BookAddModal";
import { Book } from "../components/books/BookCard";
import { useMyLoans } from "../hooks/useMyLoans";
import api from "../lib/api";

type Config = {
  domain_to_uni: Record<string, string>;
  university_faculties: Record<string, string[]>;
};

export default function BooksPage() {
  const [cfg, setCfg] = useState<Config | null>(null);
  const [selected, setSelected] = useState<string>("wszystkie");

  const [allBooks, setAllBooks] = useState<Book[]>([]);
  const [books, setBooks] = useState<Book[]>([]);
  const [categories, setCategories] = useState<string[]>([]);

  const [loading, setLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  
  // 🔹 stan dla wybranych książek do forum
  const [selectedBookIds, setSelectedBookIds] = useState<Set<number>>(new Set());
  
  // Stan dla wybranej książki do szczegółów
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);

  const [filters, setFilters] = useState<BookFiltersValue>({
    query: "",
    sortBy: "newest",
    availableOnly: false,
    favoritesOnly: false,
    categories: ["Wszystkie"], // ✅ domyślnie wszystkie
  });

  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const { loans, refresh } = useMyLoans();

  // ⭐ ulubione (localStorage) - per użytkownik
  const [favoriteIds, setFavoriteIds] = useState<number[]>(() => {
    try {
      const userId = user?.id;
      if (!userId) return [];
      const raw = localStorage.getItem(`favoriteBookIds_${userId}`);
      return raw ? (JSON.parse(raw) as number[]) : [];
    } catch {
      return [];
    }
  });

  const toggleFavorite = (bookId: number) => {
    // Admin nie może dodawać do ulubionych
    if (user?.role === "admin") return;
    
    setFavoriteIds((prev) => {
      const exists = prev.includes(bookId);
      const next = exists ? prev.filter((id) => id !== bookId) : [...prev, bookId];
      try {
        const userId = user?.id;
        if (userId) {
          localStorage.setItem(`favoriteBookIds_${userId}`, JSON.stringify(next));
        }
      } catch {}
      return next;
    });
  };

  // 🔹 funkcja do wyboru książek do forum
  const toggleBookSelection = (bookId: number) => {
    setSelectedBookIds((prev) => {
      const next = new Set(prev);
      if (next.has(bookId)) {
        next.delete(bookId);
      } else {
        next.add(bookId);
      }
      return next;
    });
  };

  // Odśwież ulubione gdy zmieni się użytkownik
  useEffect(() => {
    try {
      const userId = user?.id;
      if (!userId) {
        setFavoriteIds([]);
        return;
      }
      const raw = localStorage.getItem(`favoriteBookIds_${userId}`);
      const ids = raw ? (JSON.parse(raw) as number[]) : [];
      setFavoriteIds(ids);
    } catch {
      setFavoriteIds([]);
    }
  }, [user?.id]);

  // 🎯 rekomendacje
  const [recommendedIds, setRecommendedIds] = useState<Set<number>>(new Set());

  useEffect(() => {
    // pobierz rekomendacje dla zalogowanego użytkownika
    (async () => {
      try {
        const r = await api.get<Book[]>("/books/recommend", { params: { limit: 50 } });
        setRecommendedIds(new Set(r.data.map((b) => b.id)));
      } catch (_) {
        setRecommendedIds(new Set());
      }
    })();
  }, []);

  // pobranie configu
  useEffect(() => {
    api
      .get<Config>("/meta/config")
      .then((res) => setCfg(res.data))
      .catch(() => setCfg({ domain_to_uni: {}, university_faculties: {} }));
  }, []);

  const universities = useMemo(() => {
    if (!cfg) return [];
    return Object.keys(cfg.university_faculties).sort((a, b) =>
      a.localeCompare(b, "pl", { sensitivity: "base" })
    );
  }, [cfg]);

  // ✅ fetchBooks jako funkcja (useCallback, żeby nie robić nowych referencji)
  const fetchBooks = useCallback(
    async (ctrl?: AbortController) => {
      if (!cfg) return;
      setLoading(true);
      try {
        let fetched: Book[] = [];

        if (selected === "wszystkie") {
          const uniNames = universities.slice(0, 17);
          const r = await api.get<Record<string, Book[]>>("/books/multi", {
            params: { q: uniNames, limit_each: 20 },
            signal: ctrl?.signal as any,
          });
          fetched = Object.values(r.data).flat();
        } else {
          const r = await api.get<Book[]>("/books/", {
            params: { q: selected, max_results: 20 },
            signal: ctrl?.signal as any,
          });
          fetched = r.data;
        }

        setAllBooks(fetched);

        // kategorie dla dropdowna
        const setCat = new Set<string>();
        fetched.forEach((b) => {
          if (b.categories) {
            b.categories.split(",").forEach((c) => setCat.add(c.trim()));
          }
        });
        setCategories(Array.from(setCat).sort());
      } catch (e: any) {
        if (e?.name !== "CanceledError") setAllBooks([]);
      } finally {
        setLoading(false);
      }
    },
    [cfg, selected, universities]
  );

  // pobranie książek przy mount i zmianie uczelni
  useEffect(() => {
    const ctrl = new AbortController();
    fetchBooks(ctrl);
    return () => ctrl.abort();
  }, [fetchBooks]);

  // 🔹 filtracja robiona na podstawie allBooks
  useEffect(() => {
    let filtered = [...allBooks];

    if (filters.query) {
      filtered = filtered.filter((b) =>
        b.title.toLowerCase().includes(filters.query.toLowerCase())
      );
    }
    if (filters.availableOnly) {
      filtered = filtered.filter((b) => {
        const loaned = loans.some((l) => l.book_id === b.id && !l.returned_at);
        return (b.available_copies ?? 0) > 0 && !loaned;
      });
    }

    // ⭐ tylko ulubione
    if (filters.favoritesOnly) {
      filtered = filtered.filter((b) => favoriteIds.includes(b.id));
    }
    if (
      filters.categories.length > 0 &&
      !filters.categories.includes("Wszystkie")
    ) {
      filtered = filtered.filter((b) =>
        filters.categories.some((cat) =>
          b.categories?.toLowerCase().includes(cat.toLowerCase())
        )
      );
    }

    // sortowanie
    if (filters.sortBy === "newest") {
      filtered = filtered.sort(
        (a, b) =>
          new Date(b.published_date ?? "1900").getTime() -
          new Date(a.published_date ?? "1900").getTime()
      );
    } else {
      filtered = filtered.sort(
        (a, b) =>
          new Date(a.published_date ?? "2100").getTime() -
          new Date(b.published_date ?? "2100").getTime()
      );
    }

    // 🎯 ułóż rekomendowane na górze (zachowaj kolejność wewnątrz grup)
    if (recommendedIds.size > 0) {
      const recos: Book[] = [];
      const others: Book[] = [];
      for (const b of filtered) {
        (recommendedIds.has(b.id) ? recos : others).push(b);
      }
      filtered = [...recos, ...others];
    }

    setBooks(filtered);
  }, [allBooks, filters, loans, favoriteIds, recommendedIds]);

  return (
    <div className="h-screen overflow-hidden bg-slate-100 dark:bg-slate-900 flex flex-col">
      <TopNav />
      <div className={`px-2 py-4 w-full h-[calc(100vh-80px)] grid grid-cols-1 gap-4 overflow-hidden ${selectedBook ? 'md:grid-cols-[400px,1fr,400px]' : 'md:grid-cols-[400px,1fr]'}`}>
        {/* sidebar uczelni */}
        <div className="h-full overflow-hidden bg-blue-600 text-white rounded-2xl">
          <UniversitySidebar
            universities={universities}
            selected={selected}
            onSelect={setSelected}
          />
        </div>

        {/* prawa kolumna */}
        <section className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-600 h-full flex flex-col overflow-hidden">
          <div className="p-4 border-b flex items-center justify-between">
            <BookFilters
              value={filters}
              onChange={setFilters}
              resultCount={books.length}
              disableAvailableToggle={selected === "wszystkie" || user?.role === "admin"}
              disableFavoritesToggle={user?.role === "admin"}
              categories={categories}
            />

            <div className="flex gap-2">
              {selectedBookIds.size > 0 && user?.role !== "admin" && (
                <button
                  onClick={() => {
                    // Przekieruj do formularza forum z wybranymi książkami
                    const selectedBooks = books.filter(b => selectedBookIds.has(b.id));
                    const bookIds = selectedBooks.map(b => b.id);
                    const bookTitles = selectedBooks.map(b => b.title);
                    const queryParams = new URLSearchParams({
                      book_ids: bookIds.join(','),
                      book_titles: bookTitles.join(',')
                    });
                    window.location.href = `/forum?${queryParams.toString()}`;
                  }}
                  className="px-3 py-1.5 rounded-full bg-green-600 hover:bg-green-700 text-white text-sm font-medium shadow"
                >
                  Rozpocznij dyskusję na forum ({selectedBookIds.size})
                </button>
              )}
              
              {selected !== "wszystkie" && user?.role !== "admin" && (
                <button
                  onClick={() => setShowAddModal(true)}
                  className="px-3 py-1.5 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium shadow"
                >
                  + Dodaj książkę
                </button>
              )}
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            <BookList
              items={books}
              loading={loading}
              disableLoan={selected === "wszystkie" || user?.role === "admin"}
              user={user}
              loans={loans}
              refreshLoans={refresh}
              favorites={new Set(favoriteIds)}
              onToggleFavorite={toggleFavorite}
              selectedBookIds={selectedBookIds}
              onToggleBookSelection={toggleBookSelection}
              onDeleted={(id) =>
                setBooks((prev) => prev.filter((b) => b.id !== id))
              }
              onUpdated={(updatedBook) => {
                setBooks((prev) => 
                  prev.map((b) => b.id === updatedBook.id ? updatedBook : b)
                );
                setAllBooks((prev) => 
                  prev.map((b) => b.id === updatedBook.id ? updatedBook : b)
                );
              }}
              selectedBook={selectedBook}
              setSelectedBook={setSelectedBook}
            />
          </div>
        </section>

        {/* Trzecia kolumna - Szczegóły książki */}
        {selectedBook && (
          <div className="h-full overflow-hidden">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-600 h-full flex flex-col overflow-hidden">
              <div className="p-4 border-b shrink-0 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Szczegóły książki</h2>
                <button
                  onClick={() => setSelectedBook(null)}
                  className="p-2 rounded-lg bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                  aria-label="Zamknij"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-4">
                <div className="space-y-4">
                  {/* Okładka */}
                  <div className="flex justify-center">
                    {selectedBook.thumbnail ? (
                      <img
                        src={selectedBook.thumbnail}
                        alt={selectedBook.title}
                        className="w-48 h-64 object-cover rounded-xl shadow-lg"
                      />
                    ) : (
                      <div className="w-48 h-64 bg-slate-200 dark:bg-slate-700 rounded-xl flex items-center justify-center text-slate-500 dark:text-slate-400">
                        brak okładki
                      </div>
                    )}
                  </div>

                  {/* Tytuł i autor */}
                  <div>
                    <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-2">
                      {selectedBook.title}
                    </h3>
                    <p className="text-lg text-slate-600 dark:text-slate-300">
                      {selectedBook.authors}
                    </p>
                  </div>

                  {/* Opis */}
                  {selectedBook.description && (
                    <div>
                      <h4 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">
                        Opis
                      </h4>
                      <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                        {selectedBook.description}
                      </p>
                    </div>
                  )}

                  {/* Szczegóły */}
                  <div className="space-y-2">
                    {selectedBook.publisher && (
                      <div>
                        <span className="font-semibold text-slate-900 dark:text-slate-100">Wydawca:</span>
                        <span className="ml-2 text-slate-600 dark:text-slate-300">{selectedBook.publisher}</span>
                      </div>
                    )}
                    {selectedBook.published_date && (
                      <div>
                        <span className="font-semibold text-slate-900 dark:text-slate-100">Data wydania:</span>
                        <span className="ml-2 text-slate-600 dark:text-slate-300">{selectedBook.published_date}</span>
                      </div>
                    )}
                    {selectedBook.isbn && (
                      <div>
                        <span className="font-semibold text-slate-900 dark:text-slate-100">ISBN:</span>
                        <span className="ml-2 text-slate-600 dark:text-slate-300">{selectedBook.isbn}</span>
                      </div>
                    )}
                    {selectedBook.available_copies !== undefined && (
                      <div>
                        <span className="font-semibold text-slate-900 dark:text-slate-100">Dostępne kopie:</span>
                        <span className="ml-2 text-slate-600 dark:text-slate-300">{selectedBook.available_copies}</span>
                      </div>
                    )}
                  </div>


                  {/* Kategorie */}
                  {selectedBook.categories && (
                    <div>
                      <h4 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">
                        Kategorie
                      </h4>
                      <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-sm font-medium">
                        {selectedBook.categories}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      {showAddModal && (
        <BookAddModal
          open={showAddModal}
          onClose={() => setShowAddModal(false)}
          university={selected}
          onAdded={() => {
            setShowAddModal(false);
            fetchBooks(); // ✅ odświeżenie po dodaniu
          }}
        />
      )}
    </div>
  );
}
