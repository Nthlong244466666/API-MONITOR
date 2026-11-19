import test from 'node:test';
import assert from 'node:assert/strict';
import { publicExecution, safeAssertionResults } from '../src/lib/historyPublicView.js';

const base = {
  id: '00000000-0000-4000-8000-000000000001', executedAt: new Date('2026-11-18T00:00:00Z'),
  statusCode: 302, responseTimeMs: 45, isSuccess: false,
  errorMessage: null,
  responseHeaders: { location: 'https://evil.invalid/?token=SECRET', 'set-cookie': 'sid=SECRET',
    'content-type': 'application/json; boundary=SECRET' },
  responseBody: 'Bearer SECRET',
  assertionResults: [{ id: '00000000-0000-4000-8000-000000000002', type: 'JSON', operator: 'EQ',
    target: 'SECRET', actual: 'SECRET', expected: 'SECRET', passed: false, reason: 'SECRET' }],
};
test('history list never includes raw responses or assertions', () => {
  const item = publicExecution(base);
  assert.equal(item.statusCode, 302);
  assert.equal(Object.hasOwn(item, 'responseBody'), false);
  assert.equal(Object.hasOwn(item, 'assertionResults'), false);
  assert.doesNotMatch(JSON.stringify(item), /SECRET/);
});
test('history detail sanitizes legacy persisted secrets', () => {
  const item = publicExecution(base, true);
  assert.equal(item.responseBody, null);
  assert.deepEqual(item.responseHeaders, { 'content-type': 'application/json' });
  assert.equal(item.assertionResults.length, 1);
  assert.equal(item.assertionResults[0].target, null);
  assert.doesNotMatch(JSON.stringify(item), /SECRET/);
});
test('numeric assertions retain only safe scalar fields', () => {
  const items = safeAssertionResults([{ id: '00000000-0000-4000-8000-000000000003',
    type: 'STATUS', operator: 'EQ', passed: true, actual: 404, expected: 404 }]);
  assert.equal(items[0].actual, 404);
  assert.equal(items[0].expected, 404);
});
test('unknown historic error messages are hidden', () => {
  assert.equal(publicExecution({ ...base, errorMessage: 'Authorization: SECRET' }).errorMessage, 'EXECUTION_ERROR');
});
