import type { Response } from 'express';
import type { AuthenticatedRequest } from '../middleware/index.js';
import { eventService } from '../services/index.js';

export async function createEvent(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  const event = await eventService.createEvent(req.userId!, req.body);
  res.status(201).json({ success: true, data: event });
}

export async function getEvent(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  const event = await eventService.getEventById(req.userId!, req.params.id as string);
  res.json({ success: true, data: event });
}

export async function listEvents(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  const result = await eventService.listEvents(req.userId!, req.query as never);
  const totalPages = Math.ceil(result.total / result.limit);
  res.json({
    success: true,
    data: result.events,
    pagination: {
      page: result.page,
      limit: result.limit,
      total: result.total,
      totalPages,
      hasNext: result.page < totalPages,
      hasPrev: result.page > 1,
    },
  });
}

export async function updateEvent(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  const event = await eventService.updateEvent(req.userId!, req.params.id as string, req.body);
  res.json({ success: true, data: event });
}

export async function deleteEvent(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  await eventService.deleteEvent(req.userId!, req.params.id as string);
  res.status(204).send();
}
