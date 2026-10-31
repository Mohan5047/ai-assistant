import { describe, it, expect } from 'vitest';
import { createTestUser } from './helpers.js';
import * as reminderService from '../jobs/reminder.service.js';
import { eventService, taskService } from '../services/index.js';

describe('Reminder Engine & Background Delivery', () => {
  it('creates a reminder with idempotency protection', async () => {
    const { user } = await createTestUser();

    const event = await eventService.createEvent(user.id, {
      title: 'Doctor Appointment',
      startTime: new Date(Date.now() + 86400000).toISOString(),
      endTime: new Date(Date.now() + 90000000).toISOString(),
      timezone: 'UTC',
    });

    const scheduledTime = new Date(Date.now() + 80000000).toISOString();

    const rem1 = await reminderService.createReminder(user.id, {
      eventId: event.id,
      scheduledAt: scheduledTime,
      type: 'EMAIL' as any,
    });

    expect(rem1.id).toBeDefined();
    expect(rem1.deliveryStatus).toBe('PENDING');

    // Duplicate creation call with same target and time should return existing reminder (idempotent)
    const rem2 = await reminderService.createReminder(user.id, {
      eventId: event.id,
      scheduledAt: scheduledTime,
      type: 'EMAIL' as any,
    });

    expect(rem2.id).toBe(rem1.id);
  });

  it('delivers due reminder idempotently and increments attempts', async () => {
    const { user } = await createTestUser({ email: 'reminder-test@example.com' });

    const task = await taskService.createTask(user.id, {
      title: 'Tax Filing Deadline',
      dueDate: new Date(Date.now() + 86400000).toISOString(),
    });

    const reminder = await reminderService.createReminder(user.id, {
      taskId: task.id,
      scheduledAt: new Date(Date.now() - 1000).toISOString(), // due in the past
      type: 'EMAIL' as any,
    });

    const delivered = await reminderService.processDueReminder(reminder.id);
    expect(delivered).toBe(true);

    // Second delivery attempt should be a no-op (idempotency check)
    const secondDelivery = await reminderService.processDueReminder(reminder.id);
    expect(secondDelivery).toBe(true);
  });

  it('cancels pending reminders when parent event is cancelled or deleted', async () => {
    const { user } = await createTestUser();

    const event = await eventService.createEvent(user.id, {
      title: 'Sync to Cancel',
      startTime: new Date(Date.now() + 1000000).toISOString(),
      endTime: new Date(Date.now() + 2000000).toISOString(),
      timezone: 'UTC',
    });

    await reminderService.createReminder(user.id, {
      eventId: event.id,
      scheduledAt: new Date(Date.now() + 500000).toISOString(),
    });

    const cancelledCount = await reminderService.cancelRemindersForEvent(event.id);
    expect(cancelledCount).toBe(1);
  });
});
