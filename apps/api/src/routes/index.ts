import { Router } from 'express';
import healthRoutes from './health.routes.js';
import authRoutes from './auth.routes.js';
import eventRoutes from './event.routes.js';
import taskRoutes from './task.routes.js';
import dashboardRoutes from './dashboard.routes.js';
import aiRoutes from './ai.routes.js';
import calendarRoutes from './calendar.routes.js';
import notificationRoutes from './notification.routes.js';

const router = Router();

router.use(healthRoutes);
router.use('/auth', authRoutes);
router.use('/events', eventRoutes);
router.use('/tasks', taskRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/ai', aiRoutes);
router.use('/calendar', calendarRoutes);
router.use('/notifications', notificationRoutes);

export default router;
