import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { getEnv } from '../config/index.js';
import { TOKEN_ISSUER, TOKEN_AUDIENCE } from '@personal-ai-assistant/shared';
import { AppError } from './error-handler.js';

export interface AuthenticatedRequest extends Request {
  userId?: string;
}

export function authenticate(
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
): void {
  const env = getEnv();

  // Check cookie first (web), then Authorization header (mobile)
  let token: string | undefined;

  const cookieToken = req.cookies?.token as string | undefined;
  if (cookieToken) {
    token = cookieToken;
  } else {
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      token = authHeader.slice(7);
    }
  }

  if (!token) {
    throw new AppError(401, 'UNAUTHORIZED', 'Authentication required');
  }

  try {
    const payload = jwt.verify(token, env.JWT_SECRET, {
      issuer: TOKEN_ISSUER,
      audience: TOKEN_AUDIENCE,
    }) as jwt.JwtPayload;

    if (!payload.sub) {
      throw new AppError(401, 'UNAUTHORIZED', 'Invalid token');
    }

    req.userId = payload.sub;
    next();
  } catch (err) {
    if (err instanceof AppError) throw err;
    throw new AppError(401, 'UNAUTHORIZED', 'Invalid or expired token');
  }
}
