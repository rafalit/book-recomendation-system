import { useState } from "react";
import { react as reactApi } from "../../lib/forumApi";

const REACTIONS = [
  { key: "like", label: "Like", emoji: "👍" },
  { key: "celebrate", label: "Celebrate", emoji: "🎉" },
  { key: "support", label: "Support", emoji: "🤝" },
  { key: "love", label: "Love", emoji: "❤️" },
  { key: "insightful", label: "Insightful", emoji: "🧠" },
  { key: "funny", label: "Funny", emoji: "😂" },
];

export default function ReactionBar({
  postId,
  counts,
  onChange,
  userRole,
  userReaction,
  onUserReactionChange,
}: {
  postId: number;
  counts: Record<string, number>;
  onChange?: (next: Record<string, number>) => void;
  userRole?: string;
  userReaction?: string | null;
  onUserReactionChange?: (userReaction: string | null) => void;
}) {
  const [busy, setBusy] = useState(false);

  const handleReact = async (key: string) => {
    if (busy) return;
    try {
      setBusy(true);
      
      // Jeśli użytkownik klika na już aktywną reakcję, usuń ją
      const newReaction = userReaction === key ? null : key;
      
      const result = await reactApi(postId, newReaction);
      
      // Użyj danych z serwera zamiast lokalnych obliczeń
      onChange?.(result.counts);
      onUserReactionChange?.(result.user_reaction);
    } finally {
      setBusy(false);
    }
  };

  // Dla administratorów wyświetl tylko liczniki bez możliwości reagowania
  if (userRole === "admin") {
    return (
      <div className="flex flex-wrap gap-2">
        {REACTIONS.map((r) => {
          const count = counts?.[r.key] ?? 0;
          if (count === 0) return null; // Nie pokazuj reakcji z zerem dla adminów
          return (
            <div
              key={r.key}
              className="px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 shadow-sm text-sm cursor-default"
              title={`${r.label}: ${count}`}
            >
              <span className="mr-1">{r.emoji}</span>
              <span className="font-medium">{count}</span>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {REACTIONS.map((r) => {
        const hasReacted = userReaction === r.key;
        const count = counts?.[r.key] ?? 0;
        return (
          <button
            key={r.key}
            disabled={busy}
            onClick={() => handleReact(r.key)}
            className={`px-3 py-1.5 rounded-full shadow-sm text-sm font-medium transition-colors ${
              hasReacted
                ? "bg-indigo-100 dark:bg-indigo-900/30 text-indigo-800 dark:text-indigo-200 hover:bg-indigo-200 dark:hover:bg-indigo-900/50"
                : "bg-white/60 dark:bg-slate-700/60 text-indigo-700 dark:text-indigo-300 hover:bg-white dark:hover:bg-slate-600"
            }`}
            title={hasReacted ? `Twoja reakcja: ${r.label}` : r.label}
          >
            <span className="mr-1">{r.emoji}</span>
            <span>{count}</span>
          </button>
        );
      })}
    </div>
  );
}
