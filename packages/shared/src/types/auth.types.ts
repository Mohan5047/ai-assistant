export interface RegisterRequest {
  email: string;
  password: string;
  displayName: string;
  timezone?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface GoogleAuthRequest {
  idToken: string;
}

export interface AuthResponse {
  user: import('./user.types.js').UserProfile;
  token: string;
}

export interface TokenPayload {
  sub: string;
  email: string;
  iss: string;
  aud: string;
  iat: number;
  exp: number;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  token: string;
  newPassword: string;
}

export interface UpdateProfileRequest {
  displayName?: string;
  timezone?: string;
  preferredLanguage?: string;
}

export interface DeleteAccountRequest {
  confirmEmail: string;
  password?: string;
}

export interface AccountExportResponse {
  user: import('./user.types.js').UserProfile;
  events: import('./event.types.js').EventResponse[];
  tasks: import('./task.types.js').TaskResponse[];
  reminders: import('./reminder.types.js').ReminderResponse[];
  preferences: import('./user.types.js').NotificationPreferences;
  exportedAt: string;
}
