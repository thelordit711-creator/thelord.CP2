'use client';

import React, { useState } from 'react';
import {
  useGetTasksQuery,
  useSubmitTaskStageMutation,
  useCreateOrProposeTaskMutation
} from '../../../../store/api/tasksApi';
import { useGetMyStatementQuery } from '../../../../store/api/financeApi';
import { useGetAllEmployeesQuery } from '../../../../store/api/usersApi';
import { Button } from '../../../../components/ui/Button';
import { Badge } from '../../../../components/ui/Badge';
import { DirectVoiceRecorder } from '../../../../components/voice/DirectVoiceRecorder';
import {
  Briefcase,
  CheckCircle,
  Clock,
  Layers,
  Send,
  PlusCircle,
  FileText,
  DollarSign,
  AlertTriangle,
  Coffee,
  CheckCircle2,
  Radio,
  LogOut
} from 'lucide-react';
import { toast } from 'sonner';
import { WorkStatus } from '@lord/shared-types';
import { useSocket } from '../../../../providers/SocketProvider';

export default function EmployeeWorkspacePage() {
  const { socket } = useSocket();
  const { data: tasksRes, refetch: refetchTasks } = useGetTasksQuery();
  const { data: statementRes } = useGetMyStatementQuery();
  const { data: employeesRes } = useGetAllEmployeesQuery();

  const [submitStage, { isLoading: isSubmittingStage }] = useSubmitTaskStageMutation();
  const [proposeTask, { isLoading: isProposing }] = useCreateOrProposeTaskMutation();

  const [activeTab, setActiveTab] = useState<'tasks' | 'propose' | 'statement'>('tasks');
  const [selectedTask, setSelectedTask] = useState<any | null>(null);

  // Real-time Socket Listener for Instant Task Assignment & Updates (Zero Reload)
  React.useEffect(() => {
    if (!socket) return;

    const handleTaskAssigned = (data: any) => {
      refetchTasks();
      toast.info('📋 مهمة جديدة أُسندت إليك الآن!', {
        description: data.title ? `${data.title} - انقر للبدء بالتنفيذ` : 'انقر لعرض تفاصيل المهمة ومراحلها',
        duration: 9000
      });
    };

    const handleTaskRefresh = () => {
      refetchTasks();
    };

    socket.on('task:assigned', handleTaskAssigned);
    socket.on('task:created', handleTaskRefresh);
    socket.on('task:updated', handleTaskRefresh);
    socket.on('task:deleted', handleTaskRefresh);

    return () => {
      socket.off('task:assigned', handleTaskAssigned);
      socket.off('task:created', handleTaskRefresh);
      socket.off('task:updated', handleTaskRefresh);
      socket.off('task:deleted', handleTaskRefresh);
    };
  }, [socket, refetchTasks]);

  // Proposal form state
  const [proposalTitle, setProposalTitle] = useState('');
  const [proposalDesc, setProposalDesc] = useState('');
  const [executionType, setExecutionType] = useState<'SELF' | 'DELEGATED_TO_COLLEAGUE'>('SELF');
  const [selectedColleagueId, setSelectedColleagueId] = useState<string>('');
  const [requiresBudget, setRequiresBudget] = useState(false);
  const [budgetAmount, setBudgetAmount] = useState(100);
  const [budgetPayoutMethod, setBudgetPayoutMethod] = useState<'BEP20_USDT' | 'JEEB_WALLET' | 'JAWALI_WALLET'>('BEP20_USDT');

  // Stage Submission state
  const [textSubmission, setTextSubmission] = useState('');
  const [voiceNoteAttachment, setVoiceNoteAttachment] = useState<any | null>(null);

  // Work Status state
  const [workStatus, setWorkStatus] = useState<WorkStatus>('LOGGED_IN');
  const [updatingStatus, setUpdatingStatus] = useState(false);

  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('lord_current_user');
      if (stored) {
        try {
          const user = JSON.parse(stored);
          if (user.workStatus) setWorkStatus(user.workStatus);
        } catch (e) {}
      }
    }
  }, []);

  const handleStatusChange = async (newStatus: WorkStatus) => {
    setUpdatingStatus(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';
      const token = localStorage.getItem('lord_auth_token');
      const res = await fetch(`${apiUrl}/auth/work-status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ workStatus: newStatus })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'فشل تحديث الحالة');
      }

      setWorkStatus(newStatus);
      const stored = localStorage.getItem('lord_current_user');
      if (stored) {
        const user = JSON.parse(stored);
        user.workStatus = newStatus;
        localStorage.setItem('lord_current_user', JSON.stringify(user));
      }
      toast.success('تم تحديث حالة العمل بنجاح!');
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setUpdatingStatus(false);
    }
  };

  const employees = employeesRes?.data || [];
  const tasks = tasksRes?.data || [];
  const statement = statementRes?.data || [];

  const handleProposeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await proposeTask({
        title: proposalTitle,
        description: proposalDesc,
        targetPlatform: 'GENERAL_SYSTEM',
        priority: 'MEDIUM',
        assignedTo: executionType === 'DELEGATED_TO_COLLEAGUE' && selectedColleagueId ? [selectedColleagueId] : [],
        executionType,
        isProposedByEmployee: true,
        financialRequirement: {
          requiresBudget,
          amount: Number(budgetAmount),
          currency: 'USDT',
          payoutMethodRequested: budgetPayoutMethod,
          justification: 'ميزانية مقترحة لتنفيذ المهمة'
        }
      }).unwrap();

      toast.success('تم رفع مقترح المهمة بنجاح للمسؤول!');
      setProposalTitle('');
      setProposalDesc('');
      setRequiresBudget(false);
      setActiveTab('tasks');
      refetchTasks();
    } catch (err: any) {
      toast.error(err?.data?.error || 'حدث خطأ أثناء رفع المقترح');
    }
  };

  const handleStageSubmit = async (taskId: string, stageOrder: number) => {
    try {
      await submitStage({
        taskId,
        stageOrder,
        data: {
          requiredInputs: [
            {
              fieldLabel: 'تقرير وتأكيد التنفيذ',
              textOrUrlValue: textSubmission
            }
          ],
          employeeVoiceNote: voiceNoteAttachment
        }
      }).unwrap();

      toast.success('تم إرسال المرحلة بنجاح إلى المسؤول للمراجعة!');
      setTextSubmission('');
      setVoiceNoteAttachment(null);
      refetchTasks();
    } catch (err: any) {
      toast.error(err?.data?.error || 'فشل في تسليم المرحلة');
    }
  };

  return (
    <div className="flex-1 max-w-7xl w-full mx-auto px-4 py-8 space-y-8">
      {/* Header & Tabs */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold text-cyber-blue tracking-widest uppercase">
            EMPLOYEE WORKSPACE & TALENT HUB
          </span>
          <h1 className="text-2xl md:text-3xl font-black text-white mt-1">
            مساحة عمل الفريق والتنفيذ اللحظي
          </h1>
        </div>

        <div className="flex items-center gap-2 p-1.5 bg-obsidian-surface rounded-2xl border border-obsidian-border text-xs">
          <button
            type="button"
            onClick={() => setActiveTab('tasks')}
            className={`px-4 py-2 rounded-xl font-bold transition-all ${
              activeTab === 'tasks'
                ? 'bg-cyber-blue text-white shadow-blue-glow'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            مهامي ومراحلي
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('propose')}
            className={`px-4 py-2 rounded-xl font-bold transition-all ${
              activeTab === 'propose'
                ? 'bg-lord-gold text-obsidian-primary shadow-gold-glow'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            + اقتراح مهمة جديدة
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('statement')}
            className={`px-4 py-2 rounded-xl font-bold transition-all ${
              activeTab === 'statement'
                ? 'bg-emerald-500 text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            كشف حسابي الشخصي
          </button>
        </div>
      </div>

      {/* Real-time Work Status Switcher Bar */}
      <div className="bg-obsidian-card border border-lord-gold/30 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 rounded-full bg-lord-gold animate-ping" />
          <div>
            <span className="text-xs text-gray-400">حالتك الحالية المسجلة لدى الإدارة:</span>
            <div className="text-sm font-bold text-white flex items-center gap-2">
              {workStatus === 'WORKING' && <span className="text-amber-400">⚡ قيد العمل الفعلي</span>}
              {workStatus === 'LOGGED_IN' && <span className="text-emerald-400">🟢 تم تسجيل الدخول (جاهز للمهام)</span>}
              {workStatus === 'ON_BREAK' && <span className="text-blue-400">☕ في فترة استراحة</span>}
              {workStatus === 'LOGGED_OUT' && <span className="text-red-400">🔴 تم تسجيل الخروج</span>}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            disabled={updatingStatus}
            onClick={() => handleStatusChange('LOGGED_IN')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
              workStatus === 'LOGGED_IN'
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500'
                : 'bg-obsidian-surface border-gray-700 text-gray-400 hover:text-white'
            }`}
          >
            🟢 تسجيل الدخول
          </button>

          <button
            type="button"
            disabled={updatingStatus}
            onClick={() => handleStatusChange('WORKING')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
              workStatus === 'WORKING'
                ? 'bg-amber-500/20 text-amber-300 border-amber-500 shadow-gold-glow animate-pulse'
                : 'bg-obsidian-surface border-gray-700 text-gray-400 hover:text-white'
            }`}
          >
            ⚡ بدء العمل
          </button>

          <button
            type="button"
            disabled={updatingStatus}
            onClick={() => handleStatusChange('ON_BREAK')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
              workStatus === 'ON_BREAK'
                ? 'bg-blue-500/20 text-blue-300 border-blue-500'
                : 'bg-obsidian-surface border-gray-700 text-gray-400 hover:text-white'
            }`}
          >
            ☕ استراحة
          </button>

          <button
            type="button"
            disabled={updatingStatus}
            onClick={() => handleStatusChange('LOGGED_OUT')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
              workStatus === 'LOGGED_OUT'
                ? 'bg-red-500/20 text-red-300 border-red-500'
                : 'bg-obsidian-surface border-gray-700 text-gray-400 hover:text-red-400'
            }`}
          >
            🔴 تسجيل الخروج
          </button>
        </div>
      </div>

      {/* Tab 1: Tasks & Stages */}
      {activeTab === 'tasks' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Task List */}
          <div className="lg:col-span-1 space-y-3">
            <h3 className="text-sm font-bold text-gray-300">قائمة المهام المسندة إليك:</h3>
            {tasks.length === 0 ? (
              <div className="p-6 bg-obsidian-card rounded-2xl border border-obsidian-border text-center text-xs text-gray-500">
                لا توجد مهام مسندة إليك حالياً. يمكنك اقتراح مهمة جديدة!
              </div>
            ) : (
              tasks.map(t => (
                <div
                  key={t._id}
                  onClick={() => setSelectedTask(t)}
                  className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                    selectedTask?._id === t._id
                      ? 'border-cyber-blue bg-cyber-blue/10'
                      : 'border-obsidian-border bg-obsidian-card hover:border-gray-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1 flex-wrap gap-1">
                    <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                      <span>{t.title}</span>
                      {t.isDailyRecurring && (
                        <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 text-[9px] font-bold">
                          🔄 روتين يومي
                        </span>
                      )}
                    </h4>
                    <Badge variant={t.status === 'COMPLETED' ? 'disbursed' : 'processing'}>
                      {t.status}
                    </Badge>
                  </div>
                  <p className="text-xs text-gray-400 line-clamp-1">{t.description}</p>
                  <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
                    <span>المراحل: {t.stages?.length || 0}</span>
                    {t.dueDate && (
                      <span className="text-[10px] text-amber-400 font-mono">
                        ⏰ {new Date(t.dueDate).toLocaleDateString('ar-YE', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    )}
                    <span className="text-lord-gold font-bold">{t.overallProgressPercent || 0}%</span>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Task Detail & Stage Stepper */}
          <div className="lg:col-span-2">
            {selectedTask ? (
              <div className="bg-obsidian-card border border-obsidian-border rounded-3xl p-6 space-y-6">
                <div>
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-bold text-white">{selectedTask.title}</h2>
                    <Badge variant="gold">{selectedTask.targetPlatform}</Badge>
                  </div>
                  <p className="text-xs text-gray-400 mt-2 leading-relaxed">
                    {selectedTask.description}
                  </p>
                </div>

                {/* Stages Stepper */}
                <div className="space-y-4">
                  <h4 className="text-sm font-bold text-gray-300 flex items-center gap-2">
                    <Layers className="w-4 h-4 text-lord-gold" />
                    <span>مراحل التنفيذ المتسلسلة:</span>
                  </h4>

                  {selectedTask.stages?.map((stage: any, idx: number) => (
                    <div
                      key={idx}
                      className={`p-4 rounded-2xl border transition-all ${
                        stage.status === 'IN_PROGRESS'
                          ? 'border-lord-gold bg-lord-gold/5'
                          : stage.status === 'APPROVED'
                          ? 'border-emerald-500/30 bg-emerald-500/5'
                          : 'border-gray-800 bg-obsidian-surface opacity-70'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-bold text-white">
                          مرحلة {stage.stageOrder}: {stage.stageTitle}
                        </span>
                        <Badge
                          variant={
                            stage.status === 'APPROVED'
                              ? 'disbursed'
                              : stage.status === 'IN_PROGRESS'
                              ? 'processing'
                              : 'neutral'
                          }
                        >
                          {stage.status}
                        </Badge>
                      </div>

                      {stage.instructions && (
                        <p className="text-xs text-gray-400 mb-3">{stage.instructions}</p>
                      )}

                      {/* Active Stage Submission Box */}
                      {stage.status === 'IN_PROGRESS' && (
                        <div className="mt-4 pt-4 border-t border-gray-800 space-y-3">
                          <label className="block text-xs font-semibold text-gray-300">
                            تقرير الإنجاز أو رابط النشر:
                          </label>
                          <textarea
                            rows={3}
                            placeholder="اكتب التقرير، رابط المنشور على X، إحصائيات المشاهدات..."
                            value={textSubmission}
                            onChange={e => setTextSubmission(e.target.value)}
                            className="w-full bg-obsidian-primary border border-gray-700 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-lord-gold"
                          />

                          {/* Direct Voice Recorder Component */}
                          <div>
                            <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                              إرفاق رسالة صوتية للمرحلة 🎙️:
                            </label>
                            <DirectVoiceRecorder
                              onRecordingComplete={data => {
                                setVoiceNoteAttachment({
                                  fileType: 'VOICE_NOTE',
                                  fileName: `voice-note-${Date.now()}.webm`,
                                  fileUrl: data.previewUrl,
                                  durationInSeconds: data.durationInSeconds
                                });
                              }}
                            />
                          </div>

                          <Button
                            variant="gold"
                            size="md"
                            isLoading={isSubmittingStage}
                            onClick={() => handleStageSubmit(selectedTask._id, stage.stageOrder)}
                            className="w-full mt-2"
                          >
                            <Send className="w-4 h-4 ml-1.5" />
                            <span>إرسال المرحلة للمراجعة والاعتماد</span>
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="bg-obsidian-card border border-obsidian-border rounded-3xl p-12 text-center text-gray-500">
                <Briefcase className="w-12 h-12 mx-auto mb-3 text-gray-600" />
                <p className="text-sm">اختر مهمة من القائمة لعرض تفاصيلها ومراحل تسليمها</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 2: Propose Task */}
      {activeTab === 'propose' && (
        <div className="max-w-2xl mx-auto bg-obsidian-card border border-lord-gold/30 rounded-3xl p-6 md:p-8">
          <h2 className="text-xl font-bold text-white mb-2">اقتراح مهمة أو مبادرة جديدة</h2>
          <p className="text-xs text-gray-400 mb-6">
            اقترح مهمة ذاتية لتنفيذها مع إمكانية طلب ميزانية مالية معتمدة من المسؤول.
          </p>

          <form onSubmit={handleProposeSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1">عنوان المهمة:</label>
              <input
                type="text"
                required
                placeholder="مثال: إطلاق حملة صفقات مجانية على القناة العامة"
                value={proposalTitle}
                onChange={e => setProposalTitle(e.target.value)}
                className="w-full bg-obsidian-primary border border-gray-700 rounded-xl px-4 py-2.5 text-sm text-white focus:border-lord-gold"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1">تفاصيل وخطة التنفيذ:</label>
              <textarea
                rows={4}
                required
                placeholder="اشرح الفكرة، المنصة المستهدفة، ومراحل الإنجاز المقترحة..."
                value={proposalDesc}
                onChange={e => setProposalDesc(e.target.value)}
                className="w-full bg-obsidian-primary border border-gray-700 rounded-xl p-3 text-sm text-white focus:border-lord-gold"
              />
            </div>

            {/* Execution & Assignee Selection */}
            <div className="p-4 rounded-2xl bg-obsidian-surface border border-obsidian-border space-y-3">
              <label className="block text-xs font-semibold text-gray-300">
                تحديد المنفذ والمكلف بالمهمة (Assignee):
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setExecutionType('SELF')}
                  className={`p-3 rounded-xl border text-right transition-all ${
                    executionType === 'SELF'
                      ? 'bg-cyber-blue/15 border-cyber-blue text-cyber-blue font-bold shadow-sm'
                      : 'bg-obsidian-primary border-gray-700 text-gray-400 hover:text-white'
                  }`}
                >
                  <div className="font-bold text-xs mb-1">تنفيذ ذاتي (سأنفذها بنفسي)</div>
                  <div className="text-[10px] text-gray-400">ستُسند المهمة لك فور اعتمادها من الإدارة</div>
                </button>

                <button
                  type="button"
                  onClick={() => setExecutionType('DELEGATED_TO_COLLEAGUE')}
                  className={`p-3 rounded-xl border text-right transition-all ${
                    executionType === 'DELEGATED_TO_COLLEAGUE'
                      ? 'bg-lord-gold/15 border-lord-gold text-lord-gold font-bold shadow-sm'
                      : 'bg-obsidian-primary border-gray-700 text-gray-400 hover:text-white'
                  }`}
                >
                  <div className="font-bold text-xs mb-1">طلب إسنادها لزميل بالكادر</div>
                  <div className="text-[10px] text-gray-400">تكليف زميل آخر ذو اختصاص بالمهمة</div>
                </button>
              </div>

              {executionType === 'DELEGATED_TO_COLLEAGUE' && (
                <div className="pt-2">
                  <label className="block text-[11px] text-gray-400 mb-1">اختر الزميل المكلف:</label>
                  <select
                    value={selectedColleagueId}
                    onChange={e => setSelectedColleagueId(e.target.value)}
                    required={executionType === 'DELEGATED_TO_COLLEAGUE'}
                    className="w-full bg-obsidian-primary border border-gray-700 rounded-xl px-3 py-2 text-xs text-white focus:border-lord-gold"
                  >
                    <option value="">-- اختر الزميل المكلف من الفريق --</option>
                    {employees.map(emp => (
                      <option key={emp._id} value={emp._id}>
                        {emp.fullName} ({emp.primaryDepartment || 'عام'} - {emp.jobTitles?.[0] || emp.accessRole})
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Budget Request Toggle */}
            <div className="p-4 rounded-2xl bg-obsidian-surface border border-obsidian-border space-y-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={requiresBudget}
                  onChange={e => setRequiresBudget(e.target.checked)}
                  className="rounded text-lord-gold"
                />
                <span className="text-sm font-bold text-white">تتطلب ميزانية مالية للصرف؟</span>
              </label>

              {requiresBudget && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">المبلغ المطلوب (USDT):</label>
                    <input
                      type="number"
                      min={1}
                      value={budgetAmount}
                      onChange={e => setBudgetAmount(Number(e.target.value))}
                      className="w-full bg-obsidian-primary border border-gray-700 rounded-xl px-3 py-2 text-sm text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">وسيلة الصرف المطلوبة:</label>
                    <select
                      value={budgetPayoutMethod}
                      onChange={e => setBudgetPayoutMethod(e.target.value as any)}
                      className="w-full bg-obsidian-primary border border-gray-700 rounded-xl px-3 py-2 text-sm text-white"
                    >
                      <option value="BEP20_USDT">شبكة BEP20 (USDT)</option>
                      <option value="JEEB_WALLET">📱 محفظة جيب (Jeeb)</option>
                      <option value="JAWALI_WALLET">📱 محفظة جوالي (Jawali)</option>
                    </select>
                  </div>
                </div>
              )}
            </div>

            <Button type="submit" variant="gold" size="lg" isLoading={isProposing} className="w-full">
              <PlusCircle className="w-4 h-4 ml-1.5" />
              <span>إرسال المقترح للاعتماد</span>
            </Button>
          </form>
        </div>
      )}

      {/* Tab 3: Personal Statement */}
      {activeTab === 'statement' && (
        <div className="bg-obsidian-card border border-obsidian-border rounded-3xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-emerald-400" />
              <span>كشف حساب المستحقات والعمليات المالية</span>
            </h3>
            <span className="text-xs text-gray-400">سجل شفاف لكل الحركات المالية</span>
          </div>

          {statement.length === 0 ? (
            <div className="text-center py-12 text-xs text-gray-500">
              لا توجد قيود مسجلة في كشف حسابك حتى الآن.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="border-b border-gray-800 text-gray-400">
                    <th className="py-3 px-4">التاريخ</th>
                    <th className="py-3 px-4">النوع</th>
                    <th className="py-3 px-4">المبلغ</th>
                    <th className="py-3 px-4">وسيلة الدفع</th>
                    <th className="py-3 px-4">البيان والسبب</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800/60">
                  {statement.map((entry: any) => (
                    <tr key={entry._id} className="hover:bg-obsidian-surface/50">
                      <td className="py-3 px-4 text-gray-400 font-mono">
                        {new Date(entry.createdAt).toLocaleDateString('ar-EG')}
                      </td>
                      <td className="py-3 px-4">
                        <Badge
                          variant={
                            entry.entryType === 'BONUS' || entry.entryType === 'BASE_SALARY'
                              ? 'disbursed'
                              : entry.entryType === 'WARNING'
                              ? 'danger'
                              : 'processing'
                          }
                        >
                          {entry.entryType}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 font-bold text-white">
                        {entry.amount ? `${entry.amount} USDT` : '—'}
                      </td>
                      <td className="py-3 px-4 text-cyber-blue font-mono">
                        {entry.payoutMethodUsed}
                      </td>
                      <td className="py-3 px-4 text-gray-300">{entry.reason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

