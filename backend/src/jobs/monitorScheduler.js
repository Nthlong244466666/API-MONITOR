import { prisma } from '../lib/prisma.js';
import { runClaimedMonitor } from '../services/monitorRunner.service.js';
import { nextDueTime } from '../lib/monitorRules.js';

const POLL_MS = 5000;
const MAX_WORKERS = 4;
let timer = null;
let ticking = false;
let stopped = false;
const active = new Set();

export async function schedulerTick({ now = new Date(), onError = console.error } = {}) {
  if (stopped || ticking) return;
  ticking = true;
  try {
    const slots = MAX_WORKERS - active.size;
    if (slots <= 0) return;
    // Select candidates first; atomic conditional UPDATE claims them across processes.
    const due = await prisma.monitor.findMany({
      where: { isEnabled: true, nextCheckAt: { lte: now } },
      orderBy: [{ nextCheckAt: 'asc' }, { id: 'asc' }],
      take: Math.max(slots * 3, 8),
      select: { id: true, nextCheckAt: true, intervalSeconds: true },
    });
    let launched = 0;
    for (const m of due) {
      if (stopped || launched >= slots) break;
      // Optimistic atomic claim. Conditional match means another scheduler cannot claim
      // the same due slot. Claimed schedule is persisted before network traffic.
      const claim = await prisma.monitor.updateMany({
        where: { id: m.id, isEnabled: true, nextCheckAt: m.nextCheckAt },
        data: { nextCheckAt: nextDueTime(now, m.intervalSeconds) },
      });
      if (claim.count !== 1) continue;
      launched += 1;
      const job = runClaimedMonitor(m.id)
        .catch((error) => { onError('Monitor job failed', { monitorId: m.id, code: error?.code ?? 'UNEXPECTED' }); })
        .finally(() => active.delete(job));
      active.add(job);
    }
  } catch (error) {
    onError('Monitor scheduler failed', { code: error?.code ?? 'UNEXPECTED' });
  } finally {
    ticking = false;
  }
}

export function startMonitorScheduler({ onError = console.error } = {}) {
  if (timer) return;
  stopped = false;
  timer = setInterval(() => { void schedulerTick({ onError }); }, POLL_MS);
  timer.unref?.();
  void schedulerTick({ onError });
}

export async function stopMonitorScheduler() {
  stopped = true;
  if (timer) clearInterval(timer);
  timer = null;
  await Promise.allSettled([...active]);
}

export function monitorSchedulerInfo() {
  return { activeJobs: active.size, running: Boolean(timer), pollMs: POLL_MS };
}
