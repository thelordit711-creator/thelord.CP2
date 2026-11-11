'use client';

import React from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  FileText,
  Sparkles,
  Edit3,
  Trash2,
  Layers,
  ArrowRight,
  CheckCircle2,
  MessageSquare,
  ExternalLink
} from 'lucide-react';

interface ProjectCardProps {
  project: any;
  isAdmin: boolean;
  isDecomposingAll: boolean;
  isDeletingProject: boolean;
  onSelectPlan: (project: any) => void;
  onDecomposeAll: (projectId: string) => void;
  onDecomposeMilestone: (projectId: string, index: number) => void;
  onOpenEdit: (project: any) => void;
  onDeleteProject: (projectId: string, title: string) => void;
  onQuickStatusChange: (projectId: string, status: string) => void;
  onOpenProjectChat?: (projectId: string) => void;
}

export const ProjectCard: React.FC<ProjectCardProps> = ({
  project,
  isAdmin,
  isDecomposingAll,
  isDeletingProject,
  onSelectPlan,
  onDecomposeAll,
  onDecomposeMilestone,
  onOpenEdit,
  onDeleteProject,
  onQuickStatusChange,
  onOpenProjectChat
}) => {
  const params = useParams();
  const locale = (params?.locale as string) || 'ar';

  const spentPercent =
    project.allocatedBudget > 0
      ? Math.min(100, Math.round(((project.spentBudget || 0) / project.allocatedBudget) * 100))
      : 0;

  const totalMilestones = project.wbsMilestones?.length || 0;
  const completedMilestones = (project.wbsMilestones || []).filter((m: any) => m.isCompleted).length;
  const milestonePercent = totalMilestones > 0 ? Math.round((completedMilestones / totalMilestones) * 100) : 0;

  return (
    <div className="bg-obsidian-card border border-obsidian-border hover:border-lord-gold/40 rounded-3xl p-6 shadow-xl space-y-5 transition-all text-right">
      {/* Project Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-gray-800">
        <div className="flex items-center gap-3">
          <span className="px-3 py-1 rounded-xl bg-lord-gold/15 border border-lord-gold/30 text-lord-gold font-mono font-black text-xs">
            {project.code}
          </span>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base font-black text-white">{project.title}</h3>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 font-bold">
                إنجاز WBS: {milestonePercent}%
              </span>
            </div>
            <p className="text-xs text-gray-400 mt-0.5">{project.description}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => onSelectPlan(project)}
            className="px-3 py-1.5 rounded-xl bg-obsidian-surface border border-gray-700 hover:border-lord-gold text-xs font-bold text-gray-200 hover:text-white transition-all flex items-center gap-1.5 shadow-md"
          >
            <FileText className="w-3.5 h-3.5 text-lord-gold" />
            <span>الخطة والمالية 📋</span>
          </button>

          {onOpenProjectChat && (
            <button
              type="button"
              onClick={() => onOpenProjectChat(project._id)}
              className="px-3 py-1.5 rounded-xl bg-cyber-blue/15 border border-cyber-blue/40 hover:bg-cyber-blue hover:text-obsidian-primary text-xs font-bold text-cyber-blue transition-all flex items-center gap-1.5 shadow-md"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>قناة الفريق</span>
            </button>
          )}

          {isAdmin && (
            <>
              <button
                type="button"
                disabled={isDecomposingAll}
                onClick={() => onDecomposeAll(project._id)}
                className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-lord-gold to-yellow-600 text-obsidian-primary text-xs font-black shadow-gold-glow hover:brightness-110 active:scale-95 transition-all flex items-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>تحويل الخطة لمهام 🚀</span>
              </button>

              <button
                type="button"
                onClick={() => onOpenEdit(project)}
                className="px-2.5 py-1.5 rounded-xl bg-obsidian-surface border border-gray-700 hover:border-lord-gold text-xs font-bold text-gray-200 hover:text-white transition-all flex items-center gap-1 shadow-md"
                title="تعديل بيانات المشروع"
              >
                <Edit3 className="w-3.5 h-3.5 text-lord-gold" />
                <span>تعديل</span>
              </button>

              <button
                type="button"
                disabled={isDeletingProject}
                onClick={() => onDeleteProject(project._id, project.title)}
                className="px-2.5 py-1.5 rounded-xl bg-red-500/10 border border-red-500/30 hover:bg-red-500/20 text-xs font-bold text-red-400 transition-all flex items-center gap-1 shadow-md"
                title="حذف المشروع نهائياً"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>حذف</span>
              </button>

              <select
                value={project.status || 'ACTIVE'}
                onChange={(e) => onQuickStatusChange(project._id, e.target.value)}
                aria-label="حالة المشروع"
                className={`px-2.5 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                  project.status === 'COMPLETED'
                    ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400'
                    : project.status === 'ACTIVE'
                    ? 'bg-lord-gold/15 border-lord-gold/40 text-lord-gold'
                    : project.status === 'ON_HOLD'
                    ? 'bg-amber-500/15 border-amber-500/40 text-amber-400'
                    : 'bg-gray-800 border-gray-700 text-gray-300'
                }`}
              >
                <option value="PLANNING">قيد التخطيط 📋</option>
                <option value="ACTIVE">نشط قيد التنفيذ ⚡</option>
                <option value="ON_HOLD">معلق مؤقتاً ⏸️</option>
                <option value="COMPLETED">مكتمل 100% 🏆</option>
                <option value="CANCELLED">ملغي ❌</option>
              </select>
            </>
          )}
        </div>
      </div>

      {/* Objectives & Budget */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
        <div className="p-3 bg-obsidian-surface/60 rounded-2xl border border-gray-800 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="font-bold text-lord-gold">الأهداف الاستراتيجية:</span>
            <span className="text-[10px] text-gray-400">
              الفريق: {(project.teamMembers || []).length} عضو
            </span>
          </div>
          <ul className="text-gray-300 space-y-1 list-disc list-inside">
            {(project.objectives || []).slice(0, 3).map((obj: string, idx: number) => (
              <li key={idx} className="line-clamp-1">{obj}</li>
            ))}
          </ul>
        </div>

        <div className="p-3 bg-obsidian-surface/60 rounded-2xl border border-gray-800 space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-bold text-lord-gold">سقف ميزانية المشروع:</span>
            <span className="font-mono text-white font-bold">
              ${(project.spentBudget || 0).toLocaleString()} / ${(project.allocatedBudget || 0).toLocaleString()} USDT
            </span>
          </div>
          <div className="w-full bg-gray-800 h-2 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                spentPercent > 90 ? 'bg-status-danger' : spentPercent > 70 ? 'bg-amber-400' : 'bg-lord-gold'
              }`}
              style={{ width: `${spentPercent}%` }}
            />
          </div>
          <div className="flex justify-between text-[10px] text-gray-400">
            <span>استهلاك الميزانية: {spentPercent}%</span>
            <span>سقف حرج يمنع التجاوز</span>
          </div>
        </div>
      </div>

      {/* WBS Milestones Breakdown */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-white flex items-center gap-1.5">
            <Layers className="w-4 h-4 text-lord-gold" />
            <span>معالم هيكل تفكيك العمل (WBS Milestones - {totalMilestones}):</span>
          </span>
          <span className="text-[10px] text-gray-400">انقر على أي مهمة مرتبطة لفتحها مباشرة</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {(project.wbsMilestones || []).map((milestone: any, mIdx: number) => {
            const linkedTasks = milestone.assignedTasks || [];
            const hasAssignedTasks = linkedTasks.length > 0;
            const firstTask = linkedTasks[0];
            const firstTaskId = typeof firstTask === 'string' ? firstTask : firstTask?._id;
            const firstTaskStatus = typeof firstTask === 'object' ? firstTask?.status : '';

            return (
              <div
                key={milestone._id || mIdx}
                className="p-3 bg-obsidian-primary/80 border border-gray-800 rounded-2xl space-y-2 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] text-gray-400 font-mono">المعلم #{mIdx + 1}</span>
                    {milestone.dueDate && (
                      <span className="text-[10px] text-amber-400 font-mono">
                        {new Date(milestone.dueDate).toLocaleDateString('ar-YE', { month: 'numeric', day: 'numeric' })}
                      </span>
                    )}
                  </div>
                  <h4 className="text-xs font-bold text-white line-clamp-1">{milestone.title}</h4>
                  <p className="text-[11px] text-gray-400 line-clamp-2 mt-0.5">{milestone.description}</p>
                </div>

                <div className="pt-2 border-t border-gray-800 flex items-center justify-between gap-2">
                  {hasAssignedTasks ? (
                    <Link
                      href={`/${locale}/tasks?taskId=${firstTaskId}`}
                      className={`text-[10px] font-bold flex items-center gap-1 hover:underline ${
                        milestone.isCompleted ? 'text-emerald-400' : 'text-lord-gold'
                      }`}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">
                        {milestone.isCompleted
                          ? 'مكتمل (فتح المهمة)'
                          : `فتح المهمة (${firstTaskStatus || 'نشطة'})`}
                      </span>
                      <ExternalLink className="w-3 h-3 shrink-0" />
                    </Link>
                  ) : isAdmin ? (
                    <button
                      type="button"
                      onClick={() => onDecomposeMilestone(project._id, mIdx)}
                      className="text-[10px] px-2.5 py-1 rounded-xl bg-lord-gold/20 text-lord-gold hover:bg-lord-gold hover:text-obsidian-primary font-bold transition-all flex items-center gap-1"
                    >
                      <ArrowRight className="w-3 h-3" />
                      <span>تحويل إلى مهمة 🚀</span>
                    </button>
                  ) : (
                    <span className="text-[10px] text-gray-500">بانتظار إسناد الإدارة</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
