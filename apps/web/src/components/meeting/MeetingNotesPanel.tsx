'use client';

import React from 'react';
import {
  FileText,
  Sparkles,
  Save,
  Loader2
} from 'lucide-react';
import { Button } from '../ui/Button';

interface MeetingNotesPanelProps {
  meetingNotes: string;
  setMeetingNotes: (notes: string) => void;
  onSaveNotes: () => void;
  isSavingNotes: boolean;
  onConvertNotesToTasks: () => void;
  isConverting: boolean;
}

export const MeetingNotesPanel: React.FC<MeetingNotesPanelProps> = ({
  meetingNotes,
  setMeetingNotes,
  onSaveNotes,
  isSavingNotes,
  onConvertNotesToTasks,
  isConverting
}) => {
  return (
    <div className="bg-obsidian-surface border border-obsidian-border rounded-3xl p-4 sm:p-5 flex flex-col justify-between space-y-4 shadow-xl">
      <div className="space-y-3">
        <div className="flex items-center justify-between border-b border-gray-800 pb-3">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-lord-gold" />
            <h3 className="text-sm font-bold text-white">محضر وتوجيهات الاجتماع</h3>
          </div>
          <span className="text-[10px] text-emerald-400 font-mono bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
            مزامنة لحظية
          </span>
        </div>

        <p className="text-[11px] text-gray-400 leading-relaxed">
          اكتب النقاط الرئيسية، الملاحظات، والتكليفات الصادرة أثناء الاجتماع. يتم حفظ المحضر لحظياً وتوليد المهام عبر الذكاء الاصطناعي.
        </p>

        <div className="relative">
          <textarea
            rows={12}
            value={meetingNotes}
            onChange={(e) => setMeetingNotes(e.target.value)}
            placeholder="اكتب التوجيهات، قرارات الاجتماع، والمهام الصادرة..."
            className="w-full bg-obsidian-card border border-gray-800 rounded-2xl p-4 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-lord-gold transition-colors resize-none leading-relaxed"
          />
          <div className="absolute bottom-3 left-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onSaveNotes}
              disabled={isSavingNotes}
              className="text-xs rounded-xl flex items-center gap-1.5 border-gray-700 bg-obsidian-surface/80 backdrop-blur-sm"
            >
              {isSavingNotes ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
              <span>حفظ المحضر</span>
            </Button>
          </div>
        </div>
      </div>

      {/* AI Meeting-to-Tasks Conversion Button */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-lord-gold/30 space-y-2.5">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-lord-gold animate-spin-slow" />
          <span className="text-xs font-bold text-white">تحويل المحضر إلى مهام آلية (AI)</span>
        </div>
        <p className="text-[10px] text-gray-400">
          يقوم TheLordAI بتحليل محضر الاجتماع، استخراج التكليفات والمراحل، وتوزيعها على الكادر في محرك المهام فوراً.
        </p>
        <Button
          type="button"
          variant="gold"
          size="sm"
          onClick={onConvertNotesToTasks}
          disabled={isConverting || !meetingNotes.trim()}
          className="w-full rounded-xl flex items-center justify-center gap-2 shadow-gold-glow font-bold text-xs py-2.5"
        >
          {isConverting ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>جاري التحليل وتوليد المهام...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-3.5 h-3.5" />
              <span>استخراج واعتماد المهام في النظام 🚀</span>
            </>
          )}
        </Button>
      </div>
    </div>
  );
};
