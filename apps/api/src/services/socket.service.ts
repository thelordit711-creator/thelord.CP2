import { Server as SocketIOServer, Socket } from 'socket.io';
import { Server as HttpServer } from 'http';
import { User } from '../models/User.model';
import { Notification } from '../models/Notification.model';
import { NotificationType } from '@lord/shared-types';

export class SocketService {
  private static io: SocketIOServer | null = null;
  private static userSocketMap = new Map<string, string>(); // userId -> socketId

  public static init(server: HttpServer): SocketIOServer {
    this.io = new SocketIOServer(server, {
      cors: {
        origin: (origin, callback) => {
          callback(null, true);
        },
        credentials: true
      }
    });

    this.io.on('connection', async (socket: Socket) => {
      const handshakeUserId = (socket.handshake.query?.userId || socket.handshake.auth?.userId) as string;
      const handshakeRole = (socket.handshake.query?.role || socket.handshake.auth?.role) as string;
      let connectedUserId: string | null = handshakeUserId || null;

      const registerUserSocket = async (uid: string, uRole?: string) => {
        if (!uid) return;
        connectedUserId = uid;
        this.userSocketMap.set(uid, socket.id);
        socket.join(`room:user:${uid}`);
        
        if (uRole === 'SUPER_ADMIN') {
          socket.join('room:admin');
        } else if (uRole === 'TREASURY') {
          socket.join('room:treasury');
        }

        try {
          await User.findByIdAndUpdate(uid, {
            presenceStatus: 'ONLINE',
            lastActiveAt: new Date()
          });
          this.io?.emit('presence:update', { userId: uid, status: 'ONLINE' });
        } catch (e) {
          console.error('[Socket] Failed to update presence for', uid, e);
        }
      };

      if (handshakeUserId) {
        await registerUserSocket(handshakeUserId, handshakeRole);
      }

      // Dynamic join event for when user logs in or switches tabs
      socket.on('user:join', async (data: { userId: string; role?: string }) => {
        if (data?.userId) {
          await registerUserSocket(data.userId, data.role);
          socket.emit('user:joined', { userId: data.userId, socketId: socket.id });
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
        if (connectedUserId) {
          this.userSocketMap.delete(connectedUserId);
          await User.findByIdAndUpdate(connectedUserId, {
            presenceStatus: 'OFFLINE',
            lastActiveAt: new Date()
          });
          this.io?.emit('presence:update', { userId: connectedUserId, status: 'OFFLINE' });
        }
      });
    });

    console.log('🦁 [Socket.io] Real-time service initialized');
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
      console.error('Failed to dispatch notification:', err);
      return null;
    }
  }
}

