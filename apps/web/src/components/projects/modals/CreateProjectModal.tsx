'use client';

import React from 'react';
import { AppModalPortal } from '../../ui/AppModalPortal';
import { Button } from '../../ui/Button';
import { FolderKanban, Sparkles, X, Loader2, Plus, Trash2, Users, Wallet } from 'lucide-react';

export interface ManualMilestoneDraft {
  title: string;
  description: string;
  daysFromStart: number;
}

interface CreateProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  createMode: 'AI' | 'MANUAL';
  setCreateMode: (mode: 'AI' | 'MANUAL') => void;
  title: string;
  setTitle: (val: string) => void;
  description: string;
  setDescription: (val: string) => void;
  allocatedBudget: number;
  setAllocatedBudget: (val: number) => void;
  targetDays: number;
  setTargetDays: (val: number) => void;
  employees: any[];
  teamMembers: string[];
  setTeamMembers: React.Dispatch<React.SetStateAction<string[]>>;
  manualMilestones: ManualMilestoneDraft[];
  setManualMilestones: React.Dispatch<React.SetStateAction<ManualMilestoneDraft[]>>;
  vaultLiquidity?: { generalBudget: number; treasuryBalance: number };
  isGeneratingAI: boolean;
  onSubmit: (e: React.FormEvent) => void;
}

