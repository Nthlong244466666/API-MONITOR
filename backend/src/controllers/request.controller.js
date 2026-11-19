
import {
  listRequests,
  getRequest,
  createRequest,
  updateRequest,
  deleteRequest,
} from "../services/request.service.js";

import {
  createRequestSchema,
  updateRequestSchema,
  deleteRequestSchema,
  validateRequestBody,
  validateRequestWorkspaceId,
  validateRequestProjectId,
  validateRequestId,
} from "../validators/request.validator.js";

function ids(req) {
  return {
    workspaceId: validateRequestWorkspaceId(req.params.workspaceId),
    projectId: validateRequestProjectId(req.params.projectId),
  };
}

export async function index(req, res) {
  const { workspaceId, projectId } = ids(req);
  const data = await listRequests(req.user.id, workspaceId, projectId);
  return res.status(200).json({ success: true, data });
}

export async function show(req, res) {
  const { workspaceId, projectId } = ids(req);
  const requestId = validateRequestId(req.params.requestId);
  const data = await getRequest(req.user.id, workspaceId, projectId, requestId);
  return res.status(200).json({ success: true, data });
}

export async function store(req, res) {
  const { workspaceId, projectId } = ids(req);
  const payload = validateRequestBody(createRequestSchema, req.body ?? {});
  const data = await createRequest(req.user.id, workspaceId, projectId, payload);
  return res.status(201).json({ success: true, data });
}

export async function update(req, res) {
  const { workspaceId, projectId } = ids(req);
  const requestId = validateRequestId(req.params.requestId);
  const payload = validateRequestBody(updateRequestSchema, req.body ?? {});
  const data = await updateRequest(
    req.user.id,
    workspaceId,
    projectId,
    requestId,
    payload
  );
  return res.status(200).json({ success: true, data });
}

export async function destroy(req, res) {
  const { workspaceId, projectId } = ids(req);
  const requestId = validateRequestId(req.params.requestId);
  const { confirmName, confirmCascade } = validateRequestBody(
    deleteRequestSchema,
    req.body ?? {}
  );
  const data = await deleteRequest(
    req.user.id,
    workspaceId,
    projectId,
    requestId,
    confirmName,
    confirmCascade
  );
  return res.status(200).json({ success: true, data });
}
