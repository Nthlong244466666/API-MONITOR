import { prisma } from '../lib/prisma.js';
import { decryptRequestForExecution } from '../lib/secretsVault.js';
import { safeHttpRequest } from '../lib/safeHttpClient.js';
import { evaluateAssertions } from './assertion.service.js';
import { validateTargetUrl, UnsafeTargetError } from '../lib/ssrfGuard.js';
import { withExecutionSlot } from '../middleware/executionLimit.middleware.js';
import { safeFailureCode, stateAfterCheck } from '../lib/monitorRules.js';
import { incidentEvent, incidentReason, notificationMessage } from '../lib/incidentTransition.js';

// Idempotent transitions; a partial unique index in schema.prisma additionally
// enforces at most one OPEN incident per monitor across processes.
async function writeMonitorCheck(monitorId, outcome) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await prisma.$transaction(async (tx) => {
        const latest = await tx.monitor.findUnique({
          where: { id: monitorId },
          select: {
            id: true, isEnabled: true, status: true, consecutiveFailures: true,
            consecutiveSuccesses: true, failureThreshold: true, recoveryThreshold: true,
            request: {
              select: { project: { select: { workspace: { select: { ownerId: true } } } } },
            },
          },
        });
        if (!latest?.isEnabled) return null;

        const next = stateAfterCheck(latest, outcome.isSuccess);
        const check = await tx.monitorCheck.create({
          data: { monitorId, ...outcome },
          select: { id: true, checkedAt: true, statusCode: true, isSuccess: true },
        });
        await tx.monitor.update({ where: { id: monitorId }, data: next });

        const event = incidentEvent(latest.status, next.status);
        if (event === 'OPENED') {
          // A prior incident can remain OPEN if the monitor was re-enabled and
          // its status reset to UNKNOWN. Do not create another alert in that case.
          const alreadyOpen = await tx.incident.findFirst({
            where: { monitorId, status: 'OPEN' }, select: { id: true },
          });
          if (!alreadyOpen) {
            const incident = await tx.incident.create({
              data: { monitorId, status: 'OPEN', reason: incidentReason() },
              select: { id: true },
            });
            await tx.notification.create({
              data: {
                incidentId: incident.id,
                userId: latest.request.project.workspace.ownerId,
                type: 'OPENED', message: notificationMessage('OPENED'),
              },
            });
          }
        } else if (next.status === 'UP' && latest.status !== 'UP') {
          // Also handles disabled/re-enabled monitors: status may be UNKNOWN
          // while an incident from an earlier DOWN period is still OPEN.
          const openIncident = await tx.incident.findFirst({
            where: { monitorId, status: 'OPEN' }, select: { id: true },
          });
          if (openIncident) {
            const closed = await tx.incident.updateMany({
              where: { id: openIncident.id, status: 'OPEN' },
              data: { status: 'RESOLVED', resolvedAt: new Date() },
            });
            if (closed.count === 1) {
              await tx.notification.create({
                data: {
                  incidentId: openIncident.id,
                  userId: latest.request.project.workspace.ownerId,
                  type: 'RESOLVED', message: notificationMessage('RESOLVED'),
                },
              });
            }
          }
        }
        return check;
      }, { isolationLevel: 'Serializable', maxWait: 5000, timeout: 10000 });
    } catch (error) {
      // PostgreSQL serialization/deadlock conflict: retry whole transaction.
      if (error?.code === 'P2034' && attempt < 2) continue;
      throw error;
    }
  }
  return null;
}

// Scheduler already claimed the due interval in PostgreSQL. Never store raw
// HTTP response, URL, headers, secrets, or assertion actual JSON values.
export async function runClaimedMonitor(monitorId) {
  const monitor = await prisma.monitor.findUnique({
    where: { id: monitorId },
    select: {
      id: true, isEnabled: true, timeoutMs: true,
      request: {
        select: {
          id: true, method: true, url: true, headers: true, body: true,
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
    return writeMonitorCheck(monitorId, { statusCode, responseTimeMs, isSuccess, errorMessage });
  });
}
