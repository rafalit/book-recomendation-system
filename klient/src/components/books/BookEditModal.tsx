import { useState, useEffect } from "react";
import { X, BookOpen, User, Building, Image, FileText, Tag, Copy, Calendar } from "lucide-react";
import api from "../../lib/api";
import { Book } from "./BookCard";

type Props = {
  open: boolean;
  onClose: () => void;
  book: Book;
  onUpdated?: (updatedBook: Book) => void;
};

export default function BookEditModal({ open, onClose, book, onUpdated }: Props) {
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

  // Pre-fill form when book changes
  useEffect(() => {
    if (book) {
      setForm({
        title: book.title || "",
        authors: book.authors || "",
        isbn: book.isbn || "",
        publisher: book.publisher || "",
        thumbnail: book.thumbnail || "",
        description: book.description || "",
        categories: book.categories || "",
        available_copies: book.available_copies || 1,
        published_date: book.published_date || "",
      });
    }
  }, [book]);

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
        const updatedBook = await api.put(`/books/${book.id}`, form);
        alert("📚 Książka zaktualizowana!");
        if (onUpdated) onUpdated(updatedBook.data);   
        onClose();
    } catch (err) {
        console.error(err);
        alert("❌ Błąd aktualizacji książki");
    }
  };

  const FormField = ({ 
    name, 
    label, 
    description, 
    type = "text", 
    required = false, 
    icon: Icon,
    ...props 
  }: {
    name: string;
    label: string;
    description: string;
    type?: string;
    required?: boolean;
    icon?: any;
    [key: string]: any;
  }) => (
    <div className="space-y-2">
      <label className="block">
        <div className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
          {Icon && <Icon size={16} className="text-indigo-600 dark:text-indigo-400" />}
          {label}
          {required && <span className="text-red-500">*</span>}
        </div>
        <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          {description}
        </div>
      </label>
      {type === "textarea" ? (
        <textarea
          name={name}
          value={form[name as keyof typeof form]}
          onChange={handleChange}
          className="w-full h-24 px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
          {...props}
        />
      ) : (
        <input
          name={name}
          value={form[name as keyof typeof form]}
          onChange={handleChange}
          type={type}
          className="w-full h-10 px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          {...props}
        />
      )}
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl relative max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-700 to-blue-600 dark:from-slate-800 dark:to-slate-700 text-white p-6 rounded-t-2xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-lg bg-yellow-400 text-indigo-900 dark:bg-slate-600 dark:text-slate-200 text-2xl grid place-items-center shadow">
                ✏️
              </div>
              <div>
                <h2 className="text-xl font-semibold">Edytuj książkę</h2>
                <p className="text-white/80 dark:text-slate-300 text-sm">Zaktualizuj informacje o książce</p>
              </div>
            </div>
            <button 
              onClick={onClose} 
              className="text-white/80 hover:text-white hover:bg-white/10 rounded-lg p-2 transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Form */}
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField
              name="title"
              label="Tytuł książki"
              description="Pełny tytuł książki"
              required
              icon={BookOpen}
            />
            <FormField
              name="authors"
              label="Autorzy"
              description="Imiona i nazwiska autorów oddzielone przecinkami"
              required
              icon={User}
            />
            <FormField
              name="publisher"
              label="Wydawca"
              description="Nazwa wydawnictwa"
              icon={Building}
            />
            <FormField
              name="published_date"
              label="Rok wydania"
              description="Rok publikacji książki"
              type="text"
              icon={Calendar}
            />
            <FormField
              name="thumbnail"
              label="URL okładki"
              description="Link do obrazka okładki książki"
              required
              icon={Image}
            />
            <FormField
              name="available_copies"
              label="Liczba egzemplarzy"
              description="Ile egzemplarzy jest dostępnych"
              type="number"
              min="1"
              icon={Copy}
            />
          </div>

          <FormField
            name="description"
            label="Opis książki"
            description="Krótki opis zawartości książki"
            type="textarea"
            icon={FileText}
          />

          <FormField
            name="categories"
            label="Kategorie"
            description="Tematy/kategorie oddzielone przecinkami (np. Informatyka, AI, Matematyka)"
            icon={Tag}
          />
        </div>

        {/* Footer */}
        <div className="bg-slate-50 dark:bg-slate-700/50 px-6 py-4 rounded-b-2xl border-t border-slate-200 dark:border-slate-600">
          <div className="flex justify-end gap-3">
            <button 
              onClick={onClose} 
              className="px-6 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors font-medium"
            >
              Anuluj
            </button>
            <button 
              onClick={handleSubmit} 
              className="px-6 py-2 rounded-lg text-white bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 transition-all font-medium shadow-sm"
            >
              Zaktualizuj książkę
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
