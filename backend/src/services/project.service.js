
import { prisma } from "../lib/prisma.js";
import { withSerializableTransaction } from "../lib/transaction.js";
import { HttpError } from "../utils/HttpError.js";

const MAX_PROJECTS = 50;

const projectSelect = {
  id: true,
  workspaceId: true,
  name: true,
  description: true,
  createdAt: true,
  updatedAt: true,
};

function projectNotFound() {
  return new HttpError(
    404,
    "PROJECT_NOT_FOUND",
    "Project not found"
  );
}

function workspaceNotFound() {
  return new HttpError(
    404,
    "WORKSPACE_NOT_FOUND",
    "Workspace not found"
  );
}

function projectScope(userId, workspaceId) {
  return {
    workspaceId,
    workspace: {
      is: {
        ownerId: userId,
      },
    },
  };
}

async function ensureWorkspaceOwner(
  db,
  userId,
  workspaceId
) {
  const workspace = await db.workspace.findFirst({
    where: {
      id: workspaceId,
      ownerId: userId,
    },
    select: {
      id: true,
    },
  });

  if (!workspace) {
    throw workspaceNotFound();
  }
}

export async function listProjects(userId, workspaceId) {
  await ensureWorkspaceOwner(
    prisma,
    userId,
    workspaceId
  );

  return prisma.project.findMany({
    where: projectScope(userId, workspaceId),
    orderBy: [
      { createdAt: "desc" },
      { id: "desc" },
    ],
    take: MAX_PROJECTS,
    select: projectSelect,
  });
}

export async function getProject(
  userId,
  workspaceId,
  projectId
) {
  const project = await prisma.project.findFirst({
    where: {
      id: projectId,
      ...projectScope(userId, workspaceId),
    },
    select: projectSelect,
  });

  if (!project) throw projectNotFound();

  return project;
}

export async function createProject(
  userId,
  workspaceId,
  data
) {
  try {
    return await withSerializableTransaction(
      async (tx) => {
        await ensureWorkspaceOwner(
          tx,
          userId,
          workspaceId
        );

        const count = await tx.project.count({
          where: {
            workspaceId,
          },
        });

        if (count >= MAX_PROJECTS) {
          throw new HttpError(
            409,
            "PROJECT_LIMIT",
            `You can create up to ${MAX_PROJECTS} projects per workspace`
          );
        }

        return tx.project.create({
          data: {
            workspaceId,
            name: data.name,
            description: data.description ?? null,
          },
          select: projectSelect,
        });
      }
    );
  } catch (error) {
    if (error?.code === "P2003") {
      throw workspaceNotFound();
    }

    throw error;
  }
}

export async function updateProject(
  userId,
  workspaceId,
  projectId,
  data
) {
  const result = await prisma.project.updateMany({
    where: {
      id: projectId,
      ...projectScope(userId, workspaceId),
    },
    data,
  });

  if (result.count !== 1) {
    throw projectNotFound();
  }

  return getProject(userId, workspaceId, projectId);
}

export async function deleteProject(
  userId,
  workspaceId,
  projectId,
  confirmName
) {
  const project = await prisma.project.findFirst({
    where: {
      id: projectId,
      ...projectScope(userId, workspaceId),
    },
    select: {
      id: true,
      name: true,
    },
  });

  if (!project) {
    throw projectNotFound();
  }

  if (project.name !== confirmName) {
    throw new HttpError(
      400,
      "CONFIRMATION_MISMATCH",
      "Project name does not match"
    );
  }

  const result = await prisma.project.deleteMany({
    where: {
      id: projectId,
      name: confirmName,
      ...projectScope(userId, workspaceId),
    },
  });

  if (result.count !== 1) {
    throw new HttpError(
      409,
      "PROJECT_CHANGED",
      "Project changed. Please try again."
    );
  }

  return {
    id: projectId,
    deleted: true,
  };
}
