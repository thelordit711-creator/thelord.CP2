'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Phone,
  PhoneOff,
  Mic,
  MicOff,
  Video,
  VideoOff,
  Monitor,
  Volume2,
  Maximize2,
  Minimize2,
  User as UserIcon,
  ShieldCheck,
  Radio
} from 'lucide-react';
import { toast } from 'sonner';
import { callSoundSynthesizer } from '../../lib/callSounds';

export interface CallTargetUser {
  _id: string;
  fullName: string;
  avatarUrl?: string;
  primaryDepartment?: string;
}

export interface IncomingCallPayload {
  caller: CallTargetUser;
  callerSocketId: string;
  callType?: 'audio' | 'video';
}

interface TelegramDirectCallModalProps {
  socket: any;
  currentUserId: string;
  currentUserName: string;
  isOpen: boolean;
  onClose: () => void;
  targetUser?: CallTargetUser | null;
  incomingCall?: IncomingCallPayload | null;
  initialCallType?: 'audio' | 'video';
}

export const TelegramDirectCallModal: React.FC<TelegramDirectCallModalProps> = ({
  socket,
  currentUserId,
  currentUserName,
  isOpen,
  onClose,
  targetUser,
  incomingCall,
  initialCallType = 'audio'
}) => {
  const [callType, setCallType] = useState<'audio' | 'video'>(
    incomingCall?.callType || initialCallType
  );
  const [callStatus, setCallStatus] = useState<'CALLING' | 'INCOMING' | 'CONNECTED' | 'ENDED'>(
    incomingCall ? 'INCOMING' : 'CALLING'
  );

  const [isMuted, setIsMuted] = useState(false);
  const [isVideoDisabled, setIsVideoDisabled] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [callDuration, setCallDuration] = useState(0);

  const localStreamRef = useRef<MediaStream | null>(null);
  const cameraTrackRef = useRef<MediaStreamTrack | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);

  // WebRTC Signaling Queue & Cache
  const pendingCandidatesRef = useRef<RTCIceCandidateInit[]>([]);
  const pendingOfferRef = useRef<RTCSessionDescriptionInit | null>(null);

  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const activePartner = incomingCall ? incomingCall.caller : targetUser;

  const rtcConfig: RTCConfiguration = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' },
      { urls: 'stun:stun3.l.google.com:19302' }
    ]
  };

  // Helper to create and attach WebRTC PeerConnection
  const createPeerConnection = (stream: MediaStream): RTCPeerConnection => {
    const pc = new RTCPeerConnection(rtcConfig);
    peerConnectionRef.current = pc;

    stream.getTracks().forEach((track) => pc.addTrack(track, stream));

    pc.ontrack = (event) => {
      if (event.streams && event.streams[0]) {
        const remoteStream = event.streams[0];
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = remoteStream;
          remoteVideoRef.current.play().catch(() => {});
        }
        if (remoteAudioRef.current) {
          remoteAudioRef.current.srcObject = remoteStream;
          remoteAudioRef.current.play().catch(() => {});
        }
      }
    };

    pc.onicecandidate = (event) => {
      if (event.candidate && activePartner && socket) {
        socket.emit('call:signal', {
          toUserId: activePartner._id,
          signal: { candidate: event.candidate.toJSON() }
        });
      }
    };

    return pc;
  };

  // Helper to drain and apply pending queued ICE candidates
  const drainPendingCandidates = async (pc: RTCPeerConnection) => {
    if (pendingCandidatesRef.current.length > 0) {
      for (const cand of pendingCandidatesRef.current) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(cand));
        } catch (e) {
          console.warn('[WebRTC] Candidate drain warning:', e);
        }
      }
      pendingCandidatesRef.current = [];
    }
  };

  // Sound Management based on call status
  useEffect(() => {
    if (!isOpen) {
      callSoundSynthesizer.stopAll();
      return;
    }

    if (callStatus === 'CALLING') {
      callSoundSynthesizer.playOutgoingRingback();
    } else if (callStatus === 'INCOMING') {
      callSoundSynthesizer.playIncomingRingtone();
    } else {
      callSoundSynthesizer.stopAll();
    }

    return () => {
      callSoundSynthesizer.stopAll();
    };
  }, [isOpen, callStatus]);

  // Clean up all streams and peer connections
  const cleanupCall = useCallback(() => {
    callSoundSynthesizer.stopAll();

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach((t) => t.stop());
      screenStreamRef.current = null;
    }

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
    }

    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    pendingCandidatesRef.current = [];
    pendingOfferRef.current = null;
    cameraTrackRef.current = null;
    setIsScreenSharing(false);
  }, []);

  const handleEndCall = () => {
    if (activePartner && socket) {
      socket.emit('call:end', { toUserId: activePartner._id });
    }
    setCallStatus('ENDED');
    cleanupCall();
    onClose();
  };

  const handleRejectCall = () => {
    if (incomingCall && socket) {
      socket.emit('call:reject', { toUserId: incomingCall.caller._id });
    }
    cleanupCall();
    onClose();
  };

  const startTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setCallDuration(0);
    timerRef.current = setInterval(() => {
      setCallDuration((prev) => prev + 1);
    }, 1000);
  };

  // Answering incoming call (Callee side)
  const handleAnswerCall = async () => {
    if (!incomingCall || !socket) return;
    try {
      const isVideo = incomingCall.callType === 'video';
      setCallType(isVideo ? 'video' : 'audio');

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
        video: isVideo ? { width: 1280, height: 720, facingMode: 'user' } : false
      });

      localStreamRef.current = stream;
      if (isVideo) {
        cameraTrackRef.current = stream.getVideoTracks()[0] || null;
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
      }

      const pc = createPeerConnection(stream);

      // Apply cached offer if it arrived while ringing
      if (pendingOfferRef.current) {
        await pc.setRemoteDescription(new RTCSessionDescription(pendingOfferRef.current));
        await drainPendingCandidates(pc);

        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        socket.emit('call:accept', {
          toUserId: incomingCall.caller._id,
          acceptor: { _id: currentUserId, fullName: currentUserName },
          callType: isVideo ? 'video' : 'audio'
        });

        socket.emit('call:signal', {
          toUserId: incomingCall.caller._id,
          signal: { answer }
        });

        pendingOfferRef.current = null;
      } else {
        // If offer didn't arrive yet, emit accept so caller sends/re-sends offer immediately
        socket.emit('call:accept', {
          toUserId: incomingCall.caller._id,
          acceptor: { _id: currentUserId, fullName: currentUserName },
          callType: isVideo ? 'video' : 'audio'
        });
      }

      setCallStatus('CONNECTED');
      startTimer();
    } catch (err: any) {
      toast.error('تعذر الوصول إلى أجهزة الصوت أو الكاميرا: ' + err.message);
      handleRejectCall();
    }
  };

  // Initiating outgoing call (Caller side)
  useEffect(() => {
    if (!isOpen || incomingCall || !targetUser || !socket) return;

    let isSubscribed = true;

    const initiateCall = async () => {
      try {
        const isVideo = callType === 'video';
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: true, noiseSuppression: true },
          video: isVideo ? { width: 1280, height: 720, facingMode: 'user' } : false
        });

        if (!isSubscribed) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        localStreamRef.current = stream;
        if (isVideo) {
          cameraTrackRef.current = stream.getVideoTracks()[0] || null;
          if (localVideoRef.current) {
            localVideoRef.current.srcObject = stream;
          }
        }

        const pc = createPeerConnection(stream);

        const offer = await pc.createOffer({
          offerToReceiveAudio: true,
          offerToReceiveVideo: isVideo
        });
        await pc.setLocalDescription(offer);

        socket.emit('call:invite', {
          toUserId: targetUser._id,
          caller: { _id: currentUserId, fullName: currentUserName },
          callType
        });

        socket.emit('call:signal', {
          toUserId: targetUser._id,
          signal: { offer }
        });
      } catch (err: any) {
        toast.error('تعذر تشغيل أجهزة الوسائط للاتصال: ' + err.message);
        onClose();
      }
    };

    initiateCall();

    return () => {
      isSubscribed = false;
    };
  }, [isOpen, incomingCall, targetUser, socket, callType]);

  // Socket signaling events listener
  useEffect(() => {
    if (!socket) return;

    const handleAccepted = async (data: { callType?: 'audio' | 'video' }) => {
      if (data?.callType) {
        setCallType(data.callType);
      }
      setCallStatus('CONNECTED');
      startTimer();
      toast.success('تم قبول المكالمة والاتصال بنجاح 🟢');

      // Guarantee callee has the offer by re-sending it upon acceptance
      const pc = peerConnectionRef.current;
      if (pc && pc.localDescription && activePartner) {
        socket.emit('call:signal', {
          toUserId: activePartner._id,
          signal: { offer: pc.localDescription }
        });
      }
    };

    const handleRejected = (data: { reason?: string }) => {
      toast.info(data.reason || 'المستخدم مشغول حالياً');
      cleanupCall();
      onClose();
    };

    const handleSignal = async (data: { signal: any }) => {
      const pc = peerConnectionRef.current;

      if (data.signal?.offer) {
        if (pc) {
          try {
            await pc.setRemoteDescription(new RTCSessionDescription(data.signal.offer));
            await drainPendingCandidates(pc);

            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);

            if (activePartner) {
              socket.emit('call:signal', {
                toUserId: activePartner._id,
                signal: { answer }
              });
            }
          } catch (e) {
            console.warn('[WebRTC] Set remote offer error:', e);
          }
        } else {
          // PC not initialized yet (user still on incoming screen) -> Cache the offer!
          pendingOfferRef.current = data.signal.offer;
        }
      } else if (data.signal?.answer) {
        if (pc) {
          try {
            if (pc.signalingState !== 'stable') {
              await pc.setRemoteDescription(new RTCSessionDescription(data.signal.answer));
              await drainPendingCandidates(pc);
            }
          } catch (e) {
            console.warn('[WebRTC] Set remote answer error:', e);
          }
        }
      } else if (data.signal?.candidate) {
        if (pc && pc.remoteDescription && pc.remoteDescription.type) {
          try {
            await pc.addIceCandidate(new RTCIceCandidate(data.signal.candidate));
          } catch (e) {
            console.warn('[WebRTC] Add candidate error:', e);
          }
        } else {
          // PC or remoteDescription not ready -> Queue candidate!
          pendingCandidatesRef.current.push(data.signal.candidate);
        }
      }
    };

    const handleEnded = () => {
      toast.info('تم إنهاء المكالمة 🔴');
      cleanupCall();
      onClose();
    };

    socket.on('call:accepted', handleAccepted);
    socket.on('call:rejected', handleRejected);
    socket.on('call:signal', handleSignal);
    socket.on('call:ended', handleEnded);

    return () => {
      socket.off('call:accepted', handleAccepted);
      socket.off('call:rejected', handleRejected);
      socket.off('call:signal', handleSignal);
      socket.off('call:ended', handleEnded);
    };
  }, [socket, activePartner, cleanupCall, onClose]);

  // Screen Sharing like Telegram / Google Meet
  const toggleScreenShare = async () => {
    const pc = peerConnectionRef.current;
    if (!pc) return;

    if (isScreenSharing) {
      // Revert back to camera track
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach((t) => t.stop());
        screenStreamRef.current = null;
      }

      if (cameraTrackRef.current) {
        const sender = pc.getSenders().find((s) => s.track?.kind === 'video');
        if (sender) {
          sender.replaceTrack(cameraTrackRef.current);
        }
        if (localVideoRef.current && localStreamRef.current) {
          localVideoRef.current.srcObject = localStreamRef.current;
        }
      }
      setIsScreenSharing(false);
      toast.info('تم إيقاف مشاركة الشاشة');
    } else {
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: true
        });
        screenStreamRef.current = screenStream;
        const screenTrack = screenStream.getVideoTracks()[0];

        // Handle user clicking "Stop sharing" in native browser bar
        screenTrack.onended = () => {
          toggleScreenShare();
        };

        const sender = pc.getSenders().find((s) => s.track?.kind === 'video');
        if (sender) {
          sender.replaceTrack(screenTrack);
        } else {
          // If was audio-only, add screen track to PC
          pc.addTrack(screenTrack, screenStream);
          setCallType('video');
        }

        if (localVideoRef.current) {
          localVideoRef.current.srcObject = screenStream;
        }

        setIsScreenSharing(true);
        toast.success('تم تفعيل مشاركة الشاشة المباشرة 🖥️');
      } catch (err: any) {
        if (err.name !== 'NotAllowedError') {
          toast.error('تعذر مشاركة الشاشة: ' + err.message);
        }
      }
    }
  };

  // Mute / Unmute Mic
  const toggleMute = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  };

  // Enable / Disable Camera
  const toggleVideo = () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoDisabled(!videoTrack.enabled);
      }
    }
  };

  const formatSeconds = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  if (!isOpen) return null;

  return (
    <div
      ref={containerRef}
      className={`fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-xl animate-fadeIn ${
        isFullscreen ? 'p-0' : ''
      }`}
    >
      {/* Hidden audio element for WebRTC audio playback */}
      <audio ref={remoteAudioRef} autoPlay />

      <div
        className={`w-full bg-[#080b12] border border-lord-gold/40 shadow-2xl flex flex-col relative overflow-hidden transition-all duration-300 ${
          callType === 'video' || isScreenSharing
            ? isFullscreen
              ? 'w-screen h-screen rounded-none'
              : 'max-w-4xl h-[85vh] max-h-[780px] rounded-3xl'
            : 'max-w-md rounded-3xl p-6 sm:p-8'
        }`}
      >
        {/* Ambient Top Glow */}
        <div className="absolute -top-16 -right-16 w-48 h-48 bg-lord-gold/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Header Bar */}
        <div className="flex items-center justify-between p-4 z-10 border-b border-gray-800/80 bg-black/30 backdrop-blur-md">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs font-mono font-bold text-gray-300 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-lord-gold" />
              <span>اتصال آمن ومباشر (P2P WebRTC)</span>
            </span>
          </div>

          <div className="flex items-center gap-2">
            {(callType === 'video' || isScreenSharing) && (
              <button
                type="button"
                onClick={() => setIsFullscreen(!isFullscreen)}
                className="p-2 rounded-xl bg-gray-800/80 hover:bg-gray-700 text-gray-300 transition-colors"
                title={isFullscreen ? 'تصغير' : 'ملء الشاشة'}
              >
                {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>
            )}

            <button
              type="button"
              onClick={handleEndCall}
              className="p-2 rounded-xl bg-red-600/20 hover:bg-red-600/40 text-red-300 border border-red-500/30 transition-colors"
              title="إغلاق"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Content Area */}
        {callType === 'video' || isScreenSharing ? (
          // ================= VIDEO / SCREEN SHARING MODE =================
          <div className="flex-1 relative bg-black flex items-center justify-center overflow-hidden">
            {/* Main Remote Video Stream */}
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="w-full h-full object-contain bg-black"
            />

            {/* In case remote video isn't transmitting yet */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none opacity-40">
              <div className="w-24 h-24 rounded-full bg-lord-gold/20 border-2 border-lord-gold/40 flex items-center justify-center text-lord-gold text-2xl font-black mb-3">
                {activePartner?.fullName?.charAt(0) || '👤'}
              </div>
              <p className="text-sm font-bold text-gray-300">{activePartner?.fullName}</p>
            </div>

            {/* Local Pip Video Preview (Corner) */}
            <div className="absolute bottom-4 left-4 w-32 h-44 sm:w-44 sm:h-56 rounded-2xl overflow-hidden border-2 border-lord-gold/60 shadow-2xl bg-gray-900 z-20">
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover transform -scale-x-100"
              />
              <div className="absolute bottom-1 right-2 bg-black/60 px-2 py-0.5 rounded-md text-[10px] text-gray-300 font-mono">
                أنت {isScreenSharing ? '(شاشة)' : ''}
              </div>
            </div>

            {/* Active Screen Share Notice Pill */}
            {isScreenSharing && (
              <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-amber-500/20 border border-amber-500/50 backdrop-blur-md px-4 py-1.5 rounded-full text-xs font-bold text-amber-300 flex items-center gap-2 z-20 animate-pulse">
                <Monitor className="w-4 h-4 text-amber-400" />
                <span>مشاركة شاشتك نشطة ومباشرة الآن</span>
              </div>
            )}

            {/* Call Status Overlay */}
            <div className="absolute top-4 right-4 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-xl border border-gray-800 text-xs text-gray-300 font-mono z-20 flex items-center gap-2">
              <Radio className="w-3.5 h-3.5 text-red-500 animate-pulse" />
              <span>{callStatus === 'CONNECTED' ? formatSeconds(callDuration) : 'جاري التوصيل...'}</span>
            </div>
          </div>
        ) : (
          // ================= AUDIO ONLY MODE =================
          <div className="flex-1 flex flex-col items-center justify-center py-6 text-center z-10">
            {/* Telegram Avatar Pulse */}
            <div className="relative mb-6">
              <div
                className={`w-28 h-28 sm:w-32 sm:h-32 rounded-full border-2 border-lord-gold/60 flex items-center justify-center bg-gray-900 text-lord-gold shadow-2xl relative ${
                  callStatus === 'CALLING' || callStatus === 'INCOMING' ? 'animate-pulse' : ''
                }`}
              >
                {activePartner?.avatarUrl ? (
                  <img
                    src={activePartner.avatarUrl}
                    alt={activePartner.fullName}
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  <span className="text-3xl font-black">
                    {activePartner?.fullName?.charAt(0) || '👤'}
                  </span>
                )}
              </div>

              {callStatus === 'CONNECTED' && (
                <span className="absolute bottom-0 right-1 w-8 h-8 rounded-full bg-emerald-500 border-2 border-[#080b12] flex items-center justify-center text-white shadow-lg animate-bounce">
                  <Volume2 className="w-4 h-4" />
                </span>
              )}
            </div>

            <h3 className="text-xl font-black text-white mb-1.5">{activePartner?.fullName}</h3>
            <p className="text-xs text-gray-400 font-mono mb-4">
              {activePartner?.primaryDepartment || 'كادر معتمد'}
            </p>

            <div className="px-4 py-1.5 rounded-full bg-gray-900/90 border border-gray-800 text-xs font-bold text-gray-300 font-mono mb-6 flex items-center gap-2">
              {callStatus === 'INCOMING' && (
                <>
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                  <span className="text-emerald-300">مكالمة صوتية واردة... 🎙️</span>
                </>
              )}
              {callStatus === 'CALLING' && (
                <>
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />
                  <span className="text-amber-300">جاري الرنين والانتظار... ⏳</span>
                </>
              )}
              {callStatus === 'CONNECTED' && (
                <>
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  <span className="text-emerald-400">متصل الآن ({formatSeconds(callDuration)})</span>
                </>
              )}
              {callStatus === 'ENDED' && <span className="text-red-400">تم إنهاء المكالمة</span>}
            </div>
          </div>
        )}

        {/* Bottom Control Bar */}
        <div className="p-4 sm:p-5 border-t border-gray-800/80 bg-black/50 backdrop-blur-lg flex items-center justify-center gap-4 sm:gap-6 z-20">
          {callStatus === 'INCOMING' ? (
            /* Incoming Call Controls: Reject & Answer */
            <div className="flex items-center gap-8 py-2">
              <button
                type="button"
                onClick={handleRejectCall}
                className="flex flex-col items-center gap-1.5 group"
              >
                <div className="w-14 h-14 rounded-full bg-red-600 hover:bg-red-500 text-white flex items-center justify-center shadow-xl transition-all group-hover:scale-110 active:scale-95">
                  <PhoneOff className="w-6 h-6" />
                </div>
                <span className="text-[11px] text-gray-400 font-bold">رفض</span>
              </button>

              <button
                type="button"
                onClick={handleAnswerCall}
                className="flex flex-col items-center gap-1.5 group"
              >
                <div className="w-16 h-16 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center shadow-2xl transition-all group-hover:scale-110 active:scale-95 animate-pulse">
                  <Phone className="w-7 h-7" />
                </div>
                <span className="text-[11px] text-emerald-400 font-bold">رد وتواصل 📞</span>
              </button>
            </div>
          ) : (
            /* Active Call Controls */
            <div className="flex items-center gap-3 sm:gap-5">
              {/* Mic Toggle */}
              <button
                type="button"
                onClick={toggleMute}
                className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${
                  isMuted
                    ? 'bg-amber-600 text-white shadow-amber-900/40 shadow-lg'
                    : 'bg-gray-800/90 text-gray-200 hover:bg-gray-700 hover:text-white border border-gray-700'
                }`}
                title={isMuted ? 'إلغاء كتم الصوت' : 'كتم الميكروفون'}
              >
                {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
              </button>

              {/* Video Camera Toggle */}
              <button
                type="button"
                onClick={() => {
                  if (callType === 'audio') {
                    setCallType('video');
                  } else {
                    toggleVideo();
                  }
                }}
                className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${
                  isVideoDisabled
                    ? 'bg-red-600/80 text-white border border-red-500/50'
                    : callType === 'video'
                    ? 'bg-emerald-600/80 text-white border border-emerald-500/50 shadow-lg'
                    : 'bg-gray-800/90 text-gray-200 hover:bg-gray-700 hover:text-white border border-gray-700'
                }`}
                title={isVideoDisabled ? 'تشغيل الكاميرا' : 'إيقاف الكاميرا'}
              >
                {isVideoDisabled ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
              </button>

              {/* Screen Share Toggle */}
              <button
                type="button"
                onClick={toggleScreenShare}
                className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${
                  isScreenSharing
                    ? 'bg-amber-500 text-black font-black shadow-amber-500/40 shadow-lg animate-pulse'
                    : 'bg-gray-800/90 text-gray-200 hover:bg-gray-700 hover:text-white border border-gray-700'
                }`}
                title={isScreenSharing ? 'إيقاف مشاركة الشاشة' : 'مشاركة الشاشة (مثل تليجرام)'}
              >
                <Monitor className="w-5 h-5" />
              </button>

              {/* Hangup / End Call */}
              <button
                type="button"
                onClick={handleEndCall}
                className="w-14 h-12 rounded-2xl bg-red-600 hover:bg-red-500 text-white flex items-center justify-center shadow-red-950/50 shadow-xl transition-all hover:scale-105 active:scale-95"
                title="إنهاء المكالمة"
              >
                <PhoneOff className="w-6 h-6" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

