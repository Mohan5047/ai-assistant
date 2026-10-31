import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { OAuth2Client } from 'google-auth-library';
import { getPrismaClient, getEnv } from '../config/index.js';
import { AppError } from '../middleware/index.js';
import { generateToken } from '../utils/index.js';
import {
  HTTP_STATUS,
  DEFAULT_NOTIFICATION_PREFERENCES,
  DEFAULT_TIMEZONE,
  type UserProfile,
  type UpdateProfileRequest,
  type AccountExportResponse,
} from '@personal-ai-assistant/shared';
import { sendPasswordResetEmail } from '../jobs/email.service.js';

const SALT_ROUNDS = 12;

function normalizeEmail(email: string): string {
  return email.toLowerCase().trim();
}

function toUserProfile(user: {
  id: string;
  email: string;
  displayName: string;
  passwordHash: string | null;
  googleId: string | null;
  timezone: string;
  preferredLanguage: string;
  notificationPreferences: unknown;
  accountStatus: string;
  createdAt: Date;
  updatedAt: Date;
}): UserProfile {
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    timezone: user.timezone,
    preferredLanguage: user.preferredLanguage,
    notificationPreferences: user.notificationPreferences as UserProfile['notificationPreferences'],
    accountStatus: user.accountStatus as UserProfile['accountStatus'],
    hasPassword: !!user.passwordHash,
    hasGoogleLinked: !!user.googleId,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
}

export async function registerUser(data: {
  email: string;
  password: string;
  displayName: string;
  timezone?: string;
}): Promise<{ user: UserProfile; token: string }> {
  const prisma = getPrismaClient();
  const email = normalizeEmail(data.email);

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    throw new AppError(HTTP_STATUS.CONFLICT, 'EMAIL_EXISTS', 'An account with this email already exists');
  }

  const passwordHash = await bcrypt.hash(data.password, SALT_ROUNDS);

  const user = await prisma.user.create({
    data: {
      email,
      displayName: data.displayName,
      passwordHash,
      timezone: data.timezone || DEFAULT_TIMEZONE,
      notificationPreferences: DEFAULT_NOTIFICATION_PREFERENCES,
    },
  });

  const profile = toUserProfile(user);
  const token = generateToken(user.id, user.email);

  return { user: profile, token };
}

export async function loginUser(data: {
  email: string;
  password: string;
}): Promise<{ user: UserProfile; token: string }> {
  const prisma = getPrismaClient();
  const email = normalizeEmail(data.email);

  const user = await prisma.user.findUnique({ where: { email } });

  // Generic error to avoid account enumeration
  const genericError = new AppError(
    HTTP_STATUS.UNAUTHORIZED,
    'INVALID_CREDENTIALS',
    'Invalid email or password'
  );

  if (!user || !user.passwordHash) {
    // Perform a dummy hash comparison to prevent timing attacks
    await bcrypt.compare(data.password, '$2a$12$000000000000000000000000000000000000000000000000000000');
    throw genericError;
  }

  if (user.accountStatus !== 'ACTIVE') {
    throw new AppError(HTTP_STATUS.FORBIDDEN, 'ACCOUNT_INACTIVE', 'Account is not active');
  }

  const valid = await bcrypt.compare(data.password, user.passwordHash);
  if (!valid) {
    throw genericError;
  }

  const profile = toUserProfile(user);
  const token = generateToken(user.id, user.email);

  return { user: profile, token };
}

