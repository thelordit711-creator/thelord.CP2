'use client';

import React, { useState, useEffect } from 'react';
import { AppModalPortal } from '../../ui/AppModalPortal';
import { Button } from '../../ui/Button';
import { DirectVoiceRecorder } from '../../voice/DirectVoiceRecorder';
import {
  X,
  Sparkles,
  Repeat,
  Coins,
  Edit3,
  Clock,
  Save
} from 'lucide-react';
import { TaskAssigneeSection } from './shared/TaskAssigneeSection';
import { TaskStagesBuilderSection } from './shared/TaskStagesBuilderSection';
import { STAGE_TEMPLATE_PRESETS, StageTemplateKey } from './shared/taskStageTemplates';
import { lordToast } from '../../../lib/lordToast';
import { useUpdateTaskMutation } from '../../../store/api/tasksApi';
import { useGetAllEmployeesQuery, useGetMeQuery } from '../../../store/api/usersApi';

interface EditTaskModalProps {
  task: any | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (updatedData: any) => void;
}

export const EditTaskModal: React.FC<EditTaskModalProps> = ({
  task,
  isOpen,
  onClose,
  onSuccess
}) => {
  const [updateTask, { isLoading: isUpdating }] = useUpdateTaskMutation();
  const { data: meRes } = useGetMeQuery();
  const currentUser = meRes?.data;
  const { data: employeesRes } = useGetAllEmployeesQuery();
  const employees = employeesRes?.data || [];

  // Form States
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDescription, setTaskDescription] = useState('');

  // Platform & Category
  const [targetPlatform, setTargetPlatform] = useState('TG_VIP');
  const [customPlatform, setCustomPlatform] = useState('');
  const [serviceCategory, setServiceCategory] = useState('VIP_CHANNEL');
  const [customCategory, setCustomCategory] = useState('');

  // Priority & Deadlines
  const [priority, setPriority] = useState('HIGH');
  const [dueDate, setDueDate] = useState('');

  // Daily Recurring Routine
  const [isDailyRecurring, setIsDailyRecurring] = useState(false);
  const [dailyRecurrenceTime, setDailyRecurrenceTime] = useState('09:00 ص');

  // Assignment: By Person (1 or more), Self, or By Department
  const [assignmentMode, setAssignmentMode] = useState<'SELF' | 'EMPLOYEES' | 'DEPARTMENT'>('EMPLOYEES');
  const [selectedAssignees, setSelectedAssignees] = useState<string[]>([]);
  const [targetDepartment, setTargetDepartment] = useState<string>('TRADING');

  // Budget Requirement
  const [requiresBudget, setRequiresBudget] = useState(false);
  const [budgetAmount, setBudgetAmount] = useState(200);
  const [budgetPayoutMethod, setBudgetPayoutMethod] = useState<'BEP20_USDT' | 'JEEB_WALLET' | 'JAWALI_WALLET'>('BEP20_USDT');

  // Bounty & Incentive Reward
  const [isBountyTask, setIsBountyTask] = useState(false);
  const [bountyRewardAmount, setBountyRewardAmount] = useState(50);
  const [bountyClaimType, setBountyClaimType] = useState<'OPEN_COMPETITIVE' | 'DEDICATED'>('OPEN_COMPETITIVE');

  // AI Voice-to-Task
  const [showVoiceToTaskBox, setShowVoiceToTaskBox] = useState(false);
  const [voiceClarificationQuestions, setVoiceClarificationQuestions] = useState<string[]>([]);
  const [isAnalyzingVoice, setIsAnalyzingVoice] = useState(false);

  // Dynamic Stages Builder
  const [stages, setStages] = useState<any[]>([]);

  // Pre-fill all fields whenever task prop changes or modal opens
  useEffect(() => {
    if (task && isOpen) {
      setTaskTitle(task.title || '');
      setTaskDescription(task.description || '');

      // Platform
      const knownPlatforms = ['TG_VIP', 'TG_MAIN', 'TG_SECOND', 'X_1', 'YOUTUBE', 'FB', 'IG', 'GENERAL_SYSTEM'];
      if (task.targetPlatform && !knownPlatforms.includes(task.targetPlatform)) {
        setTargetPlatform('CUSTOM');
        setCustomPlatform(task.targetPlatform);
      } else {
        setTargetPlatform(task.targetPlatform || 'TG_VIP');
        setCustomPlatform('');
      }

      // Category
      const knownCategories = ['VIP_CHANNEL', 'FREE_SIGNALS', 'ACCOUNT_MANAGEMENT', 'COPY_TRADING', 'FUNDED_ACCOUNTS', 'INTERNAL_DEV'];
      if (task.serviceCategory && !knownCategories.includes(task.serviceCategory)) {
        setServiceCategory('CUSTOM');
        setCustomCategory(task.serviceCategory);
      } else {
        setServiceCategory(task.serviceCategory || 'VIP_CHANNEL');
        setCustomCategory('');
      }

      // Priority & DueDate
      setPriority(task.priority || 'HIGH');
      if (task.dueDate) {
        try {
          const d = new Date(task.dueDate);
          const iso = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
          setDueDate(iso);
        } catch {
          setDueDate('');
        }
      } else {
        setDueDate('');
      }

      // Daily recurrence
      setIsDailyRecurring(!!task.isDailyRecurring);
      setDailyRecurrenceTime(task.dailyRecurrenceTime || '09:00 ص');

      // Assignment
      if (task.targetDepartment) {
        setAssignmentMode('DEPARTMENT');
        setTargetDepartment(task.targetDepartment);
      } else if (task.executionType === 'SELF') {
        setAssignmentMode('SELF');
      } else {
        setAssignmentMode('EMPLOYEES');
      }

      // Selected assignees
      if (Array.isArray(task.assignedTo)) {
        setSelectedAssignees(task.assignedTo.map((a: any) => String(a?._id || a)));
      } else if (task.assignedTo) {
        setSelectedAssignees([String(task.assignedTo?._id || task.assignedTo)]);
      } else {
        setSelectedAssignees([]);
      }

      // Financial Requirement
      const finReq = task.financialRequirement;
      setRequiresBudget(!!finReq?.requiresBudget);
      setBudgetAmount(finReq?.amount || 200);
      setBudgetPayoutMethod(finReq?.payoutMethodRequested || 'BEP20_USDT');

      // Bounty
      setIsBountyTask(!!task.isBountyTask);
      setBountyRewardAmount(task.bountyRewardAmount || 50);
      setBountyClaimType(task.bountyClaimType || 'OPEN_COMPETITIVE');

      // Stages
      if (task.stages && Array.isArray(task.stages) && task.stages.length > 0) {
        setStages(
          task.stages.map((st: any, idx: number) => ({
            stageOrder: st.stageOrder || idx + 1,
            stageTitle: st.stageTitle || `المرحلة ${idx + 1}`,
            instructions: st.instructions || '',
            status: st.status || (idx === 0 ? 'IN_PROGRESS' : 'LOCKED'),
            requiredInputs:
              st.requiredInputs && st.requiredInputs.length > 0
                ? st.requiredInputs.map((inp: any) => ({
                  fieldLabel: inp.fieldLabel || 'مرفق أو إثبات المرحلة',
                  expectedType: inp.expectedType || 'IMAGE',
                  isMandatory: inp.isMandatory !== false
                }))
                : [
                  {
                    fieldLabel: 'مرفق أو إثبات المرحلة',
                    expectedType: 'IMAGE',
                    isMandatory: true
                  }
                ]
          }))
        );
      } else {
        setStages([
          {
            stageOrder: 1,
            stageTitle: 'المرحلة 1: التنفيذ وإرفاق المخرجات المباشرة',
            instructions: task.description || 'إنجاز متطلبات المهمة وإرفاق إثبات العمل',
            requiredInputs: [{ fieldLabel: 'مرفق أو إثبات المرحلة', expectedType: 'IMAGE', isMandatory: true }]
          }
        ]);
      }
    }
  }, [task, isOpen]);

  const handleAddStage = () => {
    const nextOrder = stages.length + 1;
    setStages(prev => [
      ...prev,
      {
        stageOrder: nextOrder,
        stageTitle: `المرحلة ${nextOrder}: خطوة تنفيذ جديدة`,
        instructions: 'يرجى كتابة تعليمات ومخرجات هذه المرحلة للموظف',
        requiredInputs: [
          {
            fieldLabel: 'إثبات الإنجاز أو المرفق الرسمي',
            expectedType: 'IMAGE',
            isMandatory: true
          }
        ]
      }
    ]);
  };

  const handleRemoveStage = (index: number) => {
    if (stages.length <= 1) {
      lordToast.gold('تنبيه المراحل', 'يجب أن تحتوي المهمة على مرحلة تنفيذ واحدة على الأقل');
      return;
    }
    const updated = stages.filter((_, idx) => idx !== index).map((st, idx) => ({
      ...st,
      stageOrder: idx + 1
    }));
    setStages(updated);
  };

  const handleStageChange = (index: number, field: string, value: string) => {
    setStages(prev => prev.map((st, idx) => (idx === index ? { ...st, [field]: value } : st)));
  };

  const handleRequiredInputChange = (stageIdx: number, fieldName: string, value: any) => {
    setStages(prev =>
      prev.map((st, idx) => {
        if (idx !== stageIdx) return st;
        const currentReq = st.requiredInputs?.[0] || { fieldLabel: 'المرفق', expectedType: 'IMAGE', isMandatory: true };
        const updatedReq = { ...currentReq, [fieldName]: value };
        return { ...st, requiredInputs: [updatedReq] };
      })
    );
  };

  const handleApplyStageTemplate = (type: StageTemplateKey) => {
    const preset = STAGE_TEMPLATE_PRESETS[type];
    if (!preset) return;
    setStages(preset.stages.map((st) => ({ ...st, requiredInputs: st.requiredInputs.map((i) => ({ ...i })) })));
    lordToast.gold('قالب المراحل', preset.toastMessage);
  };

  const handleApplyDailyRoutine = (routineType: string) => {
    if (routineType === 'TRADING_ROUTINE') {
      setTaskTitle('تحليل وتحديث صفقات السوق وإشارات VIP اليومية 📈');
      setTaskDescription('رصد شارتات BTC والعملات البديلة الرئيسية، وتحديد مناطق السيولة، ونشر التوصيات المعتمدة.');
      setTargetPlatform('TG_VIP');
      setServiceCategory('VIP_CHANNEL');
      setPriority('HIGH');
      setDailyRecurrenceTime('09:00 ص');
      handleApplyStageTemplate('TRADING');
      lordToast.success('تم تحميل روتين صفقات VIP اليومي 📈');
    } else if (routineType === 'MEDIA_ROUTINE') {
      setTaskTitle('النشر والمونتاج اليومي على قنوات التليجرام والميديا 📱');
      setTaskDescription('تصميم ونشر 3 منشورات تحليلية في القناة العامة، ومونتاج فيديو ريلز ونشره، ومتابعة نسبة الوصول.');
      setTargetPlatform('TG_MAIN');
      setServiceCategory('ACCOUNT_MANAGEMENT');
      setPriority('MEDIUM');
      setDailyRecurrenceTime('11:00 ص');
      handleApplyStageTemplate('MEDIA');
      lordToast.success('تم تحميل روتين النشر والميديا اليومي 📱');
    } else if (routineType === 'DEV_ROUTINE') {
      setTaskTitle('الفحص الصباحي لخوادم البوتات واستقرار الـ API 💻');
      setTaskDescription('مراقبة صحة سيرفرات تداول البوتات، وفحص استجابة الـ API وWebhooks، والتأكد من عدم وجود أخطاء.');
      setTargetPlatform('GENERAL_SYSTEM');
      setServiceCategory('INTERNAL_DEV');
      setPriority('HIGH');
      setDailyRecurrenceTime('08:30 ص');
      handleApplyStageTemplate('DEV');
      lordToast.success('تم تحميل روتين فحص السيرفرات اليومي 💻');
    } else if (routineType === 'SUPPORT_ROUTINE') {
      setTaskTitle('المتابعة اليومية لخدمة المشتركين وتذاكر VIP 🛡️');
      setTaskDescription('الرد على كافة استفسارات المشتركين، حل مشاكل تفعيل اشتراكات VIP، ورفع تقرير يومي بعدد التذاكر.');
      setTargetPlatform('TG_VIP');
      setServiceCategory('VIP_CHANNEL');
      setPriority('MEDIUM');
      setDailyRecurrenceTime('10:00 ص');
      handleApplyStageTemplate('SINGLE');
      lordToast.success('تم تحميل روتين الدعم الفني اليومي 🛡️');
    }
  };

  const handleSetDeadlineHours = (hours: number) => {
    const targetDate = new Date(Date.now() + hours * 60 * 60 * 1000);
    const iso = new Date(targetDate.getTime() - targetDate.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16);
    setDueDate(iso);
    lordToast.gold('الموعد النهائي', `تم ضبط التسليم: بعد ${hours} ساعة`);
  };

  const handleToggleAssignee = (empId: string) => {
    setSelectedAssignees(prev =>
      prev.includes(empId) ? prev.filter(id => id !== empId) : [...prev, empId]
    );
  };

  const handleVoiceToTaskAnalyze = async (voiceText: string) => {
    if (!voiceText || !voiceText.trim()) return;
    setIsAnalyzingVoice(true);
    setVoiceClarificationQuestions([]);
    try {
      const { apiFetch } = await import('../../../lib/apiClient');
      const res = await apiFetch('/ai/voice-to-task', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ transcript: voiceText })
      });
      const data = await res.json();
      if (!data.success || !data.data) {
        throw new Error(data.error || 'فشل تحليل التسجيل الصوتي');
      }

      const parsed = data.data;
      if (parsed.status === 'NEEDS_CLARIFICATION' && parsed.clarificationQuestions?.length > 0) {
        setVoiceClarificationQuestions(parsed.clarificationQuestions);
        lordToast.ai('يحتاج الذكاء الاصطناعي لبعض التوضيحات لاعتماد المهمة بدقة');
      } else if (parsed.task) {
        const t = parsed.task;
        if (t.title) setTaskTitle(t.title);
        if (t.description) setTaskDescription(t.description);
        if (t.priority) setPriority(t.priority);
        if (t.dueDate) setDueDate(t.dueDate);
        if (t.stages && Array.isArray(t.stages)) {
          setStages(
            t.stages.map((st: any, idx: number) => ({
              stageOrder: idx + 1,
              stageTitle: st.stageTitle || `المرحلة ${idx + 1}`,
              instructions: st.instructions || '',
              requiredInputs: [
                {
                  fieldLabel: 'مرفق أو إثبات المرحلة',
                  expectedType: st.requiredInputType || 'IMAGE',
                  isMandatory: true
                }
              ]
            }))
          );
        }
        setShowVoiceToTaskBox(false);
        lordToast.ai('تم تفريغ وهيكلة المهمة ومراحلها بنجاح بواسطة TheLordAI! 🤖');
      }
    } catch (err: any) {
      lordToast.error('خطأ في معالجة الصوت', err.message || 'حدث خطأ أثناء معالجة الصوت');
    } finally {
      setIsAnalyzingVoice(false);
    }
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!task?._id) return;

    const finalPlatform = targetPlatform === 'CUSTOM' ? (customPlatform.trim() || 'GENERAL_SYSTEM') : targetPlatform;
    const finalCategory = serviceCategory === 'CUSTOM' ? (customCategory.trim() || 'GENERAL') : serviceCategory;

    if (!isBountyTask && assignmentMode === 'EMPLOYEES' && selectedAssignees.length === 0) {
      lordToast.gold('إسناد المهمة', 'يرجى اختيار موظف واحد على الأقل، أو اختيار إسناد لقسم كامل');
      return;
    }

    try {
      const finalAssignees =
        assignmentMode === 'SELF'
          ? (currentUser?._id ? [currentUser._id] : [])
          : assignmentMode === 'EMPLOYEES'
            ? selectedAssignees
            : [];

      const payload: any = {
        title: taskTitle.trim(),
        description: taskDescription.trim(),
        targetPlatform: finalPlatform as any,
        serviceCategory: finalCategory as any,
        targetDepartment: assignmentMode === 'DEPARTMENT' ? (targetDepartment as any) : undefined,
        assignedTo: finalAssignees,
        executionType: assignmentMode === 'SELF' ? 'SELF' : 'ADMIN_ASSIGNED',
        priority: priority as any,
        dueDate: dueDate ? new Date(dueDate).toISOString() : undefined,
        isDailyRecurring,
        dailyRecurrenceTime: isDailyRecurring ? dailyRecurrenceTime : undefined,
        isBountyTask,
        bountyRewardAmount: isBountyTask ? Number(bountyRewardAmount) : 0,
        bountyClaimType: isBountyTask ? bountyClaimType : undefined,
        stages: stages.map((st, idx) => ({
          stageOrder: idx + 1,
          stageTitle: st.stageTitle.trim() || `المرحلة ${idx + 1}`,
          instructions: st.instructions || '',
          status: st.status || (idx === 0 ? 'IN_PROGRESS' : 'LOCKED'),
          requiredInputs: st.requiredInputs || [
            { fieldLabel: 'مرفق أو إثبات المرحلة', expectedType: 'IMAGE', isMandatory: true }
          ]
        })),
        financialRequirement: {
          requiresBudget,
          amount: Number(budgetAmount),
          currency: 'USDT',
          payoutMethodRequested: budgetPayoutMethod,
          justification: 'ميزانية تشغيلية وإعلانية للمهمة'
        }
      };

      await updateTask({
        id: task._id,
        data: payload
      }).unwrap();

      lordToast.success('تم حفظ التعديلات وتحديث مراحل المهمة بنجاح 💾');
      onSuccess?.(payload);
      onClose();
    } catch (err: any) {
      lordToast.error('فشل حفظ التعديلات', err?.data?.error || 'حدث خطأ أثناء تعديل المهمة');
    }
  };

  if (!task) return null;

  return (
    <AppModalPortal isOpen={isOpen} onClose={onClose} maxWidthClassName="max-w-3xl">
      <div className="bg-obsidian-surface border-2 border-lord-gold/60 rounded-3xl p-5 sm:p-7 md:p-8 shadow-2xl max-h-[92dvh] overflow-y-auto space-y-5 text-right">
        {/* Header (Same as CreateTaskModal) */}
        <div className="flex items-center justify-between border-b border-gray-800 pb-3">
          <h3 className="text-lg sm:text-xl font-black text-white flex items-center gap-2">
            <Edit3 className="w-5 h-5 text-lord-gold" />
            <span>تعديل المهمة وتحديث مراحل التنفيذ ✏️</span>
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl bg-obsidian-card hover:bg-gray-800 text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* THELORD AI VOICE-TO-TASK DIRECT GENERATOR */}
        <div className="p-4 bg-gradient-to-r from-obsidian-card via-amber-950/20 to-obsidian-card rounded-2xl border border-lord-gold/40 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-lord-gold flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-lord-gold" />
              <span>توليد وتخصيص المهمة صوتياً بالذكاء الاصطناعي (Voice-to-Task AI)</span>
            </span>
            <button
              type="button"
              onClick={() => setShowVoiceToTaskBox(!showVoiceToTaskBox)}
              className="text-[11px] font-bold text-lord-gold hover:underline"
            >
              {showVoiceToTaskBox ? 'إخفاء التسجيل ▲' : 'فتح التسجيل الصوتي 🎙️ ▼'}
            </button>
          </div>

          {showVoiceToTaskBox && (
            <div className="space-y-3 pt-2 border-t border-gray-800">
              <p className="text-[11px] text-gray-400">
                تحدث بحرية واشرح التعديل أو التكليف المطلوب، وسيقوم TheLordAI بتحليله وتحديث المراحل تلقائياً:
              </p>
              <DirectVoiceRecorder
                onRecordingComplete={({ durationInSeconds }: { durationInSeconds: number }) => {
                  handleVoiceToTaskAnalyze(`توجيه صوتي للمسؤول مدته ${durationInSeconds} ثانية لتعديل تفاصيل ومراحل المهمة`);
                }}
                onCancel={() => setShowVoiceToTaskBox(false)}
              />

              {voiceClarificationQuestions.length > 0 && (
                <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl space-y-2">
                  <span className="text-xs font-bold text-amber-400 block">
                    🤖 يحتاج TheLordAI لتوضيح التفاصيل التالية:
                  </span>
                  <ul className="text-xs text-gray-300 space-y-1 list-disc list-inside">
                    {voiceClarificationQuestions.map((q, idx) => (
                      <li key={idx} className="text-amber-200">{q}</li>
                    ))}
                  </ul>
                </div>
              )}

              {isAnalyzingVoice && (
                <div className="flex items-center justify-center p-3 text-xs text-lord-gold gap-2">
                  <span className="w-3 h-3 rounded-full border-2 border-lord-gold border-t-transparent animate-spin" />
                  <span>جاري تحليل الصوت وتحديث مراحل المهمة عبر Gemini 2.5...</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* QUICK PRESETS & DAILY ROUTINE SHORTCUTS */}
        <div className="p-4 bg-[#0a0d16] rounded-2xl border border-gray-800 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-300 flex items-center gap-1.5">
              <Repeat className="w-4 h-4 text-lord-gold" />
              قوالب المهام اليومية الروتينية (بنقرة واحدة):
            </span>
            <span className="text-[10px] text-gray-400">تعبئة وتحديث تلقائي</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <button
              type="button"
              onClick={() => handleApplyDailyRoutine('TRADING_ROUTINE')}
              className="p-2.5 rounded-xl bg-obsidian-primary/80 border border-gray-800 hover:border-lord-gold hover:text-lord-gold text-white text-[11px] font-bold text-right transition-all"
            >
              📈 روتين صفقات VIP
            </button>
            <button
              type="button"
              onClick={() => handleApplyDailyRoutine('MEDIA_ROUTINE')}
              className="p-2.5 rounded-xl bg-obsidian-primary/80 border border-gray-800 hover:border-blue-400 hover:text-blue-300 text-white text-[11px] font-bold text-right transition-all"
            >
              📱 روتين النشر والميديا
            </button>
            <button
              type="button"
              onClick={() => handleApplyDailyRoutine('DEV_ROUTINE')}
              className="p-2.5 rounded-xl bg-obsidian-primary/80 border border-gray-800 hover:border-emerald-400 hover:text-emerald-300 text-white text-[11px] font-bold text-right transition-all"
            >
              💻 روتين فحص السيرفرات
            </button>
            <button
              type="button"
              onClick={() => handleApplyDailyRoutine('SUPPORT_ROUTINE')}
              className="p-2.5 rounded-xl bg-obsidian-primary/80 border border-gray-800 hover:border-amber-400 hover:text-amber-300 text-white text-[11px] font-bold text-right transition-all"
            >
              🛡️ روتين الدعم الفني
            </button>
          </div>
        </div>

        {/* Main Form */}
        <form onSubmit={handleSaveEdit} className="space-y-5">
          {/* Title & Description */}
          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1">عنوان المهمة:</label>
            <input
              type="text"
              required
              placeholder="مثال: تحليل وإطلاق صفقة ETH/USDT عبر VIP وحملة تليجرام"
              value={taskTitle}
              onChange={e => setTaskTitle(e.target.value)}
              className="w-full bg-obsidian-primary border border-gray-700 rounded-xl px-4 py-2.5 text-sm text-white focus:border-lord-gold transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1">وصف المهمة وخطة العمل:</label>
            <textarea
              rows={2}
              required
              placeholder="اكتب التوجيهات التفصيلية للموظف أو القسم المكلف..."
              value={taskDescription}
              onChange={e => setTaskDescription(e.target.value)}
              className="w-full bg-obsidian-primary border border-gray-700 rounded-xl p-3 text-xs text-white focus:border-lord-gold transition-colors leading-relaxed"
            />
          </div>

          {/* Platform & Category */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1">المنصة المستهدفة:</label>
              <select
                value={targetPlatform}
                onChange={e => setTargetPlatform(e.target.value)}
                className="w-full bg-obsidian-primary border border-gray-700 rounded-xl px-3 py-2 text-xs text-white"
              >
                <option value="TG_VIP">قناة VIP الخاصة (تليجرام)</option>
                <option value="TG_MAIN">القناة العامة الأساسية (تليجرام)</option>
                <option value="TG_SECOND">القناة الفرعية (تليجرام)</option>
                <option value="X_1">حساب X / تويتر الرسمي</option>
                <option value="YOUTUBE">قناة يوتيوب الرسمية</option>
                <option value="FB">صفحة فيسبوك</option>
                <option value="IG">إنستغرام</option>
                <option value="GENERAL_SYSTEM">النظام العام الداخلي</option>
                <option value="CUSTOM">➕ إضافة منصة جديدة مخصصة...</option>
              </select>
              {targetPlatform === 'CUSTOM' && (
                <input
                  type="text"
                  required
                  placeholder="اكتب اسم المنصة الجديدة..."
                  value={customPlatform}
                  onChange={e => setCustomPlatform(e.target.value)}
                  className="mt-2 w-full bg-obsidian-primary border border-lord-gold rounded-xl px-3 py-2 text-xs text-white placeholder-gray-500"
                />
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1">الموضوع أو التصنيف:</label>
              <select
                value={serviceCategory}
                onChange={e => setServiceCategory(e.target.value)}
                className="w-full bg-obsidian-primary border border-gray-700 rounded-xl px-3 py-2 text-xs text-white"
              >
                <option value="VIP_CHANNEL">إشارات وصفقات VIP اليومية</option>
                <option value="FREE_SIGNALS">توصيات القناة العامة المجانية</option>
                <option value="ACCOUNT_MANAGEMENT">إدارة الحسابات وتوزيع الأرباح</option>
                <option value="COPY_TRADING">خدمة نسخ الصفقات</option>
                <option value="FUNDED_ACCOUNTS">اجتياز حسابات التمويل</option>
                <option value="INTERNAL_DEV">تطوير وتحديث البوتات والموقع</option>
                <option value="CUSTOM">➕ إضافة موضوع جديد مخصص...</option>
              </select>
              {serviceCategory === 'CUSTOM' && (
                <input
                  type="text"
                  required
                  placeholder="اكتب الموضوع أو التصنيف الجديد..."
                  value={customCategory}
                  onChange={e => setCustomCategory(e.target.value)}
                  className="mt-2 w-full bg-obsidian-primary border border-lord-gold rounded-xl px-3 py-2 text-xs text-white placeholder-gray-500"
                />
              )}
            </div>
          </div>

          {/* Priority & Deadline */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1">درجة الأولوية:</label>
              <select
                value={priority}
                onChange={e => setPriority(e.target.value)}
                className="w-full bg-obsidian-primary border border-gray-700 rounded-xl px-3 py-2 text-xs text-white"
              >
                <option value="CRITICAL">حرجة وعاجلة (CRITICAL) ⚡</option>
                <option value="HIGH">مرتفعة (HIGH)</option>
                <option value="MEDIUM">متوسطة (MEDIUM)</option>
                <option value="LOW">منخفضة (LOW)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1 flex items-center justify-between">
                <span>الوقت المحدد للمهمة (Deadline):</span>
                <span className="text-[10px] text-gray-400 font-normal">تاريخ وساعة التسليم</span>
              </label>
              <input
                type="datetime-local"
                value={dueDate}
                onChange={e => setDueDate(e.target.value)}
                className="w-full bg-obsidian-primary border border-gray-700 rounded-xl px-3 py-2 text-xs text-white focus:border-lord-gold"
              />
              <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                <button
                  type="button"
                  onClick={() => handleSetDeadlineHours(2)}
                  className="text-[10px] bg-obsidian-card hover:bg-gray-800 text-gray-300 px-2 py-0.5 rounded-lg border border-gray-800"
                >
                  خلال ساعتين ⚡
                </button>
                <button
                  type="button"
                  onClick={() => handleSetDeadlineHours(8)}
                  className="text-[10px] bg-obsidian-card hover:bg-gray-800 text-gray-300 px-2 py-0.5 rounded-lg border border-gray-800"
                >
                  نهاية اليوم 📅
                </button>
                <button
                  type="button"
                  onClick={() => handleSetDeadlineHours(24)}
                  className="text-[10px] bg-obsidian-card hover:bg-gray-800 text-gray-300 px-2 py-0.5 rounded-lg border border-gray-800"
                >
                  غداً (24س) 🕒
                </button>
                <button
                  type="button"
                  onClick={() => handleSetDeadlineHours(72)}
                  className="text-[10px] bg-obsidian-card hover:bg-gray-800 text-gray-300 px-2 py-0.5 rounded-lg border border-gray-800"
                >
                  3 أيام 🗓️
                </button>
              </div>
            </div>
          </div>

          {/* Assignment */}
          <TaskAssigneeSection
            assignmentMode={assignmentMode}
            onChangeMode={setAssignmentMode}
            currentUser={currentUser}
            employees={employees}
            selectedAssignees={selectedAssignees}
            onToggleAssignee={handleToggleAssignee}
            targetDepartment={targetDepartment}
            onChangeDepartment={setTargetDepartment}
          />

          {/* Daily Recurring */}
          <div className="p-4 bg-obsidian-card rounded-2xl border border-obsidian-border space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isDailyRecurring}
                  onChange={e => setIsDailyRecurring(e.target.checked)}
                  className="rounded text-lord-gold w-4 h-4 accent-lord-gold"
                />
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Repeat className="w-3.5 h-3.5 text-lord-gold" />
                  <span>مهمة روتينية يومية متكررة (Daily Routine Task)</span>
                </span>
              </label>

              {isDailyRecurring && (
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-gray-400">وقت التكرار:</span>
                  <input
                    type="text"
                    value={dailyRecurrenceTime}
                    onChange={e => setDailyRecurrenceTime(e.target.value)}
                    placeholder="09:00 ص"
                    className="w-24 bg-obsidian-primary border border-gray-700 rounded-lg px-2 py-1 text-xs text-white text-center"
                  />
                </div>
              )}
            </div>
            <p className="text-[11px] text-gray-400">
              تظهر المهمة يومياً في بداية دوام الكادر مع كافة مراحلها ومرفقاتها.
            </p>
          </div>

          {/* Bounty Task */}
          <div className="p-4 bg-gradient-to-r from-obsidian-card via-amber-950/15 to-obsidian-card rounded-2xl border border-lord-gold/30 space-y-3">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isBountyTask}
                  onChange={e => setIsBountyTask(e.target.checked)}
                  className="rounded text-lord-gold w-4 h-4"
                />
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Coins className="w-4 h-4 text-lord-gold" />
                  <span>مهمة بمكافأة وحافز مالي خاص (Bounty Task) 💰</span>
                </span>
              </label>
              {isBountyTask && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-lord-gold/20 text-lord-gold font-bold border border-lord-gold/40 animate-pulse">
                  حافز إنجاز فوري
                </span>
              )}
            </div>

            {isBountyTask && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-gray-800">
                <div>
                  <label className="text-xs font-semibold text-gray-300 block mb-1">
                    مبلغ المكافأة عند الاعتماد (USDT):
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={bountyRewardAmount}
                    onChange={e => setBountyRewardAmount(Number(e.target.value))}
                    className="w-full bg-obsidian-primary border border-gray-700 rounded-xl px-3 py-2 text-xs text-white focus:border-lord-gold"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-300 block mb-1">
                    آلية التكليف والتنافس:
                  </label>
                  <select
                    value={bountyClaimType}
                    onChange={e => setBountyClaimType(e.target.value as any)}
                    className="w-full bg-obsidian-primary border border-gray-700 rounded-xl px-3 py-2 text-xs text-white focus:border-lord-gold"
                  >
                    <option value="OPEN_COMPETITIVE">تنافس عام ومفتوح (أول من يقبل المهمة) ⚡</option>
                    <option value="DEDICATED">إسناد مخصص لموظف محدد 👤</option>
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* Dynamic Stages Builder */}
          <TaskStagesBuilderSection
            stages={stages}
            onApplyTemplate={handleApplyStageTemplate}
            onAddStage={handleAddStage}
            onRemoveStage={handleRemoveStage}
            onStageChange={handleStageChange}
            onRequiredInputChange={handleRequiredInputChange}
          />

          {/* Budget Requirement */}
          <div className="p-4 bg-obsidian-card rounded-2xl border border-obsidian-border space-y-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={requiresBudget}
                onChange={e => setRequiresBudget(e.target.checked)}
                className="rounded text-lord-gold"
              />
              <span className="text-xs font-bold text-white">تتطلب ميزانية مالية تصرف عبر الصندوق؟</span>
            </label>

            {requiresBudget && (
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-[11px] text-gray-400 mb-1">المبلغ المطلوب (USDT):</label>
                  <input
                    type="number"
                    min={1}
                    value={budgetAmount}
                    onChange={e => setBudgetAmount(Number(e.target.value))}
                    className="w-full bg-obsidian-primary border border-gray-700 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-gray-400 mb-1">وسيلة الصرف المعتمدة:</label>
                  <select
                    value={budgetPayoutMethod}
                    onChange={e => setBudgetPayoutMethod(e.target.value as any)}
                    className="w-full bg-obsidian-primary border border-gray-700 rounded-xl px-3 py-2 text-xs text-white"
                  >
                    <option value="BEP20_USDT">شبكة BEP20 (USDT)</option>
                    <option value="JEEB_WALLET">📱 محفظة جيب</option>
                    <option value="JAWALI_WALLET">📱 محفظة جوالي</option>
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* Form Action Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-gray-800">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onClose}
              disabled={isUpdating}
            >
              إلغاء
            </Button>
            <Button
              type="submit"
              variant="gold"
              size="md"
              isLoading={isUpdating}
              className="flex items-center gap-2 font-bold px-6 shadow-gold-glow"
            >
              <Save className="w-4 h-4 ml-1" />
              <span>حفظ التعديلات وتحديث المهمة 💾</span>
            </Button>
          </div>
        </form>
      </div>
    </AppModalPortal>
  );
};
