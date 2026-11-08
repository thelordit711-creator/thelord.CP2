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
    enum: ['SALARY', 'BONUS', 'ADVANCE', 'ALLOWANCE', 'TG_ADS', 'TG_CHANNEL_PROMO', 'SOFTWARE_SUBSCRIPTION', 'GENERAL'],
    required: true,
    index: true
  },
  targetVaultSegment: {
    type: String,
    enum: ['salaries', 'marketing', 'operationalReserve']
  },
  payrollTranche: {
    type: String,
    enum: ['TRANCHE_1', 'TRANCHE_2', 'TRANCHE_3', 'FULL_MONTH', 'MONTHLY_ALLOWANCE', 'NONE'],
    default: 'NONE'
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
  },

  modificationRequest: {
    status: {
      type: String,
      enum: ['NONE', 'PENDING', 'APPROVED', 'REJECTED'],
      default: 'NONE',
      index: true
    },
    requestedAction: {
      type: String,
      enum: ['CANCEL', 'EDIT_DETAILS']
    },
    requestedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    reason: { type: String },
    proposedNote: { type: String },
    adminDecisionNote: { type: String },
    decidedAt: { type: Date }
  },

  // Employee Receipt Confirmation (Admin can configure if mandatory or optional)
  requireConfirmation: { type: Boolean, default: false },
  sendProofToEmployee: { type: Boolean, default: true },
  employeeConfirmation: {
    isConfirmed: { type: Boolean, default: false },
    confirmedAt: { type: Date },
    confirmationNote: { type: String }
  },

  // Task budget expense breakdown and settlement (Optional, filled by employee)
  taskExpenseSettlement: {
    isSettled: { type: Boolean, default: false },
    settledAmount: { type: Number },
    expenseDetails: { type: String },
    invoicesOrProofs: [MediaAttachmentSchema],
    settledAt: { type: Date }
  }
}, { timestamps: true });

export const PayoutOrder = model<IPayoutOrderDocument>('PayoutOrder', PayoutOrderSchema);

