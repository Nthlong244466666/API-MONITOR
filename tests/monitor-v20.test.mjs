import test from 'node:test';
import assert from 'node:assert/strict';
import { createMonitorApi, monitorDetailPath } from '../frontend/src/services/monitorApi.js';
import { validateMonitorForm } from '../frontend/src/services/monitorValidation.js';

const valid = { requestId: 'ef61b542-c383-447c-8c66-a135e230633e', name: 'Monitor v2 Test', intervalSeconds: 60, timeoutMs: 10000, failureThreshold: 2, recoveryThreshold: 2, isEnabled: true };
const make = () => { const calls = []; const api = createMonitorApi(async (url, options) => { calls.push({ url, options }); return { ok: true }; }); return { api, calls }; };

test('create payload validates numeric settings', () => assert.deepEqual(validateMonitorForm(valid), valid));
test('rejects invalid request ID', () => assert.throws(() => validateMonitorForm({ ...valid, requestId: 'bad' }), /Request/));
test('rejects timeout >= interval', () => assert.throws(() => validateMonitorForm({ ...valid, timeoutMs: 61000 }), /Timeout/));
test('rejects invalid thresholds', () => assert.throws(() => validateMonitorForm({ ...valid, recoveryThreshold: 21 }), /Ngưỡng/));
test('editing does not send requestId', () => { const patch = validateMonitorForm({ ...valid, requestId: 'wrong' }, true); assert.equal('requestId' in patch, false); });
test('monitor detail path encodes ID', () => assert.equal(monitorDetailPath('a/b'), '/monitors/a%2Fb'));
test('list uses /monitors', async () => { const { api, calls } = make(); await api.list(); assert.equal(calls[0].url, '/monitors'); });
test('create uses POST', async () => { const { api, calls } = make(); await api.create(valid); assert.equal(calls[0].options.method, 'POST'); });
test('update uses PATCH', async () => { const { api, calls } = make(); await api.update('some-id', { isEnabled: false }); assert.equal(calls[0].options.method, 'PATCH'); });
test('delete uses DELETE', async () => { const { api, calls } = make(); await api.remove('some-id'); assert.equal(calls[0].options.method, 'DELETE'); });
test('checks sets limit and cursor', async () => { const { api, calls } = make(); await api.checks('m', { limit: 2, cursor: 'c' }); assert.equal(calls[0].url, '/monitors/m/checks?limit=2&cursor=c'); });
test('stats uses correct URL', async () => { const { api, calls } = make(); await api.stats('m'); assert.equal(calls[0].url, '/monitors/m/stats'); });
