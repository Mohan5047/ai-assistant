import nodemailer, { type Transporter } from 'nodemailer';
import { getEnv } from '../config/index.js';
import { logger } from '../utils/index.js';

let transporter: Transporter | null = null;

function getTransporter(): Transporter | null {
  const env = getEnv();
  if (!transporter && env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS) {
    transporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_PORT === 465,
      auth: {
        user: env.SMTP_USER,
        pass: env.SMTP_PASS,
      },
    });
  }
  return transporter;
}

export async function sendEmailReminder(options: {
  to: string;
  subject: string;
  title: string;
  scheduledTime: string;
  type: string;
}): Promise<boolean> {
  const env = getEnv();
  const transport = getTransporter();

  if (!transport) {
    // In development or when SMTP is not configured, safely log sanitized outcome
    logger.info(`[Email Service (Mock)] Sent reminder to ${options.to}: "${options.title}" scheduled for ${options.scheduledTime}`);
    return true;
  }

  try {
    await transport.sendMail({
      from: env.EMAIL_FROM,
      to: options.to,
      subject: options.subject,
      html: `
        <div style="font-family: sans-serif; padding: 20px; color: #333;">
          <h2 style="color: #4f46e5;">Personal AI Assistant Reminder</h2>
          <p><strong>${options.title}</strong></p>
          <p>Scheduled: ${options.scheduledTime}</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
          <p style="font-size: 12px; color: #888;">This is an automated reminder from your Personal AI Assistant.</p>
        </div>
      `,
    });
    return true;
  } catch (err: any) {
    logger.error(`Failed to send email reminder to ${options.to}:`, err.message);
    throw err;
  }
}

export async function sendPasswordResetEmail(options: {
  to: string;
  token: string;
  displayName: string;
}): Promise<boolean> {
  const env = getEnv();
  const transport = getTransporter();
  const resetUrl = `${env.APP_URL || 'http://localhost:5173'}/reset-password?token=${options.token}`;

  if (!transport) {
    logger.info(`[Email Service (Mock)] Sent password reset link to ${options.to} (Token generated securely)`);
    return true;
  }

  try {
    await transport.sendMail({
      from: env.EMAIL_FROM,
      to: options.to,
      subject: 'Reset your Personal AI Assistant password',
      html: `
        <div style="font-family: sans-serif; padding: 20px; color: #333;">
          <h2 style="color: #4f46e5;">Password Reset Request</h2>
          <p>Hi ${options.displayName},</p>
          <p>You recently requested to reset your password for your Personal AI Assistant account. Click the button below to set a new password:</p>
          <p style="margin: 24px 0;">
            <a href="${resetUrl}" style="background-color: #4f46e5; color: #ffffff; padding: 10px 20px; border-radius: 6px; text-decoration: none; font-weight: bold;">
              Reset Password
            </a>
          </p>
          <p style="font-size: 13px; color: #666;">This link expires in 1 hour. If you did not request this, please ignore this email.</p>
        </div>
      `,
    });
    return true;
  } catch (err: any) {
    logger.error(`Failed to send password reset email to ${options.to}:`, err.message);
    throw err;
  }
}
