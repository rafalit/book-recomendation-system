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
}: {
  postId: number;
  counts: Record<string, number>;
  onChange?: (next: Record<string, number>) => void;
}) {
  const [busy, setBusy] = useState(false);

  const handleReact = async (key: string) => {
    if (busy) return;
    try {
      setBusy(true);
      await reactApi(postId, key);
      const next = { ...counts, [key]: (counts[key] || 0) + 1 };
      onChange?.(next);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-wrap gap-2">
      {REACTIONS.map((r) => (
        <button
          key={r.key}
          disabled={busy}
          onClick={() => handleReact(r.key)}
          className="px-3 py-1.5 rounded-full bg-white/60 dark:bg-slate-700/60 text-indigo-700 dark:text-indigo-300 hover:bg-white dark:hover:bg-slate-600 shadow-sm text-sm"
          title={r.label}
        >
          <span className="mr-1">{r.emoji}</span>
          <span className="font-medium">{counts?.[r.key] ?? 0}</span>
        </button>
      ))}
    </div>
  );
}
