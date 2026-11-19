
export default function StatCard({
  label,
  value,
  color = "text-ink",
}) {
  return (
    <dl className="rounded-card border border-line bg-panel p-5 shadow-card">
      <dt className="text-sm text-muted">
        {label}
      </dt>

      <dd className={`mt-4 text-3xl font-semibold ${color}`}>
        {value}
      </dd>
    </dl>
  );
}
