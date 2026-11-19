import { useCallback, useEffect, useState } from "react";
import { RefreshCw, ShieldAlert } from "lucide-react";

const button = "inline-flex items-center justify-center gap-2 rounded-lg border border-line px-3 py-2 text-sm text-ink hover:bg-panel-hover disabled:opacity-50";
const input = "rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-brand disabled:opacity-50";

export function formatExecutedAt(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString("vi-VN");
}

export default function ExecutionHistoryPanel({ api, workspaceId, projectId, requestId, refreshKey = 0 }) {
  const [success, setSuccess] = useState("all");
  const [pageSize, setPageSize] = useState(10);
  const [items, setItems] = useState([]);
  const [cursor, setCursor] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [revision, setRevision] = useState(0);
  const [error, setError] = useState("");
  const [selectedId, setSelectedId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [detailError, setDetailError] = useState("");
  const [detailLoading, setDetailLoading] = useState(false);
  const reload = useCallback(() => setRevision((n) => n + 1), []);

  // Changing filter or receiving a new execution resets the cursor to page one.
  useEffect(() => {
    let live = true;
    setLoading(true); setItems([]); setCursor(null); setHasMore(false); setError("");
    setSelectedId(null); setDetail(null);
    api.listExecutions(workspaceId, projectId, requestId, {
      limit: pageSize, ...(success === "all" ? {} : { success: success === "pass" }),
    }).then((data) => {
      if (!live) return;
      setItems(data.items ?? []);
      setCursor(data.nextCursor ?? null);
      setHasMore(data.hasMore === true);
    }).catch((err) => { if (live) setError(err?.message ?? "Không thể tải lịch sử."); })
      .finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, [api, workspaceId, projectId, requestId, success, pageSize, revision, refreshKey]);

  useEffect(() => {
    if (!selectedId) return;
    let live = true;
    setDetail(null); setDetailError(""); setDetailLoading(true);
    api.getExecution(workspaceId, projectId, requestId, selectedId)
      .then((data) => { if (live) setDetail(data); })
      .catch((err) => { if (live) setDetailError(err?.message ?? "Không thể tải chi tiết."); })
      .finally(() => { if (live) setDetailLoading(false); });
    return () => { live = false; };
  }, [api, workspaceId, projectId, requestId, selectedId]);

  async function more() {
    if (!hasMore || !cursor || loadingMore) return;
    setLoadingMore(true); setError("");
    try {
      const data = await api.listExecutions(workspaceId, projectId, requestId, {
        limit: pageSize, cursor, ...(success === "all" ? {} : { success: success === "pass" }),
      });
      setItems((old) => {
        const existing = new Set(old.map((row) => row.executionId));
        return [...old, ...(data.items ?? []).filter((row) => !existing.has(row.executionId))];
      });
      setCursor(data.nextCursor ?? null); setHasMore(data.hasMore === true);
    } catch (err) { setError(err?.message ?? "Không thể tải trang kế tiếp."); }
    finally { setLoadingMore(false); }
  }

  return <section className="space-y-4" aria-label="Lịch sử thực thi">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><h2 className="font-semibold text-ink">Execution History</h2><p className="text-xs text-muted">Lần chạy mới nhất ở trên. Không hiển thị response body hoặc secrets.</p></div>
      <button type="button" disabled={loading || loadingMore} className={button} onClick={reload}><RefreshCw size={15}/> Tải lại</button>
    </div>
    <div className="flex flex-wrap gap-3">
      <label className="flex items-center gap-2 text-sm text-muted">Kết quả
        <select className={input} value={success} onChange={(e) => setSuccess(e.target.value)} disabled={loadingMore}>
          <option value="all">Tất cả</option><option value="pass">PASS</option><option value="fail">FAIL</option>
        </select>
      </label>
      <label className="flex items-center gap-2 text-sm text-muted">Số dòng/trang
        <select className={input} value={pageSize} onChange={(e) => setPageSize(Number(e.target.value))} disabled={loadingMore}>
          <option value={5}>5</option><option value={10}>10</option><option value={20}>20</option><option value={50}>50</option>
        </select>
      </label>
    </div>
    {error && <p role="alert" className="rounded-lg border border-down/40 bg-down/10 p-3 text-sm text-down">{error}</p>}
    {loading ? <p className="text-sm text-muted">Đang tải lịch sử...</p> : items.length === 0 ? <p className="text-sm text-muted">Không có lần thực thi nào phù hợp bộ lọc.</p> : <div className="overflow-x-auto rounded-lg border border-line">
      <table className="min-w-[620px] w-full text-left text-sm">
        <thead className="bg-surface text-xs text-muted"><tr><th className="px-3 py-3">Thời gian</th><th className="px-3 py-3">HTTP</th><th className="px-3 py-3">Latency</th><th className="px-3 py-3">Kết quả</th><th className="px-3 py-3">Chi tiết</th></tr></thead>
        <tbody>{items.map((row) => <tr key={row.executionId} className="border-t border-line hover:bg-panel-hover">
          <td className="px-3 py-3 whitespace-nowrap text-ink">{formatExecutedAt(row.executedAt)}</td>
          <td className="px-3 py-3">{row.statusCode ?? "—"}</td>
          <td className="px-3 py-3">{row.responseTimeMs == null ? "—" : `${row.responseTimeMs} ms`}</td>
          <td className={`px-3 py-3 font-medium ${row.isSuccess ? "text-up" : "text-down"}`}>{row.isSuccess ? "PASS" : "FAIL"}</td>
          <td className="px-3 py-3"><button className="text-brand underline underline-offset-2" type="button" onClick={() => setSelectedId(row.executionId)} aria-label={`Xem execution ${row.executionId}`}>Xem</button></td>
        </tr>)}</tbody>
      </table>
    </div>}
    {hasMore && <button type="button" disabled={loading || loadingMore} onClick={more} className={button}>{loadingMore ? "Đang tải..." : "Tải thêm lịch sử"}</button>}
    {selectedId && <div className="space-y-3 rounded-lg border border-line bg-surface p-4" aria-label="Chi tiết lần thực thi">
      <div className="flex items-center justify-between gap-2"><h3 className="font-semibold text-ink">Execution Detail</h3><button type="button" className={button} onClick={() => { setSelectedId(null); setDetail(null); }}>Đóng</button></div>
      <p className="break-all font-mono text-xs text-muted">ID: {selectedId}</p>
      {detailLoading && <p className="text-sm text-muted">Đang tải chi tiết...</p>}
      {detailError && <p role="alert" className="text-sm text-down">{detailError}</p>}
      {detail && <div className="space-y-3 text-sm">
        <p className="text-ink">{formatExecutedAt(detail.executedAt)} · HTTP {detail.statusCode ?? "—"} · {detail.responseTimeMs ?? "—"} ms · <span className={detail.isSuccess ? "text-up" : "text-down"}>{detail.isSuccess ? "PASS" : "FAIL"}</span></p>
        {detail.errorMessage && <p className="text-down">Lỗi: {detail.errorMessage}</p>}
        <div className="flex gap-2 rounded-lg border border-line p-3 text-muted"><ShieldAlert size={18} className="shrink-0"/><p>Response body và dữ liệu JSON nhạy cảm được ẩn theo chính sách bảo mật.</p></div>
        <div><h4 className="mb-2 font-semibold text-ink">Response metadata</h4><pre className="overflow-x-auto rounded-lg bg-panel p-3 text-xs text-ink">{JSON.stringify(detail.responseHeaders ?? {}, null, 2)}</pre></div>
        <div><h4 className="mb-2 font-semibold text-ink">Assertions ({detail.assertionResults?.length ?? 0})</h4>
          {!detail.assertionResults?.length ? <p className="text-muted">Không có Assertion được đánh giá.</p> : <div className="space-y-2">{detail.assertionResults.map((a, index) => <div key={`${a.id ?? "item"}-${index}`} className="rounded-lg border border-line p-3">
            <div className="flex flex-wrap justify-between gap-2"><span className="text-ink">{a.type} {a.operator}</span><span className={a.passed ? "text-up" : "text-down"}>{a.passed ? "PASS" : "FAIL"}</span></div>
            <p className="mt-1 text-xs text-muted">Actual: {a.actual ?? "[hidden]"} · Expected: {a.expected ?? "[hidden]"}{a.reason ? ` · ${a.reason}` : ""}</p>
          </div>)}</div>}
        </div>
      </div>}
    </div>}
  </section>;
}
