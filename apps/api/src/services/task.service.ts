import { getPrismaClient } from '../config/index.js';
import { AppError } from '../middleware/index.js';
import { HTTP_STATUS } from '@personal-ai-assistant/shared';
import type { TaskResponse, TaskStatus, TaskPriority } from '@personal-ai-assistant/shared';
import type { Task } from '@prisma/client';

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

export async function createTask(
  userId: string,
  data: {
    title: string;
    description?: string;
    priority?: TaskPriority;
    status?: TaskStatus;
    dueDate?: string | null;
    scheduledStart?: string | null;
    scheduledEnd?: string | null;
    timezone?: string;
    eventId?: string | null;
  }
): Promise<TaskResponse> {
  const prisma = getPrismaClient();

  // If eventId provided, verify it belongs to this user
  if (data.eventId) {
    const event = await prisma.event.findFirst({
      where: { id: data.eventId, userId },
    });
    if (!event) {
      throw new AppError(HTTP_STATUS.NOT_FOUND, 'EVENT_NOT_FOUND', 'Associated event not found');
    }
  }

  const task = await prisma.task.create({
    data: {
      userId,
      title: data.title,
      description: data.description ?? null,
      priority: data.priority ?? 'MEDIUM',
      status: data.status ?? 'TODO',
      dueDate: data.dueDate ? new Date(data.dueDate) : null,
      scheduledStart: data.scheduledStart ? new Date(data.scheduledStart) : null,
      scheduledEnd: data.scheduledEnd ? new Date(data.scheduledEnd) : null,
      timezone: data.timezone ?? 'UTC',
      eventId: data.eventId ?? null,
      completedAt: data.status === 'DONE' ? new Date() : null,
    },
  });

  return toTaskResponse(task);
}

export async function getTaskById(userId: string, taskId: string): Promise<TaskResponse> {
  const prisma = getPrismaClient();

  const task = await prisma.task.findFirst({
    where: { id: taskId, userId },
  });

  if (!task) {
    throw new AppError(HTTP_STATUS.NOT_FOUND, 'TASK_NOT_FOUND', 'Task not found');
  }

  return toTaskResponse(task);
}

export async function listTasks(
  userId: string,
  filters: {
    page: number;
    limit: number;
    status?: string;
    priority?: string;
    dueDateFrom?: string;
    dueDateTo?: string;
    search?: string;
    sortBy: 'dueDate' | 'priority' | 'createdAt' | 'title';
    sortOrder: 'asc' | 'desc';
  }
): Promise<{
  tasks: TaskResponse[];
  total: number;
  page: number;
  limit: number;
}> {
  const prisma = getPrismaClient();

  const where: Record<string, unknown> = { userId };

  if (filters.status) {
    where.status = filters.status;
  }
  if (filters.priority) {
    where.priority = filters.priority;
  }
  if (filters.dueDateFrom) {
    where.dueDate = { ...(where.dueDate as object || {}), gte: new Date(filters.dueDateFrom) };
  }
  if (filters.dueDateTo) {
    where.dueDate = { ...(where.dueDate as object || {}), lte: new Date(filters.dueDateTo) };
  }
  if (filters.search) {
    where.title = { contains: filters.search, mode: 'insensitive' };
  }

  const [tasks, total] = await Promise.all([
    prisma.task.findMany({
      where,
      orderBy: { [filters.sortBy]: filters.sortOrder },
      skip: (filters.page - 1) * filters.limit,
      take: filters.limit,
    }),
    prisma.task.count({ where }),
  ]);

  return {
    tasks: tasks.map(toTaskResponse),
    total,
    page: filters.page,
    limit: filters.limit,
  };
}

export async function updateTask(
  userId: string,
  taskId: string,
  data: {
    title?: string;
    description?: string | null;
    priority?: TaskPriority;
    status?: TaskStatus;
    dueDate?: string | null;
    scheduledStart?: string | null;
    scheduledEnd?: string | null;
    timezone?: string;
    eventId?: string | null;
  }
): Promise<TaskResponse> {
  const prisma = getPrismaClient();

  const existing = await prisma.task.findFirst({
    where: { id: taskId, userId },
  });

  if (!existing) {
    throw new AppError(HTTP_STATUS.NOT_FOUND, 'TASK_NOT_FOUND', 'Task not found');
  }

  if (data.eventId) {
    const event = await prisma.event.findFirst({
      where: { id: data.eventId, userId },
    });
    if (!event) {
      throw new AppError(HTTP_STATUS.NOT_FOUND, 'EVENT_NOT_FOUND', 'Associated event not found');
    }
  }

  const updateData: Record<string, unknown> = {};
  if (data.title !== undefined) updateData.title = data.title;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.priority !== undefined) updateData.priority = data.priority;
  if (data.status !== undefined) {
    updateData.status = data.status;
    if (data.status === 'DONE' && existing.status !== 'DONE') {
      updateData.completedAt = new Date();
    } else if (data.status !== 'DONE' && existing.status === 'DONE') {
      updateData.completedAt = null;
    }
  }
  if (data.dueDate !== undefined) {
    updateData.dueDate = data.dueDate ? new Date(data.dueDate) : null;
  }
  if (data.scheduledStart !== undefined) {
    updateData.scheduledStart = data.scheduledStart ? new Date(data.scheduledStart) : null;
  }
  if (data.scheduledEnd !== undefined) {
    updateData.scheduledEnd = data.scheduledEnd ? new Date(data.scheduledEnd) : null;
  }
  if (data.timezone !== undefined) updateData.timezone = data.timezone;
  if (data.eventId !== undefined) updateData.eventId = data.eventId;

  const updated = await prisma.task.update({
    where: { id: taskId },
    data: updateData,
  });

  return toTaskResponse(updated);
}

export async function completeTask(userId: string, taskId: string): Promise<TaskResponse> {
  return updateTask(userId, taskId, { status: 'DONE' as TaskStatus });
}

export async function deleteTask(userId: string, taskId: string): Promise<void> {
  const prisma = getPrismaClient();

  const existing = await prisma.task.findFirst({
    where: { id: taskId, userId },
  });

  if (!existing) {
    throw new AppError(HTTP_STATUS.NOT_FOUND, 'TASK_NOT_FOUND', 'Task not found');
  }

  await prisma.task.delete({ where: { id: taskId } });
}
