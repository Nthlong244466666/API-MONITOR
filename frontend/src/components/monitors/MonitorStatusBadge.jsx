export default function MonitorStatusBadge({ status, enabled = true }) {
  const color = !enabled ? "border-line bg-surface text-muted" : status === "UP"
    ? "border-up/40 bg-up/10 text-up" : status === "DOWN"
      ? "border-down/40 bg-down/10 text-down" : "border-line bg-surface text-muted";
  return <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${color}`}>
    {!enabled ? "DISABLED" : (status || "UNKNOWN")}
  </span>;
}
