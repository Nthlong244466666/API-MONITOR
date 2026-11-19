import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router";
import { ArrowLeft, Play, RefreshCw, Save, ShieldAlert } from "lucide-react";
import PageHeader from "../components/layout/PageHeader";
import { useAuth } from "../contexts/AuthContext";
import { createRequestApi, requestLibraryPath } from "../services/requestApi";
import RequestMethodBadge from "../components/requests/RequestMethodBadge";
import AssertionPanel from "../components/requests/AssertionPanel";
import ExecutionHistoryPanel from "../components/requests/ExecutionHistoryPanel";

const METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"];
const input = "w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink outline-none placeholder:text-muted focus:border-brand disabled:opacity-50";
const secondaryButton = "inline-flex items-center justify-center gap-2 rounded-lg border border-line px-3 py-2 text-sm text-ink hover:bg-panel-hover disabled:opacity-50";
const primaryButton = "inline-flex items-center justify-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-hover disabled:opacity-50";

function validUrl(value) {
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol) && Boolean(url.hostname) && !url.username && !url.password;
  } catch { return false; }
}

function initialForm(request) {
  return { name: request.name, method: request.method, url: request.url, clearQuery: false };
}

function asMessage(error) { return error?.message || "Request failed. Please try again."; }

function formatTime(value) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString();
}

