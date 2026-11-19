import { prisma } from '../lib/prisma.js';
import { HttpError } from '../utils/HttpError.js';

export function ownedRequestWhere(userId, workspaceId, projectId, requestId) {
  return {
    id: requestId,
    projectId,
    project: { is: { workspaceId, workspace: { is: { ownerId: userId } } } },
  };
}
export async function requireOwnedRequest(userId, workspaceId, projectId, requestId) {
  const request = await prisma.apiRequest.findFirst({
    where: ownedRequestWhere(userId, workspaceId, projectId, requestId),
    select: { id: true },
  });
  if (!request) throw new HttpError(404, 'REQUEST_NOT_FOUND', 'API request not found');
  return request;
}
