import { Schema, model, Document } from 'mongoose';
import { ICompanyVault } from '@lord/shared-types';
import { decimal128Field } from '../utils/financialMath';

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
  amount: decimal128Field({ required: true }),
  reason: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
}, { toJSON: { getters: true }, toObject: { getters: true } });

const VaultSegmentSchema = new Schema({
  name: { type: String, required: true },
  balance: decimal128Field({ default: 0 }),
  monthlyAllocated: decimal128Field({ default: 0 }),
  totalSpent: decimal128Field({ default: 0 }),
  alertThresholdPercent: { type: Number, default: 20 }
}, { _id: false, toJSON: { getters: true }, toObject: { getters: true } });

const CustomSubVaultSchema = new Schema({
  name: { type: String, required: true },
  code: { type: String, required: true },
  parentVault: { type: String, default: 'TREASURY_MASTER' },
  balance: decimal128Field({ default: 0 }),
  monthlyAllocated: decimal128Field({ default: 0 }),
  totalSpent: decimal128Field({ default: 0 }),
  alertThresholdPercent: { type: Number, default: 20 },
  createdAt: { type: Date, default: Date.now }
}, { toJSON: { getters: true }, toObject: { getters: true } });

const CompanyVaultSchema = new Schema<ICompanyVaultDocument>({
  generalBudget: decimal128Field({ default: 0, required: true }),
  treasuryBalance: decimal128Field({ default: 0, required: true }),

  segmentedVaults: {
    salaries: {
      type: VaultSegmentSchema,
      default: () => ({
        name: 'صندوق الرواتب والأجور',
        balance: 0,
        monthlyAllocated: 0,
        totalSpent: 0,
        alertThresholdPercent: 20
      })
    },
    marketing: {
      type: VaultSegmentSchema,
      default: () => ({
        name: 'صندوق التسويق والإعلانات',
        balance: 0,
        monthlyAllocated: 0,
        totalSpent: 0,
        alertThresholdPercent: 25
      })
    },
    operationalReserve: {
      type: VaultSegmentSchema,
      default: () => ({
        name: 'صندوق الاحتياطي التقني والتشغيلي',
        balance: 0,
        monthlyAllocated: 0,
        totalSpent: 0,
        alertThresholdPercent: 15
      })
    }
  },

  customSubVaults: [CustomSubVaultSchema],

  totalSpentByCategory: {
    salaries: decimal128Field({ default: 0 }),
    bonuses: decimal128Field({ default: 0 }),
    advances: decimal128Field({ default: 0 }),
    telegramOfficialAds: decimal128Field({ default: 0 }),
    telegramChannelPromos: decimal128Field({ default: 0 }),
    softwareSubscriptions: decimal128Field({ default: 0 }),
    otherExpenses: decimal128Field({ default: 0 })
  },
  totalDeductionsApplied: decimal128Field({ default: 0 }),

  manualAdjustmentsLog: [ManualAdjustmentLogSchema]
}, { timestamps: true, toJSON: { getters: true }, toObject: { getters: true } });

export const CompanyVault = model<ICompanyVaultDocument>('CompanyVault', CompanyVaultSchema);

