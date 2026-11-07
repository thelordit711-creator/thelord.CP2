import { AuditLog } from '../models/AuditLog.model';
import { SocketService } from './socket.service';
import { AuditActionType, AuditSeverity, AccessRole } from '@lord/shared-types';

export interface ILogAuditParams {
  userId: string;
  userName: string;
  userEmail: string;
  userRole: AccessRole;
  actionType: AuditActionType;
  targetId?: string;
  targetName?: string;
  targetType?: 'USER' | 'TASK' | 'PAYOUT' | 'SYSTEM' | 'SECURITY';
  details?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  severity?: AuditSeverity;
}

export class AuditService {
  /**
   * Log an immutable administrative or security action in the database
   * and broadcast real-time socket events to active Super Admins.
   */
  public static async logAction(params: ILogAuditParams): Promise<void> {
    try {
      const entry = await AuditLog.create({
        userId: params.userId,
        userName: params.userName,
        userEmail: params.userEmail,
        userRole: params.userRole,
        actionType: params.actionType,
        targetId: params.targetId,
        targetName: params.targetName,
        targetType: params.targetType || 'USER',
        details: params.details || {},
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
        severity: params.severity || 'INFO'
      });

      // Broadcast immediately to Super Admins room
      SocketService.emitToAdmins('audit:event', entry);
    } catch (error) {
      console.error('[AuditService] Failed to record audit log entry:', error);
    }
  }

  /**
   * Fetch paginated audit logs with search filters
   */
  public static async getLogs(query: {
    page?: number;
    limit?: number;
    actionType?: string;
    severity?: string;
    search?: string;
  }) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
    const skip = (page - 1) * limit;

    const filter: any = {};
    if (query.actionType) {
      filter.actionType = query.actionType;
    }
    if (query.severity) {
      filter.severity = query.severity;
    }
    if (query.search) {
      filter.$or = [
        { userName: { $regex: query.search, $options: 'i' } },
        { userEmail: { $regex: query.search, $options: 'i' } },
        { targetName: { $regex: query.search, $options: 'i' } },
        { targetId: { $regex: query.search, $options: 'i' } }
      ];
    }

    const [logs, total] = await Promise.all([
      AuditLog.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      AuditLog.countDocuments(filter)
    ]);

    return {
      logs,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    };
  }
}
