import { Server as SocketIOServer, Socket } from 'socket.io';
import { Server as HttpServer } from 'http';
import { User } from '../models/User.model';

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
      const userId = socket.handshake.query.userId as string;
      const role = socket.handshake.query.role as string;

      if (userId) {
        this.userSocketMap.set(userId, socket.id);
        socket.join(`room:user:${userId}`);

        // Update user presence to ONLINE
        await User.findByIdAndUpdate(userId, {
          presenceStatus: 'ONLINE',
          lastActiveAt: new Date()
        });

        // Broadcast presence change
        this.io?.emit('presence:update', { userId, status: 'ONLINE' });
      }

      if (role === 'SUPER_ADMIN') {
        socket.join('room:admin');
      } else if (role === 'TREASURY') {
        socket.join('room:treasury');
      }

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

      socket.on('disconnecting', () => {
        socket.to('room:meeting:central').emit('meeting:signal:user-left', {
          socketId: socket.id
        });
      });

      socket.on('disconnect', async () => {
        if (userId) {
          this.userSocketMap.delete(userId);
          await User.findByIdAndUpdate(userId, {
            presenceStatus: 'OFFLINE',
            lastActiveAt: new Date()
          });
          this.io?.emit('presence:update', { userId, status: 'OFFLINE' });
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
}

