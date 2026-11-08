'use client';

import React from 'react';
import { ShieldCheck, Check, RotateCcw, X, AlertTriangle } from 'lucide-react';
import { Button } from '../../ui/Button';
import { AppModalPortal } from '../../ui/AppModalPortal';
import { ITaskStage } from '@lord/shared-types';

interface StageReviewerActionBoxProps {
  stage: ITaskStage;
  isAdmin: boolean;
  isReviewing: boolean;
  onReview: (decision: 'APPROVE' | 'REJECT', feedbackNote?: string) => Promise<void>;
  isReviewModalOpen: boolean;
  setIsReviewModalOpen: (open: boolean) => void;
  adminNote: string;
  setAdminNote: (note: string) => void;
}

export const StageReviewerActionBox: React.FC<StageReviewerActionBoxProps> = ({
  stage,
  isAdmin,
  isReviewing,
  onReview,
  isReviewModalOpen,
  setIsReviewModalOpen,
  adminNote,
  setAdminNote
}) => {
  const isApproved = stage.status === 'APPROVED';
  const isSubmitted = stage.status === 'SUBMITTED_FOR_REVIEW';
  const isNeedsRevision = stage.status === 'NEEDS_REVISION';

  return (
    <>
      {/* Approved Confirmation Box */}
      {isApproved && (
        <div className="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-emerald-500/5 to-transparent border border-emerald-500/30 flex items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0">
              <ShieldCheck className="w-4 h-4 stroke-[2.5]" />
            </div>
            <div>
              <span className="text-xs font-bold text-white block">
                تم اعتماد هذه المرحلة رسمياً من الإدارة ✓
              </span>
              <span className="text-[11px] text-gray-400">
                المخرجات مستوفية للشروط بالكامل والمرحلة التالية مفعلة للبدء.
              </span>
            </div>
          </div>
          <span className="px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-[11px] font-bold shrink-0">
            مكتمل 100%
          </span>
        </div>
      )}

      {/* Admin Action Bar (if Submitted) */}
      {isAdmin && isSubmitted && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-obsidian-surface to-obsidian-card border-2 border-lord-gold/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-md">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-lord-gold shrink-0" />
            <div>
              <h5 className="text-xs font-bold text-white">صلاحيات المسؤول لمراجعة تسليم المرحلة:</h5>
              <p className="text-[11px] text-gray-400">
                دقق في المخرجات المسلمة أعلاه قبل اعتمادها أو طلب تعديلها.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button
              type="button"
              variant="gold"
              size="sm"
              disabled={isReviewing}
              onClick={() => onReview('APPROVE')}
              className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 font-bold"
            >
              <Check className="w-4 h-4" />
              <span>اعتماد المرحلة وتمريرها ✓</span>
            </Button>

            <Button
              type="button"
              variant="danger"
              size="sm"
              disabled={isReviewing}
              onClick={() => setIsReviewModalOpen(true)}
              className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 font-bold"
            >
              <RotateCcw className="w-4 h-4" />
              <span>طلب تعديل ⚠️</span>
            </Button>
          </div>
        </div>
      )}

      {/* Reject / Revision Modal via AppModalPortal */}
      <AppModalPortal
        isOpen={isReviewModalOpen}
        onClose={() => setIsReviewModalOpen(false)}
        maxWidthClassName="max-w-md"
      >
        <div className="bg-obsidian-surface border border-red-500/50 rounded-3xl p-6 space-y-4 shadow-2xl relative text-right">
          <button
            type="button"
            onClick={() => setIsReviewModalOpen(false)}
            className="absolute top-4 left-4 p-2 rounded-xl text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2 text-red-400 font-bold text-sm">
            <AlertTriangle className="w-5 h-5" />
            <span>طلب تعديل على مخرجات المرحلة {stage.stageOrder}</span>
          </div>

          <p className="text-xs text-gray-400">
            اكتب توجيهاتك وملاحظاتك الدقيقة للموظف لتوضيح ما يحتاج إلى تعديل أو استكمال قبل إعادة التسليم:
          </p>

          <textarea
            rows={4}
            value={adminNote}
            onChange={(e) => setAdminNote(e.target.value)}
            placeholder="مثال: يرجى إعادة فحص جودة الصورة وتضمين نسبة وقف الخسارة الدقيقة..."
            className="w-full bg-obsidian-primary border border-gray-700 rounded-xl p-3 text-xs text-white placeholder-gray-500 focus:border-red-500 focus:outline-none resize-none"
          />

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-800">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setIsReviewModalOpen(false)}
            >
              إلغاء
            </Button>
            <Button
              type="button"
              variant="danger"
              size="sm"
              disabled={isReviewing || !adminNote.trim()}
              onClick={() => onReview('REJECT', adminNote)}
              className="flex items-center gap-1.5 font-bold"
            >
              <RotateCcw className="w-4 h-4" />
              <span>إرسال طلب التعديل للموظف ⚠️</span>
            </Button>
          </div>
        </div>
      </AppModalPortal>
    </>
  );
};

