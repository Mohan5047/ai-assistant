import { getPrismaClient } from '../config/database.js';
import { logger } from '../utils/logger.js';
import type { PushNotificationPayload } from '@personal-ai-assistant/shared';

export interface ExpoPushReceipt {
  status: 'ok' | 'error';
  id?: string;
  message?: string;
  details?: { error?: string };
}

export class PushService {
  private expoApiUrl = 'https://exp.host/--/api/v2/push/send';

  /**
   * Check if current time in user's timezone falls within user's quiet hours.
   */
  isQuietHours(timezone: string, quietHoursStart?: string | null, quietHoursEnd?: string | null): boolean {
    if (!quietHoursStart || !quietHoursEnd) return false;

    try {
      const now = new Date();
      // Format current time in user's timezone as "HH:mm"
      const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: timezone || 'UTC',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      });
      const timeStr = formatter.format(now); // "23:15"
      const [curH = 0, curM = 0] = timeStr.split(':').map(Number);
      const curMinutes = curH * 60 + curM;

      const [startH = 0, startM = 0] = quietHoursStart.split(':').map(Number);
      const startMinutes = startH * 60 + startM;

      const [endH = 0, endM = 0] = quietHoursEnd.split(':').map(Number);
      const endMinutes = endH * 60 + endM;

      if (startMinutes <= endMinutes) {
        // e.g. 13:00 to 15:00
        return curMinutes >= startMinutes && curMinutes <= endMinutes;
      } else {
        // Overnight, e.g. 22:00 to 07:00
        return curMinutes >= startMinutes || curMinutes <= endMinutes;
      }
    } catch (err) {
      logger.warn({ err }, 'Failed to evaluate quiet hours, defaulting to not quiet');
      return false;
    }
  }

  /**
   * Send a push notification payload to all active tokens for a user.
   */
  async sendToUser(
    userId: string,
    notification: { title: string; body: string; data?: Record<string, unknown> }
  ): Promise<{ sent: number; failed: number }> {
    // 1. Fetch user to check timezone and quiet hours
    const prisma = getPrismaClient();
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { timezone: true, notificationPreferences: true },
    });

    if (!user) return { sent: 0, failed: 0 };

    const prefs = (user.notificationPreferences as any) || {};
    if (prefs.push === false) {
      logger.info({ userId }, 'Push notifications disabled by user preferences');
      return { sent: 0, failed: 0 };
    }

    if (this.isQuietHours(user.timezone, prefs.quietHoursStart, prefs.quietHoursEnd)) {
      logger.info({ userId }, 'Push notification suppressed due to user quiet hours');
      return { sent: 0, failed: 0 };
    }

    // 2. Fetch all active device push tokens for user
    const devices = await prisma.device.findMany({
      where: { userId, isActive: true },
    });

    if (devices.length === 0) {
      logger.debug({ userId }, 'No active devices registered for user');
      return { sent: 0, failed: 0 };
    }

    let sent = 0;
    let failed = 0;

    for (const device of devices) {
      const success = await this.sendPush(device.token, notification);
      if (success) {
        sent++;
      } else {
        failed++;
      }
    }

    return { sent, failed };
  }

  /**
   * Send an Expo push notification to a specific token.
   * If token is invalid or unregistered, deactivate it in database.
   */
  async sendPush(
    token: string,
    notification: { title: string; body: string; data?: Record<string, unknown> }
  ): Promise<boolean> {
    // In test environment or mock tokens, simulate successful delivery
    if (process.env.NODE_ENV === 'test' || token.startsWith('ExponentPushToken[mock-')) {
      logger.info({ token, title: notification.title }, '[Push Service (Mock)] Sent push notification');
      return true;
    }

    // Expo push token format check
    if (!token.startsWith('ExponentPushToken[') && !token.startsWith('ExpoPushToken[')) {
      logger.warn({ token }, 'Invalid Expo push token format. Deactivating token.');
      await this.deactivateToken(token);
      return false;
    }

    try {
      const payload: PushNotificationPayload = {
        to: token,
        title: notification.title,
        body: notification.body,
        data: notification.data || {},
        sound: 'default',
      };

      const response = await fetch(this.expoApiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'Accept-Encoding': 'gzip, deflate',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        logger.error({ status: response.status, token }, 'Expo push endpoint returned HTTP error');
        return false;
      }

      const resJson: any = await response.json();
      const ticket = resJson.data?.[0] || resJson.data;

      if (ticket?.status === 'error') {
        logger.error({ ticket, token }, 'Expo push delivery error');
        if (ticket.details?.error === 'DeviceNotRegistered') {
          logger.info({ token }, 'Device is no longer registered. Deactivating push token.');
          await this.deactivateToken(token);
        }
        return false;
      }

      logger.info({ token, title: notification.title }, 'Successfully dispatched push notification');
      return true;
    } catch (err) {
      logger.error({ err, token }, 'Failed to deliver push notification via Expo');
      return false;
    }
  }

  private async deactivateToken(token: string): Promise<void> {
    try {
      const prisma = getPrismaClient();
      await prisma.device.updateMany({
        where: { token },
        data: { isActive: false },
      });
    } catch (err) {
      logger.warn({ err, token }, 'Failed to deactivate dead push token');
    }
  }
}

export const pushService = new PushService();
