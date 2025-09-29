import { useMemo } from "react";
import { Filter, CalendarDays, Search } from "lucide-react";

export type EventFilters = {
  query: string;
  range: "any" | "today" | "week" | "month";
  category: string | "";
  online: "all" | "online" | "offline";
};

export default function EventFilters({
  categories,
  value,
  onChange,
  resultCount,
}: {
  categories: string[];
  value: EventFilters;
  onChange: (v: EventFilters) => void;
  resultCount: number;
}) {
  return (
    <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4">
      <div className="flex items-center gap-2 mb-3">
        <Filter size={18} className="text-indigo-700" />
        <h2 className="text-slate-800 font-semibold">Filtry</h2>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={value.query}
            onChange={(e) => onChange({ ...value, query: e.target.value })}
            placeholder="Szukaj wydarzeń"
            className="h-10 w-72 pl-9 rounded-lg bg-white border border-slate-300 px-3 outline-none focus:ring-4 focus:ring-indigo-100"
          />
        </div>

        <div className="flex items-center gap-2">
          <CalendarDays size={16} className="text-slate-500" />
          <select
            value={value.range}
            onChange={(e) => onChange({ ...value, range: e.target.value as any })}
            className="h-10 rounded-lg bg-white border border-slate-300 px-3"
          >
            <option value="any">Wszystkie</option>
            <option value="today">Dzisiaj</option>
            <option value="week">Ten tydzień</option>
            <option value="month">Ten miesiąc</option>
          </select>
        </div>

        <select
          value={value.category}
          onChange={(e) => onChange({ ...value, category: e.target.value })}
          className="h-10 rounded-lg bg-white border border-slate-300 px-3"
        >
          <option value="">Wszystkie kategorie</option>
          {categories.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>

        <select
          value={value.online}
          onChange={(e) => onChange({ ...value, online: e.target.value as any })}
          className="h-10 rounded-lg bg-white border border-slate-300 px-3"
        >
          <option value="all">Online i offline</option>
          <option value="online">Tylko online</option>
          <option value="offline">Tylko stacjonarne</option>
        </select>

        <span className="ml-auto text-slate-600 text-sm">
          Wyników: <span className="font-semibold">{resultCount}</span>
        </span>
      </div>
    </section>
  );
}
