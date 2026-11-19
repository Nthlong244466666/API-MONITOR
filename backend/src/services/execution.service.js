import { prisma } from '../lib/prisma.js';
import { decryptRequestForExecution } from '../lib/secretsVault.js';
import { HttpError } from '../utils/HttpError.js';
import { safeHttpRequest } from '../lib/safeHttpClient.js';
import { validateTargetUrl, UnsafeTargetError } from '../lib/ssrfGuard.js';
import { sanitizeResponse } from '../lib/responseSanitizer.js';
import { evaluateAssertions } from './assertion.service.js';
import { withExecutionSlot } from '../middleware/executionLimit.middleware.js';

function scope(userId, workspaceId, projectId) {
  return {
    projectId,
    project: { is: { workspaceId, workspace: { is: { ownerId: userId } } } },
  };
}

function errorCode(error) {
  const code = error?.code;
  if (code === 'TIMEOUT' || code === 'ETIMEDOUT') return 'TIMEOUT';
  if (code === 'RESPONSE_TOO_LARGE') return 'RESPONSE_TOO_LARGE';
  if (code === 'DNS_ERROR' || code === 'ENOTFOUND' || code === 'EAI_AGAIN') return 'DNS_ERROR';
  if (code === 'INVALID_REQUEST_CONFIG') return 'INVALID_REQUEST_CONFIG';
  if (['ECONNRESET','ECONNREFUSED','EHOSTUNREACH','ENETUNREACH','ERR_TLS_CERT_ALTNAME_INVALID','UNABLE_TO_VERIFY_LEAF_SIGNATURE','CERT_HAS_EXPIRED'].includes(code)) return 'NETWORK_ERROR';
  return 'NETWORK_ERROR';
}

export async function executeSavedRequest(userId, workspaceId, projectId, requestId) {
  return withExecutionSlot(userId, async () => {
    const saved = await prisma.apiRequest.findFirst({
      where: { id: requestId, ...scope(userId, workspaceId, projectId) },
      select: {
        id: true, name: true, method: true, url: true, headers: true, body: true,
        assertions: { select: { id: true, type: true, operator: true, target: true, expectedValue: true, isEnabled: true } },
      },
    });
    if (!saved) throw new HttpError(404, 'REQUEST_NOT_FOUND', 'API request not found');
    const target = decryptRequestForExecution(saved);

    // Unsafe targets are rejected BEFORE any network attempt or history record.
    // No invalid network address can be used to probe the server's internal network.
    try { validateTargetUrl(target.url); }
    catch (error) {
      if (error instanceof UnsafeTargetError) throw new HttpError(422, 'UNSAFE_TARGET', error.message);
      throw error;
    }

    let statusCode = null;
    let responseTimeMs = null;
    let responseBody = null;
    let responseHeaders = null;
    let assertionResults = [];
    let isSuccess = false;
    let errorMessage = null;
    const startedAt = performance.now();

    try {
      const result = await safeHttpRequest(target);
      statusCode = result.statusCode;
      responseTimeMs = result.responseTimeMs;
      const sanitized = sanitizeResponse(result.responseHeaders, result.responseBody);
      // Privacy-first: response body is NOT persisted. A sanitized JSON preview
      // is returned for the current request only, and never placed into logs.
      responseBody = sanitized.preview;
      responseHeaders = sanitized.headers;
      const evaluated = evaluateAssertions(saved.assertions, result);
      assertionResults = evaluated.items;
      isSuccess = evaluated.isSuccess;
    } catch (error) {
      if (error instanceof UnsafeTargetError) {
        throw new HttpError(422, 'UNSAFE_TARGET', error.message);
      }
      errorMessage = errorCode(error);
      responseTimeMs = Math.round(performance.now() - startedAt);
    }

    const execution = await prisma.requestExecution.create({
      data: {
        requestId: saved.id,
        statusCode,
        responseTimeMs,
        isSuccess,
        responseBody: null, // Never persist arbitrary sensitive response bodies.
        responseHeaders: responseHeaders ?? undefined,
        assertionResults,
        errorMessage,
      },
      select: { id: true, executedAt: true },
    });

    return {
      executionId: execution.id,
      executedAt: execution.executedAt,
      statusCode, responseTimeMs, isSuccess, responseBody, responseHeaders,
      assertionResults, errorMessage,
    };
  });
}
