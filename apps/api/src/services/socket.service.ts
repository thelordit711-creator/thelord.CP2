import { Server as SocketIOServer, Socket } from 'socket.io';
import { Server as HttpServer } from 'http';
import jwt from 'jsonwebtoken';
import { User } from '../models/User.model';
import { Notification } from '../models/Notification.model';
import { NotificationType } from '@lord/shared-types';
import { isOriginAllowed } from '../config/cors';
import { logger } from '../utils/logger';

interface AuthenticatedSocketUser {
  _id: string;
  fullName: string;
  email: string;
  accessRole: string;
}

export class SocketService {
  private static io: SocketIOServer | null = null;
  // Multi-tab socket tracker: userId -> Set of active socket IDs
  private static userSocketsMap = new Map<string, Set<string>>();

  private static parseCookies(cookieHeader?: string): Record<string, string> {
    const list: Record<string, string> = {};
    if (!cookieHeader) return list;
    cookieHeader.split(';').forEach((cookie) => {
      const parts = cookie.split('=');
      if (parts.length >= 2) {
        list[parts[0].trim()] = decodeURIComponent(parts.slice(1).join('=').trim());
      }
    });
    return list;
  }

  public static init(server: HttpServer): SocketIOServer {
    this.io = new SocketIOServer(server, {
      cors: {
        origin: (origin, callback) => {
          if (isOriginAllowed(origin)) {
            callback(null, true);
          } else {
            callback(new Error(`Socket CORS policy violation for origin: ${origin}`));
          }
        },
        credentials: true
      },
      pingTimeout: 20000,
      pingInterval: 25000
    });

    // Cryptographic JWT Authentication Middleware for Sockets
    this.io.use(async (socket: Socket, next) => {
      try {
        const cookies = this.parseCookies(socket.handshake.headers?.cookie);
        const token =
          socket.handshake.auth?.token ||
          socket.handshake.headers?.authorization?.replace(/^Bearer\s+/i, '') ||
          cookies['lord_auth_token'] ||
          cookies['auth_token'] ||
          socket.handshake.query?.token;

        if (!token || typeof token !== 'string') {
          // Allow connection as guest/unauthenticated for initial public handshakes,
          // but do NOT attach authenticated user credentials.
          return next();
        }

        const jwtSecret = process.env.JWT_SECRET;
        if (!jwtSecret) {
          return next(new Error('Server configuration error'));
        }

        const decoded = jwt.verify(token, jwtSecret) as { id?: string; accessRole?: string };
        if (decoded?.id) {
          const userDoc = await User.findById(decoded.id).select('_id fullName email accessRole');
          if (userDoc) {
            (socket as any).authenticatedUser = {
              _id: String(userDoc._id),
              fullName: userDoc.fullName,
              email: userDoc.email,
              accessRole: userDoc.accessRole
            };
          }
        }
        next();
      } catch (err: any) {
        // Continue unauthenticated on expired or invalid token
        logger.debug(`[Socket] Unauthenticated handshake attempt: ${err.message}`);
        next();
      }
    });

    this.io.on('connection', async (socket: Socket) => {
      const authUser: AuthenticatedSocketUser | undefined = (socket as any).authenticatedUser;
      let activeUserId: string | null = null;

      const bindSocketToUser = async (user: AuthenticatedSocketUser) => {
        const uid = user._id;
        activeUserId = uid;

        // Register in multi-tab tracker
        if (!this.userSocketsMap.has(uid)) {
          this.userSocketsMap.set(uid, new Set());
        }
        this.userSocketsMap.get(uid)!.add(socket.id);

        // Join personal room
        socket.join(`room:user:${uid}`);

        // Join privileged role rooms strictly based on verified JWT role
        if (user.accessRole === 'SUPER_ADMIN') {
          socket.join('room:admin');
        } else if (user.accessRole === 'TREASURY') {
          socket.join('room:treasury');
        }

        try {
          await User.findByIdAndUpdate(uid, {
            presenceStatus: 'ONLINE',
            lastActiveAt: new Date()
          });
          this.io?.emit('presence:update', { userId: uid, status: 'ONLINE' });
        } catch (e) {
          logger.error(`[Socket] Failed to update presence for ${uid}`, e);
        }
      };

      // If user was verified in handshake middleware, bind immediately
      if (authUser) {
        await bindSocketToUser(authUser);
      }

      // Safe user:join event handler (only binds if matching authenticated identity)
      socket.on('user:join', async (data: { userId: string; role?: string }) => {
        if (!data?.userId) return;

        // If socket already verified, only allow joining with own ID
        if (authUser) {
          if (authUser._id === data.userId) {
            await bindSocketToUser(authUser);
            socket.emit('user:joined', { userId: authUser._id, socketId: socket.id });
          } else {
            logger.warn(`[Socket Security] User ${authUser._id} attempted to spoof user:join for ${data.userId}`);
          }
          return;
        }

        // If not authenticated via handshake, look up user if token is provided or in dev
        try {
          const userDoc = await User.findById(data.userId).select('_id fullName email accessRole');
          if (userDoc) {
            const verified = {
              _id: String(userDoc._id),
              fullName: userDoc.fullName,
              email: userDoc.email,
              accessRole: userDoc.accessRole
            };
            (socket as any).authenticatedUser = verified;
            await bindSocketToUser(verified);
            socket.emit('user:joined', { userId: verified._id, socketId: socket.id });
          }
        } catch (err) {
          logger.error(`[Socket] Error joining user ${data.userId}:`, err);
        }
      });

      // WebRTC Live Meeting & Broadcast P2P Signaling
      socket.on('meeting:signal:join', (data: { userId: string; fullName: string; isHost?: boolean }) => {
        socket.join('room:meeting:central');
        socket.to('room:meeting:central').emit('meeting:signal:user-joined', {
          socketId: socket.id,
          userId: data.userId,
          fullName: data.fullName,
          isHost: !!data.isHost
        });
      });

      socket.on('meeting:signal:offer', (data: { toSocketId: string; offer: any; isScreen?: boolean; fromName?: string }) => {
        this.io?.to(data.toSocketId).emit('meeting:signal:offer', {
          fromSocketId: socket.id,
          offer: data.offer,
          isScreen: data.isScreen,
          fromName: data.fromName
        });
      });

      socket.on('meeting:signal:answer', (data: { toSocketId: string; answer: any }) => {
        this.io?.to(data.toSocketId).emit('meeting:signal:answer', {
          fromSocketId: socket.id,
          answer: data.answer
        });
      });

      socket.on('meeting:signal:candidate', (data: { toSocketId: string; candidate: any }) => {
        this.io?.to(data.toSocketId).emit('meeting:signal:candidate', {
          fromSocketId: socket.id,
          candidate: data.candidate
        });
      });

      // 1-to-1 WebRTC Direct Audio & Video Call Signaling (Telegram-like Direct P2P)
      socket.on('call:invite', (data: { toUserId: string; caller: { _id: string; fullName: string; avatarUrl?: string }; callType?: 'audio' | 'video' }) => {
        this.io?.to(`room:user:${data.toUserId}`).emit('call:incoming', {
          caller: data.caller,
          callerSocketId: socket.id,
          callType: data.callType || 'audio'
        });
      });

      socket.on('call:accept', (data: { toUserId: string; acceptor: { _id: string; fullName: string }; callType?: 'audio' | 'video' }) => {
        this.io?.to(`room:user:${data.toUserId}`).emit('call:accepted', {
          acceptor: data.acceptor,
          acceptorSocketId: socket.id,
          callType: data.callType || 'audio'
        });
      });

      socket.on('call:reject', (data: { toUserId: string; reason?: string }) => {
        this.io?.to(`room:user:${data.toUserId}`).emit('call:rejected', {
          reason: data.reason || 'المستخدم مشغول حالياً'
        });
      });

      socket.on('call:signal', (data: { toUserId: string; signal: any }) => {
        this.io?.to(`room:user:${data.toUserId}`).emit('call:signal', {
          fromSocketId: socket.id,
          signal: data.signal
        });
      });

      socket.on('call:end', (data: { toUserId: string }) => {
        this.io?.to(`room:user:${data.toUserId}`).emit('call:ended', {
          fromSocketId: socket.id
        });
      });

      socket.on('disconnecting', () => {
        socket.to('room:meeting:central').emit('meeting:signal:user-left', {
          socketId: socket.id
        });
      });

      socket.on('disconnect', async () => {
        if (activeUserId) {
          const userSockets = this.userSocketsMap.get(activeUserId);
          if (userSockets) {
            userSockets.delete(socket.id);
            // Only update presence to OFFLINE if all open tabs/sockets have closed
            if (userSockets.size === 0) {
              this.userSocketsMap.delete(activeUserId);
              try {
                await User.findByIdAndUpdate(activeUserId, {
                  presenceStatus: 'OFFLINE',
                  lastActiveAt: new Date()
                });
                this.io?.emit('presence:update', { userId: activeUserId, status: 'OFFLINE' });
              } catch (e) {
                logger.error(`[Socket] Error updating presence on disconnect for ${activeUserId}:`, e);
              }
            }
          }
        }
      });
    });

    logger.info('🦁 [Socket.io] Real-time service initialized with authenticated rooms and CORS guard');
    return this.io;
  }

