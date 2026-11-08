'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
import {
  FileText,
  MessageSquare,
  Video,
  Phone,
  PlusCircle,
  Settings2,
  Edit3,
  Coffee,
  Ban,
  Clock,
  Sparkles
} from 'lucide-react';

interface EmployeeCardProps {
  emp: any;
  onOpenTodayDetails: (emp: any) => void;
  onOpenAssignTask: (emp: any) => void;
  onOpenDossier: (emp: any) => void;
}

export const EmployeeCard: React.FC<EmployeeCardProps> = ({
  emp,
  onOpenTodayDetails,
  onOpenAssignTask,
  onOpenDossier
}) => {
  const router = useRouter();
  const locale = useLocale();

  // Determine Live Presence
  const isOnline = emp.presenceStatus === 'ONLINE' || emp.workStatus === 'WORKING';
  const isOnBreak = emp.workStatus === 'ON_BREAK';
  const isSuspended = emp.isSuspended;

  return (
    <div className="bg-[#0b0e17]/95 border border-gray-800/80 hover:border-lord-gold/50 rounded-2xl p-4 sm:p-5 shadow-xl hover:shadow-[0_8px_30px_rgba(212,175,55,0.08)] transition-all duration-300 text-right flex flex-col justify-between gap-4 group">
      {/* Top Section: Employee Identity + Direct Contact Icons + Live Presence Status */}
      <div className="flex items-start justify-between gap-3 flex-wrap sm:flex-nowrap">
        {/* Identity & Direct Communication Icons */}
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-lord-gold/25 via-amber-800/20 to-gray-900 border border-lord-gold/40 flex items-center justify-center font-black text-lord-gold text-lg shrink-0 shadow-md group-hover:scale-105 transition-transform">
            {emp.fullName?.charAt(0) || '👤'}
          </div>

          <div className="min-w-0 flex flex-col justify-center">
            {/* Name + Direct Contact Icons Row */}
            <div className="flex items-center gap-2.5 flex-wrap">
              <h3 className="text-base font-black text-white tracking-wide truncate group-hover:text-lord-gold transition-colors">
                {emp.fullName}
              </h3>

              {/* Quick Direct Communication Icons (Chat, Video, Call) right next to the name */}
              <div className="flex items-center gap-1 shrink-0 bg-gray-900/95 border border-gray-800 rounded-xl px-1.5 py-0.5 shadow-inner">
                {/* 1. Internal Instant Chat */}
                <button
                  type="button"
                  onClick={() => router.push(`/${locale}/chat?userId=${emp._id}`)}
                  className="p-1.5 rounded-lg hover:bg-sky-500/20 text-sky-400 hover:text-sky-300 transition-all active:scale-95"
                  title={`دردشة فورية مع ${emp.fullName}`}
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                </button>

                {/* 2. Direct Video Meeting & Screen Share (Telegram style) */}
                <button
                  type="button"
                  onClick={() => {
                    window.dispatchEvent(new CustomEvent('lord_start_call', {
                      detail: {
                        targetUser: {
                          _id: emp._id,
                          fullName: emp.fullName,
                          avatarUrl: emp.avatarUrl,
                          primaryDepartment: emp.primaryDepartment
                        },
                        callType: 'video'
                      }
                    }));
                  }}
                  className="p-1.5 rounded-lg hover:bg-emerald-500/20 text-emerald-400 hover:text-emerald-300 transition-all active:scale-95"
                  title={`اتصال فيديو وشاشة مباشر مع ${emp.fullName} (مثل تليجرام)`}
                >
                  <Video className="w-3.5 h-3.5" />
                </button>

                {/* 3. Direct Phone or Audio Call (Telegram style) */}
                <button
                  type="button"
                  onClick={() => {
                    window.dispatchEvent(new CustomEvent('lord_start_call', {
                      detail: {
                        targetUser: {
                          _id: emp._id,
                          fullName: emp.fullName,
                          avatarUrl: emp.avatarUrl,
                          primaryDepartment: emp.primaryDepartment
                        },
                        callType: 'audio'
                      }
                    }));
                  }}
                  className="p-1.5 rounded-lg hover:bg-amber-500/20 text-amber-400 hover:text-amber-300 transition-all active:scale-95"
                  title={`اتصال صوتي مباشر مع ${emp.fullName} (صوت ورنين تليجرام)`}
                >
                  <Phone className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <p className="text-[11px] text-gray-400 font-mono mt-0.5 truncate">
              {emp.primaryDepartment} • {emp.jobTitles?.[0] || 'كادر معتمد'}
            </p>
          </div>
        </div>

        {/* Live Presence Status Badge */}
        <div className="shrink-0 self-start">
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

      {/* Core Executive Action Buttons */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2.5 border-t border-gray-800/80">
        {/* 1. Today's Tasks & Requests Details Button */}
        <button
          type="button"
          onClick={() => onOpenTodayDetails(emp)}
          className="py-2.5 px-3 rounded-xl bg-gradient-to-r from-amber-500/15 to-amber-600/10 hover:from-amber-500/25 hover:to-amber-600/20 border border-amber-500/40 hover:border-amber-400 text-amber-300 text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-xs active:scale-95"
          title="عرض المهام والطلبات الخاصة بالموظف لهذا اليوم"
        >
          <FileText className="w-3.5 h-3.5 text-amber-400" />
          <span>تفاصيل اليوم 📌</span>
        </button>

        {/* 2. Assign Quick Task Button */}
        <button
          type="button"
          onClick={() => onOpenAssignTask(emp)}
          className="py-2.5 px-3 rounded-xl bg-gradient-to-r from-emerald-500/15 to-emerald-600/10 hover:from-emerald-500/25 hover:to-emerald-600/20 border border-emerald-500/40 hover:border-emerald-400 text-emerald-300 text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-xs active:scale-95"
          title="إسناد مهمة جديدة ومباشرة للموظف"
        >
          <PlusCircle className="w-3.5 h-3.5 text-emerald-400" />
          <span>إسناد مهمة ⚡</span>
        </button>

        {/* 3. Master Administration Dossier Button */}
        <button
          type="button"
          onClick={() => onOpenDossier(emp)}
          className="py-2.5 px-3 rounded-xl bg-gray-800/90 hover:bg-gray-700/90 border border-gray-700 hover:border-lord-gold/60 text-gray-200 hover:text-white text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-xs active:scale-95"
          title="فتح الملف الشامل لتعديل الرواتب والعقود والبدلات والأمان"
        >
          <Edit3 className="w-3.5 h-3.5 text-lord-gold" />
          <span>تعديل الملف ⚙️</span>
        </button>
      </div>
    </div>
  );
};
