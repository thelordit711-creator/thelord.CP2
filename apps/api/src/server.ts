import express from 'express';
import http from 'http';
import path from 'path';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import dotenv from 'dotenv';

dotenv.config();

import { connectDatabase } from './config/database';
import { SocketService } from './services/socket.service';

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

const app = express();
const server = http.createServer(app);

// Initialize real-time Socket.io engine
SocketService.init(server);

// Essential Middlewares
app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(compression());
app.use(morgan('dev'));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Static uploads serving
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

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

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled Server Error:', err);
  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Internal Server Error'
  });
});

const PORT = Number(process.env.PORT) || 5000;
const HOST = process.env.HOST || '0.0.0.0';

async function startServer() {
  await connectDatabase();
  server.listen(PORT, HOST, () => {
    console.log(`🦁 THE LORD OF CRYPTO C.P API running on http://${HOST}:${PORT}`);
  });
}

startServer();

export { app, server };

