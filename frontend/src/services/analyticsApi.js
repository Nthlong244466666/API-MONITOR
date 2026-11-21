// useAuth().apiFetch prepends /api/v1 and unwraps { success, data }.
export const ANALYTICS_RANGES = Object.freeze(["24h", "7d", "30d"]);
export function normalizeRange(range) {
  if (!ANALYTICS_RANGES.includes(range)) throw new TypeError("Invalid analytics range");
  return range;
}
export function createAnalyticsApi(apiFetch) {
  return {
    overview(range = "7d") {
      return apiFetch(`/analytics/overview?range=${normalizeRange(range)}`);
    },
    trends(range = "7d") {
      return apiFetch(`/analytics/trends?range=${normalizeRange(range)}`);
    },
    recentIncidents(range = "7d", limit = 5) {
      if (!Number.isInteger(limit) || limit < 1 || limit > 20) throw new TypeError("Invalid incident limit");
      return apiFetch(`/analytics/recent-incidents?range=${normalizeRange(range)}&limit=${limit}`);
    },
  };
}
