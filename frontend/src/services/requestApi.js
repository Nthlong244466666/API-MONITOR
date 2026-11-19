// apiFetch from AuthContext prepends /api/v1 and handles JWT refresh.
const encodeId = (value) => encodeURIComponent(value);

export const requestLibraryPath = (workspaceId, projectId) =>
  `/workspaces/${encodeId(workspaceId)}/projects/${encodeId(projectId)}/requests`;

export const requestStudioPath = (workspaceId, projectId, requestId) =>
  `${requestLibraryPath(workspaceId, projectId)}/${encodeId(requestId)}`;

export function createRequestApi(apiFetch) {
  return {
    list(workspaceId, projectId) {
      return apiFetch(requestLibraryPath(workspaceId, projectId));
    },
    get(workspaceId, projectId, requestId) {
      return apiFetch(requestStudioPath(workspaceId, projectId, requestId));
    },
    create(workspaceId, projectId, data) {
      return apiFetch(requestLibraryPath(workspaceId, projectId), {
        method: "POST",
        body: data,
      });
    },
    update(workspaceId, projectId, requestId, data) {
      return apiFetch(requestStudioPath(workspaceId, projectId, requestId), {
        method: "PATCH",
        body: data,
      });
    },
    execute(workspaceId, projectId, requestId) {
      return apiFetch(`${requestStudioPath(workspaceId, projectId, requestId)}/execute`, {
        method: "POST",
        body: {},
      });
    },
    listAssertions(workspaceId, projectId, requestId) {
      return apiFetch(`${requestStudioPath(workspaceId, projectId, requestId)}/assertions`);
    },
    createAssertion(workspaceId, projectId, requestId, data) {
      return apiFetch(`${requestStudioPath(workspaceId, projectId, requestId)}/assertions`, { method: "POST", body: data });
    },
    updateAssertion(workspaceId, projectId, requestId, assertionId, data) {
      return apiFetch(`${requestStudioPath(workspaceId, projectId, requestId)}/assertions/${encodeId(assertionId)}`, { method: "PATCH", body: data });
    },
    deleteAssertion(workspaceId, projectId, requestId, assertionId) {
      return apiFetch(`${requestStudioPath(workspaceId, projectId, requestId)}/assertions/${encodeId(assertionId)}`, { method: "DELETE" });
    },
    listExecutions(workspaceId, projectId, requestId, { limit = 10, success, cursor } = {}) {
      const query = new URLSearchParams({ limit: String(limit) });
      if (success !== undefined) query.set("success", String(success));
      if (cursor) query.set("cursor", cursor);
      return apiFetch(`${requestStudioPath(workspaceId, projectId, requestId)}/executions?${query}`);
    },
    getExecution(workspaceId, projectId, requestId, executionId) {
      return apiFetch(`${requestStudioPath(workspaceId, projectId, requestId)}/executions/${encodeId(executionId)}`);
    },
    remove(workspaceId, projectId, requestId, confirmName) {
      return apiFetch(requestStudioPath(workspaceId, projectId, requestId), {
        method: "DELETE",
        body: { confirmName, confirmCascade: true },
      });
    },
  };
}
