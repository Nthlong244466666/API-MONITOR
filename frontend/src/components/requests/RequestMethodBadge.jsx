const styles = {
  GET: "border-up/40 bg-up/10 text-up",
  POST: "border-brand/40 bg-brand/10 text-brand",
  PUT: "border-amber-500/40 bg-amber-500/10 text-amber-400",
  PATCH: "border-amber-500/40 bg-amber-500/10 text-amber-400",
  DELETE: "border-down/40 bg-down/10 text-down",
  HEAD: "border-line bg-panel text-muted",
  OPTIONS: "border-line bg-panel text-muted",
};

export default function RequestMethodBadge({ method }) {
  return (
    <span className={`inline-block rounded-md border px-2 py-1 text-xs font-bold ${styles[method] ?? styles.OPTIONS}`}>
      {method}
    </span>
  );
}
