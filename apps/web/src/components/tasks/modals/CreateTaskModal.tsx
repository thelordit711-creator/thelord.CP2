'use client';

import React, { useState } from 'react';
import { AppModalPortal } from '../../ui/AppModalPortal';
import { Button } from '../../ui/Button';
import { DirectVoiceRecorder } from '../../voice/DirectVoiceRecorder';
import {
  Layers,
  X,
  Sparkles,
  Repeat,
  UserCheck,
  CheckCircle,
  Coins,
  Trash2,
  Plus
} from 'lucide-react';
import { lordToast } from '../../../lib/lordToast';
import { useCreateOrProposeTaskMutation } from '../../../store/api/tasksApi';
import { useGetAllEmployeesQuery } from '../../../store/api/usersApi';

interface CreateTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const CreateTaskModal: React.FC<CreateTaskModalProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const [createTask, { isLoading: isCreating }] = useCreateOrProposeTaskMutation();
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

  // Assignment: By Person (1 or more) or By Department
  const [assignmentMode, setAssignmentMode] = useState<'EMPLOYEES' | 'DEPARTMENT'>('EMPLOYEES');
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
  const [stages, setStages] = useState<any[]>([
    {
      stageOrder: 1,
      stageTitle: 'تحضير التحليل الفني ولقطة الشارت',
      instructions: 'تحديد مستويات الدخول والوقف بدقة عالية ونسبة مخاطرة 1:3',
      requiredInputs: [{ fieldLabel: 'لقطة شاشة الشارت والتحليل', expectedType: 'IMAGE', isMandatory: true }]
    },
    {
      stageOrder: 2,
      stageTitle: 'إنتاج البوستر الإعلاني والمونتاج',
      instructions: 'تصميم البوستر الملكي أو فيديو ريلز متوافق مع هوية The Lord',
      requiredInputs: [{ fieldLabel: 'ملف التصميم النهائي أو الفيديو', expectedType: 'IMAGE', isMandatory: true }]
    },
    {
      stageOrder: 3,
      stageTitle: 'النشر والتفاعل الرسمي وإحصائيات المشاهدات',
      instructions: 'إرفاق رابط المنشور وتقرير الوصول الأولي',
      requiredInputs: [{ fieldLabel: 'رابط المنشور الرسمي', expectedType: 'URL', isMandatory: true }]
    }
  ]);

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
    setStages(prev => prev.map((st, idx) => idx === index ? { ...st, [field]: value } : st));
  };

  const handleRequiredInputChange = (stageIdx: number, fieldName: string, value: any) => {
    setStages(prev => prev.map((st, idx) => {
      if (idx !== stageIdx) return st;
      const currentInputs = [...st.requiredInputs];
      currentInputs[0] = { ...currentInputs[0], [fieldName]: value };
      return { ...st, requiredInputs: currentInputs };
    }));
  };

  const handleApplyStageTemplate = (type: string) => {
    if (type === 'TRADING') {
      setStages([
        {
          stageOrder: 1,
          stageTitle: 'تحضير التحليل الفني ولقطة الشارت',
          instructions: 'تحديد مستويات الدخول والوقف بدقة عالية ونسبة مخاطرة 1:3',
          requiredInputs: [{ fieldLabel: 'لقطة شاشة الشارت الفني', expectedType: 'IMAGE', isMandatory: true }]
        },
        {
          stageOrder: 2,
          stageTitle: 'إنتاج البوستر الإعلاني والمونتاج',
          instructions: 'تصميم البوستر الملكي أو فيديو ريلز متوافق مع هوية The Lord',
          requiredInputs: [{ fieldLabel: 'ملف التصميم النهائي أو الفيديو', expectedType: 'IMAGE', isMandatory: true }]
        },
        {
          stageOrder: 3,
          stageTitle: 'النشر والتفاعل الرسمي وإحصائيات المشاهدات',
          instructions: 'إرفاق رابط المنشور وتقرير الوصول الأولي',
          requiredInputs: [{ fieldLabel: 'رابط المنشور الرسمي', expectedType: 'URL', isMandatory: true }]
        }
      ]);
      lordToast.gold('قالب المراحل', 'تم تطبيق قالب مراحل صفقات VIP 📈');
    } else if (type === 'MEDIA') {
      setStages([
        {
          stageOrder: 1,
          stageTitle: 'تجهيز النص والسيناريو الإعلاني',
          instructions: 'صياغة هوك قوي ومحتوى جذاب متوافق مع هوية The Lord',
          requiredInputs: [{ fieldLabel: 'ملف أو نص السيناريو', expectedType: 'TEXT', isMandatory: true }]
        },
        {
          stageOrder: 2,
          stageTitle: 'المونتاج والتصدير النهائي 1080p',
          instructions: 'مونتاج الفيديو مع المؤثرات الصوتية وشعار The Lord',
          requiredInputs: [{ fieldLabel: 'الفيديو النهائي المُمنتج', expectedType: 'VIDEO', isMandatory: true }]
        },
        {
          stageOrder: 3,
          stageTitle: 'النشر والترويج ورصد التفاعل',
          instructions: 'رفع الفيديو على القناة أو المنصة ومتابعة أول ساعة تفاعل',
          requiredInputs: [{ fieldLabel: 'رابط الفيديو المنشور', expectedType: 'URL', isMandatory: true }]
        }
      ]);
      lordToast.gold('قالب المراحل', 'تم تطبيق قالب مراحل المونتاج والميديا 🎬');
    } else if (type === 'DEV') {
      setStages([
        {
          stageOrder: 1,
          stageTitle: 'دراسة المتطلبات وربط الـ API',
          instructions: 'فحص التوثيق وتجربة الاتصال ونقاط النهاية (Endpoints)',
          requiredInputs: [{ fieldLabel: 'مستند المواصفات الفنية أو التقرير', expectedType: 'DOCUMENT', isMandatory: true }]
        },
        {
          stageOrder: 2,
          stageTitle: 'كتابة الكود البرمجي واختبار البوت',
          instructions: 'تطوير الوظيفة واختبار الأداء والتعامل مع أخطاء الشبكة',
          requiredInputs: [{ fieldLabel: 'الكود البرمجي المكتوب', expectedType: 'CODE_SNIPPET', isMandatory: true }]
        },
        {
          stageOrder: 3,
          stageTitle: 'النشر على السيرفر ومراقبة الـ Logs',
          instructions: 'رفع الكود على السيرفر الحي والتأكد من استقرار التشغيل',
          requiredInputs: [{ fieldLabel: 'رابط السيرفر أو تقرير النشر', expectedType: 'URL', isMandatory: true }]
        }
      ]);
      lordToast.gold('قالب المراحل', 'تم تطبيق قالب مراحل التطوير والبرمجة 💻');
    } else if (type === 'SINGLE') {
      setStages([
        {
          stageOrder: 1,
          stageTitle: 'تنفيذ المهمة وتسليم المخرجات كاملة',
          instructions: 'قم بإنجاز متطلبات المهمة ورفع الإثبات النهائي للاعتماد المباشر',
          requiredInputs: [{ fieldLabel: 'ملف الإنجاز أو الرابط', expectedType: 'ANY_FILE', isMandatory: true }]
        }
      ]);
      lordToast.gold('قالب المراحل', 'تم تطبيق قالب المرحلة المباشرة ⚡');
    }
  };

  const handleApplyDailyRoutine = (routineType: string) => {
    setIsDailyRecurring(true);
    if (routineType === 'TRADING_ROUTINE') {
      setTaskTitle('التقرير الصباحي وإشارة صفقات VIP اليومية 📈');
      setTaskDescription('تحليل تحركات BTC والذهب وتجهيز تقرير الصباح ونشر صفقة اليوم في قناة VIP مع تحديد وقف الخسارة ونسبة العائد.');
      setTargetPlatform('TG_VIP');
      setServiceCategory('VIP_CHANNEL');
      setPriority('HIGH');
      setDailyRecurrenceTime('09:30 ص');
      setAssignmentMode('DEPARTMENT');
      setTargetDepartment('TRADING');
      handleApplyStageTemplate('TRADING');
      lordToast.success('تم تحميل روتين محلل التداول اليومي 📈');
    } else if (routineType === 'MEDIA_ROUTINE') {
      setTaskTitle('النشر والمونتاج اليومي على قنوات التليجرام والميديا 📱');
      setTaskDescription('تصميم ونشر 3 منشورات تحليلية في القناة العامة، ومونتاج فيديو ريلز ونشره، ومتابعة نسبة الوصول اليومية.');
      setTargetPlatform('TG_MAIN');
      setServiceCategory('ACCOUNT_MANAGEMENT');
      setPriority('MEDIUM');
      setDailyRecurrenceTime('11:00 ص');
      setAssignmentMode('DEPARTMENT');
      setTargetDepartment('CONTENT_MEDIA');
      handleApplyStageTemplate('MEDIA');
      lordToast.success('تم تحميل روتين النشر والميديا اليومي 📱');
    } else if (routineType === 'DEV_ROUTINE') {
      setTaskTitle('الفحص الصباحي لخوادم البوتات واستقرار الـ API 💻');
      setTaskDescription('مراقبة صحة سيرفرات تداول البوتات، وفحص استجابة الـ API وWebhooks، والتأكد من عدم وجود أخطاء في الـ Logs.');
      setTargetPlatform('GENERAL_SYSTEM');
      setServiceCategory('INTERNAL_DEV');
      setPriority('HIGH');
      setDailyRecurrenceTime('08:30 ص');
      setAssignmentMode('DEPARTMENT');
      setTargetDepartment('DEVELOPMENT');
      handleApplyStageTemplate('DEV');
      lordToast.success('تم تحميل روتين فحص السيرفرات اليومي 💻');
    } else if (routineType === 'SUPPORT_ROUTINE') {
      setTaskTitle('المتابعة اليومية لخدمة المشتركين وتذاكر VIP 🛡️');
      setTaskDescription('الرد على كافة استفسارات المشتركين، حل مشاكل تفعيل اشتراكات VIP، ورفع تقرير يومي بعدد التذاكر المنجزة.');
      setTargetPlatform('TG_VIP');
      setServiceCategory('VIP_CHANNEL');
      setPriority('MEDIUM');
      setDailyRecurrenceTime('10:00 ص');
      setAssignmentMode('DEPARTMENT');
      setTargetDepartment('SUPPORT');
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
      const token = typeof window !== 'undefined' ? localStorage.getItem('lord_auth_token') : null;
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';
      const res = await fetch(`${apiUrl}/ai/voice-to-task`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
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
          setStages(t.stages.map((st: any, idx: number) => ({
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
          })));
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const finalPlatform = targetPlatform === 'CUSTOM' ? (customPlatform.trim() || 'GENERAL_SYSTEM') : targetPlatform;
    const finalCategory = serviceCategory === 'CUSTOM' ? (customCategory.trim() || 'GENERAL') : serviceCategory;

    if (!isBountyTask && assignmentMode === 'EMPLOYEES' && selectedAssignees.length === 0) {
      lordToast.gold('إسناد المهمة', 'يرجى اختيار موظف واحد على الأقل، أو اختيار إسناد لقسم كامل');
      return;
    }

    try {
      await createTask({
        title: taskTitle,
        description: taskDescription,
        targetPlatform: finalPlatform as any,
        serviceCategory: finalCategory as any,
        targetDepartment: assignmentMode === 'DEPARTMENT' ? (targetDepartment as any) : undefined,
        assignedTo: assignmentMode === 'EMPLOYEES' ? selectedAssignees : [],
        priority: priority as any,
        dueDate: dueDate ? new Date(dueDate).toISOString() : undefined,
        isDailyRecurring,
        dailyRecurrenceTime: isDailyRecurring ? dailyRecurrenceTime : undefined,
        isBountyTask,
        bountyRewardAmount: isBountyTask ? Number(bountyRewardAmount) : 0,
        bountyClaimType: isBountyTask ? bountyClaimType : undefined,
        stages: stages as any,
        financialRequirement: {
          requiresBudget,
          amount: Number(budgetAmount),
          currency: 'USDT',
          payoutMethodRequested: budgetPayoutMethod,
          justification: 'ميزانية تشغيلية وإعلانية للمهمة'
        }
      }).unwrap();

      lordToast.success('تم نشر المهمة وبناء مراحل التنفيذ بنجاح 🚀');
      onSuccess?.();
      onClose();
    } catch (err: any) {
      lordToast.error('تعذر إنشاء المهمة', err?.data?.error || 'حدث خطأ أثناء نشر المهمة');
    }
  };

  return (
    <AppModalPortal isOpen={isOpen} onClose={onClose} maxWidthClassName="max-w-3xl">
      <div className="bg-obsidian-surface border-2 border-lord-gold/60 rounded-3xl p-5 sm:p-7 md:p-8 shadow-2xl max-h-[92dvh] overflow-y-auto space-y-5">
        <div className="flex items-center justify-between border-b border-gray-800 pb-3">
          <h3 className="text-lg sm:text-xl font-black text-white flex items-center gap-2">
            <Layers className="w-5 h-5 text-lord-gold" />
            <span>إنشاء مهمة وبناء مراحل التنفيذ المخصصة</span>
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl bg-obsidian-card hover:bg-gray-800 text-gray-400 hover:text-white"
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
                تحدث بحرية واشرح التكليف المطلوب، وسيقوم TheLordAI بتحليله واستخراج المراحل وسؤالك عن أي تفاصيل ناقصة:
              </p>
              <DirectVoiceRecorder
                onRecordingComplete={({ durationInSeconds }: { durationInSeconds: number }) => {
                  handleVoiceToTaskAnalyze(`توجيه صوتي للمسؤول مدته ${durationInSeconds} ثانية لإنجاز العمل وتكليف الكادر المختص بمراحله`);
                }}
                onCancel={() => setShowVoiceToTaskBox(false)}
              />

              {voiceClarificationQuestions.length > 0 && (
                <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl space-y-2">
                  <span className="text-xs font-bold text-amber-400 block">
                    🤖 يحتاج TheLordAI لتوضيح التفاصيل التالية قبل اعتماد المهمة:
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
                  <span>جاري تحليل الصوت وهيكلة مراحل المهمة عبر Gemini 2.5...</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* QUICK PRESETS & DAILY ROUTINE SHORTCUTS */}
        <div className="p-4 bg-gradient-to-r from-obsidian-card via-purple-950/20 to-obsidian-card rounded-2xl border border-purple-500/30 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-purple-300 flex items-center gap-1.5">
              <Repeat className="w-4 h-4 text-purple-400 animate-spin-slow" />
              قوالب المهام اليومية الروتينية (بنقرة واحدة):
            </span>
            <span className="text-[10px] text-gray-400">تعبئة وإسناد تلقائي</span>
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

        <form onSubmit={handleSubmit} className="space-y-5">
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
              className="w-full bg-obsidian-primary border border-gray-700 rounded-xl p-3 text-xs text-white focus:border-lord-gold transition-colors"
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
                  className="mt-2 w-full bg-obsidian-primary border border-lord-gold rounded-xl px-3 py-2 text-xs text-white placeholder-gray-500 animate-fadeIn"
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
                  className="mt-2 w-full bg-obsidian-primary border border-lord-gold rounded-xl px-3 py-2 text-xs text-white placeholder-gray-500 animate-fadeIn"
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
          <div className="p-4 bg-obsidian-card rounded-2xl border border-obsidian-border space-y-3">
            <div className="flex items-center justify-between border-b border-gray-800 pb-2">
              <span className="text-xs font-bold text-white flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-lord-gold" />
                <span>إسناد المهمة (المكلف بالتنفيذ والتسليم):</span>
              </span>

              <div className="flex items-center gap-1 bg-obsidian-primary p-0.5 rounded-xl border border-gray-800 text-[11px]">
                <button
                  type="button"
                  onClick={() => setAssignmentMode('EMPLOYEES')}
                  className={`px-3 py-1 rounded-lg font-bold transition-all ${
                    assignmentMode === 'EMPLOYEES'
                      ? 'bg-lord-gold text-obsidian-primary shadow-sm'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  موظف أو أكثر 👤
                </button>
                <button
                  type="button"
                  onClick={() => setAssignmentMode('DEPARTMENT')}
                  className={`px-3 py-1 rounded-lg font-bold transition-all ${
                    assignmentMode === 'DEPARTMENT'
                      ? 'bg-purple-600 text-white shadow-sm'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  قسم كامل 🏢
                </button>
              </div>
            </div>

            {assignmentMode === 'EMPLOYEES' ? (
              <div className="space-y-2">
                <p className="text-[11px] text-gray-400">
                  اختر شخصاً واحداً أو شخصين أو عدة أشخاص للعمل معاً على المهمة:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-36 overflow-y-auto pr-1">
                  {employees.map((emp: any) => {
                    const isSelected = selectedAssignees.includes(emp._id);
                    return (
                      <div
                        key={emp._id}
                        onClick={() => handleToggleAssignee(emp._id)}
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
                            <span className="text-[9px] text-gray-400 block">{emp.primaryDepartment} - {emp.jobTitles?.[0] || emp.accessRole}</span>
                          </div>
                        </div>
                        <span className={`w-4 h-4 rounded-md border flex items-center justify-center text-[10px] ${
                          isSelected ? 'bg-lord-gold text-obsidian-primary border-lord-gold' : 'border-gray-600'
                        }`}>
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
                  onChange={e => setTargetDepartment(e.target.value)}
                  className="w-full bg-obsidian-primary border border-gray-700 rounded-xl px-3 py-2 text-xs text-white"
                >
                  <option value="TRADING">📈 قسم التداول والتحليلات الفنية (TRADING)</option>
                  <option value="MARKETING">🎯 قسم التسويق والحملات الإعلانية (MARKETING)</option>
                  <option value="CONTENT_MEDIA">🎬 قسم المونتاج والمحتوى والتصميم (CONTENT_MEDIA)</option>
                  <option value="DEVELOPMENT">💻 قسم البرمجة وتطوير البوتات (DEVELOPMENT)</option>
                  <option value="SUPPORT">🛡️ قسم خدمة العملاء والدعم الفني (SUPPORT)</option>
                  <option value="ALL_DEPARTMENTS">🌐 كافة أقسام وكوادر المنظومة (ALL)</option>
                </select>
                <p className="text-[11px] text-purple-300 font-semibold">
                  🏢 سيتم إدراج المهمة تلقائياً في جداول عمل جميع أعضاء هذا القسم.
                </p>
              </div>
            )}
          </div>

          {/* Daily Recurring */}
          <div className="p-4 bg-obsidian-card rounded-2xl border border-obsidian-border space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isDailyRecurring}
                  onChange={e => setIsDailyRecurring(e.target.checked)}
                  className="rounded text-purple-500 w-4 h-4"
                />
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Repeat className="w-3.5 h-3.5 text-purple-400" />
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
              عند تفعيل هذا الخيار، ستظهر المهمة يومياً في بداية دوام الموظفين مع مراحلها لإنجازها بشكل مستمر.
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
                <button
                  type="button"
                  onClick={() => handleApplyStageTemplate('TRADING')}
                  className="text-[10px] bg-obsidian-surface hover:bg-gray-800 text-lord-gold px-2 py-1 rounded-lg border border-gray-800"
                >
                  صفقة VIP
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyStageTemplate('MEDIA')}
                  className="text-[10px] bg-obsidian-surface hover:bg-gray-800 text-blue-400 px-2 py-1 rounded-lg border border-gray-800"
                >
                  مونتاج فيديو
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyStageTemplate('DEV')}
                  className="text-[10px] bg-obsidian-surface hover:bg-gray-800 text-emerald-400 px-2 py-1 rounded-lg border border-gray-800"
                >
                  برمجة بوت
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyStageTemplate('SINGLE')}
                  className="text-[10px] bg-obsidian-surface hover:bg-gray-800 text-gray-300 px-2 py-1 rounded-lg border border-gray-800"
                >
                  مرحلة واحدة
                </button>
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
                        onChange={e => handleStageChange(idx, 'stageTitle', e.target.value)}
                        className="flex-1 bg-obsidian-surface border border-gray-700 focus:border-lord-gold rounded-xl px-3 py-1.5 text-xs text-white font-bold"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemoveStage(idx)}
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
                      onChange={e => handleStageChange(idx, 'instructions', e.target.value)}
                      className="w-full bg-obsidian-surface border border-gray-800 rounded-xl px-3 py-1.5 text-[11px] text-gray-300 placeholder-gray-500 focus:border-lord-gold"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 p-2 bg-obsidian-card rounded-xl border border-gray-800/80">
                    <div className="sm:col-span-1">
                      <label className="block text-[10px] text-gray-400 mb-0.5">نوع المرفق المطلوب:</label>
                      <select
                        value={st.requiredInputs?.[0]?.expectedType || 'IMAGE'}
                        onChange={e => handleRequiredInputChange(idx, 'expectedType', e.target.value)}
                        className="w-full bg-obsidian-surface border border-gray-700 rounded-lg px-2 py-1 text-[11px] text-white"
                      >
                        <option value="IMAGE">📸 صورة / لقطة شاشة شارت</option>
                        <option value="VIDEO">🎬 فيديو مونتاج / ريلز</option>
                        <option value="URL">🔗 رابط منشور رسمي / URL</option>
                        <option value="DOCUMENT">📄 مستند وثائقي / PDF</option>
                        <option value="CODE_SNIPPET">💻 كود برمجي / سكريبت</option>
                        <option value="VOICE_NOTE">🎙️ تسجيل صوتي مباشر</option>
                        <option value="TEXT">✍️ تقرير نصي وشرح</option>
                        <option value="ANY_FILE">📁 أي ملف أو مرفق</option>
                      </select>
                    </div>

                    <div className="sm:col-span-1">
                      <label className="block text-[10px] text-gray-400 mb-0.5">اسم المرفق:</label>
                      <input
                        type="text"
                        value={st.requiredInputs?.[0]?.fieldLabel || ''}
                        onChange={e => handleRequiredInputChange(idx, 'fieldLabel', e.target.value)}
                        placeholder="مثال: لقطة الشارت الفني"
                        className="w-full bg-obsidian-surface border border-gray-700 rounded-lg px-2 py-1 text-[11px] text-white"
                      />
                    </div>

                    <div className="sm:col-span-1 flex items-end pb-1">
                      <label className="flex items-center gap-1.5 cursor-pointer text-[11px] text-gray-300">
                        <input
                          type="checkbox"
                          checked={st.requiredInputs?.[0]?.isMandatory !== false}
                          onChange={e => handleRequiredInputChange(idx, 'isMandatory', e.target.checked)}
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
              onClick={handleAddStage}
              className="w-full rounded-xl border border-dashed border-gray-700 hover:border-lord-gold hover:text-lord-gold flex items-center justify-center gap-1.5 py-2.5 text-xs font-bold"
            >
              <Plus className="w-4 h-4" />
              <span>+ إضافة مرحلة جديدة إلى مسار المهمة</span>
            </Button>
          </div>

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
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-800">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onClose}
            >
              إلغاء
            </Button>
            <Button
              type="submit"
              variant="gold"
              size="md"
              isLoading={isCreating}
            >
              نشر المهمة واعتماد المراحل 🚀
            </Button>
          </div>
        </form>
      </div>
    </AppModalPortal>
  );
};
