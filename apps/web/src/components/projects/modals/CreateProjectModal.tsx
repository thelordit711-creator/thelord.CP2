'use client';

import React from 'react';
import { AppModalPortal } from '../../ui/AppModalPortal';
import { Button } from '../../ui/Button';
import { FolderKanban, Sparkles, X, Loader2 } from 'lucide-react';

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
  isGeneratingAI,
  onSubmit
}) => {
  return (
    <AppModalPortal isOpen={isOpen} onClose={onClose} maxWidthClassName="max-w-2xl">
      <div className="bg-obsidian-surface border-2 border-lord-gold/60 rounded-3xl p-6 md:p-8 shadow-2xl space-y-5 text-right">
        <div className="flex items-center justify-between pb-3 border-b border-gray-800">
          <div className="flex items-center gap-2">
            <FolderKanban className="w-5 h-5 text-lord-gold" />
            <h3 className="text-base font-black text-white">إنشاء مشروع استراتيجي جديد</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-white"
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
                ? 'bg-purple-600 text-white shadow-sm'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <span>إدخال يدوي ✍️</span>
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
              <label className="text-xs font-bold text-gray-300 block mb-1">
                الميزانية المخصصة للمشروع (USDT):
              </label>
              <input
                type="number"
                min="0"
                value={allocatedBudget}
                onChange={(e) => setAllocatedBudget(Number(e.target.value))}
                className="w-full bg-obsidian-card border border-gray-800 rounded-xl px-3 py-2 text-xs text-white font-mono focus:border-lord-gold"
              />
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

          <div className="pt-3 border-t border-gray-800 flex justify-end gap-2">
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
              disabled={isGeneratingAI}
              className="rounded-xl shadow-gold-glow font-bold"
            >
              {isGeneratingAI ? (
                <span className="flex items-center gap-1.5">
                  <Loader2 className="w-4 h-4 animate-spin ml-1" />
                  جاري بناء وتفكيك المشروع عبر Gemini...
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
