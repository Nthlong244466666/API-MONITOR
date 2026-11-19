import { z } from 'zod';
import { HttpError } from '../utils/HttpError.js';
import { MAX_INTERVAL_SECONDS, MIN_INTERVAL_SECONDS, MAX_MONITOR_TIMEOUT_MS } from '../lib/monitorRules.js';

const name = z.string().trim().min(2).max(150);
const positive = z.number().int().min(1).max(20);
const intervalSeconds = z.number().int().min(MIN_INTERVAL_SECONDS).max(MAX_INTERVAL_SECONDS);
const timeoutMs = z.number().int().min(1000).max(MAX_MONITOR_TIMEOUT_MS);

export const createMonitorSchema = z.object({
  requestId: z.uuid(), name,
  intervalSeconds: intervalSeconds.default(300),
  timeoutMs: timeoutMs.default(10000),
  failureThreshold: positive.default(3),
  recoveryThreshold: positive.default(2),
  isEnabled: z.boolean().default(true),
}).strict();
export const updateMonitorSchema = z.object({
  name: name.optional(), intervalSeconds: intervalSeconds.optional(),
  timeoutMs: timeoutMs.optional(), failureThreshold: positive.optional(),
  recoveryThreshold: positive.optional(), isEnabled: z.boolean().optional(),
}).strict().refine((data) => Object.keys(data).length > 0);

export const checksQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(20),
  cursor: z.uuid().optional(),
}).strict();

export function parseMonitorId(value) {
  const result = z.uuid().safeParse(value);
  if (!result.success) throw new HttpError(404, 'MONITOR_NOT_FOUND', 'Monitor not found');
  return result.data;
}
export function parsePayload(schema, value) {
  const result = schema.safeParse(value ?? {});
  if (!result.success) {
    const { fieldErrors, formErrors } = z.flattenError(result.error);
    throw new HttpError(400, 'VALIDATION_ERROR', 'Invalid monitor data', { fieldErrors, formErrors });
  }
  return result.data;
}
