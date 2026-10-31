import { z } from 'zod';

export const deviceRegistrationSchema = z.object({
  token: z.string().min(1, 'Device push token is required'),
  platform: z.enum(['ios', 'android', 'web']),
});

export const updateNotificationPreferencesSchema = z.object({
  email: z.boolean().optional(),
  push: z.boolean().optional(),
  reminderMinutesBefore: z.number().int().min(0).max(1440).optional(),
  quietHoursStart: z
    .string()
    .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Invalid time format (HH:MM)')
    .nullable()
    .optional(),
  quietHoursEnd: z
    .string()
    .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Invalid time format (HH:MM)')
    .nullable()
    .optional(),
});
