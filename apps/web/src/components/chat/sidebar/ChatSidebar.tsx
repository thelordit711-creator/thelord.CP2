'use client';

import React from 'react';
import {
  MessageSquare,
  Hash,
  Plus,
  RefreshCw
} from 'lucide-react';
import { lordToast } from '../../../lib/lordToast';

interface ChatSidebarProps {
  channels: any[];
  allMembers: any[];
  activeChat: {
    type: 'channel' | 'dm';
    id: string;
    name: string;
    memberId?: string;
    role?: string;
    department?: string;
  };
  currentUserId: string;
  currentUserRole: string;
  isConnected: boolean;
  isLoadingRooms: boolean;
  showMobileChatRoom: boolean;
  onSelectChannel: (chan: any) => void;
  onSelectMember: (member: any) => void;
  onOpenCreateChannel: () => void;
  onRefresh: () => void;
}

export const ChatSidebar: React.FC<ChatSidebarProps> = ({
  channels,
  allMembers,
  activeChat,
  currentUserId,
  currentUserRole,
  isConnected,
  isLoadingRooms,
  showMobileChatRoom,
  onSelectChannel,
  onSelectMember,
  onOpenCreateChannel,
  onRefresh
}) => {
  const getRoleArabicLabel = (role: string) => {
    switch (role) {
      case 'SUPER_ADMIN':
        return 'المدير العام 👑';
      case 'FINANCE_MANAGER':
      case 'TREASURY':
        return 'المسؤول المالي 🪙';
      case 'CONTENT_MANAGER':
        return 'مدير المحتوى 🎬';
      case 'SENIOR_ANALYST':
        return 'كبير المحللين 📈';
      case 'JUNIOR_ANALYST':
        return 'محلل فني 📊';
      case 'BOT_DEVELOPER':
        return 'مطور برمجيات 💻';
      case 'COMMUNITY_MANAGER':
        return 'مدير المجتمع 🛡️';
      case 'SUPPORT_AGENT':
        return 'دعم فني 🎧';
      default:
        return 'كادر المنظومة 💼';
    }
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'WORKING':
        return 'bg-emerald-400';
      case 'IN_MEETING':
        return 'bg-amber-400';
      case 'ON_BREAK':
        return 'bg-blue-400';
      case 'OFFLINE':
      default:
        return 'bg-gray-500';
    }
  };

  return (
    <div
      className={`w-full md:w-80 bg-obsidian-card border border-obsidian-border rounded-3xl p-3 sm:p-4 ${
        showMobileChatRoom ? 'hidden md:flex' : 'flex'
      } flex-col justify-between shrink-0 shadow-2xl overflow-hidden`}
    >
      <div className="space-y-4 overflow-y-auto pr-1 pb-10">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-gray-800">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-lord-gold" />
            <h2 className="text-sm font-bold text-white">قنوات التواصل والدردشة</h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                onRefresh();
                lordToast.success('تم تحديث القنوات والأعضاء 🔄');
              }}
              className="text-gray-400 hover:text-lord-gold p-1 rounded-lg transition-colors"
              title="تحديث البيانات"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                isConnected ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]' : 'bg-red-500'
              }`}
              title={isConnected ? 'متصل بالخادم لحظياً' : 'غير متصل بالخادم'}
            />
          </div>
        </div>

        {/* Official Channels List */}
        <div>
          <div className="flex items-center justify-between mb-2 px-2">
            <span className="text-[10px] font-bold text-gray-500 tracking-wider uppercase">
              القنوات الرسمية (#)
            </span>
            {currentUserRole === 'SUPER_ADMIN' && (
              <button
                type="button"
                onClick={onOpenCreateChannel}
                className="text-[11px] text-lord-gold hover:text-amber-300 font-bold flex items-center gap-1 transition-colors"
                title="إنشاء قناة جديدة"
              >
                <Plus className="w-3 h-3" />
                قناة جديدة
              </button>
            )}
          </div>

          <div className="space-y-1">
            {isLoadingRooms ? (
              <div className="text-xs text-gray-500 p-2">جاري تحميل القنوات...</div>
            ) : (
              channels.map((chan) => (
                <button
                  key={chan.id}
                  type="button"
                  onClick={() => onSelectChannel(chan)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-2xl text-xs font-medium transition-all ${
                    activeChat.type === 'channel' && activeChat.id === chan.id
                      ? 'bg-gradient-to-r from-lord-gold/20 to-lord-gold/5 text-lord-gold border border-lord-gold/30 font-bold shadow-md'
                      : 'text-gray-400 hover:text-white hover:bg-obsidian-surface'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <Hash
                      className={`w-4 h-4 shrink-0 ${
                        activeChat.id === chan.id ? 'text-lord-gold' : 'text-gray-500'
                      }`}
                    />
                    <span className="truncate">{chan.name}</span>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Direct Messages List */}
        <div>
          <div className="flex items-center justify-between mb-2 px-2">
            <span className="text-[10px] font-bold text-gray-500 tracking-wider uppercase">
              المحادثات الخاصة (الكادر)
            </span>
            <span className="text-[10px] text-gray-500 font-mono">
              {allMembers.filter((m) => String(m._id) !== String(currentUserId)).length}
            </span>
          </div>

          <div className="space-y-1">
            {isLoadingRooms ? (
              <div className="text-xs text-gray-500 p-2">جاري تحميل الكادر...</div>
            ) : (
              allMembers
                .filter((member) => String(member._id) !== String(currentUserId))
                .map((member) => {
                  const sortedIds = [String(currentUserId), String(member._id)].sort();
                  const dmRoomId = `dm_${sortedIds[0]}_${sortedIds[1]}`;
                  const isSelected = activeChat.type === 'dm' && activeChat.id === dmRoomId;

                  return (
                    <button
                      key={member._id}
                      type="button"
                      onClick={() => onSelectMember(member)}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-2xl text-xs transition-all ${
                        isSelected
                          ? 'bg-gradient-to-r from-lord-gold/20 to-lord-gold/5 text-lord-gold border border-lord-gold/30 font-bold shadow-md'
                          : 'text-gray-400 hover:text-white hover:bg-obsidian-surface'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 truncate">
                        <div className="relative shrink-0">
                          <div className="w-7 h-7 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-[11px] text-lord-gold">
                            {member.avatarUrl ? (
                              <img
                                src={member.avatarUrl}
                                alt=""
                                className="w-full h-full rounded-full object-cover"
                              />
                            ) : (
                              member.fullName?.charAt(0) || 'U'
                            )}
                          </div>
                          <span
                            className={`absolute bottom-0 right-0 w-2 h-2 rounded-full border border-black ${getStatusColor(
                              (member as any).workStatus
                            )}`}
                          />
                        </div>
                        <div className="text-right truncate">
                          <span className="block truncate text-xs">{member.fullName}</span>
                          <span className="text-[9px] text-gray-500 block truncate">
                            {getRoleArabicLabel(member.accessRole)}
                          </span>
                        </div>
                      </div>
                    </button>
                  );
                })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

