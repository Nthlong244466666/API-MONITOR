import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { FolderKanban, RefreshCw } from "lucide-react";
import PageHeader from "../components/layout/PageHeader";
import Card from "../components/ui/Card";
import { useAuth } from "../contexts/AuthContext";
import { createWorkspaceProjectApi } from "../services/workspaceProjectApi";
import { requestLibraryPath } from "../services/requestApi";

const inputClass = "w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-brand disabled:opacity-50";

export default function Requests() {
  const navigate = useNavigate();
  const { apiFetch } = useAuth();
  const { workspaceApi, projectApi } = useMemo(() => createWorkspaceProjectApi(apiFetch), [apiFetch]);
  const [workspaces, setWorkspaces] = useState([]);
  const [workspaceId, setWorkspaceId] = useState("");
  const [projectData, setProjectData] = useState({ workspaceId: null, items: [] });
  const [projectId, setProjectId] = useState("");
  const [loading, setLoading] = useState(true);
  const [projectsLoading, setProjectsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    workspaceApi.list()
      .then((data) => {
        if (!active) return;
        setWorkspaces(data);
        setWorkspaceId((previous) => data.some((item) => item.id === previous) ? previous : (data[0]?.id ?? ""));
      })
      .catch((err) => { if (active) { setWorkspaces([]); setWorkspaceId(""); setError(err); } })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [workspaceApi, reload]);

  useEffect(() => {
    let active = true;
    setProjectData({ workspaceId: null, items: [] });
    setProjectId("");
    if (!workspaceId) { setProjectsLoading(false); return () => { active = false; }; }
    setProjectsLoading(true);
    projectApi.list(workspaceId)
      .then((items) => {
        if (!active) return;
        setProjectData({ workspaceId, items });
        setProjectId((previous) => items.some((item) => item.id === previous) ? previous : (items[0]?.id ?? ""));
      })
      .catch((err) => { if (active) { setError(err); setProjectData({ workspaceId, items: [] }); } })
      .finally(() => { if (active) setProjectsLoading(false); });
    return () => { active = false; };
  }, [projectApi, workspaceId, reload]);

  const projects = projectData.workspaceId === workspaceId ? projectData.items : [];
  const selectedProjectId = projects.some((item) => item.id === projectId) ? projectId : "";
  const selectedWorkspaceId = workspaces.some((item) => item.id === workspaceId) ? workspaceId : "";

  return (
    <>
      <PageHeader title="API Requests" />
      <div className="space-y-5">
        <Card>
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <h2 className="flex items-center gap-2 text-lg font-semibold text-ink">
                <FolderKanban size={20} className="text-brand" aria-hidden="true" /> Select Project
              </h2>
              <p className="mt-1 text-sm text-muted">Choose a workspace and project to open its saved API requests.</p>
            </div>
            <button type="button" onClick={() => setReload((v) => v + 1)} disabled={loading || projectsLoading}
              className="rounded-lg border border-line px-3 py-2 text-sm text-ink hover:bg-panel-hover disabled:opacity-50">
              <RefreshCw size={16} aria-hidden="true" /> <span className="sr-only">Refresh choices</span>
            </button>
          </div>
          {error && <p role="alert" className="mb-4 rounded-lg border border-down/40 bg-down/10 p-3 text-sm text-down">{error.message || "Could not load workspace/project data."}</p>}
          {loading ? <p className="text-sm text-muted">Loading workspaces...</p> : workspaces.length === 0 ? (
            <p className="text-sm text-muted">No workspaces found. Create a workspace first.</p>
          ) : (
            <form onSubmit={(event) => {
              event.preventDefault();
              if (selectedWorkspaceId && selectedProjectId && !projectsLoading) {
                navigate(requestLibraryPath(selectedWorkspaceId, selectedProjectId));
              }
            }} className="space-y-4">
              <div>
                <label htmlFor="request-workspace" className="mb-2 block text-sm text-muted">Workspace</label>
                <select id="request-workspace" className={inputClass} value={selectedWorkspaceId}
                  onChange={(event) => { setError(null); setWorkspaceId(event.target.value); setProjectId(""); }}>
                  {workspaces.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="request-project" className="mb-2 block text-sm text-muted">Project</label>
                <select id="request-project" className={inputClass} value={selectedProjectId}
                  disabled={projectsLoading || projects.length === 0}
                  onChange={(event) => setProjectId(event.target.value)}>
                  {projects.length === 0 && <option value="">{projectsLoading ? "Loading projects..." : "No projects available"}</option>}
                  {projects.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                </select>
              </div>
              <button type="submit" disabled={!selectedProjectId || projectsLoading || loading}
                className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-hover disabled:opacity-50">
                Open API Library
              </button>
            </form>
          )}
        </Card>
      </div>
    </>
  );
}
