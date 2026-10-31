import { Queue, Worker } from 'bullmq';
import { getEnv } from '../config/index.js';
import { logger } from '../utils/index.js';
import { processDueReminder } from './reminder.service.js';
import { getPrismaClient } from '../config/index.js';

let reminderQueue: Queue | null = null;
let reminderWorker: Worker | null = null;
let reconciliationInterval: NodeJS.Timeout | null = null;

function getRedisConnectionOptions() {
  const env = getEnv();
  if (!env.REDIS_URL) {
    return null;
  }
  try {
    const url = new URL(env.REDIS_URL);
    return {
      host: url.hostname || 'localhost',
      port: Number(url.port) || 6379,
      password: url.password || undefined,
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
    };
  } catch {
    return {
      host: 'localhost',
      port: 6379,
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
    };
  }
}

export function initReminderQueue(): void {
  const connection = getRedisConnectionOptions();

  if (!connection) {
    logger.info('REDIS_URL not configured. Running database reconciliation loop for reminders.');
    startDatabaseReconciliationLoop();
    return;
  }

  try {
    reminderQueue = new Queue('reminder-delivery', {
      connection,
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
        removeOnComplete: true,
        removeOnFail: false,
      },
    });

    reminderWorker = new Worker(
      'reminder-delivery',
      async (job) => {
        logger.info(`Processing reminder job ${job.id} for reminder ${job.data.reminderId}`);
        await processDueReminder(job.data.reminderId);
      },
      { connection }
    );

    reminderWorker.on('failed', (job, err) => {
      logger.error(`Reminder job ${job?.id} failed with error:`, err.message);
    });

    reminderWorker.on('completed', (job) => {
      logger.info(`Reminder job ${job.id} successfully completed`);
    });

    startDatabaseReconciliationLoop();
  } catch (err: any) {
    logger.warn('Could not initialize Redis Queue. Falling back to database polling reconciliation:', err.message);
    startDatabaseReconciliationLoop();
  }
}

export async function scheduleReminderJob(reminderId: string, scheduledAt: Date): Promise<void> {
  const now = Date.now();
  const delay = Math.max(0, scheduledAt.getTime() - now);

  if (reminderQueue) {
    try {
      await reminderQueue.add(
        'deliver-reminder',
        { reminderId },
        { delay, jobId: `reminder-${reminderId}` }
      );
      logger.info(`Scheduled reminder job for ${reminderId} with delay ${delay}ms`);
      return;
    } catch (err: any) {
      logger.warn(`Could not add job to Redis queue: ${err.message}. Database reconciliation will handle delivery.`);
    }
  }
}

/**
 * Reconciles and delivers any due reminders directly from PostgreSQL.
 * Guarantees delivery even if Redis is restarted or jobs are lost.
 */
function startDatabaseReconciliationLoop(): void {
  if (reconciliationInterval) return;

  const runReconciliation = async () => {
    try {
      const prisma = getPrismaClient();
      const now = new Date();

      const dueReminders = await prisma.reminder.findMany({
        where: {
          deliveryStatus: 'PENDING',
          scheduledAt: { lte: now },
        },
        take: 50,
      });

      for (const rem of dueReminders) {
        try {
          await processDueReminder(rem.id);
        } catch (err: any) {
          logger.error(`Error in reconciliation processing reminder ${rem.id}:`, err.message);
        }
      }
    } catch {
      // Ignore when DB is not yet connected or during early boot
    }
  };

  // Run reconciliation every 60 seconds
  reconciliationInterval = setInterval(runReconciliation, 60000);
  // Also run initial check after 5s
  setTimeout(runReconciliation, 5000);
}

export async function shutdownReminderQueue(): Promise<void> {
  if (reconciliationInterval) {
    clearInterval(reconciliationInterval);
    reconciliationInterval = null;
  }
  if (reminderWorker) {
    await reminderWorker.close();
    reminderWorker = null;
  }
  if (reminderQueue) {
    await reminderQueue.close();
    reminderQueue = null;
  }
}
