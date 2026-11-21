import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import { RefreshCw, AlertTriangle } from "lucide-react";
import PageHeader from "../components/layout/PageHeader";
import { useAuth } from "../contexts/AuthContext";
import { createIncidentApi, incidentDetailPath } from "../services/incidentApi";
import IncidentStatusBadge from "../components/notifications/IncidentStatusBadge";

const stamp = (v) => v ? new Date(v).toLocaleString("vi-VN") : "—";
const control = "rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-brand";
export default function Incidents() {
  const { apiFetch } = useAuth();
  const api = useMemo(() => createIncidentApi(apiFetch), [apiFetch]);
  const [status, setStatus] = useState("ALL");
  const [monitorId, setMonitorId] = useState("");
  const [draftMonitorId, setDraftMonitorId] = useState("");
  const [pages, setPages] = useState([""]);
  const [revision, setRevision] = useState(0);
  const [result, setResult] = useState({ items: [], hasMore: false, nextCursor: null });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const refresh = useCallback(() => setRevision((v) => v + 1), []);
  const cursor = pages.at(-1);
  useEffect(() => {
    let active = true;
    setLoading(true); setError("");
    api.list({ status, monitorId, cursor, limit: 20 })
      .then((data) => { if (active) setResult({ items: data?.items ?? [], hasMore: Boolean(data?.hasMore), nextCursor: data?.nextCursor ?? null }); })
      .catch((e) => { if (active) { setError(e?.message ?? "Không tải được Incidents."); setResult({ items: [], hasMore: false, nextCursor: null }); } })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [api, status, monitorId, cursor, revision]);
  useEffect(() => {
    const timer = setInterval(() => { if (!document.hidden) refresh(); }, 30_000);
    return () => clearInterval(timer);
  }, [refresh]);
  function changeStatus(value) { setStatus(value); setPages([""]); }
  function applyMonitor(e) { e.preventDefault(); setMonitorId(draftMonitorId.trim()); setPages([""]); }
  const openCount = result.items.filter((x) => x.status === "OPEN").length;
  return <>
    <PageHeader title="Incidents" />
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h2 className="flex items-center gap-2 text-lg font-semibold text-ink"><AlertTriangle size={20} className="text-down"/> Sự cố API</h2><p className="mt-1 text-sm text-muted">Sự cố tự mở khi Monitor DOWN và tự đóng khi UP.</p></div>
        <button className={control} type="button" onClick={refresh} disabled={loading}><RefreshCw size={15} className="mr-2 inline"/> Làm mới</button>
      </div>
      {error && <p role="alert" className="rounded-lg border border-down/40 bg-down/10 p-3 text-sm text-down">{error}</p>}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-line bg-panel p-4"><p className="text-xs text-muted">Incident trên trang này</p><p className="mt-1 text-2xl font-bold text-ink">{result.items.length}</p></div>
        <div className="rounded-xl border border-line bg-panel p-4"><p className="text-xs text-muted">OPEN trên trang này</p><p className="mt-1 text-2xl font-bold text-down">{openCount}</p></div>
      </div>
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-xs text-muted">Trạng thái
          <select className={control} value={status} onChange={(e) => changeStatus(e.target.value)}>
            <option value="ALL">Tất cả</option><option value="OPEN">OPEN</option><option value="RESOLVED">RESOLVED</option>
          </select>
        </label>
        <form onSubmit={applyMonitor} className="flex min-w-0 flex-1 flex-wrap items-end gap-2">
          <label className="flex min-w-[180px] flex-1 flex-col gap-1 text-xs text-muted">Monitor ID (tùy chọn)
            <input className={control} value={draftMonitorId} onChange={(e) => setDraftMonitorId(e.target.value)} placeholder="UUID của Monitor"/>
          </label>
          <button className={control} type="submit">Áp dụng</button>
        </form>
      </div>
      {loading ? <p role="status" className="p-5 text-sm text-muted">Đang tải Incidents...</p> : result.items.length === 0 ?
        <p className="rounded-xl border border-dashed border-line p-8 text-center text-sm text-muted">Chưa có sự cố phù hợp.</p> :
        <div className="overflow-x-auto rounded-xl border border-line"><table className="w-full min-w-[710px] text-left text-sm">
          <thead className="bg-panel text-xs text-muted"><tr><th className="px-4 py-3">Monitor</th><th className="px-4 py-3">Trạng thái</th><th className="px-4 py-3">Bắt đầu</th><th className="px-4 py-3">Phục hồi</th><th className="px-4 py-3">Chi tiết</th></tr></thead>
          <tbody>{result.items.map((item) => <tr key={item.id} className="border-t border-line hover:bg-panel-hover">
            <td className="px-4 py-3"><p className="font-medium text-ink">{item.monitor?.name ?? "Monitor"}</p><p className="text-xs text-muted">{item.reason ?? "—"}</p></td>
            <td className="px-4 py-3"><IncidentStatusBadge status={item.status}/></td>
            <td className="whitespace-nowrap px-4 py-3 text-muted">{stamp(item.startedAt)}</td>
            <td className="whitespace-nowrap px-4 py-3 text-muted">{stamp(item.resolvedAt)}</td>
            <td className="px-4 py-3"><Link className="font-semibold text-brand hover:underline" to={incidentDetailPath(item.id)}>Xem</Link></td>
          </tr>)}</tbody>
        </table></div>}
      <div className="flex items-center justify-between gap-3"><p className="text-xs text-muted">Trang {pages.length} · Bộ đếm chỉ tính trang hiện tại · Tự làm mới mỗi 30 giây</p>
        <div className="flex gap-2"><button type="button" className={control} disabled={loading || pages.length < 2} onClick={() => setPages((x) => x.slice(0, -1))}>Trước</button>
          <button type="button" className={control} disabled={loading || !result.hasMore || !result.nextCursor} onClick={() => setPages((x) => [...x, result.nextCursor])}>Tiếp</button></div>
      </div>
    </div>
  </>;
}
