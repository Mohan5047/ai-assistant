import { getPrismaClient } from '../config/index.js';
import { AppError } from '../middleware/index.js';
import { HTTP_STATUS } from '@personal-ai-assistant/shared';
import type { ReminderResponse, ReminderType, DeliveryStatus } from '@personal-ai-assistant/shared';
import type { Reminder } from '@prisma/client';
import { sendEmailReminder } from './email.service.js';
import { pushService } from './push.service.js';
import { logger } from '../utils/index.js';

function toReminderResponse(reminder: Reminder): ReminderResponse {
  return {
    id: reminder.id,
    userId: reminder.userId,
    eventId: reminder.eventId,
    taskId: reminder.taskId,
    type: reminder.type as unknown as ReminderType,
    scheduledAt: reminder.scheduledAt.toISOString(),
    timezone: reminder.timezone,
    deliveryStatus: reminder.deliveryStatus as unknown as DeliveryStatus,
    deliveredAt: reminder.deliveredAt?.toISOString() ?? null,
    failureReason: reminder.failureReason,
    attempts: reminder.attempts,
    createdAt: reminder.createdAt.toISOString(),
  };
}

export async function createReminder(
  userId: string,
  data: {
    eventId?: string | null;
    taskId?: string | null;
    type?: ReminderType;
    scheduledAt: string;
    timezone?: string;
  }
): Promise<ReminderResponse> {
  const prisma = getPrismaClient();

  if (data.eventId) {
    const event = await prisma.event.findFirst({ where: { id: data.eventId, userId } });
    if (!event) throw new AppError(HTTP_STATUS.NOT_FOUND, 'EVENT_NOT_FOUND', 'Event not found');
  }

  if (data.taskId) {
    const task = await prisma.task.findFirst({ where: { id: data.taskId, userId } });
    if (!task) throw new AppError(HTTP_STATUS.NOT_FOUND, 'TASK_NOT_FOUND', 'Task not found');
  }

  // Idempotency: Prevent duplicate pending reminder for the same target and time
  const existing = await prisma.reminder.findFirst({
    where: {
      userId,
      eventId: data.eventId ?? null,
      taskId: data.taskId ?? null,
      scheduledAt: new Date(data.scheduledAt),
      deliveryStatus: 'PENDING',
    },
  });

  if (existing) {
    return toReminderResponse(existing);
  }

  const reminder = await prisma.reminder.create({
    data: {
      userId,
      eventId: data.eventId ?? null,
      taskId: data.taskId ?? null,
      type: (data.type as any) ?? 'BOTH',
      scheduledAt: new Date(data.scheduledAt),
      timezone: data.timezone ?? 'UTC',
      deliveryStatus: 'PENDING',
      attempts: 0,
    },
  });

  return toReminderResponse(reminder);
}

export async function processDueReminder(reminderId: string): Promise<boolean> {
  const prisma = getPrismaClient();

  const reminder = await prisma.reminder.findUnique({
    where: { id: reminderId },
    include: {
      user: true,
      event: true,
      task: true,
    },
  });

  if (!reminder) {
    logger.warn(`Reminder ${reminderId} not found for processing`);
    return false;
  }

  // Idempotency check: Never re-deliver if already SENT or CANCELLED
  if (reminder.deliveryStatus === 'SENT') {
    logger.info(`Reminder ${reminderId} already sent. Skipping.`);
    return true;
  }
  if (reminder.deliveryStatus === 'CANCELLED') {
    logger.info(`Reminder ${reminderId} was cancelled. Skipping.`);
    return true;
  }

  // Check if reminder is obsolete (event cancelled or task completed)
  if (reminder.event && reminder.event.status === 'CANCELLED') {
    logger.info(`Reminder ${reminderId} suppressed because event was cancelled.`);
    await prisma.reminder.update({
      where: { id: reminderId },
      data: { deliveryStatus: 'CANCELLED' },
    });
    return true;
  }

  if (reminder.task && reminder.task.status === 'DONE') {
    logger.info(`Reminder ${reminderId} suppressed because task was completed.`);
    await prisma.reminder.update({
      where: { id: reminderId },
      data: { deliveryStatus: 'CANCELLED' },
    });
    return true;
  }

  const attempts = reminder.attempts + 1;
  const targetTitle = reminder.event?.title || reminder.task?.title || 'Upcoming item';
  const prefs = (reminder.user.notificationPreferences as any) || {};

  try {
    if ((reminder.type === 'EMAIL' || reminder.type === 'BOTH') && prefs.email !== false) {
      await sendEmailReminder({
        to: reminder.user.email,
        subject: `Reminder: ${targetTitle}`,
        title: targetTitle,
        scheduledTime: reminder.scheduledAt.toISOString(),
        type: reminder.type,
      });
    }

    if ((reminder.type === 'PUSH' || reminder.type === 'BOTH') && prefs.push !== false) {
      await pushService.sendToUser(reminder.userId, {
        title: `Reminder: ${targetTitle}`,
        body: reminder.event
          ? `Upcoming event scheduled for ${new Date(reminder.scheduledAt).toLocaleTimeString()}`
          : `Task due soon: ${targetTitle}`,
        data: {
          reminderId: reminder.id,
          eventId: reminder.eventId,
          taskId: reminder.taskId,
        },
      });
    }

    // Record delivery outcome atomically
    await prisma.reminder.update({
      where: { id: reminderId },
      data: {
        deliveryStatus: 'SENT',
        deliveredAt: new Date(),
        attempts,
        failureReason: null,
      },
    });

    return true;
  } catch (err: any) {
    logger.error(`Error delivering reminder ${reminderId}:`, err.message);

    await prisma.reminder.update({
      where: { id: reminderId },
      data: {
        deliveryStatus: attempts >= 3 ? 'FAILED' : 'PENDING',
        attempts,
        failureReason: err.message || 'Delivery error',
      },
    });

    throw err;
  }
}

export async function rescheduleReminder(reminderId: string, newScheduledAt: string): Promise<ReminderResponse> {
  const prisma = getPrismaClient();

  const updated = await prisma.reminder.update({
    where: { id: reminderId },
    data: {
      scheduledAt: new Date(newScheduledAt),
      deliveryStatus: 'PENDING',
      attempts: 0,
      failureReason: null,
    },
  });

  return toReminderResponse(updated);
}

export async function cancelRemindersForEvent(eventId: string): Promise<number> {
  const prisma = getPrismaClient();
  const res = await prisma.reminder.updateMany({
    where: { eventId, deliveryStatus: 'PENDING' },
    data: { deliveryStatus: 'CANCELLED' },
  });
  return res.count;
}

export async function cancelRemindersForTask(taskId: string): Promise<number> {
  const prisma = getPrismaClient();
  const res = await prisma.reminder.updateMany({
    where: { taskId, deliveryStatus: 'CANCELLED' },
    data: { deliveryStatus: 'CANCELLED' },
  });
  return res.count;
}

export async function listUserReminders(userId: string): Promise<ReminderResponse[]> {
  const prisma = getPrismaClient();
  const reminders = await prisma.reminder.findMany({
    where: { userId },
    orderBy: { scheduledAt: 'asc' },
    take: 50,
  });
  return reminders.map(toReminderResponse);
}
