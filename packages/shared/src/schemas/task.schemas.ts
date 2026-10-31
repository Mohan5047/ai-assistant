import { z } from 'zod';

export const createTaskSchema = z
  .object({
    title: z.string().min(1, 'Title is required').max(500),
    description: z.string().max(5000).optional(),
    priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).default('MEDIUM'),
    status: z.enum(['TODO', 'IN_PROGRESS', 'DONE', 'CANCELLED']).default('TODO'),
    dueDate: z.string().datetime().optional().nullable(),
    scheduledStart: z.string().datetime().optional().nullable(),
    scheduledEnd: z.string().datetime().optional().nullable(),
    timezone: z.string().default('UTC'),
    eventId: z.string().uuid().optional().nullable(),
  })
  .refine(
    (data) => {
      if (data.scheduledStart && data.scheduledEnd) {
        return new Date(data.scheduledEnd) >= new Date(data.scheduledStart);
      }
      return true;
    },
    {
      message: 'Scheduled end must be after scheduled start',
      path: ['scheduledEnd'],
    }
  );

export const updateTaskSchema = z
  .object({
    title: z.string().min(1).max(500).optional(),
    description: z.string().max(5000).nullable().optional(),
    priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
    status: z.enum(['TODO', 'IN_PROGRESS', 'DONE', 'CANCELLED']).optional(),
    dueDate: z.string().datetime().nullable().optional(),
    scheduledStart: z.string().datetime().nullable().optional(),
    scheduledEnd: z.string().datetime().nullable().optional(),
    timezone: z.string().optional(),
    eventId: z.string().uuid().nullable().optional(),
  })
  .refine(
    (data) => {
      if (data.scheduledStart && data.scheduledEnd) {
        return new Date(data.scheduledEnd) >= new Date(data.scheduledStart);
      }
      return true;
    },
    {
      message: 'Scheduled end must be after scheduled start',
      path: ['scheduledEnd'],
    }
  );

export const taskFilterSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(['TODO', 'IN_PROGRESS', 'DONE', 'CANCELLED']).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
  dueDateFrom: z.string().datetime().optional(),
  dueDateTo: z.string().datetime().optional(),
  search: z.string().max(200).optional(),
  sortBy: z.enum(['dueDate', 'priority', 'createdAt', 'title']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
export type TaskFilterInput = z.infer<typeof taskFilterSchema>;
