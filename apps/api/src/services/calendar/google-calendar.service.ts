import { google } from 'googleapis';
import crypto from 'node:crypto';
import { getEnv, getPrismaClient } from '../../config/index.js';
import { AppError } from '../../middleware/index.js';
import { HTTP_STATUS } from '@personal-ai-assistant/shared';
import type { GoogleCalendarStatus, CalendarSyncResult } from '@personal-ai-assistant/shared';
import { encrypt, decrypt, logger } from '../../utils/index.js';

const CALENDAR_SCOPES = [
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/calendar.readonly',
];

// In-memory OAuth state tracker with 15-minute TTL
const oauthStates = new Map<string, { userId: string; expiresAt: number }>();

function getOAuth2Client() {
  const env = getEnv();
  return new google.auth.OAuth2(
    env.GOOGLE_CLIENT_ID || 'mock-client-id',
    env.GOOGLE_CLIENT_SECRET || 'mock-client-secret',
    env.GOOGLE_CALENDAR_REDIRECT_URI
  );
}

export function generateCalendarAuthUrl(userId: string): string {
  const oauth2Client = getOAuth2Client();
  const state = crypto.randomBytes(24).toString('hex');

  oauthStates.set(state, {
    userId,
    expiresAt: Date.now() + 15 * 60 * 1000,
  });

  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: CALENDAR_SCOPES,
    state,
  });
}

export async function handleOAuthCallback(
  userId: string,
  code: string,
  state: string
): Promise<{ success: boolean; accountEmail: string }> {
  // Validate OAuth state
  const stateEntry = oauthStates.get(state);
  if (!stateEntry || stateEntry.userId !== userId || stateEntry.expiresAt < Date.now()) {
    throw new AppError(HTTP_STATUS.BAD_REQUEST, 'INVALID_OAUTH_STATE', 'Invalid or expired OAuth state');
  }
  oauthStates.delete(state);

  const oauth2Client = getOAuth2Client();
  let tokens: any;

  try {
    const response = await oauth2Client.getToken(code);
    tokens = response.tokens;
  } catch (err: any) {
    logger.error('Failed to exchange Google OAuth code:', err.message);
    throw new AppError(HTTP_STATUS.UNAUTHORIZED, 'OAUTH_EXCHANGE_FAILED', 'Failed to retrieve Google tokens');
  }

  oauth2Client.setCredentials(tokens);
  const oauth2 = google.oauth2({ auth: oauth2Client, version: 'v2' });
  const userinfo = await oauth2.userinfo.get();
  const accountEmail = userinfo.data.email || 'unknown@gmail.com';

  // Encrypt tokens before storing
  const { encrypted, iv, tag } = encrypt(JSON.stringify(tokens));
  const prisma = getPrismaClient();

  await prisma.calendarConnection.upsert({
    where: {
      userId_provider_accountEmail: {
        userId,
        provider: 'google',
        accountEmail,
      },
    },
    update: {
      encryptedTokens: encrypted,
      tokenIv: `${iv}:${tag}`,
      isActive: true,
      calendarId: 'primary',
      grantedScopes: CALENDAR_SCOPES,
      lastSyncError: null,
      updatedAt: new Date(),
    },
    create: {
      userId,
      provider: 'google',
      accountEmail,
      calendarId: 'primary',
      encryptedTokens: encrypted,
      tokenIv: `${iv}:${tag}`,
      grantedScopes: CALENDAR_SCOPES,
      isActive: true,
    },
  });

  return { success: true, accountEmail };
}

export async function getCalendarConnectionStatus(userId: string): Promise<GoogleCalendarStatus> {
  const prisma = getPrismaClient();

  const connection = await prisma.calendarConnection.findFirst({
    where: { userId, provider: 'google', isActive: true },
  });

  if (!connection) {
    return { isConnected: false };
  }

  return {
    isConnected: true,
    accountEmail: connection.accountEmail,
    calendarId: connection.calendarId,
    syncStatus: connection.lastSyncError ? 'ERROR' : 'SYNCED',
    lastSyncedAt: connection.lastSyncedAt?.toISOString() ?? null,
    lastSyncError: connection.lastSyncError,
    grantedScopes: connection.grantedScopes,
  };
}

