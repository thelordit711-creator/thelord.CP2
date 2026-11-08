import { Schema, model, Document } from 'mongoose';
import { IRecurringExpense } from '@lord/shared-types';

export interface IRecurringExpenseDocument extends Omit<IRecurringExpense, '_id'>, Document {}

const RecurringExpenseSchema = new Schema<IRecurringExpenseDocument>({
  title: { type: String, required: true },
  category: { 
    type: String, 
    enum: ['SALARY', 'INTERNET', 'SERVERS', 'SOFTWARE', 'MARKETING', 'RENT', 'OTHER'], 
    default: 'OTHER',
    index: true 
  },
  amount: { type: Number, required: true },
  currency: { type: String, enum: ['USDT', 'USD', 'SAR', 'YER'], default: 'USDT' },
  targetVault: { type: String, default: 'operationalReserve' },
  beneficiaryName: { type: String, required: true },
  payoutMethod: { 
    type: String, 
    enum: ['BEP20_USDT', 'JEEB_WALLET', 'JAWALI_WALLET'], 
    default: 'BEP20_USDT' 
  },
  destinationAddress: { type: String },
  dueDayOfMonth: { type: Number, min: 1, max: 31, default: 1 },
  isAutoDisburse: { type: Boolean, default: false },
  lastDisbursedAt: { type: Date },
  status: { type: String, enum: ['ACTIVE', 'PAUSED'], default: 'ACTIVE', index: true }
}, { timestamps: true });

export const RecurringExpense = model<IRecurringExpenseDocument>('RecurringExpense', RecurringExpenseSchema);
