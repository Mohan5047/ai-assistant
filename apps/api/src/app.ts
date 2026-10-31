import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { getEnv } from './config/index.js';
import { errorHandler, notFoundHandler } from './middleware/index.js';
import { logger } from './utils/index.js';
import apiRoutes from './routes/index.js';

export function createApp(): express.Application {
  const env = getEnv();
  const app = express();

  // Security
  app.use(helmet());

  // CORS
  const allowedOrigins = env.CORS_ORIGINS.split(',').map((o) => o.trim());
  app.use(
    cors({
      origin: allowedOrigins,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    })
  );

  // Parsing
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));
  app.use(cookieParser());

  // Request logging (sanitized)
  app.use((req, _res, next) => {
    logger.info(`${req.method} ${req.path}`);
    next();
  });

  // API routes
  app.use('/api', apiRoutes);

  // Not found & errors
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
