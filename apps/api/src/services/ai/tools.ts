import { z } from 'zod';
import { eventService, taskService, dashboardService } from '../index.js';
import { createReminder } from '../../jobs/reminder.service.js';
import { getPrismaClient } from '../../config/index.js';
import { logger } from '../../utils/index.js';

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: z.ZodObject<any>;
  isDestructive?: boolean;
}

export const AI_TOOLS: Record<string, ToolDefinition> = {
  list_events: {
    name: 'list_events',
    description: 'List calendar events for the user with optional date range and search filter',
    parameters: z.object({
      startDate: z.string().optional().describe('ISO start datetime filter'),
      endDate: z.string().optional().describe('ISO end datetime filter'),
      search: z.string().optional().describe('Keyword search in event title'),
    }),
  },
  get_event: {
    name: 'get_event',
    description: 'Get details of a specific event by ID',
    parameters: z.object({
      eventId: z.string().uuid().describe('Event UUID'),
    }),
  },
  create_event: {
    name: 'create_event',
    description: 'Create a new calendar event. Timezone must be provided.',
    parameters: z.object({
      title: z.string().min(1).describe('Event title'),
      startTime: z.string().datetime().describe('Start ISO datetime'),
      endTime: z.string().datetime().describe('End ISO datetime'),
      timezone: z.string().describe('IANA timezone'),
      description: z.string().optional(),
      location: z.string().optional(),
      isAllDay: z.boolean().optional(),
    }),
  },
  update_event: {
    name: 'update_event',
    description: 'Update an existing calendar event',
    parameters: z.object({
      eventId: z.string().uuid().describe('Event UUID to update'),
      title: z.string().optional(),
      startTime: z.string().datetime().optional(),
      endTime: z.string().datetime().optional(),
      location: z.string().optional(),
      description: z.string().optional(),
    }),
  },
  delete_event: {
    name: 'delete_event',
    description: 'Delete a calendar event (requires explicit user confirmation)',
    parameters: z.object({
      eventId: z.string().uuid().describe('Event UUID to delete'),
    }),
    isDestructive: true,
  },
  list_tasks: {
    name: 'list_tasks',
    description: 'List user tasks with optional status and priority filtering',
    parameters: z.object({
      status: z.enum(['TODO', 'IN_PROGRESS', 'DONE', 'CANCELLED']).optional(),
      priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
      search: z.string().optional(),
    }),
  },
  create_task: {
    name: 'create_task',
    description: 'Create a new task for the user',
    parameters: z.object({
      title: z.string().min(1).describe('Task title'),
      description: z.string().optional(),
      priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
      dueDate: z.string().datetime().optional(),
      timezone: z.string().optional(),
    }),
  },
  update_task: {
    name: 'update_task',
    description: 'Update an existing task',
    parameters: z.object({
      taskId: z.string().uuid().describe('Task UUID to update'),
      title: z.string().optional(),
      description: z.string().optional(),
      priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
      status: z.enum(['TODO', 'IN_PROGRESS', 'DONE', 'CANCELLED']).optional(),
      dueDate: z.string().datetime().optional(),
    }),
  },
  complete_task: {
    name: 'complete_task',
    description: 'Mark a task as completed',
    parameters: z.object({
      taskId: z.string().uuid().describe('Task UUID to mark as completed'),
    }),
  },
  get_daily_summary: {
    name: 'get_daily_summary',
    description: 'Get a summary of the user events, tasks, and overdue items for today',
    parameters: z.object({}),
  },
  find_available_slots: {
    name: 'find_available_slots',
    description: 'Find free time slots on a given date during working hours (9 AM - 6 PM)',
    parameters: z.object({
      date: z.string().describe('YYYY-MM-DD date string'),
      durationMinutes: z.number().int().min(15).max(480).default(60),
    }),
  },
  create_reminder: {
    name: 'create_reminder',
    description: 'Create a reminder notification for an event or task',
    parameters: z.object({
      eventId: z.string().uuid().optional(),
      taskId: z.string().uuid().optional(),
      scheduledAt: z.string().datetime().describe('When the reminder should fire'),
      type: z.enum(['EMAIL', 'PUSH', 'BOTH']).default('BOTH'),
    }),
  },
  get_user_preferences: {
    name: 'get_user_preferences',
    description: 'Get user timezone, language, and notification preferences',
    parameters: z.object({}),
  },
};

