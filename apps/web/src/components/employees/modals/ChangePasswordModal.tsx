'use client';

import React, { useState } from 'react';
import { AppModalPortal } from '../../ui/AppModalPortal';
import { Button } from '../../ui/Button';
import { Key, Eye, EyeOff, X } from 'lucide-react';
import { lordToast } from '../../../lib/lordToast';
import { useChangeUserPasswordMutation } from '../../../store/api/usersApi';

interface ChangePasswordModalProps {
  employee: any | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({
  employee,
  isOpen,
  onClose,
  onSuccess
}) => {
  const [changeUserPassword, { isLoading: isChangingPassword }] = useChangeUserPasswordMutation();
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  if (!employee) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) {
      lordToast.error('كلمة المرور قصيرة', 'يجب أن تتكون كلمة المرور من 6 خانات على الأقل');
      return;
    }

    try {
      await changeUserPassword({
        id: employee._id,
        newPassword: newPassword.trim()
      }).unwrap();

      lordToast.success(`تم تغيير وتشفير كلمة السر للموظف ${employee.fullName} بنجاح 🔑`);
      setNewPassword('');
      onSuccess?.();
      onClose();
    } catch (err: any) {
      lordToast.error('فشل تغيير كلمة السر', err?.data?.error || 'حدث خطأ أثناء تحديث كلمة المرور');
    }
  };

  return (
    <AppModalPortal isOpen={isOpen} onClose={onClose} maxWidthClassName="max-w-md">
      <div className="bg-obsidian-surface border-2 border-lord-gold/50 rounded-3xl p-6 shadow-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-gray-800 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-lord-gold/15 border border-lord-gold/40 flex items-center justify-center text-lord-gold">
              <Key className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">تعديل كلمة السر</h3>
              <p className="text-[11px] text-gray-400 font-mono">{employee.fullName}</p>
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

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1.5">
              كلمة المرور الجديدة:
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                minLength={6}
                placeholder="أدخل كلمة مرور قوية (6 أحرف/أرقام كحد أدنى)..."
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full bg-obsidian-primary border border-gray-700 rounded-xl pr-4 pl-10 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-lord-gold"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-[10px] text-gray-400 mt-1">
              سيتم تحديث كلمة المرور في قاعدة البيانات فورياً وتشفيرها بواسطة Bcrypt.
            </p>
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
              isLoading={isChangingPassword}
              className="shadow-gold-glow"
            >
              حفظ وتعيين كلمة المرور 💾
            </Button>
          </div>
        </form>
      </div>
    </AppModalPortal>
  );
};
