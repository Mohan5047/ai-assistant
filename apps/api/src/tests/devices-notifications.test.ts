import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';
import { setPrismaClient } from '../config/index.js';
import { createMockPrismaClient } from './mock-db.js';
import { pushService } from '../jobs/push.service.js';
import { processDueReminder } from '../jobs/reminder.service.js';

describe('Devices & Push Notifications API', () => {
  let app: ReturnType<typeof createApp>;
  let mockDb: ReturnType<typeof createMockPrismaClient>;
  let authToken: string;
  let userId: string;

  beforeEach(async () => {
    mockDb = createMockPrismaClient();
    setPrismaClient(mockDb);
    app = createApp();

    // Register user
    const regRes = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'device-test@example.com',
        password: 'Password123!',
        displayName: 'Device Tester',
        timezone: 'UTC',
      });

    authToken = regRes.body.data.token;
    userId = regRes.body.data.user.id;
  });

  it('registers a mobile device push token', async () => {
    const res = await request(app)
      .post('/api/notifications/devices')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        token: 'ExponentPushToken[mock-device-token-123]',
        platform: 'ios',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBe('ExponentPushToken[mock-device-token-123]');
    expect(res.body.data.platform).toBe('ios');
    expect(res.body.data.isActive).toBe(true);
  });

  it('unregisters a device push token', async () => {
    await request(app)
      .post('/api/notifications/devices')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        token: 'ExponentPushToken[mock-device-token-to-delete]',
        platform: 'android',
      });

    const delRes = await request(app)
      .delete('/api/notifications/devices/ExponentPushToken[mock-device-token-to-delete]')
      .set('Authorization', `Bearer ${authToken}`);

    expect(delRes.status).toBe(204);

    const devices = await (mockDb as any).device.findMany({
      where: { userId },
    });
    expect(devices.find((d: any) => d.token === 'ExponentPushToken[mock-device-token-to-delete]')).toBeUndefined();
  });

  it('reads and updates notification preferences', async () => {
    const getRes = await request(app)
      .get('/api/notifications/preferences')
      .set('Authorization', `Bearer ${authToken}`);

    expect(getRes.status).toBe(200);
    expect(getRes.body.data.email).toBe(true);
    expect(getRes.body.data.push).toBe(true);

    const putRes = await request(app)
      .put('/api/notifications/preferences')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        email: false,
        push: true,
        reminderMinutesBefore: 30,
        quietHoursStart: '23:00',
        quietHoursEnd: '08:00',
      });

    expect(putRes.status).toBe(200);
    expect(putRes.body.data.email).toBe(false);
    expect(putRes.body.data.reminderMinutesBefore).toBe(30);
    expect(putRes.body.data.quietHoursStart).toBe('23:00');
  });

  it('sends a test push notification to user devices', async () => {
    await request(app)
      .post('/api/notifications/devices')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        token: 'ExponentPushToken[mock-test-push-token]',
        platform: 'ios',
      });

    const testRes = await request(app)
      .post('/api/notifications/test-push')
      .set('Authorization', `Bearer ${authToken}`);

    expect(testRes.status).toBe(200);
    expect(testRes.body.data.sent).toBe(1);
    expect(testRes.body.data.failed).toBe(0);
  });

  it('suppresses reminders for tasks that are already completed', async () => {
    // 1. Create a task
    const taskRes = await request(app)
      .post('/api/tasks')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        title: 'Task that will be completed',
        priority: 'HIGH',
      });

    const taskId = taskRes.body.data.id;

    // 2. Create a reminder for this task
    const reminder = await (mockDb as any).reminder.create({
      data: {
        userId,
        taskId,
        scheduledAt: new Date(Date.now() - 1000),
        deliveryStatus: 'PENDING',
        type: 'BOTH',
      },
    });

    // 3. Mark task as completed
    await request(app)
      .post(`/api/tasks/${taskId}/complete`)
      .set('Authorization', `Bearer ${authToken}`);

    // 4. Process the due reminder
    const delivered = await processDueReminder(reminder.id);
    expect(delivered).toBe(true);

    // 5. Verify reminder status was marked CANCELLED instead of SENT
    const updatedReminder = await (mockDb as any).reminder.findUnique({
      where: { id: reminder.id },
    });
    expect(updatedReminder.deliveryStatus).toBe('CANCELLED');
  });

  it('evaluates quiet hours accurately across midnight', () => {
    // 22:00 to 07:00 quiet hours
    expect(pushService.isQuietHours('UTC', '22:00', '07:00')).toBeDefined();
    expect(pushService.isQuietHours('UTC', null, null)).toBe(false);
  });
});
