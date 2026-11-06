'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Phone, PhoneOff, Mic, MicOff, Volume2, User as UserIcon } from 'lucide-react';
import { toast } from 'sonner';

interface AudioCallModalProps {
  socket: any;
  currentUserId: string;
  currentUserName: string;
  targetUser?: { _id: string; fullName: string; avatarUrl?: string } | null;
  incomingCall?: { caller: { _id: string; fullName: string; avatarUrl?: string }; callerSocketId: string } | null;
  onClose: () => void;
}

export const AudioCallModal: React.FC<AudioCallModalProps> = ({
  socket,
  currentUserId,
  currentUserName,
  targetUser,
  incomingCall,
  onClose
}) => {
  const [callStatus, setCallStatus] = useState<'CALLING' | 'INCOMING' | 'CONNECTED' | 'ENDED'>(
    incomingCall ? 'INCOMING' : 'CALLING'
  );
  const [isMuted, setIsMuted] = useState(false);
  const [callDuration, setCallDuration] = useState(0);

  const localStreamRef = useRef<MediaStream | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const activePartner = incomingCall ? incomingCall.caller : targetUser;

  const rtcConfig: RTCConfiguration = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' }
    ]
  };

  const cleanupCall = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
  };

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

  const handleAnswerCall = async () => {
    if (!incomingCall || !socket) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      localStreamRef.current = stream;

      const pc = new RTCPeerConnection(rtcConfig);
      peerConnectionRef.current = pc;

      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      pc.ontrack = (event) => {
        if (remoteAudioRef.current && event.streams[0]) {
          remoteAudioRef.current.srcObject = event.streams[0];
          remoteAudioRef.current.play().catch(() => {});
        }
      };

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit('call:signal', {
            toUserId: incomingCall.caller._id,
            signal: { candidate: event.candidate }
          });
        }
      };

      socket.emit('call:accept', {
        toUserId: incomingCall.caller._id,
        acceptor: { _id: currentUserId, fullName: currentUserName }
      });

      setCallStatus('CONNECTED');
      startTimer();
    } catch (err) {
      toast.error('تعذر الوصول إلى الميكروفون: ' + (err as Error).message);
      handleRejectCall();
    }
  };

  const startTimer = () => {
    timerRef.current = setInterval(() => {
      setCallDuration((prev) => prev + 1);
    }, 1000);
  };

  const toggleMute = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  };

  // Setup outgoing call
  useEffect(() => {
    if (incomingCall || !targetUser || !socket) return;

    let isSubscribed = true;

    const initiateCall = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        if (!isSubscribed) return;
        localStreamRef.current = stream;

        const pc = new RTCPeerConnection(rtcConfig);
        peerConnectionRef.current = pc;

        stream.getTracks().forEach((track) => pc.addTrack(track, stream));

        pc.ontrack = (event) => {
          if (remoteAudioRef.current && event.streams[0]) {
            remoteAudioRef.current.srcObject = event.streams[0];
            remoteAudioRef.current.play().catch(() => {});
          }
        };

        pc.onicecandidate = (event) => {
          if (event.candidate) {
            socket.emit('call:signal', {
              toUserId: targetUser._id,
              signal: { candidate: event.candidate }
            });
          }
        };

        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        socket.emit('call:invite', {
          toUserId: targetUser._id,
          caller: { _id: currentUserId, fullName: currentUserName }
        });

        socket.emit('call:signal', {
          toUserId: targetUser._id,
          signal: { offer }
        });
      } catch (err) {
        toast.error('تعذر تشغيل الميكروفون للاتصال: ' + (err as Error).message);
        onClose();
      }
    };

    initiateCall();

    return () => {
      isSubscribed = false;
    };
  }, []);

  // Listen to socket signals
  useEffect(() => {
    if (!socket) return;

    const handleAccepted = () => {
      setCallStatus('CONNECTED');
      startTimer();
      toast.success('تم الرد على المكالمة الصوتية!');
    };

    const handleRejected = (data: { reason?: string }) => {
      toast.info(data.reason || 'تم رفض المكالمة');
      cleanupCall();
      onClose();
    };

    const handleSignal = async (data: { signal: any }) => {
      const pc = peerConnectionRef.current;
      if (!pc) return;

      if (data.signal.offer) {
        await pc.setRemoteDescription(new RTCSessionDescription(data.signal.offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        if (activePartner) {
          socket.emit('call:signal', {
            toUserId: activePartner._id,
            signal: { answer }
          });
        }
      } else if (data.signal.answer) {
        await pc.setRemoteDescription(new RTCSessionDescription(data.signal.answer));
      } else if (data.signal.candidate) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(data.signal.candidate));
        } catch (e) {}
      }
    };

    const handleEnded = () => {
      toast.info('انتهت المكالمة الصوتية');
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
  }, [socket, activePartner]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanupCall();
    };
  }, []);

  const formatSeconds = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fadeIn">
      {/* Hidden audio element for WebRTC audio playback */}
      <audio ref={remoteAudioRef} autoPlay />

      <div className="w-full max-w-sm bg-obsidian-card border border-lord-gold/40 rounded-3xl p-6 shadow-2xl flex flex-col items-center text-center relative overflow-hidden">
        {/* Glow ambient background */}
        <div className="absolute -top-12 -right-12 w-36 h-36 bg-lord-gold/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-12 -left-12 w-36 h-36 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* User Avatar with pulsating ring */}
        <div className="relative mb-5">
          <div className={`w-24 h-24 rounded-full border-2 border-lord-gold/50 flex items-center justify-center bg-obsidian-surface text-lord-gold shadow-gold-glow relative ${callStatus === 'CALLING' ? 'animate-pulse' : ''}`}>
            <UserIcon className="w-12 h-12" />
          </div>
          {callStatus === 'CONNECTED' && (
            <span className="absolute bottom-0 right-0 w-6 h-6 rounded-full bg-emerald-500 border-2 border-obsidian-card flex items-center justify-center text-white">
              <Volume2 className="w-3.5 h-3.5 animate-pulse" />
            </span>
          )}
        </div>

        {/* Partner Name & Call Info */}
        <h3 className="text-lg font-black text-white mb-1">
          {activePartner?.fullName || 'عضو في الفريق'}
        </h3>
        <p className="text-xs text-gray-400 mb-6 font-mono">
          {callStatus === 'INCOMING' && 'مكالمة صوتية واردة... 🎙️'}
          {callStatus === 'CALLING' && 'جاري الاتصال... ⏳'}
          {callStatus === 'CONNECTED' && `مكالمة متصلة (${formatSeconds(callDuration)}) 🟢`}
          {callStatus === 'ENDED' && 'تم إنهاء المكالمة 🔴'}
        </p>

        {/* Action Controls */}
        {callStatus === 'INCOMING' ? (
          <div className="flex items-center gap-6">
            <button
              type="button"
              onClick={handleRejectCall}
              className="w-14 h-14 rounded-full bg-red-600 hover:bg-red-500 text-white flex items-center justify-center shadow-lg transition-transform hover:scale-105"
              title="رفض المكالمة"
            >
              <PhoneOff className="w-6 h-6" />
            </button>
            <button
              type="button"
              onClick={handleAnswerCall}
              className="w-14 h-14 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center shadow-lg transition-transform hover:scale-105 animate-bounce"
              title="الرد على المكالمة"
            >
              <Phone className="w-6 h-6" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-5">
            {callStatus === 'CONNECTED' && (
              <button
                type="button"
                onClick={toggleMute}
                className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
                  isMuted ? 'bg-amber-600 text-white' : 'bg-gray-800 text-gray-300 hover:text-white'
                }`}
                title={isMuted ? 'إلغاء كتم الصوت' : 'كتم الميكروفون'}
              >
                {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
              </button>
            )}

            <button
              type="button"
              onClick={handleEndCall}
              className="w-14 h-14 rounded-full bg-red-600 hover:bg-red-500 text-white flex items-center justify-center shadow-lg transition-transform hover:scale-105"
              title="إنهاء المكالمة"
            >
              <PhoneOff className="w-6 h-6" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

