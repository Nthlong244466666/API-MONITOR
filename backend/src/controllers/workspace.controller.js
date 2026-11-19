
import {
  listWorkspaces,
  getWorkspace,
  createWorkspace,
  updateWorkspace,
  deleteWorkspace,
} from "../services/workspace.service.js";

import {
  createWorkspaceSchema,
  updateWorkspaceSchema,
  deleteWorkspaceSchema,
  validateWorkspaceId,
  validateWorkspaceBody,
} from "../validators/workspace.validator.js";

export async function index(req, res) {
  const workspaces = await listWorkspaces(req.user.id);

  return res.status(200).json({
    success: true,
    data: workspaces,
  });
}

export async function show(req, res) {
  const id = validateWorkspaceId(req.params.id);
  const workspace = await getWorkspace(req.user.id, id);

  return res.status(200).json({
    success: true,
    data: workspace,
  });
}

export async function store(req, res) {
  const { name } = validateWorkspaceBody(
    createWorkspaceSchema,
    req.body ?? {}
  );

  const workspace = await createWorkspace(req.user.id, name);

  return res.status(201).json({
    success: true,
    data: workspace,
  });
}

export async function update(req, res) {
  const id = validateWorkspaceId(req.params.id);

  const { name } = validateWorkspaceBody(
    updateWorkspaceSchema,
    req.body ?? {}
  );

  const workspace = await updateWorkspace(
    req.user.id,
    id,
    name
  );

  return res.status(200).json({
    success: true,
    data: workspace,
  });
}

export async function destroy(req, res) {
  const id = validateWorkspaceId(req.params.id);

  const { confirmName } = validateWorkspaceBody(
    deleteWorkspaceSchema,
    req.body ?? {}
  );

  const result = await deleteWorkspace(
    req.user.id,
    id,
    confirmName
  );

  return res.status(200).json({
    success: true,
    data: result,
  });
}
