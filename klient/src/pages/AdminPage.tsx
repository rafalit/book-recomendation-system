import { useState, useEffect } from "react";
import { useAuth } from "../components/auth/AuthContext";
import TopNav from "../components/layout/TopNav";
import api from "../lib/api";
import { 
  Users, 
  AlertTriangle, 
  Book, 
  BarChart3,
  Shield,
  TrendingUp,
  FileText,
  Activity,
  MessageSquare
} from "lucide-react";
import ReportsTab from "../components/admin/ReportsTab";
import UsersTab from "../components/admin/UsersTab";
import BooksTab from "../components/admin/BooksTab";

interface AdminStats {
  reports: {
    unhandled_posts: number;
    unhandled_replies: number;
    total_unhandled: number;
  };
  users: {
    total: number;
    students: number;
    researchers: number;
    admins: number;
  };
  books: {
    total: number;
    user_added: number;
    displayed: number;
  };
  content: {
    posts: number;
    replies: number;
    books_total: number;
    books_by_users: number;
  };
}

interface Report {
  id: number;
  reason: string;
  created_at: string;
  handled: boolean;
  reporter: {
    id: number;
    email: string;
    first_name: string;
    last_name: string;
  };
  post?: {
    id: number;
    title: string;
    summary: string;
    body: string;
    topic: string;
    created_at: string;
    is_deleted: boolean;
    author: {
      id: number;
      email: string;
      first_name: string;
      last_name: string;
    };
  };
  reply?: {
    id: number;
    body: string;
    created_at: string;
    is_deleted: boolean;
    post_id: number;
    post_title: string;
    author: {
      id: number;
      email: string;
      first_name: string;
      last_name: string;
    };
  };
}

interface User {
  id: number;
  email: string;
  role: string;
  first_name: string;
  last_name: string;
  university: string;
  faculty: string;
  field?: string;
  study_year?: string;
  academic_title?: string;
}

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

