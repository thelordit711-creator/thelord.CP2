'use client';

import React, { useState } from 'react';
import { AppModalPortal } from '../../ui/AppModalPortal';
import { Button } from '../../ui/Button';
import { ArrowLeftRight, X, Wallet, ShieldCheck } from 'lucide-react';
import { useTransferToSubVaultMutation } from '../../../store/api/treasuryApi';
import { useGetVaultQuery } from '../../../store/api/financeApi';
import { lordToast } from '../../../lib/lordToast';

interface TransferToSubVaultModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const TransferToSubVaultModal: React.FC<TransferToSubVaultModalProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const { data: vaultRes, refetch } = useGetVaultQuery();
  const [transferToSubVault, { isLoading }] = useTransferToSubVaultMutation();

  const vault = vaultRes?.data;
  const treasuryBalance = vault?.treasuryBalance ?? 0;

  const [selectedSubVault, setSelectedSubVault] = useState('salaries');
  const [amount, setAmount] = useState<number>(1000);
  const [reason, setReason] = useState('تخصيص سيولة تشغيلية للصندوق الفرعي');

  const customSubVaults = vault?.customSubVaults || [];

  const subVaultOptions = [
    { code: 'salaries', name: 'صندوق الرواتب والأجور' },
    { code: 'marketing', name: 'صندوق التسويق والإعلانات' },
    { code: 'operationalReserve', name: 'صندوق الاحتياطي التقني والتشغيلي' },
    ...customSubVaults.map((c: any) => ({ code: c.code, name: c.name }))
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = Number(amount);
    if (!numAmount || numAmount <= 0) {
      lordToast.error('المبلغ غير صالح', 'يرجى إدخال مبلغ صحيح أكبر من الصفر');
      return;
    }

    if (numAmount > treasuryBalance) {
      lordToast.error(
        'رصيد صندوق الصرف غير كافٍ',
        `الرصيد المتاح في صندوق الصرف (${treasuryBalance.toLocaleString()} USDT) أقل من المبلغ المطلوب (${numAmount.toLocaleString()} USDT)!`
      );
      return;
    }

    try {
      await transferToSubVault({
        subVaultCode: selectedSubVault,
        amount: numAmount,
        reason: reason.trim()
      }).unwrap();

      lordToast.success(`تم تحويل وتخصيص $${numAmount.toLocaleString()} USDT للصندوق الفرعي بنجاح 💸`);
      refetch();
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      lordToast.error('فشل التحويل', err?.data?.error || 'حدث خطأ أثناء نقل السيولة');
    }
  };

  return (
    <AppModalPortal isOpen={isOpen} onClose={onClose} maxWidthClassName="max-w-lg">
      <div className="bg-[#090c15] border-2 border-lord-gold/30 rounded-3xl p-6 sm:p-7 text-white text-right space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-lord-gold/15 border border-lord-gold/30 flex items-center justify-center text-lord-gold">
              <ArrowLeftRight className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-white">نقل وتخصيص سيولة لصندوق فرعي</h3>
              <p className="text-xs text-gray-400">تغذية الصناديق الفرعية من رصيد صندوق الصرف المركزي</p>
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

        {/* Master Treasury Balance Notice */}
        <div className="p-3.5 rounded-2xl bg-black/50 border border-gray-800 flex items-center justify-between">
          <div>
            <span className="text-[11px] text-gray-400 font-bold block">رصيد صندوق الصرف المتاح للتحويل</span>
            <span className="text-sm font-black text-lord-gold font-mono">${treasuryBalance.toLocaleString()} USDT</span>
          </div>
          <div className="p-2 rounded-xl bg-lord-gold/10 text-lord-gold">
            <Wallet className="w-4 h-4" />
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Target Sub-Vault Selection */}
          <div>
            <label className="block text-xs font-bold text-gray-300 mb-1.5">
              الصندوق الفرعي المستهدف *
            </label>
            <select
              value={selectedSubVault}
              onChange={(e) => setSelectedSubVault(e.target.value)}
              className="w-full bg-[#0d1222] border border-gray-700 focus:border-lord-gold rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none"
            >
              {subVaultOptions.map((opt) => (
                <option key={opt.code} value={opt.code}>
                  {opt.name} ({opt.code})
                </option>
              ))}
            </select>
          </div>

          {/* Amount */}
          <div>
            <label className="block text-xs font-bold text-gray-300 mb-1.5">
              المبلغ المراد نقله (USDT) *
            </label>
            <input
              type="number"
              min="1"
              step="50"
              required
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              className="w-full bg-[#0d1222] border border-gray-700 focus:border-lord-gold rounded-xl px-3.5 py-2.5 text-xs font-mono text-white focus:outline-none"
            />
          </div>

          {/* Quick Amount Pills */}
          <div className="flex items-center gap-2">
            {[500, 1000, 2500, 5000].map((amt) => (
              <button
                key={amt}
                type="button"
                onClick={() => setAmount(amt)}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold transition-all ${
                  amount === amt
                    ? 'bg-lord-gold text-black shadow-gold-glow'
                    : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                }`}
              >
                +${amt}
              </button>
            ))}
          </div>

          {/* Reason */}
          <div>
            <label className="block text-xs font-bold text-gray-300 mb-1.5">
              سبب التحويل والتخصيص *
            </label>
            <input
              type="text"
              required
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full bg-[#0d1222] border border-gray-700 focus:border-lord-gold rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none"
            />
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
              className="text-xs font-bold shadow-gold-glow"
            >
              تأكيد نقل وتخصيص السيولة 💸
            </Button>
          </div>
        </form>
      </div>
    </AppModalPortal>
  );
};

