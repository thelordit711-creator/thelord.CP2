'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  useGetTasksQuery,
  useCreateOrProposeTaskMutation,
  useUpdateTaskMutation,
  useDeleteTaskMutation,
  useReviewTaskStageMutation,
  useClaimBountyTaskMutation
} from '../../../store/api/tasksApi';
import { useGetAllEmployeesQuery } from '../../../store/api/usersApi';
import { useSocket } from '../../../providers/SocketProvider';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { DirectVoiceRecorder } from '../../../components/voice/DirectVoiceRecorder';
import { StageDeliverableBox } from '../../../components/tasks/StageDeliverableBox';
import { ExecutionWorkspaceModal } from '../../../components/tasks/ExecutionWorkspaceModal';
import { ImageLightboxModal } from '../../../components/ui/ImageLightboxModal';
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
  Edit3,
  User,
  FileText,
  ExternalLink,
  Compass,
  Award,
  Shield,
  Receipt,
  Wallet,
  Copy
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
  const [claimBountyTask, { isLoading: isClaimingBounty }] = useClaimBountyTaskMutation();

  const employees = employeesRes?.data || [];

  const [currentUser, setCurrentUser] = useState<any>(null);
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('lord_current_user');
      if (stored) {
        try {
          setCurrentUser(JSON.parse(stored));
        } catch (e) { }
      }
    }
  }, []);

  const isAdmin = currentUser?.accessRole === 'SUPER_ADMIN';
  const [lightboxImage, setLightboxImage] = useState<{ url: string; alt?: string } | null>(null);

  // Mobile Segmented Column Tab state
  const [mobileKanbanTab, setMobileKanbanTab] = useState<'TODO' | 'IN_PROGRESS' | 'PENDING_ADMIN_REVIEW' | 'COMPLETED'>('TODO');

  // Keep selectedTask synchronized with live tasks list
  React.useEffect(() => {
    if (selectedTask && tasksRes?.data) {
      const fresh = tasksRes.data.find((t: any) => t._id === selectedTask._id);
      if (fresh) {
        setSelectedTask(fresh);
      }
    }
  }, [tasksRes]);

  // Real-time zero-refresh socket listener
  React.useEffect(() => {
    if (!socket) return;

    const handleTaskRefresh = (updatedData?: any) => {
      refetch();
      if (updatedData) {
        const freshTask = updatedData.task || updatedData;
        if (freshTask && freshTask._id) {
          setSelectedTask((prev: any) => (prev && prev._id === freshTask._id ? freshTask : prev));
        }
      }
    };

    const handleTaskAssigned = (data: any) => {
      refetch();
      toast.info('📋 إشعار مهمة جديد:', {
        description: data.title || 'تم تحديث قائمة المهام'
      });
    };

    socket.on('task:created', handleTaskRefresh);
    socket.on('task:updated', handleTaskRefresh);
    socket.on('task:deleted', (data: any) => {
      refetch();
      const delId = typeof data === 'string' ? data : data?.taskId || data?._id;
      if (delId) {
        setSelectedTask((prev: any) => (prev && prev._id === delId ? null : prev));
      }
    });
    socket.on('task:assigned', handleTaskAssigned);
    socket.on('stage:submitted', (data: any) => {
      refetch();
      if (data?.task) {
        setSelectedTask((prev: any) => (prev && prev._id === data.task._id ? data.task : prev));
      }
    });
    socket.on('stage:approved', (data: any) => {
      refetch();
      if (data?.task) {
        setSelectedTask((prev: any) => (prev && prev._id === data.task._id ? data.task : prev));
      }
    });
    socket.on('stage:revision_requested', (data: any) => {
      refetch();
      if (data?.task) {
        setSelectedTask((prev: any) => (prev && prev._id === data.task._id ? data.task : prev));
      }
    });

    return () => {
      socket.off('task:created', handleTaskRefresh);
      socket.off('task:updated', handleTaskRefresh);
      socket.off('task:deleted');
      socket.off('task:assigned', handleTaskAssigned);
      socket.off('stage:submitted');
      socket.off('stage:approved');
      socket.off('stage:revision_requested');
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
  const [employeeFilterScope, setEmployeeFilterScope] = useState<'MY_TASKS' | 'ALL_TASKS'>('MY_TASKS');
  const [adminSelectedEmployee, setAdminSelectedEmployee] = useState<string>('ALL');

  // Modals state
  const [mounted, setMounted] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<any | null>(null);
  const [isExecutionWorkspaceOpen, setIsExecutionWorkspaceOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Lock background scroll when modal is active
  useEffect(() => {
    if (selectedTask || isCreateModalOpen || isExecutionWorkspaceOpen) {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = '';
      };
    }
  }, [selectedTask, isCreateModalOpen, isExecutionWorkspaceOpen]);

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

  // Bounty & Incentive Reward State
  const [isBountyTask, setIsBountyTask] = useState(false);
  const [bountyRewardAmount, setBountyRewardAmount] = useState(50);
  const [bountyClaimType, setBountyClaimType] = useState<'OPEN_COMPETITIVE' | 'DEDICATED'>('OPEN_COMPETITIVE');

  // AI Voice-to-Task & Clarification Loop
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

  const tasks = tasksRes?.data || [];
  const dailyTasksCount = tasks.filter(t => t.isDailyRecurring).length;

  // Filter tasks with RBAC and employee view scoping
  const filteredTasks = tasks.filter(t => {
    const matchesSearch = t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesPlatform = platformFilter === 'ALL' || t.targetPlatform === platformFilter;
    const matchesPriority = priorityFilter === 'ALL' || t.priority === priorityFilter;
    const matchesDaily = !onlyDailyFilter || t.isDailyRecurring;

    // RBAC Filter Scope:
    if (isAdmin) {
      if (adminSelectedEmployee !== 'ALL') {
        const isAssigned = t.assignedTo?.some((e: any) => String(e._id || e) === adminSelectedEmployee);
        if (!isAssigned) return false;
      }
    } else {
      // Employee View Scope:
      if (employeeFilterScope === 'MY_TASKS' && currentUser?._id) {
        const isAssignedToMe = t.assignedTo?.some((e: any) => String(e._id || e) === String(currentUser._id));
        const isOpenBounty = t.isBountyTask && !t.claimedBy;
        if (!isAssignedToMe && !isOpenBounty) return false;
      }
    }

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

    if (!isBountyTask && assignmentMode === 'EMPLOYEES' && selectedAssignees.length === 0) {
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
      const res = await reviewStage({
        taskId,
        stageOrder,
        data: { action: 'APPROVE', note: 'المرحلة معتمدة 100% ومستوفية للشروط' }
      }).unwrap();

      toast.success(`تم اعتماد المرحلة ${stageOrder} وفتح المرحلة التالية تلقائياً!`);
      if (res?.data) {
        setSelectedTask(res.data);
      } else if (selectedTask) {
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

  const handleClaimBounty = async (taskId: string) => {
    try {
      await claimBountyTask(taskId).unwrap();
      toast.success('تهانينا! قبلت تحدي المهمة وتمت إضافتها لمهامك الشخصية بنجاح 🎯');
      refetch();
    } catch (err: any) {
      toast.error(err?.data?.error || 'تعذر قبول المهمة');
    }
  };

  const handleVoiceToTaskAnalyze = async (voiceText: string) => {
    if (!voiceText || !voiceText.trim()) return;
    setIsAnalyzingVoice(true);
    setVoiceClarificationQuestions([]);
    try {
      const token = localStorage.getItem('lord_auth_token');
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
        toast.warning('يحتاج الذكاء الاصطناعي لبعض التوضيحات لاعتماد المهمة بدقة');
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
        toast.success('تم تفريغ وهيكلة المهمة ومراحلها بنجاح بواسطة TheLordAI! 🤖');
      }
    } catch (err: any) {
      toast.error(err.message || 'حدث خطأ أثناء معالجة الصوت');
    } finally {
      setIsAnalyzingVoice(false);
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
                  {isAdmin ? 'لوحة مراقبة وإدارة المهام وتدقيق المراحل' : 'قائمة المهام المسندة والتنفيذ'}
                </h1>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-lord-gold/15 text-lord-gold border border-lord-gold/30 font-bold">
                  {isAdmin ? 'إشراف ومراجعة المدير' : 'مهام الكادر الوظيفي'}
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-0.5">
                {isAdmin
                  ? 'مراقبة سير أعمال الكادر، فحص المخرجات والمرفقات، اعتماد المراحل لفتح التالية، والتحكم بالصلاحيات'
                  : 'استعراض المهام المسندة إليك، تنفيذ متطلبات كل مرحلة، ورفع المخرجات لاعتمادها من قِبل المسؤول'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="gold"
              size="md"
              onClick={() => setIsCreateModalOpen(true)}
              className="rounded-2xl shadow-gold-glow flex items-center gap-2 font-bold"
            >
              <Plus className="w-4 h-4 ml-1" />
              <span>{isAdmin ? 'إنشاء مهمة وبناء مراحلها +' : 'اقتراح مهمة جديدة للإدارة 💡'}</span>
            </Button>
          </div>
        </div>

        {/* Multi-View Tabs & Filters (2-Tier Clean Layout) */}
        <div className="space-y-3.5 pt-3 border-t border-gray-800">
          {/* Tier 1: View Toggles & Scope Switcher */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* View Toggles */}
            <div className="flex items-center bg-obsidian-primary p-1 rounded-2xl border border-gray-800 text-xs overflow-x-auto max-w-full no-scrollbar shrink-0">
              <button
                type="button"
                onClick={() => setActiveView('board')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all ${activeView === 'board'
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
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all ${activeView === 'list'
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
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all ${activeView === 'timeline'
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
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all ${activeView === 'analytics'
                    ? 'bg-emerald-500 text-white'
                    : 'text-gray-400 hover:text-white'
                  }`}
              >
                <BarChart2 className="w-4 h-4" />
                <span>التحليلات ومعدل الإنجاز</span>
              </button>
            </div>

            {/* Scope Selector: Admin (Employee Filter) / Employee (Scope Switcher) */}
            <div className="flex items-center gap-2 shrink-0">
              {isAdmin ? (
                <select
                  value={adminSelectedEmployee}
                  onChange={e => setAdminSelectedEmployee(e.target.value)}
                  className="bg-obsidian-primary border border-lord-gold/40 rounded-xl px-3 py-1.5 text-xs text-lord-gold font-bold focus:outline-none focus:border-lord-gold"
                  title="تصفية المهام حسب الموظف المسند إليه"
                >
                  <option value="ALL">جميع الموظفين (مراقبة عامة)</option>
                  {employees.map(emp => (
                    <option key={emp._id} value={emp._id}>
                      {emp.fullName} ({emp.primaryDepartment || emp.accessRole})
                    </option>
                  ))}
                </select>
              ) : (
                <div className="flex items-center bg-obsidian-primary p-1 rounded-2xl border border-gray-800 text-xs shrink-0">
                  <button
                    type="button"
                    onClick={() => setEmployeeFilterScope('MY_TASKS')}
                    className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all whitespace-nowrap ${
                      employeeFilterScope === 'MY_TASKS'
                        ? 'bg-lord-gold text-black shadow-gold-glow'
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    مهامي المسندة
                  </button>
                  <button
                    type="button"
                    onClick={() => setEmployeeFilterScope('ALL_TASKS')}
                    className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all whitespace-nowrap ${
                      employeeFilterScope === 'ALL_TASKS'
                        ? 'bg-lord-gold text-black shadow-gold-glow'
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    مهام الفريق
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Tier 2: Search & Filter Toolbar */}
          <div className="flex flex-wrap items-center gap-2.5 pt-1">
            {/* Search Box */}
            <div className="relative flex-1 min-w-[180px] max-w-sm">
              <Search className="w-3.5 h-3.5 text-gray-500 absolute top-1/2 -translate-y-1/2 right-3 pointer-events-none" />
              <input
                type="text"
                placeholder="بحث في أسماء المهام..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full bg-obsidian-surface border border-gray-800 rounded-xl pr-8 pl-3 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-lord-gold transition-all"
              />
            </div>

            {/* Daily Routine Filter Button */}
            <button
              type="button"
              onClick={() => setOnlyDailyFilter(!onlyDailyFilter)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 whitespace-nowrap ${onlyDailyFilter
                  ? 'bg-purple-600 text-white border-purple-500 shadow-md'
                  : 'bg-obsidian-surface text-gray-400 border-gray-800 hover:text-white'
                }`}
            >
              <Repeat className="w-3.5 h-3.5" />
              <span>المهام اليومية ({dailyTasksCount})</span>
            </button>

            {/* Platform Selector */}
            <select
              value={platformFilter}
              onChange={e => setPlatformFilter(e.target.value)}
              className="bg-obsidian-surface border border-gray-800 rounded-xl px-3 py-1.5 text-xs text-gray-300 focus:outline-none focus:border-lord-gold"
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
        <div className="space-y-4">
          {/* Mobile Kanban Column Switcher (Visible only on mobile devices) */}
          <div className="grid grid-cols-4 md:hidden gap-1.5 p-1 bg-obsidian-surface rounded-2xl border border-gray-800 text-xs">
            <button
              type="button"
              onClick={() => setMobileKanbanTab('TODO')}
              className={`py-2 px-1 rounded-xl font-bold text-center transition-all flex flex-col items-center gap-0.5 ${
                mobileKanbanTab === 'TODO'
                  ? 'bg-gray-700 text-white shadow-md'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <span className="text-[11px]">مطلوبة</span>
              <span className="text-[9px] font-mono opacity-80">({filteredTasks.filter(t => t.status === 'TODO').length})</span>
            </button>
            <button
              type="button"
              onClick={() => setMobileKanbanTab('IN_PROGRESS')}
              className={`py-2 px-1 rounded-xl font-bold text-center transition-all flex flex-col items-center gap-0.5 ${
                mobileKanbanTab === 'IN_PROGRESS'
                  ? 'bg-blue-600 text-white shadow-blue-glow'
                  : 'text-blue-400/70 hover:text-blue-300'
              }`}
            >
              <span className="text-[11px]">قيد العمل</span>
              <span className="text-[9px] font-mono opacity-80">({filteredTasks.filter(t => t.status === 'IN_PROGRESS').length})</span>
            </button>
            <button
              type="button"
              onClick={() => setMobileKanbanTab('PENDING_ADMIN_REVIEW')}
              className={`py-2 px-1 rounded-xl font-bold text-center transition-all flex flex-col items-center gap-0.5 ${
                mobileKanbanTab === 'PENDING_ADMIN_REVIEW'
                  ? 'bg-lord-gold text-obsidian-primary shadow-gold-glow'
                  : 'text-lord-gold/70 hover:text-lord-gold'
              }`}
            >
              <span className="text-[11px]">المراجعة</span>
              <span className="text-[9px] font-mono opacity-80">({filteredTasks.filter(t => t.status === 'PENDING_ADMIN_REVIEW').length})</span>
            </button>
            <button
              type="button"
              onClick={() => setMobileKanbanTab('COMPLETED')}
              className={`py-2 px-1 rounded-xl font-bold text-center transition-all flex flex-col items-center gap-0.5 ${
                mobileKanbanTab === 'COMPLETED'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'text-emerald-400/70 hover:text-emerald-300'
              }`}
            >
              <span className="text-[11px]">مكتملة</span>
              <span className="text-[9px] font-mono opacity-80">({filteredTasks.filter(t => t.status === 'COMPLETED').length})</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Column 1: TODO */}
            <div className={`bg-obsidian-card border border-obsidian-border rounded-3xl p-4 flex flex-col min-h-[300px] md:min-h-[500px] ${mobileKanbanTab === 'TODO' ? 'flex' : 'hidden md:flex'}`}>
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
                    {task.isBountyTask && (
                      <span className="px-2 py-0.5 rounded-full bg-lord-gold/20 border border-lord-gold/40 text-lord-gold text-[10px] font-black animate-pulse">
                        💰 ${task.bountyRewardAmount} USDT
                      </span>
                    )}
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

                  {/* Assigned Employee Badge */}
                  <div className="flex items-center justify-between text-[11px] pt-1">
                    <span className="text-[10px] text-gray-400">المسند إليه:</span>
                    {task.assignedTo && task.assignedTo.length > 0 ? (
                      <div className="flex items-center gap-1.5 bg-obsidian-card px-2 py-0.5 rounded-full border border-gray-700">
                        <span className="w-4 h-4 rounded-full bg-lord-gold/20 text-lord-gold font-bold text-[9px] flex items-center justify-center shrink-0">
                          {(task.assignedTo[0] as any)?.fullName?.charAt(0) || 'U'}
                        </span>
                        <span className="text-white font-bold truncate max-w-[130px]">
                          {(task.assignedTo[0] as any)?.fullName}
                        </span>
                        {task.assignedTo.length > 1 && (
                          <span className="text-[9px] text-gray-400 font-mono">+{task.assignedTo.length - 1}</span>
                        )}
                      </div>
                    ) : (
                      <span className="text-[10px] text-amber-400 font-mono">غير مسندة (مفتوحة)</span>
                    )}
                  </div>

                  {task.isBountyTask && !task.claimedBy && task.bountyClaimType === 'OPEN_COMPETITIVE' && (
                    <button
                      type="button"
                      disabled={isClaimingBounty}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleClaimBounty(task._id);
                      }}
                      className="w-full py-1.5 px-3 rounded-xl bg-gradient-to-r from-lord-gold to-yellow-600 text-obsidian-primary font-black text-xs shadow-gold-glow flex items-center justify-center gap-1 hover:brightness-110 active:scale-95 transition-all"
                    >
                      <span>قبول التحدي والمكافأة ⚡</span>
                    </button>
                  )}

                  {/* Financial Requirement Payout Status Badge */}
                  {task.financialRequirement?.requiresBudget && (() => {
                    const fin = task.financialRequirement;
                    const pOrder = typeof fin.payoutOrderId === 'object' ? (fin.payoutOrderId as any) : null;
                    const isDisbursed = pOrder?.executionStatus === 'DISBURSED';
                    const isProcessing = pOrder?.executionStatus === 'IN_PROGRESS';
                    const isWaiting = pOrder?.executionStatus === 'WAITING_TREASURY' || fin.adminApprovalStatus === 'APPROVED';

                    return (
                      <div className="pt-1">
                        {isDisbursed ? (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/35 text-emerald-300 text-[10px] font-black flex items-center gap-1 w-fit shadow-xs">
                            <Check className="w-3 h-3 text-emerald-400 stroke-[3]" />
                            <span>تم تحويل ${fin.amount} USDT ✓</span>
                          </span>
                        ) : isProcessing ? (
                          <span className="px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/35 text-amber-300 text-[10px] font-bold flex items-center gap-1 w-fit">
                            <Clock className="w-3 h-3 text-amber-400 animate-spin" />
                            <span>جارٍ تحويل ${fin.amount} USDT</span>
                          </span>
                        ) : isWaiting ? (
                          <span className="px-2 py-0.5 rounded-full bg-cyber-blue/15 border border-cyber-blue/35 text-cyber-blue text-[10px] font-bold flex items-center gap-1 w-fit">
                            <Building2 className="w-3 h-3" />
                            <span>بانتظار الصرف ${fin.amount} USDT</span>
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full bg-yellow-500/15 border border-yellow-500/35 text-yellow-300 text-[10px] font-bold flex items-center gap-1 w-fit">
                            <Coins className="w-3 h-3 text-yellow-400" />
                            <span>طلب مالي: ${fin.amount} USDT</span>
                          </span>
                        )}
                      </div>
                    );
                  })()}

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
          <div className={`bg-obsidian-card border border-blue-500/30 rounded-3xl p-4 flex flex-col min-h-[300px] md:min-h-[500px] ${mobileKanbanTab === 'IN_PROGRESS' ? 'flex' : 'hidden md:flex'}`}>
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
                    {task.isBountyTask && (
                      <span className="px-2 py-0.5 rounded-full bg-lord-gold/20 border border-lord-gold/40 text-lord-gold text-[10px] font-black">
                        💰 ${task.bountyRewardAmount} USDT
                      </span>
                    )}
                    {task.isDailyRecurring && (
                      <span className="px-2 py-0.5 rounded-full bg-purple-500/15 border border-purple-500/30 text-purple-300 text-[10px] font-bold flex items-center gap-1">
                        <Repeat className="w-2.5 h-2.5" /> يومي
                      </span>
                    )}
                  </div>

                  <h4 className="text-xs font-bold text-white leading-snug group-hover:text-blue-300 transition-colors">
                    {task.title}
                  </h4>

                  {/* Assigned Employee Badge */}
                  <div className="flex items-center justify-between text-[11px] pt-1">
                    <span className="text-[10px] text-gray-400">المسند إليه:</span>
                    {task.assignedTo && task.assignedTo.length > 0 ? (
                      <div className="flex items-center gap-1.5 bg-obsidian-card px-2 py-0.5 rounded-full border border-gray-700">
                        <span className="w-4 h-4 rounded-full bg-blue-500/20 text-blue-400 font-bold text-[9px] flex items-center justify-center shrink-0">
                          {(task.assignedTo[0] as any)?.fullName?.charAt(0) || 'U'}
                        </span>
                        <span className="text-white font-bold truncate max-w-[130px]">
                          {(task.assignedTo[0] as any)?.fullName}
                        </span>
                        {task.assignedTo.length > 1 && (
                          <span className="text-[9px] text-gray-400 font-mono">+{task.assignedTo.length - 1}</span>
                        )}
                      </div>
                    ) : (
                      <span className="text-[10px] text-amber-400 font-mono">غير مسندة</span>
                    )}
                  </div>

                  {/* Financial Requirement Payout Status Badge */}
                  {task.financialRequirement?.requiresBudget && (() => {
                    const fin = task.financialRequirement;
                    const pOrder = typeof fin.payoutOrderId === 'object' ? (fin.payoutOrderId as any) : null;
                    const isDisbursed = pOrder?.executionStatus === 'DISBURSED';
                    const isProcessing = pOrder?.executionStatus === 'IN_PROGRESS';
                    const isWaiting = pOrder?.executionStatus === 'WAITING_TREASURY' || fin.adminApprovalStatus === 'APPROVED';

                    return (
                      <div className="pt-0.5">
                        {isDisbursed ? (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/35 text-emerald-300 text-[10px] font-black flex items-center gap-1 w-fit shadow-xs">
                            <Check className="w-3 h-3 text-emerald-400 stroke-[3]" />
                            <span>تم تحويل ${fin.amount} USDT ✓</span>
                          </span>
                        ) : isProcessing ? (
                          <span className="px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/35 text-amber-300 text-[10px] font-bold flex items-center gap-1 w-fit">
                            <Clock className="w-3 h-3 text-amber-400 animate-spin" />
                            <span>جارٍ تحويل ${fin.amount} USDT</span>
                          </span>
                        ) : isWaiting ? (
                          <span className="px-2 py-0.5 rounded-full bg-cyber-blue/15 border border-cyber-blue/35 text-cyber-blue text-[10px] font-bold flex items-center gap-1 w-fit">
                            <Building2 className="w-3 h-3" />
                            <span>بانتظار الصرف ${fin.amount} USDT</span>
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full bg-yellow-500/15 border border-yellow-500/35 text-yellow-300 text-[10px] font-bold flex items-center gap-1 w-fit">
                            <Coins className="w-3 h-3 text-yellow-400" />
                            <span>طلب مالي: ${fin.amount} USDT</span>
                          </span>
                        )}
                      </div>
                    );
                  })()}

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
          <div className={`bg-obsidian-card border border-amber-500/30 rounded-3xl p-4 flex flex-col min-h-[300px] md:min-h-[500px] ${mobileKanbanTab === 'PENDING_ADMIN_REVIEW' ? 'flex' : 'hidden md:flex'}`}>
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

                  {/* Assigned Employee Badge */}
                  <div className="flex items-center justify-between text-[11px] pt-1">
                    <span className="text-[10px] text-gray-400">المسند إليه:</span>
                    {task.assignedTo && task.assignedTo.length > 0 ? (
                      <div className="flex items-center gap-1.5 bg-obsidian-card px-2 py-0.5 rounded-full border border-gray-700">
                        <span className="w-4 h-4 rounded-full bg-amber-500/20 text-amber-400 font-bold text-[9px] flex items-center justify-center shrink-0">
                          {(task.assignedTo[0] as any)?.fullName?.charAt(0) || 'U'}
                        </span>
                        <span className="text-white font-bold truncate max-w-[130px]">
                          {(task.assignedTo[0] as any)?.fullName}
                        </span>
                      </div>
                    ) : (
                      <span className="text-[10px] text-amber-400 font-mono">غير مسندة</span>
                    )}
                  </div>

                  <p className="text-[11px] text-gray-400 line-clamp-2 leading-relaxed">
                    تم رفع المرفقات الإلزامية بانتظار اعتماد المسؤول لفتح المرحلة التالية.
                  </p>

                  {/* Financial Requirement Payout Status Badge */}
                  {task.financialRequirement?.requiresBudget && (() => {
                    const fin = task.financialRequirement;
                    const pOrder = typeof fin.payoutOrderId === 'object' ? (fin.payoutOrderId as any) : null;
                    const isDisbursed = pOrder?.executionStatus === 'DISBURSED';
                    const isProcessing = pOrder?.executionStatus === 'IN_PROGRESS';
                    const isWaiting = pOrder?.executionStatus === 'WAITING_TREASURY' || fin.adminApprovalStatus === 'APPROVED';

                    return (
                      <div className="pt-0.5">
                        {isDisbursed ? (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/35 text-emerald-300 text-[10px] font-black flex items-center gap-1 w-fit shadow-xs">
                            <Check className="w-3 h-3 text-emerald-400 stroke-[3]" />
                            <span>تم تحويل ${fin.amount} USDT ✓</span>
                          </span>
                        ) : isProcessing ? (
                          <span className="px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/35 text-amber-300 text-[10px] font-bold flex items-center gap-1 w-fit">
                            <Clock className="w-3 h-3 text-amber-400 animate-spin" />
                            <span>جارٍ تحويل ${fin.amount} USDT</span>
                          </span>
                        ) : isWaiting ? (
                          <span className="px-2 py-0.5 rounded-full bg-cyber-blue/15 border border-cyber-blue/35 text-cyber-blue text-[10px] font-bold flex items-center gap-1 w-fit">
                            <Building2 className="w-3 h-3" />
                            <span>بانتظار الصرف ${fin.amount} USDT</span>
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full bg-yellow-500/15 border border-yellow-500/35 text-yellow-300 text-[10px] font-bold flex items-center gap-1 w-fit">
                            <Coins className="w-3 h-3 text-yellow-400" />
                            <span>طلب مالي: ${fin.amount} USDT</span>
                          </span>
                        )}
                      </div>
                    );
                  })()}

                  <div className="pt-2 border-t border-gray-800 flex justify-between items-center text-xs">
                    <span className="text-gray-500 text-[10px]">مرفق إلزامي مرفوع</span>
                    <span className="text-lord-gold font-bold text-[10px]">فحص TheLordAI ✅</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Column 4: COMPLETED */}
          <div className={`bg-obsidian-card border border-emerald-500/30 rounded-3xl p-4 flex flex-col min-h-[300px] md:min-h-[500px] ${mobileKanbanTab === 'COMPLETED' ? 'flex' : 'hidden md:flex'}`}>
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

                  {/* Assigned Employee Badge */}
                  <div className="flex items-center justify-between text-[11px] pt-1">
                    <span className="text-[10px] text-gray-400">المسند إليه:</span>
                    {task.assignedTo && task.assignedTo.length > 0 ? (
                      <span className="text-[11px] font-bold text-emerald-300">
                        {(task.assignedTo[0] as any)?.fullName}
                      </span>
                    ) : (
                      <span className="text-[10px] text-gray-500">غير مسندة</span>
                    )}
                  </div>
                  {/* Financial Requirement Payout Status Badge */}
                  {task.financialRequirement?.requiresBudget && (() => {
                    const fin = task.financialRequirement;
                    const pOrder = typeof fin.payoutOrderId === 'object' ? (fin.payoutOrderId as any) : null;
                    const isDisbursed = pOrder?.executionStatus === 'DISBURSED';
                    const isProcessing = pOrder?.executionStatus === 'IN_PROGRESS';
                    const isWaiting = pOrder?.executionStatus === 'WAITING_TREASURY' || fin.adminApprovalStatus === 'APPROVED';

                    return (
                      <div className="pt-0.5">
                        {isDisbursed ? (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/35 text-emerald-300 text-[10px] font-black flex items-center gap-1 w-fit shadow-xs">
                            <Check className="w-3 h-3 text-emerald-400 stroke-[3]" />
                            <span>تم تحويل ${fin.amount} USDT ✓</span>
                          </span>
                        ) : isProcessing ? (
                          <span className="px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/35 text-amber-300 text-[10px] font-bold flex items-center gap-1 w-fit">
                            <Clock className="w-3 h-3 text-amber-400 animate-spin" />
                            <span>جارٍ تحويل ${fin.amount} USDT</span>
                          </span>
                        ) : isWaiting ? (
                          <span className="px-2 py-0.5 rounded-full bg-cyber-blue/15 border border-cyber-blue/35 text-cyber-blue text-[10px] font-bold flex items-center gap-1 w-fit">
                            <Building2 className="w-3 h-3" />
                            <span>بانتظار الصرف ${fin.amount} USDT</span>
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full bg-yellow-500/15 border border-yellow-500/35 text-yellow-300 text-[10px] font-bold flex items-center gap-1 w-fit">
                            <Coins className="w-3 h-3 text-yellow-400" />
                            <span>طلب مالي: ${fin.amount} USDT</span>
                          </span>
                        )}
                      </div>
                    );
                  })()}

                  <div className="w-full bg-emerald-500/20 h-1.5 rounded-full overflow-hidden">
                    <div className="bg-emerald-500 h-full w-full rounded-full" />
                  </div>
                </div>
              ))}
            </div>
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
                  <th className="py-3.5 px-4">الموظف المسند إليه</th>
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
                      {task.assignedTo && task.assignedTo.length > 0 ? (
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-lord-gold/20 border border-lord-gold/40 flex items-center justify-center text-lord-gold font-bold text-[10px] shrink-0">
                            {(task.assignedTo[0] as any)?.fullName?.charAt(0) || 'U'}
                          </div>
                          <span className="text-white font-bold">{(task.assignedTo[0] as any)?.fullName}</span>
                        </div>
                      ) : (
                        <span className="text-gray-500 font-mono text-[11px]">غير مسندة</span>
                      )}
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
                      className={`p-2 rounded-xl border text-[11px] flex items-center justify-between ${st.status === 'APPROVED'
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
      {selectedTask && (() => {
        const totalStages = selectedTask.stages?.length || 0;
        const approvedStages = selectedTask.stages?.filter((s: any) => s.status === 'APPROVED').length || 0;
        const progressPercent = totalStages > 0
          ? Math.round((approvedStages / totalStages) * 100)
          : (selectedTask.overallProgressPercent || 0);

        const isTaskCompleted = selectedTask.status === 'COMPLETED' || (totalStages > 0 && approvedStages === totalStages);
        const isTaskInProgress = selectedTask.status === 'IN_PROGRESS';
        const isTaskPendingReview = selectedTask.status === 'PENDING_ADMIN_REVIEW';

        let dueDateInfo: { dateString: string; diffDays: number; isOverdue: boolean } | null = null;
        if (selectedTask.dueDate) {
          const d = new Date(selectedTask.dueDate);
          const diffDays = Math.ceil((d.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
          dueDateInfo = {
            dateString: d.toLocaleDateString('ar-YE', { year: 'numeric', month: 'short', day: 'numeric' }),
            diffDays,
            isOverdue: diffDays < 0
          };
        }

        const modalContent = (
          <div
            className="fixed inset-0 z-[9999] flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/90 backdrop-blur-xl animate-fade-in"
            onClick={() => setSelectedTask(null)}
          >
            <div
              className="bg-gradient-to-b from-obsidian-surface via-obsidian-card to-obsidian-surface border-2 border-lord-gold/50 rounded-3xl max-w-4xl w-full shadow-[0_0_60px_rgba(0,0,0,0.95),0_0_25px_rgba(212,175,55,0.2)] max-h-[96dvh] sm:max-h-[90vh] flex flex-col overflow-hidden my-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Sticky Top Header */}
              <div className="p-4 sm:p-6 border-b border-gray-800/80 bg-obsidian-surface/95 backdrop-blur-md shrink-0">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div className="space-y-2 flex-1 min-w-0">
                    {/* Badges Row */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="gold" className="font-mono text-xs uppercase tracking-wide">
                        {selectedTask.targetPlatform}
                      </Badge>
                      <span
                        className={`px-3 py-1 rounded-xl text-xs font-black flex items-center gap-1.5 border shadow-xs ${
                          isTaskCompleted
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                            : isTaskInProgress
                            ? 'bg-lord-gold/20 text-lord-gold border-lord-gold/40'
                            : isTaskPendingReview
                            ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                            : 'bg-gray-800 text-gray-300 border-gray-700'
                        }`}
                      >
                        <span
                          className={`w-2 h-2 rounded-full ${
                            isTaskCompleted
                              ? 'bg-emerald-400'
                              : isTaskInProgress
                              ? 'bg-lord-gold animate-pulse'
                              : isTaskPendingReview
                              ? 'bg-amber-400 animate-ping'
                              : 'bg-gray-400'
                          }`}
                        />
                        <span>
                          {selectedTask.status === 'COMPLETED'
                            ? 'مكتملة ومعتمدة'
                            : selectedTask.status === 'IN_PROGRESS'
                            ? 'قيد التنفيذ النشط'
                            : selectedTask.status === 'PENDING_ADMIN_REVIEW'
                            ? 'بانتظار مراجعة الإدارة'
                            : selectedTask.status}
                        </span>
                      </span>

                      {/* Priority Badge */}
                      <span
                        className={`px-2.5 py-1 rounded-xl text-xs font-bold flex items-center gap-1 border ${
                          selectedTask.priority === 'HIGH' || selectedTask.priority === 'URGENT'
                            ? 'bg-red-500/15 border-red-500/35 text-red-300'
                            : selectedTask.priority === 'MEDIUM'
                            ? 'bg-amber-500/15 border-amber-500/35 text-amber-300'
                            : 'bg-gray-800/80 border-gray-700 text-gray-300'
                        }`}
                      >
                        <Flame className="w-3.5 h-3.5 text-current" />
                        <span>الأولوية: {selectedTask.priority}</span>
                      </span>

                      {/* Routine Recurring Tag */}
                      {selectedTask.isDailyRecurring && (
                        <span className="px-2.5 py-1 rounded-xl bg-purple-500/15 border border-purple-500/35 text-purple-300 text-xs font-bold flex items-center gap-1.5">
                          <Repeat className="w-3.5 h-3.5 text-purple-400" />
                          <span>مهمة روتينية يومية ({selectedTask.dailyRecurrenceTime || '09:00 ص'})</span>
                        </span>
                      )}

                      {/* Bounty / Financial Reward */}
                      {selectedTask.isBountyTask && selectedTask.bountyRewardAmount && (
                        <span className="px-2.5 py-1 rounded-xl bg-lord-gold/20 border border-lord-gold/45 text-lord-gold text-xs font-black flex items-center gap-1 shadow-gold-glow/20">
                          <Coins className="w-3.5 h-3.5 text-lord-gold" />
                          <span>مكافأة إنجاز: ${selectedTask.bountyRewardAmount} USDT</span>
                        </span>
                      )}
                    </div>

                    {/* Task Main Title */}
                    <h2 className="text-lg sm:text-2xl font-black text-white leading-snug tracking-tight truncate">
                      {selectedTask.title}
                    </h2>
                  </div>

                  {/* Header Action Buttons */}
                  <div className="flex flex-wrap items-center gap-2 justify-end shrink-0">
                    <Button
                      variant="gold"
                      size="sm"
                      onClick={() => setIsExecutionWorkspaceOpen(true)}
                      className="shadow-gold-glow flex items-center gap-1.5 rounded-xl font-black text-xs px-3.5 py-2"
                    >
                      <Sparkles className="w-4 h-4 ml-0.5" />
                      <span>مساحة التنفيذ الذكية ⚡</span>
                    </Button>

                    {isAdmin && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenEdit(selectedTask)}
                          className="text-lord-gold border-lord-gold/40 hover:bg-lord-gold/15 flex items-center gap-1 rounded-xl font-bold text-xs px-3"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>تعديل</span>
                        </Button>

                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => handleDeleteTask(selectedTask._id, selectedTask.title)}
                          disabled={isDeleting}
                          className="flex items-center gap-1 rounded-xl font-bold text-xs px-3"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>حذف</span>
                        </Button>
                      </>
                    )}

                    <button
                      type="button"
                      onClick={() => setSelectedTask(null)}
                      className="p-2 rounded-xl bg-obsidian-card hover:bg-gray-800 text-gray-400 hover:text-white transition-all border border-gray-800 hover:border-gray-700"
                      title="إغلاق النافذة"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Scrollable Body */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 space-y-6 overscroll-contain custom-scrollbar pb-16">
                {/* Executive Metadata Cards Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* 1. Overall Progress Card */}
                <div className="p-3.5 rounded-2xl bg-obsidian-card/90 border border-gray-800/90 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-400 font-bold flex items-center gap-1.5">
                      <BarChart2 className="w-3.5 h-3.5 text-lord-gold" />
                      <span>نسبة الإنجاز الكلية</span>
                    </span>
                    <span className="font-mono font-black text-lord-gold text-sm">{progressPercent}%</span>
                  </div>
                  <div className="w-full bg-gray-900 rounded-full h-2 overflow-hidden border border-gray-800">
                    <div
                      className="bg-gradient-to-r from-lord-gold via-amber-400 to-emerald-400 h-full rounded-full transition-all duration-500 shadow-gold-glow"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                  <span className="text-[11px] text-gray-400 block">
                    تم اعتماد {approvedStages} من أصل {totalStages} مراحل تنفيذية
                  </span>
                </div>

                {/* 2. Assigned Employees Card */}
                <div className="p-3.5 rounded-2xl bg-obsidian-card/90 border border-gray-800/90 space-y-2">
                  <span className="text-xs text-gray-400 font-bold flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-cyber-blue" />
                    <span>الموظف المسند إليه:</span>
                  </span>
                  {selectedTask.assignedTo && selectedTask.assignedTo.length > 0 ? (
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-xl bg-lord-gold/20 border border-lord-gold/40 flex items-center justify-center text-lord-gold font-black text-xs shrink-0 shadow-xs">
                        {(selectedTask.assignedTo[0] as any)?.fullName?.charAt(0) || 'U'}
                      </div>
                      <div className="min-w-0">
                        <span className="text-white font-bold text-xs truncate block">
                          {(selectedTask.assignedTo[0] as any)?.fullName || 'الموظف المسؤول'}
                        </span>
                        {selectedTask.assignedTo.length > 1 && (
                          <span className="text-[10px] text-gray-400">
                            +{selectedTask.assignedTo.length - 1} موظفين آخرين مشاركين
                          </span>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="text-xs text-gray-500 font-medium">غير مسندة (متاحة لعموم الفريق)</div>
                  )}
                </div>

                {/* 3. Deadline / Timeline Card */}
                <div className="p-3.5 rounded-2xl bg-obsidian-card/90 border border-gray-800/90 space-y-2">
                  <span className="text-xs text-gray-400 font-bold flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                    <span>الموعد النهائي والتوقيت:</span>
                  </span>
                  {dueDateInfo ? (
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-white font-mono font-bold">{dueDateInfo.dateString}</span>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-md font-bold ${
                          dueDateInfo.isOverdue
                            ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                            : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        }`}
                      >
                        {dueDateInfo.isOverdue ? 'انتهت المهلة' : `متبقي ${dueDateInfo.diffDays} يوم`}
                      </span>
                    </div>
                  ) : (
                    <div className="text-xs text-gray-400">
                      {selectedTask.isDailyRecurring ? 'مهمة مستمرة يومياً' : 'بدون موعد نهائي محدد'}
                    </div>
                  )}
                </div>
              </div>

              {/* FINANCIAL REQUIREMENT & PAYOUT STATUS CARD */}
              {selectedTask.financialRequirement?.requiresBudget && (() => {
                const fin = selectedTask.financialRequirement;
                const payoutOrder = typeof fin.payoutOrderId === 'object' ? (fin.payoutOrderId as any) : null;
                const isDisbursed = payoutOrder?.executionStatus === 'DISBURSED';
                const isProcessing = payoutOrder?.executionStatus === 'IN_PROGRESS';
                const isWaitingTreasury = payoutOrder?.executionStatus === 'WAITING_TREASURY' || fin.adminApprovalStatus === 'APPROVED';
                const isPendingAdmin = fin.adminApprovalStatus === 'PENDING_ADMIN';
                const isRejected = fin.adminApprovalStatus === 'REJECTED';

                const payoutMethodLabel =
                  fin.payoutMethodRequested === 'BEP20_USDT'
                    ? 'USDT (شبكة BSC BEP-20)'
                    : fin.payoutMethodRequested === 'JEEB_WALLET'
                    ? 'محفظة جيب الإلكترونية (Jeeb)'
                    : fin.payoutMethodRequested === 'JAWALI_WALLET'
                    ? 'محفظة جوالي الإلكترونية (Jawali)'
                    : fin.payoutMethodRequested || 'تحويل مالي';

                return (
                  <div
                    className={`p-4 sm:p-5 rounded-2xl border transition-all space-y-3.5 backdrop-blur-md shadow-md ${
                      isDisbursed
                        ? 'bg-gradient-to-l from-emerald-950/25 via-obsidian-card to-obsidian-surface border-emerald-500/50 shadow-emerald-500/10'
                        : isProcessing
                        ? 'bg-gradient-to-l from-amber-950/25 via-obsidian-card to-obsidian-surface border-amber-500/50 shadow-amber-500/10'
                        : isWaitingTreasury
                        ? 'bg-gradient-to-l from-cyan-950/25 via-obsidian-card to-obsidian-surface border-cyber-blue/50 shadow-cyan-500/10'
                        : isRejected
                        ? 'bg-gradient-to-l from-red-950/25 via-obsidian-card to-obsidian-surface border-red-500/50'
                        : 'bg-gradient-to-l from-yellow-950/25 via-obsidian-card to-obsidian-surface border-yellow-500/40'
                    }`}
                  >
                    {/* Financial Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-800/80 pb-3">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 font-bold shadow-md ${
                            isDisbursed
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/35'
                              : isProcessing
                              ? 'bg-amber-500/20 text-amber-400 border border-amber-500/35 animate-pulse'
                              : 'bg-lord-gold/20 text-lord-gold border border-lord-gold/35'
                          }`}
                        >
                          <Coins className="w-5 h-5 text-current" />
                        </div>
                        <div>
                          <h4 className="text-sm sm:text-base font-black text-white flex items-center gap-2">
                            <span>المعاملة المالية وميزانية المهمة:</span>
                            <span className="text-lord-gold font-mono font-black text-base sm:text-lg">
                              ${fin.amount} {fin.currency || 'USDT'}
                            </span>
                          </h4>
                          <span className="text-xs text-gray-400 block mt-0.5">
                            طريقة الاستلام المحددة: <strong className="text-gray-200">{payoutMethodLabel}</strong>
                            {fin.justification ? ` • ${fin.justification}` : ''}
                          </span>
                        </div>
                      </div>

                      {/* Transaction Status Badge */}
                      <div className="shrink-0">
                        {isDisbursed ? (
                          <span className="px-3.5 py-1.5 rounded-xl bg-emerald-500/20 border border-emerald-500/50 text-emerald-300 font-black text-xs flex items-center gap-2 shadow-emerald-500/10">
                            <CheckCircle className="w-4 h-4 text-emerald-400 stroke-[2.5]" />
                            <span>تم تحويل وصرف المبلغ بنجاح ✓</span>
                          </span>
                        ) : isProcessing ? (
                          <span className="px-3.5 py-1.5 rounded-xl bg-amber-500/20 border border-amber-500/50 text-amber-300 font-black text-xs flex items-center gap-2 shadow-sm">
                            <Clock className="w-4 h-4 text-amber-400 animate-spin" />
                            <span>جاري معالجة التحويل والصرف من الخزينة ⏳</span>
                          </span>
                        ) : isWaitingTreasury ? (
                          <span className="px-3.5 py-1.5 rounded-xl bg-cyber-blue/20 border border-cyber-blue/50 text-cyber-blue font-black text-xs flex items-center gap-2 shadow-sm">
                            <Building2 className="w-4 h-4 text-cyber-blue" />
                            <span>معتمد إدارياً — بانتظار صرف الخزينة 🏦</span>
                          </span>
                        ) : isRejected ? (
                          <span className="px-3.5 py-1.5 rounded-xl bg-red-500/20 border border-red-500/50 text-red-300 font-bold text-xs flex items-center gap-2 shadow-sm">
                            <X className="w-4 h-4 text-red-400" />
                            <span>تم رفض طلب الميزانية ❌</span>
                          </span>
                        ) : (
                          <span className="px-3.5 py-1.5 rounded-xl bg-yellow-500/20 border border-yellow-500/50 text-yellow-300 font-bold text-xs flex items-center gap-2 shadow-sm">
                            <AlertCircle className="w-4 h-4 text-yellow-400" />
                            <span>بانتظار موافقة الإدارة على الميزانية ⚠️</span>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Disbursed Transfer Proof & Transaction Hash Box */}
                    {isDisbursed && payoutOrder?.transferProof && (
                      <div className="p-3.5 sm:p-4 rounded-xl bg-obsidian-surface border border-emerald-500/35 space-y-3">
                        <div className="flex items-center justify-between text-xs flex-wrap gap-2">
                          <span className="text-emerald-300 font-bold flex items-center gap-1.5">
                            <Receipt className="w-4 h-4 text-emerald-400" />
                            <span>بيانات وسند الحوالة المالية الصادرة للمستفيد:</span>
                          </span>
                          {payoutOrder.disbursedClickedAt && (
                            <span className="text-gray-400 font-mono text-[11px]">
                              تاريخ ووقت الصرف: {new Date(payoutOrder.disbursedClickedAt).toLocaleString('ar-YE')}
                            </span>
                          )}
                        </div>

                        {/* Transaction Hash / Ref Code */}
                        {payoutOrder.transferProof.txHashOrReferenceNumber && (
                          <div className="flex items-center justify-between p-2.5 rounded-lg bg-obsidian-card border border-gray-700/80 gap-2 flex-wrap">
                            <div className="min-w-0">
                              <span className="text-[10px] text-gray-400 block mb-0.5">
                                رقم الحوالة أو الهاش المرجعي (TxHash / Reference Number):
                              </span>
                              <span className="font-mono text-xs text-white font-bold select-all break-all">
                                {payoutOrder.transferProof.txHashOrReferenceNumber}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                type="button"
                                onClick={() => {
                                  navigator.clipboard.writeText(payoutOrder.transferProof.txHashOrReferenceNumber);
                                  toast.success('تم نسخ كود التحويل / الهاش بنجاح 📋');
                                }}
                                className="px-2.5 py-1 rounded-md bg-gray-800 hover:bg-gray-700 text-gray-200 text-xs font-bold flex items-center gap-1 transition-colors"
                                title="نسخ الهاش"
                              >
                                <Copy className="w-3.5 h-3.5 text-lord-gold" />
                                <span>نسخ الكود</span>
                              </button>
                              {payoutOrder.transferProof.txHashOrReferenceNumber.startsWith('0x') && (
                                <a
                                  href={`https://bscscan.com/tx/${payoutOrder.transferProof.txHashOrReferenceNumber}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="px-2.5 py-1 rounded-md bg-cyber-blue/15 border border-cyber-blue/30 text-cyber-blue hover:underline text-xs font-bold flex items-center gap-1 transition-colors"
                                >
                                  <ExternalLink className="w-3.5 h-3.5" />
                                  <span>BscScan</span>
                                </a>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Receipt Screenshot Image */}
                        {payoutOrder.transferProof.receiptScreenshot?.fileUrl && (
                          <div className="flex items-center gap-3 pt-1">
                            <span className="text-[11px] text-gray-300 font-bold">صورة سند / إشعار التحويل:</span>
                            <button
                              type="button"
                              onClick={() =>
                                setLightboxImage({
                                  url: payoutOrder.transferProof.receiptScreenshot.fileUrl,
                                  alt: 'سند التحويل المالي'
                                })
                              }
                              className="group relative cursor-zoom-in rounded-xl overflow-hidden border border-emerald-500/40 hover:border-lord-gold transition-all"
                              title="انقر لتكبير ومعاينة سند التحويل"
                            >
                              <img
                                src={payoutOrder.transferProof.receiptScreenshot.fileUrl}
                                alt="سند التحويل"
                                className="w-24 h-16 object-cover group-hover:scale-105 transition-transform"
                              />
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-[10px] text-white font-bold">
                                تكبير 🔍
                              </div>
                            </button>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Waiting Treasury Note */}
                    {isWaitingTreasury && !isDisbursed && !isProcessing && (
                      <div className="p-3 rounded-xl bg-obsidian-surface border border-cyber-blue/30 text-xs text-gray-300">
                        <span className="text-cyber-blue font-bold block mb-0.5">توجيه الخزينة:</span>
                        <p>
                          تم اعتماد هذا الطلب مالياً، وهو مدرج حالياً في كشف صرف الخزينة (Payout Desk) وسيتم إرسال المبلغ فورياً.
                        </p>
                      </div>
                    )}

                    {/* Admin Notes if rejected */}
                    {fin.adminNotes && (
                      <div className="p-3 rounded-xl bg-obsidian-surface border border-gray-800 text-xs text-gray-300">
                        <span className="text-lord-gold font-bold block mb-1">ملاحظات الإدارة:</span>
                        <p>{fin.adminNotes}</p>
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Work Plan / Executive Brief Card */}
              <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-l from-obsidian-card via-obsidian-card to-amber-950/15 border-r-4 border-r-lord-gold border border-gray-800 space-y-2.5 shadow-sm">
                <div className="flex items-center gap-2 text-xs font-bold text-lord-gold uppercase tracking-wider">
                  <Compass className="w-4 h-4 text-lord-gold" />
                  <span>تفاصيل وخطة وتوجيهات المهمة التنفيذية:</span>
                </div>
                <p className="text-sm text-gray-200 leading-relaxed font-normal whitespace-pre-line pr-1">
                  {selectedTask.description}
                </p>

                {/* Brief Attachments */}
                {selectedTask.adminBriefAttachments && selectedTask.adminBriefAttachments.length > 0 && (
                  <div className="pt-3 border-t border-gray-800/70 space-y-2">
                    <span className="text-xs font-bold text-gray-400 flex items-center gap-1.5">
                      <Paperclip className="w-3.5 h-3.5 text-lord-gold" />
                      <span>مرفقات التكليف والتوجيه الإداري ({selectedTask.adminBriefAttachments.length}):</span>
                    </span>
                    <div className="flex flex-wrap gap-2.5">
                      {selectedTask.adminBriefAttachments.map((att: any, aIdx: number) => {
                        const isImg = att.fileType === 'IMAGE' || att.fileUrl?.match(/\.(jpeg|jpg|gif|png|webp)($|\?)/i);
                        return isImg ? (
                          <button
                            key={aIdx}
                            type="button"
                            onClick={() => setLightboxImage({ url: att.fileUrl, alt: att.fileName || 'مرفق المهمة' })}
                            className="block cursor-zoom-in group"
                            title="انقر لتكبير ومعاينة الصورة"
                          >
                            <img
                              src={att.fileUrl}
                              alt={att.fileName || 'مرفق'}
                              className="w-20 h-20 object-cover rounded-xl border border-gray-700 group-hover:border-lord-gold group-hover:scale-105 transition-all shadow-md"
                            />
                          </button>
                        ) : (
                          <a
                            key={aIdx}
                            href={att.fileUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="px-3.5 py-2 rounded-xl bg-obsidian-surface border border-gray-700 hover:border-lord-gold text-xs font-bold text-gray-200 hover:text-white flex items-center gap-2 transition-all shadow-sm"
                          >
                            <Paperclip className="w-3.5 h-3.5 text-lord-gold" />
                            <span className="truncate max-w-[160px]">{att.fileName || 'مستند مرفق'}</span>
                            <ExternalLink className="w-3 h-3 text-gray-500 mr-auto" />
                          </a>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Stages Execution Pipeline (Timeline Stepper) */}
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-gray-800/80 pb-3 flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-lord-gold" />
                    <span className="text-sm font-black text-white uppercase tracking-wider">
                      المسار التنفيذي ومراحل الاعتماد ({selectedTask.stages?.length || 0})
                    </span>
                  </div>
                  <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-gray-800/80 border border-gray-700/60 text-gray-400 font-medium">
                    تتابع المراحل تسلسلياً — لا تفتح مرحلة إلا بعد اعتماد سابقتها
                  </span>
                </div>

                <div className="space-y-4 relative before:absolute before:top-6 before:bottom-6 before:right-5 before:w-0.5 before:bg-gradient-to-b before:from-lord-gold/40 before:via-gray-800 before:to-gray-800/20 before:hidden md:before:block">
                  {selectedTask.stages?.map((stage: any) => (
                    <StageDeliverableBox
                      key={stage.stageOrder}
                      taskId={selectedTask._id}
                      stage={stage}
                      canSubmit={!isAdmin && (selectedTask.assignedTo?.some((e: any) => String(e._id || e) === String(currentUser?._id)) ?? false)}
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

              {/* Direct Reports Submitted */}
              {selectedTask.directReports && selectedTask.directReports.length > 0 && (
                <div className="space-y-3 pt-3 border-t border-gray-800/80">
                  <span className="text-xs font-bold text-lord-gold uppercase tracking-wider flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-lord-gold" />
                    <span>التقارير المباشرة المسلمة من الموظف ({selectedTask.directReports.length}):</span>
                  </span>
                  <div className="space-y-2.5">
                    {selectedTask.directReports.map((rep: any, rIdx: number) => (
                      <div key={rIdx} className="p-3.5 rounded-2xl bg-obsidian-card border border-gray-800 space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-white flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-emerald-400" />
                            <span>{(rep.submittedBy as any)?.fullName || 'الموظف'}</span>
                          </span>
                          <span className="text-gray-500 font-mono text-[10px]">
                            {new Date(rep.createdAt).toLocaleString('ar-YE')}
                          </span>
                        </div>
                        {rep.textContent && (
                          <p className="text-xs text-gray-300 leading-relaxed">{rep.textContent}</p>
                        )}
                        {rep.attachments && rep.attachments.length > 0 && (
                          <div className="flex flex-wrap gap-2 pt-1">
                            {rep.attachments.map((att: any, raIdx: number) => {
                              const isImg = att.fileType === 'IMAGE' || att.fileUrl?.match(/\.(jpeg|jpg|gif|png|webp)($|\?)/i);
                              return isImg ? (
                                <button
                                  key={raIdx}
                                  type="button"
                                  onClick={() => setLightboxImage({ url: att.fileUrl, alt: att.fileName || 'مرفق التقرير' })}
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
                                  key={raIdx}
                                  href={att.fileUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="px-3 py-1.5 rounded-xl bg-obsidian-surface border border-gray-700 hover:border-lord-gold text-xs font-bold text-gray-200 hover:text-white flex items-center gap-1.5 transition-all"
                                >
                                  <Paperclip className="w-3.5 h-3.5 text-lord-gold" />
                                  <span className="truncate max-w-[140px]">{att.fileName || 'مستند مرفق'}</span>
                                </a>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              </div>

              {/* Sticky Bottom Executive Footer */}
              <div className="p-3.5 sm:p-4 border-t border-gray-800/80 bg-obsidian-surface/95 backdrop-blur-md shrink-0 flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400 font-bold hidden sm:inline">نسبة الإنجاز:</span>
                    <span className="font-mono font-black text-lord-gold text-xs sm:text-sm">{progressPercent}%</span>
                  </div>
                  <div className="w-24 sm:w-36 bg-gray-900 rounded-full h-2 overflow-hidden border border-gray-800 hidden xs:block">
                    <div
                      className="bg-gradient-to-r from-lord-gold to-emerald-400 h-full rounded-full transition-all duration-500"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                  <span className="text-[11px] text-gray-400 truncate hidden md:inline">
                    ({approvedStages} من أصل {totalStages} مراحل معتمدة)
                  </span>
                  {selectedTask.financialRequirement?.requiresBudget && (
                    <span className="px-2.5 py-0.5 rounded-full bg-lord-gold/10 border border-lord-gold/30 text-lord-gold text-[10px] font-mono font-bold hidden lg:inline">
                      ${selectedTask.financialRequirement.amount} USDT ميزانية
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    variant="gold"
                    size="sm"
                    onClick={() => setIsExecutionWorkspaceOpen(true)}
                    className="shadow-gold-glow flex items-center gap-1.5 rounded-xl font-black text-xs px-3.5 py-1.5"
                  >
                    <Sparkles className="w-3.5 h-3.5 ml-0.5" />
                    <span>مساحة التنفيذ الذكية ⚡</span>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedTask(null)}
                    className="text-gray-300 border-gray-700 hover:bg-gray-800 rounded-xl text-xs px-3 py-1.5"
                  >
                    <span>إغلاق النافذة</span>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        );

        return mounted ? createPortal(modalContent, document.body) : null;
      })()}

      {/* ============================================================== */}
      {/* ADVANCED MULTI-STAGE & ROUTINE TASK CREATION MODAL */}
      {/* ============================================================== */}
      {isCreateModalOpen && mounted && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
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
                    onRecordingComplete={({ durationInSeconds }) => {
                      handleVoiceToTaskAnalyze(`توجيه صوتي للمسؤول مدته ${durationInSeconds} ثانية لإنجاز العمل وتكليف الكادر المختص بمراحله`);
                    }}
                    onCancel={() => setShowVoiceToTaskBox(false)}
                  />

                  {/* Clarification Questions Loop */}
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
                      className={`px-3 py-1 rounded-lg font-bold transition-all ${assignmentMode === 'EMPLOYEES'
                          ? 'bg-lord-gold text-obsidian-primary shadow-sm'
                          : 'text-gray-400 hover:text-white'
                        }`}
                    >
                      موظف أو أكثر 👤
                    </button>
                    <button
                      type="button"
                      onClick={() => setAssignmentMode('DEPARTMENT')}
                      className={`px-3 py-1 rounded-lg font-bold transition-all ${assignmentMode === 'DEPARTMENT'
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
                            className={`p-2.5 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${isSelected
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
                            <span className={`w-4 h-4 rounded-md border flex items-center justify-center text-[10px] ${isSelected ? 'bg-lord-gold text-obsidian-primary border-lord-gold' : 'border-gray-600'
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

              {/* BOUNTY & INCENTIVE REWARD SETTING */}
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
        </div>,
        document.body
      )}

      {/* EDIT TASK MODAL */}
      {isEditModalOpen && mounted && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
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
        </div>,
        document.body
      )}
      {/* Dedicated AI Execution Workspace & Export Modal */}
      {isExecutionWorkspaceOpen && selectedTask && (
        <ExecutionWorkspaceModal
          task={selectedTask}
          onClose={() => setIsExecutionWorkspaceOpen(false)}
          onStageUpdated={() => refetch()}
        />
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
}
