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

