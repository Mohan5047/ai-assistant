import type { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { getEnv } from '../config/index.js';
import { logger } from '../utils/logger.js';

export class AppError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string,
    public details?: Record<string, string[]>
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  const env = getEnv();

  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      error: {
        status: err.statusCode,
        code: err.code,
        message: err.message,
        ...(err.details && { details: err.details }),
      },
    });
    return;
  }

  if (err instanceof ZodError) {
    const details: Record<string, string[]> = {};
    for (const issue of err.issues) {
      const path = issue.path.join('.') || 'unknown';
      if (!details[path]) details[path] = [];
      details[path].push(issue.message);
    }
    res.status(400).json({
      success: false,
      error: {
        status: 400,
        code: 'VALIDATION_ERROR',
        message: 'Request validation failed',
        details,
      },
    });
    return;
  }

  logger.error('Unhandled error:', err.message);
  if (env.NODE_ENV === 'development') {
    logger.error(err.stack);
  }

  res.status(500).json({
    success: false,
    error: {
      status: 500,
      code: 'INTERNAL_SERVER_ERROR',
      message: env.NODE_ENV === 'production'
        ? 'An unexpected error occurred'
        : err.message,
    },
  });
}
