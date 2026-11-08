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
  Calendar
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

  const { data: tasksData, isLoading } = useGetTasksQuery();
  const allTasks = tasksData?.data || [];

  // Filter tasks assigned to this employee
  const employeeTasks = useMemo(() => {
    if (!employee?._id) return [];
    return allTasks.filter((t: any) => {
      const assignedId = String(t.assignedTo?._id || t.assignedTo || '');
      return assignedId === String(employee._id) && !t.isProposal;
    });
  }, [allTasks, employee]);

  // Filter requests/proposals initiated by this employee
  const employeeRequests = useMemo(() => {
    if (!employee?._id) return [];
    return allTasks.filter((t: any) => {
      const creatorId = String(t.createdBy?._id || t.createdBy || '');
      return creatorId === String(employee._id) && t.isProposal;
    });
  }, [allTasks, employee]);

  if (!isOpen || !employee) return null;

  return (
    <AppModalPortal isOpen={isOpen} onClose={onClose}>
      <div className="w-full max-w-2xl bg-[#0a0d16] border border-amber-500/40 rounded-3xl shadow-2xl p-5 sm:p-6 text-white text-right">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-800 pb-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center font-bold text-amber-400 text-lg">
              {employee.fullName?.charAt(0) || '👤'}
            </div>
            <div>
              <h3 className="text-base font-black text-white flex items-center gap-2">
                <span>مهام وطلبات اليوم • {employee.fullName}</span>
              </h3>
              <p className="text-xs text-gray-400 font-mono">
                {employee.primaryDepartment} • {employee.jobTitles?.join('، ') || 'كادر معتمد'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-gray-800/60 text-gray-400 hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Tabs Switcher */}
        <div className="flex items-center gap-2 border-b border-gray-800/80 pb-3 mb-4">
          <button
            type="button"
            onClick={() => setActiveTab('TASKS')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
              activeTab === 'TASKS'
                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40 shadow-sm'
                : 'text-gray-400 hover:text-white hover:bg-gray-800/40'
            }`}
          >
            <CheckSquare className="w-4 h-4" />
            <span>المهام المطلوب تنفيذها اليوم ({employeeTasks.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('REQUESTS')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
              activeTab === 'REQUESTS'
                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40 shadow-sm'
                : 'text-gray-400 hover:text-white hover:bg-gray-800/40'
            }`}
          >
            <FileQuestion className="w-4 h-4" />
            <span>طلبات ومقترحات اليوم ({employeeRequests.length})</span>
          </button>
        </div>

        {/* Content Container */}
        <div className="max-h-[60vh] overflow-y-auto space-y-3 pr-1 scroll-touch">
          {isLoading ? (
            <div className="py-12 text-center text-xs text-gray-400">
              <div className="w-6 h-6 border-2 border-amber-400 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              جاري فحص وتحديث بيانات المهام...
            </div>
          ) : activeTab === 'TASKS' ? (
            employeeTasks.length === 0 ? (
              <div className="py-12 text-center text-gray-400 text-xs bg-gray-900/30 rounded-2xl border border-gray-800/60 p-4">
                <CheckSquare className="w-8 h-8 text-amber-400/40 mx-auto mb-2" />
                <p className="font-bold text-gray-300 mb-1">لا توجد مهام مفتوحة لهذا الموظف اليوم</p>
                <p className="text-[11px] text-gray-500">يمكنك إسناد مهمة جديدة له مباشرة عبر زر "إسناد مهمة ⚡"</p>
              </div>
            ) : (
              employeeTasks.map((task: any) => (
                <div
                  key={task._id}
                  className="p-3.5 rounded-2xl bg-gray-900/60 border border-gray-800 hover:border-amber-500/40 transition-all flex flex-col gap-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-amber-400" />
                      <span>{task.title}</span>
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                        task.status === 'DONE'
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : task.status === 'IN_PROGRESS'
                          ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                          : 'bg-gray-800 text-gray-300'
                      }`}
                    >
                      {task.status === 'DONE' ? 'مكتملة' : task.status === 'IN_PROGRESS' ? 'قيد التنفيذ' : 'بانتظار البدء'}
                    </span>
                  </div>

                  {task.description && (
                    <p className="text-[11px] text-gray-400 line-clamp-2 leading-relaxed">
                      {task.description}
                    </p>
                  )}

                  <div className="flex items-center justify-between pt-2 border-t border-gray-800/60 text-[10px] text-gray-400">
                    <span className="flex items-center gap-1">
                      <Layers className="w-3 h-3 text-amber-400" />
                      <span>المراحل: {task.stages?.length || 1} مرحلة</span>
                    </span>

                    {task.budgetAmount > 0 && (
                      <span className="flex items-center gap-1 text-emerald-400 font-mono font-bold">
                        <Coins className="w-3 h-3" />
                        <span>{task.budgetAmount} USDT</span>
                      </span>
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        router.push(`/${locale}/tasks?taskId=${task._id}`);
                      }}
                      className="text-amber-400 hover:underline flex items-center gap-0.5 font-bold"
                    >
                      <span>فتح المهمة</span>
                      <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))
            )
          ) : (
            employeeRequests.length === 0 ? (
              <div className="py-12 text-center text-gray-400 text-xs bg-gray-900/30 rounded-2xl border border-gray-800/60 p-4">
                <FileQuestion className="w-8 h-8 text-amber-400/40 mx-auto mb-2" />
                <p className="font-bold text-gray-300 mb-1">لا توجد طلبات أو مقترحات مرفوعة اليوم</p>
                <p className="text-[11px] text-gray-500">كافة طلبات السلف أو الميزانيات تظهر هنا فور تقديمها</p>
              </div>
            ) : (
              employeeRequests.map((req: any) => (
                <div
                  key={req._id}
                  className="p-3.5 rounded-2xl bg-gray-900/60 border border-gray-800 hover:border-amber-500/40 transition-all flex flex-col gap-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white flex items-center gap-1.5">
                      <FileQuestion className="w-3.5 h-3.5 text-amber-400" />
                      <span>{req.title}</span>
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                        req.proposalStatus === 'APPROVED'
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : req.proposalStatus === 'REJECTED'
                          ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                          : 'bg-amber-500/20 text-amber-400 border border-amber-500/30 animate-pulse'
                      }`}
                    >
                      {req.proposalStatus === 'APPROVED'
                        ? 'معتمد ✅'
                        : req.proposalStatus === 'REJECTED'
                        ? 'مرفوض ❌'
                        : 'بانتظار الاعتماد ⏳'}
                    </span>
                  </div>

                  <p className="text-[11px] text-gray-400 leading-relaxed">
                    {req.description}
                  </p>

                  <div className="flex items-center justify-between pt-2 border-t border-gray-800/60 text-[10px] text-gray-400">
                    <span className="font-mono">
                      تاريخ الرفع: {new Date(req.createdAt).toLocaleDateString('ar-YE')}
                    </span>

                    {req.budgetAmount > 0 && (
                      <span className="text-emerald-400 font-mono font-bold">
                        الميزانية المطلوبة: {req.budgetAmount} USDT
                      </span>
                    )}
                  </div>
                </div>
              ))
            )
          )}
        </div>

        {/* Footer */}
        <div className="mt-4 pt-3 border-t border-gray-800 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-xs font-bold text-white transition-all"
          >
            إغلاق
          </button>
        </div>
      </div>
    </AppModalPortal>
  );
};
