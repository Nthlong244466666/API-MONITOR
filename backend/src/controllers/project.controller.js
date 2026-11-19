
import {
  listProjects,
  getProject,
  createProject,
  updateProject,
  deleteProject,
} from "../services/project.service.js";

import {
  createProjectSchema,
  updateProjectSchema,
  deleteProjectSchema,
  validateProjectId,
  validateProjectWorkspaceId,
  validateProjectBody,
} from "../validators/project.validator.js";

export async function index(req, res) {
  const workspaceId = validateProjectWorkspaceId(
    req.params.workspaceId
  );

  const projects = await listProjects(
    req.user.id,
    workspaceId
  );

  return res.status(200).json({
    success: true,
    data: projects,
  });
}

export async function show(req, res) {
  const workspaceId = validateProjectWorkspaceId(
    req.params.workspaceId
  );

  const projectId = validateProjectId(
    req.params.projectId
  );

  const project = await getProject(
    req.user.id,
    workspaceId,
    projectId
  );

  return res.status(200).json({
    success: true,
    data: project,
  });
}

export async function store(req, res) {
  const workspaceId = validateProjectWorkspaceId(
    req.params.workspaceId
  );

  const data = validateProjectBody(
    createProjectSchema,
    req.body ?? {}
  );

  const project = await createProject(
    req.user.id,
    workspaceId,
    data
  );

  return res.status(201).json({
    success: true,
    data: project,
  });
}

export async function update(req, res) {
  const workspaceId = validateProjectWorkspaceId(
    req.params.workspaceId
  );

  const projectId = validateProjectId(
    req.params.projectId
  );

  const data = validateProjectBody(
    updateProjectSchema,
    req.body ?? {}
  );

  const project = await updateProject(
    req.user.id,
    workspaceId,
    projectId,
    data
  );

  return res.status(200).json({
    success: true,
    data: project,
  });
}

export async function destroy(req, res) {
  const workspaceId = validateProjectWorkspaceId(
    req.params.workspaceId
  );

  const projectId = validateProjectId(
    req.params.projectId
  );

  const { confirmName } = validateProjectBody(
    deleteProjectSchema,
    req.body ?? {}
  );

  const result = await deleteProject(
    req.user.id,
    workspaceId,
    projectId,
    confirmName
  );

  return res.status(200).json({
    success: true,
    data: result,
  });
}
