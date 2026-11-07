'use client';

import React from 'react';
import { BarChart2, Coins, Zap, CheckCircle2 } from 'lucide-react';

interface TaskAnalyticsViewProps {
  tasks: any[];
}

export const TaskAnalyticsView: React.FC<TaskAnalyticsViewProps> = ({ tasks }) => {
  const totalCount = tasks.length;
  const completedCount = tasks.filter((t) => t.status === 'COMPLETED').length;
  const inProgressCount = tasks.filter((t) => t.status === 'IN_PROGRESS').length;
  const reviewCount = tasks.filter((t) => t.status === 'PENDING_ADMIN_REVIEW').length;

  const completionPercentage =
    totalCount > 0 ? ((completedCount / totalCount) * 100).toFixed(1) : '0';

  const totalBudget = tasks.reduce(
    (sum, t) => sum + (t.financialRequirement?.amount || 0),
    0
  );

  return (
    <div className="space-y-6">
      {/* 3 Metric Executive Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Card 1: Completion Velocity */}
        <div className="bg-obsidian-card border border-lord-gold/30 rounded-3xl p-6 shadow-2xl space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-400 font-semibold">
              معدل إنجاز المهام الكلي
            </span>
            <CheckCircle2 className="w-4 h-4 text-lord-gold" />
          </div>
          <div className="text-3xl font-black text-white font-mono">
            {completionPercentage}%
          </div>
          <div className="w-full bg-gray-800 h-2 rounded-full overflow-hidden">
            <div
              className="bg-lord-gold h-full transition-all duration-500 shadow-gold-glow"
              style={{ width: `${Math.min(Number(completionPercentage), 100)}%` }}
            />
          </div>
          <p className="text-[11px] text-gray-400">
            تم إنجاز {completedCount} من أصل {totalCount} مهمة
          </p>
        </div>

        {/* Card 2: Total Approved Budgets */}
        <div className="bg-obsidian-card border border-blue-500/30 rounded-3xl p-6 shadow-2xl space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-400 font-semibold">
              إجمالي ميزانيات المهام
            </span>
            <Coins className="w-4 h-4 text-cyber-blue" />
          </div>
          <div className="text-3xl font-black text-cyber-blue font-mono">
            ${totalBudget.toLocaleString()} USDT
          </div>
          <p className="text-[11px] text-gray-400">
            الميزانيات التشغيلية والمكافآت المحسوبة من قاعدة البيانات
          </p>
        </div>

        {/* Card 3: Velocity & Active Stages */}
        <div className="bg-obsidian-card border border-emerald-500/30 rounded-3xl p-6 shadow-2xl space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-400 font-semibold">
              المهام النشطة وقيد المراجعة
            </span>
            <Zap className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-3xl font-black text-emerald-400 font-mono">
            {inProgressCount + reviewCount}
          </div>
          <p className="text-[11px] text-gray-400">
            {inProgressCount} قيد التنفيذ اللحظي • {reviewCount} بانتظار اعتماد المسؤول
          </p>
        </div>
      </div>
    </div>
  );
};
