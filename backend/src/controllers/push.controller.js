import { parsePushSubscription, parsePushRemoval } from '../validators/push.validator.js';
import { publicVapidKey, subscribePush, unsubscribePush } from '../services/pushSubscription.service.js';
function reply(res, data) { res.setHeader('Cache-Control', 'no-store'); return res.status(200).json({ success: true, data }); }
export async function vapid(req, res) { return reply(res, publicVapidKey()); }
export async function subscribe(req, res) { return reply(res, await subscribePush(req.user.id, parsePushSubscription(req.body))); }
export async function unsubscribe(req, res) { return reply(res, await unsubscribePush(req.user.id, parsePushRemoval(req.body))); }
