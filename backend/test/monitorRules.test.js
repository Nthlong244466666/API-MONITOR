import test from 'node:test';
import assert from 'node:assert/strict';
import { nextDueTime, stateAfterCheck, safeFailureCode, MIN_INTERVAL_SECONDS, MAX_MONITOR_TIMEOUT_MS } from '../src/lib/monitorRules.js';

const monitor = (status = 'UNKNOWN', consecutiveFailures = 0, consecutiveSuccesses = 0) => ({
  status, consecutiveFailures, consecutiveSuccesses, failureThreshold: 3, recoveryThreshold: 2,
});

test('due time is interval from claim time', () => {
  assert.equal(nextDueTime(new Date('2026-01-01T00:00:00Z'), 60).toISOString(), '2026-01-01T00:01:00.000Z');
});
test('minimum interval safely exceeds maximum timeout', () => {
  assert.ok(MIN_INTERVAL_SECONDS * 1000 > MAX_MONITOR_TIMEOUT_MS);
});
test('one failure does not mark DOWN', () => {
  const r = stateAfterCheck(monitor(), false); assert.equal(r.status, 'UNKNOWN'); assert.equal(r.consecutiveFailures, 1);
});
test('third consecutive failure marks DOWN', () => {
  const r = stateAfterCheck(monitor('UP', 2), false); assert.equal(r.status, 'DOWN'); assert.equal(r.consecutiveFailures, 3);
});
test('successful check resets failure streak', () => {
  const r = stateAfterCheck(monitor('UP', 2), true); assert.equal(r.status, 'UP'); assert.equal(r.consecutiveFailures, 0);
});
test('recovery requires two consecutive successes', () => {
  const a = stateAfterCheck(monitor('DOWN'), true);
  assert.equal(a.status, 'DOWN');
  const b = stateAfterCheck({ ...monitor('DOWN'), ...a }, true);
  assert.equal(b.status, 'UP');
});
test('fail resets recovery streak', () => {
  const r = stateAfterCheck(monitor('DOWN', 0, 1), false); assert.equal(r.consecutiveSuccesses, 0);
});
test('failure codes never echo raw errors', () => {
  assert.equal(safeFailureCode(new Error('Authorization: Bearer SECRET')), 'NETWORK_ERROR');
  assert.equal(safeFailureCode({ code: 'ENOTFOUND' }), 'DNS_ERROR');
  assert.equal(safeFailureCode({ code: 'TIMEOUT' }), 'TIMEOUT');
});
test('two successes from UNKNOWN produce UP', () => {
  const first = stateAfterCheck(monitor(), true);
  assert.equal(first.status, 'UNKNOWN');
  const second = stateAfterCheck({ ...monitor(), ...first }, true);
  assert.equal(second.status, 'UP');
});
test('first failure when DOWN stays DOWN', () => {
  const state = stateAfterCheck(monitor('DOWN'), false);
  assert.equal(state.status, 'DOWN');
});
test('one success from UP stays UP', () => {
  const state = stateAfterCheck(monitor('UP'), true);
  assert.equal(state.status, 'UP');
});
