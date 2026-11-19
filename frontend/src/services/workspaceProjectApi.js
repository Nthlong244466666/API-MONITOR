
const BASE = "/workspaces";

const encodeId = (id) => encodeURIComponent(id);

export function createWorkspaceProjectApi(apiFetch) {
  const workspaceUrl = (id) =>
    `${BASE}/${encodeId(id)}`;

  const projectUrl = (workspaceId) =>
    `${workspaceUrl(workspaceId)}/projects`;

  const workspaceApi = {
    list() {
      return apiFetch(BASE);
    },

    create(name) {
      return apiFetch(BASE, {
        method: "POST",
        body: { name },
      });
    },

    update(id, name) {
      return apiFetch(workspaceUrl(id), {
        method: "PATCH",
        body: { name },
      });
    },

    remove(id, confirmName) {
      return apiFetch(workspaceUrl(id), {
        method: "DELETE",
        body: { confirmName },
      });
    },
  };

  const projectApi = {
    list(workspaceId) {
      return apiFetch(projectUrl(workspaceId));
    },

    create(workspaceId, data) {
      return apiFetch(projectUrl(workspaceId), {
        method: "POST",
        body: data,
      });
    },

    update(workspaceId, projectId, data) {
      return apiFetch(
        `${projectUrl(workspaceId)}/${encodeId(projectId)}`,
        {
          method: "PATCH",
          body: data,
        }
      );
    },

    remove(workspaceId, projectId, confirmName) {
      return apiFetch(
        `${projectUrl(workspaceId)}/${encodeId(projectId)}`,
        {
          method: "DELETE",
          body: { confirmName },
        }
      );
    },
  };

  return { workspaceApi, projectApi };
}
