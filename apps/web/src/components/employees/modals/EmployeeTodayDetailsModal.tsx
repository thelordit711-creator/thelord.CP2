'use client';

import React, { useState, useMemo } from 'react';
import { AppModalPortal } from '../../ui/AppModalPortal';
import { useGetTasksQuery } from '../../../store/api/tasksApi';
import {
  CheckSquare,
  FileQuestion,
  Clock,
  Coins,
  AlertCircle,
  ExternalLink,
  ChevronRight,
  Layers,
  Calendar,
  CheckCircle2,
  Hourglass,
  Flame,
  ArrowUpRight,
  Wallet
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';

interface EmployeeTodayDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  employee: any;
}

export const EmployeeTodayDetailsModal: React.FC<EmployeeTodayDetailsModalProps> = ({
  isOpen,
  onClose,
  employee
}) => {
  const router = useRouter();
  const locale = useLocale();
  const [activeTab, setActiveTab] = useState<'TASKS' | 'REQUESTS'>('TASKS');

  const { data: tasksData, isLoading, refetch } = useGetTasksQuery();
  const allTasks: any[] = tasksData?.data || [];

  const empId = String(employee?._id || employee?.id || '');

  // Helper: check if task is assigned to this employee
  const isAssignedToEmployee = (t: any): boolean => {
    if (!t || !empId) return false;
    if (Array.isArray(t.assignedTo)) {
      return t.assignedTo.some((item: any) => {
        const id = typeof item === 'object' && item !== null ? item._id || item.id : item;
        return String(id) === empId;
      });
    }
    const single = typeof t.assignedTo === 'object' && t.assignedTo !== null
      ? t.assignedTo._id || t.assignedTo.id
      : t.assignedTo;
    return String(single) === empId;
  };

  // Helper: check if task was created/proposed by this employee
  const isCreatedByEmployee = (t: any): boolean => {
    if (!t || !empId) return false;
    const creatorId = typeof t.createdBy === 'object' && t.createdBy !== null
      ? t.createdBy._id || t.createdBy.id
      : t.createdBy;
    return String(creatorId) === empId;
  };

  // Filter tasks assigned to this employee (Active & Recent)
  const employeeTasks = useMemo(() => {
    if (!empId) return [];
    return allTasks.filter((t: any) => {
      // Must be assigned to this employee
      if (!isAssignedToEmployee(t)) return false;
      // If it's a proposal pending admin review, it goes into Requests
      if (t.isProposedByEmployee && t.status === 'PENDING_ADMIN_REVIEW') return false;
      return true;
    });
  }, [allTasks, empId]);

  // Filter requests/proposals/budget needs initiated by this employee
  const employeeRequests = useMemo(() => {
    if (!empId) return [];
    return allTasks.filter((t: any) => {
      if (!isCreatedByEmployee(t)) return false;
      // It's a request if it's proposed by employee OR requires a budget
      return t.isProposedByEmployee || t.financialRequirement?.requiresBudget;
    });
  }, [allTasks, empId]);

  if (!isOpen || !employee) return null;

  const priorityLabels: Record<string, { label: string; color: string }> = {
    LOW: { label: 'منخفضة', color: 'bg-gray-800 text-gray-300 border-gray-700' },
    MEDIUM: { label: 'متوسطة', color: 'bg-blue-500/15 text-blue-400 border-blue-500/30' },
    HIGH: { label: 'عالية ⚡', color: 'bg-amber-500/15 text-amber-400 border-amber-500/30' },
    CRITICAL: { label: 'حرجة وعاجلة 🔥', color: 'bg-red-500/20 text-red-400 border-red-500/40 animate-pulse' }
  };

  const statusBadges: Record<string, { label: string; color: string }> = {
    TODO: { label: 'بانتظار البدء ⏳', color: 'bg-gray-800 text-gray-300 border-gray-700' },
    IN_PROGRESS: { label: 'قيد التنفيذ ⚡', color: 'bg-amber-500/20 text-amber-300 border-amber-500/40' },
    COMPLETED: { label: 'مكتملة ومسلمة ✅', color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' },
    PENDING_ADMIN_REVIEW: { label: 'بانتظار مراجعة الإدارة 🔍', color: 'bg-sky-500/20 text-sky-300 border-sky-500/40' },
    REJECTED: { label: 'مرفوضة ❌', color: 'bg-red-500/20 text-red-400 border-red-500/40' }
  };

  return (
    <AppModalPortal isOpen={isOpen} onClose={onClose}>
      <div className="w-full max-w-2xl bg-[#090c15] border border-lord-gold/40 rounded-3xl shadow-2xl p-5 sm:p-6 text-white text-right">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-800/80 pb-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-lord-gold/15 border border-lord-gold/30 flex items-center justify-center font-black text-lord-gold text-lg shadow-sm">
              {employee.fullName?.charAt(0) || '👤'}
            </div>
            <div>
              <h3 className="text-base font-black text-white flex items-center gap-2">
                <span>تفاصيل ومتابعة اليوم • {employee.fullName}</span>
              </h3>
              <p className="text-xs text-gray-400 font-mono">
                {employee.primaryDepartment || 'قسم العمليات'} • {employee.jobTitles?.[0] || 'كادر معتمد'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-gray-800/60 text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Tabs Switcher */}
        <div className="grid grid-cols-2 gap-2 border-b border-gray-800/80 pb-3 mb-4">
          <button
            type="button"
            onClick={() => setActiveTab('TASKS')}
            className={`py-2.5 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 border ${
              activeTab === 'TASKS'
                ? 'bg-lord-gold/20 text-lord-gold border-lord-gold/50 shadow-md'
                : 'bg-gray-900/60 text-gray-400 border-gray-800/80 hover:text-white hover:bg-gray-800/40'
            }`}
          >
            <CheckSquare className="w-4 h-4" />
            <span>المهام المطلوب تنفيذها اليوم ({employeeTasks.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('REQUESTS')}
            className={`py-2.5 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 border ${
              activeTab === 'REQUESTS'
                ? 'bg-lord-gold/20 text-lord-gold border-lord-gold/50 shadow-md'
                : 'bg-gray-900/60 text-gray-400 border-gray-800/80 hover:text-white hover:bg-gray-800/40'
            }`}
          >
            <FileQuestion className="w-4 h-4" />
            <span>طلبات ومقترحات الموظف ({employeeRequests.length})</span>
          </button>
        </div>

        {/* Content Container */}
        <div className="max-h-[60vh] overflow-y-auto space-y-3 pr-1 scroll-touch">
          {isLoading ? (
            <div className="py-14 text-center text-xs text-gray-400">
              <div className="w-7 h-7 border-2 border-lord-gold border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              جاري فحص ومطابقة بيانات المهام والطلبات...
            </div>
          ) : activeTab === 'TASKS' ? (
            employeeTasks.length === 0 ? (
              <div className="py-12 text-center text-gray-400 text-xs bg-gray-900/40 rounded-2xl border border-gray-800/70 p-5">
                <CheckSquare className="w-9 h-9 text-lord-gold/40 mx-auto mb-2.5" />
                <p className="font-bold text-gray-200 text-sm mb-1">لا توجد مهام مسندة لهذا الموظف حالياً</p>
                <p className="text-[11px] text-gray-500">يمكنك تكليفه بمهمة جديدة فوراً عبر الضغط على زر "إسناد مهمة ⚡" في البطاقة</p>
              </div>
            ) : (
              employeeTasks.map((task: any) => {
                const currentStageIdx = task.currentStageIndex || 0;
                const totalStages = task.stages?.length || 1;
                const currentStage = task.stages?.[currentStageIdx];
                const progressPct = task.overallProgressPercent || (task.status === 'COMPLETED' ? 100 : Math.round((currentStageIdx / totalStages) * 100));
                const priorityInfo = priorityLabels[task.priority] || priorityLabels.MEDIUM;
                const statusInfo = statusBadges[task.status] || statusBadges.TODO;
                const budgetVal = task.financialRequirement?.amount || task.budgetAmount || 0;

                return (
                  <div
                    key={task._id}
                    className="p-4 rounded-2xl bg-gray-900/70 border border-gray-800/90 hover:border-lord-gold/40 transition-all flex flex-col gap-3 shadow-md"
                  >
                    {/* Top Row: Title & Badges */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className={`text-[10px] font-black px-2 py-0.5 rounded-lg border ${priorityInfo.color}`}>
                            {priorityInfo.label}
                          </span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border ${statusInfo.color}`}>
                            {statusInfo.label}
                          </span>
                        </div>
                        <h4 className="text-sm font-black text-white leading-snug">
                          {task.title}
                        </h4>
                      </div>

                      {/* Direct Link to Task Detail */}
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          router.push(`/${locale}/tasks?taskId=${task._id}`);
                        }}
                        className="px-2.5 py-1.5 rounded-xl bg-lord-gold/15 hover:bg-lord-gold/25 border border-lord-gold/40 text-lord-gold text-xs font-bold flex items-center gap-1 transition-all shrink-0 active:scale-95"
                        title="فتح في محرك المهام"
                      >
                        <span>فتح</span>
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Task Description */}
                    {task.description && (
                      <p className="text-xs text-gray-400 line-clamp-2 leading-relaxed">
                        {task.description}
                      </p>
                    )}

                    {/* Stage Progress Bar & Current Stage */}
                    <div className="p-2.5 rounded-xl bg-black/40 border border-gray-800/80 space-y-2">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-gray-300 font-bold flex items-center gap-1.5">
                          <Layers className="w-3.5 h-3.5 text-lord-gold" />
                          <span>
                            المرحلة {Math.min(currentStageIdx + 1, totalStages)} من {totalStages}
                            {currentStage?.stageTitle ? `: ${currentStage.stageTitle}` : ''}
                          </span>
                        </span>
                        <span className="font-mono font-black text-lord-gold">{progressPct}%</span>
                      </div>

                      <div className="w-full h-1.5 rounded-full bg-gray-800 overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-amber-600 via-lord-gold to-yellow-300 transition-all duration-500 rounded-full"
                          style={{ width: `${progressPct}%` }}
                        />
                      </div>
                    </div>

                    {/* Footer Row: Due Date & Budget */}
                    <div className="flex items-center justify-between pt-1 border-t border-gray-800/60 text-[11px] text-gray-400">
                      <div className="flex items-center gap-3">
                        {task.dueDate ? (
                          <span className="flex items-center gap-1 text-gray-300">
                            <Clock className="w-3.5 h-3.5 text-lord-gold" />
                            <span>التسليم: {new Date(task.dueDate).toLocaleString('ar-YE', { dateStyle: 'short', timeStyle: 'short' })}</span>
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-gray-500">
                            <Clock className="w-3.5 h-3.5" />
                            <span>بدون موعد تسليم محدد</span>
                          </span>
                        )}
                      </div>

                      {budgetVal > 0 && (
                        <span className="flex items-center gap-1 text-emerald-400 font-mono font-black bg-emerald-500/10 px-2 py-0.5 rounded-lg border border-emerald-500/30">
                          <Coins className="w-3.5 h-3.5" />
                          <span>{budgetVal} USDT</span>
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )
          ) : (
            employeeRequests.length === 0 ? (
              <div className="py-12 text-center text-gray-400 text-xs bg-gray-900/40 rounded-2xl border border-gray-800/70 p-5">
                <FileQuestion className="w-9 h-9 text-lord-gold/40 mx-auto mb-2.5" />
                <p className="font-bold text-gray-200 text-sm mb-1">لا توجد طلبات أو مقترحات مرفوعة من هذا الموظف</p>
                <p className="text-[11px] text-gray-500">كافة مقترحات المهام أو طلبات تمويل الميزانيات تظهر هنا فور تقديمها</p>
              </div>
            ) : (
              employeeRequests.map((req: any) => {
                const finReq = req.financialRequirement;
                const approvalStatus = finReq?.adminApprovalStatus || (req.status === 'PENDING_ADMIN_REVIEW' ? 'PENDING_ADMIN' : req.status === 'COMPLETED' ? 'APPROVED' : 'PENDING_ADMIN');
                const reqAmount = finReq?.amount || req.budgetAmount || 0;

                return (
                  <div
                    key={req._id}
                    className="p-4 rounded-2xl bg-gray-900/70 border border-gray-800/90 hover:border-lord-gold/40 transition-all flex flex-col gap-3 shadow-md"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="text-[10px] font-black px-2 py-0.5 rounded-lg bg-sky-500/15 text-sky-300 border border-sky-500/30 flex items-center gap-1">
                            <FileQuestion className="w-3 h-3" />
                            <span>{req.isProposedByEmployee ? 'مقترح مهمة عمل 💡' : 'طلب ميزانية تشغيلية 💰'}</span>
                          </span>

                          <span
                            className={`text-[10px] font-bold px-2.5 py-0.5 rounded-lg border ${
                              approvalStatus === 'APPROVED'
                                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                                : approvalStatus === 'REJECTED'
                                ? 'bg-red-500/20 text-red-300 border-red-500/40'
                                : 'bg-amber-500/20 text-amber-300 border-amber-500/40 animate-pulse'
                            }`}
                          >
                            {approvalStatus === 'APPROVED'
                              ? 'معتمد للصرف / التنفيذ ✅'
                              : approvalStatus === 'REJECTED'
                              ? 'مرفوض من الإدارة ❌'
                              : 'قيد المراجعة الإدارية ⏳'}
                          </span>
                        </div>

                        <h4 className="text-sm font-black text-white leading-snug">
                          {req.title}
                        </h4>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          router.push(`/${locale}/tasks?taskId=${req._id}`);
                        }}
                        className="px-2.5 py-1.5 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white text-xs font-bold flex items-center gap-1 transition-all shrink-0"
                      >
                        <span>مراجعة</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <p className="text-xs text-gray-400 leading-relaxed">
                      {req.description}
                    </p>

                    {/* Financial details if requested */}
                    {reqAmount > 0 && (
                      <div className="p-2.5 rounded-xl bg-black/40 border border-gray-800/80 flex items-center justify-between text-xs">
                        <span className="text-gray-300 flex items-center gap-1.5">
                          <Wallet className="w-3.5 h-3.5 text-emerald-400" />
                          <span>الميزانية المطلوبة:</span>
                          <span className="font-mono font-black text-emerald-400">{reqAmount} USDT</span>
                        </span>
                        {finReq?.payoutMethodRequested && (
                          <span className="text-[10px] text-gray-400 font-mono bg-gray-800 px-2 py-0.5 rounded-md">
                            القناة: {finReq.payoutMethodRequested}
                          </span>
                        )}
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-1 border-t border-gray-800/60 text-[10px] text-gray-500 font-mono">
                      <span>تاريخ التقديم: {new Date(req.createdAt).toLocaleDateString('ar-YE', { dateStyle: 'medium' })}</span>
                      {finReq?.justification && (
                        <span className="text-gray-400 truncate max-w-[220px]">
                          التبرير: {finReq.justification}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )
          )}
        </div>

        {/* Footer */}
        <div className="mt-4 pt-3 border-t border-gray-800/80 flex items-center justify-between">
          <button
            type="button"
            onClick={() => refetch()}
            className="text-[11px] text-lord-gold hover:underline flex items-center gap-1 font-bold"
          >
            🔄 تحديث البيانات اللحظية
          </button>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-xs font-bold text-white transition-all active:scale-95"
          >
            إغلاق
          </button>
        </div>
      </div>
    </AppModalPortal>
  );
};
