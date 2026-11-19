import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router";
import { FolderKanban, Plus, Pencil, Trash2, RefreshCw, X, ArrowRight } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { createWorkspaceProjectApi } from "../services/workspaceProjectApi";
import PageHeader from "../components/layout/PageHeader";
import Card from "../components/ui/Card";
import ConfirmDialog from "../components/ui/ConfirmDialog";

const MAX_WORKSPACES = 20;
const inputClass = "w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink outline-none placeholder:text-muted focus:border-brand disabled:opacity-50";
const buttonClass = "inline-flex items-center justify-center gap-2 rounded-lg border border-line px-3 py-2 text-sm text-ink transition hover:bg-panel-hover disabled:cursor-not-allowed disabled:opacity-50";
const primaryButtonClass = "inline-flex items-center justify-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-50";

export default function Workspaces() {
  const { apiFetch } = useAuth();
  const { workspaceApi } = useMemo(() => createWorkspaceProjectApi(apiFetch), [apiFetch]);
  const [workspaces, setWorkspaces] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [name, setName] = useState("");
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const requestRef = useRef(0);
  const [reload, setReload] = useState(0);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [dialogError, setDialogError] = useState(null);

  const selected = workspaces.find((item) => item.id === selectedId);
  const clearMessages = useCallback(() => { setError(null); setNotice(""); }, []);

  useEffect(() => {
    let active = true;
    const requestId = ++requestRef.current;
    workspaceApi.list()
      .then((items) => {
        if (!active || requestId !== requestRef.current) return;
        setWorkspaces(items);
        setSelectedId((current) => items.some((item) => item.id === current) ? current : (items[0]?.id ?? ""));
      })
      .catch((err) => {
        if (active && requestId === requestRef.current) setError(err);
      })
      .finally(() => {
        if (active && requestId === requestRef.current) setLoading(false);
      });
    return () => { active = false; };
  }, [workspaceApi, reload]);

  function refresh() {
    if (busyRef.current || loading) return;
    clearMessages();
    setLoading(true);
    setReload((value) => value + 1);
  }

  function changeWorkspace(event) {
    setSelectedId(event.target.value);
    setEditing(false);
    setName("");
    clearMessages();
  }

  function startEdit() {
    if (!selected || busyRef.current) return;
    setEditing(true);
    setName(selected.name);
    clearMessages();
  }

  function cancelEdit() {
    setEditing(false);
    setName("");
  }

  async function submit(event) {
    event.preventDefault();
    const trimmed = name.trim();
    if (busyRef.current || trimmed.length < 2 || trimmed.length > 150) return;
    if (!editing && workspaces.length >= MAX_WORKSPACES) return;
    if (editing && !selected) return;

    const workspaceId = selectedId;
    busyRef.current = true;
    setBusy(true);
    clearMessages();
    try {
      if (editing) {
        const updated = await workspaceApi.update(workspaceId, trimmed);
        ++requestRef.current;
        setWorkspaces((previous) => previous.map((item) => item.id === workspaceId ? { ...item, ...updated } : item));
        setNotice("Workspace updated successfully.");
      } else {
        const created = await workspaceApi.create(trimmed);
        ++requestRef.current;
        setWorkspaces((previous) => [created, ...previous.filter((item) => item.id !== created.id)]);
        setSelectedId(created.id);
        setNotice("Workspace created successfully.");
      }
      cancelEdit();
      setReload((value) => value + 1);
    } catch (err) {
      setError(err);
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }

  async function confirmDelete(confirmName) {
    if (!deleteTarget || busyRef.current) return;
    const target = deleteTarget;
    busyRef.current = true;
    setBusy(true);
    setDialogError(null);
    clearMessages();
    try {
      await workspaceApi.remove(target.id, confirmName);
      ++requestRef.current;
      const remaining = workspaces.filter((item) => item.id !== target.id);
      setWorkspaces(remaining);
      if (selectedId === target.id) setSelectedId(remaining[0]?.id ?? "");
      setDeleteTarget(null);
      cancelEdit();
      setNotice("Workspace deleted successfully.");
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
      <PageHeader title="Workspaces" />
      <div className="space-y-6">
        {error && <div role="alert" className="rounded-lg border border-down/40 bg-down/10 p-4 text-sm text-down">{error.message || "Something went wrong."}{import.meta.env.DEV && error.code ? ` (${error.code})` : ""}</div>}
        {notice && <p role="status" className="rounded-lg border border-up/40 bg-up/10 p-4 text-sm text-up">{notice}</p>}
        <Card>
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-ink">Your Workspaces</h2>
              <p className="mt-1 text-sm text-muted">{workspaces.length}/{MAX_WORKSPACES} workspaces</p>
            </div>
            <button type="button" onClick={refresh} disabled={loading || busy} className={buttonClass}><RefreshCw size={16} /> Refresh</button>
          </div>
          {loading ? <p className="py-4 text-sm text-muted">Loading workspaces...</p> : (
            <>
              <div className="flex flex-wrap items-end gap-3">
                <div className="min-w-0 flex-1">
                  <label htmlFor="workspace-selector" className="mb-2 block text-sm text-muted">Selected Workspace</label>
                  <select id="workspace-selector" value={selected?.id ?? ""} onChange={changeWorkspace} disabled={busy} className={inputClass}>
                    {!selected && <option value="" disabled>Select a workspace</option>}
                    {workspaces.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                  </select>
                </div>
                <div className="flex gap-2">
                  <button type="button" onClick={startEdit} disabled={busy || !selected} aria-label="Rename selected workspace" className={buttonClass}><Pencil size={16} /></button>
                  <button type="button" onClick={() => { if (selected) { setDialogError(null); setDeleteTarget(selected); } }} disabled={busy || !selected || workspaces.length <= 1} aria-label="Delete selected workspace" className={buttonClass}><Trash2 size={16} className="text-down" /></button>
                </div>
              </div>
              <form onSubmit={submit} className="mt-5 space-y-3">
                <label htmlFor="workspace-name" className="block text-sm text-muted">{editing ? "Rename Workspace" : "Create Workspace"}</label>
                <div className="flex flex-col gap-3 sm:flex-row">
                  <input id="workspace-name" value={name} onChange={(event) => setName(event.target.value)} minLength={2} maxLength={150} required placeholder="Workspace name" disabled={busy} className={inputClass} />
                  <button type="submit" disabled={busy || name.trim().length < 2 || (!editing && workspaces.length >= MAX_WORKSPACES)} className={primaryButtonClass}>{editing ? "Save" : <><Plus size={16} /> Create</>}</button>
                  {editing && <button type="button" onClick={cancelEdit} disabled={busy} className={buttonClass}><X size={16} /> Cancel</button>}
                </div>
              </form>
            </>
          )}
        </Card>
        <Card>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="flex items-center gap-2 text-lg font-semibold text-ink"><FolderKanban size={20} className="text-brand" /> Projects</h2>
              <p className="mt-1 text-sm text-muted">{selected?.name ?? "Select a workspace"}</p>
              {selected && <p className="mt-1 text-xs text-muted">{selected._count?.projects ?? 0} projects</p>}
            </div>
            {selected && <Link to={`/workspaces/${encodeURIComponent(selected.id)}/projects`} className={primaryButtonClass}>Manage Projects <ArrowRight size={16} /></Link>}
          </div>
          {!selected && !loading && <p className="mt-4 text-sm text-muted">Create a workspace to start managing projects.</p>}
        </Card>
      </div>
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete Workspace"
        name={deleteTarget?.name ?? ""}
        description={`This will permanently delete this workspace, its ${deleteTarget?._count?.projects ?? 0} project(s), and all associated data.`}
        loading={busy}
        error={dialogError}
        onClose={() => { if (!busyRef.current) { setDeleteTarget(null); setDialogError(null); } }}
        onConfirm={confirmDelete}
      />
    </>
  );
}

