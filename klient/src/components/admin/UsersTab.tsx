import { useState } from "react";
import { Users, Search, Filter, Mail, GraduationCap, Building, Trash2 } from "lucide-react";

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

interface UsersTabProps {
  users: User[];
  onDeleteUser: (userId: number, userName: string) => void;
}

export default function UsersTab({ users, onDeleteUser }: UsersTabProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [universityFilter, setUniversityFilter] = useState("");
  const [userLimit, setUserLimit] = useState(50);

  // Filtrowanie użytkowników
  const filteredUsers = users.filter(user => {
    const matchesSearch = searchTerm === "" || 
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.last_name.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesRole = roleFilter === "" || user.role === roleFilter;
    const matchesUniversity = universityFilter === "" || user.university === universityFilter;
    
    return matchesSearch && matchesRole && matchesUniversity;
  }).slice(0, userLimit);

  // Unikalne wartości dla filtrów
  const uniqueRoles = Array.from(new Set(users.map(u => u.role)));
  const uniqueUniversities = Array.from(new Set(users.map(u => u.university)));

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "admin":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      case "researcher":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
      case "student":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case "admin": return "Administrator";
      case "researcher": return "Pracownik naukowy";
      case "student": return "Student";
      default: return role;
    }
  };

  return (
    <div className="p-6 h-full overflow-y-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
            <Users className="h-6 w-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              Użytkownicy
            </h2>
            <p className="text-slate-600 dark:text-slate-400">
              Zarządzanie {users.length} użytkownikami systemu
            </p>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl p-6 border border-blue-100 dark:border-blue-800/50">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-500 rounded-xl shadow-lg">
              <Users className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="text-sm text-blue-600 dark:text-blue-400 font-medium">Łącznie</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{users.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-xl p-6 border border-green-100 dark:border-green-800/50">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-green-500 rounded-xl shadow-lg">
              <GraduationCap className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="text-sm text-green-600 dark:text-green-400 font-medium">Studenci</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                {users.filter(u => u.role === "student").length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-violet-50 dark:from-purple-900/20 dark:to-violet-900/20 rounded-xl p-6 border border-purple-100 dark:border-purple-800/50">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-purple-500 rounded-xl shadow-lg">
              <Building className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="text-sm text-purple-600 dark:text-purple-400 font-medium">Pracownicy naukowi</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                {users.filter(u => u.role === "researcher").length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filtry i suwak */}
      <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-700 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Szukaj użytkowników..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 w-full border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-500 dark:placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Wszystkie role</option>
            {uniqueRoles.map(role => (
              <option key={role} value={role}>{getRoleLabel(role)}</option>
            ))}
          </select>
          
          <select
            value={universityFilter}
            onChange={(e) => setUniversityFilter(e.target.value)}
            className="px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Wszystkie uczelnie</option>
            {uniqueUniversities.map(uni => (
              <option key={uni} value={uni}>{uni}</option>
            ))}
          </select>

          {/* Suwak dla limitu użytkowników */}
          <div className="flex flex-col">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Pokaż: {userLimit} użytkowników
            </label>
            <input
              type="range"
              min="10"
              max="200"
              step="10"
              value={userLimit}
              onChange={(e) => setUserLimit(parseInt(e.target.value))}
              className="w-full h-2 bg-slate-200 dark:bg-slate-600 rounded-lg appearance-none cursor-pointer slider"
            />
            <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400 mt-1">
              <span>10</span>
              <span>200</span>
            </div>
          </div>
        </div>
      </div>

      {/* Lista użytkowników */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            Użytkownicy ({filteredUsers.length})
          </h3>
          {filteredUsers.length > 0 && (
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Pokazano {filteredUsers.length} z {users.filter(user => {
                const matchesSearch = searchTerm === "" || 
                  user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                  user.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                  user.last_name.toLowerCase().includes(searchTerm.toLowerCase());
                
                const matchesRole = roleFilter === "" || user.role === roleFilter;
                const matchesUniversity = universityFilter === "" || user.university === universityFilter;
                
                return matchesSearch && matchesRole && matchesUniversity;
              }).length}
            </p>
          )}
        </div>

        {filteredUsers.length === 0 ? (
          <div className="bg-white dark:bg-slate-800 rounded-xl p-12 text-center border border-slate-200 dark:border-slate-700">
            <div className="p-4 bg-slate-100 dark:bg-slate-700 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
              <Users className="h-8 w-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">
              Brak użytkowników
            </h3>
            <p className="text-slate-500 dark:text-slate-400">
              Nie znaleziono użytkowników spełniających kryteria wyszukiwania
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {filteredUsers.map((user) => (
              <div key={user.id} className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-700 hover:shadow-md transition-shadow">
                <div className="flex items-start gap-4">
                  {/* Avatar */}
                  <div className="flex-shrink-0">
                    <div className="h-12 w-12 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg">
                      <span className="text-lg font-bold text-white">
                        {user.first_name[0]}{user.last_name[0]}
                      </span>
                    </div>
                  </div>

                  {/* Informacje użytkownika */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1 min-w-0">
                        <h4 className="text-lg font-semibold text-slate-900 dark:text-slate-100 truncate">
                          {user.first_name} {user.last_name}
                        </h4>
                        <div className="flex items-center gap-1 text-sm text-slate-500 dark:text-slate-400 mt-1">
                          <Mail className="h-3 w-3" />
                          <span className="truncate">{user.email}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 ml-2">
                        <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${getRoleBadgeColor(user.role)}`}>
                          {getRoleLabel(user.role)}
                        </span>
                        <button
                          onClick={() => onDeleteUser(user.id, `${user.first_name} ${user.last_name}`)}
                          className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                          title="Usuń użytkownika"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    {/* Szczegóły */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                        <Building className="h-4 w-4" />
                        <span className="truncate">{user.university}</span>
                      </div>
                      
                      <div className="text-sm text-slate-600 dark:text-slate-400">
                        <span className="font-medium">Wydział:</span> {user.faculty}
                      </div>

                      {user.role === "student" ? (
                        <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                          <GraduationCap className="h-4 w-4" />
                          <span>{user.field} • Rok {user.study_year}</span>
                        </div>
                      ) : user.academic_title && (
                        <div className="text-sm text-slate-600 dark:text-slate-400">
                          <span className="font-medium">Tytuł:</span> {user.academic_title}
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
