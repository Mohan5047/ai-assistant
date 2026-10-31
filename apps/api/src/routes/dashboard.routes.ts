import { Router } from 'express';
import { dashboardController } from '../controllers/index.js';
import { authenticate } from '../middleware/index.js';
import { asyncHandler } from '../utils/index.js';

const router = Router();

router.use(asyncHandler(authenticate as never));

router.get('/summary', asyncHandler(dashboardController.getSummary));

export default router;
