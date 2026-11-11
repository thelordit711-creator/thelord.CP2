'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { FolderKanban, Plus, Calendar, AlertTriangle } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { AppModalPortal } from '../../../components/ui/AppModalPortal';
import { useGetAllEmployeesQuery } from '../../../store/api/usersApi';
import { useGetVaultQuery } from '../../../store/api/financeApi';
import {
  useGetProjectsQuery,
  useAiGenerateProjectPlanMutation,
  useCreateProjectMutation,
  useUpdateProjectMutation,
  useDeleteProjectMutation,
  useDecomposeMilestoneMutation,
  useDecomposeAllMilestonesMutation,
  useOpenProjectChannelMutation
} from '../../../store/api/projectsApi';
import { useSocket } from '../../../providers/SocketProvider';
import { InteractiveGanttChart } from '../../../components/projects/InteractiveGanttChart';
import { ProjectCard } from '../../../components/projects/cards/ProjectCard';
import { CreateProjectModal, ManualMilestoneDraft } from '../../../components/projects/modals/CreateProjectModal';
import { ProjectPlanModal } from '../../../components/projects/modals/ProjectPlanModal';
import { EditProjectModal, EditMilestoneItem } from '../../../components/projects/modals/EditProjectModal';
import { toast } from 'sonner';

