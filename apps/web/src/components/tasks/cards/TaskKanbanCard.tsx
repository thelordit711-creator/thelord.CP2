'use client';

import React from 'react';
import { Badge } from '../../ui/Badge';
import {
  Coins,
  Repeat,
  Layers,
  Calendar,
  Flame,
  CheckCircle2,
  Clock,
  User
} from 'lucide-react';
import { ITask } from '@lord/shared-types';

interface TaskKanbanCardProps {
  task: any;
  onClick: (task: any) => void;
  onClaimBounty?: (taskId: string) => void;
  canClaimBounty?: boolean;
}

export const TaskKanbanCard: React.FC<TaskKanbanCardProps> = React.memo(
  ({ task, onClick, onClaimBounty, canClaimBounty }) => {
    const totalStages = task.stages?.length || 0;
    const approvedStages =
      task.stages?.filter((s: any) => s.status === 'APPROVED').length || 0;
    const progressPercent =
      totalStages > 0
        ? Math.round((approvedStages / totalStages) * 100)
        : task.overallProgressPercent || 0;

    const hasBudget = Boolean(task.financialRequirement?.requiresBudget);
    const budgetAmount = task.financialRequirement?.amount || 0;
    const payoutOrder =
      typeof task.financialRequirement?.payoutOrderId === 'object'
        ? task.financialRequirement?.payoutOrderId
        : null;
    const isDisbursed = payoutOrder?.executionStatus === 'DISBURSED';

    return (
      <div
        onClick={() => onClick(task)}
        className="p-4 rounded-2xl bg-obsidian-surface border border-gray-800/80 hover:border-lord-gold/50 cursor-pointer transition-all duration-200 space-y-3 shadow-lg group hover:scale-[1.01] select-none"
      >
        {/* Top Badges */}
        <div className="flex items-center justify-between flex-wrap gap-1.5">
          <Badge variant="gold" className="text-[10px] font-mono">
            {task.targetPlatform}
          </Badge>

          <div className="flex items-center gap-1">
            {task.isDailyRecurring && (
              <span className="px-2 py-0.5 rounded-full bg-gray-800 text-gray-300 border border-gray-700 text-[10px] font-mono flex items-center gap-1">
                <Repeat className="w-3 h-3 text-lord-gold" />
                <span>{task.dailyRecurrenceTime || '09:00'}</span>
              </span>
            )}

            {task.priority === 'HIGH' || task.priority === 'URGENT' ? (
              <span className="px-2 py-0.5 rounded-full bg-red-500/15 border border-red-500/30 text-red-300 text-[10px] font-bold flex items-center gap-0.5">
                <Flame className="w-3 h-3 text-red-400" />
                <span>عاجل</span>
              </span>
            ) : null}
          </div>
        </div>

        {/* Task Title */}
        <h4 className="text-xs sm:text-sm font-bold text-white group-hover:text-lord-gold transition-colors line-clamp-2 leading-relaxed">
          {task.title}
        </h4>

        {/* Financial Requirement Badge */}
        {hasBudget && (
          <div className="flex items-center gap-1.5 p-1.5 rounded-xl bg-obsidian-card border border-lord-gold/25 text-[10px]">
            <Coins className="w-3.5 h-3.5 text-lord-gold shrink-0" />
            <span className="text-white font-mono font-bold">
              ${budgetAmount} USDT
            </span>
            <span className="text-gray-500">•</span>
            {isDisbursed ? (
              <span className="text-emerald-400 font-bold">تم الصرف ✓</span>
            ) : (
              <span className="text-amber-400 font-bold">بانتظار الصرف ⏳</span>
            )}
          </div>
        )}

        {/* Bounty Reward Tag if any */}
        {task.isBountyTask && task.bountyRewardAmount && (
          <div className="flex items-center justify-between p-1.5 rounded-xl bg-lord-gold/10 border border-lord-gold/30 text-[10px]">
            <span className="text-lord-gold font-bold flex items-center gap-1">
              💰 مكافأة إنجاز: ${task.bountyRewardAmount} USDT
            </span>
            {canClaimBounty && onClaimBounty && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onClaimBounty(task._id);
                }}
                className="px-2 py-0.5 rounded-lg bg-lord-gold text-black font-black hover:scale-105 transition-transform"
              >
                اقتناص
              </button>
            )}
          </div>
        )}

        {/* Progress Bar & Stages Counter */}
        {totalStages > 0 && (
          <div className="space-y-1.5 pt-1 border-t border-gray-800/80">
            <div className="flex items-center justify-between text-[10px]">
              <span className="text-gray-400 flex items-center gap-1">
                <Layers className="w-3 h-3 text-lord-gold" />
                <span>المراحل ({approvedStages}/{totalStages})</span>
              </span>
              <span className="text-lord-gold font-mono font-bold">{progressPercent}%</span>
            </div>
            <div className="w-full bg-gray-900 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-gradient-to-r from-lord-gold to-emerald-400 h-full rounded-full transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        )}

        {/* Bottom Metadata: Assigned Avatar & Due Date */}
        <div className="flex items-center justify-between text-[11px] text-gray-400 pt-1">
          {task.assignedTo && task.assignedTo.length > 0 ? (
            <div className="flex items-center gap-1.5">
              <div className="w-5 h-5 rounded-full bg-lord-gold/20 border border-lord-gold/40 flex items-center justify-center text-[9px] font-bold text-lord-gold shrink-0">
                {(task.assignedTo[0] as any)?.fullName?.charAt(0) || 'U'}
              </div>
              <span className="text-[10px] text-gray-300 truncate max-w-[90px]">
                {(task.assignedTo[0] as any)?.fullName || 'الموظف'}
              </span>
            </div>
          ) : (
            <span className="text-[10px] text-gray-500 font-medium">غير مسندة</span>
          )}

          {task.dueDate ? (
            <span className="text-[10px] font-mono flex items-center gap-1 text-gray-400">
              <Calendar className="w-3 h-3 text-emerald-400" />
              <span>{new Date(task.dueDate).toLocaleDateString('ar-YE', { month: 'short', day: 'numeric' })}</span>
            </span>
          ) : null}
        </div>
      </div>
    );
  },
  (prev, next) => {
    return (
      prev.task._id === next.task._id &&
      prev.task.status === next.task.status &&
      prev.task.updatedAt === next.task.updatedAt &&
      prev.task.overallProgressPercent === next.task.overallProgressPercent &&
      prev.canClaimBounty === next.canClaimBounty
    );
  }
);

TaskKanbanCard.displayName = 'TaskKanbanCard';

