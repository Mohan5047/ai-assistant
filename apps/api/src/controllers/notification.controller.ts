import type { Response } from 'express';
import type { AuthenticatedRequest } from '../middleware/index.js';
import { notificationService } from '../services/notification.service.js';
import { HTTP_STATUS } from '@personal-ai-assistant/shared';

export class NotificationController {
  async registerDevice(req: AuthenticatedRequest, res: Response): Promise<void> {
    const userId = req.userId!;
    const device = await notificationService.registerDevice(userId, req.body);
    res.status(HTTP_STATUS.CREATED).json({
      success: true,
      data: device,
    });
  }

  async unregisterDevice(req: AuthenticatedRequest, res: Response): Promise<void> {
    const userId = req.userId!;
    const token = req.params.token as string;
    await notificationService.unregisterDevice(userId, token);
    res.status(HTTP_STATUS.NO_CONTENT).send();
  }

  async getPreferences(req: AuthenticatedRequest, res: Response): Promise<void> {
    const userId = req.userId!;
    const preferences = await notificationService.getPreferences(userId);
    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: preferences,
    });
  }

  async updatePreferences(req: AuthenticatedRequest, res: Response): Promise<void> {
    const userId = req.userId!;
    const preferences = await notificationService.updatePreferences(userId, req.body);
    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: preferences,
    });
  }

  async sendTestPush(req: AuthenticatedRequest, res: Response): Promise<void> {
    const userId = req.userId!;
    const result = await notificationService.sendTestPush(userId);
    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: result,
    });
  }
}

export const notificationController = new NotificationController();
