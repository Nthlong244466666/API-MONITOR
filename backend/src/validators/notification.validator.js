import { z } from 'zod';
import { HttpError } from '../utils/HttpError.js';

const listSchema = z.object({
  isRead: z.enum(['true', 'false']).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  cursor: z.uuid().optional(),
}).strict();

export function parseNotificationId(value) {
  const result = z.uuid().safeParse(value);
  if (!result.success) throw new HttpError(404, 'NOTIFICATION_NOT_FOUND', 'Notification not found');
  return result.data;
}
export function parseNotificationQuery(value) {
  const result = listSchema.safeParse(value ?? {});
  if (!result.success) throw new HttpError(400, 'VALIDATION_ERROR', 'Invalid notification query');
  return { ...result.data, isRead: result.data.isRead === undefined ? undefined : result.data.isRead === 'true' };
}
