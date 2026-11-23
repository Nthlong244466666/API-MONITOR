/* API Monitor Push Service Worker. No application keys or JWT are stored here. */
self.addEventListener('push', event => {
  let payload = {};
  try { payload = event.data?.json() || {}; } catch { payload = {}; }
  const url = typeof payload.url === 'string' && /^\/incidents\/[0-9a-f-]{36}$/i.test(payload.url)
    ? payload.url : '/notifications';
  event.waitUntil(self.registration.showNotification(
    payload.title === 'API Monitor · Đã phục hồi' ? payload.title : 'API Monitor · Sự cố mới',
    {
      body: typeof payload.body === 'string' ? payload.body.slice(0, 150) : 'Mở API Monitor để xem thông tin.',
      tag: typeof payload.tag === 'string' ? payload.tag.slice(0, 130) : 'api-monitor-event',
      data: { url },
    },
  ));
});
self.addEventListener('notificationclick', event => {
  event.notification.close();
  const path = event.notification.data?.url || '/notifications';
  const target = new URL(path, self.location.origin);
  if (target.origin !== self.location.origin) return;
  event.waitUntil((async () => {
    const all = await clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const client of all) {
      if (new URL(client.url).origin === target.origin) {
        await client.navigate(target.href);
        return client.focus();
      }
    }
    return clients.openWindow(target.href);
  })());
});
