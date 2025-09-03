import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import TopNav from "../components/layout/TopNav";
import UniversitySidebar from "../components/home/UniversitySidebar";
import NewsList, { NewsItem } from "../components/home/NewsList";
import NewsFilters, { Filters } from "../components/home/NewsFilters";
import { hostFrom } from "../components/home/NewsCard";

type Config = {
  domain_to_uni: Record<string, string>;
  university_faculties: Record<string, string[]>;
  titles: string[];
};

function datePasses(dateStr?: string | null, range: Filters["timeRange"] = "any") {
  if (range === "any" || !dateStr) return true;
  const t = Date.parse(dateStr);
  if (Number.isNaN(t)) return true;
  const diff = Date.now() - t;
  const day = 24 * 60 * 60 * 1000;
  const limits: Record<Filters["timeRange"], number> = {
    any: Infinity, "24h": day, "7d": 7 * day, "30d": 30 * day, year: 365 * day,
  };
  return diff <= limits[range];
}

function publisherOf(n: NewsItem): string | null {
  if (n.snippet) {
    const div = document.createElement("div");
    div.innerHTML = n.snippet;
    const a = div.querySelector("a[href]");
    if (a) {
      try {
        return new URL(a.getAttribute("href") || "").hostname.replace(/^www\./, "");
      } catch {/* ignore */}
    }
  }
  const m = n.title.match(/[-–—]\s*([^–—-]+)$/);
  if (m) return m[1].trim();
  return n.link ? hostFrom(n.link) : null;
}

export default function HomePage() {
  const [cfg, setCfg] = useState<Config | null>(null);
  const [selected, setSelected] = useState<string>("wszystkie");
  const [raw, setRaw] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(false);

  const [filters, setFilters] = useState<Filters>({
    query: "",
    timeRange: "any",
    publishers: [],
    sortBy: "newest",
  });

  // Konfiguracja (lista uczelni)
  useEffect(() => {
    axios
      .get<Config>("http://127.0.0.1:8000/meta/config")
      .then((res) => setCfg(res.data))
      .catch(() => setCfg({ domain_to_uni: {}, university_faculties: {}, titles: [] }));
  }, []);

  const universities = useMemo(() => {
    if (!cfg) return [];
    return Object.keys(cfg.university_faculties);
  }, [cfg]);

  // Pobierz newsy dla wybranej uczelni / wszystkich
  useEffect(() => {
    if (!cfg) return;
    const fetchNews = async () => {
      setLoading(true);
      try {
        if (selected === "wszystkie") {
          const uniNames = universities.slice(0, 6);
          const res = await Promise.all(
            uniNames.map((u) =>
              axios.get<NewsItem[]>("http://127.0.0.1:8000/news", {
                params: { q: u, max_results: 6 },
              })
            )
          );
          const merged = res.flatMap((r) => r.data);
          const byLink = new Map<string, NewsItem>();
          merged.forEach((n) => {
            if (n.link) byLink.set(n.link, n);
          });
          setRaw(Array.from(byLink.values()));
        } else {
          const r = await axios.get<NewsItem[]>("http://127.0.0.1:8000/news", {
            params: { q: selected, max_results: 24 },
          });
          setRaw(r.data);
        }
      } catch {
        setRaw([]);
      } finally {
        setLoading(false);
      }
    };
    fetchNews();
  }, [cfg, selected, universities]);

  // Lista dostępnych wydawców (domen) z aktualnego zestawu wyników
  const publishersAll = useMemo(() => {
    const s = new Set<string>();
    raw.forEach((n) => {
      const p = publisherOf(n);
      if (p) s.add(p);
    });
    return Array.from(s).sort();
  }, [raw]);

  // Zastosowanie filtrów
  const filtered = useMemo(() => {
    let arr = raw.slice();

    if (filters.query.trim()) {
      const q = filters.query.toLowerCase();
      arr = arr.filter(
        (n) =>
          n.title.toLowerCase().includes(q) ||
          (n.snippet ?? "").toLowerCase().includes(q) ||
          (n.source ?? "").toLowerCase().includes(q)
      );
    }

    if (filters.publishers.length) {
      const set = new Set(filters.publishers);
      arr = arr.filter((n) => {
        const p = publisherOf(n);
        return p ? set.has(p) : false;
      });
    }

    if (filters.timeRange !== "any") {
      arr = arr.filter((n) => datePasses(n.date, filters.timeRange));
    }

    // sortowanie po dacie
    arr.sort((a, b) => {
      const ta = Date.parse(a.date ?? "");
      const tb = Date.parse(b.date ?? "");
      const na = Number.isNaN(ta) ? 0 : ta;
      const nb = Number.isNaN(tb) ? 0 : tb;
      return filters.sortBy === "newest" ? nb - na : na - nb;
    });

    return arr;
  }, [raw, filters]);

  return (
    <div className="min-h-screen bg-slate-100">
      <TopNav fullName="Jan Kowalski" />

      {/* szeroki layout */}
      <div className="mx-auto max-w-[1400px] h-[calc(100vh-64px)] grid grid-cols-[300px,1fr]">
        {/* Lewy panel uczelni (osobny scroll) */}
        <div className="h-full overflow-y-auto bg-white border-r">
          <UniversitySidebar
            universities={universities}
            selected={selected}
            onSelect={setSelected}
          />
        </div>

        {/* Prawa kolumna z newsami (osobny scroll) */}
        <main className="h-full overflow-y-auto bg-white">
          {/* Sticky nagłówek + filtry */}
          <div className="sticky top-0 z-10 bg-white">
            <div className="px-5 py-2 text-slate-600 text-sm border-b border-slate-200">
              {selected === "wszystkie" ? "Wszystkie uczelnie" : selected}
            </div>
            <NewsFilters
              publishersAll={publishersAll}
              value={filters}
              onChange={setFilters}
              resultCount={filtered.length}
            />
          </div>

          {/* Lista kart */}
          <NewsList items={filtered} loading={loading} />
        </main>
      </div>
    </div>
  );
}