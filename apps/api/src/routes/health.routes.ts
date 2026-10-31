import { Router } from 'express';
import { getPrismaClient, getEnv } from '../config/index.js';

const router = Router();

router.get('/health', async (_req, res) => {
  try {
    await getPrismaClient().$queryRaw`SELECT 1`;
    res.json({
      success: true,
      data: {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
      },
    });
  } catch {
    res.status(503).json({
      success: false,
      error: {
        status: 503,
        code: 'SERVICE_UNAVAILABLE',
        message: 'Database connection failed',
      },
    });
  }
});

router.get('/health/ready', async (_req, res) => {
  const env = getEnv();
  let dbStatus = 'ok';
  let redisStatus = env.REDIS_URL ? 'configured' : 'disabled';

  try {
    await getPrismaClient().$queryRaw`SELECT 1`;
  } catch {
    dbStatus = 'unavailable';
  }

  const isReady = dbStatus === 'ok';

  if (isReady) {
    res.json({
      success: true,
      data: {
        status: 'ready',
        database: dbStatus,
        redis: redisStatus,
        timestamp: new Date().toISOString(),
      },
    });
  } else {
    res.status(503).json({
      success: false,
      error: {
        status: 503,
        code: 'NOT_READY',
        message: 'Readiness check failed',
        details: { database: dbStatus, redis: redisStatus },
      },
    });
  }
});

export default router;
