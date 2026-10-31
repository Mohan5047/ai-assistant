import type { Response } from 'express';
import type { AuthenticatedRequest } from '../middleware/index.js';
import { authService } from '../services/index.js';
import { getEnv } from '../config/index.js';
import { HTTP_STATUS } from '@personal-ai-assistant/shared';

function setTokenCookie(res: Response, token: string): void {
  const env = getEnv();
  res.cookie('token', token, {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    path: '/',
  });
}

export async function register(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  const result = await authService.registerUser(req.body);
  setTokenCookie(res, result.token);
  res.status(HTTP_STATUS.CREATED).json({
    success: true,
    data: { user: result.user, token: result.token },
  });
}

export async function login(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  const result = await authService.loginUser(req.body);
  setTokenCookie(res, result.token);
  res.json({
    success: true,
    data: { user: result.user, token: result.token },
  });
}

export async function googleAuth(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  const { idToken } = req.body;
  const result = await authService.authenticateWithGoogle(idToken);
  setTokenCookie(res, result.token);
  res.json({
    success: true,
    data: { user: result.user, token: result.token },
  });
}

export async function me(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  const user = await authService.getCurrentUser(req.userId!);
  res.json({
    success: true,
    data: { user },
  });
}

export async function logout(
  _req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  res.clearCookie('token', {
    httpOnly: true,
    secure: getEnv().NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
  });
  res.json({ success: true, data: { message: 'Logged out successfully' } });
}

export async function forgotPassword(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  const result = await authService.forgotPassword(req.body.email);
  res.json({ success: true, data: result });
}

export async function resetPassword(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  const { token, newPassword } = req.body;
  const result = await authService.resetPassword(token, newPassword);
  res.json({ success: true, data: result });
}

export async function updateProfile(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  const user = await authService.updateUserProfile(req.userId!, req.body);
  res.json({ success: true, data: { user } });
}

export async function exportData(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  const data = await authService.exportUserData(req.userId!);
  res.json({ success: true, data });
}

export async function deleteAccount(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  const { confirmEmail, password } = req.body;
  const result = await authService.deleteUserAccount(req.userId!, confirmEmail, password);
  res.clearCookie('token', {
    httpOnly: true,
    secure: getEnv().NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
  });
  res.json({ success: true, data: result });
}
