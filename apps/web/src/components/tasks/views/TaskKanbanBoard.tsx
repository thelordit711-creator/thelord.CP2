'use client';

import React, { useState } from 'react';
import { TaskKanbanCard } from '../cards/TaskKanbanCard';

interface TaskKanbanBoardProps {
  tasks: any[];
  onSelectTask: (task: any) => void;
  onClaimBounty?: (taskId: string) => void;
  canClaimBounty?: boolean;
}

export const TaskKanbanBoard: React.FC<TaskKanbanBoardProps> = ({
  tasks,
  onSelectTask,
  onClaimBounty,
  canClaimBounty
}) => {
  const [mobileTab, setMobileTab] = useState<
    'TODO' | 'IN_PROGRESS' | 'PENDING_ADMIN_REVIEW' | 'COMPLETED'
  >('TODO');

  const todoTasks = tasks.filter((t) => t.status === 'TODO');
  const inProgressTasks = tasks.filter((t) => t.status === 'IN_PROGRESS');
  const reviewTasks = tasks.filter((t) => t.status === 'PENDING_ADMIN_REVIEW');
  const completedTasks = tasks.filter((t) => t.status === 'COMPLETED');

  const columns = [
    {
      id: 'TODO' as const,
      title: 'مهام مطلوبة وجديدة (To Do)',
      shortTitle: 'مطلوبة',
      count: todoTasks.length,
      items: todoTasks,
      dotColor: 'bg-gray-400',
      activeTabStyle: 'bg-gray-700 text-white shadow-md',
      tabColor: 'text-gray-400'
    },
    {
      id: 'IN_PROGRESS' as const,
      title: 'قيد التنفيذ النشط (In Progress)',
      shortTitle: 'قيد العمل',
      count: inProgressTasks.length,
      items: inProgressTasks,
      dotColor: 'bg-blue-500 animate-pulse',
      activeTabStyle: 'bg-blue-600 text-white shadow-blue-glow',
      tabColor: 'text-blue-400/80'
    },
    {
      id: 'PENDING_ADMIN_REVIEW' as const,
      title: 'مراجعة وتدقيق الإدارة (Review)',
      shortTitle: 'المراجعة',
      count: reviewTasks.length,
      items: reviewTasks,
      dotColor: 'bg-amber-400 animate-ping',
      activeTabStyle: 'bg-lord-gold text-obsidian-primary shadow-gold-glow',
      tabColor: 'text-lord-gold/80'
    },
    {
      id: 'COMPLETED' as const,
      title: 'مكتملة ومعتمدة (Done)',
      shortTitle: 'مكتملة',
      count: completedTasks.length,
      items: completedTasks,
      dotColor: 'bg-emerald-400',
      activeTabStyle: 'bg-emerald-600 text-white shadow-md',
      tabColor: 'text-emerald-400/80'
    }
  ];

  return (
    <div className="space-y-4">
      {/* Mobile Kanban Tab Switcher */}
      <div className="grid grid-cols-4 md:hidden gap-1.5 p-1 bg-obsidian-surface rounded-2xl border border-gray-800 text-xs">
        {columns.map((col) => (
          <button
            key={col.id}
            type="button"
            onClick={() => setMobileTab(col.id)}
            className={`py-2 px-1 rounded-xl font-bold text-center transition-all flex flex-col items-center gap-0.5 ${
              mobileTab === col.id
                ? col.activeTabStyle
                : `${col.tabColor} hover:text-white`
            }`}
          >
            <span className="text-[11px]">{col.shortTitle}</span>
            <span className="text-[9px] font-mono opacity-80">({col.count})</span>
          </button>
        ))}
      </div>

      {/* 4 Responsive Kanban Columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {columns.map((col) => (
          <div
            key={col.id}
            className={`bg-obsidian-card border border-obsidian-border rounded-3xl p-4 flex flex-col min-h-[300px] md:min-h-[500px] ${
              mobileTab === col.id ? 'flex' : 'hidden md:flex'
            }`}
          >
            {/* Column Header */}
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-gray-800">
              <span className="text-xs font-bold text-gray-300 flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full ${col.dotColor}`} />
                <span>{col.title}</span>
              </span>
              <span className="text-[10px] font-mono bg-obsidian-surface px-2 py-0.5 rounded text-gray-400 font-bold">
                {col.count}
              </span>
            </div>

            {/* Column Card List */}
            <div className="space-y-3 flex-1 overflow-y-auto pr-0.5">
              {col.items.length === 0 ? (
                <div className="h-40 flex items-center justify-center text-xs text-gray-500 font-medium">
                  لا توجد مهام في هذا المسار
                </div>
              ) : (
                col.items.map((task) => (
                  <TaskKanbanCard
                    key={task._id}
                    task={task}
                    onClick={onSelectTask}
                    onClaimBounty={onClaimBounty}
                    canClaimBounty={canClaimBounty}
                  />
                ))
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

