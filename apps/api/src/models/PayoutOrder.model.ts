import { Schema, model, Document } from 'mongoose';
import { IPayoutOrder } from '@lord/shared-types';
import { MediaAttachmentSchema } from './User.model';

export interface IPayoutOrderDocument extends Omit<IPayoutOrder, '_id'>, Document {}

const PayoutOrderSchema = new Schema<IPayoutOrderDocument>({
  relatedTaskId: { type: Schema.Types.ObjectId, ref: 'Task' },
  beneficiaryId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  amount: { type: Number, required: true },
  currency: { type: String, enum: ['USDT', 'USD', 'SAR', 'YER'], default: 'USDT' },

  payoutMethod: { 
    type: String, 
    enum: ['BEP20_USDT', 'JEEB_WALLET', 'JAWALI_WALLET'], 
    required: true,
    index: true 
  },
  destinationDetails: {
    bep20Address: { type: String },
    walletPhoneNumber: { type: String },
    accountHolderName: { type: String }
  },

  category: {
    type: String,
    enum: ['SALARY', 'BONUS', 'ADVANCE', 'TG_ADS', 'TG_CHANNEL_PROMO', 'SOFTWARE_SUBSCRIPTION', 'GENERAL'],
    required: true,
    index: true
  },
  summaryForTreasury: { type: String, required: true },

  executionStatus: {
    type: String,
    enum: ['WAITING_TREASURY', 'IN_PROGRESS', 'DISBURSED'],
    default: 'WAITING_TREASURY',
    index: true
  },
  inProgressClickedAt: { type: Date },
  disbursedClickedAt: { type: Date },

  transferProof: {
    txHashOrReferenceNumber: { type: String },
    receiptScreenshot: MediaAttachmentSchema,
    executedByTreasuryId: { type: Schema.Types.ObjectId, ref: 'User' }
  }
}, { timestamps: true });

export const PayoutOrder = model<IPayoutOrderDocument>('PayoutOrder', PayoutOrderSchema);

