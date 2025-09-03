import { Bell } from "lucide-react";
import { Link, useLocation } from "react-router-dom";

const links = [
  { to: "/home", label: "Aktualności" },
  { to: "/books", label: "Książki" },
  { to: "/rankings", label: "Rankingi" },
  { to: "/forum", label: "Forum" },
  { to: "/events", label: "Wydarzenia" },
  { to: "/contact", label: "Kontakt" },
];

export default function TopNav({ fullName }: { fullName?: string }) {
  const { pathname } = useLocation();
  return (
    <header className="h-16 bg-white border-b">
      <div className="mx-auto max-w-7xl h-full px-4 flex items-center justify-between">
        <nav className="flex items-center gap-6">
          {links.map((l) => {
            const active = pathname === l.to;
            return (
              <Link
                key={l.to}
                to={l.to}
                className={`px-3 py-1.5 rounded-full transition ${
                  active ? "bg-red-600 text-white" : "hover:bg-slate-100"
                }`}
              >
                {l.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-3">
          <Link
            to="/notifications"
            className="h-9 w-9 inline-flex items-center justify-center rounded-full border hover:bg-slate-50"
            title="Powiadomienia"
          >
            <Bell size={18} />
          </Link>
          <Link
            to="/profile"
            className="px-3 h-9 inline-flex items-center rounded-full border hover:bg-slate-50 text-sm"
            title="Profil"
          >
            {fullName ?? "Profil"}
          </Link>
        </div>
      </div>
    </header>
  );
}
