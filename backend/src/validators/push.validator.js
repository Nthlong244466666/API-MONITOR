import { HttpError } from '../utils/HttpError.js';
import { isTrustedPushEndpoint, validPushKey } from '../lib/pushRules.js';

const bad = () => new HttpError(400, 'INVALID_PUSH_SUBSCRIPTION', 'Invalid browser push subscription');
export function parsePushSubscription(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw bad();
  const { endpoint, keys } = body;
  if (!isTrustedPushEndpoint(endpoint) || !keys || !validPushKey(keys.p256dh) || !validPushKey(keys.auth)) throw bad();
  return { endpoint, p256dh: keys.p256dh, auth: keys.auth };
}
export function parsePushRemoval(body) {
  if (!body || !isTrustedPushEndpoint(body.endpoint)) throw bad();
  return body.endpoint;
}
