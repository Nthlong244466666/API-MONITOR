import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import { RefreshCw } from "lucide-react";
import PageHeader from "../components/layout/PageHeader";
import Card from "../components/ui/Card";
import BackendStatus from "../components/ui/BackendStatus";
import MetricCard from "../components/analytics/MetricCard";
import TimeSeriesChart from "../components/analytics/TimeSeriesChart";
import RecentIncidents from "../components/analytics/RecentIncidents";
import { useAuth } from "../contexts/AuthContext";
import { createAnalyticsApi } from "../services/analyticsApi";
import { formatInteger, formatPercent, formatMs, formatDateTime, parseDashboardData } from "../services/analyticsFormat";

const ranges = [{ value: "24h", label: "24 giờ" }, { value: "7d", label: "7 ngày" }, { value: "30d", label: "30 ngày" }];
const buttonStyle = "rounded-lg border border-line px-3 py-2 text-sm text-ink transition hover:bg-panel-hover focus-visible:outline-2 focus-visible:outline-brand disabled:opacity-50";

export default function Dashboard() {
  const { apiFetch } = useAuth();
  const api = useMemo(() => createAnalyticsApi(apiFetch), [apiFetch]);
  const [range, setRange] = useState("7d");
  const [revision, setRevision] = useState(0);
  const [state, setState] = useState({ loading: true, error: "", data: null, fetchedAt: null });
  const refresh = useCallback(() => setRevision((v) => v + 1), []);

  useEffect(() => {
    let active = true;
    // Clear stale period data on range change / refresh; never display old metrics under new date filters.
    setState({ loading: true, error: "", data: null, fetchedAt: null });
    Promise.all([api.overview(range), api.trends(range), api.recentIncidents(range, 5)])
      .then(([overview, trends, recent]) => {
        if (!active) return;
        const data = parseDashboardData(overview, trends, recent);
        setState({ loading: false, error: "", data, fetchedAt: new Date().toISOString() });
      })
      .catch((error) => {
        if (active) setState({ loading: false, error: error?.message || "Không tải được Dashboard Analytics.", data: null, fetchedAt: null });
      });
    return () => { active = false; };
  }, [api, range, revision]);

  useEffect(() => {
    const timer = setInterval(() => { if (!document.hidden) refresh(); }, 60_000);
    return () => clearInterval(timer);
  }, [refresh]);

  const overview = state.data?.overview;
  const points = state.data?.trends.points ?? [];
  const monitors = overview?.monitors;
  const checks = overview?.checks;
  const incidents = overview?.incidents;
  const cards = [
    { label: "Total Monitors", value: formatInteger(monitors?.total), color: "text-ink", detail: monitors ? `${formatInteger(monitors.enabled)} đang bật · ${formatInteger(monitors.disabled)} đã tắt` : "Tổng số Monitor hiện tại" },
    { label: "APIs Up", value: formatInteger(monitors?.up), color: "text-up", detail: "Monitor đang bật với trạng thái UP" },
    { label: "APIs Down", value: formatInteger(monitors?.down), color: "text-down", detail: "Monitor đang bật với trạng thái DOWN" },
    { label: "Active Incidents", value: formatInteger(incidents?.open), color: "text-warning", detail: "Incident OPEN hiện tại" },
    { label: "Check Success Rate", value: formatPercent(checks?.successRatePercent), color: "text-ink", detail: "Tỷ lệ lượt kiểm tra thành công; không phải SLA uptime" },
    { label: "Average Latency", value: formatMs(checks?.averageResponseTimeMs), color: "text-ink", detail: "Trung bình responseTimeMs của các check có latency" },
    { label: "Total Checks", value: formatInteger(checks?.total), color: "text-ink", detail: checks ? `${formatInteger(checks.passed)} PASS · ${formatInteger(checks.failed)} FAIL` : "Trong khoảng thời gian đã chọn" },
    { label: "Incidents in Range", value: formatInteger(incidents?.openedInRange), color: "text-warning", detail: incidents ? `${formatInteger(incidents.resolvedInRange)} được giải quyết trong khoảng này` : "Sự cố mới trong khoảng thời gian" },
  ];

  return <>
    <PageHeader title="Dashboard" />
    <div className="space-y-6">
      <Card className="p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div><h2 className="text-sm font-semibold text-ink">Development Environment</h2><div className="mt-3"><BackendStatus /></div></div>
          <div className="flex flex-wrap items-end gap-2">
            <label className="flex flex-col gap-1 text-xs text-muted" htmlFor="dashboard-range">Thời gian thống kê
              <select id="dashboard-range" value={range} onChange={(e) => setRange(e.target.value)} className="rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink focus:outline-brand">
                {ranges.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </label>
            <button type="button" className={buttonStyle} onClick={refresh} disabled={state.loading} aria-label="Làm mới Dashboard"><RefreshCw size={16} className={state.loading ? "animate-spin" : ""} aria-hidden="true" /></button>
          </div>
        </div>
        <p className="mt-3 text-xs text-muted">{state.loading ? "Đang tải số liệu..." : state.fetchedAt ? `Cập nhật: ${formatDateTime(state.fetchedAt)} · Tự làm mới mỗi 60 giây` : "Chưa có lần cập nhật thành công"}</p>
      </Card>

      {state.error && <div role="alert" className="rounded-xl border border-down/40 bg-down/10 p-4 text-sm text-down"><p className="font-semibold">Không tải được Analytics</p><p className="mt-1">{state.error}</p><p className="mt-2">Kiểm tra Backend v2.2 đã cài đặt và đăng nhập còn hiệu lực, rồi nhấn Làm mới.</p><button type="button" className={`${buttonStyle} mt-3`} onClick={refresh}>Thử lại</button></div>}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-live="polite">
        {cards.map((card) => <MetricCard key={card.label} {...card} loading={state.loading} />)}
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <TimeSeriesChart title="Check Success Rate" description="% MonitorChecks thành công theo từng khoảng. Điểm trống = không có lượt kiểm tra, không phải 0%." points={points} range={range} series={[{ key: "successRatePercent", label: "Successful checks" }]} percent />
        <TimeSeriesChart title="Average Response Time" description="Response time trung bình mỗi khoảng; chỉ tính những check có responseTimeMs." points={points} range={range} series={[{ key: "averageResponseTimeMs", label: "Latency (ms)" }]} />
        <TimeSeriesChart title="Monitor Check Volume" description="Số lần kiểm tra thành công/thất bại theo khoảng thời gian." points={points} range={range} series={[{ key: "passedChecks", label: "PASS" }, { key: "failedChecks", label: "FAIL" }]} integer />
        <TimeSeriesChart title="Incident Trend" description="Số Incident mở mới và được giải quyết theo thời gian." points={points} range={range} series={[{ key: "openedIncidents", label: "Opened" }, { key: "resolvedIncidents", label: "Resolved" }]} integer />
      </div>

      <RecentIncidents incidents={state.data?.recent.items ?? []} loading={state.loading} />
      <div className="flex flex-wrap justify-between gap-3 text-xs text-muted"><p>Khoảng 24h chia theo giờ · 7d chia theo 6 giờ · 30d chia theo ngày (UTC buckets).</p><div className="flex gap-4"><Link to="/monitors" className="text-brand hover:underline">Quản lý Monitors</Link><Link to="/incidents" className="text-brand hover:underline">Xem Incidents</Link></div></div>
    </div>
  </>;
}
