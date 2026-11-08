'use client';

import React from 'react';
import { Radio, Coffee, Clock } from 'lucide-react';
import { Button } from '../ui/Button';
import { AccessRole, WorkStatus } from '@lord/shared-types';

export interface StaffStatusItem {
  _id: string;
  fullName: string;
  email: string;
  accessRole: AccessRole;
  primaryDepartment?: string;
  jobTitles?: string[];
  workStatus?: WorkStatus;
  workStatusUpdatedAt?: string;
  presenceStatus?: string;
  lastActiveAt?: string;
}

interface LiveStaffStatusMonitorProps {
  staffList: StaffStatusItem[];
  loadingStaff: boolean;
  onRefresh: () => void;
  onOpenInviteModal: () => void;
}

export const LiveStaffStatusMonitor: React.FC<LiveStaffStatusMonitorProps> = ({
  staffList,
  loadingStaff,
  onRefresh,
  onOpenInviteModal
}) => {
  const renderWorkStatusBadge = (status?: WorkStatus) => {
    switch (status) {
      case 'WORKING':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse">
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            <span>قيد العمل ⚡</span>
          </span>
        );
      case 'ON_BREAK':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-500/20 text-blue-300 border border-blue-500/40">
            <Coffee className="w-3 h-3 text-blue-300" />
            <span>استراحة ☕</span>
          </span>
        );
      case 'LOGGED_IN':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>تم تسجيل الدخول 🟢</span>
          </span>
        );
      case 'LOGGED_OUT':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-red-500/10 text-red-400 border border-red-500/20">
            <span className="w-2 h-2 rounded-full bg-red-400" />
            <span>تم تسجيل الخروج 🔴</span>
          </span>
        );
    }
  };

  return (
    <div className="bg-obsidian-card border border-lord-gold/30 rounded-3xl p-6 shadow-2xl relative overflow-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-lord-gold/15 text-lord-gold">
            <Radio className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <span>مراقبة الحضور والعمل اللحظي للكادر (Live Staff Monitor)</span>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            </h3>
            <p className="text-xs text-gray-400">
              متابعة مباشرة لحالات الموظفين: تسجيل الدخول، قيد العمل، الاستراحة، وتسجيل الخروج
            </p>
          </div>
        </div>

        <Button variant="ghost" size="sm" onClick={onRefresh} className="text-xs text-lord-gold">
          تحديث القائمة
        </Button>
      </div>

      {loadingStaff ? (
        <div className="py-8 text-center text-xs text-gray-400">جاري تحميل حالات الكادر...</div>
      ) : staffList.length === 0 ? (
        <div className="py-8 text-center text-xs text-gray-500 space-y-2">
          <p>لم يتم تسجيل موظفين بعد.</p>
          <Button variant="gold" size="sm" onClick={onOpenInviteModal}>
            + إرسال أول دعوة انضمام
          </Button>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead>
              <tr className="border-b border-gray-800 text-gray-400 pb-3">
                <th className="pb-3 font-semibold">الموظف</th>
                <th className="pb-3 font-semibold">الدور المعتمد</th>
                <th className="pb-3 font-semibold">القسم</th>
                <th className="pb-3 font-semibold">حالة العمل اللحظية</th>
                <th className="pb-3 font-semibold">آخر نشاط</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/60">
              {staffList.map((emp) => (
                <tr key={emp._id} className="hover:bg-obsidian-surface/60 transition-colors">
                  <td className="py-3.5 pr-1">
                    <div className="font-bold text-white">{emp.fullName}</div>
                    <div className="text-[11px] text-gray-500 font-mono" dir="ltr">{emp.email}</div>
                  </td>
                  <td className="py-3.5">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                        emp.accessRole === 'TREASURY'
                          ? 'bg-amber-500/20 text-amber-300'
                          : 'bg-cyber-blue/20 text-cyber-blue'
                      }`}
                    >
                      {emp.accessRole === 'TREASURY' ? 'أمين الصندوق' : 'موظف'}
                    </span>
                  </td>
                  <td className="py-3.5 text-gray-300">
                    {emp.primaryDepartment || 'عام'}
                  </td>
                  <td className="py-3.5">
                    {renderWorkStatusBadge(emp.workStatus)}
                  </td>
                  <td className="py-3.5 text-gray-400 text-[11px]">
                    {emp.workStatusUpdatedAt ? (
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-gray-500" />
                        <span>{new Date(emp.workStatusUpdatedAt).toLocaleTimeString('ar-YE', { hour: '2-digit', minute: '2-digit' })}</span>
                      </span>
                    ) : (
                      '—'
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
