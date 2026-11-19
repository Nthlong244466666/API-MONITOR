import { useEffect, useId, useRef, useState } from "react";
import { X } from "lucide-react";

const methods = ["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"];
const inputClass = "w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink outline-none placeholder:text-muted focus:border-brand disabled:opacity-50";

function validUrl(value) {
  try {
    const parsed = new URL(value);
    return ["http:", "https:"].includes(parsed.protocol) && Boolean(parsed.hostname) && !parsed.username && !parsed.password;
  } catch { return false; }
}

// Mount this component only when the form should be open.
export default function RequestForm({ initialRequest, busy, error, onClose, onSave }) {
  const dialogRef = useRef(null);
  const headingId = useId();
  const [name, setName] = useState(initialRequest?.name ?? "");
  const [method, setMethod] = useState(initialRequest?.method ?? "GET");
  const [url, setUrl] = useState(initialRequest?.url ?? "");
  const [clearQuery, setClearQuery] = useState(false);
  const original = {
    name: initialRequest?.name ?? "",
    method: initialRequest?.method ?? "GET",
    url: initialRequest?.url ?? "",
  };
  const dirty = name !== original.name || method !== original.method || url !== original.url || clearQuery;
  const valid = name.trim().length >= 2 && name.trim().length <= 150 && url.trim().length <= 2048 && validUrl(url.trim());

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
    return () => { if (dialog?.open) dialog.close(); };
  }, []);

  function tryClose() {
    if (busy) return;
    if (dirty && !window.confirm("Discard your unsaved changes?")) return;
    onClose();
  }

  return (
    <dialog ref={dialogRef} aria-labelledby={headingId} onCancel={(event) => { event.preventDefault(); tryClose(); }}
      className="m-auto w-[calc(100%-2rem)] max-w-xl rounded-xl border border-line bg-panel p-6 text-ink shadow-2xl backdrop:bg-black/75">
      <div className="mb-5 flex items-start justify-between gap-3">
        <h2 id={headingId} className="text-lg font-semibold">{initialRequest ? "Edit API Request" : "New API Request"}</h2>
        <button type="button" onClick={tryClose} disabled={busy} aria-label="Close form" className="text-muted hover:text-ink disabled:opacity-50"><X size={20} /></button>
      </div>
      <form onSubmit={(event) => {
        event.preventDefault();
        if (!busy && valid) onSave({ name: name.trim(), method, url: url.trim(), ...(clearQuery ? { clearQuery: true } : {}) });
      }} className="space-y-4">
        <div>
          <label htmlFor="request-form-name" className="mb-2 block text-sm">Name *</label>
          <input id="request-form-name" autoFocus className={inputClass} value={name} onChange={(event) => setName(event.target.value)}
            required minLength={2} maxLength={150} disabled={busy} placeholder="Get Users" />
        </div>
        <div>
          <label htmlFor="request-form-method" className="mb-2 block text-sm">HTTP Method *</label>
          <select id="request-form-method" className={inputClass} value={method} onChange={(event) => setMethod(event.target.value)} disabled={busy}>
            {methods.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="request-form-url" className="mb-2 block text-sm">URL *</label>
          <input id="request-form-url" type="url" className={inputClass} value={url} onChange={(event) => setUrl(event.target.value)}
            required maxLength={2048} disabled={busy} placeholder="https://api.example.com/users" />
          <p className="mt-1 text-xs text-muted">Absolute HTTP(S) URL. Embedded username/password are not allowed.</p>
          {initialRequest?.hasQuery && (
            <div className="mt-2 rounded-lg border border-line p-3 text-xs text-muted">
              Query parameters are hidden to protect secrets. Saving name/method will keep them.
              <label className="mt-2 flex items-center gap-2">
                <input type="checkbox" checked={clearQuery} onChange={(event) => setClearQuery(event.target.checked)} disabled={busy} />
                Remove hidden query parameters from this Request
              </label>
            </div>
          )}
        </div>
        {error && <p role="alert" className="rounded-lg border border-down/40 bg-down/10 p-3 text-sm text-down">{error.message || "Save failed."}</p>}
        <div className="flex justify-end gap-3 border-t border-line pt-4">
          <button type="button" onClick={tryClose} disabled={busy} className="rounded-lg border border-line px-4 py-2 text-sm hover:bg-panel-hover disabled:opacity-50">Cancel</button>
          <button type="submit" disabled={busy || !valid} className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-hover disabled:opacity-50">
            {busy ? "Saving..." : (initialRequest ? "Save Changes" : "Create Request")}
          </button>
        </div>
      </form>
    </dialog>
  );
}
