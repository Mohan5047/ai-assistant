import { validateEnv, disconnectDatabase } from './config/index.js';
import { createApp } from './app.js';
import { logger } from './utils/index.js';
import { initReminderQueue, shutdownReminderQueue } from './jobs/reminder.queue.js';

const env = validateEnv();
const app = createApp();

const server = app.listen(env.PORT, () => {
  logger.info(`🚀 API server running on port ${env.PORT}`);
  logger.info(`📍 Environment: ${env.NODE_ENV}`);
  logger.info(`🏥 Health: http://localhost:${env.PORT}/api/health`);
  initReminderQueue();
});

// Graceful shutdown
const shutdown = async (signal: string) => {
  logger.info(`${signal} received. Shutting down gracefully...`);
  server.close(async () => {
    await shutdownReminderQueue();
    await disconnectDatabase();
    logger.info('Server closed.');
    process.exit(0);
  });

  // Force shutdown after 10s
  setTimeout(() => {
    logger.error('Forced shutdown after timeout.');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
