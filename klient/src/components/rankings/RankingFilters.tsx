// src/components/rankings/RankingFilters.tsx
import { useState } from "react";
import { Filter, Star, Calendar, ArrowUpDown, BookOpen, Check } from "lucide-react";

export type RankingFiltersValue = {
  sortBy: "" | "avg_rating" | "reviews_count";
  order: "asc" | "desc";
  minStars: number;
  maxStars: number;
  categories: string[];
  year: number | null;
};

export default function RankingFilters({
  value,
  onChange,
  resultCount,
  categories = [],
}: {
  value: RankingFiltersValue;
  onChange: (v: RankingFiltersValue) => void;
  resultCount: number;
  categories?: string[];
}) {
  const [stars, setStars] = useState<[number, number]>([
    value.minStars * 2,
    value.maxStars * 2,
  ]); // slider działa na 0–10

  const handleStarsChange = (left: number, right: number) => {
    if (right < left) return;
    setStars([left, right]);
    onChange({
      ...value,
      minStars: left / 2,
      maxStars: right / 2,
    });
  };

  // 🔹 generowanie lat (ostatnie 30 + "wszystkie")
  const currentYear = new Date().getFullYear();
  const years = ["", ...Array.from({ length: 30 }, (_, i) => currentYear - i)];
  const [openCategories, setOpenCategories] = useState(false);

  const toggleCategory = (cat: string) => {
    if (cat === "Wszystkie") {
      onChange({ ...value, categories: ["Wszystkie"] });
      return;
    }

    let selected = value.categories.filter((c) => c !== "Wszystkie");
    if (selected.includes(cat)) {
      selected = selected.filter((c) => c !== cat);
    } else {
      selected = [...selected, cat];
    }

    if (selected.length === 0) {
      selected = ["Wszystkie"];
    }

    onChange({ ...value, categories: selected });
  };

  const allCategories = ["Wszystkie", ...categories];
  const selectedCount =
    value.categories.includes("Wszystkie") || value.categories.length === 0
      ? "Wszystkie"
      : `${value.categories.length} wybrane`;

  return (
    <section className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-600 p-4 w-full">
      <div className="flex items-center gap-2 mb-3">
        <Filter size={18} className="text-indigo-700 dark:text-indigo-400" />
        <h2 className="text-slate-800 dark:text-slate-200 font-semibold">Filtry rankingów</h2>
      </div>

      <div className="flex flex-wrap items-center gap-6">
        {/* Sortowanie */}
        <div className="flex items-center gap-2">
          <select
            value={value.sortBy}
            onChange={(e) =>
              onChange({
                ...value,
                sortBy: e.target.value as RankingFiltersValue["sortBy"],
              })
            }
            className="h-10 rounded-lg bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-100 px-3"
          >
            <option value="">Alfabetycznie</option>
            <option value="avg_rating">Średnia ocena</option>
            <option value="reviews_count">Ilość recenzji</option>
          </select>

          <button
            onClick={() =>
              onChange({
                ...value,
                order: value.order === "asc" ? "desc" : "asc",
              })
            }
            className="flex items-center gap-1 px-3 py-1.5 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700"
          >
            <ArrowUpDown size={16} />
            {value.order === "asc" ? "Rosnąco" : "Malejąco"}
          </button>
        </div>

        {/* Gwiazdki */}
        <div className="flex items-center gap-2">
          <Star size={16} className="text-yellow-500" />
          <input
            type="range"
            min={0}
            max={10}
            step={1}
            value={stars[0]}
            onChange={(e) => handleStarsChange(Number(e.target.value), stars[1])}
          />
          <input
            type="range"
            min={0}
            max={10}
            step={1}
            value={stars[1]}
            onChange={(e) => handleStarsChange(stars[0], Number(e.target.value))}
          />
          <span className="ml-2 text-sm text-slate-600 dark:text-slate-300">
            {stars[0] / 2} – {stars[1] / 2} ⭐
          </span>
        </div>

        {/* Kategorie – identyczny dropdown jak w Books */}
        {categories.length > 0 && (
          <div className="relative">
            <button
              type="button"
              onClick={() => setOpenCategories((o) => !o)}
              className="h-10 px-3 rounded-lg bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-100 flex items-center gap-2"
            >
              <BookOpen size={16} className="text-slate-500" />
              {selectedCount}
            </button>

            {openCategories && (
              <div className="absolute z-10 mt-2 w-56 max-h-64 overflow-y-auto rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 shadow-lg">
                {allCategories.map((cat) => {
                  const selected = value.categories.includes(cat);
                  return (
                    <label
                      key={cat}
                      className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-600 text-slate-900 dark:text-slate-100"
                    >
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={() => toggleCategory(cat)}
                        className="h-4 w-4"
                      />
                      <span className="flex-1">{cat}</span>
                      {selected && <Check size={14} className="text-indigo-600" />}
                    </label>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Rok wydania */}
        <div className="flex items-center gap-2">
          <Calendar size={16} className="text-slate-500" />
          <select
            value={value.year ?? ""}
            onChange={(e) =>
              onChange({ ...value, year: e.target.value ? Number(e.target.value) : null })
            }
            className="h-10 rounded-lg bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-100 px-3"
          >
            {years.map((y) =>
              y ? (
                <option key={y} value={y}>
                  {y}
                </option>
              ) : (
                <option key="all" value="">
                  Wszystkie lata
                </option>
              )
            )}
          </select>
        </div>

        <span className="ml-auto text-slate-600 dark:text-slate-300 text-sm">
          Wyników: <span className="font-semibold">{resultCount}</span>
        </span>
      </div>
    </section>
  );
}
