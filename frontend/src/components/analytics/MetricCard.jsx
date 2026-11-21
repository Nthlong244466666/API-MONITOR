import Card from "../ui/Card";

export default function MetricCard({ label, value, color = "text-ink", detail, loading = false }) {
  return (
    <Card className="min-w-0 p-4 sm:p-5">
      <p className="text-xs font-medium text-muted">{label}</p>
      <p className={`mt-2 truncate text-2xl font-bold tabular-nums sm:text-3xl ${color}`}>
        {loading ? <span className="inline-block h-8 w-20 animate-pulse rounded bg-line" aria-label="Đang tải" /> : value}
      </p>
      {detail && <p className="mt-2 text-xs leading-relaxed text-muted">{detail}</p>}
    </Card>
  );
}
