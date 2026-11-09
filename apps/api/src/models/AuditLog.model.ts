import { Schema, model, Document } from 'mongoose';
import { IAuditLog } from '@lord/shared-types';

export interface IAuditLogDocument extends Omit<IAuditLog, '_id'>, Document {}

const AuditLogSchema = new Schema<IAuditLogDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    userName: { type: String, required: true },
    userEmail: { type: String, required: true },
    userRole: { type: String, required: true },
    actionType: {
      type: String,
      enum: [
        'BLOCK_USER',
        'UNBLOCK_USER',
        'DELETE_USER',
        'CHANGE_PASSWORD',
        'UPDATE_USER_ROLE_SALARY',
        'DISBURSE_PAYOUT',
        'CONFIRM_PAYOUT_RECEIPT',
        'TASK_BUDGET_SETTLED',
        'DELETE_TASK',
        'SYSTEM_SECURITY_CONFIG',
        'VAULT_TRANSFER',
        'VAULT_BUDGET_ADJUST',
        'TRANSACTION_MODIFIED',
        'TRANSACTION_DELETED',
        'RECURRING_EXPENSE_CREATED',
        'RECURRING_EXPENSE_EXECUTED'
      ],
      required: true,
      index: true
    },
    targetId: { type: String, index: true },
    targetName: { type: String },
    targetType: {
      type: String,
      enum: ['USER', 'TASK', 'PAYOUT', 'SYSTEM', 'SECURITY'],
      default: 'USER'
    },
    details: { type: Schema.Types.Mixed, default: {} },
    ipAddress: { type: String },
    userAgent: { type: String },
    severity: {
      type: String,
      enum: ['INFO', 'WARNING', 'CRITICAL'],
      default: 'INFO',
      index: true
    }
  },
  { timestamps: true }
);

AuditLogSchema.index({ createdAt: -1 });
AuditLogSchema.index({ actionType: 1, createdAt: -1 });
AuditLogSchema.index({ targetId: 1, createdAt: -1 });

export const AuditLog = model<IAuditLogDocument>('AuditLog', AuditLogSchema);

