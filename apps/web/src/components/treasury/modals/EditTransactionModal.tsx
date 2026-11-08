'use client';

import React, { useState, useEffect } from 'react';
import { AppModalPortal } from '../../ui/AppModalPortal';
import { Button } from '../../ui/Button';
import { Edit3, X, AlertTriangle, Save, DollarSign } from 'lucide-react';
import { useAdminUpdateTransactionMutation } from '../../../store/api/treasuryApi';
import { lordToast } from '../../../lib/lordToast';

interface EditTransactionModalProps {
  transaction: any | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const EditTransactionModal: React.FC<EditTransactionModalProps> = ({
  transaction,
  isOpen,
  onClose,
  onSuccess
}) => {
  const [updateTransaction, { isLoading }] = useAdminUpdateTransactionMutation();

  const [amount, setAmount] = useState<number>(0);
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('GENERAL');
  const [targetVault, setTargetVault] = useState('operationalReserve');
  const [reason, setReason] = useState('تعديل مالي معتمد من الإدارة العليا');

  useEffect(() => {
    if (transaction && isOpen) {
      setAmount(transaction.amount ?? 0);
      setDescription(transaction.description ?? '');
      setCategory(transaction.category ?? 'GENERAL');
      setTargetVault(transaction.targetVault ?? 'salaries');
    }
  }, [transaction, isOpen]);

  if (!transaction) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateTransaction({
        id: transaction._id,
        type: transaction.type,
        amount: Number(amount) || 0,
        summary: description.trim(),
        category,
        targetVault,
        reason: reason.trim()
      }).unwrap();

      lordToast.success(
        'تم حفظ التعديلات بنجاح',
        'تم تحديث العملية وضبط فروقات الأرصدة في الصندوق والمعاملات المرتبطة آلياً 🔄'
      );
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      lordToast.error('فشل التعديل', err?.data?.error || 'حدث خطأ أثناء حفظ التعديل');
    }
  };

  return (
    <AppModalPortal isOpen={isOpen} onClose={onClose} maxWidthClassName="max-w-lg">
      <div className="bg-[#090c15] border-2 border-lord-gold/60 rounded-3xl p-6 sm:p-7 text-white text-right space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-lord-gold/15 border border-lord-gold/40 flex items-center justify-center text-lord-gold">
              <Edit3 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-white">تعديل قيد مالي مع إعادة الضبط المتسلسل</h3>
              <p className="text-xs text-gray-400">صلاحية حصرية للمدير العام — يتم عكس وضبط فروقات الأرصدة تلقائياً</p>
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

        {/* Current Transaction Overview */}
        <div className="p-3.5 rounded-2xl bg-obsidian-surface border border-gray-800 flex items-center justify-between">
          <div>
            <span className="text-[11px] text-gray-400 block font-bold">نوع القيد الحالي</span>
            <span className="text-xs font-black text-white">
              {transaction.type === 'PAYOUT' ? 'سند صرف معتمد 💸' : 'إيداع / تحويل سيولة 📥'}
            </span>
            <span className="text-[10px] text-gray-400 block font-mono mt-0.5">
              المستفيد: {transaction.beneficiaryName}
            </span>
          </div>
          <div className="text-left font-mono">
            <span className="text-[10px] text-gray-400 block">المبلغ الحالي</span>
            <span className="text-sm font-black text-lord-gold">${transaction.amount} {transaction.currency}</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* New Amount */}
          <div>
            <label className="block text-xs font-bold text-gray-300 mb-1.5">
              المبلغ المعدل *
            </label>
            <input
              type="number"
              min="0"
              step="any"
              required
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              className="w-full bg-[#0d1222] border border-gray-700 focus:border-lord-gold rounded-xl px-3.5 py-2.5 text-base font-black font-mono text-white focus:outline-none"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-bold text-gray-300 mb-1.5">
              البيان / تفاصيل العملية *
            </label>
            <input
              type="text"
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-[#0d1222] border border-gray-700 focus:border-lord-gold rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none"
            />
          </div>

          {/* Reason for Edit */}
          <div>
            <label className="block text-xs font-bold text-gray-300 mb-1.5">
              مبرر التعديل الإداري (يوثق في سجل التدقيق) *
            </label>
            <input
              type="text"
              required
              placeholder="اكتب سبب التعديل (مثال: تصحيح خطأ إدخال، تعديل اتفاق...)"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full bg-[#0d1222] border border-gray-700 focus:border-lord-gold rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none"
            />
          </div>

          {/* Cascading Notice */}
          <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-[11px] text-amber-300 leading-relaxed flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
            <span>
              أي فرق في المبلغ سيتم خصمه أو استرداده تلقائياً من رصيد الصندوق المعني وتعديل سجل الموظف والمهمة المرتبطة.
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
              <Save className="w-3.5 h-3.5 ml-1" />
              <span>حفظ وتطبيق التعديل المتسلسل</span>
            </Button>
          </div>
        </form>
      </div>
    </AppModalPortal>
  );
};

