export interface GoogleCalendarStatus {
  isConnected: boolean;
  accountEmail?: string | null;
  calendarId?: string | null;
  syncStatus?: string | null;
  lastSyncedAt?: string | null;
  lastSyncError?: string | null;
  grantedScopes?: string[];
}

export interface CalendarSyncResult {
  importedCount: number;
  exportedCount: number;
  updatedCount: number;
  deletedCount: number;
  conflictsCount: number;
  errors?: string[];
  syncToken?: string;
  lastSyncedAt: string;
}

export interface GoogleAuthUrlResponse {
  authUrl: string;
}
