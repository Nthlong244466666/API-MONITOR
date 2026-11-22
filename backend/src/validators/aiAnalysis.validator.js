import { z } from 'zod';
import { HttpError } from '../utils/HttpError.js';
export function parseId(value) {
  const result = z.uuid().safeParse(value);
  if (!result.success) throw new HttpError(404,'AI_RESOURCE_NOT_FOUND','Resource not found');
  return result.data;
}
export function parseAnalysisQuery(value) {
  const result = z.object({limit:z.coerce.number().int().min(1).max(20).default(10),cursor:z.uuid().optional()}).strict().safeParse(value ?? {});
  if (!result.success) throw new HttpError(400,'VALIDATION_ERROR','Invalid analysis query');
  return result.data;
}
