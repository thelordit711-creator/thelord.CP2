'use client';

import React from 'react';
import { AppModalPortal } from '../../ui/AppModalPortal';
import { Button } from '../../ui/Button';
import { Edit3, X } from 'lucide-react';

interface EditProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  employees: any[];
  editTitle: string;
  setEditTitle: (val: string) => void;
  editDescription: string;
  setEditDescription: (val: string) => void;
  editStatus: string;
  setEditStatus: (val: string) => void;
  editAllocatedBudget: number;
  setEditAllocatedBudget: (val: number) => void;
  editTargetEndDate: string;
  setEditTargetEndDate: (val: string) => void;
  editTeamMembers: string[];
  setEditTeamMembers: React.Dispatch<React.SetStateAction<string[]>>;
  isUpdatingProject: boolean;
  onSubmit: (e: React.FormEvent) => void;
}

export const EditProjectModal: React.FC<EditProjectModalProps> = ({
  isOpen,
  onClose,
  employees,
  editTitle,
  setEditTitle,
  editDescription,
  setEditDescription,
  editStatus,
  setEditStatus,
  editAllocatedBudget,
  setEditAllocatedBudget,
  editTargetEndDate,
  setEditTargetEndDate,
  editTeamMembers,
  setEditTeamMembers,
  isUpdatingProject,
  onSubmit
}) => {
  return (
    <AppModalPortal isOpen={isOpen} onClose={onClose} maxWidthClassName="max-w-2xl">
      <div className="bg-obsidian-surface border-2 border-lord-gold/60 rounded-3xl p-6 md:p-8 shadow-2xl max-h-[92vh] overflow-y-auto space-y-5 text-right">
        <div className="flex items-center justify-between border-b border-gray-800 pb-3">
          <div className="flex items-center gap-2">
            <Edit3 className="w-5 h-5 text-lord-gold" />
            <h3 className="text-lg font-black text-white">تعديل بيانات وسجلات المشروع</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl bg-obsidian-card hover:bg-gray-800 text-gray-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-bold text-gray-300 block mb-1">عنوان المشروع:</label>
            <input
              type="text"
              required
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              className="w-full bg-obsidian-card border border-gray-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-lord-gold"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-gray-300 block mb-1">وصف المشروع وخطة العمل:</label>
            <textarea
              required
              rows={3}
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              className="w-full bg-obsidian-card border border-gray-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-lord-gold leading-relaxed"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-gray-300 block mb-1">حالة المشروع:</label>
              <select
                value={editStatus}
                onChange={(e) => setEditStatus(e.target.value)}
                className="w-full bg-obsidian-card border border-gray-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-lord-gold"
              >
                <option value="PLANNING">قيد التخطيط (PLANNING)</option>
                <option value="ACTIVE">نشط قيد التنفيذ (ACTIVE)</option>
                <option value="ON_HOLD">معلق مؤقتاً (ON_HOLD)</option>
                <option value="COMPLETED">مكتمل 100% (COMPLETED)</option>
                <option value="CANCELLED">ملغي (CANCELLED)</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-gray-300 block mb-1">سقف الميزانية المخصصة (USDT):</label>
              <input
                type="number"
                min="0"
                value={editAllocatedBudget}
                onChange={(e) => setEditAllocatedBudget(Number(e.target.value))}
                className="w-full bg-obsidian-card border border-gray-800 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-lord-gold"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-gray-300 block mb-1">تاريخ التسليم النهائي المستهدف:</label>
            <input
              type="date"
              value={editTargetEndDate}
              onChange={(e) => setEditTargetEndDate(e.target.value)}
              className="w-full bg-obsidian-card border border-gray-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-lord-gold"
            />
          </div>

          {/* Team Members Checklist */}
          <div>
            <label className="text-xs font-bold text-gray-300 block mb-1.5">أعضاء الفريق والمسؤولون التنفيذيون:</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-40 overflow-y-auto p-2 bg-obsidian-card rounded-2xl border border-gray-800">
              {employees.map((emp: any) => {
                const isSelected = editTeamMembers.includes(emp._id);
                return (
                  <label
                    key={emp._id}
                    className={`p-2 rounded-xl border text-xs flex items-center justify-between cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-lord-gold/15 border-lord-gold text-white font-bold'
                        : 'bg-obsidian-surface border-gray-800 text-gray-400 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span className="w-5 h-5 rounded-full bg-slate-700 flex items-center justify-center text-[10px] shrink-0 font-bold">
                        {emp.fullName?.charAt(0) || 'U'}
                      </span>
                      <span className="truncate">{emp.fullName}</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => {
                        setEditTeamMembers((prev) =>
                          isSelected ? prev.filter((id) => id !== emp._id) : [...prev, emp._id]
                        );
                      }}
                      className="rounded text-lord-gold"
                    />
                  </label>
                );
              })}
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-800">
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
              isLoading={isUpdatingProject}
              className="shadow-gold-glow font-bold"
            >
              حفظ التعديلات 💾
            </Button>
          </div>
        </form>
      </div>
    </AppModalPortal>
  );
};
