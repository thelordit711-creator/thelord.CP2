'use client';

import React, { useRef, useEffect } from 'react';
import {
  MessageSquare,
  Hash,
  Users,
  Video,
  Phone,
  ChevronRight,
  CornerUpLeft,
  Edit2,
  Trash2,
  FileText,
  Check,
  CheckCheck,
  Loader2
} from 'lucide-react';
import { TelegramAudioWaveform } from '../TelegramAudioWaveform';

interface ChatMessageStreamProps {
  activeChat: {
    type: 'channel' | 'dm';
    id: string;
    name: string;
    memberId?: string;
    role?: string;
    department?: string;
  };
  messages: any[];
  isLoadingMessages: boolean;
  currentUserId: string;
  currentUserRole: string;
  onBackMobile: () => void;
  onManageMembers: () => void;
  onStartCall: () => void;
  onNavigateMeeting: () => void;
  onStartReply: (msg: any) => void;
  onStartEdit: (msg: any) => void;
  onDeleteMessage: (msgId: string) => void;
  onPreviewImage: (url: string) => void;
}

export const ChatMessageStream: React.FC<ChatMessageStreamProps> = ({
  activeChat,
  messages,
  isLoadingMessages,
  currentUserId,
  currentUserRole,
  onBackMobile,
  onManageMembers,
  onStartCall,
  onNavigateMeeting,
  onStartReply,
  onStartEdit,
  onDeleteMessage,
  onPreviewImage
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const getRoleArabicLabel = (role?: string) => {
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

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
      {/* Room Top Header */}
      <div className="p-3.5 sm:p-4 bg-obsidian-surface/90 backdrop-blur-md border-b border-obsidian-border flex items-center justify-between z-10 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={onBackMobile}
            className="md:hidden p-2 rounded-xl bg-obsidian-primary text-lord-gold border border-gray-800 hover:bg-obsidian-card transition-colors flex items-center justify-center shrink-0"
            title="الرجوع"
          >
            <ChevronRight className="w-5 h-5" />
          </button>

          <div className="w-10 h-10 rounded-2xl bg-lord-gold/15 border border-lord-gold/30 flex items-center justify-center text-lord-gold shrink-0 shadow-sm">
            {activeChat.type === 'channel' ? <Hash className="w-5 h-5" /> : <Users className="w-5 h-5" />}
          </div>
          <div className="truncate">
            <h3 className="text-sm font-bold text-white flex items-center gap-2 truncate">
              <span className="truncate">{activeChat.name}</span>
              <span className="text-[10px] text-emerald-400 font-mono bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 shrink-0">
                Live
              </span>
            </h3>
            <p className="text-[11px] text-gray-400 truncate">
              {activeChat.type === 'channel'
                ? 'قناة محادثة مشفرة ومحفوظة لحظياً'
                : `محادثة ثنائية مباشرة • ${getRoleArabicLabel(activeChat.role)}`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {activeChat.type === 'channel' && (
            <button
              type="button"
              onClick={onManageMembers}
              className="px-2.5 py-1.5 rounded-xl bg-gradient-to-r from-lord-gold/20 to-lord-gold/5 text-lord-gold hover:text-white hover:border-lord-gold border border-lord-gold/40 transition-all flex items-center gap-1.5 text-xs font-bold shadow-sm"
              title="إدارة وتحديد أعضاء القناة"
            >
              <Users className="w-4 h-4 text-lord-gold" />
              <span className="text-[11px] hidden sm:inline">أعضاء القناة</span>
            </button>
          )}

          {activeChat.type === 'dm' && activeChat.memberId && (
            <button
              type="button"
              onClick={onStartCall}
              className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/30 transition-colors flex items-center gap-1.5 text-xs font-semibold"
              title="إجراء مكالمة صوتية مباشرة"
            >
              <Phone className="w-4 h-4 text-emerald-400" />
              <span className="hidden sm:inline">اتصال صوتي</span>
            </button>
          )}

          <button
            type="button"
            onClick={onNavigateMeeting}
            className="p-2 rounded-xl bg-obsidian-primary text-gray-400 hover:text-lord-gold border border-gray-800 transition-colors flex items-center gap-1.5 text-xs font-semibold"
            title="غرفة البث المركزي"
          >
            <Video className="w-4 h-4 text-rose-500" />
            <span className="hidden sm:inline">غرفة البث</span>
          </button>
        </div>
      </div>

      {/* Messages Feed */}
      <div className="flex-1 p-3.5 sm:p-6 overflow-y-auto space-y-3.5 bg-gradient-to-b from-[#0a0d14] via-[#090b10] to-[#07080c]">
        {isLoadingMessages ? (
          <div className="flex flex-col items-center justify-center h-full space-y-2 text-gray-400">
            <Loader2 className="w-6 h-6 animate-spin text-lord-gold" />
            <span className="text-xs">جاري تحميل المحادثة لحظياً...</span>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center space-y-3 py-16">
            <div className="w-14 h-14 rounded-3xl bg-obsidian-surface border border-gray-800 flex items-center justify-center text-lord-gold shadow-md">
              <MessageSquare className="w-7 h-7" />
            </div>
            <p className="text-sm font-bold text-white">لا توجد رسائل سابقة في هذه المحادثة</p>
            <p className="text-xs text-gray-400 max-w-sm">
              ابدأ المحادثة الآن، يتم تشفير وحفظ الرسائل والموجات الصوتية لحظياً.
            </p>
          </div>
        ) : (
          messages.map((msg: any) => {
            const senderObj = msg.senderId || {};
            const senderId = senderObj._id || senderObj;
            const isSelf = String(senderId) === String(currentUserId);
            const senderName = senderObj.fullName || (isSelf ? 'أنت' : 'عضو');
            const senderRole = senderObj.accessRole || '';
            const timeString = msg.createdAt
              ? new Date(msg.createdAt).toLocaleTimeString('ar-YE', { hour: '2-digit', minute: '2-digit' })
              : '';
            const isRead = Boolean(msg.readBy && msg.readBy.length > 1);

            return (
              <div
                key={msg._id}
                className={`group relative flex items-end gap-2.5 ${isSelf ? 'flex-row-reverse' : 'flex-row'}`}
              >
                {/* Avatar */}
                <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0 font-bold text-[11px] text-lord-gold shadow-sm overflow-hidden mb-1">
                  {senderObj.avatarUrl ? (
                    <img src={senderObj.avatarUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    senderName.charAt(0)
                  )}
                </div>

                {/* Bubble Container */}
                <div className="relative max-w-[85%] sm:max-w-[70%]">
                  {/* Hover Action Bar */}
                  <div
                    className={`absolute top-[-14px] ${
                      isSelf ? 'left-2' : 'right-2'
                    } hidden group-hover:flex items-center gap-1 bg-[#151821] border border-slate-700/80 rounded-full px-2 py-0.5 shadow-xl z-20 transition-all`}
                  >
                    <button
                      type="button"
                      onClick={() => onStartReply(msg)}
                      className="text-gray-400 hover:text-lord-gold p-1 transition-colors"
                      title="رد مقتبس (Quote Reply)"
                    >
                      <CornerUpLeft className="w-3.5 h-3.5" />
                    </button>

                    {isSelf && !msg.isDeleted && (
                      <button
                        type="button"
                        onClick={() => onStartEdit(msg)}
                        className="text-gray-400 hover:text-sky-400 p-1 transition-colors"
                        title="تعديل الرسالة"
                      >
                        <Edit2 className="w-3 h-3" />
                      </button>
                    )}

                    {(isSelf || currentUserRole === 'SUPER_ADMIN') && !msg.isDeleted && (
                      <button
                        type="button"
                        onClick={() => onDeleteMessage(msg._id)}
                        className="text-gray-400 hover:text-rose-400 p-1 transition-colors"
                        title="حذف للجميع"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>

                  {/* Bubble Body */}
                  <div
                    className={`px-4 py-3 rounded-2xl text-xs shadow-xl transition-all ${
                      isSelf
                        ? 'bg-gradient-to-br from-[#1a1711] via-[#14120e] to-[#0c0e14] border border-lord-gold/35 text-amber-50 rounded-tr-xs shadow-[0_4px_25px_rgba(212,175,55,0.06)]'
                        : 'bg-[#121622]/95 border border-slate-800 text-slate-100 rounded-tl-xs'
                    }`}
                  >
                    {activeChat.type === 'channel' && !isSelf && (
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-bold text-lord-gold text-[11px]">{senderName}</span>
                        {senderRole && (
                          <span className="text-[9px] text-slate-400 font-normal">
                            ({getRoleArabicLabel(senderRole)})
                          </span>
                        )}
                      </div>
                    )}

                    {/* Quoted Message Card */}
                    {msg.replyTo && (
                      <div
                        className={`mb-2 pr-2.5 py-1 pl-2 border-r-2 ${
                          isSelf ? 'border-lord-gold bg-lord-gold/10' : 'border-emerald-400 bg-emerald-500/10'
                        } rounded-lg text-[11px] select-none`}
                      >
                        <div className={`font-bold ${isSelf ? 'text-lord-gold' : 'text-emerald-400'} text-[10px]`}>
                          {msg.replyTo.senderName || 'رسالة سابقة'}
                        </div>
                        <div className="text-slate-300 truncate max-w-[240px]">
                          {msg.replyTo.content || 'مرفق أو تسجيل'}
                        </div>
                      </div>
                    )}

                    {msg.isDeleted ? (
                      <div className="flex items-center gap-1.5 text-slate-400 italic py-0.5">
                        <span>🚫</span>
                        <span>تم حذف هذه الرسالة</span>
                      </div>
                    ) : (
                      <>
                        {msg.content && (
                          <p className="leading-relaxed whitespace-pre-wrap break-words text-[13px] text-slate-100">
                            {msg.content}
                          </p>
                        )}

                        {msg.attachments?.map((att: any, idx: number) => {
                          const fileUrl = att.fileUrl || att.url;
                          if (!fileUrl) return null;

                          if (
                            att.fileType === 'VOICE_NOTE' ||
                            att.fileType === 'AUDIO' ||
                            fileUrl.startsWith('data:audio')
                          ) {
                            return (
                              <div key={idx} className="mt-1.5 pt-1">
                                <TelegramAudioWaveform
                                  audioUrl={fileUrl}
                                  duration={att.durationInSeconds}
                                  isSender={isSelf}
                                />
                              </div>
                            );
                          }

                          if (att.fileType === 'IMAGE' || fileUrl.startsWith('data:image')) {
                            return (
                              <div key={idx} className="mt-2">
                                <img
                                  src={fileUrl}
                                  alt={att.fileName || 'صورة'}
                                  className="max-w-xs max-h-64 rounded-xl object-cover border border-white/10 shadow-lg cursor-zoom-in hover:opacity-90 hover:scale-[1.01] transition-all"
                                  onClick={() => onPreviewImage(fileUrl)}
                                  title="انقر لتكبير ومعاينة الصورة"
                                />
                                {att.fileName && (
                                  <span className="text-[10px] text-slate-400 block mt-1">{att.fileName}</span>
                                )}
                              </div>
                            );
                          }

                          return (
                            <div key={idx} className="mt-2">
                              <a
                                href={fileUrl}
                                download={att.fileName || 'file'}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2.5 p-2 rounded-xl bg-black/40 border border-white/10 hover:border-lord-gold transition-colors text-white"
                              >
                                <FileText className="w-5 h-5 text-lord-gold shrink-0" />
                                <div className="truncate text-right">
                                  <span className="text-xs font-bold block truncate">{att.fileName || 'مستند'}</span>
                                  <span className="text-[10px] text-gray-400 font-mono">تحميل الملف 💾</span>
                                </div>
                              </a>
                            </div>
                          );
                        })}
                      </>
                    )}

                    <div className="flex items-center justify-end gap-1.5 mt-1 pt-0.5 text-[10px] text-slate-400 font-mono select-none">
                      {msg.isEdited && !msg.isDeleted && (
                        <span className="text-lord-gold/80 font-sans text-[9px]">(معدّلة)</span>
                      )}
                      <span>{timeString}</span>
                      {isSelf && !msg.isDeleted && (
                        <span title={isRead ? 'تمت القراءة (Read)' : 'تم الإرسال (Sent)'}>
                          {isRead ? (
                            <CheckCheck className="w-3.5 h-3.5 text-sky-400 inline" />
                          ) : (
                            <Check className="w-3.5 h-3.5 text-slate-500 inline" />
                          )}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>
    </div>
  );
};