export const CreateProjectModal: React.FC<CreateProjectModalProps> = ({
  isOpen,
  onClose,
  createMode,
  setCreateMode,
  title,
  setTitle,
  description,
  setDescription,
  allocatedBudget,
  setAllocatedBudget,
  targetDays,
  setTargetDays,
  employees,
  teamMembers,
  setTeamMembers,
  manualMilestones,
  setManualMilestones,
  vaultLiquidity,
  isGeneratingAI,
  onSubmit
}) => {
  const totalVault = (vaultLiquidity?.generalBudget || 0) + (vaultLiquidity?.treasuryBalance || 0);
  const exceedsLiquidity = vaultLiquidity !== undefined && allocatedBudget > totalVault;

  const handleAddMilestone = () => {
    setManualMilestones((prev) => [
      ...prev,
      {
        title: `المعلم ${prev.length + 1}: مرحلة تنفيذية جديدة`,
        description: '',
        daysFromStart: Math.min(targetDays, (prev.length + 1) * 4)
      }
    ]);
  };

  const handleUpdateMilestone = (index: number, field: keyof ManualMilestoneDraft, value: string | number) => {
    setManualMilestones((prev) =>
      prev.map((m, i) => (i === index ? { ...m, [field]: value } : m))
    );
  };

  const handleRemoveMilestone = (index: number) => {
    setManualMilestones((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== index) : prev));
  };

  return (
    <AppModalPortal isOpen={isOpen} onClose={onClose} maxWidthClassName="max-w-3xl">
      <div className="bg-obsidian-surface border-2 border-lord-gold/60 rounded-3xl p-6 md:p-8 shadow-2xl max-h-[92vh] overflow-y-auto space-y-5 text-right">
        <div className="flex items-center justify-between pb-3 border-b border-gray-800">
          <div className="flex items-center gap-2">
            <FolderKanban className="w-5 h-5 text-lord-gold" />
            <h3 className="text-base font-black text-white">إنشاء مشروع استراتيجي جديد</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="إغلاق النافذة"
            className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-gray-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Switcher */}
        <div className="flex items-center bg-obsidian-card p-1 rounded-2xl border border-gray-800 text-xs">
          <button
            type="button"
            onClick={() => setCreateMode('AI')}
            className={`flex-1 py-2 rounded-xl font-bold flex items-center justify-center gap-1.5 transition-all ${
              createMode === 'AI'
                ? 'bg-lord-gold text-obsidian-primary shadow-gold-glow'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>توليد وتفكيك بالذكاء الاصطناعي (TheLordAI WBS) ✨</span>
          </button>
          <button
            type="button"
            onClick={() => setCreateMode('MANUAL')}
            className={`flex-1 py-2 rounded-xl font-bold flex items-center justify-center gap-1.5 transition-all ${
              createMode === 'MANUAL'
                ? 'bg-lord-gold text-black font-black shadow-gold-glow'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <span>إدخال يدوي متكامل ✍️</span>
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-bold text-gray-300 block mb-1">عنوان المشروع:</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="مثال: حملة إعلانات تليجرام وتوسيع قنوات VIP..."
              className="w-full bg-obsidian-card border border-gray-800 rounded-xl px-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-lord-gold"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-gray-300 block mb-1">وصف المشروع وأهدافه الرئيسية:</label>
            <textarea
              required
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="اشرح نطاق المشروع، وسيقوم الذكاء الاصطناعي باستخراج الأهداف والمتطلبات ومعالم WBS..."
              className="w-full bg-obsidian-card border border-gray-800 rounded-xl px-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-lord-gold leading-relaxed"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-gray-300">الميزانية المخصصة (USDT):</label>
                {vaultLiquidity !== undefined && (
                  <span className="text-[10px] font-mono text-gray-400 flex items-center gap-1">
                    <Wallet className="w-3 h-3 text-lord-gold" />
                    السيولة: ${totalVault.toLocaleString()}
                  </span>
                )}
              </div>
              <input
                type="number"
                min="0"
                step="0.01"
                value={allocatedBudget}
                onChange={(e) => setAllocatedBudget(Number(e.target.value))}
                className="w-full bg-obsidian-card border border-gray-800 rounded-xl px-3 py-2 text-xs text-white font-mono focus:border-lord-gold"
              />
              {exceedsLiquidity && (
                <p className="text-[10px] text-amber-400 mt-1">
                  تنبيه: الميزانية المخصصة تتجاوز إجمالي السيولة المتاحة حالياً في الخزينة والميزانية العامة.
                </p>
              )}
            </div>

            <div>
              <label className="text-xs font-bold text-gray-300 block mb-1">
                المدة الزمنية المقدرة للتنفيذ (أيام):
              </label>
              <input
                type="number"
                min="1"
                value={targetDays}
                onChange={(e) => setTargetDays(Number(e.target.value))}
                className="w-full bg-obsidian-card border border-gray-800 rounded-xl px-3 py-2 text-xs text-white font-mono focus:border-lord-gold"
              />
            </div>
          </div>

          {/* Explicit Project Team Selection */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-gray-300 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-lord-gold" />
                <span>فريق العمل المسؤول عن المشروع ({teamMembers.length} محدد):</span>
              </label>
              {employees.length > 0 && (
                <button
                  type="button"
                  onClick={() =>
                    setTeamMembers(
                      teamMembers.length === employees.length ? [] : employees.map((emp: any) => emp._id)
                    )
                  }
                  className="text-[11px] text-lord-gold hover:underline font-bold"
                >
                  {teamMembers.length === employees.length ? 'إلغاء تحديد الكل' : 'تحديد الكل'}
                </button>
              )}
            </div>
            {employees.length === 0 ? (
              <div className="p-3 bg-obsidian-card rounded-2xl border border-gray-800 text-[11px] text-gray-400">
                لا يوجد موظفون مسجلون بعد — سيتم إسناد المشروع لك كمشرف حالياً.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-36 overflow-y-auto p-2 bg-obsidian-card rounded-2xl border border-gray-800">
                {employees.map((emp: any) => {
                  const isSelected = teamMembers.includes(emp._id);
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
                        onChange={() =>
                          setTeamMembers((prev) =>
                            isSelected ? prev.filter((id) => id !== emp._id) : [...prev, emp._id]
                          )
                        }
                        className="rounded text-lord-gold"
                      />
                    </label>
                  );
                })}
              </div>
            )}
          </div>

          {/* Dynamic Manual Milestones Editor */}
          {createMode === 'MANUAL' && (
            <div className="space-y-2.5 pt-2 border-t border-gray-800">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-lord-gold">
                  معالم هيكل تفكيك العمل (WBS Milestones):
                </label>
                <button
                  type="button"
                  onClick={handleAddMilestone}
                  className="px-2.5 py-1 rounded-xl bg-lord-gold/15 border border-lord-gold/40 text-lord-gold text-[11px] font-bold flex items-center gap-1 hover:bg-lord-gold hover:text-obsidian-primary transition-all"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>إضافة معلم</span>
                </button>
              </div>

              <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                {manualMilestones.map((m, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-obsidian-card border border-gray-800 rounded-2xl space-y-2"
                  >
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        required
                        value={m.title}
                        onChange={(e) => handleUpdateMilestone(idx, 'title', e.target.value)}
                        placeholder={`عنوان المعلم #${idx + 1}`}
                        className="flex-1 bg-obsidian-surface border border-gray-800 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-lord-gold"
                      />
                      <input
                        type="number"
                        min="1"
                        value={m.daysFromStart}
                        onChange={(e) => handleUpdateMilestone(idx, 'daysFromStart', Number(e.target.value))}
                        title="يوم التسليم من بداية المشروع"
                        className="w-20 bg-obsidian-surface border border-gray-800 rounded-xl px-2 py-1.5 text-xs text-white font-mono text-center focus:outline-none focus:border-lord-gold"
                      />
                      <button
                        type="button"
                        disabled={manualMilestones.length <= 1}
                        onClick={() => handleRemoveMilestone(idx)}
                        aria-label="حذف المعلم"
                        className="p-1.5 rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500/20 disabled:opacity-30"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <input
                      type="text"
                      value={m.description}
                      onChange={(e) => handleUpdateMilestone(idx, 'description', e.target.value)}
                      placeholder="وصف مختصر للمخرجات المطلوبة لهذا المعلم..."
                      className="w-full bg-obsidian-surface border border-gray-800 rounded-xl px-2.5 py-1.5 text-[11px] text-gray-300 focus:outline-none focus:border-lord-gold"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="pt-3 border-t border-gray-800 flex justify-end gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={onClose}>
              إلغاء
            </Button>
            <Button
              type="submit"
              variant="gold"
              size="sm"
              disabled={isGeneratingAI}
              className="rounded-xl shadow-gold-glow font-bold"
            >
              {isGeneratingAI ? (
                <span className="flex items-center gap-1.5">
                  <Loader2 className="w-4 h-4 animate-spin ml-1" />
                  جاري بناء وتفكيك المشروع عبر TheLordAI...
                </span>
              ) : (
                <span>اعتماد وإنشاء المشروع 🚀</span>
              )}
            </Button>
          </div>
        </form>
      </div>
    </AppModalPortal>
  );
};
