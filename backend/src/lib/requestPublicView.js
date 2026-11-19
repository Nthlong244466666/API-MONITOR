import { publicUrl, containsEncryptedHeaders } from './secretsVault.js';

// No credentials are returned by REST CRUD. The URL query is stripped from the
// public representation; unrelated PATCHes preserve the underlying query.
export function toPublicRequest(record) {
  if (!record) return record;
  const { headers, body, ...safe } = record;
  const { url, hasQuery } = publicUrl(record.url, record.id);
  const hasHeaders = containsEncryptedHeaders(headers) ||
    (headers !== null && headers !== undefined && typeof headers === 'object' && Object.keys(headers).length > 0);
  return {
    ...safe, url, hasQuery,
    headers: null, body: null,
    hasHeaders,
    hasBody: body !== null && body !== undefined && String(body).length > 0,
  };
}
export function toPublicRequests(records) { return records.map(toPublicRequest); }
