'use client';

import React from 'react';
import { AppModalPortal } from '../../ui/AppModalPortal';
import { Button } from '../../ui/Button';
import { Trash2, AlertTriangle, X } from 'lucide-react';
import { lordToast } from '../../../lib/lordToast';
import { useDeleteUserMutation } from '../../../store/api/usersApi';

interface DeleteEmployeeModalProps {
  employee: any | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const DeleteEmployeeModal: React.FC<DeleteEmployeeModalProps> = ({
  employee,
  isOpen,
  onClose,
  onSuccess
}) => {
  const [deleteUser, { isLoading: isDeletingUser }] = useDeleteUserMutation();

  if (!employee) return null;

  const handleDelete = async () => {
    try {
      const res = await deleteUser(employee._id).unwrap();
      lordToast.success(res?.message || `تم حذف حساب ${employee.fullName} نهائياً من المنظومة 🗑️`);
      onSuccess?.();
      onClose();
    } catch (err: any) {
      lordToast.error('فشل حذف الحساب', err?.data?.error || 'حدث خطأ أثناء محاولة حذف الحساب');
    }
  };

  return (
    <AppModalPortal isOpen={isOpen} onClose={onClose} maxWidthClassName="max-w-md">
      <div className="bg-obsidian-surface border-2 border-red-600 rounded-3xl p-6 shadow-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-gray-800 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-red-500/20 border border-red-500/40 flex items-center justify-center text-red-400">
              <Trash2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">حذف الحساب نهائياً</h3>
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

        <div className="p-3.5 rounded-2xl bg-red-950/40 border border-red-500/40 text-xs text-red-200 space-y-2">
          <div className="flex items-center gap-1.5 font-bold text-red-300">
            <AlertTriangle className="w-4 h-4 text-red-400" />
            <span>تحذير إداري قطعي:</span>
          </div>
          <p className="text-[11px] text-gray-300 leading-relaxed">
            هل أنت متأكد من رغبتك في حذف حساب <strong className="text-white font-bold">{employee.fullName}</strong> ({employee.email}) نهائياً من المنظومة؟
          </p>
          <p className="text-[10px] text-red-300 font-semibold">
            سيتم إلغاء كافة صلاحيات الدخول، وفك ارتباط المهام المسندة إليه، ولا يمكن التراجع عن هذا الإجراء إطلاقاً.
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
            type="button"
            variant="danger"
            size="sm"
            isLoading={isDeletingUser}
            onClick={handleDelete}
            className="flex items-center gap-1 shadow-md"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>تأكيد الحذف النهائي 🗑️</span>
          </Button>
        </div>
      </div>
    </AppModalPortal>
  );
};

