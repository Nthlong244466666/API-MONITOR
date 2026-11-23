import { prisma } from '../lib/prisma.js';
import { HttpError } from '../utils/HttpError.js';

export function publicVapidKey() {
  const key = process.env.VAPID_PUBLIC_KEY;
  if (!key || !process.env.VAPID_PRIVATE_KEY || !process.env.VAPID_SUBJECT) {
    throw new HttpError(503, 'PUSH_NOT_CONFIGURED', 'Push notifications are not configured');
  }
  return { publicKey: key };
}
export async function subscribePush(userId, input) {
  publicVapidKey();
  // Endpoint is a browser-generated device identifier. Reassign it when a
  // different account logs in on the same browser; do not leave old owner bound.
  const existing = await prisma.pushSubscription.findUnique({ where: { endpoint: input.endpoint }, select: { id: true, userId: true } });
  const count = await prisma.pushSubscription.count({ where: { userId } });
  if (!existing && count >= 10) throw new HttpError(409, 'PUSH_DEVICE_LIMIT', 'Maximum 10 push devices per user');
  await prisma.$transaction(async tx => {
    const saved = await tx.pushSubscription.upsert({
      where: { endpoint: input.endpoint },
      create: { userId, ...input },
      update: { userId, p256dh: input.p256dh, auth: input.auth },
      select: { id: true },
    });
    // Prevent a different user on a shared browser from receiving queued
    // notifications created for the previous account.
    if (existing?.userId !== userId) await tx.pushDelivery.deleteMany({ where: { subscriptionId: saved.id } });
  });
  return { enabled: true };
}
export async function unsubscribePush(userId, endpoint) {
  const result = await prisma.pushSubscription.deleteMany({ where: { userId, endpoint } });
  return { removed: result.count > 0 };
}
