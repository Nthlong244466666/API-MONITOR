import { useEffect, useMemo, useState } from "react";
import { createWorkspaceProjectApi } from "../../services/workspaceProjectApi";
import { createRequestApi } from "../../services/requestApi";
import { MONITOR_INTERVALS, validateMonitorForm } from "../../services/monitorValidation";

const input = "w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-brand disabled:opacity-50";
const INITIAL = { requestId: "", name: "", intervalSeconds: 60, timeoutMs: 10000, failureThreshold: 2, recoveryThreshold: 2, isEnabled: true };

export default function MonitorForm({ apiFetch, initial = null, onClose, onSave }) {
  const editing = Boolean(initial);
  const [draft, setDraft] = useState(() => initial ? {
    name: initial.name, intervalSeconds: initial.intervalSeconds, timeoutMs: initial.timeoutMs,
    failureThreshold: initial.failureThreshold, recoveryThreshold: initial.recoveryThreshold, isEnabled: initial.isEnabled,
  } : { ...INITIAL });
  const [workspaces, setWorkspaces] = useState([]);
  const [projects, setProjects] = useState([]);
  const [requests, setRequests] = useState([]);
  const [workspaceId, setWorkspaceId] = useState("");
  const [projectId, setProjectId] = useState("");
  const [selectBusy, setSelectBusy] = useState(!editing);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const { workspaceApi, projectApi } = useMemo(() => createWorkspaceProjectApi(apiFetch), [apiFetch]);
  const requestApi = useMemo(() => createRequestApi(apiFetch), [apiFetch]);
  const set = (key, value) => setDraft((old) => ({ ...old, [key]: value }));

  useEffect(() => {
    if (editing) return;
    let active = true;
    setSelectBusy(true);
    workspaceApi.list().then((data) => {
      if (!active) return;
      setWorkspaces(data);
      setWorkspaceId(data[0]?.id ?? "");
    }).catch((e) => { if (active) setError(e.message ?? "Không tải được Workspace."); })
      .finally(() => { if (active) setSelectBusy(false); });
    return () => { active = false; };
  }, [editing, workspaceApi]);

  useEffect(() => {
    if (editing) return;
    let active = true;
    setProjects([]); setProjectId(""); setRequests([]);
    setDraft((old) => ({ ...old, requestId: "" }));
    if (!workspaceId) return () => { active = false; };
    setSelectBusy(true);
    projectApi.list(workspaceId).then((data) => {
      if (!active) return;
      setProjects(data); setProjectId(data[0]?.id ?? "");
    }).catch((e) => { if (active) setError(e.message ?? "Không tải được Project."); })
      .finally(() => { if (active) setSelectBusy(false); });
    return () => { active = false; };
  }, [editing, workspaceId, projectApi]);

  useEffect(() => {
    if (editing) return;
    let active = true;
    setRequests([]); setDraft((old) => ({ ...old, requestId: "" }));
    if (!workspaceId || !projectId) return () => { active = false; };
    setSelectBusy(true);
    requestApi.list(workspaceId, projectId).then((data) => {
      if (!active) return;
      setRequests(data); setDraft((old) => ({ ...old, requestId: data[0]?.id ?? "" }));
    }).catch((e) => { if (active) setError(e.message ?? "Không tải được Requests."); })
      .finally(() => { if (active) setSelectBusy(false); });
    return () => { active = false; };
  }, [editing, workspaceId, projectId, requestApi]);

  async function submit(event) {
    event.preventDefault();
    if (busy || selectBusy) return;
    setError("");
    try {
      const payload = validateMonitorForm(draft, editing);
      setBusy(true);
      await onSave(payload);
    } catch (e) { setError(e?.message ?? "Không lưu được Monitor."); }
    finally { setBusy(false); }
  }

  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4" role="presentation">
    <section role="dialog" aria-modal="true" aria-labelledby="monitor-form-title" className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-xl border border-line bg-panel p-5 text-ink shadow-2xl">
      <h2 id="monitor-form-title" className="mb-4 text-lg font-semibold">{editing ? "Sửa Monitor" : "Tạo Monitor mới"}</h2>
      <form className="space-y-4" onSubmit={submit}>
        {!editing && <>
          <label className="block text-sm">Workspace
            <select className={`${input} mt-1`} value={workspaceId} onChange={(e) => setWorkspaceId(e.target.value)} disabled={busy || selectBusy || !workspaces.length}>
              {!workspaces.length && <option value="">Không có Workspace</option>}
              {workspaces.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
            </select>
          </label>
          <label className="block text-sm">Project
            <select className={`${input} mt-1`} value={projectId} onChange={(e) => setProjectId(e.target.value)} disabled={busy || selectBusy || !projects.length}>
              {!projects.length && <option value="">Không có Project</option>}
              {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </label>
          <label className="block text-sm">Request muốn giám sát
            <select className={`${input} mt-1`} value={draft.requestId} onChange={(e) => set("requestId", e.target.value)} disabled={busy || selectBusy || !requests.length}>
              {!requests.length && <option value="">Không có Request</option>}
              {requests.map((r) => <option key={r.id} value={r.id}>{r.method} · {r.name}</option>)}
            </select>
          </label>
        </>}
        {editing && <p className="text-xs text-muted">Request đang theo dõi không đổi được. Muốn theo dõi Request khác, hãy tạo Monitor mới.</p>}
        <label className="block text-sm">Tên Monitor
          <input className={`${input} mt-1`} value={draft.name} onChange={(e) => set("name", e.target.value)} minLength={2} maxLength={150} required disabled={busy} placeholder="Production API" />
        </label>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="block text-sm">Chu kỳ (giây)
            <select className={`${input} mt-1`} value={draft.intervalSeconds} onChange={(e) => set("intervalSeconds", Number(e.target.value))} disabled={busy}>
              {MONITOR_INTERVALS.map((n) => <option key={n} value={n}>{n} giây</option>)}
            </select>
          </label>
          <label className="block text-sm">Timeout (ms)
            <input className={`${input} mt-1`} type="number" min={1000} max={30000} step={1000} value={draft.timeoutMs} onChange={(e) => set("timeoutMs", e.target.value)} disabled={busy} />
          </label>
          <label className="block text-sm">Số lần lỗi để DOWN
            <input className={`${input} mt-1`} type="number" min={1} max={20} value={draft.failureThreshold} onChange={(e) => set("failureThreshold", e.target.value)} disabled={busy} />
          </label>
          <label className="block text-sm">Số lần thành công để UP
            <input className={`${input} mt-1`} type="number" min={1} max={20} value={draft.recoveryThreshold} onChange={(e) => set("recoveryThreshold", e.target.value)} disabled={busy} />
          </label>
        </div>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={draft.isEnabled} onChange={(e) => set("isEnabled", e.target.checked)} disabled={busy} /> Bật giám sát khi lưu</label>
        <p className="text-xs text-muted">Scheduler chỉ chạy khi Backend đang bật. Cấu hình Headers/Body của Request được lưu riêng và không hiển thị tại đây.</p>
        {error && <p role="alert" className="rounded-lg border border-down/40 bg-down/10 p-3 text-sm text-down">{error}</p>}
        <div className="flex justify-end gap-2 border-t border-line pt-4">
          <button type="button" className="rounded-lg border border-line px-4 py-2 text-sm" disabled={busy} onClick={onClose}>Hủy</button>
          <button type="submit" className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white disabled:opacity-50" disabled={busy || selectBusy}>{busy ? "Đang lưu..." : editing ? "Lưu thay đổi" : "Tạo Monitor"}</button>
        </div>
      </form>
    </section>
  </div>;
}
