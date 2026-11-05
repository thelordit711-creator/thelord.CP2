import { Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/verifyKindeJWT';
import { Task } from '../models/Task.model';
import { User } from '../models/User.model';
import { SocketService } from '../services/socket.service';
import { ICreateTaskDto, ISubmitStageDto, IReviewStageDto } from '@lord/shared-types';

export class TasksController {
  // 1. Create or Propose Task
  public static async createOrProposeTask(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const body = req.body as ICreateTaskDto;
      const isAdmin = req.user?.accessRole === 'SUPER_ADMIN';

      const isProposed = !isAdmin || body.isProposedByEmployee;

      // Format stages if provided
      const stages = (body.stages || []).map((st: any, idx: number) => ({
        stageOrder: st.stageOrder || idx + 1,
        stageTitle: st.stageTitle,
        instructions: st.instructions,
        status: idx === 0 ? 'IN_PROGRESS' : 'LOCKED',
        requiredInputs: st.requiredInputs || [],
        additionalAttachments: []
      }));

      // If employee proposal, assign to self or colleague
      let assignedTo = isProposed 
        ? (body.executionType === 'SELF' ? [req.user?._id] : (body.assignedTo || []))
        : (body.assignedTo && body.assignedTo.length > 0 ? body.assignedTo : []);

      // If department is specified, auto-include department members
      if (body.targetDepartment && body.targetDepartment !== 'ALL_DEPARTMENTS') {
        const deptUsers = await User.find({ primaryDepartment: body.targetDepartment }).select('_id');
        const deptUserIds = deptUsers.map(u => u._id.toString());
        assignedTo = Array.from(new Set([...(assignedTo || []).map(String), ...deptUserIds]));
      } else if (body.targetDepartment === 'ALL_DEPARTMENTS') {
        const allEmployees = await User.find({ accessRole: 'EMPLOYEE' }).select('_id');
        const allIds = allEmployees.map(u => u._id.toString());
        assignedTo = Array.from(new Set([...(assignedTo || []).map(String), ...allIds]));
      }

      if (!assignedTo || assignedTo.length === 0) {
        assignedTo = [req.user?._id];
      }

      const task = await Task.create({
        title: body.title,
        description: body.description,
        targetPlatform: body.targetPlatform,
        serviceCategory: body.serviceCategory,
        targetDepartment: body.targetDepartment,
        isDailyRecurring: body.isDailyRecurring || false,
        dailyRecurrenceTime: body.dailyRecurrenceTime,
        createdBy: req.user?._id,
        isProposedByEmployee: isProposed,
        executionType: body.executionType || 'ADMIN_ASSIGNED',
        assignedTo: assignedTo,
        priority: body.priority || 'MEDIUM',
        dueDate: body.dueDate ? new Date(body.dueDate) : undefined,
        stages,
        currentStageIndex: 0,
        overallProgressPercent: 0,
        financialRequirement: {
          requiresBudget: body.financialRequirement?.requiresBudget || false,
          amount: body.financialRequirement?.amount || 0,
          currency: body.financialRequirement?.currency || 'USDT',
          payoutMethodRequested: body.financialRequirement?.payoutMethodRequested || 'BEP20_USDT',
          expenseCategory: body.financialRequirement?.expenseCategory,
          justification: body.financialRequirement?.justification,
          adminApprovalStatus: body.financialRequirement?.requiresBudget ? 'PENDING_ADMIN' : 'NOT_REQUIRED'
        },
        adminBriefAttachments: body.adminBriefAttachments || [],
        status: isProposed ? 'PENDING_ADMIN_REVIEW' : 'TODO'
      });

      if (isProposed) {
        SocketService.emitToAdmins('task:proposed', {
          taskId: task._id,
          title: task.title,
          proposer: req.user?.fullName
        });
      } else {
        // Notify assigned employees
        (task.assignedTo as any[]).forEach(empId => {
          SocketService.emitToUser(empId.toString(), 'task:assigned', {
            taskId: task._id,
            title: task.title
          });
        });
      }

      res.status(201).json({
        success: true,
        message: isProposed ? 'Task proposed for admin review' : 'Task created successfully',
        data: task
      });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  }

  // 2. Get Tasks list (role-scoped)
  public static async getTasks(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const isAdmin = req.user?.accessRole === 'SUPER_ADMIN';
      const filter: Record<string, unknown> = {};

      if (!isAdmin) {
        // Employee sees tasks assigned to them or created by them
        filter.$or = [
          { assignedTo: req.user?._id },
          { createdBy: req.user?._id }
        ];
      }

      const tasks = await Task.find(filter)
        .populate('assignedTo', 'fullName email avatarUrl jobTitles')
        .populate('createdBy', 'fullName email avatarUrl')
        .sort({ createdAt: -1 });

      res.json({ success: true, data: tasks });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  }

  // 3. Get single task by ID
  public static async getTaskById(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const task = await Task.findById(id)
        .populate('assignedTo', 'fullName email avatarUrl jobTitles skills')
        .populate('createdBy', 'fullName email avatarUrl')
        .populate('directReports.submittedBy', 'fullName avatarUrl');

      if (!task) {
        res.status(404).json({ success: false, error: 'Task not found' });
        return;
      }

      res.json({ success: true, data: task });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  }

  // 4. Employee submits a stage
  public static async submitStage(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id, order } = req.params;
      const stageOrder = parseInt(order, 10);
      const body = req.body as ISubmitStageDto;

      const task = await Task.findById(id);
      if (!task) {
        res.status(404).json({ success: false, error: 'Task not found' });
        return;
      }

      const stageIndex = task.stages.findIndex((s: any) => s.stageOrder === stageOrder);
      if (stageIndex === -1) {
        res.status(404).json({ success: false, error: 'Stage not found' });
        return;
      }

      const stage = task.stages[stageIndex];

      // Update required inputs submission
      if (body.requiredInputs) {
        body.requiredInputs.forEach((sub: any) => {
          const reqField = stage.requiredInputs.find((rf: any) => rf.fieldLabel === sub.fieldLabel);
          if (reqField) {
            reqField.employeeSubmission = {
              textOrUrlValue: sub.textOrUrlValue,
              numberValue: sub.numberValue,
              mediaAttachment: sub.mediaAttachment as any,
              submittedAt: new Date()
            };
          }
        });
      }

      if (body.additionalAttachments) {
        stage.additionalAttachments.push(...(body.additionalAttachments as any[]));
      }
      if (body.employeeVoiceNote) {
        stage.employeeVoiceNote = body.employeeVoiceNote as any;
      }

      stage.status = 'SUBMITTED_FOR_REVIEW';
      task.status = 'IN_PROGRESS';
      await task.save();

      SocketService.emitToAdmins('stage:submitted', {
        taskId: task._id,
        stageOrder,
        stageTitle: stage.stageTitle,
        employeeName: req.user?.fullName
      });

      res.json({
        success: true,
        message: 'Stage submitted for admin review',
        data: task
      });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  }

  // 5. Admin reviews a stage
  public static async reviewStage(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id, order } = req.params;
      const stageOrder = parseInt(order, 10);
      const body = req.body as IReviewStageDto;

      const task = await Task.findById(id);
      if (!task) {
        res.status(404).json({ success: false, error: 'Task not found' });
        return;
      }

      const stageIndex = task.stages.findIndex((s: any) => s.stageOrder === stageOrder);
      if (stageIndex === -1) {
        res.status(404).json({ success: false, error: 'Stage not found' });
        return;
      }

      const currentStage = task.stages[stageIndex];
      currentStage.adminFeedback = {
        note: body.note,
        voiceFeedback: body.voiceFeedback as any,
        reviewedAt: new Date()
      };

      if (body.action === 'APPROVE') {
        currentStage.status = 'APPROVED';

        // Unlock next stage if exists
        if (stageIndex + 1 < task.stages.length) {
          task.stages[stageIndex + 1].status = 'IN_PROGRESS';
          task.currentStageIndex = stageIndex + 1;
        } else {
          // All stages complete
          task.status = 'COMPLETED';
          task.overallProgressPercent = 100;
        }

        // Recalculate overall progress
        const approvedCount = task.stages.filter((s: any) => s.status === 'APPROVED').length;
        task.overallProgressPercent = Math.round((approvedCount / task.stages.length) * 100);

        await task.save();

        task.assignedTo.forEach((empId: any) => {
          SocketService.emitToUser(empId.toString(), 'stage:approved', {
            taskId: task._id,
            stageOrder,
            nextStageUnlocked: stageIndex + 1 < task.stages.length
          });
        });

        res.json({ success: true, message: 'Stage approved', data: task });
      } else {
        currentStage.status = 'NEEDS_REVISION';
        await task.save();

        task.assignedTo.forEach((empId: any) => {
          SocketService.emitToUser(empId.toString(), 'stage:revision_requested', {
            taskId: task._id,
            stageOrder,
            feedback: body.note
          });
        });

        res.json({ success: true, message: 'Revision requested', data: task });
      }
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  }

  // 6. Direct report to admin
  public static async addDirectReport(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { textContent, attachments } = req.body;

      const task = await Task.findById(id);
      if (!task) {
        res.status(404).json({ success: false, error: 'Task not found' });
        return;
      }

      const report = {
        submittedBy: req.user?._id,
        textContent,
        attachments: attachments || [],
        createdAt: new Date()
      };

      task.directReports.push(report as any);
      await task.save();

      SocketService.emitToAdmins('report:direct', {
        taskId: task._id,
        submittedBy: req.user?.fullName,
        textContent
      });

      res.json({ success: true, message: 'Report submitted directly to admin', data: report });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  }
}

