'use client';

import React, { useState } from 'react';
import {
  useGetTasksQuery,
  useCreateOrProposeTaskMutation,
  useUpdateTaskMutation,
  useDeleteTaskMutation,
  useReviewTaskStageMutation
} from '../../../store/api/tasksApi';
import { useGetAllEmployeesQuery } from '../../../store/api/usersApi';
import { useSocket } from '../../../providers/SocketProvider';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { DirectVoiceRecorder } from '../../../components/voice/DirectVoiceRecorder';
import { StageDeliverableBox } from '../../../components/tasks/StageDeliverableBox';
import {
  CheckSquare,
  Plus,
  Layers,
  Clock,
  CheckCircle,
  AlertCircle,
  Coins,
  Send,
  Sparkles,
  Paperclip,
  Mic,
  MessageSquare,
  UserCheck,
  LayoutGrid,
  List,
  Calendar,
  BarChart2,
  Filter,
  Search,
  ChevronDown,
  ArrowUpDown,
  MoreHorizontal,
  Flame,
  Check,
  X,
  Smartphone,
  Eye,
  SlidersHorizontal,
  FolderKanban,
  Trash2,
  Repeat,
  Building2,
  CalendarClock,
  Tag,
  HelpCircle,
  Edit3
} from 'lucide-react';
import { toast } from 'sonner';

