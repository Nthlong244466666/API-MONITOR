import { useEffect, useState } from "react";

const button = "rounded-lg border border-line px-3 py-2 text-sm text-ink hover:bg-panel-hover disabled:opacity-50";
const fmt = (value) => value ? new Date(value).toLocaleString("vi-VN") : "—";

export default function MonitorChecks({ api, monitorId }) {
  const [items, setItems] = useState([]);
  const [cursor, setCursor] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const [limit, setLimit] = useState(10);
  const [revision, setRevision] = useState(0);
  const [loading, setLoading] = useState(true);
  const [moreBusy, setMoreBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    setLoading(true); setError(""); setItems([]); setCursor(null); setHasMore(false);
    api.checks(monitorId, { limit }).then((data) => {
      if (!active) return;
      setItems(data.items ?? []); setCursor(data.nextCursor ?? null); setHasMore(data.hasMore === true);
    }).catch((e) => { if (active) setError(e?.message ?? "Không tải được lịch sử."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [api, monitorId, limit, revision]);

  async function loadMore() {
    if (!hasMore || !cursor || loading || moreBusy) return;
    setMoreBusy(true); setError("");
    try {
      const data = await api.checks(monitorId, { limit, cursor });
      setItems((old) => { const ids = new Set(old.map((r) => r.id)); return [...old, ...(data.items ?? []).filter((r) => !ids.has(r.id))]; });
      setCursor(data.nextCursor ?? null); setHasMore(data.hasMore === true);
    } catch (e) { setError(e?.message ?? "Không tải được trang tiếp theo."); }
    finally { setMoreBusy(false); }
  }
  return <section className="space-y-3 rounded-xl border border-line bg-panel p-4 sm:p-5" aria-label="Lịch sử giám sát">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><h2 className="font-semibold text-ink">Lịch sử tự động (MonitorCheck)</h2><p className="text-xs text-muted">Dữ liệu chỉ chứa metadata, không có URL, token hay response body.</p></div>
      <div className="flex items-center gap-2"><label className="text-xs text-muted">Số dòng <select className="ml-1 rounded border border-line bg-surface p-2 text-ink" value={limit} onChange={(e) => setLimit(Number(e.target.value))}>{[5,10,20,50].map((n) => <option key={n} value={n}>{n}</option>)}</select></label><button type="button" className={button} onClick={() => setRevision((n) => n + 1)} disabled={loading || moreBusy}>Tải lại</button></div>
    </div>
    {error && <p role="alert" className="text-sm text-down">{error}</p>}
    {loading ? <p className="text-sm text-muted">Đang tải lịch sử...</p> : !items.length ? <p className="text-sm text-muted">Chưa có lượt check tự động nào.</p> : <div className="overflow-x-auto rounded-lg border border-line"><table className="w-full min-w-[630px] text-left text-sm">
      <thead className="bg-surface text-xs text-muted"><tr><th className="px-3 py-3">Thời gian</th><th className="px-3 py-3">HTTP</th><th className="px-3 py-3">Thời gian đáp ứng</th><th className="px-3 py-3">Kết quả</th><th className="px-3 py-3">Mã lỗi</th></tr></thead>
      <tbody>{items.map((r) => <tr key={r.id} className="border-t border-line"><td className="px-3 py-3 whitespace-nowrap">{fmt(r.checkedAt)}</td><td className="px-3 py-3">{r.statusCode ?? "—"}</td><td className="px-3 py-3">{r.responseTimeMs == null ? "—" : `${r.responseTimeMs} ms`}</td><td className={`px-3 py-3 font-semibold ${r.isSuccess ? "text-up" : "text-down"}`}>{r.isSuccess ? "PASS" : "FAIL"}</td><td className="px-3 py-3 text-muted">{r.errorMessage ?? "—"}</td></tr>)}</tbody>
    </table></div>}
    {hasMore && <button type="button" className={button} disabled={loading || moreBusy} onClick={loadMore}>{moreBusy ? "Đang tải..." : "Tải thêm"}</button>}
  </section>;
}
