export const API_VERSION = 'v1';
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;
export const TOKEN_ISSUER = 'personal-ai-assistant';
export const TOKEN_AUDIENCE = 'personal-ai-assistant-client';
export const DEFAULT_TIMEZONE = 'UTC';
export const DEFAULT_LANGUAGE = 'en';

export const DEFAULT_NOTIFICATION_PREFERENCES = {
  email: true,
  push: true,
  reminderMinutesBefore: 15,
} as const;

export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
} as const;
