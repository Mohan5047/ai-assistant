import { describe, it, expect, vi } from 'vitest';
import { getRequest, createAuthenticatedUser } from './helpers.js';
import { encrypt, decrypt } from '../utils/index.js';
import * as calendarService from '../services/calendar/google-calendar.service.js';
import { getPrismaClient } from '../config/index.js';

describe('Google Calendar Integration & Sync Engine', () => {
  describe('Token Encryption', () => {
    it('encrypts and decrypts OAuth tokens securely using AES-256', () => {
      const sensitiveTokenPayload = JSON.stringify({
        access_token: 'ya29.sample-token-123',
        refresh_token: '1//sample-refresh-token-456',
        expiry_date: 1700000000000,
      });

      const { encrypted, iv, tag } = encrypt(sensitiveTokenPayload);
      expect(encrypted).not.toContain('ya29');
      expect(encrypted).not.toContain('refresh_token');

      const decrypted = decrypt(encrypted, iv, tag);
      expect(decrypted).toBe(sensitiveTokenPayload);
      const parsed = JSON.parse(decrypted);
      expect(parsed.access_token).toBe('ya29.sample-token-123');
    });
  });

  describe('GET /api/calendar/google/auth-url', () => {
    it('generates an authorization URL with CSRF state protection', async () => {
      const { token } = await createAuthenticatedUser();

      const res = await getRequest()
        .get('/api/calendar/google/auth-url')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.authUrl).toContain('accounts.google.com');
      expect(res.body.data.authUrl).toContain('state=');
      expect(res.body.data.authUrl).toContain('access_type=offline');
    });
  });

  describe('GET /api/calendar/google/status', () => {
    it('returns not connected for new user', async () => {
      const { token } = await createAuthenticatedUser();

      const res = await getRequest()
        .get('/api/calendar/google/status')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.isConnected).toBe(false);
    });
  });

  describe('Two-Way Synchronization and Conflict Handling', () => {
    it('handles sync when connection exists with encrypted tokens', async () => {
      const { userId } = await createAuthenticatedUser();
      const prisma = getPrismaClient();

      const dummyTokens = JSON.stringify({
        access_token: 'mock-access',
        refresh_token: 'mock-refresh',
      });
      const { encrypted, iv, tag } = encrypt(dummyTokens);

      await prisma.calendarConnection.create({
        data: {
          userId,
          provider: 'google',
          accountEmail: 'user@example.com',
          encryptedTokens: encrypted,
          tokenIv: `${iv}:${tag}`,
          isActive: true,
        },
      });

      // Mock googleapis calendar methods
      const { google } = await import('googleapis');
      const mockList = vi.fn().mockResolvedValue({
        data: {
          items: [
            {
              id: 'google-ev-1',
              summary: 'Sync Test Event from Google',
              start: { dateTime: '2026-11-01T10:00:00Z' },
              end: { dateTime: '2026-11-01T11:00:00Z' },
              status: 'confirmed',
              updated: '2026-10-31T12:00:00Z',
            },
          ],
          nextSyncToken: 'sync-token-xyz-123',
        },
      });

      const calendarSpy = vi.spyOn(google, 'calendar').mockReturnValue({
        events: {
          list: mockList,
          insert: vi.fn().mockResolvedValue({ data: { id: 'exported-id' } }),
        },
      } as any);

      const result = await calendarService.syncGoogleCalendar(userId);
      expect(result.importedCount).toBe(1);
      expect(result.syncToken).toBe('sync-token-xyz-123');

      // Verify imported event exists in DB
      const imported = await prisma.event.findFirst({
        where: { userId, googleEventId: 'google-ev-1' },
      });
      expect(imported).toBeDefined();
      expect(imported?.title).toBe('Sync Test Event from Google');

      calendarSpy.mockRestore();
    });
  });
});
