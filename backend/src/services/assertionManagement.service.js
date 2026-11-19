import { prisma } from '../lib/prisma.js';
import { Prisma } from '../../generated/prisma/client.ts';
import { HttpError } from '../utils/HttpError.js';
import { normalizeAssertion, mergedAssertion } from '../validators/assertion.validator.js';
import { requireOwnedRequest } from './requestOwnership.service.js';

const select = { id: true, requestId: true, type: true, operator: true,
  target: true, expectedValue: true, isEnabled: true };
const notFound = () => new HttpError(404, 'ASSERTION_NOT_FOUND', 'Assertion not found');

export async function getAssertions(userId, workspaceId, projectId, requestId) {
  await requireOwnedRequest(userId, workspaceId, projectId, requestId);
  return prisma.requestAssertion.findMany({ where: { requestId }, orderBy: { id: 'asc' }, select });
}

export async function addAssertion(userId, workspaceId, projectId, requestId, payload) {
  const data = normalizeAssertion(payload);
  await requireOwnedRequest(userId, workspaceId, projectId, requestId);
  // Limit excessive assertion evaluations per execution (best effort under concurrency).
  const count = await prisma.requestAssertion.count({ where: { requestId } });
  if (count >= 50) throw new HttpError(409, 'ASSERTION_LIMIT_REACHED', 'Maximum 50 assertions per request');
  try {
    return await prisma.requestAssertion.create({ data: { requestId, ...data }, select });
  } catch (error) {
    if (error?.code === 'P2003') throw new HttpError(404, 'REQUEST_NOT_FOUND', 'API request not found');
    throw error;
  }
}

export async function changeAssertion(userId, workspaceId, projectId, requestId, assertionId, patch) {
  await requireOwnedRequest(userId, workspaceId, projectId, requestId);
  const existing = await prisma.requestAssertion.findFirst({ where: { id: assertionId, requestId }, select });
  if (!existing) throw notFound();
  const data = mergedAssertion(existing, patch);
  const updateData = { ...data, expectedValue: data.expectedValue === undefined ? Prisma.DbNull : data.expectedValue };
  const updated = await prisma.requestAssertion.updateMany({ where: { id: assertionId, requestId }, data: updateData });
  if (updated.count !== 1) throw notFound();
  const result = await prisma.requestAssertion.findFirst({ where: { id: assertionId, requestId }, select });
  if (!result) throw notFound();
  return result;
}

export async function deleteAssertion(userId, workspaceId, projectId, requestId, assertionId) {
  await requireOwnedRequest(userId, workspaceId, projectId, requestId);
  const result = await prisma.requestAssertion.deleteMany({ where: { id: assertionId, requestId } });
  if (result.count !== 1) throw notFound();
  return { id: assertionId, deleted: true };
}
