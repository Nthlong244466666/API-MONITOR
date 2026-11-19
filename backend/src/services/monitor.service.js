import { prisma } from '../lib/prisma.js';
import { HttpError } from '../utils/HttpError.js';
import { MAX_MONITORS_PER_USER, nextDueTime } from '../lib/monitorRules.js';

const ownerScope = (userId) => ({ request: { is: { project: { is: { workspace: { is: { ownerId: userId } } } } } } });
const monitorSelect = {
  id: true, requestId: true, name: true, intervalSeconds: true, timeoutMs: true,
  failureThreshold: true, recoveryThreshold: true, isEnabled: true,
  status: true, consecutiveFailures: true, consecutiveSuccesses: true,
  nextCheckAt: true, createdAt: true, updatedAt: true,
  request: { select: { name: true, method: true, projectId: true } },
};
const notFound = () => new HttpError(404, 'MONITOR_NOT_FOUND', 'Monitor not found');

export async function listMonitors(userId) {
  return prisma.monitor.findMany({ where: ownerScope(userId), select: monitorSelect, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }] });
}
export async function getMonitor(userId, id) {
  const item = await prisma.monitor.findFirst({ where: { id, ...ownerScope(userId) }, select: monitorSelect });
  if (!item) throw notFound();
  return item;
}
export async function createMonitor(userId, data) {
  const ownedRequest = await prisma.apiRequest.findFirst({
    where: { id: data.requestId, project: { is: { workspace: { is: { ownerId: userId } } } } },
    select: { id: true },
  });
  if (!ownedRequest) throw new HttpError(404, 'REQUEST_NOT_FOUND', 'API request not found');
  const count = await prisma.monitor.count({ where: ownerScope(userId) });
  if (count >= MAX_MONITORS_PER_USER) throw new HttpError(409, 'MONITOR_LIMIT_REACHED', 'Monitor limit reached');
  if (data.timeoutMs >= data.intervalSeconds * 1000) {
    throw new HttpError(400, 'VALIDATION_ERROR', 'Timeout must be shorter than the monitoring interval');
  }
  try {
    return await prisma.monitor.create({
      data: { ...data, nextCheckAt: data.isEnabled ? new Date() : null },
      select: monitorSelect,
    });
  } catch (error) {
    if (error?.code === 'P2003') throw new HttpError(404, 'REQUEST_NOT_FOUND', 'API request not found');
    throw error;
  }
}
export async function updateMonitor(userId, id, patch) {
  const previous = await getMonitor(userId, id);
  const intervalSeconds = patch.intervalSeconds ?? previous.intervalSeconds;
  const timeoutMs = patch.timeoutMs ?? previous.timeoutMs;
  if (timeoutMs >= intervalSeconds * 1000) throw new HttpError(400, 'VALIDATION_ERROR', 'Timeout must be shorter than interval');
  const enabled = patch.isEnabled ?? previous.isEnabled;
  const reschedule = patch.isEnabled !== undefined || patch.intervalSeconds !== undefined;
  const data = {
    ...patch,
    ...(reschedule ? { nextCheckAt: enabled ? (previous.isEnabled ? nextDueTime(new Date(), intervalSeconds) : new Date()) : null } : {}),
    ...(patch.isEnabled === true && !previous.isEnabled ? {
      status: 'UNKNOWN', consecutiveFailures: 0, consecutiveSuccesses: 0,
    } : {}),
  };
  const changed = await prisma.monitor.updateMany({ where: { id, ...ownerScope(userId) }, data });
  if (changed.count !== 1) throw notFound();
  return getMonitor(userId, id);
}
export async function deleteMonitor(userId, id) {
  const changed = await prisma.monitor.deleteMany({ where: { id, ...ownerScope(userId) } });
  if (changed.count !== 1) throw notFound();
  return { id, deleted: true };
}
export async function listMonitorChecks(userId, id, { limit, cursor }) {
  await getMonitor(userId, id);
  if (cursor) {
    const exists = await prisma.monitorCheck.findFirst({ where: { id: cursor, monitorId: id }, select: { id: true } });
    if (!exists) throw new HttpError(400, 'INVALID_CURSOR', 'Cursor not found for this monitor');
  }
  const rows = await prisma.monitorCheck.findMany({
    where: { monitorId: id },
    orderBy: [{ checkedAt: 'desc' }, { id: 'desc' }],
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    take: limit + 1,
    select: { id: true, monitorId: true, statusCode: true, responseTimeMs: true, isSuccess: true, errorMessage: true, checkedAt: true },
  });
  const items = rows.slice(0, limit);
  const hasMore = rows.length > limit;
  return { items, hasMore, nextCursor: hasMore ? items.at(-1)?.id ?? null : null };
}
export async function monitorStats(userId, id) {
  await getMonitor(userId, id);
  const [total, passed, latency] = await Promise.all([
    prisma.monitorCheck.count({ where: { monitorId: id } }),
    prisma.monitorCheck.count({ where: { monitorId: id, isSuccess: true } }),
    prisma.monitorCheck.aggregate({ where: { monitorId: id, responseTimeMs: { not: null } }, _avg: { responseTimeMs: true } }),
  ]);
  // Check-based success rate, not a time-weighted uptime SLA.
  return { totalChecks: total, passedChecks: passed, failedChecks: total - passed,
    successRatePercent: total ? Math.round((passed / total) * 10000) / 100 : null,
    averageResponseTimeMs: latency._avg.responseTimeMs === null ? null : Math.round(latency._avg.responseTimeMs) };
}
