import { sanitizeResponse } from './responseSanitizer.js';

// Historical rows, particularly from pre-v1.2, are not necessarily sanitized.
// Whitelist all outward fields rather than spreading a raw database object.
const safeErrors = new Set([
  'TIMEOUT', 'RESPONSE_TOO_LARGE', 'DNS_ERROR', 'INVALID_REQUEST_CONFIG',
  'NETWORK_ERROR', 'UNSAFE_TARGET',
]);
const safeReasons = new Set(['INVALID_RESPONSE_JSON', 'UNSUPPORTED_ASSERTION']);
const safeTypes = new Set(['STATUS', 'LATENCY', 'JSON']);
const safeOperators = new Set(['EQ', 'LT', 'LTE', 'EXISTS']);
const isHttpStatus = (v) => Number.isInteger(v) && v >= 100 && v <= 599;
const isMillis = (v) => Number.isInteger(v) && v >= 0 && v <= 86400000;
const safeId = (value) => typeof value === 'string' && /^[\da-f]{8}-(?:[\da-f]{4}-){3}[\da-f]{12}$/i.test(value) ? value : null;

export function safeAssertionResults(value) {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 50).map((item) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return null;
    const type = safeTypes.has(item.type) ? item.type : null;
    return {
      id: safeId(item.id),
      type, operator: safeOperators.has(item.operator) ? item.operator : null,
      // Legacy targets can be attacker-controlled or contain secrets.
      target: null,
      passed: item.passed === true,
      actual: type === 'STATUS' && isHttpStatus(item.actual) ? item.actual :
        type === 'LATENCY' && isMillis(item.actual) ? item.actual : null,
      expected: type === 'STATUS' && isHttpStatus(item.expected) ? item.expected :
        type === 'LATENCY' && isMillis(item.expected) ? item.expected : null,
      reason: safeReasons.has(item.reason) ? item.reason : null,
    };
  }).filter(Boolean);
}

export function publicExecution(row, detail = false) {
  const result = {
    executionId: row.id,
    executedAt: row.executedAt,
    statusCode: isHttpStatus(row.statusCode) ? row.statusCode : null,
    responseTimeMs: isMillis(row.responseTimeMs) ? row.responseTimeMs : null,
    isSuccess: row.isSuccess === true,
    errorMessage: row.errorMessage == null ? null :
      (safeErrors.has(row.errorMessage) ? row.errorMessage : 'EXECUTION_ERROR'),
  };
  if (detail) {
    result.responseBody = null;
    result.responseHeaders = sanitizeResponse(row.responseHeaders ?? {}).headers;
    result.assertionResults = safeAssertionResults(row.assertionResults);
  }
  return result;
}
