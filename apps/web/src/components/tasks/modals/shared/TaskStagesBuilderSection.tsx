'use client';

import React from 'react';
import { Layers, Plus, Trash2 } from 'lucide-react';
import { Button } from '../../../ui/Button';
import {
  EXPECTED_INPUT_OPTIONS,
  StageTemplateKey,
  TaskStageDraft
} from './taskStageTemplates';

export interface TaskStagesBuilderSectionProps {
  stages: TaskStageDraft[];
  onApplyTemplate: (template: StageTemplateKey) => void;
  onAddStage: () => void;
  onRemoveStage: (index: number) => void;
  onStageChange: (index: number, field: string, value: string) => void;
  onRequiredInputChange: (stageIdx: number, fieldName: string, value: any) => void;
}

const TEMPLATE_BUTTONS: { key: StageTemplateKey; label: string; colorClass: string }[] = [
  { key: 'TRADING', label: 'صفقة VIP', colorClass: 'text-lord-gold' },
  { key: 'MEDIA', label: 'مونتاج فيديو', colorClass: 'text-blue-400' },
  { key: 'DEV', label: 'برمجة بوت', colorClass: 'text-emerald-400' },
  { key: 'SINGLE', label: 'مرحلة واحدة', colorClass: 'text-gray-300' }
];

/**
 * Shared sequential stage & deliverable builder used across task creation and editing modals.
 */
export const TaskStagesBuilderSection: React.FC<TaskStagesBuilderSectionProps> = ({
  stages,
  onApplyTemplate,
  onAddStage,
  onRemoveStage,
  onStageChange,
  onRequiredInputChange
}) => {
  return (
    <div className="p-4 bg-obsidian-card rounded-2xl border border-obsidian-border space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-800 pb-3">
        <div>
          <span className="text-xs font-bold text-lord-gold flex items-center gap-1.5">
            <Layers className="w-4 h-4" />
            مراحل التنفيذ المتسلسلة والمرفقات المطلوبة ({stages.length} مراحل):
          </span>
          <p className="text-[11px] text-gray-400">
            يمكنك التعديل على المراحل أو إضافة مراحل جديدة وتحديد نوع المرفق الإلزامي بدقة.
          </p>
        </div>

        <div className="flex items-center gap-1 flex-wrap">
          {TEMPLATE_BUTTONS.map((btn) => (
            <button
              key={btn.key}
              type="button"
              onClick={() => onApplyTemplate(btn.key)}
              className={`text-[10px] bg-obsidian-surface hover:bg-gray-800 ${btn.colorClass} px-2 py-1 rounded-lg border border-gray-800`}
            >
              {btn.label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        {stages.map((st, idx) => (
          <div
            key={idx}
            className="p-3.5 bg-obsidian-primary rounded-2xl border border-gray-800 space-y-3 text-xs shadow-md"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 flex-1">
                <span className="w-6 h-6 rounded-full bg-lord-gold/20 text-lord-gold border border-lord-gold/40 flex items-center justify-center font-bold text-xs shrink-0">
                  {st.stageOrder}
                </span>
                <input
                  type="text"
                  required
                  placeholder={`عنوان المرحلة ${st.stageOrder}`}
                  value={st.stageTitle}
                  onChange={(e) => onStageChange(idx, 'stageTitle', e.target.value)}
                  className="flex-1 bg-obsidian-surface border border-gray-700 focus:border-lord-gold rounded-xl px-3 py-1.5 text-xs text-white font-bold"
                />
              </div>

              <button
                type="button"
                onClick={() => onRemoveStage(idx)}
                disabled={stages.length <= 1}
                className="p-1.5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-30"
                title="حذف المرحلة"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            <div>
              <input
                type="text"
                placeholder="توجيهات التنفيذ للموظف (مثال: تحليل شارت BTC ونسبة المخاطرة)..."
                value={st.instructions || ''}
                onChange={(e) => onStageChange(idx, 'instructions', e.target.value)}
                className="w-full bg-obsidian-surface border border-gray-800 rounded-xl px-3 py-1.5 text-[11px] text-gray-300 placeholder-gray-500 focus:border-lord-gold"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 p-2 bg-obsidian-card rounded-xl border border-gray-800/80">
              <div className="sm:col-span-1">
                <label className="block text-[10px] text-gray-400 mb-0.5">نوع المرفق المطلوب:</label>
                <select
                  value={st.requiredInputs?.[0]?.expectedType || 'IMAGE'}
                  onChange={(e) => onRequiredInputChange(idx, 'expectedType', e.target.value)}
                  className="w-full bg-obsidian-surface border border-gray-700 rounded-lg px-2 py-1 text-[11px] text-white"
                >
                  {EXPECTED_INPUT_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-1">
                <label className="block text-[10px] text-gray-400 mb-0.5">اسم المرفق:</label>
                <input
                  type="text"
                  value={st.requiredInputs?.[0]?.fieldLabel || ''}
                  onChange={(e) => onRequiredInputChange(idx, 'fieldLabel', e.target.value)}
                  placeholder="مثال: لقطة الشارت الفني"
                  className="w-full bg-obsidian-surface border border-gray-700 rounded-lg px-2 py-1 text-[11px] text-white"
                />
              </div>

              <div className="sm:col-span-1 flex items-end pb-1">
                <label className="flex items-center gap-1.5 cursor-pointer text-[11px] text-gray-300">
                  <input
                    type="checkbox"
                    checked={st.requiredInputs?.[0]?.isMandatory !== false}
                    onChange={(e) => onRequiredInputChange(idx, 'isMandatory', e.target.checked)}
                    className="rounded text-lord-gold"
                  />
                  <span>إلزامي (لا يفتح التالي بدونه)</span>
                </label>
              </div>
            </div>
          </div>
        ))}
      </div>

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={onAddStage}
        className="w-full rounded-xl border border-dashed border-gray-700 hover:border-lord-gold hover:text-lord-gold flex items-center justify-center gap-1.5 py-2.5 text-xs font-bold"
      >
        <Plus className="w-4 h-4" />
        <span>+ إضافة مرحلة جديدة إلى مسار المهمة</span>
      </Button>
    </div>
  );
};

