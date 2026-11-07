'use client';

import React, { useState, useEffect } from 'react';
import { AppModalPortal } from '../../ui/AppModalPortal';
import { Button } from '../../ui/Button';
import { Badge } from '../../ui/Badge';
import {
  Calendar,
  Coins,
  CheckCircle,
  Plus,
  Trash2,
  X,
  Sparkles,
  Wifi,
  Laptop,
  Phone,
  HelpCircle,
  Send,
  Sliders,
  DollarSign
} from 'lucide-react';
import { toast } from 'sonner';
import {
  useUpdatePayrollScheduleMutation,
  useGenerateTranchePayoutsMutation
} from '../../../store/api/financeApi';

interface AllowanceItem {
  title: string;
  amount: number;
  currency: string;
  category: 'INTERNET' | 'COMMUNICATION' | 'SOFTWARE_TOOLS' | 'HOUSING' | 'TRANSPORT' | 'OTHER';
  disbursementDayOfMonth: number;
  isActive: boolean;
  notes?: string;
}

interface PayrollScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  employee: any;
  scheduleData?: any;
  onSuccess?: () => void;
}

export const PayrollScheduleModal: React.FC<PayrollScheduleModalProps> = ({
  isOpen,
  onClose,
  employee,
  scheduleData,
  onSuccess
}) => {
  const [updateSchedule, { isLoading: isUpdating }] = useUpdatePayrollScheduleMutation();
  const [generateTranches, { isLoading: isGenerating }] = useGenerateTranchePayoutsMutation();

  const [baseSalary, setBaseSalary] = useState<number>(0);
  const [cycleType, setCycleType] = useState<'EVERY_10_DAYS' | 'MONTHLY_FULL'>('EVERY_10_DAYS');
  const [tranche1Day, setTranche1Day] = useState<number>(10);
  const [tranche2Day, setTranche2Day] = useState<number>(20);
  const [tranche3Day, setTranche3Day] = useState<number>(30);
  const [requireConfirmation, setRequireConfirmation] = useState<boolean>(false);
  const [sendProof, setSendProof] = useState<boolean>(true);
  const [allowances, setAllowances] = useState<AllowanceItem[]>([]);

  // New allowance input state
  const [newAllowanceTitle, setNewAllowanceTitle] = useState('');
  const [newAllowanceAmount, setNewAllowanceAmount] = useState<number>(50);
  const [newAllowanceCategory, setNewAllowanceCategory] = useState<AllowanceItem['category']>('INTERNET');
  const [newAllowanceDay, setNewAllowanceDay] = useState<number>(1);

  useEffect(() => {
    if (employee) {
      setBaseSalary(scheduleData?.baseMonthlySalary ?? employee.salary?.amount ?? 0);
      setCycleType(scheduleData?.cycleType ?? 'EVERY_10_DAYS');
      setTranche1Day(scheduleData?.tranche1Day ?? 10);
      setTranche2Day(scheduleData?.tranche2Day ?? 20);
      setTranche3Day(scheduleData?.tranche3Day ?? 30);
      setRequireConfirmation(scheduleData?.requireEmployeeReceiptConfirmation ?? false);
      setSendProof(scheduleData?.sendProofAttachmentToEmployee ?? true);
      setAllowances(scheduleData?.allowances ?? []);
    }
  }, [employee, scheduleData]);

  if (!employee) return null;

  const trancheAmount = cycleType === 'EVERY_10_DAYS' ? Math.round((baseSalary / 3) * 100) / 100 : baseSalary;
  const totalAllowances = allowances.filter(a => a.isActive).reduce((sum, a) => sum + (Number(a.amount) || 0), 0);

  const handleAddAllowance = () => {
    if (!newAllowanceTitle.trim() || newAllowanceAmount <= 0) {
      toast.error('يرجى كتابة اسم البدل وتحديد مبلغ صحيح');
      return;
    }

    setAllowances(prev => [
      ...prev,
      {
        title: newAllowanceTitle.trim(),
        amount: Number(newAllowanceAmount),
        currency: 'USDT',
        category: newAllowanceCategory,
        disbursementDayOfMonth: Number(newAllowanceDay),
        isActive: true
      }
    ]);

    setNewAllowanceTitle('');
    setNewAllowanceAmount(50);
    toast.success('تمت إضافة البدل للقائمة (احفظ التعديلات لتثبيتها) ✨');
  };

  const handleRemoveAllowance = (index: number) => {
    setAllowances(prev => prev.filter((_, idx) => idx !== index));
  };

  const handleToggleAllowance = (index: number) => {
    setAllowances(prev => prev.map((a, idx) => idx === index ? { ...a, isActive: !a.isActive } : a));
  };

  const handleSave = async () => {
    try {
      await updateSchedule({
        employeeId: employee._id,
        data: {
          baseMonthlySalary: Number(baseSalary),
          cycleType,
          tranche1Day: Number(tranche1Day),
          tranche2Day: Number(tranche2Day),
          tranche3Day: Number(tranche3Day),
          requireEmployeeReceiptConfirmation: requireConfirmation,
          sendProofAttachmentToEmployee: sendProof,
          allowances
        }
      }).unwrap();

      toast.success('تم حفظ وتحديث جدول الرواتب والبدلات بنجاح! 💾');
      onSuccess?.();
      onClose();
    } catch (err: any) {
      toast.error(err?.data?.error || 'فشل حفظ الإعدادات');
    }
  };

  const handleQuickTrancheDisburse = async (trancheType: string, label: string) => {
    if (!confirm(`هل أنت متأكد من رغبتك في إصدار أمر ${label} وتحويله لمكتب الصندوق الآن؟`)) {
      return;
    }

    try {
      await generateTranches({
        trancheType,
        employeeIds: [employee._id]
      }).unwrap();

      toast.success(`تم إنشاء أمر ${label} وإرساله للخزينة والصندوق بنجاح! 🚀`);
      onSuccess?.();
    } catch (err: any) {
      toast.error(err?.data?.error || 'فشل إنشاء أمر الصرف');
    }
  };

  return (
    <AppModalPortal isOpen={isOpen} onClose={onClose} maxWidthClassName="max-w-2xl">
      <div className="bg-obsidian-surface border-2 border-lord-gold/60 rounded-3xl p-5 sm:p-7 shadow-2xl max-h-[92dvh] overflow-y-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-lord-gold/15 text-lord-gold border border-lord-gold/30 flex items-center justify-center font-bold">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                <span>إدارة تجزئة الراتب والبدلات الشهرية</span>
              </h3>
              <p className="text-xs text-gray-400">
                للموظف: <strong className="text-white">{employee.fullName}</strong> ({employee.primaryDepartment || 'كادر TheLord'})
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl bg-obsidian-card hover:bg-gray-800 text-gray-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Salary & 10-Day Cycle Configuration */}
        <div className="p-4 rounded-2xl bg-obsidian-card border border-lord-gold/30 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-white flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-lord-gold" />
              <span>الراتب الأساسي ونظام دورة الصرف:</span>
            </span>
            <div className="flex items-center gap-1 bg-obsidian-primary p-0.5 rounded-xl border border-gray-800 text-xs">
              <button
                type="button"
                onClick={() => setCycleType('EVERY_10_DAYS')}
                className={`px-3 py-1 rounded-lg font-bold transition-all ${
                  cycleType === 'EVERY_10_DAYS'
                    ? 'bg-lord-gold text-obsidian-primary shadow-sm'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                تجزئة كل 10 أيام 📅
              </button>
              <button
                type="button"
                onClick={() => setCycleType('MONTHLY_FULL')}
                className={`px-3 py-1 rounded-lg font-bold transition-all ${
                  cycleType === 'MONTHLY_FULL'
                    ? 'bg-purple-600 text-white shadow-sm'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                دفعة شهرية كاملة 🏢
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div>
              <label className="block text-[11px] text-gray-400 mb-1">الراتب الشهري الأساسي (USDT):</label>
              <input
                type="number"
                min={0}
                value={baseSalary}
                onChange={(e) => setBaseSalary(Number(e.target.value))}
                className="w-full bg-obsidian-primary border border-gray-700 rounded-xl px-3 py-2 text-sm text-white font-mono font-bold focus:border-lord-gold"
              />
            </div>
            <div>
              <label className="block text-[11px] text-gray-400 mb-1">
                {cycleType === 'EVERY_10_DAYS' ? 'قيمة كل دفعة (كل 10 أيام):' : 'صافي الراتب الشهري:'}
              </label>
              <div className="w-full bg-obsidian-surface border border-gray-800 rounded-xl px-3 py-2 text-sm font-mono font-black text-lord-gold">
                ${trancheAmount.toLocaleString()} USDT {cycleType === 'EVERY_10_DAYS' && <span className="text-[10px] text-gray-400 font-normal">/ 3 دفعات</span>}
              </div>
            </div>
          </div>

          {cycleType === 'EVERY_10_DAYS' && (
            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-gray-800">
              <div className="p-2 rounded-xl bg-obsidian-primary border border-gray-800 text-center">
                <span className="text-[10px] text-gray-400 block">الدفعة 1</span>
                <span className="text-xs font-bold text-lord-gold">يوم {tranche1Day}</span>
              </div>
              <div className="p-2 rounded-xl bg-obsidian-primary border border-gray-800 text-center">
                <span className="text-[10px] text-gray-400 block">الدفعة 2</span>
                <span className="text-xs font-bold text-lord-gold">يوم {tranche2Day}</span>
              </div>
              <div className="p-2 rounded-xl bg-obsidian-primary border border-gray-800 text-center">
                <span className="text-[10px] text-gray-400 block">الدفعة 3</span>
                <span className="text-xs font-bold text-lord-gold">يوم {tranche3Day}</span>
              </div>
            </div>
          )}
        </div>

        {/* Quick Tranche Actions for Admin */}
        <div className="p-4 rounded-2xl bg-obsidian-card border border-cyber-blue/30 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-cyber-blue flex items-center gap-1.5">
              <Coins className="w-4 h-4" />
              <span>إصدار أوامر الصرف الفورية للخزينة:</span>
            </span>
            <span className="text-[10px] text-gray-400">تصل فوراً لمكتب الصندوق</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <button
              type="button"
              disabled={isGenerating}
              onClick={() => handleQuickTrancheDisburse('TRANCHE_1', 'الدفعة الأولى (1-10)')}
              className="p-2.5 rounded-xl bg-lord-gold/15 hover:bg-lord-gold text-lord-gold hover:text-obsidian-primary border border-lord-gold/40 text-xs font-black transition-all flex flex-col items-center justify-center gap-1 text-center"
            >
              <span>الدفعة 1 (1-10)</span>
              <span className="text-[10px] font-mono">${trancheAmount}</span>
            </button>

            <button
              type="button"
              disabled={isGenerating}
              onClick={() => handleQuickTrancheDisburse('TRANCHE_2', 'الدفعة الثانية (11-20)')}
              className="p-2.5 rounded-xl bg-lord-gold/15 hover:bg-lord-gold text-lord-gold hover:text-obsidian-primary border border-lord-gold/40 text-xs font-black transition-all flex flex-col items-center justify-center gap-1 text-center"
            >
              <span>الدفعة 2 (11-20)</span>
              <span className="text-[10px] font-mono">${trancheAmount}</span>
            </button>

            <button
              type="button"
              disabled={isGenerating}
              onClick={() => handleQuickTrancheDisburse('TRANCHE_3', 'الدفعة الثالثة (21-30)')}
              className="p-2.5 rounded-xl bg-lord-gold/15 hover:bg-lord-gold text-lord-gold hover:text-obsidian-primary border border-lord-gold/40 text-xs font-black transition-all flex flex-col items-center justify-center gap-1 text-center"
            >
              <span>الدفعة 3 (21-30)</span>
              <span className="text-[10px] font-mono">${trancheAmount}</span>
            </button>

            <button
              type="button"
              disabled={isGenerating || totalAllowances <= 0}
              onClick={() => handleQuickTrancheDisburse('MONTHLY_ALLOWANCE', 'البدلات الشهرية')}
              className="p-2.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500 text-emerald-400 hover:text-white border border-emerald-500/40 text-xs font-black transition-all flex flex-col items-center justify-center gap-1 text-center"
            >
              <span>صرف البدلات</span>
              <span className="text-[10px] font-mono">${totalAllowances}</span>
            </button>
          </div>
        </div>

        {/* Monthly Recurring Allowances (e.g. Internet, Tools) */}
        <div className="p-4 rounded-2xl bg-obsidian-card border border-gray-800 space-y-4">
          <div className="flex items-center justify-between border-b border-gray-800 pb-2">
            <div>
              <span className="text-xs font-bold text-white flex items-center gap-2">
                <Wifi className="w-4 h-4 text-emerald-400" />
                <span>البدلات والمصروفات الشهرية للموظف (بدل نت، اتصالات، أدوات):</span>
              </span>
              <span className="text-[10px] text-gray-400">تُحدد شهرياً وتُصرف بانتظام للموظف المستحق</span>
            </div>
            <span className="font-mono text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-lg border border-emerald-500/20">
              إجمالي: ${totalAllowances} USDT
            </span>
          </div>

          {/* Existing Allowances List */}
          {allowances.length === 0 ? (
            <p className="text-center py-3 text-xs text-gray-500">
              لا توجد بدلات مخصصة لهذا الموظف حالياً. أضف بنداً جديداً بالأسفل.
            </p>
          ) : (
            <div className="space-y-2">
              {allowances.map((allowance, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-obsidian-surface border border-gray-800 gap-2"
                >
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleToggleAllowance(idx)}
                      className={`w-4 h-4 rounded border flex items-center justify-center text-[10px] ${
                        allowance.isActive ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-gray-600'
                      }`}
                    >
                      {allowance.isActive ? '✓' : ''}
                    </button>
                    <div>
                      <span className={`text-xs font-bold ${allowance.isActive ? 'text-white' : 'text-gray-500 line-through'}`}>
                        {allowance.title}
                      </span>
                      <span className="text-[10px] text-gray-400 block font-mono">
                        يُصرف يوم {allowance.disbursementDayOfMonth} من كل شهر
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="font-mono font-bold text-xs text-lord-gold">
                      ${allowance.amount} USDT
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveAllowance(idx)}
                      className="p-1 rounded-lg text-gray-500 hover:text-red-400 hover:bg-gray-800 transition-colors"
                      title="حذف البدل"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Add New Allowance Form */}
          <div className="p-3 rounded-xl bg-obsidian-primary/80 border border-gray-800/80 space-y-2.5">
            <span className="text-[11px] font-bold text-gray-300 block">+ إضافة بند بدل أو مصروف شهري جديد:</span>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
              <div className="sm:col-span-2">
                <input
                  type="text"
                  placeholder="اسم البدل (مثال: بدل إنترنت شهري 🌐)..."
                  value={newAllowanceTitle}
                  onChange={(e) => setNewAllowanceTitle(e.target.value)}
                  className="w-full bg-obsidian-card border border-gray-700 rounded-xl px-3 py-1.5 text-xs text-white focus:border-lord-gold"
                />
              </div>
              <div>
                <input
                  type="number"
                  min={1}
                  placeholder="المبلغ ($)"
                  value={newAllowanceAmount}
                  onChange={(e) => setNewAllowanceAmount(Number(e.target.value))}
                  className="w-full bg-obsidian-card border border-gray-700 rounded-xl px-3 py-1.5 text-xs text-white font-mono focus:border-lord-gold"
                />
              </div>
              <div>
                <Button
                  type="button"
                  variant="gold"
                  size="sm"
                  onClick={handleAddAllowance}
                  className="w-full text-xs font-bold"
                >
                  + إضافة البدل
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Governance Settings (Confirmation & Proof delivery) */}
        <div className="p-4 rounded-2xl bg-obsidian-card border border-gray-800 space-y-3">
          <span className="text-xs font-bold text-white block">إعدادات وضوابط الصندوق لهذا الموظف:</span>

          <label className="flex items-center justify-between p-2.5 rounded-xl bg-obsidian-surface border border-gray-800 cursor-pointer hover:border-gray-700">
            <div>
              <span className="text-xs font-bold text-white block">طلب تأكيد استلام الحوالة من الموظف:</span>
              <span className="text-[10px] text-gray-400">
                عند التفعيل، يُلزم الموظف بنقر زر تأكيد استلام الحوالة في حسابه لإشعار الإدارة
              </span>
            </div>
            <input
              type="checkbox"
              checked={requireConfirmation}
              onChange={(e) => setRequireConfirmation(e.target.checked)}
              className="w-4 h-4 rounded text-lord-gold focus:ring-0 cursor-pointer"
            />
          </label>

          <label className="flex items-center justify-between p-2.5 rounded-xl bg-obsidian-surface border border-gray-800 cursor-pointer hover:border-gray-700">
            <div>
              <span className="text-xs font-bold text-white block">إرسال صورة وسند التحويل للموظف:</span>
              <span className="text-[10px] text-gray-400">
                إظهار صورة إشعار الحوالة التي رفعها الصندوق في كشف حساب الموظف وتفاصيل المهمة
              </span>
            </div>
            <input
              type="checkbox"
              checked={sendProof}
              onChange={(e) => setSendProof(e.target.checked)}
              className="w-4 h-4 rounded text-lord-gold focus:ring-0 cursor-pointer"
            />
          </label>
        </div>

        {/* Modal Actions */}
        <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-800">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClose}
          >
            إلغاء
          </Button>
          <Button
            type="button"
            variant="gold"
            size="md"
            isLoading={isUpdating}
            onClick={handleSave}
            className="font-black"
          >
            حفظ إعدادات الرواتب والبدلات 💾
          </Button>
        </div>
      </div>
    </AppModalPortal>
  );
};