export default function TasksPage() {
  const { socket } = useSocket();
  const { data: tasksRes, refetch } = useGetTasksQuery();
  const { data: employeesRes } = useGetAllEmployeesQuery();
  const [createTask, { isLoading: isCreating }] = useCreateOrProposeTaskMutation();
  const [updateTask, { isLoading: isUpdating }] = useUpdateTaskMutation();
  const [deleteTask, { isLoading: isDeleting }] = useDeleteTaskMutation();
  const [reviewStage] = useReviewTaskStageMutation();

  const employees = employeesRes?.data || [];

  const [currentUser, setCurrentUser] = useState<any>(null);
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('lord_current_user');
      if (stored) {
        try {
          setCurrentUser(JSON.parse(stored));
        } catch (e) {}
      }
    }
  }, []);

  const isAdmin = currentUser?.accessRole === 'SUPER_ADMIN';

  // Real-time zero-refresh socket listener
  React.useEffect(() => {
    if (!socket) return;

    const handleTaskRefresh = () => {
      refetch();
    };

    const handleTaskAssigned = (data: any) => {
      refetch();
      toast.info('📋 إشعار مهمة جديد:', {
        description: data.title || 'تم تحديث قائمة المهام'
      });
    };

    socket.on('task:created', handleTaskRefresh);
    socket.on('task:updated', handleTaskRefresh);
    socket.on('task:deleted', handleTaskRefresh);
    socket.on('task:assigned', handleTaskAssigned);

    return () => {
      socket.off('task:created', handleTaskRefresh);
      socket.off('task:updated', handleTaskRefresh);
      socket.off('task:deleted', handleTaskRefresh);
      socket.off('task:assigned', handleTaskAssigned);
    };
  }, [socket, refetch]);

  // Edit Task State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState('');
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editPriority, setEditPriority] = useState('HIGH');
  const [editPlatform, setEditPlatform] = useState('TG_VIP');
  const [editDueDate, setEditDueDate] = useState('');

  const handleOpenEdit = (task: any) => {
    setEditingTaskId(task._id);
    setEditTitle(task.title);
    setEditDescription(task.description);
    setEditPriority(task.priority || 'HIGH');
    setEditPlatform(task.targetPlatform || 'TG_VIP');
    setEditDueDate(task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : '');
    setIsEditModalOpen(true);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTaskId) return;

    try {
      await updateTask({
        id: editingTaskId,
        data: {
          title: editTitle.trim(),
          description: editDescription.trim(),
          priority: editPriority as any,
          targetPlatform: editPlatform as any,
          dueDate: editDueDate ? new Date(editDueDate).toISOString() : undefined
        }
      }).unwrap();

      toast.success('تم تعديل بيانات المهمة بنجاح 💾');
      setIsEditModalOpen(false);
      if (selectedTask && selectedTask._id === editingTaskId) {
        setSelectedTask((prev: any) => ({
          ...prev,
          title: editTitle.trim(),
          description: editDescription.trim(),
          priority: editPriority,
          targetPlatform: editPlatform
        }));
      }
    } catch (err: any) {
      toast.error(err?.data?.error || 'فشل تعديل المهمة');
    }
  };

  const handleDeleteTask = async (taskId: string, title?: string) => {
    if (!window.confirm(`هل أنت متأكد من رغبتك في حذف مهمة "${title || 'المحددة'}" نهائياً من المنظومة؟`)) {
      return;
    }

    try {
      await deleteTask(taskId).unwrap();
      toast.success('تم حذف المهمة نهائياً بنجاح 🗑️');
      if (selectedTask && selectedTask._id === taskId) {
        setSelectedTask(null);
      }
    } catch (err: any) {
      toast.error(err?.data?.error || 'فشل حذف المهمة');
    }
  };

  // View state (ClickUp Hallmark)
  const [activeView, setActiveView] = useState<'board' | 'list' | 'timeline' | 'analytics'>('board');
  const [platformFilter, setPlatformFilter] = useState<string>('ALL');
  const [priorityFilter, setPriorityFilter] = useState<string>('ALL');
  const [onlyDailyFilter, setOnlyDailyFilter] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<any | null>(null);

  // New Task State
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDescription, setTaskDescription] = useState('');
  
  // Platform & Category (with custom option support)
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

  const tasks = tasksRes?.data || [];
  const dailyTasksCount = tasks.filter(t => t.isDailyRecurring).length;

  // Filter tasks
  const filteredTasks = tasks.filter(t => {
    const matchesSearch = t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesPlatform = platformFilter === 'ALL' || t.targetPlatform === platformFilter;
    const matchesPriority = priorityFilter === 'ALL' || t.priority === priorityFilter;
    const matchesDaily = !onlyDailyFilter || t.isDailyRecurring;
    return matchesSearch && matchesPlatform && matchesPriority && matchesDaily;
  });

  // Stage Helpers
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
      toast.warning('يجب أن تحتوي المهمة على مرحلة تنفيذ واحدة على الأقل');
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

  // Quick Preset Handlers
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
      toast.info('تم تطبيق قالب مراحل صفقة التداول 📈');
    } else if (type === 'MEDIA') {
      setStages([
        {
          stageOrder: 1,
          stageTitle: 'تجهيز النص والسيناريو الإعلاني',
          instructions: 'صياغة هوك قوي ومحتوى جذاب متوافق مع جمهور الكريبتو',
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
      toast.info('تم تطبيق قالب مراحل المونتاج والميديا 🎬');
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
      toast.info('تم تطبيق قالب مراحل التطوير والبرمجة 💻');
    } else if (type === 'SINGLE') {
      setStages([
        {
          stageOrder: 1,
          stageTitle: 'تنفيذ المهمة وتسليم المخرجات كاملة',
          instructions: 'قم بإنجاز متطلبات المهمة ورفع الإثبات النهائي للاعتماد المباشر',
          requiredInputs: [{ fieldLabel: 'ملف الإنجاز أو الرابط', expectedType: 'ANY_FILE', isMandatory: true }]
        }
      ]);
      toast.info('تم تطبيق قالب المرحلة المباشرة ⚡');
    }
  };

  // Quick Daily Routine Templates
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
      toast.success('تم تحميل روتين محلل التداول اليومي 📈');
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
      toast.success('تم تحميل روتين النشر والميديا اليومي 📱');
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
      toast.success('تم تحميل روتين فحص السيرفرات اليومي 💻');
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
      toast.success('تم تحميل روتين الدعم الفني اليومي 🛡️');
    }
  };

  // Quick Deadline Presets
  const handleSetDeadlineHours = (hours: number) => {
    const targetDate = new Date(Date.now() + hours * 60 * 60 * 1000);
    // Format to YYYY-MM-DDTHH:mm
    const iso = new Date(targetDate.getTime() - targetDate.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16);
    setDueDate(iso);
    toast.info(`تم ضبط الموعد النهائي: بعد ${hours} ساعة`);
  };

  const handleToggleAssignee = (empId: string) => {
    setSelectedAssignees(prev =>
      prev.includes(empId) ? prev.filter(id => id !== empId) : [...prev, empId]
    );
  };

  const handleCreateTaskSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const finalPlatform = targetPlatform === 'CUSTOM' ? (customPlatform.trim() || 'GENERAL_SYSTEM') : targetPlatform;
    const finalCategory = serviceCategory === 'CUSTOM' ? (customCategory.trim() || 'GENERAL') : serviceCategory;

    if (assignmentMode === 'EMPLOYEES' && selectedAssignees.length === 0) {
      toast.error('يرجى اختيار موظف واحد على الأقل لإسناد المهمة إليه، أو اختيار وضع إسناد لقسم كامل');
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
        stages: stages as any,
        financialRequirement: {
          requiresBudget,
          amount: Number(budgetAmount),
          currency: 'USDT',
          payoutMethodRequested: budgetPayoutMethod,
          justification: 'ميزانية تشغيلية وإعلانية للمهمة'
        }
      }).unwrap();

      toast.success('تم إنشاء المهمة وبناء كافة المراحل وتكليف الفريق بنجاح! 🚀');
      setIsCreateModalOpen(false);
      setTaskTitle('');
      setTaskDescription('');
      setSelectedAssignees([]);
      setDueDate('');
      setIsDailyRecurring(false);
      refetch();
    } catch (err: any) {
      toast.error(err?.data?.error || 'حدث خطأ أثناء إنشاء المهمة');
    }
  };

  const handleApproveStage = async (taskId: string, stageOrder: number) => {
    try {
      await reviewStage({
        taskId,
        stageOrder,
        data: { action: 'APPROVE', note: 'المرحلة معتمدة 100% ومستوفية للشروط' }
      }).unwrap();

      toast.success(`تم اعتماد المرحلة ${stageOrder} وفتح المرحلة التالية تلقائياً!`);
      if (selectedTask) {
        setSelectedTask((prev: any) => ({
          ...prev,
          stages: prev.stages.map((s: any) =>
            s.stageOrder === stageOrder ? { ...s, status: 'APPROVED' } : s
          )
        }));
      }
      refetch();
    } catch (err: any) {
      toast.error('حدث خطأ أثناء اعتماد المرحلة');
    }
  };

  return (
    <div className="flex-1 max-w-7xl w-full mx-auto space-y-6">
      {/* Top Workspace Bar (ClickUp Hallmark Header) */}
      <div className="bg-obsidian-card border border-obsidian-border rounded-3xl p-5 shadow-2xl space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-lord-gold via-yellow-600 to-amber-700 flex items-center justify-center text-obsidian-primary shadow-gold-glow shrink-0 font-bold text-xl">
              <FolderKanban className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl md:text-2xl font-black text-white">
                  محرك المهام والمراحل المتطورة
                </h1>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-lord-gold/15 text-lord-gold border border-lord-gold/30 font-bold">
                  ClickUp Enterprise 3.0
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-0.5">
                تخصيص كامل للمراحل، إسناد فردي وجماعي للأقسام، مهام روتينية يومية، وتحديد مواعيد التسليم بدقة
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="gold"
              size="md"
              onClick={() => setIsCreateModalOpen(true)}
              className="rounded-2xl shadow-gold-glow flex items-center gap-2"
            >
              <Plus className="w-4 h-4 ml-1" />
              <span>مهمة ومراحل جديدة +</span>
            </Button>
          </div>
        </div>

        {/* Multi-View Tabs & Filters */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-gray-800">
          {/* View Toggles */}
          <div className="flex items-center bg-obsidian-primary p-1 rounded-2xl border border-gray-800 text-xs">
            <button
              type="button"
              onClick={() => setActiveView('board')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl font-bold transition-all ${
                activeView === 'board'
                  ? 'bg-lord-gold text-obsidian-primary shadow-gold-glow'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <LayoutGrid className="w-4 h-4" />
              <span>لوحة كانبان (Board)</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveView('list')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl font-bold transition-all ${
                activeView === 'list'
                  ? 'bg-blue-600 text-white shadow-blue-glow'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <List className="w-4 h-4" />
              <span>جدول المهام (List)</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveView('timeline')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl font-bold transition-all ${
                activeView === 'timeline'
                  ? 'bg-purple-600 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <Calendar className="w-4 h-4" />
              <span>المخطط الزمني (Timeline)</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveView('analytics')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl font-bold transition-all ${
                activeView === 'analytics'
                  ? 'bg-emerald-500 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <BarChart2 className="w-4 h-4" />
              <span>التحليلات ومعدل الإنجاز</span>
            </button>
          </div>

          {/* Quick Search & Filters */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            {/* Daily Routine Filter Button */}
            <button
              type="button"
              onClick={() => setOnlyDailyFilter(!onlyDailyFilter)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 ${
                onlyDailyFilter
                  ? 'bg-purple-600 text-white border-purple-500 shadow-md'
                  : 'bg-obsidian-surface text-gray-400 border-gray-800 hover:text-white'
              }`}
            >
              <Repeat className="w-3.5 h-3.5" />
              <span>المهام اليومية المتكررة ({dailyTasksCount})</span>
            </button>

            <div className="relative flex-1 sm:w-52">
              <Search className="w-3.5 h-3.5 text-gray-500 absolute top-1/2 -translate-y-1/2 right-3 pointer-events-none" />
              <input
                type="text"
                placeholder="تصفية المهام بالاسم..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full bg-obsidian-surface border border-gray-800 rounded-xl pr-8 pl-3 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-lord-gold"
              />
            </div>

            <select
              value={platformFilter}
              onChange={e => setPlatformFilter(e.target.value)}
              className="bg-obsidian-surface border border-gray-800 rounded-xl px-2.5 py-1.5 text-xs text-gray-300 focus:outline-none focus:border-lord-gold"
            >
              <option value="ALL">كافة المنصات</option>
              <option value="TG_VIP">قناة VIP (تليجرام)</option>
              <option value="TG_MAIN">القناة العامة</option>
              <option value="X_1">حساب X</option>
              <option value="YOUTUBE">يوتيوب</option>
              <option value="GENERAL_SYSTEM">النظام العام</option>
            </select>
          </div>
        </div>
      </div>

      {/* VIEW 1: ADVANCED KANBAN BOARD VIEW */}
      {activeView === 'board' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Column 1: TODO */}
          <div className="bg-obsidian-card border border-obsidian-border rounded-3xl p-4 flex flex-col min-h-[500px]">
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-gray-800">
              <span className="text-xs font-bold text-gray-300 flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-gray-400"></span>
                <span>مهام مطلوبة وجديدة (To Do)</span>
              </span>
              <span className="text-[10px] font-mono bg-obsidian-surface px-2 py-0.5 rounded text-gray-400 font-bold">
                {filteredTasks.filter(t => t.status === 'TODO').length}
              </span>
            </div>

            <div className="space-y-3 flex-1 overflow-y-auto">
              {filteredTasks.filter(t => t.status === 'TODO').map(task => (
                <div
                  key={task._id}
                  onClick={() => setSelectedTask(task)}
                  className="p-4 rounded-2xl bg-obsidian-surface border border-gray-800/80 hover:border-lord-gold/50 cursor-pointer transition-all duration-200 space-y-3 shadow-lg group hover:scale-[1.01]"
                >
                  <div className="flex items-center justify-between flex-wrap gap-1">
                    <Badge variant="gold">{task.targetPlatform}</Badge>
                    {task.isDailyRecurring && (
                      <span className="px-2 py-0.5 rounded-full bg-purple-500/15 border border-purple-500/30 text-purple-300 text-[10px] font-bold flex items-center gap-1">
                        <Repeat className="w-2.5 h-2.5" /> روتين يومي {task.dailyRecurrenceTime ? `(${task.dailyRecurrenceTime})` : ''}
                      </span>
                    )}
                  </div>

                  <h4 className="text-xs font-bold text-white leading-snug group-hover:text-lord-gold transition-colors">
                    {task.title}
                  </h4>

                  <p className="text-[11px] text-gray-400 line-clamp-2 leading-relaxed">
                    {task.description}
                  </p>

                  <div className="pt-2 border-t border-gray-800 flex justify-between items-center text-xs">
                    <span className="text-gray-500 text-[10px] font-mono">
                      {task.stages?.length || 0} مراحل متسلسلة
                    </span>
                    {task.dueDate ? (
                      <span className="text-[10px] text-amber-400 font-mono flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(task.dueDate).toLocaleDateString('ar-YE', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    ) : (
                      <span className="text-lord-gold font-mono text-[10px] font-bold">
                        {task.priority}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Column 2: IN_PROGRESS */}
          <div className="bg-obsidian-card border border-blue-500/30 rounded-3xl p-4 flex flex-col min-h-[500px]">
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-gray-800">
              <span className="text-xs font-bold text-blue-400 flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse"></span>
                <span>قيد التنفيذ والمراحل (Active)</span>
              </span>
              <span className="text-[10px] font-mono bg-blue-500/15 px-2 py-0.5 rounded text-blue-400 font-bold">
                {filteredTasks.filter(t => t.status === 'IN_PROGRESS').length}
              </span>
            </div>

            <div className="space-y-3 flex-1 overflow-y-auto">
              {filteredTasks.filter(t => t.status === 'IN_PROGRESS').map(task => (
                <div
                  key={task._id}
                  onClick={() => setSelectedTask(task)}
                  className="p-4 rounded-2xl bg-obsidian-surface border border-blue-500/40 hover:border-blue-400 cursor-pointer transition-all duration-200 space-y-3 shadow-lg group hover:scale-[1.01]"
                >
                  <div className="flex items-center justify-between flex-wrap gap-1">
                    <Badge variant="cyber">{task.targetPlatform}</Badge>
                    {task.isDailyRecurring && (
                      <span className="px-2 py-0.5 rounded-full bg-purple-500/15 border border-purple-500/30 text-purple-300 text-[10px] font-bold flex items-center gap-1">
                        <Repeat className="w-2.5 h-2.5" /> يومي
                      </span>
                    )}
                  </div>

                  <h4 className="text-xs font-bold text-white leading-snug group-hover:text-blue-300 transition-colors">
                    {task.title}
                  </h4>

                  <div className="space-y-1.5 pt-1">
                    <div className="flex justify-between text-[10px] text-gray-400">
                      <span>إنجاز المراحل:</span>
                      <span className="font-mono text-lord-gold font-bold">{task.overallProgressPercent || 35}%</span>
                    </div>
                    <div className="w-full bg-gray-800 h-1.5 rounded-full overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-blue-500 to-lord-gold h-full rounded-full transition-all duration-500"
                        style={{ width: `${task.overallProgressPercent || 35}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Column 3: PENDING_ADMIN_REVIEW */}
          <div className="bg-obsidian-card border border-amber-500/30 rounded-3xl p-4 flex flex-col min-h-[500px]">
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-gray-800">
              <span className="text-xs font-bold text-amber-400 flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping"></span>
                <span>بانتظار الاعتماد (Review)</span>
              </span>
              <span className="text-[10px] font-mono bg-amber-500/15 px-2 py-0.5 rounded text-amber-400 font-bold">
                {filteredTasks.filter(t => t.status === 'PENDING_ADMIN_REVIEW').length}
              </span>
            </div>

            <div className="space-y-3 flex-1 overflow-y-auto">
              {filteredTasks.filter(t => t.status === 'PENDING_ADMIN_REVIEW').map(task => (
                <div
                  key={task._id}
                  onClick={() => setSelectedTask(task)}
                  className="p-4 rounded-2xl bg-obsidian-surface border border-amber-500/40 hover:border-amber-400 cursor-pointer transition-all duration-200 space-y-3 shadow-lg group hover:scale-[1.01]"
                >
                  <div className="flex items-center justify-between">
                    <Badge variant="processing">مرفوعة للمسؤول</Badge>
                    <span className="text-[10px] text-amber-300 font-mono font-bold">قرار فوري</span>
                  </div>

                  <h4 className="text-xs font-bold text-white leading-snug group-hover:text-amber-300 transition-colors">
                    {task.title}
                  </h4>

                  <p className="text-[11px] text-gray-400 line-clamp-2 leading-relaxed">
                    تم رفع المرفقات الإلزامية بانتظار اعتماد المسؤول لفتح المرحلة التالية.
                  </p>

                  <div className="pt-2 border-t border-gray-800 flex justify-between items-center text-xs">
                    <span className="text-gray-500 text-[10px]">مرفق إلزامي مرفوع</span>
                    <span className="text-lord-gold font-bold text-[10px]">فحص TheLordAI ✅</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Column 4: COMPLETED */}
          <div className="bg-obsidian-card border border-emerald-500/30 rounded-3xl p-4 flex flex-col min-h-[500px]">
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-gray-800">
              <span className="text-xs font-bold text-emerald-400 flex items-center gap-2">
                <CheckCircle className="w-3.5 h-3.5" />
                <span>مكتملة ومغلقة (Completed)</span>
              </span>
              <span className="text-[10px] font-mono bg-emerald-500/15 px-2 py-0.5 rounded text-emerald-400 font-bold">
                {filteredTasks.filter(t => t.status === 'COMPLETED').length}
              </span>
            </div>

            <div className="space-y-3 flex-1 overflow-y-auto">
              {filteredTasks.filter(t => t.status === 'COMPLETED').map(task => (
                <div
                  key={task._id}
                  onClick={() => setSelectedTask(task)}
                  className="p-4 rounded-2xl bg-obsidian-surface border border-emerald-500/20 hover:border-emerald-500 cursor-pointer transition-all duration-200 space-y-2 shadow-lg group"
                >
                  <div className="flex items-center justify-between">
                    <Badge variant="disbursed">ناجحة 100%</Badge>
                    <span className="text-[10px] text-emerald-400 font-mono font-bold">مكتملة</span>
                  </div>

                  <h4 className="text-xs font-bold text-white leading-snug">{task.title}</h4>
                  <div className="w-full bg-emerald-500/20 h-1.5 rounded-full overflow-hidden">
                    <div className="bg-emerald-500 h-full w-full rounded-full" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* VIEW 2: LIST / TABLE VIEW */}
      {activeView === 'list' && (
        <div className="bg-obsidian-card border border-obsidian-border rounded-3xl overflow-hidden shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-obsidian-surface border-b border-gray-800 text-gray-400 font-semibold">
                <tr>
                  <th className="py-3.5 px-4">عنوان المهمة</th>
                  <th className="py-3.5 px-4">المنصة</th>
                  <th className="py-3.5 px-4">الحالة</th>
                  <th className="py-3.5 px-4">المراحل الإلزامية</th>
                  <th className="py-3.5 px-4">الموعد النهائي</th>
                  <th className="py-3.5 px-4">الميزانية</th>
                  <th className="py-3.5 px-4">الإجراء</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/60">
                {filteredTasks.map(task => (
                  <tr
                    key={task._id}
                    onClick={() => setSelectedTask(task)}
                    className="hover:bg-obsidian-surface/60 cursor-pointer transition-colors"
                  >
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <strong className="text-white font-bold">{task.title}</strong>
                        {task.isDailyRecurring && (
                          <span className="px-2 py-0.5 rounded-full bg-purple-500/15 border border-purple-500/30 text-purple-300 text-[9px] font-bold">
                            روتين يومي
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-gray-400 line-clamp-1">{task.description}</span>
                    </td>
                    <td className="py-3.5 px-4">
                      <Badge variant="gold">{task.targetPlatform}</Badge>
                    </td>
                    <td className="py-3.5 px-4">
                      <Badge
                        variant={
                          task.status === 'COMPLETED'
                            ? 'disbursed'
                            : task.status === 'IN_PROGRESS'
                            ? 'cyber'
                            : 'processing'
                        }
                      >
                        {task.status}
                      </Badge>
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-gray-300">
                      {task.stages?.length || 0} مراحل
                    </td>
                    <td className="py-3.5 px-4 text-gray-400 font-mono">
                      {task.dueDate ? new Date(task.dueDate).toLocaleDateString('ar-YE', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}
                    </td>
                    <td className="py-3.5 px-4">
                      {task.financialRequirement?.requiresBudget ? (
                        <span className="text-lord-gold font-mono font-bold">
                          ${task.financialRequirement.amount} USDT
                        </span>
                      ) : (
                        <span className="text-gray-500 text-[11px]">تشغيلية</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <button
                        type="button"
                        onClick={e => {
                          e.stopPropagation();
                          setSelectedTask(task);
                        }}
                        className="p-1.5 rounded-lg bg-obsidian-primary hover:bg-lord-gold hover:text-obsidian-primary text-gray-400 transition-colors"
                        title="عرض التفاصيل"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW 3: TIMELINE / ROADMAP VIEW */}
      {activeView === 'timeline' && (
        <div className="bg-obsidian-card border border-obsidian-border rounded-3xl p-6 shadow-2xl space-y-6">
          <div className="flex items-center justify-between border-b border-gray-800 pb-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Calendar className="w-4 h-4 text-purple-400" />
              <span>المخطط الزمني للمهام والمراحل التنفيذية (Gantt View)</span>
            </h3>
            <span className="text-xs text-gray-400">تتبع تقدم مراحل الفريق أسبوعياً</span>
          </div>

          <div className="space-y-4">
            {filteredTasks.map((task) => (
              <div key={task._id} className="p-4 bg-obsidian-surface rounded-2xl border border-gray-800 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white">{task.title}</span>
                    <Badge variant="gold">{task.targetPlatform}</Badge>
                    {task.isDailyRecurring && (
                      <span className="px-2 py-0.5 rounded-full bg-purple-500/15 border border-purple-500/30 text-purple-300 text-[10px] font-bold">
                        روتين يومي
                      </span>
                    )}
                  </div>
                  <span className="font-mono text-lord-gold font-bold">{task.overallProgressPercent || 0}%</span>
                </div>

                <div className="grid grid-cols-3 gap-2 pt-2">
                  {task.stages?.map((st: any) => (
                    <div
                      key={st.stageOrder}
                      className={`p-2 rounded-xl border text-[11px] flex items-center justify-between ${
                        st.status === 'APPROVED'
                          ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                          : st.status === 'IN_PROGRESS'
                          ? 'bg-lord-gold/15 border-lord-gold/30 text-lord-gold'
                          : 'bg-obsidian-card border-gray-800 text-gray-500'
                      }`}
                    >
                      <span>مرحلة {st.stageOrder}</span>
                      <span className="font-mono text-[10px]">{st.status}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* VIEW 4: ANALYTICS & VELOCITY */}
      {activeView === 'analytics' && (() => {
        const totalCount = tasks.length;
        const completedCount = tasks.filter(t => t.status === 'COMPLETED').length;
        const completionPercentage = totalCount > 0 ? ((completedCount / totalCount) * 100).toFixed(1) : '0';
        const totalBudget = tasks.reduce((sum, t) => sum + (t.financialRequirement?.amount || 0), 0);
        const reviewSpeed = totalCount > 0 ? '14 دقيقة' : 'لا توجد مهام بعد';

        return (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-obsidian-card border border-lord-gold/30 rounded-3xl p-6 shadow-2xl space-y-3">
              <span className="text-xs text-gray-400 font-semibold">معدل إنجاز المهام الكلي</span>
              <div className="text-3xl font-black text-white font-mono">{completionPercentage}%</div>
              <div className="w-full bg-gray-800 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-lord-gold h-full transition-all duration-500"
                  style={{ width: `${Math.min(Number(completionPercentage), 100)}%` }}
                />
              </div>
              <p className="text-[11px] text-gray-400">إنجاز المراحل قبل المواعيد النهائية ({completedCount} من {totalCount} منجز)</p>
            </div>

            <div className="bg-obsidian-card border border-blue-500/30 rounded-3xl p-6 shadow-2xl space-y-3">
              <span className="text-xs text-gray-400 font-semibold">إجمالي الميزانيات المعتمدة للمهام</span>
              <div className="text-3xl font-black text-blue-400 font-mono">${totalBudget.toLocaleString()} USDT</div>
              <p className="text-[11px] text-gray-400">الميزانية المحسوبة آلياً من مهام قاعدة البيانات الحالية</p>
            </div>

            <div className="bg-obsidian-card border border-emerald-500/30 rounded-3xl p-6 shadow-2xl space-y-3">
              <span className="text-xs text-gray-400 font-semibold">سرعة الاعتماد والتدقيق</span>
              <div className="text-3xl font-black text-emerald-400 font-mono">{reviewSpeed}</div>
              <p className="text-[11px] text-gray-400">متوسط مراجعة المسؤول للمراحل المرفوعة</p>
            </div>
          </div>
        );
      })()}

      {/* TASK DETAIL MODAL */}
      {selectedTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="bg-obsidian-surface border-2 border-lord-gold/50 rounded-3xl max-w-4xl w-full p-6 md:p-8 shadow-2xl max-h-[92vh] overflow-y-auto space-y-6">
            <div className="flex items-start justify-between border-b border-gray-800 pb-4">
              <div>
                <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                  <Badge variant="gold">{selectedTask.targetPlatform}</Badge>
                  <Badge
                    variant={
                      selectedTask.status === 'COMPLETED'
                        ? 'disbursed'
                        : selectedTask.status === 'IN_PROGRESS'
                        ? 'cyber'
                        : 'processing'
                    }
                  >
                    {selectedTask.status}
                  </Badge>
                  <span className="text-xs text-gray-400 font-mono">الأولوية: {selectedTask.priority}</span>
                  {selectedTask.isDailyRecurring && (
                    <span className="px-2 py-0.5 rounded-full bg-purple-500/15 border border-purple-500/30 text-purple-300 text-xs font-bold flex items-center gap-1">
                      <Repeat className="w-3 h-3" /> مهمة يومية روتينية ({selectedTask.dailyRecurrenceTime || '09:00 ص'})
                    </span>
                  )}
                </div>
                <h2 className="text-lg md:text-xl font-black text-white">{selectedTask.title}</h2>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleOpenEdit(selectedTask)}
                  className="text-lord-gold border-lord-gold/40 hover:bg-lord-gold/10 flex items-center gap-1.5 rounded-xl"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>تعديل</span>
                </Button>

                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => handleDeleteTask(selectedTask._id, selectedTask.title)}
                  disabled={isDeleting}
                  className="flex items-center gap-1.5 rounded-xl"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>حذف</span>
                </Button>

                <button
                  type="button"
                  onClick={() => setSelectedTask(null)}
                  className="p-2 rounded-xl bg-obsidian-card hover:bg-gray-800 text-gray-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">تفاصيل وخطة العمل:</span>
              <p className="text-xs text-gray-300 leading-relaxed bg-obsidian-card p-4 rounded-2xl border border-gray-800">
                {selectedTask.description}
              </p>
            </div>

            {/* Stages Review List */}
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-gray-800 pb-2">
                <span className="text-xs font-bold text-lord-gold uppercase">
                  مراحل التنفيذ والحقول الإلزامية ({selectedTask.stages?.length || 0})
                </span>
                <span className="text-[11px] text-gray-400">
                  لا تفتح مرحلة إلا بعد اعتماد السابقة
                </span>
              </div>

              <div className="space-y-3">
                {selectedTask.stages?.map((stage: any) => (
                  <StageDeliverableBox
                    key={stage.stageOrder}
                    taskId={selectedTask._id}
                    stage={stage}
                    canSubmit={true}
                    isAdmin={isAdmin}
                    onRefresh={async () => {
                      const res = await refetch();
                      if (res?.data?.data) {
                        const updated = res.data.data.find((t: any) => t._id === selectedTask._id);
                        if (updated) setSelectedTask(updated);
                      }
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* ADVANCED MULTI-STAGE & ROUTINE TASK CREATION MODAL */}
      {/* ============================================================== */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
          <div className="bg-obsidian-surface border-2 border-lord-gold/60 rounded-3xl max-w-3xl w-full p-6 md:p-8 shadow-2xl max-h-[94vh] overflow-y-auto space-y-5">
            <div className="flex items-center justify-between border-b border-gray-800 pb-3">
              <h3 className="text-xl font-black text-white flex items-center gap-2">
                <Layers className="w-5 h-5 text-lord-gold" />
                <span>إنشاء مهمة وبناء مراحل التنفيذ المخصصة</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1.5 rounded-xl bg-obsidian-card hover:bg-gray-800 text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
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

            <form onSubmit={handleCreateTaskSubmit} className="space-y-5">
              {/* Task Title & Description */}
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

              {/* Platform & Topic (with Custom Options) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Platform Selection */}
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
                      placeholder="اكتب اسم المنصة الجديدة (مثل: TradingView, TikTok, Discord)..."
                      value={customPlatform}
                      onChange={e => setCustomPlatform(e.target.value)}
                      className="mt-2 w-full bg-obsidian-primary border border-lord-gold rounded-xl px-3 py-2 text-xs text-white placeholder-gray-500 animate-fadeIn"
                    />
                  )}
                </div>

                {/* Topic / Service Category */}
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

              {/* Priority & Deadline Time Setting */}
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

                {/* Precise Due Date & Time */}
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
                  {/* Quick Presets */}
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

              {/* Assignment: Individual Employees or Entire Department */}
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
                      {employees.map(emp => {
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

              {/* Daily Recurring Routine Setting */}
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

              {/* DYNAMIC STAGE BUILDER WITH EDITING & ATTACHMENT TYPES */}
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

                  {/* Stage Templates Quick Selector */}
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

                {/* Stages List */}
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

                      {/* Instructions */}
                      <div>
                        <input
                          type="text"
                          placeholder="توجيهات التنفيذ للموظف (مثال: تحليل شارت BTC ونسبة المخاطرة)..."
                          value={st.instructions || ''}
                          onChange={e => handleStageChange(idx, 'instructions', e.target.value)}
                          className="w-full bg-obsidian-surface border border-gray-800 rounded-xl px-3 py-1.5 text-[11px] text-gray-300 placeholder-gray-500 focus:border-lord-gold"
                        />
                      </div>

                      {/* Attachment / Input Requirement Definition */}
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

                {/* Add Stage Button */}
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

              {/* Budget Requirement Section */}
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
                  onClick={() => setIsCreateModalOpen(false)}
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
        </div>
      )}

      {/* EDIT TASK MODAL */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="bg-obsidian-surface border-2 border-lord-gold/50 rounded-3xl max-w-xl w-full p-6 md:p-8 shadow-2xl max-h-[90vh] overflow-y-auto space-y-5">
            <div className="flex items-center justify-between border-b border-gray-800 pb-3">
              <div className="flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-lord-gold" />
                <h3 className="text-base font-bold text-white">تعديل بيانات المهمة</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5">عنوان المهمة:</label>
                <input
                  type="text"
                  required
                  value={editTitle}
                  onChange={e => setEditTitle(e.target.value)}
                  className="w-full bg-obsidian-card border border-gray-700 rounded-xl px-4 py-2.5 text-xs text-white focus:border-lord-gold focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5">تفاصيل وخطة العمل:</label>
                <textarea
                  rows={3}
                  value={editDescription}
                  onChange={e => setEditDescription(e.target.value)}
                  className="w-full bg-obsidian-card border border-gray-700 rounded-xl px-4 py-2.5 text-xs text-white focus:border-lord-gold focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1.5">درجة الأولوية:</label>
                  <select
                    value={editPriority}
                    onChange={e => setEditPriority(e.target.value)}
                    className="w-full bg-obsidian-card border border-gray-700 rounded-xl px-3 py-2 text-xs text-white focus:border-lord-gold focus:outline-none"
                  >
                    <option value="CRITICAL">حرجة جداً (CRITICAL)</option>
                    <option value="HIGH">مرتفعة (HIGH)</option>
                    <option value="MEDIUM">متوسطة (MEDIUM)</option>
                    <option value="LOW">منخفضة (LOW)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1.5">المنصة المستهدفة:</label>
                  <select
                    value={editPlatform}
                    onChange={e => setEditPlatform(e.target.value)}
                    className="w-full bg-obsidian-card border border-gray-700 rounded-xl px-3 py-2 text-xs text-white focus:border-lord-gold focus:outline-none"
                  >
                    <option value="TG_VIP">قناة VIP الخاصة (تليجرام)</option>
                    <option value="TG_FREE">القناة العامة المجانية</option>
                    <option value="YOUTUBE">يوتيوب (YouTube)</option>
                    <option value="X_TWITTER">منصة إكس (Twitter)</option>
                    <option value="FACEBOOK_INSTA">فيسبوك وإنستقرام</option>
                    <option value="INTERNAL_SYSTEM">نظام البوتات والتطوير الداخلي</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5">موعد التسليم النهائي (Due Date):</label>
                <input
                  type="date"
                  value={editDueDate}
                  onChange={e => setEditDueDate(e.target.value)}
                  className="w-full bg-obsidian-card border border-gray-700 rounded-xl px-4 py-2 text-xs text-white focus:border-lord-gold focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-800">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsEditModalOpen(false)}
                >
                  إلغاء
                </Button>
                <Button
                  type="submit"
                  variant="gold"
                  size="md"
                  isLoading={isUpdating}
                >
                  حفظ التعديلات 💾
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
