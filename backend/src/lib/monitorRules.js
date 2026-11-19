export const MIN_INTERVAL_SECONDS = 60;
export const MAX_INTERVAL_SECONDS = 86400;
export const MAX_MONITORS_PER_USER = 20;
export const MAX_MONITOR_TIMEOUT_MS = 30000;

export function nextDueTime(now, intervalSeconds) {
  return new Date(now.getTime() + intervalSeconds * 1000);
}

export function stateAfterCheck(monitor, success) {
  const failures = success ? 0 : monitor.consecutiveFailures + 1;
  const successes = success ? monitor.consecutiveSuccesses + 1 : 0;
  let status = monitor.status;
  if (success && successes >= monitor.recoveryThreshold) status = 'UP';
  if (!success && failures >= monitor.failureThreshold) status = 'DOWN';
  return { status, consecutiveFailures: failures, consecutiveSuccesses: successes };
}

export function safeFailureCode(error) {
  const code = String(error?.code ?? '');
  if (code === 'TIMEOUT' || code === 'ETIMEDOUT' || code === 'ABORT_ERR') return 'TIMEOUT';
  if (code === 'RESPONSE_TOO_LARGE') return 'RESPONSE_TOO_LARGE';
  if (['DNS_ERROR', 'ENOTFOUND', 'EAI_AGAIN'].includes(code)) return 'DNS_ERROR';
  if (code === 'INVALID_REQUEST_CONFIG') return 'INVALID_REQUEST_CONFIG';
  if (code === 'UNSAFE_TARGET') return 'UNSAFE_TARGET';
  return 'NETWORK_ERROR';
}
