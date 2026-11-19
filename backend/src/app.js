import express from 'express';
import cookieParser from 'cookie-parser';
import healthRoutes from './routes/health.routes.js';
import databaseRoutes from './routes/database.routes.js';
import authRoutes from './routes/auth.routes.js';
import workspaceRoutes from './routes/workspace.routes.js';
import projectRoutes from './routes/project.routes.js';
import requestRoutes from './routes/request.routes.js';
import monitorRoutes from './routes/monitor.routes.js';
import { errorHandler } from './middleware/error.middleware.js';
import { startSessionCleanup } from './jobs/sessionCleanup.js';

const app = express();
app.disable('x-powered-by');
if (process.env.NODE_ENV === 'production' && process.env.COOKIE_SECURE !== 'true') {
  throw new Error('Production requires secure cookies and HTTPS');
}
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());
app.use('/api/v1/health', healthRoutes);
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/monitors', monitorRoutes);
app.use('/api/v1/workspaces/:workspaceId/projects/:projectId/requests', requestRoutes);
app.use('/api/v1/workspaces/:workspaceId/projects', projectRoutes);
app.use('/api/v1/workspaces', workspaceRoutes);
if (process.env.NODE_ENV === 'development' && process.env.ENABLE_DEBUG_ROUTES === 'true') {
  app.use('/api/v1/database', databaseRoutes);
}
app.use((_req, res) => res.status(404).json({ success: false, error: { code: 'ROUTE_NOT_FOUND', message: 'API endpoint not found' } }));
app.use(errorHandler);
startSessionCleanup();
export default app;
