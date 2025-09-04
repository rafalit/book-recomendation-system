type Props = {
  universities: string[];
  selected: string;
  onSelect: (name: string) => void;
};

export default function UniversitySidebar({ universities, selected, onSelect }: Props) {
  // wspólne klasy active
  const ACTIVE =
    "bg-indigo-600 text-white border-indigo-600 shadow-sm hover:bg-indigo-600";

  // wspólne klasy inactive
  const INACTIVE_PRIMARY =
    "bg-indigo-50 text-indigo-700 border-indigo-100 hover:bg-indigo-100";
  const INACTIVE_ITEM =
    "bg-white text-slate-800 border-slate-200 hover:bg-slate-50";

  return (
    <section className="bg-white rounded-2xl shadow-sm border border-slate-200 h-full flex flex-col overflow-hidden">
      <div className="p-4 flex items-center gap-2 border-b shrink-0">
        <span className="text-indigo-700">🎓</span>
        <h2 className="text-slate-800 font-semibold">Krakowskie Uczelnie</h2>
        <span className="ml-auto text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full">
          {universities.length}
        </span>
      </div>

      {/* „Wszystkie uczelnie” */}
      <div className="p-3 shrink-0">
        <button
          onClick={() => onSelect("wszystkie")}
          className={`w-full text-left px-4 py-3 rounded-xl border transition
            ${selected === "wszystkie" ? ACTIVE : INACTIVE_PRIMARY}`}
          aria-selected={selected === "wszystkie"}
        >
          <div className="text-sm font-semibold">Wszystkie uczelnie</div>
          <div className="text-xs opacity-90 -mt-0.5">Pokaż wszystkie aktualności</div>
        </button>
      </div>

      {/* Lista uczelni */}
      <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-2">
        {universities.map((u) => {
          const active = selected === u;
          return (
            <button
              key={u}
              onClick={() => onSelect(u)}
              className={`w-full text-left px-4 py-2.5 rounded-xl border transition
                ${active ? ACTIVE : INACTIVE_ITEM}`}
              aria-selected={active}
            >
              {u}
            </button>
          );
        })}
      </div>
    </section>
  );
}
