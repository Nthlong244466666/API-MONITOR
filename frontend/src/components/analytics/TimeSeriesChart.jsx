import { useMemo, useState } from "react";
import Card from "../ui/Card";
import { bucketLabel, finiteNumber, formatInteger, formatMs, formatPercent } from "../../services/analyticsFormat";

const W = 900, H = 244, L = 57, R = 18, T = 18, B = 40;
const palette = { successRatePercent: "#29b981", averageResponseTimeMs: "#8b8cf6", passedChecks: "#29b981", failedChecks: "#f87171", openedIncidents: "#f87171", resolvedIncidents: "#34d399" };
const valueText = (key, value) => key === "successRatePercent" ? formatPercent(value) : key === "averageResponseTimeMs" ? formatMs(value) : formatInteger(value);

export default function TimeSeriesChart({ title, description, points = [], range, series, percent = false, integer = false }) {
  const [selected, setSelected] = useState(null);
  const values = points.flatMap((p) => series.map((s) => finiteNumber(p[s.key])).filter((n) => n !== null));
  const hasData = series.some((s) => points.some((p) => finiteNumber(p[s.key]) !== null && (p.totalChecks > 0 || !["successRatePercent", "averageResponseTimeMs"].includes(s.key))));
  const topValue = percent ? 100 : integer ? Math.max(1, Math.ceil(Math.max(0, ...values))) : Math.max(1, Math.ceil(Math.max(0, ...values) * 1.1));
  const maxY = topValue;
  const yFor = (n) => T + (1 - n / maxY) * (H - T - B);
  const xFor = (i) => L + (points.length < 2 ? (W - L - R) / 2 : i * (W - L - R) / (points.length - 1));
  const paths = useMemo(() => series.map((s) => {
    const segments = [];
    let current = [];
    points.forEach((point, i) => {
      const value = finiteNumber(point[s.key]);
      const valid = value !== null && (!["successRatePercent", "averageResponseTimeMs"].includes(s.key) || Number(point.totalChecks) > 0);
      if (valid) current.push([xFor(i), yFor(value)]);
      else if (current.length) { segments.push(current); current = []; }
    });
    if (current.length) segments.push(current);
    return { key: s.key, label: s.label, segments, color: palette[s.key] ?? "#60a5fa" };
  }), [points, series, maxY]);
  const highlighted = selected !== null ? points[selected] : null;
  const indexes = points.length ? [0, Math.floor((points.length - 1) / 2), points.length - 1] : [];
  return (
    <Card className="min-w-0">
      <h2 className="text-base font-semibold text-ink">{title}</h2>
      <p className="mt-1 text-xs text-muted">{description}</p>
      {!hasData ? <div className="mt-5 flex h-48 items-center justify-center rounded-lg border border-dashed border-line px-4 text-center text-sm text-muted">Chưa có dữ liệu cho biểu đồ trong khoảng thời gian này.</div> : <>
        <div className="mt-4 flex flex-wrap gap-4" aria-label="Chú giải biểu đồ">{series.map((s) => <span key={s.key} className="flex items-center gap-2 text-xs text-muted"><span aria-hidden="true" className="inline-block size-2.5 rounded-full" style={{ backgroundColor: palette[s.key] ?? "#60a5fa" }}/>{s.label}</span>)}</div>
        <div className="mt-3 w-full overflow-hidden">
          <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${title}: biểu đồ xu hướng theo thời gian`} className="block w-full" preserveAspectRatio="xMidYMid meet">
            {Array.from({ length: 5 }, (_, i) => {
              const val = maxY * (4 - i) / 4;
              const y = yFor(val);
              return <g key={i}><line x1={L} y1={y} x2={W - R} y2={y} stroke="currentColor" opacity="0.12"/><text x={L-9} y={y+4} textAnchor="end" fontSize="12" fill="currentColor" opacity="0.65">{percent ? `${Math.round(val)}%` : integer ? Math.round(val) : formatInteger(val)}</text></g>;
            })}
            {indexes.map((i, j) => <text key={j} x={xFor(i)} y={H-12} textAnchor={j===0?"start":j===2?"end":"middle"} fontSize="12" fill="currentColor" opacity="0.65">{bucketLabel(points[i].timestamp, range)}</text>)}
            {paths.map((path) => path.segments.map((segment, i) => <g key={`${path.key}-${i}`}>
              {segment.length > 1 && <polyline fill="none" stroke={path.color} strokeWidth="2.8" strokeLinejoin="round" strokeLinecap="round" points={segment.map(([x,y])=>`${x},${y}`).join(" ")}/>}
              {segment.length === 1 && <circle cx={segment[0][0]} cy={segment[0][1]} r="3" fill={path.color}/>}
            </g>))}
            {selected !== null && <line x1={xFor(selected)} y1={T} x2={xFor(selected)} y2={H-B} stroke="currentColor" strokeDasharray="4 5" opacity="0.5"/>}
            {points.map((p, i) => <rect key={i} x={Math.max(L, xFor(i)-(W-L-R)/Math.max(1,points.length)/2)} y={T} width={(W-L-R)/Math.max(1,points.length)} height={H-T-B} fill="transparent" tabIndex={0} aria-label={`${bucketLabel(p.timestamp,range)}. ${series.map((s)=>`${s.label}: ${valueText(s.key,p[s.key])}`).join(', ')}`} onMouseEnter={() => setSelected(i)} onFocus={() => setSelected(i)} onMouseLeave={() => setSelected(null)} onBlur={() => setSelected(null)} />)}
          </svg>
        </div>
        {highlighted && <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 rounded-lg bg-surface p-3 text-xs text-muted" role="status"><span>{bucketLabel(highlighted.timestamp, range)}</span>{series.map((s) => <span key={s.key}>{s.label}: <strong className="text-ink">{valueText(s.key, highlighted[s.key])}</strong></span>)}</div>}
      </>}
    </Card>
  );
}
