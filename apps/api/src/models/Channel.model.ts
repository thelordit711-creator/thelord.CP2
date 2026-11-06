import { Schema, model, Document } from 'mongoose';
import { IChannel } from '@lord/shared-types';

export interface IChannelDocument extends Omit<IChannel, '_id'>, Document {}

const ChannelSchema = new Schema<IChannelDocument>(
  {
    channelId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true
    },
    name: {
      type: String,
      required: true,
      trim: true
    },
    description: {
      type: String,
      trim: true
    },
    isOfficial: {
      type: Boolean,
      default: false
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    members: [
      {
        type: Schema.Types.ObjectId,
        ref: 'User'
      }
    ],
    isPublic: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true
  }
);

export const Channel = model<IChannelDocument>('Channel', ChannelSchema);

