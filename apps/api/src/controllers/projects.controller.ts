import { Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/verifyKindeJWT';
import { Project } from '../models/Project.model';
import { Task } from '../models/Task.model';
import { SocketService } from '../services/socket.service';

export class ProjectsController {
  /**
   * Get all projects
   */
  public static async getAllProjects(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const projects = await Project.find({})
        .populate('createdBy', 'fullName email accessRole')
        .populate('teamMembers', 'fullName email primaryDepartment avatarUrl')
        .sort({ createdAt: -1 });

      res.json({
        success: true,
        data: projects
      });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  }

  /**
   * Get single project by ID
   */
  public static async getProjectById(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const project = await Project.findById(id)
        .populate('createdBy', 'fullName email accessRole')
        .populate('teamMembers', 'fullName email primaryDepartment avatarUrl')
        .populate('wbsMilestones.assignedTasks');

      if (!project) {
        res.status(404).json({ success: false, error: 'المشروع غير موجود' });
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
   * Create a new project (Manual or AI-Generated)
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
        objectives = [],
        requirements = [],
        toolsAndResources = [],
        allocatedBudget = 0,
        startDate = new Date(),
        targetEndDate,
        teamMembers = [],
        wbsMilestones = []
      } = req.body;

      if (!title || !description || !targetEndDate) {
        res.status(400).json({
          success: false,
          error: 'عنوان المشروع، الوصف، والموعد النهائي حقول إلزامية'
        });
        return;
      }

      const projectCode = code || `PRJ-${Math.floor(1000 + Math.random() * 9000)}`;

      const newProject = await Project.create({
        title,
        code: projectCode,
        description,
        objectives,
        requirements,
        toolsAndResources,
        allocatedBudget: Number(allocatedBudget),
        spentBudget: 0,
        startDate,
        targetEndDate,
        status: 'ACTIVE',
        createdBy: req.user._id,
        teamMembers,
        wbsMilestones
      });

      // Notify admins and team
      SocketService.broadcast('project:created', newProject);

      res.status(201).json({
        success: true,
        data: newProject,
        message: 'تم إنشاء المشروع بنجاح!'
      });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  }

  /**
   * Update project details, status, or budget (SUPER_ADMIN only)
   */
  public static async updateProject(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user || req.user.accessRole !== 'SUPER_ADMIN') {
        res.status(403).json({ success: false, error: 'غير مصرح. تعديل المشاريع مخصص للإدارة العليا فقط' });
        return;
      }

      const { id } = req.params;
      const updated = await Project.findByIdAndUpdate(id, req.body, { new: true })
        .populate('teamMembers', 'fullName email primaryDepartment avatarUrl')
        .populate('createdBy', 'fullName email accessRole')
        .populate('wbsMilestones.assignedTasks');

      if (!updated) {
        res.status(404).json({ success: false, error: 'المشروع غير موجود' });
        return;
      }

      SocketService.broadcast('project:updated', updated);

      res.json({
        success: true,
        data: updated,
        message: 'تم تحديث المشروع بنجاح'
      });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  }

  /**
   * Delete project by ID (SUPER_ADMIN only)
   */
  public static async deleteProject(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user || req.user.accessRole !== 'SUPER_ADMIN') {
        res.status(403).json({ success: false, error: 'غير مصرح. حذف المشاريع مخصص للإدارة العليا فقط' });
        return;
      }

      const { id } = req.params;
      const project = await Project.findByIdAndDelete(id);

      if (!project) {
        res.status(404).json({ success: false, error: 'المشروع غير موجود' });
        return;
      }

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
   * Convert Project WBS milestone tasks into real executable Task documents
   */
  public static async decomposeMilestoneToTasks(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, error: 'غير مسجل' });
        return;
      }

      const { id } = req.params;
      const { milestoneIndex } = req.body;

      const project = await Project.findById(id);
      if (!project) {
        res.status(404).json({ success: false, error: 'المشروع غير موجود' });
        return;
      }

      const milestone = project.wbsMilestones[Number(milestoneIndex)];
      if (!milestone) {
        res.status(404).json({ success: false, error: 'المعلم المطلوب غير موجود' });
        return;
      }

      // Create Task from milestone
      const newTask = await Task.create({
        title: `${project.code} - ${milestone.title}`,
        description: milestone.description || `مهمة تنفيذية مشتقة من معلم المشروع [${project.title}]`,
        targetPlatform: 'INTERNAL_ERP',
        serviceCategory: 'GENERAL',
        priority: 'HIGH',
        dueDate: milestone.dueDate || project.targetEndDate,
        assignedTo: project.teamMembers,
        createdBy: req.user._id,
        stages: [
          {
            stageOrder: 1,
            stageTitle: 'المرحلة 1: إعداد وتجهيز متطلبات المعلم',
            instructions: milestone.description || 'تنفيذ العمل بدقة',
            status: 'PENDING',
            requiredInputs: [
              {
                fieldLabel: 'مستند أو تقرير الإنجاز',
                expectedType: 'FILE',
                isMandatory: true
              }
            ]
          }
        ]
      });

      milestone.assignedTasks.push(newTask._id as any);
      await project.save();

      SocketService.broadcast('task:created', newTask);

      res.json({
        success: true,
        data: {
          task: newTask,
          project
        },
        message: 'تم تحويل المعلم إلى مهمة تنفيذية بنجاح'
      });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  }

  /**
   * Convert ALL Project WBS milestones into tasks at once
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
          continue; // Already converted
        }

        const newTask = await Task.create({
          title: `${project.code} - المعلم ${i + 1}: ${milestone.title}`,
          description: milestone.description || `مهمة تنفيذية لخطة مشروع [${project.title}]`,
          targetPlatform: 'INTERNAL_ERP',
          serviceCategory: 'GENERAL',
          priority: 'HIGH',
          dueDate: milestone.dueDate || project.targetEndDate,
          assignedTo: project.teamMembers,
          createdBy: req.user._id,
          stages: [
            {
              stageOrder: 1,
              stageTitle: `المرحلة 1: إعداد وتنفيذ ${milestone.title}`,
              instructions: milestone.description || 'تنفيذ العمل بدقة ورفع الإثباتات',
              status: 'PENDING',
              requiredInputs: [
                {
                  fieldLabel: 'مستند أو تقرير الإنجاز',
                  expectedType: 'FILE',
                  isMandatory: true
                }
              ]
            }
          ]
        });

        milestone.assignedTasks.push(newTask._id as any);
        createdTasks.push(newTask);
        SocketService.broadcast('task:created', newTask);
      }

      await project.save();

      res.json({
        success: true,
        data: {
          createdTasksCount: createdTasks.length,
          project
        },
        message: `تم تحويل ${createdTasks.length} معلماً من خطة المشروع إلى مهام تنفيذية وتوزيعها على الكادر بنجاح!`
      });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  }
}

