import { Schema, model, Document } from 'mongoose';
import { ICompanyVault } from '@lord/shared-types';

export interface ICompanyVaultDocument extends Omit<ICompanyVault, '_id'>, Document {}

const ManualAdjustmentLogSchema = new Schema({
  adjustedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  targetBalance: { 
    type: String, 
    enum: ['GENERAL_BUDGET', 'TREASURY_BALANCE', 'TRANSFER_BETWEEN_BUDGETS'], 
    default: 'GENERAL_BUDGET' 
  },
  operation: { 
    type: String, 
    enum: ['INCREASE', 'DECREASE', 'SET', 'FUND_TREASURY', 'RETURN_TO_BUDGET', 'DEPOSIT'], 
    default: 'INCREASE' 
  },
  amount: { type: Number, required: true },
  reason: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

const VaultSegmentSchema = new Schema({
  name: { type: String, required: true },
  balance: { type: Number, default: 0 },
  monthlyAllocated: { type: Number, default: 0 },
  totalSpent: { type: Number, default: 0 },
  alertThresholdPercent: { type: Number, default: 20 }
}, { _id: false });

const CompanyVaultSchema = new Schema<ICompanyVaultDocument>({
  generalBudget: { type: Number, default: 0, required: true },
  treasuryBalance: { type: Number, default: 0, required: true },

  segmentedVaults: {
    salaries: {
      type: VaultSegmentSchema,
      default: () => ({
        name: 'صندوق الرواتب والأجور',
        balance: 15000,
        monthlyAllocated: 20000,
        totalSpent: 5000,
        alertThresholdPercent: 20
      })
    },
    marketing: {
      type: VaultSegmentSchema,
      default: () => ({
        name: 'صندوق التسويق والإعلانات',
        balance: 8000,
        monthlyAllocated: 10000,
        totalSpent: 2000,
        alertThresholdPercent: 25
      })
    },
    operationalReserve: {
      type: VaultSegmentSchema,
      default: () => ({
        name: 'صندوق الاحتياطي التقني والتشغيلي',
        balance: 12000,
        monthlyAllocated: 15000,
        totalSpent: 3000,
        alertThresholdPercent: 15
      })
    }
  },

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

