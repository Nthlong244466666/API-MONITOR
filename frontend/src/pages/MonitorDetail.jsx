import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { ArrowLeft, RefreshCw, Pencil, Trash2 } from "lucide-react";
import PageHeader from "../components/layout/PageHeader";
import { useAuth } from "../contexts/AuthContext";
import { createMonitorApi } from "../services/monitorApi";
import MonitorStatusBadge from "../components/monitors/MonitorStatusBadge";
import MonitorForm from "../components/monitors/MonitorForm";
import MonitorChecks from "../components/monitors/MonitorChecks";

const button = "inline-flex items-center gap-2 rounded-lg border border-line px-3 py-2 text-sm text-ink hover:bg-panel-hover disabled:opacity-50";
const stamp = (v) => v ? new Date(v).toLocaleString("vi-VN") : "—";

export default function MonitorDetail() {
  const { monitorId } = useParams();
  const navigate = useNavigate();
  const { apiFetch } = useAuth();
  const api = useMemo(() => createMonitorApi(apiFetch), [apiFetch]);
  const [monitor, setMonitor] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [editing, setEditing] = useState(false);
  const [revision, setRevision] = useState(0);
  const refresh = useCallback(() => setRevision((n) => n + 1), []);

  useEffect(() => {
    let active = true;
    setLoading(true); setError("");
    Promise.all([api.get(monitorId), api.stats(monitorId)]).then(([m, s]) => {
      if (!active) return;
      setMonitor(m); setStats(s);
    }).catch((e) => { if (active) setError(e?.message ?? "Không tải được thông tin Monitor."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [api, monitorId, revision]);

  useEffect(() => {
    const id = setInterval(refresh, 30_000);
    return () => clearInterval(id);
  }, [refresh]);

  async function save(payload) {
    const updated = await api.update(monitorId, payload);
    setMonitor(updated); setEditing(false); setNotice("Đã lưu cấu hình Monitor."); refresh();
  }
  async function toggle() {
    if (!monitor || busy) return;
    setBusy(true); setError(""); setNotice("");
    try {
      const updated = await api.update(monitorId, { isEnabled: !monitor.isEnabled });
      setMonitor(updated); setNotice(updated.isEnabled ? "Đã bật Monitor." : "Đã tắt Monitor."); refresh();
    } catch (e) { setError(e?.message ?? "Không đổi được trạng thái."); }
    finally { setBusy(false); }
  }
  async function remove() {
    if (!monitor || busy) return;
    const name = window.prompt(`Nhập chính xác tên Monitor để xác nhận xóa:\n${monitor.name}`);
    if (name === null) return;
    if (name !== monitor.name) { setError("Tên xác nhận không khớp. Monitor chưa bị xóa."); return; }
    if (!window.confirm("Xóa vĩnh viễn Monitor cùng toàn bộ MonitorCheck liên quan? Thao tác không thể hoàn tác.")) return;
    setBusy(true); setError("");
    try { await api.remove(monitorId); navigate("/monitors", { replace: true }); }
    catch (e) { setError(e?.message ?? "Không xóa được Monitor."); }
    finally { setBusy(false); }
  }

  return <>
    <PageHeader title="Monitor Detail" />
    <div className="space-y-5">
      <Link to="/monitors" className="inline-flex items-center gap-2 text-sm text-muted hover:text-brand"><ArrowLeft size={16}/> Danh sách Monitors</Link>
      {error && <p role="alert" className="rounded-lg border border-down/40 bg-down/10 p-3 text-sm text-down">{error}</p>}
      {notice && <p role="status" className="rounded-lg border border-up/40 bg-up/10 p-3 text-sm text-up">{notice}</p>}
      {loading && !monitor && <p className="text-sm text-muted">Đang tải Monitor...</p>}
      {monitor && <>
        <section className="space-y-4 rounded-xl border border-line bg-panel p-4 sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div><h2 className="text-xl font-bold text-ink">{monitor.name}</h2><p className="mt-1 text-sm text-muted">{monitor.request?.method} · {monitor.request?.name ?? "Request"}</p></div>
            <MonitorStatusBadge status={monitor.status} enabled={monitor.isEnabled}/>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm md:grid-cols-4">
            <div><p className="text-xs text-muted">Chu kỳ</p><p className="mt-1 font-semibold">{monitor.intervalSeconds} giây</p></div>
            <div><p className="text-xs text-muted">Timeout</p><p className="mt-1 font-semibold">{monitor.timeoutMs} ms</p></div>
            <div><p className="text-xs text-muted">Lỗi liên tiếp</p><p className="mt-1 font-semibold">{monitor.consecutiveFailures} / {monitor.failureThreshold}</p></div>
            <div><p className="text-xs text-muted">Thành công liên tiếp</p><p className="mt-1 font-semibold">{monitor.consecutiveSuccesses} / {monitor.recoveryThreshold}</p></div>
          </div>
          <p className="text-xs text-muted">Lần kiểm tra dự kiến: {stamp(monitor.nextCheckAt)} · Cập nhật: {stamp(monitor.updatedAt)}</p>
          <div className="flex flex-wrap gap-2 border-t border-line pt-4">
            <button type="button" className={button} disabled={busy || loading} onClick={refresh}><RefreshCw size={15}/> Làm mới</button>
            <button type="button" className={button} disabled={busy} onClick={() => setEditing(true)}><Pencil size={15}/> Sửa</button>
            <button type="button" className={button} disabled={busy} onClick={toggle}>{busy ? "Đang xử lý..." : monitor.isEnabled ? "Tắt giám sát" : "Bật giám sát"}</button>
            <button type="button" className="inline-flex items-center gap-2 rounded-lg border border-down/40 px-3 py-2 text-sm text-down hover:bg-down/10 disabled:opacity-50" disabled={busy} onClick={remove}><Trash2 size={15}/> Xóa Monitor</button>
          </div>
        </section>
        <section className="space-y-3 rounded-xl border border-line bg-panel p-4 sm:p-5">
          <h2 className="font-semibold text-ink">Thống kê lượt kiểm tra</h2>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {[["Tổng lượt", stats?.totalChecks ?? "—"], ["PASS", stats?.passedChecks ?? "—"], ["FAIL", stats?.failedChecks ?? "—"], ["Tỷ lệ PASS", stats?.successRatePercent == null ? "—" : `${stats.successRatePercent}%`]].map(([label, value]) =>
              <div key={label} className="rounded-lg bg-surface p-3"><p className="text-xs text-muted">{label}</p><p className="mt-1 text-xl font-bold text-ink">{value}</p></div>)}
          </div>
          <p className="text-sm text-muted">Thời gian đáp ứng trung bình: <span className="font-semibold text-ink">{stats?.averageResponseTimeMs == null ? "—" : `${stats.averageResponseTimeMs} ms`}</span></p>
          <p className="text-xs text-muted">Tỷ lệ PASS được tính theo số lượt check; không phải uptime SLA tính theo thời gian.</p>
        </section>
        <MonitorChecks key={monitorId} api={api} monitorId={monitorId}/>
      </>}
    </div>
    {editing && monitor && <MonitorForm key={monitor.id} apiFetch={apiFetch} initial={monitor} onClose={() => setEditing(false)} onSave={save}/>}
  </>;
}
