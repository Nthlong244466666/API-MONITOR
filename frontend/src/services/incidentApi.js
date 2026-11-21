// apiFetch from AuthContext prepends /api/v1 and unwraps {success,data}.
const id = (value) => encodeURIComponent(value);
export const incidentDetailPath = (incidentId) => `/incidents/${id(incidentId)}`;
export function buildIncidentQuery({ status = "ALL", monitorId = "", limit = 20, cursor = "" } = {}) {
  const params = new URLSearchParams({ limit: String(limit) });
  if (status !== "ALL") params.set("status", status);
  if (monitorId.trim()) params.set("monitorId", monitorId.trim());
  if (cursor) params.set("cursor", cursor);
  return `/incidents?${params}`;
}
export function createIncidentApi(apiFetch) {
  return {
    list(filters = {}) { return apiFetch(buildIncidentQuery(filters)); },
    get(incidentId) { return apiFetch(incidentDetailPath(incidentId)); },
  };
}
