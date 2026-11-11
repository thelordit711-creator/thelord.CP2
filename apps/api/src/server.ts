import express from 'express';
import http from 'http';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import mongoose from 'mongoose';

dotenv.config();

import { validateEnvironment } from './config/envValidator';
import { isOriginAllowed } from './config/cors';
import { getSwaggerUiHtml, openApiSpec } from './config/openapi';
import { csrfGuard } from './middlewares/csrfGuard';
import { logger } from './utils/logger';

// Execute fail-fast security check on runtime environment
validateEnvironment();

import { connectDatabase } from './config/database';
import { SocketService } from './services/socket.service';
import { CronService } from './services/cron.service';

// Route imports
import authRoutes from './routes/auth.routes';
import usersRoutes from './routes/users.routes';
import tasksRoutes from './routes/tasks.routes';
import treasuryRoutes from './routes/treasury.routes';
import financeRoutes from './routes/finance.routes';
import uploadRoutes from './routes/upload.routes';
import aiRoutes from './routes/ai.routes';
import chatRoutes from './routes/chat.routes';
import meetingRoutes from './routes/meeting.routes';
import notificationsRoutes from './routes/notifications.routes';
import projectsRoutes from './routes/projects.routes';

const app = express();
const server = http.createServer(app);

// Initialize real-time Socket.io engine
SocketService.init(server);

// Essential Middlewares
app.use(helmet({ crossOriginResourcePolicy: false }));

// Secure CORS Middleware for Enterprise Production, Vercel, and Localhost
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (isOriginAllowed(origin)) {
    if (origin) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Credentials', 'true');
    }
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, Set-Cookie');
    res.setHeader('Access-Control-Max-Age', '86400');
  }

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  next();
});

app.use(cors({
  origin: (origin, callback) => {
    if (isOriginAllowed(origin)) {
      callback(null, true);
    } else {
      const corsErr: any = new Error(`CORS policy violation: Origin ${origin} not allowed`);
      corsErr.status = 403;
      corsErr.code = 'CORS_ORIGIN_FORBIDDEN';
      callback(corsErr);
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'Authorization']
}));
app.options('*', cors());
app.use(compression());
app.use(cookieParser());
app.use(csrfGuard);
app.use(morgan('combined', {
  stream: {
    write: (msg: string) => logger.info(`[HTTP] ${msg.trim()}`)
  },
  skip: (req) => req.url === '/health'
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Attach deterministic X-Request-Id for audit & error correlation
app.use((req, res, next) => {
  const incomingId = typeof req.headers['x-request-id'] === 'string' ? req.headers['x-request-id'].trim() : '';
  const requestId = incomingId || crypto.randomUUID();
  (req as any).requestId = requestId;
  res.setHeader('X-Request-Id', requestId);
  next();
});

// Ensure database connection middleware (skipped in isolated unit/HTTP test mode)
app.use(async (req, res, next) => {
  if (process.env.NODE_ENV === 'test') {
    return next();
  }
  try {
    await connectDatabase();
    next();
  } catch (err) {
    logger.error('Database connection middleware error:', err);
    next(err);
  }
});

// Static uploads serving
const uploadsStaticDir = process.env.VERCEL ? path.join('/tmp', 'uploads') : path.join(process.cwd(), 'uploads');
try {
  if (!fs.existsSync(uploadsStaticDir)) {
    fs.mkdirSync(uploadsStaticDir, { recursive: true });
  }
} catch (e) {
  // safe fallback
}
app.use('/uploads', express.static(uploadsStaticDir, {
  dotfiles: 'ignore',
  index: false,
  setHeaders: (res) => {
    res.set('X-Content-Type-Options', 'nosniff');
  }
}));

// Health check (liveness) endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'online',
    system: 'THE LORD OF CRYPTO — Control Panel C.P API',
    timestamp: new Date().toISOString()
  });
});

// Readiness check endpoint (verifies database connectivity)
app.get('/ready', (_req, res) => {
  const isDbConnected = mongoose.connection.readyState === 1;
  if (!isDbConnected) {
    res.status(503).json({
      status: 'not_ready',
      database: 'disconnected',
      timestamp: new Date().toISOString()
    });
    return;
  }
  res.json({
    status: 'ready',
    database: 'connected',
    timestamp: new Date().toISOString()
  });
});

// OpenAPI 3.0 JSON manifest & Interactive Swagger UI
app.get('/api/docs.json', (_req, res) => {
  res.json(openApiSpec);
});

app.get('/api/docs', (_req, res) => {
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline' https://unpkg.com; style-src 'self' 'unsafe-inline' https://unpkg.com; img-src 'self' data: https://unpkg.com;"
  );
  res.type('html').send(getSwaggerUiHtml());
});

// API Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', usersRoutes);
app.use('/api/v1/tasks', tasksRoutes);
app.use('/api/v1/treasury', treasuryRoutes);
app.use('/api/v1/finance', financeRoutes);
app.use('/api/v1/upload', uploadRoutes);
app.use('/api/v1/ai', aiRoutes);
app.use('/api/v1/chat', chatRoutes);
app.use('/api/v1/meetings', meetingRoutes);
app.use('/api/v1/notifications', notificationsRoutes);
app.use('/api/v1/projects', projectsRoutes);

// Standardized Global Error Handling Middleware (never leaks internal details in production)
app.use((err: any, req: express.Request, res: express.Response, _next: express.NextFunction) => {
  const status = Number(err?.status || err?.statusCode) || 500;
  const requestId = (req as any).requestId;
  const isProduction = process.env.NODE_ENV === 'production';

  logger.error('Unhandled Server Error', {
    requestId,
    status,
    path: req.originalUrl,
    method: req.method,
    error: err?.message || err
  });

  const safeMessage =
    isProduction && status >= 500
      ? 'حدث خطأ داخلي في الخادم، يرجى مراجعة فريق التشغيل باستخدام رقم الطلب.'
      : err?.message || 'Internal Server Error';

  res.status(status).json({
    success: false,
    errorCode: err?.code || (status >= 500 ? 'INTERNAL_SERVER_ERROR' : 'REQUEST_ERROR'),
    error: safeMessage,
    requestId
  });
});

const PORT = Number(process.env.PORT) || 5000;
const HOST = process.env.HOST || '0.0.0.0';

async function startServer() {
  await connectDatabase();
  CronService.init();
  if (!process.env.VERCEL) {
    server.listen(PORT, HOST, () => {
      logger.info(`🦁 THE LORD OF CRYPTO C.P API running on http://${HOST}:${PORT}`);
    });
  }
}

if (process.env.NODE_ENV !== 'test') {
  startServer();
}

export { app, server };
export default app;

