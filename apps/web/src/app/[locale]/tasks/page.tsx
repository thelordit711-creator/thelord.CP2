'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useGetTasksQuery, useDeleteTaskMutation } from '../../../store/api/tasksApi';
import { useGetAllEmployeesQuery, useGetMeQuery } from '../../../store/api/usersApi';
import { useSocket } from '../../../providers/SocketProvider';
import { Button } from '../../../components/ui/Button';
import { Plus, CheckSquare } from 'lucide-react';
import { lordToast } from '../../../lib/lordToast';

// Modular Subcomponents
import { TaskKanbanBoard } from '../../../components/tasks/views/TaskKanbanBoard';
import { TaskTableView } from '../../../components/tasks/views/TaskTableView';
import { TaskTimelineView } from '../../../components/tasks/views/TaskTimelineView';
import { TaskAnalyticsView } from '../../../components/tasks/views/TaskAnalyticsView';
import { TaskFilterToolbar } from '../../../components/tasks/filters/TaskFilterToolbar';
import { TaskDetailsModal } from '../../../components/tasks/modals/TaskDetailsModal';
import { CreateTaskModal } from '../../../components/tasks/modals/CreateTaskModal';
import { EditTaskModal } from '../../../components/tasks/modals/EditTaskModal';
import { ExecutionWorkspaceModal } from '../../../components/tasks/ExecutionWorkspaceModal';
import { ImageLightboxModal } from '../../../components/ui/ImageLightboxModal';

