
import { prisma } from "../lib/prisma.js";
import { withSerializableTransaction } from "../lib/transaction.js";
import { HttpError } from "../utils/HttpError.js";

const MAX_WORKSPACES = 20;

const workspaceSelect = {
  id: true,
  name: true,
  createdAt: true,
  updatedAt: true,
  _count: {
    select: {
      projects: true,
    },
  },
};

function notFound() {
  return new HttpError(
    404,
    "WORKSPACE_NOT_FOUND",
    "Workspace not found"
  );
}

export async function listWorkspaces(userId) {
  return prisma.workspace.findMany({
    where: { ownerId: userId },
    orderBy: [
      { createdAt: "desc" },
      { id: "desc" },
    ],
    take: MAX_WORKSPACES,
    select: workspaceSelect,
  });
}

export async function getWorkspace(userId, workspaceId) {
  const workspace = await prisma.workspace.findFirst({
    where: {
      id: workspaceId,
      ownerId: userId,
    },
    select: {
      ...workspaceSelect,
      projects: {
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          name: true,
          description: true,
          createdAt: true,
          updatedAt: true,
        },
      },
    },
  });

  if (!workspace) throw notFound();

  return workspace;
}

export async function createWorkspace(userId, name) {
  return withSerializableTransaction(async (tx) => {
    const count = await tx.workspace.count({
      where: { ownerId: userId },
    });

    if (count >= MAX_WORKSPACES) {
      throw new HttpError(
        409,
        "WORKSPACE_LIMIT",
        `You can create up to ${MAX_WORKSPACES} workspaces`
      );
    }

    return tx.workspace.create({
      data: {
        ownerId: userId,
        name,
      },
      select: workspaceSelect,
    });
  });
}

export async function updateWorkspace(
  userId,
  workspaceId,
  name
) {
  const result = await prisma.workspace.updateMany({
    where: {
      id: workspaceId,
      ownerId: userId,
    },
    data: { name },
  });

  if (result.count === 0) throw notFound();

  return getWorkspace(userId, workspaceId);
}

export async function deleteWorkspace(
  userId,
  workspaceId,
  confirmName
) {
  return withSerializableTransaction(async (tx) => {
    const workspace = await tx.workspace.findFirst({
      where: {
        id: workspaceId,
        ownerId: userId,
      },
      select: {
        id: true,
        name: true,
      },
    });

    if (!workspace) throw notFound();

    const count = await tx.workspace.count({
      where: { ownerId: userId },
    });

    if (count <= 1) {
      throw new HttpError(
        409,
        "LAST_WORKSPACE",
        "You must keep at least one workspace"
      );
    }

    if (workspace.name !== confirmName) {
      throw new HttpError(
        400,
        "CONFIRMATION_MISMATCH",
        "Workspace name does not match"
      );
    }

    const result = await tx.workspace.deleteMany({
      where: {
        id: workspaceId,
        ownerId: userId,
        name: confirmName,
      },
    });

    if (result.count !== 1) {
      throw new HttpError(
        409,
        "WORKSPACE_CHANGED",
        "Workspace changed. Please try again."
      );
    }

    return {
      id: workspaceId,
      deleted: true,
    };
  });
}
