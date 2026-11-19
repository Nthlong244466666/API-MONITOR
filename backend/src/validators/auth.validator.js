
import { z } from "zod";
import { HttpError } from "../utils/HttpError.js";

const emailField = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email().max(255));

export const registerSchema = z
  .object({
    name: z.string().trim().min(1).max(100),
    email: emailField,
    password: z.string().min(8).max(128),
  })
  .strict();

export const loginSchema = z
  .object({
    email: emailField,
    password: z.string().min(1).max(128),
  })
  .strict();

export function validateBody(schema, body) {
  const result = schema.safeParse(body);

  if (!result.success) {
    const { formErrors, fieldErrors } =
      z.flattenError(result.error);

    throw new HttpError(
      400,
      "VALIDATION_ERROR",
      "Invalid input data",
      { fieldErrors, formErrors }
    );
  }

  return result.data;
}
