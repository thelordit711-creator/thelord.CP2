'use client';

import React from 'react';
import { WorkStatus } from '@lord/shared-types';

interface WorkStatusBarProps {
  workStatus: WorkStatus;
  updatingStatus: boolean;
  onStatusChange: (status: WorkStatus) => void;
}

export const WorkStatusBar: React.FC<WorkStatusBarProps> = ({
  workStatus,
  updatingStatus,
  onStatusChange
}) => {
  return (
    <div className="bg-obsidian-card border border-lord-gold/30 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-lg text-right">
      <div className="flex items-center gap-3">
        <div className="w-3 h-3 rounded-full bg-lord-gold animate-ping" />
        <div>
          <span className="text-xs text-gray-400">حالتك الحالية المسجلة لدى الإدارة:</span>
          <div className="text-sm font-bold text-white flex items-center gap-2">
            {workStatus === 'WORKING' && <span className="text-amber-400">⚡ قيد العمل الفعلي</span>}
            {workStatus === 'LOGGED_IN' && <span className="text-emerald-400">🟢 تم تسجيل الدخول (جاهز للمهام)</span>}
            {workStatus === 'ON_BREAK' && <span className="text-blue-400">☕ في فترة استراحة</span>}
            {workStatus === 'LOGGED_OUT' && <span className="text-red-400">🔴 تم تسجيل الخروج</span>}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <button
          type="button"
          disabled={updatingStatus}
          onClick={() => onStatusChange('LOGGED_IN')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
            workStatus === 'LOGGED_IN'
              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500'
              : 'bg-obsidian-surface border-gray-700 text-gray-400 hover:text-white'
          }`}
        >
          🟢 تسجيل الدخول
        </button>

        <button
          type="button"
          disabled={updatingStatus}
          onClick={() => onStatusChange('WORKING')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
            workStatus === 'WORKING'
              ? 'bg-amber-500/20 text-amber-300 border-amber-500 shadow-gold-glow animate-pulse'
              : 'bg-obsidian-surface border-gray-700 text-gray-400 hover:text-white'
          }`}
        >
          ⚡ بدء العمل
        </button>

        <button
          type="button"
          disabled={updatingStatus}
          onClick={() => onStatusChange('ON_BREAK')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
            workStatus === 'ON_BREAK'
              ? 'bg-blue-500/20 text-blue-300 border-blue-500'
              : 'bg-obsidian-surface border-gray-700 text-gray-400 hover:text-white'
          }`}
        >
          ☕ استراحة
        </button>

        <button
          type="button"
          disabled={updatingStatus}
          onClick={() => onStatusChange('LOGGED_OUT')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
            workStatus === 'LOGGED_OUT'
              ? 'bg-red-500/20 text-red-300 border-red-500'
              : 'bg-obsidian-surface border-gray-700 text-gray-400 hover:text-red-400'
          }`}
        >
          🔴 تسجيل الخروج
        </button>
      </div>
    </div>
  );
};
