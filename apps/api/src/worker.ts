import { validateEnv, getPrismaClient, disconnectDatabase } from './config/index.js';
import { initReminderQueue, shutdownReminderQueue } from './jobs/reminder.queue.js';
import { logger } from './utils/logger.js';

validateEnv();
logger.info('Starting Personal AI Assistant Background Worker...');

// Verify database connection on startup
const prisma = getPrismaClient();
prisma.$connect()
  .then(() => {
    logger.info('Worker successfully connected to Cloud PostgreSQL database.');
    initReminderQueue();
    logger.info('BullMQ reminder queue and reconciliation engine active.');
  })
  .catch((err) => {
    logger.error('Worker failed to connect to database:', err);
    process.exit(1);
  });

// Graceful shutdown handling
const gracefulShutdown = async (signal: string) => {
  logger.info(`Received ${signal}. Shutting down worker gracefully...`);
  try {
    await shutdownReminderQueue();
    await disconnectDatabase();
    logger.info('Worker shutdown complete.');
    process.exit(0);
  } catch (err) {
    logger.error('Error during worker shutdown:', err);
    process.exit(1);
  }
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
