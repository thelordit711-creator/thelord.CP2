import { Schema, model, Document } from 'mongoose';
import { IProject } from '@lord/shared-types';
import { decimal128Field } from '../utils/financialMath';

export interface IProjectDocument extends Omit<IProject, '_id'>, Document {}

const ProjectSchema = new Schema<IProjectDocument>(
  {
    title: {
      type: String,
      required: true,
      trim: true
    },
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true
    },
    description: {
      type: String,
      required: true
    },
    objectives: [
      {
        type: String,
        trim: true
      }
    ],
    requirements: [
      {
        type: String,
        trim: true
      }
    ],
    toolsAndResources: [
      {
        type: String,
        trim: true
      }
    ],
    allocatedBudget: decimal128Field({ default: 0 }),
    spentBudget: decimal128Field({ default: 0 }),
    startDate: {
      type: Date,
      default: Date.now
    },
    targetEndDate: {
      type: Date,
      required: true
    },
    status: {
      type: String,
      enum: ['PLANNING', 'ACTIVE', 'ON_HOLD', 'COMPLETED', 'CANCELLED'],
      default: 'PLANNING',
      index: true
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    teamMembers: [
      {
        type: Schema.Types.ObjectId,
        ref: 'User',
        index: true
      }
    ],
    chatChannelId: {
      type: String,
      trim: true
    },
    wbsMilestones: [
      {
        title: { type: String, required: true },
        description: { type: String },
        dueDate: { type: Date },
        isCompleted: { type: Boolean, default: false },
        suggestedAssigneeId: { type: Schema.Types.ObjectId, ref: 'User' },
        assignedTasks: [{ type: Schema.Types.ObjectId, ref: 'Task' }]
      }
    ]
  },
  {
    timestamps: true,
    toJSON: { getters: true },
    toObject: { getters: true }
  }
);

export const Project = model<IProjectDocument>('Project', ProjectSchema);

