'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { AppModalPortal } from '../../ui/AppModalPortal';
import { useCreateOrProposeTaskMutation } from '../../../store/api/tasksApi';
import { useGetAllEmployeesQuery } from '../../../store/api/usersApi';
import {
  CheckSquare,
  Coins,
  AlertCircle,
  X,
  Send,
  Layers,
  Plus,
  Trash2,
  Clock,
  Sparkles,
  TrendingUp,
  Share2,
  Code2,
  Zap,
  Calendar,
  Wallet,
  UserCheck
} from 'lucide-react';
import { lordToast } from '../../../lib/lordToast';

interface AssignQuickTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  employee: any;
}

type DeliverableType = 'IMAGE' | 'URL' | 'TEXT' | 'DOCUMENT' | 'CODE_SNIPPET' | 'VIDEO';

interface QuickStageItem {
  stageOrder: number;
  stageTitle: string;
  instructions: string;
  expectedType: DeliverableType;
  fieldLabel: string;
}

type TemplateType = 'SINGLE' | 'TRADING' | 'MEDIA' | 'DEV';

export const AssignQuickTaskModal: React.FC<AssignQuickTaskModalProps> = ({
  isOpen,
  onClose,
  employee
}) => {
  const [createTask, { isLoading }] = useCreateOrProposeTaskMutation();
  const { data: employeesData } = useGetAllEmployeesQuery();
  const allEmployees: any[] = employeesData?.data || [];

  // Selected Assignee (defaults to passed employee)
  const [selectedAssigneeId, setSelectedAssigneeId] = useState<string>('');

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'>('HIGH');
  const [dueDate, setDueDate] = useState<string>('');
  const [budgetAmount, setBudgetAmount] = useState<number | ''>('');
  const [payoutMethod, setPayoutMethod] = useState<'BEP20_USDT' | 'JEEB_WALLET' | 'JAWALI_WALLET'>('BEP20_USDT');
  const [activeTemplate, setActiveTemplate] = useState<TemplateType>('SINGLE');

  // Default: EXACTLY 1 STAGE
  const [stages, setStages] = useState<QuickStageItem[]>([
    {
      stageOrder: 1,
      stageTitle: 'المرحلة 1: التنفيذ وإرفاق المخرجات المباشرة',
      instructions: 'إنجاز متطلبات المهمة بدقة وإرفاق الإثبات أو رابط المخرجات',
      expectedType: 'IMAGE',
      fieldLabel: 'مرفق أو إثبات إنجاز المرحلة'
    }
  ]);

  // Clean reset every time modal opens or employee changes
  useEffect(() => {
    if (isOpen && employee) {
      setSelectedAssigneeId(employee._id || employee.id || '');
      setTitle('');
      setDescription('');
      setPriority('HIGH');
      setDueDate('');
      setBudgetAmount('');
      setPayoutMethod('BEP20_USDT');
      setActiveTemplate('SINGLE');

      // Strict enforcement: Default is ALWAYS 1 single stage
      setStages([
        {
          stageOrder: 1,
          stageTitle: 'المرحلة 1: التنفيذ وإرفاق المخرجات المباشرة',
          instructions: 'إنجاز متطلبات المهمة بدقة وإرفاق الإثبات أو رابط المخرجات',
          expectedType: 'IMAGE',
          fieldLabel: 'مرفق أو إثبات إنجاز المرحلة'
        }
      ]);
    }
  }, [isOpen, employee]);

  // Find currently selected employee object
  const currentAssignee = useMemo(() => {
    if (!selectedAssigneeId) return employee;
    const found = allEmployees.find((e: any) => String(e._id) === String(selectedAssigneeId));
    return found || employee;
  }, [allEmployees, selectedAssigneeId, employee]);

  // Apply Presets Templates
  const applyStageTemplate = (type: TemplateType) => {
    setActiveTemplate(type);

    if (type === 'SINGLE') {
      setStages([
        {
          stageOrder: 1,
          stageTitle: 'المرحلة 1: التنفيذ وإرفاق المخرجات المباشرة',
          instructions: 'إنجاز متطلبات المهمة بدقة وإرفاق الإثبات أو رابط المخرجات',
          expectedType: 'IMAGE',
          fieldLabel: 'مرفق أو إثبات إنجاز المرحلة'
        }
      ]);
      lordToast.gold('قالب المراحل', 'تم اعتماد قالب المرحلة الواحدة السريعة ⚡');
    } else if (type === 'TRADING') {
      if (!title) setTitle('تحليل فني وصفقة تداول احترافية 📈');
      setStages([
        {
          stageOrder: 1,
          stageTitle: 'تحضير التحليل الفني ولقطة الشارت',
          instructions: 'تحديد مستويات الدخول، أمر الوقف (SL)، والأهداف بدقة مع نسبة مخاطرة 1:3',
          expectedType: 'IMAGE',
          fieldLabel: 'لقطة شاشة الشارت والتحليل الفني'
        },
        {
          stageOrder: 2,
          stageTitle: 'صياغة التوصية والتقرير الإرشادي',
          instructions: 'كتابة نص التوصية متضمناً شروط الدخول وإدارة رأس المال بدقة للمشتركين',
          expectedType: 'TEXT',
          fieldLabel: 'نص التوصية والتعليمات المكتوبة'
        },
        {
          stageOrder: 3,
          stageTitle: 'النشر في القناة ومتابعة النتائج',
          instructions: 'نشر التوصية في القناة المخصصة ومتابعة ضرب الأهداف وتحديث المشتركين',
          expectedType: 'URL',
          fieldLabel: 'رابط المنشور الرسمي في القناة'
        }
      ]);
      lordToast.gold('قالب التداول', 'تم تطبيق قالب مهام التداول (3 مراحل) 📈');
    } else if (type === 'MEDIA') {
      if (!title) setTitle('إنتاج ونشر محتوى ترويجي للقنوات 📱');
      setStages([
        {
          stageOrder: 1,
          stageTitle: 'صياغة المحتوى والنص الإعلاني',
          instructions: 'كتابة محتوى تسويقي جذاب واحترافي متوافق مع معايير The Lord',
          expectedType: 'TEXT',
          fieldLabel: 'المسودة النصية المعتمدة'
        },
        {
          stageOrder: 2,
          stageTitle: 'تصميم البوستر الجرافيكي أو المونتاج',
          instructions: 'إخراج التصميم أو الفيديو بأعلى دقة وتنسيق مرئي ملكي',
          expectedType: 'IMAGE',
          fieldLabel: 'ملف التصميم النهائي أو الفيديو'
        },
        {
          stageOrder: 3,
          stageTitle: 'النشر الرسمي وجلب إحصائيات التفاعل',
          instructions: 'النشر في التوقيت المناسب وإرفاق رابط المنشور وتقرير الوصول الأولي',
          expectedType: 'URL',
          fieldLabel: 'رابط المنشور المباشر'
        }
      ]);
      lordToast.gold('قالب الميديا', 'تم تطبيق قالب مهام الميديا (3 مراحل) 📱');
    } else if (type === 'DEV') {
      if (!title) setTitle('صيانة وتحديث خوادم البوتات والـ API 💻');
      setStages([
        {
          stageOrder: 1,
          stageTitle: 'فحص السيرفرات والأكواد ومسارات الـ API',
          instructions: 'مراجعة سجلات الأخطاء (Logs) والتحقق من استقرار نقاط الاتصال وWebhooks',
          expectedType: 'CODE_SNIPPET',
          fieldLabel: 'سجل الفحص أو مقتطف الكود المعدل'
        },
        {
          stageOrder: 2,
          stageTitle: 'تطبيق التحديث وإصلاح المشكلة التقنية',
          instructions: 'برمجة التعديل واختبار الاستجابة محلياً والتأكد من عدم وجود تعارض',
          expectedType: 'DOCUMENT',
          fieldLabel: 'تقرير التعديلات البرمجية'
        },
        {
          stageOrder: 3,
          stageTitle: 'النشر على السيرفر الحي وتأكيد الاستقرار',
          instructions: 'النشر النهائي وتأكيد عمل الخدمة دون أي انقطاع',
          expectedType: 'URL',
          fieldLabel: 'رابط فحص الخدمة الحية'
        }
      ]);
      lordToast.gold('قالب البرمجة', 'تم تطبيق قالب مهام البرمجة (3 مراحل) 💻');
    }
  };

  const handleAddStage = () => {
    const nextOrder = stages.length + 1;
    setStages(prev => [
      ...prev,
      {
        stageOrder: nextOrder,
        stageTitle: `المرحلة ${nextOrder}: خطوة تنفيذية جديدة`,
        instructions: 'يرجى كتابة تعليمات ومخرجات هذه المرحلة للموظف',
        expectedType: 'IMAGE',
        fieldLabel: 'مرفق أو إثبات إنجاز المرحلة'
      }
    ]);
  };

  const handleRemoveStage = (index: number) => {
    if (stages.length <= 1) {
      lordToast.gold('تنبيه المراحل', 'يجب أن تحتوي المهمة على مرحلة تنفيذ واحدة على الأقل');
      return;
    }
    const updated = stages
      .filter((_, idx) => idx !== index)
      .map((st, idx) => ({
        ...st,
        stageOrder: idx + 1
      }));
    setStages(updated);
  };

  const handleStageChange = (index: number, field: keyof QuickStageItem, value: any) => {
    setStages(prev =>
      prev.map((st, idx) => (idx === index ? { ...st, [field]: value } : st))
    );
  };

  const handleSetDeadlineHours = (hours: number) => {
    const targetDate = new Date(Date.now() + hours * 60 * 60 * 1000);
    const iso = new Date(targetDate.getTime() - targetDate.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16);
    setDueDate(iso);
    lordToast.gold('الموعد النهائي', `تم ضبط التسليم: بعد ${hours} ساعة`);
  };

  if (!isOpen || !employee) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      lordToast.error('يرجى كتابة عنوان المهمة');
      return;
    }

    const assigneeId = selectedAssigneeId || employee._id;
    if (!assigneeId) {
      lordToast.error('يرجى تحديد الموظف المكلف بالمهمة');
      return;
    }

    try {
      const formattedStages = stages.map((st, idx) => ({
        stageOrder: idx + 1,
        stageTitle: st.stageTitle.trim() || `المرحلة ${idx + 1}`,
        instructions: st.instructions.trim() || 'يرجى إنجاز متطلبات هذه المرحلة',
        status: idx === 0 ? 'IN_PROGRESS' : 'LOCKED',
        requiredInputs: [
          {
            fieldLabel: st.fieldLabel.trim() || 'إثبات أو مخرجات المرحلة',
            expectedType: st.expectedType,
            isMandatory: true
          }
        ]
      }));

      await createTask({
        title: title.trim(),
        description: description.trim() || title.trim(),
        targetPlatform: 'GENERAL_SYSTEM',
        serviceCategory: 'OPERATIONAL',
        targetDepartment: currentAssignee?.primaryDepartment || employee?.primaryDepartment || undefined,
        assignedTo: [assigneeId],
        executionType: 'ADMIN_ASSIGNED',
        priority,
        dueDate: dueDate ? new Date(dueDate).toISOString() : undefined,
        stages: formattedStages as any,
        financialRequirement: {
          requiresBudget: Number(budgetAmount) > 0,
          amount: Number(budgetAmount) || 0,
          currency: 'USDT',
          payoutMethodRequested: payoutMethod,
          justification: 'ميزانية تشغيلية مسندة للمهمة'
        }
      } as any).unwrap();

      lordToast.success(
        `تم إسناد المهمة بنجاح (${stages.length} مراحل) إلى ${currentAssignee?.fullName || employee?.fullName}! 🚀`
      );
      onClose();
    } catch (err: any) {
      lordToast.error(err?.data?.error || err.message || 'تعذر إسناد المهمة');
    }
  };

  return (
    <AppModalPortal isOpen={isOpen} onClose={onClose} maxWidthClassName="max-w-2xl">
      <div className="w-full bg-[#090c15] border-2 border-lord-gold/60 rounded-3xl shadow-2xl p-5 sm:p-7 text-white text-right max-h-[90vh] overflow-y-auto scroll-touch">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-800/80 pb-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-lord-gold/15 border border-lord-gold/40 flex items-center justify-center font-black text-lord-gold text-lg shadow-sm">
              <CheckSquare className="w-5 h-5 text-lord-gold" />
            </div>
            <div>
              <h3 className="text-base font-black text-white flex items-center gap-2">
                <span>إسناد مهمة جديدة للموظف</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-lord-gold/15 border border-lord-gold/40 text-lord-gold font-bold">
                  مرحلية مبسطة ⚡
                </span>
              </h3>
              <p className="text-xs text-gray-400">
                حدد تفاصيل ومراحل المهمة ليتم تكليف الموظف بها ومتابعتها لحظياً
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-gray-800/60 text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 1. Bar: Prominent Assignee Card (يظهر لمن يتم الإسناد بوضوح تام مع إمكانية التبديل) */}
        <div className="mb-4 p-3.5 rounded-2xl bg-[#0f1422] border-2 border-lord-gold/40 flex items-center justify-between gap-3 shadow-md">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-2xl bg-lord-gold/20 border border-lord-gold/50 flex items-center justify-center font-black text-lord-gold text-base shrink-0 shadow-inner">
              {currentAssignee?.fullName?.charAt(0) || '👤'}
            </div>
            <div className="min-w-0">
              <div className="text-[10px] text-lord-gold font-black flex items-center gap-1.5 uppercase tracking-wider mb-0.5">
                <UserCheck className="w-3.5 h-3.5 text-lord-gold" />
                <span>الموظف المكلف بالتنفيذ المباشر:</span>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse inline-block" />
              </div>
              <div className="text-sm font-black text-white truncate flex items-center gap-2">
                <span>{currentAssignee?.fullName || employee?.fullName}</span>
                <span className="text-[10px] px-2 py-0.5 rounded-md bg-gray-800 text-gray-300 font-mono">
                  {currentAssignee?.primaryDepartment || employee?.primaryDepartment || 'العمليات'}
                </span>
              </div>
              <div className="text-[11px] text-gray-400 font-mono truncate">
                {currentAssignee?.jobTitles?.[0] || employee?.jobTitles?.[0] || 'كادر معتمد'}
                {currentAssignee?.email ? ` • ${currentAssignee.email}` : ''}
              </div>
            </div>
          </div>

          {/* Switch Assignee Dropdown */}
          {allEmployees.length > 1 && (
            <div className="shrink-0 text-left">
              <label className="block text-[10px] text-gray-400 font-bold mb-1">تبديل الموظف:</label>
              <select
                value={selectedAssigneeId}
                onChange={(e) => setSelectedAssigneeId(e.target.value)}
                className="px-2.5 py-1.5 rounded-xl bg-gray-900 border border-gray-700 text-xs text-lord-gold font-bold hover:border-lord-gold outline-none cursor-pointer max-w-[150px] sm:max-w-[200px] truncate"
              >
                {allEmployees.map((emp: any) => (
                  <option key={emp._id} value={emp._id}>
                    {emp.fullName} ({emp.primaryDepartment || 'عام'})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* 2. Quick Stage Templates Row (الافتراضي: مرحلة واحدة سريعة) */}
        <div className="mb-4 p-3 rounded-2xl bg-gray-900/60 border border-gray-800/90">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-gray-300 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-lord-gold" />
              <span>هيكلية المراحل (الافتراضي مرحلة واحدة):</span>
            </span>
            <span className="text-[10px] text-lord-gold font-bold">
              {activeTemplate === 'SINGLE' ? '⚡ مرحلة واحدة معتمدة' : '3 مراحل تخصصية'}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <button
              type="button"
              onClick={() => applyStageTemplate('SINGLE')}
              className={`p-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 border ${
                activeTemplate === 'SINGLE'
                  ? 'bg-lord-gold/25 border-lord-gold text-lord-gold shadow-md font-black ring-1 ring-lord-gold/50'
                  : 'bg-gray-800/70 border-gray-700 text-gray-300 hover:text-white hover:bg-gray-800'
              }`}
            >
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span>مرحلة سريعة (الافتراضي) ⚡</span>
            </button>

            <button
              type="button"
              onClick={() => applyStageTemplate('TRADING')}
              className={`p-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 border ${
                activeTemplate === 'TRADING'
                  ? 'bg-lord-gold/25 border-lord-gold text-lord-gold shadow-md font-black ring-1 ring-lord-gold/50'
                  : 'bg-gray-800/70 border-gray-700 text-gray-300 hover:text-white hover:bg-gray-800'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
              <span>تداول وشارتات 📈</span>
            </button>

            <button
              type="button"
              onClick={() => applyStageTemplate('MEDIA')}
              className={`p-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 border ${
                activeTemplate === 'MEDIA'
                  ? 'bg-lord-gold/25 border-lord-gold text-lord-gold shadow-md font-black ring-1 ring-lord-gold/50'
                  : 'bg-gray-800/70 border-gray-700 text-gray-300 hover:text-white hover:bg-gray-800'
              }`}
            >
              <Share2 className="w-3.5 h-3.5 text-sky-400" />
              <span>ميديا ونشر 📱</span>
            </button>

            <button
              type="button"
              onClick={() => applyStageTemplate('DEV')}
              className={`p-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 border ${
                activeTemplate === 'DEV'
                  ? 'bg-lord-gold/25 border-lord-gold text-lord-gold shadow-md font-black ring-1 ring-lord-gold/50'
                  : 'bg-gray-800/70 border-gray-700 text-gray-300 hover:text-white hover:bg-gray-800'
              }`}
            >
              <Code2 className="w-3.5 h-3.5 text-lord-gold" />
              <span>برمجة وسيرفرات 💻</span>
            </button>
          </div>
        </div>

        {/* 3. Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Title */}
          <div>
            <label className="block text-xs font-bold text-gray-300 mb-1.5">عنوان المهمة الرئيسية *</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="مثال: تحليل شارت البيتكوين وتجهيز تقرير الصباح وقفل الأرباح"
              className="w-full px-3.5 py-2.5 rounded-xl bg-gray-900 border border-gray-800 focus:border-lord-gold text-xs text-white placeholder-gray-500 outline-none transition-colors"
            />
          </div>

          {/* General Description */}
          <div>
            <label className="block text-xs font-bold text-gray-300 mb-1.5">التوجيهات العامة للمهمة</label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="اكتب التوجيهات العامة أو أهداف المهمة المطلوب تحقيقها من الموظف..."
              className="w-full px-3.5 py-2 rounded-xl bg-gray-900 border border-gray-800 focus:border-lord-gold text-xs text-white placeholder-gray-500 outline-none resize-none leading-relaxed"
            />
          </div>

          {/* Dynamic Stages Builder */}
          <div className="space-y-3 pt-2 border-t border-gray-800/80">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-white flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-lord-gold" />
                <span>
                  هيكلة مراحل التنفيذ ومخرجاتها ({stages.length} {stages.length === 1 ? 'مرحلة - الافتراضي' : 'مراحل'})
                </span>
              </span>

              <button
                type="button"
                onClick={handleAddStage}
                className="px-2.5 py-1 rounded-xl bg-lord-gold/15 hover:bg-lord-gold/25 border border-lord-gold/40 text-lord-gold text-[11px] font-bold flex items-center gap-1 transition-all active:scale-95"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>إضافة مرحلة جديدة</span>
              </button>
            </div>

            <div className="space-y-2.5">
              {stages.map((stage, idx) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-2xl bg-gray-900/80 border border-gray-800 hover:border-gray-700 transition-all space-y-2.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-lord-gold flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded-lg bg-lord-gold/20 border border-lord-gold/40 text-lord-gold text-[10px] font-mono flex items-center justify-center">
                        {idx + 1}
                      </span>
                      <span>المرحلة {idx + 1}</span>
                      {stages.length === 1 && (
                        <span className="text-[10px] text-gray-400 font-normal">(مرحلة تنفيذ مباشرة)</span>
                      )}
                    </span>

                    {stages.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveStage(idx)}
                        className="p-1 rounded-lg text-gray-500 hover:text-red-400 transition-colors"
                        title="حذف هذه المرحلة"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Stage Title */}
                  <input
                    type="text"
                    required
                    value={stage.stageTitle}
                    onChange={(e) => handleStageChange(idx, 'stageTitle', e.target.value)}
                    placeholder={`عنوان المرحلة ${idx + 1}`}
                    className="w-full px-3 py-1.5 rounded-xl bg-black/50 border border-gray-800 focus:border-lord-gold text-xs text-white placeholder-gray-500 outline-none"
                  />

                  {/* Stage Instructions */}
                  <input
                    type="text"
                    value={stage.instructions}
                    onChange={(e) => handleStageChange(idx, 'instructions', e.target.value)}
                    placeholder="تعليمات ومخرجات هذه المرحلة للموظف..."
                    className="w-full px-3 py-1.5 rounded-xl bg-black/50 border border-gray-800 focus:border-lord-gold text-[11px] text-gray-300 placeholder-gray-600 outline-none"
                  />

                  {/* Deliverable Type */}
                  <div className="flex items-center justify-between gap-2 pt-1 border-t border-gray-800/60 text-[11px]">
                    <span className="text-gray-400 text-[11px]">نوع المخرج المطلوب:</span>
                    <select
                      value={stage.expectedType}
                      onChange={(e) => handleStageChange(idx, 'expectedType', e.target.value as DeliverableType)}
                      className="px-2.5 py-1 rounded-xl bg-gray-800 border border-gray-700 text-xs text-lord-gold font-bold outline-none"
                    >
                      <option value="IMAGE">🖼️ صورة / لقطة شاشة / شارت</option>
                      <option value="URL">🔗 رابط إلكتروني / منشور</option>
                      <option value="TEXT">📝 تقرير نصي مكتوب</option>
                      <option value="DOCUMENT">📄 مستند / PDF / ملف</option>
                      <option value="CODE_SNIPPET">💻 كود برمجي</option>
                      <option value="VIDEO">🎥 تسجيل فيديو</option>
                    </select>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Deadlines & Priority Row */}
          <div className="pt-2 border-t border-gray-800/80 space-y-2.5">
            <div className="flex items-center justify-between text-xs font-bold text-gray-300">
              <span className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-lord-gold" />
                <span>الموعد النهائي للتسليم:</span>
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handleSetDeadlineHours(4)}
                  className="px-2 py-0.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-[10px] text-gray-300 transition-colors"
                >
                  +4 س
                </button>
                <button
                  type="button"
                  onClick={() => handleSetDeadlineHours(12)}
                  className="px-2 py-0.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-[10px] text-gray-300 transition-colors"
                >
                  +12 س
                </button>
                <button
                  type="button"
                  onClick={() => handleSetDeadlineHours(24)}
                  className="px-2 py-0.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-[10px] text-gray-300 transition-colors"
                >
                  +24 س (غداً)
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input
                type="datetime-local"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-gray-900 border border-gray-800 text-xs text-white outline-none"
              />

              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as any)}
                className="w-full px-3 py-2 rounded-xl bg-gray-900 border border-gray-800 text-xs text-white outline-none font-bold"
              >
                <option value="LOW">أولوية عادية (Low)</option>
                <option value="MEDIUM">أولوية متوسطة (Medium)</option>
                <option value="HIGH">أولوية عالية ⚡ (High)</option>
                <option value="CRITICAL">أولوية حرجة وعاجلة 🔥 (Critical)</option>
              </select>
            </div>
          </div>

          {/* Budget & Payout Method (Optional) */}
          <div className="p-3 rounded-2xl bg-black/40 border border-gray-800 space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-gray-300">
              <span className="flex items-center gap-1.5">
                <Coins className="w-3.5 h-3.5 text-emerald-400" />
                <span>الميزانية التشغيلية إن وُجدت (USDT):</span>
              </span>
              <span className="text-[10px] text-gray-500">اختياري</span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <input
                type="number"
                min="0"
                step="any"
                value={budgetAmount}
                onChange={(e) => setBudgetAmount(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder="0.00 USDT"
                className="w-full px-3 py-2 rounded-xl bg-gray-900 border border-gray-800 text-xs text-white placeholder-gray-500 outline-none font-mono"
              />

              <select
                value={payoutMethod}
                onChange={(e) => setPayoutMethod(e.target.value as any)}
                className="w-full px-2.5 py-2 rounded-xl bg-gray-900 border border-gray-800 text-xs text-emerald-400 font-bold outline-none"
              >
                <option value="BEP20_USDT">USDT BEP20 (المحفظة)</option>
                <option value="JEEB_WALLET">محفظة جيب (Jeeb)</option>
                <option value="JAWALI_WALLET">محفظة جوالي (Jawali)</option>
              </select>
            </div>
          </div>

          {/* Footer Submit Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-gray-800/80">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2.5 rounded-xl bg-gray-800 hover:bg-gray-700 text-xs font-bold text-gray-300 transition-all"
            >
              إلغاء
            </button>

            <button
              type="submit"
              disabled={isLoading}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 via-lord-gold to-yellow-500 hover:from-amber-500 hover:to-yellow-400 text-black text-xs font-black shadow-lg shadow-lord-gold/20 transition-all flex items-center gap-2 active:scale-95 disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                  <span>جاري الإسناد وبناء المراحل...</span>
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>إسناد المهمة إلى {currentAssignee?.fullName?.split(' ')[0] || 'الموظف'} 🚀</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </AppModalPortal>
  );
};
