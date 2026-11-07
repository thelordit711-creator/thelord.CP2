import { Schema, model, Document } from 'mongoose';
import { IPayrollSchedule } from '@lord/shared-types';

export interface IPayrollScheduleDocument extends Omit<IPayrollSchedule, '_id'>, Document {}

const EmployeeAllowanceSchema = new Schema(
  {
    title: { type: String, required: true },
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, enum: ['USDT', 'USD', 'SAR', 'YER'], default: 'USDT' },
    category: {
      type: String,
      enum: ['INTERNET', 'COMMUNICATION', 'SOFTWARE_TOOLS', 'HOUSING', 'TRANSPORT', 'OTHER'],
      default: 'INTERNET'
    },
    disbursementDayOfMonth: { type: Number, default: 1, min: 1, max: 31 },
    isActive: { type: Boolean, default: true },
    notes: { type: String }
  },
  { _id: true }
);

const PayrollScheduleSchema = new Schema<IPayrollScheduleDocument>(
  {
    employeeId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
    baseMonthlySalary: { type: Number, required: true, min: 0, default: 0 },
    cycleType: {
      type: String,
      enum: ['EVERY_10_DAYS', 'MONTHLY_FULL'],
      default: 'EVERY_10_DAYS'
    },
    tranche1Day: { type: Number, default: 10, min: 1, max: 28 },
    tranche2Day: { type: Number, default: 20, min: 2, max: 28 },
    tranche3Day: { type: Number, default: 30, min: 3, max: 31 },
    allowances: [EmployeeAllowanceSchema],
    autoGeneratePayoutOrders: { type: Boolean, default: true },
    requireEmployeeReceiptConfirmation: { type: Boolean, default: false },
    sendProofAttachmentToEmployee: { type: Boolean, default: true }
  },
  { timestamps: true }
);

export const PayrollSchedule = model<IPayrollScheduleDocument>('PayrollSchedule', PayrollScheduleSchema);

