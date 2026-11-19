import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { join } from 'node:path';
const source = join(import.meta.dirname, '../frontend/src/services/requestApi.js');
const file = readFileSync(source, 'utf8');
const { createRequestApi, requestLibraryPath, requestStudioPath } = await import(`data:text/javascript,${encodeURIComponent(file)}`);
const calls = [];
const api = createRequestApi(async (...args) => { calls.push(args); return { ok: true }; });
test('path encodes all user controlled IDs', () => {
  assert.equal(requestLibraryPath('w/1', 'p?2'), '/workspaces/w%2F1/projects/p%3F2/requests');
  assert.equal(requestStudioPath('w/1', 'p?2', 'r#3'), '/workspaces/w%2F1/projects/p%3F2/requests/r%233');
});
test('GET detail uses saved-request endpoint', async () => {
  await api.get('w', 'p', 'r');
  assert.equal(calls.at(-1)[0], '/workspaces/w/projects/p/requests/r');
});
test('Execute calls POST /execute with empty JSON body', async () => {
  await api.execute('w', 'p', 'r');
  assert.deepEqual(calls.at(-1), ['/workspaces/w/projects/p/requests/r/execute', { method: 'POST', body: {} }]);
});
test('PATCH uses detail endpoint', async () => {
  const payload = { name: 'Saved', headers: { Accept: 'application/json' } };
  await api.update('w', 'p', 'r', payload);
  assert.deepEqual(calls.at(-1), ['/workspaces/w/projects/p/requests/r', { method: 'PATCH', body: payload }]);
});
test('DELETE keeps cascade confirmation', async () => {
  await api.remove('w', 'p', 'r', 'Sample');
  assert.deepEqual(calls.at(-1), ['/workspaces/w/projects/p/requests/r', { method: 'DELETE', body: { confirmName: 'Sample', confirmCascade: true } }]);
});
