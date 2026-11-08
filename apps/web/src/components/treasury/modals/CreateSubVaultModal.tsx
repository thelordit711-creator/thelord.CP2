'use client';

import React, { useState } from 'react';
import { AppModalPortal } from '../../ui/AppModalPortal';
import { Button } from '../../ui/Button';
import { FolderPlus, Layers, X, ShieldAlert } from 'lucide-react';
import { useCreateCustomSubVaultMutation } from '../../../store/api/treasuryApi';
import { lordToast } from '../../../lib/lordToast';

interface CreateSubVaultModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const CreateSubVaultModal: React.FC<CreateSubVaultModalProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const [createSubVault, { isLoading }] = useCreateCustomSubVaultMutation();

  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [parentVault, setParentVault] = useState('صندوق الصرف الرئيسي (Master Treasury)');
  const [monthlyAllocated, setMonthlyAllocated] = useState<number>(5000);
  const [alertThresholdPercent, setAlertThresholdPercent] = useState<number>(20);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      lordToast.error('حقل مطلوب', 'يرجى كتابة اسم الصندوق الفرعي');
      return;
    }

    const finalCode = code.trim() || name.trim().toUpperCase().replace(/\s+/g, '_');

    try {
      await createSubVault({
        name: name.trim(),
        code: finalCode,
        parentVault,
        monthlyAllocated: Number(monthlyAllocated) || 0,
        alertThresholdPercent: Number(alertThresholdPercent) || 20
      }).unwrap();

      lordToast.success(`تم إنشاء ${name} بنجاح وربطه بصندوق الصرف الرئيسي ✨`);
      setName('');
      setCode('');
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      lordToast.error('فشل إنشاء الصندوق', err?.data?.error || 'حدث خطأ أثناء حفظ الصندوق الفرعي');
    }
  };

  return (
    <AppModalPortal isOpen={isOpen} onClose={onClose} maxWidthClassName="max-w-lg">
      <div className="bg-[#090c15] border-2 border-lord-gold/50 rounded-3xl p-6 sm:p-7 text-white text-right space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-lord-gold/15 border border-lord-gold/40 flex items-center justify-center text-lord-gold">
              <FolderPlus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-white">إنشاء صندوق فرعي جديد وتحديد الأب</h3>
              <p className="text-xs text-gray-400">هندسة الصناديق الهرمية المخصصة للصرف والرقابة</p>
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
          {/* Parent Vault Indicator */}
          <div className="p-3 rounded-2xl bg-obsidian-surface border border-gray-800 flex items-center justify-between">
            <div>
              <span className="text-[11px] text-gray-400 font-bold block">الصندوق الأب المعتمد (Parent Vault)</span>
              <span className="text-xs font-black text-lord-gold">{parentVault}</span>
            </div>
            <span className="text-[10px] px-2.5 py-1 rounded-full bg-lord-gold/15 text-lord-gold border border-lord-gold/30 font-bold">
              صندوق الصرف المركزي
            </span>
          </div>

          {/* Sub-Vault Name */}
          <div>
            <label className="block text-xs font-bold text-gray-300 mb-1.5">
              اسم الصندوق الفرعي *
            </label>
            <input
              type="text"
              required
              placeholder="مثال: صندوق سيرفرات الذكاء الاصطناعي، صندوق إعلانات X..."
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (!code) {
                  setCode(e.target.value.toUpperCase().replace(/\s+/g, '_'));
                }
              }}
              className="w-full bg-[#0d1222] border border-gray-700 focus:border-lord-gold rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none"
            />
          </div>

          {/* Code */}
          <div>
            <label className="block text-xs font-bold text-gray-300 mb-1.5">
              رمز الصندوق الفرعي (كود فريد) *
            </label>
            <input
              type="text"
              required
              placeholder="مثال: AI_SERVERS_VAULT"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              className="w-full bg-[#0d1222] border border-gray-700 focus:border-lord-gold rounded-xl px-3.5 py-2.5 text-xs font-mono text-lord-gold focus:outline-none"
            />
          </div>

          {/* Budget & Alert Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-300 mb-1.5">
                المخصص الشهري التقديري ($)
              </label>
              <input
                type="number"
                min="0"
                step="50"
                value={monthlyAllocated}
                onChange={(e) => setMonthlyAllocated(Number(e.target.value))}
                className="w-full bg-[#0d1222] border border-gray-700 focus:border-lord-gold rounded-xl px-3.5 py-2.5 text-xs font-mono text-white focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-300 mb-1.5">
                نسبة إنذار السيولة الحرجة
              </label>
              <div className="flex items-center gap-1.5 bg-[#0d1222] border border-gray-700 rounded-xl px-3.5 py-2.5">
                <span className="text-xs text-gray-400 font-mono">%</span>
                <input
                  type="number"
                  min="5"
                  max="50"
                  value={alertThresholdPercent}
                  onChange={(e) => setAlertThresholdPercent(Number(e.target.value))}
                  className="w-full bg-transparent text-xs font-mono text-white focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Governance Notice */}
          <div className="p-3 rounded-2xl bg-cyber-blue/10 border border-cyber-blue/30 text-[11px] text-cyber-blue leading-relaxed flex items-center gap-2">
            <Layers className="w-4 h-4 shrink-0" />
            <span>
              عند الصرف من هذا الصندوق الفرعي، يتم التحويل المحاسبي آلياً من صندوق الصرف الرئيسي إلى هذا الصندوق ثم للمستفيد.
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
              className="text-xs font-bold"
            >
              تثبيت وإنشاء الصندوق 🏛️
            </Button>
          </div>
        </form>
      </div>
    </AppModalPortal>
  );
};
