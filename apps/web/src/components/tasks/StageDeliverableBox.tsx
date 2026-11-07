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
  RefreshCw,
  Hourglass,
  Quote,
  FileCheck2,
  ShieldCheck,
  RotateCcw,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { toast } from 'sonner';
import { useSubmitTaskStageMutation, useReviewTaskStageMutation } from '../../store/api/tasksApi';
import { ImageLightboxModal } from '../ui/ImageLightboxModal';

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
  const [lightboxImage, setLightboxImage] = useState<{ url: string; alt?: string } | null>(null);
  const [isExpanded, setIsExpanded] = useState<boolean>(stage.status !== 'APPROVED');

  // Keep state synchronized if stage becomes active or needs attention
  React.useEffect(() => {
    if (stage.status === 'IN_PROGRESS' || stage.status === 'SUBMITTED_FOR_REVIEW' || stage.status === 'NEEDS_REVISION') {
      setIsExpanded(true);
    }
  }, [stage.status]);

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

  const hasSubmittedDeliverables =
    (stage.requiredInputs &&
      stage.requiredInputs.some(
        (inp) =>
          inp.employeeSubmission?.textOrUrlValue ||
          inp.employeeSubmission?.numberValue != null ||
          inp.employeeSubmission?.mediaAttachment
      )) ||
    Boolean(stage.employeeVoiceNote) ||
    Boolean(stage.additionalAttachments && stage.additionalAttachments.length > 0);

  return (
    <div
      className={`rounded-2xl border transition-all text-xs overflow-hidden backdrop-blur-sm ${
        isApproved
          ? 'bg-gradient-to-br from-emerald-950/20 via-obsidian-surface to-obsidian-card border-emerald-500/40 shadow-[0_4px_20px_rgba(16,185,129,0.08)]'
          : isInProgress
          ? 'bg-gradient-to-br from-amber-950/20 via-obsidian-surface to-obsidian-card border-2 border-lord-gold/60 shadow-[0_4px_25px_rgba(212,175,55,0.15)] ring-1 ring-lord-gold/30'
          : isSubmitted
          ? 'bg-gradient-to-br from-amber-950/25 via-obsidian-surface to-obsidian-card border border-amber-500/45 shadow-[0_4px_20px_rgba(245,158,11,0.08)]'
          : isNeedsRevision
          ? 'bg-gradient-to-br from-red-950/25 via-obsidian-surface to-obsidian-card border border-red-500/45 shadow-[0_4px_20px_rgba(239,68,68,0.1)]'
          : 'bg-obsidian-card/75 border-gray-800/80 opacity-70'
      }`}
    >
      {/* Stage Header */}
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        className="p-3.5 sm:p-4 flex items-center justify-between border-b border-gray-800/70 flex-wrap gap-2.5 cursor-pointer hover:bg-white/[0.03] select-none transition-colors"
        title={isExpanded ? 'طي تفاصيل المرحلة' : 'توسيع وعرض تفاصيل ومخرجات المرحلة'}
      >
        <div className="flex items-center gap-3">
          <div
            className={`w-9 h-9 rounded-2xl flex items-center justify-center font-black text-xs shrink-0 shadow-md ${
              isApproved
                ? 'bg-gradient-to-br from-emerald-400 to-emerald-600 text-obsidian-primary shadow-emerald-500/30'
                : isInProgress
                ? 'bg-gradient-to-br from-amber-300 via-lord-gold to-yellow-600 text-obsidian-primary shadow-gold-glow animate-pulse'
                : isSubmitted
                ? 'bg-gradient-to-br from-amber-400 to-amber-600 text-obsidian-primary shadow-amber-500/20'
                : isNeedsRevision
                ? 'bg-gradient-to-br from-red-400 to-red-600 text-white shadow-red-500/30'
                : 'bg-gray-800/90 text-gray-400 border border-gray-700/50'
            }`}
          >
            {isApproved ? (
              <Check className="w-5 h-5 stroke-[3]" />
            ) : isLocked ? (
              <Lock className="w-4 h-4 text-gray-400" />
            ) : isSubmitted ? (
              <Hourglass className="w-4 h-4" />
            ) : (
              <span className="font-mono text-sm">{stage.stageOrder}</span>
            )}
          </div>

          <div>
            <h4 className="font-bold text-white text-sm sm:text-base flex items-center gap-2">
              <span>{stage.stageTitle}</span>
              {isInProgress && (
                <span className="px-2 py-0.5 rounded-full bg-lord-gold/20 text-lord-gold text-[10px] font-extrabold border border-lord-gold/40 shadow-xs animate-pulse">
                  قيد التنفيذ الآن ⚡
                </span>
              )}
            </h4>
            <div className="flex items-center gap-2 text-[11px] text-gray-400 mt-0.5">
              <span>المرحلة {stage.stageOrder} من المسار التنفيذي</span>
              {stage.requiredInputs && stage.requiredInputs.length > 0 && (
                <span className="text-gray-500 font-mono">
                  ({stage.requiredInputs.length} متطلبات محددة)
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {isApproved && (
            <span className="px-3 py-1 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 font-bold text-xs flex items-center gap-1.5 shadow-xs">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
              <span>معتمدة ومكتملة ✓</span>
            </span>
          )}
          {isInProgress && (
            <span className="px-3 py-1 rounded-xl bg-lord-gold/15 border border-lord-gold/40 text-lord-gold font-bold text-xs flex items-center gap-1.5 shadow-xs">
              <Clock className="w-3.5 h-3.5 text-lord-gold animate-spin" style={{ animationDuration: '4s' }} />
              <span>قيد العمل والتنفيذ</span>
            </span>
          )}
          {isSubmitted && (
            <span className="px-3 py-1 rounded-xl bg-amber-500/15 border border-amber-500/40 text-amber-300 font-bold text-xs flex items-center gap-1.5 shadow-xs">
              <Hourglass className="w-3.5 h-3.5 text-amber-400" />
              <span>بانتظار مراجعة الإدارة</span>
            </span>
          )}
          {isNeedsRevision && (
            <span className="px-3 py-1 rounded-xl bg-red-500/20 border border-red-500/40 text-red-300 font-bold text-xs flex items-center gap-1.5 shadow-xs">
              <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
              <span>مطلوب تعديل المخرجات</span>
            </span>
          )}
          {isLocked && (
            <span className="px-2.5 py-1 rounded-xl bg-gray-800/80 border border-gray-700/50 text-gray-400 text-[11px] flex items-center gap-1">
              <Lock className="w-3 h-3 text-gray-500" />
              <span>مغلقة حتى اعتماد سابقتها</span>
            </span>
          )}
          <div className="p-1.5 rounded-xl bg-gray-800/80 border border-gray-700/60 text-gray-300 hover:text-white transition-colors">
            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </div>
        </div>
      </div>

      {/* Stage Body */}
      {isExpanded && (
        <div className="p-3.5 sm:p-5 space-y-4 animate-in fade-in duration-200">
        {/* Stage Instructions Callout */}
        {stage.instructions && (
          <div className="p-3 sm:p-3.5 bg-obsidian-card/90 rounded-2xl border-r-4 border-r-lord-gold border border-gray-800 text-xs text-gray-200 leading-relaxed shadow-sm">
            <div className="flex items-center gap-1.5 text-lord-gold font-bold mb-1.5">
              <FileCheck2 className="w-3.5 h-3.5 text-lord-gold" />
              <span>تعليمات وشروط المرحلة التنفيذية:</span>
            </div>
            <p className="pr-1 text-gray-300">{stage.instructions}</p>
          </div>
        )}

        {/* Needs Revision Warning Banner */}
        {isNeedsRevision && stage.adminFeedback?.note && (
          <div className="p-3.5 rounded-2xl bg-red-500/15 border border-red-500/40 text-red-200 text-xs flex items-start gap-3 shadow-md">
            <div className="w-7 h-7 rounded-xl bg-red-500/20 border border-red-500/30 flex items-center justify-center shrink-0 mt-0.5">
              <AlertTriangle className="w-4 h-4 text-red-400" />
            </div>
            <div className="space-y-1">
              <strong className="block font-bold text-red-300">ملاحظات وتوجيهات المسؤول المطلوب تعديلها:</strong>
              <p className="leading-relaxed text-gray-200">{stage.adminFeedback.note}</p>
            </div>
          </div>
        )}

        {/* Display Submitted Deliverables (if Submitted or Approved) */}
        {(isSubmitted || isApproved) && hasSubmittedDeliverables && (
          <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-obsidian-card via-obsidian-surface to-obsidian-card border-2 border-emerald-500/35 space-y-3.5 shadow-[0_4px_20px_rgba(16,185,129,0.08)]">
            <div className="flex items-center justify-between border-b border-gray-800/80 pb-2.5">
              <span className="text-xs font-bold text-white flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-400 stroke-[2.5]" />
                <span className="text-emerald-300">المخرجات والإثباتات المسلمة من الموظف:</span>
              </span>
              <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full border ${
                isApproved
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-xs'
                  : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
              }`}>
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
                                setLightboxImage({
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
              <div className="space-y-2 pt-2 border-t border-gray-800/70">
                <span className="text-[11px] text-gray-400 font-bold flex items-center gap-1.5">
                  <Paperclip className="w-3.5 h-3.5 text-lord-gold" />
                  <span>مرفقات إضافية وإثباتات ({stage.additionalAttachments.length}):</span>
                </span>
                <div className="flex flex-wrap gap-2">
                  {stage.additionalAttachments.map((att: any, aIdx: number) => {
                    const isImg =
                      att.fileType === 'IMAGE' ||
                      att.fileUrl?.match(/\.(jpeg|jpg|gif|png|webp)($|\?)/i);
                    return isImg ? (
                      <button
                        key={aIdx}
                        type="button"
                        onClick={() =>
                          setLightboxImage({ url: att.fileUrl, alt: att.fileName || 'مرفق إضافي' })
                        }
                        className="block cursor-zoom-in group"
                        title="انقر لتكبير ومعاينة الصورة"
                      >
                        <img
                          src={att.fileUrl}
                          alt={att.fileName || 'مرفق'}
                          className="w-16 h-16 object-cover rounded-xl border border-gray-700 group-hover:border-lord-gold group-hover:scale-105 transition-all shadow-md"
                        />
                      </button>
                    ) : (
                      <a
                        key={aIdx}
                        href={att.fileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3 py-1.5 rounded-xl bg-obsidian-card border border-gray-700 hover:border-lord-gold text-xs font-bold text-gray-200 hover:text-white flex items-center gap-1.5 transition-all shadow-sm"
                      >
                        <Paperclip className="w-3.5 h-3.5 text-lord-gold" />
                        <span className="truncate max-w-[140px]">{att.fileName || 'مستند مرفق'}</span>
                      </a>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* LOCKED BANNER */}
        {isLocked && (
          <div className="p-3.5 rounded-2xl bg-obsidian-card/60 border border-gray-800/80 text-gray-400 text-center text-xs flex items-center justify-center gap-2">
            <Lock className="w-4 h-4 text-gray-500" />
            <span>هذه المرحلة مقفلة — ستُفتح للموظف تلقائياً بعد اعتماد المرحلة السابقة ({stage.stageOrder - 1}).</span>
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
        </div>
      )}

      {/* Global Image Lightbox Modal */}
      {lightboxImage && (
        <ImageLightboxModal
          imageUrl={lightboxImage.url}
          imageAlt={lightboxImage.alt}
          onClose={() => setLightboxImage(null)}
        />
      )}
    </div>
  );
};
