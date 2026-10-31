import { z } from 'zod';

export const createReminderSchema = z
  .object({
    eventId: z.string().uuid().optional().nullable(),
    taskId: z.string().uuid().optional().nullable(),
    type: z.enum(['EMAIL', 'PUSH', 'BOTH']).default('BOTH'),
    scheduledAt: z.string().datetime({ message: 'scheduledAt must be a valid ISO datetime' }),
    timezone: z.string().default('UTC'),
  })
  .refine((data) => data.eventId || data.taskId, {
    message: 'Reminder must be associated with either an event or a task',
  });

export type CreateReminderInput = z.infer<typeof createReminderSchema>;
