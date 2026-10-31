import { Router } from 'express';
import { notificationController } from '../controllers/notification.controller.js';
import { authenticate, validate } from '../middleware/index.js';
import { asyncHandler } from '../utils/index.js';
import {
  deviceRegistrationSchema,
  updateNotificationPreferencesSchema,
} from '@personal-ai-assistant/shared';

const router = Router();

// All notification routes require authentication
router.use(asyncHandler(authenticate as never));

router.post(
  '/devices',
  validate(deviceRegistrationSchema),
  asyncHandler((req, res) => notificationController.registerDevice(req, res))
);

router.delete(
  '/devices/:token',
  asyncHandler((req, res) => notificationController.unregisterDevice(req, res))
);

router.get(
  '/preferences',
  asyncHandler((req, res) => notificationController.getPreferences(req, res))
);

router.put(
  '/preferences',
  validate(updateNotificationPreferencesSchema),
  asyncHandler((req, res) => notificationController.updatePreferences(req, res))
);

router.post(
  '/test-push',
  asyncHandler((req, res) => notificationController.sendTestPush(req, res))
);

export default router;