export async function disconnectCalendar(userId: string): Promise<void> {
  const prisma = getPrismaClient();

  const connection = await prisma.calendarConnection.findFirst({
    where: { userId, provider: 'google', isActive: true },
  });

  if (connection) {
    await prisma.calendarConnection.update({
      where: { id: connection.id },
      data: {
        isActive: false,
        encryptedTokens: '',
        tokenIv: '',
      },
    });
  }
}

/**
 * Two-way Google Calendar synchronization engine:
 * - Incremental sync via syncToken
 * - Conflict detection based on updated timestamps
 * - Imports new/modified Google events
 * - Handles tombstones (deleted Google events)
 * - Pushes local events to Google Calendar
 */
export async function syncGoogleCalendar(userId: string): Promise<CalendarSyncResult> {
  const prisma = getPrismaClient();

  const connection = await prisma.calendarConnection.findFirst({
    where: { userId, provider: 'google', isActive: true },
  });

  if (!connection) {
    throw new AppError(HTTP_STATUS.NOT_FOUND, 'CALENDAR_NOT_CONNECTED', 'No active Google Calendar connection');
  }

  let importedCount = 0;
  let exportedCount = 0;
  let updatedCount = 0;
  let deletedCount = 0;
  let conflictsCount = 0;
  const errors: string[] = [];

  try {
    // 1. Decrypt credentials and configure Google client
    const [ivHex, tagHex] = connection.tokenIv.split(':');
    const tokenJson = decrypt(connection.encryptedTokens, ivHex!, tagHex);
    const tokens = JSON.parse(tokenJson);

    const oauth2Client = getOAuth2Client();
    oauth2Client.setCredentials(tokens);
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    // 2. Fetch remote Google events using incremental syncToken if available
    const calendarId = connection.calendarId || 'primary';
    const params: any = {
      calendarId,
      maxResults: 100,
      singleEvents: true,
    };

    if (connection.syncToken) {
      params.syncToken = connection.syncToken;
    } else {
      // Full initial sync for next 90 days and past 30 days
      const past30Days = new Date();
      past30Days.setDate(past30Days.getDate() - 30);
      params.timeMin = past30Days.toISOString();
    }

    let remoteEventsResponse: any;
    try {
      remoteEventsResponse = await calendar.events.list(params);
    } catch (err: any) {
      if (err.code === 410) {
        // Sync token expired/invalidated -> perform fresh full sync
        delete params.syncToken;
        remoteEventsResponse = await calendar.events.list(params);
      } else {
        throw err;
      }
    }

    const items = remoteEventsResponse.data.items || [];
    const nextSyncToken = remoteEventsResponse.data.nextSyncToken;

    // 3. Process remote events (Import, Update, Tombstone)
    for (const item of items) {
      if (!item.id) continue;

      if (item.status === 'cancelled') {
        // Tombstone from Google Calendar -> mark local event as CANCELLED or delete
        const local = await prisma.event.findFirst({
          where: { userId, googleEventId: item.id },
        });
        if (local) {
          await prisma.event.update({
            where: { id: local.id },
            data: { status: 'CANCELLED', syncStatus: 'SYNCED', lastSyncedAt: new Date() },
          });
          deletedCount++;
        }
        continue;
      }

      const start = item.start?.dateTime ? new Date(item.start.dateTime) : (item.start?.date ? new Date(item.start.date) : new Date());
      const end = item.end?.dateTime ? new Date(item.end.dateTime) : (item.end?.date ? new Date(item.end.date) : new Date(start.getTime() + 3600000));
      const isAllDay = !item.start?.dateTime;
      const remoteUpdated = item.updated ? new Date(item.updated) : new Date();

      const existingLocal = await prisma.event.findFirst({
        where: { userId, googleEventId: item.id },
      });

      if (!existingLocal) {
        // Import new remote event
        await prisma.event.create({
          data: {
            userId,
            title: item.summary || '(No title)',
            description: item.description || null,
            location: item.location || null,
            startTime: start,
            endTime: end,
            timezone: item.start?.timeZone || 'UTC',
            isAllDay,
            source: 'GOOGLE_CALENDAR',
            status: 'CONFIRMED',
            googleEventId: item.id,
            calendarId,
            syncStatus: 'SYNCED',
            lastSyncedAt: new Date(),
          },
        });
        importedCount++;
      } else {
        // Conflict detection: If local was updated after lastSync, avoid clobbering
        const lastSync = existingLocal.lastSyncedAt || new Date(0);
        if (existingLocal.updatedAt > lastSync && remoteUpdated > lastSync) {
          conflictsCount++;
          errors.push(`Conflict on "${existingLocal.title}": modified both locally and in Google Calendar. Retained local changes.`);
          continue;
        }

        // Apply remote updates to local
        await prisma.event.update({
          where: { id: existingLocal.id },
          data: {
            title: item.summary || existingLocal.title,
            description: item.description ?? existingLocal.description,
            location: item.location ?? existingLocal.location,
            startTime: start,
            endTime: end,
            isAllDay,
            syncStatus: 'SYNCED',
            lastSyncedAt: new Date(),
          },
        });
        updatedCount++;
      }
    }

    // 4. Export pending local events to Google Calendar
    const localEventsToExport = await prisma.event.findMany({
      where: {
        userId,
        source: 'MANUAL',
        googleEventId: null,
        status: { not: 'CANCELLED' },
      },
      take: 20,
    });

    for (const localEvent of localEventsToExport) {
      try {
        const createdGoogleEvent = await calendar.events.insert({
          calendarId,
          requestBody: {
            summary: localEvent.title,
            description: localEvent.description || undefined,
            location: localEvent.location || undefined,
            start: localEvent.isAllDay
              ? { date: localEvent.startTime.toISOString().split('T')[0] }
              : { dateTime: localEvent.startTime.toISOString() },
            end: localEvent.isAllDay
              ? { date: localEvent.endTime.toISOString().split('T')[0] }
              : { dateTime: localEvent.endTime.toISOString() },
          },
        });

        if (createdGoogleEvent.data.id) {
          await prisma.event.update({
            where: { id: localEvent.id },
            data: {
              googleEventId: createdGoogleEvent.data.id,
              calendarId,
              syncStatus: 'SYNCED',
              lastSyncedAt: new Date(),
            },
          });
          exportedCount++;
        }
      } catch (err: any) {
        errors.push(`Failed to export "${localEvent.title}": ${err.message}`);
      }
    }

    // Update connection status
    const now = new Date();
    await prisma.calendarConnection.update({
      where: { id: connection.id },
      data: {
        syncToken: nextSyncToken || connection.syncToken,
        lastSyncedAt: now,
        lastSyncError: errors.length > 0 ? errors.join('; ') : null,
      },
    });

    return {
      importedCount,
      exportedCount,
      updatedCount,
      deletedCount,
      conflictsCount,
      errors: errors.length > 0 ? errors : undefined,
      syncToken: nextSyncToken || undefined,
      lastSyncedAt: now.toISOString(),
    };
  } catch (err: any) {
    logger.error('Google Calendar synchronization error:', err.message);

    await prisma.calendarConnection.update({
      where: { id: connection.id },
      data: {
        lastSyncError: err.message || 'Sync failed',
      },
    });

    throw new AppError(HTTP_STATUS.INTERNAL_SERVER_ERROR, 'SYNC_FAILED', `Google Calendar sync error: ${err.message}`);
  }
}
