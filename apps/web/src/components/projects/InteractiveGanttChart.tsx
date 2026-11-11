'use client';

import React, { useState, useMemo } from 'react';
import { Calendar, Clock, CheckCircle2, ChevronRight, ChevronDown, ExternalLink } from 'lucide-react';

interface GanttProject {
  _id: string;
  title: string;
  code?: string;
  status: string;
  startDate?: string;
  createdAt: string;
  targetEndDate?: string;
  allocatedBudget: number;
  spentBudget: number;
  wbsMilestones?: Array<{
    _id?: string;
    title: string;
    description?: string;
    dueDate?: string;
    isCompleted?: boolean;
    assignedTasks?: any[];
  }>;
}

interface InteractiveGanttChartProps {
  projects: GanttProject[];
  onSelectProject?: (project: GanttProject) => void;
}

export const InteractiveGanttChart: React.FC<InteractiveGanttChartProps> = ({
  projects,
  onSelectProject
}) => {
  const [filter, setFilter] = useState<string>('ALL');
  const [expandedProjects, setExpandedProjects] = useState<Record<string, boolean>>({});

  const toggleExpand = (id: string) => {
    setExpandedProjects((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const filteredProjects = projects.filter((p) => {
    if (filter === 'ALL') return true;
    return p.status === filter;
  });

  // Dynamic timeline window covering all visible projects smoothly
  const { startDate, endDate, now } = useMemo(() => {
    const current = new Date();
    let minTime = current.getTime() - 5 * 86400000;
    let maxTime = current.getTime() + 25 * 86400000;

    filteredProjects.forEach((p) => {
      const pStart = new Date(p.startDate || p.createdAt).getTime();
      const pEnd = p.targetEndDate ? new Date(p.targetEndDate).getTime() : pStart + 14 * 86400000;
      if (!Number.isNaN(pStart)) minTime = Math.min(minTime, pStart - 2 * 86400000);
      if (!Number.isNaN(pEnd)) maxTime = Math.max(maxTime, pEnd + 3 * 86400000);
      (p.wbsMilestones || []).forEach((m) => {
        if (m.dueDate) {
          const mTime = new Date(m.dueDate).getTime();
          if (!Number.isNaN(mTime)) {
            minTime = Math.min(minTime, mTime - 3 * 86400000);
            maxTime = Math.max(maxTime, mTime + 3 * 86400000);
          }
        }
      });
    });

    // Enforce minimum 14-day span so bars remain readable
    if (maxTime - minTime < 14 * 86400000) {
      maxTime = minTime + 14 * 86400000;
    }

    return {
      now: current,
      startDate: new Date(minTime),
      endDate: new Date(maxTime)
    };
  }, [filteredProjects]);

  const getPositionPercent = (dateStr?: string) => {
    if (!dateStr) return 0;
    const target = new Date(dateStr).getTime();
    if (Number.isNaN(target)) return 0;
    const start = startDate.getTime();
    const end = endDate.getTime();
    const pct = ((target - start) / (end - start)) * 100;
    return Math.max(0, Math.min(100, pct));
  };

  return (
    <div className="bg-obsidian-card border border-lord-gold/30 rounded-3xl p-5 md:p-7 shadow-2xl space-y-6">
      {/* Header & Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-800 pb-4">
        <div>
          <h3 className="text-lg font-black text-white flex items-center gap-2">
            <Calendar className="w-5 h-5 text-lord-gold" />
            <span>مخطط جانت التفاعلي لمسارات المشاريع (Interactive Gantt Chart)</span>
          </h3>
          <p className="text-xs text-gray-400 mt-0.5">
            تتبع زمني ديناميكي يمتد حسب تواريخ المشاريع والمعالم — انقر على اسم أي مشروع لفتح خطته وماليته
          </p>
        </div>

        <div className="flex items-center gap-1.5 p-1 bg-obsidian-surface rounded-xl border border-gray-800 text-xs flex-wrap">
          {[
            { id: 'ALL', label: 'كافة المشاريع' },
            { id: 'ACTIVE', label: 'النشطة 🚀' },
            { id: 'PLANNING', label: 'التخطيط 📝' },
            { id: 'COMPLETED', label: 'المكتملة ✅' }
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilter(tab.id)}
              className={`px-3 py-1 rounded-lg font-bold transition-all ${filter === tab.id
                  ? 'bg-lord-gold text-obsidian-primary shadow-gold-glow'
                  : 'text-gray-400 hover:text-white'
                }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {filteredProjects.length === 0 ? (
        <div className="text-center py-12 text-gray-500 text-xs">
          لا توجد مشاريع مسجلة في هذا التصنيف لعرضها على مخطط جانت.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <div className="min-w-[850px] space-y-3">
            {/* Timeline Days Header */}
            <div className="grid grid-cols-12 gap-1 px-4 py-2 rounded-xl bg-obsidian-surface/80 border border-gray-800/80 text-[10px] font-mono text-gray-400">
              <div className="col-span-4 font-bold text-gray-300">المشروع / المعلم (WBS)</div>
              <div className="col-span-8 flex items-center justify-between text-center">
                <span>{startDate.toLocaleDateString('ar-YE', { day: 'numeric', month: 'short' })}</span>
                <span className="text-lord-gold font-bold flex items-center gap-1">
                  <Clock className="w-3 h-3" /> اليوم ({now.toLocaleDateString('ar-YE', { day: 'numeric', month: 'short' })})
                </span>
                <span>{endDate.toLocaleDateString('ar-YE', { day: 'numeric', month: 'short' })}</span>
              </div>
            </div>

            {/* Projects Rows */}
            {filteredProjects.map((proj) => {
              const isExpanded = !!expandedProjects[proj._id];
              const milestones = proj.wbsMilestones || [];
              const completedCount = milestones.filter((m) => m.isCompleted).length;
              const startPct = getPositionPercent(proj.startDate || proj.createdAt);
              const endPct = proj.targetEndDate
                ? getPositionPercent(proj.targetEndDate)
                : Math.min(100, startPct + 35);
              const barWidth = Math.max(8, endPct - startPct);

              return (
                <div
                  key={proj._id}
                  className="p-3 rounded-2xl bg-obsidian-surface/60 border border-gray-800 space-y-2.5 hover:border-lord-gold/40 transition-all"
                >
                  <div className="grid grid-cols-12 gap-2 items-center">
                    <div className="col-span-4 flex items-center gap-2 min-w-0">
                      <button
                        type="button"
                        onClick={() => toggleExpand(proj._id)}
                        aria-label="توسيع معالم المشروع"
                        className="p-1 rounded-lg bg-obsidian-card hover:bg-gray-800 text-lord-gold shrink-0 transition-transform"
                      >
                        {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                      </button>
                      <button
                        type="button"
                        onClick={() => onSelectProject?.(proj)}
                        className="min-w-0 text-right group flex-1"
                      >
                        <h4 className="text-xs font-black text-white group-hover:text-lord-gold truncate flex items-center gap-1.5">
                          <span className="truncate">{proj.title}</span>
                          {proj.code && (
                            <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-lord-gold/15 text-lord-gold shrink-0">
                              {proj.code}
                            </span>
                          )}
                          <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 text-lord-gold shrink-0 transition-opacity" />
                        </h4>
                        <div className="text-[10px] text-gray-400 flex items-center gap-2 mt-0.5 font-mono">
                          <span>${(proj.allocatedBudget || 0).toLocaleString()} USDT</span>
                          <span>•</span>
                          <span>
                            {completedCount}/{milestones.length} معالم منجزة
                          </span>
                        </div>
                      </button>
                    </div>

                    {/* Timeline Bar */}
                    <div className="col-span-8 relative h-7 bg-obsidian-primary rounded-xl border border-gray-800 overflow-hidden flex items-center px-1">
                      <div
                        className="absolute top-0 bottom-0 w-0.5 bg-lord-gold shadow-[0_0_8px_#D4AF37] z-10"
                        style={{ left: `${getPositionPercent(now.toISOString())}%` }}
                        title="اليوم"
                      />

                      <div
                        className={`absolute top-1.5 bottom-1.5 rounded-lg transition-all duration-300 flex items-center px-2 text-[10px] font-bold text-obsidian-primary ${proj.status === 'COMPLETED'
                            ? 'bg-gradient-to-r from-emerald-500 to-emerald-400 shadow-md'
                            : proj.status === 'ACTIVE'
                              ? 'bg-gradient-to-r from-lord-gold via-amber-400 to-yellow-500 shadow-gold-glow'
                              : 'bg-gray-700 text-gray-200'
                          }`}
                        style={{
                          left: `${startPct}%`,
                          width: `${barWidth}%`
                        }}
                      >
                        <span className="truncate">{proj.status}</span>
                      </div>
                    </div>
                  </div>

                  {/* Expanded WBS Milestones */}
                  {isExpanded && milestones.length > 0 && (
                    <div className="pl-6 pt-2 border-t border-gray-800/80 space-y-2 animate-in fade-in duration-200">
                      {milestones.map((m, idx) => {
                        const mDuePct = m.dueDate
                          ? getPositionPercent(m.dueDate)
                          : Math.min(100, startPct + (idx + 1) * 12);
                        const mStartPct = Math.max(0, mDuePct - 12);
                        const mWidth = Math.max(8, mDuePct - mStartPct);
                        const hasTasks = (m.assignedTasks?.length || 0) > 0;

                        return (
                          <div key={m._id || idx} className="grid grid-cols-12 gap-2 items-center text-xs">
                            <div className="col-span-4 flex items-center gap-2 text-gray-300 pl-4 min-w-0">
                              <span className="w-1.5 h-1.5 rounded-full bg-lord-gold shrink-0" />
                              <span className="text-[11px] truncate">{m.title}</span>
                              {m.isCompleted ? (
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                              ) : (
                                <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                              )}
                            </div>

                            <div className="col-span-8 relative h-5 bg-obsidian-primary/60 rounded-lg border border-gray-800/60 flex items-center">
                              <div
                                className={`absolute top-1 bottom-1 rounded-md text-[9px] font-mono px-1.5 flex items-center truncate ${m.isCompleted
                                    ? 'bg-emerald-500/80 text-white font-bold'
                                    : hasTasks
                                      ? 'bg-lord-gold/30 text-lord-gold border border-lord-gold/50'
                                      : 'bg-gray-800 text-gray-400 border border-gray-700'
                                  }`}
                                style={{
                                  left: `${mStartPct}%`,
                                  width: `${mWidth}%`
                                }}
                              >
                                {m.isCompleted ? 'مكتمل' : hasTasks ? 'مهمة جارية' : 'بانتظار التفكيك'}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
