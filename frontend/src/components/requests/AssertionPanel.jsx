import { useCallback, useEffect, useState } from "react";
import { Pencil, Plus, RefreshCw, Trash2, X } from "lucide-react";

const fieldClass = "w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-brand disabled:opacity-50";
const actionClass = "inline-flex items-center justify-center gap-2 rounded-lg border border-line px-3 py-2 text-sm text-ink hover:bg-panel-hover disabled:opacity-50";

const emptyForm = () => ({ type: "STATUS", operator: "EQ", expectedText: "200", target: "", isEnabled: true });

import { assertionPayload } from "./assertionPayload";

function editForm(item) {
  return {
    type: item.type, operator: item.operator,
    target: item.target ?? "", isEnabled: item.isEnabled,
    expectedText: item.expectedValue == null ? "" : JSON.stringify(item.expectedValue),
  };
}

function AssertionForm({ initial, busy, onCancel, onSubmit }) {
  const [form, setForm] = useState(() => initial ? editForm(initial) : emptyForm());
  const [error, setError] = useState("");
  const change = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));
  const changeType = (value) => setForm((prev) => ({
    ...prev, type: value, operator: value === "LATENCY" ? "LTE" : value === "JSON" ? "EXISTS" : "EQ",
    expectedText: value === "STATUS" ? "200" : value === "LATENCY" ? "1000" : "",
    target: value === "JSON" ? prev.target : "",
  }));
  async function submit(event) {
    event.preventDefault();
    setError("");
    try { await onSubmit(assertionPayload(form)); }
    catch (err) { setError(err?.message ?? "Không thể lưu assertion."); }
  }
  return (
    <form onSubmit={submit} className="space-y-3 rounded-lg border border-line bg-surface p-4" aria-label={initial ? "Sửa assertion" : "Tạo assertion"}>
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-semibold text-ink">{initial ? "Sửa điều kiện kiểm thử" : "Thêm điều kiện kiểm thử"}</h3>
        <button type="button" onClick={onCancel} disabled={busy} className="text-muted hover:text-ink" aria-label="Đóng form"><X size={17}/></button>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="space-y-1 text-sm text-muted">Loại assertion
          <select className={fieldClass} disabled={busy} value={form.type} onChange={(e) => changeType(e.target.value)}>
            <option value="STATUS">HTTP Status</option><option value="LATENCY">Response Time (ms)</option><option value="JSON">JSON Path</option>
          </select>
        </label>
        <label className="space-y-1 text-sm text-muted">Toán tử
          <select className={fieldClass} disabled={busy} value={form.operator} onChange={(e) => change("operator", e.target.value)}>
            {(form.type === "STATUS" ? ["EQ"] : form.type === "LATENCY" ? ["LT", "LTE"] : ["EXISTS", "EQ"]).map((op) => <option key={op} value={op}>{op}</option>)}
          </select>
        </label>
      </div>
      {form.type === "JSON" && <label className="block space-y-1 text-sm text-muted">JSON Path (ví dụ: data.id)
        <input className={fieldClass} maxLength={256} value={form.target} disabled={busy} onChange={(e) => change("target", e.target.value)} placeholder="data.id" required />
      </label>}
      {(form.type !== "JSON" || form.operator === "EQ") && <label className="block space-y-1 text-sm text-muted">
        {form.type === "STATUS" ? "HTTP Status kỳ vọng (100–599)" : form.type === "LATENCY" ? "Ngưỡng thời gian (1–120000 ms)" : 'Giá trị JSON kỳ vọng (ví dụ: true, 123, "hello")'}
        <input className={fieldClass} value={form.expectedText} disabled={busy} onChange={(e) => change("expectedText", e.target.value)} required />
      </label>}
      <label className="flex items-center gap-2 text-sm text-ink"><input type="checkbox" checked={form.isEnabled} disabled={busy} onChange={(e) => change("isEnabled", e.target.checked)}/> Bật điều kiện</label>
      <p className="text-xs text-muted">Không nhập API key hoặc mật khẩu vào Expected Value / JSON Path: Backend chưa mã hóa các trường assertion.</p>
      {error && <p role="alert" className="rounded-lg border border-down/40 bg-down/10 p-3 text-sm text-down">{error}</p>}
      <div className="flex justify-end gap-2"><button type="button" className={actionClass} disabled={busy} onClick={onCancel}>Hủy</button>
        <button type="submit" disabled={busy} className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-hover disabled:opacity-50">{busy ? "Đang lưu..." : initial ? "Lưu thay đổi" : "Tạo assertion"}</button>
      </div>
    </form>
  );
}

