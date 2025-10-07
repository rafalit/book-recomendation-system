import { useState } from "react";
import { Filter, Search, Calendar, BookOpen, Check } from "lucide-react";

export type BookFiltersValue = {
  query: string;
  sortBy: "newest" | "oldest";
  availableOnly: boolean;
  favoritesOnly?: boolean;
  categories: string[]; // np. ["AI", "Energetyka"] albo ["Wszystkie"]
};

export default function BookFilters({
  value,
  onChange,
  resultCount,
  disableAvailableToggle = false,
  disableFavoritesToggle = false,
  categories = [],
}: {
  value: BookFiltersValue;
  onChange: (v: BookFiltersValue) => void;
  resultCount: number;
  disableAvailableToggle?: boolean;
  disableFavoritesToggle?: boolean;
  categories?: string[];
}) {
  const [openCategories, setOpenCategories] = useState(false);

  const toggleCategory = (cat: string) => {
    // 🔹 kliknięcie "Wszystkie"
    if (cat === "Wszystkie") {
      onChange({ ...value, categories: ["Wszystkie"] });
      return;
    }

    let selected = value.categories.filter((c) => c !== "Wszystkie");
    if (selected.includes(cat)) {
      // usuń kategorię
      selected = selected.filter((c) => c !== cat);
    } else {
      // dodaj kategorię
      selected = [...selected, cat];
    }

    // jeśli nic nie wybrano -> wróć do "Wszystkie"
    if (selected.length === 0) {
      selected = ["Wszystkie"];
    }

    onChange({ ...value, categories: selected });
  };

  // 🔹 przygotuj listę kategorii do dropdowna
  const allCategories = ["Wszystkie", ...categories];
  const selectedCount =
    value.categories.includes("Wszystkie") || value.categories.length === 0
      ? "Wszystkie"
      : `${value.categories.length} wybrane`;

  return (
    <section className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-600 p-4 w-full">
      <div className="flex items-center gap-2 mb-3">
        <Filter size={18} className="text-indigo-700 dark:text-indigo-400" />
        <h2 className="text-slate-800 dark:text-slate-200 font-semibold">Filtry książek</h2>
      </div>

      <div className="flex flex-wrap items-center gap-6">
        {/* 🔍 wyszukiwarka */}
        <div className="relative">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500"
          />
          <input
            value={value.query}
            onChange={(e) => onChange({ ...value, query: e.target.value })}
            placeholder="Szukaj książek..."
            className="h-10 w-64 pl-9 rounded-lg bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-100 placeholder-slate-500 dark:placeholder-slate-400 px-3 outline-none focus:ring-4 focus:ring-indigo-100 dark:focus:ring-indigo-900"
          />
        </div>

        {/* sortowanie */}
        <div className="flex items-center gap-2">
          <Calendar size={16} className="text-slate-500 dark:text-slate-400" />
          <select
            value={value.sortBy}
            onChange={(e) =>
              onChange({
                ...value,
                sortBy: e.target.value as BookFiltersValue["sortBy"],
              })
            }
            className="h-10 rounded-lg bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-100 px-3"
          >
            <option value="newest">Najnowsze wydania</option>
            <option value="oldest">Najstarsze wydania</option>
          </select>
        </div>

        {/* 📚 dropdown kategorii */}
        {categories.length > 0 && (
          <div className="relative">
            <button
              type="button"
              onClick={() => setOpenCategories((o) => !o)}
              className="h-10 px-3 rounded-lg bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-100 flex items-center gap-2"
            >
              <BookOpen size={16} className="text-slate-500 dark:text-slate-400" />
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
                      {selected && <Check size={14} className="text-indigo-600 dark:text-indigo-400" />}
                    </label>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ✅ toggle: tylko dostępne */}
        {!disableAvailableToggle && (
          <div className="flex items-center gap-3">
            <span className="text-slate-700 dark:text-slate-300 text-sm">Tylko dostępne</span>
            <button
              type="button"
              onClick={() =>
                onChange({ ...value, availableOnly: !value.availableOnly })
              }
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
                value.availableOnly ? "bg-indigo-600" : "bg-slate-300"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                  value.availableOnly ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </div>
        )}

        {/* ⭐ toggle: tylko ulubione */}
        {!disableFavoritesToggle && (
          <div className="flex items-center gap-3">
            <span className="text-slate-700 dark:text-slate-300 text-sm">Tylko ulubione</span>
            <button
              type="button"
              onClick={() => onChange({ ...value, favoritesOnly: !value.favoritesOnly })}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
                value.favoritesOnly ? "bg-yellow-500" : "bg-slate-300"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                  value.favoritesOnly ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </div>
        )}

        {/* licznik wyników */}
        <span className="ml-auto text-slate-600 dark:text-slate-300 text-sm">
          Wyników: <span className="font-semibold">{resultCount}</span>
        </span>
      </div>
    </section>
  );
}
