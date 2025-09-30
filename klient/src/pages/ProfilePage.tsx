import { useEffect, useState } from "react";
import TopNav from "../components/layout/TopNav";
import api from "../lib/api";
import EventCard, { EventItem } from "../components/events/EventCard";

type User = {
    id: number;
    first_name: string;
    last_name: string;
    email: string;
    university: string;
};

type Book = {
    id: number;
    title: string;
    authors: string;
    thumbnail?: string;
};

type Loan = {
    id: number;
    start_date: string;
    due_date: string;
    returned_at?: string | null;
    book: {
        id: number;
        title: string;
        authors: string;
        thumbnail?: string;
    };
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
    const [books, setBooks] = useState<Book[]>([]);
    const [myBooks, setMyBooks] = useState<Book[]>([]);
    const [events, setEvents] = useState<Event[]>([]);
    const [loans, setLoans] = useState<Loan[]>([]);

    useEffect(() => {
        const fetchAll = async () => {
            try {
                const u = await api.get<User>("/auth/me");
                setUser(u.data);

                const loansRes = await api.get<Loan[]>("/books/loans/me");
                setLoans(loansRes.data);

                const added = await api.get<Book[]>("/books/mine");
                setMyBooks(added.data);

                const ev = await api.get<EventItem[]>("/events/mine");
                setEvents(ev.data);

            } catch (err) {
                console.error(err);
            }
        };
        fetchAll();
    }, []);

    return (
        <div className="h-screen flex flex-col bg-slate-100">
            <TopNav />
            <div className="flex-1 overflow-y-auto p-6">
                {/* Sekcja user info */}
                <section className="bg-white rounded-2xl shadow-sm p-6 mb-6">
                    <h2 className="text-xl font-semibold mb-2">👤 Informacje o mnie</h2>
                    {user ? (
                        <div>
                            <p><b>{user.first_name} {user.last_name}</b></p>
                            <p>{user.email}</p>
                            <p>{user.university}</p>
                        </div>
                    ) : (
                        <p className="text-slate-500">Ładowanie...</p>
                    )}
                </section>

                {/* Sekcja wypożyczone książki */}
                <section className="bg-white rounded-2xl shadow-sm p-6 mb-6">
                    <h2 className="text-xl font-semibold mb-4">📚 Moje wypożyczenia</h2>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                        {loans.map((l) => (
                            <div
                                key={l.id}
                                className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition flex flex-col"
                            >
                                <div className="relative w-full pt-[80%] bg-slate-100">
                                    {l.book?.thumbnail ? (
                                        <img
                                            src={l.book.thumbnail}
                                            alt={l.book.title}
                                            className="absolute top-0 left-0 w-full h-full object-contain"
                                        />
                                    ) : (
                                        <div className="absolute top-0 left-0 w-full h-full flex items-center justify-center text-4xl text-slate-400">
                                            📖
                                        </div>
                                    )}
                                </div>
                                <div className="p-4 flex-1 flex flex-col">
                                    <h3 className="text-sm font-semibold text-slate-800 mb-1 line-clamp-2">
                                        {l.book?.title}
                                    </h3>
                                    <p className="text-xs text-slate-600 mb-2 line-clamp-1">{l.book?.authors}</p>
                                    <p className="text-xs text-slate-500 mt-auto">
                                        od {new Date(l.start_date).toLocaleDateString("pl-PL")}
                                        {l.due_date && (
                                            <> – do {new Date(l.due_date).toLocaleDateString("pl-PL")}</>
                                        )}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>

                </section>

                {/* Sekcja dodane książki */}
                <section className="bg-white rounded-2xl shadow-sm p-6 mb-6">
                    <h2 className="text-xl font-semibold mb-4">➕ Dodane przeze mnie książki</h2>
                    {myBooks.length > 0 ? (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                            {myBooks.map((b) => (
                                <div
                                    key={b.id}
                                    className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition flex flex-col"
                                >
                                    {/* Okładka */}
                                    <div className="relative w-full pt-[80%] bg-slate-100">
                                        {b.thumbnail ? (
                                            <img
                                                src={b.thumbnail}
                                                alt={b.title}
                                                className="absolute top-0 left-0 w-full h-full object-contain"
                                            />
                                        ) : (
                                            <div className="absolute top-0 left-0 w-full h-full flex items-center justify-center text-4xl text-slate-400">
                                                📖
                                            </div>
                                        )}
                                    </div>

                                    {/* Info */}
                                    <div className="p-4 flex-1 flex flex-col">
                                        <h3 className="text-sm font-semibold text-slate-800 mb-1 line-clamp-2">
                                            {b.title}
                                        </h3>
                                        <p className="text-xs text-slate-600 line-clamp-1">
                                            {b.authors}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-slate-500">Nie dodałeś jeszcze żadnych książek.</p>
                    )}
                </section>

                {/* Wydarzenia */}
                <section className="bg-white rounded-2xl shadow-sm p-6 mb-6">
                    <h2 className="text-xl font-semibold mb-4">📅 Moje wydarzenia</h2>
                    {events.length > 0 ? (
                        <div className="space-y-3">
                            {events.map((e) => (
                                <EventCard key={e.id} ev={e} readOnly />  
                            ))}
                        </div>
                    ) : (
                        <p className="text-slate-500">Nie zapisałeś się jeszcze na żadne wydarzenie.</p>
                    )}
                </section>
            </div>
        </div>
    );
}
