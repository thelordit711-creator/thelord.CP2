import { Response } from 'express';
import mongoose from 'mongoose';
import { AuthenticatedRequest } from '../middlewares/verifyKindeJWT';
import { Project } from '../models/Project.model';
import { Task } from '../models/Task.model';
import { User } from '../models/User.model';
import { Channel } from '../models/Channel.model';
import { AccountingService } from '../services/accounting.service';
import { SocketService } from '../services/socket.service';
import { TheLordAIService } from '../services/theLordAI.service';
import { ProjectSyncService } from '../services/projectSync.service';

const ALLOWED_PROJECT_STATUSES = ['PLANNING', 'ACTIVE', 'ON_HOLD', 'COMPLETED', 'CANCELLED'] as const;

function sanitizeStringArray(val: unknown): string[] {
  if (!Array.isArray(val)) return [];
  return val.map((item) => String(item || '').trim()).filter(Boolean);
}

function sanitizeObjectIdArray(val: unknown): string[] {
  if (!Array.isArray(val)) return [];
  return Array.from(
    new Set(
      val
        .map((item: any) => String(item?._id || item || '').trim())
        .filter((id) => mongoose.Types.ObjectId.isValid(id))
    )
  );
}

export class ProjectsController {
  /**
   * Get projects (SUPER_ADMIN sees all; EMPLOYEE sees assigned/created projects)
   */
  public static async getAllProjects(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const isAdmin = req.user?.accessRole === 'SUPER_ADMIN';
      const userId = req.user?._id;
      const filter: Record<string, unknown> = {};

      if (!isAdmin && userId) {
        filter.$or = [{ teamMembers: userId }, { createdBy: userId }];
      }

      const rawLimit = Number(req.query.limit);
      const limit = Number.isFinite(rawLimit) && rawLimit > 0 ? Math.min(rawLimit, 100) : 50;
      const rawPage = Number(req.query.page);
      const page = Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1;

      const projects = await Project.find(filter)
        .populate('createdBy', 'fullName email accessRole')
        .populate('teamMembers', 'fullName email primaryDepartment avatarUrl')
        .populate({
          path: 'wbsMilestones.assignedTasks',
          select: '_id title status overallProgressPercent priority dueDate assignedTo financialRequirement'
        })
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit);

