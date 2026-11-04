import { Schema, model, Document } from 'mongoose';
import { IMeetingRoom } from '@lord/shared-types';

export interface IMeetingRoomDocument extends Omit<IMeetingRoom, '_id'>, Document {}

const MeetingParticipantSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  fullName: { type: String },
  accessRole: { type: String },
  avatarUrl: { type: String },
  joinedAt: { type: Date, default: Date.now },
  isSpeaking: { type: Boolean, default: false },
  isCameraOn: { type: Boolean, default: true },
  isMuted: { type: Boolean, default: false }
});

const MeetingRoomSchema = new Schema<IMeetingRoomDocument>({
  title: { type: String, required: true, default: 'غرفة البث والاجتماعات المركزية — THE LORD' },
  hostId: { type: Schema.Types.ObjectId, ref: 'User' },
  status: { type: String, enum: ['ACTIVE', 'ENDED'], default: 'ACTIVE' },
  agenda: { type: String, default: 'مناقشة خطة التداول الأسبوعية وإعلانات القنوات ومشاريع البوتات' },
  meetingNotes: { 
    type: String, 
    default: '1. متابعة مستويات السيولة وصرف المستحقات عبر BEP20.\n2. إطلاق استراتيجية صفقات VIP اليومية.\n3. مراجعة إحصائيات التفاعل ونمو القنوات.' 
  },
  participants: [MeetingParticipantSchema]
}, { timestamps: true });

export const MeetingRoom = model<IMeetingRoomDocument>('MeetingRoom', MeetingRoomSchema);