export async function executeToolCall(
  userId: string,
  toolName: string,
  rawArgs: unknown
): Promise<{ success: boolean; data?: any; error?: string }> {
  const toolDef = AI_TOOLS[toolName];
  if (!toolDef) {
    return { success: false, error: `Tool ${toolName} is not recognized` };
  }

  // Validate args with Zod schema
  const parsed = toolDef.parameters.safeParse(rawArgs);
  if (!parsed.success) {
    return {
      success: false,
      error: `Invalid arguments for tool ${toolName}: ${JSON.stringify(parsed.error.flatten().fieldErrors)}`,
    };
  }

  const args = parsed.data;
  logger.info(`AI executing tool "${toolName}" for user ${userId}`);

  try {
    switch (toolName) {
      case 'list_events': {
        const result = await eventService.listEvents(userId, {
          page: 1,
          limit: 20,
          startDate: args.startDate,
          endDate: args.endDate,
          search: args.search,
          sortBy: 'startTime',
          sortOrder: 'asc',
        });
        return { success: true, data: result.events };
      }
      case 'get_event': {
        const event = await eventService.getEventById(userId, args.eventId);
        return { success: true, data: event };
      }
      case 'create_event': {
        const event = await eventService.createEvent(userId, args as any);
        return { success: true, data: event };
      }
      case 'update_event': {
        const { eventId, ...updateData } = args;
        const updated = await eventService.updateEvent(userId, eventId, updateData);
        return { success: true, data: updated };
      }
      case 'delete_event': {
        await eventService.deleteEvent(userId, args.eventId);
        return { success: true, data: { deleted: true, eventId: args.eventId } };
      }
      case 'list_tasks': {
        const result = await taskService.listTasks(userId, {
          page: 1,
          limit: 30,
          status: args.status,
          priority: args.priority,
          search: args.search,
          sortBy: 'createdAt',
          sortOrder: 'desc',
        });
        return { success: true, data: result.tasks };
      }
      case 'create_task': {
        const task = await taskService.createTask(userId, args as any);
        return { success: true, data: task };
      }
      case 'update_task': {
        const { taskId, ...updateData } = args;
        const updated = await taskService.updateTask(userId, taskId, updateData);
        return { success: true, data: updated };
      }
      case 'complete_task': {
        const task = await taskService.completeTask(userId, args.taskId);
        return { success: true, data: task };
      }
      case 'get_daily_summary': {
        const prisma = getPrismaClient();
        const user = await prisma.user.findUnique({ where: { id: userId } });
        const summary = await dashboardService.getDashboardSummary(userId, user?.timezone || 'UTC');
        return { success: true, data: summary };
      }
      case 'find_available_slots': {
        const prisma = getPrismaClient();
        const targetDate = new Date(args.date);
        const dayStart = new Date(targetDate);
        dayStart.setHours(9, 0, 0, 0);
        const dayEnd = new Date(targetDate);
        dayEnd.setHours(18, 0, 0, 0);

        const events = await prisma.event.findMany({
          where: {
            userId,
            status: { not: 'CANCELLED' },
            startTime: { lt: dayEnd },
            endTime: { gt: dayStart },
          },
          orderBy: { startTime: 'asc' },
        });

        // Compute gaps between 9 AM and 6 PM
        const slots: Array<{ start: string; end: string; durationMinutes: number }> = [];
        let current = dayStart.getTime();
        const requiredMs = args.durationMinutes * 60 * 1000;

        for (const ev of events) {
          const evStart = Math.max(ev.startTime.getTime(), dayStart.getTime());
          const evEnd = Math.min(ev.endTime.getTime(), dayEnd.getTime());

          if (evStart - current >= requiredMs) {
            slots.push({
              start: new Date(current).toISOString(),
              end: new Date(evStart).toISOString(),
              durationMinutes: Math.floor((evStart - current) / (60 * 1000)),
            });
          }
          current = Math.max(current, evEnd);
        }

        if (dayEnd.getTime() - current >= requiredMs) {
          slots.push({
            start: new Date(current).toISOString(),
            end: dayEnd.toISOString(),
            durationMinutes: Math.floor((dayEnd.getTime() - current) / (60 * 1000)),
          });
        }

        return { success: true, data: slots };
      }
      case 'create_reminder': {
        const reminder = await createReminder(userId, args as any);
        return { success: true, data: reminder };
      }
      case 'get_user_preferences': {
        const prisma = getPrismaClient();
        const user = await prisma.user.findUnique({ where: { id: userId } });
        return {
          success: true,
          data: {
            timezone: user?.timezone || 'UTC',
            preferredLanguage: user?.preferredLanguage || 'en',
            notificationPreferences: user?.notificationPreferences,
          },
        };
      }
      default:
        return { success: false, error: `Unhandled tool ${toolName}` };
    }
  } catch (err: any) {
    logger.error(`Error executing AI tool ${toolName}:`, err.message);
    return { success: false, error: err.message || 'Execution error' };
  }
}
