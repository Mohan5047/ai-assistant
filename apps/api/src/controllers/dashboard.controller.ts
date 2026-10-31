import type { Response } from 'express';
import type { AuthenticatedRequest } from '../middleware/index.js';
import { dashboardService, authService } from '../services/index.js';

export async function getSummary(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  const user = await authService.getCurrentUser(req.userId!);
  const summary = await dashboardService.getDashboardSummary(req.userId!, user.timezone);
  res.json({ success: true, data: summary });
}
