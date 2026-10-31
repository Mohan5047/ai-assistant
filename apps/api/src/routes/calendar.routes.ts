import { Router } from 'express';
import * as calendarController from '../controllers/calendar.controller.js';
import { authenticate } from '../middleware/index.js';
import { asyncHandler } from '../utils/index.js';

const router = Router();

router.use(asyncHandler(authenticate as never));

router.get('/google/auth-url', asyncHandler(calendarController.getAuthUrl));
router.get('/google/callback', asyncHandler(calendarController.handleCallback));
router.get('/google/status', asyncHandler(calendarController.getStatus));
router.post('/google/disconnect', asyncHandler(calendarController.disconnect));
router.post('/sync', asyncHandler(calendarController.triggerSync));

export default router;
