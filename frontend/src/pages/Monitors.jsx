import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import { Plus, RefreshCw } from "lucide-react";
import PageHeader from "../components/layout/PageHeader";
import { useAuth } from "../contexts/AuthContext";
import { createMonitorApi, monitorDetailPath } from "../services/monitorApi";
import MonitorForm from "../components/monitors/MonitorForm";
import MonitorStatusBadge from "../components/monitors/MonitorStatusBadge";

const button = "inline-flex items-center gap-2 rounded-lg border border-line px-3 py-2 text-sm text-ink hover:bg-panel-hover disabled:opacity-50";
function localTime(value) { return value ? new Date(value).toLocaleString("vi-VN") : "—"; }

export default function Monitors() {
  const { apiFetch } = useAuth();
  const api = useMemo(() => createMonitorApi(apiFetch), [apiFetch]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [filter, setFilter] = useState("ALL");
  const [search, setSearch] = useState("");
  const [revision, setRevision] = useState(0);
  const refresh = useCallback(() => setRevision((v) => v + 1), []);

  useEffect(() => {
    let active = true;
    setLoading(true); setError("");
    api.list().then((data) => { if (active) setItems(Array.isArray(data) ? data : []); })
      .catch((e) => { if (active) setError(e?.message ?? "Không tải được Monitors."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [api, revision]);

  useEffect(() => {
    const id = setInterval(refresh, 30_000);
    return () => clearInterval(id);
  }, [refresh]);

  const counts = { UP: 0, DOWN: 0, UNKNOWN: 0, DISABLED: 0 };
  for (const m of items) { if (!m.isEnabled) counts.DISABLED++; else counts[m.status] = (counts[m.status] ?? 0) + 1; }
  const shown = items.filter((m) => {
    const state = m.isEnabled ? m.status : "DISABLED";
    const q = search.trim().toLowerCase();
    return (filter === "ALL" || state === filter) && (!q || `${m.name} ${m.request?.name ?? ""}`.toLowerCase().includes(q));
  });

  async function create(payload) {
    const created = await api.create(payload);
    setFormOpen(false); setNotice(`Đã tạo Monitor: ${created.name}`); refresh();
  }

  return <>
    <PageHeader title="Monitors" />
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h2 className="text-lg font-semibold text-ink">Giám sát API tự động</h2><p className="text-sm text-muted">Scheduler tự kiểm tra API theo lịch khi Backend đang hoạt động.</p></div>
        <div className="flex gap-2">
          <button type="button" className={button} onClick={refresh} disabled={loading}><RefreshCw size={16}/> Làm mới</button>
          <button type="button" className="inline-flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white" onClick={() => setFormOpen(true)}><Plus size={16}/> Tạo Monitor</button>
        </div>
      </div>
      {error && <p role="alert" className="rounded-lg border border-down/40 bg-down/10 p-3 text-sm text-down">{error}</p>}
      {notice && <p role="status" className="rounded-lg border border-up/40 bg-up/10 p-3 text-sm text-up">{notice}</p>}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[["UP", counts.UP, "text-up"], ["DOWN", counts.DOWN, "text-down"], ["UNKNOWN", counts.UNKNOWN, "text-muted"], ["DISABLED", counts.DISABLED, "text-muted"]].map(([label, value, color]) =>
          <div key={label} className="rounded-xl border border-line bg-panel p-4"><p className="text-xs text-muted">{label}</p><p className={`mt-2 text-2xl font-bold ${color}`}>{value}</p></div>)}
      </div>
      <div className="flex flex-wrap gap-3">
        <input aria-label="Tìm Monitor" className="min-w-[190px] flex-1 rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink outline-none" placeholder="Tìm Monitor hoặc Request..." value={search} onChange={(e) => setSearch(e.target.value)}/>
        <select aria-label="Lọc trạng thái" className="rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink" value={filter} onChange={(e) => setFilter(e.target.value)}>
          {[["ALL","Tất cả"],["UP","UP"],["DOWN","DOWN"],["UNKNOWN","UNKNOWN"],["DISABLED","Đã tắt"]].map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
      </div>
      {loading ? <p role="status" className="rounded-xl border border-line p-7 text-sm text-muted">Đang tải danh sách Monitor...</p>
      : shown.length === 0 ? <p className="rounded-xl border border-dashed border-line p-8 text-center text-sm text-muted">{items.length ? "Không có Monitor phù hợp bộ lọc." : "Chưa có Monitor nào. Nhấn Tạo Monitor để bắt đầu."}</p>
      : <div className="overflow-x-auto rounded-xl border border-line">
        <table className="w-full min-w-[740px] text-left text-sm">
          <thead className="bg-panel text-xs text-muted"><tr><th className="px-4 py-3">Monitor</th><th className="px-4 py-3">Trạng thái</th><th className="px-4 py-3">Chu kỳ</th><th className="px-4 py-3">Kiểm tra kế tiếp</th><th className="px-4 py-3 text-right">Chi tiết</th></tr></thead>
          <tbody>{shown.map((m) => <tr key={m.id} className="border-t border-line hover:bg-panel-hover">
            <td className="px-4 py-3"><p className="font-semibold text-ink">{m.name}</p><p className="text-xs text-muted">{m.request?.method ?? ""} · {m.request?.name ?? "Request"}</p></td>
            <td className="px-4 py-3"><MonitorStatusBadge status={m.status} enabled={m.isEnabled}/></td>
            <td className="px-4 py-3 text-muted">{m.intervalSeconds} giây</td>
            <td className="px-4 py-3 whitespace-nowrap text-muted">{localTime(m.nextCheckAt)}</td>
            <td className="px-4 py-3 text-right"><Link className="font-semibold text-brand hover:underline" to={monitorDetailPath(m.id)}>Xem chi tiết</Link></td>
          </tr>)}</tbody>
        </table>
      </div>}
      <p className="text-xs text-muted">Trang tự tải lại mỗi 30 giây. UP/DOWN dựa trên ngưỡng cấu hình; bộ đếm này không phải SLA uptime.</p>
    </div>
    {formOpen && <MonitorForm apiFetch={apiFetch} onClose={() => setFormOpen(false)} onSave={create}/>}
  </>;
}
