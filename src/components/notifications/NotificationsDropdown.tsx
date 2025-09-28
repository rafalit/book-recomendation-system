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
        icon = <ThumbsUp className="text-green-600" size={18} />;
        color = "bg-green-50 border-green-200";
        break;
      case "reaction_post":
        icon = <ThumbsUp className="text-orange-600" size={18} />;
        color = "bg-orange-50 border-orange-200"; 
        break;
      case "reply_post":
        icon = <MessageSquare className="text-blue-600" size={18} />;
        color = "bg-blue-50 border-blue-200";
        break;
      case "reply_review":
        icon = <MessageSquare className="text-amber-600" size={18} />;
        color = "bg-amber-50 border-amber-200";
        break;
      case "report_post":
      case "report_review":
        icon = <Flag className="text-red-600" size={18} />;
        color = "bg-red-50 border-red-200";
        break;
      default:
        icon = <Bell className="text-yellow-500" size={18} />;
        color = "bg-yellow-50 border-yellow-200";
    }

    return (
      <motion.div
        key={n.id}
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: "auto" }}
        exit={{ opacity: 0, height: 0 }}
        transition={{ duration: 0.3 }}
        className={`flex items-center justify-between gap-3 p-3 border-b last:border-none ${
          n.read ? "opacity-70" : "font-medium"
        } ${color}`}
      >
        <Link
          to={n.url || "/"}   // 🔥 teraz klikalne w miejsce wskazane przez backend
          onClick={() => onRead(n.id)}
          className="flex items-center gap-3 flex-1 hover:underline"
        >
          {icon}
          <div className="flex-1 text-sm text-gray-800">{n.text}</div>
        </Link>
        <div className="flex gap-2">
          {!n.read && (
            <button
              onClick={() => onRead(n.id)}
              className="p-1 rounded hover:bg-green-100 text-green-600"
              title="Oznacz jako przeczytane"
            >
              <Check size={16} />
            </button>
          )}
          <button
            onClick={() => onDelete(n.id)}
            className="p-1 rounded hover:bg-red-100 text-red-600"
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
        className="relative p-2 rounded-full hover:bg-slate-200 transition"
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
        <div className="absolute right-0 mt-2 w-96 bg-white shadow-lg rounded-xl overflow-hidden z-50">
          <div className="p-3 border-b font-semibold text-gray-700">
            Powiadomienia
          </div>
          <div className="max-h-96 overflow-y-auto">
            <AnimatePresence>
              {items.length > 0 ? (
                items.map((n) => renderNotification(n))
              ) : (
                <div className="p-4 text-center text-gray-500 text-sm">
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
