import { prisma } from '../lib/prisma.js';
import { HttpError } from '../utils/HttpError.js';

const safeSelect = {
  id: true, incidentId: true, type: true, message: true,
  isRead: true, createdAt: true,
  incident: { select: { status: true, monitorId: true } },
};

export async function listNotifications(userId, { isRead, limit, cursor }) {
  const where = { userId, ...(isRead === undefined ? {} : { isRead }) };
  if (cursor) {
    const allowed = await prisma.notification.findFirst({ where: { id: cursor, ...where }, select: { id: true } });
    if (!allowed) throw new HttpError(400, 'INVALID_CURSOR', 'Cursor is not valid for this notification list');
  }
  const rows = await prisma.notification.findMany({
    where,
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    take: limit + 1,
    select: safeSelect,
  });
  const items = rows.slice(0, limit);
  const hasMore = rows.length > limit;
  return { items, hasMore, nextCursor: hasMore ? items.at(-1)?.id ?? null : null };
}

export async function unreadNotificationCount(userId) {
  const count = await prisma.notification.count({ where: { userId, isRead: false } });
  return { count };
}

export async function markNotificationRead(userId, notificationId) {
  const result = await prisma.notification.updateMany({ where: { id: notificationId, userId }, data: { isRead: true } });
  if (!result.count) {
    // Distinguish already-read from missing while preserving user isolation.
    const found = await prisma.notification.findFirst({ where: { id: notificationId, userId }, select: { id: true } });
    if (!found) throw new HttpError(404, 'NOTIFICATION_NOT_FOUND', 'Notification not found');
  }
  return prisma.notification.findFirst({ where: { id: notificationId, userId }, select: safeSelect });
}

export async function markAllNotificationsRead(userId) {
  const changed = await prisma.notification.updateMany({ where: { userId, isRead: false }, data: { isRead: true } });
  return { updated: changed.count };
}
