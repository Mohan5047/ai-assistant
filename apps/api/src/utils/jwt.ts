import jwt from 'jsonwebtoken';
import { getEnv } from '../config/index.js';
import { TOKEN_ISSUER, TOKEN_AUDIENCE } from '@personal-ai-assistant/shared';

export function generateToken(userId: string, email: string): string {
  const env = getEnv();
  return jwt.sign(
    { sub: userId, email },
    env.JWT_SECRET,
    {
      issuer: TOKEN_ISSUER,
      audience: TOKEN_AUDIENCE,
      expiresIn: env.JWT_EXPIRES_IN as unknown as jwt.SignOptions['expiresIn'],
    }
  );
}
