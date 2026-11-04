import { Schema, model, Document } from 'mongoose';
import { IEmployeeLedger } from '@lord/shared-types';

export interface IEmployeeLedgerDocument extends Omit<IEmployeeLedger, '_id'>, Document {}

const EmployeeLedgerSchema = new Schema<IEmployeeLedgerDocument>({
  employeeId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  entryType: { 
    type: String, 
    enum: ['BASE_SALARY', 'BONUS', 'DEDUCTION', 'ADVANCE_REQUEST', 'WARNING'], 
    required: true,
    index: true 
  },
  amount: { type: Number, default: 0 },
  payoutMethodUsed: { 
    type: String, 
    enum: ['BEP20_USDT', 'JEEB_WALLET', 'JAWALI_WALLET', 'NONE'], 
    default: 'NONE' 
  },
  reason: { type: String, required: true },
  warningLevel: { 
    type: String, 
    enum: ['NONE', 'FIRST', 'SECOND', 'FINAL'], 
    default: 'NONE' 
  },
  relatedPayoutOrderId: { type: Schema.Types.ObjectId, ref: 'PayoutOrder' },
  recordedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });

export const EmployeeLedger = model<IEmployeeLedgerDocument>('EmployeeLedger', EmployeeLedgerSchema);

