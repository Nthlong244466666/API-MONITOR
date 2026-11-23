import * as webPushModule from 'web-push';
const webpush = webPushModule.default ?? webPushModule;
import { prisma } from '../lib/prisma.js';
import { isPermanentPushError, pushPayload, retryDelayMs } from '../lib/pushRules.js';

let running = false;
let workerTimer = null;
function configure() {
  const { VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT } = process.env;
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY || !VAPID_SUBJECT) return false;
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
  return true;
}
export async function drainPushDeliveries() {
  if (running) return;
  running = true;
  try {
    const now = new Date();
    // Recover tasks abandoned by a killed process. Multi-instance duplication
    // after the remote service accepted a push is theoretically possible.
    await prisma.pushDelivery.updateMany({
      where: { status: 'PROCESSING', lockedAt: { lt: new Date(now.getTime() - 120_000) } },
      data: { status: 'PENDING', lockedAt: null },
    });
    const deliveries = await prisma.pushDelivery.findMany({
      where: { status: 'PENDING', nextAttemptAt: { lte: now } },
      orderBy: { createdAt: 'asc' }, take: 30,
      select: { id: true },
    });
    for (const row of deliveries) {
      const acquired = await prisma.pushDelivery.updateMany({
        where: { id: row.id, status: 'PENDING', nextAttemptAt: { lte: new Date() } },
        data: { status: 'PROCESSING', lockedAt: new Date() },
      });
      if (!acquired.count) continue;
      const task = await prisma.pushDelivery.findUnique({
        where: { id: row.id },
        include: { subscription: true, notification: { select: { id: true, incidentId: true, type: true } } },
      });
      if (!task) continue;
      const attempt = task.attempts + 1;
      try {
        await webpush.sendNotification({
          endpoint: task.subscription.endpoint,
          keys: { p256dh: task.subscription.p256dh, auth: task.subscription.auth },
        }, JSON.stringify(pushPayload(task.notification)), { TTL: 3600, urgency: 'high', timeout: 15000 });
        await prisma.pushDelivery.update({ where: { id: task.id }, data: { status: 'SENT', attempts: attempt, lockedAt: null, lastError: null } });
      } catch (error) {
        const status = Number(error?.statusCode || 0);
        if ([404, 410].includes(status)) {
          // Delete invalid endpoint and all queued jobs tied to it.
          await prisma.pushSubscription.deleteMany({ where: { id: task.subscriptionId } });
          continue;
        }
        const terminal = isPermanentPushError(status) || attempt >= 4;
        await prisma.pushDelivery.update({
          where: { id: task.id },
          data: {
            status: terminal ? 'FAILED' : 'PENDING', attempts: attempt, lockedAt: null,
            nextAttemptAt: new Date(Date.now() + retryDelayMs(attempt)),
            lastError: status ? `PUSH_HTTP_${status}` : 'PUSH_NETWORK_ERROR',
          },
        });
      }
    }
  } catch (error) {
    console.error('[PUSH WORKER]', error?.message ?? error);
  } finally { running = false; }
}
export function startPushDeliveryWorker() {
  if (workerTimer || !configure()) {
    if (!workerTimer) console.warn('[PUSH] Disabled: missing VAPID environment variables');
    return;
  }
  workerTimer = setInterval(() => void drainPushDeliveries(), 10_000);
  workerTimer.unref?.();
  void drainPushDeliveries();
}
