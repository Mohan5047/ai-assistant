import { createApp } from '../app.js';
import supertest from 'supertest';
import { getPrismaClient } from '../config/database.js';
import bcrypt from 'bcryptjs';
import type { Application } from 'express';

let app: Application | null = null;

export function getApp(): Application {
  if (!app) {
    app = createApp();
  }
  return app;
}

export function getRequest() {
  return supertest(getApp());
}

export async function createTestUser(overrides: {
  email?: string;
  password?: string;
  displayName?: string;
} = {}) {
  const prisma = getPrismaClient();
  const email = overrides.email || `test-${Date.now()}@example.com`;
  const password = overrides.password || 'TestPass123';
  const passwordHash = await bcrypt.hash(password, 10);

  const user = await prisma.user.create({
    data: {
      email,
      displayName: overrides.displayName || 'Test User',
      passwordHash,
      timezone: 'UTC',
      notificationPreferences: { email: true, push: true, reminderMinutesBefore: 15 },
    },
  });

  return { user, password };
}

export async function loginAndGetToken(email: string, password: string): Promise<string> {
  const res = await getRequest()
    .post('/api/auth/login')
    .send({ email, password })
    .expect(200);

  return res.body.data.token;
}

export async function createAuthenticatedUser(overrides: {
  email?: string;
  password?: string;
  displayName?: string;
} = {}): Promise<{ userId: string; token: string; email: string }> {
  const { user, password } = await createTestUser(overrides);
  const token = await loginAndGetToken(user.email, password);
  return { userId: user.id, token, email: user.email };
}
