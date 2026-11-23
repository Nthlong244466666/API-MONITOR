// Browser Push implementation. No API credentials or application JWT in the
// Service Worker; subscription management uses the existing authenticated API.
import { createPushApi } from './pushApi';

export function pushSupported() {
  return Boolean(globalThis.isSecureContext && 'serviceWorker' in navigator &&
    'PushManager' in window && 'Notification' in window);
}
export function base64ToBytes(base64) {
  const normalized = base64.replace(/-/g, '+').replace(/_/g, '/');
  const decoded = atob(normalized + '='.repeat((4 - normalized.length % 4) % 4));
  return Uint8Array.from(decoded, char => char.charCodeAt(0));
}
export async function currentPushSubscription() {
  if (!pushSupported()) return null;
  const registration = await navigator.serviceWorker.getRegistration('/');
  return registration ? registration.pushManager.getSubscription() : null;
}
export async function enableBrowserPush(apiFetch) {
  if (!pushSupported()) throw new Error('Web Push cần Chrome/Firefox hỗ trợ và localhost hoặc HTTPS.');
  // Permission must be requested directly from the user's click, before async IO.
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') throw new Error('Quyền thông báo bị từ chối. Hãy bật trong cài đặt trình duyệt.');
  const api = createPushApi(apiFetch);
  const { publicKey } = await api.vapid();
  const registration = await navigator.serviceWorker.register('/push-sw.js', { scope: '/' });
  const ready = await navigator.serviceWorker.ready;
  let subscription = await ready.pushManager.getSubscription();
  if (!subscription) subscription = await ready.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: base64ToBytes(publicKey) });
  try {
    await api.subscribe(subscription.toJSON());
  } catch (error) {
    await subscription.unsubscribe().catch(() => {});
    throw error;
  }
  return subscription;
}
export async function disableBrowserPush(apiFetch) {
  const sub = await currentPushSubscription();
  if (!sub) return;
  await createPushApi(apiFetch).unsubscribe(sub.endpoint);
  await sub.unsubscribe();
}
export async function removePushOnLogout(accessToken) {
  if (!accessToken) return;
  const sub = await currentPushSubscription().catch(() => null);
  if (!sub) return;
  try {
    await fetch('/api/v1/push/subscriptions', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({ endpoint: sub.endpoint }),
      credentials: 'include',
      cache: 'no-store',
    });
  } finally {
    await sub.unsubscribe().catch(() => {});
  }
}
