import { z } from 'zod';
import { HttpError } from '../utils/HttpError.js';

const querySchema = z.object({
  limit: z.string().regex(/^[1-9]\d?$/).transform(Number).refine((n) => n <= 50).optional(),
  cursor: z.uuid().optional(),
  success: z.enum(['true', 'false']).optional(),
}).strict();
export function validateHistoryQuery(query) {
  const parsed = querySchema.safeParse(query ?? {});
  if (!parsed.success) throw new HttpError(400, 'VALIDATION_ERROR', 'Invalid execution history query');
  return { limit: parsed.data.limit ?? 20,
    cursor: parsed.data.cursor,
    success: parsed.data.success === undefined ? undefined : parsed.data.success === 'true' };
}
export function validateExecutionId(value) {
  const parsed = z.uuid().safeParse(value);
  if (!parsed.success) throw new HttpError(404, 'EXECUTION_NOT_FOUND', 'Execution not found');
  return parsed.data;
}
