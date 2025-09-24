import { useEffect, useMemo, useState } from "react";
import TopNav from "../components/layout/TopNav";
import UniversitySidebar from "../components/home/UniversitySidebar";
import BookList from "../components/books/BookList";
import BookFilters, { BookFiltersValue } from "../components/books/BookFilters";
import { Book } from "../components/books/BookCard";
import api from "../lib/api";

type Config = {
  domain_to_uni: Record<string, string>;
  university_faculties: Record<string, string[]>;
};

export default function BooksPage() {
  const [cfg, setCfg] = useState<Config | null>(null);
  const [selected, setSelected] = useState<string>("wszystkie");
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState<BookFiltersValue>({
    query: "",
    sortBy: "newest",
  });

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

  // pobranie książek
  useEffect(() => {
    if (!cfg) return;
    const ctrl = new AbortController();

    const fetchBooks = async () => {
      setLoading(true);
      try {
        let fetched: Book[] = [];
        if (selected === "wszystkie") {
          const uniNames = universities.slice(0, 6);
          const r = await api.get<Record<string, Book[]>>("/books/multi", {
            params: { q: uniNames, limit_each: 6 },
            signal: ctrl.signal as any,
          });
          fetched = Object.values(r.data).flat();
        } else {
          const r = await api.get<Book[]>("/books", {
            params: { q: selected, max_results: 24 },
            signal: ctrl.signal as any,
          });
          fetched = r.data;
        }

        // 🔎 filtrowanie i sortowanie
        if (filters.query) {
          fetched = fetched.filter((b) =>
            b.title.toLowerCase().includes(filters.query.toLowerCase())
          );
        }
        if (filters.sortBy === "available") {
          fetched = fetched.sort(
            (a, b) => (b.available_copies ?? 0) - (a.available_copies ?? 0)
          );
        } else if (filters.sortBy === "newest") {
          fetched = fetched.sort(
            (a, b) =>
              new Date(b.published_date ?? "1900").getTime() -
              new Date(a.published_date ?? "1900").getTime()
          );
        } else if (filters.sortBy === "oldest") {
          fetched = fetched.sort(
            (a, b) =>
              new Date(a.published_date ?? "2100").getTime() -
              new Date(b.published_date ?? "2100").getTime()
          );
        }

        setBooks(fetched);
      } catch (e: any) {
        if (e?.name !== "CanceledError") setBooks([]);
      } finally {
        setLoading(false);
      }
    };

    fetchBooks();
    return () => ctrl.abort();
  }, [cfg, selected, universities, filters]);

  return (
    <div className="h-screen overflow-hidden bg-slate-100 flex flex-col">
      <TopNav />
      <div
        className="mx-auto max-w-[2000px] px-2 py-4 w-full
             h-[calc(100vh-80px)] grid grid-cols-1 md:grid-cols-[400px,1fr] gap-4 overflow-hidden"
      >
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
          <div className="p-4 border-b">
            <BookFilters
              value={filters}
              onChange={setFilters}
              resultCount={books.length}
            />
          </div>
          <div className="flex-1 overflow-y-auto">
            <BookList items={books} loading={loading} />
          </div>
        </section>
      </div>
    </div>
  );
}
