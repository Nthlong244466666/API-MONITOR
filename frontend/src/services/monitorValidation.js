// No credentials or URL values are accepted in Monitor config; only saved Request ID.
export const MONITOR_INTERVALS = [60, 120, 300, 600, 900, 1800, 3600, 86400];
export function validateMonitorForm(draft, isEditing = false) {
  const name = String(draft.name ?? "").trim();
  const intervalSeconds = Number(draft.intervalSeconds);
  const timeoutMs = Number(draft.timeoutMs);
  const failureThreshold = Number(draft.failureThreshold);
  const recoveryThreshold = Number(draft.recoveryThreshold);
  if (name.length < 2 || name.length > 150) throw new Error("Tên Monitor phải có 2–150 ký tự.");
  if (!isEditing && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(draft.requestId ?? "")) {
    throw new Error("Hãy chọn Request hợp lệ trước khi tạo Monitor.");
  }
  if (!Number.isInteger(intervalSeconds) || intervalSeconds < 60 || intervalSeconds > 86400) throw new Error("Chu kỳ phải từ 60 đến 86400 giây.");
  if (!Number.isInteger(timeoutMs) || timeoutMs < 1000 || timeoutMs > 30000 || timeoutMs >= intervalSeconds * 1000) {
    throw new Error("Timeout phải từ 1000 đến 30000 ms và nhỏ hơn chu kỳ kiểm tra.");
  }
  for (const [label, n] of [["Ngưỡng lỗi", failureThreshold], ["Ngưỡng phục hồi", recoveryThreshold]]) {
    if (!Number.isInteger(n) || n < 1 || n > 20) throw new Error(`${label} phải từ 1 đến 20.`);
  }
  const payload = { name, intervalSeconds, timeoutMs, failureThreshold, recoveryThreshold, isEnabled: draft.isEnabled === true };
  return isEditing ? payload : { requestId: draft.requestId, ...payload };
}
