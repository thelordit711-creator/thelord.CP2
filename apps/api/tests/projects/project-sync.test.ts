import { describe, it, afterEach } from 'node:test';
import assert from 'node:assert';
import mongoose from 'mongoose';
import { ProjectSyncService } from '../../src/services/projectSync.service';
import { Project } from '../../src/models/Project.model';
import { Task } from '../../src/models/Task.model';
import { SocketService } from '../../src/services/socket.service';

describe('ProjectSyncService Bidirectional Sync Unit Tests', () => {
  const originalTaskFindById = Task.findById;
  const originalTaskFind = Task.find;
  const originalTaskUpdateMany = Task.updateMany;
  const originalProjectFindById = Project.findById;
  const originalProjectFindOne = Project.findOne;
  const originalProjectFind = Project.find;
  const originalBroadcast = SocketService.broadcast;

  afterEach(() => {
    Task.findById = originalTaskFindById;
    Task.find = originalTaskFind;
    Task.updateMany = originalTaskUpdateMany;
    Project.findById = originalProjectFindById;
    Project.findOne = originalProjectFindOne;
    Project.find = originalProjectFind;
    SocketService.broadcast = originalBroadcast;
  });

  it('findProjectForTask should unwrap populated task objects and resolve via task.projectId', async () => {
    const taskId = new mongoose.Types.ObjectId().toString();
    const projectId = new mongoose.Types.ObjectId().toString();
    const fakeProject = { _id: projectId, title: 'مشروع التطوير' };

    Task.findById = ((id: string) => {
      assert.strictEqual(id, taskId);
      return {
        select: () => Promise.resolve({ _id: taskId, projectId })
      } as any;
    }) as any;

    Project.findById = ((id: string) => {
      assert.strictEqual(id, projectId);
      return Promise.resolve(fakeProject) as any;
    }) as any;

    const resolved = await ProjectSyncService.findProjectForTask({ _id: taskId });
    assert.deepStrictEqual(resolved, fakeProject);
  });

  it('syncMilestoneProgressByTaskId should mark completed milestones and promote ACTIVE project to COMPLETED', async () => {
    const task1 = new mongoose.Types.ObjectId().toString();
    const task2 = new mongoose.Types.ObjectId().toString();
    const projectId = new mongoose.Types.ObjectId().toString();
    let saved = false;
    let broadcastedEvent = '';

    const fakeProject: any = {
      _id: projectId,
      status: 'ACTIVE',
      wbsMilestones: [
        { title: 'Phase 1', assignedTasks: [task1], isCompleted: false },
        { title: 'Phase 2', assignedTasks: [task2], isCompleted: false }
      ],
      async save() {
        saved = true;
      }
    };

    Task.findById = (() => ({
      select: () => Promise.resolve({ _id: task1, projectId })
    })) as any;

    Project.findById = ((id: string) => {
      assert.strictEqual(id, projectId);
      return {
        populate: () => ({
          populate: () => ({
            populate: () => Promise.resolve(fakeProject)
          })
        }),
        then: (resolve: any) => resolve(fakeProject)
      } as any;
    }) as any;

    Task.find = (() => ({
      select: () =>
        Promise.resolve([
          { _id: task1, status: 'COMPLETED' },
          { _id: task2, status: 'COMPLETED' }
        ])
    })) as any;

    SocketService.broadcast = ((event: string) => {
      broadcastedEvent = event;
    }) as any;

    await ProjectSyncService.syncMilestoneProgressByTaskId(task1);

    assert.strictEqual(saved, true);
    assert.strictEqual(fakeProject.wbsMilestones[0].isCompleted, true);
    assert.strictEqual(fakeProject.wbsMilestones[1].isCompleted, true);
    assert.strictEqual(fakeProject.status, 'COMPLETED');
    assert.strictEqual(broadcastedEvent, 'project:updated');
  });

  it('attachTaskToProjectMilestone should attach task idempotently without duplicating existing IDs', async () => {
    const existingTask = new mongoose.Types.ObjectId().toString();
    const projectId = new mongoose.Types.ObjectId().toString();

    const fakeProject: any = {
      _id: projectId,
      status: 'ACTIVE',
      wbsMilestones: [{ title: 'M1', assignedTasks: [existingTask], isCompleted: false }],
      async save() {}
    };

    Project.findById = (() => ({
      populate: () => ({
        populate: () => ({
          populate: () => Promise.resolve(fakeProject)
        })
      }),
      then: (resolve: any) => resolve(fakeProject)
    })) as any;

    Task.find = (() => ({
      select: () => Promise.resolve([{ _id: existingTask, status: 'TODO' }])
    })) as any;

    SocketService.broadcast = (() => {}) as any;

    await ProjectSyncService.attachTaskToProjectMilestone(projectId, 0, existingTask);
    assert.strictEqual(fakeProject.wbsMilestones[0].assignedTasks.length, 1);

    const secondTask = new mongoose.Types.ObjectId().toString();
    await ProjectSyncService.attachTaskToProjectMilestone(projectId, 0, secondTask);
    assert.strictEqual(fakeProject.wbsMilestones[0].assignedTasks.length, 2);
  });

  it('unlinkTaskFromProjects and unlinkTasksOnProjectDelete should clean up orphan references', async () => {
    const taskId = new mongoose.Types.ObjectId().toString();
    const projectId = new mongoose.Types.ObjectId().toString();
    let updatedManyCalled = false;

    const fakeProject: any = {
      _id: projectId,
      status: 'ACTIVE',
      wbsMilestones: [{ title: 'M1', assignedTasks: [taskId], isCompleted: true }],
      async save() {}
    };

    Project.find = (() => Promise.resolve([fakeProject])) as any;
    Project.findById = (() => ({
      populate: () => ({
        populate: () => ({
          populate: () => Promise.resolve(fakeProject)
        })
      })
    })) as any;
    Task.updateMany = ((filter: any, update: any) => {
      updatedManyCalled = true;
      assert.strictEqual(filter.projectId, projectId);
      assert.ok(update.$unset?.projectId !== undefined);
      return Promise.resolve({ modifiedCount: 1 }) as any;
    }) as any;
    SocketService.broadcast = (() => {}) as any;

    await ProjectSyncService.unlinkTaskFromProjects(taskId);
    assert.strictEqual(fakeProject.wbsMilestones[0].assignedTasks.length, 0);
    assert.strictEqual(fakeProject.wbsMilestones[0].isCompleted, false);

    await ProjectSyncService.unlinkTasksOnProjectDelete(projectId);
    assert.strictEqual(updatedManyCalled, true);
  });
});

