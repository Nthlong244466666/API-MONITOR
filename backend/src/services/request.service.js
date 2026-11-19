import { randomUUID } from 'node:crypto';
import { assertSecretsConfigured, encryptedRequestFields, decryptField, publicUrl } from '../lib/secretsVault.js';
import { prisma } from "../lib/prisma.js";
import { HttpError } from "../utils/HttpError.js";
import { toPublicRequest, toPublicRequests } from "../lib/requestPublicView.js";

// Fail closed at startup rather than accidentally accepting unencrypted new writes.
assertSecretsConfigured();

const requestSelect = {
  id: true,
  projectId: true,
  name: true,
  method: true,
  url: true,
  headers: true,
  body: true,
  createdAt: true,
  updatedAt: true,
};

function projectNotFound() {
  return new HttpError(404, "PROJECT_NOT_FOUND", "Project not found");
}

function requestNotFound() {
  return new HttpError(404, "REQUEST_NOT_FOUND", "API request not found");
}

function projectScope(userId, workspaceId) {
  return {
    workspaceId,
    workspace: { is: { ownerId: userId } },
  };
}

function requestScope(userId, workspaceId, projectId) {
  return {
    projectId,
    project: { is: projectScope(userId, workspaceId) },
  };
}

async function ensureProjectOwner(userId, workspaceId, projectId) {
  const project = await prisma.project.findFirst({
    where: { id: projectId, ...projectScope(userId, workspaceId) },
    select: { id: true },
  });

  if (!project) throw projectNotFound();
}

export async function listRequests(userId, workspaceId, projectId) {
  await ensureProjectOwner(userId, workspaceId, projectId);

  const requests = await prisma.apiRequest.findMany({
    where: requestScope(userId, workspaceId, projectId),
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    select: requestSelect,
  });
  return toPublicRequests(requests);
}

export async function getRequest(userId, workspaceId, projectId, requestId) {
  const request = await prisma.apiRequest.findFirst({
    where: {
      id: requestId,
      ...requestScope(userId, workspaceId, projectId),
    },
    select: requestSelect,
  });

  if (!request) throw requestNotFound();
  return toPublicRequest(request);
}

export async function createRequest(userId, workspaceId, projectId, data) {
  await ensureProjectOwner(userId, workspaceId, projectId);

  try {
    const id = randomUUID();
    const protectedFields = encryptedRequestFields(id, {
      url: data.url,
      headers: data.headers,
      body: data.body ?? null,
    });
    const created = await prisma.apiRequest.create({
      data: {
        id, projectId, name: data.name, method: data.method,
        ...protectedFields,
      },
      select: requestSelect,
    });
    return toPublicRequest(created);
  } catch (error) {
    if (error?.code === "P2003") throw projectNotFound();
    throw error;
  }
}

export async function updateRequest(userId, workspaceId, projectId, requestId, data) {
  const existing = await prisma.apiRequest.findFirst({
    where: { id: requestId, ...requestScope(userId, workspaceId, projectId) },
    select: { id: true, url: true },
  });
  if (!existing) throw requestNotFound();

  const protectedInput = {};
  if (Object.hasOwn(data, 'url')) {
    // The frontend displays URLs without their queries. Treat an unchanged
    // public URL as "preserve the original", not "erase hidden query secrets".
    // To replace/remove query params, send an explicitly different URL.
    const visible = publicUrl(existing.url, requestId).url;
    if (data.clearQuery === true && data.url === visible) {
      protectedInput.url = visible;
    } else if (data.url !== visible && data.url !== decryptField(existing.url, requestId, 'url')) {
      protectedInput.url = data.url;
    }
  }
  if (data.clearQuery === true && !Object.hasOwn(data, 'url')) {
    protectedInput.url = publicUrl(existing.url, requestId).url;
  }
  if (Object.hasOwn(data, 'headers')) protectedInput.headers = data.headers;
  if (Object.hasOwn(data, 'body')) protectedInput.body = data.body;
  const encoded = encryptedRequestFields(requestId, protectedInput);
  const changes = {
    ...(data.name !== undefined && { name: data.name }),
    ...(data.method !== undefined && { method: data.method }),
    ...encoded,
  };
  if (!Object.keys(changes).length) return getRequest(userId, workspaceId, projectId, requestId);

  const result = await prisma.apiRequest.updateMany({
    where: { id: requestId, ...requestScope(userId, workspaceId, projectId) },
    data: changes,
  });
  if (result.count !== 1) throw requestNotFound();
  return getRequest(userId, workspaceId, projectId, requestId);
}

export async function deleteRequest(
  userId,
  workspaceId,
  projectId,
  requestId,
  confirmName,
  confirmCascade
) {
  if (confirmCascade !== true) {
    throw new HttpError(
      400,
      "CASCADE_CONFIRMATION_REQUIRED",
      "You must explicitly confirm deletion of related data"
    );
  }

  const request = await prisma.apiRequest.findFirst({
    where: {
      id: requestId,
      ...requestScope(userId, workspaceId, projectId),
    },
    select: { id: true, name: true },
  });

  if (!request) throw requestNotFound();

  if (request.name !== confirmName) {
    throw new HttpError(
      400,
      "CONFIRMATION_MISMATCH",
      "API request name does not match"
    );
  }

  // Prisma schema uses onDelete: Cascade. The database deletes dependent
  // assertions, executions, monitors, checks, incidents and notifications.
  const result = await prisma.apiRequest.deleteMany({
    where: {
      id: requestId,
      name: confirmName,
      ...requestScope(userId, workspaceId, projectId),
    },
  });

  if (result.count !== 1) {
    throw new HttpError(
      409,
      "REQUEST_CHANGED",
      "API request changed. Please try again."
    );
  }

  return { id: requestId, deleted: true };
}
