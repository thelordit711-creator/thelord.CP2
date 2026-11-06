import { Schema, model, Document } from 'mongoose';
import { IAttendanceSession } from '@lord/shared-types';

export interface IAttendanceSessionDocument extends Omit<IAttendanceSession, '_id'>, Document {}

const AttendanceSessionSchema = new Schema<IAttendanceSessionDocument>(
  {
    employeeId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    checkInTime: {
      type: Date,
      default: Date.now,
      required: true
    },
    checkOutTime: {
      type: Date
    },
    totalDurationMinutes: {
      type: Number,
      default: 0
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'CLOSED'],
      default: 'ACTIVE'
    },
    dateStr: {
      type: String,
      required: true,
      index: true
    }
  },
  {
    timestamps: true
  }
);

AttendanceSessionSchema.index({ employeeId: 1, dateStr: 1 });

export const AttendanceSession = model<IAttendanceSessionDocument>('AttendanceSession', AttendanceSessionSchema);

