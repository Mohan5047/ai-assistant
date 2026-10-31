import { z } from 'zod';

const ianaTimezoneRegex = /^(?:[A-Za-z_]+(?:\/[A-Za-z_]+)+|UTC|GMT)$/;

export const createEventSchema = z
  .object({
    title: z.string().min(1, 'Title is required').max(500),
    description: z.string().max(5000).optional(),
    location: z.string().max(500).optional(),
    startTime: z.string().datetime({ message: 'Invalid start time ISO format' }),
    endTime: z.string().datetime({ message: 'Invalid end time ISO format' }),
    timezone: z.string().regex(ianaTimezoneRegex, 'Must be a valid IANA timezone (e.g., America/New_York)'),
    isAllDay: z.boolean().default(false),
    status: z.enum(['CONFIRMED', 'TENTATIVE', 'CANCELLED']).default('CONFIRMED'),
  })
  .refine(
    (data) => {
      if (data.isAllDay) return true;
      return new Date(data.endTime) > new Date(data.startTime);
    },
    {
      message: 'End time must be after start time for timed events',
      path: ['endTime'],
    }
  );

export const updateEventSchema = z
  .object({
    title: z.string().min(1).max(500).optional(),
    description: z.string().max(5000).nullable().optional(),
    location: z.string().max(500).nullable().optional(),
    startTime: z.string().datetime({ message: 'Invalid start time ISO format' }).optional(),
    endTime: z.string().datetime({ message: 'Invalid end time ISO format' }).optional(),
    timezone: z.string().regex(ianaTimezoneRegex, 'Must be a valid IANA timezone').optional(),
    isAllDay: z.boolean().optional(),
    status: z.enum(['CONFIRMED', 'TENTATIVE', 'CANCELLED']).optional(),
  })
  .refine(
    (data) => {
      if (!data.startTime || !data.endTime) return true;
      if (data.isAllDay) return true;
      return new Date(data.endTime) > new Date(data.startTime);
    },
    {
      message: 'End time must be after start time for timed events',
      path: ['endTime'],
    }
  );

export const eventFilterSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  status: z.enum(['CONFIRMED', 'TENTATIVE', 'CANCELLED']).optional(),
  source: z.enum(['MANUAL', 'GOOGLE_CALENDAR', 'AI_SUGGESTED']).optional(),
  search: z.string().max(200).optional(),
  sortBy: z.enum(['startTime', 'createdAt']).default('startTime'),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
});

export type CreateEventInput = z.infer<typeof createEventSchema>;
export type UpdateEventInput = z.infer<typeof updateEventSchema>;
export type EventFilterInput = z.infer<typeof eventFilterSchema>;
