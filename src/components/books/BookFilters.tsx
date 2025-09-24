import { useState } from "react";
import { Filter, Search, Calendar, BookOpen } from "lucide-react";

export type BookFiltersValue = {
  query: string;
  sortBy: "newest" | "oldest" | "available";
};

export default function BookFilters({
  value,
  onChange,
  resultCount,
}: {
  value: BookFiltersValue;
  onChange: (v: BookFiltersValue) => void;
  resultCount: number;
}) {
  const [open, setOpen] = useState(false);

  return (
    <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4">
      <div className="flex items-center gap-2 mb-3">
        <Filter size={18} className="text-indigo-700" />
        <h2 className="text-slate-800 font-semibold">Filtry książek</h2>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {/* 🔍 wyszukiwarka */}
        <div className="relative">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            value={value.query}
            onChange={(e) => onChange({ ...value, query: e.target.value })}
            placeholder="Szukaj książek..."
            className="h-10 w-72 pl-9 rounded-lg bg-white border border-slate-300 px-3 outline-none focus:ring-4 focus:ring-indigo-100"
          />
        </div>

        {/* sortowanie */}
        <div className="flex items-center gap-2">
          <Calendar size={16} className="text-slate-500" />
          <select
            value={value.sortBy}
            onChange={(e) =>
              onChange({ ...value, sortBy: e.target.value as BookFiltersValue["sortBy"] })
            }
            className="h-10 rounded-lg bg-white border border-slate-300 px-3"
          >
            <option value="newest">Najnowsze wydania</option>
            <option value="oldest">Najstarsze wydania</option>
            <option value="available">Dostępne do wypożyczenia</option>
          </select>
        </div>

        <span className="ml-auto text-slate-600 text-sm">
          Wyników: <span className="font-semibold">{resultCount}</span>
        </span>
      </div>
    </section>
  );
}
