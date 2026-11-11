'use client';

import React, { useState } from 'react';
import { ITaskStage, IMediaAttachment } from '@lord/shared-types';
import {
  CheckCircle,
  Clock,
  Lock,
  AlertTriangle,
  Hourglass,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { useSubmitTaskStageMutation, useReviewTaskStageMutation } from '../../store/api/tasksApi';
import { ImageLightboxModal } from '../ui/ImageLightboxModal';
import { lordToast } from '../../lib/lordToast';

// Modular Subcomponents
import { StageInstructionsView } from './deliverables/StageInstructionsView';
import { SubmittedDeliverablesView } from './deliverables/SubmittedDeliverablesView';
import { StageSubmissionForm } from './deliverables/StageSubmissionForm';
import { StageReviewerActionBox } from './deliverables/StageReviewerActionBox';

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
      const { apiFetch } = await import('../../lib/apiClient');

      const res = await apiFetch('/upload', {
        method: 'POST',
        body: formData
      });

      const data = await res.json();
      if (!data.success || !data.data) {
        throw new Error(data.error || 'فشل في رفع الملف');
      }

      const mediaAttachment: IMediaAttachment = {
        fileName: file.name,
        fileUrl: data.data.fileUrl || data.data.url,
        fileType: file.type.startsWith('image/')
          ? 'IMAGE'
          : file.type.startsWith('audio/')
          ? 'VOICE_NOTE'
          : file.type.startsWith('video/')
          ? 'VIDEO'
          : 'DOCUMENT',
        fileSizeInBytes: file.size
      };

      if (fieldLabel) {
        setInputValues((prev) => ({
          ...prev,
          [fieldLabel]: mediaAttachment
        }));
        lordToast.success(`تم رفع الملف بنجاح`, fieldLabel);
      } else {
        setUploadedAttachments((prev) => [...prev, mediaAttachment]);
        lordToast.success('تم إرفاق الملف الإضافي بنجاح 📎');
      }
    } catch (err: any) {
      lordToast.error('فشل رفع الملف', err.message || 'حدث خطأ أثناء الرفع');
    } finally {
      setUploadingField(null);
    }
  };

  const handleVoiceUpload = async (file: File, duration: number) => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      const { apiFetch } = await import('../../lib/apiClient');

      const res = await apiFetch('/upload', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (!data.success || !data.data) {
        throw new Error(data.error || 'فشل في رفع التسجيل الصوتي');
      }

      const mediaAttachment: IMediaAttachment = {
        fileName: file.name,
        fileUrl: data.data.fileUrl || data.data.url,
        fileType: 'VOICE_NOTE',
        fileSizeInBytes: file.size,
        durationInSeconds: duration
      };

      setVoiceNote(mediaAttachment);
      lordToast.success('تم رفع التسجيل الصوتي بنجاح 🎙️');
    } catch (err: any) {
      lordToast.error('فشل رفع الصوت', err.message || 'حدث خطأ');
    }
  };

  // Submit Deliverable Logic
  const handleSubmitStage = async () => {
    // Validate mandatory required inputs
    if (stage.requiredInputs) {
      for (const req of stage.requiredInputs) {
        if (req.isMandatory) {
          const val = inputValues[req.fieldLabel];
          if (!val || (typeof val === 'string' && !val.trim())) {
            lordToast.error('حقل إلزامي ناقص', `يرجى إرفاق أو إدخال: "${req.fieldLabel}"`);
            return;
          }
        }
      }
    }

    try {
      // Build submissions array matching schema
      const formattedRequiredInputs = stage.requiredInputs?.map((req) => {
        const val = inputValues[req.fieldLabel];
        const isMedia = val && typeof val === 'object' && val.fileUrl;
        const isNum = req.expectedType === 'NUMBER';

        return {
          fieldLabel: req.fieldLabel,
          textOrUrlValue: !isMedia && !isNum ? String(val || '') : undefined,
          numberValue: isNum && val !== '' && !isNaN(Number(val)) ? Number(val) : undefined,
          mediaAttachment: isMedia ? val : undefined
        };
      });

      await submitStage({
        taskId,
        stageOrder: stage.stageOrder,
        data: {
          employeeVoiceNote: voiceNote || undefined,
          additionalAttachments: uploadedAttachments.length > 0 ? uploadedAttachments : undefined,
          requiredInputs: formattedRequiredInputs || []
        }
      }).unwrap();

      lordToast.success(`تم تسليم المرحلة ${stage.stageOrder} بنجاح! 🚀`, 'بانتظار مراجعة واعتماد المسؤول');
      onRefresh?.();
    } catch (err: any) {
      lordToast.error('فشل تسليم المرحلة', err?.data?.error || 'حدث خطأ أثناء إرسال التسليم');
    }
  };

  // Review Stage Logic
  const handleReview = async (decision: 'APPROVE' | 'REJECT', feedbackNote?: string) => {
    try {
      await reviewStage({
        taskId,
        stageOrder: stage.stageOrder,
        data: {
          action: decision === 'APPROVE' ? 'APPROVE' : 'REQUEST_REVISION',
          note: feedbackNote || adminNote || (decision === 'APPROVE' ? 'معتمد ✓' : 'مطلوب مراجعة المخرجات')
        }
      }).unwrap();

      if (decision === 'APPROVE') {
        lordToast.success(`تم اعتماد المرحلة ${stage.stageOrder} بنجاح! ✓`);
      } else {
        lordToast.gold(`تم إرسال طلب التعديل للموظف`, feedbackNote || 'بانتظار إعادة التسليم');
      }

      setIsReviewModalOpen(false);
      setAdminNote('');
      onRefresh?.();
    } catch (err: any) {
      lordToast.error('فشل مراجعة المرحلة', err?.data?.error || 'حدث خطأ أثناء المراجعة');
    }
  };

  const isApproved = stage.status === 'APPROVED';
  const isSubmitted = stage.status === 'SUBMITTED_FOR_REVIEW';
  const isNeedsRevision = stage.status === 'NEEDS_REVISION';
  const isInProgress = stage.status === 'IN_PROGRESS';
  const isLocked = stage.status === 'LOCKED';

  const hasSubmittedDeliverables =
    (stage.requiredInputs && stage.requiredInputs.some((i) => i.employeeSubmission)) ||
    Boolean(stage.employeeVoiceNote) ||
    Boolean(stage.additionalAttachments && stage.additionalAttachments.length > 0);

  return (
    <div
      className={`rounded-2xl sm:rounded-3xl border transition-all text-right ${
        isApproved
          ? 'bg-obsidian-surface/60 border-emerald-500/40 shadow-xs'
          : isSubmitted
          ? 'bg-obsidian-surface/80 border-amber-500/50 shadow-md'
          : isNeedsRevision
          ? 'bg-obsidian-surface/80 border-red-500/50 shadow-md'
          : isInProgress
          ? 'bg-obsidian-surface/90 border-lord-gold/60 shadow-gold-glow'
          : 'bg-obsidian-surface/30 border-gray-800/80 opacity-75'
      }`}
    >
      {/* Stage Header */}
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        className="p-3.5 sm:p-5 flex items-center justify-between gap-3 cursor-pointer select-none hover:bg-white/[0.02] transition-colors"
      >
        <div className="flex items-center gap-3">
          <div
            className={`w-8 h-8 sm:w-10 sm:h-10 rounded-2xl flex items-center justify-center font-bold text-xs sm:text-sm shrink-0 border ${
              isApproved
                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                : isSubmitted
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                : isNeedsRevision
                ? 'bg-red-500/20 text-red-300 border-red-500/40'
                : isInProgress
                ? 'bg-lord-gold/20 text-lord-gold border-lord-gold/40'
                : 'bg-gray-800 text-gray-500 border-gray-700'
            }`}
          >
            {isApproved ? '✓' : stage.stageOrder}
          </div>

          <div>
            <h4 className="text-xs sm:text-sm font-bold text-white flex items-center gap-2">
              <span>{stage.stageTitle}</span>
              <span className="text-[10px] text-gray-400 font-normal hidden sm:inline">
                (المرحلة {stage.stageOrder} من المسار)
              </span>
            </h4>
            <span className="text-[11px] text-gray-400 block mt-0.5">
              {stage.requiredInputs ? `${stage.requiredInputs.length} متطلبات محددة` : 'تسليم عام'}
            </span>
          </div>
        </div>

        {/* Status Badges */}
        <div className="flex items-center gap-2 shrink-0">
          {isApproved && (
            <span className="px-3 py-1 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-bold text-xs flex items-center gap-1.5 shadow-xs">
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
          {/* Instructions View */}
          <StageInstructionsView stage={stage} isNeedsRevision={isNeedsRevision} />

          {/* Display Submitted Deliverables */}
          {(isSubmitted || isApproved) && hasSubmittedDeliverables && (
            <SubmittedDeliverablesView
              stage={stage}
              isApproved={isApproved}
              onOpenLightbox={(img) => setLightboxImage(img)}
            />
          )}

          {/* Submission Form (for Employee) */}
          {(isInProgress || isNeedsRevision) && canSubmit && (
            <StageSubmissionForm
              stage={stage}
              inputValues={inputValues}
              setInputValues={setInputValues}
              generalTextSubmission={generalTextSubmission}
              setGeneralTextSubmission={setGeneralTextSubmission}
              voiceNote={voiceNote}
              setVoiceNote={setVoiceNote}
              uploadedAttachments={uploadedAttachments}
              setUploadedAttachments={setUploadedAttachments}
              uploadingField={uploadingField}
              onFileUpload={handleFileUpload}
              onVoiceUpload={handleVoiceUpload}
              onSubmitStage={handleSubmitStage}
              isSubmitting={isSubmitting}
              isNeedsRevision={isNeedsRevision}
            />
          )}

          {/* Reviewer Action Box (for Admin) */}
          <StageReviewerActionBox
            stage={stage}
            isAdmin={isAdmin}
            isReviewing={isReviewing}
            onReview={handleReview}
            isReviewModalOpen={isReviewModalOpen}
            setIsReviewModalOpen={setIsReviewModalOpen}
            adminNote={adminNote}
            setAdminNote={setAdminNote}
          />
        </div>
      )}

      {/* Lightbox Modal */}
      {lightboxImage && (
        <ImageLightboxModal
          imageUrl={lightboxImage.url}
          imageAlt={lightboxImage.alt || 'معاينة المرفق'}
          onClose={() => setLightboxImage(null)}
        />
      )}
    </div>
  );
};