export async function authenticateWithGoogle(idToken: string): Promise<{ user: UserProfile; token: string }> {
  const env = getEnv();
  if (!env.GOOGLE_CLIENT_ID) {
    throw new AppError(HTTP_STATUS.INTERNAL_SERVER_ERROR, 'CONFIG_ERROR', 'Google sign-in is not configured');
  }

  const client = new OAuth2Client(env.GOOGLE_CLIENT_ID);

  let ticket;
  try {
    ticket = await client.verifyIdToken({
      idToken,
      audience: env.GOOGLE_CLIENT_ID,
    });
  } catch {
    throw new AppError(HTTP_STATUS.UNAUTHORIZED, 'INVALID_TOKEN', 'Invalid Google ID token');
  }

  const payload = ticket.getPayload();
  if (!payload || !payload.sub || !payload.email) {
    throw new AppError(HTTP_STATUS.UNAUTHORIZED, 'INVALID_TOKEN', 'Invalid Google ID token payload');
  }

  const prisma = getPrismaClient();
  const email = normalizeEmail(payload.email);

  // Find by Google ID first
  let user = await prisma.user.findUnique({ where: { googleId: payload.sub } });

  if (!user) {
    // Check if email exists without Google link
    const existingByEmail = await prisma.user.findUnique({ where: { email } });
    if (existingByEmail) {
      // Do NOT auto-link. Require explicit account linking.
      throw new AppError(
        HTTP_STATUS.CONFLICT,
        'ACCOUNT_EXISTS',
        'An account with this email already exists. Please log in with your password and link your Google account from settings.'
      );
    }

    // Create new user from Google
    user = await prisma.user.create({
      data: {
        email,
        displayName: payload.name || (email.split('@')[0] ?? 'User'),
        googleId: payload.sub,
        timezone: DEFAULT_TIMEZONE,
        notificationPreferences: DEFAULT_NOTIFICATION_PREFERENCES,
      },
    });
  }

  if (user.accountStatus !== 'ACTIVE') {
    throw new AppError(HTTP_STATUS.FORBIDDEN, 'ACCOUNT_INACTIVE', 'Account is not active');
  }

  const profile = toUserProfile(user);
  const token = generateToken(user.id, user.email);

  return { user: profile, token };
}

export async function getCurrentUser(userId: string): Promise<UserProfile> {
  const prisma = getPrismaClient();

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new AppError(HTTP_STATUS.NOT_FOUND, 'USER_NOT_FOUND', 'User not found');
  }

  return toUserProfile(user);
}

/**
 * Initiate password recovery.
 * Generates an expiring single-use cryptographically secure token hash.
 * Always returns a generic message to prevent account enumeration.
 */
export async function forgotPassword(emailInput: string): Promise<{ success: boolean; message: string }> {
  const prisma = getPrismaClient();
  const email = normalizeEmail(emailInput);

  const user = await prisma.user.findUnique({ where: { email } });

  if (user) {
    // Generate secure single-use 32-byte hex token
    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const expiresAt = new Date(Date.now() + 3600000); // 1 hour

    // Invalidate previous tokens
    await prisma.passwordResetToken.deleteMany({ where: { userId: user.id } });

    // Store hash
    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt,
      },
    });

    // Send email with plaintext token
    await sendPasswordResetEmail({
      to: user.email,
      token,
      displayName: user.displayName,
    });
  }

  return {
    success: true,
    message: 'If an account with that email exists, password reset instructions have been sent.',
  };
}

/**
 * Reset password using single-use token.
 */
export async function resetPassword(token: string, newPassword: string): Promise<{ success: boolean; message: string }> {
  const prisma = getPrismaClient();
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

  const resetRecord = await prisma.passwordResetToken.findUnique({
    where: { tokenHash },
  });

  if (!resetRecord || resetRecord.usedAt || resetRecord.expiresAt < new Date()) {
    throw new AppError(
      HTTP_STATUS.BAD_REQUEST,
      'INVALID_RESET_TOKEN',
      'The password reset link is invalid or has expired. Please request a new one.'
    );
  }

  const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);

  await prisma.user.update({
    where: { id: resetRecord.userId },
    data: { passwordHash },
  });

  await prisma.passwordResetToken.update({
    where: { tokenHash },
    data: { usedAt: new Date() },
  });

  return {
    success: true,
    message: 'Your password has been successfully reset. You may now log in.',
  };
}

/**
 * Update authenticated user's profile details.
 */
