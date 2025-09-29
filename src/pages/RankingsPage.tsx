import { useEffect, useMemo, useState } from "react";
import TopNav from "../components/layout/TopNav";
import UniversitySidebar from "../components/home/UniversitySidebar";
import RankingList from "../components/rankings/RankingList";
import RankingFilters, { RankingFiltersValue } from "../components/rankings/RankingFilters";
import api from "../lib/api";

type Config = {
  domain_to_uni: Record<string, string>;
  university_faculties: Record<string, string[]>;
};

export default function RankingsPage() {
  const [cfg, setCfg] = useState<Config | null>(null);
  const [selected, setSelected] = useState<string>("wszystkie");

  const [loading, setLoading] = useState(false);
  const [books, setBooks] = useState<any[]>([]);
  const [categories, setCategories] = useState<string[]>([]);

  const [filters, setFilters] = useState<RankingFiltersValue>({
    sortBy: "avg_rating",
    order: "desc",
    minStars: 0,
    maxStars: 5,
    categories: ["Wszystkie"],
    year: "",
  });

  // 🔹 pobieramy config z backendu
  useEffect(() => {
    api
      .get<Config>("/meta/config")
      .then((res) => {
        setCfg(res.data);
        if ((res.data as any).categories) {
          setCategories((res.data as any).categories.sort());
        }
      })
      .catch(() => setCfg({ domain_to_uni: {}, university_faculties: {} }));
  }, []);

  // 🔹 wyciągamy listę uczelni
  const universities = useMemo(() => {
    if (!cfg) return [];
    return Object.keys(cfg.university_faculties).sort((a, b) =>
      a.localeCompare(b, "pl", { sensitivity: "base" })
    );
  }, [cfg]);

  // 🔹 pobieramy książki dla rankingów
  useEffect(() => {
    if (!cfg) return;
    const ctrl = new AbortController();

    const fetchBooks = async () => {
      setLoading(true);
      try {
        if (selected === "wszystkie") {
          // ✅ nowe: rankings/multi
          const uniNames = universities.slice(0, 17); // limit jak w BooksPage
          const r = await api.get<Record<string, any[]>>("/rankings/multi", {
            params: {
              q: uniNames,
              min_stars: filters.minStars,
              max_stars: filters.maxStars,
              sort_by: filters.sortBy,
              order: filters.order,
              categories:
                filters.categories && !filters.categories.includes("Wszystkie")
                  ? filters.categories
                  : undefined,
              year: filters.year || undefined,
              limit_each: 200,
            },
            signal: ctrl.signal as any,
          });
          // scal do jednej tablicy
          setBooks(Object.values(r.data).flat());
        } else {
          // 🔹 pojedyncza uczelnia
          const r = await api.get<any[]>("/rankings", {
            params: {
              uni: selected,
              min_stars: filters.minStars,
              max_stars: filters.maxStars,
              sort_by: filters.sortBy,
              order: filters.order,
              categories:
                filters.categories && !filters.categories.includes("Wszystkie")
                  ? filters.categories
                  : undefined,
              year: filters.year || undefined,
              limit: 200,
            },
            signal: ctrl.signal as any,
          });
          setBooks(r.data);
        }
      } catch (e) {
        console.error("❌ Błąd pobierania rankingów", e);
        setBooks([]);
      } finally {
        setLoading(false);
      }
    };

    fetchBooks();
    return () => ctrl.abort();
  }, [cfg, selected, universities, filters]);

  // 🔹 aktualizacja kategorii na podstawie pobranych książek
  useEffect(() => {
    if (!books.length) {
      setCategories([]);
      return;
    }
    const setCat = new Set<string>();
    books.forEach((b) => {
      if (b.categories) {
        b.categories.split(",").forEach((c: string) => setCat.add(c.trim()));
      }
    });
    setCategories(Array.from(setCat).sort());
  }, [books]);

  return (
    <div className="h-screen overflow-hidden bg-slate-100 flex flex-col">
      <TopNav />
      <div
        className="mx-auto max-w-[2000px] px-2 py-4 w-full
             h-[calc(100vh-80px)] grid grid-cols-1 md:grid-cols-[400px,1fr] gap-4 overflow-hidden"
      >
        {/* 🔹 sidebar uczelni */}
        <div className="h-full overflow-hidden bg-blue-600 text-white rounded-2xl">
          <UniversitySidebar
            universities={universities}
            selected={selected}
            onSelect={setSelected}
          />
        </div>

        {/* 🔹 prawa kolumna */}
        <section className="bg-white rounded-2xl shadow-sm border border-slate-200 h-full flex flex-col overflow-hidden">
          <div className="p-4 border-b flex items-center justify-between">
            <RankingFilters
              value={filters}
              onChange={setFilters}
              resultCount={books.length}
              categories={categories}
            />
          </div>
          <div className="flex-1 overflow-y-auto">
            <RankingList items={books} loading={loading} />
          </div>
        </section>
      </div>
    </div>
  );
}
