import { createMonitorSchema, updateMonitorSchema, checksQuerySchema, parseMonitorId, parsePayload } from '../validators/monitor.validator.js';
import { listMonitors, getMonitor, createMonitor, updateMonitor, deleteMonitor, listMonitorChecks, monitorStats } from '../services/monitor.service.js';

function send(res, data, status = 200) {
  res.setHeader('Cache-Control', 'no-store');
  return res.status(status).json({ success: true, data });
}
export async function index(req, res) { return send(res, await listMonitors(req.user.id)); }
export async function show(req, res) { return send(res, await getMonitor(req.user.id, parseMonitorId(req.params.monitorId))); }
export async function store(req, res) {
  const data = parsePayload(createMonitorSchema, req.body);
  return send(res, await createMonitor(req.user.id, data), 201);
}
export async function update(req, res) {
  const id = parseMonitorId(req.params.monitorId);
  const data = parsePayload(updateMonitorSchema, req.body);
  return send(res, await updateMonitor(req.user.id, id, data));
}
export async function destroy(req, res) {
  return send(res, await deleteMonitor(req.user.id, parseMonitorId(req.params.monitorId)));
}
export async function checks(req, res) {
  const id = parseMonitorId(req.params.monitorId);
  const query = parsePayload(checksQuerySchema, req.query);
  return send(res, await listMonitorChecks(req.user.id, id, query));
}
export async function stats(req, res) {
  return send(res, await monitorStats(req.user.id, parseMonitorId(req.params.monitorId)));
}
