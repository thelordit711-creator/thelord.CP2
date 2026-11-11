import { Server as SocketIOServer, Socket } from 'socket.io';
import { Server as HttpServer } from 'http';
import jwt from 'jsonwebtoken';
import { User } from '../models/User.model';
import { Notification } from '../models/Notification.model';
import { NotificationType } from '@lord/shared-types';
import { isOriginAllowed } from '../config/cors';
import { logger } from '../utils/logger';

export interface AuthenticatedSocketUser {
  _id: string;
  fullName: string;
  email: string;
  accessRole: string;
}

export class SocketService {
  private static io: SocketIOServer | null = null;
  // Multi-tab socket tracker: userId -> Set of active socket IDs
  private static userSocketsMap = new Map<string, Set<string>>();

  public static parseCookies(cookieHeader?: string): Record<string, string> {
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

  public static extractTokenFromHandshake(handshake: Socket['handshake']): string | null {
    const cookies = this.parseCookies(handshake.headers?.cookie);
    const authHeader = handshake.headers?.authorization;
    const token =
      handshake.auth?.token ||
      (typeof authHeader === 'string' ? authHeader.replace(/^Bearer\s+/i, '') : null) ||
      cookies['lord_auth_token'] ||
      cookies['auth_token'] ||
      handshake.query?.token;

    return typeof token === 'string' && token.trim() !== '' ? token.trim() : null;
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

    // Strict Cryptographic JWT Authentication Middleware for ALL Socket Connections
    this.io.use(async (socket: Socket, next) => {
      try {
        const token = this.extractTokenFromHandshake(socket.handshake);

        if (!token) {
          logger.security('[Socket] Rejected unauthenticated socket connection attempt (missing token)', {
            ip: socket.handshake.address
          });
          return next(new Error('Authentication error: Valid JWT token is required for real-time connections'));
        }

        const jwtSecret = process.env.JWT_SECRET;
        if (!jwtSecret) {
          return next(new Error('Server configuration error'));
        }

        const decoded = jwt.verify(token, jwtSecret) as { userId?: string; id?: string; accessRole?: string };
        const targetUserId = decoded?.userId || decoded?.id;
        if (!targetUserId) {
          return next(new Error('Authentication error: Invalid token payload'));
        }

        const userDoc = await User.findById(targetUserId).select('_id fullName email accessRole isSuspended');
        if (!userDoc || userDoc.isSuspended) {
          logger.security('[Socket] Rejected connection for non-existent or suspended user', {
            userId: targetUserId
          });
          return next(new Error('Authentication error: User account not active or suspended'));
        }

        (socket as any).authenticatedUser = {
          _id: String(userDoc._id),
          fullName: userDoc.fullName,
          email: userDoc.email,
          accessRole: userDoc.accessRole
        } as AuthenticatedSocketUser;

        next();
      } catch (err: any) {
        logger.security(`[Socket] Rejected invalid JWT handshake: ${err.message}`, {
          ip: socket.handshake.address
        });
        next(new Error('Authentication error: Invalid or expired token'));
      }
    });

    this.io.on('connection', async (socket: Socket) => {
      const authUser: AuthenticatedSocketUser | undefined = (socket as any).authenticatedUser;

      // Hard defense-in-depth check
      if (!authUser) {
        socket.disconnect(true);
        return;
      }

      const uid = authUser._id;
      const isTreasury = authUser.accessRole === 'TREASURY';

      // Register in multi-tab tracker
      if (!this.userSocketsMap.has(uid)) {
        this.userSocketsMap.set(uid, new Set());
      }
      this.userSocketsMap.get(uid)!.add(socket.id);

      // Join verified personal room
      socket.join(`room:user:${uid}`);

      // Join privileged role rooms strictly based on verified database/JWT role
      if (authUser.accessRole === 'SUPER_ADMIN') {
        socket.join('room:admin');
      } else if (authUser.accessRole === 'TREASURY') {
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

      // Safe user:join handler — strictly ignores any spoofed client ID or role
      socket.on('user:join', (data?: { userId?: string; role?: string }) => {
        if (data?.userId && data.userId !== uid) {
          logger.security(`[Socket Spoof Blocked] User ${uid} attempted to spoof user:join as ${data.userId}`);
          socket.emit('security:error', { error: 'Identity spoofing is strictly prohibited' });
          return;
        }
        socket.emit('user:joined', { userId: uid, socketId: socket.id });
      });

      // WebRTC Live Meeting & Broadcast P2P Signaling (Blocked for Treasury Isolation)
      socket.on('meeting:signal:join', (data: { isHost?: boolean }) => {
        if (isTreasury) {
          logger.security(`[Socket Isolation] Treasury user ${uid} blocked from joining meeting signaling`);
          return;
        }
        socket.join('room:meeting:central');
        socket.to('room:meeting:central').emit('meeting:signal:user-joined', {
          socketId: socket.id,
          userId: uid,
          fullName: authUser.fullName,
          isHost: authUser.accessRole === 'SUPER_ADMIN' && !!data?.isHost
        });
      });

      socket.on('meeting:signal:offer', (data: { toSocketId: string; offer: any; isScreen?: boolean }) => {
        if (isTreasury) return;
        this.io?.to(data.toSocketId).emit('meeting:signal:offer', {
          fromSocketId: socket.id,
          offer: data.offer,
          isScreen: data.isScreen,
          fromName: authUser.fullName
        });
      });

      socket.on('meeting:signal:answer', (data: { toSocketId: string; answer: any }) => {
        if (isTreasury) return;
        this.io?.to(data.toSocketId).emit('meeting:signal:answer', {
          fromSocketId: socket.id,
          answer: data.answer
        });
      });

      socket.on('meeting:signal:candidate', (data: { toSocketId: string; candidate: any }) => {
        if (isTreasury) return;
        this.io?.to(data.toSocketId).emit('meeting:signal:candidate', {
          fromSocketId: socket.id,
          candidate: data.candidate
        });
      });

      // 1-to-1 WebRTC Direct Audio & Video Call Signaling (Blocked for Treasury Isolation)
      socket.on('call:invite', (data: { toUserId: string; caller?: { avatarUrl?: string }; callType?: 'audio' | 'video' }) => {
        if (isTreasury) return;
        this.io?.to(`room:user:${data.toUserId}`).emit('call:incoming', {
          caller: {
            _id: uid,
            fullName: authUser.fullName,
            avatarUrl: data.caller?.avatarUrl
          },
          callerSocketId: socket.id,
          callType: data.callType || 'audio'
        });
      });

      socket.on('call:accept', (data: { toUserId: string; callType?: 'audio' | 'video' }) => {
        if (isTreasury) return;
        this.io?.to(`room:user:${data.toUserId}`).emit('call:accepted', {
          acceptor: {
            _id: uid,
            fullName: authUser.fullName
          },
          acceptorSocketId: socket.id,
          callType: data.callType || 'audio'
        });
      });

      socket.on('call:reject', (data: { toUserId: string; reason?: string }) => {
        if (isTreasury) return;
        this.io?.to(`room:user:${data.toUserId}`).emit('call:rejected', {
          reason: data.reason || 'المستخدم مشغول حالياً'
        });
      });

      socket.on('call:signal', (data: { toUserId: string; signal: any }) => {
        if (isTreasury) return;
        this.io?.to(`room:user:${data.toUserId}`).emit('call:signal', {
          fromSocketId: socket.id,
          signal: data.signal
        });
      });

      socket.on('call:end', (data: { toUserId: string }) => {
        if (isTreasury) return;
        this.io?.to(`room:user:${data.toUserId}`).emit('call:ended', {
          fromSocketId: socket.id
        });
      });

      socket.on('disconnecting', () => {
        if (!isTreasury) {
          socket.to('room:meeting:central').emit('meeting:signal:user-left', {
            socketId: socket.id
          });
        }
      });

      socket.on('disconnect', async () => {
        const userSockets = this.userSocketsMap.get(uid);
        if (userSockets) {
          userSockets.delete(socket.id);
          // Only update presence to OFFLINE if all open tabs/sockets have closed
          if (userSockets.size === 0) {
            this.userSocketsMap.delete(uid);
            try {
              await User.findByIdAndUpdate(uid, {
                presenceStatus: 'OFFLINE',
                lastActiveAt: new Date()
              });
              this.io?.emit('presence:update', { userId: uid, status: 'OFFLINE' });
            } catch (e) {
              logger.error(`[Socket] Error updating presence on disconnect for ${uid}:`, e);
            }
          }
        }
      });
    });

    logger.info('🦁 [Socket.io] Hardened real-time service initialized (JWT Handshake Enforced)');
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
