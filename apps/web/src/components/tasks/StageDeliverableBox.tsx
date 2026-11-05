'use client';

import React, { useState } from 'react';
import { ITaskStage, IMediaAttachment } from '@lord/shared-types';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { DirectVoiceRecorder } from '../voice/DirectVoiceRecorder';
import {
  CheckCircle,
  Clock,
  Lock,
  Send,
  AlertTriangle,
  Upload,
  Link as LinkIcon,
  FileText,
  Hash,
  Paperclip,
  Check,
  X,
  Volume2,
  ExternalLink,
  Sparkles,
  RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';
import { useSubmitTaskStageMutation, useReviewTaskStageMutation } from '../../store/api/tasksApi';

interface StageDeliverableBoxProps {
  taskId: string;
  stage: ITaskStage;
  canSubmit?: boolean;
  isAdmin?: boolean;
  onRefresh?: () => void;
}

export const StageDeliverableBox: React.FC<StageDeliverableBoxProps> = ({
  taskId,
  stage,
  canSubmit = true,
  isAdmin = false,
  onRefresh
}) => {
  const [submitStage, { isLoading: isSubmitting }] = useSubmitTaskStageMutation();
  const [reviewStage, { isLoading: isReviewing }] = useReviewTaskStageMutation();

  // Dynamic input values mapped by fieldLabel
  const [inputValues, setInputValues] = useState<Record<string, any>>(() => {
    const initial: Record<string, any> = {};
    if (stage.requiredInputs) {
      stage.requiredInputs.forEach((field) => {
        if (field.employeeSubmission) {
          initial[field.fieldLabel] =
            field.employeeSubmission.textOrUrlValue ||
            field.employeeSubmission.numberValue ||
            field.employeeSubmission.mediaAttachment ||
            '';
        }
      });
    }
    return initial;
  });

  const [generalTextSubmission, setGeneralTextSubmission] = useState('');
  const [voiceNote, setVoiceNote] = useState<IMediaAttachment | null>(null);
  const [uploadedAttachments, setUploadedAttachments] = useState<IMediaAttachment[]>([]);
  const [uploadingField, setUploadingField] = useState<string | null>(null);

  // Admin Review Feedback State
  const [adminNote, setAdminNote] = useState('');
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);

  // File Upload Helper
  const handleFileUpload = async (file: File, fieldLabel?: string) => {
    try {
      if (fieldLabel) setUploadingField(fieldLabel);
      else setUploadingField('GENERAL');

      const formData = new FormData();
      formData.append('file', file);
      const token = typeof window !== 'undefined' ? localStorage.getItem('lord_auth_token') : '';
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';

      const res = await fetch(`${apiUrl}/upload`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: formData
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'فشل رفع الملف');
      }

      const media: IMediaAttachment = {
        fileType: data.data.fileType,
        fileName: data.data.fileName,
        fileUrl: data.data.fileUrl,
        fileSizeInBytes: data.data.sizeInBytes || data.data.fileSizeInBytes
      };

      if (fieldLabel) {
        setInputValues((prev) => ({ ...prev, [fieldLabel]: media }));
        toast.success(`تم رفع ملف [${fieldLabel}] بنجاح!`);
      } else {
        setUploadedAttachments((prev) => [...prev, media]);
        toast.success('تم إرفاق الملف بنجاح!');
      }
    } catch (err: any) {
      toast.error(err.message || 'حدث خطأ أثناء رفع الملف');
    } finally {
      setUploadingField(null);
    }
  };

  // Submit Stage Deliverables
  const handleSubmitDeliverables = async (e: React.FormEvent) => {
    e.preventDefault();

    const formattedInputs: any[] = [];

    // Map required inputs
    if (stage.requiredInputs && stage.requiredInputs.length > 0) {
      for (const field of stage.requiredInputs) {
        const val = inputValues[field.fieldLabel];
        if (field.isMandatory && !val && !generalTextSubmission) {
          toast.warning(`يرجى ملء المتطلب الإلزامي: ${field.fieldLabel}`);
          return;
        }

        const isMedia = typeof val === 'object' && val?.fileUrl;
        formattedInputs.push({
          fieldLabel: field.fieldLabel,
          textOrUrlValue: isMedia ? val.fileUrl : typeof val === 'string' ? val : undefined,
          numberValue: typeof val === 'number' ? val : undefined,
          mediaAttachment: isMedia ? val : undefined
        });
      }
    }

    // Include general text if provided or if no inputs were defined
    if (generalTextSubmission.trim() || formattedInputs.length === 0) {
      formattedInputs.push({
        fieldLabel: 'تقرير وإثبات التنفيذ',
        textOrUrlValue: generalTextSubmission.trim() || 'تم استيفاء متطلبات المرحلة بنجاح'
      });
    }

    try {
      await submitStage({
        taskId,
        stageOrder: stage.stageOrder,
        data: {
          requiredInputs: formattedInputs,
          additionalAttachments: uploadedAttachments,
          employeeVoiceNote: voiceNote || undefined
        }
      }).unwrap();

      toast.success(`🚀 تم إرسال متطلبات المرحلة ${stage.stageOrder} بنجاح للمراجعة والاعتماد!`);
      setGeneralTextSubmission('');
      setVoiceNote(null);
      setUploadedAttachments([]);
      onRefresh?.();
    } catch (err: any) {
      toast.error(err?.data?.error || 'فشل في إرسال متطلبات المرحلة');
    }
  };

  // Admin Review Decision
  const handleAdminDecision = async (action: 'APPROVE' | 'REQUEST_REVISION') => {
    try {
      await reviewStage({
        taskId,
        stageOrder: stage.stageOrder,
        data: {
          action,
          note: adminNote.trim() || (action === 'APPROVE' ? 'تم اعتماد المرحلة بنجاح' : 'يرجى مراجعة وتعديل المخرجات')
        }
      }).unwrap();

      toast.success(
        action === 'APPROVE'
          ? `✓ تم اعتماد المرحلة ${stage.stageOrder} وفتح المرحلة التالية تلقائياً!`
          : `↩ تم طلب التعديل وإشعار الموظف المسؤول!`
      );
      setIsReviewModalOpen(false);
      setAdminNote('');
      onRefresh?.();
    } catch (err: any) {
      toast.error(err?.data?.error || 'حدث خطأ أثناء تقييم المرحلة');
    }
  };

  const isLocked = stage.status === 'LOCKED';
  const isInProgress = stage.status === 'IN_PROGRESS';
  const isSubmitted = stage.status === 'SUBMITTED_FOR_REVIEW';
  const isApproved = stage.status === 'APPROVED';
  const isNeedsRevision = stage.status === 'NEEDS_REVISION';

  return (
    <div
      className={`rounded-2xl border transition-all text-xs overflow-hidden ${
        isApproved
          ? 'bg-emerald-500/5 border-emerald-500/30'
          : isInProgress
          ? 'bg-lord-gold/5 border-lord-gold/40 shadow-lg shadow-lord-gold/5'
          : isSubmitted
          ? 'bg-amber-500/5 border-amber-500/40'
          : isNeedsRevision
          ? 'bg-red-500/5 border-red-500/40'
          : 'bg-obsidian-card border-gray-800 opacity-60'
      }`}
    >
      {/* Stage Header */}
      <div className="p-4 flex items-center justify-between border-b border-gray-800/60 flex-wrap gap-2">
        <div className="flex items-center gap-2.5">
          <span
            className={`w-7 h-7 rounded-xl flex items-center justify-center font-black text-xs ${
              isApproved
                ? 'bg-emerald-500 text-obsidian-primary'
                : isInProgress
                ? 'bg-lord-gold text-obsidian-primary shadow-gold-glow animate-pulse'
                : isSubmitted
                ? 'bg-amber-500 text-obsidian-primary'
                : isNeedsRevision
                ? 'bg-red-500 text-white'
                : 'bg-gray-800 text-gray-400'
            }`}
          >
            {isApproved ? <Check className="w-4 h-4 stroke-[3]" /> : isLocked ? <Lock className="w-3.5 h-3.5" /> : stage.stageOrder}
          </span>

          <div>
            <h4 className="font-bold text-white text-sm flex items-center gap-1.5">
              <span>{stage.stageTitle}</span>
              {isInProgress && (
                <span className="px-2 py-0.5 rounded-full bg-lord-gold/20 text-lord-gold text-[10px] font-bold border border-lord-gold/30">
                  المرحلة النشطة الآن ⚡
                </span>
              )}
            </h4>
            <span className="text-[11px] text-gray-400">
              المرحلة {stage.stageOrder} من المسار التنفيذي
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isApproved && (
            <Badge variant="disbursed" className="flex items-center gap-1 font-bold">
              <CheckCircle className="w-3.5 h-3.5" />
              <span>معتمدة ومكتملة ✓</span>
            </Badge>
          )}
          {isInProgress && (
            <Badge variant="gold" className="flex items-center gap-1 font-bold animate-pulse">
              <Clock className="w-3.5 h-3.5" />
              <span>قيد العمل والتنفيذ</span>
            </Badge>
          )}
          {isSubmitted && (
            <Badge variant="processing" className="flex items-center gap-1 font-bold">
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              <span>تم إرسال المتطلبات (بانتظار المراجعة)</span>
            </Badge>
          )}
          {isNeedsRevision && (
            <Badge variant="neutral" className="flex items-center gap-1 font-bold bg-red-500/20 text-red-300 border-red-500/40">
              <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
              <span>مطلوب تعديل المخرجات</span>
            </Badge>
          )}
          {isLocked && (
            <span className="px-2.5 py-1 rounded-xl bg-gray-800/80 text-gray-400 text-[11px] flex items-center gap-1">
              <Lock className="w-3 h-3" />
              <span>مغلقة</span>
            </span>
          )}
        </div>
      </div>

      {/* Stage Body */}
      <div className="p-4 space-y-4">
        {/* Stage Instructions */}
        {stage.instructions && (
          <div className="p-3 bg-obsidian-primary/60 rounded-xl border border-gray-800 text-[11px] text-gray-300 leading-relaxed">
            <span className="text-lord-gold font-bold block mb-1">تعليمات وشروط المرحلة:</span>
            {stage.instructions}
          </div>
        )}

        {/* Needs Revision Warning Banner */}
        {isNeedsRevision && stage.adminFeedback?.note && (
          <div className="p-3.5 rounded-xl bg-red-500/15 border border-red-500/30 text-red-300 text-xs flex items-start gap-2.5">
            <AlertTriangle className="w-5 h-5 shrink-0 text-red-400 mt-0.5" />
            <div>
              <strong className="block font-bold mb-0.5">ملاحظات المسؤول المطلوب تعديلها:</strong>
              <p className="leading-relaxed">{stage.adminFeedback.note}</p>
            </div>
          </div>
        )}

        {/* Display Submitted Deliverables (if Submitted or Approved) */}
        {(isSubmitted || isApproved) && (
          <div className="p-3.5 rounded-xl bg-obsidian-primary/80 border border-gray-800 space-y-3">
            <span className="text-xs font-bold text-gray-300 flex items-center gap-1.5">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
              <span>المتطلبات والمخرجات المرسلة من الموظف:</span>
            </span>

            {/* List Submitted Inputs */}
            {stage.requiredInputs && stage.requiredInputs.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 pt-1">
                {stage.requiredInputs.map((inp, i) => (
                  <div key={i} className="p-2.5 rounded-lg bg-obsidian-surface border border-gray-800">
                    <span className="text-gray-400 text-[10px] block mb-1">{inp.fieldLabel}:</span>
                    {inp.employeeSubmission?.textOrUrlValue?.startsWith('http') ? (
                      <a
                        href={inp.employeeSubmission.textOrUrlValue}
                        target="_blank"
                        rel="noreferrer"
                        className="text-cyber-blue hover:underline flex items-center gap-1 font-mono text-xs break-all"
                      >
                        <ExternalLink className="w-3 h-3 shrink-0" />
                        <span>{inp.employeeSubmission.textOrUrlValue}</span>
                      </a>
                    ) : inp.employeeSubmission?.mediaAttachment ? (
                      <div className="flex items-center gap-2">
                        {inp.employeeSubmission.mediaAttachment.fileType === 'IMAGE' ? (
                          <a
                            href={inp.employeeSubmission.mediaAttachment.fileUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="block"
                          >
                            <img
                              src={inp.employeeSubmission.mediaAttachment.fileUrl}
                              alt="مرفق"
                              className="w-16 h-16 object-cover rounded-lg border border-gray-700 hover:scale-105 transition-all"
                            />
                          </a>
                        ) : (
                          <a
                            href={inp.employeeSubmission.mediaAttachment.fileUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-lord-gold hover:underline flex items-center gap-1 font-bold text-xs"
                          >
                            <Paperclip className="w-3.5 h-3.5" />
                            <span>{inp.employeeSubmission.mediaAttachment.fileName}</span>
                          </a>
                        )}
                      </div>
                    ) : (
                      <span className="text-white font-medium break-words text-xs">
                        {inp.employeeSubmission?.textOrUrlValue || inp.employeeSubmission?.numberValue || '—'}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            ) : null}

            {/* Voice Note Player */}
            {stage.employeeVoiceNote && (
              <div className="p-2.5 rounded-lg bg-obsidian-surface border border-gray-800 flex items-center gap-3">
                <Volume2 className="w-4 h-4 text-cyber-blue shrink-0" />
                <span className="text-gray-300 text-xs">تسجيل صوتي مرفق:</span>
                <audio controls src={stage.employeeVoiceNote.fileUrl} className="h-8 flex-1" />
              </div>
            )}
          </div>
        )}

        {/* ============================================================== */}
        {/* SUBMISSION FORM: Available when IN_PROGRESS or NEEDS_REVISION */}
        {/* ============================================================== */}
        {(isInProgress || isNeedsRevision) && canSubmit && (
          <form onSubmit={handleSubmitDeliverables} className="mt-3 pt-3 border-t border-gray-800 space-y-3.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-lord-gold flex items-center gap-1.5">
                <Send className="w-3.5 h-3.5" />
                <span>إرسال متطلبات ومخرجات هذه المرحلة:</span>
              </span>
              <span className="text-[10px] text-gray-500">
                يرجى إرفاق الإثباتات والروابط ليتمكن المسؤول من اعتمادها
              </span>
            </div>

            {/* Dynamic Specific Inputs */}
            {stage.requiredInputs && stage.requiredInputs.length > 0 ? (
              <div className="space-y-3">
                {stage.requiredInputs.map((field, idx) => (
                  <div key={idx} className="space-y-1">
                    <label className="text-xs font-semibold text-gray-300 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        {field.expectedType === 'URL' && <LinkIcon className="w-3 h-3 text-cyber-blue" />}
                        {field.expectedType === 'NUMBER' && <Hash className="w-3 h-3 text-lord-gold" />}
                        {(field.expectedType === 'IMAGE' || field.expectedType === 'DOCUMENT' || field.expectedType === 'ANY_FILE') && (
                          <Paperclip className="w-3 h-3 text-emerald-400" />
                        )}
                        {field.expectedType === 'TEXT' && <FileText className="w-3 h-3 text-purple-400" />}
                        <span>{field.fieldLabel}</span>
                      </span>
                      {field.isMandatory ? (
                        <span className="text-[10px] text-amber-400 font-bold">إلزامي *</span>
                      ) : (
                        <span className="text-[10px] text-gray-500">اختياري</span>
                      )}
                    </label>

                    {/* Input based on expectedType */}
                    {field.expectedType === 'URL' ? (
                      <input
                        type="url"
                        placeholder="https://..."
                        value={inputValues[field.fieldLabel] || ''}
                        onChange={(e) => setInputValues({ ...inputValues, [field.fieldLabel]: e.target.value })}
                        className="w-full bg-obsidian-primary border border-gray-700 focus:border-lord-gold rounded-xl px-3 py-2 text-xs text-white"
                      />
                    ) : field.expectedType === 'NUMBER' ? (
                      <input
                        type="number"
                        placeholder="0"
                        value={inputValues[field.fieldLabel] || ''}
                        onChange={(e) => setInputValues({ ...inputValues, [field.fieldLabel]: Number(e.target.value) })}
                        className="w-full bg-obsidian-primary border border-gray-700 focus:border-lord-gold rounded-xl px-3 py-2 text-xs text-white"
                      />
                    ) : field.expectedType === 'IMAGE' || field.expectedType === 'DOCUMENT' || field.expectedType === 'ANY_FILE' || field.expectedType === 'VIDEO' ? (
                      <div className="flex items-center gap-3">
                        <label className="cursor-pointer px-3.5 py-2 rounded-xl bg-obsidian-surface border border-gray-700 hover:border-lord-gold text-xs font-bold text-gray-300 hover:text-white transition-all flex items-center gap-1.5">
                          <Upload className="w-3.5 h-3.5 text-lord-gold" />
                          <span>{uploadingField === field.fieldLabel ? 'جارٍ الرفع...' : 'رفع ملف / صورة'}</span>
                          <input
                            type="file"
                            className="hidden"
                            onChange={(e) => {
                              if (e.target.files?.[0]) handleFileUpload(e.target.files[0], field.fieldLabel);
                            }}
                          />
                        </label>
                        {inputValues[field.fieldLabel]?.fileUrl && (
                          <div className="flex items-center gap-2 p-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs">
                            <Check className="w-3 h-3 text-emerald-400" />
                            <span className="truncate max-w-[200px]">
                              {inputValues[field.fieldLabel]?.fileName || 'تم الرفع بنجاح'}
                            </span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <input
                        type="text"
                        placeholder={`أدخل ${field.fieldLabel}...`}
                        value={inputValues[field.fieldLabel] || ''}
                        onChange={(e) => setInputValues({ ...inputValues, [field.fieldLabel]: e.target.value })}
                        className="w-full bg-obsidian-primary border border-gray-700 focus:border-lord-gold rounded-xl px-3 py-2 text-xs text-white"
                      />
                    )}
                  </div>
                ))}
              </div>
            ) : null}

            {/* General Text / Summary Report */}
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1">
                تقرير الإنجاز أو روابط النشر والملاحظات:
              </label>
              <textarea
                rows={3}
                placeholder="اكتب التقرير التنفيذي، روابط المنشورات، إحصائيات المشاهدات، أو نتائج العمل..."
                value={generalTextSubmission}
                onChange={(e) => setGeneralTextSubmission(e.target.value)}
                className="w-full bg-obsidian-primary border border-gray-700 focus:border-lord-gold rounded-xl p-3 text-xs text-white focus:outline-none"
              />
            </div>

            {/* Attachments & Voice Recorder */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1.5">
                  إرفاق ملفات إضافية أو صور 📎:
                </label>
                <div className="flex items-center gap-2">
                  <label className="cursor-pointer px-3 py-1.5 rounded-xl bg-obsidian-surface border border-gray-700 hover:border-gray-500 text-xs text-gray-300 hover:text-white transition-all flex items-center gap-1.5">
                    <Upload className="w-3.5 h-3.5 text-gray-400" />
                    <span>{uploadingField === 'GENERAL' ? 'جارٍ الرفع...' : 'إرفاق ملف/صورة'}</span>
                    <input
                      type="file"
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files?.[0]) handleFileUpload(e.target.files[0]);
                      }}
                    />
                  </label>
                  {uploadedAttachments.length > 0 && (
                    <span className="text-[11px] text-lord-gold font-bold">
                      {uploadedAttachments.length} ملفات مرفقة
                    </span>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1.5">
                  إرفاق رسالة صوتية للمرحلة 🎙️:
                </label>
                <DirectVoiceRecorder
                  onRecordingComplete={(data) => {
                    setVoiceNote({
                      fileType: 'VOICE_NOTE',
                      fileName: `voice-note-${Date.now()}.webm`,
                      fileUrl: data.previewUrl,
                      durationInSeconds: data.durationInSeconds
                    });
                    toast.success('تم تسجيل الرسالة الصوتية بنجاح!');
                  }}
                />
              </div>
            </div>

            {/* Submit Action Button */}
            <div className="pt-2">
              <Button
                type="submit"
                variant="gold"
                size="md"
                isLoading={isSubmitting}
                className="w-full font-bold shadow-gold-glow flex items-center justify-center gap-2"
              >
                <Send className="w-4 h-4 ml-1" />
                <span>إرسال متطلبات المرحلة للمراجعة والاعتماد</span>
              </Button>
            </div>
          </form>
        )}

        {/* ============================================================== */}
        {/* ADMIN REVIEW BAR: Available to Admins when SUBMITTED_FOR_REVIEW */}
        {/* ============================================================== */}
        {isAdmin && isSubmitted && (
          <div className="mt-3 pt-3 border-t border-amber-500/30 p-3.5 rounded-xl bg-amber-500/10 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span>لوحة تقييم المسؤول (اعتماد المرحلة أو طلب تعديل):</span>
              </span>
            </div>

            <div>
              <input
                type="text"
                placeholder="ملاحظات المسؤول (اختياري عند الاعتماد، وإلزامي عند طلب تعديل)..."
                value={adminNote}
                onChange={(e) => setAdminNote(e.target.value)}
                className="w-full bg-obsidian-primary border border-gray-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
              />
            </div>

            <div className="flex items-center justify-end gap-2.5">
              <button
                type="button"
                disabled={isReviewing}
                onClick={() => handleAdminDecision('REQUEST_REVISION')}
                className="px-3 py-1.5 rounded-xl bg-red-500/20 text-red-300 border border-red-500/40 hover:bg-red-500/30 text-xs font-bold transition-all flex items-center gap-1.5"
              >
                <X className="w-3.5 h-3.5" />
                <span>طلب تعديل ↩</span>
              </button>

              <button
                type="button"
                disabled={isReviewing}
                onClick={() => handleAdminDecision('APPROVE')}
                className="px-4 py-1.5 rounded-xl bg-emerald-500 text-obsidian-primary hover:bg-emerald-400 text-xs font-bold shadow-lg transition-all flex items-center gap-1.5"
              >
                <Check className="w-4 h-4 stroke-[3]" />
                <span>اعتماد المرحلة وفتح التالية ✓</span>
              </button>
            </div>
          </div>
        )}

        {/* LOCKED BANNER */}
        {isLocked && (
          <div className="p-3 rounded-xl bg-gray-900/60 border border-gray-800 text-gray-500 text-center text-xs flex items-center justify-center gap-2">
            <Lock className="w-3.5 h-3.5" />
            <span>هذه المرحلة مقفلة — ستُفتح للموظف تلقائياً بعد اعتماد المرحلة السابقة ({stage.stageOrder - 1}).</span>
          </div>
        )}
      </div>
    </div>
  );
};
