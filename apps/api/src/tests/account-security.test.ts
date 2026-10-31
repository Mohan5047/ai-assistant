import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';
import { setPrismaClient } from '../config/index.js';
import { createMockPrismaClient } from './mock-db.js';
import crypto from 'node:crypto';

describe('Account Recovery & Security API', () => {
  let app: ReturnType<typeof createApp>;
  let mockDb: ReturnType<typeof createMockPrismaClient>;
  let authToken: string;
  let userEmail: string;

  beforeEach(async () => {
    mockDb = createMockPrismaClient();
    setPrismaClient(mockDb);
    app = createApp();

    userEmail = 'security-test@example.com';
    const regRes = await request(app)
      .post('/api/auth/register')
      .send({
        email: userEmail,
        password: 'Password123!',
        displayName: 'Security Tester',
        timezone: 'UTC',
      });

    authToken = regRes.body.data.token;
  });

  it('handles forgot password request without revealing user existence', async () => {
    // Registered user
    const res = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: userEmail });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    // Unregistered user returns identical success response to prevent enumeration
    const unregRes = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: 'nonexistent@example.com' });

    expect(unregRes.status).toBe(200);
    expect(unregRes.body.success).toBe(true);
  });

  it('resets password with a valid token and allows logging in with the new password', async () => {
    // 1. Request forgot password
    await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: userEmail });

    // 2. Mock token generated in DB
    const token = 'mock-reset-token-abc123xyz';
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const user = await (mockDb as any).user.findUnique({ where: { email: userEmail } });

    await (mockDb as any).passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt: new Date(Date.now() + 3600000),
      },
    });

    // 3. Reset password using token
    const resetRes = await request(app)
      .post('/api/auth/reset-password')
      .send({
        token,
        newPassword: 'BrandNewPassword99!',
      });

    expect(resetRes.status).toBe(200);
    expect(resetRes.body.success).toBe(true);

    // 4. Old password fails
    const oldLoginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: userEmail, password: 'Password123!' });
    expect(oldLoginRes.status).toBe(401);

    // 5. New password succeeds
    const newLoginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: userEmail, password: 'BrandNewPassword99!' });
    expect(newLoginRes.status).toBe(200);
    expect(newLoginRes.body.data.token).toBeDefined();
  });

  it('updates profile settings including timezone', async () => {
    const updateRes = await request(app)
      .patch('/api/auth/profile')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        displayName: 'Updated Name',
        timezone: 'America/New_York',
        preferredLanguage: 'fr',
      });

    expect(updateRes.status).toBe(200);
    expect(updateRes.body.data.user.displayName).toBe('Updated Name');
    expect(updateRes.body.data.user.timezone).toBe('America/New_York');
    expect(updateRes.body.data.user.preferredLanguage).toBe('fr');
  });

  it('exports all user data in clean GDPR-compliant JSON format', async () => {
    // Create an event and a task for the user
    await request(app)
      .post('/api/events')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        title: 'Exportable Strategy Session',
        startTime: '2026-11-01T10:00:00.000Z',
        endTime: '2026-11-01T11:00:00.000Z',
        timezone: 'UTC',
      });

    await request(app)
      .post('/api/tasks')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        title: 'Exportable Project Task',
        priority: 'HIGH',
      });

    const exportRes = await request(app)
      .get('/api/auth/export-data')
      .set('Authorization', `Bearer ${authToken}`);

    expect(exportRes.status).toBe(200);
    expect(exportRes.body.data.user.email).toBe(userEmail);
    expect(exportRes.body.data.events).toHaveLength(1);
    expect(exportRes.body.data.tasks).toHaveLength(1);
    expect(exportRes.body.data.exportedAt).toBeDefined();
  });

  it('deletes account permanently with email and password confirmation', async () => {
    // 1. Rejects wrong confirmation email
    const wrongEmailRes = await request(app)
      .delete('/api/auth/account')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        confirmEmail: 'wrong@example.com',
        password: 'Password123!',
      });
    expect(wrongEmailRes.status).toBe(400);

    // 2. Rejects wrong password
    const wrongPassRes = await request(app)
      .delete('/api/auth/account')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        confirmEmail: userEmail,
        password: 'WrongPassword!',
      });
    expect(wrongPassRes.status).toBe(401);

    // 3. Deletes successfully with correct credentials
    const delRes = await request(app)
      .delete('/api/auth/account')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        confirmEmail: userEmail,
        password: 'Password123!',
      });
    expect(delRes.status).toBe(200);
    expect(delRes.body.success).toBe(true);

    // 4. Token cannot be used anymore
    const meRes = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${authToken}`);
    expect(meRes.status).toBe(404);
  });
});
