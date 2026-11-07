'use client';

import React, { useState, useEffect } from 'react';
import { AppModalPortal } from '../../ui/AppModalPortal';
import { Button } from '../../ui/Button';
import { Edit3, X } from 'lucide-react';
import { lordToast } from '../../../lib/lordToast';
import { useUpdateTaskMutation } from '../../../store/api/tasksApi';

interface EditTaskModalProps {
  task: any | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (updatedData: any) => void;
}

export const EditTaskModal: React.FC<EditTaskModalProps> = ({
  task,
  isOpen,
  onClose,
  onSuccess
}) => {
  const [updateTask, { isLoading: isUpdating }] = useUpdateTaskMutation();

  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editPriority, setEditPriority] = useState('HIGH');
  const [editPlatform, setEditPlatform] = useState('TG_VIP');
  const [editDueDate, setEditDueDate] = useState('');

  useEffect(() => {
    if (task) {
      setEditTitle(task.title || '');
      setEditDescription(task.description || '');
      setEditPriority(task.priority || 'HIGH');
      setEditPlatform(task.targetPlatform || 'TG_VIP');
      setEditDueDate(task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : '');
    }
  }, [task]);

  if (!task) return null;

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!task._id) return;

    try {
      const payload = {
        title: editTitle.trim(),
        description: editDescription.trim(),
        priority: editPriority as any,
        targetPlatform: editPlatform as any,
        dueDate: editDueDate ? new Date(editDueDate).toISOString() : undefined
      };

      await updateTask({
        id: task._id,
        data: payload
      }).unwrap();

      lordToast.success('تم حفظ التعديلات بنجاح 💾');
      onSuccess?.(payload);
      onClose();
    } catch (err: any) {
      lordToast.error('فشل حفظ التعديلات', err?.data?.error || 'حدث خطأ أثناء تعديل المهمة');
    }
  };

  return (
    <AppModalPortal isOpen={isOpen} onClose={onClose} maxWidthClassName="max-w-lg">
      <div className="bg-obsidian-surface border border-lord-gold/40 rounded-3xl p-5 sm:p-6 shadow-2xl max-h-[92dvh] overflow-y-auto space-y-4">
        <div className="flex items-center justify-between border-b border-gray-800 pb-3">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Edit3 className="w-4 h-4 text-lord-gold" />
            <span>تعديل بيانات المهمة الأساسية</span>
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-obsidian-card"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSaveEdit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1.5">عنوان المهمة:</label>
            <input
              type="text"
              required
              value={editTitle}
              onChange={e => setEditTitle(e.target.value)}
              className="w-full bg-obsidian-card border border-gray-700 rounded-xl px-4 py-2.5 text-xs text-white focus:border-lord-gold focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1.5">تفاصيل وخطة العمل:</label>
            <textarea
              rows={3}
              value={editDescription}
              onChange={e => setEditDescription(e.target.value)}
              className="w-full bg-obsidian-card border border-gray-700 rounded-xl px-4 py-2.5 text-xs text-white focus:border-lord-gold focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1.5">درجة الأولوية:</label>
              <select
                value={editPriority}
                onChange={e => setEditPriority(e.target.value)}
                className="w-full bg-obsidian-card border border-gray-700 rounded-xl px-3 py-2 text-xs text-white focus:border-lord-gold focus:outline-none"
              >
                <option value="CRITICAL">حرجة جداً (CRITICAL)</option>
                <option value="HIGH">مرتفعة (HIGH)</option>
                <option value="MEDIUM">متوسطة (MEDIUM)</option>
                <option value="LOW">منخفضة (LOW)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1.5">المنصة المستهدفة:</label>
              <select
                value={editPlatform}
                onChange={e => setEditPlatform(e.target.value)}
                className="w-full bg-obsidian-card border border-gray-700 rounded-xl px-3 py-2 text-xs text-white focus:border-lord-gold focus:outline-none"
              >
                <option value="TG_VIP">قناة VIP الخاصة (تليجرام)</option>
                <option value="TG_FREE">القناة العامة المجانية</option>
                <option value="YOUTUBE">يوتيوب (YouTube)</option>
                <option value="X_TWITTER">منصة إكس (Twitter)</option>
                <option value="FACEBOOK_INSTA">فيسبوك وإنستقرام</option>
                <option value="INTERNAL_SYSTEM">نظام البوتات والتطوير الداخلي</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1.5">موعد التسليم النهائي (Due Date):</label>
            <input
              type="date"
              value={editDueDate}
              onChange={e => setEditDueDate(e.target.value)}
              className="w-full bg-obsidian-card border border-gray-700 rounded-xl px-4 py-2 text-xs text-white focus:border-lord-gold focus:outline-none"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-800">
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
              size="md"
              isLoading={isUpdating}
            >
              حفظ التعديلات 💾
            </Button>
          </div>
        </form>
      </div>
    </AppModalPortal>
  );
};
