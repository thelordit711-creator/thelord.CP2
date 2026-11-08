'use client';

import React from 'react';
import { CheckCircle, Check, ExternalLink, Paperclip, Volume2 } from 'lucide-react';
import { ITaskStage } from '@lord/shared-types';

interface SubmittedDeliverablesViewProps {
  stage: ITaskStage;
  isApproved: boolean;
  onOpenLightbox: (image: { url: string; alt?: string }) => void;
}

export const SubmittedDeliverablesView: React.FC<SubmittedDeliverablesViewProps> = ({
  stage,
  isApproved,
  onOpenLightbox
}) => {
  return (
    <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-obsidian-card via-obsidian-surface to-obsidian-card border-2 border-emerald-500/35 space-y-3.5 shadow-[0_4px_20px_rgba(16,185,129,0.08)]">
      <div className="flex items-center justify-between border-b border-gray-800/80 pb-2.5">
        <span className="text-xs font-bold text-white flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-400 stroke-[2.5]" />
          <span className="text-emerald-300">المخرجات والإثباتات المسلمة من الموظف:</span>
        </span>
        <span
          className={`text-[10px] font-black px-2.5 py-0.5 rounded-full border ${
            isApproved
              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-xs'
              : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
          }`}
        >
          {isApproved ? 'معتمدة رسمياً من الإدارة ✓' : 'مقدمة للمراجعة والتدقيق ⏳'}
        </span>
      </div>

      {/* List Submitted Inputs */}
      {stage.requiredInputs && stage.requiredInputs.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {stage.requiredInputs.map((inp, i) => {
            const val = inp.employeeSubmission;
            const rawText = val?.textOrUrlValue?.trim() || '';
            const hasMeaningfulText = rawText && rawText !== '-';
            const hasVal =
              hasMeaningfulText ||
              inp.employeeSubmission?.numberValue != null ||
              Boolean(inp.employeeSubmission?.mediaAttachment);

            if (!hasVal) {
              return (
                <div
                  key={i}
                  className="p-3 rounded-xl bg-obsidian-card/60 border border-gray-800/80 flex items-center justify-between text-gray-400"
                >
                  <span className="text-xs font-semibold text-gray-300 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    <span>{inp.fieldLabel}</span>
                  </span>
                  <span className="text-[10px] text-emerald-400/80 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-md font-medium">
                    مستوفى ضمن التقرير الرئيسي ✓
                  </span>
                </div>
              );
            }

            const isUrl = rawText.startsWith('http');
            const isMedia = Boolean(val?.mediaAttachment);

            return (
              <div
                key={i}
                className="p-3.5 rounded-xl bg-obsidian-surface border border-gray-700/80 hover:border-emerald-500/40 transition-all space-y-2 shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <span className="text-lord-gold text-xs font-bold flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5 text-emerald-400 stroke-[3]" />
                    <span>{inp.fieldLabel}</span>
                  </span>
                  {val?.numberValue != null && (
                    <span className="text-[10px] text-gray-400 font-mono">قيمة رقمية</span>
                  )}
                </div>

                {isUrl ? (
                  <a
                    href={rawText}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-2 rounded-lg bg-cyber-blue/10 border border-cyber-blue/30 text-cyber-blue hover:underline flex items-center gap-2 font-mono text-xs break-all group transition-colors"
                  >
                    <ExternalLink className="w-3.5 h-3.5 shrink-0 group-hover:scale-110 transition-transform" />
                    <span className="truncate">{rawText}</span>
                  </a>
                ) : isMedia ? (
                  <div>
                    {val!.mediaAttachment!.fileType === 'IMAGE' ? (
                      <button
                        type="button"
                        onClick={() =>
                          onOpenLightbox({
                            url: val!.mediaAttachment!.fileUrl,
                            alt: val!.mediaAttachment!.fileName
                          })
                        }
                        className="group relative block cursor-zoom-in rounded-xl overflow-hidden border border-gray-700 hover:border-lord-gold transition-all"
                        title="انقر لتكبير ومعاينة الصورة"
                      >
                        <img
                          src={val!.mediaAttachment!.fileUrl}
                          alt="مرفق الإنجاز"
                          className="w-full h-32 object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5 text-white font-bold text-xs">
                          <span>تكبير المعاينة</span>
                        </div>
                      </button>
                    ) : (
                      <a
                        href={val!.mediaAttachment!.fileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3 py-2 rounded-xl bg-obsidian-card border border-gray-700 hover:border-lord-gold text-xs font-bold text-gray-200 hover:text-white flex items-center gap-2 transition-all shadow-sm"
                      >
                        <Paperclip className="w-4 h-4 text-lord-gold shrink-0" />
                        <span className="truncate max-w-[200px]">
                          {val!.mediaAttachment!.fileName || 'مستند مرفق'}
                        </span>
                        <ExternalLink className="w-3 h-3 text-gray-500 mr-auto shrink-0" />
                      </a>
                    )}
                  </div>
                ) : val?.numberValue != null ? (
                  <div className="text-sm font-mono font-black text-emerald-400 bg-obsidian-card px-3 py-1.5 rounded-lg border border-gray-800 inline-block">
                    {val.numberValue}
                  </div>
                ) : (
                  <div className="p-3 rounded-xl bg-obsidian-card border border-gray-800 text-gray-100 font-semibold text-xs leading-relaxed break-words shadow-inner">
                    {rawText}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Voice Note Player */}
      {stage.employeeVoiceNote && (
        <div className="p-3 rounded-xl bg-obsidian-card border border-cyber-blue/30 flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-cyber-blue/15 border border-cyber-blue/30 flex items-center justify-center text-cyber-blue shrink-0">
            <Volume2 className="w-4 h-4" />
          </div>
          <div className="flex-1 min-w-0">
            <span className="text-gray-300 text-xs font-bold block mb-1">تسجيل صوتي مرفق بالإنجاز:</span>
            <audio controls src={stage.employeeVoiceNote.fileUrl} className="h-8 w-full max-w-md" />
          </div>
        </div>
      )}

      {/* Additional Attachments */}
      {stage.additionalAttachments && stage.additionalAttachments.length > 0 && (
        <div className="space-y-1.5 pt-1">
          <span className="text-[11px] text-gray-400 block font-semibold">مرفقات ووثائق إضافية:</span>
          <div className="flex flex-wrap gap-2">
            {stage.additionalAttachments.map((att: any, i: number) => (
              <a
                key={i}
                href={att.fileUrl}
                target="_blank"
                rel="noreferrer"
                className="px-3 py-1.5 rounded-xl bg-obsidian-card border border-gray-700/80 hover:border-emerald-500/50 text-xs font-bold text-gray-200 hover:text-white flex items-center gap-2 transition-all shadow-xs"
              >
                <Paperclip className="w-3.5 h-3.5 text-emerald-400" />
                <span className="truncate max-w-[180px]">{att.fileName || 'ملف مرفق'}</span>
                <ExternalLink className="w-3 h-3 text-gray-500" />
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
