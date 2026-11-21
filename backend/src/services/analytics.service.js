import { prisma } from '../lib/prisma.js';
import { analyticsWindow, percent, roundedOrNull, fillTimeBuckets, summarizeMonitorGroups } from '../lib/analyticsRules.js';

// Restrict *every* query to the authenticated user's workspaces.
const ownedMonitor = userId => ({
  request: { is: { project: { is: { workspace: { is: { ownerId: userId } } } } } },
});
const ownedCheck = userId => ({ monitor: { is: ownedMonitor(userId) } });
const ownedIncident = userId => ({ monitor: { is: ownedMonitor(userId) } });

export async function analyticsOverview(userId, range, db = prisma, now = new Date()) {
  const window = analyticsWindow(range, now);
  const windowChecks = { ...ownedCheck(userId), checkedAt: { gte: window.from, lte: window.to } };
  const windowIncidents = { ...ownedIncident(userId), startedAt: { gte: window.from, lte: window.to } };

  const [groups, checkAggregate, passed, openIncidents, newIncidents, resolvedInWindow] = await Promise.all([
    db.monitor.groupBy({ by: ['isEnabled', 'status'], where: ownedMonitor(userId), _count: { _all: true } }),
    db.monitorCheck.aggregate({ where: windowChecks, _count: { _all: true }, _avg: { responseTimeMs: true } }),
    db.monitorCheck.count({ where: { ...windowChecks, isSuccess: true } }),
    db.incident.count({ where: { ...ownedIncident(userId), status: 'OPEN' } }),
    db.incident.count({ where: windowIncidents }),
    db.incident.count({ where: { ...ownedIncident(userId), resolvedAt: { gte: window.from, lte: window.to } } }),
  ]);
  const totalChecks = Number(checkAggregate._count._all);
  const passedChecks = Number(passed);
  return {
    range: window.range, from: window.from.toISOString(), to: window.to.toISOString(),
    monitors: summarizeMonitorGroups(groups),
    incidents: { open: openIncidents, openedInRange: newIncidents, resolvedInRange: resolvedInWindow },
    checks: {
      total: totalChecks, passed: passedChecks, failed: totalChecks - passedChecks,
      successRatePercent: percent(passedChecks, totalChecks),
      averageResponseTimeMs: roundedOrNull(checkAggregate._avg.responseTimeMs),
    },
    // Explicit semantics prevent a sampled success rate being mislabeled as a time-weighted SLA.
    metricNote: 'successRatePercent is the percentage of successful MonitorChecks in the selected window, not a time-weighted uptime SLA.',
  };
}

export async function analyticsTrends(userId, range, db = prisma, now = new Date()) {
  const window = analyticsWindow(range, now);
  const { from, to, bucketSeconds } = window;
  // Parameterized tagged SQL. UUID owner filter is applied in SQL, not after aggregation.
  // Every interval is fixed by server-side enum validation, never user SQL input.
  const [checks, incidents] = await Promise.all([
    db.$queryRaw`
      SELECT
        to_timestamp(floor(extract(epoch from mc.checked_at) / ${bucketSeconds}) * ${bucketSeconds}) AS bucket,
        count(*)::int AS "totalChecks",
        count(*) FILTER (WHERE mc.is_success = true)::int AS "passedChecks",
        round(avg(mc.response_time_ms))::int AS "averageResponseTimeMs"
      FROM monitor_checks mc
      JOIN monitors m ON m.id = mc.monitor_id
      JOIN api_requests ar ON ar.id = m.request_id
      JOIN projects p ON p.id = ar.project_id
      JOIN workspaces w ON w.id = p.workspace_id
      WHERE w.owner_id = ${userId}::uuid AND mc.checked_at >= ${from} AND mc.checked_at <= ${to}
      GROUP BY 1 ORDER BY 1
    `,
    db.$queryRaw`
      SELECT bucket, sum(opened)::int AS "openedIncidents", sum(resolved)::int AS "resolvedIncidents"
      FROM (
        SELECT to_timestamp(floor(extract(epoch from i.started_at) / ${bucketSeconds}) * ${bucketSeconds}) AS bucket,
               count(*)::int AS opened, 0::int AS resolved
        FROM incidents i
        JOIN monitors m ON m.id = i.monitor_id
        JOIN api_requests ar ON ar.id = m.request_id
        JOIN projects p ON p.id = ar.project_id
        JOIN workspaces w ON w.id = p.workspace_id
        WHERE w.owner_id = ${userId}::uuid AND i.started_at >= ${from} AND i.started_at <= ${to}
        GROUP BY 1
        UNION ALL
        SELECT to_timestamp(floor(extract(epoch from i.resolved_at) / ${bucketSeconds}) * ${bucketSeconds}) AS bucket,
               0::int AS opened, count(*)::int AS resolved
        FROM incidents i
        JOIN monitors m ON m.id = i.monitor_id
        JOIN api_requests ar ON ar.id = m.request_id
        JOIN projects p ON p.id = ar.project_id
        JOIN workspaces w ON w.id = p.workspace_id
        WHERE w.owner_id = ${userId}::uuid AND i.resolved_at >= ${from} AND i.resolved_at <= ${to}
        GROUP BY 1
      ) events GROUP BY bucket ORDER BY bucket
    `,
  ]);
  return {
    range: window.range, from: from.toISOString(), to: to.toISOString(),
    bucketSeconds,
    points: fillTimeBuckets(window, checks, incidents),
    metricNote: 'Empty time buckets have null successRatePercent and null latency. Failed checks and errors may have null latency.',
  };
}

export async function analyticsRecentIncidents(userId, range, limit, db = prisma, now = new Date()) {
  const window = analyticsWindow(range, now);
  const items = await db.incident.findMany({
    where: { ...ownedIncident(userId), startedAt: { gte: window.from, lte: window.to } },
    orderBy: [{ startedAt: 'desc' }, { id: 'desc' }],
    take: limit,
    select: {
      id: true, monitorId: true, status: true, reason: true, startedAt: true, resolvedAt: true,
      monitor: { select: { id: true, name: true, status: true } },
    },
  });
  return { range: window.range, from: window.from.toISOString(), to: window.to.toISOString(), items };
}
