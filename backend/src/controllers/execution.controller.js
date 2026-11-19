import { executeSavedRequest } from '../services/execution.service.js';
import {
  validateRequestWorkspaceId,
  validateRequestProjectId,
  validateRequestId,
  validateRequestBody,
} from '../validators/request.validator.js';
import { z } from 'zod';

const emptyBody = z.object({}).strict();

export async function execute(req, res) {
  const workspaceId = validateRequestWorkspaceId(req.params.workspaceId);
  const projectId = validateRequestProjectId(req.params.projectId);
  const requestId = validateRequestId(req.params.requestId);
  validateRequestBody(emptyBody, req.body ?? {});
  const data = await executeSavedRequest(req.user.id, workspaceId, projectId, requestId);
  res.setHeader('Cache-Control', 'no-store');
  return res.status(200).json({ success: true, data });
}
