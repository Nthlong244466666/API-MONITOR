// apiFetch from AuthContext prepends /api/v1 and handles JWT refresh.
const encodeId = (value) => encodeURIComponent(value);
export const monitorListPath = () => "/monitors";
export const monitorDetailPath = (id) => `/monitors/${encodeId(id)}`;

export function createMonitorApi(apiFetch) {
  return {
    list() { return apiFetch(monitorListPath()); },
    get(id) { return apiFetch(monitorDetailPath(id)); },
    create(data) { return apiFetch(monitorListPath(), { method: "POST", body: data }); },
    update(id, data) { return apiFetch(monitorDetailPath(id), { method: "PATCH", body: data }); },
    remove(id) { return apiFetch(monitorDetailPath(id), { method: "DELETE" }); },
    checks(id, { limit = 10, cursor } = {}) {
      const query = new URLSearchParams({ limit: String(limit) });
      if (cursor) query.set("cursor", cursor);
      return apiFetch(`${monitorDetailPath(id)}/checks?${query}`);
    },
    stats(id) { return apiFetch(`${monitorDetailPath(id)}/stats`); },
  };
}
