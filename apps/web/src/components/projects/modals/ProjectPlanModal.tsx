'use client';

import React from 'react';
import { AppModalPortal } from '../../ui/AppModalPortal';
import { Badge } from '../../ui/Badge';
import { Button } from '../../ui/Button';
import {
  Sparkles,
  Edit3,
  Trash2,
  X,
  CheckCircle2,
  AlertCircle,
  Layers,
  ArrowRight
} from 'lucide-react';

interface ProjectPlanModalProps {
  project: any | null;
  isOpen: boolean;
  onClose: () => void;
  isAdmin: boolean;
  isDecomposingAll: boolean;
  isDeletingProject: boolean;
  onDecomposeAll: (projectId: string) => void;
  onDecomposeMilestone: (projectId: string, index: number) => void;
  onOpenEdit: (project: any) => void;
  onDeleteProject: (projectId: string, title: string) => void;
}

export const ProjectPlanModal: React.FC<ProjectPlanModalProps> = ({
  project,
  isOpen,
  onClose,
  isAdmin,
  isDecomposingAll,
  isDeletingProject,
  onDecomposeAll,
  onDecomposeMilestone,
  onOpenEdit,
  onDeleteProject
}) => {
  if (!project) return null;

  return (
    <AppModalPortal isOpen={isOpen} onClose={onClose} maxWidthClassName="max-w-4xl">
      <div className="bg-obsidian-surface border-2 border-lord-gold/60 rounded-3xl p-6 md:p-8 shadow-2xl max-h-[92vh] overflow-y-auto space-y-6 text-right">
        {/* Modal Header */}
        <div className="flex items-start justify-between border-b border-gray-800 pb-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-lg bg-lord-gold/20 border border-lord-gold/40 text-lord-gold font-mono font-black text-xs">
                {project.code}
              </span>
              <Badge variant={project.status === 'COMPLETED' ? 'cyber' : 'gold'}>
                {project.status}
              </Badge>
              <span className="text-xs text-gray-400 font-mono">
                الميزانية: ${project.allocatedBudget?.toLocaleString()} USDT
              </span>
            </div>
            <h2 className="text-xl font-black text-white">{project.title}</h2>
            <p className="text-xs text-gray-400 mt-1">{project.description}</p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {isAdmin && (
              <>
                <button
                  type="button"
                  disabled={isDecomposingAll}
                  onClick={() => onDecomposeAll(project._id)}
                  className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-lord-gold to-yellow-600 text-obsidian-primary font-black text-xs shadow-gold-glow hover:brightness-110 active:scale-95 transition-all flex items-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>تحويل الخطة كاملة إلى مهام 🚀</span>
                </button>

                <button
                  type="button"
                  onClick={() => onOpenEdit(project)}
                  className="px-3 py-2 rounded-xl bg-obsidian-card border border-gray-700 hover:border-lord-gold text-xs font-bold text-gray-200 hover:text-white transition-all flex items-center gap-1.5 shadow-md"
                >
                  <Edit3 className="w-3.5 h-3.5 text-lord-gold" />
                  <span>تعديل</span>
                </button>

                <button
                  type="button"
                  disabled={isDeletingProject}
                  onClick={() => onDeleteProject(project._id, project.title)}
                  className="px-3 py-2 rounded-xl bg-red-500/10 border border-red-500/30 hover:bg-red-500/20 text-xs font-bold text-red-400 transition-all flex items-center gap-1.5 shadow-md"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>حذف</span>
                </button>
              </>
            )}

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-obsidian-card hover:bg-gray-800 text-gray-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Plan Sections Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          {/* Objectives */}
          <div className="p-4 bg-obsidian-card rounded-2xl border border-gray-800 space-y-2">
            <span className="font-bold text-lord-gold flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-lord-gold" />
              <span>الأهداف الاستراتيجية:</span>
            </span>
            <ul className="text-gray-300 space-y-1.5 list-disc list-inside">
              {(project.objectives || ['تحقيق النمو التشغيلي']).map((item: string, idx: number) => (
                <li key={idx} className="leading-relaxed">{item}</li>
              ))}
            </ul>
          </div>

          {/* Requirements */}
          <div className="p-4 bg-obsidian-card rounded-2xl border border-gray-800 space-y-2">
            <span className="font-bold text-blue-400 flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4 text-blue-400" />
              <span>المتطلبات الأساسية:</span>
            </span>
            <ul className="text-gray-300 space-y-1.5 list-disc list-inside">
              {(project.requirements || ['مراجعة المخرجات الفنية']).map((item: string, idx: number) => (
                <li key={idx} className="leading-relaxed">{item}</li>
              ))}
            </ul>
          </div>

          {/* Tools & Resources */}
          <div className="p-4 bg-obsidian-card rounded-2xl border border-gray-800 space-y-2">
            <span className="font-bold text-purple-400 flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-purple-400" />
              <span>الوسائل والأدوات التقنية:</span>
            </span>
            <ul className="text-gray-300 space-y-1.5 list-disc list-inside">
              {(project.toolsAndResources || ['TheLord Cloud Core']).map((item: string, idx: number) => (
                <li key={idx} className="leading-relaxed">{item}</li>
              ))}
            </ul>
          </div>
        </div>

        {/* WBS Milestones Execution Table */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between border-b border-gray-800 pb-2">
            <span className="text-sm font-bold text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-lord-gold" />
              <span>جدول معالم خطة المشروع وتوزيع المهام (WBS Milestones):</span>
            </span>
            <span className="text-xs text-gray-400 font-mono">
              {project.wbsMilestones?.filter((m: any) => m.assignedTasks?.length > 0).length} من {project.wbsMilestones?.length || 0} معالم محولة لمهام
            </span>
          </div>

          <div className="space-y-2.5">
            {(project.wbsMilestones || []).map((milestone: any, mIdx: number) => {
              const isDecomposed = milestone.assignedTasks?.length > 0;
              return (
                <div
                  key={mIdx}
                  className="p-4 rounded-2xl bg-obsidian-card border border-gray-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-md"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-slate-800 text-lord-gold font-mono text-[10px] font-bold">
                        المعلم #{mIdx + 1}
                      </span>
                      <h4 className="text-xs font-bold text-white">{milestone.title}</h4>
                    </div>
                    <p className="text-[11px] text-gray-400 leading-relaxed">{milestone.description}</p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {isDecomposed ? (
                      <span className="px-3 py-1 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-bold flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>مهمة تنفيذية نشطة في المحرك</span>
                      </span>
                    ) : (
                      <Button
                        variant="gold"
                        size="sm"
                        onClick={() => onDecomposeMilestone(project._id, mIdx)}
                        className="text-xs font-bold rounded-xl flex items-center gap-1"
                      >
                        <ArrowRight className="w-3.5 h-3.5 ml-1" />
                        <span>تحويل لمهمة الآن</span>
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </AppModalPortal>
  );
};

