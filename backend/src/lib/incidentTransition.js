// Pure policy: only transitions into DOWN or UP can emit an incident event.
// UNKNOWN -> UP has no prior outage to resolve.
export function incidentEvent(previousStatus, nextStatus) {
  if (previousStatus === nextStatus) return null;
  if (nextStatus === 'DOWN') return 'OPENED';
  if (nextStatus === 'UP' && previousStatus === 'DOWN') return 'RESOLVED';
  return null;
}

export function incidentReason() {
  return 'MONITOR_FAILURE_THRESHOLD';
}

export function notificationMessage(type) {
  if (type === 'OPENED') return 'A monitor has entered the DOWN state.';
  if (type === 'RESOLVED') return 'A monitor has recovered to the UP state.';
  throw new TypeError('Unsupported notification type');
}
