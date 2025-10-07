import { formatDateOnly } from "../../lib/formatDate";
import { AlertTriangle, MessageSquare, FileText, Trash2, Eye } from "lucide-react";

interface Report {
  id: number;
  reason: string;
  created_at: string;
  handled: boolean;
  reporter: {
    id: number;
    email: string;
    first_name: string;
    last_name: string;
  };
  post?: {
    id: number;
    title: string;
    summary: string;
    body: string;
    topic: string;
    created_at: string;
    is_deleted: boolean;
    author: {
      id: number;
      email: string;
      first_name: string;
      last_name: string;
    };
  };
  reply?: {
    id: number;
    body: string;
    created_at: string;
    is_deleted: boolean;
    post_id: number;
    post_title: string;
    author: {
      id: number;
      email: string;
      first_name: string;
      last_name: string;
    };
  };
}

interface ReportsTabProps {
  postReports: Report[];
  replyReports: Report[];
  totalUnhandled?: number; // Dodaj opcjonalną liczbę z statystyk
  onHandle: (type: "post" | "reply", reportId: number, deleteContent: boolean) => void;
}

export default function ReportsTab({ postReports, replyReports, totalUnhandled, onHandle }: ReportsTabProps) {
  // Użyj totalUnhandled ze statystyk jeśli dostępne, inaczej policz z tablic
  const totalReports = totalUnhandled ?? (postReports.length + replyReports.length);

  return (
    <div className="p-6 h-full overflow-y-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
            <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              Zgłoszenia
            </h2>
            <p className="text-slate-600 dark:text-slate-400">
              {totalReports === 0 ? "Brak zgłoszeń do przeglądu" : `${totalReports} zgłoszeń wymaga uwagi`}
            </p>
          </div>
        </div>
      </div>

      {totalReports === 0 ? (
        <div className="flex flex-col items-center justify-center py-16">
          <div className="p-4 bg-green-100 dark:bg-green-900/30 rounded-full mb-4">
            <AlertTriangle className="h-12 w-12 text-green-600 dark:text-green-400" />
          </div>
          <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-2">
            Wszystko czyste!
          </h3>
          <p className="text-slate-600 dark:text-slate-400 text-center max-w-md">
            Brak nieobsłużonych zgłoszeń. Społeczność zachowuje się wzorowo.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Zgłoszenia postów */}
          {postReports.map((report) => (
            <div key={`post-${report.id}`} className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                    {/* Header karty */}
                    <div className="bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20 px-6 py-4 border-b border-red-100 dark:border-red-800/50">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-1">
                            {report.post?.title}
                          </h4>
                          <div className="flex items-center gap-4 text-sm text-slate-600 dark:text-slate-400">
                            <span>📝 {report.post?.topic}</span>
                            <span>📅 {formatDateOnly(report.created_at)}</span>
                            <span>👤 {report.reporter.first_name} {report.reporter.last_name}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="px-3 py-1 bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300 rounded-full text-sm font-medium">
                            Zgłoszenie
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="p-6">
                      {/* Powód zgłoszenia */}
                      {report.reason && (
                        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border-l-4 border-red-400">
                          <div className="flex items-start gap-3">
                            <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5" />
                            <div>
                              <p className="font-medium text-red-800 dark:text-red-200 mb-1">Powód zgłoszenia:</p>
                              <p className="text-red-700 dark:text-red-300">{report.reason}</p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Treść postu */}
                      <div className="mb-6 p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                        <div className="flex items-center gap-2 mb-3">
                          <FileText className="h-4 w-4 text-slate-500" />
                          <span className="font-medium text-slate-700 dark:text-slate-300">Treść postu</span>
                        </div>
                        <div className="space-y-2">
                          <p className="text-slate-600 dark:text-slate-400 font-medium">{report.post?.summary}</p>
                          <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">{report.post?.body}</p>
                        </div>
                        <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-600">
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            Autor: <span className="font-medium">{report.post?.author.first_name} {report.post?.author.last_name}</span> ({report.post?.author.email})
                          </p>
                        </div>
                      </div>

                      {/* Akcje */}
                      <div className="flex gap-2">
                        <button
                          onClick={() => onHandle("post", report.id, false)}
                          className="px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded text-sm font-medium transition-colors flex items-center gap-1"
                        >
                          <Eye className="h-3 w-3" />
                          Zignoruj
                        </button>
                        <button
                          onClick={() => onHandle("post", report.id, true)}
                          className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded text-sm font-medium transition-colors flex items-center gap-1"
                        >
                          <Trash2 className="h-3 w-3" />
                          Usuń
                        </button>
                      </div>
                    </div>
                  </div>
          ))}

          {/* Zgłoszenia komentarzy */}
          {replyReports.map((report) => (
            <div key={`reply-${report.id}`} className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                    {/* Header karty */}
                    <div className="bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 px-6 py-4 border-b border-purple-100 dark:border-purple-800/50">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-1">
                            Komentarz w: {report.reply?.post_title}
                          </h4>
                          <div className="flex items-center gap-4 text-sm text-slate-600 dark:text-slate-400">
                            <span>💬 Komentarz</span>
                            <span>📅 {formatDateOnly(report.created_at)}</span>
                            <span>👤 {report.reporter.first_name} {report.reporter.last_name}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="px-3 py-1 bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300 rounded-full text-sm font-medium">
                            Zgłoszenie
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="p-6">
                      {/* Powód zgłoszenia */}
                      {report.reason && (
                        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border-l-4 border-red-400">
                          <div className="flex items-start gap-3">
                            <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5" />
                            <div>
                              <p className="font-medium text-red-800 dark:text-red-200 mb-1">Powód zgłoszenia:</p>
                              <p className="text-red-700 dark:text-red-300">{report.reason}</p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Treść komentarza */}
                      <div className="mb-6 p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                        <div className="flex items-center gap-2 mb-3">
                          <MessageSquare className="h-4 w-4 text-slate-500" />
                          <span className="font-medium text-slate-700 dark:text-slate-300">Treść komentarza</span>
                        </div>
                        <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed mb-3">{report.reply?.body}</p>
                        <div className="pt-3 border-t border-slate-200 dark:border-slate-600">
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            Autor: <span className="font-medium">{report.reply?.author.first_name} {report.reply?.author.last_name}</span> ({report.reply?.author.email})
                          </p>
                        </div>
                      </div>

                      {/* Akcje */}
                      <div className="flex gap-2">
                        <button
                          onClick={() => onHandle("reply", report.id, false)}
                          className="px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded text-sm font-medium transition-colors flex items-center gap-1"
                        >
                          <Eye className="h-3 w-3" />
                          Zignoruj
                        </button>
                        <button
                          onClick={() => onHandle("reply", report.id, true)}
                          className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded text-sm font-medium transition-colors flex items-center gap-1"
                        >
                          <Trash2 className="h-3 w-3" />
                          Usuń
                        </button>
                      </div>
                    </div>
                  </div>
          ))}
        </div>
      )}
    </div>
  );
}
