import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { authController } from '../controllers/index.js';
import { authenticate, validate } from '../middleware/index.js';
import {
  registerSchema,
  loginSchema,
  googleAuthSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  updateProfileSchema,
  deleteAccountSchema,
} from '@personal-ai-assistant/shared';
import { asyncHandler } from '../utils/index.js';

const router = Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      status: 429,
      code: 'TOO_MANY_REQUESTS',
      message: 'Too many authentication attempts. Please try again later.',
    },
  },
});

router.post(
  '/register',
  authLimiter,
  validate(registerSchema),
  asyncHandler(authController.register)
);

router.post(
  '/login',
  authLimiter,
  validate(loginSchema),
  asyncHandler(authController.login)
);

router.post(
  '/google',
  authLimiter,
  validate(googleAuthSchema),
  asyncHandler(authController.googleAuth)
);

router.post(
  '/forgot-password',
  authLimiter,
  validate(forgotPasswordSchema),
  asyncHandler(authController.forgotPassword)
);

router.post(
  '/reset-password',
  authLimiter,
  validate(resetPasswordSchema),
  asyncHandler(authController.resetPassword)
);

router.get(
  '/me',
  asyncHandler(authenticate as never),
  asyncHandler(authController.me)
);

router.patch(
  '/profile',
  asyncHandler(authenticate as never),
  validate(updateProfileSchema),
  asyncHandler(authController.updateProfile)
);

router.get(
  '/export-data',
  asyncHandler(authenticate as never),
  asyncHandler(authController.exportData)
);

router.delete(
  '/account',
  asyncHandler(authenticate as never),
  validate(deleteAccountSchema),
  asyncHandler(authController.deleteAccount)
);

router.post(
  '/logout',
  asyncHandler(authController.logout)
);

export default router;
