'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSocket } from '../../../providers/SocketProvider';
import {
  useGetRoomsAndMembersQuery,
  useGetMessagesQuery,
  useSendMessageMutation,
  useEditMessageMutation,
  useDeleteMessageMutation,
  useMarkRoomAsReadMutation
} from '../../../store/api/chatApi';
import { useGetMeQuery } from '../../../store/api/usersApi';
import { lordToast } from '../../../lib/lordToast';

// Modular Components
import { ChatSidebar } from '../../../components/chat/sidebar/ChatSidebar';
import { ChatMessageStream } from '../../../components/chat/room/ChatMessageStream';
import { ChatInputControls } from '../../../components/chat/room/ChatInputControls';
import { CreateChannelModal } from '../../../components/chat/modals/CreateChannelModal';
import { ManageMembersModal } from '../../../components/chat/modals/ManageMembersModal';
import { AudioCallModal } from '../../../components/chat/AudioCallModal';
import { ImageLightboxModal } from '../../../components/ui/ImageLightboxModal';

function ChatPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialRoomId = searchParams.get('roomId');
  const initialUserId = searchParams.get('userId');
  const handledDeepLinkRef = useRef<string | null>(null);
  const { socket, isConnected } = useSocket();

  // Current User
  const { data: meResponse } = useGetMeQuery();
  const currentUser =
    meResponse?.data ||
    (typeof window !== 'undefined'
      ? JSON.parse(localStorage.getItem('lord_current_user') || '{}')
      : {});
  const currentUserId = currentUser?._id || '';

  // Real MongoDB Rooms & Members
  const { data: roomsData, isLoading: isLoadingRooms, refetch: refetchRooms } =
    useGetRoomsAndMembersQuery();
  const channels = roomsData?.channels || [];
  const allMembers = roomsData?.members || [];

  // Active Chat State
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

  const [showMobileChatRoom, setShowMobileChatRoom] = useState(false);

  // Messages Query & Mutations
  const {
    data: messagesData,
    isLoading: isLoadingMessages,
    refetch: refetchMessages
  } = useGetMessagesQuery(activeChat.id, { skip: !activeChat.id });

  const [sendMessage, { isLoading: isSending }] = useSendMessageMutation();
  const [editMessage] = useEditMessageMutation();
  const [deleteMessage] = useDeleteMessageMutation();
  const [markRoomAsRead] = useMarkRoomAsReadMutation();

  const messages = messagesData || [];

  // Audio Call States
  const [isCallModalOpen, setIsCallModalOpen] = useState(false);
  const [targetCallUser, setTargetCallUser] = useState<{ _id: string; fullName: string } | null>(null);
  const [incomingCallData, setIncomingCallData] = useState<any>(null);

  // Channel Modals States
  const [isCreateChannelModalOpen, setIsCreateChannelModalOpen] = useState(false);
  const [isManageMembersModalOpen, setIsManageMembersModalOpen] = useState(false);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);

  // Message Input & Interaction States
  const [messageInput, setMessageInput] = useState('');
  const [showVoiceRecorder, setShowVoiceRecorder] = useState(false);
  const [selectedAttachment, setSelectedAttachment] = useState<{
    fileUrl: string;
    fileName: string;
    fileType: 'IMAGE' | 'DOCUMENT' | 'ARCHIVE';
    previewUrl?: string;
  } | null>(null);

  const [replyingToMessage, setReplyingToMessage] = useState<{
    _id: string;
    content?: string;
    senderName?: string;
  } | null>(null);

  const [editingMessage, setEditingMessage] = useState<{
    id: string;
    originalContent: string;
  } | null>(null);

  // Mark room read upon opening
  useEffect(() => {
    if (activeChat.id) {
      markRoomAsRead(activeChat.id);
    }
  }, [activeChat.id, markRoomAsRead]);

  // Real-time Socket Event Handling
  useEffect(() => {
    if (!socket) return;

    socket.emit('chat:join', { roomId: activeChat.id });

    const handleNewMessage = (msg: any) => {
      if (msg.roomId === activeChat.id) {
        refetchMessages();
        markRoomAsRead(activeChat.id);
      }
    };

    const handleMessageEdited = (msg: any) => {
      if (msg.roomId === activeChat.id) {
        refetchMessages();
      }
    };

    const handleMessageDeleted = (data: any) => {
      if (data.roomId === activeChat.id) {
        refetchMessages();
      }
    };

    const handleIncomingCall = (callData: any) => {
      if (callData.targetUserId === currentUserId) {
        setIncomingCallData(callData);
        setTargetCallUser({
          _id: callData.callerId,
          fullName: callData.callerName || 'متصل'
        });
        setIsCallModalOpen(true);
      }
    };

    socket.on('chat:message', handleNewMessage);
    socket.on('chat:message_edited', handleMessageEdited);
    socket.on('chat:message_deleted', handleMessageDeleted);
    socket.on('call:incoming', handleIncomingCall);

    return () => {
      socket.emit('chat:leave', { roomId: activeChat.id });
      socket.off('chat:message', handleNewMessage);
      socket.off('chat:message_edited', handleMessageEdited);
      socket.off('chat:message_deleted', handleMessageDeleted);
      socket.off('call:incoming', handleIncomingCall);
    };
  }, [socket, activeChat.id, refetchMessages, markRoomAsRead, currentUserId]);

  const handleSelectChannel = (chan: any) => {
    setActiveChat({
      type: 'channel',
      id: chan.id,
      name: chan.name
    });
    setReplyingToMessage(null);
    setEditingMessage(null);
    setShowMobileChatRoom(true);
  };

  const handleSelectMember = (member: any) => {
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

  useEffect(() => {
    const key = initialRoomId
      ? `room:${initialRoomId}`
      : initialUserId
      ? `user:${initialUserId}`
      : null;
    if (!key || handledDeepLinkRef.current === key) return;

    if (initialRoomId && channels.length > 0) {
      const targetChannel = channels.find(
        (c: any) =>
          String(c.id || c.channelId) === initialRoomId ||
          String(c._id) === initialRoomId
      );
      if (targetChannel) {
        handledDeepLinkRef.current = key;
        handleSelectChannel(targetChannel);
        return;
      }
    }

    if (initialUserId && allMembers.length > 0) {
      const targetMember = allMembers.find(
        (m: any) => String(m._id || m.id) === initialUserId
      );
      if (targetMember) {
        handledDeepLinkRef.current = key;
        handleSelectMember(targetMember);
      }
    }
  }, [initialRoomId, initialUserId, channels, allMembers]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 25 * 1024 * 1024) {
      lordToast.error('الملف كبير جداً', 'أقصى حجم مسموح به هو 25 ميجابايت');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      const isImg = file.type.startsWith('image/');

      setSelectedAttachment({
        fileUrl: result,
        fileName: file.name,
        fileType: isImg ? 'IMAGE' : 'DOCUMENT',
        previewUrl: isImg ? result : undefined
      });

      lordToast.gold('مرفق جاهز', `تم اختيار الملف: ${file.name}`);
    };
    reader.readAsDataURL(file);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageInput.trim() && !selectedAttachment) return;

    // Handle Edit Mode
    if (editingMessage) {
      try {
        await editMessage({
          id: editingMessage.id,
          content: messageInput.trim(),
          chatRoomId: activeChat.id
        }).unwrap();

        lordToast.success('تم تعديل الرسالة بنجاح ✏️');
        setEditingMessage(null);
        setMessageInput('');
      } catch (err: any) {
        lordToast.error('فشل التعديل', err?.data?.error || 'تعذر تعديل الرسالة');
      }
      return;
    }

    // Handle Send Mode
    try {
      const attachmentsToSend = selectedAttachment
        ? [
            {
              fileUrl: selectedAttachment.fileUrl,
              fileName: selectedAttachment.fileName,
              fileType: selectedAttachment.fileType
            }
          ]
        : [];

      await sendMessage({
        chatRoomId: activeChat.id,
        content: messageInput.trim(),
        replyToId: replyingToMessage?._id,
        attachments: attachmentsToSend
      }).unwrap();

      setMessageInput('');
      setSelectedAttachment(null);
      setReplyingToMessage(null);
    } catch (err: any) {
      lordToast.error('فشل الإرسال', err?.data?.error || 'تعذر إرسال الرسالة');
    }
  };

  const handleVoiceCompleted = async ({
    audioBase64,
    durationInSeconds
  }: {
    audioBase64: string;
    durationInSeconds: number;
  }) => {
    setShowVoiceRecorder(false);
    try {
      await sendMessage({
        chatRoomId: activeChat.id,
        content: '',
        attachments: [
          {
            fileUrl: audioBase64,
            fileName: `VoiceNote_${Date.now()}.webm`,
            fileType: 'VOICE_NOTE',
            durationInSeconds
          }
        ]
      }).unwrap();

      lordToast.success('تم إرسال التسجيل الصوتي بنجاح 🎙️');
    } catch (err: any) {
      lordToast.error('فشل إرسال الصوت', err?.data?.error || 'تعذر إرسال التسجيل الصوتي');
    }
  };

  const handleDeleteMsg = async (msgId: string) => {
    if (!window.confirm('هل تريد حذف هذه الرسالة للجميع؟')) return;
    try {
      await deleteMessage({
        id: msgId,
        chatRoomId: activeChat.id
      }).unwrap();
      lordToast.gold('حذف الرسالة', 'تم حذف الرسالة بنجاح 🗑️');
    } catch (err: any) {
      lordToast.error('فشل الحذف', err?.data?.error || 'تعذر حذف الرسالة');
    }
  };

  return (
    <div className="flex-1 max-w-7xl w-full mx-auto p-2 sm:p-4 flex flex-col md:flex-row gap-3 sm:gap-4 h-[calc(100dvh-150px)] md:h-[calc(100vh-105px)] select-none">
      {/* Channels & Team Sidebar */}
      <ChatSidebar
        channels={channels}
        allMembers={allMembers}
        activeChat={activeChat}
        currentUserId={currentUserId}
        currentUserRole={currentUser?.accessRole}
        isConnected={isConnected}
        isLoadingRooms={isLoadingRooms}
        showMobileChatRoom={showMobileChatRoom}
        onSelectChannel={handleSelectChannel}
        onSelectMember={handleSelectMember}
        onOpenCreateChannel={() => setIsCreateChannelModalOpen(true)}
        onRefresh={() => {
          refetchRooms();
          refetchMessages();
        }}
      />

      {/* Active Chat Room Workspace */}
      <div
        className={`flex-1 bg-obsidian-card border border-obsidian-border rounded-3xl ${
          !showMobileChatRoom ? 'hidden md:flex' : 'flex'
        } flex-col justify-between overflow-hidden shadow-2xl relative`}
      >
        <ChatMessageStream
          activeChat={activeChat}
          messages={messages}
          isLoadingMessages={isLoadingMessages}
          currentUserId={currentUserId}
          currentUserRole={currentUser?.accessRole}
          onBackMobile={() => setShowMobileChatRoom(false)}
          onManageMembers={() => setIsManageMembersModalOpen(true)}
          onStartCall={() => {
            setTargetCallUser({
              _id: activeChat.memberId!,
              fullName: activeChat.name
            });
            setIncomingCallData(null);
            setIsCallModalOpen(true);
          }}
          onNavigateMeeting={() => router.push('/meeting')}
          onStartReply={(msg) => {
            setReplyingToMessage({
              _id: msg._id,
              content: msg.content,
              senderName: msg.senderId?.fullName || 'عضو'
            });
          }}
          onStartEdit={(msg) => {
            setEditingMessage({
              id: msg._id,
              originalContent: msg.content || ''
            });
            setMessageInput(msg.content || '');
          }}
          onDeleteMessage={handleDeleteMsg}
          onPreviewImage={setPreviewImageUrl}
        />

        <ChatInputControls
          messageInput={messageInput}
          setMessageInput={setMessageInput}
          isSending={isSending}
          activeChatName={activeChat.name}
          replyingToMessage={replyingToMessage}
          onCancelReply={() => setReplyingToMessage(null)}
          editingMessage={editingMessage}
          onCancelEdit={() => {
            setEditingMessage(null);
            setMessageInput('');
          }}
          selectedAttachment={selectedAttachment}
          onCancelAttachment={() => setSelectedAttachment(null)}
          onFileSelect={handleFileSelect}
          showVoiceRecorder={showVoiceRecorder}
          setShowVoiceRecorder={setShowVoiceRecorder}
          onVoiceRecordingComplete={handleVoiceCompleted}
          onSubmit={handleSendMessage}
        />
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
      <CreateChannelModal
        isOpen={isCreateChannelModalOpen}
        onClose={() => setIsCreateChannelModalOpen(false)}
        allMembers={allMembers}
        onChannelCreated={() => refetchRooms()}
      />

      {/* Channel Members Management Modal */}
      <ManageMembersModal
        channelId={activeChat.type === 'channel' ? activeChat.id : ''}
        channelName={activeChat.name}
        isOpen={isManageMembersModalOpen}
        onClose={() => setIsManageMembersModalOpen(false)}
        currentUserRole={currentUser?.accessRole}
        currentUserId={currentUserId}
        allMembers={allMembers}
      />

      {/* Image Lightbox Modal */}
      {previewImageUrl && (
        <ImageLightboxModal
          imageUrl={previewImageUrl}
          onClose={() => setPreviewImageUrl(null)}
        />
      )}
    </div>
  );
}

export default function ChatPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-obsidian-deep" />}>
      <ChatPageContent />
    </Suspense>
  );
}
