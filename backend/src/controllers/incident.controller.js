import { parseIncidentId, parseIncidentQuery } from '../validators/incident.validator.js';
import { getIncident, listIncidents } from '../services/incident.service.js';

function send(res, data) {
  res.setHeader('Cache-Control', 'no-store');
  return res.status(200).json({ success: true, data });
}
export async function index(req, res) {
  return send(res, await listIncidents(req.user.id, parseIncidentQuery(req.query)));
}
export async function show(req, res) {
  return send(res, await getIncident(req.user.id, parseIncidentId(req.params.incidentId)));
}
