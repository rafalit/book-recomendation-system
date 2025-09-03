import { useMemo, useState } from "react";
import { Filter } from "lucide-react";

export type Filters = {
  query: string;
  timeRange: "any" | "24h" | "7d" | "30d" | "year";
  publishers: string[];       // domeny z linku (multi)
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
    if (!value.publishers.length) return "Wydawca: wszyscy";
    if (value.publishers.length === 1) return `Wydawca: ${value.publishers[0]}`;
    return `Wydawca: ${value.publishers.length} wybranych`;
  }, [value.publishers]);

  const toggle = (p: string) => {
    const has = value.publishers.includes(p);
    onChange({
      ...value,
      publishers: has ? value.publishers.filter(x => x !== p) : [...value.publishers, p],
    });
  };

  return (
    <div className="px-4 py-3 flex flex-wrap gap-3 items-center text-sm bg-white border-b border-slate-200">
      <div className="flex items-center gap-2 text-slate-700">
        <Filter size={16} /> Filtry
      </div>

      <input
        value={value.query}
        onChange={(e) => onChange({ ...value, query: e.target.value })}
        placeholder="Szukaj w tytułach / opisach…"
        className="h-9 w-72 rounded-lg bg-white border border-slate-300 px-3 outline-none focus:ring-4 focus:ring-blue-100"
      />

      <select
        value={value.timeRange}
        onChange={(e) => onChange({ ...value, timeRange: e.target.value as Filters["timeRange"] })}
        className="h-9 rounded-lg bg-white border border-slate-300 px-2"
      >
        <option value="any">Czas: dowolny</option>
        <option value="24h">Ostatnie 24h</option>
        <option value="7d">Ostatnie 7 dni</option>
        <option value="30d">Ostatnie 30 dni</option>
        <option value="year">Ostatni rok</option>
      </select>

      <div className="relative">
        <button
          onClick={() => setOpen(o => !o)}
          className="h-9 rounded-lg bg-white border border-slate-300 px-3"
        >
          {pickedLabel}
        </button>
        {open && (
          <div className="absolute z-20 mt-2 w-72 max-h-72 overflow-auto rounded-lg border border-slate-200 bg-white p-2 shadow">
            {publishersAll.length ? publishersAll.map((p) => (
              <label key={p} className="flex items-center gap-2 px-2 py-1 hover:bg-slate-50 rounded">
                <input
                  type="checkbox"
                  className="accent-blue-600"
                  checked={value.publishers.includes(p)}
                  onChange={() => toggle(p)}
                />
                <span className="truncate">{p}</span>
              </label>
            )) : <div className="px-2 py-1 text-slate-500">Brak danych o wydawcach</div>}
          </div>
        )}
      </div>

      <select
        value={value.sortBy}
        onChange={(e) => onChange({ ...value, sortBy: e.target.value as Filters["sortBy"] })}
        className="h-9 rounded-lg bg-white border border-slate-300 px-2"
      >
        <option value="newest">Najnowsze</option>
        <option value="oldest">Najstarsze</option>
      </select>

      <span className="ml-auto text-slate-600">Wyników: {resultCount}</span>
    </div>
  );
}