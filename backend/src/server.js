import app from './app.js';
import { startMonitorScheduler, stopMonitorScheduler } from './jobs/monitorScheduler.js';
import { prisma } from './lib/prisma.js';

const PORT = Number(process.env.PORT) || 3000;
const server = app.listen(PORT, '127.0.0.1', () => {
  console.log(`Backend running at http://127.0.0.1:${PORT}`);
  if (process.env.MONITOR_SCHEDULER_ENABLED !== 'false') startMonitorScheduler();
});
server.on('error', (error) => {
  console.error(error.code === 'EADDRINUSE' ? `Port ${PORT} is already in use` : 'Server startup error:', error);
  process.exitCode = 1;
});
let shuttingDown = false;
async function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`Received ${signal}. Shutting down...`);
  // Stop claiming more work. Allow active checks to finish before closing HTTP server.
  try { await stopMonitorScheduler(); } catch (error) { console.error('Scheduler shutdown failed', error?.code); }
  await new Promise((resolve) => {
    server.close((error) => {
      if (error) { console.error('Shutdown error:', error); process.exitCode = 1; }
      resolve();
    });
  });
  try { await prisma.$disconnect(); } catch { process.exitCode = 1; }
}
process.on('SIGINT', () => { void shutdown('SIGINT'); });
process.on('SIGTERM', () => { void shutdown('SIGTERM'); });
