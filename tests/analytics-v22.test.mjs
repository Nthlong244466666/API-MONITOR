import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
const source = (name) => new URL(`../frontend/src/services/${name}`, import.meta.url);
async function load(name) { const content = await readFile(source(name)); return import(`data:text/javascript;base64,${content.toString('base64')}`); }
const api = await load('analyticsApi.js');
const fmt = await load('analyticsFormat.js');

test('overview uses 7d by default', async () => { let input; await api.createAnalyticsApi(p => { input=p; return Promise.resolve({}); }).overview(); assert.equal(input, '/analytics/overview?range=7d'); });
test('trends uses 24h', async () => { let input; await api.createAnalyticsApi(p => { input=p; return Promise.resolve({}); }).trends('24h'); assert.equal(input, '/analytics/trends?range=24h'); });
test('recent incidents uses max 20', async () => { let input; await api.createAnalyticsApi(p => { input=p; return Promise.resolve({}); }).recentIncidents('30d',20); assert.equal(input, '/analytics/recent-incidents?range=30d&limit=20'); });
test('reject invalid ranges', () => assert.throws(() => api.normalizeRange('90d')));
test('reject invalid incident limits', () => assert.throws(() => api.createAnalyticsApi(() => {}).recentIncidents('7d', 21)));
test('all documented ranges accepted', () => assert.deepEqual(api.ANALYTICS_RANGES,['24h','7d','30d']));
test('zero success percent not missing', () => assert.equal(fmt.formatPercent(0), '0%'));
test('missing success percent is dash', () => assert.equal(fmt.formatPercent(null), '—'));
test('latency 0ms not missing', () => assert.match(fmt.formatMs(0), /0 ms/));
test('missing latency is dash', () => assert.equal(fmt.formatMs(undefined), '—'));
test('empty duration is ongoing', () => assert.equal(fmt.formatDuration('2026-01-01', null),'Đang diễn ra'));
test('negative duration returns dash', () => assert.equal(fmt.formatDuration('2026-01-02','2026-01-01'),'—'));
test('reject unexpected overview payload', () => assert.throws(() => fmt.parseDashboardData({}, {}, {})));
test('accept normal backend envelope data', () => assert.deepEqual(fmt.parseDashboardData({monitors:{},incidents:{},checks:{}},{points:[]},{items:[]}).recent.items, []));
test('bad timestamps render dash', () => assert.equal(fmt.bucketLabel('invalid', '7d'), '—'));
