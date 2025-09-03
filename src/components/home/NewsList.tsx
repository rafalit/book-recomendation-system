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

export default function NewsList({ items, loading }: { items: NewsItem[]; loading: boolean }) {
  if (loading) {
    return (
      <div className="p-5 space-y-3">
        {Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)}
      </div>
    );
  }
  if (!items.length) {
    return <div className="p-6 text-slate-600">Brak wyników dla wybranych filtrów.</div>;
  }
  return (
    <div className="p-5 grid grid-cols-1 gap-3">
      {items.map((n, i) => (
        <NewsCard key={`${n.link}-${i}`} {...n} />
      ))}
    </div>
  );
}