      res.json({
        success: true,
        data: projects
      });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  }

  /**
   * Get single project by ID (role-scoped)
   */
  public static async getProjectById(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      if (!mongoose.Types.ObjectId.isValid(id)) {
        res.status(400).json({ success: false, error: 'معرف المشروع غير صالح' });
        return;
      }

      const project = await ProjectSyncService.getPopulatedProjectById(id);
      if (!project) {
        res.status(404).json({ success: false, error: 'المشروع غير موجود' });
        return;
      }

      const isAdmin = req.user?.accessRole === 'SUPER_ADMIN';
      const userIdStr = req.user?._id?.toString();
      const isMember =
        isAdmin ||
        project.createdBy?.toString() === userIdStr ||
        (project.createdBy as any)?._id?.toString() === userIdStr ||
        (project.teamMembers || []).some((m: any) => String(m?._id || m) === userIdStr);

      if (!isMember) {
        res.status(403).json({ success: false, error: 'غير مصرح لك بالوصول إلى هذا المشروع' });
        return;
      }

      res.json({
        success: true,
        data: project
      });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  }

  /**
   * AI WBS Plan Generation endpoint paired cleanly with `/projects/ai-generate-plan`
   */
  public static async aiGeneratePlan(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { title, description, allocatedBudget, budget, targetDays } = req.body;
      if (!title || !String(title).trim() || !description || !String(description).trim()) {
        res.status(400).json({ success: false, error: 'عنوان المشروع ووصفه مطلوبان للتوليد الذكي' });
        return;
      }

      const members = await User.find({ accessRole: { $ne: 'TREASURY' } }).select(
        '_id fullName primaryDepartment jobTitles'
      );
      const teamFormatted = members.map((m) => ({
        _id: m._id.toString(),
        fullName: m.fullName,
        department: m.primaryDepartment,
        jobTitles: m.jobTitles
      }));

      const resolvedBudget = Number(allocatedBudget ?? budget ?? 1000);
      const resolvedDays = Number(targetDays ?? 14);

      const plan = await TheLordAIService.generateProjectPlan({
        title: String(title).trim(),
        description: String(description).trim(),
        budget: Number.isFinite(resolvedBudget) && resolvedBudget >= 0 ? resolvedBudget : 1000,
        targetDays: Number.isFinite(resolvedDays) && resolvedDays >= 1 ? resolvedDays : 14,
        teamMembers: teamFormatted
      });

      res.json({
        success: true,
        data: plan
      });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  }

  /**
   * Create a new project (Manual or AI-Generated, SUPER_ADMIN only)
   */
  public static async createProject(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, error: 'غير مسجل' });
        return;
      }

      const {
        title,
        code,
        description,
        objectives,
        requirements,
        toolsAndResources,
        allocatedBudget = 0,
        startDate,
        targetEndDate,
        status = 'ACTIVE',
        teamMembers,
        wbsMilestones = []
      } = req.body;

      if (!title || !String(title).trim() || !description || !String(description).trim() || !targetEndDate) {
        res.status(400).json({
          success: false,
          error: 'عنوان المشروع، الوصف، والموعد النهائي حقول إلزامية'
        });
        return;
      }

      const parsedBudget = Number(allocatedBudget);
      if (!Number.isFinite(parsedBudget) || parsedBudget < 0) {
        res.status(400).json({ success: false, error: 'الميزانية المخصصة يجب أن تكون رقماً غير سالب' });
        return;
      }

      const parsedEndDate = new Date(targetEndDate);
      if (Number.isNaN(parsedEndDate.getTime())) {
        res.status(400).json({ success: false, error: 'تاريخ التسليم المستهدف غير صالح' });
        return;
      }

      const safeStatus = ALLOWED_PROJECT_STATUSES.includes(status) ? status : 'ACTIVE';
      const sanitizedTeam = sanitizeObjectIdArray(teamMembers);
      const sanitizedMilestones = Array.isArray(wbsMilestones)
        ? wbsMilestones
            .filter((m: any) => m && String(m.title || '').trim())
            .map((m: any) => ({
              title: String(m.title).trim(),
              description: m.description ? String(m.description).trim() : '',
              dueDate: m.dueDate && !Number.isNaN(new Date(m.dueDate).getTime()) ? new Date(m.dueDate) : parsedEndDate,
              isCompleted: false,
              suggestedAssigneeId:
                m.suggestedAssigneeId && mongoose.Types.ObjectId.isValid(String(m.suggestedAssigneeId))
                  ? m.suggestedAssigneeId
                  : undefined,
              assignedTasks: []
            }))
        : [];

      const projectCode =
        code && String(code).trim()
          ? String(code).trim().toUpperCase()
          : `PRJ-${Math.floor(1000 + Math.random() * 9000)}`;

      const newProject = await Project.create({
        title: String(title).trim(),
        code: projectCode,
        description: String(description).trim(),
        objectives: sanitizeStringArray(objectives),
        requirements: sanitizeStringArray(requirements),
        toolsAndResources: sanitizeStringArray(toolsAndResources),
        allocatedBudget: parsedBudget,
        spentBudget: 0,
        startDate: startDate && !Number.isNaN(new Date(startDate).getTime()) ? new Date(startDate) : new Date(),
        targetEndDate: parsedEndDate,
        status: safeStatus,
        createdBy: req.user._id,
        teamMembers: sanitizedTeam,
        wbsMilestones: sanitizedMilestones
      });

      const populated = await ProjectSyncService.getPopulatedProjectById(newProject._id);
      const payload = populated || newProject;

      SocketService.broadcast('project:created', payload);

      // Notify assigned team members
      sanitizedTeam.forEach((memberId) => {
        if (memberId !== req.user?._id?.toString()) {
          SocketService.dispatchNotification({
            recipientId: memberId,
            senderId: req.user?._id?.toString(),
            title: '📁 تمت إضافتك لمشروع استراتيجي جديد',
            message: `أُضيف اسمك إلى فريق مشروع "${newProject.title}" (${newProject.code})`,
            type: 'PROJECT_UPDATE',
            relatedEntityId: newProject._id.toString(),
            relatedUrl: '/projects',
            priority: 'MEDIUM'
          });
        }
      });

      res.status(201).json({
        success: true,
        data: payload,
        message: 'تم إنشاء المشروع بنجاح!'
      });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  }

  /**
   * Update project details, status, milestones, or budget (SUPER_ADMIN only, strict whitelist)
   */
  public static async updateProject(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user || req.user.accessRole !== 'SUPER_ADMIN') {
        res.status(403).json({ success: false, error: 'غير مصرح. تعديل المشاريع مخصص للإدارة العليا فقط' });
        return;
      }

      const { id } = req.params;
      if (!mongoose.Types.ObjectId.isValid(id)) {
        res.status(400).json({ success: false, error: 'معرف المشروع غير صالح' });
        return;
      }

      const project = await Project.findById(id);
      if (!project) {
        res.status(404).json({ success: false, error: 'المشروع غير موجود' });
        return;
      }

      const body = req.body;
      if (body.title !== undefined && String(body.title).trim()) {
        project.title = String(body.title).trim();
      }
      if (body.description !== undefined && String(body.description).trim()) {
        project.description = String(body.description).trim();
      }
      if (body.status !== undefined) {
        if (!ALLOWED_PROJECT_STATUSES.includes(body.status)) {
          res.status(400).json({ success: false, error: 'حالة المشروع غير صالحة' });
          return;
        }
        project.status = body.status;
      }
      if (body.allocatedBudget !== undefined) {
        const parsedBudget = Number(body.allocatedBudget);
        if (!Number.isFinite(parsedBudget) || parsedBudget < 0) {
          res.status(400).json({ success: false, error: 'الميزانية المخصصة يجب أن تكون رقماً غير سالب' });
          return;
        }
        if (parsedBudget < (project.spentBudget || 0)) {
          res.status(400).json({
            success: false,
            error: `لا يمكن خفض الميزانية المخصصة عن المبلغ المصروف فعلياً (${project.spentBudget} USDT)`
          });
          return;
        }
        project.allocatedBudget = parsedBudget;
      }
      if (body.targetEndDate !== undefined && body.targetEndDate) {
        const parsedDate = new Date(body.targetEndDate);
        if (Number.isNaN(parsedDate.getTime())) {
          res.status(400).json({ success: false, error: 'تاريخ التسليم المستهدف غير صالح' });
          return;
        }
        project.targetEndDate = parsedDate;
      }
      if (body.objectives !== undefined) {
        project.objectives = sanitizeStringArray(body.objectives);
      }
      if (body.requirements !== undefined) {
        project.requirements = sanitizeStringArray(body.requirements);
      }
      if (body.toolsAndResources !== undefined) {
        project.toolsAndResources = sanitizeStringArray(body.toolsAndResources);
      }
      if (body.teamMembers !== undefined) {
        project.teamMembers = sanitizeObjectIdArray(body.teamMembers);
      }
      if (Array.isArray(body.wbsMilestones)) {
        const existingMap = new Map(
          project.wbsMilestones.map((m: any) => [String(m._id || ''), m])
        );
        project.wbsMilestones = body.wbsMilestones
          .filter((m: any) => m && String(m.title || '').trim())
          .map((m: any) => {
            const prev = m._id ? existingMap.get(String(m._id)) : undefined;
            const preservedTasks = prev
              ? prev.assignedTasks
              : sanitizeObjectIdArray(m.assignedTasks);
            return {
              ...(prev?._id ? { _id: prev._id } : {}),
              title: String(m.title).trim(),
              description: m.description ? String(m.description).trim() : '',
              dueDate:
                m.dueDate && !Number.isNaN(new Date(m.dueDate).getTime())
                  ? new Date(m.dueDate)
                  : project.targetEndDate,
              isCompleted: prev ? prev.isCompleted : Boolean(m.isCompleted),
              suggestedAssigneeId:
                m.suggestedAssigneeId && mongoose.Types.ObjectId.isValid(String(m.suggestedAssigneeId))
                  ? m.suggestedAssigneeId
                  : prev?.suggestedAssigneeId,
              assignedTasks: preservedTasks
            } as any;
          });
      }

      await project.save();
      const updated = await ProjectSyncService.getPopulatedProjectById(project._id);
      SocketService.broadcast('project:updated', updated || project);

      res.json({
        success: true,
        data: updated || project,
        message: 'تم تحديث المشروع بنجاح'
      });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  }

  /**
   * Delete project by ID (SUPER_ADMIN only) and clean Task references
   */
  public static async deleteProject(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user || req.user.accessRole !== 'SUPER_ADMIN') {
        res.status(403).json({ success: false, error: 'غير مصرح. حذف المشاريع مخصص للإدارة العليا فقط' });
        return;
      }

      const { id } = req.params;
      if (!mongoose.Types.ObjectId.isValid(id)) {
        res.status(400).json({ success: false, error: 'معرف المشروع غير صالح' });
        return;
      }

      const project = await Project.findByIdAndDelete(id);
      if (!project) {
        res.status(404).json({ success: false, error: 'المشروع غير موجود' });
        return;
      }

      await ProjectSyncService.unlinkTasksOnProjectDelete(id);
      SocketService.broadcast('project:deleted', { projectId: id });

      res.json({
        success: true,
        message: 'تم حذف المشروع نهائياً بنجاح 🗑️'
      });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  }

  /**
   * Convert a single Project WBS milestone into a real executable Task document
   */
  public static async decomposeMilestoneToTasks(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user || req.user.accessRole !== 'SUPER_ADMIN') {
        res.status(403).json({ success: false, error: 'غير مصرح. تحويل معالم المشروع مخصص للإدارة فقط' });
        return;
      }

      const { id } = req.params;
      const idx = Number(req.body.milestoneIndex);
      if (!Number.isInteger(idx) || idx < 0) {
        res.status(400).json({ success: false, error: 'رقم المعلم غير صالح' });
        return;
      }

      const project = await Project.findById(id);
      if (!project) {
        res.status(404).json({ success: false, error: 'المشروع غير موجود' });
        return;
      }

      const milestone = project.wbsMilestones[idx];
      if (!milestone) {
        res.status(404).json({ success: false, error: 'المعلم المطلوب غير موجود' });
        return;
      }

      if (milestone.assignedTasks && milestone.assignedTasks.length > 0) {
        res.status(400).json({ success: false, error: 'تم تحويل هذا المعلم إلى مهمة مسبقاً' });
        return;
      }

      const assignees = ProjectsController.resolveMilestoneAssignees(
        milestone.suggestedAssigneeId,
        project.teamMembers,
        req.user._id
      );

      const newTask = await Task.create({
        title: `${project.code} - ${milestone.title}`,
        description: milestone.description || `مهمة تنفيذية مشتقة من معلم المشروع [${project.title}]`,
        targetPlatform: 'GENERAL_SYSTEM',
        serviceCategory: 'GENERAL',
        priority: 'HIGH',
        dueDate: milestone.dueDate || project.targetEndDate,
        assignedTo: assignees,
        createdBy: req.user._id,
        projectId: project._id,
        milestoneIndex: idx,
        status: 'TODO',
        stages: [
          {
            stageOrder: 1,
            stageTitle: 'المرحلة 1: إعداد وتجهيز متطلبات المعلم',
            instructions: milestone.description || 'تنفيذ العمل بدقة ورفع الإثباتات المطلوبة',
            status: 'IN_PROGRESS',
            requiredInputs: [
              {
                fieldLabel: 'مستند أو تقرير الإنجاز',
                expectedType: 'DOCUMENT',
                isMandatory: true
              }
            ]
          }
        ]
      });

      milestone.assignedTasks.push(newTask._id as any);
      milestone.isCompleted = false;
      await project.save();

      const populatedTask = await Task.findById(newTask._id)
        .populate('assignedTo', 'fullName email avatarUrl jobTitles')
        .populate('createdBy', 'fullName email avatarUrl');
      const populatedProject = await ProjectSyncService.getPopulatedProjectById(project._id);

      SocketService.broadcast('task:created', populatedTask || newTask);
      if (populatedProject) {
        SocketService.broadcast('project:updated', populatedProject);
      }

      ProjectsController.notifyMilestoneAssignees(assignees, newTask, project.title, req.user._id.toString());

      res.json({
        success: true,
        data: {
          task: populatedTask || newTask,
          project: populatedProject || project
        },
        message: 'تم تحويل المعلم إلى مهمة تنفيذية بنجاح'
      });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  }

  /**
   * Convert ALL unconverted Project WBS milestones into tasks at once
   */
  public static async decomposeAllMilestones(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user || req.user.accessRole !== 'SUPER_ADMIN') {
        res.status(403).json({ success: false, error: 'غير مصرح. مخصص للإدارة فقط' });
        return;
      }

      const { id } = req.params;
      const project = await Project.findById(id);
      if (!project) {
        res.status(404).json({ success: false, error: 'المشروع غير موجود' });
        return;
      }

      const createdTasks: any[] = [];

      for (let i = 0; i < project.wbsMilestones.length; i++) {
        const milestone = project.wbsMilestones[i];
        if (milestone.assignedTasks && milestone.assignedTasks.length > 0) {
          continue;
        }

        const assignees = ProjectsController.resolveMilestoneAssignees(
          milestone.suggestedAssigneeId,
          project.teamMembers,
          req.user._id
        );

        const newTask = await Task.create({
          title: `${project.code} - المعلم ${i + 1}: ${milestone.title}`,
          description: milestone.description || `مهمة تنفيذية لخطة مشروع [${project.title}]`,
          targetPlatform: 'GENERAL_SYSTEM',
          serviceCategory: 'GENERAL',
          priority: 'HIGH',
          dueDate: milestone.dueDate || project.targetEndDate,
          assignedTo: assignees,
          createdBy: req.user._id,
          projectId: project._id,
          milestoneIndex: i,
          status: 'TODO',
          stages: [
            {
              stageOrder: 1,
              stageTitle: `المرحلة 1: إعداد وتنفيذ ${milestone.title}`,
              instructions: milestone.description || 'تنفيذ العمل بدقة ورفع الإثباتات',
              status: 'IN_PROGRESS',
              requiredInputs: [
                {
                  fieldLabel: 'مستند أو تقرير الإنجاز',
                  expectedType: 'DOCUMENT',
                  isMandatory: true
                }
              ]
            }
          ]
        });

        milestone.assignedTasks.push(newTask._id as any);
        milestone.isCompleted = false;
        createdTasks.push(newTask);
        SocketService.broadcast('task:created', newTask);
        ProjectsController.notifyMilestoneAssignees(assignees, newTask, project.title, req.user._id.toString());
      }

      await project.save();
      const populatedProject = await ProjectSyncService.getPopulatedProjectById(project._id);
      if (populatedProject) {
        SocketService.broadcast('project:updated', populatedProject);
      }

      res.json({
        success: true,
        data: {
          createdTasksCount: createdTasks.length,
          project: populatedProject || project
        },
        message:
          createdTasks.length > 0
            ? `تم تحويل ${createdTasks.length} معلماً من خطة المشروع إلى مهام تنفيذية وتوزيعها على الكادر بنجاح!`
            : 'جميع معالم المشروع محولة لمهام تنفيذية بالفعل.'
      });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  }

  /**
   * Financial ledger & budget telemetry linked to this project
   */
  public static async getProjectFinancials(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      if (!mongoose.Types.ObjectId.isValid(id)) {
        res.status(400).json({ success: false, error: 'معرف المشروع غير صالح' });
        return;
      }

      const project = await Project.findById(id);
      if (!project) {
        res.status(404).json({ success: false, error: 'المشروع غير موجود' });
        return;
      }

      const isAdmin = req.user?.accessRole === 'SUPER_ADMIN';
      const userIdStr = req.user?._id?.toString();
      const isMember =
        isAdmin ||
        project.createdBy?.toString() === userIdStr ||
        (project.teamMembers || []).some((m: any) => String(m) === userIdStr);

      if (!isMember) {
        res.status(403).json({ success: false, error: 'غير مصرح' });
        return;
      }

      const transactions = await ProjectSyncService.getProjectFinancialTransactions(id);
      const vault = await AccountingService.getOrCreateVault();

      res.json({
        success: true,
        data: {
          allocatedBudget: project.allocatedBudget || 0,
          spentBudget: project.spentBudget || 0,
          remainingBudget: Math.max(0, (project.allocatedBudget || 0) - (project.spentBudget || 0)),
          vaultLiquidity: {
            generalBudget: vault.generalBudget || 0,
            treasuryBalance: vault.treasuryBalance || 0
          },
          transactions
        }
      });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  }

  /**
   * Opens or initializes a dedicated team Chat Channel for this project
   */
  public static async openOrCreateProjectChannel(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, error: 'غير مسجل' });
        return;
      }

      const { id } = req.params;
      if (!mongoose.Types.ObjectId.isValid(id)) {
        res.status(400).json({ success: false, error: 'معرف المشروع غير صالح' });
        return;
      }

      const project = await Project.findById(id);
      if (!project) {
        res.status(404).json({ success: false, error: 'المشروع غير موجود' });
        return;
      }

      const isAdmin = req.user.accessRole === 'SUPER_ADMIN';
      const userIdStr = req.user._id.toString();
      const isMember =
        isAdmin ||
        project.createdBy?.toString() === userIdStr ||
        (project.teamMembers || []).some((m: any) => String(m) === userIdStr);

      if (!isMember) {
        res.status(403).json({ success: false, error: 'غير مصرح لك بالوصول لقناة هذا المشروع' });
        return;
      }

      const channelSlug =
        project.chatChannelId ||
        `proj-${project.code.toLowerCase().replace(/[^a-z0-9-]+/g, '-')}`;

      const desiredMembers = Array.from(
        new Set([
          req.user._id.toString(),
          project.createdBy.toString(),
          ...(project.teamMembers || []).map((m: any) => m.toString())
        ])
      );

      let channel = await Channel.findOne({ channelId: channelSlug });
      if (!channel) {
        channel = await Channel.create({
          channelId: channelSlug,
          name: `مشروع: ${project.title}`,
          description: `غرفة تنسيق فريق مشروع ${project.code} — ${project.title}`,
          isOfficial: true,
          isPublic: false,
          createdBy: project.createdBy,
          members: desiredMembers as any
        });

        SocketService.broadcast('channel:created', {
          id: channel.channelId,
          name: channel.name,
          desc: channel.description,
          isOfficial: channel.isOfficial,
          isPublic: channel.isPublic
        });
      } else {
        const mergedMembers = Array.from(
          new Set([...(channel.members || []).map((m: any) => m.toString()), ...desiredMembers])
        );
        channel.members = mergedMembers as any;
        await channel.save();
      }

      if (project.chatChannelId !== channel.channelId) {
        project.chatChannelId = channel.channelId;
        await project.save();
        const populated = await ProjectSyncService.getPopulatedProjectById(project._id);
        if (populated) {
          SocketService.broadcast('project:updated', populated);
        }
      }

      res.json({
        success: true,
        data: {
          channelId: channel.channelId,
          name: channel.name
        }
      });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  }

  private static resolveMilestoneAssignees(
    suggestedAssigneeId: unknown,
    teamMembers: unknown[],
    fallbackUserId: string | mongoose.Types.ObjectId
  ): mongoose.Types.ObjectId[] {
    if (suggestedAssigneeId && mongoose.Types.ObjectId.isValid(String(suggestedAssigneeId))) {
      return [new mongoose.Types.ObjectId(String(suggestedAssigneeId))];
    }
    if (Array.isArray(teamMembers) && teamMembers.length > 0) {
      return teamMembers as mongoose.Types.ObjectId[];
    }
    return [new mongoose.Types.ObjectId(String(fallbackUserId))];
  }

  private static notifyMilestoneAssignees(
    assignees: mongoose.Types.ObjectId[],
    task: any,
    projectTitle: string,
    senderId: string
  ): void {
    assignees.forEach((empId) => {
      const empStr = empId.toString();
      SocketService.emitToUser(empStr, 'task:assigned', {
        taskId: task._id,
        title: task.title,
        assignedByName: 'محرك المشاريع WBS'
      });
      if (empStr !== senderId) {
        SocketService.dispatchNotification({
          recipientId: empStr,
          senderId,
          title: '🚀 مهمة جديدة من خطة المشروع',
          message: `أُسندت إليك مهمة "${task.title}" ضمن مشروع "${projectTitle}"`,
          type: 'PROJECT_UPDATE',
          relatedEntityId: task._id.toString(),
          relatedUrl: '/tasks',
          priority: 'HIGH'
        });
      }
    });
  }
}
