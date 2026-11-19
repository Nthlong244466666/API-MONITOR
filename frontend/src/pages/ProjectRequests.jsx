import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router";
import { ArrowLeft, Plus, RefreshCw, Search } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { createWorkspaceProjectApi } from "../services/workspaceProjectApi";
import { createRequestApi } from "../services/requestApi";
import PageHeader from "../components/layout/PageHeader";
import RequestTable from "../components/requests/RequestTable";
import RequestForm from "../components/requests/RequestForm";
import DeleteRequestDialog from "../components/requests/DeleteRequestDialog";

const methods = ["ALL", "GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"];
const buttonClass = "inline-flex items-center justify-center gap-2 rounded-lg border border-line px-3 py-2 text-sm text-ink hover:bg-panel-hover disabled:opacity-50";

export default function ProjectRequests() {
  const { workspaceId, projectId } = useParams();
  const { apiFetch } = useAuth();
  const { workspaceApi, projectApi } = useMemo(() => createWorkspaceProjectApi(apiFetch), [apiFetch]);
  const requestApi = useMemo(() => createRequestApi(apiFetch), [apiFetch]);
  const [context, setContext] = useState(null);
  const [data, setData] = useState({ key: null, items: [] });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const [reload, setReload] = useState(0);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState("");
  const [search, setSearch] = useState("");
  const [methodFilter, setMethodFilter] = useState("ALL");
  const [form, setForm] = useState(null);
  const [formError, setFormError] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteError, setDeleteError] = useState(null);

  const key = `${workspaceId}/${projectId}`;
  const current = data.key === key && context?.key === key;
  const requests = current ? data.items : [];
  const filtered = requests.filter((item) => {
    const q = search.trim().toLowerCase();
    return (methodFilter === "ALL" || item.method === methodFilter) &&
      (!q || item.name.toLowerCase().includes(q) || item.url.toLowerCase().includes(q));
  });
  const projectBack = `/workspaces/${encodeURIComponent(workspaceId)}/projects/${encodeURIComponent(projectId)}`;

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    setContext(null);
    setData({ key: null, items: [] });
    setForm(null);
    setDeleteTarget(null);
    setFormError(null);
    setDeleteError(null);
    setNotice("");
    setSearch("");
    setMethodFilter("ALL");

    // Fetch only resources authorized for this user. Do not show previous project's requests.
    Promise.all([workspaceApi.list(), projectApi.list(workspaceId), requestApi.list(workspaceId, projectId)])
      .then(([workspaces, projects, items]) => {
        if (!active) return;
        const workspace = workspaces.find((item) => item.id === workspaceId);
        const project = projects.find((item) => item.id === projectId);
        if (!workspace || !project) throw new Error("Project not found or access denied.");
        setContext({ key, workspace, project });
        setData({ key, items });
      })
      .catch((err) => { if (active) setError(err); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [workspaceApi, projectApi, requestApi, workspaceId, projectId, key, reload]);

  function openCreate() { if (!busyRef.current && current) { setError(null); setFormError(null); setForm({ id: null, request: null }); } }
  function openEdit(request) { if (!busyRef.current && current) { setError(null); setFormError(null); setForm({ id: request.id, request }); } }
  function openDelete(request) { if (!busyRef.current && current) { setDeleteError(null); setDeleteTarget(request); } }

  async function saveRequest(payload) {
    if (busyRef.current || !current || !form) return;
    busyRef.current = true;
    setBusy(true);
    setFormError(null);
    const editingId = form.id;
    try {
      if (editingId) {
        const updated = await requestApi.update(workspaceId, projectId, editingId, payload);
        setData((old) => old.key === key ? {
          key, items: old.items.map((item) => item.id === editingId ? updated : item),
        } : old);
        setNotice("Request updated successfully.");
      } else {
        const created = await requestApi.create(workspaceId, projectId, payload);
        setData((old) => old.key === key ? { key, items: [created, ...old.items] } : old);
        setNotice("Request created successfully.");
      }
      setForm(null);
    } catch (err) {
      setFormError(err);
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }

  async function confirmDelete(confirmName) {
    if (busyRef.current || !current || !deleteTarget) return;
    busyRef.current = true;
    setBusy(true);
    setDeleteError(null);
    try {
      await requestApi.remove(workspaceId, projectId, deleteTarget.id, confirmName);
      setData((old) => old.key === key ? { key, items: old.items.filter((item) => item.id !== deleteTarget.id) } : old);
      setDeleteTarget(null);
      setNotice("Request and related data permanently deleted.");
    } catch (err) {
      setDeleteError(err);
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }

  return (
    <>
      <PageHeader title="API Library" />
      <div className="space-y-5">
        <Link to={projectBack} className="inline-flex items-center gap-2 text-sm text-muted hover:text-brand">
          <ArrowLeft size={16} aria-hidden="true" /> Back to Project
        </Link>
        {error && <p role="alert" className="rounded-lg border border-down/40 bg-down/10 p-4 text-sm text-down">{error.message || "Could not load requests."}</p>}
        {notice && <p role="status" className="rounded-lg border border-up/40 bg-up/10 p-4 text-sm text-up">{notice}</p>}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-ink">{current ? context.project.name : "Project Requests"}</h2>
            <p className="mt-1 text-sm text-muted">{current ? `${context.workspace.name} · ${requests.length} saved requests` : "Saved HTTP requests"}</p>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={() => setReload((v) => v + 1)} disabled={loading || busy} className={buttonClass}>
              <RefreshCw size={16} aria-hidden="true" /> Refresh
            </button>
            <button type="button" onClick={openCreate} disabled={loading || busy || !current}
              className="inline-flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-hover disabled:opacity-50">
              <Plus size={16} aria-hidden="true" /> New Request
            </button>
          </div>
        </div>
        {current && <div className="flex flex-col gap-3 sm:flex-row">
          <label className="flex flex-1 items-center gap-2 rounded-lg border border-line bg-surface px-3 py-2">
            <Search size={16} className="text-muted" aria-hidden="true" />
            <span className="sr-only">Search requests</span>
            <input type="search" value={search} onChange={(event) => setSearch(event.target.value)}
              placeholder="Search name or URL..." className="w-full bg-transparent text-sm text-ink outline-none placeholder:text-muted" />
          </label>
          <label className="flex items-center gap-2 text-sm text-muted">
            Method
            <select value={methodFilter} onChange={(event) => setMethodFilter(event.target.value)}
              className="rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-brand">
              {methods.map((method) => <option key={method} value={method}>{method === "ALL" ? "All methods" : method}</option>)}
            </select>
          </label>
        </div>}
        {loading ? <div role="status" className="rounded-xl border border-line p-8 text-center text-sm text-muted">Loading requests...</div> :
          !current ? null : requests.length === 0 ?
          <div className="rounded-xl border border-dashed border-line p-10 text-center text-sm text-muted">No saved requests yet. Click New Request to create one.</div> :
          filtered.length === 0 ?
          <div className="rounded-xl border border-dashed border-line p-10 text-center text-sm text-muted">No requests match your search or filter.</div> :
          <RequestTable requests={filtered} busy={busy} onEdit={openEdit} onDelete={openDelete} workspaceId={workspaceId} projectId={projectId} />}
      </div>
      {form && current && <RequestForm key={form.id ?? "new"} initialRequest={form.request} busy={busy} error={formError}
        onClose={() => { if (!busyRef.current) setForm(null); }} onSave={saveRequest} />}
      {deleteTarget && current && <DeleteRequestDialog key={deleteTarget.id} request={deleteTarget} busy={busy} error={deleteError}
        onClose={() => { if (!busyRef.current) setDeleteTarget(null); }} onConfirm={confirmDelete} />}
    </>
  );
}
