import { Bell } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

const links = [
  { to: "/home", label: "Aktualności" },
  { to: "/books", label: "Książki" },
  { to: "/rankings", label: "Rankingi" },
  { to: "/forum", label: "Forum" },
  { to: "/events", label: "Wydarzenia" },
  { to: "/contact", label: "Kontakt" },
];

function displayName(u: any): string {
  if (!u) return "Profil";
  return (
    u.full_name ||
    [u.first_name, u.last_name].filter(Boolean).join(" ") ||
    u.name ||
    u.email ||
    "Profil"
  );
}
function displaySubtitle(u: any): string {
  if (!u) return "";
  // tytuł/rola + uczelnia (użyj jakichkolwiek pól, które backend zwraca)
  const title = u.title || u.academic_title || (u.role === "student" ? "Student" : u.role);
  const uni = u.university || u.university_name || u.affiliation;
  return [title, uni].filter(Boolean).join(" • ");
}

export default function TopNav() {
  const { pathname } = useLocation();
  const { user } = useAuth();

  return (
    <header className="h-20 bg-gradient-to-r from-indigo-700 to-blue-600 text-white">
      <div className="mx-auto max-w-[2000px] h-full px-4 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-3">
            <div className="h-20 w-20 rounded-lg bg-yellow-400 text-indigo-900 text-6xl grid place-items-center shadow">
              📚
            </div>
            <div>
              <div className="text-xl font-semibold leading-5">AcademicBooks</div>
              <div className="text-white/80 text-sm -mt-0.5">Polecamy najlepsze książki naukowe</div>
            </div>
          </div>
          <nav className="hidden md:flex items-center gap-5 bg-white/10 rounded-full px-3 py-2">
            {links.map((l) => {
              const active = pathname === l.to;
              return (
                <Link
                  key={l.to}
                  to={l.to}
                  className={`px-6 py-3 rounded-full text-base font-medium transition ${active ? "bg-white text-indigo-700 shadow-sm" : "hover:bg-white/20"
                    }`}
                >
                  {l.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/notifications"
            className="relative h-12 w-12 inline-flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20"
            title="Powiadomienia"
          >
            <Bell size={27} />
            <span className="absolute -top-1 -right-1 h-5 min-w-[20px] px-1 text-xs rounded-full bg-amber-400 text-indigo-900 font-bold grid place-items-center">
              3
            </span>
          </Link>


          <Link
            to="/profile"
            className="px-4 h-12 inline-flex items-center rounded-full bg-white/10 hover:bg-white/20 text-sm"
            title="Profil"
          >
            <div className="h-8 w-8 rounded-full bg-white/20 mr-3 grid place-items-center text-lg">👤</div>
            <div className="leading-tight">
              <div className="font-medium text-base">{displayName(user)}</div>
              <div className="text-white/80 text-sm -mt-0.5">{displaySubtitle(user)}</div>
            </div>
          </Link>
        </div>
      </div>
    </header>
  );
}
