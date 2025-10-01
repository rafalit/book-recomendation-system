import { useMemo, useState } from "react";
import { Filter, CalendarDays, Building2, Search } from "lucide-react";

export type Filters = {
  query: string;
  timeRange: "any" | "24h" | "7d" | "30d" | "year";
  publishers: string[];
  sortBy: "newest" | "oldest";
};

export default function NewsFilters({
  publishersAll,
  value,
  onChange,
  resultCount,
}: {
  publishersAll: string[];
  value: Filters;
  onChange: (v: Filters) => void;
  resultCount: number;
}) {
  const [open, setOpen] = useState(false);

  const pickedLabel = useMemo(() => {
    if (!value.publishers.length) return "Wszyscy wydawcy";
    if (value.publishers.length === 1) return value.publishers[0];
    return `${value.publishers.length} wybranych`;
  }, [value.publishers]);

  const toggle = (p: string) => {
    const has = value.publishers.includes(p);
    onChange({ ...value, publishers: has ? value.publishers.filter(x => x !== p) : [...value.publishers, p] });
  };

  const handleResetPublishers = () => {
    onChange({ ...value, publishers: [] });
    setOpen(false); // opcjonalnie zamknij menu po czyszczeniu
  };

  return (
    <section className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-600 p-4">
      <div className="flex items-center gap-2 mb-3">
        <Filter size={18} className="text-indigo-700 dark:text-indigo-400" />
        <h2 className="text-slate-800 dark:text-slate-200 font-semibold">Filtry wyszukiwania</h2>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
          <input
            value={value.query}
            onChange={(e) => onChange({ ...value, query: e.target.value })}
            placeholder="Szukaj w aktualnościach"
            className="h-10 w-72 pl-9 rounded-lg bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-100 placeholder-slate-500 dark:placeholder-slate-400 px-3 outline-none focus:ring-4 focus:ring-indigo-100 dark:focus:ring-indigo-900"
          />
        </div>

        <div className="flex items-center gap-2">
          <CalendarDays size={16} className="text-slate-500 dark:text-slate-400" />
          <select
            value={value.timeRange}
            onChange={(e) => onChange({ ...value, timeRange: e.target.value as Filters["timeRange"] })}
            className="h-10 rounded-lg bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-100 px-3"
          >
            <option value="any">Wszystkie</option>
            <option value="24h">Ostatnie 24h</option>
            <option value="7d">Ostatnie 7 dni</option>
            <option value="30d">Ostatnie 30 dni</option>
            <option value="year">Ostatni rok</option>
          </select>
        </div>

        <div className="relative">
          <button
            onClick={() => setOpen(o => !o)}
            className="h-10 rounded-lg bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-100 px-3"
          >
            {pickedLabel}
          </button>

          {value.publishers.length > 0 && (
            <button
              onClick={handleResetPublishers}
              className="ml-2 text-sm text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 underline"
              title="Wyczyść wybór wydawców"
            >
              Wyczyść
            </button>
          )}

          {open && (
            <div className="absolute z-20 mt-2 w-72 max-h-72 overflow-auto rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 p-2 shadow">
              {publishersAll.length ? publishersAll.map((p) => (
                <label key={p} className="flex items-center gap-2 px-2 py-1 hover:bg-slate-50 dark:hover:bg-slate-600 rounded text-slate-900 dark:text-slate-100">
                  <input
                    type="checkbox"
                    className="accent-indigo-600"
                    checked={value.publishers.includes(p)}
                    onChange={() => toggle(p)}
                  />
                  <span className="truncate">{p}</span>
                </label>
              )) : <div className="px-2 py-1 text-slate-500 dark:text-slate-400">Brak danych o wydawcach</div>}
            </div>
          )}
        </div>

        <select
          value={value.sortBy}
          onChange={(e) => onChange({ ...value, sortBy: e.target.value as Filters["sortBy"] })}
          className="h-10 rounded-lg bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-100 px-3"
        >
          <option value="newest">Nowsze najpierw</option>
          <option value="oldest">Starsze najpierw</option>
        </select>

        <span className="ml-auto text-slate-600 dark:text-slate-300 text-sm">
          Wyników: <span className="font-semibold">{resultCount}</span>
        </span>
      </div>
    </section>
  );
}
