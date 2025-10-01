import { useEffect, useMemo, useState, useCallback } from "react";
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
  const [allBooks, setAllBooks] = useState<any[]>([]);
  const [books, setBooks] = useState<any[]>([]);
  const [categories, setCategories] = useState<string[]>([]);

  const [filters, setFilters] = useState<RankingFiltersValue>({
    sortBy: "avg_rating",
    order: "desc",
    minStars: 0,
    maxStars: 5,
    categories: ["Wszystkie"],
    year: null,
  });

  // 🔹 pobieramy config
  useEffect(() => {
    api
      .get<Config>("/meta/config")
      .then((res) => setCfg(res.data))
      .catch(() => setCfg({ domain_to_uni: {}, university_faculties: {} }));
  }, []);

  // 🔹 lista uczelni
  const universities = useMemo(() => {
    if (!cfg) return [];
    return Object.keys(cfg.university_faculties).sort((a, b) =>
      a.localeCompare(b, "pl", { sensitivity: "base" })
    );
  }, [cfg]);

  // 🔹 pobieramy książki (pełny zestaw)
  const fetchBooks = useCallback(
    async (ctrl?: AbortController) => {
      if (!cfg) return;
      setLoading(true);
      try {
        let fetched: any[] = [];

        if (selected === "wszystkie") {
          const uniNames = universities.slice(0, 17);
          const r = await api.get<Record<string, any[]>>("/rankings/multi", {
            params: {
              q: uniNames,
              limit_each: 20,
            },
            signal: ctrl?.signal as any,
          });
          fetched = Object.values(r.data).flat();
        } else {
          const r = await api.get<any[]>("/rankings", {
            params: {
              uni: selected,
              limit: 20,
            },
            signal: ctrl?.signal as any,
          });
          fetched = r.data;
        }

        setAllBooks(fetched);

        // 🔹 kategorie tylko raz zbudowane z pełnych danych
        const setCat = new Set<string>();
        fetched.forEach((b) => {
          if (b.categories) {
            b.categories.split(",").forEach((c: string) => setCat.add(c.trim()));
          }
        });
        setCategories(Array.from(setCat).sort());
      } catch (e: any) {
        if (e?.name !== "CanceledError") {
          console.error("❌ Błąd pobierania rankingów", e);
          setAllBooks([]);
        }
      } finally {
        setLoading(false);
      }
    },
    [cfg, selected, universities]
  );

  // 🔹 fetch przy zmianie uczelni
  useEffect(() => {
    const ctrl = new AbortController();
    fetchBooks(ctrl);
    return () => ctrl.abort();
  }, [fetchBooks]);

  // 🔹 filtracja robiona lokalnie na podstawie allBooks
  useEffect(() => {
    let filtered = [...allBooks];

    // gwiazdki
    filtered = filtered.filter(
      (b) =>
        (b.avg_rating ?? 0) >= filters.minStars &&
        (b.avg_rating ?? 0) <= filters.maxStars
    );

    // kategorie
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

    // rok
    if (filters.year) {
      filtered = filtered.filter((b) => {
        const y = parseInt(b.published_date?.slice(0, 4));
        return y === filters.year;
      });
    }

    // sortowanie
    if (filters.sortBy === "avg_rating") {
      filtered.sort((a, b) =>
        filters.order === "asc"
          ? (a.avg_rating ?? 0) - (b.avg_rating ?? 0)
          : (b.avg_rating ?? 0) - (a.avg_rating ?? 0)
      );
    } else if (filters.sortBy === "reviews_count") {
      filtered.sort((a, b) =>
        filters.order === "asc"
          ? (a.reviews_count ?? 0) - (b.reviews_count ?? 0)
          : (b.reviews_count ?? 0) - (a.reviews_count ?? 0)
      );
    } else {
      // Alfabetycznie po tytule
      filtered.sort((a, b) => {
        const at = a.title || "";
        const bt = b.title || "";
        const cmp = at.localeCompare(bt, "pl", { sensitivity: "base" });
        return filters.order === "asc" ? cmp : -cmp;
      });
    }

    setBooks(filtered);
  }, [allBooks, filters]);

  return (
    <div className="h-screen overflow-hidden bg-slate-100 dark:bg-slate-900 flex flex-col">
      <TopNav />
      <div
        className="px-2 py-4 w-full
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
        <section className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-600 h-full flex flex-col overflow-hidden">
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
