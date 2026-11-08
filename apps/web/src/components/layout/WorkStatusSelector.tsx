'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Coffee, LogOut, CheckCircle2 } from 'lucide-react';
import { WorkStatus } from '@lord/shared-types';

interface WorkStatusSelectorProps {
  workStatus: WorkStatus;
  updatingStatus: boolean;
  onStatusChange: (status: WorkStatus) => void;
}

export const WorkStatusSelector: React.FC<WorkStatusSelectorProps> = ({
  workStatus,
  updatingStatus,
  onStatusChange
}) => {
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowStatusMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getStatusBadge = (status: WorkStatus) => {
    switch (status) {
      case 'WORKING':
        return {
          label: 'قيد العمل ⚡',
          color: 'bg-amber-500/20 text-amber-300 border-amber-500/40 animate-pulse'
        };
      case 'ON_BREAK':
        return {
          label: 'استراحة ☕',
          color: 'bg-blue-500/20 text-blue-300 border-blue-500/40'
        };
      case 'LOGGED_OUT':
        return {
          label: 'تم تسجيل الخروج',
          color: 'bg-red-500/20 text-red-400 border-red-500/40'
        };
      case 'LOGGED_IN':
      default:
        return {
          label: 'تم تسجيل الدخول 🟢',
          color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
        };
    }
  };

  const badge = getStatusBadge(workStatus);

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setShowStatusMenu(!showStatusMenu)}
        disabled={updatingStatus}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all shadow-sm ${badge.color}`}
      >
        <span>{badge.label}</span>
        <ChevronDown className="w-3.5 h-3.5 opacity-70" />
      </button>

      {showStatusMenu && (
        <div className="absolute right-0 sm:left-auto mt-2 w-48 bg-obsidian-card border border-lord-gold/40 rounded-2xl shadow-2xl overflow-hidden z-50 p-1 divide-y divide-gray-800 text-right">
          <div className="p-2 text-[10px] text-gray-400 font-semibold">تغيير حالة العمل اللحظية:</div>
          <div className="py-1">
            <button
              type="button"
              onClick={() => {
                setShowStatusMenu(false);
                onStatusChange('LOGGED_IN');
              }}
              className="w-full text-right px-3 py-2 text-xs text-emerald-400 hover:bg-emerald-500/10 rounded-lg flex items-center justify-between"
            >
              <span>تم تسجيل الدخول</span>
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
            </button>

            <button
              type="button"
              onClick={() => {
                setShowStatusMenu(false);
                onStatusChange('WORKING');
              }}
              className="w-full text-right px-3 py-2 text-xs text-amber-300 hover:bg-amber-500/10 rounded-lg flex items-center justify-between font-bold"
            >
              <span>قيد العمل ⚡</span>
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
            </button>

            <button
              type="button"
              onClick={() => {
                setShowStatusMenu(false);
                onStatusChange('ON_BREAK');
              }}
              className="w-full text-right px-3 py-2 text-xs text-blue-300 hover:bg-blue-500/10 rounded-lg flex items-center justify-between"
            >
              <div className="flex items-center gap-1.5">
                <Coffee className="w-3.5 h-3.5 text-blue-300" />
                <span>استراحة</span>
              </div>
              <span className="w-2 h-2 rounded-full bg-blue-400" />
            </button>
          </div>

          <div className="pt-1">
            <button
              type="button"
              onClick={() => {
                setShowStatusMenu(false);
                onStatusChange('LOGGED_OUT');
              }}
              className="w-full text-right px-3 py-2 text-xs text-red-400 hover:bg-red-500/10 rounded-lg flex items-center justify-between"
            >
              <div className="flex items-center gap-1.5">
                <LogOut className="w-3.5 h-3.5 text-red-400" />
                <span>تسجيل الخروج</span>
              </div>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

