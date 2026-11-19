import { rateLimit } from 'express-rate-limit';
import { HttpError } from '../utils/HttpError.js';

const activeByUser = new Map();
let activeGlobal = 0;
const MAX_ACTIVE_PER_USER = 2;
const MAX_ACTIVE_GLOBAL = 10;

export const executionRateLimit = rateLimit({
  windowMs: 60_000,
  limit: 20,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  keyGenerator: (req) => req.user.id,
  handler: (_req, _res, next) => next(new HttpError(429, 'RATE_LIMITED', 'Execution rate limit exceeded')),
});

export async function withExecutionSlot(userId, callback) {
  const current = activeByUser.get(userId) ?? 0;
  if (current >= MAX_ACTIVE_PER_USER || activeGlobal >= MAX_ACTIVE_GLOBAL) {
    throw new HttpError(429, 'EXECUTION_BUSY', 'Too many concurrent API executions');
  }
  activeByUser.set(userId, current + 1);
  activeGlobal += 1;
  try { return await callback(); }
  finally {
    const next = (activeByUser.get(userId) ?? 1) - 1;
    if (next > 0) activeByUser.set(userId, next);
    else activeByUser.delete(userId);
    activeGlobal -= 1;
  }
}
