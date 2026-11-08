'use client';

import React from 'react';
import { Send, Upload, Link as LinkIcon, Hash, Paperclip, X } from 'lucide-react';
import { Button } from '../../ui/Button';
import { DirectVoiceRecorder } from '../../voice/DirectVoiceRecorder';
import { ITaskStage, IMediaAttachment } from '@lord/shared-types';

interface StageSubmissionFormProps {
  stage: ITaskStage;
  inputValues: Record<string, any>;
  setInputValues: React.Dispatch<React.SetStateAction<Record<string, any>>>;
  generalTextSubmission: string;
  setGeneralTextSubmission: (val: string) => void;
  voiceNote: IMediaAttachment | null;
  setVoiceNote: (vn: IMediaAttachment | null) => void;
  uploadedAttachments: IMediaAttachment[];
  setUploadedAttachments: React.Dispatch<React.SetStateAction<IMediaAttachment[]>>;
  uploadingField: string | null;
  onFileUpload: (file: File, fieldLabel?: string) => Promise<void>;
  onVoiceUpload: (file: File, duration: number) => Promise<void>;
  onSubmitStage: () => Promise<void>;
  isSubmitting: boolean;
  isNeedsRevision: boolean;
}

export const StageSubmissionForm: React.FC<StageSubmissionFormProps> = ({
  stage,
  inputValues,
  setInputValues,
  generalTextSubmission,
  setGeneralTextSubmission,
  voiceNote,
  setVoiceNote,
  uploadedAttachments,
  setUploadedAttachments,
  uploadingField,
  onFileUpload,
  onVoiceUpload,
  onSubmitStage,
  isSubmitting,
  isNeedsRevision
}) => {
  return (
    <div className="space-y-4 pt-2">
      {/* Required Inputs Grid */}
      {stage.requiredInputs && stage.requiredInputs.length > 0 && (
        <div className="space-y-3">
          <span className="text-xs font-bold text-gray-300 block">
            المتطلبات الإلزامية لتسليم هذه المرحلة ({stage.requiredInputs.length}):
          </span>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {stage.requiredInputs.map((field, idx) => {
              const currentValue = inputValues[field.fieldLabel] ?? '';
              const isUploading = uploadingField === field.fieldLabel;

              return (
                <div
                  key={idx}
                  className="p-3.5 rounded-2xl bg-obsidian-card border border-gray-800 space-y-2 relative group hover:border-gray-700 transition-all"
                >
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-white flex items-center gap-1.5">
                      <span>{field.fieldLabel}</span>
                      {field.isMandatory && <span className="text-red-400 font-bold">*</span>}
                    </label>
                    <span className="text-[10px] text-gray-400 px-2 py-0.5 rounded-md bg-gray-800/80 font-mono">
                      {field.expectedType}
                    </span>
                  </div>

                  {field.expectedType === 'URL' && (
                    <div className="relative">
                      <input
                        type="url"
                        placeholder="https://..."
                        value={typeof currentValue === 'string' ? currentValue : ''}
                        onChange={(e) =>
                          setInputValues((prev) => ({
                            ...prev,
                            [field.fieldLabel]: e.target.value
                          }))
                        }
                        className="w-full bg-obsidian-surface border border-gray-700 rounded-xl px-3 py-2 text-xs text-white placeholder-gray-500 font-mono pr-8 focus:border-lord-gold focus:outline-none"
                      />
                      <LinkIcon className="w-3.5 h-3.5 text-gray-500 absolute right-2.5 top-2.5" />
                    </div>
                  )}

                  {field.expectedType === 'NUMBER' && (
                    <div className="relative">
                      <input
                        type="number"
                        placeholder="0.00"
                        value={currentValue ?? ''}
                        onChange={(e) =>
                          setInputValues((prev) => ({
                            ...prev,
                            [field.fieldLabel]: e.target.value === '' ? '' : Number(e.target.value)
                          }))
                        }
                        className="w-full bg-obsidian-surface border border-gray-700 rounded-xl px-3 py-2 text-xs text-white font-mono pr-8 focus:border-lord-gold focus:outline-none"
                      />
                      <Hash className="w-3.5 h-3.5 text-gray-500 absolute right-2.5 top-2.5" />
                    </div>
                  )}

                  {(field.expectedType === 'IMAGE' || field.expectedType === 'DOCUMENT') && (
                    <div>
                      {currentValue && typeof currentValue === 'object' && currentValue.fileUrl ? (
                        <div className="flex items-center justify-between p-2 rounded-xl bg-obsidian-surface border border-emerald-500/40">
                          <div className="flex items-center gap-2 truncate">
                            <Paperclip className="w-4 h-4 text-emerald-400 shrink-0" />
                            <span className="text-xs text-gray-200 truncate">
                              {currentValue.fileName || 'ملف مرفق بنجاح'}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() =>
                              setInputValues((prev) => ({
                                ...prev,
                                [field.fieldLabel]: ''
                              }))
                            }
                            className="p-1 text-gray-400 hover:text-red-400"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <label className="border border-dashed border-gray-700 hover:border-lord-gold rounded-xl p-3 flex flex-col items-center justify-center cursor-pointer transition-colors bg-obsidian-surface/50">
                          <Upload className="w-4 h-4 text-lord-gold mb-1" />
                          <span className="text-[11px] text-gray-300">
                            {isUploading ? 'جاري الرفع...' : 'انقر لرفع الملف أو الصورة'}
                          </span>
                          <input
                            type="file"
                            accept={field.expectedType === 'IMAGE' ? 'image/*' : '*/*'}
                            className="hidden"
                            disabled={isUploading}
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) onFileUpload(file, field.fieldLabel);
                            }}
                          />
                        </label>
                      )}
                    </div>
                  )}

                  {field.expectedType === 'TEXT' && (
                    <textarea
                      rows={2}
                      placeholder="اكتب التوضيح أو القيمة..."
                      value={typeof currentValue === 'string' ? currentValue : ''}
                      onChange={(e) =>
                        setInputValues((prev) => ({
                          ...prev,
                          [field.fieldLabel]: e.target.value
                        }))
                      }
                      className="w-full bg-obsidian-surface border border-gray-700 rounded-xl p-2.5 text-xs text-white placeholder-gray-500 focus:border-lord-gold focus:outline-none resize-none"
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* General Deliverable Note */}
      <div className="space-y-1.5">
        <label className="text-xs font-bold text-gray-300 block">
          تقرير الإنجاز والشرح التنفيذي العام (اختياري):
        </label>
        <textarea
          rows={3}
          value={generalTextSubmission}
          onChange={(e) => setGeneralTextSubmission(e.target.value)}
          placeholder="اكتب هنا أي تفاصيل إضافية للمسؤول حول كيفية إنجاز المرحلة..."
          className="w-full bg-obsidian-card border border-gray-800 rounded-2xl p-3 text-xs text-white placeholder-gray-500 focus:border-lord-gold focus:outline-none resize-none"
        />
      </div>

      {/* Voice Recorder & Attachments row */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3.5 bg-obsidian-card/70 rounded-2xl border border-gray-800">
        <div className="flex items-center gap-2">
          <DirectVoiceRecorder
            onRecordingComplete={(audio) => {
              const file = new File([audio.blob], `voice_${Date.now()}.webm`, { type: 'audio/webm' });
              onVoiceUpload(file, audio.durationInSeconds);
            }}
          />
          {voiceNote && (
            <span className="text-xs text-emerald-400 font-bold flex items-center gap-1">
              ✓ تم إرفاق تسجيل صوتي
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 justify-end">
          <label className="px-3 py-2 rounded-xl bg-obsidian-surface border border-gray-700 hover:border-lord-gold text-xs font-bold text-gray-300 hover:text-white cursor-pointer flex items-center gap-1.5 transition-colors">
            <Upload className="w-3.5 h-3.5 text-lord-gold" />
            <span>إرفاق وثيقة إضافية</span>
            <input
              type="file"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) onFileUpload(file);
              }}
            />
          </label>

          <Button
            type="button"
            variant="gold"
            size="md"
            disabled={isSubmitting}
            onClick={onSubmitStage}
            className="flex items-center gap-2 font-bold px-5"
          >
            <Send className="w-4 h-4 ml-1" />
            <span>{isSubmitting ? 'جاري التسليم...' : isNeedsRevision ? 'إعادة تسليم المرحلة المعدلة ⚡' : 'تسليم المرحلة للاعتماد 🚀'}</span>
          </Button>
        </div>
      </div>

      {uploadedAttachments.length > 0 && (
        <div className="flex flex-wrap gap-2 pt-1">
          {uploadedAttachments.map((att, i) => (
            <div
              key={i}
              className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-obsidian-surface border border-gray-700 text-xs text-gray-300"
            >
              <Paperclip className="w-3.5 h-3.5 text-lord-gold" />
              <span className="truncate max-w-[150px]">{att.fileName}</span>
              <button
                type="button"
                onClick={() => setUploadedAttachments((prev) => prev.filter((_, idx) => idx !== i))}
                className="text-gray-500 hover:text-red-400 mr-1"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
