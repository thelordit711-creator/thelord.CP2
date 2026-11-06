'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Play, Pause, Volume2 } from 'lucide-react';

interface TelegramAudioWaveformProps {
  audioUrl: string;
  duration?: number;
  isSender?: boolean;
}

export const TelegramAudioWaveform: React.FC<TelegramAudioWaveformProps> = ({
  audioUrl,
  duration: initialDuration,
  isSender = false
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [totalDuration, setTotalDuration] = useState(initialDuration || 0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Generate deterministic dynamic bar heights based on audioUrl string
  const bars = useMemo(() => {
    const seed = audioUrl ? audioUrl.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) : 42;
    const barCount = 28;
    const heights: number[] = [];
    for (let i = 0; i < barCount; i++) {
      const val = Math.sin((seed + i * 17) % 360) * 0.4 + 0.6; // between 0.2 and 1.0
      heights.push(Math.max(15, Math.min(100, Math.round(val * 100))));
    }
    return heights;
  }, [audioUrl]);

  useEffect(() => {
    const audio = new Audio(audioUrl);
    audioRef.current = audio;

    const handleLoaded = () => {
      if (audio.duration && !isNaN(audio.duration)) {
        setTotalDuration(Math.round(audio.duration));
      }
    };

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    audio.addEventListener('loadedmetadata', handleLoaded);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.pause();
      audio.removeEventListener('loadedmetadata', handleLoaded);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [audioUrl]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().then(() => {
        setIsPlaying(true);
      }).catch((e) => {
        console.error('Audio play error:', e);
      });
    }
  };

  const handleSeek = (index: number) => {
    if (!audioRef.current || totalDuration <= 0) return;
    const progress = index / bars.length;
    const newTime = progress * totalDuration;
    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const formatSeconds = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const progressPercent = totalDuration > 0 ? (currentTime / totalDuration) : 0;
  const activeBarIndex = Math.floor(progressPercent * bars.length);

  return (
    <div className="flex items-center gap-3 py-1 px-1 select-none">
      {/* Play / Pause circular gold button */}
      <button
        type="button"
        onClick={togglePlay}
        className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-all duration-300 shadow-md ${
          isPlaying
            ? 'bg-amber-400 text-black scale-105 shadow-[0_0_15px_rgba(245,158,11,0.5)]'
            : isSender
            ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40 hover:bg-amber-500 hover:text-black'
            : 'bg-slate-800 text-slate-200 border border-slate-700 hover:bg-amber-500 hover:text-black'
        }`}
        title={isPlaying ? 'إيقاف مؤقت' : 'تشغيل التسجيل الصوتي'}
      >
        {isPlaying ? (
          <Pause className="w-5 h-5 fill-current" />
        ) : (
          <Play className="w-5 h-5 fill-current ml-0.5" />
        )}
      </button>

      {/* Waveform Bars & Time Info */}
      <div className="flex-1 flex flex-col justify-center min-w-[170px] max-w-[260px]">
        {/* Waveform Bars */}
        <div className="flex items-center gap-[2.5px] h-7 cursor-pointer" title="انقر للتقديم أو التأخير">
          {bars.map((h, idx) => {
            const isPlayed = idx <= activeBarIndex;
            return (
              <div
                key={idx}
                onClick={() => handleSeek(idx)}
                style={{ height: `${h}%` }}
                className={`w-[3px] rounded-full transition-all duration-150 ${
                  isPlayed
                    ? isSender
                      ? 'bg-amber-400 shadow-[0_0_6px_rgba(245,158,11,0.6)]'
                      : 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.5)]'
                    : isSender
                    ? 'bg-amber-500/30 hover:bg-amber-500/60'
                    : 'bg-slate-700 hover:bg-slate-500'
                }`}
              />
            );
          })}
        </div>

        {/* Duration / Elapsed Display */}
        <div className="flex items-center justify-between text-[11px] font-mono mt-1 opacity-80">
          <span className={isSender ? 'text-amber-200/90' : 'text-slate-300'}>
            {isPlaying ? formatSeconds(currentTime) : (totalDuration > 0 ? formatSeconds(totalDuration) : '0:00')}
          </span>
          <span className="flex items-center gap-1 text-[10px] text-slate-400">
            <Volume2 className="w-3 h-3 opacity-60" />
            صوتي
          </span>
        </div>
      </div>
    </div>
  );
};

