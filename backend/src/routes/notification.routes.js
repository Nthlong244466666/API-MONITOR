import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware.js';
import { index, unreadCount, readOne, readAll } from '../controllers/notification.controller.js';

const router = Router();
router.use(requireAuth);
router.get('/', index);
router.get('/unread-count', unreadCount);
router.patch('/read-all', readAll);
router.patch('/:notificationId/read', readOne);
export default router;
