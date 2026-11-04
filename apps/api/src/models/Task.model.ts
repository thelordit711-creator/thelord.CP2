import { Schema, model, Document } from 'mongoose';
import { ITask } from '@lord/shared-types';
import { MediaAttachmentSchema } from './User.model';

export interface ITaskDocument extends Omit<ITask, '_id'>, Document {}

const RequiredFieldSchema = new Schema({
  fieldLabel: { type: String, required: true },
  expectedType: { 
    type: String, 
    enum: ['TEXT', 'NUMBER', 'URL', 'IMAGE', 'VIDEO', 'VOICE_NOTE', 'DOCUMENT', 'CODE_SNIPPET', 'ANY_FILE'], 
    required: true 
  },
  isMandatory: { type: Boolean, default: true },
  employeeSubmission: {
    textOrUrlValue: { type: String },
    numberValue: { type: Number },
    mediaAttachment: MediaAttachmentSchema,
    submittedAt: { type: Date }
  }
});

const TaskStageSchema = new Schema({
  stageOrder: { type: Number, required: true },
  stageTitle: { type: String, required: true },
  instructions: { type: String },
  status: { 
    type: String, 
    enum: ['LOCKED', 'IN_PROGRESS', 'SUBMITTED_FOR_REVIEW', 'APPROVED', 'NEEDS_REVISION'], 
    default: 'LOCKED' 
  },
  requiredInputs: [RequiredFieldSchema],
  additionalAttachments: [MediaAttachmentSchema],
  employeeVoiceNote: MediaAttachmentSchema,
  adminFeedback: {
    note: { type: String },
    voiceFeedback: MediaAttachmentSchema,
    reviewedAt: { type: Date }
  }
});

const TaskSchema = new Schema<ITaskDocument>({
  title: { type: String, required: true, trim: true },
  description: { type: String, required: true },
  targetPlatform: {
    type: String,
    default: 'GENERAL_SYSTEM',
    index: true
  },
  serviceCategory: {
    type: String
  },
  targetDepartment: {
    type: String,
    enum: ['TRADING', 'MARKETING', 'CONTENT_MEDIA', 'DEVELOPMENT', 'SUPPORT', 'MANAGEMENT', 'ALL_DEPARTMENTS']
  },
  isDailyRecurring: {
    type: Boolean,
    default: false,
    index: true
  },
  dailyRecurrenceTime: {
    type: String
  },

  createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  isProposedByEmployee: { type: Boolean, default: false },
  executionType: { 
    type: String, 
    enum: ['ADMIN_ASSIGNED', 'SELF', 'DELEGATED_TO_COLLEAGUE'], 
    default: 'ADMIN_ASSIGNED' 
  },
  assignedTo: [{ type: Schema.Types.ObjectId, ref: 'User', required: true, index: true }],

  priority: { 
    type: String, 
    enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'], 
    default: 'MEDIUM' 
  },
  dueDate: { type: Date },
  adminBriefAttachments: [MediaAttachmentSchema],

  stages: [TaskStageSchema],
  currentStageIndex: { type: Number, default: 0 },
  overallProgressPercent: { type: Number, default: 0 },

  financialRequirement: {
    requiresBudget: { type: Boolean, default: false },
    amount: { type: Number, default: 0 },
    currency: { type: String, enum: ['USDT', 'USD', 'SAR', 'YER'], default: 'USDT' },
    payoutMethodRequested: { 
      type: String, 
      enum: ['BEP20_USDT', 'JEEB_WALLET', 'JAWALI_WALLET'], 
      default: 'BEP20_USDT' 
    },
    expenseCategory: {
      type: String,
      enum: ['TG_ADS', 'TG_CHANNEL_PROMO', 'SOFTWARE_SUBSCRIPTION', 'OPERATIONAL', 'OTHER']
    },
    justification: { type: String },
    adminApprovalStatus: {
      type: String,
      enum: ['NOT_REQUIRED', 'PENDING_ADMIN', 'APPROVED', 'REJECTED', 'NEEDS_CHANGES'],
      default: 'NOT_REQUIRED',
      index: true
    },
    adminNotes: { type: String },
    approvedAt: { type: Date },
    payoutOrderId: { type: Schema.Types.ObjectId, ref: 'PayoutOrder' }
  },

  directReports: [{
    submittedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    textContent: { type: String },
    attachments: [MediaAttachmentSchema],
    createdAt: { type: Date, default: Date.now }
  }],

  status: {
    type: String,
    enum: ['PENDING_ADMIN_REVIEW', 'TODO', 'IN_PROGRESS', 'COMPLETED', 'REJECTED'],
    default: 'TODO',
    index: true
  }
}, { timestamps: true });

export const Task = model<ITaskDocument>('Task', TaskSchema);

