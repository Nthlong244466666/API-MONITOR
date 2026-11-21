import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router";
import { ArrowLeft, RefreshCw } from "lucide-react";
import PageHeader from "../components/layout/PageHeader";
import { useAuth } from "../contexts/AuthContext";
import { createIncidentApi } from "../services/incidentApi";
import IncidentStatusBadge from "../components/notifications/IncidentStatusBadge";
const stamp = (v) => v ? new Date(v).toLocaleString("vi-VN") : "—";
export default function IncidentDetail() {
  const { incidentId } = useParams();
  const { apiFetch } = useAuth();
  const api = useMemo(() => createIncidentApi(apiFetch), [apiFetch]);
  const [item, setItem] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [revision, setRevision] = useState(0);
  const refresh = useCallback(() => setRevision((x) => x + 1), []);
  useEffect(() => {
    let active = true;
    setLoading(true); setError("");
    api.get(incidentId).then((data) => { if (active) setItem(data); })
      .catch((e) => { if (active) { setItem(null); setError(e?.message ?? "Không tải được Incident."); } })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [api, incidentId, revision]);
  useEffect(() => { const t = setInterval(() => { if (!document.hidden) refresh(); }, 30_000); return () => clearInterval(t); }, [refresh]);
  const duration = item?.resolvedAt && item?.startedAt ? Math.max(0, Math.round((new Date(item.resolvedAt) - new Date(item.startedAt)) / 1000)) : null;
  return <>
    <PageHeader title="Incident Detail" />
    <div className="space-y-5">
      <Link to="/incidents" className="inline-flex items-center gap-2 text-sm text-muted hover:text-brand"><ArrowLeft size={16}/> Quay lại Incidents</Link>
      {error && <p role="alert" className="rounded-lg border border-down/40 bg-down/10 p-3 text-sm text-down">{error}</p>}
      {loading && !item && <p className="text-sm text-muted">Đang tải Incident...</p>}
      {item && <section className="space-y-5 rounded-xl border border-line bg-panel p-5">
        <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-xl font-bold text-ink">{item.monitor?.name ?? "Monitor"}</h2><p className="mt-1 text-xs text-muted">Incident ID: {item.id}</p></div><IncidentStatusBadge status={item.status}/></div>
        <div className="grid gap-4 text-sm sm:grid-cols-2">
          <div><p className="text-xs text-muted">Nguyên nhân ghi nhận</p><p className="mt-1 font-semibold text-ink">{item.reason ?? "—"}</p></div>
          <div><p className="text-xs text-muted">Monitor hiện tại</p><p className="mt-1 font-semibold text-ink">{item.monitor?.status ?? "—"}</p></div>
          <div><p className="text-xs text-muted">Bắt đầu</p><p className="mt-1 text-ink">{stamp(item.startedAt)}</p></div>
          <div><p className="text-xs text-muted">Phục hồi</p><p className="mt-1 text-ink">{stamp(item.resolvedAt)}</p></div>
          <div><p className="text-xs text-muted">Thời gian sự cố (nếu đã đóng)</p><p className="mt-1 text-ink">{duration === null ? "Đang diễn ra" : `${duration} giây`}</p></div>
          <div><p className="text-xs text-muted">Monitor ID</p><p className="mt-1 break-all text-ink">{item.monitorId}</p></div>
        </div>
        <div className="flex flex-wrap gap-2 border-t border-line pt-4"><Link to={`/monitors/${encodeURIComponent(item.monitorId)}`} className="rounded-lg border border-line px-3 py-2 text-sm text-brand hover:bg-panel-hover">Xem Monitor</Link><button type="button" onClick={refresh} disabled={loading} className="inline-flex items-center gap-2 rounded-lg border border-line px-3 py-2 text-sm text-ink hover:bg-panel-hover disabled:opacity-50"><RefreshCw size={15}/> Làm mới</button></div>
      </section>}
    </div>
  </>;
}
