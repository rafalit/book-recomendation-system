import { useEffect, useMemo, useState } from "react";
import TopNav from "../components/layout/TopNav";
import UniversitySidebar from "../components/home/UniversitySidebar";
import EventCard, { EventItem } from "../components/events/EventCard";
import EventFilters, { EventFilters as Filters } from "../components/events/EventFilters";
import api from "../lib/api";

type Config = { university_faculties: Record<string, string[]> };

function applyRange(range: Filters["range"]) {
  const now = new Date();
  const start = new Date(now);
  const end = new Date(now);
  if (range === "today") {
    start.setHours(0,0,0,0);
    end.setHours(23,59,59,999);
  } else if (range === "week") {
    const day = start.getDay() || 7;
    start.setDate(start.getDate() - day + 1);
    start.setHours(0,0,0,0);
    end.setDate(start.getDate() + 6);
    end.setHours(23,59,59,999);
  } else if (range === "month") {
    start.setDate(1); start.setHours(0,0,0,0);
    end.setMonth(end.getMonth()+1, 0); end.setHours(23,59,59,999);
  } else {
    return { from: null as string | null, to: null as string | null };
  }
  return { from: start.toISOString(), to: end.toISOString() };
}

export default function EventsPage() {
  const [cfg, setCfg] = useState<Config | null>(null);
  const [selected, setSelected] = useState<string>("wszystkie");
  const [raw, setRaw] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(false);

  const [filters, setFilters] = useState<Filters>({
    query: "",
    range: "any",
    category: "",
    online: "all",
  });

  useEffect(() => {
    api.get<Config>("/meta/config")
      .then(r => setCfg(r.data))
      .catch(() => setCfg({ university_faculties: {} }));
  }, []);

  const universities = useMemo(
    () => cfg ? Object.keys(cfg.university_faculties).sort((a,b)=>a.localeCompare(b,"pl")) : [],
    [cfg]
  );

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      try {
        const params: any = {};
        if (selected !== "wszystkie") params.uni = selected;
        if (filters.category) params.category = filters.category;
        if (filters.online === "online") params.online = true;
        if (filters.online === "offline") params.online = false;

        const {from, to} = applyRange(filters.range);
        if (from) params.date_from = from;
        if (to) params.date_to = to;

        // backend ma search param q; użyjemy po pobraniu (prościej na start)
        const r = await api.get<EventItem[]>("/events", { params });
        let arr = r.data;
        if (filters.query.trim()) {
          const q = filters.query.toLowerCase();
          arr = arr.filter(e =>
            e.title.toLowerCase().includes(q) ||
            (e.university_name||"").toLowerCase().includes(q) ||
            (e.location_name||"").toLowerCase().includes(q)
          );
        }
        setRaw(arr);
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [selected, filters]);

  const categories = useMemo(() => {
    const s = new Set<string>();
    raw.forEach(e => e.category && s.add(e.category));
    return Array.from(s).sort();
  }, [raw]);

  return (
    <div className="h-screen overflow-hidden bg-slate-100 flex flex-col">
      <TopNav />
      <div className="mx-auto max-w-[2000px] px-2 py-4 w-full h-[calc(100vh-80px)]
                      grid grid-cols-1 md:grid-cols-[400px,1fr] gap-4 overflow-hidden">
        <div className="h-full overflow-hidden">
          <UniversitySidebar
            universities={universities}
            selected={selected}
            onSelect={setSelected}
          />
        </div>

        <section className="bg-white rounded-2xl shadow-sm border border-slate-200 h-full flex flex-col overflow-hidden">
          <div className="p-4 border-b shrink-0">
            <EventFilters
              categories={categories}
              value={filters}
              onChange={setFilters}
              resultCount={raw.length}
            />
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {loading ? (
              Array.from({length:6}).map((_,i)=>
                <div key={i} className="h-20 rounded-xl border border-slate-200 bg-white animate-pulse" />
              )
            ) : raw.length ? (
              raw.map(e => <EventCard key={e.id} ev={e} />)
            ) : (
              <div className="text-slate-600">Brak wydarzeń dla wybranych filtrów.</div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
