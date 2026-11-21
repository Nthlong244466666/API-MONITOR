import test from 'node:test';
import assert from 'node:assert/strict';
import { incidentEvent, incidentReason, notificationMessage } from '../src/lib/incidentTransition.js';

const cases = [
  ['UNKNOWN', 'DOWN', 'OPENED'],
  ['UP', 'DOWN', 'OPENED'],
  ['DOWN', 'DOWN', null],
  ['DOWN', 'UP', 'RESOLVED'],
  ['UP', 'UP', null],
  ['UNKNOWN', 'UP', null],
  ['UP', 'UNKNOWN', null],
];
for (const [before, after, expected] of cases) {
  test(`${before} -> ${after}`, () => assert.equal(incidentEvent(before, after), expected));
}
test('incident reason fixed, never includes URL or headers', () => {
  assert.equal(incidentReason(), 'MONITOR_FAILURE_THRESHOLD');
});
test('notification messages do not contain user-controlled secrets', () => {
  assert.match(notificationMessage('OPENED'), /DOWN/);
  assert.match(notificationMessage('RESOLVED'), /UP/);
  assert.throws(() => notificationMessage('OTHER'), TypeError);
});
