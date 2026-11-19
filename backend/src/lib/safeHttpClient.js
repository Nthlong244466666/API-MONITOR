import http from 'node:http';
import https from 'node:https';
import { isIP } from 'node:net';
import { resolvePublicAddress, validateTargetUrl, UnsafeTargetError } from './ssrfGuard.js';

export const EXECUTION_TIMEOUT_MS = 10_000;
export const MAX_RESPONSE_BYTES = 1_048_576;

const FORBIDDEN_HEADERS = new Set([
  'host','connection','proxy-connection','proxy-authorization','proxy-authenticate',
  'transfer-encoding','content-length','keep-alive','upgrade','te','trailer','expect',
  'accept-encoding','via','forwarded',
]);

export function checkedHeaders(input) {
  if (input == null) return { accept: 'application/json, text/plain, */*', 'accept-encoding': 'identity' };
  if (typeof input !== 'object' || Array.isArray(input)) throw new Error('Invalid request headers');
  const entries = Object.entries(input);
  if (entries.length > 100) throw new Error('Too many request headers');
  const output = { accept: 'application/json, text/plain, */*', 'accept-encoding': 'identity' };
  for (const [name, value] of entries) {
    const lower = name.toLowerCase();
    if (!/^[!#$%&'*+.^_`|~0-9A-Za-z-]{1,128}$/.test(name) ||
      FORBIDDEN_HEADERS.has(lower) || lower.startsWith('proxy-') || lower.startsWith('x-forwarded-') ||
      typeof value !== 'string' || value.length > 8192 || /[\r\n\0]/.test(value)) {
      throw Object.assign(new Error('Unsupported or unsafe request header'), { code: 'INVALID_REQUEST_CONFIG' });
    }
    output[lower] = value;
  }
  return output;
}

export async function safeHttpRequest({ url: rawUrl, method, headers, body, timeoutMs = EXECUTION_TIMEOUT_MS }) {
  if (!Number.isInteger(timeoutMs) || timeoutMs < 1000 || timeoutMs > 30000) {
    throw Object.assign(new Error('Invalid timeout'), { code: 'INVALID_REQUEST_CONFIG' });
  }
  const deadline = AbortSignal.timeout(timeoutMs);
  const timedOut = () => Object.assign(new Error('Request timed out'), { code: 'TIMEOUT' });
  const abortPromise = new Promise((_, reject) => {
    deadline.addEventListener('abort', () => reject(timedOut()), { once: true });
  });

  const work = (async () => {
  const url = validateTargetUrl(rawUrl);
  const hostname = url.hostname.replace(/^\[|\]$/g, '');
  const chosen = await resolvePublicAddress(hostname);
  if (deadline.aborted) throw timedOut();
  const requestHeaders = checkedHeaders(headers);
  if ((method === 'GET' || method === 'HEAD') && body != null && body.length > 0) {
    throw Object.assign(new Error('GET/HEAD bodies are not supported'), { code: 'INVALID_REQUEST_CONFIG' });
  }
  const requestBody = body == null ? null : Buffer.from(body, 'utf8');
  if (requestBody && requestBody.length > 100_000) {
    throw Object.assign(new Error('Request body exceeds size limit'), { code: 'INVALID_REQUEST_CONFIG' });
  }
  if (requestBody) requestHeaders['content-length'] = String(requestBody.length);
  const isHttps = url.protocol === 'https:';
  const client = isHttps ? https : http;
  const started = performance.now();

  return new Promise((resolve, reject) => {
    let settled = false;
    const rejectOnce = (error) => {
      if (settled) return;
      settled = true;
      reject(error);
    };
    const request = client.request({
      protocol: url.protocol,
      hostname,
      port: url.port || (isHttps ? 443 : 80),
      path: `${url.pathname}${url.search}`,
      method,
      headers: requestHeaders,
      agent: false, // Never reuse a connection from another target.
      autoSelectFamily: false, // Single vetted IP; do not do extra address racing.
      signal: deadline,
      timeout: timeoutMs,
      maxHeaderSize: 16_384,
      // The hostname remains intact for Host, SNI, and certificate verification.
      ...(isHttps && { rejectUnauthorized: true, servername: isIP(hostname) ? '' : hostname }),
      lookup: (_ignoredHostname, _options, callback) => {
        // Pin the only destination address to the one already checked.
        callback(null, chosen.address, chosen.family);
      },
    }, (response) => {
      const chunks = [];
      let size = 0;
      response.on('data', (chunk) => {
        size += chunk.length;
        if (size > MAX_RESPONSE_BYTES) {
          request.destroy(Object.assign(new Error('Response size limit exceeded'), { code: 'RESPONSE_TOO_LARGE' }));
          return;
        }
        chunks.push(chunk);
      });
      response.on('end', () => {
        if (settled) return;
        settled = true;
        resolve({
          statusCode: response.statusCode ?? null,
          responseTimeMs: Math.round(performance.now() - started),
          responseHeaders: response.headers,
          responseBody: Buffer.concat(chunks).toString('utf8'),
        });
      });
      response.on('error', rejectOnce);
    });
    request.on('timeout', () => {
      request.destroy(Object.assign(new Error('Request timed out'), { code: 'TIMEOUT' }));
    });
    request.on('error', (error) => rejectOnce(deadline.aborted ? timedOut() : error));
    if (requestBody) request.end(requestBody);
    else request.end();
  });
  })();
  return Promise.race([work, abortPromise]);
}

export { UnsafeTargetError };
