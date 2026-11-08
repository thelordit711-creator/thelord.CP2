import { Schema, model, Document } from 'mongoose';
import { IUser, WorkStatus } from '@lord/shared-types';

export interface IUserDocument extends Omit<IUser, '_id'>, Document {
  passwordHash?: string;
  workStatus?: WorkStatus;
  workStatusUpdatedAt?: Date;
  isSuspended?: boolean;
  suspendedAt?: Date;
  suspensionReason?: string;
  twoFactorSecret?: string;
  twoFactorTempSecret?: string;
  twoFactorRecoveryCodes?: string[];
}

export const MediaAttachmentSchema = new Schema({
  fileType: { 
    type: String, 
    enum: ['IMAGE', 'VOICE_NOTE', 'AUDIO_FILE', 'AUDIO', 'VIDEO', 'DOCUMENT', 'ARCHIVE', 'URL', 'ANY_FILE'], 
    default: 'ANY_FILE' 
  },
  fileName: { type: String, default: 'attachment' },
  fileUrl: { type: String, required: true },
  mimeType: { type: String },
  fileSizeInBytes: { type: Number },
  durationInSeconds: { type: Number },
  videoTimestampNotes: [{
    second: { type: Number, required: true },
    note: { type: String, required: true }
  }],
  uploadedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  uploadedAt: { type: Date, default: Date.now }
});

const UserSchema = new Schema<IUserDocument>({
  kindeId: { type: String, sparse: true, index: true },
  passwordHash: { type: String },
  fullName: { type: String, required: true },
  email: { type: String, required: true, unique: true, index: true },
  phoneNumber: { type: String, default: '' },
  avatarUrl: { type: String },

  accessRole: { 
    type: String, 
    enum: ['SUPER_ADMIN', 'EMPLOYEE', 'TREASURY'], 
    default: 'EMPLOYEE', 
    index: true 
  },
  isOnboarded: { type: Boolean, default: false },

  workStatus: {
    type: String,
    enum: ['LOGGED_IN', 'WORKING', 'ON_BREAK', 'LOGGED_OUT'],
    default: 'LOGGED_OUT',
    index: true
  },
  workStatusUpdatedAt: { type: Date, default: Date.now },

  primaryDepartment: {
    type: String,
    enum: ['TRADING', 'MARKETING', 'CONTENT_MEDIA', 'DEVELOPMENT', 'SUPPORT', 'MANAGEMENT', 'EXECUTIVE_MANAGEMENT']
  },
  jobTitles: [{
    type: String
  }],
  skills: [{
    name: { type: String, required: true },
    level: { 
      type: String, 
      enum: ['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT'], 
      default: 'ADVANCED' 
    }
  }],
  toolsUsed: [{ type: String }],
  capableTaskTypes: [{ type: String }],

  // Payout configuration: BEP20 USDT + Local Wallets (Jeeb + Jawali via registered phone)
  payoutMethods: {
    preferredMethod: { 
      type: String, 
      enum: ['BEP20_USDT', 'JEEB_WALLET', 'JAWALI_WALLET'], 
      default: 'BEP20_USDT' 
    },
    bep20Address: { type: String },
    jeebWallet: {
      isEnabled: { type: Boolean, default: false },
      registeredPhone: { type: String },
      accountHolderName: { type: String }
    },
    jawaliWallet: {
      isEnabled: { type: Boolean, default: false },
      registeredPhone: { type: String },
      accountHolderName: { type: String }
    }
  },

  compensation: {
    baseSalary: { type: Number, default: 0 },
    salaryCurrency: { type: String, enum: ['USDT', 'USD', 'SAR', 'YER'], default: 'USDT' },
    payoutDayOfMonth: { type: Number, min: 1, max: 31, default: 1 },
    activeBonuses: { type: Number, default: 0 },
    activeDeductions: { type: Number, default: 0 },
    activeAdvances: { type: Number, default: 0 },
    warningsCount: { type: Number, default: 0 }
  },

  presenceStatus: { 
    type: String, 
    enum: ['ONLINE', 'OFFLINE', 'IN_MEETING'], 
    default: 'OFFLINE',
    index: true
  },
  isSuspended: { type: Boolean, default: false, index: true },
  suspendedAt: { type: Date },
  suspensionReason: { type: String, default: '' },
  isTwoFactorEnabled: { type: Boolean, default: false },
  twoFactorSecret: { type: String },
  twoFactorTempSecret: { type: String },
  twoFactorRecoveryCodes: [{ type: String }],
  lastActiveAt: { type: Date, default: Date.now }
}, { timestamps: true });

export const User = model<IUserDocument>('User', UserSchema);

