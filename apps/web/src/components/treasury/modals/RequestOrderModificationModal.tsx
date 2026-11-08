'use client';

import React, { useState } from 'react';
import { AppModalPortal } from '../../ui/AppModalPortal';
import { Button } from '../../ui/Button';
import { ShieldAlert, AlertTriangle, X, Send } from 'lucide-react';
import { useRequestOrderModificationMutation } from '../../../store/api/treasuryApi';
import { IPayoutOrder } from '@lord/shared-types';
import { lordToast } from '../../../lib/lordToast';

interface RequestOrderModificationModalProps {
  order: IPayoutOrder | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const RequestOrderModificationModal: React.FC<RequestOrderModificationModalProps> = ({
  order,
  isOpen,
  onClose,
  onSuccess
}) => {
  const [requestModification, { isLoading }] = useRequestOrderModificationMutation();

  const [requestedAction, setRequestedAction] = useState<'CANCEL' | 'EDIT_DETAILS'>('CANCEL');
  const [reason, setReason] = useState('');
  const [proposedNote, setProposedNote] = useState('');

  if (!order) return null;

  const beneficiaryName =
    typeof order.beneficiaryId === 'object'
      ? (order.beneficiaryId as any)?.fullName
      : 'المستفيد';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      lordToast.error('السبب مطلوب', 'يرجى كتابة سبب طلب الإلغاء أو التعديل لتقديمه للمسؤول');
      return;
    }

    try {
      await requestModification({
        id: order._id,
        requestedAction,
        reason: reason.trim(),
        proposedNote: proposedNote.trim()
      }).unwrap();

      lordToast.gold(
        'تم رفع الطلب بنجاح',
        'تم إرسال طلب التعديل/الإلغاء إلى القائد الأعلى (المدير العام) للاعتماد والموافقة'
      );
      setReason('');
      setProposedNote('');
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      lordToast.error('فشل إرسال الطلب', err?.data?.error || 'حدث خطأ أثناء رفع الطلب');
    }
  };

  return (
    <AppModalPortal isOpen={isOpen} onClose={onClose} maxWidthClassName="max-w-lg">
      <div className="bg-[#090c15] border-2 border-amber-500/50 rounded-3xl p-6 sm:p-7 text-white text-right space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/15 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-white">طلب تعديل أو إلغاء عملية للمسؤول</h3>
              <p className="text-xs text-gray-400">حوكمة مالية: تتطلب موافقة المدير العام لاعتماد أي تغيير</p>
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

        {/* Order Quick Summary */}
        <div className="p-3.5 rounded-2xl bg-obsidian-surface border border-gray-800 flex items-center justify-between">
          <div>
            <span className="text-[11px] text-gray-400 block font-bold">المستفيد والعملية</span>
            <span className="text-xs font-black text-white">{beneficiaryName}</span>
            <span className="text-[10px] text-gray-400 block font-mono mt-0.5">{order.summaryForTreasury}</span>
          </div>
          <div className="text-left font-mono">
            <span className="text-xs font-bold text-gray-400 block">المبلغ</span>
            <span className="text-sm font-black text-lord-gold">${order.amount} {order.currency}</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Action Choice */}
          <div>
            <label className="block text-xs font-bold text-gray-300 mb-2">
              نوع الإجراء المطلوب اعتماده من المسؤول *
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setRequestedAction('CANCEL')}
                className={`p-3 rounded-2xl border text-right transition-all flex flex-col gap-1 ${
                  requestedAction === 'CANCEL'
                    ? 'bg-red-500/15 border-red-500 text-white'
                    : 'bg-obsidian-card border-gray-800 text-gray-400 hover:border-gray-700'
                }`}
              >
                <span className="text-xs font-black text-red-400">إلغاء وحذف العملية 🚫</span>
                <span className="text-[10px] text-gray-400">إبطال السند واسترجاع الرصيد</span>
              </button>

              <button
                type="button"
                onClick={() => setRequestedAction('EDIT_DETAILS')}
                className={`p-3 rounded-2xl border text-right transition-all flex flex-col gap-1 ${
                  requestedAction === 'EDIT_DETAILS'
                    ? 'bg-amber-500/15 border-amber-500 text-white'
                    : 'bg-obsidian-card border-gray-800 text-gray-400 hover:border-gray-700'
                }`}
              >
                <span className="text-xs font-black text-amber-400">تعديل بيانات الحوالة ✏️</span>
                <span className="text-[10px] text-gray-400">تعديل المحفظة أو المبلغ</span>
              </button>
            </div>
          </div>

          {/* Reason */}
          <div>
            <label className="block text-xs font-bold text-gray-300 mb-1.5">
              سبب ومبرر الطلب (يظهر للإدارة) *
            </label>
            <textarea
              required
              rows={3}
              placeholder="اكتب بالتفصيل سبب طلب التعديل أو الإلغاء (مثال: خطأ في عنوان المحفظة، تكرار السند، تعديل الاتفاق...)"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full bg-[#0d1222] border border-gray-700 focus:border-amber-500 rounded-xl p-3 text-xs text-white focus:outline-none resize-none"
            />
          </div>

          {/* Proposed Note */}
          <div>
            <label className="block text-xs font-bold text-gray-300 mb-1.5">
              البيانات البديلة المقترحة (اختياري)
            </label>
            <input
              type="text"
              placeholder="مثال: تحويل المبلغ إلى العنوان الجديد 0x... أو تغيير المبلغ إلى 150"
              value={proposedNote}
              onChange={(e) => setProposedNote(e.target.value)}
              className="w-full bg-[#0d1222] border border-gray-700 focus:border-amber-500 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none"
            />
          </div>

          {/* Policy Note */}
          <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-[11px] text-amber-300 leading-relaxed flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
            <span>
              سيبقى السند معلقاً ولن يتم أي تغيير حتى يقوم المدير العام بالاطلاع والموافقة الرقمية عليه.
            </span>
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
              <Send className="w-3.5 h-3.5 ml-1" />
              <span>إرسال الطلب للمسؤول</span>
            </Button>
          </div>
        </form>
      </div>
    </AppModalPortal>
  );
};

