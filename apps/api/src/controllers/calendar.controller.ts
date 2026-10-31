import type { Response } from 'express';
import type { AuthenticatedRequest } from '../middleware/index.js';
import * as calendarService from '../services/calendar/google-calendar.service.js';

export async function getAuthUrl(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  const authUrl = calendarService.generateCalendarAuthUrl(req.userId!);
  res.json({ success: true, data: { authUrl } });
}

export async function handleCallback(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  const { code, state } = req.query as { code: string; state: string };
  const result = await calendarService.handleOAuthCallback(req.userId!, code, state);
  res.json({ success: true, data: result });
}

export async function getStatus(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  const status = await calendarService.getCalendarConnectionStatus(req.userId!);
  res.json({ success: true, data: status });
}

export async function disconnect(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  await calendarService.disconnectCalendar(req.userId!);
  res.json({ success: true, data: { message: 'Calendar disconnected' } });
}

export async function triggerSync(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  const result = await calendarService.syncGoogleCalendar(req.userId!);
  res.json({ success: true, data: result });
}
