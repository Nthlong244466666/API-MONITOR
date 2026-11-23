import { isIP } from 'node:net';

// Web Push subscriptions are client-provided URLs. Never send server-side
// requests to arbitrary URLs: only browser push service hosts are allowed.
export function isTrustedPushEndpoint(value) {
  try {
    if (typeof value !== 'string' || value.length > 2048) return false;
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.port || url.username || url.password || url.hash || isIP(url.hostname)) return false;
    const host = url.hostname.toLowerCase();
    return [
      'fcm.googleapis.com', 'fcm-xm.googleapis.com',
      'updates.push.services.mozilla.com', 'push.services.mozilla.com',
      'web.push.apple.com',
    ].includes(host) || host.endsWith('.push.apple.com');
  } catch { return false; }
}
export const validPushKey = (s) => typeof s === 'string' && /^[A-Za-z0-9_-]{8,256}$/.test(s);
export const retryDelayMs = (attempt) => Math.min(15 * 60_000, 15_000 * 2 ** Math.min(attempt, 6));
export function isPermanentPushError(status) { return [400, 401, 403, 404, 410].includes(Number(status)); }
export function pushPayload(notification) {
  const event = notification.type === 'RESOLVED' ? 'RESOLVED' : 'OPENED';
  return {
    title: event === 'OPENED' ? 'API Monitor · Sự cố mới' : 'API Monitor · Đã phục hồi',
    body: event === 'OPENED' ? 'Một API đang gặp sự cố. Nhấn để xem Incident.' : 'API đã phục hồi. Nhấn để xem Incident.',
    url: `/incidents/${encodeURIComponent(notification.incidentId)}`,
    tag: `api-monitor-${notification.id}`, // stable event id per push delivery
  };
}
