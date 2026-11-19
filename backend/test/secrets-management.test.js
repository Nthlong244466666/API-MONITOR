import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID, randomBytes } from 'node:crypto';
import {
  encryptField, decryptField, encryptHeaders, decryptHeaders, encryptedRequestFields,
  decryptRequestForExecution, publicUrl, assertSecretsConfigured, SecretsConfigError,
} from '../src/lib/secretsVault.js';
import { toPublicRequest } from '../src/lib/requestPublicView.js';

const key = randomBytes(32).toString('hex');
process.env.API_MONITOR_SECRETS_KEY = key;
const requestId = randomUUID();

test('requires 32-byte hex key and does not accept weak key', () => {
  const old = process.env.API_MONITOR_SECRETS_KEY;
  process.env.API_MONITOR_SECRETS_KEY = 'weak';
  assert.throws(() => assertSecretsConfigured(), SecretsConfigError);
  process.env.API_MONITOR_SECRETS_KEY = old;
  assert.doesNotThrow(() => assertSecretsConfigured());
});

test('AES-GCM roundtrip for URL, header JSON and body', () => {
  const source = {
    id: requestId,
    name: 'Test', method: 'POST',
    url: 'https://api.example.com/v1/users?api_key=VERY_SECRET',
    headers: { Authorization: 'Bearer SECRET', Cookie: 'sid=SECRET' },
    body: '{"token":"SECRET"}',
  };
  const stored = { ...source, ...encryptedRequestFields(requestId, source) };
  assert.doesNotMatch(JSON.stringify(stored), /VERY_SECRET|Bearer SECRET|sid=SECRET|"token":"SECRET"/);
  const actual = decryptRequestForExecution(stored);
  assert.deepEqual(actual, source);
});

test('ciphertext is non-deterministic, tamper-evident and bound to request/field', () => {
  const encrypted = encryptField('SECRET', requestId, 'body');
  assert.notEqual(encryptField('SECRET', requestId, 'body'), encrypted);
  assert.equal(decryptField(encrypted, requestId, 'body'), 'SECRET');
  assert.throws(() => decryptField(encrypted, randomUUID(), 'body'), SecretsConfigError);
  assert.throws(() => decryptField(encrypted, requestId, 'url'), SecretsConfigError);
  const tampered = encrypted.slice(0, -2) + (encrypted.at(-2) === 'X' ? 'Y' : 'X') + encrypted.at(-1);
  assert.throws(() => decryptField(tampered, requestId, 'body'), SecretsConfigError);
});

test('wrong encryption key fails closed without leaking plaintext', () => {
  const value = encryptField('SECRET', requestId, 'url');
  const previous = process.env.API_MONITOR_SECRETS_KEY;
  process.env.API_MONITOR_SECRETS_KEY = randomBytes(32).toString('hex');
  assert.throws(() => decryptField(value, requestId, 'url'), SecretsConfigError);
  process.env.API_MONITOR_SECRETS_KEY = previous;
});

test('public request strips secret query, headers, body', () => {
  const request = { id: requestId, name: 'Test',
    ...encryptedRequestFields(requestId, {
      url: 'https://example.com/private?token=SECRET',
      headers: { 'x-api-key': 'SECRET' }, body: 'SECRET',
    }),
  };
  const result = toPublicRequest(request);
  assert.equal(result.url, 'https://example.com/private');
  assert.equal(result.hasQuery, true);
  assert.equal(result.hasBody, true);
  assert.equal(result.hasHeaders, true);
  assert.equal(result.headers, null);
  assert.equal(result.body, null);
  assert.doesNotMatch(JSON.stringify(result), /SECRET|amenc:v1:/);
});

test('empty headers and null body are represented correctly', () => {
  const record = { id: requestId, ...encryptedRequestFields(requestId, { url: 'https://example.com', headers: {}, body: null }) };
  // UI flag records presence of an encrypted JSON value even when empty.
  const result = toPublicRequest(record);
  assert.equal(result.hasBody, false);
  assert.deepEqual(decryptHeaders(record.headers, requestId), {});
  assert.equal(decryptField(record.url, requestId, 'url'), 'https://example.com');
});

test('legacy plaintext rows remain readable until migration', () => {
  const original = { id: requestId, url: 'https://example.com?q=secret', headers: { Authorization: 'secret' }, body: 'old' };
  assert.deepEqual(decryptRequestForExecution(original), original);
  assert.equal(publicUrl(original.url, requestId).url, 'https://example.com/');
});

test('malformed encrypted header object is rejected', () => {
  const bad = { __apiMonitorEncryptedV1: 'amenc:v1:xyz', other: 'plaintext' };
  assert.throws(() => decryptHeaders(bad, requestId), SecretsConfigError);
});

test('body clear and header replacement are independently encrypted', () => {
  const fields = encryptedRequestFields(requestId, { body: null, headers: { Authorization: 'new' } });
  assert.equal(fields.body, null);
  assert.deepEqual(decryptHeaders(fields.headers, requestId), { Authorization: 'new' });
  assert.equal(Object.hasOwn(fields, 'url'), false);
});
