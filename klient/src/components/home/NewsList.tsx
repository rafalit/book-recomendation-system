import NewsCard, { NewsCardProps } from "./NewsCard";

export type NewsItem = NewsCardProps;

function SkeletonCard() {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 animate-pulse">
      <div className="h-3 w-32 bg-slate-200 rounded mb-2" />
      <div className="h-5 w-3/4 bg-slate-200 rounded mb-2" />
      <div className="h-3 w-2/3 bg-slate-200 rounded" />
    </div>
  );
}

function EmptyState() {
  return (
    <div className="mx-auto max-w-[700px] bg-white rounded-2xl border border-slate-200 shadow-sm p-10 text-center">
      <div className="text-6xl mb-4">📖</div>
      <h3 className="text-xl font-semibold text-slate-800 mb-1">Brak aktualności</h3>
      <p className="text-slate-600">
        Nie znaleziono żadnych artykułów dla wybranych filtrów.
        <br />Spróbuj zmienić kryteria wyszukiwania.
      </p>
    </div>
  );
}

export default function NewsList({ items, loading }: { items: NewsItem[]; loading: boolean }) {
  if (loading) {
    return (
      <div className="p-5 space-y-3">
        {Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)}
      </div>
    );
  }
  if (!items.length) {
    return (
      <div className="p-8">
        <EmptyState />
      </div>
    );
  }
  return (
    <div className="p-5 grid grid-cols-1 gap-3">
      {items.map((n, i) => (
        <NewsCard key={`${n.link}-${i}`} {...n} />
      ))}
    </div>
  );
}
