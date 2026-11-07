'use client';

import React, { useState } from 'react';
import { AppModalPortal } from '../../ui/AppModalPortal';
import { Button } from '../../ui/Button';
import { Ban, ShieldAlert, X } from 'lucide-react';
import { lordToast } from '../../../lib/lordToast';
import { useToggleUserSuspensionMutation } from '../../../store/api/usersApi';

interface SuspendEmployeeModalProps {
  employee: any | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const SuspendEmployeeModal: React.FC<SuspendEmployeeModalProps> = ({
  employee,
  isOpen,
  onClose,
  onSuccess
}) => {
  const [toggleUserSuspension, { isLoading: isTogglingSuspension }] =
    useToggleUserSuspensionMutation();
  const [suspensionReason, setSuspensionReason] = useState('مخالفة سياسات المنظومة وسرية العمل');

  if (!employee) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await toggleUserSuspension({
        id: employee._id,
        isSuspended: true,
        reason: suspensionReason.trim()
      }).unwrap();

      lordToast.error(
        'تم إيقاف الموظف',
        res?.message || `تم منع الموظف ${employee.fullName} من دخول المنظومة وفصل جلسته فورياً ⛔`
      );
      onSuccess?.();
      onClose();
    } catch (err: any) {
      lordToast.error('فشل الإيقاف', err?.data?.error || 'حدث خطأ أثناء تعديل حالة الحساب');
    }
  };

  return (
    <AppModalPortal isOpen={isOpen} onClose={onClose} maxWidthClassName="max-w-md">
      <div className="bg-obsidian-surface border-2 border-red-500/60 rounded-3xl p-6 shadow-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-gray-800 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-red-500/20 border border-red-500/40 flex items-center justify-center text-red-400">
              <Ban className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">منع الموظف من دخول المنظومة</h3>
              <p className="text-[11px] text-red-300 font-mono">{employee.fullName}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-3 rounded-2xl bg-red-950/40 border border-red-500/35 text-xs text-red-200 space-y-1">
          <div className="flex items-center gap-1.5 font-bold text-red-300">
            <ShieldAlert className="w-4 h-4 text-red-400" />
            <span>تحذير أمني:</span>
          </div>
          <p className="text-[11px] leading-relaxed text-gray-300">
            سيؤدي هذا الإجراء إلى إنهاء جلسة الموظف فورياً وطرده من النظام ومنعه من تسجيل الدخول حتى قيام المسؤول برفع الحظر عنه.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1.5">
              سبب ومبرر الإيقاف والمنع:
            </label>
            <textarea
              rows={3}
              required
              value={suspensionReason}
              onChange={(e) => setSuspensionReason(e.target.value)}
              className="w-full bg-obsidian-primary border border-gray-700 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-red-400"
              placeholder="اكتب سبب المنع ليظهر للموظف عند محاولة تسجيل الدخول..."
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-800">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onClose}
            >
              تراجع
            </Button>
            <Button
              type="submit"
              variant="danger"
              size="sm"
              isLoading={isTogglingSuspension}
              className="flex items-center gap-1 shadow-md"
            >
              <Ban className="w-3.5 h-3.5" />
              <span>تأكيد منع الحساب من الدخول ⛔</span>
            </Button>
          </div>
        </form>
      </div>
    </AppModalPortal>
  );
};
