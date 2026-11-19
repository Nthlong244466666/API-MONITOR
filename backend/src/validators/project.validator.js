
import { z } from "zod";
import { HttpError } from "../utils/HttpError.js";

const projectName = z
  .string()
  .trim()
  .min(2, "Name must contain at least 2 characters")
  .max(150, "Name must not exceed 150 characters");

const projectDescription = z
  .string()
  .trim()
  .max(1000, "Description must not exceed 1000 characters")
  .transform((value) => (value === "" ? null : value))
  .nullable();

export const createProjectSchema = z
  .object({
    name: projectName,
    description: projectDescription.optional(),
  })
  .strict();

export const updateProjectSchema = z
  .object({
    name: projectName.optional(),
    description: projectDescription.optional(),
  })
  .strict()
  .refine(
    (data) => Object.keys(data).length > 0,
    "At least one field is required"
  );

export const deleteProjectSchema = z
  .object({
    confirmName: z.string().trim().min(1).max(150),
  })
  .strict();

function validateUuidParam(id, code, message) {
  const result = z.uuid().safeParse(id);

  if (!result.success) {
    throw new HttpError(404, code, message);
  }

  return result.data;
}

export function validateProjectId(id) {
  return validateUuidParam(
    id,
    "PROJECT_NOT_FOUND",
    "Project not found"
  );
}

export function validateProjectWorkspaceId(id) {
  return validateUuidParam(
    id,
    "WORKSPACE_NOT_FOUND",
    "Workspace not found"
  );
}

export function validateProjectBody(schema, body) {
  const result = schema.safeParse(body);

  if (!result.success) {
    const { fieldErrors, formErrors } =
      z.flattenError(result.error);

    throw new HttpError(
      400,
      "VALIDATION_ERROR",
      "Invalid project data",
      { fieldErrors, formErrors }
    );
  }

  return result.data;
}
