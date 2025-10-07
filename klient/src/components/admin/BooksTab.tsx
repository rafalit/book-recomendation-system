import { useState } from "react";
import { Book, Search, Trash2, Eye, Building, User } from "lucide-react";

interface UserBook {
  id: number;
  title: string;
  authors: string;
  publisher: string;
  published_date: string;
  university: string;
  available_copies: number;
  created_by: number;
  thumbnail: string;
  categories: string;
  reviews_count: number;
}

interface BooksTabProps {
  books: UserBook[];
  onDelete: (bookId: number) => void;
}

export default function BooksTab({ books, onDelete }: BooksTabProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [universityFilter, setUniversityFilter] = useState("");
  const [bookLimit, setBookLimit] = useState(50);

  // Filtrowanie książek
  const filteredBooks = books.filter(book => {
    const matchesSearch = searchTerm === "" || 
      book.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      book.authors.toLowerCase().includes(searchTerm.toLowerCase()) ||
      book.publisher.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesUniversity = universityFilter === "" || book.university === universityFilter;
    
    return matchesSearch && matchesUniversity;
  }).slice(0, bookLimit);

  // Unikalne uczelnie
  const uniqueUniversities = Array.from(new Set(books.map(b => b.university)));

  return (
    <div className="p-6 h-full overflow-y-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
            <Book className="h-6 w-6 text-green-600 dark:text-green-400" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              Książki
            </h2>
            <p className="text-slate-600 dark:text-slate-400">
              Zarządzanie {books.length} książkami dodanymi przez użytkowników
            </p>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-xl p-6 border border-green-100 dark:border-green-800/50">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-green-500 rounded-xl shadow-lg">
              <Book className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="text-sm text-green-600 dark:text-green-400 font-medium">Łącznie</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{books.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl p-6 border border-blue-100 dark:border-blue-800/50">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-500 rounded-xl shadow-lg">
              <Eye className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="text-sm text-blue-600 dark:text-blue-400 font-medium">Dostępne</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                {books.filter(b => b.available_copies > 0).length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-violet-50 dark:from-purple-900/20 dark:to-violet-900/20 rounded-xl p-6 border border-purple-100 dark:border-purple-800/50">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-purple-500 rounded-xl shadow-lg">
              <User className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="text-sm text-purple-600 dark:text-purple-400 font-medium">Recenzje</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                {books.reduce((sum, b) => sum + b.reviews_count, 0)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filtry i suwak */}
      <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-700 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Szukaj książki..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 w-full border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-500 dark:placeholder-slate-400 focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>
          
          <select
            value={universityFilter}
            onChange={(e) => setUniversityFilter(e.target.value)}
            className="px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-green-500 focus:border-transparent"
          >
            <option value="">Wszystkie uczelnie</option>
            {uniqueUniversities.map(uni => (
              <option key={uni} value={uni}>{uni}</option>
            ))}
          </select>

          {/* Suwak dla limitu książek */}
          <div className="flex flex-col">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Pokaż: {bookLimit} książek
            </label>
            <input
              type="range"
              min="10"
              max="200"
              step="10"
              value={bookLimit}
              onChange={(e) => setBookLimit(parseInt(e.target.value))}
              className="w-full h-2 bg-slate-200 dark:bg-slate-600 rounded-lg appearance-none cursor-pointer slider"
            />
            <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400 mt-1">
              <span>10</span>
              <span>200</span>
            </div>
          </div>
        </div>
      </div>

      {/* Lista książek */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            Książki ({filteredBooks.length})
          </h3>
          {filteredBooks.length > 0 && (
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Pokazano {filteredBooks.length} z {books.filter(book => {
                const matchesSearch = searchTerm === "" || 
                  book.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                  book.authors.toLowerCase().includes(searchTerm.toLowerCase()) ||
                  book.publisher.toLowerCase().includes(searchTerm.toLowerCase());
                
                const matchesUniversity = universityFilter === "" || book.university === universityFilter;
                
                return matchesSearch && matchesUniversity;
              }).length}
            </p>
          )}
        </div>

        {filteredBooks.length === 0 ? (
          <div className="bg-white dark:bg-slate-800 rounded-xl p-12 text-center border border-slate-200 dark:border-slate-700">
            <div className="p-4 bg-slate-100 dark:bg-slate-700 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
              <Book className="h-8 w-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">
              Brak książek
            </h3>
            <p className="text-slate-500 dark:text-slate-400">
              Nie znaleziono książek spełniających kryteria wyszukiwania
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {filteredBooks.map((book) => (
              <div key={book.id} className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-700 hover:shadow-md transition-shadow">
                <div className="flex items-start gap-4">
                  {/* Okładka książki */}
                  <div className="flex-shrink-0">
                    {book.thumbnail ? (
                      <img
                        src={book.thumbnail}
                        alt={book.title}
                        className="w-20 h-28 object-cover rounded-lg shadow-lg"
                      />
                    ) : (
                      <div className="w-20 h-28 bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-600 dark:to-slate-700 rounded-lg flex items-center justify-center shadow-lg">
                        <Book className="h-8 w-8 text-slate-400" />
                      </div>
                    )}
                  </div>

                  {/* Informacje o książce */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1 min-w-0">
                        <h4 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-1 line-clamp-2">
                          {book.title}
                        </h4>
                        <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">
                          <span className="font-medium">Autor:</span> {book.authors}
                        </p>
                      </div>
                      <div className="flex gap-2 ml-2">
                        <button
                          onClick={() => window.open(`/books?q=${encodeURIComponent(book.university)}`, '_blank')}
                          className="p-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                          title="Zobacz książkę"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => onDelete(book.id)}
                          className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                          title="Usuń książkę"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    {/* Szczegóły */}
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                        <Building className="h-4 w-4" />
                        <span className="truncate">{book.university}</span>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2 text-slate-600 dark:text-slate-400">
                        <div>
                          <span className="font-medium">Wydawca:</span> {book.publisher || 'Brak'}
                        </div>
                        <div>
                          <span className="font-medium">Rok:</span> {book.published_date || 'Brak'}
                        </div>
                        <div>
                          <span className="font-medium">Egzemplarze:</span> {book.available_copies}
                        </div>
                        <div>
                          <span className="font-medium">Recenzje:</span> {book.reviews_count}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                        <User className="h-4 w-4" />
                        <span>ID użytkownika: {book.created_by}</span>
                      </div>

                      {book.categories && (
                        <div className="pt-2 border-t border-slate-200 dark:border-slate-600">
                          <span className="text-xs text-slate-500 dark:text-slate-400">
                            <span className="font-medium">Kategorie:</span> {book.categories}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
