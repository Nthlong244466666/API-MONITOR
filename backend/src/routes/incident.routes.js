import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware.js';
import { index, show } from '../controllers/incident.controller.js';

const router = Router();
router.use(requireAuth);
router.get('/', index);
router.get('/:incidentId', show);
export default router;
