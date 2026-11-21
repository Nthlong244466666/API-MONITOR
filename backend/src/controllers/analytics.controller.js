import { parseAnalyticsQuery } from '../validators/analytics.validator.js';
import { analyticsOverview, analyticsTrends, analyticsRecentIncidents } from '../services/analytics.service.js';

function send(res, data) {
  res.setHeader('Cache-Control', 'no-store');
  return res.status(200).json({ success: true, data });
}
export async function overview(req, res) {
  const { range } = parseAnalyticsQuery(req.query);
  return send(res, await analyticsOverview(req.user.id, range));
}
export async function trends(req, res) {
  const { range } = parseAnalyticsQuery(req.query);
  return send(res, await analyticsTrends(req.user.id, range));
}
export async function recentIncidents(req, res) {
  const { range, limit } = parseAnalyticsQuery(req.query, true);
  return send(res, await analyticsRecentIncidents(req.user.id, range, limit));
}
