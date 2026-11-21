import { z } from 'zod';
import { HttpError } from '../utils/HttpError.js';

const rangeSchema = z.object({ range: z.enum(['24h', '7d', '30d']).default('24h') }).strict();
const recentSchema = rangeSchema.extend({ limit: z.coerce.number().int().min(1).max(20).default(5) });

export function parseAnalyticsQuery(query, recent = false) {
  const result = (recent ? recentSchema : rangeSchema).safeParse(query ?? {});
  if (!result.success) throw new HttpError(400, 'VALIDATION_ERROR', 'Invalid analytics query');
  return result.data;
}
