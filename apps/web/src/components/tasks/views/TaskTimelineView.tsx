'use client';

import React from 'react';
import { Badge } from '../../ui/Badge';
import { Calendar, Layers } from 'lucide-react';

interface TaskTimelineViewProps {
  tasks: any[];
  onSelectTask: (task: any) => void;
}

export const TaskTimelineView: React.FC<TaskTimelineViewProps> = ({
  tasks,
  onSelectTask
}) => {
  return (
    <div className="bg-obsidian-card border border-obsidian-border rounded-3xl p-6 shadow-2xl space-y-6">
      <div className="flex items-center justify-between border-b border-gray-800 pb-3 flex-wrap gap-2">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <Calendar className="w-4 h-4 text-purple-400" />
          <span>المخطط الزمني للمهام والمراحل التنفيذية (Gantt View)</span>
        </h3>
        <span className="text-xs text-gray-400">تتبع تقدم مراحل الفريق أسبوعياً</span>
      </div>

      <div className="space-y-4">
        {tasks.length === 0 ? (
          <div className="py-12 text-center text-xs text-gray-500">
            لا توجد مهام حالياً في المخطط الزمني
          </div>
        ) : (
          tasks.map((task) => (
            <div
              key={task._id}
              onClick={() => onSelectTask(task)}
              className="p-4 bg-obsidian-surface rounded-2xl border border-gray-800 hover:border-lord-gold/40 cursor-pointer transition-all space-y-2.5"
            >
              <div className="flex items-center justify-between text-xs flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-white">{task.title}</span>
                  <Badge variant="gold">{task.targetPlatform}</Badge>
                  {task.isDailyRecurring && (
                    <span className="px-2 py-0.5 rounded-full bg-purple-500/15 border border-purple-500/30 text-purple-300 text-[10px] font-bold">
                      روتين يومي
                    </span>
                  )}
                </div>
                <span className="font-mono text-lord-gold font-bold">
                  {task.overallProgressPercent || 0}%
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 pt-2">
                {task.stages?.map((st: any) => (
                  <div
                    key={st.stageOrder}
                    className={`p-2 rounded-xl border text-[11px] flex items-center justify-between ${
                      st.status === 'APPROVED'
                        ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                        : st.status === 'IN_PROGRESS'
                        ? 'bg-lord-gold/15 border-lord-gold/30 text-lord-gold'
                        : 'bg-obsidian-card border-gray-800 text-gray-500'
                    }`}
                  >
                    <span>مرحلة {st.stageOrder}</span>
                    <span className="font-mono text-[10px]">
                      {st.status === 'APPROVED'
                        ? 'معتمدة ✓'
                        : st.status === 'IN_PROGRESS'
                        ? 'قيد العمل'
                        : 'مغلقة'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

