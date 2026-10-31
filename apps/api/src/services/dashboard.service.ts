import { getPrismaClient } from '../config/index.js';
import type { EventResponse, TaskResponse, DashboardSummary, TaskPriority, TaskStatus } from '@personal-ai-assistant/shared';
import type { Event, Task } from '@prisma/client';

function toEventResponse(event: Event): EventResponse {
  return {
    id: event.id,
    userId: event.userId,
    title: event.title,
    description: event.description,
    location: event.location,
    startTime: event.startTime.toISOString(),
    endTime: event.endTime.toISOString(),
    timezone: event.timezone,
    isAllDay: event.isAllDay,
    source: event.source as unknown as EventResponse['source'],
    status: event.status as unknown as EventResponse['status'],
    googleEventId: event.googleEventId,
    calendarId: event.calendarId,
    syncStatus: event.syncStatus as unknown as EventResponse['syncStatus'],
    lastSyncedAt: event.lastSyncedAt?.toISOString() ?? null,
    createdAt: event.createdAt.toISOString(),
    updatedAt: event.updatedAt.toISOString(),
  };
}

function toTaskResponse(task: Task): TaskResponse {
  return {
    id: task.id,
    userId: task.userId,
    title: task.title,
    description: task.description,
    priority: task.priority as unknown as TaskPriority,
    status: task.status as unknown as TaskStatus,
    dueDate: task.dueDate?.toISOString() ?? null,
    scheduledStart: task.scheduledStart?.toISOString() ?? null,
    scheduledEnd: task.scheduledEnd?.toISOString() ?? null,
    timezone: task.timezone,
    eventId: task.eventId,
    completedAt: task.completedAt?.toISOString() ?? null,
    createdAt: task.createdAt.toISOString(),
    updatedAt: task.updatedAt.toISOString(),
  };
}

export async function getDashboardSummary(
  userId: string,
  userTimezone: string
): Promise<DashboardSummary> {
  const prisma = getPrismaClient();

  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(now);
  todayEnd.setHours(23, 59, 59, 999);

  const weekEnd = new Date(now);
  weekEnd.setDate(weekEnd.getDate() + 7);

  const tomorrowEnd = new Date(now);
  tomorrowEnd.setDate(tomorrowEnd.getDate() + 1);

  const [
    todayEvents,
    upcomingEvents,
    thisWeekCount,
    todayTasks,
    overdueTasks,
    tasksTodoTotal,
    tasksCompletedToday,
    upcomingRemindersCount,
  ] = await Promise.all([
    // Today events
    prisma.event.findMany({
      where: {
        userId,
        status: { not: 'CANCELLED' },
        startTime: { gte: todayStart, lte: todayEnd },
      },
      orderBy: { startTime: 'asc' },
      take: 50,
    }),
    // Upcoming events
    prisma.event.findMany({
      where: {
        userId,
        status: { not: 'CANCELLED' },
        startTime: { gt: todayEnd },
      },
      orderBy: { startTime: 'asc' },
      take: 10,
    }),
    // Events this week count
    prisma.event.count({
      where: {
        userId,
        status: { not: 'CANCELLED' },
        startTime: { gte: todayStart, lte: weekEnd },
      },
    }),
    // Today tasks (due today or scheduled today)
    prisma.task.findMany({
      where: {
        userId,
        status: { not: 'CANCELLED' },
        OR: [
          { dueDate: { gte: todayStart, lte: todayEnd } },
          { scheduledStart: { gte: todayStart, lte: todayEnd } },
        ],
      },
      orderBy: [{ priority: 'desc' }, { dueDate: 'asc' }],
      take: 20,
    }),
    // Overdue tasks (due before today and not DONE or CANCELLED)
    prisma.task.findMany({
      where: {
        userId,
        status: { notIn: ['DONE', 'CANCELLED'] },
        dueDate: { lt: todayStart },
      },
      orderBy: { dueDate: 'asc' },
      take: 20,
    }),
    // Total active tasks
    prisma.task.count({
      where: {
        userId,
        status: { notIn: ['DONE', 'CANCELLED'] },
      },
    }),
    // Tasks completed today
    prisma.task.count({
      where: {
        userId,
        status: 'DONE',
        completedAt: { gte: todayStart, lte: todayEnd },
      },
    }),
    // Upcoming reminders next 24h
    prisma.reminder.count({
      where: {
        userId,
        deliveryStatus: 'PENDING',
        scheduledAt: { gte: now, lte: tomorrowEnd },
      },
    }),
  ]);

  // Generate real daily briefing
  const hour = now.getHours();
  let timeGreeting = 'Good morning';
  if (hour >= 12 && hour < 17) timeGreeting = 'Good afternoon';
  else if (hour >= 17) timeGreeting = 'Good evening';

  let summaryText = `You have ${todayEvents.length} event${todayEvents.length === 1 ? '' : 's'} scheduled for today`;
  if (todayTasks.length > 0) {
    summaryText += ` and ${todayTasks.length} task${todayTasks.length === 1 ? '' : 's'} due`;
  }
  if (overdueTasks.length > 0) {
    summaryText += `. Note: ${overdueTasks.length} task${overdueTasks.length === 1 ? ' is' : 's are'} overdue.`;
  } else {
    summaryText += `. No overdue tasks!`;
  }

  let focusTip = 'Review your schedule and prioritize high-impact tasks.';
  if (overdueTasks.length > 0) {
    focusTip = `Focus on completing your overdue task "${overdueTasks[0]?.title}" first.`;
  } else if (todayTasks.length > 0) {
    focusTip = `Start with your top task "${todayTasks[0]?.title}".`;
  } else if (todayEvents.length > 0) {
    focusTip = `Next up: "${todayEvents[0]?.title}" at ${new Date(todayEvents[0]?.startTime || '').toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.`;
  }

  return {
    todayEvents: todayEvents.map(toEventResponse),
    upcomingEvents: upcomingEvents.map(toEventResponse),
    todayTasks: todayTasks.map(toTaskResponse),
    overdueTasks: overdueTasks.map(toTaskResponse),
    counts: {
      todayTotal: todayEvents.length,
      upcomingTotal: upcomingEvents.length,
      thisWeekTotal: thisWeekCount,
      tasksTodoTotal,
      tasksOverdueTotal: overdueTasks.length,
      tasksCompletedToday,
      upcomingRemindersTotal: upcomingRemindersCount,
    },
    dailyBriefing: {
      greeting: timeGreeting,
      summary: summaryText,
      focusTip,
    },
  };
}
