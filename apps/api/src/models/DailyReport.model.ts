import { Schema, model, Document } from 'mongoose';
import { IDailyReport } from '@lord/shared-types';

export interface IDailyReportDocument extends Omit<IDailyReport, '_id'>, Document {}

const DailyReportSchema = new Schema<IDailyReportDocument>(
  {
    employeeId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    reportDate: {
      type: String,
      required: true,
      index: true
    },
    summary: {
      type: String,
      required: true
    },
    completedTasks: [
      {
        type: String,
        trim: true
      }
    ],
    ongoingTasks: [
      {
        type: String,
        trim: true
      }
    ],
    blockersAndChallenges: {
      type: String,
      default: ''
    },
    workHoursLogged: {
      type: Number,
      default: 0
    },
    aiAuditAnalysis: {
      type: String,
      default: ''
    },
    status: {
      type: String,
      enum: ['SUBMITTED', 'REVIEWED_BY_AI', 'ACKNOWLEDGED_BY_ADMIN'],
      default: 'SUBMITTED'
    }
  },
  {
    timestamps: true
  }
);

DailyReportSchema.index({ employeeId: 1, reportDate: 1 }, { unique: true });

export const DailyReport = model<IDailyReportDocument>('DailyReport', DailyReportSchema);

