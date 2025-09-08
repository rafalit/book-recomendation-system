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

const isGoogleHost = (h?: string | null) => !!h && /(^|\.)google\./i.test(h);

function publisherOf(n: NewsItem): string | null {
  const d1 = n.publisher_domain && !isGoogleHost(n.publisher_domain) ? n.publisher_domain : null;
  if (d1) return d1;

  const d2 = n.link ? hostFrom(n.link) : null;
  if (d2 && !isGoogleHost(d2)) return d2;

  const m = n.title.match(/[-–—]\s*([^–—-]+)$/);
  const label = m ? m[1].trim() : null;
  return label && !isGoogleHost(label) ? label : null;
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

  useEffect(() => {
    axios
      .get<Config>("http://127.0.0.1:8000/meta/config")
      .then((res) => setCfg(res.data))
      .catch(() => setCfg({ domain_to_uni: {}, university_faculties: {}, titles: [] }));
  }, []);

  const universities = useMemo(() => {
    if (!cfg) return [];
    return Object.keys(cfg.university_faculties).sort((a, b) =>
      a.localeCompare(b, "pl", { sensitivity: "base" })
    );
  }, [cfg]);

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
          merged.forEach((n) => n.link && byLink.set(n.link, n));
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

  const publishersAll = useMemo(() => {
    const s = new Set<string>();
    raw.forEach((n) => {
      const p = publisherOf(n);
      if (p) s.add(p);
    });
    return Array.from(s).sort();
  }, [raw]);

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
    // 100vh + brak głównego scrolla
    <div className="h-screen overflow-hidden bg-slate-100 flex flex-col">
      <TopNav />

      {/* Wysokość: 100vh - 80px (TopNav ma h-20) */}
      <div
        className="mx-auto max-w-[2000px] px-2 py-4 w-full
             h-[calc(100vh-80px)] grid grid-cols-1 md:grid-cols-[400px,1fr] gap-4 overflow-hidden"
      >

        {/* LEWA KARTA: pełna wysokość + wewnętrzny scroll */}
        <div className="h-full overflow-hidden">
          <UniversitySidebar
            universities={universities}
            selected={selected}
            onSelect={setSelected}
          />
        </div>

        {/* PRAWA KARTA: filtry (góra) + scrollowana lista (dół) */}
        <section className="bg-white rounded-2xl shadow-sm border border-slate-200
                          h-full flex flex-col overflow-hidden">
          <div className="p-4 border-b shrink-0">
            <NewsFilters
              publishersAll={publishersAll}
              value={filters}
              onChange={setFilters}
              resultCount={filtered.length}
            />
          </div>
          <div className="flex-1 overflow-y-auto">
            <NewsList items={filtered} loading={loading} />
          </div>
        </section>
      </div>
    </div>
  );
}

