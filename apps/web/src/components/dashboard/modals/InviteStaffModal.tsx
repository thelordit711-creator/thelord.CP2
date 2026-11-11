'use client';

import React, { useState } from 'react';
import { UserPlus, X, Copy, Sparkles } from 'lucide-react';
import { AppModalPortal } from '../../ui/AppModalPortal';
import { Button } from '../../ui/Button';
import { AccessRole } from '@lord/shared-types';
import { lordToast } from '../../../lib/lordToast';

interface InviteStaffModalProps {
  isOpen: boolean;
  onClose: () => void;
  apiUrl: string;
}

export const InviteStaffModal: React.FC<InviteStaffModalProps> = ({
  isOpen,
  onClose,
  apiUrl
}) => {
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<AccessRole>('EMPLOYEE');
  const [generatedInviteUrl, setGeneratedInviteUrl] = useState<string | null>(null);
  const [sendingInvite, setSendingInvite] = useState(false);

  if (!isOpen) return null;

  const handleCreateInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setSendingInvite(true);
    try {
      const { apiFetch } = await import('../../../lib/apiClient');
      const res = await apiFetch(`${apiUrl}/auth/invite`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email: inviteEmail.trim(), role: inviteRole })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'فشل في إنشاء رابط الدعوة');
      }

      setGeneratedInviteUrl(data.inviteUrl);
      lordToast.success('تم إنشاء رابط الدعوة بنجاح!');
    } catch (err: any) {
      lordToast.error(err.message || 'حدث خطأ أثناء إنشاء الدعوة');
    } finally {
      setSendingInvite(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    lordToast.gold('تم النسخ', 'تم نسخ رابط الدعوة بنجاح إلى الحافظة!');
  };

  const handleResetAndClose = () => {
    setInviteEmail('');
    setGeneratedInviteUrl(null);
    onClose();
  };

  return (
    <AppModalPortal isOpen={isOpen} onClose={handleResetAndClose} maxWidthClassName="max-w-lg">
      <div className="bg-obsidian-surface border border-lord-gold/40 rounded-3xl w-full p-6 shadow-2xl relative text-right">
        <button
          type="button"
          onClick={handleResetAndClose}
          className="absolute top-4 left-4 p-2 rounded-xl text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

          <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-lord-gold" />
            <span>إرسال دعوة انضمام لكادر جديد</span>
          </h3>
          <p className="text-xs text-gray-400 mb-6">
            أدخل البريد الإلكتروني للموظف وحدد نوع الدور (موظف عادي أو أمين الصندوق). سيتم إنشاء رابط تسجيلي مخصص له ليقوم بملء بياناته ومهاراته وحسابات استلام الأرباح.
          </p>

          {!generatedInviteUrl ? (
            <form onSubmit={handleCreateInvite} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                  البريد الإلكتروني للموظف:
                </label>
                <input
                  type="email"
                  required
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="employee@domain.com"
                  className="w-full bg-obsidian-primary border border-gray-700 rounded-xl px-4 py-2.5 text-white text-sm focus:border-lord-gold focus:outline-none"
                  dir="ltr"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                  نوع الكادر وصلاحيات الوصول:
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setInviteRole('EMPLOYEE')}
                    className={`p-3 rounded-xl border text-right transition-all ${
                      inviteRole === 'EMPLOYEE'
                        ? 'border-lord-gold bg-lord-gold/10 text-white font-bold'
                        : 'border-gray-800 bg-obsidian-primary text-gray-400 hover:border-gray-700'
                    }`}
                  >
                    <div className="text-sm font-bold">موظف (كادر العمل)</div>
                    <div className="text-[11px] text-gray-400 mt-1">تنفيذ المهام، تسليم المراحل، طلب ميزانيات</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setInviteRole('TREASURY')}
                    className={`p-3 rounded-xl border text-right transition-all ${
                      inviteRole === 'TREASURY'
                        ? 'border-lord-gold bg-lord-gold/10 text-white font-bold'
                        : 'border-gray-800 bg-obsidian-primary text-gray-400 hover:border-gray-700'
                    }`}
                  >
                    <div className="text-sm font-bold">أمين الصندوق (Treasury)</div>
                    <div className="text-[11px] text-gray-400 mt-1">صرف الحوالات، إدارة الخزينة، تدقيق الإيصالات</div>
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-800">
                <Button type="button" variant="ghost" size="sm" onClick={handleResetAndClose}>
                  إلغاء
                </Button>
                <Button type="submit" variant="gold" size="sm" disabled={sendingInvite} className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4" />
                  <span>{sendingInvite ? 'جاري الإنشاء...' : 'توليد رابط الدعوة ⚡'}</span>
                </Button>
              </div>
            </form>
          ) : (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs">
                ✓ تم إنشاء رابط الدعوة بنجاح! الرابط صالح للتسجيل مرة واحدة ويحتوي على رمز دعوة موثق.
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                  رابط التسجيل المخصص:
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={generatedInviteUrl}
                    className="flex-1 bg-obsidian-primary border border-gray-700 rounded-xl px-4 py-2.5 text-white text-xs font-mono select-all"
                    dir="ltr"
                  />
                  <Button
                    type="button"
                    variant="gold"
                    size="sm"
                    onClick={() => copyToClipboard(generatedInviteUrl)}
                    className="flex items-center gap-1.5 shrink-0"
                  >
                    <Copy className="w-4 h-4" />
                    <span>نسخ</span>
                  </Button>
                </div>
              </div>

              <div className="flex justify-end pt-4 border-t border-gray-800">
                <Button type="button" variant="surface" size="sm" onClick={handleResetAndClose}>
                  إغلاق
                </Button>
              </div>
            </div>
          )}
        </div>
    </AppModalPortal>
  );
};
