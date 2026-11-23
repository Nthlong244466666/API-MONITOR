import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import { Bell, CheckCheck, RefreshCw } from "lucide-react";
import PageHeader from "../components/layout/PageHeader";
import PushSettings from "../components/push/PushSettings";
import { useAuth } from "../contexts/AuthContext";
import { createNotificationApi } from "../services/notificationApi";
import { incidentDetailPath } from "../services/incidentApi";

const control = "rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink hover:bg-panel-hover disabled:opacity-50";
const stamp = (v) => v ? new Date(v).toLocaleString("vi-VN") : "—";
export default function Notifications() {
  const { apiFetch } = useAuth();
  const api = useMemo(() => createNotificationApi(apiFetch), [apiFetch]);
  const [filter, setFilter] = useState("ALL");
  const [pages, setPages] = useState([""]);
  const [revision, setRevision] = useState(0);
  const [result, setResult] = useState({ items: [], hasMore: false, nextCursor: null });
  const [unread, setUnread] = useState(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const refresh = useCallback(() => setRevision((n) => n + 1), []);
  const cursor = pages.at(-1);
  useEffect(() => {
    let active = true;
    setLoading(true); setError("");
    Promise.all([api.list({ isRead: filter, cursor, limit: 20 }), api.unreadCount()])
      .then(([data, count]) => { if (active) {
        setResult({ items: data?.items ?? [], hasMore: Boolean(data?.hasMore), nextCursor: data?.nextCursor ?? null });
        setUnread(Number(count?.count) || 0);
      } })
      .catch((e) => { if (active) { setError(e?.message ?? "Không tải được thông báo."); setResult({ items: [], hasMore: false, nextCursor: null }); } })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [api, filter, cursor, revision]);
  useEffect(() => {
    const timer = setInterval(() => { if (!document.hidden) refresh(); }, 30_000);
    return () => clearInterval(timer);
  }, [refresh]);
  async function markOne(notificationId) {
    if (busy) return;
    setBusy(true); setError(""); setNotice("");
    try { await api.markRead(notificationId); setNotice("Đã đánh dấu thông báo là đã đọc."); window.dispatchEvent(new Event("api-monitor:notifications-changed")); refresh(); }
    catch (e) { setError(e?.message ?? "Không thể đánh dấu đã đọc."); }
    finally { setBusy(false); }
  }
  async function markAll() {
    if (busy || unread === 0) return;
    setBusy(true); setError(""); setNotice("");
    try { const data = await api.markAllRead(); setNotice(`Đã đánh dấu ${data?.updated ?? 0} thông báo là đã đọc.`); setPages([""]); window.dispatchEvent(new Event("api-monitor:notifications-changed")); refresh(); }
    catch (e) { setError(e?.message ?? "Không thể đánh dấu tất cả."); }
    finally { setBusy(false); }
  }
  return <>
    <PageHeader title="Notifications" />
    <div className="space-y-5">
      <PushSettings />
      <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="flex items-center gap-2 text-lg font-semibold text-ink"><Bell size={20} className="text-brand"/> Trung tâm thông báo</h2><p className="mt-1 text-sm text-muted">Theo dõi sự cố OPENED và RESOLVED.</p></div>
        <div className="flex flex-wrap gap-2"><button type="button" className={control} disabled={loading} onClick={refresh}><RefreshCw size={15} className="mr-1 inline"/> Làm mới</button><button type="button" className={control} disabled={busy || loading || !unread} onClick={markAll}><CheckCheck size={15} className="mr-1 inline"/> Đọc tất cả</button></div>
      </div>
      {error && <p role="alert" className="rounded-lg border border-down/40 bg-down/10 p-3 text-sm text-down">{error}</p>}
      {notice && <p role="status" className="rounded-lg border border-up/40 bg-up/10 p-3 text-sm text-up">{notice}</p>}
      <div className="rounded-xl border border-line bg-panel p-4"><p className="text-xs text-muted">Chưa đọc</p><p className="mt-1 text-2xl font-bold text-brand">{unread ?? "—"}</p></div>
      <label className="inline-flex flex-col gap-1 text-xs text-muted">Lọc trạng thái đọc
        <select className={control} value={filter} onChange={(e) => { setFilter(e.target.value); setPages([""]); }}><option value="ALL">Tất cả</option><option value="false">Chưa đọc</option><option value="true">Đã đọc</option></select>
      </label>
      {loading ? <p role="status" className="p-5 text-sm text-muted">Đang tải thông báo...</p> : result.items.length === 0 ?
        <p className="rounded-xl border border-dashed border-line p-8 text-center text-sm text-muted">Không có thông báo phù hợp.</p> :
        <div className="space-y-3">{result.items.map((item) => <article key={item.id} className={`rounded-xl border p-4 ${item.isRead ? "border-line bg-panel" : "border-brand/40 bg-brand/5"}`}>
          <div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${item.type === "OPENED" ? "bg-down/10 text-down" : "bg-up/10 text-up"}`}>{item.type}</span>{!item.isRead && <span className="text-xs font-semibold text-brand">Chưa đọc</span>}</div><p className="mt-2 break-words text-sm text-ink">{item.message}</p><p className="mt-1 text-xs text-muted">{stamp(item.createdAt)} · Incident: {item.incident?.status ?? "—"}</p></div>
            <div className="flex flex-wrap gap-2"><Link to={incidentDetailPath(item.incidentId)} className={control}>Xem Incident</Link>{!item.isRead && <button type="button" className={control} disabled={busy} onClick={() => void markOne(item.id)}>Đã đọc</button>}</div>
          </div>
        </article>)}</div>}
      <div className="flex items-center justify-between gap-3"><p className="text-xs text-muted">Trang {pages.length} · Tự cập nhật mỗi 30 giây</p><div className="flex gap-2"><button type="button" className={control} disabled={loading || pages.length < 2} onClick={() => setPages((p) => p.slice(0, -1))}>Trước</button><button type="button" className={control} disabled={loading || !result.hasMore || !result.nextCursor} onClick={() => setPages((p) => [...p, result.nextCursor])}>Tiếp</button></div></div>
    </div>
  </>;
}
