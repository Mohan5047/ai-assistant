export enum AccountStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  SUSPENDED = 'SUSPENDED',
}

export interface NotificationPreferences {
  email: boolean;
  push: boolean;
  reminderMinutesBefore: number;
  quietHoursStart?: string | null;
  quietHoursEnd?: string | null;
}

export interface UserProfile {
  id: string;
  email: string;
  displayName: string;
  timezone: string;
  preferredLanguage: string;
  notificationPreferences: NotificationPreferences;
  accountStatus: AccountStatus;
  hasPassword: boolean;
  hasGoogleLinked: boolean;
  createdAt: string;
  updatedAt: string;
}
