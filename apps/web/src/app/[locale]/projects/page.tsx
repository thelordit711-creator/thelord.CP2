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
  FileText
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

  const [projects, setProjects] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createMode, setCreateMode] = useState<'AI' | 'MANUAL'>('AI');

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
    }

    return () => {
      if (socket) {
        socket.off('project:created');
        socket.off('project:updated');
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

  const totalAllocated = projects.reduce((acc, p) => acc + (p.allocatedBudget || 0), 0);
  const totalSpent = projects.reduce((acc, p) => acc + (p.spentBudget || 0), 0);

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

                  <div className="flex items-center gap-2">
                    <Badge variant={project.status === 'COMPLETED' ? 'cyber' : 'gold'}>
                      {project.status === 'ACTIVE' ? 'نشط قيد التنفيذ ⚡' : project.status}
                    </Badge>
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
    </div>
  );
}

