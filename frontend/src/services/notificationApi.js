// All paths are relative to /api/v1, handled by AuthContext.apiFetch.
const id = (value) => encodeURIComponent(value);
export function buildNotificationQuery({ isRead = "ALL", limit = 20, cursor = "" } = {}) {
  const params = new URLSearchParams({ limit: String(limit) });
  if (isRead !== "ALL") params.set("isRead", isRead);
  if (cursor) params.set("cursor", cursor);
  return `/notifications?${params}`;
}
export function createNotificationApi(apiFetch) {
  return {
    list(filters = {}) { return apiFetch(buildNotificationQuery(filters)); },
    unreadCount() { return apiFetch("/notifications/unread-count"); },
    markRead(notificationId) { return apiFetch(`/notifications/${id(notificationId)}/read`, { method: "PATCH" }); },
    markAllRead() { return apiFetch("/notifications/read-all", { method: "PATCH" }); },
  };
}
