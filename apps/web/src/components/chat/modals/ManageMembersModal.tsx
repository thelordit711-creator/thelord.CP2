'use client';

import React, { useState } from 'react';
import { AppModalPortal } from '../../ui/AppModalPortal';
import { Button } from '../../ui/Button';
import { Users, Trash2, X } from 'lucide-react';
import { lordToast } from '../../../lib/lordToast';
import {
  useGetChannelMembersQuery,
  useAddChannelMembersMutation,
  useRemoveChannelMemberMutation
} from '../../../store/api/chatApi';

interface ManageMembersModalProps {
  channelId: string;
  channelName: string;
  isOpen: boolean;
  onClose: () => void;
  currentUserRole: string;
  currentUserId: string;
  allMembers: any[];
}

export const ManageMembersModal: React.FC<ManageMembersModalProps> = ({
  channelId,
  channelName,
  isOpen,
  onClose,
  currentUserRole,
  currentUserId,
  allMembers
}) => {
  const { data: channelMembersData, refetch } = useGetChannelMembersQuery(channelId, {
    skip: !channelId || !isOpen
  });
  const [addChannelMembers, { isLoading: isAddingMember }] = useAddChannelMembersMutation();
  const [removeChannelMember, { isLoading: isRemovingMember }] = useRemoveChannelMemberMutation();

  const [selectedUserToAdd, setSelectedUserToAdd] = useState<string>('');

  const membersList: any[] = channelMembersData?.data?.members || [];

  const handleAddMember = async () => {
    if (!selectedUserToAdd || !channelId) return;
    try {
      await addChannelMembers({
        channelId,
        userIds: [selectedUserToAdd]
      }).unwrap();

      lordToast.success('تمت إضافة العضو للقناة بنجاح ✅');
      setSelectedUserToAdd('');
      refetch();
    } catch (err: any) {
      lordToast.error('فشل إضافة العضو', err?.data?.error || 'تعذر إضافة العضو للقناة');
    }
  };

  const handleRemoveMember = async (userId: string, memberName: string) => {
    if (!window.confirm(`هل أنت متأكد من إزالة ${memberName} من القناة؟`)) return;
    try {
      await removeChannelMember({
        channelId,
        userId
      }).unwrap();

      lordToast.gold('إدارة القناة', `تمت إزالة ${memberName} من القناة`);
      refetch();
    } catch (err: any) {
      lordToast.error('فشل إزالة العضو', err?.data?.error || 'تعذر إزالة العضو');
    }
  };

  return (
    <AppModalPortal isOpen={isOpen} onClose={onClose} maxWidthClassName="max-w-md">
      <div className="w-full bg-obsidian-card border border-lord-gold/40 rounded-3xl p-6 shadow-2xl space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-gray-800">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-lord-gold" />
            <h3 className="text-base font-bold text-white">إدارة أعضاء القناة (#{channelName})</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {currentUserRole === 'SUPER_ADMIN' && (
          <div className="p-3.5 bg-obsidian-surface rounded-2xl border border-gray-800 space-y-2">
            <label className="text-xs font-bold text-lord-gold block">إضافة عضو جديد للقناة:</label>
            <div className="flex items-center gap-2">
              <select
                value={selectedUserToAdd}
                onChange={(e) => setSelectedUserToAdd(e.target.value)}
                className="flex-1 bg-obsidian-primary border border-gray-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-lord-gold"
              >
                <option value="">اختر موظفاً لإضافته...</option>
                {allMembers
                  .filter((m: any) => !membersList.some((cm: any) => (cm._id || cm) === m._id))
                  .map((m: any) => (
                    <option key={m._id} value={m._id}>
                      {m.fullName} ({m.primaryDepartment || m.accessRole})
                    </option>
                  ))}
              </select>
              <Button
                type="button"
                variant="gold"
                size="sm"
                disabled={isAddingMember || !selectedUserToAdd}
                onClick={handleAddMember}
                className="rounded-xl font-bold shrink-0"
              >
                {isAddingMember ? 'جاري الإضافة...' : 'إضافة +'}
              </Button>
            </div>
          </div>
        )}

        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-gray-400 font-bold px-1">
            <span>الأعضاء الحاليون في القناة:</span>
            <span className="font-mono">{membersList.length} عضو</span>
          </div>

          <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
            {membersList.map((m: any) => {
              const mId = m._id || m;
              const isCurrent = String(mId) === String(currentUserId);

              return (
                <div
                  key={mId}
                  className="flex items-center justify-between p-2.5 rounded-2xl bg-obsidian-surface border border-gray-800"
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <div className="w-7 h-7 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-xs text-lord-gold shrink-0">
                      {m.fullName?.charAt(0) || 'U'}
                    </div>
                    <div className="truncate text-right">
                      <span className="text-xs font-bold text-white block truncate">{m.fullName || mId}</span>
                      <span className="text-[10px] text-gray-400 block truncate">
                        {m.accessRole} • {m.primaryDepartment || 'عام'}
                      </span>
                    </div>
                  </div>

                  {!isCurrent && currentUserRole === 'SUPER_ADMIN' && (
                    <button
                      type="button"
                      disabled={isRemovingMember}
                      onClick={() => handleRemoveMember(mId, m.fullName || 'العضو')}
                      className="p-1.5 rounded-xl hover:bg-red-500/20 text-gray-400 hover:text-red-400 transition-colors"
                      title="إزالة من القناة"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </AppModalPortal>
  );
};
