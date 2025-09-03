type Props = {
  universities: string[];
  selected: string;
  onSelect: (name: string) => void;
};

export default function UniversitySidebar({ universities, selected, onSelect }: Props) {
  return (
    <aside className="h-full overflow-y-auto border-r bg-white">
      <div className="p-3 sticky top-0 bg-white border-b">
        <div className="text-sm font-medium">Uczelnie</div>
      </div>
      <button
        onClick={() => onSelect("wszystkie")}
        className={`w-full text-left px-4 py-3 border-b hover:bg-slate-50 ${
          selected === "wszystkie" ? "bg-red-600/10 text-red-700" : ""
        }`}
      >
        wszystkie
      </button>
      {universities.map((u) => (
        <button
          key={u}
          onClick={() => onSelect(u)}
          className={`w-full text-left px-4 py-3 border-b hover:bg-slate-50 ${
            selected === u ? "bg-red-600/10 text-red-700" : ""
          }`}
        >
          {u}
        </button>
      ))}
    </aside>
  );
}