export default function AssertionPanel({ api, workspaceId, projectId, requestId, onChanged }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [editing, setEditing] = useState(null);
  const [creating, setCreating] = useState(false);
  const [revision, setRevision] = useState(0);
  const refresh = useCallback(() => setRevision((n) => n + 1), []);

  useEffect(() => {
    let live = true;
    setLoading(true); setError("");
    api.listAssertions(workspaceId, projectId, requestId)
      .then((result) => { if (live) setItems(result); })
      .catch((err) => { if (live) setError(err?.message ?? "Không thể tải Assertions."); })
      .finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, [api, workspaceId, projectId, requestId, revision]);

  async function perform(action, success) {
    if (busy) return;
    setBusy(true); setError(""); setMessage("");
    try {
      await action(); setEditing(null); setCreating(false); setMessage(success); refresh(); onChanged?.();
    } catch (err) { setError(err?.message ?? "Thao tác thất bại."); throw err; }
    finally { setBusy(false); }
  }
  async function save(payload) {
    await perform(() => editing
      ? api.updateAssertion(workspaceId, projectId, requestId, editing.id, payload)
      : api.createAssertion(workspaceId, projectId, requestId, payload),
    editing ? "Đã cập nhật assertion." : "Đã tạo assertion.");
  }
  async function toggle(item) {
    try { await perform(() => api.updateAssertion(workspaceId, projectId, requestId, item.id, { isEnabled: !item.isEnabled }), "Đã cập nhật trạng thái assertion."); }
    catch { /* error displayed above */ }
  }
  async function remove(item) {
    if (!window.confirm(`Xóa assertion ${item.type} ${item.operator}${item.target ? ` ${item.target}` : ""}?`)) return;
    try { await perform(() => api.deleteAssertion(workspaceId, projectId, requestId, item.id), "Đã xóa assertion."); }
    catch { /* error displayed above */ }
  }

  return <section className="space-y-4" aria-label="Quản lý Assertions">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div><h2 className="font-semibold text-ink">Assertions ({items.length}/50)</h2><p className="text-xs text-muted">Các điều kiện đang bật được đánh giá khi bấm Send.</p></div>
      <div className="flex gap-2">
        <button type="button" onClick={refresh} disabled={busy || loading} className={actionClass}><RefreshCw size={15}/> Tải lại</button>
        <button type="button" onClick={() => { setCreating(true); setEditing(null); setError(""); }} disabled={busy || items.length >= 50} className={actionClass}><Plus size={15}/> Thêm</button>
      </div>
    </div>
    {error && <p role="alert" className="rounded-lg border border-down/40 bg-down/10 p-3 text-sm text-down">{error}</p>}
    {message && <p role="status" className="text-sm text-up">{message}</p>}
    {(creating || editing) && <AssertionForm key={editing?.id ?? "create"} initial={editing} busy={busy} onCancel={() => { setCreating(false); setEditing(null); }} onSubmit={save}/>}
    {loading ? <p className="text-sm text-muted">Đang tải Assertions...</p> : items.length === 0 ? <p className="text-sm text-muted">Chưa có điều kiện nào. Bấm Thêm để tạo.</p> : <div className="space-y-2">
      {items.map((item) => <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-line p-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 text-sm"><span className="font-semibold text-ink">{item.type} {item.operator} {item.target ?? ""}</span><span className={item.isEnabled ? "text-up" : "text-muted"}>{item.isEnabled ? "Đang bật" : "Đã tắt"}</span></div>
          <p className="mt-1 break-all text-xs text-muted">{item.operator === "EXISTS" ? "Kiểm tra path tồn tại" : `Expected: ${JSON.stringify(item.expectedValue)}`}</p>
        </div>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1 text-xs text-muted"><input type="checkbox" checked={item.isEnabled} disabled={busy} onChange={() => toggle(item)}/> Bật</label>
          <button type="button" aria-label="Sửa assertion" title="Sửa" className={actionClass} disabled={busy} onClick={() => { setEditing(item); setCreating(false); setError(""); }}><Pencil size={15}/></button>
          <button type="button" aria-label="Xóa assertion" title="Xóa" className={actionClass} disabled={busy} onClick={() => remove(item)}><Trash2 size={15}/></button>
        </div>
      </div>)}
    </div>}
  </section>;
}
