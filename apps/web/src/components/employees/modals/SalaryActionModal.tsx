'use client';

import React, { useState } from 'react';
import { AppModalPortal } from '../../ui/AppModalPortal';
import { Button } from '../../ui/Button';
import { Award, X } from 'lucide-react';
import { lordToast } from '../../../lib/lordToast';
import { useManageEmployeeLedgerMutation } from '../../../store/api/financeApi';

interface SalaryActionModalProps {
  employee: any | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const SalaryActionModal: React.FC<SalaryActionModalProps> = ({
  employee,
  isOpen,
  onClose,
  onSuccess
}) => {
  const [manageEmployeeLedger, { isLoading: isUpdatingLedger }] =
    useManageEmployeeLedgerMutation();

  const [actionType, setActionType] = useState<
    'BONUS' | 'DEDUCTION' | 'WARNING' | 'ADVANCE_REQUEST' | 'BASE_SALARY'
  >('BONUS');
  const [actionAmount, setActionAmount] = useState(100);
  const [actionReason, setActionReason] = useState('مكافأة إنجاز مهمة استثنائية وتحقيق نتائج مبهرة');
  const [actionWarning, setActionWarning] = useState<'FIRST' | 'SECOND' | 'FINAL'>('FIRST');

  if (!employee) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await manageEmployeeLedger({
        employeeId: employee._id,
        data: {
          entryType: actionType as any,
          amount: actionType !== 'WARNING' ? actionAmount : 0,
          reason: actionReason,
          warningLevel: actionType === 'WARNING' ? actionWarning : undefined
        }
      }).unwrap();

      lordToast.financial(
        actionAmount,
        `تم قيد الإجراء (${actionType}) للموظف ${employee.fullName} بنجاح`
      );
      onSuccess?.();
      onClose();
    } catch (err: any) {
      lordToast.error('فشل الإجراء', err?.data?.error || 'حدث خطأ أثناء قيد السجل المالي');
    }
  };

  return (
    <AppModalPortal isOpen={isOpen} onClose={onClose} maxWidthClassName="max-w-lg">
      <div className="bg-obsidian-surface border border-lord-gold/40 rounded-3xl p-6 shadow-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-gray-800 pb-3">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Award className="w-5 h-5 text-lord-gold" />
            <span>إجراء مالي أو إداري: {employee.fullName}</span>
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-gray-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1">نوع الإجراء:</label>
            <div className="grid grid-cols-3 gap-2 text-xs">
              {[
                { id: 'BONUS', label: '+ مكافأة إنجاز' },
                { id: 'DEDUCTION', label: '- خصم مالي' },
                { id: 'WARNING', label: '⚠️ إنذار إداري' },
                { id: 'ADVANCE_REQUEST', label: '💵 سلفة مؤقتة' },
                { id: 'BASE_SALARY', label: '📝 تعديل الراتب' }
              ].map((act) => (
                <button
                  key={act.id}
                  type="button"
                  onClick={() => setActionType(act.id as any)}
                  className={`p-2 rounded-xl font-bold transition-all ${actionType === act.id
                      ? 'bg-lord-gold text-obsidian-primary shadow-gold-glow'
                      : 'bg-obsidian-card text-gray-400 border border-gray-800'
                    }`}
                >
                  {act.label}
                </button>
              ))}
            </div>
          </div>

          {actionType !== 'WARNING' ? (
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1">
                {actionType === 'BASE_SALARY' ? 'الراتب الأساسي الجديد (USDT):' : 'المبلغ (USDT):'}
              </label>
              <input
                type="number"
                min={1}
                required
                value={actionAmount}
                onChange={(e) => setActionAmount(Number(e.target.value))}
                className="w-full bg-obsidian-primary border border-gray-700 rounded-xl px-4 py-2 text-sm text-white focus:border-lord-gold"
              />
            </div>
          ) : (
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1">مستوى الإنذار:</label>
              <select
                value={actionWarning}
                onChange={(e) => setActionWarning(e.target.value as any)}
                className="w-full bg-obsidian-primary border border-gray-700 rounded-xl px-4 py-2 text-sm text-white"
              >
                <option value="FIRST">إنذار أولي (First Warning)</option>
                <option value="SECOND">إنذار ثانٍ (Second Warning)</option>
                <option value="FINAL">إنذار نهائي مشدد (Final Notice)</option>
              </select>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1">السبب والمبرر الإداري:</label>
            <textarea
              rows={3}
              required
              value={actionReason}
              onChange={(e) => setActionReason(e.target.value)}
              className="w-full bg-obsidian-primary border border-gray-700 rounded-xl p-3 text-xs text-white focus:border-lord-gold"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-800">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onClose}
            >
              إلغاء
            </Button>
            <Button
              type="submit"
              variant="gold"
              size="sm"
              isLoading={isUpdatingLedger}
            >
              تأكيد وقيد في كشف الحساب
            </Button>
          </div>
        </form>
      </div>
    </AppModalPortal>
  );
};