function ProjectsContent() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const locale = (params?.locale as string) || 'ar';
  const queryProjectId = searchParams?.get('projectId');

  const { socket } = useSocket();
  const { data: employeesRes } = useGetAllEmployeesQuery();
  const { data: vaultRes } = useGetVaultQuery();
  const { data: projectsRes, isLoading, refetch } = useGetProjectsQuery();

  const [aiGeneratePlan, { isLoading: isGeneratingAI }] = useAiGenerateProjectPlanMutation();
  const [createProject] = useCreateProjectMutation();
  const [updateProject, { isLoading: isUpdatingProject }] = useUpdateProjectMutation();
  const [deleteProject, { isLoading: isDeletingProject }] = useDeleteProjectMutation();
  const [decomposeMilestone] = useDecomposeMilestoneMutation();
  const [decomposeAll, { isLoading: isDecomposingAll }] = useDecomposeAllMilestonesMutation();
  const [openProjectChannel] = useOpenProjectChannelMutation();

  const employees = employeesRes?.data || [];
  const projects = projectsRes?.data || [];
  const vault = vaultRes?.data;

  const [currentUser, setCurrentUser] = useState<any>(null);
  const [viewMode, setViewMode] = useState<'CARDS' | 'GANTT'>('CARDS');

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createMode, setCreateMode] = useState<'AI' | 'MANUAL'>('AI');
  const [selectedProjectPlan, setSelectedProjectPlan] = useState<any | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; title: string } | null>(null);

  // Edit Project States
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingProjectId, setEditingProjectId] = useState<string>('');
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editStatus, setEditStatus] = useState('ACTIVE');
  const [editAllocatedBudget, setEditAllocatedBudget] = useState(2500);
  const [editTargetEndDate, setEditTargetEndDate] = useState('');
  const [editTeamMembers, setEditTeamMembers] = useState<string[]>([]);
  const [editObjectivesText, setEditObjectivesText] = useState('');
  const [editMilestones, setEditMilestones] = useState<EditMilestoneItem[]>([]);

  // Form states for creation
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [allocatedBudget, setAllocatedBudget] = useState(2500);
  const [targetDays, setTargetDays] = useState(14);
  const [teamMembers, setTeamMembers] = useState<string[]>([]);
  const [manualMilestones, setManualMilestones] = useState<ManualMilestoneDraft[]>([
    { title: 'المعلم 1: الإعداد والتجهيز الأولي', description: 'تجهيز خطة العمل والمتطلبات', daysFromStart: 4 }
  ]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('lord_current_user');
        if (stored) setCurrentUser(JSON.parse(stored));
      } catch {}
    }
  }, []);

  // Open project modal if linked via ?projectId=
  useEffect(() => {
    if (queryProjectId && projects.length > 0 && !selectedProjectPlan) {
      const target = projects.find((p) => p._id === queryProjectId);
      if (target) setSelectedProjectPlan(target);
    }
  }, [queryProjectId, projects, selectedProjectPlan]);

  // Keep open plan modal synced when project refreshes
  useEffect(() => {
    if (selectedProjectPlan) {
      const fresh = projects.find((p) => p._id === selectedProjectPlan._id);
      if (fresh) setSelectedProjectPlan(fresh);
    }
  }, [projects, selectedProjectPlan?._id]);

  // Socket real-time updates
  useEffect(() => {
    if (!socket) return;

    const handleProjectCreated = (newProj: any) => {
      refetch();
      if (newProj?.title) toast.info(`مشروع جديد: ${newProj.title}`);
    };
    const handleRefresh = () => refetch();

    socket.on('project:created', handleProjectCreated);
    socket.on('project:updated', handleRefresh);
    socket.on('project:deleted', handleRefresh);
    socket.on('task:updated', handleRefresh);

    return () => {
      socket.off('project:created', handleProjectCreated);
      socket.off('project:updated', handleRefresh);
      socket.off('project:deleted', handleRefresh);
      socket.off('task:updated', handleRefresh);
    };
  }, [socket, refetch]);

  const handleCreateProjectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetEndDate = new Date(Date.now() + Math.max(1, targetDays) * 86400000).toISOString();
    const selectedTeam =
      teamMembers.length > 0
        ? teamMembers
        : currentUser?._id
        ? [currentUser._id]
        : [];

    if (createMode === 'AI') {
      try {
        const planRes = await aiGeneratePlan({
          title,
          description,
          allocatedBudget,
          targetDays
        }).unwrap();

        if (!planRes.success || !planRes.data) {
          throw new Error(planRes.error || 'فشل التوليد بالذكاء الاصطناعي');
        }

        const aiPlan = planRes.data;
        const created = await createProject({
          title,
          description,
          code: aiPlan.code,
          allocatedBudget,
          targetEndDate,
          objectives: aiPlan.objectives,
          requirements: aiPlan.requirements,
          toolsAndResources: aiPlan.toolsAndResources,
          teamMembers: selectedTeam,
          wbsMilestones: (aiPlan.milestones || []).map((m) => ({
            title: m.title,
            description: m.description,
            dueDate: new Date(Date.now() + (m.daysFromStart || 3) * 86400000).toISOString(),
            isCompleted: false,
            suggestedAssigneeId: m.tasks?.[0]?.suggestedAssigneeId || undefined,
            assignedTasks: []
          }))
        }).unwrap();

        if (!created.success) throw new Error(created.error || 'فشل حفظ المشروع');

        toast.success('تم بناء المشروع وتفكيك معالمه بالذكاء الاصطناعي بنجاح! ✨');
        setIsCreateModalOpen(false);
        setTitle('');
        setDescription('');
        setTeamMembers([]);
      } catch (err: any) {
        toast.error(err?.data?.error || err?.message || 'حدث خطأ أثناء التوليد');
      }
    } else {
      try {
        const created = await createProject({
          title,
          description,
          code: `PRJ-${Math.floor(1000 + Math.random() * 9000)}`,
          allocatedBudget,
          targetEndDate,
          objectives: ['تحقيق أهداف المشروع التشغيلية'],
          requirements: ['التنفيذ الفني المتقن للمراحل'],
          toolsAndResources: ['نظام TheLord Cloud'],
          teamMembers: selectedTeam,
          wbsMilestones: manualMilestones.map((m) => ({
            title: m.title,
            description: m.description,
            dueDate: new Date(Date.now() + Math.max(1, m.daysFromStart) * 86400000).toISOString(),
            isCompleted: false,
            assignedTasks: []
          }))
        }).unwrap();

        if (!created.success) throw new Error(created.error || 'فشل حفظ المشروع');

        toast.success('تم إنشاء المشروع بنجاح!');
        setIsCreateModalOpen(false);
        setTitle('');
        setDescription('');
        setTeamMembers([]);
      } catch (err: any) {
        toast.error(err?.data?.error || err?.message || 'حدث خطأ أثناء إنشاء المشروع');
      }
    }
  };

  const handleDecomposeMilestone = async (projectId: string, milestoneIndex: number) => {
    try {
      const res = await decomposeMilestone({ projectId, milestoneIndex }).unwrap();
      if (!res.success) throw new Error(res.error || 'فشل تحويل المعلم لمهمة');
      toast.success('تم تحويل المعلم إلى مهمة تنفيذية وإضافتها لمحرك المراحل! 📋');
    } catch (err: any) {
      toast.error(err?.data?.error || err?.message || 'حدث خطأ أثناء تحويل المعلم');
    }
  };

  const handleDecomposeAll = async (projectId: string) => {
    try {
      const res = await decomposeAll(projectId).unwrap();
      if (!res.success) throw new Error(res.error || 'فشل تحويل خطة المشروع');
      toast.success(res.message || 'تم تحويل خطة المشروع إلى مهام تنفيذية وتوزيعها على الكادر! 🚀');
    } catch (err: any) {
      toast.error(err?.data?.error || err?.message || 'حدث خطأ أثناء تحويل الخطة');
    }
  };

  const handleOpenEdit = (project: any) => {
    setEditingProjectId(project._id);
    setEditTitle(project.title || '');
    setEditDescription(project.description || '');
    setEditStatus(project.status || 'ACTIVE');
    setEditAllocatedBudget(project.allocatedBudget || 0);
    setEditTargetEndDate(
      project.targetEndDate ? new Date(project.targetEndDate).toISOString().slice(0, 10) : ''
    );
    setEditTeamMembers((project.teamMembers || []).map((m: any) => m?._id || m));
    setEditObjectivesText((project.objectives || []).join('\n'));
    setEditMilestones(
      (project.wbsMilestones || []).map((m: any) => ({
        _id: m._id,
        title: m.title || '',
        description: m.description || '',
        dueDate: m.dueDate ? new Date(m.dueDate).toISOString().slice(0, 10) : '',
        isCompleted: Boolean(m.isCompleted),
        assignedTasks: m.assignedTasks || []
      }))
    );
    setIsEditModalOpen(true);
  };

  const handleSaveEditProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProjectId) return;
    try {
      const res = await updateProject({
        id: editingProjectId,
        data: {
          title: editTitle,
          description: editDescription,
          status: editStatus as any,
          allocatedBudget: editAllocatedBudget,
          targetEndDate: editTargetEndDate ? new Date(editTargetEndDate).toISOString() : undefined,
          teamMembers: editTeamMembers,
          objectives: editObjectivesText
            .split('\n')
            .map((l) => l.trim())
            .filter(Boolean),
          wbsMilestones: editMilestones.map((m) => ({
            ...(m._id ? { _id: m._id } : {}),
            title: m.title,
            description: m.description,
            dueDate: m.dueDate ? new Date(m.dueDate).toISOString() : undefined,
            isCompleted: m.isCompleted
          })) as any
        }
      }).unwrap();

      if (!res.success) throw new Error(res.error || 'فشل تعديل المشروع');

      toast.success('تم تحديث بيانات وسجلات المشروع بنجاح! 💾');
      setIsEditModalOpen(false);
    } catch (err: any) {
      toast.error(err?.data?.error || err?.message || 'حدث خطأ أثناء تعديل المشروع');
    }
  };

  const handleConfirmDeleteProject = async () => {
    if (!deleteTarget) return;
    try {
      const res = await deleteProject(deleteTarget.id).unwrap();
      if (!res.success) throw new Error(res.error || 'فشل حذف المشروع');
      toast.success('تم حذف المشروع نهائياً من النظام!');
      if (selectedProjectPlan?._id === deleteTarget.id) {
        setSelectedProjectPlan(null);
      }
      setDeleteTarget(null);
    } catch (err: any) {
      toast.error(err?.data?.error || err?.message || 'تعذر حذف المشروع');
    }
  };

  const handleQuickStatusChange = async (projectId: string, newStatus: string) => {
    try {
      const res = await updateProject({
        id: projectId,
        data: { status: newStatus as any }
      }).unwrap();
      if (!res.success) throw new Error(res.error || 'فشل تغيير حالة المشروع');
      toast.success(`تم تحديث حالة المشروع إلى: ${newStatus}`);
    } catch (err: any) {
      toast.error(err?.data?.error || err?.message || 'حدث خطأ أثناء تغيير الحالة');
    }
  };

  const handleOpenProjectChat = async (projectId: string) => {
    try {
      const res = await openProjectChannel(projectId).unwrap();
      if (res.success && res.data?.channelId) {
        router.push(`/${locale}/chat?roomId=${encodeURIComponent(res.data.channelId)}`);
      }
    } catch (err: any) {
      toast.error(err?.data?.error || 'تعذر فتح قناة فريق المشروع');
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
                {isAdmin ? 'إشراف المدير التنفيذي' : 'مشاريعي المسندة'}
              </span>
            </div>
            <p className="text-xs text-gray-400 mt-1">
              {isAdmin
                ? 'أهداف المشاريع، الميزانيات المحجوزة، تفكيك المعالم لمهام تنفيذية، والتحكم الصارم بسقف الصرف'
                : 'استعراض أهداف مشاريعك والمعالم المحددة والمهام وقناة الفريق المرتبطة'}
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
          <div className="text-2xl font-black text-white font-mono">
            ${totalAllocated.toLocaleString()} <span className="text-xs text-lord-gold font-normal">USDT</span>
          </div>
        </div>
        <div className="bg-obsidian-card border border-emerald-500/30 rounded-2xl p-4 shadow-lg">
          <span className="text-xs text-emerald-400 block mb-1">إجمالي المصروف الفعلي</span>
          <div className="text-2xl font-black text-white font-mono">
            ${totalSpent.toLocaleString()} <span className="text-xs text-emerald-400 font-normal">USDT</span>
          </div>
        </div>
        <div className="bg-obsidian-card border border-cyber-blue/30 rounded-2xl p-4 shadow-lg">
          <span className="text-xs text-cyber-blue block mb-1">الميزانية المتبقية في السقف</span>
          <div className="text-2xl font-black text-white font-mono">
            ${Math.max(0, totalAllocated - totalSpent).toLocaleString()}{' '}
            <span className="text-xs text-cyber-blue font-normal">USDT</span>
          </div>
        </div>
      </div>

      {/* View Mode Tabs */}
      <div className="flex items-center justify-between gap-3 bg-obsidian-surface p-2 rounded-2xl border border-gray-800">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setViewMode('CARDS')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              viewMode === 'CARDS'
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
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              viewMode === 'GANTT'
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

      {viewMode === 'GANTT' ? (
        <InteractiveGanttChart projects={projects as any} onSelectProject={(p) => setSelectedProjectPlan(p)} />
      ) : (
        <div className="space-y-6">
          {projects.length === 0 ? (
            <div className="bg-obsidian-card border border-gray-800 rounded-3xl p-12 text-center text-gray-500 space-y-3">
              <FolderKanban className="w-12 h-12 mx-auto text-gray-600 opacity-40" />
              <p className="text-sm font-bold text-gray-400">لا توجد مشاريع مسجلة حالياً</p>
              <p className="text-xs max-w-sm mx-auto">
                {isAdmin
                  ? 'اضغط على زر "مشروع جديد +" لإنشاء أول مشروع وتفكيك معالمه آلياً بالذكاء الاصطناعي.'
                  : 'لم يتم إسنادك إلى أي مشروع نشط حتى الآن.'}
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
                onDeleteProject={(id, projTitle) => setDeleteTarget({ id, title: projTitle })}
                onQuickStatusChange={handleQuickStatusChange}
                onOpenProjectChat={handleOpenProjectChat}
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
        employees={employees}
        teamMembers={teamMembers}
        setTeamMembers={setTeamMembers}
        manualMilestones={manualMilestones}
        setManualMilestones={setManualMilestones}
        vaultLiquidity={
          vault ? { generalBudget: vault.generalBudget || 0, treasuryBalance: vault.treasuryBalance || 0 } : undefined
        }
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
        onDeleteProject={(id, projTitle) => setDeleteTarget({ id, title: projTitle })}
        onOpenProjectChat={handleOpenProjectChat}
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
        editObjectivesText={editObjectivesText}
        setEditObjectivesText={setEditObjectivesText}
        editMilestones={editMilestones}
        setEditMilestones={setEditMilestones}
        isUpdatingProject={isUpdatingProject}
        onSubmit={handleSaveEditProject}
      />

      {/* Branded Delete Confirmation Modal */}
      <AppModalPortal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        maxWidthClassName="max-w-md"
      >
        <div className="bg-obsidian-surface border-2 border-red-500/50 rounded-3xl p-6 shadow-2xl space-y-4 text-right">
          <div className="flex items-center gap-3 text-red-400">
            <AlertTriangle className="w-6 h-6 shrink-0" />
            <h3 className="text-base font-black text-white">تأكيد حذف المشروع نهائياً</h3>
          </div>
          <p className="text-xs text-gray-300 leading-relaxed">
            هل أنت متأكد من رغبتك بحذف المشروع <strong className="text-white">"{deleteTarget?.title}"</strong> نهائياً؟ سيتم فك ارتباط المهام التابعة له دون حذف السجلات المالية المصروفة.
          </p>
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-800">
            <Button type="button" variant="ghost" size="sm" onClick={() => setDeleteTarget(null)}>
              إلغاء
            </Button>
            <Button
              type="button"
              variant="danger"
              size="sm"
              isLoading={isDeletingProject}
              onClick={handleConfirmDeleteProject}
            >
              تأكيد الحذف النهائي
            </Button>
          </div>
        </div>
      </AppModalPortal>
    </div>
  );
}

export default function ProjectsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex-1 flex items-center justify-center p-12 text-lord-gold">
          <span>جاري تهيئة وحدة المشاريع...</span>
        </div>
      }
    >
      <ProjectsContent />
    </Suspense>
  );
}
