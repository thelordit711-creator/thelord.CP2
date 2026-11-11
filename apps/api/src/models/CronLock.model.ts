import mongoose, { Schema, Document } from 'mongoose';

export interface ICronLock extends Document {
  lockKey: string;
  lockedBy: string;
  expiresAt: Date;
  createdAt: Date;
}

const CronLockSchema = new Schema<ICronLock>(
  {
    lockKey: { type: String, required: true, unique: true, index: true },
    lockedBy: { type: String, required: true },
    expiresAt: { type: Date, required: true, index: { expires: 0 } }
  },
  { timestamps: true }
);

export const CronLock =
  mongoose.models.CronLock || mongoose.model<ICronLock>('CronLock', CronLockSchema);

