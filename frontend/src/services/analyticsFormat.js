// Formatting and parsing helpers contain no React dependencies; covered by unit tests.
export function finiteNumber(value) {
  if (value === null || value === undefined || value === "") return null;
  const result = Number(value);
  return Number.isFinite(result) ? result : null;
}
export function formatInteger(value) {
  const n = finiteNumber(value);
  return n === null ? "—" : new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 0 }).format(n);
}
export function formatPercent(value) {
  const n = finiteNumber(value);
  return n === null ? "—" : `${new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 2 }).format(n)}%`;
}
export function formatMs(value) {
  const n = finiteNumber(value);
  return n === null ? "—" : `${formatInteger(n)} ms`;
}
export function formatDateTime(value) {
  if (!value) return "—";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleString("vi-VN");
}
export function formatDuration(start, end) {
  if (!start || !end) return "Đang diễn ra";
  const ms = new Date(end).getTime() - new Date(start).getTime();
  if (!Number.isFinite(ms) || ms < 0) return "—";
  const minutes = Math.floor(ms / 60000);
  if (minutes < 1) return "< 1 phút";
  if (minutes < 60) return `${minutes} phút`;
  const hours = Math.floor(minutes / 60);
  return `${hours} giờ ${minutes % 60} phút`;
}
export function bucketLabel(timestamp, range) {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return "—";
  if (range === "24h") return date.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
  if (range === "7d") return date.toLocaleString("vi-VN", { day: "2-digit", month: "2-digit", hour: "2-digit" });
  return date.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" });
}
export function parseDashboardData(overview, trends, recent) {
  if (!overview || !overview.monitors || !overview.incidents || !overview.checks ||
      !trends || !Array.isArray(trends.points) || !recent || !Array.isArray(recent.items)) {
    throw new Error("Analytics API trả về dữ liệu không đúng định dạng.");
  }
  return { overview, trends, recent };
}
