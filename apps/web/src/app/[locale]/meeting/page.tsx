'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Video,
  Mic,
  MicOff,
  VideoOff,
  ScreenShare,
  PhoneOff,
  Users,
  Sparkles,
  Layers,
  Settings,
  Hand,
  CheckCircle,
  FileText,
  RefreshCw,
  Radio,
  Save,
  Maximize2,
  UserPlus,
  Share2,
  Copy,
  Play,
  Check,
  X
} from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { ParticipantsSkeleton } from '../../../components/ui/SkeletonLoaders';
import { VideoPlayerWithNotes } from '../../../components/media/VideoPlayerWithNotes';
import { useSocket } from '../../../providers/SocketProvider';
import {
  useGetActiveMeetingQuery,
  useJoinMeetingMutation,
  useLeaveMeetingMutation,
  useUpdateMeetingNotesMutation,
  useConvertMeetingToTasksMutation,
  useInviteMemberMutation,
  useStartMeetingMutation
} from '../../../store/api/meetingApi';
import { useGetMeQuery, useGetAllEmployeesQuery } from '../../../store/api/usersApi';
import { toast } from 'sonner';
import { lordToast } from '../../../lib/lordToast';
import { MeetingStandbyHub } from '../../../components/meeting/MeetingStandbyHub';
import { MeetingNotesPanel } from '../../../components/meeting/MeetingNotesPanel';
import { MeetingInviteModal } from '../../../components/meeting/MeetingInviteModal';

// WebRTC Remote Video Tile Component
const RemotePeerVideo: React.FC<{ stream: MediaStream; isMuted?: boolean; className?: string }> = ({
  stream,
  isMuted = false,
  className = ''
}) => {
  const vRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (vRef.current && stream) {
      vRef.current.srcObject = stream;
    }
  }, [stream]);

  return <video ref={vRef} autoPlay playsInline muted={isMuted} className={className} />;
};