function TasksPageContent() {
  const searchParams = useSearchParams();
  const initialTaskIdParam = searchParams.get('taskId');
  const handledTaskParamRef = useRef<string | null>(null);
  const { data: tasksRes, isLoading, refetch } = useGetTasksQuery();
  const [deleteTask, { isLoading: isDeleting }] = useDeleteTaskMutation();
  const { data: employeesRes } = useGetAllEmployeesQuery();
  const { data: meRes } = useGetMeQuery();
  const { socket } = useSocket();

  // Current User & RBAC (derived from HttpOnly server session)
  const currentUser = meRes?.data || null;
  const isAdmin = currentUser?.accessRole === 'SUPER_ADMIN';

  // Real-time Socket Event Handling
  useEffect(() => {
    if (!socket) return;

    const handleTaskRefresh = () => refetch();
    const handleTaskAssigned = (data: any) => {
      refetch();
      if (data?.title) {
        lordToast.gold('تكليف بمهمة جديدة', `تم إسناد مهمة جديدة لك: ${data.title}`);
      }
    };

    socket.on('task:created', handleTaskRefresh);
    socket.on('task:updated', handleTaskRefresh);
    socket.on('task:deleted', handleTaskRefresh);
    socket.on('task:assigned', handleTaskAssigned);
    socket.on('stage:submitted', (data: any) => {
      refetch();
      if (data?.task) {
        setSelectedTask((prev: any) => (prev && prev._id === data.task._id ? data.task : prev));
      }
    });
    socket.on('stage:approved', (data: any) => {
      refetch();
      if (data?.task) {
        setSelectedTask((prev: any) => (prev && prev._id === data.task._id ? data.task : prev));
      }
    });
    socket.on('stage:revision_requested', (data: any) => {
      refetch();
      if (data?.task) {
        setSelectedTask((prev: any) => (prev && prev._id === data.task._id ? data.task : prev));
      }
    });

    return () => {
      socket.off('task:created', handleTaskRefresh);
      socket.off('task:updated', handleTaskRefresh);
      socket.off('task:deleted', handleTaskRefresh);
      socket.off('task:assigned', handleTaskAssigned);
      socket.off('stage:submitted');
      socket.off('stage:approved');
      socket.off('stage:revision_requested');
    };
  }, [socket, refetch]);

  // View & Filter States
  const [activeView, setActiveView] = useState<'board' | 'list' | 'timeline' | 'analytics'>('board');
  const [platformFilter, setPlatformFilter] = useState<string>('ALL');
  const [priorityFilter, setPriorityFilter] = useState<string>('ALL');
  const [onlyDailyFilter, setOnlyDailyFilter] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [employeeFilterScope, setEmployeeFilterScope] = useState<'MY_TASKS' | 'ALL_TASKS'>('MY_TASKS');
  const [adminSelectedEmployee, setAdminSelectedEmployee] = useState<string>('ALL');

  // Modal States
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<any | null>(null);
  const [taskToEdit, setTaskToEdit] = useState<any | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isExecutionWorkspaceOpen, setIsExecutionWorkspaceOpen] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<{ url: string; alt: string } | null>(null);

  const tasks = tasksRes?.data || [];

  useEffect(() => {
    if (!initialTaskIdParam || handledTaskParamRef.current === initialTaskIdParam || tasks.length === 0) {
      return;
    }
    const matchedTask = tasks.find((t: any) => String(t._id) === initialTaskIdParam);
    if (matchedTask) {
      setSelectedTask(matchedTask);
      handledTaskParamRef.current = initialTaskIdParam;
    }
  }, [initialTaskIdParam, tasks]);
  const employees = employeesRes?.data || [];
  const dailyTasksCount = tasks.filter(t => t.isDailyRecurring).length;

  // Filter tasks with RBAC
  const filteredTasks = tasks.filter(t => {
    const matchesSearch =
      (t.title?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
      (t.description?.toLowerCase() || '').includes(searchQuery.toLowerCase());
    const matchesPlatform = platformFilter === 'ALL' || t.targetPlatform === platformFilter;
    const matchesPriority = priorityFilter === 'ALL' || t.priority === priorityFilter;
    const matchesDaily = !onlyDailyFilter || t.isDailyRecurring;

    if (isAdmin) {
      if (adminSelectedEmployee !== 'ALL') {
        const isAssigned = t.assignedTo?.some((e: any) => String(e._id || e) === adminSelectedEmployee);
        if (!isAssigned) return false;
      }
    } else {
      if (employeeFilterScope === 'MY_TASKS' && currentUser?._id) {
        const isAssignedToMe = t.assignedTo?.some((e: any) => String(e._id || e) === String(currentUser._id));
        const isOpenBounty = t.isBountyTask && !t.claimedBy;
        if (!isAssignedToMe && !isOpenBounty) return false;
      }
    }

    return matchesSearch && matchesPlatform && matchesPriority && matchesDaily;
  });

  const handleDeleteTask = async (taskId: string, title?: string) => {
    if (!window.confirm(`هل أنت متأكد من رغبتك في حذف مهمة "${title || 'المحددة'}" نهائياً من المنظومة؟`)) {
      return;
    }

    try {
      await deleteTask(taskId).unwrap();
      lordToast.success('تم حذف المهمة نهائياً بنجاح 🗑️');
      if (selectedTask && selectedTask._id === taskId) {
        setSelectedTask(null);
      }
      refetch();
    } catch (err: any) {
      lordToast.error('فشل حذف المهمة', err?.data?.error || 'حدث خطأ أثناء حذف المهمة');
    }
  };

  const handleOpenEdit = (task: any) => {
    setTaskToEdit(task);
    setIsEditModalOpen(true);
  };

  const handleEditSuccess = (updatedData: any) => {
    if (selectedTask && taskToEdit && selectedTask._id === taskToEdit._id) {
      setSelectedTask((prev: any) => ({ ...prev, ...updatedData }));
    }
    refetch();
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-obsidian-card p-5 sm:p-6 rounded-3xl border border-obsidian-border shadow-xs">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2.5">
            <CheckSquare className="w-6 h-6 text-lord-gold" />
            <span>محرك إدارة وتتبع المهام والمراحل (Agile Tasks)</span>
          </h1>
          <p className="text-gray-400 text-xs sm:text-sm mt-1">
            منظومة تنفيذية شاملة للمهام التكتيكية، تسليم المراحل بالوثائق، وصرف الحوافز المالية الفورية.
          </p>
        </div>

        <Button
          variant="gold"
          size="md"
          onClick={() => setIsCreateModalOpen(true)}
          className="shadow-gold-glow flex items-center gap-2 rounded-2xl font-bold shrink-0 text-xs sm:text-sm px-4 py-2.5"
        >
          <Plus className="w-4 h-4 ml-1" />
          <span>{isAdmin ? '+ إنشاء وتكليف بمهمة جديدة ⚡' : '+ اقتراح مهمة أو مبادرة جديدة 💡'}</span>
        </Button>
      </div>

      {/* ClickUp-Style Filter Toolbar */}
      <TaskFilterToolbar
        activeView={activeView}
        setActiveView={setActiveView}
        isAdmin={isAdmin}
        employeeFilterScope={employeeFilterScope}
        setEmployeeFilterScope={setEmployeeFilterScope}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        dailyTasksCount={dailyTasksCount}
        onlyDailyFilter={onlyDailyFilter}
        setOnlyDailyFilter={setOnlyDailyFilter}
        platformFilter={platformFilter}
        setPlatformFilter={setPlatformFilter}
        employees={employees}
        adminSelectedEmployee={adminSelectedEmployee}
        setAdminSelectedEmployee={setAdminSelectedEmployee}
      />

      {/* Main View Display */}
      {isLoading ? (
        <div className="flex items-center justify-center p-16">
          <div className="w-10 h-10 border-4 border-lord-gold border-t-transparent rounded-full animate-spin" />
        </div>
      ) : activeView === 'board' ? (
        <TaskKanbanBoard
          tasks={filteredTasks}
          onSelectTask={setSelectedTask}
        />
      ) : activeView === 'list' ? (
        <TaskTableView
          tasks={filteredTasks}
          onSelectTask={setSelectedTask}
        />
      ) : activeView === 'timeline' ? (
        <TaskTimelineView
          tasks={filteredTasks}
          onSelectTask={setSelectedTask}
        />
      ) : (
        <TaskAnalyticsView
          tasks={tasks}
        />
      )}

      {/* Task Details Modal (Integrated with AppModalPortal) */}
      {selectedTask && (
        <TaskDetailsModal
          task={selectedTask}
          isOpen={!!selectedTask}
          onClose={() => setSelectedTask(null)}
          isAdmin={isAdmin}
          onOpenExecutionWorkspace={() => setIsExecutionWorkspaceOpen(true)}
          onOpenEdit={handleOpenEdit}
          onDeleteTask={handleDeleteTask}
          isDeleting={isDeleting}
          onRefresh={refetch}
          onOpenLightbox={setLightboxImage}
        />
      )}

      {/* Create / Propose Task Modal */}
      <CreateTaskModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={refetch}
        isProposal={!isAdmin}
      />

      {/* Edit Task Modal */}
      <EditTaskModal
        task={taskToEdit}
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setTaskToEdit(null);
        }}
        onSuccess={handleEditSuccess}
      />

      {/* AI Execution Workspace & Export Modal */}
      {isExecutionWorkspaceOpen && selectedTask && (
        <ExecutionWorkspaceModal
          task={selectedTask}
          onClose={() => setIsExecutionWorkspaceOpen(false)}
          onStageUpdated={() => refetch()}
        />
      )}

      {/* Image Lightbox Modal */}
      {lightboxImage && (
        <ImageLightboxModal
          imageUrl={lightboxImage.url}
          imageAlt={lightboxImage.alt}
          onClose={() => setLightboxImage(null)}
        />
      )}
    </div>
  );
}

export default function TasksPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-obsidian-deep" />}>
      <TasksPageContent />
    </Suspense>
  );
}
