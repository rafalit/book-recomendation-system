import { Calendar, MapPin, ExternalLink, Star, CheckCircle2 } from "lucide-react";
import { useState } from "react";
import api from "../../lib/api";

export type EventItem = {
  id: number;
  title: string;
  start_at: string;
  end_at?: string | null;
  all_day?: boolean;
  is_online?: boolean;
  location_name?: string | null;
  address?: string | null;
  university_name?: string | null;
  category?: string | null;
  thumbnail?: string | null;
  publisher_favicon?: string | null;
  registration_url?: string | null;
  organizer?: string | null;
  my_state?: "going" | "interested" | null;
};

function fmtDateRange(start: string, end?: string | null, allDay?: boolean) {
  const s = new Date(start);
  let e = end ? new Date(end) : null;

  if (!allDay && s.getHours() === 0 && s.getMinutes() === 0) {
    s.setHours(16, 0, 0, 0);
    e = new Date(s);
    e.setHours(20, 0, 0, 0);
  }

  const d = s.toLocaleDateString("pl-PL", {
    day: "2-digit",
    month: "short",
    weekday: "short",
  });

  if (allDay) {
    return `${d} • cały dzień`;
  }

  const th = s.toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit" });
  const eh = e ? e.toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit" }) : "";

  return `${d} • ${th}${eh ? "–" + eh : ""}`;
}

export default function EventCard({
  ev,
  readOnly = false,
}: {
  ev: EventItem;
  readOnly?: boolean;
}) {
  const [pending, setPending] = useState<"going" | "interested" | null>(null);
  const [myState, setMyState] = useState<"going" | "interested" | null>(ev.my_state || null);

  const rsvp = async (state: "going" | "interested") => {
    if (readOnly) return; // 🚫 tryb tylko-do-odczytu
    try {
      setPending(state);
      
      // Jeśli użytkownik już ma ten stan, odzanacz go (usuń RSVP)
      if (myState === state) {
        await api.delete(`/events/${ev.id}/rsvp`);
        setMyState(null); // 🔄 usuń stan lokalny
      } else {
        // Jeśli użytkownik nie ma tego stanu lub ma inny, ustaw nowy
        await api.post(`/events/${ev.id}/rsvp`, { state });
        setMyState(state); // 🔄 ustaw nowy stan lokalny
      }
    } finally {
      setPending(null);
    }
  };

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 hover:shadow-sm transition">
      <div className="p-4 grid grid-cols-[1fr,180px] gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
            <Calendar size={14} className="text-slate-500 dark:text-slate-400" />
            <span>{fmtDateRange(ev.start_at, ev.end_at || null, ev.all_day)}</span>
            {ev.university_name && (
              <span className="text-slate-400 dark:text-slate-500">• {ev.university_name}</span>
            )}
            {ev.category && (
              <span className="ml-2 rounded-full bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 border border-indigo-100 dark:border-indigo-600">
                {ev.category}
              </span>
            )}
          </div>
          <h3 className="mt-1 text-[18px] font-semibold text-slate-900 dark:text-slate-100">{ev.title}</h3>
          <div className="mt-1 flex items-center gap-3 text-sm text-slate-600 dark:text-slate-300">
            {ev.is_online ? (
              <span>🔵 Online</span>
            ) : (
              (ev.location_name || ev.address) && (
                <span className="inline-flex items-center gap-1">
                  <MapPin size={14} className="text-slate-500 dark:text-slate-400" /> {ev.location_name || ev.address}
                </span>
              )
            )}
          </div>

          <div className="mt-3 flex items-center gap-2">
            <button
              onClick={() => rsvp("going")}
              disabled={!!pending || readOnly}
              className={`inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-sm disabled:opacity-60
                ${
                  myState === "going"
                    ? "bg-green-600 dark:bg-green-700 text-white"
                    : "bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-600"
                }`}
              title={myState === "going" ? "Odzanacz udział" : "Wezmę udział"}
            >
              <CheckCircle2 size={16} />{" "}
              {myState === "going" ? "Bierzesz udział" : "Wezmę udział"}
            </button>

            <button
              onClick={() => rsvp("interested")}
              disabled={!!pending || readOnly}
              className={`inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-sm disabled:opacity-60
                ${
                  myState === "interested"
                    ? "bg-yellow-500 dark:bg-yellow-600 text-white"
                    : "bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-600"
                }`}
              title={myState === "interested" ? "Odzanacz zainteresowanie" : "Zainteresowany"}
            >
              <Star size={16} />{" "}
              {myState === "interested" ? "Jesteś zainteresowany" : "Zainteresowany"}
            </button>

            {ev.registration_url && (
              <a
                href={ev.registration_url}
                target="_blank"
                rel="noreferrer"
                className="ml-auto inline-flex items-center gap-1 text-indigo-700 dark:text-indigo-400 hover:underline"
              >
                <ExternalLink size={16} /> Rejestracja
              </a>
            )}
          </div>
        </div>

        {ev.thumbnail && (
          <img
            src={ev.thumbnail}
            alt=""
            className="w-44 h-28 object-cover rounded-md border border-slate-200 dark:border-slate-600"
            loading="lazy"
            referrerPolicy="no-referrer"
          />
        )}
      </div>
    </div>
  );
}
