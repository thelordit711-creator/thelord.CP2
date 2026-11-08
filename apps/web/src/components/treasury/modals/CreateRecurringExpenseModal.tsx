'use client';

import React, { useState } from 'react';
import { AppModalPortal } from '../../ui/AppModalPortal';
import { Button } from '../../ui/Button';
import { CalendarCheck, X, Server, Wifi, Sparkles, Globe, DollarSign } from 'lucide-react';
import { useCreateRecurringExpenseMutation } from '../../../store/api/treasuryApi';
import { useGetVaultQuery } from '../../../store/api/financeApi';
import { lordToast } from '../../../lib/lordToast';

interface CreateRecurringExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const CreateRecurringExpenseModal: React.FC<CreateRecurringExpenseModalProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const [createExpense, { isLoading }] = useCreateRecurringExpenseMutation();
  const { data: vaultRes } = useGetVaultQuery();
  const vault = vaultRes?.data;
  const customSubVaults = vault?.customSubVaults || [];

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<'INTERNET' | 'SERVERS' | 'SOFTWARE' | 'MARKETING' | 'RENT' | 'OTHER'>('SERVERS');
  const [amount, setAmount] = useState<number>(150);
  const [currency, setCurrency] = useState<'USDT' | 'USD' | 'SAR' | 'YER'>('USDT');
  const [targetVault, setTargetVault] = useState('operationalReserve');
  const [beneficiaryName, setBeneficiaryName] = useState('');
  const [payoutMethod, setPayoutMethod] = useState<'BEP20_USDT' | 'JEEB_WALLET' | 'JAWALI_WALLET'>('BEP20_USDT');
  const [destinationAddress, setDestinationAddress] = useState('');
  const [dueDayOfMonth, setDueDayOfMonth] = useState<number>(1);
  const [isAutoDisburse, setIsAutoDisburse] = useState<boolean>(false);

  const subVaultOptions = [
    { code: 'operationalReserve', name: 'صندوق الاحتياطي التقني والتشغيلي' },
    { code: 'marketing', name: 'صندوق التسويق والإعلانات' },
    { code: 'salaries', name: 'صندوق الرواتب والأجور' },
    ...customSubVaults.map((c: any) => ({ code: c.code, name: c.name }))
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !beneficiaryName.trim()) {
      lordToast.error('حقول مطلوبة', 'يرجى كتابة عنوان المصروف والجهة أو المستفيد');
      return;
    }

    try {
      await createExpense({
        title: title.trim(),
        category,
        amount: Number(amount) || 0,
        currency,
        targetVault,
        beneficiaryName: beneficiaryName.trim(),
        payoutMethod,
        destinationAddress: destinationAddress.trim(),
        dueDayOfMonth: Number(dueDayOfMonth) || 1,
        isAutoDisburse
      }).unwrap();

      lordToast.success(`تمت جدولة المصروف الشهري (${title}) بنجاح 📅`);
      setTitle('');
      setBeneficiaryName('');
      setDestinationAddress('');
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      lordToast.error('فشل حفظ المصروف', err?.data?.error || 'حدث خطأ أثناء جدولة المصروف');
    }
  };

  return (
    <AppModalPortal isOpen={isOpen} onClose={onClose} maxWidthClassName="max-w-lg">
      <div className="bg-[#090c15] border-2 border-lord-gold/50 rounded-3xl p-6 sm:p-7 text-white text-right space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-lord-gold/15 border border-lord-gold/40 flex items-center justify-center text-lord-gold">
              <CalendarCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-white">إضافة وجدولة مصروف شهري دوري</h3>
              <p className="text-xs text-gray-400">سيرفرات، اشتراكات برمجية، إنترنت، ومصروفات دورية</p>
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

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Title & Beneficiary */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-300 mb-1.5">
                عنوان المصروف الدوري *
              </label>
              <input
                type="text"
                required
                placeholder="مثال: اشتراك خوادم AWS أو فايبر النت"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full bg-[#0d1222] border border-gray-700 focus:border-lord-gold rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-300 mb-1.5">
                الجهة أو الشركة المستفيدة *
              </label>
              <input
                type="text"
                required
                placeholder="مثال: Amazon Web Services / مزود النت"
                value={beneficiaryName}
                onChange={(e) => setBeneficiaryName(e.target.value)}
                className="w-full bg-[#0d1222] border border-gray-700 focus:border-lord-gold rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none"
              />
            </div>
          </div>

          {/* Category & Sub-Vault */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-300 mb-1.5">
                تصنيف المصروف
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as any)}
                className="w-full bg-[#0d1222] border border-gray-700 focus:border-lord-gold rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none"
              >
                <option value="SERVERS">سيرفرات واستضافة (SERVERS)</option>
                <option value="INTERNET">إنترنت واتصالات (INTERNET)</option>
                <option value="SOFTWARE">اشتراكات برمجيات وأدوات (SOFTWARE)</option>
                <option value="MARKETING">إعلانات وتسويق دوري (MARKETING)</option>
                <option value="RENT">إيجارات ومكاتب (RENT)</option>
                <option value="OTHER">مصروف تشغيلي آخر (OTHER)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-300 mb-1.5">
                الصندوق الفرعي المسؤول عن الخصم
              </label>
              <select
                value={targetVault}
                onChange={(e) => setTargetVault(e.target.value)}
                className="w-full bg-[#0d1222] border border-gray-700 focus:border-lord-gold rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none"
              >
                {subVaultOptions.map((opt) => (
                  <option key={opt.code} value={opt.code}>
                    {opt.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Amount, Currency & Due Day */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-300 mb-1.5">
                المبلغ الدوري *
              </label>
              <input
                type="number"
                min="1"
                step="10"
                required
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
                className="w-full bg-[#0d1222] border border-gray-700 focus:border-lord-gold rounded-xl px-3 py-2.5 text-xs font-mono font-bold text-white focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-300 mb-1.5">
                العملة
              </label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value as any)}
                className="w-full bg-[#0d1222] border border-gray-700 focus:border-lord-gold rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none"
              >
                <option value="USDT">USDT</option>
                <option value="USD">USD</option>
                <option value="SAR">SAR</option>
                <option value="YER">YER</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-300 mb-1.5">
                يوم الاستحقاق الشهري
              </label>
              <input
                type="number"
                min="1"
                max="31"
                required
                value={dueDayOfMonth}
                onChange={(e) => setDueDayOfMonth(Number(e.target.value))}
                className="w-full bg-[#0d1222] border border-gray-700 focus:border-lord-gold rounded-xl px-3 py-2.5 text-xs font-mono font-bold text-white focus:outline-none"
              />
            </div>
          </div>

          {/* Payment Method & Address */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-300 mb-1.5">
                طريقة الصرف
              </label>
              <select
                value={payoutMethod}
                onChange={(e) => setPayoutMethod(e.target.value as any)}
                className="w-full bg-[#0d1222] border border-gray-700 focus:border-lord-gold rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none"
              >
                <option value="BEP20_USDT">محفظة BEP20 USDT</option>
                <option value="JEEB_WALLET">محفظة جيب الإلكترونية</option>
                <option value="JAWALI_WALLET">محفظة جوالي</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-300 mb-1.5">
                العنوان أو رقم الحساب
              </label>
              <input
                type="text"
                placeholder={payoutMethod === 'BEP20_USDT' ? '0x...' : 'رقم الهاتف المسجل'}
                value={destinationAddress}
                onChange={(e) => setDestinationAddress(e.target.value)}
                className="w-full bg-[#0d1222] border border-gray-700 focus:border-lord-gold rounded-xl px-3.5 py-2.5 text-xs font-mono text-white focus:outline-none"
              />
            </div>
          </div>

          {/* Auto vs Manual Disbursement Toggle */}
          <div
            onClick={() => setIsAutoDisburse(!isAutoDisburse)}
            className={`p-3 rounded-2xl border cursor-pointer flex items-center justify-between transition-all ${
              isAutoDisburse
                ? 'bg-lord-gold/15 border-lord-gold/50 text-white'
                : 'bg-obsidian-surface border-gray-800 text-gray-400'
            }`}
          >
            <div>
              <span className="text-xs font-bold block">
                {isAutoDisburse ? '⚡ نمط الصرف الآلي مفعل' : '🔒 نمط الصرف اليدوي المعتمد'}
              </span>
              <span className="text-[10px] text-gray-400">
                {isAutoDisburse
                  ? 'يتم إصدار وخصم الحوالة تلقائياً في يوم الاستحقاق الشهري'
                  : 'ينبه أمين الصندوق بالإشعار ويصرف بنقرة واحدة بعد التأكد'}
              </span>
            </div>
            <div
              className={`w-5 h-5 rounded-md flex items-center justify-center border font-bold text-xs ${
                isAutoDisburse ? 'bg-lord-gold text-black border-lord-gold' : 'border-gray-600'
              }`}
            >
              {isAutoDisburse ? '✓' : ''}
            </div>
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
              className="text-xs font-bold"
            >
              جدولة وتثبيت المصروف 📅
            </Button>
          </div>
        </form>
      </div>
    </AppModalPortal>
  );
};
