'use client';

import React, { useState } from 'react';
import {
  useGetRecurringExpensesQuery,
  useExecuteRecurringExpenseMutation,
  useDeleteRecurringExpenseMutation
} from '../../../store/api/treasuryApi';
import { useGetAllEmployeesQuery } from '../../../store/api/usersApi';
import {
  CalendarClock,
  Plus,
  Server,
  Wifi,
  Sparkles,
  Play,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Coins,
  ShieldCheck,
  CreditCard
} from 'lucide-react';
import { Button } from '../../ui/Button';
import { CreateRecurringExpenseModal } from '../modals/CreateRecurringExpenseModal';
import { lordToast } from '../../../lib/lordToast';

export const RecurringExpensesSection: React.FC = () => {
  const { data: expensesRes, isLoading, refetch } = useGetRecurringExpensesQuery();
  const { data: employeesRes } = useGetAllEmployeesQuery();
  const [executeExpense, { isLoading: isExecuting }] = useExecuteRecurringExpenseMutation();
  const [deleteExpense] = useDeleteRecurringExpenseMutation();

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [executingId, setExecutingId] = useState<string | null>(null);

  const expenses = expensesRes?.data || [];
  const employees = employeesRes?.data || [];

  const totalCommittedPayroll = employees.reduce(
    (sum: number, emp: any) => sum + (emp.compensation?.baseSalary || 0),
    0
  );

  const totalMonthlySubscriptions = expenses.reduce(
    (sum: number, exp: any) => sum + (exp.amount || 0),
    0
  );

  const handleExecute = async (exp: any) => {
    try {
      setExecutingId(exp._id);
      await executeExpense(exp._id).unwrap();
      lordToast.success(`تم صرف المصروف الدوري (${exp.title}) وخصم $${exp.amount} من الصندوق بنجاح 💸`);
      refetch();
    } catch (err: any) {
      lordToast.error('فشل الصرف', err?.data?.error || 'حدث خطأ أثناء صرف المصروف الدوري');
    } finally {
      setExecutingId(null);
    }
  };

  const handleDelete = async (exp: any) => {
    if (!confirm(`هل أنت متأكد من حذف المصروف الدوري: ${exp.title}؟`)) return;
    try {
      await deleteExpense(exp._id).unwrap();
      lordToast.gold('تم حذف المصروف الدوري بنجاح');
      refetch();
    } catch (err: any) {
      lordToast.error('فشل الحذف', err?.data?.error || 'حدث خطأ أثناء الحذف');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Monthly Commitments Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Payroll Card */}
        <div className="p-5 rounded-3xl bg-gradient-to-br from-amber-500/15 via-obsidian-card to-obsidian-surface border border-amber-500/40 shadow-lg space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-amber-400">بند الرواتب الشهرية المجمعة</span>
            <Coins className="w-5 h-5 text-amber-400" />
          </div>
          <div className="text-2xl font-black text-white font-mono">
            ${totalCommittedPayroll.toLocaleString()} <span className="text-xs text-lord-gold">USDT</span>
          </div>
          <p className="text-[11px] text-gray-400 leading-relaxed">
            مجموع رواتب {employees.length} موظف معتمد تُصرف عبر مسير الرواتب الموحد.
          </p>
        </div>

        {/* Recurring Subscriptions Card */}
        <div className="p-5 rounded-3xl bg-gradient-to-br from-cyber-blue/15 via-obsidian-card to-obsidian-surface border border-cyber-blue/40 shadow-lg space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-cyber-blue">الاشتراكات والخدمات الدورية</span>
            <Server className="w-5 h-5 text-cyber-blue" />
          </div>
          <div className="text-2xl font-black text-white font-mono">
            ${totalMonthlySubscriptions.toLocaleString()} <span className="text-xs text-cyber-blue">USDT</span>
          </div>
          <p className="text-[11px] text-gray-400 leading-relaxed">
            إجمالي {expenses.length} التزامات شهرية (سيرفرات، إنترنت، برمجيات).
          </p>
        </div>

        {/* Total Monthly Commitments Card */}
        <div className="p-5 rounded-3xl bg-gradient-to-br from-emerald-500/15 via-obsidian-card to-obsidian-surface border border-emerald-500/40 shadow-lg space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-emerald-400">إجمالي الالتزامات الشهرية</span>
            <CreditCard className="w-5 h-5 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-white font-mono">
            ${(totalCommittedPayroll + totalMonthlySubscriptions).toLocaleString()} <span className="text-xs text-emerald-400">USDT</span>
          </div>
          <p className="text-[11px] text-gray-400 leading-relaxed">
            السيولة الشهرية المطلوبة لتغطية كافة العمليات التشغيلية والرواتب.
          </p>
        </div>
      </div>

      {/* Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-obsidian-card border border-gray-800 rounded-3xl p-5 shadow-lg">
        <div>
          <h3 className="text-base font-black text-white flex items-center gap-2">
            <CalendarClock className="w-5 h-5 text-lord-gold" />
            <span>جدول المصروفات والاشتراكات الشهرية المؤتمتة</span>
          </h3>
          <p className="text-xs text-gray-400 mt-1">
            يتم الصرف آلياً أو تنبيه أمين الصندوق في موعد الاستحقاق الشهري المحدد لكل بند
          </p>
        </div>

        <Button
          variant="gold"
          size="sm"
          onClick={() => setIsCreateModalOpen(true)}
          className="flex items-center gap-1.5 text-xs font-bold rounded-2xl"
        >
          <Plus className="w-4 h-4 ml-1" />
          <span>+ إضافة مصروف دوري جديد</span>
        </Button>
      </div>

      {/* Expenses Table */}
      {isLoading ? (
        <div className="p-12 text-center text-xs text-gray-400 font-mono">جاري تحميل المصروفات الدورية...</div>
      ) : expenses.length === 0 ? (
        <div className="p-12 text-center text-xs text-gray-400 border border-gray-800 rounded-3xl bg-obsidian-card space-y-2">
          <p>لا توجد مصروفات دورية مضافة حالياً</p>
          <p className="text-[11px] text-gray-500">أضف اشتراكات الإنترنت، السيرفرات، والبرمجيات لتتم جدولتها ومتابعتها بدقة.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {expenses.map((exp: any) => {
            const isProcessing = executingId === exp._id && isExecuting;

            return (
              <div
                key={exp._id}
                className="bg-obsidian-card border border-gray-800 hover:border-lord-gold/40 rounded-3xl p-5 shadow-lg space-y-4 transition-all"
              >
                {/* Header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-2xl bg-lord-gold/15 border border-lord-gold/30 flex items-center justify-center text-lord-gold">
                      {exp.category === 'SERVERS' ? (
                        <Server className="w-5 h-5" />
                      ) : exp.category === 'INTERNET' ? (
                        <Wifi className="w-5 h-5" />
                      ) : (
                        <CreditCard className="w-5 h-5" />
                      )}
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-white">{exp.title}</h4>
                      <span className="text-[10px] text-gray-400 block">{exp.beneficiaryName}</span>
                    </div>
                  </div>

                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-lord-gold/10 text-lord-gold border border-lord-gold/30">
                    يوم {exp.dueDayOfMonth} شهرياً
                  </span>
                </div>

                {/* Amount & Method */}
                <div className="grid grid-cols-2 gap-2 p-3 rounded-2xl bg-black/40 border border-gray-800">
                  <div>
                    <span className="text-[10px] text-gray-400 block">المبلغ الدوري</span>
                    <span className="text-base font-black text-lord-gold font-mono">
                      ${exp.amount} {exp.currency}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] text-gray-400 block">النمط</span>
                    <span className="text-xs font-bold text-white block mt-0.5">
                      {exp.isAutoDisburse ? '⚡ صرف آلي' : '🔒 تأكيد يدوي'}
                    </span>
                  </div>
                </div>

                {/* Last Disbursed & Sub-Vault */}
                <div className="text-[10px] text-gray-400 space-y-1">
                  <div className="flex items-center justify-between">
                    <span>الصندوق المسؤول:</span>
                    <span className="font-mono text-gray-300">{exp.targetVault}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>آخر صرف تم:</span>
                    <span className="font-mono text-gray-300">
                      {exp.lastDisbursedAt ? new Date(exp.lastDisbursedAt).toLocaleDateString('ar-EG') : 'لم يصرف بعد'}
                    </span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center justify-between pt-3 border-t border-gray-800 gap-2">
                  <button
                    type="button"
                    onClick={() => handleDelete(exp)}
                    className="p-2 rounded-xl bg-gray-800 text-gray-400 hover:text-red-400 hover:bg-gray-700 transition-colors"
                    title="حذف المصروف"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>

                  <Button
                    variant="gold"
                    size="sm"
                    onClick={() => handleExecute(exp)}
                    isLoading={isProcessing}
                    className="flex-1 text-xs font-bold flex items-center justify-center gap-1.5"
                  >
                    <Play className="w-3.5 h-3.5 ml-1 fill-current" />
                    <span>صرف الآن وتوثيق القيد 💸</span>
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal to add recurring expense */}
      <CreateRecurringExpenseModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={() => refetch()}
      />
    </div>
  );
};
