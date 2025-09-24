import { useState } from "react";
import { X, Calendar } from "lucide-react";

type Props = {
  open: boolean;
  onClose: () => void;
  onSubmit: (loan: { until: string }) => void;
  bookTitle: string;
  available: number;
};

export default function BookLoanModal({ open, onClose, onSubmit, bookTitle, available }: Props) {
  const [until, setUntil] = useState("");

  if (!open) return null;

  const handleSubmit = () => {
    if (!until) {
      alert("Podaj datę zwrotu.");
      return;
    }
    onSubmit({ until });
    setUntil("");
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-lg relative">
        {/* zamknij */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-slate-500 hover:text-slate-700"
        >
          <X size={20} />
        </button>

        <h2 className="text-lg font-semibold mb-4">
          Wypożycz: <span className="text-indigo-700">{bookTitle}</span>
        </h2>

        <p className="text-sm text-slate-600 mb-3">
          Dostępne egzemplarze: <span className="font-medium">{available}</span>
        </p>

        {/* data zwrotu */}
        <div className="relative mb-4">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
            <Calendar size={18} />
          </span>
          <input
            type="date"
            value={until}
            onChange={(e) => setUntil(e.target.value)}
            className="w-full border border-slate-300 rounded-lg pl-10 pr-3 py-2 outline-none focus:ring-2 focus:ring-indigo-200"
            min={new Date().toISOString().split("T")[0]} // dzisiejsza data jako minimum
          />
        </div>

        {/* przyciski */}
        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 border rounded-lg text-slate-600 hover:bg-slate-100"
          >
            Anuluj
          </button>
          <button
            onClick={handleSubmit}
            disabled={available <= 0}
            className={`px-4 py-2 rounded-lg text-white ${
              available > 0
                ? "bg-indigo-600 hover:bg-indigo-700"
                : "bg-gray-400 cursor-not-allowed"
            }`}
          >
            Wypożycz
          </button>
        </div>
      </div>
    </div>
  );
}
