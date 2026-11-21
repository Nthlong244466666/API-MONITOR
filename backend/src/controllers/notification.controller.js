import { parseNotificationId, parseNotificationQuery } from '../validators/notification.validator.js';
import {
  listNotifications, unreadNotificationCount,
  markNotificationRead, markAllNotificationsRead,
} from '../services/notification.service.js';

function send(res, data) {
  res.setHeader('Cache-Control', 'no-store');
  return res.status(200).json({ success: true, data });
}
export async function index(req, res) {
  return send(res, await listNotifications(req.user.id, parseNotificationQuery(req.query)));
}
export async function unreadCount(req, res) {
  return send(res, await unreadNotificationCount(req.user.id));
}
export async function readOne(req, res) {
  return send(res, await markNotificationRead(req.user.id, parseNotificationId(req.params.notificationId)));
}
export async function readAll(req, res) {
  return send(res, await markAllNotificationsRead(req.user.id));
}
