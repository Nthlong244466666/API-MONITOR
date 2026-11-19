import test from 'node:test';
import assert from 'node:assert/strict';
import { isPublicIp, validateTargetUrl, resolvePublicAddress, UnsafeTargetError } from '../src/lib/ssrfGuard.js';
import { checkedHeaders } from '../src/lib/safeHttpClient.js';
import { evaluateAssertions } from '../src/services/assertion.service.js';
import { sanitizeResponse, REDACTED_RESPONSE_BODY } from '../src/lib/responseSanitizer.js';
import { toPublicRequest, toPublicRequests } from '../src/lib/requestPublicView.js';

const blocked = [
  'http://127.0.0.1:3000', 'http://localhost', 'http://192.168.1.1',
  'http://10.0.0.1', 'http://172.16.0.1', 'http://169.254.169.254',
  'http://[::1]', 'http://[::ffff:127.0.0.1]',
  'http://[64:ff9b::a9fe:a9fe]', 'http://[2002:c0a8:0101::]',
  'http://[2001:db8::1]', 'http://example.com:8080',
  'file:///etc/passwd', 'http://user:pass@example.com',
];
for (const url of blocked) {
  test(`SSRF guard blocks ${url}`, () => assert.throws(() => validateTargetUrl(url), UnsafeTargetError));
}
test('public IP policy', () => {
  assert.equal(isPublicIp('8.8.8.8'), true);
  assert.equal(isPublicIp('1.1.1.1'), true);
  assert.equal(isPublicIp('2001:4860:4860::8888'), true);
  assert.equal(isPublicIp('100.64.1.1'), false);
  assert.equal(isPublicIp('198.18.0.1'), false);
  assert.equal(isPublicIp('2001:db8::1'), false);
});
test('accepts safe HTTPS URL', () => assert.equal(validateTargetUrl('https://example.com/path').hostname, 'example.com'));
test('request headers block hop-by-hop and forwarding', () => {
  assert.throws(() => checkedHeaders({ 'Transfer-Encoding': 'chunked' }));
  assert.throws(() => checkedHeaders({ 'x-forwarded-host': 'localhost' }));
  assert.equal(checkedHeaders({ Authorization: 'Bearer test' }).authorization, 'Bearer test');
});
test('explicit STATUS 404 assertion can pass', () => {
  const outcome = evaluateAssertions([{
    id: 'a', isEnabled: true, type: 'STATUS', operator: 'EQ', expectedValue: 404,
  }], { statusCode: 404, responseTimeMs: 25, responseBody: '{}' });
  assert.equal(outcome.isSuccess, true);
});
test('response body never echoed, even with ordinary JSON keys or Bearer tokens', () => {
  for (const body of ['{"data":"Bearer SECRET"}', '{"token":"SECRET"}', 'SECRET', '<html>SECRET</html>']) {
    const result = sanitizeResponse({ 'content-type': 'application/json' }, body);
    assert.equal(result.preview, REDACTED_RESPONSE_BODY);
    assert.doesNotMatch(JSON.stringify(result), /SECRET/);
  }
});
test('response Location and unsafe headers never exposed', () => {
  const result = sanitizeResponse({
    location: 'https://example.com/?token=SECRET',
    'set-cookie': 'session=SECRET',
    'www-authenticate': 'Bearer SECRET',
    'content-type': 'application/json; charset=SECRET',
    'content-length': '215',
  }, 'SECRET');
  assert.deepEqual(result.headers, { 'content-type': 'application/json', 'content-length': '215' });
  assert.doesNotMatch(JSON.stringify(result), /SECRET/);
});
test('malformed content-type/length are not echoed', () => {
  const result = sanitizeResponse({ 'content-type': 'x/SECRET', 'content-length': 'SECRET' }, '');
  assert.deepEqual(result.headers, {});
});
test('request CRUD projection hides all stored header/body values', () => {
  const request = { id: 'id', name: 'Test', url: 'https://example.com',
    headers: { Authorization: 'Bearer SECRET', 'x-unknown': 'SECRET', Cookie: 'sid=SECRET' },
    body: '{"data":"SECRET"}',
  };
  const projected = toPublicRequest(request);
  assert.equal(projected.id, 'id');
  assert.equal(projected.url, request.url);
  assert.equal(projected.hasHeaders, true);
  assert.equal(projected.hasBody, true);
  assert.equal(projected.headers, null);
  assert.equal(projected.body, null);
  assert.doesNotMatch(JSON.stringify(projected), /SECRET/);
  assert.deepEqual(request.headers.Authorization, 'Bearer SECRET'); // no mutation
  assert.equal(toPublicRequests([request]).length, 1);
});
test('missing header/body flags are false', () => {
  assert.deepEqual([toPublicRequest({ headers: null, body: null }).hasHeaders,
    toPublicRequest({ headers: {}, body: '' }).hasBody], [false, false]);
});

test('DNS result with mixed public/private IP is rejected', async () => {
  const resolver = async () => [
    { address: '8.8.8.8', family: 4 },
    { address: '127.0.0.1', family: 4 },
  ];
  await assert.rejects(() => resolvePublicAddress('example.com', resolver), UnsafeTargetError);
});
test('DNS response with public IP is allowed and pinned', async () => {
  const resolver = async () => [{ address: '1.1.1.1', family: 4 }];
  assert.deepEqual(await resolvePublicAddress('example.com', resolver), { address: '1.1.1.1', family: 4 });
});
