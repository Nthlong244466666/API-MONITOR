import { useEffect, useId, useRef, useState } from "react";
import { AlertTriangle, X } from "lucide-react";

// Separate from the existing ConfirmDialog so Workspace/Project deletion is unchanged.
export default function DeleteRequestDialog({ request, busy, error, onClose, onConfirm }) {
  const dialogRef = useRef(null);
  const titleId = useId();
  const [typedName, setTypedName] = useState("");
  const [acceptCascade, setAcceptCascade] = useState(false);
  const matches = typedName === request.name && request.name.length > 0;

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
    return () => { if (dialog?.open) dialog.close(); };
  }, []);

  return (
    <dialog ref={dialogRef} aria-labelledby={titleId} onCancel={(event) => { event.preventDefault(); if (!busy) onClose(); }}
      className="m-auto w-[calc(100%-2rem)] max-w-lg rounded-xl border border-line bg-panel p-6 text-ink shadow-2xl backdrop:bg-black/75">
      <div className="flex items-start justify-between gap-3">
        <h2 id={titleId} className="flex items-center gap-2 text-lg font-semibold"><AlertTriangle size={22} className="text-down" aria-hidden="true" /> Delete API Request</h2>
        <button type="button" aria-label="Close" onClick={onClose} disabled={busy} className="text-muted hover:text-ink disabled:opacity-50"><X size={20} /></button>
      </div>
      <p className="mt-4 text-sm leading-6 text-muted">
        This permanently deletes the request and related assertions, execution history, monitors, monitor checks, incidents, and notifications. This action cannot be undone.
      </p>
      <form onSubmit={(event) => { event.preventDefault(); if (!busy && matches && acceptCascade) onConfirm(typedName); }} className="mt-5 space-y-4">
        <div>
          <label htmlFor="delete-request-name" className="mb-2 block text-sm">Type this exact request name:</label>
          <p className="mb-2 wrap-break-word rounded-lg border border-line bg-surface p-3 text-sm font-semibold">{request.name}</p>
          <input id="delete-request-name" autoFocus autoComplete="off" spellCheck={false} maxLength={150} disabled={busy}
            className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-brand"
            value={typedName} onChange={(event) => setTypedName(event.target.value)} placeholder="Exact request name" />
        </div>
        <label className="flex cursor-pointer items-start gap-3 text-sm leading-6">
          <input type="checkbox" className="mt-1 accent-red-500" checked={acceptCascade} onChange={(event) => setAcceptCascade(event.target.checked)} disabled={busy} />
          <span>I understand that all related data will be permanently deleted (cascade delete).</span>
        </label>
        {error && <p role="alert" className="rounded-lg border border-down/40 bg-down/10 p-3 text-sm text-down">{error.message || "Delete failed."}</p>}
        <div className="flex justify-end gap-3">
          <button type="button" disabled={busy} onClick={onClose} className="rounded-lg border border-line px-4 py-2 text-sm hover:bg-panel-hover disabled:opacity-50">Cancel</button>
          <button type="submit" disabled={busy || !matches || !acceptCascade}
            className="rounded-lg bg-down px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50">
            {busy ? "Deleting..." : "Permanently Delete"}
          </button>
        </div>
      </form>
    </dialog>
  );
}
