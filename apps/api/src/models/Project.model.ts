import { Schema, model, Document } from 'mongoose';
import { IProject } from '@lord/shared-types';

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
    allocatedBudget: {
      type: Number,
      default: 0,
      min: 0
    },
    spentBudget: {
      type: Number,
      default: 0,
      min: 0
    },
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
      default: 'PLANNING'
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    teamMembers: [
      {
        type: Schema.Types.ObjectId,
        ref: 'User'
      }
    ],
    wbsMilestones: [
      {
        title: { type: String, required: true },
        description: { type: String },
        dueDate: { type: Date },
        isCompleted: { type: Boolean, default: false },
        assignedTasks: [{ type: Schema.Types.ObjectId, ref: 'Task' }]
      }
    ]
  },
  {
    timestamps: true
  }
);

export const Project = model<IProjectDocument>('Project', ProjectSchema);

