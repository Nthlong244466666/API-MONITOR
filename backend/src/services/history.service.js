import { prisma } from '../lib/prisma.js';
import { HttpError } from '../utils/HttpError.js';
import { publicExecution } from '../lib/historyPublicView.js';
import { requireOwnedRequest } from './requestOwnership.service.js';

const columns = {
  id: true, executedAt: true, statusCode: true, responseTimeMs: true,
  isSuccess: true, errorMessage: true,
};
const detailedColumns = { ...columns, responseHeaders: true, assertionResults: true };

export async function getExecutionHistory(userId, workspaceId, projectId, requestId, options) {
  await requireOwnedRequest(userId, workspaceId, projectId, requestId);
  const where = { requestId };
  if (options.success !== undefined) where.isSuccess = options.success;
  if (options.cursor) {
    const boundary = await prisma.requestExecution.findFirst({
      where: { id: options.cursor, requestId },
      select: { id: true, executedAt: true, isSuccess: true },
    });
    if (!boundary || (options.success !== undefined && boundary.isSuccess !== options.success)) {
      throw new HttpError(400, 'INVALID_CURSOR', 'History cursor is not valid for this request/filter');
    }
    where.OR = [
      { executedAt: { lt: boundary.executedAt } },
      { executedAt: boundary.executedAt, id: { lt: boundary.id } },
    ];
  }
  const rows = await prisma.requestExecution.findMany({
    where, orderBy: [{ executedAt: 'desc' }, { id: 'desc' }],
    take: options.limit + 1, select: columns,
  });
  const hasMore = rows.length > options.limit;
  const page = rows.slice(0, options.limit);
  return {
    items: page.map((row) => publicExecution(row)),
    nextCursor: hasMore ? page.at(-1)?.id ?? null : null,
    hasMore,
  };
}

export async function getExecutionDetail(userId, workspaceId, projectId, requestId, executionId) {
  await requireOwnedRequest(userId, workspaceId, projectId, requestId);
  const row = await prisma.requestExecution.findFirst({
    where: { id: executionId, requestId }, select: detailedColumns,
  });
  if (!row) throw new HttpError(404, 'EXECUTION_NOT_FOUND', 'Execution not found');
  return publicExecution(row, true);
}
