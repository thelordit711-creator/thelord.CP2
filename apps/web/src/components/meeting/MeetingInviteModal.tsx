'use client';

import React from 'react';
import { AppModalPortal } from '../ui/AppModalPortal';
import { Button } from '../ui/Button';
import { UserPlus, Copy, X } from 'lucide-react';
import { lordToast } from '../../lib/lordToast';

interface MeetingInviteModalProps {
  isOpen: boolean;
  onClose: () => void;
  allEmployees: any[];
  isInviting: boolean;
  onInvite: (employeeId: string, fullName: string) => void;
  meetingLink?: string;
}

export const MeetingInviteModal: React.FC<MeetingInviteModalProps> = ({
  isOpen,
  onClose,
  allEmployees,
  isInviting,
  onInvite,
  meetingLink
}) => {
  const linkToCopy = meetingLink || (typeof window !== 'undefined' ? window.location.href : '/meeting');

  const handleCopyLink = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(linkToCopy);
      lordToast.success('تم نسخ رابط الاجتماع بنجاح 📋');
    }
  };

  return (
    <AppModalPortal isOpen={isOpen} onClose={onClose} maxWidthClassName="max-w-lg">
      <div className="bg-obsidian-surface border-2 border-lord-gold/50 rounded-3xl p-5 sm:p-6 shadow-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-gray-800 pb-3">
          <div className="flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-lord-gold" />
            <h3 className="text-base font-bold text-white">دعوة عضو إلى الاجتماع الحي</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-gray-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-3 bg-obsidian-card rounded-2xl border border-gray-800 flex items-center justify-between text-xs">
          <span className="text-gray-300 font-mono truncate max-w-[280px]">
            {linkToCopy}
          </span>
          <button
            type="button"
            onClick={handleCopyLink}
            className="text-lord-gold font-bold flex items-center gap-1 hover:underline shrink-0 ml-2"
          >
            <Copy className="w-3.5 h-3.5" />
            <span>نسخ الرابط</span>
          </button>
        </div>

        <span className="text-xs font-bold text-gray-400 block">
          اختر عضواً لإرسال إشعار فوري له بالانضمام:
        </span>

        <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
          {allEmployees.map((emp) => (
            <div
              key={emp._id}
              className="p-2.5 rounded-2xl bg-obsidian-card border border-gray-800 flex items-center justify-between text-xs"
            >
              <div className="flex items-center gap-2.5 truncate">
                <span className="w-8 h-8 rounded-xl bg-obsidian-surface border border-gray-700 flex items-center justify-center font-bold text-lord-gold shrink-0">
                  {emp.fullName?.charAt(0) || '👤'}
                </span>
                <div className="truncate text-right">
                  <strong className="text-white block truncate">{emp.fullName}</strong>
                  <span className="text-[10px] text-gray-400 block font-mono">
                    {emp.primaryDepartment || 'عام'} • {emp.accessRole}
                  </span>
                </div>
              </div>

              <Button
                variant="gold"
                size="sm"
                disabled={isInviting}
                onClick={() => onInvite(emp._id, emp.fullName)}
                className="rounded-xl shadow-sm text-xs px-3 py-1"
              >
                دعوة 🔔
              </Button>
            </div>
          ))}
        </div>
      </div>
    </AppModalPortal>
  );
};

