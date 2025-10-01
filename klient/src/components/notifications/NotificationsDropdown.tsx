// src/components/notifications/NotificationsDropdown.tsx
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bell,
  Check,
  Trash2,
  ThumbsUp,
  MessageSquare,
  Flag,
} from "lucide-react";
import { Link } from "react-router-dom";

export type Notification = {
  id: number;
  type:
    | "reaction_post"
    | "reaction_review"
    | "reply_post"
    | "reply_review"
    | "report_post"
    | "report_review"
    | string;
  text: string;           // <-- czytelny tekst od backendu
  url?: string | null;    // <-- 🔥 backend podaje np. "/books/123#review-45"
  created_at: string;
  read: boolean;
  post_id?: number | null;
  reply_id?: number | null;
  review_id?: number | null;
};

export default function NotificationsDropdown({
  items,
  onRead,
  onDelete,
}: {
  items: Notification[];
  onRead: (id: number) => void;
  onDelete: (id: number) => void;
}) {
  const [open, setOpen] = useState(false);

  const renderNotification = (n: Notification) => {
    let icon, color;

    switch (n.type) {
      case "reaction_review":
        icon = <ThumbsUp className="text-green-600 dark:text-green-400" size={18} />;
        color = "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700";
        break;
      case "reaction_post":
        icon = <ThumbsUp className="text-orange-600 dark:text-orange-400" size={18} />;
        color = "bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-700"; 
        break;
      case "reply_post":
        icon = <MessageSquare className="text-blue-600 dark:text-blue-400" size={18} />;
        color = "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700";
        break;
      case "reply_review":
        icon = <MessageSquare className="text-amber-600 dark:text-amber-400" size={18} />;
        color = "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-700";
        break;
      case "report_post":
      case "report_review":
        icon = <Flag className="text-red-600 dark:text-red-400" size={18} />;
        color = "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-700";
        break;
      case "new_review":
        icon = <MessageSquare className="text-purple-600 dark:text-purple-400" size={18} />;
        color = "bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-700";
        break;
      default:
        icon = <Bell className="text-yellow-500 dark:text-yellow-400" size={18} />;
        color = "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-700";
    }

    return (
      <motion.div
        key={n.id}
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: "auto" }}
        exit={{ opacity: 0, height: 0 }}
        transition={{ duration: 0.3 }}
        className={`flex items-center justify-between gap-3 p-3 border-b border-slate-200 dark:border-slate-600 last:border-none ${
          n.read ? "opacity-70" : "font-medium"
        } ${color}`}
      >
        <Link
          to={n.url || "/"}   // 🔥 teraz klikalne w miejsce wskazane przez backend
          onClick={() => onRead(n.id)}
          className="flex items-center gap-3 flex-1 hover:underline"
        >
          {icon}
          <div className="flex-1 text-sm text-gray-800 dark:text-slate-200">{n.text}</div>
        </Link>
        <div className="flex gap-2">
          {!n.read && (
            <button
              onClick={() => onRead(n.id)}
              className="p-1 rounded hover:bg-green-100 dark:hover:bg-green-900/20 text-green-600 dark:text-green-400"
              title="Oznacz jako przeczytane"
            >
              <Check size={16} />
            </button>
          )}
          <button
            onClick={() => onDelete(n.id)}
            className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400"
            title="Usuń"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </motion.div>
    );
  };

  return (
    <div className="relative">
      {/* 🔔 ikona */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-600 transition"
      >
        <Bell />
        {items.some((n) => !n.read) && (
          <span className="absolute -top-1 -right-1 bg-red-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
            {items.filter((n) => !n.read).length}
          </span>
        )}
      </button>

      {/* dropdown */}
      {open && (
        <div className="absolute right-0 mt-2 w-96 bg-white dark:bg-slate-800 shadow-lg rounded-xl overflow-hidden z-50">
          <div className="p-3 border-b border-slate-200 dark:border-slate-600 font-semibold text-gray-700 dark:text-slate-200">
            Powiadomienia
          </div>
          <div className="max-h-96 overflow-y-auto">
            <AnimatePresence>
              {items.length > 0 ? (
                items.map((n) => renderNotification(n))
              ) : (
                <div className="p-4 text-center text-gray-500 dark:text-slate-400 text-sm">
                  Brak powiadomień
                </div>
              )}
            </AnimatePresence>
          </div>
        </div>
      )}
    </div>
  );
}
