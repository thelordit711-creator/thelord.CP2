'use client';

import React from 'react';
import { AppModalPortal } from '../../ui/AppModalPortal';
import { Button } from '../../ui/Button';
import { Badge } from '../../ui/Badge';
import { StageDeliverableBox } from '../StageDeliverableBox';
import {
  Sparkles,
  Edit3,
  Trash2,
  X,
  BarChart2,
  User,
  Calendar,
  Coins,
  CheckCircle,
  Clock,
  Building2,
  AlertCircle,
  Receipt,
  Copy,
  ExternalLink,
  Compass,
  Paperclip,
  Layers,
  FileCheck2,
  Flame,
  Repeat
} from 'lucide-react';
import { lordToast } from '../../../lib/lordToast';

interface TaskDetailsModalProps {
  task: any | null;
  isOpen: boolean;
  onClose: () => void;
  isAdmin: boolean;
  onOpenExecutionWorkspace: () => void;
  onOpenEdit: (task: any) => void;
  onDeleteTask: (taskId: string, title: string) => void;
  isDeleting: boolean;
  onRefresh: () => void;
  onOpenLightbox: (img: { url: string; alt: string }) => void;
}

export const TaskDetailsModal: React.FC<TaskDetailsModalProps> = ({
  task,
  isOpen,
  onClose,
  isAdmin,
  onOpenExecutionWorkspace,
  onOpenEdit,
  onDeleteTask,
  isDeleting,
  onRefresh,
  onOpenLightbox
}) => {
  if (!task) return null;

  const totalStages = task.stages?.length || 0;
  const approvedStages =
    task.stages?.filter((s: any) => s.status === 'APPROVED').length || 0;
  const progressPercent =
    totalStages > 0
      ? Math.round((approvedStages / totalStages) * 100)
      : task.overallProgressPercent || 0;

  const isTaskCompleted =
    task.status === 'COMPLETED' || (totalStages > 0 && approvedStages === totalStages);
  const isTaskInProgress = task.status === 'IN_PROGRESS';
  const isTaskPendingReview = task.status === 'PENDING_ADMIN_REVIEW';

  let dueDateInfo: { dateString: string; diffDays: number; isOverdue: boolean } | null = null;
  if (task.dueDate) {
    const d = new Date(task.dueDate);
    const diffDays = Math.ceil((d.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    dueDateInfo = {
      dateString: d.toLocaleDateString('ar-YE', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      }),
      diffDays,
      isOverdue: diffDays < 0
    };
  }

  return (
    <AppModalPortal isOpen={isOpen} onClose={onClose} maxWidthClassName="max-w-4xl">
      <div className="bg-gradient-to-b from-obsidian-surface via-obsidian-card to-obsidian-surface border-2 border-lord-gold/50 rounded-3xl shadow-[0_0_60px_rgba(0,0,0,0.95),0_0_25px_rgba(212,175,55,0.2)] flex flex-col overflow-hidden h-full max-h-[96dvh] sm:max-h-[90vh]">
        {/* Sticky Top Header */}
        <div className="p-4 sm:p-6 border-b border-gray-800/80 bg-obsidian-surface/95 backdrop-blur-md shrink-0">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div className="space-y-2 flex-1 min-w-0">
              {/* Badges Row */}
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="gold" className="font-mono text-xs uppercase tracking-wide">
                  {task.targetPlatform}
                </Badge>
                <span
                  className={`px-3 py-1 rounded-xl text-xs font-black flex items-center gap-1.5 border shadow-xs ${
                    isTaskCompleted
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                      : isTaskInProgress
                      ? 'bg-lord-gold/20 text-lord-gold border-lord-gold/40'
                      : isTaskPendingReview
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                      : 'bg-gray-800 text-gray-300 border-gray-700'
                  }`}
                >
                  <span
                    className={`w-2 h-2 rounded-full ${
                      isTaskCompleted
                        ? 'bg-emerald-400'
                        : isTaskInProgress
                        ? 'bg-lord-gold animate-pulse'
                        : isTaskPendingReview
                        ? 'bg-amber-400 animate-ping'
                        : 'bg-gray-400'
                    }`}
                  />
                  <span>
                    {task.status === 'COMPLETED'
                      ? 'مكتملة ومعتمدة'
                      : task.status === 'IN_PROGRESS'
                      ? 'قيد التنفيذ النشط'
                      : task.status === 'PENDING_ADMIN_REVIEW'
                      ? 'بانتظار مراجعة الإدارة'
                      : task.status}
                  </span>
                </span>

                {/* Priority Badge */}
                <span
                  className={`px-2.5 py-1 rounded-xl text-xs font-bold flex items-center gap-1 border ${
                    task.priority === 'HIGH' || task.priority === 'URGENT'
                      ? 'bg-red-500/15 border-red-500/35 text-red-300'
                      : task.priority === 'MEDIUM'
                      ? 'bg-amber-500/15 border-amber-500/35 text-amber-300'
                      : 'bg-gray-800/80 border-gray-700 text-gray-300'
                  }`}
                >
                  <Flame className="w-3.5 h-3.5 text-current" />
                  <span>الأولوية: {task.priority}</span>
                </span>

                {/* Routine Recurring Tag */}
                {task.isDailyRecurring && (
                  <span className="px-2.5 py-1 rounded-xl bg-gray-800 text-gray-300 border border-gray-700 text-xs font-mono flex items-center gap-1.5">
                    <Repeat className="w-3.5 h-3.5 text-lord-gold" />
                    <span>مهمة روتينية يومية ({task.dailyRecurrenceTime || '09:00 ص'})</span>
                  </span>
                )}

                {/* Bounty / Financial Reward */}
                {task.isBountyTask && task.bountyRewardAmount && (
                  <span className="px-2.5 py-1 rounded-xl bg-lord-gold/20 border border-lord-gold/45 text-lord-gold text-xs font-black flex items-center gap-1 shadow-gold-glow/20">
                    <Coins className="w-3.5 h-3.5 text-lord-gold" />
                    <span>مكافأة إنجاز: ${task.bountyRewardAmount} USDT</span>
                  </span>
                )}
              </div>

              {/* Task Main Title */}
              <h2 className="text-lg sm:text-2xl font-black text-white leading-snug tracking-tight truncate">
                {task.title}
              </h2>
            </div>

            {/* Header Action Buttons */}
            <div className="flex flex-wrap items-center gap-2 justify-end shrink-0">
              <Button
                variant="gold"
                size="sm"
                onClick={onOpenExecutionWorkspace}
                className="shadow-gold-glow flex items-center gap-1.5 rounded-xl font-black text-xs px-3.5 py-2"
              >
                <Sparkles className="w-4 h-4 ml-0.5" />
                <span>مساحة التنفيذ الذكية ⚡</span>
              </Button>

              {isAdmin && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onOpenEdit(task)}
                    className="text-lord-gold border-lord-gold/40 hover:bg-lord-gold/15 flex items-center gap-1 rounded-xl font-bold text-xs px-3"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>تعديل</span>
                  </Button>

                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => onDeleteTask(task._id, task.title)}
                    disabled={isDeleting}
                    className="flex items-center gap-1 rounded-xl font-bold text-xs px-3"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>حذف</span>
                  </Button>
                </>
              )}

              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-xl bg-obsidian-card hover:bg-gray-800 text-gray-400 hover:text-white transition-all border border-gray-800 hover:border-gray-700"
                title="إغلاق النافذة"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 space-y-6 overscroll-contain custom-scrollbar pb-16">
          {/* Metadata Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* 1. Progress Card */}
            <div className="p-3.5 rounded-2xl bg-obsidian-card/90 border border-gray-800/90 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-400 font-bold flex items-center gap-1.5">
                  <BarChart2 className="w-3.5 h-3.5 text-lord-gold" />
                  <span>نسبة الإنجاز الكلية</span>
                </span>
                <span className="font-mono font-black text-lord-gold text-sm">{progressPercent}%</span>
              </div>
              <div className="w-full bg-gray-900 rounded-full h-2 overflow-hidden border border-gray-800">
                <div
                  className="bg-gradient-to-r from-lord-gold via-amber-400 to-emerald-400 h-full rounded-full transition-all duration-500 shadow-gold-glow"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <span className="text-[11px] text-gray-400 block">
                تم اعتماد {approvedStages} من أصل {totalStages} مراحل تنفيذية
              </span>
            </div>

            {/* 2. Assigned Employee */}
            <div className="p-3.5 rounded-2xl bg-obsidian-card/90 border border-gray-800/90 space-y-2">
              <span className="text-xs text-gray-400 font-bold flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-lord-gold" />
                <span>الموظف المسند إليه:</span>
              </span>
              {task.assignedTo && task.assignedTo.length > 0 ? (
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-xl bg-lord-gold/20 border border-lord-gold/40 flex items-center justify-center text-lord-gold font-black text-xs shrink-0 shadow-xs">
                    {(task.assignedTo[0] as any)?.fullName?.charAt(0) || 'U'}
                  </div>
                  <div className="min-w-0">
                    <span className="text-white font-bold text-xs truncate block">
                      {(task.assignedTo[0] as any)?.fullName || 'الموظف المسؤول'}
                    </span>
                    {task.assignedTo.length > 1 && (
                      <span className="text-[10px] text-gray-400">
                        +{task.assignedTo.length - 1} موظفين آخرين مشاركين
                      </span>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-xs text-gray-500 font-medium">غير مسندة (متاحة لعموم الفريق)</div>
              )}
            </div>

            {/* 3. Deadline */}
            <div className="p-3.5 rounded-2xl bg-obsidian-card/90 border border-gray-800/90 space-y-2">
              <span className="text-xs text-gray-400 font-bold flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                <span>الموعد النهائي والتوقيت:</span>
              </span>
              {dueDateInfo ? (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-white font-mono font-bold">{dueDateInfo.dateString}</span>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-md font-bold ${
                      dueDateInfo.isOverdue
                        ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                        : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    }`}
                  >
                    {dueDateInfo.isOverdue ? 'انتهت المهلة' : `متبقي ${dueDateInfo.diffDays} يوم`}
                  </span>
                </div>
              ) : (
                <div className="text-xs text-gray-400">
                  {task.isDailyRecurring ? 'مهمة مستمرة يومياً' : 'بدون موعد نهائي محدد'}
                </div>
              )}
            </div>
          </div>

          {/* FINANCIAL REQUIREMENT & PAYOUT STATUS CARD */}
          {task.financialRequirement?.requiresBudget && (() => {
            const fin = task.financialRequirement;
            const payoutOrder = typeof fin.payoutOrderId === 'object' ? (fin.payoutOrderId as any) : null;
            const isDisbursed = payoutOrder?.executionStatus === 'DISBURSED';
            const isProcessing = payoutOrder?.executionStatus === 'IN_PROGRESS';
            const isWaitingTreasury =
              payoutOrder?.executionStatus === 'WAITING_TREASURY' || fin.adminApprovalStatus === 'APPROVED';
            const isPendingAdmin = fin.adminApprovalStatus === 'PENDING_ADMIN';
            const isRejected = fin.adminApprovalStatus === 'REJECTED';

            const payoutMethodLabel =
              fin.payoutMethodRequested === 'BEP20_USDT'
                ? 'USDT (شبكة BSC BEP-20)'
                : fin.payoutMethodRequested === 'JEEB_WALLET'
                ? 'محفظة جيب الإلكترونية (Jeeb)'
                : fin.payoutMethodRequested === 'JAWALI_WALLET'
                ? 'محفظة جوالي الإلكترونية (Jawali)'
                : fin.payoutMethodRequested || 'تحويل مالي';

            return (
              <div
                className={`p-4 sm:p-5 rounded-2xl border transition-all space-y-3.5 backdrop-blur-md shadow-md ${
                  isDisbursed
                    ? 'bg-gradient-to-l from-emerald-950/25 via-obsidian-card to-obsidian-surface border-emerald-500/50 shadow-emerald-500/10'
                    : isProcessing
                    ? 'bg-gradient-to-l from-amber-950/25 via-obsidian-card to-obsidian-surface border-amber-500/50 shadow-amber-500/10'
                    : isWaitingTreasury
                    ? 'bg-gradient-to-l from-amber-950/20 via-obsidian-card to-obsidian-surface border-lord-gold/40'
                    : isRejected
                    ? 'bg-gradient-to-l from-red-950/25 via-obsidian-card to-obsidian-surface border-red-500/50'
                    : 'bg-gradient-to-l from-yellow-950/25 via-obsidian-card to-obsidian-surface border-yellow-500/40'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-800/80 pb-3">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 font-bold shadow-md ${
                        isDisbursed
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/35'
                          : isProcessing
                          ? 'bg-amber-500/20 text-amber-400 border border-amber-500/35 animate-pulse'
                          : 'bg-lord-gold/20 text-lord-gold border border-lord-gold/35'
                      }`}
                    >
                      <Coins className="w-5 h-5 text-current" />
                    </div>
                    <div>
                      <h4 className="text-sm sm:text-base font-black text-white flex items-center gap-2">
                        <span>المعاملة المالية وميزانية المهمة:</span>
                        <span className="text-lord-gold font-mono font-black text-base sm:text-lg">
                          ${fin.amount} {fin.currency || 'USDT'}
                        </span>
                      </h4>
                      <span className="text-xs text-gray-400 block mt-0.5">
                        طريقة الاستلام المحددة: <strong className="text-gray-200">{payoutMethodLabel}</strong>
                        {fin.justification ? ` • ${fin.justification}` : ''}
                      </span>
                    </div>
                  </div>

                  <div className="shrink-0">
                    {isDisbursed ? (
                      <span className="px-3.5 py-1.5 rounded-xl bg-emerald-500/20 border border-emerald-500/50 text-emerald-300 font-black text-xs flex items-center gap-2 shadow-emerald-500/10">
                        <CheckCircle className="w-4 h-4 text-emerald-400 stroke-[2.5]" />
                        <span>تم تحويل وصرف المبلغ بنجاح ✓</span>
                      </span>
                    ) : isProcessing ? (
                      <span className="px-3.5 py-1.5 rounded-xl bg-amber-500/20 border border-amber-500/50 text-amber-300 font-black text-xs flex items-center gap-2 shadow-sm">
                        <Clock className="w-4 h-4 text-amber-400 animate-spin" />
                        <span>جاري معالجة التحويل والصرف من الخزينة ⏳</span>
                      </span>
                    ) : isWaitingTreasury ? (
                      <span className="px-3.5 py-1.5 rounded-xl bg-lord-gold/15 border border-lord-gold/40 text-lord-gold font-black text-xs flex items-center gap-2 shadow-sm">
                        <Building2 className="w-4 h-4 text-lord-gold" />
                        <span>معتمد إدارياً — بانتظار صرف الخزينة 🏦</span>
                      </span>
                    ) : isRejected ? (
                      <span className="px-3.5 py-1.5 rounded-xl bg-red-500/20 border border-red-500/50 text-red-300 font-bold text-xs flex items-center gap-2 shadow-sm">
                        <X className="w-4 h-4 text-red-400" />
                        <span>تم رفض طلب الميزانية ❌</span>
                      </span>
                    ) : (
                      <span className="px-3.5 py-1.5 rounded-xl bg-yellow-500/20 border border-yellow-500/50 text-yellow-300 font-bold text-xs flex items-center gap-2 shadow-sm">
                        <AlertCircle className="w-4 h-4 text-yellow-400" />
                        <span>بانتظار موافقة الإدارة على الميزانية ⚠️</span>
                      </span>
                    )}
                  </div>
                </div>

                {isDisbursed && payoutOrder?.transferProof && (
                  <div className="p-3.5 sm:p-4 rounded-xl bg-obsidian-surface border border-emerald-500/35 space-y-3">
                    <div className="flex items-center justify-between text-xs flex-wrap gap-2">
                      <span className="text-emerald-300 font-bold flex items-center gap-1.5">
                        <Receipt className="w-4 h-4 text-emerald-400" />
                        <span>بيانات وسند الحوالة المالية الصادرة للمستفيد:</span>
                      </span>
                      {payoutOrder.disbursedClickedAt && (
                        <span className="text-gray-400 font-mono text-[11px]">
                          تاريخ ووقت الصرف: {new Date(payoutOrder.disbursedClickedAt).toLocaleString('ar-YE')}
                        </span>
                      )}
                    </div>

                    {payoutOrder.transferProof.txHashOrReferenceNumber && (
                      <div className="flex items-center justify-between p-2.5 rounded-lg bg-obsidian-card border border-gray-700/80 gap-2 flex-wrap">
                        <div className="min-w-0">
                          <span className="text-[10px] text-gray-400 block mb-0.5">
                            رقم الحوالة أو الهاش المرجعي (TxHash / Reference Number):
                          </span>
                          <span className="font-mono text-xs text-white font-bold select-all break-all">
                            {payoutOrder.transferProof.txHashOrReferenceNumber}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(
                                payoutOrder.transferProof.txHashOrReferenceNumber
                              );
                              lordToast.success('تم نسخ كود التحويل / الهاش بنجاح 📋');
                            }}
                            className="px-2.5 py-1 rounded-md bg-gray-800 hover:bg-gray-700 text-gray-200 text-xs font-bold flex items-center gap-1 transition-colors"
                            title="نسخ الهاش"
                          >
                            <Copy className="w-3.5 h-3.5 text-lord-gold" />
                            <span>نسخ الكود</span>
                          </button>
                          {payoutOrder.transferProof.txHashOrReferenceNumber.startsWith('0x') && (
                            <a
                              href={`https://bscscan.com/tx/${payoutOrder.transferProof.txHashOrReferenceNumber}`}
                              target="_blank"
                              rel="noreferrer"
                              className="px-2.5 py-1 rounded-md bg-lord-gold/15 border border-lord-gold/30 text-lord-gold hover:underline text-xs font-bold flex items-center gap-1 transition-colors"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                              <span>BscScan</span>
                            </a>
                          )}
                        </div>
                      </div>
                    )}

                    {payoutOrder.transferProof.receiptScreenshot?.fileUrl && (
                      <div className="flex items-center gap-3 pt-1">
                        <span className="text-[11px] text-gray-300 font-bold">صورة سند / إشعار التحويل:</span>
                        <button
                          type="button"
                          onClick={() =>
                            onOpenLightbox({
                              url: payoutOrder.transferProof.receiptScreenshot.fileUrl,
                              alt: 'سند التحويل المالي'
                            })
                          }
                          className="group relative cursor-zoom-in rounded-xl overflow-hidden border border-emerald-500/40 hover:border-lord-gold transition-all"
                          title="انقر لتكبير ومعاينة سند التحويل"
                        >
                          <img
                            src={payoutOrder.transferProof.receiptScreenshot.fileUrl}
                            alt="سند التحويل"
                            className="w-24 h-16 object-cover group-hover:scale-105 transition-transform"
                          />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-[10px] text-white font-bold">
                            تكبير 🔍
                          </div>
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })()}

          {/* Description & Work Plan */}
          <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-l from-obsidian-card via-obsidian-card to-amber-950/15 border-r-4 border-r-lord-gold border border-gray-800 space-y-2.5 shadow-sm">
            <div className="flex items-center gap-2 text-xs font-bold text-lord-gold uppercase tracking-wider">
              <Compass className="w-4 h-4 text-lord-gold" />
              <span>تفاصيل وخطة وتوجيهات المهمة التنفيذية:</span>
            </div>
            <p className="text-sm text-gray-200 leading-relaxed font-normal whitespace-pre-line pr-1">
              {task.description}
            </p>

            {task.adminBriefAttachments && task.adminBriefAttachments.length > 0 && (
              <div className="pt-3 border-t border-gray-800/70 space-y-2">
                <span className="text-xs font-bold text-gray-400 flex items-center gap-1.5">
                  <Paperclip className="w-3.5 h-3.5 text-lord-gold" />
                  <span>مرفقات التكليف والتوجيه الإداري ({task.adminBriefAttachments.length}):</span>
                </span>
                <div className="flex flex-wrap gap-2.5">
                  {task.adminBriefAttachments.map((att: any, aIdx: number) => {
                    const isImg =
                      att.fileType === 'IMAGE' ||
                      att.fileUrl?.match(/\.(jpeg|jpg|gif|png|webp)($|\?)/i);
                    return isImg ? (
                      <button
                        key={aIdx}
                        type="button"
                        onClick={() =>
                          onOpenLightbox({
                            url: att.fileUrl,
                            alt: att.fileName || 'مرفق المهمة'
                          })
                        }
                        className="block cursor-zoom-in group"
                        title="انقر لتكبير ومعاينة الصورة"
                      >
                        <img
                          src={att.fileUrl}
                          alt={att.fileName || 'مرفق'}
                          className="w-20 h-20 object-cover rounded-xl border border-gray-700 group-hover:border-lord-gold group-hover:scale-105 transition-all shadow-md"
                        />
                      </button>
                    ) : (
                      <a
                        key={aIdx}
                        href={att.fileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3.5 py-2 rounded-xl bg-obsidian-surface border border-gray-700 hover:border-lord-gold text-xs font-bold text-gray-200 hover:text-white flex items-center gap-2 transition-all shadow-sm"
                      >
                        <Paperclip className="w-3.5 h-3.5 text-lord-gold" />
                        <span className="truncate max-w-[160px]">{att.fileName || 'مستند مرفق'}</span>
                        <ExternalLink className="w-3 h-3 text-gray-500 mr-auto" />
                      </a>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Stages Execution Pipeline */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-gray-800/80 pb-3 flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-lord-gold" />
                <span className="text-sm font-black text-white uppercase tracking-wider">
                  المسار التنفيذي ومراحل الاعتماد ({task.stages?.length || 0})
                </span>
              </div>
              <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-gray-800/80 border border-gray-700/60 text-gray-400 font-medium">
                تتابع المراحل تسلسلياً — لا تفتح مرحلة إلا بعد اعتماد سابقتها
              </span>
            </div>

            <div className="space-y-4 relative before:absolute before:top-6 before:bottom-6 before:right-5 before:w-0.5 before:bg-gradient-to-b before:from-lord-gold/40 before:via-gray-800 before:to-gray-800/20 before:hidden md:before:block">
              {task.stages?.map((stage: any) => (
                <StageDeliverableBox
                  key={stage.stageOrder}
                  taskId={task._id}
                  stage={stage}
                  canSubmit={!isAdmin}
                  isAdmin={isAdmin}
                  onRefresh={onRefresh}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Sticky Bottom Executive Footer */}
        <div className="p-3.5 sm:p-4 border-t border-gray-800/80 bg-obsidian-surface/95 backdrop-blur-md shrink-0 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400 font-bold hidden sm:inline">نسبة الإنجاز:</span>
              <span className="font-mono font-black text-lord-gold text-xs sm:text-sm">
                {progressPercent}%
              </span>
            </div>
            <div className="w-24 sm:w-36 bg-gray-900 rounded-full h-2 overflow-hidden border border-gray-800 hidden xs:block">
              <div
                className="bg-gradient-to-r from-lord-gold to-emerald-400 h-full rounded-full transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <span className="text-[11px] text-gray-400 truncate hidden md:inline">
              ({approvedStages} من أصل {totalStages} مراحل معتمدة)
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="gold"
              size="sm"
              onClick={onOpenExecutionWorkspace}
              className="shadow-gold-glow flex items-center gap-1.5 rounded-xl font-black text-xs px-3.5 py-1.5"
            >
              <Sparkles className="w-3.5 h-3.5 ml-0.5" />
              <span>مساحة التنفيذ الذكية ⚡</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onClose}
              className="text-gray-300 border-gray-700 hover:bg-gray-800 rounded-xl text-xs px-3 py-1.5"
            >
              <span>إغلاق النافذة</span>
            </Button>
          </div>
        </div>
      </div>
    </AppModalPortal>
  );
};

