const SENSITIVE_KEYS = new Set([
  'password',
  'passwordHash',
  'authorization',
  'token',
  'accessToken',
  'refreshToken',
  'idToken',
  'secret',
  'cookie',
]);

function sanitize(obj: unknown): unknown {
  if (typeof obj !== 'object' || obj === null) return obj;
  if (Array.isArray(obj)) return obj.map(sanitize);
  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    if (SENSITIVE_KEYS.has(key.toLowerCase())) {
      sanitized[key] = '[REDACTED]';
    } else {
      sanitized[key] = sanitize(value);
    }
  }
  return sanitized;
}

export const logger = {
  info: (...args: unknown[]) => console.log(`[${new Date().toISOString()}] INFO:`, ...args.map(sanitize)),
  warn: (...args: unknown[]) => console.warn(`[${new Date().toISOString()}] WARN:`, ...args.map(sanitize)),
  error: (...args: unknown[]) => console.error(`[${new Date().toISOString()}] ERROR:`, ...args.map(sanitize)),
  debug: (...args: unknown[]) => {
    if (process.env.NODE_ENV === 'development') {
      console.debug(`[${new Date().toISOString()}] DEBUG:`, ...args.map(sanitize));
    }
  },
};