export default function RequestStudio() {
  const { workspaceId, projectId, requestId } = useParams();
  const { apiFetch } = useAuth();
  const api = useMemo(() => createRequestApi(apiFetch), [apiFetch]);
  const back = requestLibraryPath(workspaceId, projectId);
  const [record, setRecord] = useState(null);
  const [form, setForm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [result, setResult] = useState(null);
  const [activeTab, setActiveTab] = useState("params");
  // Persisted secrets are NEVER fetched. These controls explicitly replace or clear them.
  const [headersAction, setHeadersAction] = useState("keep");
  const [headersText, setHeadersText] = useState("{}");
  const [bodyAction, setBodyAction] = useState("keep");
  const [bodyText, setBodyText] = useState("");
  const [revision, setRevision] = useState(0);
  const [historyRefresh, setHistoryRefresh] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setRecord(null);
    setForm(null);
    setResult(null);
    setError("");
    setNotice("");
    setHeadersAction("keep"); setHeadersText("{}");
    setBodyAction("keep"); setBodyText("");
    api.get(workspaceId, projectId, requestId)
      .then((data) => { if (active) { setRecord(data); setForm(initialForm(data)); } })
      .catch((err) => { if (active) setError(asMessage(err)); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [api, workspaceId, projectId, requestId, revision]);

  const draftChanged = !!(record && form && (
    form.name !== record.name || form.method !== record.method || form.url !== record.url ||
    form.clearQuery || headersAction !== "keep" || bodyAction !== "keep"
  ));
  const valid = !!(form && form.name.trim().length >= 2 && form.name.trim().length <= 150 &&
    form.url.trim().length <= 2048 && validUrl(form.url.trim()));

  const queryNotice = useMemo(() => {
    if (!form || !record) return null;
    try {
      const url = new URL(form.url);
      return { params: [...url.searchParams.entries()].map(([name]) => name), hidden: record.hasQuery && !url.search };
    } catch { return null; }
  }, [form, record]);

  const patchDraft = useCallback((partial) => setForm((current) => current ? { ...current, ...partial } : current), []);

  async function run(action) {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setError("");
    setNotice("");
    try { await action(); }
    catch (err) { setError(asMessage(err)); }
    finally { busyRef.current = false; setBusy(false); }
  }

  async function save(event) {
    event.preventDefault();
    if (!record || !valid || !draftChanged) return;
    let parsedHeaders;
    if (headersAction === "replace") {
      try {
        parsedHeaders = JSON.parse(headersText);
        if (!parsedHeaders || Array.isArray(parsedHeaders) || typeof parsedHeaders !== "object" ||
            Object.keys(parsedHeaders).length > 100 || Object.entries(parsedHeaders).some(([key, value]) =>
              !key || key.length > 256 || typeof value !== "string" || value.length > 8192)) {
          setError("Headers must be a JSON object with at most 100 string-to-string entries."); return;
        }
      } catch { setError("Headers must be valid JSON, e.g. {\"Accept\":\"application/json\"}."); return; }
    }
    if (bodyAction === "replace" && bodyText.length > 100000) {
      setError("Request body must be at most 100,000 characters."); return;
    }
    const payload = {
      name: form.name.trim(), method: form.method, url: form.url.trim(),
      ...(form.clearQuery ? { clearQuery: true } : {}),
      ...(headersAction === "replace" ? { headers: parsedHeaders } : {}),
      ...(headersAction === "clear" ? { headers: {} } : {}),
      ...(bodyAction === "replace" ? { body: bodyText } : {}),
      ...(bodyAction === "clear" ? { body: null } : {}),
    };
    await run(async () => {
      const updated = await api.update(workspaceId, projectId, requestId, payload);
      setRecord(updated); setForm(initialForm(updated));
      setHeadersAction("keep"); setHeadersText("{}");
      setBodyAction("keep"); setBodyText("");
      setResult(null);
      setNotice("Saved securely. Secrets are not returned by the API. Send to execute the saved version.");
    });
  }

  async function execute() {
    if (!record || draftChanged) {
      setError("Save or discard your changes before Send. Send always executes the saved request.");
      return;
    }
    await run(async () => {
      setResult(null);
      const data = await api.execute(workspaceId, projectId, requestId);
      setResult(data);
      setHistoryRefresh((n) => n + 1);
      setNotice("Execution finished. Displaying only the response metadata allowed by the backend.");
    });
  }

  return (
    <>
      <PageHeader title="Request Studio" />
      <div className="space-y-5">
        <Link to={back} className="inline-flex items-center gap-2 text-sm text-muted hover:text-brand">
          <ArrowLeft size={16} aria-hidden="true" /> Back to API Library
        </Link>
        {error && <p role="alert" className="rounded-lg border border-down/40 bg-down/10 p-3 text-sm text-down">{error}</p>}
        {notice && <p role="status" className="rounded-lg border border-up/40 bg-up/10 p-3 text-sm text-up">{notice}</p>}
        {loading && <div role="status" className="rounded-xl border border-line p-8 text-sm text-muted">Loading request...</div>}
        {!loading && !record && <div className="rounded-xl border border-line p-6 text-sm text-muted">Request unavailable or access denied. <button className="underline" onClick={() => setRevision((v) => v + 1)} type="button">Retry</button></div>}
        {record && form && (
          <>
            <div className="rounded-xl border border-line bg-panel p-4 sm:p-5">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <RequestMethodBadge method={record.method} />
                  <div className="min-w-0">
                    <h2 className="truncate text-lg font-semibold text-ink">{record.name}</h2>
                    <p className="text-xs text-muted">Stored request · {record.hasQuery ? "Has hidden URL query" : "No hidden query"}</p>
                  </div>
                </div>
                <button type="button" disabled={busy} onClick={() => {
                  if (draftChanged && !window.confirm("Discard unsaved changes and reload?")) return;
                  setRevision((v) => v + 1);
                }} className={secondaryButton}>
                  <RefreshCw size={15} aria-hidden="true" /> Reload
                </button>
              </div>
              <form onSubmit={save} className="space-y-4">
                <div>
                  <label htmlFor="studio-name" className="mb-1 block text-xs text-muted">Name</label>
                  <input id="studio-name" className={input} value={form.name} maxLength={150} onChange={(e) => patchDraft({ name: e.target.value })} disabled={busy} />
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-[145px_minmax(0,1fr)]">
                  <div>
                    <label htmlFor="studio-method" className="mb-1 block text-xs text-muted">Method</label>
                    <select id="studio-method" className={input} value={form.method} onChange={(e) => patchDraft({ method: e.target.value })} disabled={busy}>
                      {METHODS.map((method) => <option value={method} key={method}>{method}</option>)}
                    </select>
                  </div>
                  <div className="min-w-0">
                    <label htmlFor="studio-url" className="mb-1 block text-xs text-muted">URL (query values are not returned)</label>
                    <input id="studio-url" type="url" className={input} value={form.url} onChange={(e) => patchDraft({ url: e.target.value, clearQuery: false })} disabled={busy} maxLength={2048} required spellCheck={false} />
                  </div>
                </div>
                {record.hasQuery && (
                  <div className="rounded-lg border border-line p-3 text-sm text-muted">
                    The saved URL includes a hidden query. Changes to name/method preserve it. Replacing the URL replaces its query.
                    <label className="mt-2 flex items-center gap-2">
                      <input type="checkbox" disabled={busy || form.url !== record.url} checked={form.clearQuery} onChange={(e) => patchDraft({ clearQuery: e.target.checked })} />
                      Remove hidden query parameters on Save
                    </label>
                  </div>
                )}
                <div className="flex flex-wrap justify-end gap-2">
                  <button type="submit" disabled={busy || !valid || !draftChanged} className={secondaryButton}><Save size={16} aria-hidden="true" /> {busy ? "Saving..." : "Save Changes"}</button>
                  <button type="button" disabled={busy || draftChanged} onClick={execute} className={primaryButton}><Play size={16} aria-hidden="true" /> {busy ? "Working..." : "Send"}</button>
                </div>
                {draftChanged && <p className="text-xs text-muted">Save changes before Send; execution never uses unsaved values.</p>}
                {["GET", "HEAD"].includes(record.method) && record.hasBody && <p role="note" className="text-xs text-down">This saved GET/HEAD request still has a body. Remove it under Body before Send to avoid INVALID_REQUEST_CONFIG.</p>}
              </form>
            </div>

            <div className="rounded-xl border border-line bg-panel p-4 sm:p-5">
              <div className="mb-4 flex gap-2 overflow-x-auto border-b border-line pb-3" role="tablist" aria-label="Request settings">
                {["params", "headers", "body", "assertions", "history"].map((tab) => (
                  <button key={tab} role="tab" aria-selected={activeTab === tab} type="button" onClick={() => setActiveTab(tab)}
                    className={`rounded-lg px-3 py-2 text-sm capitalize ${activeTab === tab ? "bg-brand text-white" : "text-muted hover:bg-panel-hover hover:text-ink"}`}>
                    {tab}
                  </button>
                ))}
              </div>
              {activeTab === "params" && (
                <div className="space-y-2 text-sm text-muted">
                  <p>Visible query parameter names from the URL draft:</p>
                  {queryNotice?.params.length ? <div className="flex flex-wrap gap-2">{queryNotice.params.map((name, i) => <span key={`${name}-${i}`} className="rounded border border-line px-2 py-1">{name}: [hidden]</span>)}</div> : <p>No visible query parameters.</p>}
                  {queryNotice?.hidden && <p>The saved URL also has hidden query parameters. Values cannot be read back.</p>}
                  <p>To add or replace parameters, edit the URL above and Save. Treat query values as sensitive.</p>
                </div>
              )}
              {activeTab === "headers" && (
                <div className="space-y-3 text-sm">
                  <p className="text-muted">Saved headers: <strong className="text-ink">{record.hasHeaders ? "present (hidden)" : "none"}</strong>. Existing values cannot be displayed or edited individually.</p>
                  <label htmlFor="headers-mode" className="block text-sm text-muted">Action on Save</label>
                  <select id="headers-mode" value={headersAction} onChange={(e) => setHeadersAction(e.target.value)} disabled={busy} className={input}>
                    <option value="keep">Keep saved headers unchanged</option>
                    <option value="replace">Replace ALL headers using JSON</option>
                    <option value="clear">Replace with empty headers ({})</option>
                  </select>
                  {headersAction === "replace" && <>
                    <label htmlFor="headers-json" className="block text-sm text-muted">Header JSON object (keys and string values)</label>
                    <textarea id="headers-json" value={headersText} onChange={(e) => setHeadersText(e.target.value)} disabled={busy} rows={6} spellCheck={false} className={`${input} font-mono`} placeholder={'{"Accept":"application/json"}'} />
                    <p className="text-xs text-muted">This replaces all existing headers. Do not paste real secrets into screenshots or chat messages.</p>
                  </>}
                  {headersAction === "clear" && <p className="text-sm text-muted">The saved headers will become an encrypted empty object. The backend may still report hasHeaders: true because an encrypted object exists.</p>}
                </div>
              )}
              {activeTab === "body" && (
                <div className="space-y-3 text-sm">
                  <p className="text-muted">Saved body: <strong className="text-ink">{record.hasBody ? "present (hidden)" : "none"}</strong>. It cannot be read back.</p>
                  <label htmlFor="body-mode" className="block text-sm text-muted">Action on Save</label>
                  <select id="body-mode" value={bodyAction} onChange={(e) => setBodyAction(e.target.value)} disabled={busy} className={input}>
                    <option value="keep">Keep saved body unchanged</option>
                    <option value="replace">Replace entire body</option>
                    <option value="clear">Remove saved body</option>
                  </select>
                  {bodyAction === "replace" && <>
                    <label htmlFor="body-text" className="block text-sm text-muted">New raw body (max 100,000 characters)</label>
                    <textarea id="body-text" value={bodyText} onChange={(e) => setBodyText(e.target.value)} disabled={busy} rows={8} maxLength={100000} spellCheck={false} className={`${input} font-mono`} />
                  </>}
                  {bodyAction === "clear" && <p className="text-sm text-muted">Saved request body will be removed when you click Save Changes.</p>}
                  <p className="text-xs text-muted">Set Content-Type in Headers when the target API requires it. Send always uses the saved body.</p>
                </div>
              )}
              {activeTab === "assertions" && (
                <AssertionPanel api={api} workspaceId={workspaceId} projectId={projectId} requestId={requestId} onChanged={() => setResult(null)} />
              )}
              {activeTab === "history" && (
                <ExecutionHistoryPanel api={api} workspaceId={workspaceId} projectId={projectId} requestId={requestId} refreshKey={historyRefresh} />
              )}
            </div>

            <section aria-label="Execution result" className="rounded-xl border border-line bg-panel p-4 sm:p-5">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-lg font-semibold text-ink">Execution Result</h2>
                {result && <div className="flex flex-wrap gap-2 text-sm"><span className="rounded-md border border-line px-2 py-1">HTTP {result.statusCode ?? "—"}</span><span className="rounded-md border border-line px-2 py-1">{result.responseTimeMs ?? "—"} ms</span><span className={`rounded-md border px-2 py-1 ${result.isSuccess ? "border-up/40 text-up" : "border-down/40 text-down"}`}>{result.isSuccess ? "PASS" : "FAIL"}</span></div>}
              </div>
              {!result ? <p className="text-sm text-muted">Click Send to execute the saved request. Open the History tab to review previous executions.</p> : (
                <div className="space-y-4 text-sm">
                  <div className="grid grid-cols-1 gap-2 text-muted sm:grid-cols-2">
                    <p>Executed: <span className="text-ink">{formatTime(result.executedAt)}</span></p>
                    <p>Execution ID: <code className="break-all text-xs text-ink">{result.executionId}</code></p>
                    {result.errorMessage && <p className="text-down">Execution error: {result.errorMessage}</p>}
                  </div>
                  <div className="flex items-start gap-2 rounded-lg border border-line p-3 text-muted"><ShieldAlert size={18} className="shrink-0" aria-hidden="true" /><p>Backend response body is hidden by security policy. This page deliberately does not attempt to reveal raw response data.</p></div>
                  <div>
                    <h3 className="mb-2 font-semibold text-ink">Allowed response metadata</h3>
                    <pre className="overflow-x-auto rounded-lg bg-surface p-3 text-xs text-ink">{JSON.stringify(result.responseHeaders ?? {}, null, 2)}</pre>
                  </div>
                  <div>
                    <h3 className="mb-2 font-semibold text-ink">Assertions ({Array.isArray(result.assertionResults) ? result.assertionResults.length : 0})</h3>
                    {!result.assertionResults?.length ? <p className="text-muted">No enabled assertions were evaluated.</p> : (
                      <div className="space-y-2">{result.assertionResults.map((a, i) => (
                        <div key={a.id ?? i} className="rounded-lg border border-line p-3">
                          <div className="flex flex-wrap items-center justify-between gap-2"><span className="font-medium text-ink">{a.type} {a.operator} {a.target ?? ""}</span><span className={a.passed ? "text-up" : "text-down"}>{a.passed ? "PASS" : "FAIL"}</span></div>
                          <p className="mt-1 text-xs text-muted">Actual: {String(a.actual ?? "—")} · Expected: {String(a.expected ?? "—")}{a.reason ? ` · ${a.reason}` : ""}</p>
                        </div>
                      ))}</div>
                    )}
                  </div>
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </>
  );
}
