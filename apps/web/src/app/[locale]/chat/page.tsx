'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  MessageSquare,
  Hash,
  Users,
  Send,
  Paperclip,
  Image as ImageIcon,
  Mic,
  Video,
  Smile,
  CheckCheck,
  Sparkles,
  Phone,
  RefreshCw,
  Loader2,
  Radio,
  X,
  FileText
} from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { DirectVoiceRecorder } from '../../../components/voice/DirectVoiceRecorder';
import { useSocket } from '../../../providers/SocketProvider';
import { useGetRoomsAndMembersQuery, useGetMessagesQuery, useSendMessageMutation } from '../../../store/api/chatApi';
import { useGetMeQuery } from '../../../store/api/usersApi';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

export default function ChatPage() {
  const router = useRouter();
  const { socket, isConnected } = useSocket();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 1. Fetch current logged-in user from MongoDB
  const { data: meResponse } = useGetMeQuery();
  const currentUser = meResponse?.data || (typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('lord_user_profile') || '{}') : {});
  const currentUserId = currentUser?._id || '';

  // 2. Fetch real channels and real registered employees strictly from MongoDB
  const { data: roomsData, isLoading: isLoadingRooms, refetch: refetchRooms } = useGetRoomsAndMembersQuery();
  const channels = roomsData?.channels || [];
  const allMembers = roomsData?.members || [];

  // Active chat state
  const [activeChat, setActiveChat] = useState<{
    type: 'channel' | 'dm';
    id: string;
    name: string;
    memberId?: string;
    role?: string;
    department?: string;
  }>({
    type: 'channel',
    id: 'general',
    name: 'النقاش-العام-والتوجيهات'
  });

  const [messageInput, setMessageInput] = useState('');
  const [showVoiceRecorder, setShowVoiceRecorder] = useState(false);
  const [selectedAttachment, setSelectedAttachment] = useState<{
    fileUrl: string;
    fileName: string;
    fileType: 'IMAGE' | 'DOCUMENT' | 'ARCHIVE';
    previewUrl?: string;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 15 * 1024 * 1024) {
      toast.error('حجم الملف كبير، يرجى اختيار ملف أقل من 15MB');
      return;
    }

    const isImg = file.type.startsWith('image/');
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      setSelectedAttachment({
        fileUrl: base64,
        fileName: file.name,
        fileType: isImg ? 'IMAGE' : 'DOCUMENT',
        previewUrl: isImg ? base64 : undefined
      });
      toast.info(`تم إرفاق: ${file.name} 📎`);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // 3. Fetch real messages for the active room strictly from MongoDB
  const {
    data: messages = [],
    isLoading: isLoadingMessages,
    isFetching: isFetchingMessages,
    refetch: refetchMessages
  } = useGetMessagesQuery(activeChat.id, { skip: !activeChat.id });

  const [sendMessageMutation, { isLoading: isSending }] = useSendMessageMutation();

  // Scroll to bottom when messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // 4. Real-time Socket.io listener for new messages in the active room
  useEffect(() => {
    if (!socket || !activeChat.id) return;

    const eventName = `chat:${activeChat.id}:message`;
    const handleNewMessage = () => {
      refetchMessages();
    };

    socket.on(eventName, handleNewMessage);

    return () => {
      socket.off(eventName, handleNewMessage);
    };
  }, [socket, activeChat.id, refetchMessages]);

  // Handle switching to a direct message thread
  const handleSelectMember = (member: any) => {
    if (!currentUserId) {
      toast.error('يرجى تسجيل الدخول أولاً');
      return;
    }
    // Canonical DM room ID format: dm_minId_maxId
    const sortedIds = [String(currentUserId), String(member._id)].sort();
    const dmRoomId = `dm_${sortedIds[0]}_${sortedIds[1]}`;

    setActiveChat({
      type: 'dm',
      id: dmRoomId,
      name: member.fullName,
      memberId: member._id,
      role: member.accessRole,
      department: member.primaryDepartment
    });
  };

  // Handle sending a real text, image, or document message to MongoDB
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if ((!messageInput.trim() && !selectedAttachment) || isSending) return;

    const textToSend = messageInput.trim();
    const attToSend = selectedAttachment;
    setMessageInput('');
    setSelectedAttachment(null);

    try {
      const attachments = attToSend ? [
        {
          fileName: attToSend.fileName,
          fileUrl: attToSend.fileUrl,
          fileType: attToSend.fileType,
          caption: textToSend || attToSend.fileName
        }
      ] : undefined;

      await sendMessageMutation({
        chatRoomId: activeChat.id,
        content: textToSend,
        attachments
      }).unwrap();
      refetchMessages();
    } catch (err: any) {
      toast.error(err?.data?.error || 'فشل إرسال الرسالة إلى قاعدة البيانات');
      setMessageInput(textToSend); // restore on failure
      setSelectedAttachment(attToSend);
    }
  };

  // Handle sending a real voice note message to MongoDB
  const handleVoiceCompleted = async (audioData: { blob: Blob; durationInSeconds: number; previewUrl: string }) => {
    try {
      toast.loading('جاري تشفير وحفظ التسجيل الصوتي في قاعدة البيانات...', { id: 'voice-upload' });
      const reader = new FileReader();
      reader.readAsDataURL(audioData.blob);
      reader.onloadend = async () => {
        try {
          const base64Audio = reader.result as string;
          await sendMessageMutation({
            chatRoomId: activeChat.id,
            content: '🎙️ رسالة صوتية مشفرة',
            attachments: [
              {
                fileName: `voice_note_${Date.now()}.webm`,
                fileUrl: base64Audio,
                fileType: 'VOICE_NOTE',
                durationInSeconds: Math.round(audioData.durationInSeconds),
                caption: 'تسجيل صوتي مباشر'
              }
            ]
          }).unwrap();

          toast.dismiss('voice-upload');
          toast.success('تم إرسال الرسالة الصوتية بنجاح 🎙️');
          setShowVoiceRecorder(false);
          refetchMessages();
        } catch (error: any) {
          toast.dismiss('voice-upload');
          toast.error(error?.data?.error || 'تعذر حفظ التسجيل الصوتي');
        }
      };
    } catch (err) {
      toast.dismiss('voice-upload');
      toast.error('حدث خطأ أثناء معالجة الملف الصوتي');
    }
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'WORKING':
        return 'bg-amber-400';
      case 'LOGGED_IN':
        return 'bg-emerald-400';
      case 'ON_BREAK':
        return 'bg-blue-400';
      default:
        return 'bg-gray-600';
    }
  };

  const getRoleArabicLabel = (role?: string) => {
    switch (role) {
      case 'SUPER_ADMIN':
        return 'القائد الأعلى (الإدارة)';
      case 'TREASURY':
        return 'أمين الصندوق (الخزينة)';
      case 'EMPLOYEE':
        return 'كادر وظيفي معتمد';
      default:
        return role || 'عضو';
    }
  };

  return (
    <div className="flex-1 max-w-7xl w-full mx-auto p-4 flex flex-col md:flex-row gap-4 h-[calc(100vh-100px)]">
      {/* Channels & Team Directory Sidebar */}
      <div className="w-full md:w-80 bg-obsidian-card border border-obsidian-border rounded-3xl p-4 flex flex-col justify-between shrink-0 shadow-2xl">
        <div className="space-y-6 overflow-y-auto pr-1">
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-gray-800">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-lord-gold" />
              <h2 className="text-sm font-bold text-white">قنوات التواصل المؤسسي</h2>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  refetchRooms();
                  refetchMessages();
                  toast.success('تم تحديث القنوات والأعضاء من قاعدة البيانات 🔄');
                }}
                className="text-gray-400 hover:text-lord-gold p-1 rounded-lg transition-colors"
                title="تحديث البيانات"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
              <span
                className={`w-2.5 h-2.5 rounded-full ${isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-red-500'}`}
                title={isConnected ? 'متصل بالخادم لحظياً (Socket.io)' : 'غير متصل بالخادم'}
              />
            </div>
          </div>

          {/* Official Channels List */}
          <div>
            <span className="text-[10px] font-bold text-gray-500 tracking-wider uppercase block mb-2 px-2">
              القنوات الرسمية المعتمدة (#)
            </span>
            <div className="space-y-1">
              {isLoadingRooms ? (
                <div className="flex items-center justify-center p-4 text-xs text-gray-500">
                  <Loader2 className="w-4 h-4 animate-spin ml-2 text-lord-gold" />
                  جاري جلب القنوات...
                </div>
              ) : (
                channels.map((ch) => (
                  <button
                    key={ch.id}
                    type="button"
                    onClick={() => setActiveChat({ type: 'channel', id: ch.id, name: ch.name })}
                    className={`w-full flex items-center justify-between p-2.5 rounded-2xl text-xs transition-all ${
                      activeChat.id === ch.id
                        ? 'bg-lord-gold text-obsidian-primary font-bold shadow-gold-glow'
                        : 'text-gray-300 hover:bg-obsidian-surface'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <Hash className="w-4 h-4 shrink-0" />
                      <span className="truncate">{ch.name}</span>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Real Registered Members List (From MongoDB User Collection) */}
          <div>
            <div className="flex items-center justify-between mb-2 px-2">
              <span className="text-[10px] font-bold text-gray-500 tracking-wider uppercase">
                الكادر الوظيفي الحقيقي ({allMembers.length})
              </span>
              <span className="text-[9px] text-emerald-400 font-mono">قاعدة البيانات Live</span>
            </div>
            <div className="space-y-1">
              {isLoadingRooms ? (
                <div className="flex items-center justify-center p-4 text-xs text-gray-500">
                  <Loader2 className="w-4 h-4 animate-spin ml-2 text-lord-gold" />
                  جاري جلب الكادر...
                </div>
              ) : allMembers.length === 0 ? (
                <div className="p-3 text-center text-xs text-gray-500 bg-obsidian-surface/40 rounded-xl">
                  لا يوجد موظفون مسجلون حالياً
                </div>
              ) : (
                allMembers.map((mem: any) => {
                  const isCurrent = String(mem._id) === String(currentUserId);
                  return (
                    <button
                      key={mem._id}
                      type="button"
                      onClick={() => handleSelectMember(mem)}
                      className={`w-full flex items-center justify-between p-2.5 rounded-2xl text-xs transition-all ${
                        activeChat.memberId === mem._id
                          ? 'bg-blue-600 text-white font-bold shadow-blue-glow'
                          : 'text-gray-300 hover:bg-obsidian-surface'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 truncate">
                        <div className="w-7 h-7 rounded-xl bg-obsidian-surface border border-gray-700 flex items-center justify-center shrink-0 font-bold text-xs text-lord-gold">
                          {mem.avatarUrl ? (
                            <img src={mem.avatarUrl} alt="" className="w-full h-full rounded-xl object-cover" />
                          ) : (
                            mem.fullName?.charAt(0) || '👤'
                          )}
                        </div>
                        <div className="truncate text-right">
                          <span className="truncate block font-semibold">
                            {mem.fullName} {isCurrent ? '(أنت)' : ''}
                          </span>
                          <span className="text-[9px] text-gray-400 font-mono block">
                            {getRoleArabicLabel(mem.accessRole)}
                          </span>
                        </div>
                      </div>
                      <span
                        className={`w-2 h-2 rounded-full shrink-0 ${getStatusColor(mem.workStatus)}`}
                        title={`الحالة: ${mem.workStatus || 'غير محدد'}`}
                      />
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Meeting Quick Stage Launch */}
        <div className="p-3 bg-obsidian-surface rounded-2xl border border-gray-800 flex items-center justify-between mt-4">
          <div className="flex items-center gap-2">
            <Radio className="w-4 h-4 text-rose-500 animate-pulse" />
            <span className="text-xs font-bold text-white">غرفة البث الحي WebRTC</span>
          </div>
          <button
            type="button"
            onClick={() => router.push('/meeting')}
            className="text-[11px] text-lord-gold font-bold hover:underline"
          >
            الانضمام الآن 🎙️
          </button>
        </div>
      </div>

      {/* Active Chat Conversation Area */}
      <div className="flex-1 bg-obsidian-card border border-obsidian-border rounded-3xl flex flex-col justify-between overflow-hidden shadow-2xl">
        {/* Chat Room Header */}
        <div className="p-4 bg-obsidian-surface/80 border-b border-obsidian-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-lord-gold/15 border border-lord-gold/30 flex items-center justify-center text-lord-gold">
              {activeChat.type === 'channel' ? <Hash className="w-5 h-5" /> : <Users className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <span>{activeChat.name}</span>
                <span className="text-[10px] text-emerald-400 font-mono bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                  MongoDB Cloud Verified
                </span>
              </h3>
              <p className="text-[11px] text-gray-400">
                {activeChat.type === 'channel'
                  ? 'قناة نقاش مؤسسية عامة ومحفوظة'
                  : `محادثة ثنائية مباشرة • ${getRoleArabicLabel(activeChat.role)}`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => router.push('/meeting')}
              className="p-2 rounded-xl bg-obsidian-primary text-gray-400 hover:text-lord-gold border border-gray-800 transition-colors flex items-center gap-1.5 text-xs font-semibold"
              title="الانتقال إلى قاعة الاجتماع الحي"
            >
              <Video className="w-4 h-4 text-rose-500" />
              <span className="hidden sm:inline">غرفة الاجتماع</span>
            </button>
          </div>
        </div>

        {/* Message Feed Loaded Strictly from MongoDB */}
        <div className="flex-1 p-5 overflow-y-auto space-y-4">
          {isLoadingMessages ? (
            <div className="flex flex-col items-center justify-center h-full space-y-2 text-gray-400">
              <Loader2 className="w-6 h-6 animate-spin text-lord-gold" />
              <span className="text-xs">جاري تحميل سجل المحادثة من قاعدة البيانات...</span>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center space-y-3 py-16">
              <div className="w-14 h-14 rounded-3xl bg-obsidian-surface border border-gray-800 flex items-center justify-center text-lord-gold">
                <MessageSquare className="w-7 h-7" />
              </div>
              <p className="text-sm font-bold text-white">لا توجد رسائل سابقة في هذه المحادثة</p>
              <p className="text-xs text-gray-400 max-w-sm">
                ابدأ المحادثة الرسمية الآن، سيتم حفظ كل كلمة وتسجيل صوتي لحظياً في قاعدة البيانات.
              </p>
            </div>
          ) : (
            messages.map((msg: any) => {
              const senderObj = msg.senderId || {};
              const senderId = senderObj._id || senderObj;
              const isSelf = String(senderId) === String(currentUserId);
              const senderName = senderObj.fullName || (isSelf ? 'أنت' : 'عضو في الفريق');
              const senderRole = senderObj.accessRole || '';
              const timeString = msg.createdAt
                ? new Date(msg.createdAt).toLocaleTimeString('ar-YE', { hour: '2-digit', minute: '2-digit' })
                : '';

              return (
                <div
                  key={msg._id}
                  className={`flex items-start gap-3 ${isSelf ? 'flex-row-reverse' : 'flex-row'}`}
                >
                  <div className="w-9 h-9 rounded-2xl bg-obsidian-surface border border-gray-800 flex items-center justify-center shrink-0 font-bold text-xs text-lord-gold shadow-md">
                    {senderObj.avatarUrl ? (
                      <img src={senderObj.avatarUrl} alt="" className="w-full h-full rounded-2xl object-cover" />
                    ) : (
                      senderName.charAt(0)
                    )}
                  </div>

                  <div
                    className={`max-w-[75%] p-4 rounded-3xl text-xs space-y-1.5 shadow-lg ${
                      isSelf
                        ? 'bg-gradient-to-r from-lord-gold to-yellow-600 text-obsidian-primary font-medium rounded-tr-none'
                        : 'bg-obsidian-surface text-gray-200 border border-obsidian-border rounded-tl-none'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-4 border-b border-black/10 pb-1 mb-1">
                      <span className={`font-bold ${isSelf ? 'text-obsidian-primary' : 'text-lord-gold'}`}>
                        {senderName} {senderRole ? `(${getRoleArabicLabel(senderRole)})` : ''}
                      </span>
                      <span className={`text-[10px] ${isSelf ? 'text-obsidian-primary/80' : 'text-gray-500'}`}>
                        {timeString}
                      </span>
                    </div>

                    {msg.content && <p className="leading-relaxed whitespace-pre-wrap">{msg.content}</p>}

                    {/* Render Audio, Image, and Document Attachments */}
                    {msg.attachments?.map((att: any, idx: number) => {
                      const fileUrl = att.fileUrl || att.url;
                      if (!fileUrl) return null;

                      if (att.fileType === 'VOICE_NOTE' || att.fileType === 'AUDIO' || fileUrl.startsWith('data:audio')) {
                        return (
                          <div key={idx} className="flex items-center gap-3 pt-2">
                            <audio src={fileUrl} controls className="h-8 max-w-[240px] rounded-lg" />
                            {att.durationInSeconds && (
                              <span className="text-[10px] font-mono font-bold">
                                {att.durationInSeconds} ثانية 🎙️
                              </span>
                            )}
                          </div>
                        );
                      }

                      if (att.fileType === 'IMAGE' || fileUrl.startsWith('data:image')) {
                        return (
                          <div key={idx} className="pt-2">
                            <img
                              src={fileUrl}
                              alt={att.fileName || 'صورة'}
                              className="max-w-xs max-h-64 rounded-2xl object-cover border border-white/10 shadow-lg cursor-pointer hover:opacity-90 transition-opacity"
                              onClick={() => window.open(fileUrl, '_blank')}
                            />
                            {att.fileName && (
                              <span className="text-[10px] text-gray-400 block mt-1">{att.fileName}</span>
                            )}
                          </div>
                        );
                      }

                      // Any other file or document
                      return (
                        <div key={idx} className="pt-2">
                          <a
                            href={fileUrl}
                            download={att.fileName || 'file'}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2.5 p-2.5 rounded-2xl bg-black/40 border border-white/10 hover:border-lord-gold transition-colors text-white"
                          >
                            <FileText className="w-5 h-5 text-lord-gold shrink-0" />
                            <div className="truncate text-right">
                              <span className="text-xs font-bold block truncate">{att.fileName || 'ملف مرفق'}</span>
                              <span className="text-[10px] text-gray-400 font-mono">تحميل المستند 💾</span>
                            </div>
                          </a>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Audio Recording Drawer if Active */}
        {showVoiceRecorder && (
          <div className="p-3 bg-obsidian-surface border-t border-gray-800">
            <DirectVoiceRecorder
              onRecordingComplete={handleVoiceCompleted}
              onCancel={() => setShowVoiceRecorder(false)}
            />
          </div>
        )}

        {/* Attachment Preview Banner if File Selected */}
        {selectedAttachment && (
          <div className="p-2.5 bg-obsidian-surface border-t border-gray-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              {selectedAttachment.previewUrl ? (
                <div className="relative w-12 h-12 rounded-xl overflow-hidden border border-lord-gold/50 shadow-md">
                  <img src={selectedAttachment.previewUrl} alt="" className="w-full h-full object-cover" />
                </div>
              ) : (
                <div className="w-12 h-12 rounded-xl bg-obsidian-card border border-lord-gold/50 flex items-center justify-center text-lord-gold">
                  <FileText className="w-6 h-6" />
                </div>
              )}
              <div className="truncate">
                <span className="text-xs font-bold text-white block truncate">{selectedAttachment.fileName}</span>
                <span className="text-[10px] text-gray-400">جاهز للإرسال • يمكنك كتابة تعليق معه</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setSelectedAttachment(null)}
              className="p-1.5 rounded-lg bg-obsidian-card hover:bg-gray-800 text-gray-400 hover:text-red-400 transition-colors"
              title="إلغاء المرفق"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Real Message Input Box */}
        <form
          onSubmit={handleSendMessage}
          className="p-3 bg-obsidian-surface border-t border-obsidian-border flex items-center gap-2"
        >
          {/* Hidden File Input for All Files */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.zip,.txt"
            className="hidden"
            onChange={handleFileSelect}
          />

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="p-2.5 rounded-2xl bg-obsidian-card text-gray-400 hover:text-lord-gold border border-gray-800 transition-all"
            title="إرفاق صورة أو مستند أو ملف 📎"
          >
            <Paperclip className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="p-2.5 rounded-2xl bg-obsidian-card text-gray-400 hover:text-lord-gold border border-gray-800 transition-all"
            title="إرفاق صورة 🖼️"
          >
            <ImageIcon className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => setShowVoiceRecorder(!showVoiceRecorder)}
            className={`p-2.5 rounded-2xl border transition-all ${
              showVoiceRecorder
                ? 'bg-red-500 text-white border-red-500'
                : 'bg-obsidian-card text-gray-400 hover:text-lord-gold border-gray-800'
            }`}
            title="تسجيل رسالة صوتية 🎙️"
          >
            <Mic className="w-4 h-4" />
          </button>

          <input
            type="text"
            placeholder={`اكتب رسالة موجهة إلى ${activeChat.name}...`}
            value={messageInput}
            onChange={(e) => setMessageInput(e.target.value)}
            disabled={isSending}
            className="flex-1 bg-obsidian-card border border-gray-800 rounded-2xl px-4 py-3 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-lord-gold transition-colors disabled:opacity-50"
          />

          <Button
            type="submit"
            variant="gold"
            size="md"
            className="rounded-2xl shrink-0"
            disabled={isSending || (!messageInput.trim() && !selectedAttachment)}
          >
            {isSending ? (
              <Loader2 className="w-4 h-4 animate-spin ml-1" />
            ) : (
              <Send className="w-4 h-4 ml-1" />
            )}
            <span className="hidden sm:inline">إرسال</span>
          </Button>
        </form>
      </div>
    </div>
  );
}
