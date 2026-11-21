// Pure analytics rules. Aggregates are sampled-check metrics, NOT time-weighted SLA uptime.
export const ANALYTICS_RANGES = Object.freeze({
  '24h': Object.freeze({ durationMs: 24 * 3600000, bucketSeconds: 3600 }),
  '7d': Object.freeze({ durationMs: 7 * 86400000, bucketSeconds: 6 * 3600 }),
  '30d': Object.freeze({ durationMs: 30 * 86400000, bucketSeconds: 86400 }),
});

export function analyticsWindow(range, now = new Date()) {
  const setting = ANALYTICS_RANGES[range];
  if (!setting || !Number.isFinite(now.getTime())) throw new TypeError('Invalid analytics window');
  return {
    range,
    from: new Date(now.getTime() - setting.durationMs),
    to: new Date(now.getTime()),
    bucketSeconds: setting.bucketSeconds,
  };
}

export function percent(numerator, denominator) {
  if (!denominator) return null;
  return Math.round((numerator / denominator) * 10000) / 100;
}

export function roundedOrNull(value) {
  if (value === null || value === undefined) return null;
  return Math.round(Number(value));
}

// PostgreSQL returns only buckets with events; supply zero-event buckets for chart continuity.
// A bucket without checks has successRatePercent=null, NOT 0% availability.
export function fillTimeBuckets(window, checks = [], incidents = []) {
  const step = window.bucketSeconds * 1000;
  const start = Math.floor(window.from.getTime() / step) * step;
  const end = Math.floor(window.to.getTime() / step) * step;
  const checkMap = new Map(checks.map(row => [new Date(row.bucket).getTime(), row]));
  const incidentMap = new Map(incidents.map(row => [new Date(row.bucket).getTime(), row]));
  const points = [];
  for (let ts = start; ts <= end; ts += step) {
    const c = checkMap.get(ts);
    const inc = incidentMap.get(ts);
    const totalChecks = Number(c?.totalChecks ?? 0);
    const passedChecks = Number(c?.passedChecks ?? 0);
    points.push({
      timestamp: new Date(ts).toISOString(),
      totalChecks,
      passedChecks,
      failedChecks: totalChecks - passedChecks,
      successRatePercent: percent(passedChecks, totalChecks),
      averageResponseTimeMs: roundedOrNull(c?.averageResponseTimeMs),
      openedIncidents: Number(inc?.openedIncidents ?? 0),
      resolvedIncidents: Number(inc?.resolvedIncidents ?? 0),
    });
  }
  return points;
}

export function summarizeMonitorGroups(groups) {
  const result = { total: 0, enabled: 0, disabled: 0, up: 0, down: 0, unknown: 0 };
  for (const row of groups) {
    const n = Number(row._count?._all ?? 0);
    result.total += n;
    if (!row.isEnabled) { result.disabled += n; continue; }
    result.enabled += n;
    if (row.status === 'UP') result.up += n;
    else if (row.status === 'DOWN') result.down += n;
    else result.unknown += n;
  }
  return result;
}
