export type DevicePlatform = 'ios' | 'android' | 'web';

export interface DeviceRegistrationRequest {
  token: string;
  platform: DevicePlatform;
}

export interface DeviceResponse {
  id: string;
  userId: string;
  token: string;
  platform: DevicePlatform;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateNotificationPreferencesRequest {
  email?: boolean;
  push?: boolean;
  reminderMinutesBefore?: number;
  quietHoursStart?: string | null;
  quietHoursEnd?: string | null;
}

export interface PushNotificationPayload {
  to: string | string[];
  title: string;
  body: string;
  data?: Record<string, unknown>;
  sound?: 'default' | null;
  badge?: number;
  channelId?: string;
}
