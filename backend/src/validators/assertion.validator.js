import { z } from 'zod';
import { HttpError } from '../utils/HttpError.js';

const id = z.uuid();
const path = z.string().min(1).max(256).regex(/^[a-zA-Z_$][\w$]*(?:\.[a-zA-Z_$][\w$]*){0,15}$/, 'Use a dot-separated JSON object path (max 16 segments)');
// Deliberately limit JSON equality to primitive values. Never store response values.
const primitive = z.union([z.string().max(512), z.number().finite(), z.boolean()]);
const status = z.object({
  type: z.literal('STATUS'), operator: z.literal('EQ'),
  expectedValue: z.number().int().min(100).max(599),
  isEnabled: z.boolean().optional(),
}).strict();
const latency = z.object({
  type: z.literal('LATENCY'), operator: z.enum(['LT', 'LTE']),
  expectedValue: z.number().int().min(1).max(120000),
  isEnabled: z.boolean().optional(),
}).strict();
const jsonEq = z.object({
  type: z.literal('JSON'), operator: z.literal('EQ'), target: path,
  expectedValue: primitive, isEnabled: z.boolean().optional(),
}).strict();
const jsonExists = z.object({
  type: z.literal('JSON'), operator: z.literal('EXISTS'), target: path,
  isEnabled: z.boolean().optional(),
}).strict();

export const createAssertionSchema = z.union([status, latency, jsonEq, jsonExists]);
export const patchAssertionSchema = z.object({
  type: z.enum(['STATUS', 'LATENCY', 'JSON']).optional(),
  operator: z.enum(['EQ', 'LT', 'LTE', 'EXISTS']).optional(),
  target: z.string().nullable().optional(),
  expectedValue: primitive.nullable().optional(),
  isEnabled: z.boolean().optional(),
}).strict().refine((v) => Object.keys(v).length > 0, 'Provide at least one field');

export function validateAssertionId(value) {
  const parsed = id.safeParse(value);
  if (!parsed.success) throw new HttpError(404, 'ASSERTION_NOT_FOUND', 'Assertion not found');
  return parsed.data;
}

export function normalizeAssertion(input) {
  // Presence/absence is determined by type and operator, not by values left
  // over from an older assertion configuration.
  const raw = { type: input.type, operator: input.operator, isEnabled: input.isEnabled ?? true };
  if (input.type === 'JSON') raw.target = input.target;
  if (!(input.type === 'JSON' && input.operator === 'EXISTS')) raw.expectedValue = input.expectedValue;
  const parsed = createAssertionSchema.safeParse(raw);
  if (!parsed.success) {
    const { fieldErrors, formErrors } = z.flattenError(parsed.error);
    throw new HttpError(400, 'VALIDATION_ERROR', 'Invalid assertion configuration', { fieldErrors, formErrors });
  }
  return { ...parsed.data, target: parsed.data.type === 'JSON' ? parsed.data.target : null,
    expectedValue: parsed.data.type === 'JSON' && parsed.data.operator === 'EXISTS' ? undefined : parsed.data.expectedValue };
}

export function mergedAssertion(existing, patch) {
  const changeType = patch.type !== undefined && patch.type !== existing.type;
  const changeOperator = patch.operator !== undefined && patch.operator !== existing.operator;
  return normalizeAssertion({
    type: patch.type ?? existing.type,
    operator: patch.operator ?? existing.operator,
    isEnabled: patch.isEnabled ?? existing.isEnabled,
    target: patch.target !== undefined ? patch.target : (changeType ? undefined : existing.target),
    expectedValue: patch.expectedValue !== undefined ? patch.expectedValue :
      (changeType || changeOperator ? undefined : existing.expectedValue),
  });
}
