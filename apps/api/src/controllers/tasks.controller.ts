import { Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/verifyKindeJWT';
import { Task } from '../models/Task.model';
import { User } from '../models/User.model';
import { PayoutOrder } from '../models/PayoutOrder.model';
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
        isBountyTask: Boolean(body.isBountyTask),
        bountyRewardAmount: body.bountyRewardAmount ? Number(body.bountyRewardAmount) : 0,
        bountyClaimType: body.bountyClaimType || 'OPEN_COMPETITIVE',
        bountyPayoutStatus: body.isBountyTask ? 'UNCLAIMED' : undefined,
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

      const populatedTask = await Task.findById(task._id)
        .populate('assignedTo', 'fullName email avatarUrl jobTitles')
        .populate('createdBy', 'fullName email avatarUrl')
        .populate('financialRequirement.payoutOrderId');

      if (isProposed) {
        SocketService.emitToAdmins('task:proposed', {
          taskId: task._id,
          title: task.title,
          proposer: req.user?.fullName
        });
      } else {
        // Real-time broadcast so manager/staff dashboards refresh automatically without reload
        SocketService.broadcast('task:created', populatedTask);

        // Notify assigned employees individually
        (task.assignedTo as any[]).forEach(empId => {
          SocketService.emitToUser(empId.toString(), 'task:assigned', {
            taskId: task._id,
            title: task.title,
            assignedByName: req.user?.fullName || 'القائد الأعلى'
          });
          SocketService.dispatchNotification({
            recipientId: empId.toString(),
            senderId: req.user?._id?.toString(),
            title: '📋 مهمة جديدة أُسندت إليك',
            message: `أُسندت إليك مهمة: "${task.title}" من قِبل ${req.user?.fullName || 'الإدارة'}`,
            type: 'TASK_ASSIGNED',
            relatedEntityId: task._id.toString(),
            relatedUrl: '/workspace',
            priority: task.priority === 'CRITICAL' ? 'URGENT' : task.priority === 'HIGH' ? 'HIGH' : 'MEDIUM'
          });
        });
      }

      res.status(201).json({
        success: true,
        message: isProposed ? 'Task proposed for admin review' : 'Task created successfully',
        data: populatedTask || task
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
        .populate('financialRequirement.payoutOrderId')
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
        .populate('directReports.submittedBy', 'fullName avatarUrl')
        .populate('financialRequirement.payoutOrderId');

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
      if (body.requiredInputs && Array.isArray(body.requiredInputs)) {
        body.requiredInputs.forEach((sub: any) => {
          const reqField = stage.requiredInputs.find((rf: any) => rf.fieldLabel === sub.fieldLabel);
          if (reqField) {
            reqField.employeeSubmission = {
              textOrUrlValue: sub.textOrUrlValue,
              numberValue: sub.numberValue,
              mediaAttachment: sub.mediaAttachment as any,
              submittedAt: new Date()
            };
          } else {
            stage.requiredInputs.push({
              fieldLabel: sub.fieldLabel || 'تقرير ومخرجات التنفيذ',
              expectedType: sub.expectedType || (sub.mediaAttachment ? 'IMAGE' : 'TEXT'),
              isMandatory: true,
              employeeSubmission: {
                textOrUrlValue: sub.textOrUrlValue,
                numberValue: sub.numberValue,
                mediaAttachment: sub.mediaAttachment as any,
                submittedAt: new Date()
              }
            });
          }
        });
      }

      if (body.additionalAttachments && Array.isArray(body.additionalAttachments)) {
        stage.additionalAttachments.push(...(body.additionalAttachments as any[]));
      }
      if (body.employeeVoiceNote) {
        stage.employeeVoiceNote = body.employeeVoiceNote as any;
      }

      stage.status = 'SUBMITTED_FOR_REVIEW';
      task.status = 'IN_PROGRESS';
      await task.save();

      const populatedTask = await Task.findById(task._id)
        .populate('assignedTo', 'fullName email avatarUrl jobTitles')
        .populate('createdBy', 'fullName email avatarUrl')
        .populate('directReports.submittedBy', 'fullName avatarUrl')
        .populate('financialRequirement.payoutOrderId');

      SocketService.emitToAdmins('stage:submitted', {
        taskId: task._id,
        stageOrder,
        stageTitle: stage.stageTitle,
        employeeName: req.user?.fullName,
        task: populatedTask
      });
      SocketService.broadcast('task:updated', populatedTask);

      // Persist notification for all administrators
      const admins = await User.find({ accessRole: 'SUPER_ADMIN' }).select('_id');
      admins.forEach(admin => {
        SocketService.dispatchNotification({
          recipientId: admin._id.toString(),
          senderId: req.user?._id?.toString(),
          title: '⚡ تسليم مرحلة للمراجعة والاعتماد',
          message: `الموظف ${req.user?.fullName || ''} سلّم مخرجات المرحلة ${stageOrder} ("${stage.stageTitle}") في مهمة "${task.title}"`,
          type: 'STAGE_SUBMITTED',
          relatedEntityId: task._id.toString(),
          relatedUrl: '/tasks',
          priority: 'HIGH'
        });
      });

      res.json({
        success: true,
        message: 'Stage submitted for admin review',
        data: populatedTask || task
      });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  }

  // 5. Admin reviews a stage
  public static async reviewStage(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (req.user?.accessRole !== 'SUPER_ADMIN') {
        res.status(403).json({ success: false, error: 'صلاحية اعتماد ومراجعة المراحل ونقلها مخصصة للإدارة فقط' });
        return;
      }

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

        const populatedTask = await Task.findById(task._id)
          .populate('assignedTo', 'fullName email avatarUrl jobTitles')
          .populate('createdBy', 'fullName email avatarUrl')
          .populate('directReports.submittedBy', 'fullName avatarUrl')
          .populate('financialRequirement.payoutOrderId');

        task.assignedTo.forEach((empId: any) => {
          const targetId = (empId?._id ? empId._id : empId).toString();
          SocketService.emitToUser(targetId, 'stage:approved', {
            taskId: task._id,
            stageOrder,
            nextStageUnlocked: stageIndex + 1 < task.stages.length,
            task: populatedTask
          });
          SocketService.dispatchNotification({
            recipientId: targetId,
            senderId: req.user?._id?.toString(),
            title: '✓ تم اعتماد المرحلة بنجاح',
            message: `اعتمد المسؤول المرحلة ${stageOrder} في مهمة "${task.title}" ${stageIndex + 1 < task.stages.length ? 'وتم فتح المرحلة التالية لك!' : 'واكتملت المهمة 100%! 🦁'}`,
            type: 'STAGE_APPROVED',
            relatedEntityId: task._id.toString(),
            relatedUrl: '/tasks',
            priority: 'MEDIUM'
          });
        });
        SocketService.broadcast('task:updated', populatedTask || task);

        res.json({ success: true, message: 'Stage approved', data: populatedTask || task });
      } else {
        currentStage.status = 'NEEDS_REVISION';
        await task.save();

        const populatedTask = await Task.findById(task._id)
          .populate('assignedTo', 'fullName email avatarUrl jobTitles')
          .populate('createdBy', 'fullName email avatarUrl')
          .populate('directReports.submittedBy', 'fullName avatarUrl')
          .populate('financialRequirement.payoutOrderId');

        task.assignedTo.forEach((empId: any) => {
          const targetId = (empId?._id ? empId._id : empId).toString();
          SocketService.emitToUser(targetId, 'stage:revision_requested', {
            taskId: task._id,
            stageOrder,
            feedback: body.note,
            task: populatedTask
          });
          SocketService.dispatchNotification({
            recipientId: targetId,
            senderId: req.user?._id?.toString(),
            title: '⚠️ مطلوب تعديل مرحلة في المهمة',
            message: `طلب المسؤول تعديلاً في مهمة "${task.title}": "${body.note || 'يرجى مراجعة وتعديل مخرجات المرحلة'}"`,
            type: 'STAGE_REVISION',
            relatedEntityId: task._id.toString(),
            relatedUrl: '/tasks',
            priority: 'HIGH'
          });
        });
        SocketService.broadcast('task:updated', populatedTask || task);

        res.json({ success: true, message: 'Revision requested', data: populatedTask || task });
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

  // 7. Update Task (Admin only)
  public static async updateTask(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const isAdmin = req.user?.accessRole === 'SUPER_ADMIN';

      if (!isAdmin) {
        res.status(403).json({ success: false, error: 'صلاحية تعديل المهمة مخصصة للإدارة فقط' });
        return;
      }

      const task = await Task.findById(id);
      if (!task) {
        res.status(404).json({ success: false, error: 'المهمة غير موجودة' });
        return;
      }

      const body = req.body;
      if (body.title !== undefined) task.title = body.title;
      if (body.description !== undefined) task.description = body.description;
      if (body.priority !== undefined) task.priority = body.priority;
      if (body.dueDate !== undefined) task.dueDate = body.dueDate ? new Date(body.dueDate) : undefined;
      if (body.targetPlatform !== undefined) task.targetPlatform = body.targetPlatform;
      if (body.serviceCategory !== undefined) task.serviceCategory = body.serviceCategory;
      if (body.status !== undefined) task.status = body.status;
      if (body.assignedTo !== undefined) task.assignedTo = body.assignedTo;
      if (body.isDailyRecurring !== undefined) task.isDailyRecurring = body.isDailyRecurring;
      if (body.dailyRecurrenceTime !== undefined) task.dailyRecurrenceTime = body.dailyRecurrenceTime;
      if (body.financialRequirement !== undefined) {
        task.financialRequirement = {
          ...task.financialRequirement,
          ...body.financialRequirement
        };
      }
      if (body.stages && Array.isArray(body.stages)) {
        task.stages = body.stages as any;
      }

      await task.save();

      const updatedTask = await Task.findById(task._id)
        .populate('assignedTo', 'fullName email avatarUrl jobTitles')
        .populate('createdBy', 'fullName email avatarUrl')
        .populate('financialRequirement.payoutOrderId');

      // Realtime broadcast of update
      SocketService.broadcast('task:updated', updatedTask);
      (task.assignedTo as any[]).forEach(empId => {
        SocketService.emitToUser(empId.toString(), 'task:assigned', {
          taskId: task._id,
          title: task.title,
          isUpdated: true
        });
      });

      res.json({
        success: true,
        message: 'تم تعديل المهمة بنجاح',
        data: updatedTask
      });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  }

  // 8. Delete Task (Admin only)
  public static async deleteTask(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const isAdmin = req.user?.accessRole === 'SUPER_ADMIN';

      if (!isAdmin) {
        res.status(403).json({ success: false, error: 'صلاحية حذف المهمة مخصصة للإدارة فقط' });
        return;
      }

      const task = await Task.findById(id);
      if (!task) {
        res.status(404).json({ success: false, error: 'المهمة غير موجودة' });
        return;
      }

      const assignedEmpIds = (task.assignedTo || []).map((e: any) => e.toString());
      await Task.findByIdAndDelete(id);

      // Realtime notification of deletion to all dashboards
      SocketService.broadcast('task:deleted', { taskId: id, title: task.title });
      assignedEmpIds.forEach(empId => {
        SocketService.emitToUser(empId, 'task:deleted', { taskId: id, title: task.title });
      });

      res.json({
        success: true,
        message: 'تم حذف المهمة بنجاح'
      });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  }

  // 9. Claim Open Bounty Task
  public static async claimBounty(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, error: 'غير مسجل' });
        return;
      }

      const { id } = req.params;
      const task = await Task.findById(id);

      if (!task) {
        res.status(404).json({ success: false, error: 'المهمة غير موجودة' });
        return;
      }

      if (!task.isBountyTask) {
        res.status(400).json({ success: false, error: 'هذه المهمة ليست مهمة مكافأة أو تنافس' });
        return;
      }

      if (task.claimedBy && task.claimedBy.toString() !== req.user._id.toString()) {
        res.status(400).json({ success: false, error: 'عذراً! تم قبول هذه المهمة مسبقاً من قِبل زميل آخر' });
        return;
      }

      task.claimedBy = req.user._id;
      task.claimedAt = new Date();
      task.bountyPayoutStatus = 'IN_PROGRESS';
      task.status = 'IN_PROGRESS';
      if (!task.assignedTo.map(String).includes(req.user._id.toString())) {
        task.assignedTo.push(req.user._id);
      }

      if (task.stages.length > 0 && task.stages[0].status === 'LOCKED') {
        task.stages[0].status = 'IN_PROGRESS';
      }

      await task.save();

      const updated = await Task.findById(id)
        .populate('assignedTo', 'fullName email avatarUrl jobTitles')
        .populate('claimedBy', 'fullName email avatarUrl');

      SocketService.broadcast('task:updated', updated);

      // Notify admin
      await SocketService.dispatchNotification({
        recipientId: task.createdBy.toString(),
        senderId: req.user._id.toString(),
        title: '🎯 قبول مهمة بمكافأة',
        message: `الموظف [${req.user.fullName}] قبل تحدي المهمة [${task.title}] بمكافأة قدرها ${task.bountyRewardAmount}$!`,
        type: 'TASK_ASSIGNED',
        relatedEntityId: task._id.toString(),
        priority: 'HIGH'
      });

      res.json({
        success: true,
        data: updated,
        message: 'تهانينا! تم قبول المهمة وإضافتها إلى قائمة مهامك بنجاح! 🚀'
      });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  }
}

