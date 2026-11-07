'use client';

import React from 'react';
import { Badge } from '../../ui/Badge';
import { Eye, Coins, Repeat } from 'lucide-react';

interface TaskTableViewProps {
  tasks: any[];
  onSelectTask: (task: any) => void;
}

export const TaskTableView: React.FC<TaskTableViewProps> = ({
  tasks,
  onSelectTask
}) => {
  return (
    <div className="bg-obsidian-card border border-obsidian-border rounded-3xl overflow-hidden shadow-2xl">
      <div className="overflow-x-auto">
        <table className="w-full text-right text-xs">
          <thead className="bg-obsidian-surface border-b border-gray-800 text-gray-400 font-semibold">
            <tr>
              <th className="py-3.5 px-4">عنوان المهمة</th>
              <th className="py-3.5 px-4">الموظف المسند إليه</th>
              <th className="py-3.5 px-4">المنصة</th>
              <th className="py-3.5 px-4">الحالة</th>
              <th className="py-3.5 px-4">المراحل الإلزامية</th>
              <th className="py-3.5 px-4">الموعد النهائي</th>
              <th className="py-3.5 px-4">الميزانية</th>
              <th className="py-3.5 px-4">الإجراء</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800/60">
            {tasks.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-12 text-center text-gray-500">
                  لا توجد مهام مطابقة لخيارات التصفية الحالية
                </td>
              </tr>
            ) : (
              tasks.map((task) => (
                <tr
                  key={task._id}
                  onClick={() => onSelectTask(task)}
                  className="hover:bg-obsidian-surface/60 cursor-pointer transition-colors"
                >
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-2">
                      <strong className="text-white font-bold">{task.title}</strong>
                      {task.isDailyRecurring && (
                        <span className="px-2 py-0.5 rounded-full bg-purple-500/15 border border-purple-500/30 text-purple-300 text-[9px] font-bold">
                          روتين يومي
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-gray-400 line-clamp-1">
                      {task.description}
                    </span>
                  </td>
                  <td className="py-3.5 px-4">
                    {task.assignedTo && task.assignedTo.length > 0 ? (
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-lord-gold/20 border border-lord-gold/40 flex items-center justify-center text-lord-gold font-bold text-[10px] shrink-0">
                          {(task.assignedTo[0] as any)?.fullName?.charAt(0) || 'U'}
                        </div>
                        <span className="text-white font-bold">
                          {(task.assignedTo[0] as any)?.fullName}
                        </span>
                      </div>
                    ) : (
                      <span className="text-gray-500 font-mono text-[11px]">
                        غير مسندة
                      </span>
                    )}
                  </td>
                  <td className="py-3.5 px-4">
                    <Badge variant="gold">{task.targetPlatform}</Badge>
                  </td>
                  <td className="py-3.5 px-4">
                    <Badge
                      variant={
                        task.status === 'COMPLETED'
                          ? 'disbursed'
                          : task.status === 'IN_PROGRESS'
                          ? 'cyber'
                          : 'processing'
                      }
                    >
                      {task.status === 'COMPLETED'
                        ? 'مكتملة'
                        : task.status === 'IN_PROGRESS'
                        ? 'قيد التنفيذ'
                        : task.status === 'PENDING_ADMIN_REVIEW'
                        ? 'مراجعة'
                        : task.status}
                    </Badge>
                  </td>
                  <td className="py-3.5 px-4 font-mono font-bold text-gray-300">
                    {task.stages?.length || 0} مراحل
                  </td>
                  <td className="py-3.5 px-4 text-gray-400 font-mono">
                    {task.dueDate
                      ? new Date(task.dueDate).toLocaleDateString('ar-YE', {
                          month: 'numeric',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })
                      : '—'}
                  </td>
                  <td className="py-3.5 px-4">
                    {task.financialRequirement?.requiresBudget ? (
                      <span className="text-lord-gold font-mono font-bold">
                        ${task.financialRequirement.amount} USDT
                      </span>
                    ) : (
                      <span className="text-gray-500 text-[11px]">تشغيلية</span>
                    )}
                  </td>
                  <td className="py-3.5 px-4">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectTask(task);
                      }}
                      className="p-1.5 rounded-lg bg-obsidian-primary hover:bg-lord-gold hover:text-obsidian-primary text-gray-400 transition-colors"
                      title="عرض التفاصيل"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

