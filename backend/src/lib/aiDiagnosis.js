// Pure validators. No user-provided prompt or secrets in the diagnosis payload.
const text = (value, max = 500) => typeof value === 'string' ? value.trim().slice(0, max) : '';
const list = (value, maximum = 6) => Array.isArray(value)
  ? value.slice(0, maximum).map((item) => text(item, 400)).filter(Boolean) : [];
export function normalizeDiagnosis(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('AI_RESPONSE_INVALID');
  const summary = text(input.summary, 700);
  const possibleCauses = list(input.possibleCauses);
  const recommendedActions = list(input.recommendedActions);
  const evidence = list(input.evidence);
  const limitations = list(input.limitations);
  if (!summary || !possibleCauses.length || !recommendedActions.length) throw new Error('AI_RESPONSE_INVALID');
  const confidence = ['LOW', 'MEDIUM', 'HIGH'].includes(input.confidence) ? input.confidence : 'LOW';
  return { summary, confidence, possibleCauses, recommendedActions, evidence, limitations };
}
export const diagnosisJsonSchema = {
  type: 'object', additionalProperties: false,
  properties: {
    summary: {type:'string'}, confidence:{type:'string',enum:['LOW','MEDIUM','HIGH']},
    possibleCauses:{type:'array',items:{type:'string'}},
    recommendedActions:{type:'array',items:{type:'string'}},
    evidence:{type:'array',items:{type:'string'}},
    limitations:{type:'array',items:{type:'string'}},
  },
  required:['summary','confidence','possibleCauses','recommendedActions','evidence','limitations'],
};
export function safeCheck(check) {
  return {
    checkedAt: check.checkedAt instanceof Date ? check.checkedAt.toISOString() : check.checkedAt,
    statusCode: Number.isInteger(check.statusCode) ? check.statusCode : null,
    responseTimeMs: Number.isFinite(check.responseTimeMs) ? check.responseTimeMs : null,
    isSuccess: check.isSuccess === true,
    // Error codes from internal worker are mapped to a strict allowlist.
    errorCode: ['TIMEOUT','DNS_ERROR','UNSAFE_TARGET','NETWORK_ERROR','INVALID_REQUEST_CONFIG','RESPONSE_TOO_LARGE']
      .includes(check.errorMessage) ? check.errorMessage : null,
  };
}
export function buildAiContext(incident, checks) {
  return {
    incident: { status: incident.status,
      reason: ['MONITOR_FAILURE_THRESHOLD'].includes(incident.reason) ? incident.reason : 'OTHER',
      startedAt: incident.startedAt.toISOString(),
      resolvedAt: incident.resolvedAt?.toISOString() ?? null,
    },
    monitor: {
      status: incident.monitor.status,
      failureThreshold: incident.monitor.failureThreshold,
      recoveryThreshold: incident.monitor.recoveryThreshold,
      intervalSeconds: incident.monitor.intervalSeconds,
    },
    checks: checks.slice(0, 12).map(safeCheck),
  };
}
