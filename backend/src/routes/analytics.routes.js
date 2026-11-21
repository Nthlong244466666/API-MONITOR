import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware.js';
import { overview, trends, recentIncidents } from '../controllers/analytics.controller.js';

const router = Router();
router.use(requireAuth);
router.get('/overview', overview);
router.get('/trends', trends);
router.get('/recent-incidents', recentIncidents);
export default router;
