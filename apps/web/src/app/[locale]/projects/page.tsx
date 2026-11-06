'use client';

import React, { useState, useEffect } from 'react';
import {
  FolderKanban,
  Plus,
  Sparkles,
  Layers,
  Coins,
  Calendar,
  Users,
  CheckCircle2,
  Clock,
  ArrowRight,
  TrendingUp,
  AlertCircle,
  X,
  Loader2,
  FileText,
  Edit3,
  Trash2,
  CheckCircle
} from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { useGetAllEmployeesQuery } from '../../../store/api/usersApi';
import { useSocket } from '../../../providers/SocketProvider';
import { toast } from 'sonner';

export default function ProjectsPage() {
  const { socket } = useSocket();
  const { data: employeesRes } = useGetAllEmployeesQuery();
  const employees = employeesRes?.data || [];

  const [currentUser, setCurrentUser] = useState<any>(null);
  const [projects, setProjects] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
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

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('lord_current_user');
        if (stored) setCurrentUser(JSON.parse(stored));
      } catch (e) {}
    }
  }, []);

  // Form states
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [allocatedBudget, setAllocatedBudget] = useState(2500);
  const [targetDays, setTargetDays] = useState(14);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';

  const fetchProjects = async () => {
    try {
      const token = localStorage.getItem('lord_auth_token');
      const res = await fetch(`${apiUrl}/projects`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success && data.data) {
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
      socket.on('project:created', () => fetchProjects());
      socket.on('project:updated', () => fetchProjects());
      socket.on('project:deleted', (data: any) => {
        fetchProjects();
        if (selectedProjectPlan && selectedProjectPlan._id === data?.projectId) {
          setSelectedProjectPlan(null);
        }
      });
    }

    return () => {
      if (socket) {
        socket.off('project:created');
        socket.off('project:updated');
        socket.off('project:deleted');
      }
    };
  }, [socket]);

  // Handle AI Project Generation & Creation
  const handleCreateProjectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) {
      toast.error('يرجى إدخال عنوان ووصف المشروع');
      return;
    }

    const token = localStorage.getItem('lord_auth_token');
    const targetEndDate = new Date(Date.now() + targetDays * 86400000);

    if (createMode === 'AI') {
      setIsGeneratingAI(true);
      try {
        // 1. Call Gemini to decompose into WBS milestones
        const aiRes = await fetch(`${apiUrl}/ai/generate-project`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            title,
            description,
            budget: allocatedBudget,
            targetDays
          })
        });
        const aiData = await aiRes.json();
        const generated = aiData?.data || {};

        const milestonesFormatted = (generated.milestones || []).map((m: any) => ({
          title: m.title,
          description: m.description,
          dueDate: new Date(Date.now() + (m.daysFromStart || 5) * 86400000),
          isCompleted: false,
          assignedTasks: []
        }));

        // 2. Save project to MongoDB
        const createRes = await fetch(`${apiUrl}/projects`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            title,
            code: generated.code || `PRJ-${Math.floor(1000 + Math.random() * 9000)}`,
            description,
            objectives: generated.objectives || ['تحقيق أهداف المشروع'],
            requirements: generated.requirements || ['مراجعة متطلبات العمل'],
            toolsAndResources: generated.toolsAndResources || ['TheLord ERP Platform'],
            allocatedBudget: Number(allocatedBudget),
            targetEndDate,
            teamMembers: employees.slice(0, 3).map(e => e._id),
            wbsMilestones: milestonesFormatted
          })
        });

        const created = await createRes.json();
        if (!created.success) throw new Error(created.error || 'فشل حفظ المشروع');

        toast.success('تم بناء المشروع وتفكيك معالم WBS بالذكاء الاصطناعي بنجاح! 🚀');
        setIsCreateModalOpen(false);
        setTitle('');
        setDescription('');
        fetchProjects();
      } catch (err: any) {
        toast.error(err.message || 'حدث خطأ أثناء إنشاء المشروع');
      } finally {
        setIsGeneratingAI(false);
      }
    } else {
      // Manual creation
      try {
        const createRes = await fetch(`${apiUrl}/projects`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            title,
            description,
            allocatedBudget: Number(allocatedBudget),
            targetEndDate,
            teamMembers: employees.slice(0, 3).map(e => e._id),
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
      const token = localStorage.getItem('lord_auth_token');
      const res = await fetch(`${apiUrl}/projects/${projectId}/decompose-milestone`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
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
      const token = localStorage.getItem('lord_auth_token');
      const res = await fetch(`${apiUrl}/projects/${projectId}/decompose-all`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
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
      const token = localStorage.getItem('lord_auth_token');
      const res = await fetch(`${apiUrl}/projects/${editingProjectId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          title: editTitle.trim(),
          description: editDescription.trim(),
          status: editStatus,
          allocatedBudget: Number(editAllocatedBudget),
          targetEndDate: editTargetEndDate ? new Date(editTargetEndDate) : undefined,
          teamMembers: editTeamMembers
        })
      });

      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'فشل تحديث بيانات المشروع');

      toast.success('تم تحديث المشروع وسجلاته بنجاح! 💾');
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
    const confirmDelete = window.confirm(`هل أنت متأكد من حذف مشروع "${projectTitle}" نهائياً وجميع بياناته؟`);
    if (!confirmDelete) return;

    setIsDeletingProject(true);
    try {
      const token = localStorage.getItem('lord_auth_token');
      const res = await fetch(`${apiUrl}/projects/${projectId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });

      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'فشل حذف المشروع');

      toast.success('تم حذف المشروع نهائياً بنجاح 🗑️');
      if (selectedProjectPlan && selectedProjectPlan._id === projectId) {
        setSelectedProjectPlan(null);
      }
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
      const token = localStorage.getItem('lord_auth_token');
      const res = await fetch(`${apiUrl}/projects/${projectId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
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

  if (currentUser && currentUser.accessRole !== 'SUPER_ADMIN') {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-4">
        <div className="w-16 h-16 rounded-3xl bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400">
          <FolderKanban className="w-8 h-8" />
        </div>
        <h2 className="text-lg font-bold text-white">مساحة مخصصة للإدارة العليا والقيادة التنفيذية</h2>
        <p className="text-xs text-gray-400 max-w-md">
          إدارة المشاريع الاستراتيجية وتفكيك معالم WBS متاحة للمسؤول التنفيذي فقط. يمكنك استعراض مهامك المسندة إليك عبر مساحة العمل أو لوحة المهام.
        </p>
      </div>
    );
  }

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
              <h1 className="text-xl md:text-2xl font-black text-white">إدارة المشاريع الاستراتيجية ومحرك WBS</h1>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-lord-gold/20 text-lord-gold border border-lord-gold/40 font-bold">
                Enterprise Suite
              </span>
            </div>
            <p className="text-xs text-gray-400 mt-1">
              أهداف المشاريع، الميزانيات المحجوزة، تفكيك المعالم لمهام تنفيذية، والتحكم الصارم بسقف الصرف
            </p>
          </div>
        </div>

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

      {/* Projects Cards Grid */}
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
          projects.map((project) => {
            const spentPercent = project.allocatedBudget > 0
              ? Math.min(100, Math.round((project.spentBudget / project.allocatedBudget) * 100))
              : 0;

            return (
              <div
                key={project._id}
                className="bg-obsidian-card border border-obsidian-border hover:border-lord-gold/40 rounded-3xl p-6 shadow-xl space-y-5 transition-all"
              >
                {/* Project Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-gray-800">
                  <div className="flex items-center gap-3">
                    <span className="px-3 py-1 rounded-xl bg-lord-gold/15 border border-lord-gold/30 text-lord-gold font-mono font-black text-xs">
                      {project.code}
                    </span>
                    <div>
                      <h3 className="text-base font-black text-white">{project.title}</h3>
                      <p className="text-xs text-gray-400 mt-0.5">{project.description}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={() => setSelectedProjectPlan(project)}
                      className="px-3 py-1.5 rounded-xl bg-obsidian-surface border border-gray-700 hover:border-lord-gold text-xs font-bold text-gray-200 hover:text-white transition-all flex items-center gap-1.5 shadow-md"
                    >
                      <FileText className="w-3.5 h-3.5 text-lord-gold" />
                      <span>عرض الخطة 📋</span>
                    </button>

                    <button
                      type="button"
                      disabled={isDecomposingAll}
                      onClick={() => handleDecomposeAll(project._id)}
                      className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-lord-gold to-yellow-600 text-obsidian-primary text-xs font-black shadow-gold-glow hover:brightness-110 active:scale-95 transition-all flex items-center gap-1.5"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>تحويل الخطة لمهام 🚀</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleOpenEdit(project)}
                      className="px-2.5 py-1.5 rounded-xl bg-obsidian-surface border border-gray-700 hover:border-lord-gold text-xs font-bold text-gray-200 hover:text-white transition-all flex items-center gap-1 shadow-md"
                      title="تعديل بيانات المشروع"
                    >
                      <Edit3 className="w-3.5 h-3.5 text-lord-gold" />
                      <span>تعديل</span>
                    </button>

                    <button
                      type="button"
                      disabled={isDeletingProject}
                      onClick={() => handleDeleteProject(project._id, project.title)}
                      className="px-2.5 py-1.5 rounded-xl bg-red-500/10 border border-red-500/30 hover:bg-red-500/20 text-xs font-bold text-red-400 transition-all flex items-center gap-1 shadow-md"
                      title="حذف المشروع نهائياً"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>حذف</span>
                    </button>

                    {/* Quick Status Selector */}
                    <select
                      value={project.status || 'ACTIVE'}
                      onChange={(e) => handleQuickStatusChange(project._id, e.target.value)}
                      className={`px-2.5 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                        project.status === 'COMPLETED'
                          ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400'
                          : project.status === 'ACTIVE'
                          ? 'bg-lord-gold/15 border-lord-gold/40 text-lord-gold'
                          : project.status === 'ON_HOLD'
                          ? 'bg-amber-500/15 border-amber-500/40 text-amber-400'
                          : 'bg-gray-800 border-gray-700 text-gray-300'
                      }`}
                    >
                      <option value="PLANNING">قيد التخطيط 📋</option>
                      <option value="ACTIVE">نشط قيد التنفيذ ⚡</option>
                      <option value="ON_HOLD">معلق مؤقتاً ⏸️</option>
                      <option value="COMPLETED">مكتمل 100% 🏆</option>
                    </select>
                  </div>
                </div>

                {/* Objectives & Resources */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div className="p-3 bg-obsidian-surface/60 rounded-2xl border border-gray-800 space-y-1.5">
                    <span className="font-bold text-lord-gold block">الأهداف الاستراتيجية:</span>
                    <ul className="text-gray-300 space-y-1 list-disc list-inside">
                      {(project.objectives || []).slice(0, 3).map((obj: string, idx: number) => (
                        <li key={idx} className="line-clamp-1">{obj}</li>
                      ))}
                    </ul>
                  </div>

                  {/* Budget & Spend Hard Ceiling Indicator */}
                  <div className="p-3 bg-obsidian-surface/60 rounded-2xl border border-gray-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-cyber-blue">سقف ميزانية المشروع:</span>
                      <span className="font-mono text-white font-bold">
                        ${(project.spentBudget || 0).toLocaleString()} / ${(project.allocatedBudget || 0).toLocaleString()} USDT
                      </span>
                    </div>
                    <div className="w-full bg-gray-800 h-2 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          spentPercent > 90 ? 'bg-status-danger' : spentPercent > 70 ? 'bg-amber-400' : 'bg-lord-gold'
                        }`}
                        style={{ width: `${spentPercent}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[10px] text-gray-500">
                      <span>استهلاك الميزانية: {spentPercent}%</span>
                      <span>سقف حرج يمنع التجاوز</span>
                    </div>
                  </div>
                </div>

                {/* WBS Milestones Breakdown */}
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white flex items-center gap-1.5">
                      <Layers className="w-4 h-4 text-lord-gold" />
                      <span>معالم هيكل تفكيك العمل (WBS Milestones - {project.wbsMilestones?.length || 0}):</span>
                    </span>
                    <span className="text-[10px] text-gray-400">تحويل أي معلم لمهمة بضغطة زر</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {(project.wbsMilestones || []).map((milestone: any, mIdx: number) => {
                      const hasAssignedTasks = milestone.assignedTasks?.length > 0;
                      return (
                        <div
                          key={mIdx}
                          className="p-3 bg-obsidian-primary/80 border border-gray-800 rounded-2xl space-y-2 flex flex-col justify-between"
                        >
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-[10px] text-gray-400 font-mono">المعلم #{mIdx + 1}</span>
                              {milestone.dueDate && (
                                <span className="text-[10px] text-amber-400 font-mono">
                                  {new Date(milestone.dueDate).toLocaleDateString('ar-YE', { month: 'numeric', day: 'numeric' })}
                                </span>
                              )}
                            </div>
                            <h4 className="text-xs font-bold text-white line-clamp-1">{milestone.title}</h4>
                            <p className="text-[11px] text-gray-400 line-clamp-2 mt-0.5">{milestone.description}</p>
                          </div>

                          <div className="pt-2 border-t border-gray-800 flex items-center justify-between">
                            {hasAssignedTasks ? (
                              <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-1">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>مهمة تنفيذية نشطة</span>
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleDecomposeMilestone(project._id, mIdx)}
                                className="text-[10px] px-2.5 py-1 rounded-xl bg-lord-gold/20 text-lord-gold hover:bg-lord-gold hover:text-obsidian-primary font-bold transition-all flex items-center gap-1"
                              >
                                <ArrowRight className="w-3 h-3" />
                                <span>تحويل إلى مهمة 🚀</span>
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Project Creation Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-fadeIn">
          <div className="bg-obsidian-surface border-2 border-lord-gold/60 rounded-3xl max-w-2xl w-full p-6 md:p-8 shadow-2xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-gray-800">
              <div className="flex items-center gap-2">
                <FolderKanban className="w-5 h-5 text-lord-gold" />
                <h3 className="text-base font-black text-white">إنشاء مشروع استراتيجي جديد</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Mode Switcher */}
            <div className="flex items-center bg-obsidian-card p-1 rounded-2xl border border-gray-800 text-xs">
              <button
                type="button"
                onClick={() => setCreateMode('AI')}
                className={`flex-1 py-2 rounded-xl font-bold flex items-center justify-center gap-1.5 transition-all ${
                  createMode === 'AI'
                    ? 'bg-lord-gold text-obsidian-primary shadow-gold-glow'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <Sparkles className="w-4 h-4" />
                <span>توليد وتفكيك بالذكاء الاصطناعي (TheLordAI WBS) ✨</span>
              </button>
              <button
                type="button"
                onClick={() => setCreateMode('MANUAL')}
                className={`flex-1 py-2 rounded-xl font-bold flex items-center justify-center gap-1.5 transition-all ${
                  createMode === 'MANUAL'
                    ? 'bg-purple-600 text-white shadow-sm'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <span>إدخال يدوي ✍️</span>
              </button>
            </div>

            <form onSubmit={handleCreateProjectSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-gray-300 block mb-1">عنوان المشروع:</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="مثال: حملة إعلانات تليجرام وتوسيع قنوات VIP..."
                  className="w-full bg-obsidian-card border border-gray-800 rounded-xl px-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-lord-gold"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-gray-300 block mb-1">وصف المشروع وأهدافه الرئيسية:</label>
                <textarea
                  required
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="اشرح نطاق المشروع، وسيقوم الذكاء الاصطناعي باستخراج الأهداف والمتطلبات ومعالم WBS..."
                  className="w-full bg-obsidian-card border border-gray-800 rounded-xl px-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-lord-gold leading-relaxed"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-gray-300 block mb-1">
                    الميزانية المخصصة للمشروع (USDT):
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={allocatedBudget}
                    onChange={(e) => setAllocatedBudget(Number(e.target.value))}
                    className="w-full bg-obsidian-card border border-gray-800 rounded-xl px-3 py-2 text-xs text-white font-mono focus:border-lord-gold"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-300 block mb-1">
                    المدة الزمنية المقدرة للتنفيذ (أيام):
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={targetDays}
                    onChange={(e) => setTargetDays(Number(e.target.value))}
                    className="w-full bg-obsidian-card border border-gray-800 rounded-xl px-3 py-2 text-xs text-white font-mono focus:border-lord-gold"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-gray-800 flex justify-end gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsCreateModalOpen(false)}
                >
                  إلغاء
                </Button>
                <Button
                  type="submit"
                  variant="gold"
                  size="sm"
                  disabled={isGeneratingAI}
                  className="rounded-xl shadow-gold-glow font-bold"
                >
                  {isGeneratingAI ? (
                    <span className="flex items-center gap-1.5">
                      <Loader2 className="w-4 h-4 animate-spin ml-1" />
                      جاري بناء وتفكيك المشروع عبر Gemini...
                    </span>
                  ) : (
                    <span>اعتماد وإنشاء المشروع 🚀</span>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* DETAILED PROJECT PLAN & WBS BREAKDOWN MODAL */}
      {/* ============================================================== */}
      {selectedProjectPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-fadeIn">
          <div className="bg-obsidian-surface border-2 border-lord-gold/60 rounded-3xl max-w-4xl w-full p-6 md:p-8 shadow-2xl max-h-[92vh] overflow-y-auto space-y-6">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-gray-800 pb-4">
              <div>
                <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                  <span className="px-2.5 py-0.5 rounded-lg bg-lord-gold/20 border border-lord-gold/40 text-lord-gold font-mono font-black text-xs">
                    {selectedProjectPlan.code}
                  </span>
                  <Badge variant={selectedProjectPlan.status === 'COMPLETED' ? 'cyber' : 'gold'}>
                    {selectedProjectPlan.status}
                  </Badge>
                  <span className="text-xs text-gray-400 font-mono">
                    الميزانية: ${selectedProjectPlan.allocatedBudget?.toLocaleString()} USDT
                  </span>
                </div>
                <h2 className="text-xl font-black text-white">{selectedProjectPlan.title}</h2>
                <p className="text-xs text-gray-400 mt-1">{selectedProjectPlan.description}</p>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  disabled={isDecomposingAll}
                  onClick={() => handleDecomposeAll(selectedProjectPlan._id)}
                  className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-lord-gold to-yellow-600 text-obsidian-primary font-black text-xs shadow-gold-glow hover:brightness-110 active:scale-95 transition-all flex items-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>تحويل الخطة كاملة إلى مهام 🚀</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleOpenEdit(selectedProjectPlan)}
                  className="px-3 py-2 rounded-xl bg-obsidian-card border border-gray-700 hover:border-lord-gold text-xs font-bold text-gray-200 hover:text-white transition-all flex items-center gap-1.5 shadow-md"
                >
                  <Edit3 className="w-3.5 h-3.5 text-lord-gold" />
                  <span>تعديل</span>
                </button>

                <button
                  type="button"
                  disabled={isDeletingProject}
                  onClick={() => handleDeleteProject(selectedProjectPlan._id, selectedProjectPlan.title)}
                  className="px-3 py-2 rounded-xl bg-red-500/10 border border-red-500/30 hover:bg-red-500/20 text-xs font-bold text-red-400 transition-all flex items-center gap-1.5 shadow-md"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>حذف</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedProjectPlan(null)}
                  className="p-2 rounded-xl bg-obsidian-card hover:bg-gray-800 text-gray-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Plan Sections Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              {/* Objectives */}
              <div className="p-4 bg-obsidian-card rounded-2xl border border-gray-800 space-y-2">
                <span className="font-bold text-lord-gold flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-lord-gold" />
                  <span>الأهداف الاستراتيجية:</span>
                </span>
                <ul className="text-gray-300 space-y-1.5 list-disc list-inside">
                  {(selectedProjectPlan.objectives || ['تحقيق النمو التشغيلي']).map((item: string, idx: number) => (
                    <li key={idx} className="leading-relaxed">{item}</li>
                  ))}
                </ul>
              </div>

              {/* Requirements */}
              <div className="p-4 bg-obsidian-card rounded-2xl border border-gray-800 space-y-2">
                <span className="font-bold text-blue-400 flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 text-blue-400" />
                  <span>المتطلبات الأساسية:</span>
                </span>
                <ul className="text-gray-300 space-y-1.5 list-disc list-inside">
                  {(selectedProjectPlan.requirements || ['مراجعة المخرجات الفنية']).map((item: string, idx: number) => (
                    <li key={idx} className="leading-relaxed">{item}</li>
                  ))}
                </ul>
              </div>

              {/* Tools & Resources */}
              <div className="p-4 bg-obsidian-card rounded-2xl border border-gray-800 space-y-2">
                <span className="font-bold text-purple-400 flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-purple-400" />
                  <span>الوسائل والأدوات التقنية:</span>
                </span>
                <ul className="text-gray-300 space-y-1.5 list-disc list-inside">
                  {(selectedProjectPlan.toolsAndResources || ['TheLord Cloud Core']).map((item: string, idx: number) => (
                    <li key={idx} className="leading-relaxed">{item}</li>
                  ))}
                </ul>
              </div>
            </div>

            {/* WBS Milestones Execution Table */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between border-b border-gray-800 pb-2">
                <span className="text-sm font-bold text-white flex items-center gap-2">
                  <Layers className="w-4 h-4 text-lord-gold" />
                  <span>جدول معالم خطة المشروع وتوزيع المهام (WBS Milestones):</span>
                </span>
                <span className="text-xs text-gray-400 font-mono">
                  {selectedProjectPlan.wbsMilestones?.filter((m: any) => m.assignedTasks?.length > 0).length} من {selectedProjectPlan.wbsMilestones?.length || 0} معالم محولة لمهام
                </span>
              </div>

              <div className="space-y-2.5">
                {(selectedProjectPlan.wbsMilestones || []).map((milestone: any, mIdx: number) => {
                  const isDecomposed = milestone.assignedTasks?.length > 0;
                  return (
                    <div
                      key={mIdx}
                      className="p-4 rounded-2xl bg-obsidian-card border border-gray-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-md"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded bg-slate-800 text-lord-gold font-mono text-[10px] font-bold">
                            المعلم #{mIdx + 1}
                          </span>
                          <h4 className="text-xs font-bold text-white">{milestone.title}</h4>
                        </div>
                        <p className="text-[11px] text-gray-400 leading-relaxed">{milestone.description}</p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {isDecomposed ? (
                          <span className="px-3 py-1 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-bold flex items-center gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>مهمة تنفيذية نشطة في المحرك</span>
                          </span>
                        ) : (
                          <Button
                            variant="gold"
                            size="sm"
                            onClick={() => handleDecomposeMilestone(selectedProjectPlan._id, mIdx)}
                            className="text-xs font-bold rounded-xl flex items-center gap-1"
                          >
                            <ArrowRight className="w-3.5 h-3.5 ml-1" />
                            <span>تحويل لمهمة الآن</span>
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* EDIT PROJECT MODAL */}
      {/* ============================================================== */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-fadeIn">
          <div className="bg-obsidian-surface border-2 border-lord-gold/60 rounded-3xl max-w-2xl w-full p-6 md:p-8 shadow-2xl max-h-[92vh] overflow-y-auto space-y-5">
            <div className="flex items-center justify-between border-b border-gray-800 pb-3">
              <div className="flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-lord-gold" />
                <h3 className="text-lg font-black text-white">تعديل بيانات وسجلات المشروع</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="p-1.5 rounded-xl bg-obsidian-card hover:bg-gray-800 text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditProject} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-gray-300 block mb-1">عنوان المشروع:</label>
                <input
                  type="text"
                  required
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full bg-obsidian-card border border-gray-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-lord-gold"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-gray-300 block mb-1">وصف المشروع وخطة العمل:</label>
                <textarea
                  required
                  rows={3}
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="w-full bg-obsidian-card border border-gray-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-lord-gold leading-relaxed"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-gray-300 block mb-1">حالة المشروع:</label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value)}
                    className="w-full bg-obsidian-card border border-gray-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-lord-gold"
                  >
                    <option value="PLANNING">قيد التخطيط (PLANNING)</option>
                    <option value="ACTIVE">نشط قيد التنفيذ (ACTIVE)</option>
                    <option value="ON_HOLD">معلق مؤقتاً (ON_HOLD)</option>
                    <option value="COMPLETED">مكتمل 100% (COMPLETED)</option>
                    <option value="CANCELLED">ملغي (CANCELLED)</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-300 block mb-1">سقف الميزانية المخصصة (USDT):</label>
                  <input
                    type="number"
                    min="0"
                    value={editAllocatedBudget}
                    onChange={(e) => setEditAllocatedBudget(Number(e.target.value))}
                    className="w-full bg-obsidian-card border border-gray-800 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-lord-gold"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-300 block mb-1">تاريخ التسليم النهائي المستهدف:</label>
                <input
                  type="date"
                  value={editTargetEndDate}
                  onChange={(e) => setEditTargetEndDate(e.target.value)}
                  className="w-full bg-obsidian-card border border-gray-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-lord-gold"
                />
              </div>

              {/* Team Members Checklist */}
              <div>
                <label className="text-xs font-bold text-gray-300 block mb-1.5">أعضاء الفريق والمسؤولون التنفيذيون:</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-40 overflow-y-auto p-2 bg-obsidian-card rounded-2xl border border-gray-800">
                  {employees.map((emp: any) => {
                    const isSelected = editTeamMembers.includes(emp._id);
                    return (
                      <label
                        key={emp._id}
                        className={`p-2 rounded-xl border text-xs flex items-center justify-between cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-lord-gold/15 border-lord-gold text-white font-bold'
                            : 'bg-obsidian-surface border-gray-800 text-gray-400 hover:text-white'
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate">
                          <span className="w-5 h-5 rounded-full bg-slate-700 flex items-center justify-center text-[10px] shrink-0 font-bold">
                            {emp.fullName?.charAt(0) || 'U'}
                          </span>
                          <span className="truncate">{emp.fullName}</span>
                        </div>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {
                            setEditTeamMembers((prev) =>
                              isSelected ? prev.filter((id) => id !== emp._id) : [...prev, emp._id]
                            );
                          }}
                          className="rounded text-lord-gold"
                        />
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-800">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsEditModalOpen(false)}
                >
                  إلغاء
                </Button>
                <Button
                  type="submit"
                  variant="gold"
                  size="md"
                  isLoading={isUpdatingProject}
                  className="shadow-gold-glow font-bold"
                >
                  حفظ التعديلات 💾
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

