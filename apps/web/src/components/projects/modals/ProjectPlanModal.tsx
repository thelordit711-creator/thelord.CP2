'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { AppModalPortal } from '../../ui/AppModalPortal';
import { Badge } from '../../ui/Badge';
import { Button } from '../../ui/Button';
import { useGetProjectFinancialsQuery } from '../../../store/api/projectsApi';
import {
  Sparkles,
  Edit3,
  Trash2,
  X,
  CheckCircle2,
  AlertCircle,
  Layers,
  ArrowRight,
  MessageSquare,
  Wallet,
  ExternalLink,
  Users
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
  onOpenProjectChat?: (projectId: string) => void;
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
  onDeleteProject,
  onOpenProjectChat
}) => {
  const params = useParams();
  const locale = (params?.locale as string) || 'ar';
  const [activeTab, setActiveTab] = useState<'PLAN' | 'FINANCIALS'>('PLAN');

  const { data: financialsRes, isLoading: isLoadingFinancials } = useGetProjectFinancialsQuery(
    project?._id || '',
    { skip: !isOpen || !project?._id || activeTab !== 'FINANCIALS' }
  );

  if (!project) return null;

  const financials = financialsRes?.data;
  const transactions = financials?.transactions || [];
  const totalMilestones = project.wbsMilestones?.length || 0;
  const completedMilestones = (project.wbsMilestones || []).filter((m: any) => m.isCompleted).length;

  return (
    <AppModalPortal isOpen={isOpen} onClose={onClose} maxWidthClassName="max-w-4xl">
      <div className="bg-obsidian-surface border-2 border-lord-gold/60 rounded-3xl p-6 md:p-8 shadow-2xl max-h-[92vh] overflow-y-auto space-y-6 text-right">
        {/* Modal Header */}
        <div className="flex items-start justify-between border-b border-gray-800 pb-4 gap-3 flex-wrap">
          <div>
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-lg bg-lord-gold/20 border border-lord-gold/40 text-lord-gold font-mono font-black text-xs">
                {project.code}
              </span>
              <Badge variant={project.status === 'COMPLETED' ? 'cyber' : 'gold'}>
                {project.status}
              </Badge>
              <span className="text-xs text-gray-400 font-mono">
                الميزانية: ${(project.spentBudget || 0).toLocaleString()} / ${(project.allocatedBudget || 0).toLocaleString()} USDT
              </span>
              <span className="text-xs text-emerald-400 font-mono">
                • المعالم: {completedMilestones}/{totalMilestones}
              </span>
            </div>
            <h2 className="text-xl font-black text-white">{project.title}</h2>
            <p className="text-xs text-gray-400 mt-1">{project.description}</p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {onOpenProjectChat && (
              <button
                type="button"
                onClick={() => onOpenProjectChat(project._id)}
                className="px-3 py-2 rounded-xl bg-cyber-blue/15 border border-cyber-blue/40 text-cyber-blue hover:bg-cyber-blue hover:text-obsidian-primary text-xs font-bold transition-all flex items-center gap-1.5"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>قناة فريق المشروع</span>
              </button>
            )}

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
              aria-label="إغلاق النافذة"
              className="p-2 rounded-xl bg-obsidian-card hover:bg-gray-800 text-gray-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Sub-Tabs */}
        <div className="flex items-center gap-2 bg-obsidian-card p-1 rounded-2xl border border-gray-800 text-xs w-fit">
          <button
            type="button"
            onClick={() => setActiveTab('PLAN')}
            className={`px-4 py-2 rounded-xl font-bold flex items-center gap-1.5 transition-all ${
              activeTab === 'PLAN'
                ? 'bg-lord-gold text-obsidian-primary shadow-gold-glow'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>الخطة ومعالم WBS والفريق</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('FINANCIALS')}
            className={`px-4 py-2 rounded-xl font-bold flex items-center gap-1.5 transition-all ${
              activeTab === 'FINANCIALS'
                ? 'bg-lord-gold text-obsidian-primary shadow-gold-glow'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Wallet className="w-3.5 h-3.5" />
            <span>السجل المالي وحركات الصرف</span>
          </button>
        </div>

        {activeTab === 'FINANCIALS' ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-4 bg-obsidian-card rounded-2xl border border-lord-gold/30">
                <span className="text-gray-400 block mb-1">السقف المخصص للمشروع</span>
                <span className="text-lg font-black text-white font-mono">
                  ${(financials?.allocatedBudget ?? project.allocatedBudget ?? 0).toLocaleString()} USDT
                </span>
              </div>
              <div className="p-4 bg-obsidian-card rounded-2xl border border-emerald-500/30">
                <span className="text-gray-400 block mb-1">المصروف الفعلي عبر الخزينة</span>
                <span className="text-lg font-black text-emerald-400 font-mono">
                  ${(financials?.spentBudget ?? project.spentBudget ?? 0).toLocaleString()} USDT
                </span>
              </div>
              <div className="p-4 bg-obsidian-card rounded-2xl border border-cyber-blue/30">
                <span className="text-gray-400 block mb-1">المتبقي في سقف المشروع</span>
                <span className="text-lg font-black text-cyber-blue font-mono">
                  ${(
                    financials?.remainingBudget ??
                    Math.max(0, (project.allocatedBudget || 0) - (project.spentBudget || 0))
                  ).toLocaleString()} USDT
                </span>
              </div>
            </div>

            {isLoadingFinancials ? (
              <div className="p-8 text-center text-xs text-lord-gold">جاري تحميل حركات الصرف المرتبطة بالمشروع...</div>
            ) : transactions.length === 0 ? (
              <div className="p-8 bg-obsidian-card border border-gray-800 rounded-2xl text-center text-xs text-gray-400">
                لا توجد أوامر صرف مسجلة مرتبطة بمهام هذا المشروع حتى الآن.
              </div>
            ) : (
              <div className="space-y-2">
                {transactions.map((tx: any) => (
                  <div
                    key={tx._id}
                    className="p-3.5 bg-obsidian-card border border-gray-800 rounded-2xl flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="space-y-0.5 min-w-0">
                      <div className="font-bold text-white truncate">
                        {tx.summaryForTreasury || tx.relatedTaskId?.title || 'أمر صرف تشغيلي'}
                      </div>
                      <div className="text-[11px] text-gray-400">
                        المستفيد: {tx.beneficiaryId?.fullName || 'عضو الفريق'} • الحالة: {tx.executionStatus}
                      </div>
                    </div>
                    <div className="text-left shrink-0 font-mono font-black text-lord-gold">
                      ${Number(tx.amount || 0).toLocaleString()} {tx.currency || 'USDT'}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <>
            {/* Plan Sections Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div className="p-4 bg-obsidian-card rounded-2xl border border-gray-800 space-y-2">
                <span className="font-bold text-lord-gold flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-lord-gold" />
                  <span>الأهداف الاستراتيجية:</span>
                </span>
                <ul className="text-gray-300 space-y-1.5 list-disc list-inside">
                  {(project.objectives?.length ? project.objectives : ['تحقيق النمو التشغيلي']).map(
                    (item: string, idx: number) => (
                      <li key={idx} className="leading-relaxed">{item}</li>
                    )
                  )}
                </ul>
              </div>

              <div className="p-4 bg-obsidian-card rounded-2xl border border-gray-800 space-y-2">
                <span className="font-bold text-blue-400 flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 text-blue-400" />
                  <span>المتطلبات الأساسية:</span>
                </span>
                <ul className="text-gray-300 space-y-1.5 list-disc list-inside">
                  {(project.requirements?.length ? project.requirements : ['مراجعة المخرجات الفنية']).map(
                    (item: string, idx: number) => (
                      <li key={idx} className="leading-relaxed">{item}</li>
                    )
                  )}
                </ul>
              </div>

              <div className="p-4 bg-obsidian-card rounded-2xl border border-gray-800 space-y-2">
                <span className="font-bold text-lord-gold flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-lord-gold" />
                  <span>فريق المشروع والأدوات:</span>
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {(project.teamMembers || []).map((m: any, idx: number) => (
                    <span
                      key={m?._id || idx}
                      className="px-2 py-0.5 rounded-lg bg-obsidian-surface border border-gray-700 text-[11px] text-gray-200"
                    >
                      {m?.fullName || 'عضو فريق'}
                    </span>
                  ))}
                </div>
                <ul className="text-gray-400 space-y-1 list-disc list-inside pt-1">
                  {(project.toolsAndResources || []).map((item: string, idx: number) => (
                    <li key={idx}>{item}</li>
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
                  {project.wbsMilestones?.filter((m: any) => m.assignedTasks?.length > 0).length} من{' '}
                  {totalMilestones} معالم محولة لمهام
                </span>
              </div>

              <div className="space-y-2.5">
                {(project.wbsMilestones || []).map((milestone: any, mIdx: number) => {
                  const linkedTasks = milestone.assignedTasks || [];
                  const isDecomposed = linkedTasks.length > 0;
                  return (
                    <div
                      key={milestone._id || mIdx}
                      className="p-4 rounded-2xl bg-obsidian-card border border-gray-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-md"
                    >
                      <div className="space-y-1.5 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="px-2 py-0.5 rounded bg-slate-800 text-lord-gold font-mono text-[10px] font-bold">
                            المعلم #{mIdx + 1}
                          </span>
                          <h4 className="text-xs font-bold text-white">{milestone.title}</h4>
                          {milestone.isCompleted && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 font-bold">
                              ✓ مكتمل
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-gray-400 leading-relaxed">{milestone.description}</p>

                        {isDecomposed && (
                          <div className="flex flex-wrap gap-1.5 pt-1">
                            {linkedTasks.map((t: any, tIdx: number) => {
                              const taskId = typeof t === 'string' ? t : t?._id;
                              const taskTitle = typeof t === 'string' ? `مهمة #${tIdx + 1}` : t?.title || `مهمة #${tIdx + 1}`;
                              const taskStatus = typeof t === 'object' ? t?.status : '';
                              return (
                                <Link
                                  key={taskId || tIdx}
                                  href={`/${locale}/tasks?taskId=${taskId}`}
                                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-obsidian-surface border border-gray-700 hover:border-lord-gold text-[11px] text-gray-200 hover:text-lord-gold transition-all"
                                >
                                  <span>{taskTitle}</span>
                                  {taskStatus && (
                                    <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-gray-800 text-emerald-400">
                                      {taskStatus}
                                    </span>
                                  )}
                                  <ExternalLink className="w-3 h-3 opacity-75" />
                                </Link>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {isDecomposed ? (
                          <span
                            className={`px-3 py-1 rounded-xl border text-xs font-bold flex items-center gap-1.5 ${
                              milestone.isCompleted
                                ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'
                                : 'bg-lord-gold/10 border-lord-gold/30 text-lord-gold'
                            }`}
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>{milestone.isCompleted ? 'منجز ومعتمد' : 'قيد التنفيذ في المهام'}</span>
                          </span>
                        ) : isAdmin ? (
                          <Button
                            variant="gold"
                            size="sm"
                            onClick={() => onDecomposeMilestone(project._id, mIdx)}
                            className="text-xs font-bold rounded-xl flex items-center gap-1"
                          >
                            <ArrowRight className="w-3.5 h-3.5 ml-1" />
                            <span>تحويل لمهمة الآن</span>
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </div>
    </AppModalPortal>
  );
};
