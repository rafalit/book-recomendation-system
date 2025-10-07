import { useEffect, useState } from "react";
import TopNav from "../components/layout/TopNav";
import api from "../lib/api";
import { useMyLoans } from "../hooks/useMyLoans";
import { Loan } from "../types/loan";
import EventCard, { EventItem } from "../components/events/EventCard";

type User = {
    id: number;
    first_name: string;
    last_name: string;
    email: string;
    role: string;
    university?: string | null;
    faculty?: string | null;
    field?: string | null;
    academic_title?: string | null;
    phone?: string | null;
    bio?: string | null;
};

type Book = {
    id: number;
    title: string;
    authors: string;
    thumbnail?: string;
};


type Event = {
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
    registration_url?: string | null;
    my_state?: "going" | "interested" | null;
};

export default function ProfilePage() {
    const [user, setUser] = useState<User | null>(null);
    const [myBooks, setMyBooks] = useState<Book[]>([]);
    const [events, setEvents] = useState<Event[]>([]);
    const [favBooks, setFavBooks] = useState<Book[]>([]);

    const [openAbout, setOpenAbout] = useState(false);
    const [openFavs, setOpenFavs] = useState(false);
    const [openLoans, setOpenLoans] = useState(false);
    const [openMyBooks, setOpenMyBooks] = useState(false);
    const [openEvents, setOpenEvents] = useState(false);

    // Użyj hooka useMyLoans dla spójności z resztą aplikacji
    const { loans, refresh: refreshLoans } = useMyLoans();

    useEffect(() => {
        const fetchAll = async () => {
            try {
                const u = await api.get<User>("/auth/me");
                setUser(u.data);

                // Jeśli użytkownik to admin, nie ładuj danych związanych z wypożyczeniami i książkami
                if (u.data.role === "admin") {
                    return; // Tylko informacje o użytkowniku
                }


                const added = await api.get<Book[]>("/books/mine");
                setMyBooks(added.data);

                const ev = await api.get<EventItem[]>("/events/mine");
                setEvents(ev.data);

                // ulubione z localStorage - per użytkownik
                try {
                    const userId = u.data.id;
                    const raw = localStorage.getItem(`favoriteBookIds_${userId}`);
                    const ids: number[] = raw ? JSON.parse(raw) : [];
                    if (ids.length) {
                        const limited = ids.slice(0, 50);
                        const results = await Promise.all(
                            limited.map((id) => api.get<Book>(`/books/${id}`).then((r) => r.data).catch(() => null))
                        );
                        setFavBooks(results.filter(Boolean) as Book[]);
                    }
                } catch {}

            } catch (err) {
                console.error(err);
            }
        };
        fetchAll();
    }, []);

    return (
        <div className="h-screen flex flex-col bg-slate-100 dark:bg-slate-900">
            <TopNav />
            <div className="flex-1 overflow-y-auto p-6">
                {/* Sekcja user info (collapsible) */}
                <section className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm p-0 mb-6 border dark:border-slate-600">
                    <button className="w-full flex items-center justify-between px-6 py-4" onClick={() => setOpenAbout((o) => !o)}>
                        <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">👤 Informacje o mnie</h2>
                        <span className="text-sm text-slate-500 dark:text-slate-400">{openAbout ? "Zwiń" : "Rozwiń"}</span>
                    </button>
                    {openAbout && (
                        <div className="px-6 pb-6">
                            {user ? (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-2 text-slate-700 dark:text-slate-300">
                                    <div><b>Imię i nazwisko:</b> {user.first_name} {user.last_name}</div>
                                    <div><b>Email:</b> {user.email}</div>
                                    {user.university && <div><b>Uczelnia:</b> {user.university}</div>}
                                    {user.faculty && <div><b>Wydział:</b> {user.faculty}</div>}
                                    {user.field && <div><b>Kierunek:</b> {user.field}</div>}
                                    {user.academic_title && <div><b>Tytuł naukowy:</b> {user.academic_title}</div>}
                                    {user.phone && <div><b>Telefon:</b> {user.phone}</div>}
                                    {user.bio && <div className="sm:col-span-2"><b>O mnie:</b> <span className="whitespace-pre-wrap">{user.bio}</span></div>}
                                </div>
                            ) : (
                                <p className="text-slate-500 dark:text-slate-400">Ładowanie...</p>
                            )}
                        </div>
                    )}
                </section>

                {/* Ulubione książki (collapsible) - ukryte dla adminów */}
                {user?.role !== "admin" && (
                    <section className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm p-0 mb-6 border dark:border-slate-600">
                        <button className="w-full flex items-center justify-between px-6 py-4" onClick={() => setOpenFavs((o) => !o)}>
                            <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">⭐ Ulubione książki</h2>
                            <span className="text-sm text-slate-500 dark:text-slate-400">{openFavs ? "Zwiń" : "Rozwiń"}</span>
                        </button>
                        {openFavs && (
                            <div className="px-6 pb-6">
                                {favBooks.length ? (
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                                        {favBooks.map((b) => (
                                            <div key={b.id} className="bg-white dark:bg-slate-700 rounded-xl shadow-sm border border-slate-200 dark:border-slate-600 overflow-hidden hover:shadow-md transition">
                                                <div className="relative w-full pt-[80%] bg-slate-100 dark:bg-slate-600">
                                                    {b.thumbnail ? (
                                                        <img src={b.thumbnail} alt={b.title} className="absolute top-0 left-0 w-full h-full object-contain" />
                                                    ) : (
                                                        <div className="absolute top-0 left-0 w-full h-full flex items-center justify-center text-4xl text-slate-400 dark:text-slate-500">📖</div>
                                                    )}
                                                </div>
                                                <div className="p-4">
                                                    <div className="text-sm font-semibold text-slate-900 dark:text-slate-100 line-clamp-2">{b.title}</div>
                                                    <div className="text-xs text-slate-600 dark:text-slate-300 line-clamp-1">{b.authors}</div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-slate-500 dark:text-slate-400">Brak ulubionych książek.</p>
                                )}
                            </div>
                        )}
                    </section>
                )}

                {/* Sekcja wypożyczone książki (collapsible) - ukryte dla adminów */}
                {user?.role !== "admin" && (
                    <section className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm p-0 mb-6 border dark:border-slate-600">
                        <button className="w-full flex items-center justify-between px-6 py-4" onClick={() => setOpenLoans((o) => !o)}>
                            <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">📚 Moje wypożyczenia</h2>
                            <span className="text-sm text-slate-500 dark:text-slate-400">{openLoans ? "Zwiń" : "Rozwiń"}</span>
                        </button>
                        {openLoans && (
                            <div className="px-6 pb-6">
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                            {loans.map((l) => (
                                <div
                                    key={l.id}
                                    className="bg-white dark:bg-slate-700 rounded-xl shadow-sm border border-slate-200 dark:border-slate-600 overflow-hidden hover:shadow-md transition flex flex-col"
                                >
                                    <div className="relative w-full pt-[80%] bg-slate-100 dark:bg-slate-600">
                                        {l.book?.thumbnail ? (
                                            <img
                                                src={l.book.thumbnail}
                                                alt={l.book.title}
                                                className="absolute top-0 left-0 w-full h-full object-contain"
                                            />
                                        ) : (
                                            <div className="absolute top-0 left-0 w-full h-full flex items-center justify-center text-4xl text-slate-400 dark:text-slate-500">
                                                📖
                                            </div>
                                        )}
                                    </div>
                                    <div className="p-4 flex-1 flex flex-col">
                                        <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100 mb-1 line-clamp-2">
                                            {l.book?.title}
                                        </h3>
                                        <p className="text-xs text-slate-600 dark:text-slate-300 mb-2 line-clamp-1">{l.book?.authors}</p>
                                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-auto">
                                            od {new Date(l.start_date).toLocaleDateString("pl-PL")}
                                            {l.due_date && (
                                                <> – do {new Date(l.due_date).toLocaleDateString("pl-PL")}</>
                                            )}
                                        </p>
                                    </div>
                                </div>
                            ))}
                                </div>
                            </div>
                        )}
                    </section>
                )}

                {/* Sekcja dodane książki (collapsible) - ukryte dla adminów */}
                {user?.role !== "admin" && (
                    <section className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm p-0 mb-6 border dark:border-slate-600">
                        <button className="w-full flex items-center justify-between px-6 py-4" onClick={() => setOpenMyBooks((o) => !o)}>
                            <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">➕ Dodane przeze mnie książki</h2>
                            <span className="text-sm text-slate-500 dark:text-slate-400">{openMyBooks ? "Zwiń" : "Rozwiń"}</span>
                        </button>
                        {openMyBooks && (
                            <div className="px-6 pb-6">
                                {myBooks.length > 0 ? (
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                                        {myBooks.map((b) => (
                                            <div
                                                key={b.id}
                                                className="bg-white dark:bg-slate-700 rounded-xl shadow-sm border border-slate-200 dark:border-slate-600 overflow-hidden hover:shadow-md transition flex flex-col"
                                            >
                                                <div className="relative w-full pt-[80%] bg-slate-100 dark:bg-slate-600">
                                                    {b.thumbnail ? (
                                                        <img
                                                            src={b.thumbnail}
                                                            alt={b.title}
                                                            className="absolute top-0 left-0 w-full h-full object-contain"
                                                        />
                                                    ) : (
                                                        <div className="absolute top-0 left-0 w-full h-full flex items-center justify-center text-4xl text-slate-400 dark:text-slate-500">
                                                            📖
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="p-4 flex-1 flex flex-col">
                                                    <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100 mb-1 line-clamp-2">
                                                        {b.title}
                                                    </h3>
                                                    <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-1">
                                                        {b.authors}
                                                    </p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-slate-500 dark:text-slate-400">Nie dodałeś jeszcze żadnych książek.</p>
                                )}
                            </div>
                        )}
                    </section>
                )}

                {/* Wydarzenia (collapsible) - ukryte dla adminów */}
                {user?.role !== "admin" && (
                    <section className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm p-0 mb-6 border dark:border-slate-600">
                        <button className="w-full flex items-center justify-between px-6 py-4" onClick={() => setOpenEvents((o) => !o)}>
                            <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">📅 Moje wydarzenia</h2>
                            <span className="text-sm text-slate-500 dark:text-slate-400">{openEvents ? "Zwiń" : "Rozwiń"}</span>
                        </button>
                        {openEvents && (
                            <div className="px-6 pb-6">
                                {events.length > 0 ? (
                                    <div className="space-y-3">
                                        {events.map((e) => (
                                            <EventCard key={e.id} ev={e} readOnly />  
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-slate-500 dark:text-slate-400">Nie zapisałeś się jeszcze na żadne wydarzenie.</p>
                                )}
                            </div>
                        )}
                    </section>
                )}
            </div>
        </div>
    );
}
