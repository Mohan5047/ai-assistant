import { Router } from 'express';
import { taskController } from '../controllers/index.js';
import { authenticate, validate } from '../middleware/index.js';
import { createTaskSchema, updateTaskSchema, taskFilterSchema } from '@personal-ai-assistant/shared';
import { asyncHandler } from '../utils/index.js';

const router = Router();

router.use(asyncHandler(authenticate as never));

router.get(
  '/',
  validate(taskFilterSchema, 'query'),
  asyncHandler(taskController.listTasks)
);

router.post(
  '/',
  validate(createTaskSchema),
  asyncHandler(taskController.createTask)
);

router.get(
  '/:id',
  asyncHandler(taskController.getTask)
);

router.patch(
  '/:id',
  validate(updateTaskSchema),
  asyncHandler(taskController.updateTask)
);

router.post(
  '/:id/complete',
  asyncHandler(taskController.completeTask)
);

router.delete(
  '/:id',
  asyncHandler(taskController.deleteTask)
);

export default router;
