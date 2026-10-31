import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import * as aiController from '../controllers/ai.controller.js';
import { authenticate, validate } from '../middleware/index.js';
import { aiChatSchema } from '@personal-ai-assistant/shared';
import { asyncHandler } from '../utils/index.js';

const router = Router();

router.use(asyncHandler(authenticate as never));

const aiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30,
  message: {
    success: false,
    error: {
      status: 429,
      code: 'TOO_MANY_REQUESTS',
      message: 'Too many AI requests. Please slow down.',
    },
  },
});

router.post(
  '/chat',
  aiLimiter,
  validate(aiChatSchema),
  asyncHandler(aiController.chat)
);

router.get(
  '/conversations',
  asyncHandler(aiController.listConversations)
);

router.get(
  '/conversations/:id',
  asyncHandler(aiController.getConversation)
);

router.delete(
  '/conversations/:id',
  asyncHandler(aiController.deleteConversation)
);

router.get(
  '/daily-plan',
  asyncHandler(aiController.getDailyPlan)
);

export default router;
