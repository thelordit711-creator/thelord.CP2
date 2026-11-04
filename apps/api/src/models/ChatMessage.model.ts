import { Schema, model, Document } from 'mongoose';
import { IChatMessage } from '@lord/shared-types';
import { MediaAttachmentSchema } from './User.model';

export interface IChatMessageDocument extends Omit<IChatMessage, '_id'>, Document {}

const ChatMessageSchema = new Schema<IChatMessageDocument>({
  chatRoomId: { type: String, required: true, index: true },
  senderId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  content: { type: String },
  attachments: [MediaAttachmentSchema],
  readBy: [{ type: Schema.Types.ObjectId, ref: 'User' }]
}, { timestamps: true });

export const ChatMessage = model<IChatMessageDocument>('ChatMessage', ChatMessageSchema);

