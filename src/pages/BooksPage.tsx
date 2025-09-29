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

  const [filters, setFilters] = useState<BookFiltersValue>({
    query: "",
    sortBy: "newest",
    availableOnly: false,
    categories: ["Wszystkie"], // ✅ domyślnie wszystkie
  });

  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const { loans, refresh } = useMyLoans();

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
            params: { q: uniNames, limit_each: 200 },
            signal: ctrl?.signal as any,
          });
          fetched = Object.values(r.data).flat();
        } else {
          const r = await api.get<Book[]>("/books", {
            params: { q: selected, max_results: 200 },
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

    setBooks(filtered);
  }, [allBooks, filters, loans]);

  return (
    <div className="h-screen overflow-hidden bg-slate-100 flex flex-col">
      <TopNav />
      <div className="mx-auto max-w-[2000px] px-2 py-4 w-full h-[calc(100vh-80px)] grid grid-cols-1 md:grid-cols-[400px,1fr] gap-4 overflow-hidden">
        {/* sidebar uczelni */}
        <div className="h-full overflow-hidden bg-blue-600 text-white rounded-2xl">
          <UniversitySidebar
            universities={universities}
            selected={selected}
            onSelect={setSelected}
          />
        </div>

        {/* prawa kolumna */}
        <section className="bg-white rounded-2xl shadow-sm border border-slate-200 h-full flex flex-col overflow-hidden">
          <div className="p-4 border-b flex items-center justify-between">
            <BookFilters
              value={filters}
              onChange={setFilters}
              resultCount={books.length}
              disableAvailableToggle={selected === "wszystkie"}
              categories={categories}
            />

            {selected !== "wszystkie" && (
              <button
                onClick={() => setShowAddModal(true)}
                className="px-3 py-1.5 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium shadow"
              >
                + Dodaj książkę
              </button>
            )}
          </div>
          <div className="flex-1 overflow-y-auto">
            <BookList
              items={books}
              loading={loading}
              disableLoan={selected === "wszystkie"}
              user={user}
              loans={loans}
              refreshLoans={refresh}
              onDeleted={(id) =>
                setBooks((prev) => prev.filter((b) => b.id !== id))
              }
            />
          </div>
        </section>
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
