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
  Check,
  CheckCheck,
  Sparkles,
  Phone,
  RefreshCw,
  Loader2,
  Radio,
  X,
  FileText,
  ChevronRight,
  ArrowRight,
  Plus,
  CornerUpLeft,
  Edit2,
  Trash2,
  MoreVertical,
  Volume2
} from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { DirectVoiceRecorder } from '../../../components/voice/DirectVoiceRecorder';
import { AudioCallModal } from '../../../components/chat/AudioCallModal';
import { TelegramAudioWaveform } from '../../../components/chat/TelegramAudioWaveform';
import { ImageLightboxModal } from '../../../components/ui/ImageLightboxModal';
import { useSocket } from '../../../providers/SocketProvider';
import {
  useGetRoomsAndMembersQuery,
  useGetMessagesQuery,
  useSendMessageMutation,
  useEditMessageMutation,
  useDeleteMessageMutation,
  useMarkRoomAsReadMutation,
  useCreateChannelMutation,
  useGetChannelMembersQuery,
  useAddChannelMembersMutation,
  useRemoveChannelMemberMutation
} from '../../../store/api/chatApi';
import { useGetMeQuery } from '../../../store/api/usersApi';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

export default function ChatPage() {
  const router = useRouter();
  const { socket, isConnected } = useSocket();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // 1. Fetch current logged-in user from MongoDB
  const { data: meResponse } = useGetMeQuery();
  const currentUser = meResponse?.data || (typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('lord_current_user') || localStorage.getItem('lord_user_profile') || '{}') : {});
  const currentUserId = currentUser?._id || '';

  // 2. Fetch real channels and real registered employees strictly from MongoDB
  const { data: roomsData, isLoading: isLoadingRooms, refetch: refetchRooms } = useGetRoomsAndMembersQuery();
  const channels = roomsData?.channels || [];
  const allMembers = roomsData?.members || [];

  // 1-to-1 Audio Call States
  const [isCallModalOpen, setIsCallModalOpen] = useState(false);
  const [targetCallUser, setTargetCallUser] = useState<{ _id: string; fullName: string } | null>(null);
  const [incomingCallData, setIncomingCallData] = useState<any>(null);

  // Admin Channel Creation States
  const [isCreateChannelModalOpen, setIsCreateChannelModalOpen] = useState(false);
  const [newChannelName, setNewChannelName] = useState('');
  const [newChannelDesc, setNewChannelDesc] = useState('');
  const [newChannelIsPublic, setNewChannelIsPublic] = useState(true);
  const [newChannelSelectedMembers, setNewChannelSelectedMembers] = useState<string[]>([]);
  const [createChannel, { isLoading: isCreatingChannel }] = useCreateChannelMutation();

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

  // Channel Members Management & Lightbox States
  const [isManageMembersModalOpen, setIsManageMembersModalOpen] = useState(false);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const [selectedUserToAdd, setSelectedUserToAdd] = useState<string>('');

  const { data: channelMembersData, refetch: refetchChannelMembers } = useGetChannelMembersQuery(activeChat.id, {
    skip: activeChat.type !== 'channel' || !activeChat.id
  });
  const [addChannelMembers, { isLoading: isAddingMember }] = useAddChannelMembersMutation();
  const [removeChannelMember, { isLoading: isRemovingMember }] = useRemoveChannelMemberMutation();

  const [showMobileChatRoom, setShowMobileChatRoom] = useState(false);
  const [messageInput, setMessageInput] = useState('');
  const [showVoiceRecorder, setShowVoiceRecorder] = useState(false);
  const [selectedAttachment, setSelectedAttachment] = useState<{
    fileUrl: string;
    fileName: string;
    fileType: 'IMAGE' | 'DOCUMENT' | 'ARCHIVE';
    previewUrl?: string;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Telegram Features States: Quote Reply & Message Edit
  const [replyingToMessage, setReplyingToMessage] = useState<{
    _id: string;
    content?: string;
    senderName?: string;
  } | null>(null);

  const [editingMessage, setEditingMessage] = useState<{
    id: string;
    originalContent: string;
  } | null>(null);

  const [activeMenuMessageId, setActiveMenuMessageId] = useState<string | null>(null);

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
    refetch: refetchMessages
  } = useGetMessagesQuery(activeChat.id, { skip: !activeChat.id });

  const [sendMessageMutation, { isLoading: isSending }] = useSendMessageMutation();
  const [editMessageMutation] = useEditMessageMutation();
  const [deleteMessageMutation] = useDeleteMessageMutation();
  const [markRoomAsRead] = useMarkRoomAsReadMutation();

  // Mark room messages as read on view
  useEffect(() => {
    if (activeChat.id && currentUserId) {
      markRoomAsRead(activeChat.id).catch(() => {});
    }
  }, [activeChat.id, currentUserId, markRoomAsRead, messages.length]);

  // Scroll to bottom when messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // 4. Real-time Socket.io listeners for active room messages, edits, and deletions
  useEffect(() => {
    if (!socket || !activeChat.id) return;

    const eventMessage = `chat:${activeChat.id}:message`;
    const eventUpdated = `chat:${activeChat.id}:message_updated`;
    const eventDeleted = `chat:${activeChat.id}:message_deleted`;
    const eventRead = `chat:${activeChat.id}:read`;

    const handleNewMessage = () => {
      refetchMessages();
      markRoomAsRead(activeChat.id).catch(() => {});
    };

    const handleMessageUpdated = () => {
      refetchMessages();
    };

    const handleMessageDeleted = () => {
      refetchMessages();
    };

    const handleReadReceipt = () => {
      refetchMessages();
    };

    socket.on(eventMessage, handleNewMessage);
    socket.on(eventUpdated, handleMessageUpdated);
    socket.on(eventDeleted, handleMessageDeleted);
    socket.on(eventRead, handleReadReceipt);

    return () => {
      socket.off(eventMessage, handleNewMessage);
      socket.off(eventUpdated, handleMessageUpdated);
      socket.off(eventDeleted, handleMessageDeleted);
      socket.off(eventRead, handleReadReceipt);
    };
  }, [socket, activeChat.id, refetchMessages, markRoomAsRead]);

  // 5. Real-time Socket.io listener for incoming WebRTC audio calls and channel creation
  useEffect(() => {
    if (!socket) return;

    const handleIncomingCall = (data: any) => {
      setIncomingCallData(data);
      setIsCallModalOpen(true);
    };

    const handleChannelCreated = (newCh: any) => {
      refetchRooms();
      toast.info(`📢 تم إنشاء قناة رسمية جديدة: #${newCh.name}`);
    };

    socket.on('call:incoming', handleIncomingCall);
    socket.on('channel:created', handleChannelCreated);

    return () => {
      socket.off('call:incoming', handleIncomingCall);
      socket.off('channel:created', handleChannelCreated);
    };
  }, [socket, refetchRooms]);

  const handleCreateChannelSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChannelName.trim()) {
      toast.error('يرجى إدخال اسم القناة');
      return;
    }
    try {
      await createChannel({
        name: newChannelName.trim(),
        description: newChannelDesc.trim(),
        isPublic: newChannelIsPublic,
        members: newChannelSelectedMembers
      }).unwrap();

      toast.success('تم إنشاء القناة وإتاحتها للأعضاء بنجاح! 🚀');
      setNewChannelName('');
      setNewChannelDesc('');
      setNewChannelSelectedMembers([]);
      setIsCreateChannelModalOpen(false);
      refetchRooms();
    } catch (err: any) {
      toast.error(err?.data?.error || 'حدث خطأ أثناء إنشاء القناة');
    }
  };

  // Handle switching to a direct message thread
  const handleSelectMember = (member: any) => {
    if (!currentUserId) {
      toast.error('يرجى تسجيل الدخول أولاً');
      return;
    }
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
    setReplyingToMessage(null);
    setEditingMessage(null);
    setShowMobileChatRoom(true);
  };

  // Start Quote / Reply
  const handleStartReply = (msg: any) => {
    const senderName = msg.senderId?.fullName || (String(msg.senderId?._id || msg.senderId) === String(currentUserId) ? 'أنت' : 'عضو');
    setReplyingToMessage({
      _id: msg._id,
      content: msg.content || 'مرفق أو تسجيل صوتي',
      senderName
    });
    setEditingMessage(null);
    inputRef.current?.focus();
  };

  // Start Editing Message
  const handleStartEdit = (msg: any) => {
    setEditingMessage({
      id: msg._id,
      originalContent: msg.content || ''
    });
    setMessageInput(msg.content || '');
    setReplyingToMessage(null);
    inputRef.current?.focus();
  };

  // Delete message for everyone
  const handleDeleteMessage = async (messageId: string) => {
    if (!confirm('هل أنت متأكد من حذف هذه الرسالة للجميع؟')) return;
    try {
      await deleteMessageMutation({ id: messageId, chatRoomId: activeChat.id }).unwrap();
      toast.success('تم حذف الرسالة بنجاح 🗑️');
      refetchMessages();
    } catch (err: any) {
      toast.error(err?.data?.error || 'فشل حذف الرسالة');
    }
  };

  const handleAddMemberToActiveChannel = async () => {
    if (!selectedUserToAdd) {
      toast.error('يرجى اختيار عضو لإضافته');
      return;
    }
    try {
      await addChannelMembers({
        channelId: activeChat.id,
        userIds: [selectedUserToAdd]
      }).unwrap();
      toast.success('تمت إضافة العضو إلى القناة بنجاح! 👥');
      setSelectedUserToAdd('');
      refetchChannelMembers();
    } catch (err: any) {
      toast.error(err?.data?.error || 'فشل إضافة العضو');
    }
  };

  const handleRemoveMemberFromActiveChannel = async (userId: string, memberName: string) => {
    if (!confirm(`هل أنت متأكد من إزالة ${memberName} من هذه القناة؟`)) return;
    try {
      await removeChannelMember({
        channelId: activeChat.id,
        userId
      }).unwrap();
      toast.success('تم إزالة العضو من القناة');
      refetchChannelMembers();
    } catch (err: any) {
      toast.error(err?.data?.error || 'فشل إزالة العضو');
    }
  };

  // Handle sending or updating message
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if ((!messageInput.trim() && !selectedAttachment) || isSending) return;

    const textToSend = messageInput.trim();
    const attToSend = selectedAttachment;

    // If currently editing a message
    if (editingMessage) {
      try {
        await editMessageMutation({
          id: editingMessage.id,
          content: textToSend,
          chatRoomId: activeChat.id
        }).unwrap();
        toast.success('تم تعديل الرسالة بنجاح ✏️');
        setEditingMessage(null);
        setMessageInput('');
        refetchMessages();
      } catch (err: any) {
        toast.error(err?.data?.error || 'فشل تعديل الرسالة');
      }
      return;
    }

    setMessageInput('');
    setSelectedAttachment(null);
    const replyIdToSend = replyingToMessage?._id;
    setReplyingToMessage(null);

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
        attachments,
        replyToId: replyIdToSend
      }).unwrap();
      refetchMessages();
    } catch (err: any) {
      toast.error(err?.data?.error || 'فشل إرسال الرسالة إلى قاعدة البيانات');
      setMessageInput(textToSend);
      setSelectedAttachment(attToSend);
    }
  };

  // Handle sending a voice note message
  const handleVoiceCompleted = async (audioData: { blob: Blob; durationInSeconds: number; previewUrl: string }) => {
    try {
      toast.loading('جاري تشفير وحفظ التسجيل الصوتي...', { id: 'voice-upload' });
      const reader = new FileReader();
      reader.readAsDataURL(audioData.blob);
      reader.onloadend = async () => {
        try {
          const base64Audio = reader.result as string;
          await sendMessageMutation({
            chatRoomId: activeChat.id,
            content: '',
            attachments: [
              {
                fileName: `voice_note_${Date.now()}.webm`,
                fileUrl: base64Audio,
                fileType: 'VOICE_NOTE',
                durationInSeconds: Math.round(audioData.durationInSeconds),
                caption: 'تسجيل صوتي'
              }
            ],
            replyToId: replyingToMessage?._id
          }).unwrap();

          setReplyingToMessage(null);
          toast.dismiss('voice-upload');
          toast.success('تم إرسال التسجيل الصوتي بنجاح 🎙️');
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
    <div className="flex-1 max-w-7xl w-full mx-auto p-2 sm:p-4 flex flex-col md:flex-row gap-3 sm:gap-4 h-[calc(100dvh-150px)] md:h-[calc(100vh-105px)] select-none">
      {/* Channels & Team Directory Sidebar */}
      <div className={`w-full md:w-80 bg-obsidian-card border border-obsidian-border rounded-3xl p-3 sm:p-4 ${showMobileChatRoom ? 'hidden md:flex' : 'flex'} flex-col justify-between shrink-0 shadow-2xl overflow-hidden`}>
        <div className="space-y-4 overflow-y-auto pr-1">
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-gray-800">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-amber-400" />
              <h2 className="text-sm font-bold text-white">قنوات التواصل والدردشة</h2>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  refetchRooms();
                  refetchMessages();
                  toast.success('تم تحديث القنوات والأعضاء 🔄');
                }}
                className="text-gray-400 hover:text-amber-400 p-1 rounded-lg transition-colors"
                title="تحديث البيانات"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
              <span
                className={`w-2.5 h-2.5 rounded-full ${isConnected ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]' : 'bg-red-500'}`}
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
              {currentUser?.accessRole === 'SUPER_ADMIN' && (
                <button
                  type="button"
                  onClick={() => setIsCreateChannelModalOpen(true)}
                  className="text-[11px] text-amber-400 hover:text-amber-300 font-bold flex items-center gap-1 transition-colors"
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
                    onClick={() => {
                      setActiveChat({
                        type: 'channel',
                        id: chan.id,
                        name: chan.name
                      });
                      setReplyingToMessage(null);
                      setEditingMessage(null);
                      setShowMobileChatRoom(true);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-2xl text-xs font-medium transition-all ${
                      activeChat.type === 'channel' && activeChat.id === chan.id
                        ? 'bg-gradient-to-r from-amber-500/20 to-amber-500/5 text-amber-400 border border-amber-500/30 font-bold shadow-md'
                        : 'text-gray-400 hover:text-white hover:bg-obsidian-surface'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <Hash className={`w-4 h-4 shrink-0 ${activeChat.id === chan.id ? 'text-amber-400' : 'text-gray-500'}`} />
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
                {allMembers.filter(m => String(m._id) !== String(currentUserId)).length}
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
                        onClick={() => handleSelectMember(member)}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-2xl text-xs transition-all ${
                          isSelected
                            ? 'bg-gradient-to-r from-amber-500/20 to-amber-500/5 text-amber-400 border border-amber-500/30 font-bold shadow-md'
                            : 'text-gray-400 hover:text-white hover:bg-obsidian-surface'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 truncate">
                          <div className="relative shrink-0">
                            <div className="w-7 h-7 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-[11px] text-amber-400">
                              {member.avatarUrl ? (
                                <img src={member.avatarUrl} alt="" className="w-full h-full rounded-full object-cover" />
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

        {/* WebRTC Meeting Box */}
        <div className="p-3 bg-obsidian-surface rounded-2xl border border-gray-800 flex items-center justify-between mt-4">
          <div className="flex items-center gap-2">
            <Radio className="w-4 h-4 text-rose-500 animate-pulse" />
            <span className="text-xs font-bold text-white">غرفة البث الحي</span>
          </div>
          <button
            type="button"
            onClick={() => router.push('/meeting')}
            className="text-[11px] text-amber-400 font-bold hover:underline"
          >
            الانضمام 🎙️
          </button>
        </div>
      </div>

      {/* Active Telegram-Style Chat Workspace */}
      <div className={`flex-1 bg-obsidian-card border border-obsidian-border rounded-3xl ${!showMobileChatRoom ? 'hidden md:flex' : 'flex'} flex-col justify-between overflow-hidden shadow-2xl relative`}>
        {/* Chat Room Header */}
        <div className="p-4 bg-obsidian-surface/90 backdrop-blur-md border-b border-obsidian-border flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setShowMobileChatRoom(false)}
              className="md:hidden p-2 rounded-xl bg-obsidian-primary text-amber-400 border border-gray-800 hover:bg-obsidian-card transition-colors flex items-center justify-center shrink-0"
              title="الرجوع"
            >
              <ChevronRight className="w-5 h-5" />
            </button>

            <div className="w-10 h-10 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0 shadow-sm">
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

          <div className="flex items-center gap-2">
            {activeChat.type === 'channel' && (
              <button
                type="button"
                onClick={() => setIsManageMembersModalOpen(true)}
                className="px-2.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-500/20 to-amber-700/20 text-amber-300 hover:text-white hover:border-amber-400 border border-amber-500/40 transition-all flex items-center gap-1.5 text-xs font-bold shadow-sm"
                title="إدارة وتحديد أعضاء القناة"
              >
                <Users className="w-4 h-4 text-amber-400" />
                <span className="text-[11px]">أعضاء القناة</span>
              </button>
            )}

            {activeChat.type === 'dm' && activeChat.memberId && (
              <button
                type="button"
                onClick={() => {
                  setTargetCallUser({
                    _id: activeChat.memberId!,
                    fullName: activeChat.name
                  });
                  setIncomingCallData(null);
                  setIsCallModalOpen(true);
                }}
                className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/30 transition-colors flex items-center gap-1.5 text-xs font-semibold"
                title="إجراء مكالمة صوتية مباشرة"
              >
                <Phone className="w-4 h-4 text-emerald-400" />
                <span className="hidden sm:inline">اتصال صوتي</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => router.push('/meeting')}
              className="p-2 rounded-xl bg-obsidian-primary text-gray-400 hover:text-amber-400 border border-gray-800 transition-colors flex items-center gap-1.5 text-xs font-semibold"
              title="غرفة البث المركزي"
            >
              <Video className="w-4 h-4 text-rose-500" />
              <span className="hidden sm:inline">غرفة البث</span>
            </button>
          </div>
        </div>

        {/* Telegram Messages Feed */}
        <div
          className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-3.5 bg-gradient-to-b from-[#0a0d14] via-[#090b10] to-[#07080c]"
          onClick={() => setActiveMenuMessageId(null)}
        >
          {isLoadingMessages ? (
            <div className="flex flex-col items-center justify-center h-full space-y-2 text-gray-400">
              <Loader2 className="w-6 h-6 animate-spin text-amber-400" />
              <span className="text-xs">جاري تحميل المحادثة لحظياً...</span>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center space-y-3 py-16">
              <div className="w-14 h-14 rounded-3xl bg-obsidian-surface border border-gray-800 flex items-center justify-center text-amber-400 shadow-md">
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
                  {/* Sender Avatar */}
                  <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0 font-bold text-[11px] text-amber-400 shadow-sm overflow-hidden mb-1">
                    {senderObj.avatarUrl ? (
                      <img src={senderObj.avatarUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      senderName.charAt(0)
                    )}
                  </div>

                  {/* Bubble Container */}
                  <div className="relative max-w-[85%] sm:max-w-[70%]">
                    {/* Hover Action Bar (Quote Reply, Edit, Delete) */}
                    <div
                      className={`absolute top-[-14px] ${
                        isSelf ? 'left-2' : 'right-2'
                      } hidden group-hover:flex items-center gap-1 bg-[#151821] border border-slate-700/80 rounded-full px-2 py-0.5 shadow-xl z-20 transition-all`}
                    >
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleStartReply(msg);
                        }}
                        className="text-gray-400 hover:text-amber-400 p-1 transition-colors"
                        title="رد مقتبس (Quote Reply)"
                      >
                        <CornerUpLeft className="w-3.5 h-3.5" />
                      </button>

                      {isSelf && !msg.isDeleted && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleStartEdit(msg);
                          }}
                          className="text-gray-400 hover:text-sky-400 p-1 transition-colors"
                          title="تعديل الرسالة"
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>
                      )}

                      {(isSelf || currentUser?.accessRole === 'SUPER_ADMIN') && !msg.isDeleted && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteMessage(msg._id);
                          }}
                          className="text-gray-400 hover:text-rose-400 p-1 transition-colors"
                          title="حذف للجميع"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>

                    {/* Obsidian & Royal Gold Telegram Bubble */}
                    <div
                      className={`px-4 py-3 rounded-2xl text-xs shadow-xl transition-all ${
                        isSelf
                          ? 'bg-gradient-to-br from-[#1a1711] via-[#14120e] to-[#0c0e14] border border-amber-500/35 text-amber-50 rounded-tr-xs shadow-[0_4px_25px_rgba(245,158,11,0.06)]'
                          : 'bg-[#121622]/95 border border-slate-800 text-slate-100 rounded-tl-xs'
                      }`}
                    >
                      {/* Sender header in group channels */}
                      {activeChat.type === 'channel' && !isSelf && (
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-bold text-amber-400 text-[11px]">
                            {senderName}
                          </span>
                          {senderRole && (
                            <span className="text-[9px] text-slate-400 font-normal">
                              ({getRoleArabicLabel(senderRole)})
                            </span>
                          )}
                        </div>
                      )}

                      {/* Quoted Message Card (Telegram-Style Quote) */}
                      {msg.replyTo && (
                        <div
                          className={`mb-2 pr-2.5 py-1 pl-2 border-r-2 ${
                            isSelf ? 'border-amber-400 bg-amber-500/10' : 'border-emerald-400 bg-emerald-500/10'
                          } rounded-lg text-[11px] select-none`}
                        >
                          <div className={`font-bold ${isSelf ? 'text-amber-400' : 'text-emerald-400'} text-[10px]`}>
                            {msg.replyTo.senderName || 'رسالة سابقة'}
                          </div>
                          <div className="text-slate-300 truncate max-w-[240px]">
                            {msg.replyTo.content || 'مرفق أو تسجيل'}
                          </div>
                        </div>
                      )}

                      {/* Deleted message indicator */}
                      {msg.isDeleted ? (
                        <div className="flex items-center gap-1.5 text-slate-400 italic py-0.5">
                          <span>🚫</span>
                          <span>تم حذف هذه الرسالة</span>
                        </div>
                      ) : (
                        <>
                          {/* Message Content */}
                          {msg.content && (
                            <p className="leading-relaxed whitespace-pre-wrap break-words text-[13px] text-slate-100">
                              {msg.content}
                            </p>
                          )}

                          {/* Render Attachments (Voice Waveform, Image, Document) */}
                          {msg.attachments?.map((att: any, idx: number) => {
                            const fileUrl = att.fileUrl || att.url;
                            if (!fileUrl) return null;

                            // Embedded Voice Waveform Player
                            if (att.fileType === 'VOICE_NOTE' || att.fileType === 'AUDIO' || fileUrl.startsWith('data:audio')) {
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

                            // Image Attachment
                            if (att.fileType === 'IMAGE' || fileUrl.startsWith('data:image')) {
                              return (
                                <div key={idx} className="mt-2">
                                  <img
                                    src={fileUrl}
                                    alt={att.fileName || 'صورة'}
                                    className="max-w-xs max-h-64 rounded-xl object-cover border border-white/10 shadow-lg cursor-zoom-in hover:opacity-90 hover:scale-[1.01] transition-all"
                                    onClick={() => setPreviewImageUrl(fileUrl)}
                                    title="انقر لتكبير ومعاينة الصورة"
                                  />
                                  {att.fileName && (
                                    <span className="text-[10px] text-slate-400 block mt-1">{att.fileName}</span>
                                  )}
                                </div>
                              );
                            }

                            // Document / Archive File
                            return (
                              <div key={idx} className="mt-2">
                                <a
                                  href={fileUrl}
                                  download={att.fileName || 'file'}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-2.5 p-2 rounded-xl bg-black/40 border border-white/10 hover:border-amber-400 transition-colors text-white"
                                >
                                  <FileText className="w-5 h-5 text-amber-400 shrink-0" />
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

                      {/* Bubble Footer: Timestamp, Edited Tag & Double Blue/Green Checks (Read Receipts) */}
                      <div className="flex items-center justify-end gap-1.5 mt-1 pt-0.5 text-[10px] text-slate-400 font-mono select-none">
                        {msg.isEdited && !msg.isDeleted && (
                          <span className="text-amber-400/80 font-sans text-[9px]">(معدّلة)</span>
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

        {/* Audio Recording Drawer if Active */}
        {showVoiceRecorder && (
          <div className="p-3 bg-obsidian-surface border-t border-gray-800">
            <DirectVoiceRecorder
              onRecordingComplete={handleVoiceCompleted}
              onCancel={() => setShowVoiceRecorder(false)}
            />
          </div>
        )}

        {/* Quote Reply Banner (Telegram-Style) */}
        {replyingToMessage && (
          <div className="p-2.5 bg-[#141824] border-t border-amber-500/40 flex items-center justify-between animate-fadeIn">
            <div className="flex items-center gap-2.5 pr-1 border-r-2 border-amber-400">
              <CornerUpLeft className="w-4 h-4 text-amber-400 shrink-0" />
              <div className="truncate text-right">
                <span className="text-xs font-bold text-amber-400 block truncate">
                  الرد على: {replyingToMessage.senderName}
                </span>
                <span className="text-[11px] text-slate-300 block truncate max-w-md">
                  {replyingToMessage.content}
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setReplyingToMessage(null)}
              className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Editing Message Banner */}
        {editingMessage && (
          <div className="p-2.5 bg-[#141824] border-t border-sky-500/40 flex items-center justify-between animate-fadeIn">
            <div className="flex items-center gap-2.5 pr-1 border-r-2 border-sky-400">
              <Edit2 className="w-4 h-4 text-sky-400 shrink-0" />
              <div className="truncate text-right">
                <span className="text-xs font-bold text-sky-400 block">تعديل الرسالة</span>
                <span className="text-[11px] text-slate-300 block truncate max-w-md">
                  {editingMessage.originalContent}
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setEditingMessage(null);
                setMessageInput('');
              }}
              className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Attachment Preview Banner */}
        {selectedAttachment && (
          <div className="p-2.5 bg-obsidian-surface border-t border-gray-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              {selectedAttachment.previewUrl ? (
                <div className="relative w-12 h-12 rounded-xl overflow-hidden border border-amber-500/50 shadow-md">
                  <img src={selectedAttachment.previewUrl} alt="" className="w-full h-full object-cover" />
                </div>
              ) : (
                <div className="w-12 h-12 rounded-xl bg-obsidian-card border border-amber-500/50 flex items-center justify-center text-amber-400">
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

        {/* Telegram Chat Input Bar */}
        <form
          onSubmit={handleSendMessage}
          className="p-3 bg-obsidian-surface/95 backdrop-blur-md border-t border-obsidian-border flex items-center gap-2"
        >
          {/* Hidden File Input */}
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
            className="p-2.5 rounded-2xl bg-obsidian-card text-gray-400 hover:text-amber-400 border border-gray-800 transition-all hover:scale-105"
            title="إرفاق ملف أو مستند 📎"
          >
            <Paperclip className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="p-2.5 rounded-2xl bg-obsidian-card text-gray-400 hover:text-amber-400 border border-gray-800 transition-all hover:scale-105"
            title="إرفاق صورة 🖼️"
          >
            <ImageIcon className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => setShowVoiceRecorder(!showVoiceRecorder)}
            className={`p-2.5 rounded-2xl border transition-all hover:scale-105 ${
              showVoiceRecorder
                ? 'bg-red-500 text-white border-red-500'
                : 'bg-obsidian-card text-gray-400 hover:text-amber-400 border-gray-800'
            }`}
            title="تسجيل رسالة صوتية 🎙️"
          >
            <Mic className="w-4 h-4" />
          </button>

          <input
            ref={inputRef}
            type="text"
            placeholder={
              editingMessage
                ? 'تعديل محتوى الرسالة...'
                : replyingToMessage
                ? `اكتب رداً على ${replyingToMessage.senderName}...`
                : `اكتب رسالة إلى ${activeChat.name}...`
            }
            value={messageInput}
            onChange={(e) => setMessageInput(e.target.value)}
            disabled={isSending}
            className="flex-1 bg-obsidian-card border border-gray-800 rounded-2xl px-4 py-3 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-amber-400 transition-colors disabled:opacity-50"
          />

          <Button
            type="submit"
            variant="gold"
            size="md"
            className="rounded-2xl shrink-0 shadow-[0_0_15px_rgba(245,158,11,0.3)]"
            disabled={isSending || (!messageInput.trim() && !selectedAttachment)}
          >
            {isSending ? (
              <Loader2 className="w-4 h-4 animate-spin ml-1" />
            ) : editingMessage ? (
              <Check className="w-4 h-4 ml-1" />
            ) : (
              <Send className="w-4 h-4 ml-1" />
            )}
            <span className="hidden sm:inline">{editingMessage ? 'تحديث' : 'إرسال'}</span>
          </Button>
        </form>
      </div>

      {/* 1-to-1 WebRTC Direct Audio Call Modal */}
      {isCallModalOpen && (
        <AudioCallModal
          socket={socket}
          currentUserId={currentUserId}
          currentUserName={currentUser?.fullName || 'أنت'}
          targetUser={targetCallUser}
          incomingCall={incomingCallData}
          onClose={() => {
            setIsCallModalOpen(false);
            setTargetCallUser(null);
            setIncomingCallData(null);
          }}
        />
      )}

      {/* Admin Channel Creation Modal */}
      {isCreateChannelModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fadeIn">
          <div className="w-full max-w-md bg-obsidian-card border border-amber-500/40 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-800">
              <div className="flex items-center gap-2">
                <Hash className="w-5 h-5 text-amber-400" />
                <h3 className="text-base font-bold text-white">إنشاء قناة تواصل جديدة</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateChannelModalOpen(false)}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateChannelSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-gray-300 block mb-1">
                  اسم القناة (مثل: إدارة-المخاطر، تداول-الفيوتشرز)
                </label>
                <input
                  type="text"
                  required
                  value={newChannelName}
                  onChange={(e) => setNewChannelName(e.target.value)}
                  placeholder="اسم القناة..."
                  className="w-full bg-obsidian-surface border border-gray-800 rounded-xl px-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-gray-300 block mb-1">
                  وصف القناة والهدف منها
                </label>
                <textarea
                  value={newChannelDesc}
                  onChange={(e) => setNewChannelDesc(e.target.value)}
                  rows={2}
                  placeholder="وصف مختصر للقناة..."
                  className="w-full bg-obsidian-surface border border-gray-800 rounded-xl px-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="isPublicChan"
                  checked={newChannelIsPublic}
                  onChange={(e) => setNewChannelIsPublic(e.target.checked)}
                  className="rounded border-gray-800 text-amber-500 focus:ring-amber-400"
                />
                <label htmlFor="isPublicChan" className="text-xs text-gray-300 font-medium">
                  قناة عامة (متاحة لجميع موظفي المنظومة)
                </label>
              </div>

              {/* Channel Members Selector */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-gray-300">
                    تحديد أعضاء القناة المدعوين:
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      if (newChannelSelectedMembers.length === allMembers.length) {
                        setNewChannelSelectedMembers([]);
                      } else {
                        setNewChannelSelectedMembers(allMembers.map(m => m._id));
                      }
                    }}
                    className="text-[10px] text-amber-400 hover:underline"
                  >
                    {newChannelSelectedMembers.length === allMembers.length ? 'إلغاء تحديد الكل' : 'تحديد جميع الأعضاء'}
                  </button>
                </div>

                <div className="max-h-36 overflow-y-auto space-y-1.5 p-2 bg-obsidian-surface rounded-xl border border-gray-800">
                  {allMembers.map((member) => {
                    const isChecked = newChannelSelectedMembers.includes(member._id);
                    return (
                      <label
                        key={member._id}
                        className={`flex items-center justify-between p-1.5 rounded-lg text-xs cursor-pointer transition-colors ${
                          isChecked ? 'bg-amber-500/15 text-white' : 'text-gray-400 hover:bg-gray-800'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {
                              if (isChecked) {
                                setNewChannelSelectedMembers(prev => prev.filter(id => id !== member._id));
                              } else {
                                setNewChannelSelectedMembers(prev => [...prev, member._id]);
                              }
                            }}
                            className="rounded border-gray-700 text-amber-500 focus:ring-amber-400"
                          />
                          <span>{member.fullName}</span>
                        </div>
                        <span className="text-[10px] text-gray-500">{member.primaryDepartment || member.accessRole}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="pt-3 border-t border-gray-800 flex justify-end gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsCreateChannelModalOpen(false)}
                >
                  إلغاء
                </Button>
                <Button
                  type="submit"
                  variant="gold"
                  size="sm"
                  disabled={isCreatingChannel}
                  className="rounded-xl shadow-gold-glow font-bold"
                >
                  {isCreatingChannel ? 'جاري الإنشاء...' : 'إنشاء القناة 🚀'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* CHANNEL MEMBERS MANAGEMENT MODAL (POST-CREATION) */}
      {/* ============================================================== */}
      {isManageMembersModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-fadeIn">
          <div className="w-full max-w-lg bg-obsidian-card border border-amber-500/40 rounded-3xl p-6 shadow-2xl space-y-5 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-gray-800">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-amber-400" />
                <h3 className="text-base font-bold text-white">إدارة وتحديد أعضاء القناة (#{activeChat.name})</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsManageMembersModalOpen(false)}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Add New Member Section (Admin Only) */}
            {currentUser?.accessRole === 'SUPER_ADMIN' && (
              <div className="p-3.5 bg-obsidian-surface rounded-2xl border border-gray-800 space-y-2">
                <label className="text-xs font-bold text-amber-400 block">إضافة عضو جديد للقناة:</label>
                <div className="flex items-center gap-2">
                  <select
                    value={selectedUserToAdd}
                    onChange={(e) => setSelectedUserToAdd(e.target.value)}
                    className="flex-1 bg-obsidian-primary border border-gray-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                  >
                    <option value="">اختر موظفاً لإضافته...</option>
                    {allMembers
                      .filter((m) => {
                        const currentMembers = channelMembersData?.data?.members || [];
                        return !currentMembers.some((cm: any) => cm._id === m._id || cm === m._id);
                      })
                      .map((m) => (
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
                    onClick={handleAddMemberToActiveChannel}
                    className="rounded-xl font-bold shrink-0"
                  >
                    {isAddingMember ? 'جاري الإضافة...' : 'إضافة +'}
                  </Button>
                </div>
              </div>
            )}

            {/* Current Members List */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-gray-400 font-bold px-1">
                <span>الأعضاء الحاليون في القناة:</span>
                <span className="font-mono">{channelMembersData?.data?.members?.length || 0} عضو</span>
              </div>

              <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
                {(channelMembersData?.data?.members || []).map((m: any) => {
                  const mId = m._id || m;
                  const isCurrent = String(mId) === String(currentUserId);

                  return (
                    <div
                      key={mId}
                      className="flex items-center justify-between p-2.5 rounded-2xl bg-obsidian-surface border border-gray-800"
                    >
                      <div className="flex items-center gap-2.5 truncate">
                        <div className="w-7 h-7 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-xs text-amber-400 shrink-0">
                          {m.fullName?.charAt(0) || 'U'}
                        </div>
                        <div className="truncate text-right">
                          <span className="text-xs font-bold text-white block truncate">{m.fullName || mId}</span>
                          <span className="text-[10px] text-gray-400 block truncate">
                            {getRoleArabicLabel(m.accessRole)} • {m.primaryDepartment || 'عام'}
                          </span>
                        </div>
                      </div>

                      {!isCurrent && currentUser?.accessRole === 'SUPER_ADMIN' && (
                        <button
                          type="button"
                          disabled={isRemovingMember}
                          onClick={() => handleRemoveMemberFromActiveChannel(mId, m.fullName || 'العضو')}
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
        </div>
      )}

      {/* Global Image Lightbox Modal */}
      {previewImageUrl && (
        <ImageLightboxModal
          imageUrl={previewImageUrl}
          onClose={() => setPreviewImageUrl(null)}
        />
      )}
    </div>
  );
}
