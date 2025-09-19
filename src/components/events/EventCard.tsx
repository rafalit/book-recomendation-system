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
};

function fmtDateRange(start: string, end?: string | null, allDay?: boolean) {
  const s = new Date(start);
  const e = end ? new Date(end) : null;
  const d = s.toLocaleDateString("pl-PL", { day: "2-digit", month: "short", weekday: "short" });
  const th = s.toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit" });
  const eh = e ? e.toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit" }) : "";
  return allDay ? `${d} • cały dzień` : `${d} • ${th}${eh ? "–"+eh : ""}`;
}

export default function EventCard({ ev }: { ev: EventItem }) {
  const [pending, setPending] = useState<"going"|"interested"|null>(null);

  const rsvp = async (state: "going"|"interested") => {
    try {
      setPending(state);
      await api.post(`/events/${ev.id}/rsvp`, { state });
    } finally {
      setPending(null);
    }
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white hover:bg-slate-50 hover:shadow-sm transition">
      <div className="p-4 grid grid-cols-[1fr,180px] gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-600">
            <Calendar size={14} />
            <span>{fmtDateRange(ev.start_at, ev.end_at || null, ev.all_day)}</span>
            {ev.university_name && <span className="text-slate-400">• {ev.university_name}</span>}
            {ev.category && <span className="ml-2 rounded-full bg-indigo-50 text-indigo-700 px-2 py-0.5 border border-indigo-100">{ev.category}</span>}
          </div>
          <h3 className="mt-1 text-[18px] font-semibold text-slate-900">{ev.title}</h3>
          <div className="mt-1 flex items-center gap-3 text-sm text-slate-600">
            {ev.is_online ? (
              <span>🔵 Online</span>
            ) : (
              (ev.location_name || ev.address) && (
                <span className="inline-flex items-center gap-1">
                  <MapPin size={14} /> {ev.location_name || ev.address}
                </span>
              )
            )}
          </div>

          <div className="mt-3 flex items-center gap-2">
            <button
              onClick={() => rsvp("going")}
              className="inline-flex items-center gap-1 rounded-full bg-indigo-600 text-white px-3 py-1.5 text-sm disabled:opacity-60"
              disabled={!!pending}
              title="Wezmę udział"
            >
              <CheckCircle2 size={16} /> Wezmę udział
            </button>
            <button
              onClick={() => rsvp("interested")}
              className="inline-flex items-center gap-1 rounded-full bg-white border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-100 disabled:opacity-60"
              disabled={!!pending}
              title="Zainteresowany"
            >
              <Star size={16} /> Zainteresowany
            </button>

            {ev.registration_url && (
              <a
                href={ev.registration_url}
                target="_blank"
                rel="noreferrer"
                className="ml-auto inline-flex items-center gap-1 text-indigo-700 hover:underline"
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
            className="w-44 h-28 object-cover rounded-md border border-slate-200"
            loading="lazy"
            referrerPolicy="no-referrer"
          />
        )}
      </div>
    </div>
  );
}
