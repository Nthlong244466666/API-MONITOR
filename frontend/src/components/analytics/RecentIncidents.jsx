import { Link } from "react-router";
import Card from "../ui/Card";
import { formatDateTime, formatDuration } from "../../services/analyticsFormat";

export default function RecentIncidents({ incidents = [], loading = false }) {
  return <Card>
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><h2 className="text-lg font-semibold text-ink">Recent Incidents</h2><p className="mt-1 text-xs text-muted">Sự cố bắt đầu trong khoảng thời gian đang chọn</p></div>
      <Link to="/incidents" className="text-sm font-medium text-brand hover:underline">Xem tất cả</Link>
    </div>
    {loading ? <p role="status" className="mt-5 text-sm text-muted">Đang tải sự cố...</p> : incidents.length === 0 ?
      <p className="mt-5 rounded-lg border border-dashed border-line p-6 text-center text-sm text-muted">Chưa có sự cố trong khoảng thời gian này.</p> :
      <div className="mt-4 overflow-x-auto"><table className="w-full min-w-[630px] text-left text-sm">
        <thead className="text-xs text-muted"><tr className="border-b border-line"><th className="px-2 py-3">Monitor</th><th className="px-2 py-3">Trạng thái</th><th className="px-2 py-3">Bắt đầu</th><th className="px-2 py-3">Thời lượng</th><th className="px-2 py-3">Chi tiết</th></tr></thead>
        <tbody>{incidents.map((item) => <tr key={item.id} className="border-b border-line last:border-0">
          <td className="px-2 py-3"><span className="font-medium text-ink">{item.monitor?.name ?? "Monitor"}</span><p className="max-w-[250px] truncate text-xs text-muted" title={item.reason ?? ""}>{item.reason ?? "—"}</p></td>
          <td className="px-2 py-3"><span className={item.status === "OPEN" ? "text-down" : "text-up"}>{item.status}</span></td>
          <td className="whitespace-nowrap px-2 py-3 text-muted">{formatDateTime(item.startedAt)}</td>
          <td className="whitespace-nowrap px-2 py-3 text-muted">{formatDuration(item.startedAt, item.resolvedAt)}</td>
          <td className="px-2 py-3"><Link className="text-brand hover:underline" to={`/incidents/${encodeURIComponent(item.id)}`}>Xem</Link></td>
        </tr>)}</tbody>
      </table></div>}
  </Card>;
}