export default function MeetingPage() {
  const { socket, isConnected } = useSocket();

  // 1. Fetch current logged-in user from MongoDB
  const { data: meResponse } = useGetMeQuery();
  const currentUser = meResponse?.data || (typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('lord_user_profile') || '{}') : {});

  // 2. Fetch real active meeting room strictly from MongoDB
  const {
    data: meetingRoom,
    isLoading: isLoadingMeeting,
    refetch: refetchMeeting
  } = useGetActiveMeetingQuery();

  const [joinMeetingMutation] = useJoinMeetingMutation();
  const [leaveMeetingMutation] = useLeaveMeetingMutation();
  const [updateMeetingNotesMutation, { isLoading: isSavingNotes }] = useUpdateMeetingNotesMutation();
  const [convertMeetingToTasksMutation, { isLoading: isConverting }] = useConvertMeetingToTasksMutation();
  const [inviteMemberMutation, { isLoading: isInviting }] = useInviteMemberMutation();
  const [startMeetingMutation, { isLoading: isStarting }] = useStartMeetingMutation();

  const { data: allEmployeesRes } = useGetAllEmployeesQuery();
  const allEmployees = allEmployeesRes?.data || [];

  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [isLiveActive, setIsLiveActive] = useState(false);

  // Standby vs Active Room State - Starts FALSE so the room is inactive upon opening
  const [isRoomActive, setIsRoomActive] = useState(false);
  const [startWithVideo, setStartWithVideo] = useState(true);
  const [startWithAudio, setStartWithAudio] = useState(true);

  // Hardware Media Stream state
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const screenVideoRef = useRef<HTMLVideoElement>(null);
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isHandRaised, setIsHandRaised] = useState(false);
  const [hasMediaPermission, setHasMediaPermission] = useState<boolean | null>(null);

  // WebRTC P2P Peer Connections & Remote Streams
  const peerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const [remotePeers, setRemotePeers] = useState<Array<{
    socketId: string;
    userId: string;
    fullName: string;
    isHost?: boolean;
    stream: MediaStream;
  }>>([]);

  const [activeTab, setActiveTab] = useState<'meeting' | 'video-review'>('meeting');
  const [meetingNotes, setMeetingNotes] = useState('');
  const [meetingAgenda, setMeetingAgenda] = useState('');

  // Sync state when MongoDB meeting room data loads
  useEffect(() => {
    if (meetingRoom) {
      if (meetingNotes === '' && meetingRoom.meetingNotes) {
        setMeetingNotes(meetingRoom.meetingNotes);
      }
      if (meetingAgenda === '' && meetingRoom.agenda) {
        setMeetingAgenda(meetingRoom.agenda);
      }
    }
  }, [meetingRoom]);

  // Cleanup media tracks when unmounting page
  useEffect(() => {
    return () => {
      if (mediaStream) {
        mediaStream.getTracks().forEach((track) => track.stop());
      }
      if (screenStream) {
        screenStream.getTracks().forEach((track) => track.stop());
      }
      peerConnectionsRef.current.forEach((pc) => pc.close());
      peerConnectionsRef.current.clear();
    };
  }, [mediaStream, screenStream]);

  // Initialize Real Hardware Camera & Microphone ONLY when room is manually activated
  useEffect(() => {
    let activeStream: MediaStream | null = null;

    async function setupLocalMedia() {
      if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
        return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: startWithVideo ? { width: { ideal: 1280 }, height: { ideal: 720 } } : false,
          audio: startWithAudio
        });
        activeStream = stream;
        setMediaStream(stream);
        setHasMediaPermission(true);

        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.warn('Could not acquire camera/microphone stream:', err);
        setHasMediaPermission(false);
      }
    }

    if (isRoomActive && activeTab === 'meeting') {
      setupLocalMedia();
    }

    return () => {
      if (activeStream) {
        activeStream.getTracks().forEach((t) => t.stop());
      }
    };
  }, [isRoomActive, activeTab, startWithVideo, startWithAudio]);

  // Connect local video stream to video element when it becomes available
  useEffect(() => {
    if (localVideoRef.current && mediaStream && !isScreenSharing) {
      localVideoRef.current.srcObject = mediaStream;
    }
  }, [mediaStream, isScreenSharing]);

  // Real-time Socket.io updates for participants and notes
  useEffect(() => {
    if (!socket) return;

    const handleParticipantsUpdate = () => {
      refetchMeeting();
    };

    const handleNotesUpdate = (data: any) => {
      if (data?.meetingNotes !== undefined) {
        setMeetingNotes(data.meetingNotes);
      }
      if (data?.agenda !== undefined) {
        setMeetingAgenda(data.agenda);
      }
    };

    socket.on('meeting:participants-updated', handleParticipantsUpdate);
    socket.on('meeting:notes-updated', handleNotesUpdate);

    return () => {
      socket.off('meeting:participants-updated', handleParticipantsUpdate);
      socket.off('meeting:notes-updated', handleNotesUpdate);
    };
  }, [socket, refetchMeeting]);

  // WebRTC Peer Connection Helper
  const createPeerConnection = (targetSocketId: string, peerInfo?: { userId?: string; fullName?: string; isHost?: boolean }) => {
    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ]
    });

    const activeStream = isScreenSharing && screenStream ? screenStream : mediaStream;
    if (activeStream) {
      activeStream.getTracks().forEach((track) => {
        pc.addTrack(track, activeStream);
      });
    }

    pc.onicecandidate = (event) => {
      if (event.candidate && socket) {
        socket.emit('meeting:signal:candidate', {
          toSocketId: targetSocketId,
          candidate: event.candidate
        });
      }
    };

    pc.ontrack = (event) => {
      const [remoteStream] = event.streams;
      if (remoteStream) {
        setRemotePeers((prev) => {
          const filtered = prev.filter((p) => p.socketId !== targetSocketId);
          return [
            ...filtered,
            {
              socketId: targetSocketId,
              userId: peerInfo?.userId || '',
              fullName: peerInfo?.fullName || 'عضو منضم',
              isHost: peerInfo?.isHost,
              stream: remoteStream
            }
          ];
        });
      }
    };

    peerConnectionsRef.current.set(targetSocketId, pc);
    return pc;
  };

  // WebRTC Signaling Event Listeners - ONLY active when isRoomActive is true
  useEffect(() => {
    if (!isRoomActive || !socket || !currentUser) return;

    socket.emit('meeting:signal:join', {
      userId: currentUser._id,
      fullName: currentUser.fullName,
      isHost: currentUser.accessRole === 'SUPER_ADMIN'
    });

    const handleUserJoined = async (data: { socketId: string; userId: string; fullName: string; isHost?: boolean }) => {
      try {
        const pc = createPeerConnection(data.socketId, data);
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socket.emit('meeting:signal:offer', {
          toSocketId: data.socketId,
          offer,
          isScreen: isScreenSharing,
          fromName: currentUser.fullName
        });
      } catch (err) {
        console.warn('Error creating WebRTC offer:', err);
      }
    };

    const handleOffer = async (data: { fromSocketId: string; offer: any; fromName?: string; isHost?: boolean }) => {
      try {
        let pc = peerConnectionsRef.current.get(data.fromSocketId);
        if (!pc) {
          pc = createPeerConnection(data.fromSocketId, {
            fullName: data.fromName || 'المسؤول',
            isHost: data.isHost !== undefined ? data.isHost : true
          });
        }
        await pc.setRemoteDescription(new RTCSessionDescription(data.offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit('meeting:signal:answer', {
          toSocketId: data.fromSocketId,
          answer
        });
      } catch (err) {
        console.warn('Error handling WebRTC offer:', err);
      }
    };

    const handleAnswer = async (data: { fromSocketId: string; answer: any }) => {
      try {
        const pc = peerConnectionsRef.current.get(data.fromSocketId);
        if (pc) {
          await pc.setRemoteDescription(new RTCSessionDescription(data.answer));
        }
      } catch (err) {
        console.warn('Error handling WebRTC answer:', err);
      }
    };

    const handleCandidate = async (data: { fromSocketId: string; candidate: any }) => {
      try {
        const pc = peerConnectionsRef.current.get(data.fromSocketId);
        if (pc) {
          await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
        }
      } catch (err) {
        console.warn('Error adding ICE candidate:', err);
      }
    };

    const handleUserLeft = (data: { socketId: string }) => {
      const pc = peerConnectionsRef.current.get(data.socketId);
      if (pc) {
        pc.close();
        peerConnectionsRef.current.delete(data.socketId);
      }
      setRemotePeers((prev) => prev.filter((p) => p.socketId !== data.socketId));
    };

    socket.on('meeting:signal:user-joined', handleUserJoined);
    socket.on('meeting:signal:offer', handleOffer);
    socket.on('meeting:signal:answer', handleAnswer);
    socket.on('meeting:signal:candidate', handleCandidate);
    socket.on('meeting:signal:user-left', handleUserLeft);

    return () => {
      socket.off('meeting:signal:user-joined', handleUserJoined);
      socket.off('meeting:signal:offer', handleOffer);
      socket.off('meeting:signal:answer', handleAnswer);
      socket.off('meeting:signal:candidate', handleCandidate);
      socket.off('meeting:signal:user-left', handleUserLeft);
    };
  }, [isRoomActive, socket, currentUser, mediaStream, screenStream, isScreenSharing]);

  // Toggle Microphone
  const toggleAudio = () => {
    if (mediaStream) {
      const audioTracks = mediaStream.getAudioTracks();
      audioTracks.forEach((track) => {
        track.enabled = !track.enabled;
      });
      setIsAudioMuted(!isAudioMuted);
      toast.info(!isAudioMuted ? 'تم كتم الميكروفون' : 'تم تفعيل الميكروفون');
    } else {
      setIsAudioMuted(!isAudioMuted);
    }
  };

  // Toggle Camera
  const toggleVideo = () => {
    if (mediaStream) {
      const videoTracks = mediaStream.getVideoTracks();
      videoTracks.forEach((track) => {
        track.enabled = !track.enabled;
      });
      setIsVideoOff(!isVideoOff);
      toast.info(!isVideoOff ? 'تم إيقاف الكاميرا' : 'تم تشغيل الكاميرا');
    } else {
      setIsVideoOff(!isVideoOff);
    }
  };

  // Toggle Screen Sharing via navigator.mediaDevices.getDisplayMedia
  const toggleScreenShare = async () => {
    if (!isScreenSharing) {
      try {
        if (!navigator.mediaDevices?.getDisplayMedia) {
          toast.error('متصفحك لا يدعم مشاركة الشاشة المباشرة');
          return;
        }

        const displayStream = await navigator.mediaDevices.getDisplayMedia({
          video: true
        });

        setScreenStream(displayStream);
        setIsScreenSharing(true);

        if (screenVideoRef.current) {
          screenVideoRef.current.srcObject = displayStream;
        }

        displayStream.getVideoTracks()[0].onended = () => {
          setIsScreenSharing(false);
          displayStream.getTracks().forEach((t) => t.stop());
          setScreenStream(null);
          toast.info('تم إنهاء مشاركة الشاشة');
        };

        toast.success('تم تفعيل بث مشاركة الشاشة المباشرة');
      } catch (err) {
        console.warn('Screen share cancelled or failed:', err);
      }
    } else {
      if (screenStream) {
        screenStream.getTracks().forEach((t) => t.stop());
        setScreenStream(null);
      }
      setIsScreenSharing(false);
      toast.info('تم إيقاف مشاركة الشاشة');
    }
  };

  // Save Notes to MongoDB
  const handleSaveNotes = async () => {
    try {
      await updateMeetingNotesMutation({
        meetingNotes,
        agenda: meetingAgenda
      }).unwrap();
      toast.success('تم حفظ محضر الاجتماع والأجندة في قاعدة البيانات بنجاح 💾');
    } catch (err: any) {
      toast.error(err?.data?.error || 'فشل حفظ محضر الاجتماع');
    }
  };

  // Convert Meeting Notes to Real Tasks in MongoDB
  const handleConvertMeetingToTasks = async () => {
    if (!meetingNotes.trim()) {
      toast.error('يرجى كتابة محضر أو قرارات في الملاحظات أولاً');
      return;
    }

    try {
      toast.loading('TheLordAI يقوم بتحليل المحضر وبناء المهام بمراحلها...', { id: 'convert-tasks' });
      const res = await convertMeetingToTasksMutation({ notes: meetingNotes }).unwrap();
      toast.dismiss('convert-tasks');
      toast.success(res.message || 'تم تحويل المحضر إلى مهام حقيقية معتمدة في قاعدة البيانات!');
    } catch (err: any) {
      toast.dismiss('convert-tasks');
      toast.error(err?.data?.error || 'فشل تحويل المحضر إلى مهام');
    }
  };

  // Invite Member to Meeting
  const handleInvite = async (empId: string, empName: string) => {
    try {
      await inviteMemberMutation({ targetUserId: empId }).unwrap();
      toast.success(`تم إرسال دعوة فورية إلى ${empName} 🔔`);
    } catch (err: any) {
      toast.error('فشل إرسال الدعوة');
    }
  };

  // Copy Meeting URL
  const handleCopyMeetingLink = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(window.location.href);
      toast.success('تم نسخ رابط غرفة الاجتماع المباشر إلى الحافظة 📋');
    }
  };

  // Manually Start / Turn On Room via Button
  const handleStartBroadcastRoom = async () => {
    setIsRoomActive(true);
    try {
      await joinMeetingMutation().unwrap();
      refetchMeeting();
      toast.success('🔴 تم تشغيل غرفة البث بنجاح وتفعيل الاتصال المباشر!');
    } catch {
      // Ignore
    }
  };

  // Officially Start the Live Meeting (Broadcast notification to all staff)
  const handleStartLiveMeeting = async () => {
    try {
      if (!isRoomActive) {
        setIsRoomActive(true);
        await joinMeetingMutation().unwrap();
      }
      await startMeetingMutation().unwrap();
      setIsLiveActive(true);
      toast.success('🔴 بدأ الاجتماع المركزي رسمياً وتم بث إشعار الانضمام لكافة الموظفين!');
    } catch (err: any) {
      toast.error('فشل بدء الاجتماع');
    }
  };

  // Leave Meeting and Return to Standby State
  const handleLeaveMeeting = async () => {
    try {
      if (mediaStream) {
        mediaStream.getTracks().forEach((t) => t.stop());
        setMediaStream(null);
      }
      if (screenStream) {
        screenStream.getTracks().forEach((t) => t.stop());
        setScreenStream(null);
      }
      peerConnectionsRef.current.forEach((pc) => pc.close());
      peerConnectionsRef.current.clear();
      setRemotePeers([]);
      setIsScreenSharing(false);
      setIsHandRaised(false);
      await leaveMeetingMutation().unwrap();
      setIsRoomActive(false);
      toast.info('تم إيقاف البث ومغادرة الغرفة والعودة لوضع الاستعداد 🛑');
      refetchMeeting();
    } catch (err) {
      setIsRoomActive(false);
      toast.info('تمت مغادرة الاجتماع والعودة لوضع الاستعداد');
    }
  };

  const participants = meetingRoom?.participants || [];

  return (
    <div className="flex-1 max-w-7xl w-full mx-auto px-4 py-8 space-y-6">
      {/* Header & Tabs */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold text-rose-500 tracking-widest uppercase flex items-center gap-1.5">
            <Radio className="w-3.5 h-3.5 animate-pulse text-red-500" />
            WEBRTC LIVE BROADCAST & MEETING SUITE
          </span>
          <h1 className="text-2xl md:text-3xl font-black text-white mt-1">
            غرف الاجتماعات الحية وبث الفيديو
          </h1>
          <p className="text-xs text-gray-400 mt-1">
            بث فيديو وصوت حقيقي من جهازك، مشاركة الشاشة، وحفظ محضر الاجتماع وتحويله إلى مهام في قاعدة البيانات
          </p>
        </div>

        {/* Top Header Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          {!isRoomActive ? (
            <Button
              variant="gold"
              size="sm"
              onClick={handleStartBroadcastRoom}
              className="rounded-xl flex items-center gap-1.5 shadow-gold-glow font-black text-xs"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>تشغيل الغرفة والانضمام 🔴</span>
            </Button>
          ) : (
            <>
              <span className="px-3 py-1.5 rounded-xl bg-red-500/20 border border-red-500/40 text-red-300 font-bold text-xs flex items-center gap-1.5 animate-pulse">
                <span className="w-2 h-2 rounded-full bg-red-500" />
                <span>البث نشط الآن</span>
              </span>

              <Button
                variant="danger"
                size="sm"
                onClick={handleLeaveMeeting}
                className="rounded-xl flex items-center gap-1.5 shadow-md font-bold text-xs"
              >
                <PhoneOff className="w-3.5 h-3.5" />
                <span>إيقاف البث ومغادرة الغرفة</span>
              </Button>
            </>
          )}

          <Button
            variant="gold"
            size="sm"
            onClick={() => setIsInviteModalOpen(true)}
            className="rounded-xl flex items-center gap-1.5 shadow-gold-glow"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>+ دعوة عضو 👥</span>
          </Button>

          <button
            type="button"
            onClick={handleCopyMeetingLink}
            className="p-2 rounded-xl bg-obsidian-surface hover:bg-gray-800 text-gray-300 hover:text-white border border-gray-800 transition-colors"
            title="نسخ رابط الاجتماع"
          >
            <Copy className="w-4 h-4" />
          </button>

          {/* Tab Controls */}
          <div className="flex items-center gap-1 p-1 bg-obsidian-surface rounded-2xl border border-obsidian-border text-xs">
            <button
              type="button"
              onClick={() => setActiveTab('meeting')}
              className={`px-3.5 py-1.5 rounded-xl font-bold transition-all ${
                activeTab === 'meeting'
                  ? 'bg-rose-500 text-white shadow-lg'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              🎥 الاجتماع المباشر
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('video-review')}
              className={`px-3.5 py-1.5 rounded-xl font-bold transition-all ${
                activeTab === 'video-review'
                  ? 'bg-lord-gold text-obsidian-primary shadow-gold-glow'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              🎬 مراجعة الفيديوهات
            </button>
          </div>
        </div>
      </div>

      {activeTab === 'meeting' ? (
        !isRoomActive ? (
          <MeetingStandbyHub
            meetingRoom={meetingRoom}
            startWithVideo={startWithVideo}
            setStartWithVideo={setStartWithVideo}
            startWithAudio={startWithAudio}
            setStartWithAudio={setStartWithAudio}
            onStartBroadcast={handleStartBroadcastRoom}
          />
        ) : (
          /* ACTIVE MEETING & VIDEO BROADCAST GRID */
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">
          {/* Main Video Stream Stage */}
          <div className="lg:col-span-2 space-y-4">
            {/* Active Video Screen (Real WebRTC Video Tag) */}
            {(() => {
              const isCurrentUserHost = currentUser?.accessRole === 'SUPER_ADMIN';
              const hostPeer = remotePeers.find((p) => p.isHost);
              const primaryRemote = hostPeer || remotePeers[0];
              const shouldDisplayRemote = !isCurrentUserHost && !!primaryRemote;

              return (
                <div className="relative aspect-video rounded-3xl bg-black border-2 border-gray-800 overflow-hidden shadow-2xl flex items-center justify-center">
                  {/* Remote Stream View (If viewer, display the broadcaster/host) */}
                  {shouldDisplayRemote ? (
                    <RemotePeerVideo
                      stream={primaryRemote.stream}
                      isMuted={false}
                      className="w-full h-full object-contain bg-black"
                    />
                  ) : isScreenSharing ? (
                    <video
                      ref={screenVideoRef}
                      autoPlay
                      playsInline
                      className="w-full h-full object-contain bg-black"
                    />
                  ) : (
                    <video
                      ref={localVideoRef}
                      autoPlay
                      playsInline
                      muted
                      className={`w-full h-full object-cover transition-opacity duration-300 ${
                        isVideoOff ? 'opacity-0' : 'opacity-100'
                      }`}
                    />
                  )}

                  {/* Camera Off Fallback View */}
                  {!shouldDisplayRemote && isVideoOff && !isScreenSharing && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center space-y-3 bg-gradient-to-br from-obsidian-card via-obsidian-surface to-obsidian-primary">
                      <div className="w-24 h-24 rounded-full bg-lord-gold/20 border-2 border-lord-gold flex items-center justify-center text-4xl shadow-gold-glow">
                        {currentUser?.avatarUrl ? (
                          <img
                            src={currentUser.avatarUrl}
                            alt=""
                            className="w-full h-full rounded-full object-cover"
                          />
                        ) : (
                          '🦁'
                        )}
                      </div>
                      <div className="text-center">
                        <h3 className="text-sm font-bold text-white">{currentUser?.fullName || 'عضو الكادر'}</h3>
                        <span className="text-xs text-lord-gold font-mono">الكاميرا مغلقة مؤقتاً • البث الصوتي قيد العمل</span>
                      </div>
                    </div>
                  )}

                  {/* No Camera Permission State */}
                  {!shouldDisplayRemote && hasMediaPermission === false && !isVideoOff && !isScreenSharing && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center space-y-3 bg-obsidian-card p-6 text-center">
                      <div className="w-16 h-16 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
                        <VideoOff className="w-8 h-8" />
                      </div>
                      <h4 className="text-sm font-bold text-white">إذن الكاميرا أو الميكروفون غير مفعل</h4>
                      <p className="text-xs text-gray-400 max-w-sm">
                        يرجى السماح بالوصول للكاميرا والميكروفون من إعدادات المتصفح لبدء بث الفيديو الحي
                      </p>
                    </div>
                  )}

                  {/* Top Overlay Badges */}
                  <div className="absolute top-4 right-4 flex items-center gap-2 bg-black/70 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-gray-800 text-xs">
                    <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                    <span className="text-white font-mono font-bold">
                      {shouldDisplayRemote
                        ? `بث مباشر: ${primaryRemote.fullName || 'القائد الأعلى'}`
                        : isScreenSharing
                        ? 'مشاركة الشاشة الحية'
                        : 'بث مباشر WebRTC'}
                    </span>
                  </div>

                  <div className="absolute top-4 left-4 flex items-center gap-2 bg-black/70 backdrop-blur-md px-3 py-1.5 rounded-full border border-gray-800 text-[11px] text-gray-300">
                    <Users className="w-3.5 h-3.5 text-lord-gold" />
                    <span>المشاركون: {participants.length || 1}</span>
                  </div>

                  {/* Floating Self-View PIP (When viewing remote stream) */}
                  {shouldDisplayRemote && (
                    <div className="absolute bottom-20 right-4 w-36 sm:w-48 aspect-video rounded-2xl overflow-hidden border-2 border-lord-gold/80 shadow-2xl bg-black z-30">
                      <video
                        ref={localVideoRef}
                        autoPlay
                        playsInline
                        muted
                        className={`w-full h-full object-cover ${isVideoOff ? 'opacity-0' : 'opacity-100'}`}
                      />
                      {isVideoOff && (
                        <div className="absolute inset-0 bg-[#0F141C] flex items-center justify-center text-[10px] text-lord-gold font-semibold">
                          كاميرتك مغلقة
                        </div>
                      )}
                      <div className="absolute bottom-1 right-2 bg-black/80 px-2 py-0.5 rounded text-[9px] text-white font-mono">
                        أنت ({currentUser?.fullName || 'أنت'})
                      </div>
                    </div>
                  )}

              {/* Bottom Control Bar */}
              <div className="absolute bottom-4 inset-x-4 flex items-center justify-between p-3 rounded-2xl bg-black/80 backdrop-blur-md border border-gray-800">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={toggleAudio}
                    className={`p-3 rounded-xl transition-all ${
                      isAudioMuted ? 'bg-red-500 text-white' : 'bg-gray-800 text-white hover:bg-gray-700'
                    }`}
                    title={isAudioMuted ? 'تفعيل الميكروفون' : 'كتم الميكروفون'}
                  >
                    {isAudioMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                  </button>

                  <button
                    type="button"
                    onClick={toggleVideo}
                    className={`p-3 rounded-xl transition-all ${
                      isVideoOff ? 'bg-red-500 text-white' : 'bg-gray-800 text-white hover:bg-gray-700'
                    }`}
                    title={isVideoOff ? 'تشغيل الكاميرا' : 'إيقاف الكاميرا'}
                  >
                    {isVideoOff ? <VideoOff className="w-4 h-4" /> : <Video className="w-4 h-4" />}
                  </button>

                  <button
                    type="button"
                    onClick={toggleScreenShare}
                    className={`p-3 rounded-xl transition-all ${
                      isScreenSharing ? 'bg-blue-600 text-white shadow-blue-glow' : 'bg-gray-800 text-white hover:bg-gray-700'
                    }`}
                    title="مشاركة الشاشة"
                  >
                    <ScreenShare className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsHandRaised(!isHandRaised);
                      toast.info(!isHandRaised ? 'تم رفع اليد لطلب الكلمة ✋' : 'تم خفض اليد');
                    }}
                    className={`p-3 rounded-xl transition-all ${
                      isHandRaised ? 'bg-lord-gold text-obsidian-primary font-bold' : 'bg-gray-800 text-white hover:bg-gray-700'
                    }`}
                    title="طلب الكلمة"
                  >
                    <Hand className="w-4 h-4" />
                  </button>
                </div>

                <Button
                  variant="danger"
                  size="sm"
                  onClick={handleLeaveMeeting}
                  className="rounded-xl flex items-center gap-1.5"
                >
                  <PhoneOff className="w-4 h-4" />
                  <span>مغادرة الغرفة</span>
                </Button>
              </div>
            </div>
          );
        })()}

            {/* Real Participants List (From MongoDB MeetingRoom.participants) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between px-1">
                <span className="text-xs font-bold text-gray-400">
                  المشاركون المسجلون في الغرفة ({participants.length})
                </span>
                <span className="text-[10px] text-emerald-400 font-mono">MongoDB Live Sync</span>
              </div>

              {isLoadingMeeting ? (
                <ParticipantsSkeleton />
              ) : participants.length === 0 ? (
                <div className="p-3 bg-obsidian-card rounded-2xl text-center text-xs text-gray-500 border border-gray-800">
                  أنت أول المنضمين للغرفة 👑
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {participants.map((p: any, idx: number) => {
                    const userObj = p.userId || {};
                    const displayName = p.fullName || userObj.fullName || 'عضو الكادر';
                    const role = p.accessRole || userObj.accessRole || '';
                    const remotePeer = remotePeers.find(
                      (rp) => rp.socketId === p.socketId || rp.userId === (userObj._id || userObj.id || p.userId)
                    );

                    return (
                      <div
                        key={idx}
                        className={`p-3 rounded-2xl bg-obsidian-card border transition-all text-center space-y-1.5 overflow-hidden ${
                          p.isSpeaking ? 'border-lord-gold shadow-gold-glow' : 'border-obsidian-border'
                        }`}
                      >
                        {remotePeer && remotePeer.stream ? (
                          <div className="w-full aspect-video rounded-xl bg-black overflow-hidden mb-1.5 border border-gray-700">
                            <RemotePeerVideo stream={remotePeer.stream} isMuted={false} className="w-full h-full object-cover" />
                          </div>
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-obsidian-surface border border-gray-700 flex items-center justify-center text-sm font-bold text-lord-gold mx-auto overflow-hidden">
                            {p.avatarUrl || userObj.avatarUrl ? (
                              <img
                                src={p.avatarUrl || userObj.avatarUrl}
                                alt=""
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              displayName.charAt(0) || '👤'
                            )}
                          </div>
                        )}
                        <strong className="text-xs text-white block truncate">{displayName}</strong>
                        <span className="text-[10px] text-gray-400 font-mono block truncate">
                          {role === 'SUPER_ADMIN' ? 'الإدارة العليا' : role === 'TREASURY' ? 'الخزينة' : 'كادر تنفيذي'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Right Panel: Meeting Notes & AI Meeting-to-Tasks (Persisted in MongoDB) */}
          <MeetingNotesPanel
            meetingNotes={meetingNotes}
            setMeetingNotes={setMeetingNotes}
            onSaveNotes={handleSaveNotes}
            isSavingNotes={isSavingNotes}
            onConvertNotesToTasks={handleConvertMeetingToTasks}
            isConverting={isConverting}
          />
        </div>
        )
      ) : (
        /* Video Review Mode with Timestamped Notes */
        <div className="max-w-4xl mx-auto">
          <VideoPlayerWithNotes
            src="https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4"
            title="مراجعة فيديو مونتاج: تحليل شارت BTC وشرح صفقات الـ VIP للأسبوع"
          />
        </div>
      )}

      {/* Reusable Portal Modal: Invite Member to Meeting */}
      <MeetingInviteModal
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
        allEmployees={allEmployees}
        isInviting={isInviting}
        onInvite={handleInvite}
      />
    </div>
  );
}
