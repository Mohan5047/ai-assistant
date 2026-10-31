export enum EventStatus {
  CONFIRMED = 'CONFIRMED',
  TENTATIVE = 'TENTATIVE',
  CANCELLED = 'CANCELLED',
}

export enum EventSource {
  MANUAL = 'MANUAL',
  GOOGLE_CALENDAR = 'GOOGLE_CALENDAR',
  AI_SUGGESTED = 'AI_SUGGESTED',
}

export enum SyncStatus {
  SYNCED = 'SYNCED',
  PENDING = 'PENDING',
  FAILED = 'FAILED',
  NOT_APPLICABLE = 'NOT_APPLICABLE',
}

export interface EventResponse {
  id: string;
  userId: string;
  title: string;
  description: string | null;
  location: string | null;
  startTime: string;
  endTime: string;
  timezone: string;
  isAllDay: boolean;
  source: EventSource;
  status: EventStatus;
  googleEventId: string | null;
  calendarId: string | null;
  syncStatus: SyncStatus;
  lastSyncedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateEventRequest {
  title: string;
  description?: string;
  location?: string;
  startTime: string;
  endTime: string;
  timezone: string;
  isAllDay?: boolean;
  status?: EventStatus;
}

export interface UpdateEventRequest {
  title?: string;
  description?: string | null;
  location?: string | null;
  startTime?: string;
  endTime?: string;
  timezone?: string;
  isAllDay?: boolean;
  status?: EventStatus;
}
