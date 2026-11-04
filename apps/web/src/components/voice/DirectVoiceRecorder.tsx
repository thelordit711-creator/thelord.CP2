'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square, Trash2, CheckCircle2 } from 'lucide-react';
import { Button } from '../ui/Button';

interface DirectVoiceRecorderProps {
  onRecordingComplete: (audioData: { blob: Blob; durationInSeconds: number; previewUrl: string }) => void;
  onCancel?: () => void;
}

export const DirectVoiceRecorder: React.FC<DirectVoiceRecorderProps> = ({
  onRecordingComplete,
  onCancel
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
  }, [audioUrl]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(audioBlob);
        setAudioUrl(url);
        onRecordingComplete({
          blob: audioBlob,
          durationInSeconds: recordingDuration,
          previewUrl: url
        });
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start(200);
      setIsRecording(true);
      setRecordingDuration(0);

      timerRef.current = setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.error('Microphone access denied:', err);
      alert('يرجى السماح بالوصول إلى الميكروفون للتسجيل الصوتي المباشر.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const cancelRecording = () => {
    stopRecording();
    setAudioUrl(null);
    setRecordingDuration(0);
    if (onCancel) onCancel();
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <div className="flex items-center gap-3 p-3 bg-obsidian-surface border border-obsidian-border rounded-xl">
      {!isRecording && !audioUrl && (
        <Button
          type="button"
          variant="outline"
          onClick={startRecording}
          className="flex items-center gap-2 text-lord-gold border-lord-gold/40 hover:bg-lord-gold/10"
        >
          <Mic className="w-4 h-4 text-lord-gold animate-pulse" />
          <span>تسجيل رسالة صوتية 🎙️</span>
        </Button>
      )}

      {isRecording && (
        <div className="flex items-center gap-4 w-full">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-status-danger animate-ping"></span>
            <span className="text-sm font-mono text-status-danger font-bold">
              {formatDuration(recordingDuration)}
            </span>
          </div>

          <div className="flex-1 h-3 bg-obsidian-primary rounded-full overflow-hidden flex items-center px-1">
            <div className="w-full h-1 bg-gradient-to-r from-lord-gold via-cyber-blue to-status-danger animate-pulse rounded-full"></div>
          </div>

          <Button type="button" variant="danger" size="sm" onClick={stopRecording}>
            <Square className="w-4 h-4 ml-1" />
            <span>إيقاف وحفظ</span>
          </Button>

          <Button type="button" variant="ghost" size="sm" onClick={cancelRecording}>
            <Trash2 className="w-4 h-4 text-gray-400 hover:text-red-400" />
          </Button>
        </div>
      )}

      {audioUrl && !isRecording && (
        <div className="flex items-center gap-3 w-full">
          <CheckCircle2 className="w-5 h-5 text-status-disbursed shrink-0" />
          <audio src={audioUrl} controls className="h-8 max-w-[280px] rounded-lg" />
          <span className="text-xs text-gray-400 font-mono">{formatDuration(recordingDuration)}</span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              setAudioUrl(null);
              setRecordingDuration(0);
            }}
          >
            <Trash2 className="w-4 h-4 text-gray-400 hover:text-red-400" />
          </Button>
        </div>
      )}
    </div>
  );
};