export default function AdminPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("dashboard");
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [postReports, setPostReports] = useState<Report[]>([]);
  const [replyReports, setReplyReports] = useState<Report[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [userBooks, setUserBooks] = useState<UserBook[]>([]);
  const [contacts, setContacts] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    // Nie ładuj danych jeśli użytkownik nie jest adminem
    if (!user || user.role !== "admin") {
      return;
    }

    setLoading(true);
    try {
      // Zawsze ładuj statystyki
      const statsRes = await api.get<AdminStats>("/admin/stats");
      setStats(statsRes.data);

      // Ładuj dane w zależności od aktywnej zakładki
      switch (activeTab) {
        case "reports":
          const [postReportsRes, replyReportsRes] = await Promise.all([
            api.get<Report[]>("/admin/reports/posts?handled=false"),
            api.get<Report[]>("/admin/reports/replies?handled=false")
          ]);
          setPostReports(postReportsRes.data);
          setReplyReports(replyReportsRes.data);
          break;
        
        case "users":
          const usersRes = await api.get<User[]>("/admin/users?limit=200");
          setUsers(usersRes.data);
          break;
        
        case "books":
          const booksRes = await api.get<UserBook[]>("/admin/books?limit=200");
          setUserBooks(booksRes.data);
          break;
        
        case "contacts":
          const contactsRes = await api.get<Record<string, any>>("/admin/contacts");
          setContacts(contactsRes.data);
          break;
      }
    } catch (error) {
      console.error("Błąd ładowania danych:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeTab, user]);

  // Sprawdź czy użytkownik to admin
  if (!user || user.role !== "admin") {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <Shield className="mx-auto h-12 w-12 text-red-500 mb-4" />
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">
            Brak uprawnień
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            Nie masz uprawnień do panelu administracyjnego.
          </p>
        </div>
      </div>
    );
  }

  const handleReport = async (type: "post" | "reply", reportId: number, deleteContent: boolean) => {
    try {
      // Poprawne URL-e: posts -> posts, reply -> replies
      const endpoint = type === "post" ? "posts" : "replies";
      await api.post(`/admin/reports/${endpoint}/${reportId}/handle`, {
        [`delete_${type}`]: deleteContent
      });
      
      // Odśwież dane
      loadData();
    } catch (error) {
      console.error("Błąd obsługi zgłoszenia:", error);
    }
  };

  const deleteBook = async (bookId: number) => {
    if (!window.confirm("Czy na pewno chcesz usunąć tę książkę?")) return;
    
    try {
      await api.delete(`/admin/books/${bookId}`);
      loadData();
    } catch (error) {
      console.error("Błąd usuwania książki:", error);
    }
  };

  const deleteUser = async (userId: number, userName: string) => {
    if (!window.confirm(`Czy na pewno chcesz usunąć użytkownika ${userName}? Ta operacja jest nieodwracalna.`)) return;
    
    try {
      await api.delete(`/admin/users/${userId}`);
      loadData(); // Odśwież dane
    } catch (error) {
      console.error("Błąd usuwania użytkownika:", error);
      alert("Nie udało się usunąć użytkownika. Sprawdź konsolę dla szczegółów.");
    }
  };

  const tabs = [
    { id: "dashboard", label: "Dashboard", icon: BarChart3 },
    { id: "reports", label: "Zgłoszenia", icon: AlertTriangle },
    { id: "users", label: "Użytkownicy", icon: Users },
    { id: "books", label: "Książki", icon: Book },
  ];

  return (
    <div className="h-screen overflow-hidden bg-slate-100 dark:bg-slate-900 flex flex-col">
      <TopNav />
      <div className="px-2 py-4 w-full h-[calc(100vh-80px)] grid grid-cols-1 md:grid-cols-[300px,1fr] gap-4 overflow-hidden">
        
        {/* Sidebar */}
        <div className="h-full overflow-hidden bg-gradient-to-br from-indigo-600 to-purple-700 text-white rounded-2xl">
          <div className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <Shield className="h-8 w-8" />
              <div>
                <h1 className="text-xl font-bold">Panel Admina</h1>
                <p className="text-indigo-200 text-sm">Zarządzanie systemem</p>
              </div>
            </div>

            {/* Stats Cards */}
            {stats && (
              <div className="space-y-3 mb-6">
                <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="h-5 w-5 text-red-300" />
                    <div>
                      <p className="text-sm text-indigo-200">Zgłoszenia</p>
                      <p className="text-lg font-semibold">{stats.reports?.total_unhandled || 0}</p>
                    </div>
                  </div>
                </div>
                <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
                  <div className="flex items-center gap-3">
                    <Users className="h-5 w-5 text-blue-300" />
                    <div>
                      <p className="text-sm text-indigo-200">Użytkownicy</p>
                      <p className="text-lg font-semibold">{stats.users?.total || 0}</p>
                      <p className="text-xs text-indigo-300">
                        {stats.users?.students || 0}S • {stats.users?.researchers || 0}PN • {stats.users?.admins || 0}A
                      </p>
                    </div>
                  </div>
                </div>
                <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
                  <div className="flex items-center gap-3">
                    <Book className="h-5 w-5 text-green-300" />
                    <div>
                      <p className="text-sm text-indigo-200">Książki</p>
                      <p className="text-lg font-semibold">{stats.books?.user_added || 0}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Navigation */}
            <nav className="space-y-2">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-all ${
                      isActive
                        ? "bg-white/20 backdrop-blur-sm text-white shadow-lg"
                        : "text-indigo-200 hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                    <span className="font-medium">{tab.label}</span>
                    {tab.id === "reports" && stats?.reports && (
                      <span className={`ml-auto text-white text-xs rounded-full px-2 py-1 ${
                        stats.reports.total_unhandled > 0 
                          ? "bg-red-500" 
                          : "bg-green-500"
                      }`}>
                        {stats.reports.total_unhandled}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Main Content */}
        <section className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-600 h-full flex flex-col overflow-hidden">
          {loading ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
                <p className="text-slate-600 dark:text-slate-400">Ładowanie danych...</p>
              </div>
            </div>
          ) : (
            <div className="flex-1 overflow-hidden">
              {activeTab === "dashboard" && (
                <DashboardTab stats={stats} />
              )}
              {activeTab === "reports" && (
                <ReportsTab 
                  postReports={postReports} 
                  replyReports={replyReports}
                  totalUnhandled={stats?.reports?.total_unhandled}
                  onHandle={handleReport}
                />
              )}
              {activeTab === "users" && (
                <UsersTab users={users} onDeleteUser={deleteUser} />
              )}
              {activeTab === "books" && (
                <BooksTab books={userBooks} onDelete={deleteBook} />
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

// Komponenty dla poszczególnych zakładek będą dodane w kolejnych plikach
function DashboardTab({ stats }: { stats: AdminStats | null }) {
  if (!stats) {
    return (
      <div className="p-6 text-center">
        <p className="text-slate-500 dark:text-slate-400">Brak danych statystycznych</p>
      </div>
    );
  }

  return (
    <div className="p-6 h-full overflow-y-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">
          Dashboard
        </h2>
        <p className="text-slate-600 dark:text-slate-400">
          Przegląd aktywności w systemie
        </p>
      </div>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
        <div className="bg-gradient-to-br from-red-50 to-rose-50 dark:from-red-900/20 dark:to-rose-900/20 rounded-xl p-6 border border-red-100 dark:border-red-800/50">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-red-500 rounded-xl shadow-lg">
              <AlertTriangle className="h-6 w-6 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                Zgłoszenia
              </h3>
              <p className="text-sm text-red-600 dark:text-red-400">
                Wymagają uwagi
              </p>
            </div>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-600 dark:text-slate-400">Posty</span>
              <span className="font-semibold text-slate-900 dark:text-slate-100">
                {stats.reports?.unhandled_posts || 0}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-600 dark:text-slate-400">Komentarze</span>
              <span className="font-semibold text-slate-900 dark:text-slate-100">
                {stats.reports?.unhandled_replies || 0}
              </span>
            </div>
            <div className="border-t border-red-200 dark:border-red-700 pt-3">
              <div className="flex justify-between items-center">
                <span className="font-medium text-slate-900 dark:text-slate-100">Razem</span>
                <span className="text-xl font-bold text-red-600 dark:text-red-400">
                  {stats.reports?.total_unhandled || 0}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl p-6 border border-blue-100 dark:border-blue-800/50">
          <div className="flex items-center gap-4 mb-6">
            <div className="p-3 bg-blue-500 rounded-xl shadow-lg">
              <Users className="h-6 w-6 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                Użytkownicy
              </h3>
              <p className="text-sm text-blue-600 dark:text-blue-400">
                Aktywni w systemie
              </p>
            </div>
          </div>
          
          <div className="space-y-4">
            <div className="bg-white/60 dark:bg-slate-800/60 rounded-lg p-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Studenci</span>
                <span className="text-lg font-bold text-blue-600 dark:text-blue-400">
                  {stats.users?.students || 0}
                </span>
              </div>
              <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                <div 
                  className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${((stats.users?.students || 0) / (stats.users?.total || 1)) * 100}%` }}
                ></div>
              </div>
            </div>

            <div className="bg-white/60 dark:bg-slate-800/60 rounded-lg p-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Pracownicy naukowi</span>
                <span className="text-lg font-bold text-indigo-600 dark:text-indigo-400">
                  {stats.users?.researchers || 0}
                </span>
              </div>
              <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                <div 
                  className="bg-indigo-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${((stats.users?.researchers || 0) / (stats.users?.total || 1)) * 100}%` }}
                ></div>
              </div>
            </div>

            <div className="bg-white/60 dark:bg-slate-800/60 rounded-lg p-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Administratorzy</span>
                <span className="text-lg font-bold text-purple-600 dark:text-purple-400">
                  {stats.users?.admins || 0}
                </span>
              </div>
              <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                <div 
                  className="bg-purple-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${((stats.users?.admins || 0) / (stats.users?.total || 1)) * 100}%` }}
                ></div>
              </div>
            </div>

            <div className="border-t border-blue-200 dark:border-blue-700 pt-4 mt-4">
              <div className="flex justify-between items-center">
                <span className="text-lg font-semibold text-slate-900 dark:text-slate-100">Łącznie</span>
                <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {stats.users?.total || 0}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-xl p-6 border border-green-100 dark:border-green-800/50">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-green-500 rounded-xl shadow-lg">
              <Book className="h-6 w-6 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                Książki
              </h3>
              <p className="text-sm text-green-600 dark:text-green-400">
                W bibliotece
              </p>
            </div>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-lg font-semibold text-slate-900 dark:text-slate-100">Dodane przez użytkowników</span>
              <span className="text-2xl font-bold text-green-600 dark:text-green-400">
                {stats.books?.user_added || stats.content?.books_by_users || 0}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-violet-50 dark:from-purple-900/20 dark:to-violet-900/20 rounded-xl p-6 border border-purple-100 dark:border-purple-800/50">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-purple-500 rounded-xl shadow-lg">
              <MessageSquare className="h-6 w-6 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                Forum
              </h3>
              <p className="text-sm text-purple-600 dark:text-purple-400">
                Aktywność społeczności
              </p>
            </div>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-600 dark:text-slate-400">Posty</span>
              <span className="font-semibold text-slate-900 dark:text-slate-100">
                {stats.content?.posts || 0}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-600 dark:text-slate-400">Komentarze</span>
              <span className="font-semibold text-slate-900 dark:text-slate-100">
                {stats.content?.replies || 0}
              </span>
            </div>
            <div className="border-t border-purple-200 dark:border-purple-700 pt-3">
              <div className="flex justify-between items-center">
                <span className="font-medium text-slate-900 dark:text-slate-100">Razem</span>
                <span className="text-xl font-bold text-purple-600 dark:text-purple-400">
                  {(stats.content?.posts || 0) + (stats.content?.replies || 0)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

