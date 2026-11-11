'use client';

import React from 'react';
import { CheckCircle, UserCheck } from 'lucide-react';
import { DEPARTMENT_OPTIONS } from './taskStageTemplates';

export interface TaskAssigneeSectionProps {
  assignmentMode: 'SELF' | 'EMPLOYEES' | 'DEPARTMENT';
  onChangeMode: (mode: 'SELF' | 'EMPLOYEES' | 'DEPARTMENT') => void;
  allowSelfMode?: boolean;
  isProposal?: boolean;
  currentUser?: { _id?: string; fullName?: string; primaryDepartment?: string } | null;
  employees: any[];
  selectedAssignees: string[];
  onToggleAssignee: (employeeId: string) => void;
  targetDepartment: string;
  onChangeDepartment: (dept: string) => void;
}

/**
 * Shared assignee selection panel used across CreateTaskModal and EditTaskModal.
 */
export const TaskAssigneeSection: React.FC<TaskAssigneeSectionProps> = ({
  assignmentMode,
  onChangeMode,
  allowSelfMode = false,
  isProposal = false,
  currentUser,
  employees,
  selectedAssignees,
  onToggleAssignee,
  targetDepartment,
  onChangeDepartment
}) => {
  return (
    <div className="p-4 bg-obsidian-card rounded-2xl border border-obsidian-border space-y-3">
      <div className="flex items-center justify-between border-b border-gray-800 pb-2">
        <span className="text-xs font-bold text-white flex items-center gap-2">
          <UserCheck className="w-4 h-4 text-lord-gold" />
          <span>إسناد المهمة (المكلف بالتنفيذ والتسليم):</span>
        </span>

        <div className="flex items-center gap-1 bg-obsidian-primary p-0.5 rounded-xl border border-gray-800 text-[11px]">
          {allowSelfMode && (
            <button
              type="button"
              onClick={() => onChangeMode('SELF')}
              className={`px-3 py-1 rounded-lg font-bold transition-all ${
                assignmentMode === 'SELF'
                  ? 'bg-lord-gold text-black font-black shadow-sm'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              تنفيذ ذاتي 🙋‍♂️
            </button>
          )}
          <button
            type="button"
            onClick={() => onChangeMode('EMPLOYEES')}
            className={`px-3 py-1 rounded-lg font-bold transition-all ${
              assignmentMode === 'EMPLOYEES'
                ? 'bg-lord-gold text-black font-black shadow-sm'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            {isProposal ? 'تكليف زميل بالكادر 👥' : 'موظف أو أكثر 👤'}
          </button>
          <button
            type="button"
            onClick={() => onChangeMode('DEPARTMENT')}
            className={`px-3 py-1 rounded-lg font-bold transition-all ${
              assignmentMode === 'DEPARTMENT'
                ? 'bg-lord-gold text-black font-black shadow-sm'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            قسم كامل 🏢
          </button>
        </div>
      </div>

      {assignmentMode === 'SELF' ? (
        <div className="p-3.5 rounded-xl bg-obsidian-primary/80 border border-lord-gold/30 space-y-2">
          <div className="flex items-center gap-2 text-lord-gold font-bold text-xs">
            <CheckCircle className="w-4 h-4 text-lord-gold" />
            <span>مبادرة وتنفيذ ذاتي: ستقوم بتنفيذ هذه المهمة ومراحلها بنفسك 🙋‍♂️</span>
          </div>
          <p className="text-[11px] text-gray-400 leading-relaxed">
            سيتم تسجيلك كمنفذ رئيسي للمهمة، وفور مراجعة واعتماد الإدارة للمقترح، ستظهر مباشرة في قائمة مهامك اليومية النشطة لبدء رفع المخرجات والمراحل.
          </p>
          {currentUser && (
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-lord-gold/10 border border-lord-gold/20 text-xs text-white">
              <span className="text-gray-400">المنفذ المقترح:</span>
              <strong className="text-lord-gold">{currentUser.fullName}</strong>
              <span className="text-[10px] text-gray-400 font-mono">
                ({currentUser.primaryDepartment || 'كادر TheLord'})
              </span>
            </div>
          )}
        </div>
      ) : assignmentMode === 'EMPLOYEES' ? (
        <div className="space-y-2">
          <p className="text-[11px] text-gray-400">
            اختر شخصاً واحداً أو عدة أشخاص للعمل معاً على المهمة ومراحلها:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-36 overflow-y-auto pr-1">
            {employees.map((emp: any) => {
              const isSelected = selectedAssignees.includes(emp._id);
              return (
                <div
                  key={emp._id}
                  onClick={() => onToggleAssignee(emp._id)}
                  className={`p-2.5 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                    isSelected
                      ? 'bg-lord-gold/15 border-lord-gold text-white font-bold'
                      : 'bg-obsidian-primary border-gray-800 text-gray-300 hover:bg-gray-800'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <span className="w-6 h-6 rounded-lg bg-obsidian-card border border-gray-700 flex items-center justify-center text-[10px] text-lord-gold">
                      {emp.fullName?.charAt(0) || '👤'}
                    </span>
                    <div className="truncate text-right">
                      <span className="text-xs truncate block">{emp.fullName}</span>
                      <span className="text-[9px] text-gray-400 block">
                        {emp.primaryDepartment} - {emp.jobTitles?.[0] || emp.accessRole}
                      </span>
                    </div>
                  </div>
                  <span
                    className={`w-4 h-4 rounded-md border flex items-center justify-center text-[10px] ${
                      isSelected ? 'bg-lord-gold text-obsidian-primary border-lord-gold' : 'border-gray-600'
                    }`}
                  >
                    {isSelected ? '✓' : ''}
                  </span>
                </div>
              );
            })}
          </div>

          {selectedAssignees.length > 0 && (
            <p className="text-[11px] text-emerald-400 font-semibold flex items-center gap-1">
              <CheckCircle className="w-3.5 h-3.5" />
              تم تحديد ({selectedAssignees.length}) موظف، سيصلهم إشعار فوري بالمهمة.
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          <label className="block text-xs font-semibold text-gray-300">اختر القسم المستهدف:</label>
          <select
            value={targetDepartment}
            onChange={(e) => onChangeDepartment(e.target.value)}
            className="w-full bg-obsidian-primary border border-gray-700 rounded-xl px-3 py-2 text-xs text-white"
          >
            {DEPARTMENT_OPTIONS.map((dept) => (
              <option key={dept.value} value={dept.value}>
                {dept.label}
              </option>
            ))}
          </select>
          <p className="text-[11px] text-gray-400 font-semibold">
            🏢 سيتم إدراج المهمة تلقائياً في جداول عمل جميع أعضاء هذا القسم.
          </p>
        </div>
      )}
    </div>
  );
};

