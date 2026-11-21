import { z } from 'zod';
import { HttpError } from '../utils/HttpError.js';

const listSchema = z.object({
  status: z.enum(['OPEN', 'RESOLVED']).optional(),
  monitorId: z.uuid().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  cursor: z.uuid().optional(),
}).strict();

export function parseIncidentId(value) {
  const result = z.uuid().safeParse(value);
  if (!result.success) throw new HttpError(404, 'INCIDENT_NOT_FOUND', 'Incident not found');
  return result.data;
}
export function parseIncidentQuery(value) {
  const result = listSchema.safeParse(value ?? {});
  if (!result.success) throw new HttpError(400, 'VALIDATION_ERROR', 'Invalid incident query');
  return result.data;
}
