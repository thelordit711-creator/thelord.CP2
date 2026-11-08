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
              <div className="flex items-center gap-1 shrink-0 bg-black/40 border border-gray-800/80 rounded-xl px-1.5 py-0.5">
                {/* 1. Internal Instant Chat */}
                <button
                  type="button"
                  onClick={() => router.push(`/${locale}/chat?userId=${emp._id}`)}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-lord-gold hover:bg-lord-gold/10 transition-all active:scale-95"
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
                  className="p-1.5 rounded-lg text-gray-400 hover:text-lord-gold hover:bg-lord-gold/10 transition-all active:scale-95"
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
                  className="p-1.5 rounded-lg text-gray-400 hover:text-lord-gold hover:bg-lord-gold/10 transition-all active:scale-95"
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

        {/* Live Presence Status Badge - Discreet Executive Dot Indicator */}
        <div className="shrink-0 self-start">
          {isSuspended ? (
            <span className="px-2.5 py-1 rounded-xl bg-gray-900/90 border border-red-500/30 text-red-400 text-[10px] font-bold flex items-center gap-1.5 shadow-xs">
              <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
              <span>محظور</span>
            </span>
          ) : isOnline ? (
            <span className="px-2.5 py-1 rounded-xl bg-gray-900/90 border border-gray-800 text-gray-300 text-[10px] font-medium flex items-center gap-1.5 shadow-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse inline-block" />
              <span>متصل وقيد العمل</span>
            </span>
          ) : isOnBreak ? (
            <span className="px-2.5 py-1 rounded-xl bg-gray-900/90 border border-gray-800 text-gray-300 text-[10px] font-medium flex items-center gap-1.5 shadow-xs">
              <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
              <span>في استراحة</span>
            </span>
          ) : (
            <span className="px-2.5 py-1 rounded-xl bg-gray-900/60 border border-gray-800/80 text-gray-500 text-[10px] font-medium flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-gray-600 inline-block" />
              <span>غير متصل</span>
            </span>
          )}
        </div>
      </div>

      {/* Core Executive Action Buttons - Unified Formal Styling */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2.5 border-t border-gray-800/80">
        {/* 1. Today's Tasks & Requests Details Button */}
        <button
          type="button"
          onClick={() => onOpenTodayDetails(emp)}
          className="py-2 px-3 rounded-xl bg-[#101522] hover:bg-[#141b2c] border border-gray-800 hover:border-lord-gold/40 text-gray-300 hover:text-lord-gold text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-xs active:scale-95"
          title="عرض المهام والطلبات الخاصة بالموظف لهذا اليوم"
        >
          <FileText className="w-3.5 h-3.5 text-lord-gold" />
          <span>تفاصيل اليوم</span>
        </button>

        {/* 2. Assign Quick Task Button (Primary Golden Accent) */}
        <button
          type="button"
          onClick={() => onOpenAssignTask(emp)}
          className="py-2 px-3 rounded-xl bg-lord-gold text-black hover:bg-lord-gold/90 text-xs font-black flex items-center justify-center gap-1.5 transition-all shadow-sm active:scale-95"
          title="إسناد مهمة جديدة ومباشرة للموظف"
        >
          <PlusCircle className="w-3.5 h-3.5 stroke-[2.5]" />
          <span>إسناد مهمة ⚡</span>
        </button>

        {/* 3. Master Administration Dossier Button */}
        <button
          type="button"
          onClick={() => onOpenDossier(emp)}
          className="py-2 px-3 rounded-xl bg-[#0c1019] hover:bg-[#101522] border border-gray-800 hover:border-gray-700 text-gray-400 hover:text-white text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-xs active:scale-95"
          title="فتح الملف الشامل لتعديل الرواتب والعقود والبدلات والأمان"
        >
          <Edit3 className="w-3.5 h-3.5 text-gray-400" />
          <span>تعديل الملف</span>
        </button>
      </div>
    </div>
  );
};
