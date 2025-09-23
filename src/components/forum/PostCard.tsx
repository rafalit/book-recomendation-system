import { Link } from "react-router-dom";
import ReactionBar from "./ReactionBar";
import { ForumPost } from "../../lib/forumApi";

function RoleBadge({ role }: { role: string }) {
  const isStudent = role === "student";
  const color = isStudent ? "emerald" : "indigo";
  return (
    <span className={`ml-2 text-xs px-2 py-0.5 rounded-full border bg-${color}-50 text-${color}-700 border-${color}-300`}>
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
    <div className="rounded-2xl border bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <Link to={`/forum/${post.id}`} className="text-lg font-semibold hover:underline">
            {post.title}
          </Link>
          <div className="text-slate-600 mt-0.5">{post.summary}</div>
          <div className="mt-1 text-xs text-slate-500">
            {post.author.first_name} {post.author.last_name}
            <RoleBadge role={post.author.role} /> • {post.topic} •{" "}
            {new Date(post.created_at).toLocaleString()}
          </div>
        </div>
        <Link to={`/forum/${post.id}`} className="text-sm text-indigo-700 hover:underline">
          {post.replies_count} odpowiedzi
        </Link>
      </div>

      <div className="mt-3">
        <ReactionBar postId={post.id} counts={post.reactions || {}} onChange={onReactionsChange} />
      </div>
    </div>
  );
}
