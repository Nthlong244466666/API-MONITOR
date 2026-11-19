import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware.js';
import { index, show, store, update, destroy, checks, stats } from '../controllers/monitor.controller.js';

const router = Router();
router.use(requireAuth);
router.get('/', index);
router.post('/', store);
router.get('/:monitorId', show);
router.patch('/:monitorId', update);
router.delete('/:monitorId', destroy);
router.get('/:monitorId/checks', checks);
router.get('/:monitorId/stats', stats);
export default router;
