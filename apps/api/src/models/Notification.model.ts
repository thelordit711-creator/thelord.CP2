import { Schema, model, Document } from 'mongoose';
import { INotification } from '@lord/shared-types';

export interface INotificationDocument extends Omit<INotification, '_id'>, Document {}

const NotificationSchema = new Schema<INotificationDocument>(
  {
    recipientId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    senderId: { type: Schema.Types.ObjectId, ref: 'User' },
    title: { type: String, required: true },
    message: { type: String, required: true },
    type: {
      type: String,
      enum: [
        'TASK_ASSIGNED',
        'STAGE_SUBMITTED',
        'STAGE_APPROVED',
        'STAGE_REVISION',
        'CHAT_MESSAGE',
        'PROJECT_UPDATE',
        'FINANCIAL_UPDATE',
        'DAILY_REPORT_REMINDER',
        'OVERDUE_TASK',
        'LIVE_MEETING_INVITE',
        'GENERAL_ANNOUNCEMENT'
      ],
      required: true
    },
    relatedEntityId: { type: String },
    relatedUrl: { type: String },
    readStatus: { type: Boolean, default: false, index: true },
    priority: {
      type: String,
      enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'],
      default: 'MEDIUM'
    }
  },
  { timestamps: true }
);

NotificationSchema.index({ recipientId: 1, createdAt: -1 });

export const Notification = model<INotificationDocument>('Notification', NotificationSchema);

