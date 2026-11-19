import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router";
import { ArrowLeft, FolderKanban, Plus, RefreshCw, Search } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { createWorkspaceProjectApi } from "../services/workspaceProjectApi";
import PageHeader from "../components/layout/PageHeader";
import ConfirmDialog from "../components/ui/ConfirmDialog";
import ProjectCard from "../components/projects/ProjectCard";
import ProjectForm from "../components/projects/ProjectForm";

const MAX_PROJECTS = 50;
const buttonClass = "inline-flex items-center justify-center gap-2 rounded-lg border border-line px-3 py-2 text-sm text-ink transition hover:bg-panel-hover disabled:cursor-not-allowed disabled:opacity-50";
const primaryClass = "inline-flex items-center justify-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-50";

export default function WorkspaceProjects() {
  const { workspaceId } = useParams();
  const { apiFetch } = useAuth();
  const { workspaceApi, projectApi } = useMemo(() => createWorkspaceProjectApi(apiFetch), [apiFetch]);
  const [workspace, setWorkspace] = useState(null);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const requestRef = useRef(0);
  const lastWorkspaceRef = useRef(null);
  const [reload, setReload] = useState(0);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState("");
  const [query, setQuery] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editingProjectId, setEditingProjectId] = useState(null);
  const [projectName, setProjectName] = useState("");
  const [description, setDescription] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [dialogError, setDialogError] = useState(null);
  const [loadedWorkspaceId, setLoadedWorkspaceId] = useState(null);

  const isCurrent = loadedWorkspaceId === workspaceId;
  const visibleProjects = isCurrent ? projects : [];
  const atLimit = visibleProjects.length >= MAX_PROJECTS;
  const filtered = visibleProjects.filter((item) => item.name.toLowerCase().includes(query.trim().toLowerCase()));
  const clearMessages = useCallback(() => { setError(null); setNotice(""); }, []);
  const resetForm = useCallback(() => { setFormOpen(false); setEditingProjectId(null); setProjectName(""); setDescription(""); }, []);

  useEffect(() => {
    let active = true;
    const requestId = ++requestRef.current;
    setLoading(true);
    setWorkspace(null);
    setProjects([]);
    setLoadedWorkspaceId(null);
    setError(null);
    if (lastWorkspaceRef.current !== workspaceId) {
      setNotice("");
      resetForm();
      setDeleteTarget(null);
      setDialogError(null);
      setQuery("");
      lastWorkspaceRef.current = workspaceId;
    }

    // Resolve workspace ownership before exposing its projects.
    workspaceApi.list()
      .then((items) => {
        if (!active || requestId !== requestRef.current) return;
        const found = items.find((item) => item.id === workspaceId);
        if (!found) {
          const err = new Error("Workspace not found or you do not have access.");
          err.code = "WORKSPACE_NOT_FOUND";
          throw err;
        }
        return projectApi.list(workspaceId).then((data) => ({ found, data }));
      })
      .then((result) => {
        if (!active || requestId !== requestRef.current || !result) return;
        setWorkspace(result.found);
        setProjects(result.data);
        setLoadedWorkspaceId(workspaceId);
      })
      .catch((err) => {
        if (active && requestId === requestRef.current) setError(err);
      })
      .finally(() => {
        if (active && requestId === requestRef.current) setLoading(false);
      });
    return () => { active = false; };
  }, [workspaceApi, projectApi, workspaceId, reload, resetForm]);

  function refresh() {
    if (busyRef.current || loading) return;
    clearMessages();
    setReload((value) => value + 1);
  }

  function startCreate() {
    if (busyRef.current || atLimit || !isCurrent) return;
    clearMessages();
    setEditingProjectId(null);
    setProjectName("");
    setDescription("");
    setFormOpen(true);
  }

  function startEdit(project) {
    if (busyRef.current || !isCurrent) return;
    clearMessages();
    setEditingProjectId(project.id);
    setProjectName(project.name);
    setDescription(project.description ?? "");
    setFormOpen(true);
  }

  async function submitProject(event) {
    event.preventDefault();
    const name = projectName.trim();
    if (busyRef.current || !isCurrent || !workspace || name.length < 2 || name.length > 150 || description.length > 1000) return;
    if (!editingProjectId && atLimit) return;
    const actionWorkspaceId = workspaceId;
    const editingId = editingProjectId;
    busyRef.current = true;
    setBusy(true);
    clearMessages();
    try {
      const data = { name, description: description.trim() || null };
      if (editingId) {
        const updated = await projectApi.update(actionWorkspaceId, editingId, data);
        ++requestRef.current;
        setProjects((previous) => previous.map((item) => item.id === editingId ? updated : item));
        setNotice("Project updated successfully.");
      } else {
        const created = await projectApi.create(actionWorkspaceId, data);
        ++requestRef.current;
        setProjects((previous) => [created, ...previous.filter((item) => item.id !== created.id)]);
        setNotice("Project created successfully.");
      }
      resetForm();
      setReload((value) => value + 1);
    } catch (err) {
      setError(err);
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }

  async function confirmDelete(confirmName) {
    if (!deleteTarget || busyRef.current || !isCurrent) return;
    const target = deleteTarget;
    busyRef.current = true;
    setBusy(true);
    setDialogError(null);
    clearMessages();
    try {
      await projectApi.remove(workspaceId, target.id, confirmName);
      ++requestRef.current;
      setProjects((previous) => previous.filter((item) => item.id !== target.id));
      setDeleteTarget(null);
      resetForm();
      setNotice("Project deleted successfully.");
      setReload((value) => value + 1);
    } catch (err) {
      setDialogError(err);
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }

  return (
    <>
      <PageHeader title="Projects" />
      <div className="space-y-5">
        <Link to="/workspaces" className="inline-flex items-center gap-2 text-sm text-muted hover:text-brand"><ArrowLeft size={16} /> Back to Workspaces</Link>
        {error && <div role="alert" className="rounded-lg border border-down/40 bg-down/10 p-4 text-sm text-down">{error.message || "Could not load projects."}{import.meta.env.DEV && error.code ? ` (${error.code})` : ""}</div>}
        {notice && <p role="status" className="rounded-lg border border-up/40 bg-up/10 p-4 text-sm text-up">{notice}</p>}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-ink">{isCurrent ? workspace.name : "Workspace Projects"}</h2>
            <p className="mt-1 text-sm text-muted">{isCurrent ? `${visibleProjects.length}/${MAX_PROJECTS} projects` : loading ? "Loading workspace..." : "Workspace unavailable"}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={refresh} disabled={busy || loading} className={buttonClass}><RefreshCw size={16} /> Refresh</button>
            <button type="button" onClick={startCreate} disabled={busy || loading || !isCurrent || atLimit} className={primaryClass}><Plus size={16} /> New Project</button>
          </div>
        </div>
        {atLimit && <p className="text-sm text-muted">This workspace has reached the limit of {MAX_PROJECTS} projects.</p>}
        {formOpen && isCurrent && (
          <ProjectForm
            name={projectName}
            description={description}
            onNameChange={setProjectName}
            onDescriptionChange={setDescription}
            onSubmit={submitProject}
            onCancel={resetForm}
            editing={Boolean(editingProjectId)}
            busy={busy}
            atLimit={atLimit}
          />
        )}
        {isCurrent && (
          <label className="flex items-center gap-2 rounded-lg border border-line bg-surface px-3 py-2">
            <Search size={16} className="text-muted" />
            <span className="sr-only">Search projects</span>
            <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search projects..." className="w-full bg-transparent text-sm text-ink outline-none placeholder:text-muted" />
          </label>
        )}
        {loading ? (
          <div role="status" className="rounded-xl border border-line p-8 text-center text-sm text-muted">Loading projects...</div>
        ) : isCurrent && visibleProjects.length === 0 ? (
          <div className="rounded-xl border border-dashed border-line p-10 text-center"><FolderKanban size={32} className="mx-auto mb-3 text-muted" /><p className="text-sm text-muted">No projects yet. Create your first project.</p></div>
        ) : isCurrent && filtered.length === 0 ? (
          <div className="rounded-xl border border-dashed border-line p-10 text-center text-sm text-muted">No projects match your search.</div>
        ) : isCurrent ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {filtered.map((project) => <ProjectCard key={project.id} project={project} workspaceId={workspaceId} busy={busy} onEdit={startEdit} onDelete={(target) => { if (!busyRef.current) { setDialogError(null); setDeleteTarget(target); } }} />)}
          </div>
        ) : null}
      </div>
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete Project"
        name={deleteTarget?.name ?? ""}
        description="This will permanently delete this project and all associated data."
        loading={busy}
        error={dialogError}
        onClose={() => { if (!busyRef.current) { setDeleteTarget(null); setDialogError(null); } }}
        onConfirm={confirmDelete}
      />
    </>
  );
}
