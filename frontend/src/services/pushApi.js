export function createPushApi(apiFetch) {
  return {
    vapid: () => apiFetch('/push/vapid-public-key'),
    subscribe: (subscription) => apiFetch('/push/subscriptions', { method: 'POST', body: subscription }),
    unsubscribe: (endpoint) => apiFetch('/push/subscriptions', { method: 'DELETE', body: { endpoint } }),
  };
}
