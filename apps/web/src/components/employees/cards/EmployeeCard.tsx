'use client';

import React from 'react';
import {
  FileText,
  MessageSquare,
  PlusCircle,
  Settings2,
  Edit3,
  CheckCircle2,
  Coffee,
  Ban,
  Clock
} from 'lucide-react';
import { Badge } from '../../ui/Badge';

interface EmployeeCardProps {
  emp: any;
  onOpenTodayDetails: (emp: any) => void;
  onOpenQuickContact: (emp: any) => void;
  onOpenAssignTask: (emp: any) => void;
  onOpenDossier: (emp: any) => void;
}

export const EmployeeCard: React.FC<EmployeeCardProps> = ({
  emp,
  onOpenTodayDetails,
  onOpenQuickContact,
  onOpenAssignTask,
  onOpenDossier
}) => {
  // Determine Live Presence
  const isOnline = emp.presenceStatus === 'ONLINE' || emp.workStatus === 'WORKING';
  const isOnBreak = emp.workStatus === 'ON_BREAK';
  const isSuspended = emp.isSuspended;

  return (
    <div className="bg-obsidian-card border border-obsidian-border hover:border-lord-gold/40 rounded-2xl p-4 sm:p-5 shadow-lg transition-all duration-200 text-right flex flex-col justify-between gap-4">
      {/* Top Section: Employee Identity & Live Presence Status */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-lord-gold/20 to-amber-700/20 border border-lord-gold/40 flex items-center justify-center font-bold text-lord-gold text-base shrink-0 shadow-xs">
            {emp.fullName?.charAt(0) || '👤'}
          </div>

          <div className="min-w-0">
            <h3 className="text-sm font-black text-white flex items-center gap-2 truncate">
              <span className="truncate">{emp.fullName}</span>
            </h3>
            <p className="text-[11px] text-gray-400 font-mono truncate">
              {emp.primaryDepartment} • {emp.jobTitles?.[0] || 'كادر معتمد'}
            </p>
          </div>
        </div>

        {/* Live Presence Indicator */}
        <div className="shrink-0">
          {isSuspended ? (
            <span className="px-2.5 py-1 rounded-xl bg-red-500/15 border border-red-500/40 text-red-300 text-[10px] font-black flex items-center gap-1 shadow-xs">
              <Ban className="w-3 h-3 text-red-400" />
              <span>محظور ⛔</span>
            </span>
          ) : isOnline ? (
            <span className="px-2.5 py-1 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-[10px] font-bold flex items-center gap-1.5 shadow-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping inline-block" />
              <span>متصل وقيد العمل ⚡</span>
            </span>
          ) : isOnBreak ? (
            <span className="px-2.5 py-1 rounded-xl bg-amber-500/15 border border-amber-500/40 text-amber-300 text-[10px] font-bold flex items-center gap-1 shadow-xs">
              <Coffee className="w-3 h-3 text-amber-400" />
              <span>في استراحة ☕</span>
            </span>
          ) : (
            <span className="px-2.5 py-1 rounded-xl bg-gray-800/80 border border-gray-700 text-gray-400 text-[10px] font-semibold flex items-center gap-1">
              <Clock className="w-3 h-3 text-gray-500" />
              <span>غير متصل الآن</span>
            </span>
          )}
        </div>
      </div>

      {/* 4 Core Executive Action Buttons */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-gray-800/60">
        {/* 1. Today's Details Button */}
        <button
          type="button"
          onClick={() => onOpenTodayDetails(emp)}
          className="py-2 px-2.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-xs"
          title="عرض المهام المطلوبة اليوم وطلبات الموظف"
        >
          <FileText className="w-3.5 h-3.5 text-amber-400" />
          <span>تفاصيل اليوم 📌</span>
        </button>

        {/* 2. Quick Contact Button */}
        <button
          type="button"
          onClick={() => onOpenQuickContact(emp)}
          className="py-2 px-2.5 rounded-xl bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/30 text-sky-300 text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-xs"
          title="تواصل مباشر عبر الشات أو مكالمة"
        >
          <MessageSquare className="w-3.5 h-3.5 text-sky-400" />
          <span>تواصل 💬</span>
        </button>

        {/* 3. Assign Task Button */}
        <button
          type="button"
          onClick={() => onOpenAssignTask(emp)}
          className="py-2 px-2.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-xs"
          title="إسناد مهمة جديدة للموظف"
        >
          <PlusCircle className="w-3.5 h-3.5 text-emerald-400" />
          <span>إسناد مهمة ⚡</span>
        </button>

        {/* 4. Master Edit Dossier Button */}
        <button
          type="button"
          onClick={() => onOpenDossier(emp)}
          className="py-2 px-2.5 rounded-xl bg-gray-800/80 hover:bg-gray-700/80 border border-gray-700 text-gray-200 text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-xs"
          title="تعديل كافة التفاصيل الإدارية والمالية للموظف"
        >
          <Edit3 className="w-3.5 h-3.5 text-lord-gold" />
          <span>تعديل الملف ⚙️</span>
        </button>
      </div>
    </div>
  );
};
