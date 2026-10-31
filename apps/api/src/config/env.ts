import { z } from 'zod';

const envSchema = z.object({
  PORT: z.coerce.number().default(3000),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  DIRECT_URL: z.string().optional(),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  JWT_EXPIRES_IN: z.string().default('7d'),
  CORS_ORIGINS: z.string().default('http://localhost:5173'),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  REDIS_URL: z.string().optional(),
  ENCRYPTION_KEY: z.string().min(32).default('0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef'),
  AI_PROVIDER: z.enum(['openai', 'anthropic', 'gemini', 'mock']).default('mock'),
  AI_API_KEY: z.string().optional(),
  AI_MODEL: z.string().optional(),
  AI_TIMEOUT_MS: z.coerce.number().default(30000),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().default(587),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  EMAIL_FROM: z.string().default('assistant@personalai.local'),
  APP_URL: z.string().default('http://localhost:5173'),
  GOOGLE_CALENDAR_REDIRECT_URI: z.string().default('http://localhost:3000/api/calendar/google/callback'),
});

export type Env = z.infer<typeof envSchema>;

let _env: Env | null = null;

export function validateEnv(): Env {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    console.error('❌ Invalid environment variables:');
    console.error(result.error.flatten().fieldErrors);
    process.exit(1);
  }
  _env = result.data;
  return _env;
}

export function getEnv(): Env {
  if (!_env) {
    throw new Error('Environment not validated. Call validateEnv() first.');
  }
  return _env;
}
