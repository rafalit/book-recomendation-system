// src/components/TopNav.tsx
import { useEffect, useRef, useState } from "react";
import { Bell, ChevronDown, LogOut, User } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import useNotifications from "../../hooks/useNotifications";
import NotificationsDropdown from "../notifications/NotificationsDropdown";

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
  const title = u.title || u.academic_title || (u.role === "student" ? "Student" : u.role);
  const uni = u.university || u.university_name || u.affiliation;
  return [title, uni].filter(Boolean).join(" • ");
}

export default function TopNav() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { user, setToken } = useAuth();
  const { items, markRead, remove } = useNotifications();

  // dropdown
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const handleLogout = () => {
    setToken(null);
    localStorage.removeItem("token");
    localStorage.removeItem("user"); 
    navigate("/login");
  };

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
          <NotificationsDropdown
            items={items}
            onRead={markRead}
            onDelete={remove}
          />

          {/* USER DROPDOWN */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setOpen((o) => !o)}
              className="px-4 h-12 inline-flex items-center rounded-full bg-white/10 hover:bg-white/20 text-sm"
              title="Profil"
              aria-haspopup="menu"
              aria-expanded={open}
            >
              <div className="h-8 w-8 rounded-full bg-white/20 mr-3 grid place-items-center text-lg">👤</div>
              <div className="leading-tight text-left">
                <div className="font-medium text-base">{displayName(user)}</div>
                <div className="text-white/80 text-sm -mt-0.5">{displaySubtitle(user)}</div>
              </div>
              <ChevronDown size={18} className="ml-2 opacity-80" />
            </button>

            {open && (
              <div
                className="
    absolute right-0 mt-2 w-64 z-50 rounded-xl
    bg-blue-500
    text-white border border-white/10 shadow-xl overflow-hidden
  "
                role="menu"
              >
                <Link
                  to="/profile"
                  className="flex items-center gap-2 px-4 py-3 hover:bg-white/10 transition"
                  role="menuitem"
                >
                  <User size={18} className="opacity-90" />
                  <span className="font-medium">Profil użytkownika</span>
                </Link>

                <div className="h-px bg-white/15" />

                <button
                  onClick={handleLogout}
                  className="w-full text-left flex items-center gap-2 px-4 py-3 hover:bg-white/10 transition"
                  role="menuitem"
                >
                  <LogOut size={18} className="opacity-90" />
                  <span className="font-medium">Wyloguj</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