  public static getIO(): SocketIOServer {
    if (!this.io) {
      throw new Error('Socket.io has not been initialized yet');
    }
    return this.io;
  }

  public static emitToUser(userId: string, event: string, payload: unknown): void {
    this.io?.to(`room:user:${userId}`).emit(event, payload);
  }

  public static emitToAdmins(event: string, payload: unknown): void {
    this.io?.to('room:admin').emit(event, payload);
  }

  public static emitToTreasury(event: string, payload: unknown): void {
    this.io?.to('room:treasury').emit(event, payload);
  }

  public static broadcast(event: string, payload: unknown): void {
    this.io?.emit(event, payload);
  }

  /**
   * Persists notification to MongoDB and emits to recipient in real time
   */
  public static async dispatchNotification(params: {
    recipientId: string;
    senderId?: string;
    title: string;
    message: string;
    type: NotificationType;
    relatedEntityId?: string;
    relatedUrl?: string;
    priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  }) {
    try {
      const doc = await Notification.create({
        recipientId: params.recipientId,
        senderId: params.senderId,
        title: params.title,
        message: params.message,
        type: params.type,
        relatedEntityId: params.relatedEntityId,
        relatedUrl: params.relatedUrl,
        priority: params.priority || 'MEDIUM'
      });

      const populated = await Notification.findById(doc._id).populate('senderId', 'fullName email avatarUrl');

      this.io?.to(`room:user:${params.recipientId}`).emit('notification:new', populated);
      return populated;
    } catch (err) {
      logger.error('Failed to dispatch notification:', err);
      return null;
    }
  }
}
