'use client';

import React, { useState } from 'react';
import { AppModalPortal } from '../../ui/AppModalPortal';
import { Button } from '../../ui/Button';
import { Trash2, X, AlertTriangle, ShieldAlert } from 'lucide-react';
import { useAdminDeleteTransactionMutation } from '../../../store/api/treasuryApi';
import { lordToast } from '../../../lib/lordToast';

interface ConfirmDeleteTransactionModalProps {
  transaction: any | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const ConfirmDeleteTransactionModal: React.FC<ConfirmDeleteTransactionModalProps> = ({
  transaction,
  isOpen,
  onClose,
  onSuccess
}) => {
  const [deleteTransaction, { isLoading }] = useAdminDeleteTransactionMutation();
  const [reason, setReason] = useState('');

  if (!transaction) return null;

  const isPayout = transaction.type === 'PAYOUT';
  const isDisbursed = transaction.status === 'DISBURSED';

  const handleDelete = async () => {
    try {
      await deleteTransaction({
        id: transaction._id,
        type: transaction.type,
        reason: reason.trim() || 'حذف بقرار إداري من المدير العام'
      }).unwrap();

      lordToast.gold(
        'تم الحذف وعكس الأثر المالي',
        isDisbursed
          ? `تم حذف العملية واسترداد $${transaction.amount} إلى رصيد الصندوق وتعديل المعاملات المرتبطة بنجاح 🔄`
          : 'تم حذف وإلغاء العملية بنجاح'
      );
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      lordToast.error('فشل الحذف', err?.data?.error || 'حدث خطأ أثناء حذف العملية');
    }
  };

  return (
    <AppModalPortal isOpen={isOpen} onClose={onClose} maxWidthClassName="max-w-md">
      <div className="bg-[#090c15] border-2 border-red-500/60 rounded-3xl p-6 sm:p-7 text-white text-right space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-red-500/15 border border-red-500/40 flex items-center justify-center text-red-400">
              <Trash2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-white">تأكيد الحذف المتسلسل للعملية</h3>
              <p className="text-xs text-gray-400">صلاحية المسؤول — يتم إلغاء القيد وعكس كافة المعاملات</p>
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

        {/* Transaction Summary */}
        <div className="p-3.5 rounded-2xl bg-black/60 border border-gray-800 space-y-2">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-gray-400">المبلغ:</span>
            <span className="text-sm font-black text-lord-gold">${transaction.amount} {transaction.currency}</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-400">البيان:</span>
            <span className="font-bold text-white truncate max-w-[200px]">{transaction.description}</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-400">المستفيد:</span>
            <span className="text-gray-300">{transaction.beneficiaryName}</span>
          </div>
        </div>

        {/* Impact Warning */}
        <div className="p-3.5 rounded-2xl bg-red-500/10 border border-red-500/40 text-[11px] text-red-300 space-y-2 leading-relaxed">
          <div className="flex items-center gap-1.5 font-bold text-red-400">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>الآثار المالية المتسلسلة الناتجة عن هذا الحذف:</span>
          </div>
          <ul className="list-disc list-inside space-y-1 text-gray-300 text-[10px]">
            {isDisbursed && (
              <li>
                سيتم <strong>استرجاع مبلغ (${transaction.amount} USDT)</strong> فوراً إلى رصيد صندوق الصرف والصندوق الفرعي.
              </li>
            )}
            {isPayout && (
              <>
                <li>سيتم حذف القيد المقابل من كشف حساب الموظف في دفتر الأستاذ (Employee Ledger).</li>
                <li>إذا كانت مرتبطة بمهمة، سيتم فك الارتباط المالي وإعادة تعيين حالة الصرف.</li>
              </>
            )}
            <li>سيتم توثيق هذا الإلغاء بشكل دائم وغير قابل للتعديل في سجل التدقيق الرقابي.</li>
          </ul>
        </div>

        {/* Reason Input */}
        <div>
          <label className="block text-xs font-bold text-gray-300 mb-1.5">
            سبب الحذف (يوثق في سجل الرقابة)
          </label>
          <input
            type="text"
            placeholder="مثال: إلغاء سند بالخطأ، تسوية قيد مكرر..."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full bg-[#0d1222] border border-gray-700 focus:border-red-500 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none"
          />
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-gray-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-xs font-bold text-gray-300"
          >
            تراجع وإلغاء
          </button>
          <Button
            type="button"
            variant="danger"
            size="sm"
            isLoading={isLoading}
            onClick={handleDelete}
            className="text-xs font-bold flex items-center gap-1.5 bg-red-600 hover:bg-red-700"
          >
            <Trash2 className="w-3.5 h-3.5 ml-1" />
            <span>تأكيد الحذف واسترجاع الأرصدة</span>
          </Button>
        </div>
      </div>
    </AppModalPortal>
  );
};

