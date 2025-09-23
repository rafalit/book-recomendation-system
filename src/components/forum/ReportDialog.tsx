import { useState } from "react";
import { report as reportApi } from "../../lib/forumApi";

export default function ReportDialog({
  postId,
  onClose,
  onReported,
}: {
  postId: number;
  onClose: () => void;
  onReported?: () => void;
}) {
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    try {
      await reportApi(postId, reason || undefined);
      onReported?.();
      onClose();
    } catch (e) {
      alert("Nie udało się zgłosić wpisu.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-[100] grid place-items-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl">
        <div className="px-5 py-4 border-b">
          <div className="text-lg font-semibold">Zgłoś wpis</div>
          <div className="text-sm text-slate-600">Opisz krótko powód (opcjonalnie).</div>
        </div>
        <div className="p-5">
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={4}
            className="w-full rounded-xl border px-3 py-2"
            placeholder="Powód zgłoszenia…"
          />
        </div>
        <div className="px-5 py-4 border-t flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 rounded-lg bg-slate-100">Anuluj</button>
          <button onClick={submit} disabled={busy} className="px-4 py-2 rounded-lg bg-rose-600 text-white">
            Wyślij zgłoszenie
          </button>
        </div>
      </div>
    </div>
  );
}
