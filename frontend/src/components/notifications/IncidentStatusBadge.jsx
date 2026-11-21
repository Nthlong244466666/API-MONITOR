export default function IncidentStatusBadge({ status }) {
  const isOpen = status === "OPEN";
  return <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${isOpen ? "border-down/40 bg-down/10 text-down" : "border-up/40 bg-up/10 text-up"}`}>
    {status === "OPEN" ? "OPEN" : status === "RESOLVED" ? "RESOLVED" : status || "UNKNOWN"}
  </span>;
}
