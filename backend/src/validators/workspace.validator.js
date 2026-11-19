
import { z } from "zod";
import { HttpError } from "../utils/HttpError.js";

const workspaceName = z
  .string()
  .trim()
  .min(2, "Name must contain at least 2 characters")
  .max(150, "Name must not exceed 150 characters");

export const createWorkspaceSchema = z
  .object({
    name: workspaceName,
  })
  .strict();

export const updateWorkspaceSchema = createWorkspaceSchema;

export const deleteWorkspaceSchema = z
  .object({
    confirmName: z.string().trim().min(1).max(150),
  })
  .strict();

const uuidSchema = z.uuid();

export function validateWorkspaceId(id) {
  if (!uuidSchema.safeParse(id).success) {
    throw new HttpError(
      404,
      "WORKSPACE_NOT_FOUND",
      "Workspace not found"
    );
  }

  return id;
}

export function validateWorkspaceBody(schema, body) {
  const result = schema.safeParse(body);

  if (!result.success) {
    const { fieldErrors, formErrors } =
      z.flattenError(result.error);

    throw new HttpError(
      400,
      "VALIDATION_ERROR",
      "Invalid workspace data",
      { fieldErrors, formErrors }
    );
  }

  return result.data;
}