export async function updateUserProfile(userId: string, data: UpdateProfileRequest): Promise<UserProfile> {
  const prisma = getPrismaClient();

  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      displayName: data.displayName,
      timezone: data.timezone,
      preferredLanguage: data.preferredLanguage,
    },
  });

  return toUserProfile(user);
}

/**
 * Export all data associated with user account (GDPR & data portability compliance).
 */
export async function exportUserData(userId: string): Promise<AccountExportResponse> {
  const prisma = getPrismaClient();

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new AppError(HTTP_STATUS.NOT_FOUND, 'USER_NOT_FOUND', 'User not found');

  const events = await prisma.event.findMany({ where: { userId } });
  const tasks = await prisma.task.findMany({ where: { userId } });
  const reminders = await prisma.reminder.findMany({ where: { userId } });

  return {
    user: toUserProfile(user),
    events: events.map((e) => ({
      id: e.id,
      userId: e.userId,
      title: e.title,
      description: e.description,
      location: e.location,
      startTime: e.startTime.toISOString(),
      endTime: e.endTime.toISOString(),
      timezone: e.timezone,
      isAllDay: e.isAllDay,
      source: e.source as any,
      status: e.status as any,
      googleEventId: e.googleEventId,
      calendarId: e.calendarId,
      syncStatus: e.syncStatus as any,
      lastSyncedAt: e.lastSyncedAt?.toISOString() || null,
      createdAt: e.createdAt.toISOString(),
      updatedAt: e.updatedAt.toISOString(),
    })),
    tasks: tasks.map((t) => ({
      id: t.id,
      userId: t.userId,
      title: t.title,
      description: t.description,
      priority: t.priority as any,
      status: t.status as any,
      dueDate: t.dueDate?.toISOString() || null,
      scheduledStart: t.scheduledStart?.toISOString() || null,
      scheduledEnd: t.scheduledEnd?.toISOString() || null,
      timezone: t.timezone,
      eventId: t.eventId,
      completedAt: t.completedAt?.toISOString() || null,
      createdAt: t.createdAt.toISOString(),
      updatedAt: t.updatedAt.toISOString(),
    })),
    reminders: reminders.map((r) => ({
      id: r.id,
      userId: r.userId,
      eventId: r.eventId,
      taskId: r.taskId,
      type: r.type as any,
      scheduledAt: r.scheduledAt.toISOString(),
      timezone: r.timezone,
      deliveryStatus: r.deliveryStatus as any,
      deliveredAt: r.deliveredAt?.toISOString() || null,
      failureReason: r.failureReason,
      attempts: r.attempts,
      createdAt: r.createdAt.toISOString(),
    })),
    preferences: (user.notificationPreferences as any) || DEFAULT_NOTIFICATION_PREFERENCES,
    exportedAt: new Date().toISOString(),
  };
}

/**
 * Permanently delete user account and all cascaded data.
 */
export async function deleteUserAccount(
  userId: string,
  confirmEmail: string,
  password?: string
): Promise<{ success: boolean; message: string }> {
  const prisma = getPrismaClient();

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new AppError(HTTP_STATUS.NOT_FOUND, 'USER_NOT_FOUND', 'User not found');

  if (normalizeEmail(confirmEmail) !== user.email) {
    throw new AppError(
      HTTP_STATUS.BAD_REQUEST,
      'EMAIL_MISMATCH',
      'The confirmation email does not match your registered email address.'
    );
  }

  // If user has a password set, require password verification
  if (user.passwordHash) {
    if (!password) {
      throw new AppError(HTTP_STATUS.BAD_REQUEST, 'PASSWORD_REQUIRED', 'Password is required to confirm account deletion.');
    }
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      throw new AppError(HTTP_STATUS.UNAUTHORIZED, 'INVALID_PASSWORD', 'Invalid password.');
    }
  }

  // Delete user (Prisma cascade onDelete removes all related records)
  await prisma.user.delete({ where: { id: userId } });

  return {
    success: true,
    message: 'Your account and all associated data have been permanently deleted.',
  };
}
