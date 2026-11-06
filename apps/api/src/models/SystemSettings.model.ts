import { Schema, model, Document } from 'mongoose';

export interface ISystemSettings {
  workHoursStart: string;
  workHoursEnd: string;
  dailyReportDeadline: string;
  dailyReportReminderTime: string;
  allowSelfBountyClaim: boolean;
  autoLockOverdueTasks: boolean;
  notificationSoundEnabled: boolean;
  updatedBy?: any;
}

export interface ISystemSettingsDocument extends ISystemSettings, Document {}

const SystemSettingsSchema = new Schema<ISystemSettingsDocument>(
  {
    workHoursStart: { type: String, default: '09:00' },
    workHoursEnd: { type: String, default: '18:00' },
    dailyReportDeadline: { type: String, default: '23:59' },
    dailyReportReminderTime: { type: String, default: '21:00' },
    allowSelfBountyClaim: { type: Boolean, default: true },
    autoLockOverdueTasks: { type: Boolean, default: false },
    notificationSoundEnabled: { type: Boolean, default: true },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User' }
  },
  { timestamps: true }
);

export const SystemSettings = model<ISystemSettingsDocument>('SystemSettings', SystemSettingsSchema);

