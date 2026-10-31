export enum ReminderType {
  EMAIL = 'EMAIL',
  PUSH = 'PUSH',
  BOTH = 'BOTH',
}

export enum DeliveryStatus {
  PENDING = 'PENDING',
  SENT = 'SENT',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
}

export interface ReminderResponse {
  id: string;
  userId: string;
  eventId: string | null;
  taskId: string | null;
  type: ReminderType;
  scheduledAt: string;
  timezone: string;
  deliveryStatus: DeliveryStatus;
  deliveredAt: string | null;
  failureReason: string | null;
  attempts: number;
  createdAt: string;
}

export interface CreateReminderRequest {
  eventId?: string;
  taskId?: string;
  type?: ReminderType;
  scheduledAt: string;
  timezone?: string;
}
