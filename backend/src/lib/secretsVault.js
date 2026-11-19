import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

const PREFIX = 'amenc:v1:';
const FIELD_MARKER = '__apiMonitorEncryptedV1';
let cachedKeyText;
let cachedKey;

export class SecretsConfigError extends Error {
  constructor(message = 'Secrets encryption key is missing or invalid') {
    super(message);
    this.name = 'SecretsConfigError';
    this.code = 'SECRETS_CONFIGURATION_ERROR';
  }
}

function key() {
  const raw = process.env.API_MONITOR_SECRETS_KEY;
  if (raw === cachedKeyText && cachedKey) return cachedKey;
  // 32 random bytes represented by exactly 64 hex digits. Never accept weak strings.
  if (typeof raw !== 'string' || !/^[a-f0-9]{64}$/i.test(raw)) {
    throw new SecretsConfigError('API_MONITOR_SECRETS_KEY must be a 64-character hex string (32 random bytes)');
  }
  cachedKeyText = raw;
  cachedKey = Buffer.from(raw, 'hex');
  return cachedKey;
}

export function assertSecretsConfigured() { key(); }
export function isEncrypted(value) {
  return typeof value === 'string' && value.startsWith(PREFIX);
}

// Bind ciphertext to a particular database record and field. DB row swaps fail authentication.
export function encryptField(plaintext, requestId, field) {
  if (typeof plaintext !== 'string') throw new TypeError('Expected text');
  const nonce = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key(), nonce);
  cipher.setAAD(Buffer.from(`api-monitor:request:${requestId}:${field}:v1`));
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  return `${PREFIX}${Buffer.concat([nonce, cipher.getAuthTag(), ciphertext]).toString('base64url')}`;
}

export function decryptField(value, requestId, field) {
  if (typeof value !== 'string') throw new TypeError('Expected text');
  // Transitional read of older plaintext rows; run migration before external deployment.
  if (!isEncrypted(value)) return value;
  const raw = Buffer.from(value.slice(PREFIX.length), 'base64url');
  if (raw.length < 28) throw new SecretsConfigError('Corrupted encrypted request field');
  try {
    const decipher = createDecipheriv('aes-256-gcm', key(), raw.subarray(0, 12));
    decipher.setAAD(Buffer.from(`api-monitor:request:${requestId}:${field}:v1`));
    decipher.setAuthTag(raw.subarray(12, 28));
    return Buffer.concat([decipher.update(raw.subarray(28)), decipher.final()]).toString('utf8');
  } catch {
    throw new SecretsConfigError('Cannot decrypt request field: key mismatch or corrupted data');
  }
}

export function encryptHeaders(headers, requestId) {
  if (headers == null) return headers;
  const value = JSON.stringify(headers);
  return { [FIELD_MARKER]: encryptField(value, requestId, 'headers') };
}

export function decryptHeaders(headers, requestId) {
  if (headers == null) return headers;
  if (typeof headers !== 'object' || Array.isArray(headers)) throw new SecretsConfigError('Invalid stored request headers');
  if (!Object.hasOwn(headers, FIELD_MARKER)) return headers; // legacy plaintext
  const keys = Object.keys(headers);
  if (keys.length !== 1 || typeof headers[FIELD_MARKER] !== 'string' || !isEncrypted(headers[FIELD_MARKER])) {
    throw new SecretsConfigError('Malformed encrypted request headers');
  }
  try {
    const decoded = JSON.parse(decryptField(headers[FIELD_MARKER], requestId, 'headers'));
    if (!decoded || typeof decoded !== 'object' || Array.isArray(decoded)) throw new Error('Invalid JSON object');
    return decoded;
  } catch (error) {
    if (error instanceof SecretsConfigError) throw error;
    throw new SecretsConfigError('Corrupted encrypted request headers');
  }
}

export function containsEncryptedHeaders(headers) {
  return headers != null && typeof headers === 'object' && !Array.isArray(headers) && Object.hasOwn(headers, FIELD_MARKER);
}

// Do not return URL query values through CRUD. Updates use the unredacted stored
// URL when a frontend sends back exactly the displayed redacted URL.
export function publicUrl(storedUrl, requestId) {
  if (storedUrl == null) return { url: storedUrl, hasQuery: false };
  const plain = decryptField(storedUrl, requestId, 'url');
  const u = new URL(plain);
  const hasQuery = Boolean(u.search);
  u.search = '';
  u.hash = '';
  return { url: hasQuery ? u.toString() : (plain.includes('#') ? u.toString() : plain), hasQuery };
}

export function encryptedRequestFields(requestId, { url, headers, body }) {
  return {
    ...(url !== undefined && { url: encryptField(url, requestId, 'url') }),
    ...(headers !== undefined && { headers: encryptHeaders(headers, requestId) }),
    ...(body !== undefined && { body: body === null ? null : encryptField(body, requestId, 'body') }),
  };
}

export function decryptRequestForExecution(record) {
  return {
    ...record,
    url: decryptField(record.url, record.id, 'url'),
    headers: decryptHeaders(record.headers, record.id),
    body: record.body == null ? null : decryptField(record.body, record.id, 'body'),
  };
}
