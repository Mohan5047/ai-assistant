import { getPrismaClient } from '../config/database.js';
import { AppError } from '../middleware/index.js';
import { HTTP_STATUS } from '@personal-ai-assistant/shared';
import type {
  DeviceRegistrationRequest,
  DeviceResponse,
  NotificationPreferences,
  UpdateNotificationPreferencesRequest,
} from '@personal-ai-assistant/shared';
import { pushService } from '../jobs/push.service.js';

export class NotificationService {
  /**
   * Register or update an Expo device push token for an authenticated user.
   */
  async registerDevice(userId: string, data: DeviceRegistrationRequest): Promise<DeviceResponse> {
    const prisma = getPrismaClient();
    const device = await prisma.device.upsert({
      where: { token: data.token },
      create: {
        userId,
        token: data.token,
        platform: data.platform,
        isActive: true,
      },
      update: {
        userId, // Transfer token if device account switched
        platform: data.platform,
        isActive: true,
      },
    });

    return {
      id: device.id,
      userId: device.userId,
      token: device.token,
      platform: device.platform as any,
      isActive: device.isActive,
      createdAt: device.createdAt.toISOString(),
      updatedAt: device.updatedAt.toISOString(),
    };
  }

  /**
   * Unregister / deactivate a device token on logout or account removal.
   */
  async unregisterDevice(userId: string, token: string): Promise<void> {
    const prisma = getPrismaClient();
    await prisma.device.deleteMany({
      where: {
        userId,
        token,
      },
    });
  }

  /**
   * Get user notification preferences.
   */
  async getPreferences(userId: string): Promise<NotificationPreferences> {
    const prisma = getPrismaClient();
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { notificationPreferences: true },
    });

    if (!user) {
      throw new AppError(HTTP_STATUS.NOT_FOUND, 'USER_NOT_FOUND', 'User not found');
    }

    const defaultPrefs: NotificationPreferences = {
      email: true,
      push: true,
      reminderMinutesBefore: 15,
      quietHoursStart: '22:00',
      quietHoursEnd: '07:00',
    };

    return {
      ...defaultPrefs,
      ...((user.notificationPreferences as any) || {}),
    };
  }

  /**
   * Update notification preferences.
   */
  async updatePreferences(
    userId: string,
    data: UpdateNotificationPreferencesRequest
  ): Promise<NotificationPreferences> {
    const prisma = getPrismaClient();
    const current = await this.getPreferences(userId);
    const updated: NotificationPreferences = {
      ...current,
      ...data,
    };

    await prisma.user.update({
      where: { id: userId },
      data: {
        notificationPreferences: updated as any,
      },
    });

    return updated;
  }

  /**
   * Send a test push notification to user's registered devices.
   */
  async sendTestPush(userId: string): Promise<{ sent: number; failed: number }> {
    return pushService.sendToUser(userId, {
      title: 'Life Assistant Notification',
      body: 'Push notifications are successfully configured and active!',
      data: { type: 'test' },
    });
  }
}

export const notificationService = new NotificationService();
