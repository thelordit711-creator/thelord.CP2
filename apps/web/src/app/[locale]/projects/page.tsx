'use client';

import React, { useState, useEffect } from 'react';
import {
  FolderKanban,
  Plus,
  Calendar
} from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { useGetAllEmployeesQuery } from '../../../store/api/usersApi';
import { useSocket } from '../../../providers/SocketProvider';
import { InteractiveGanttChart } from '../../../components/projects/InteractiveGanttChart';
import { ProjectCard } from '../../../components/projects/cards/ProjectCard';
import { CreateProjectModal } from '../../../components/projects/modals/CreateProjectModal';
import { ProjectPlanModal } from '../../../components/projects/modals/ProjectPlanModal';
import { EditProjectModal } from '../../../components/projects/modals/EditProjectModal';
import { toast } from 'sonner';

export default function ProjectsPage() {
  const { socket } = useSocket();
  const { data: employeesRes } = useGetAllEmployeesQuery();
  const employees = employeesRes?.data || [];

  const [currentUser, setCurrentUser] = useState<any>(null);
  const [projects, setProjects] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'CARDS' | 'GANTT'>('CARDS');

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createMode, setCreateMode] = useState<'AI' | 'MANUAL'>('AI');
  const [selectedProjectPlan, setSelectedProjectPlan] = useState<any | null>(null);
  const [isDecomposingAll, setIsDecomposingAll] = useState(false);

  // Edit Project States
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingProjectId, setEditingProjectId] = useState<string>('');
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editStatus, setEditStatus] = useState('ACTIVE');
  const [editAllocatedBudget, setEditAllocatedBudget] = useState(2500);
  const [editTargetEndDate, setEditTargetEndDate] = useState('');
  const [editTeamMembers, setEditTeamMembers] = useState<string[]>([]);
  const [isUpdatingProject, setIsUpdatingProject] = useState(false);
  const [isDeletingProject, setIsDeletingProject] = useState(false);

  // Form states for creation
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [allocatedBudget, setAllocatedBudget] = useState(2500);
  const [targetDays, setTargetDays] = useState(14);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('lord_current_user');
        if (stored) setCurrentUser(JSON.parse(stored));
      } catch (e) { }
    }
  }, []);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';

  const fetchProjects = async () => {
    try {
      const { apiFetch } = await import('../../../lib/apiClient');
      const res = await apiFetch('/projects');
      const data = await res.json();
      if (data.success) {
        setProjects(data.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();

    if (socket) {
      socket.on('project:created', (newProj: any) => {
        setProjects((prev) => [newProj, ...prev]);
        toast.info(`مشروع جديد: ${newProj.title}`);
      });
      socket.on('project:updated', (updated: any) => {
        setProjects((prev) => prev.map((p) => (p._id === updated._id ? updated : p)));
      });
    }

    return () => {
      if (socket) {
        socket.off('project:created');
        socket.off('project:updated');
      }
    };
  }, [socket]);

  // Create Project Submit
  const handleCreateProjectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { apiFetch } = await import('../../../lib/apiClient');
    const targetEndDate = new Date(Date.now() + targetDays * 86400000);

    if (createMode === 'AI') {
      setIsGeneratingAI(true);
      try {
        const planRes = await apiFetch('/projects/ai-generate-plan', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            title,
            description,
            allocatedBudget,
            targetDays
          })
        });
        const planData = await planRes.json();
        if (!planData.success) throw new Error(planData.error || 'فشل التوليد بالذكاء الاصطناعي');

        const aiPlan = planData.data;

        const createRes = await apiFetch('/projects', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            title,
            description,
            code: aiPlan.code,
            allocatedBudget,
            targetEndDate,
            objectives: aiPlan.objectives,
            requirements: aiPlan.requirements,
            toolsAndResources: aiPlan.toolsAndResources,
            teamMembers: employees.slice(0, 3).map((e) => e._id),
            wbsMilestones: aiPlan.milestones.map((m: any) => ({
              title: m.title,
              description: m.description,
              dueDate: new Date(Date.now() + (m.daysFromStart || 3) * 86400000),
              isCompleted: false,
              assignedTasks: []
            }))
          })
        });
        const created = await createRes.json();
        if (!created.success) throw new Error(created.error || 'فشل حفظ المشروع');

        toast.success('تم بناء المشروع وتفكيك معالمه بالذكاء الاصطناعي بنجاح! ✨');
        setIsCreateModalOpen(false);
        setTitle('');
        setDescription('');
        fetchProjects();
      } catch (err: any) {
        toast.error(err.message || 'حدث خطأ أثناء التوليد');
      } finally {
        setIsGeneratingAI(false);
      }
    } else {
      try {
        const createRes = await apiFetch('/projects', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            title,
            description,
            code: `PRJ-${Math.floor(1000 + Math.random() * 9000)}`,
            allocatedBudget,
            targetEndDate,
            objectives: ['تحقيق أهداف المشروع التشغيلية'],
            requirements: ['التنفيذ الفني المتقن للمراحل'],
            toolsAndResources: ['نظام TheLord Cloud'],
            teamMembers: employees.slice(0, 3).map((e) => e._id),
            wbsMilestones: [
              {
                title: 'المعلم 1: إعداد وتجهيز المشروع',
                description: 'المسودة والتحضير الأولي',
                dueDate: targetEndDate,
                isCompleted: false,
                assignedTasks: []
              }
            ]
          })
        });
        const created = await createRes.json();
        if (!created.success) throw new Error(created.error || 'فشل حفظ المشروع');

        toast.success('تم إنشاء المشروع بنجاح!');
        setIsCreateModalOpen(false);
        setTitle('');
        setDescription('');
        fetchProjects();
      } catch (err: any) {
        toast.error(err.message || 'حدث خطأ أثناء إنشاء المشروع');
      }
    }
  };

  // Convert milestone into executable Task
  const handleDecomposeMilestone = async (projectId: string, milestoneIndex: number) => {
    try {
      const { apiFetch } = await import('../../../lib/apiClient');
      const res = await apiFetch(`/projects/${projectId}/decompose-milestone`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ milestoneIndex })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'فشل تحويل المعلم لمهمة');

      toast.success('تم تحويل المعلم إلى مهمة تنفيذية وإضافتها لمحرك المراحل! 📋');
      fetchProjects();
    } catch (err: any) {
      toast.error(err.message || 'حدث خطأ أثناء تحويل المعلم');
    }
  };

  // Convert ALL milestones in project to tasks in one click
  const handleDecomposeAll = async (projectId: string) => {
    setIsDecomposingAll(true);
    try {
      const { apiFetch } = await import('../../../lib/apiClient');
      const res = await apiFetch(`/projects/${projectId}/decompose-all`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'فشل تحويل خطة المشروع');

      toast.success(data.message || 'تم تحويل خطة المشروع بالكامل إلى مهام تنفيذية وتوزيعها على الكادر! 🚀');
      fetchProjects();
      if (selectedProjectPlan && selectedProjectPlan._id === projectId) {
        setSelectedProjectPlan(data.data.project);
      }
    } catch (err: any) {
      toast.error(err.message || 'حدث خطأ أثناء تحويل الخطة');
    } finally {
      setIsDecomposingAll(false);
    }
  };

  // Open Edit Modal
  const handleOpenEdit = (project: any) => {
    setEditingProjectId(project._id);
    setEditTitle(project.title || '');
    setEditDescription(project.description || '');
    setEditStatus(project.status || 'ACTIVE');
    setEditAllocatedBudget(project.allocatedBudget || 0);
    setEditTargetEndDate(
      project.targetEndDate ? new Date(project.targetEndDate).toISOString().slice(0, 10) : ''
    );
    setEditTeamMembers((project.teamMembers || []).map((m: any) => m._id || m));
    setIsEditModalOpen(true);
  };

  // Submit Edit Project
  const handleSaveEditProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProjectId) return;
    setIsUpdatingProject(true);
    try {
      const { apiFetch } = await import('../../../lib/apiClient');
      const res = await apiFetch(`/projects/${editingProjectId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: editTitle,
          description: editDescription,
          status: editStatus,
          allocatedBudget: editAllocatedBudget,
          targetEndDate: editTargetEndDate ? new Date(editTargetEndDate) : undefined,
          teamMembers: editTeamMembers
        })
      });

      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'فشل تعديل المشروع');

      toast.success('تم تحديث بيانات وسجلات المشروع بنجاح! 💾');
      setIsEditModalOpen(false);
      fetchProjects();
      if (selectedProjectPlan && selectedProjectPlan._id === editingProjectId) {
        setSelectedProjectPlan(data.data);
      }
    } catch (err: any) {
      toast.error(err.message || 'حدث خطأ أثناء تعديل المشروع');
    } finally {
      setIsUpdatingProject(false);
    }
  };

  // Delete Project
  const handleDeleteProject = async (projectId: string, projectTitle: string) => {
    if (!confirm(`هل أنت متأكد من رغبتك بحذف المشروع "${projectTitle}" نهائياً من قاعدة البيانات؟`)) {
      return;
    }
    setIsDeletingProject(true);
    try {
      const { apiFetch } = await import('../../../lib/apiClient');
      const res = await apiFetch(`/projects/${projectId}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'فشل حذف المشروع');

      toast.success('تم حذف المشروع نهائياً من النظام!');
      setSelectedProjectPlan(null);
      fetchProjects();
    } catch (err: any) {
      toast.error(err.message || 'تعذر حذف المشروع');
    } finally {
      setIsDeletingProject(false);
    }
  };

  // Quick Status Switch
  const handleQuickStatusChange = async (projectId: string, newStatus: string) => {
    try {
      const { apiFetch } = await import('../../../lib/apiClient');
      const res = await apiFetch(`/projects/${projectId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: newStatus })
      });

      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'فشل تغيير حالة المشروع');

      toast.success(`تم تحديث حالة المشروع إلى: ${newStatus}`);
      fetchProjects();
    } catch (err: any) {
      toast.error(err.message || 'حدث خطأ أثناء تغيير الحالة');
    }
  };

  const totalAllocated = projects.reduce((acc, p) => acc + (p.allocatedBudget || 0), 0);
  const totalSpent = projects.reduce((acc, p) => acc + (p.spentBudget || 0), 0);
  const isAdmin = currentUser?.accessRole === 'SUPER_ADMIN';

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center p-12 text-lord-gold">
        <span className="w-8 h-8 rounded-full border-2 border-lord-gold border-t-transparent animate-spin ml-3" />
        <span>جاري تحميل المشاريع وسجلات WBS من قاعدة البيانات...</span>
      </div>
    );
  }

  return (
    <div className="flex-1 max-w-7xl w-full mx-auto space-y-6">
      {/* Top Header Banner */}
      <div className="bg-obsidian-card border border-lord-gold/30 rounded-3xl p-6 md:p-8 shadow-2xl relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-lord-gold via-yellow-600 to-amber-700 flex items-center justify-center text-obsidian-primary shadow-gold-glow shrink-0">
            <FolderKanban className="w-8 h-8" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl md:text-2xl font-black text-white">
                {isAdmin ? 'إدارة المشاريع الاستراتيجية ومحرك WBS' : 'المشاريع الاستراتيجية ومراحل العمل'}
              </h1>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-lord-gold/20 text-lord-gold border border-lord-gold/40 font-bold">
                {isAdmin ? 'إشراف المدير التنفيذي' : 'استعراض الفريق'}
              </span>
            </div>
            <p className="text-xs text-gray-400 mt-1">
              {isAdmin
                ? 'أهداف المشاريع، الميزانيات المحجوزة، تفكيك المعالم لمهام تنفيذية، والتحكم الصارم بسقف الصرف'
                : 'استعراض أهداف المشاريع والمعالم المحددة والمهام التنفيذية المرتبطة بفريق العمل'}
            </p>
          </div>
        </div>

        {isAdmin && (
          <Button
            type="button"
            onClick={() => setIsCreateModalOpen(true)}
            variant="gold"
            size="md"
            className="rounded-2xl shadow-gold-glow flex items-center gap-2 shrink-0 font-bold"
          >
            <Plus className="w-4 h-4 ml-1" />
            <span>مشروع جديد (يدوي / ذكاء اصطناعي) +</span>
          </Button>
        )}
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-obsidian-card border border-obsidian-border rounded-2xl p-4 shadow-lg">
          <span className="text-xs text-gray-400 block mb-1">إجمالي المشاريع</span>
          <div className="text-2xl font-black text-white font-mono">{projects.length}</div>
        </div>
        <div className="bg-obsidian-card border border-lord-gold/30 rounded-2xl p-4 shadow-lg">
          <span className="text-xs text-lord-gold block mb-1">الميزانيات المخصصة للمشاريع</span>
          <div className="text-2xl font-black text-white font-mono">${totalAllocated.toLocaleString()} <span className="text-xs text-lord-gold font-normal">USDT</span></div>
        </div>
        <div className="bg-obsidian-card border border-emerald-500/30 rounded-2xl p-4 shadow-lg">
          <span className="text-xs text-emerald-400 block mb-1">إجمالي المصروف الفعلي</span>
          <div className="text-2xl font-black text-white font-mono">${totalSpent.toLocaleString()} <span className="text-xs text-emerald-400 font-normal">USDT</span></div>
        </div>
        <div className="bg-obsidian-card border border-cyber-blue/30 rounded-2xl p-4 shadow-lg">
          <span className="text-xs text-cyber-blue block mb-1">الميزانية المتبقية في السقف</span>
          <div className="text-2xl font-black text-white font-mono">${Math.max(0, totalAllocated - totalSpent).toLocaleString()} <span className="text-xs text-cyber-blue font-normal">USDT</span></div>
        </div>
      </div>

      {/* View Mode Tabs (Cards vs Interactive Gantt) */}
      <div className="flex items-center justify-between gap-3 bg-obsidian-surface p-2 rounded-2xl border border-gray-800">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setViewMode('CARDS')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${viewMode === 'CARDS'
                ? 'bg-lord-gold text-obsidian-primary shadow-gold-glow'
                : 'text-gray-400 hover:text-white'
              }`}
          >
            <FolderKanban className="w-4 h-4" />
            <span>عرض بطاقات المشاريع ومعالم WBS</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('GANTT')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${viewMode === 'GANTT'
                ? 'bg-lord-gold text-obsidian-primary shadow-gold-glow'
                : 'text-gray-400 hover:text-white'
              }`}
          >
            <Calendar className="w-4 h-4" />
            <span>مخطط جانت التفاعلي (Gantt Timeline) 📊</span>
          </button>
        </div>

        <span className="text-[11px] text-gray-400 font-mono hidden sm:inline-block">
          {projects.length} مشاريع مسجلة
        </span>
      </div>

      {/* Render Gantt View if active */}
      {viewMode === 'GANTT' ? (
        <InteractiveGanttChart projects={projects} />
      ) : (
        /* Projects Cards Grid */
        <div className="space-y-6">
          {projects.length === 0 ? (
            <div className="bg-obsidian-card border border-gray-800 rounded-3xl p-12 text-center text-gray-500 space-y-3">
              <FolderKanban className="w-12 h-12 mx-auto text-gray-600 opacity-40" />
              <p className="text-sm font-bold text-gray-400">لا توجد مشاريع مسجلة حالياً</p>
              <p className="text-xs max-w-sm mx-auto">
                اضغط على زر "مشروع جديد +" لإنشاء أول مشروع وتفكيك معالمه آلياً بالذكاء الاصطناعي.
              </p>
            </div>
          ) : (
            projects.map((project) => (
              <ProjectCard
                key={project._id}
                project={project}
                isAdmin={isAdmin}
                isDecomposingAll={isDecomposingAll}
                isDeletingProject={isDeletingProject}
                onSelectPlan={setSelectedProjectPlan}
                onDecomposeAll={handleDecomposeAll}
                onDecomposeMilestone={handleDecomposeMilestone}
                onOpenEdit={handleOpenEdit}
                onDeleteProject={handleDeleteProject}
                onQuickStatusChange={handleQuickStatusChange}
              />
            ))
          )}
        </div>
      )}

      {/* Project Creation Modal */}
      <CreateProjectModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        createMode={createMode}
        setCreateMode={setCreateMode}
        title={title}
        setTitle={setTitle}
        description={description}
        setDescription={setDescription}
        allocatedBudget={allocatedBudget}
        setAllocatedBudget={setAllocatedBudget}
        targetDays={targetDays}
        setTargetDays={setTargetDays}
        isGeneratingAI={isGeneratingAI}
        onSubmit={handleCreateProjectSubmit}
      />

      {/* Detailed Project Plan & WBS Breakdown Modal */}
      <ProjectPlanModal
        project={selectedProjectPlan}
        isOpen={!!selectedProjectPlan}
        onClose={() => setSelectedProjectPlan(null)}
        isAdmin={isAdmin}
        isDecomposingAll={isDecomposingAll}
        isDeletingProject={isDeletingProject}
        onDecomposeAll={handleDecomposeAll}
        onDecomposeMilestone={handleDecomposeMilestone}
        onOpenEdit={handleOpenEdit}
        onDeleteProject={handleDeleteProject}
      />

      {/* Edit Project Modal */}
      <EditProjectModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        employees={employees}
        editTitle={editTitle}
        setEditTitle={setEditTitle}
        editDescription={editDescription}
        setEditDescription={setEditDescription}
        editStatus={editStatus}
        setEditStatus={setEditStatus}
        editAllocatedBudget={editAllocatedBudget}
        setEditAllocatedBudget={setEditAllocatedBudget}
        editTargetEndDate={editTargetEndDate}
        setEditTargetEndDate={setEditTargetEndDate}
        editTeamMembers={editTeamMembers}
        setEditTeamMembers={setEditTeamMembers}
        isUpdatingProject={isUpdatingProject}
        onSubmit={handleSaveEditProject}
      />
    </div>
  );
}
