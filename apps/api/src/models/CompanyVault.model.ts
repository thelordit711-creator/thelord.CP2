import { Schema, model, Document } from 'mongoose';
import { ICompanyVault } from '@lord/shared-types';

export interface ICompanyVaultDocument extends Omit<ICompanyVault, '_id'>, Document {}

const ManualAdjustmentLogSchema = new Schema({
  adjustedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  targetBalance: { 
    type: String, 
    enum: ['GENERAL_BUDGET', 'TREASURY_BALANCE'], 
    required: true 
  },
  operation: { 
    type: String, 
    enum: ['INCREASE', 'DECREASE', 'SET'], 
    required: true 
  },
  amount: { type: Number, required: true },
  reason: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

const CompanyVaultSchema = new Schema<ICompanyVaultDocument>({
  generalBudget: { type: Number, default: 0, required: true },
  treasuryBalance: { type: Number, default: 0, required: true },

  totalSpentByCategory: {
    salaries: { type: Number, default: 0 },
    bonuses: { type: Number, default: 0 },
    advances: { type: Number, default: 0 },
    telegramOfficialAds: { type: Number, default: 0 },
    telegramChannelPromos: { type: Number, default: 0 },
    softwareSubscriptions: { type: Number, default: 0 },
    otherExpenses: { type: Number, default: 0 }
  },
  totalDeductionsApplied: { type: Number, default: 0 },

  manualAdjustmentsLog: [ManualAdjustmentLogSchema]
}, { timestamps: true });

export const CompanyVault = model<ICompanyVaultDocument>('CompanyVault', CompanyVaultSchema);

