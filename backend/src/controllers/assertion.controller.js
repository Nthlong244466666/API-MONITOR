import { validateRequestWorkspaceId, validateRequestProjectId, validateRequestId, validateRequestBody } from '../validators/request.validator.js';
import { createAssertionSchema, patchAssertionSchema, validateAssertionId } from '../validators/assertion.validator.js';
import { getAssertions, addAssertion, changeAssertion, deleteAssertion } from '../services/assertionManagement.service.js';

function ctx(req) {
  return [req.user.id, validateRequestWorkspaceId(req.params.workspaceId),
    validateRequestProjectId(req.params.projectId), validateRequestId(req.params.requestId)];
}
function privateResponse(res, status, data) {
  res.setHeader('Cache-Control', 'no-store');
  return res.status(status).json({ success: true, data });
}
export async function listAssertions(req, res) {
  return privateResponse(res, 200, await getAssertions(...ctx(req)));
}
export async function createAssertion(req, res) {
  const payload = validateRequestBody(createAssertionSchema, req.body ?? {});
  return privateResponse(res, 201, await addAssertion(...ctx(req), payload));
}
export async function patchAssertion(req, res) {
  const id = validateAssertionId(req.params.assertionId);
  const payload = validateRequestBody(patchAssertionSchema, req.body ?? {});
  return privateResponse(res, 200, await changeAssertion(...ctx(req), id, payload));
}
export async function removeAssertion(req, res) {
  const id = validateAssertionId(req.params.assertionId);
  return privateResponse(res, 200, await deleteAssertion(...ctx(req), id));
}
