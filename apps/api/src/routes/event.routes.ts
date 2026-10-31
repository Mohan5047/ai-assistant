import { Router } from 'express';
import { eventController } from '../controllers/index.js';
import { authenticate, validate } from '../middleware/index.js';
import { createEventSchema, updateEventSchema, eventFilterSchema } from '@personal-ai-assistant/shared';
import { asyncHandler } from '../utils/index.js';

const router = Router();

// All event routes require authentication
router.use(asyncHandler(authenticate as never));

router.get(
  '/',
  validate(eventFilterSchema, 'query'),
  asyncHandler(eventController.listEvents)
);

router.get(
  '/:id',
  asyncHandler(eventController.getEvent)
);

router.post(
  '/',
  validate(createEventSchema),
  asyncHandler(eventController.createEvent)
);

router.patch(
  '/:id',
  validate(updateEventSchema),
  asyncHandler(eventController.updateEvent)
);

router.delete(
  '/:id',
  asyncHandler(eventController.deleteEvent)
);

export default router;
