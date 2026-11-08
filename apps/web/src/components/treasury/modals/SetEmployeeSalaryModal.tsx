'use client';

import React, { useState, useEffect } from 'react';
import { AppModalPortal } from '../../ui/AppModalPortal';
import { Button } from '../../ui/Button';
import { Coins, X, User, Calendar, Save } from 'lucide-react';
import { useUpdateEmployeeSalaryMutation } from '../../../store/api/treasuryApi';
import { lordToast } from '../../../lib/lordToast';

interface SetEmployeeSalaryModalProps {
  employee: any | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const SetEmployeeSalaryModal: React.FC<SetEmployeeSalaryModalProps> = ({
  employee,
  isOpen,
  onClose,
  onSuccess
}) => {
  const [updateSalary, { isLoading }] = useUpdateEmployeeSalaryMutation();

  const [baseSalary, setBaseSalary] = useState<number>(0);
  const [salaryCurrency, setSalaryCurrency] = useState<'USDT' | 'USD' | 'SAR' | 'YER'>('USDT');
  const [payoutDayOfMonth, setPayoutDayOfMonth] = useState<number>(1);

  useEffect(() => {
    if (employee && isOpen) {
      setBaseSalary(employee.compensation?.baseSalary ?? 0);
      setSalaryCurrency(employee.compensation?.salaryCurrency ?? 'USDT');
      setPayoutDayOfMonth(employee.compensation?.payoutDayOfMonth ?? 1);
    }
  }, [employee, isOpen]);

  if (!employee) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateSalary({
        id: employee._id,
        baseSalary: Number(baseSalary) || 0,
        salaryCurrency,
        payoutDayOfMonth: Number(payoutDayOfMonth) || 1
      }).unwrap();

      lordToast.success(`تم تحديث الراتب الشهري للموظف (${employee.fullName}) بنجاح 💵`);
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      lordToast.error('فشل حفظ الراتب', err?.data?.error || 'حدث خطأ أثناء تعديل الراتب');
    }
  };

  return (
    <AppModalPortal isOpen={isOpen} onClose={onClose} maxWidthClassName="max-w-md">
      <div className="bg-[#090c15] border-2 border-lord-gold/50 rounded-3xl p-6 sm:p-7 text-white text-right space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-lord-gold/15 border border-lord-gold/40 flex items-center justify-center text-lord-gold">
              <Coins className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-white">تحديد وضبط راتب الموظف</h3>
              <p className="text-xs text-gray-400">إدارة الاستحقاق الشهري ومسير الرواتب</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl bg-gray-800/60 text-gray-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Employee Info Header */}
        <div className="p-3.5 rounded-2xl bg-obsidian-surface border border-gray-800 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-lord-gold/20 border border-lord-gold/40 flex items-center justify-center font-bold text-xs text-lord-gold">
            {employee.fullName ? employee.fullName.charAt(0) : 'E'}
          </div>
          <div>
            <span className="text-xs font-black text-white block">{employee.fullName}</span>
            <span className="text-[10px] text-gray-400">{employee.email} • {employee.primaryDepartment || 'كادر'}</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Base Salary */}
          <div>
            <label className="block text-xs font-bold text-gray-300 mb-1.5">
              الراتب الشهري الأساسي *
            </label>
            <div className="relative">
              <input
                type="number"
                min="0"
                step="50"
                required
                value={baseSalary}
                onChange={(e) => setBaseSalary(Number(e.target.value))}
                className="w-full bg-[#0d1222] border border-gray-700 focus:border-lord-gold rounded-xl px-3.5 py-2.5 text-base font-black font-mono text-white focus:outline-none"
              />
            </div>
          </div>

          {/* Currency & Payout Day Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-300 mb-1.5">
                عملة الصرف
              </label>
              <select
                value={salaryCurrency}
                onChange={(e) => setSalaryCurrency(e.target.value as any)}
                className="w-full bg-[#0d1222] border border-gray-700 focus:border-lord-gold rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none font-bold"
              >
                <option value="USDT">USDT (رقمي)</option>
                <option value="USD">USD ($)</option>
                <option value="SAR">SAR (ريال سعودي)</option>
                <option value="YER">YER (ريال يمني)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-300 mb-1.5">
                يوم الاستحقاق الشهري
              </label>
              <div className="flex items-center gap-1.5 bg-[#0d1222] border border-gray-700 rounded-xl px-3.5 py-2.5">
                <Calendar className="w-4 h-4 text-gray-400" />
                <input
                  type="number"
                  min="1"
                  max="31"
                  value={payoutDayOfMonth}
                  onChange={(e) => setPayoutDayOfMonth(Number(e.target.value))}
                  className="w-full bg-transparent text-xs font-mono font-bold text-white focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Quick Salary Presets */}
          <div className="flex items-center gap-2 pt-1">
            <span className="text-[10px] text-gray-400">مبالغ شائعة:</span>
            {[300, 500, 800, 1200, 2000].map((amt) => (
              <button
                key={amt}
                type="button"
                onClick={() => setBaseSalary(amt)}
                className={`px-2 py-0.5 rounded-lg text-[10px] font-mono transition-all ${
                  baseSalary === amt
                    ? 'bg-lord-gold text-black font-bold'
                    : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                }`}
              >
                ${amt}
              </button>
            ))}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-gray-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-xs font-bold text-gray-300"
            >
              إلغاء
            </button>
            <Button
              type="submit"
              variant="gold"
              size="sm"
              isLoading={isLoading}
              className="text-xs font-bold flex items-center gap-1.5"
            >
              <Save className="w-3.5 h-3.5 ml-1" />
              <span>حفظ وتثبيت الراتب</span>
            </Button>
          </div>
        </form>
      </div>
    </AppModalPortal>
  );
};
