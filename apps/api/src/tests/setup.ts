import { beforeAll, afterAll, beforeEach } from 'vitest';
import type { PrismaClient } from '@prisma/client';
import { createMockPrismaClient } from './mock-db.js';

// Test environment setup
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-key-that-is-at-least-32-characters-long';
process.env.JWT_EXPIRES_IN = '1h';
process.env.CORS_ORIGINS = 'http://localhost:5173';
process.env.GOOGLE_CLIENT_ID = 'test-google-client-id';

// Use TEST_DATABASE_URL if available, otherwise fallback to safe placeholder
if (process.env.TEST_DATABASE_URL) {
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
} else if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/aiassistant_test?sslmode=disable';
}

// Validate env after setting test values
import { validateEnv } from '../config/env.js';
validateEnv();

import { getPrismaClient, disconnectDatabase, setPrismaClient } from '../config/index.js';

let prisma: PrismaClient & { __clearAll?: () => void };
let isMock = false;

beforeAll(async () => {
  if (process.env.TEST_DATABASE_URL) {
    try {
      prisma = getPrismaClient();
      await prisma.$queryRaw`SELECT 1`;
      console.log('Running tests against isolated PostgreSQL database');
      return;
    } catch {
      console.warn('Could not connect to TEST_DATABASE_URL, falling back to mock client');
    }
  }

  // Use high-fidelity mock client for testing
  isMock = true;
  prisma = createMockPrismaClient();
  setPrismaClient(prisma);
});

beforeEach(async () => {
  if (isMock && prisma.__clearAll) {
    prisma.__clearAll();
  } else {
    // Clean PostgreSQL tables in dependency order
    await prisma.$executeRaw`TRUNCATE TABLE "ai_messages" CASCADE`;
    await prisma.$executeRaw`TRUNCATE TABLE "ai_threads" CASCADE`;
    await prisma.$executeRaw`TRUNCATE TABLE "reminders" CASCADE`;
    await prisma.$executeRaw`TRUNCATE TABLE "calendar_connections" CASCADE`;
    await prisma.$executeRaw`TRUNCATE TABLE "audit_events" CASCADE`;
    await prisma.$executeRaw`TRUNCATE TABLE "tasks" CASCADE`;
    await prisma.$executeRaw`TRUNCATE TABLE "events" CASCADE`;
    await prisma.$executeRaw`TRUNCATE TABLE "users" CASCADE`;
  }
});

afterAll(async () => {
  await disconnectDatabase();
});

export { prisma };
