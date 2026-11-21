import { prisma } from '../lib/prisma.js';
import { HttpError } from '../utils/HttpError.js';

const ownerScope = (userId) => ({
  monitor: { is: { request: { is: { project: { is: { workspace: { is: { ownerId: userId } } } } } } } },
});
const safeSelect = {
  id: true, monitorId: true, status: true, reason: true,
  startedAt: true, resolvedAt: true,
  monitor: { select: { id: true, name: true, status: true, isEnabled: true } },
};
const notFound = () => new HttpError(404, 'INCIDENT_NOT_FOUND', 'Incident not found');

export async function listIncidents(userId, { status, monitorId, limit, cursor }) {
  const where = { ...ownerScope(userId), ...(status ? { status } : {}), ...(monitorId ? { monitorId } : {}) };
  if (cursor) {
    const allowed = await prisma.incident.findFirst({ where: { id: cursor, ...where }, select: { id: true } });
    if (!allowed) throw new HttpError(400, 'INVALID_CURSOR', 'Cursor is not valid for this incident list');
  }
  const rows = await prisma.incident.findMany({
    where,
    orderBy: [{ startedAt: 'desc' }, { id: 'desc' }],
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    take: limit + 1,
    select: safeSelect,
  });
  const items = rows.slice(0, limit);
  const hasMore = rows.length > limit;
  return { items, hasMore, nextCursor: hasMore ? items.at(-1)?.id ?? null : null };
}

export async function getIncident(userId, incidentId) {
  const record = await prisma.incident.findFirst({ where: { id: incidentId, ...ownerScope(userId) }, select: safeSelect });
  if (!record) throw notFound();
  return record;
}
