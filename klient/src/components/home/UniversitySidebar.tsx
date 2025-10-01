// src/components/home/UniversitySidebar.tsx
type Props = {
  universities: string[];
  selected: string;
  onSelect: (name: string) => void;
};

export default function UniversitySidebar({ universities, selected, onSelect }: Props) {
  // Wrapper: jasny w trybie jasnym, ciemny w trybie ciemnym
  const WRAPPER =
    "bg-gradient-to-b from-indigo-700 to-blue-600 dark:from-slate-800 dark:to-slate-700 text-white " +
    "h-full flex flex-col overflow-hidden rounded-2xl " +
    "shadow-[0_10px_30px_-10px_rgba(15,23,42,0.45)] dark:shadow-[0_10px_30px_-10px_rgba(0,0,0,0.4)] border border-white/15 dark:border-slate-600/50";

  // PILL styles (jak TopNav)
  const PILL_BASE =
    "w-full text-left rounded-full border transition-colors " +
    "px-5 py-3 text-[15px] font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50";

  const PILL_ACTIVE = "bg-white text-indigo-700 dark:bg-slate-600 dark:text-white border-white dark:border-slate-500 shadow-sm";
  const PILL_INACTIVE =
    "bg-white/10 text-white dark:bg-slate-700/50 dark:text-slate-200 border-white/20 dark:border-slate-600/50 hover:bg-white/20 dark:hover:bg-slate-600/50";

  const SUBTXT = "text-xs opacity-90 dark:text-slate-300 -mt-1 font-normal";

  return (
    <section className={WRAPPER}>
      {/* Header */}
      <div className="p-4 flex items-center gap-2 border-b border-white/15 dark:border-slate-600/50 shrink-0">
        <div
          aria-hidden
          className="h-8 w-8 rounded-lg bg-yellow-400 text-indigo-900 dark:bg-slate-600 dark:text-slate-200 text-lg grid place-items-center shadow"
        >
          🎓
        </div>
        <h2 className="font-semibold">Krakowskie Uczelnie</h2>
        <span className="ml-auto text-xs bg-white/20 dark:bg-slate-600/50 text-white dark:text-slate-200 px-2 py-0.5 rounded-full">
          {universities.length}
        </span>
      </div>

      {/* „Wszystkie uczelnie” */}
      <div className="p-3 shrink-0">
        <button
          onClick={() => onSelect("wszystkie")}
          className={`${PILL_BASE} ${selected === "wszystkie" ? PILL_ACTIVE : PILL_INACTIVE
            }`}
          aria-selected={selected === "wszystkie"}
        >
          <div className="leading-5">Wszystkie uczelnie</div>
          <div className={SUBTXT}>Pokaż wszystkie uczelnie</div>
        </button>
      </div>

      {/* Lista uczelni – każdy item jak „pill”, jedna szerokość */}
      <div className="flex-1 overflow-y-auto px-3 pb-3 pr-2 space-y-2 university-scrollbar">
        {universities.map((u) => {
          const active = selected === u;
          return (
            <button
              key={u}
              onClick={() => onSelect(u)}
              className={`${PILL_BASE} ${active ? PILL_ACTIVE : PILL_INACTIVE} whitespace-normal break-words`}
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
