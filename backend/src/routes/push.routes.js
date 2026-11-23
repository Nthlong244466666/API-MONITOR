import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware.js';
import { vapid, subscribe, unsubscribe } from '../controllers/push.controller.js';
const router = Router();
router.use(requireAuth);
router.get('/vapid-public-key', vapid);
router.post('/subscriptions', subscribe);
router.delete('/subscriptions', unsubscribe);
export default router;
