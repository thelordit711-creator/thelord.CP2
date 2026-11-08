'use client';

import React from 'react';
import { FileCheck2, AlertTriangle } from 'lucide-react';
import { ITaskStage } from '@lord/shared-types';

interface StageInstructionsViewProps {
  stage: ITaskStage;
  isNeedsRevision: boolean;
}

export const StageInstructionsView: React.FC<StageInstructionsViewProps> = ({
  stage,
  isNeedsRevision
}) => {
  return (
    <div className="space-y-3">
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
    </div>
  );
};

