// Public response metadata only. Target-controlled headers and bodies are untrusted:
// do NOT echo raw values (including Location, Set-Cookie or custom headers).
export const REDACTED_RESPONSE_BODY = '[Response body hidden for security]';

const SAFE_MIME_TYPES = new Set([
  'application/json', 'application/problem+json', 'application/xml',
  'text/plain', 'text/html', 'text/xml', 'text/csv',
  'application/octet-stream', 'application/pdf',
]);

export function sanitizeResponse(headers = {}, _rawBody = '') {
  const safeHeaders = {};
  // Only return normalized, explicitly recognized content types, never parameters
  // such as boundary, charset, or arbitrary attacker-controlled strings.
  const contentType = headers?.['content-type'];
  if (typeof contentType === 'string') {
    const mime = contentType.split(';', 1)[0].trim().toLowerCase();
    if (SAFE_MIME_TYPES.has(mime)) safeHeaders['content-type'] = mime;
  }

  // Content-Length is merely a hint from the target, not a trusted response size.
  // Cap its string length and canonicalize its numeric representation.
  const length = headers?.['content-length'];
  if (typeof length === 'string' && /^\d{1,8}$/.test(length)) {
    const parsed = Number(length);
    if (Number.isSafeInteger(parsed)) safeHeaders['content-length'] = String(parsed);
  }
  return { headers: safeHeaders, preview: REDACTED_RESPONSE_BODY };
}
