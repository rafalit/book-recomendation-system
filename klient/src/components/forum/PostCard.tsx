import { Link } from "react-router-dom";
import ReactionBar from "./ReactionBar";
import { ForumPost } from "../../lib/forumApi";
import { formatDateOnly } from "../../lib/formatDate";

function RoleBadge({ role }: { role: string }) {
  const isStudent = role === "student";
  const color = isStudent ? "emerald" : "indigo";
  return (
    <span className={`ml-2 text-xs px-2 py-0.5 rounded-full border bg-${color}-50 dark:bg-${color}-900/20 text-${color}-700 dark:text-${color}-300 border-${color}-300 dark:border-${color}-600`}>
      {isStudent ? "Student" : "Pracownik naukowy"}
    </span>
  );
}

export default function PostCard({
  post,
  onReactionsChange,
}: {
  post: ForumPost;
  onReactionsChange?: (next: Record<string, number>) => void;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 p-4 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <Link to={`/forum/${post.id}`} className="text-lg font-semibold text-slate-900 dark:text-slate-100 hover:underline">
            {post.title}
          </Link>
          <div className="text-slate-600 dark:text-slate-300 mt-0.5">{post.summary}</div>
          <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {post.author.first_name} {post.author.last_name}
            <RoleBadge role={post.author.role} /> • {post.topic} • {formatDateOnly(post.created_at)}
          </div>
        </div>
        <Link to={`/forum/${post.id}`} className="text-sm text-indigo-700 dark:text-indigo-400 hover:underline">
          {post.replies_count} odpowiedzi
        </Link>
      </div>

      <div className="mt-3">
        <ReactionBar postId={post.id} counts={post.reactions || {}} onChange={onReactionsChange} />
      </div>
    </div>
  );
}
