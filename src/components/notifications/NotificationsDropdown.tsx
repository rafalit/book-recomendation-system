import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Trash2, Bell } from "lucide-react";

type Notification = {
  id: number;
  text: string;
  read: boolean;
};

export default function NotificationDropdown({
  items,
  onRead,
  onDelete,
}: {
  items: Notification[];
  onRead: (id: number) => void;
  onDelete: (id: number) => void;
}) {
  const [open, setOpen] = useState(false);

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
                items.map((n) => (
                  <motion.div
                    key={n.id}
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3 }}
                    className={`flex items-center justify-between gap-3 p-3 border-b last:border-none ${
                      n.read ? "bg-slate-50" : "bg-blue-50"
                    }`}
                  >
                    <div className="flex-1 text-sm text-gray-800">
                      {n.text}
                    </div>
                    <div className="flex gap-2">
                      {!n.read && (
                        <button
                          onClick={() => onRead(n.id)}
                          className="p-1 rounded hover:bg-green-100 text-green-600"
                        >
                          <Check size={16} />
                        </button>
                      )}
                      <button
                        onClick={() => onDelete(n.id)}
                        className="p-1 rounded hover:bg-red-100 text-red-600"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </motion.div>
                ))
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
