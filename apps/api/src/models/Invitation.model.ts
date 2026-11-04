import { Schema, model, Document } from 'mongoose';
import { IInvitation } from '@lord/shared-types';

export interface IInvitationDocument extends Omit<IInvitation, '_id'>, Document {}

const InvitationSchema = new Schema<IInvitationDocument>({
  email: { type: String, required: true, lowercase: true, trim: true, index: true },
  role: { 
    type: String, 
    enum: ['SUPER_ADMIN', 'EMPLOYEE', 'TREASURY'], 
    default: 'EMPLOYEE',
    required: true 
  },
  token: { type: String, required: true, unique: true, index: true },
  status: { 
    type: String, 
    enum: ['PENDING', 'ACCEPTED'], 
    default: 'PENDING' 
  },
  invitedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  expiresAt: { type: Date, required: true }
}, { timestamps: true });

export const Invitation = model<IInvitationDocument>('Invitation', InvitationSchema);

