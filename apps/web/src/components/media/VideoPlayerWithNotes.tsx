'use client';

import React, { useState, useRef } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  MessageSquare,
  Clock,
  Send,
  Trash2,
  CheckCircle,
  Video
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { toast } from 'sonner';

export interface VideoNote {
  id: string;
  second: number;
  author: string;
  note: string;
  createdAt: string;
}

interface VideoPlayerWithNotesProps {
  src: string;
  title: string;
  initialNotes?: VideoNote[];
  onAddNote?: (note: { second: number; note: string }) => void;
}

export const VideoPlayerWithNotes: React.FC<VideoPlayerWithNotesProps> = ({
  src,
  title,
  initialNotes = [],
  onAddNote
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [newNoteText, setNewNoteText] = useState('');
  const [notes, setNotes] = useState<VideoNote[]>(
    initialNotes.length > 0
      ? initialNotes
      : [
          {
            id: 'n1',
            second: 15,
            author: 'مسؤول المونتاج والمحتوى',
            note: 'اللوجو الملكي يحتاج تكبير بنسبة 10% هنا ليكون أكثر وضوحاً في أول الفيديو',
            createdAt: 'منذ ساعتين'
          },
          {
            id: 'n2',
            second: 42,
            author: 'المسؤول العام (Admin)',
            note: 'مقطع ممتاز، شارت البيتكوين واضح ومقروء للمشتركين',
            createdAt: 'منذ ساعة'
          }
        ]
  );

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play();
      setIsPlaying(true);
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
    }
  };

  const seekTo = (second: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = second;
      setCurrentTime(second);
      if (!isPlaying) {
        videoRef.current.play();
        setIsPlaying(true);
      }
    }
  };

  const formatTime = (secs: number) => {
    const minutes = Math.floor(secs / 60);
    const seconds = Math.floor(secs % 60);
    return `${minutes < 10 ? '0' : ''}${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  const handleAddNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoteText.trim()) return;

    const currentSec = Math.floor(currentTime);
    const newEntry: VideoNote = {
      id: `vn_${Date.now()}`,
      second: currentSec,
      author: 'أنا (المسؤول)',
      note: newNoteText.trim(),
      createdAt: 'الآن'
    };

    setNotes(prev => [...prev, newEntry].sort((a, b) => a.second - b.second));
    if (onAddNote) {
      onAddNote({ second: currentSec, note: newNoteText.trim() });
    }
    setNewNoteText('');
    toast.success(`تمت إضافة ملاحظة عند [${formatTime(currentSec)}]`);
  };

  return (
    <div className="bg-obsidian-card border border-obsidian-border rounded-3xl p-6 shadow-2xl space-y-6">
      {/* Video Header */}
      <div className="flex items-center justify-between border-b border-gray-800 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-lord-gold/15 text-lord-gold flex items-center justify-center">
            <Video className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">{title}</h3>
            <span className="text-[10px] text-gray-400 font-mono">
              مشغل الفيديو التفاعلي مع الملاحظات المرتبطة بالثواني
            </span>
          </div>
        </div>
        <Badge variant="gold">{notes.length} ملاحظات مدققة</Badge>
      </div>

      {/* Video Player Canvas */}
      <div className="relative rounded-2xl overflow-hidden bg-black aspect-video border border-gray-800 shadow-xl group">
        <video
          ref={videoRef}
          src={src}
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          className="w-full h-full object-contain cursor-pointer"
          onClick={togglePlay}
        />

        {/* Custom Overlay Controls */}
        <div className="absolute bottom-0 inset-x-0 p-4 bg-gradient-to-t from-black/90 via-black/40 to-transparent flex flex-col gap-2 opacity-95 transition-opacity">
          {/* Timeline Bar with Note Pins */}
          <div className="relative w-full h-2 bg-gray-700/60 rounded-full cursor-pointer flex items-center">
            <input
              type="range"
              min={0}
              max={duration || 100}
              value={currentTime}
              onChange={e => seekTo(Number(e.target.value))}
              className="w-full h-2 opacity-0 cursor-pointer z-10"
            />
            <div
              className="absolute left-0 top-0 bottom-0 bg-lord-gold rounded-full"
              style={{ width: `${(currentTime / (duration || 1)) * 100}%` }}
            />

            {/* Note Marker Pins on Timeline */}
            {notes.map(n => {
              const leftPercent = (n.second / (duration || 1)) * 100;
              return (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => seekTo(n.second)}
                  className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-status-danger border border-white hover:scale-125 transition-transform"
                  style={{ left: `${leftPercent}%` }}
                  title={`[${formatTime(n.second)}] ${n.note}`}
                />
              );
            })}
          </div>

          {/* Control Buttons */}
          <div className="flex items-center justify-between text-xs text-white">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={togglePlay}
                className="p-1.5 rounded-lg bg-lord-gold text-obsidian-primary hover:bg-lord-hover transition-colors font-bold"
              >
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
              </button>
              <span className="font-mono text-[11px] text-gray-300">
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>
            </div>

            <button
              type="button"
              onClick={() => {
                if (videoRef.current) {
                  videoRef.current.muted = !isMuted;
                  setIsMuted(!isMuted);
                }
              }}
              className="p-1.5 text-gray-300 hover:text-white"
            >
              {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>

      {/* Add Timestamped Note Box */}
      <form onSubmit={handleAddNote} className="flex gap-2">
        <div className="flex items-center gap-1.5 px-3 py-2 bg-obsidian-surface rounded-xl border border-gray-800 text-lord-gold font-mono text-xs shrink-0">
          <Clock className="w-3.5 h-3.5" />
          <span>{formatTime(currentTime)}</span>
        </div>
        <input
          type="text"
          placeholder={`اكتب ملاحظتك على هذه الثانية [${formatTime(currentTime)}] للمونتير أو المحلل...`}
          value={newNoteText}
          onChange={e => setNewNoteText(e.target.value)}
          className="flex-1 bg-obsidian-surface border border-gray-800 rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-lord-gold"
        />
        <Button type="submit" variant="gold" size="sm" className="rounded-xl">
          <Send className="w-3.5 h-3.5 ml-1" />
          <span>قيد الملاحظة</span>
        </Button>
      </form>

      {/* Notes List Timeline */}
      <div className="space-y-2.5">
        <span className="text-xs font-bold text-gray-400 block">
          سجل الملاحظات والتعديلات المطلوبة (انقر للقفز للثانية):
        </span>
        <div className="divide-y divide-gray-800/80 bg-obsidian-surface rounded-2xl border border-gray-800 max-h-48 overflow-y-auto">
          {notes.map(n => (
            <div
              key={n.id}
              onClick={() => seekTo(n.second)}
              className="p-3 text-xs flex items-center justify-between hover:bg-obsidian-primary/50 cursor-pointer transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="px-2 py-0.5 rounded-lg bg-lord-gold/15 text-lord-gold font-mono font-bold text-[11px] border border-lord-gold/30 shrink-0">
                  {formatTime(n.second)}
                </span>
                <div>
                  <strong className="text-white block">{n.author}</strong>
                  <p className="text-gray-300 text-[11px] mt-0.5">{n.note}</p>
                </div>
              </div>
              <span className="text-[10px] text-gray-500 font-mono shrink-0">{n.createdAt}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

