'use client';

import React, { useState } from 'react';
import { AppModalPortal } from '../../ui/AppModalPortal';
import { useCreateOrProposeTaskMutation } from '../../../store/api/tasksApi';
import { CheckSquare, Coins, AlertCircle, X, Send } from 'lucide-react';
import { lordToast } from '../../../lib/lordToast';

interface AssignQuickTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  employee: any;
}

export const AssignQuickTaskModal: React.FC<AssignQuickTaskModalProps> = ({
  isOpen,
  onClose,
  employee
}) => {
  const [createTask, { isLoading }] = useCreateOrProposeTaskMutation();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'>('HIGH');
  const [budgetAmount, setBudgetAmount] = useState<number | ''>('');

  if (!isOpen || !employee) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      lordToast.error('يرجى كتابة عنوان المهمة');
      return;
    }

    try {
      await createTask({
        title: title.trim(),
        description: description.trim(),
        assignedTo: employee._id,
        priority,
        budgetAmount: budgetAmount ? Number(budgetAmount) : 0,
        stages: [
          {
            order: 1,
            title: 'المرحلة التنفيذية 1',
            description: description.trim() || 'إنجاز متطلبات المهمة المسندة',
            requiredDeliverables: ['تقرير الإنجاز أو روابط المخرجات']
          }
        ]
      } as any).unwrap();

      lordToast.success(`تم إسناد المهمة بنجاح إلى ${employee.fullName}! ⚡`);
      setTitle('');
      setDescription('');
      setBudgetAmount('');
      onClose();
    } catch (err: any) {
      lordToast.error(err?.data?.error || err.message || 'تعذر إسناد المهمة');
    }
  };

  return (
    <AppModalPortal isOpen={isOpen} onClose={onClose}>
      <div className="w-full max-w-lg bg-[#0a0d16] border border-amber-500/40 rounded-3xl shadow-2xl p-5 sm:p-6 text-white text-right">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-800 pb-3 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center font-bold text-amber-400">
              <CheckSquare className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-black text-white">إسناد مهمة جديدة للموظف</h3>
              <p className="text-[11px] text-gray-400">المكلف بالتنفيذ: {employee.fullName}</p>
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

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label className="block text-xs font-bold text-gray-300 mb-1">عنوان المهمة *</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="مثال: تحليل شارت BTC/USDT وتجهيز التقرير الصباحي"
              className="w-full px-3 py-2 rounded-xl bg-gray-900 border border-gray-800 focus:border-amber-400 text-xs text-white placeholder-gray-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-300 mb-1">تفاصيل ومخرجات المهمة</label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="اكتب التوجيهات والمخرجات المطلوبة من الموظف بدقة..."
              className="w-full px-3 py-2 rounded-xl bg-gray-900 border border-gray-800 focus:border-amber-400 text-xs text-white placeholder-gray-500 outline-none resize-none leading-relaxed"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-300 mb-1">درجة الأولوية</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as any)}
                className="w-full px-3 py-2 rounded-xl bg-gray-900 border border-gray-800 text-xs text-white outline-none"
              >
                <option value="LOW">عادية (Low)</option>
                <option value="MEDIUM">متوسطة (Medium)</option>
                <option value="HIGH">عالية (High)</option>
                <option value="URGENT">حرجة وعاجلة (Urgent)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-300 mb-1">الميزانية إن وجدت (USDT)</label>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={budgetAmount}
                  onChange={(e) => setBudgetAmount(e.target.value === '' ? '' : Number(e.target.value))}
                  placeholder="0.00"
                  className="w-full pl-3 pr-8 py-2 rounded-xl bg-gray-900 border border-gray-800 text-xs text-white placeholder-gray-500 outline-none font-mono"
                />
                <Coins className="w-3.5 h-3.5 text-amber-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-gray-800 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-gray-800 text-gray-300 hover:text-white text-xs font-bold"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black text-xs font-black flex items-center gap-1.5 shadow-md disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{isLoading ? 'جاري الإسناد...' : 'إسناد المهمة الآن'}</span>
            </button>
          </div>
        </form>
      </div>
    </AppModalPortal>
  );
};

