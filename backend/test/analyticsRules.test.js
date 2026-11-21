import test from 'node:test';
import assert from 'node:assert/strict';
import { analyticsWindow, percent, roundedOrNull, fillTimeBuckets, summarizeMonitorGroups } from '../src/lib/analyticsRules.js';

const now = new Date('2026-11-20T12:45:00.000Z');

test('24h window: correct start and hourly interval', () => {
  const w = analyticsWindow('24h', now);
  assert.equal(w.from.toISOString(), '2026-11-19T12:45:00.000Z');
  assert.equal(w.bucketSeconds, 3600);
});
test('7d window: six-hour buckets', () => {
  const w = analyticsWindow('7d', now);
  assert.equal(w.from.toISOString(), '2026-11-13T12:45:00.000Z');
  assert.equal(w.bucketSeconds, 21600);
});
test('30d window: daily buckets', () => {
  const w = analyticsWindow('30d', now);
  assert.equal(w.from.toISOString(), '2026-10-21T12:45:00.000Z');
  assert.equal(w.bucketSeconds, 86400);
});
test('invalid range throws', () => assert.throws(() => analyticsWindow('365d', now), TypeError));
test('zero denominator yields null', () => assert.equal(percent(0, 0), null));
test('proper percentage rounding', () => assert.equal(percent(2, 3), 66.67));
test('rounding leaves null as null', () => assert.equal(roundedOrNull(null), null));
test('rounding a numeric metric', () => assert.equal(roundedOrNull(102.6), 103));
test('monitor status counters exclude disabled from live status counts', () => {
  assert.deepEqual(summarizeMonitorGroups([
    { isEnabled: true, status: 'UP', _count: { _all: 3 } },
    { isEnabled: true, status: 'DOWN', _count: { _all: 2 } },
    { isEnabled: true, status: 'UNKNOWN', _count: { _all: 1 } },
    { isEnabled: false, status: 'DOWN', _count: { _all: 4 } },
  ]), { total: 10, enabled: 6, disabled: 4, up: 3, down: 2, unknown: 1 });
});
test('empty monitor groups produce zero counts', () => {
  assert.deepEqual(summarizeMonitorGroups([]), {total:0,enabled:0,disabled:0,up:0,down:0,unknown:0});
});
test('empty time bucket uses null rate and latency', () => {
  const w = {from: new Date('2026-11-20T00:00:00Z'), to: new Date('2026-11-20T02:00:00Z'),bucketSeconds:3600};
  const r = fillTimeBuckets(w);
  assert.equal(r.length,3);
  assert.equal(r[1].successRatePercent,null);
  assert.equal(r[1].averageResponseTimeMs,null);
});
test('matched check and incident buckets are merged', () => {
  const w = {from: new Date('2026-11-20T00:10:00Z'), to: new Date('2026-11-20T01:05:00Z'),bucketSeconds:3600};
  const points = fillTimeBuckets(w,[{bucket:new Date('2026-11-20T00:00:00Z'),totalChecks:4,passedChecks:3,averageResponseTimeMs:100.6}], [{bucket:new Date('2026-11-20T00:00:00Z'),openedIncidents:1,resolvedIncidents:2}]);
  assert.equal(points.length,2);
  assert.deepEqual({rate:points[0].successRatePercent,failed:points[0].failedChecks,latency:points[0].averageResponseTimeMs,opened:points[0].openedIncidents,resolved:points[0].resolvedIncidents},{rate:75,failed:1,latency:101,opened:1,resolved:2});
});
test('window starting on partial hour includes first aligned bucket', () => {
  const p = fillTimeBuckets({from:new Date('2026-11-20T00:45:00Z'),to:new Date('2026-11-20T01:02:00Z'),bucketSeconds:3600});
  assert.equal(p[0].timestamp,'2026-11-20T00:00:00.000Z');
  assert.equal(p.at(-1).timestamp,'2026-11-20T01:00:00.000Z');
});
