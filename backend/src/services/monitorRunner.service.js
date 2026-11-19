import { prisma } from '../lib/prisma.js';
import { decryptRequestForExecution } from '../lib/secretsVault.js';
import { safeHttpRequest } from '../lib/safeHttpClient.js';
import { evaluateAssertions } from './assertion.service.js';
import { validateTargetUrl, UnsafeTargetError } from '../lib/ssrfGuard.js';
import { withExecutionSlot } from '../middleware/executionLimit.middleware.js';
import { safeFailureCode, stateAfterCheck } from '../lib/monitorRules.js';

// Scheduler claims the monitor before calling this function. No raw body or headers are persisted.
export async function runClaimedMonitor(monitorId) {
  const monitor = await prisma.monitor.findUnique({
    where: { id: monitorId },
    select: {
      id: true, isEnabled: true, status: true, consecutiveFailures: true,
      consecutiveSuccesses: true, failureThreshold: true, recoveryThreshold: true,
      timeoutMs: true,
      request: {
        select: {
          method: true, url: true, headers: true, body: true,
          project: { select: { workspace: { select: { ownerId: true } } } },
          assertions: { select: { id: true, type: true, operator: true, target: true, expectedValue: true, isEnabled: true } },
        },
      },
    },
  });
  if (!monitor?.isEnabled) return null;
  const ownerId = monitor.request.project.workspace.ownerId;
  return withExecutionSlot(ownerId, async () => {
    let statusCode = null;
    let responseTimeMs = null;
    let isSuccess = false;
    let errorMessage = null;
    const started = performance.now();
    try {
      const target = decryptRequestForExecution(monitor.request);
      validateTargetUrl(target.url);
      const result = await safeHttpRequest({ ...target, timeoutMs: monitor.timeoutMs });
      statusCode = result.statusCode;
      responseTimeMs = result.responseTimeMs;
      isSuccess = evaluateAssertions(monitor.request.assertions, result).isSuccess;
    } catch (error) {
      errorMessage = error instanceof UnsafeTargetError ? 'UNSAFE_TARGET' : safeFailureCode(error);
      responseTimeMs = Math.round(performance.now() - started);
    }
    // Concurrency: scheduler guarantees at most one claimed run per monitoring interval;
    // database transaction keeps check insertion and state update together.
    return prisma.$transaction(async (tx) => {
      const latest = await tx.monitor.findUnique({
        where: { id: monitorId },
        select: { id: true, isEnabled: true, status: true, consecutiveFailures: true,
          consecutiveSuccesses: true, failureThreshold: true, recoveryThreshold: true },
      });
      if (!latest?.isEnabled) return null;
      const next = stateAfterCheck(latest, isSuccess);
      const check = await tx.monitorCheck.create({
        data: { monitorId, statusCode, responseTimeMs, isSuccess, errorMessage },
        select: { id: true, checkedAt: true, statusCode: true, isSuccess: true },
      });
      await tx.monitor.update({ where: { id: monitorId }, data: next });
      return check;
    });
  });
}
