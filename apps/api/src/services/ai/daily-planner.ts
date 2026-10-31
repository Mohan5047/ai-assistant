import { getPrismaClient } from '../../config/index.js';
import type { DailyPlanResponse, TimeSlot } from '@personal-ai-assistant/shared';

export async function generateDailyPlan(
  userId: string,
  targetDateStr?: string
): Promise<DailyPlanResponse> {
  const prisma = getPrismaClient();

  const user = await prisma.user.findUnique({ where: { id: userId } });
  const timezone = user?.timezone || 'UTC';

  const date = targetDateStr ? new Date(targetDateStr) : new Date();
  const dayStart = new Date(date);
  dayStart.setHours(8, 0, 0, 0);
  const dayEnd = new Date(date);
  dayEnd.setHours(20, 0, 0, 0);

  // 1. Load fixed commitments (events for today)
  const events = await prisma.event.findMany({
    where: {
      userId,
      status: { not: 'CANCELLED' },
      startTime: { lt: dayEnd },
      endTime: { gt: dayStart },
    },
    orderBy: { startTime: 'asc' },
  });

  const fixedCommitments = events.map((e) => ({
    id: e.id,
    title: e.title,
    start: e.startTime.toISOString(),
    end: e.endTime.toISOString(),
    source: e.source,
  }));

  // 2. Load open tasks
  const tasks = await prisma.task.findMany({
    where: {
      userId,
      status: { notIn: ['DONE', 'CANCELLED'] },
    },
    orderBy: [{ priority: 'desc' }, { dueDate: 'asc' }],
    take: 10,
  });

  const tasksToSchedule = tasks.map((t) => ({
    id: t.id,
    title: t.title,
    priority: t.priority,
    dueDate: t.dueDate?.toISOString() ?? null,
    estimatedMinutes: 45, // realistic default task block
  }));

  // 3. Compute available working slots between 8 AM and 8 PM without overlapping fixed commitments
  const availableSlots: TimeSlot[] = [];
  let currentPointer = dayStart.getTime();

  for (const ev of events) {
    const evStart = Math.max(ev.startTime.getTime(), dayStart.getTime());
    const evEnd = Math.min(ev.endTime.getTime(), dayEnd.getTime());

    if (evStart - currentPointer >= 30 * 60 * 1000) {
      availableSlots.push({
        start: new Date(currentPointer).toISOString(),
        end: new Date(evStart).toISOString(),
        durationMinutes: Math.floor((evStart - currentPointer) / (60 * 1000)),
      });
    }
    currentPointer = Math.max(currentPointer, evEnd);
  }

  if (dayEnd.getTime() - currentPointer >= 30 * 60 * 1000) {
    availableSlots.push({
      start: new Date(currentPointer).toISOString(),
      end: dayEnd.toISOString(),
      durationMinutes: Math.floor((dayEnd.getTime() - currentPointer) / (60 * 1000)),
    });
  }

  // 4. Fit tasks into available slots without overlapping fixed events
  const suggestedSchedule: DailyPlanResponse['suggestedSchedule'] = [];
  let taskIdx = 0;

  for (const slot of availableSlots) {
    let slotTime = new Date(slot.start).getTime();
    const slotEndTime = new Date(slot.end).getTime();

    while (taskIdx < tasksToSchedule.length && slotTime + 45 * 60 * 1000 <= slotEndTime) {
      const task = tasksToSchedule[taskIdx]!;
      const taskStart = new Date(slotTime);
      const taskEnd = new Date(slotTime + 45 * 60 * 1000);

      suggestedSchedule.push({
        taskId: task.id,
        title: `Work on: ${task.title}`,
        start: taskStart.toISOString(),
        end: taskEnd.toISOString(),
        type: 'task',
      });

      // Advance pointer + 15 min buffer
      slotTime += 60 * 60 * 1000;
      taskIdx++;
    }
  }

  const explanation = events.length === 0 && tasks.length === 0
    ? 'Your calendar and task list are currently clear. You have full flexibility today.'
    : `Identified ${fixedCommitments.length} fixed event(s) and slotted ${suggestedSchedule.length} high-priority task(s) into your available free time between 8:00 AM and 8:00 PM without conflicts.`;

  return {
    date: date.toISOString().split('T')[0]!,
    timezone,
    fixedCommitments,
    tasksToSchedule,
    availableSlots,
    suggestedSchedule,
    explanation,
  };
}
