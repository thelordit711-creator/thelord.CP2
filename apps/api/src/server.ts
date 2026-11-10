import express from 'express';
import http from 'http';
import path from 'path';
import fs from 'fs';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';

dotenv.config();

import { validateEnvironment } from './config/envValidator';
import { isOriginAllowed } from './config/cors';
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
      callback(new Error(`CORS policy violation: Origin ${origin} not allowed`));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'Authorization']
}));
app.options('*', cors());
app.use(compression());
app.use(cookieParser());
app.use(morgan('combined', {
  stream: {
    write: (msg: string) => logger.info(`[HTTP] ${msg.trim()}`)
  },
  skip: (req) => req.url === '/health'
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Ensure database connection middleware
app.use(async (req, res, next) => {
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

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'online',
    system: 'THE LORD OF CRYPTO — Control Panel C.P API',
    timestamp: new Date().toISOString()
  });
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

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('Unhandled Server Error', err);
  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Internal Server Error'
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

startServer();

export { app, server };
export default app;

