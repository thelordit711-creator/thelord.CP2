'use client';

import React from 'react';
import {
  Radio,
  Play,
  Settings,
  Video,
  Mic,
  FileText,
  Users
} from 'lucide-react';
import { Button } from '../ui/Button';

interface MeetingStandbyHubProps {
  meetingRoom: any;
  startWithVideo: boolean;
  setStartWithVideo: (val: boolean) => void;
  startWithAudio: boolean;
  setStartWithAudio: (val: boolean) => void;
  onStartBroadcast: () => void;
}

export const MeetingStandbyHub: React.FC<MeetingStandbyHubProps> = ({
  meetingRoom,
  startWithVideo,
  setStartWithVideo,
  startWithAudio,
  setStartWithAudio,
  onStartBroadcast
}) => {
  const participants = meetingRoom?.participants || [];

  return (
    <div className="rounded-3xl bg-gradient-to-b from-obsidian-surface via-obsidian-card to-obsidian-surface border-2 border-lord-gold/40 p-6 sm:p-10 shadow-[0_0_60px_rgba(0,0,0,0.85),0_0_25px_rgba(212,175,55,0.12)] space-y-8 animate-fade-in">
      <div className="flex flex-col md:flex-row items-center justify-between gap-6 border-b border-gray-800/80 pb-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-3xl bg-lord-gold/15 border-2 border-lord-gold/40 flex items-center justify-center text-lord-gold shadow-gold-glow shrink-0">
            <Radio className="w-8 h-8 text-lord-gold" />
          </div>
          <div className="space-y-1 text-right">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-3 py-1 rounded-full bg-gray-800/90 border border-gray-700 text-gray-300 font-bold text-xs flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-red-500" />
                <span>وضع الاستعداد: الغرفة متوقفة مؤقتاً</span>
              </span>
              <span className="px-2.5 py-1 rounded-full bg-lord-gold/15 border border-lord-gold/30 text-lord-gold text-xs font-mono font-bold">
                WEBRTC SECURE
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white">
              {meetingRoom?.title || 'قاعة الاجتماعات والبث المباشر THE LORD'}
            </h2>
            <p className="text-xs text-gray-400">
              الغرفة مغلقة ومؤمنة لحماية خصوصيتك ولن يتم تشغيل الكاميرا أو الميكروفون إلا عند الضغط على زر التشغيل.
            </p>
          </div>
        </div>

        {/* Start Room Button */}
        <div className="flex flex-col items-center sm:items-end gap-2 shrink-0">
          <Button
            variant="gold"
            size="lg"
            onClick={onStartBroadcast}
            className="rounded-2xl px-8 py-4 font-black text-base shadow-[0_0_30px_rgba(212,175,55,0.4)] hover:shadow-[0_0_45px_rgba(212,175,55,0.6)] flex items-center gap-2.5 transform hover:scale-105 active:scale-95 transition-all"
          >
            <Play className="w-5 h-5 fill-current" />
            <span>تشغيل الغرفة والانضمام للبث المباشر 🔴</span>
          </Button>
          <span className="text-[11px] text-gray-500 font-mono">
            انقر للبدء وبث الصوت والفيديو المباشر
          </span>
        </div>
      </div>

      {/* Pre-Join Hardware Checks & Meeting Overview Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* 1. Hardware Preferences */}
        <div className="p-4 rounded-2xl bg-obsidian-surface border border-gray-800 space-y-3">
          <span className="text-xs font-bold text-lord-gold uppercase tracking-wider flex items-center gap-2">
            <Settings className="w-4 h-4 text-lord-gold" />
            <span>تفضيلات الأجهزة عند بدء البث:</span>
          </span>
          <div className="space-y-2 pt-1">
            <label className="flex items-center justify-between p-2.5 rounded-xl bg-obsidian-card border border-gray-800/80 cursor-pointer hover:border-lord-gold/40 transition-colors">
              <span className="text-xs text-gray-300 font-bold flex items-center gap-2">
                <Video className="w-4 h-4 text-sky-400" />
                <span>تشغيل الكاميرا عند الدخول</span>
              </span>
              <input
                type="checkbox"
                checked={startWithVideo}
                onChange={(e) => setStartWithVideo(e.target.checked)}
                className="w-4 h-4 accent-amber-400 rounded"
              />
            </label>

            <label className="flex items-center justify-between p-2.5 rounded-xl bg-obsidian-card border border-gray-800/80 cursor-pointer hover:border-lord-gold/40 transition-colors">
              <span className="text-xs text-gray-300 font-bold flex items-center gap-2">
                <Mic className="w-4 h-4 text-emerald-400" />
                <span>تشغيل الميكروفون عند الدخول</span>
              </span>
              <input
                type="checkbox"
                checked={startWithAudio}
                onChange={(e) => setStartWithAudio(e.target.checked)}
                className="w-4 h-4 accent-amber-400 rounded"
              />
            </label>
          </div>
        </div>

        {/* 2. Agenda & Topic */}
        <div className="p-4 rounded-2xl bg-obsidian-surface border border-gray-800 space-y-2">
          <span className="text-xs font-bold text-lord-gold uppercase tracking-wider flex items-center gap-2">
            <FileText className="w-4 h-4 text-lord-gold" />
            <span>جدول الأعمال ومحاور اللقاء:</span>
          </span>
          <p className="text-xs text-gray-300 leading-relaxed bg-obsidian-card p-3 rounded-xl border border-gray-800 min-h-[72px]">
            {meetingRoom?.agenda || 'متابعة خطط التنفيذ، مناقشة نتائج العمل، واعتماد القرارات الاستراتيجية.'}
          </p>
        </div>

        {/* 3. Attendees & Room State */}
        <div className="p-4 rounded-2xl bg-obsidian-surface border border-gray-800 space-y-2">
          <span className="text-xs font-bold text-lord-gold uppercase tracking-wider flex items-center gap-2">
            <Users className="w-4 h-4 text-lord-gold" />
            <span>الأعضاء المسجلون بالقاعة ({participants.length}):</span>
          </span>
          <div className="p-3 rounded-xl bg-obsidian-card border border-gray-800 min-h-[72px] flex items-center gap-2 flex-wrap">
            {participants.length > 0 ? (
              participants.map((p: any, pIdx: number) => (
                <span
                  key={pIdx}
                  className="px-2.5 py-1 rounded-xl bg-gray-800/80 border border-gray-700 text-gray-200 text-xs font-bold flex items-center gap-1.5"
                >
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  <span>{p.fullName || 'عضو'}</span>
                </span>
              ))
            ) : (
              <span className="text-xs text-gray-500 font-mono">لا يوجد أعضاء داخل الغرفة حالياً</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
