import { z } from "zod";
import { HttpError } from "../utils/HttpError.js";

const requestName = z
  .string()
  .trim()
  .min(2, "Name must contain at least 2 characters")
  .max(150, "Name must not exceed 150 characters");

const httpMethod = z.enum([
  "GET",
  "POST",
  "PUT",
  "PATCH",
  "DELETE",
  "HEAD",
  "OPTIONS",
]);

const requestUrl = z
  .string()
  .trim()
  .min(1, "URL is required")
  .max(2048, "URL must not exceed 2048 characters")
  .refine((value) => {
    try {
      const parsed = new URL(value);
      return (
        (parsed.protocol === "http:" || parsed.protocol === "https:") &&
        Boolean(parsed.hostname) &&
        !parsed.username &&
        !parsed.password
      );
    } catch {
      return false;
    }
  }, "URL must be an absolute HTTP(S) URL without embedded credentials");

const requestHeaders = z
  .record(
    z.string().min(1).max(256),
    z.string().max(8192)
  )
  .refine((value) => Object.keys(value).length <= 100, {
    message: "Headers must not exceed 100 entries",
  });

const requestBody = z.string().max(100_000).nullable();

export const createRequestSchema = z
  .object({
    name: requestName,
    method: httpMethod.default("GET"),
    url: requestUrl,
    headers: requestHeaders.optional(),
    body: requestBody.optional(),
  })
  .strict();

export const updateRequestSchema = z
  .object({
    name: requestName.optional(),
    method: httpMethod.optional(),
    url: requestUrl.optional(),
    headers: requestHeaders.optional(),
    body: requestBody.optional(),
    clearQuery: z.boolean().optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field is required",
  });

export const deleteRequestSchema = z
  .object({
    confirmName: z.string().min(1).max(150),
    confirmCascade: z.literal(true),
  })
  .strict();

function validateUuidParam(value, code, message) {
  const result = z.uuid().safeParse(value);
  if (!result.success) throw new HttpError(404, code, message);
  return result.data;
}

export function validateRequestWorkspaceId(id) {
  return validateUuidParam(id, "WORKSPACE_NOT_FOUND", "Workspace not found");
}

export function validateRequestProjectId(id) {
  return validateUuidParam(id, "PROJECT_NOT_FOUND", "Project not found");
}

export function validateRequestId(id) {
  return validateUuidParam(id, "REQUEST_NOT_FOUND", "API request not found");
}

export function validateRequestBody(schema, body) {
  const result = schema.safeParse(body);
  if (!result.success) {
    const { fieldErrors, formErrors } = z.flattenError(result.error);
    throw new HttpError(400, "VALIDATION_ERROR", "Invalid API request data", {
      fieldErrors,
      formErrors,
    });
  }
  return result.data;
}
