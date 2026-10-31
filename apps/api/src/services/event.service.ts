import { getPrismaClient } from '../config/index.js';
import { AppError } from '../middleware/index.js';
import { HTTP_STATUS } from '@personal-ai-assistant/shared';
import type { EventResponse } from '@personal-ai-assistant/shared';
import type { Event } from '@prisma/client';

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

export async function createEvent(
  userId: string,
  data: {
    title: string;
    description?: string;
    location?: string;
    startTime: string;
    endTime: string;
    timezone: string;
    isAllDay?: boolean;
    status?: 'CONFIRMED' | 'TENTATIVE' | 'CANCELLED';
  }
): Promise<EventResponse> {
  const prisma = getPrismaClient();

  const event = await prisma.event.create({
    data: {
      userId,
      title: data.title,
      description: data.description ?? null,
      location: data.location ?? null,
      startTime: new Date(data.startTime),
      endTime: new Date(data.endTime),
      timezone: data.timezone,
      isAllDay: data.isAllDay ?? false,
      status: data.status ?? 'CONFIRMED',
      source: 'MANUAL',
      syncStatus: 'NOT_APPLICABLE',
    },
  });

  return toEventResponse(event);
}

export async function getEventById(
  userId: string,
  eventId: string
): Promise<EventResponse> {
  const prisma = getPrismaClient();

  const event = await prisma.event.findFirst({
    where: { id: eventId, userId },
  });

  if (!event) {
    throw new AppError(HTTP_STATUS.NOT_FOUND, 'EVENT_NOT_FOUND', 'Event not found');
  }

  return toEventResponse(event);
}

export async function listEvents(
  userId: string,
  filters: {
    page: number;
    limit: number;
    startDate?: string;
    endDate?: string;
    status?: string;
    source?: string;
    search?: string;
    sortBy: 'startTime' | 'createdAt';
    sortOrder: 'asc' | 'desc';
  }
): Promise<{
  events: EventResponse[];
  total: number;
  page: number;
  limit: number;
}> {
  const prisma = getPrismaClient();

  const where: Record<string, unknown> = { userId };

  if (filters.startDate) {
    where.startTime = { ...(where.startTime as object || {}), gte: new Date(filters.startDate) };
  }
  if (filters.endDate) {
    where.endTime = { ...(where.endTime as object || {}), lte: new Date(filters.endDate) };
  }
  if (filters.status) {
    where.status = filters.status;
  }
  if (filters.source) {
    where.source = filters.source;
  }
  if (filters.search) {
    where.title = { contains: filters.search, mode: 'insensitive' };
  }

  const [events, total] = await Promise.all([
    prisma.event.findMany({
      where,
      orderBy: { [filters.sortBy]: filters.sortOrder },
      skip: (filters.page - 1) * filters.limit,
      take: filters.limit,
    }),
    prisma.event.count({ where }),
  ]);

  return {
    events: events.map(toEventResponse),
    total,
    page: filters.page,
    limit: filters.limit,
  };
}

export async function updateEvent(
  userId: string,
  eventId: string,
  data: {
    title?: string;
    description?: string | null;
    location?: string | null;
    startTime?: string;
    endTime?: string;
    timezone?: string;
    isAllDay?: boolean;
    status?: 'CONFIRMED' | 'TENTATIVE' | 'CANCELLED';
  }
): Promise<EventResponse> {
  const prisma = getPrismaClient();

  const existing = await prisma.event.findFirst({
    where: { id: eventId, userId },
  });

  if (!existing) {
    throw new AppError(HTTP_STATUS.NOT_FOUND, 'EVENT_NOT_FOUND', 'Event not found');
  }

  // Validate time range if both are being updated
  const newStart = data.startTime ? new Date(data.startTime) : existing.startTime;
  const newEnd = data.endTime ? new Date(data.endTime) : existing.endTime;
  const isAllDay = data.isAllDay !== undefined ? data.isAllDay : existing.isAllDay;

  if (!isAllDay && newEnd <= newStart) {
    throw new AppError(
      HTTP_STATUS.BAD_REQUEST,
      'INVALID_TIME_RANGE',
      'End time must be after start time for timed events'
    );
  }

  const updateData: Record<string, unknown> = {};
  if (data.title !== undefined) updateData.title = data.title;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.location !== undefined) updateData.location = data.location;
  if (data.startTime !== undefined) updateData.startTime = new Date(data.startTime);
  if (data.endTime !== undefined) updateData.endTime = new Date(data.endTime);
  if (data.timezone !== undefined) updateData.timezone = data.timezone;
  if (data.isAllDay !== undefined) updateData.isAllDay = data.isAllDay;
  if (data.status !== undefined) updateData.status = data.status;

  const updated = await prisma.event.update({
    where: { id: eventId },
    data: updateData,
  });

  return toEventResponse(updated);
}

export async function deleteEvent(
  userId: string,
  eventId: string
): Promise<void> {
  const prisma = getPrismaClient();

  const existing = await prisma.event.findFirst({
    where: { id: eventId, userId },
  });

  if (!existing) {
    throw new AppError(HTTP_STATUS.NOT_FOUND, 'EVENT_NOT_FOUND', 'Event not found');
  }

  await prisma.event.delete({ where: { id: eventId } });
}
