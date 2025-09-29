import { useState } from "react";
import { X } from "lucide-react";
import api from "../../lib/api";

type Props = {
  open: boolean;
  onClose: () => void;
  university: string;
  onAdded?: () => void;
};

export default function BookAddModal({ open, onClose, university, onAdded }: Props) {
  const [form, setForm] = useState({
    title: "",
    authors: "",
    isbn: "",
    publisher: "",
    thumbnail: "",
    description: "",
    categories: "",
    available_copies: 1,
    published_date: "",
  });

  if (!open) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async () => {
    if (!form.title || !form.authors) {
        alert("Podaj tytuł i autorów.");
        return;
    }
    try {
        await api.post("/books/manual", { ...form, university });
        alert("📚 Książka dodana!");
        if (onAdded) onAdded();   
        onClose();
    } catch (err) {
        console.error(err);
        alert("❌ Błąd dodawania książki");
    }
    };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-lg relative">
        <button onClick={onClose} className="absolute top-3 right-3 text-slate-500 hover:text-slate-700">
          <X size={20} />
        </button>

        <h2 className="text-lg font-semibold mb-4">Dodaj książkę</h2>

        <div className="space-y-3">
          <input name="title" value={form.title} onChange={handleChange} placeholder="Tytuł książki *" className="w-full border rounded-lg px-3 py-2" />
          <input name="authors" value={form.authors} onChange={handleChange} placeholder="Autorzy (np. Jan Kowalski, Anna Nowak) *" className="w-full border rounded-lg px-3 py-2" />
          <input name="publisher" value={form.publisher} onChange={handleChange} placeholder="Wydawca" className="w-full border rounded-lg px-3 py-2" />
          <input name="thumbnail" value={form.thumbnail} onChange={handleChange} placeholder="Adres URL do okładki *" className="w-full border rounded-lg px-3 py-2" />
          <textarea name="description" value={form.description} onChange={handleChange} placeholder="Opis książki" className="w-full border rounded-lg px-3 py-2" />
          <input name="categories" value={form.categories} onChange={handleChange} placeholder="Kategorie (np. Informatyka, AI)" className="w-full border rounded-lg px-3 py-2" />
          <input type="number" min="1" name="available_copies" value={form.available_copies} onChange={handleChange} placeholder="Liczba egzemplarzy" className="w-full border rounded-lg px-3 py-2" />
          <input type="text" name="published_date" value={form.published_date} onChange={handleChange} placeholder="Rok wydania (np. 2023)" className="w-full border rounded-lg px-3 py-2" />
        </div>

        <div className="flex justify-end gap-3 mt-5">
          <button onClick={onClose} className="px-4 py-2 border rounded-lg text-slate-600 hover:bg-slate-100">
            Anuluj
          </button>
          <button onClick={handleSubmit} className="px-4 py-2 rounded-lg text-white bg-indigo-600 hover:bg-indigo-700">
            Dodaj
          </button>
        </div>
      </div>
    </div>
  );
}
