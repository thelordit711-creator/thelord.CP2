'use client';

import React, { useState } from 'react';
import {
  useGetTasksQuery,
  useSubmitTaskStageMutation,
  useCreateOrProposeTaskMutation,
  useSettleTaskBudgetMutation
} from '../../../../store/api/tasksApi';
import { useGetMyStatementQuery, useConfirmPayoutReceiptMutation } from '../../../../store/api/financeApi';
import { useGetAllEmployeesQuery } from '../../../../store/api/usersApi';
import { Button } from '../../../../components/ui/Button';
import { Badge } from '../../../../components/ui/Badge';
import { DirectVoiceRecorder } from '../../../../components/voice/DirectVoiceRecorder';
import { StageDeliverableBox } from '../../../../components/tasks/StageDeliverableBox';
import { ImageLightboxModal } from '../../../../components/ui/ImageLightboxModal';
import { CreateTaskModal } from '../../../../components/tasks/modals/CreateTaskModal';
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
  LogOut,
  Coins,
  Check,
  Building2,
  ExternalLink,
  Receipt,
  Copy,
  X,
  Sparkles,
  Compass,
  UserCheck,
  Bot
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
  const [confirmPayoutReceipt, { isLoading: isConfirmingReceipt }] = useConfirmPayoutReceiptMutation();
  const [settleTaskBudget, { isLoading: isSettlingBudget }] = useSettleTaskBudgetMutation();

  const [activeTab, setActiveTab] = useState<'tasks' | 'propose' | 'statement'>('tasks');
  const [isProposeModalOpen, setIsProposeModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<any | null>(null);
  const [lightboxImage, setLightboxImage] = useState<{ url: string; alt?: string } | null>(null);

  // Receipt Confirmation & Expense Settlement states
  const [confirmNote, setConfirmNote] = useState('');
  const [showExpenseBox, setShowExpenseBox] = useState(false);
  const [spentAmountInput, setSpentAmountInput] = useState('');
  const [expenseDetailsInput, setExpenseDetailsInput] = useState('');
  const [invoiceUrlInput, setInvoiceUrlInput] = useState('');

  // Keep selectedTask synchronized with live tasks list
  React.useEffect(() => {
    if (selectedTask && tasksRes?.data) {
      const fresh = tasksRes.data.find((t: any) => t._id === selectedTask._id);
      if (fresh) {
        setSelectedTask(fresh);
      }
    }
  }, [tasksRes]);

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

    const handleTaskRefresh = (updatedTask?: any) => {
      refetchTasks();
      if (updatedTask && updatedTask._id) {
        setSelectedTask((prev: any) => (prev && prev._id === updatedTask._id ? updatedTask : prev));
      }
    };

    socket.on('task:assigned', handleTaskAssigned);
    socket.on('task:created', handleTaskRefresh);
    socket.on('task:updated', handleTaskRefresh);
    socket.on('task:deleted', (data: any) => {
      refetchTasks();
      const delId = typeof data === 'string' ? data : data?.taskId || data?._id;
      if (delId) {
        setSelectedTask((prev: any) => (prev && prev._id === delId ? null : prev));
      }
    });
    socket.on('stage:approved', (data: any) => {
      refetchTasks();
      if (data?.task) {
        setSelectedTask((prev: any) => (prev && prev._id === data.task._id ? data.task : prev));
      }
    });
    socket.on('stage:revision_requested', (data: any) => {
      refetchTasks();
      if (data?.task) {
        setSelectedTask((prev: any) => (prev && prev._id === data.task._id ? data.task : prev));
      }
    });

    return () => {
      socket.off('task:assigned', handleTaskAssigned);
      socket.off('task:created', handleTaskRefresh);
      socket.off('task:updated', handleTaskRefresh);
      socket.off('task:deleted');
      socket.off('stage:approved');
      socket.off('stage:revision_requested');
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
      const res = await submitStage({
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
      if (res?.data) {
        setSelectedTask(res.data);
      }
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
            onClick={() => {
              setActiveTab('propose');
              setIsProposeModalOpen(true);
            }}
            className={`px-4 py-2 rounded-xl font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'propose'
                ? 'bg-lord-gold text-obsidian-primary shadow-gold-glow'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>+ اقتراح مهمة ومراحلها 💡</span>
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
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <h2 className="text-lg sm:text-xl font-black text-white truncate">{selectedTask.title}</h2>
                      <Badge variant="gold" className="shrink-0">{selectedTask.targetPlatform}</Badge>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedTask(null)}
                      className="p-1.5 rounded-xl bg-obsidian-surface hover:bg-gray-800 text-gray-400 hover:text-white transition-colors shrink-0"
                      title="إغلاق تفاصيل المهمة"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <p className="text-xs text-gray-400 mt-2 leading-relaxed">
                    {selectedTask.description}
                  </p>
                </div>

                {/* FINANCIAL REQUIREMENT & PAYOUT STATUS CARD */}
                {selectedTask.financialRequirement?.requiresBudget && (() => {
                  const fin = selectedTask.financialRequirement;
                  const payoutOrder = typeof fin.payoutOrderId === 'object' ? (fin.payoutOrderId as any) : null;
                  const isDisbursed = payoutOrder?.executionStatus === 'DISBURSED';
                  const isProcessing = payoutOrder?.executionStatus === 'IN_PROGRESS';
                  const isWaitingTreasury = payoutOrder?.executionStatus === 'WAITING_TREASURY' || fin.adminApprovalStatus === 'APPROVED';
                  const isPendingAdmin = fin.adminApprovalStatus === 'PENDING_ADMIN';
                  const isRejected = fin.adminApprovalStatus === 'REJECTED';

                  const payoutMethodLabel =
                    fin.payoutMethodRequested === 'BEP20_USDT'
                      ? 'USDT (شبكة BSC BEP-20)'
                      : fin.payoutMethodRequested === 'JEEB_WALLET'
                      ? 'محفظة جيب الإلكترونية (Jeeb)'
                      : fin.payoutMethodRequested === 'JAWALI_WALLET'
                      ? 'محفظة جوالي الإلكترونية (Jawali)'
                      : fin.payoutMethodRequested || 'تحويل مالي';

                  return (
                    <div
                      className={`p-4 rounded-2xl border transition-all space-y-3 backdrop-blur-md shadow-md ${
                        isDisbursed
                          ? 'bg-gradient-to-l from-emerald-950/25 via-obsidian-card to-obsidian-surface border-emerald-500/50 shadow-emerald-500/10'
                          : isProcessing
                          ? 'bg-gradient-to-l from-amber-950/25 via-obsidian-card to-obsidian-surface border-amber-500/50 shadow-amber-500/10'
                          : isWaitingTreasury
                          ? 'bg-gradient-to-l from-cyan-950/25 via-obsidian-card to-obsidian-surface border-cyber-blue/50 shadow-cyan-500/10'
                          : isRejected
                          ? 'bg-gradient-to-l from-red-950/25 via-obsidian-card to-obsidian-surface border-red-500/50'
                          : 'bg-gradient-to-l from-yellow-950/25 via-obsidian-card to-obsidian-surface border-yellow-500/40'
                      }`}
                    >
                      {/* Financial Header */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-800/80 pb-3">
                        <div className="flex items-center gap-2.5">
                          <div
                            className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 font-bold ${
                              isDisbursed
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/35'
                                : isProcessing
                                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/35 animate-pulse'
                                : 'bg-lord-gold/20 text-lord-gold border border-lord-gold/35'
                            }`}
                          >
                            <Coins className="w-4 h-4 text-current" />
                          </div>
                          <div>
                            <h4 className="text-sm font-black text-white flex items-center gap-2">
                              <span>ميزانية المهمة:</span>
                              <span className="text-lord-gold font-mono font-black text-base">
                                ${fin.amount} {fin.currency || 'USDT'}
                              </span>
                            </h4>
                            <span className="text-[11px] text-gray-400 block">
                              طريقة الاستلام: <strong className="text-gray-200">{payoutMethodLabel}</strong>
                            </span>
                          </div>
                        </div>

                        {/* Status Badge */}
                        <div className="shrink-0">
                          {isDisbursed ? (
                            <span className="px-3 py-1 rounded-xl bg-emerald-500/20 border border-emerald-500/50 text-emerald-300 font-black text-xs flex items-center gap-1.5 shadow-sm">
                              <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                              <span>تم تحويل وصرف المبلغ بنجاح ✓</span>
                            </span>
                          ) : isProcessing ? (
                            <span className="px-3 py-1 rounded-xl bg-amber-500/20 border border-amber-500/50 text-amber-300 font-bold text-xs flex items-center gap-1.5 shadow-sm">
                              <Clock className="w-3.5 h-3.5 text-amber-400 animate-spin" />
                              <span>جاري التحويل والصرف من الخزينة ⏳</span>
                            </span>
                          ) : isWaitingTreasury ? (
                            <span className="px-3 py-1 rounded-xl bg-cyber-blue/20 border border-cyber-blue/50 text-cyber-blue font-bold text-xs flex items-center gap-1.5 shadow-sm">
                              <Building2 className="w-3.5 h-3.5 text-cyber-blue" />
                              <span>معتمد إدارياً — بانتظار صرف الخزينة 🏦</span>
                            </span>
                          ) : isRejected ? (
                            <span className="px-3 py-1 rounded-xl bg-red-500/20 border border-red-500/50 text-red-300 font-bold text-xs flex items-center gap-1.5 shadow-sm">
                              <span>تم رفض الميزانية ❌</span>
                            </span>
                          ) : (
                            <span className="px-3 py-1 rounded-xl bg-yellow-500/20 border border-yellow-500/50 text-yellow-300 font-bold text-xs flex items-center gap-1.5 shadow-sm">
                              <AlertTriangle className="w-3.5 h-3.5 text-yellow-400" />
                              <span>بانتظار موافقة الإدارة ⚠️</span>
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Proof Details if Disbursed */}
                      {isDisbursed && payoutOrder?.transferProof && (
                        <div className="p-3 rounded-xl bg-obsidian-surface border border-emerald-500/35 space-y-2.5">
                          <div className="flex items-center justify-between text-xs flex-wrap gap-2">
                            <span className="text-emerald-300 font-bold flex items-center gap-1.5">
                              <Receipt className="w-3.5 h-3.5 text-emerald-400" />
                              <span>إشعار وسند التحويل الصادر:</span>
                            </span>
                            {payoutOrder.disbursedClickedAt && (
                              <span className="text-gray-400 font-mono text-[10px]">
                                {new Date(payoutOrder.disbursedClickedAt).toLocaleString('ar-YE')}
                              </span>
                            )}
                          </div>

                          {payoutOrder.transferProof.txHashOrReferenceNumber && (
                            <div className="flex items-center justify-between p-2 rounded-lg bg-obsidian-card border border-gray-700/80 gap-2 flex-wrap">
                              <div className="min-w-0">
                                <span className="text-[10px] text-gray-400 block">كود / هاش التحويل:</span>
                                <span className="font-mono text-xs text-white font-bold select-all break-all">
                                  {payoutOrder.transferProof.txHashOrReferenceNumber}
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => {
                                    navigator.clipboard.writeText(payoutOrder.transferProof.txHashOrReferenceNumber);
                                    toast.success('تم نسخ كود التحويل 📋');
                                  }}
                                  className="px-2 py-0.5 rounded bg-gray-800 hover:bg-gray-700 text-gray-200 text-xs font-bold flex items-center gap-1"
                                >
                                  <Copy className="w-3 h-3 text-lord-gold" />
                                  <span>نسخ</span>
                                </button>
                                {payoutOrder.transferProof.txHashOrReferenceNumber.startsWith('0x') && (
                                  <a
                                    href={`https://bscscan.com/tx/${payoutOrder.transferProof.txHashOrReferenceNumber}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="px-2 py-0.5 rounded bg-cyber-blue/15 text-cyber-blue hover:underline text-xs font-bold flex items-center gap-1"
                                  >
                                    <ExternalLink className="w-3 h-3" />
                                    <span>BscScan</span>
                                  </a>
                                )}
                              </div>
                            </div>
                          )}

                          {payoutOrder.transferProof.receiptScreenshot?.fileUrl && (
                            <div className="flex items-center gap-2.5 pt-0.5">
                              <span className="text-[10px] text-gray-300 font-bold">صورة السند:</span>
                              <button
                                type="button"
                                onClick={() =>
                                  setLightboxImage({
                                    url: payoutOrder.transferProof.receiptScreenshot.fileUrl,
                                    alt: 'سند التحويل'
                                  })
                                }
                                className="group relative cursor-zoom-in rounded-lg overflow-hidden border border-emerald-500/40 hover:border-lord-gold transition-all"
                              >
                                <img
                                  src={payoutOrder.transferProof.receiptScreenshot.fileUrl}
                                  alt="سند التحويل"
                                  className="w-20 h-14 object-cover group-hover:scale-105 transition-transform"
                                />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-[9px] text-white font-bold">
                                  تكبير
                                </div>
                              </button>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Receipt Confirmation Block */}
                      {isDisbursed && payoutOrder && (
                        <div className="p-3.5 rounded-xl bg-obsidian-surface border border-gray-800 space-y-2.5">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-bold text-white flex items-center gap-1.5">
                              <CheckCircle className="w-4 h-4 text-lord-gold" />
                              <span>تأكيد استلام المبلغ من الصندوق</span>
                            </span>
                            {payoutOrder.requireConfirmation && (
                              <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30">
                                مطلوب من الإدارة ⚠️
                              </span>
                            )}
                          </div>

                          {payoutOrder.employeeConfirmation?.isConfirmed ? (
                            <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-300 flex items-center justify-between gap-2">
                              <div>
                                <span className="font-bold block">✓ قمت بتأكيد استلام المبلغ في محفظتك</span>
                                <span className="text-[10px] text-gray-400 font-mono">
                                  {new Date(payoutOrder.employeeConfirmation.confirmedAt).toLocaleString('ar-YE')}
                                </span>
                                {payoutOrder.employeeConfirmation.confirmationNote && (
                                  <p className="text-[11px] text-gray-300 mt-1 italic">
                                    "{payoutOrder.employeeConfirmation.confirmationNote}"
                                  </p>
                                )}
                              </div>
                              <Check className="w-5 h-5 text-emerald-400 shrink-0" />
                            </div>
                          ) : (
                            <div className="space-y-2">
                              <p className="text-[11px] text-gray-400">
                                فور وصول الحوالة لحسابك، يرجى تأكيد الاستلام لإشعار الصندوق والإدارة وإغلاق القيد:
                              </p>
                              <div className="flex flex-col sm:flex-row items-center gap-2">
                                <input
                                  type="text"
                                  placeholder="ملاحظة تأكيد (اختياري، مثلاً: استلمت الرصيد بنجاح في المحفظة)..."
                                  value={confirmNote}
                                  onChange={(e) => setConfirmNote(e.target.value)}
                                  className="w-full sm:flex-1 bg-obsidian-card border border-gray-700 rounded-xl px-3 py-2 text-xs text-white placeholder-gray-500 focus:border-lord-gold"
                                />
                                <Button
                                  type="button"
                                  variant="gold"
                                  size="sm"
                                  disabled={isConfirmingReceipt}
                                  onClick={async () => {
                                    try {
                                      await confirmPayoutReceipt({
                                        orderId: payoutOrder._id,
                                        note: confirmNote
                                      }).unwrap();
                                      toast.success('تم تأكيد استلام الحوالة بنجاح وإشعار الصندوق والإدارة! ✓');
                                      refetchTasks();
                                    } catch (err: any) {
                                      toast.error(err?.data?.error || 'فشل تأكيد الاستلام');
                                    }
                                  }}
                                  className="w-full sm:w-auto font-bold text-xs whitespace-nowrap"
                                >
                                  ✓ أؤكد استلام الحوالة
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Task Budget Expense Breakdown & Settlement Block */}
                      {isDisbursed && (
                        <div className="p-3.5 rounded-xl bg-obsidian-surface border border-gray-800 space-y-2.5">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-bold text-white flex items-center gap-1.5">
                              <FileText className="w-4 h-4 text-cyber-blue" />
                              <span>بيان وتسوية مصروفات الميزانية (اختياري للمهمة)</span>
                            </span>
                            <button
                              type="button"
                              onClick={() => setShowExpenseBox(!showExpenseBox)}
                              className="text-[11px] font-bold text-cyber-blue hover:underline"
                            >
                              {showExpenseBox
                                ? 'إخفاء ▲'
                                : selectedTask.budgetSettlement?.isSettled
                                ? 'عرض البيان المسجل ▼'
                                : '+ كتابة بيان الصرف ▼'}
                            </button>
                          </div>

                          {selectedTask.budgetSettlement?.isSettled && !showExpenseBox && (
                            <div className="p-2.5 rounded-lg bg-cyber-blue/10 border border-cyber-blue/30 text-xs text-cyber-blue flex items-center justify-between gap-2">
                              <div>
                                <span className="font-bold block">
                                  تم توثيق بيان الصرف: ${selectedTask.budgetSettlement.spentAmount} USDT
                                </span>
                                <span className="text-[11px] text-gray-300 block mt-0.5 line-clamp-1">
                                  {selectedTask.budgetSettlement.breakdownDetails}
                                </span>
                              </div>
                              <button
                                type="button"
                                onClick={() => setShowExpenseBox(true)}
                                className="text-[11px] text-white underline font-bold"
                              >
                                تفاصيل
                              </button>
                            </div>
                          )}

                          {showExpenseBox && (
                            <div className="p-3 rounded-xl bg-obsidian-card border border-gray-700/80 space-y-3 animate-fadeIn">
                              <p className="text-[11px] text-gray-400 leading-relaxed">
                                يمكنك هنا كتابة تفاصيل المبلغ المستلم وأين ومتى تم صرفه (مثلاً: إعلانات تليجرام، رسوم اشتراك، إلخ) وإرفاق أي فواتير أو روابط داعمة:
                              </p>

                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                  <label className="block text-[10px] text-gray-400 mb-1">المبلغ المنفق فعلياً (USDT):</label>
                                  <input
                                    type="number"
                                    min={0}
                                    placeholder={String(fin.amount)}
                                    value={spentAmountInput}
                                    onChange={(e) => setSpentAmountInput(e.target.value)}
                                    className="w-full bg-obsidian-primary border border-gray-700 rounded-xl px-3 py-2 text-xs text-white focus:border-lord-gold"
                                  />
                                </div>
                                <div>
                                  <label className="block text-[10px] text-gray-400 mb-1">رابط الفاتورة أو الإيصال الداعم (اختياري):</label>
                                  <input
                                    type="url"
                                    placeholder="https://..."
                                    value={invoiceUrlInput}
                                    onChange={(e) => setInvoiceUrlInput(e.target.value)}
                                    className="w-full bg-obsidian-primary border border-gray-700 rounded-xl px-3 py-2 text-xs text-white focus:border-lord-gold"
                                  />
                                </div>
                              </div>

                              <div>
                                <label className="block text-[10px] text-gray-400 mb-1">تفاصيل ومواعيد الصرف وأي بيانات إضافية:</label>
                                <textarea
                                  rows={3}
                                  placeholder="اكتب أين ومتى تم صرف الميزانية، مثلاً: تم حجز حملة إعلانية في قناة X يوم 8 نوفمبر بمبلغ 150 دولار..."
                                  value={expenseDetailsInput}
                                  onChange={(e) => setExpenseDetailsInput(e.target.value)}
                                  className="w-full bg-obsidian-primary border border-gray-700 rounded-xl p-3 text-xs text-white focus:border-lord-gold"
                                />
                              </div>

                              <div className="flex justify-end gap-2">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setShowExpenseBox(false)}
                                >
                                  إلغاء
                                </Button>
                                <Button
                                  type="button"
                                  variant="gold"
                                  size="sm"
                                  disabled={isSettlingBudget}
                                  onClick={async () => {
                                    try {
                                      await settleTaskBudget({
                                        taskId: selectedTask._id,
                                        data: {
                                          spentAmount: Number(spentAmountInput) || Number(fin.amount),
                                          breakdownDetails: expenseDetailsInput,
                                          invoicesAndReceipts: invoiceUrlInput ? [{ fileUrl: invoiceUrlInput, originalName: 'فاتورة الصرف', fileType: 'IMAGE', sizeBytes: 0 }] : []
                                        }
                                      }).unwrap();
                                      toast.success('تم حفظ وتوثيق بيان مصروفات الميزانية بنجاح! 🧾');
                                      setShowExpenseBox(false);
                                      refetchTasks();
                                    } catch (err: any) {
                                      toast.error(err?.data?.error || 'فشل حفظ بيان المصروفات');
                                    }
                                  }}
                                  className="font-bold text-xs"
                                >
                                  حفظ وتوثيق بيان الصرف 🧾
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* Stages Stepper */}
                <div className="space-y-4">
                  <h4 className="text-sm font-bold text-gray-300 flex items-center gap-2">
                    <Layers className="w-4 h-4 text-lord-gold" />
                    <span>مراحل التنفيذ المتسلسلة:</span>
                  </h4>

                  {selectedTask.stages?.map((stage: any) => (
                    <StageDeliverableBox
                      key={stage.stageOrder}
                      taskId={selectedTask._id}
                      stage={stage}
                      canSubmit={true}
                      isAdmin={false}
                      onRefresh={async () => {
                        const res = await refetchTasks();
                        if (res?.data?.data) {
                          const updated = res.data.data.find((t: any) => t._id === selectedTask._id);
                          if (updated) setSelectedTask(updated);
                        }
                      }}
                    />
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

      {/* Tab 2: Propose Task Hub */}
      {activeTab === 'propose' && (
        <div className="space-y-6">
          {/* Executive Proposal Hub Hero Card */}
          <div className="bg-gradient-to-br from-obsidian-card via-obsidian-surface to-obsidian-card border-2 border-lord-gold/40 rounded-3xl p-6 md:p-8 shadow-gold-glow relative overflow-hidden">
            <div className="absolute top-0 left-0 w-96 h-96 bg-lord-gold/5 rounded-full blur-3xl pointer-events-none" />

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
              <div className="space-y-3 max-w-2xl">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-lord-gold/15 border border-lord-gold/30 text-lord-gold text-xs font-bold">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>محرك بناء واقتراح المبادرات والمهام المتكامل</span>
                </div>
                <h2 className="text-xl md:text-2xl font-black text-white">
                  اقترح مهمة ومراحلها التنفيذية بالذكاء الاصطناعي 💡
                </h2>
                <p className="text-xs md:text-sm text-gray-300 leading-relaxed">
                  يمكنك الآن كعضو في الكادر اقتراح مهام ومشاريع ذاتية أو تكليف زملاءك بها، مع بناء المسار التنفيذي للمراحل، وتحديد المخرجات المطلوبة بدقة، والتفريغ الصوتي بالذكاء الاصطناعي، وطلب ميزانية مالية معتمدة من الإدارة.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2 text-xs text-gray-300">
                  <div className="flex items-center gap-2 p-2 rounded-xl bg-obsidian-primary/60 border border-gray-800">
                    <span className="w-6 h-6 rounded-lg bg-lord-gold/15 text-lord-gold flex items-center justify-center font-bold text-xs">🎙️</span>
                    <span>تفريغ وهيكلة صوتية TheLord AI Voice-to-Task</span>
                  </div>
                  <div className="flex items-center gap-2 p-2 rounded-xl bg-obsidian-primary/60 border border-gray-800">
                    <span className="w-6 h-6 rounded-lg bg-cyber-blue/15 text-cyber-blue flex items-center justify-center font-bold text-xs">📋</span>
                    <span>بناء مراحل تنفيذ تفصيلية وشروط استلام المخرجات</span>
                  </div>
                  <div className="flex items-center gap-2 p-2 rounded-xl bg-obsidian-primary/60 border border-gray-800">
                    <span className="w-6 h-6 rounded-lg bg-emerald-500/15 text-emerald-400 flex items-center justify-center font-bold text-xs">💰</span>
                    <span>طلب ميزانية معتمدة وصرفها عبر USDT أو جيب/جوالي</span>
                  </div>
                  <div className="flex items-center gap-2 p-2 rounded-xl bg-obsidian-primary/60 border border-gray-800">
                    <span className="w-6 h-6 rounded-lg bg-purple-500/15 text-purple-400 flex items-center justify-center font-bold text-xs">👥</span>
                    <span>تنفيذ ذاتي 🙋‍♂️ أو تكليف زملاء الكادر وإشعارهم لحظياً</span>
                  </div>
                </div>
              </div>

              <div className="shrink-0 flex flex-col items-center sm:items-start md:items-center justify-center gap-3">
                <Button
                  type="button"
                  variant="gold"
                  size="lg"
                  onClick={() => setIsProposeModalOpen(true)}
                  className="font-black px-8 py-4 rounded-2xl shadow-gold-glow flex items-center gap-2 text-sm w-full sm:w-auto"
                >
                  <Sparkles className="w-5 h-5 text-obsidian-primary" />
                  <span>فتح محرك بناء واقتراح المهمة الآن ⚡</span>
                </Button>
                <span className="text-[11px] text-gray-400">نفس المحرك الشامل المتاح في صفحة المهام والمراحل</span>
              </div>
            </div>
          </div>

          {/* List of previously proposed initiatives by employee */}
          <div className="bg-obsidian-card border border-obsidian-border rounded-3xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-gray-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Layers className="w-5 h-5 text-lord-gold" />
                <span>سجل المبادرات والمقترحات التي رفعتها للإدارة ({tasks.filter(t => t.isProposedByEmployee).length})</span>
              </h3>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsProposeModalOpen(true)}
                className="text-xs text-lord-gold border-lord-gold/40 hover:bg-lord-gold/10 rounded-xl"
              >
                + إضافة مقترح جديد
              </Button>
            </div>

            {tasks.filter(t => t.isProposedByEmployee).length === 0 ? (
              <div className="text-center py-12 text-gray-500 space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-obsidian-surface border border-gray-800 flex items-center justify-center mx-auto text-xl text-lord-gold">
                  💡
                </div>
                <p className="text-sm font-semibold text-gray-300">لم تقم برفع أي مقترح مهمة حتى الآن</p>
                <p className="text-xs text-gray-500 max-w-md mx-auto">
                  هل لديك فكرة أو مبادرة تطويرية؟ انقر على الزر بالأعلى لبناء مقترحك مع مراحله وميزانيته ورفعه للمسؤول للاعتماد!
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {tasks
                  .filter(t => t.isProposedByEmployee)
                  .map(t => (
                    <div
                      key={t._id}
                      onClick={() => {
                        setSelectedTask(t);
                        setActiveTab('tasks');
                      }}
                      className="p-5 rounded-2xl bg-obsidian-surface border border-gray-800 hover:border-lord-gold/50 cursor-pointer transition-all space-y-3 group"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-lord-gold/10 text-lord-gold border border-lord-gold/30">
                          {t.targetPlatform || 'GENERAL_SYSTEM'}
                        </span>
                        <span
                          className={`text-xs px-2.5 py-0.5 rounded-full font-bold border ${
                            t.status === 'PENDING_ADMIN_REVIEW'
                              ? 'bg-amber-500/15 text-amber-400 border-amber-500/30 animate-pulse'
                              : t.status === 'COMPLETED'
                              ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                              : t.status === 'REJECTED'
                              ? 'bg-red-500/15 text-red-400 border-red-500/30'
                              : 'bg-cyber-blue/15 text-cyber-blue border-cyber-blue/30'
                          }`}
                        >
                          {t.status === 'PENDING_ADMIN_REVIEW'
                            ? 'بانتظار مراجعة الإدارة ⏳'
                            : t.status === 'COMPLETED'
                            ? 'مكتملة ومعتمدة ✅'
                            : t.status === 'REJECTED'
                            ? 'تم رفض المقترح ❌'
                            : 'معتمدة وقيد التنفيذ 🚀'}
                        </span>
                      </div>

                      <h4 className="text-sm font-black text-white group-hover:text-lord-gold transition-colors line-clamp-1">
                        {t.title}
                      </h4>
                      <p className="text-xs text-gray-400 line-clamp-2 leading-relaxed">
                        {t.description}
                      </p>

                      <div className="flex items-center justify-between pt-2 border-t border-gray-800/80 text-[11px] text-gray-400">
                        <span className="flex items-center gap-1">
                          <Layers className="w-3.5 h-3.5 text-lord-gold" />
                          <span>{t.stages?.length || 0} مراحل تنفيذ</span>
                        </span>

                        {t.financialRequirement?.requiresBudget && (
                          <span className="text-lord-gold font-mono font-bold">
                            ميزانية: ${t.financialRequirement.amount} USDT
                          </span>
                        )}

                        <span className="text-gray-500 font-mono text-[10px]">
                          {new Date(t.createdAt).toLocaleDateString('ar-EG')}
                        </span>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
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

      {/* Global Image Lightbox Modal for Receipts & Proofs */}
      {lightboxImage && (
        <ImageLightboxModal
          imageUrl={lightboxImage.url}
          imageAlt={lightboxImage.alt}
          onClose={() => setLightboxImage(null)}
        />
      )}

      {/* Comprehensive Task & Stage Proposal Modal with Voice AI & Budget */}
      <CreateTaskModal
        isOpen={isProposeModalOpen}
        onClose={() => setIsProposeModalOpen(false)}
        isProposal={true}
        onSuccess={() => {
          refetchTasks();
          setActiveTab('propose');
        }}
      />
    </div>
  );
}

