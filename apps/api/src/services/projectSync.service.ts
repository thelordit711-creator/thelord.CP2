import mongoose from 'mongoose';
import { Project, IProjectDocument } from '../models/Project.model';
import { Task } from '../models/Task.model';
import { PayoutOrder } from '../models/PayoutOrder.model';
import { SocketService } from './socket.service';

/**
 * Coordinates bidirectional synchronization between Projects (WBS milestones),
 * Tasks, and Accounting/Treasury payout records.
 */
export class ProjectSyncService {
  /**
   * Standard population chain used across project queries and socket broadcasts.
   */
  public static async getPopulatedProjectById(projectId: string | mongoose.Types.ObjectId): Promise<IProjectDocument | null> {
    return Project.findById(projectId)
      .populate('createdBy', 'fullName email accessRole')
      .populate('teamMembers', 'fullName email primaryDepartment avatarUrl')
      .populate({
        path: 'wbsMilestones.assignedTasks',
        select: '_id title status overallProgressPercent priority dueDate assignedTo financialRequirement'
      });
  }

  /**
   * Resolves the project associated with a given task via either task.projectId
   * or milestone assignedTasks membership.
   */
  public static async findProjectForTask(
    taskId: string | mongoose.Types.ObjectId | { _id?: unknown },
    session?: mongoose.ClientSession
  ): Promise<IProjectDocument | null> {
    const normalizedTaskId =
      typeof taskId === 'object' && taskId !== null && !(taskId instanceof mongoose.Types.ObjectId)
        ? String((taskId as { _id?: unknown })._id || '')
        : taskId;

    if (!normalizedTaskId) return null;

    const taskQuery = Task.findById(normalizedTaskId).select('projectId');
    if (session) taskQuery.session(session);
    const task = await taskQuery;

    if (task?.projectId) {
      const byDirectRef = Project.findById(task.projectId);
      if (session) byDirectRef.session(session);
      const found = await byDirectRef;
      if (found) return found;
    }

    const byMilestoneQuery = Project.findOne({ 'wbsMilestones.assignedTasks': normalizedTaskId });
    if (session) byMilestoneQuery.session(session);
    return byMilestoneQuery;
  }

  /**
   * Recomputes milestone completion flags from all assigned Task statuses whenever
   * a linked task is created, completed, or edited, and broadcasts `project:updated`.
   */
  public static async syncMilestoneProgressByTaskId(taskId: string | mongoose.Types.ObjectId): Promise<void> {
    try {
      const project = await this.findProjectForTask(taskId);
      if (!project) return;

      await this.recomputeAndBroadcast(project);
    } catch (err) {
      console.error('[ProjectSyncService] syncMilestoneProgressByTaskId error:', err);
    }
  }

  /**
   * Links a newly created task (e.g., from /tasks) directly to a project's WBS milestone.
   */
  public static async attachTaskToProjectMilestone(
    projectId: string,
    milestoneIndex: number | undefined,
    taskId: string | mongoose.Types.ObjectId
  ): Promise<void> {
    try {
      const project = await Project.findById(projectId);
      if (!project || !project.wbsMilestones.length) return;

      const idx =
        typeof milestoneIndex === 'number' && milestoneIndex >= 0 && milestoneIndex < project.wbsMilestones.length
          ? milestoneIndex
          : 0;

      const milestone = project.wbsMilestones[idx];
      const existingIds = (milestone.assignedTasks || []).map((id: any) => id.toString());
      if (!existingIds.includes(taskId.toString())) {
        milestone.assignedTasks.push(taskId as any);
      }

      await this.recomputeAndBroadcast(project);
    } catch (err) {
      console.error('[ProjectSyncService] attachTaskToProjectMilestone error:', err);
    }
  }

  /**
   * Removes deleted task references from every project milestone so no orphan ObjectIds remain.
   */
  public static async unlinkTaskFromProjects(taskId: string): Promise<void> {
    try {
      const affectedProjects = await Project.find({ 'wbsMilestones.assignedTasks': taskId });
      for (const project of affectedProjects) {
        for (const milestone of project.wbsMilestones) {
          milestone.assignedTasks = (milestone.assignedTasks || []).filter(
            (id: any) => id.toString() !== taskId.toString()
          );
        }
        await this.recomputeAndBroadcast(project);
      }
    } catch (err) {
      console.error('[ProjectSyncService] unlinkTaskFromProjects error:', err);
    }
  }

  /**
   * Clears back-references on Task documents when their parent Project is deleted.
   */
  public static async unlinkTasksOnProjectDelete(projectId: string): Promise<void> {
    try {
      await Task.updateMany(
        { projectId },
        { $unset: { projectId: '', milestoneIndex: '' } }
      );
    } catch (err) {
      console.error('[ProjectSyncService] unlinkTasksOnProjectDelete error:', err);
    }
  }

  /**
   * Collects all PayoutOrders tied to tasks belonging to a specific project.
   */
  public static async getProjectFinancialTransactions(projectId: string) {
    const project = await Project.findById(projectId);
    if (!project) return [];

    const milestoneTaskIds = project.wbsMilestones.flatMap((m) =>
      (m.assignedTasks || []).map((id: any) => id.toString())
    );
    const directTasks = await Task.find({ projectId: project._id }).select('_id');
    const allTaskIds = Array.from(
      new Set([...milestoneTaskIds, ...directTasks.map((t) => t._id.toString())])
    );

    if (allTaskIds.length === 0) return [];

    return PayoutOrder.find({ relatedTaskId: { $in: allTaskIds } })
      .populate('beneficiaryId', 'fullName email primaryDepartment')
      .populate('relatedTaskId', 'title status')
      .sort({ createdAt: -1 });
  }

  private static async recomputeAndBroadcast(project: IProjectDocument): Promise<void> {
    const allTaskIds = project.wbsMilestones.flatMap((m) =>
      (m.assignedTasks || []).map((id: any) => id.toString())
    );

    const tasks = allTaskIds.length > 0
      ? await Task.find({ _id: { $in: allTaskIds } }).select('_id status')
      : [];
    const statusMap = new Map<string, string>(tasks.map((t) => [t._id.toString(), t.status]));

    for (const milestone of project.wbsMilestones) {
      const ids = (milestone.assignedTasks || []).map((id: any) => id.toString());
      if (ids.length === 0) {
        milestone.isCompleted = false;
      } else {
        milestone.isCompleted = ids.every((id) => statusMap.get(id) === 'COMPLETED');
      }
    }

    if (
      project.wbsMilestones.length > 0 &&
      project.wbsMilestones.every((m) => m.isCompleted) &&
      project.status === 'ACTIVE'
    ) {
      project.status = 'COMPLETED';
    }

    await project.save();
    const populated = await this.getPopulatedProjectById(project._id);
    if (populated) {
      SocketService.broadcast('project:updated', populated);
    }
  }
}

