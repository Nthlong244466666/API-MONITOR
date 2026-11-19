import { validateRequestWorkspaceId, validateRequestProjectId, validateRequestId } from '../validators/request.validator.js';
import { validateHistoryQuery, validateExecutionId } from '../validators/history.validator.js';
import { getExecutionHistory, getExecutionDetail } from '../services/history.service.js';

function ctx(req) {
  return [req.user.id, validateRequestWorkspaceId(req.params.workspaceId),
    validateRequestProjectId(req.params.projectId), validateRequestId(req.params.requestId)];
}
function send(res, data) {
  res.setHeader('Cache-Control', 'no-store');
  return res.status(200).json({ success: true, data });
}
export async function listExecutions(req, res) {
  const query = validateHistoryQuery(req.query);
  return send(res, await getExecutionHistory(...ctx(req), query));
}
export async function showExecution(req, res) {
  const executionId = validateExecutionId(req.params.executionId);
  return send(res, await getExecutionDetail(...ctx(req), executionId));
}
